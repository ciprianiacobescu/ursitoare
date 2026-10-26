import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadConfig } from "../../../src/config/index.ts";
import { main } from "../../../src/main.ts";
import type { RunningServer } from "../../../src/main.ts";
import type { LogDestination } from "../../../src/observability/index.ts";
import { startControlServer } from "./control.ts";
import type { ControlServer } from "./control.ts";
import { discoverParts } from "./discover.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";
import { E2eStackError } from "./part.ts";
import { createFaultTable } from "./faults.ts";
import { createResetRunner } from "./reset.ts";
import { freePort } from "../pg.ts";

export { PARTS_DIR, PART_FILE_PATTERN, discoverParts } from "./discover.ts";

export const DEFAULT_PORT: number = 39080;

export const DEFAULT_CONTROL_PORT: number = 39081;

const MIN_PORT = 0;
const MAX_PORT = 65535;
const ENGINE_KEY_BYTES = 32;
const DIRECTORY_MODE = 0o700;
const FILE_MODE = 0o600;

export type E2eStack = Readonly<{
  url: string;
  controlUrl: string;
  handles: ReadonlyMap<string, PartHandle>;
  close(): Promise<void>;
}>;

interface StackOptions {
  port?: number;
  controlPort?: number;
  dataDir?: string;
  parts?: readonly E2eStackPart[];
  log?: boolean;
}

function optionsInvalid(message: string): E2eStackError {
  return new E2eStackError("STACK_OPTIONS_INVALID", message);
}

function isPort(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_PORT && (value as number) <= MAX_PORT;
}

async function resolveDataDir(value: string | undefined): Promise<string> {
  const dataDir = value ?? os.tmpdir();
  try {
    const stats = await fs.stat(dataDir);
    if (!stats.isDirectory()) {
      throw optionsInvalid(`dataDir is not a directory: ${dataDir}`);
    }
  } catch (error) {
    if (error instanceof E2eStackError) {
      throw error;
    }
    throw optionsInvalid(`dataDir does not exist: ${dataDir}`);
  }
  return dataDir;
}

async function pickPorts(port: number, controlPort: number): Promise<{ port: number; controlPort: number }> {
  const engineExplicit = port !== 0;
  const controlExplicit = controlPort !== 0;
  let engine = engineExplicit ? port : await freePort();
  let control = controlExplicit ? controlPort : await freePort();

  while (engine === control) {
    if (!controlExplicit) {
      control = await freePort();
    } else {
      engine = await freePort();
    }
  }

  return { port: engine, controlPort: control };
}

function stackEnvironment(enginePort: number, engineKeyFile: string): Record<string, string> {
  return {
    URSITOARE_ROLE: "all",
    URSITOARE_HOST: "127.0.0.1",
    URSITOARE_PORT: String(enginePort),
    URSITOARE_PUBLIC_BASE_URL: `http://127.0.0.1:${enginePort}`,
    URSITOARE_LOG_LEVEL: "info",
    URSITOARE_SHUTDOWN_DRAIN_MS: "2000",
    URSITOARE_ENGINE_KEY_FILE: engineKeyFile,
  };
}

