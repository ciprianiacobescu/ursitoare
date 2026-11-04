import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import type { FaultPoints } from "../../../src/config/faults.ts";
import type { StepObserver } from "../../../src/durable/index.ts";
import type { Logger } from "../../../src/observability/index.ts";
import { E2eStackError } from "../e2e-stack/part.ts";
import type { CrashCluster } from "./cluster.ts";

export interface SpawnOptions {
  cluster: CrashCluster;
  scenario: string;
  faultPoints?: readonly string[];
  args?: Readonly<Record<string, string>>;
}

export interface ScenarioContext {
  env: Readonly<Record<string, string>>;
  args: Readonly<Record<string, string>>;
  dataDir: string;
  faultPoints: FaultPoints;
  stepObserver: StepObserver;
  logger: Logger;
  ready(): void;
}

export type ScenarioStart = (ctx: ScenarioContext) => Promise<void>;

export interface EngineProcess {
  readonly pid: number;
  readonly deaths: number;
  kill(): Promise<void>;
  restart(): Promise<void>;
  stop(): Promise<void>;
}

export const READY_TIMEOUT_MS: number = 30000;

const DATA_DIR_KEY_PREFIX = "L4_";
const CHILD_PATH = join(import.meta.dirname, "child.ts");
const POINT_PATTERN = /^(before|after):[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const READY_LINE = /(^|\n)CRASH_READY\r?(\n|$)/;
const LAST_LINE_LIMIT = 300;

interface ChildRecord {
  proc: ChildProcess;
  pid: number;
  ready: boolean;
  requested: boolean;
  closed: boolean;
  closedPromise: Promise<void>;
  resolveClosed: () => void;
  stdoutBuffer: string;
  stderrBuffer: string;
  lastStderrLine: string;
}

interface EngineState {
  readonly opts: SpawnOptions;
  readonly readyTimeoutMs: number;
  readonly logPath: string;
  readonly childEnv: Record<string, string>;
  current: ChildRecord | null;
  lastPid: number;
  deaths: number;
  stopped: boolean;
  chain: Promise<void>;
}

const enginesByDataDir = new Map<string, Set<EngineProcess>>();

function optionsError(field: string): E2eStackError {
  return new E2eStackError("CRASH_OPTIONS_INVALID", `invalid spawn option: ${field}`, { field });
}

function startError(
  reason: string,
  details: Record<string, string | number | string[]>,
): E2eStackError {
  return new E2eStackError("CRASH_START_FAILED", "the scenario child failed to start", {
    reason,
    ...details,
  });
}

function validateOptions(opts: SpawnOptions, readyTimeoutMs: number): SpawnOptions {
  if (
    typeof opts.scenario !== "string" ||
    !isAbsolute(opts.scenario) ||
    !existsSync(opts.scenario) ||
    !statSync(opts.scenario).isFile()
  ) {
    throw optionsError("scenario");
  }

  const faultPoints = opts.faultPoints ?? [];
  if (
    !Array.isArray(faultPoints) ||
    !faultPoints.every((point) => typeof point === "string" && POINT_PATTERN.test(point))
  ) {
    throw optionsError("faultPoints");
  }

  const args = opts.args ?? {};
  if (
    typeof args !== "object" ||
    args === null ||
    Array.isArray(args) ||
    !Object.values(args).every((value) => typeof value === "string")
  ) {
    throw optionsError("args");
  }

  if (!Number.isInteger(readyTimeoutMs) || readyTimeoutMs < 1 || readyTimeoutMs > 600000) {
    throw optionsError("readyTimeoutMs");
  }

  return {
    cluster: opts.cluster,
    scenario: opts.scenario,
    faultPoints: [...faultPoints],
    args: { ...args },
  };
}

function childEnvironment(cluster: CrashCluster): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(cluster.env)) {
    if (key.startsWith(DATA_DIR_KEY_PREFIX)) {
      continue;
    }
    env[key] = value;
  }
  const path = process.env["PATH"];
  if (path !== undefined) {
    env["PATH"] = path;
  }
  const home = process.env["HOME"];
  if (home !== undefined) {
    env["HOME"] = home;
  }
  return env;
}

function appendOutput(logPath: string, text: string): void {
  appendFileSync(logPath, text);
}

function recordStderr(record: ChildRecord, text: string): void {
  record.stderrBuffer += text;
  const lines = record.stderrBuffer.split(/\r?\n/);
  record.stderrBuffer = lines.pop() ?? "";
  for (const line of lines) {
    if (line.length > 0) {
      record.lastStderrLine = line.slice(0, LAST_LINE_LIMIT);
    }
  }
}

function lastStderrLine(record: ChildRecord): string {
  if (record.stderrBuffer.length > 0) {
    return record.stderrBuffer.slice(0, LAST_LINE_LIMIT);
  }
  return record.lastStderrLine;
}

