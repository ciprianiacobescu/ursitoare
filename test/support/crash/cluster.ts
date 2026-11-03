import { realpathSync } from "node:fs";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadConfig } from "../../../src/config/index.ts";
import type { EndpointLike } from "../../../src/db/index.ts";
import { databaseApi } from "../e2e-stack/database-part.ts";
import { discoverParts } from "../e2e-stack/discover.ts";
import type { E2eStackPart, PartContext, PartHandle } from "../e2e-stack/part.ts";
import { E2eStackError } from "../e2e-stack/part.ts";
import { freePort } from "../pg.ts";
import { stopEnginesUnder } from "./engine.ts";

const DIRECTORY_MODE = 0o700;
const DATA_DIR_PREFIX = "ursitoare-crash-";

export interface CrashCluster {
  readonly env: Readonly<Record<string, string>>;
  readonly ownerUrl: string;
  readonly appEndpoint: EndpointLike;
  readonly dataDir: string;
}

function partFailed(part: string, error: unknown): E2eStackError {
  return new E2eStackError(
    "STACK_PART_FAILED",
    `Part failed: ${part}`,
    { part },
    { cause: error },
  );
}

async function placeholderOrigins(): Promise<{ engineOrigin: string; controlOrigin: string }> {
  const enginePort = await freePort();
  let controlPort = await freePort();
  while (controlPort === enginePort) {
    controlPort = await freePort();
  }
  return {
    engineOrigin: `http://127.0.0.1:${enginePort}`,
    controlOrigin: `http://127.0.0.1:${controlPort}`,
  };
}

function databaseEnv(env: Readonly<Record<string, string>>): Record<string, string> {
  const reduced: Record<string, string> = {};
  const url = env["URSITOARE_DATABASE_URL"];
  if (url !== undefined) {
    reduced["URSITOARE_DATABASE_URL"] = url;
  }
  const passwordFile = env["URSITOARE_DATABASE_PASSWORD_FILE"];
  if (passwordFile !== undefined) {
    reduced["URSITOARE_DATABASE_PASSWORD_FILE"] = passwordFile;
  }
  return reduced;
}

export async function startCrashCluster(
  parts: readonly E2eStackPart[],
): Promise<{ cluster: CrashCluster; close(): Promise<void> }> {
  const parent = realpathSync(os.tmpdir());
  const dataDir = await fs.mkdtemp(path.join(parent, DATA_DIR_PREFIX));
  await fs.chmod(dataDir, DIRECTORY_MODE);

  const origins = await placeholderOrigins();
  const partEnv: Record<string, string> = {};
  const handles = new Map<string, PartHandle>();

  function contextFor(part: E2eStackPart): PartContext {
    return {
      name: part.name,
      dataDir: path.join(dataDir, part.name),
      engineOrigin: origins.engineOrigin,
      controlOrigin: origins.controlOrigin,
      env: { ...partEnv },
      handles: new Map(handles),
    };
  }

  async function shutdown(): Promise<void> {
    await stopEnginesUnder(dataDir).catch(() => undefined);
    for (const part of [...parts].reverse()) {
      const handle = handles.get(part.name);
      if (handle === undefined) {
        continue;
      }
      try {
        await handle.close();
      } catch {
        // A part's close error must not mask the failure that triggered the rollback.
      }
    }
    await fs.rm(dataDir, { recursive: true, force: true }).catch(() => undefined);
  }

  let closing: Promise<void> | undefined;

  function close(): Promise<void> {
    if (closing === undefined) {
      closing = shutdown();
    }
    return closing;
  }

  try {
    for (const part of parts) {
      await fs.mkdir(path.join(dataDir, part.name), {
        recursive: true,
        mode: DIRECTORY_MODE,
      });

      let handle: PartHandle;
      try {
        handle = await part.start(contextFor(part));
      } catch (error) {
        throw partFailed(part.name, error);
      }

      handles.set(part.name, handle);

      for (const [key, value] of Object.entries(handle.env)) {
        if (key in partEnv) {
          throw new E2eStackError("STACK_ENV_CONFLICT", `Duplicate env key: ${key}`, { key });
        }
        partEnv[key] = value;
      }
    }

    for (const part of parts) {
      if (typeof part.seed !== "function") {
        continue;
      }
      try {
        await part.seed(contextFor(part));
      } catch (error) {
        throw partFailed(part.name, error);
      }
    }

    const database = databaseApi(handles);
    const appEndpoint = loadConfig(databaseEnv(partEnv)).database.app;
    if (appEndpoint === null) {
      throw new E2eStackError("STACK_PART_MISSING", "the database part has not started", {
        part: "database",
      });
    }

    const cluster: CrashCluster = {
      env: { ...partEnv },
      ownerUrl: database.ownerUrl,
      appEndpoint,
      dataDir,
    };

    return { cluster, close };
  } catch (error) {
    await shutdown();
    throw error;
  }
}

export async function withDedicatedCluster<T>(
  fn: (cluster: CrashCluster) => Promise<T>,
): Promise<T> {
  const started = await startCrashCluster(await discoverParts());
  try {
    return await fn(started.cluster);
  } finally {
    await started.close();
  }
}