export async function startE2eStack(opts: StackOptions = {}): Promise<E2eStack> {
  const requestedPort = opts.port ?? DEFAULT_PORT;
  const requestedControlPort = opts.controlPort ?? DEFAULT_CONTROL_PORT;

  if (!isPort(requestedPort) || !isPort(requestedControlPort)) {
    throw optionsInvalid("port and controlPort must be integers from 0 to 65535");
  }
  if (requestedPort !== 0 && requestedPort === requestedControlPort) {
    throw optionsInvalid("port and controlPort must differ");
  }

  const dataDir = await resolveDataDir(opts.dataDir);
  const ports = await pickPorts(requestedPort, requestedControlPort);
  const parts = opts.parts ?? (await discoverParts());

  const stackDir = await fs.mkdtemp(path.join(dataDir, "ursitoare-e2e-"));
  await fs.chmod(stackDir, DIRECTORY_MODE);

  let lastLine: string | undefined;
  const destination: LogDestination = {
    write(line: string): void {
      lastLine = line;
      if (opts.log === true) {
        process.stderr.write(line);
      }
    },
  };

  const engineDir = path.join(stackDir, "engine");
  await fs.mkdir(engineDir, { recursive: true, mode: DIRECTORY_MODE });
  const engineKeyFile = path.join(engineDir, "engine.key");
  await fs.writeFile(engineKeyFile, randomBytes(ENGINE_KEY_BYTES).toString("hex"), {
    mode: FILE_MODE,
  });
  await fs.chmod(engineKeyFile, FILE_MODE);

  for (const part of parts) {
    await fs.mkdir(path.join(stackDir, part.name), {
      recursive: true,
      mode: DIRECTORY_MODE,
    });
  }

  const baseEnv = stackEnvironment(ports.port, engineKeyFile);
  const partEnv: Record<string, string> = {};
  const handles = new Map<string, PartHandle>();

  let engineUrl = `http://127.0.0.1:${ports.port}`;
  let controlUrl = `http://127.0.0.1:${ports.controlPort}`;

  function mergedEnv(): Record<string, string> {
    return { ...baseEnv, ...partEnv };
  }

  function contextFor(part: E2eStackPart): PartContext {
    return {
      name: part.name,
      dataDir: path.join(stackDir, part.name),
      engineOrigin: engineUrl,
      controlOrigin: controlUrl,
      env: mergedEnv(),
      handles: new Map(handles),
    };
  }

  const faults = createFaultTable();
  const inFlightResets = new Set<Promise<void>>();

  const runner = createResetRunner({
    parts,
    context: contextFor,
    faults,
    engineHealthy: async () => {
      try {
        const response = await fetch(`${engineUrl}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        return response.status === 200;
      } catch {
        return false;
      }
    },
  });

  function trackedReset(): Promise<void> {
    const pending = runner.reset();
    inFlightResets.add(pending);
    const forget = (): void => {
      inFlightResets.delete(pending);
    };
    void pending.then(forget, forget);
    return pending;
  }

  const signals = new EventEmitter();
  let exitCode: number | undefined;
  let resolveExit: (() => void) | undefined;
  const exited = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });
  const exit = (code: number): void => {
    if (exitCode === undefined) {
      exitCode = code;
      resolveExit?.();
    }
  };

  let control: ControlServer | null = null;
  let engine: RunningServer | null = null;

  async function closeHandles(): Promise<string[]> {
    const failed: string[] = [];
    for (const part of [...parts].reverse()) {
      const handle = handles.get(part.name);
      if (handle === undefined) {
        continue;
      }
      try {
        await handle.close();
      } catch {
        failed.push(part.name);
      }
    }
    return failed;
  }

  async function rollback(): Promise<void> {
    if (control !== null) {
      await control.close().catch(() => undefined);
    }
    if (engine !== null) {
      if (exitCode === undefined) {
        signals.emit("SIGTERM");
        await exited;
      }
      await engine.close().catch(() => undefined);
    }
    await closeHandles();
    await fs.rm(stackDir, { recursive: true, force: true }).catch(() => undefined);
  }

  try {
    for (const part of parts) {
      let handle: PartHandle;
      try {
        handle = await part.start(contextFor(part));
      } catch (error) {
        throw new E2eStackError(
          "STACK_PART_FAILED",
          `Part failed to start: ${part.name}`,
          { part: part.name },
          { cause: error },
        );
      }

      handles.set(part.name, handle);

      for (const [key, value] of Object.entries(handle.env)) {
        if (key in baseEnv || key in partEnv) {
          throw new E2eStackError("STACK_ENV_CONFLICT", `Duplicate env key: ${key}`, { key });
        }
        partEnv[key] = value;
      }
    }

    await runner.seedAll();

    const env = mergedEnv();
    const started = await main({
      loadConfig: () => loadConfig(env),
      destination,
      signals,
      exit,
      configureServer: async (server) => {
        server.addHook("onRequest", faults.hook);
      },
    });

    if (started === null) {
      throw new E2eStackError("STACK_ENGINE_FAILED", "The engine failed to start", {
        exitCode: exitCode ?? 1,
        fatal: lastLine ?? "",
      });
    }
    engine = started;
    engineUrl = started.url;

    control = await startControlServer({
      port: ports.controlPort,
      faults,
      reset: trackedReset,
    });
    controlUrl = control.url;
  } catch (error) {
    await rollback();
    throw error;
  }

  const runningControl = control;
  const runningEngine = engine;
  const runningHandles: ReadonlyMap<string, PartHandle> = new Map(handles);

  let closing: Promise<void> | undefined;

  async function doClose(): Promise<void> {
    if (runningControl !== null) {
      await runningControl.close().catch(() => undefined);
    }

    while (inFlightResets.size > 0) {
      await Promise.allSettled([...inFlightResets]);
    }

    if (runningEngine !== null) {
      if (exitCode === undefined) {
        signals.emit("SIGTERM");
        await exited;
      }
      await runningEngine.close().catch(() => undefined);
    }

    const failed = await closeHandles();
    await fs.rm(stackDir, { recursive: true, force: true }).catch(() => undefined);

    if (failed.length > 0) {
      throw new E2eStackError("STACK_CLOSE_FAILED", "The stack failed to close", {
        parts: failed,
      });
    }
    if (exitCode !== undefined && exitCode !== 0) {
      throw new E2eStackError("STACK_CLOSE_FAILED", "The engine exited with an error", {
        exitCode,
      });
    }
  }

  return {
    url: engineUrl,
    controlUrl,
    handles: runningHandles,
    close(): Promise<void> {
      if (closing === undefined) {
        closing = doClose();
      }
      return closing;
    },
  };
}