function startChild(state: EngineState): Promise<ChildRecord> {
  return new Promise<ChildRecord>((resolve, reject) => {
    let settled = false;
    let timedOut = false;

    const payload = JSON.stringify({
      scenario: state.opts.scenario,
      faultPoints: state.opts.faultPoints ?? [],
      args: state.opts.args ?? {},
      dataDir: state.opts.cluster.dataDir,
    });

    const proc = spawn(process.execPath, [CHILD_PATH, payload], {
      cwd: state.opts.cluster.dataDir,
      env: state.childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let resolveClosed: () => void = () => undefined;
    const closedPromise = new Promise<void>((resolveClosedPromise) => {
      resolveClosed = resolveClosedPromise;
    });

    const record: ChildRecord = {
      proc,
      pid: proc.pid ?? 0,
      ready: false,
      requested: false,
      closed: false,
      closedPromise,
      resolveClosed,
      stdoutBuffer: "",
      stderrBuffer: "",
      lastStderrLine: "",
    };

    state.current = record;

    const timer = setTimeout(() => {
      timedOut = true;
      record.requested = true;
      try {
        proc.kill("SIGKILL");
      } catch {
        // The child is already gone.
      }
    }, state.readyTimeoutMs);

    function settleReady(): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      state.lastPid = record.pid;
      resolve(record);
    }

    function settleError(
      reason: string,
      details: Record<string, string | number | string[]>,
    ): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(startError(reason, details));
    }

    proc.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      appendOutput(state.logPath, text);
      record.stdoutBuffer += text;
      if (!record.ready && READY_LINE.test(record.stdoutBuffer)) {
        record.ready = true;
        settleReady();
      }
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      appendOutput(state.logPath, text);
      recordStderr(record, text);
    });

    proc.once("error", (error) => {
      settleError("exited", { line: error.message.slice(0, LAST_LINE_LIMIT) });
    });

    proc.once("close", (code, signal) => {
      record.closed = true;
      record.resolveClosed();
      if (record.ready && !record.requested) {
        state.deaths += 1;
      }
      if (timedOut) {
        settleError("timeout", { line: lastStderrLine(record), pid: record.pid });
        return;
      }
      const details: Record<string, string | number | string[]> = {
        line: lastStderrLine(record),
      };
      if (code !== null) {
        details["exitCode"] = code;
      }
      if (signal !== null) {
        details["signal"] = signal;
      }
      settleError("exited", details);
    });
  });
}

function enqueue<T>(state: EngineState, task: () => Promise<T>): Promise<T> {
  const run = state.chain.then(task);
  state.chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function doKill(state: EngineState): Promise<void> {
  const record = state.current;
  if (record === null || record.closed) {
    return;
  }
  record.requested = true;
  try {
    record.proc.kill("SIGKILL");
  } catch {
    // The child is already gone.
  }
  await record.closedPromise;
}

export function faultMarkerDir(dataDir: string): string {
  return join(dataDir, "fault-markers");
}

export async function spawnEngine(opts: SpawnOptions): Promise<EngineProcess> {
  return spawnEngineTuned(opts, { readyTimeoutMs: READY_TIMEOUT_MS });
}

export async function spawnEngineTuned(
  opts: SpawnOptions,
  tuning: { readyTimeoutMs: number },
): Promise<EngineProcess> {
  const valid = validateOptions(opts, tuning.readyTimeoutMs);
  mkdirSync(valid.cluster.dataDir, { recursive: true });

  const state: EngineState = {
    opts: valid,
    readyTimeoutMs: tuning.readyTimeoutMs,
    logPath: join(valid.cluster.dataDir, "engine.log"),
    childEnv: childEnvironment(valid.cluster),
    current: null,
    lastPid: 0,
    deaths: 0,
    stopped: false,
    chain: Promise.resolve(),
  };

  const engine: EngineProcess = {
    get pid(): number {
      return state.lastPid;
    },
    get deaths(): number {
      return state.deaths;
    },
    kill(): Promise<void> {
      return enqueue(state, async () => {
        await doKill(state);
      });
    },
    restart(): Promise<void> {
      return enqueue(state, async () => {
        if (state.stopped) {
          throw new E2eStackError("CRASH_STOPPED", "the engine has been stopped");
        }
        await doKill(state);
        await startChild(state);
      });
    },
    stop(): Promise<void> {
      return enqueue(state, async () => {
        state.stopped = true;
        await doKill(state);
      });
    },
  };

  await startChild(state);

  const existing = enginesByDataDir.get(valid.cluster.dataDir);
  if (existing === undefined) {
    enginesByDataDir.set(valid.cluster.dataDir, new Set([engine]));
  } else {
    existing.add(engine);
  }

  return engine;
}

export async function stopEnginesUnder(dataDir: string): Promise<void> {
  const engines = enginesByDataDir.get(dataDir);
  if (engines === undefined) {
    return;
  }
  enginesByDataDir.delete(dataDir);
  for (const engine of engines) {
    try {
      await engine.stop();
    } catch {
      // A stop failure must not mask the cluster's close result.
    }
  }
}
