import { DBOS } from "@dbos-inc/dbos-sdk";
import type { DBOSConfig, DLogger } from "@dbos-inc/dbos-sdk";
import type pg from "pg";

import { createPool } from "../db/index.ts";
import type { EndpointLike } from "../db/index.ts";
import type { Logger } from "../observability/index.ts";
import { DurableError } from "./errors.ts";
import { isDurableJson } from "./json.ts";
import { DBOS_SCHEMA } from "./prepare.ts";
import { isRegistered } from "./registry.ts";

export type DurableJson =
  | null
  | boolean
  | number
  | string
  | DurableJson[]
  | { [key: string]: DurableJson };

export const APPLICATION_VERSION: string = "ursitoare-1";

export const RUNS_QUEUE: string = "runs";

export type StepPhase = "before" | "after";

export type StepObserver = (phase: StepPhase, step: string, workflowId: string) => void;

export type WorkflowState =
  | "ENQUEUED"
  | "PENDING"
  | "SUCCESS"
  | "ERROR"
  | "CANCELLED"
  | "MAX_RECOVERY_ATTEMPTS_EXCEEDED"
  | "DELAYED";

export interface WorkflowInfo {
  workflowId: string;
  workflow: string;
  state: WorkflowState;
}

export interface DurableRuntime {
  readonly applicationVersion: string;
  enqueue(workflow: string, workflowId: string, input: DurableJson): Promise<void>;
  status(workflowId: string): Promise<WorkflowInfo | null>;
  cancel(workflowId: string): Promise<void>;
  shutdown(): Promise<void>;
}

export interface LaunchOptions {
  endpoint: EndpointLike;
  logger: Logger;
  pollingIntervalMs?: number;
  concurrency?: number;
  stepObserver?: StepObserver;
  closePool?: (pool: pg.Pool) => Promise<void>;
}

const DURABLE_APPLICATION_NAME = "ursitoare-durable";
const WORKFLOW_ID = /^[A-Za-z0-9_-][A-Za-z0-9_.:-]{0,199}$/;
const SCHEMES = new Set(["postgres:", "postgresql:"]);

interface Active {
  kind: "running" | "suspended";
  opts: LaunchOptions;
  pool: pg.Pool | null;
  handle: DurableRuntime;
}

let active: Active | null = null;
let chain: Promise<unknown> = Promise.resolve();
let pending = 0;
const inflight = new Set<Promise<unknown>>();

function serial<T>(task: () => Promise<T>): Promise<T> {
  pending += 1;
  const run = chain.then(task, task);
  const settled = run.then(
    () => undefined,
    () => undefined,
  );
  chain = settled;
  void settled.then(() => {
    pending -= 1;
  });
  return run;
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return "unknown";
}

function unavailable(reason: string): DurableError {
  return new DurableError("DURABLE_UNAVAILABLE", "the durable runtime could not start", { reason });
}

function readOption(
  value: number | undefined,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new DurableError("DURABLE_INVALID", "invalid durable option", {
      reason: "bad_option",
      option: name,
    });
  }
  return value;
}

export function dbosLogger(logger: Logger): DLogger {
  const at =
    (level: "info" | "debug" | "warn" | "error") =>
    (entry: unknown): void => {
      // A pg error stringifies as "error: <server text>", which can hold a URL or a host: keep only the lead.
      logger[level]({ component: "dbos" }, String(entry).replace(/\berror: [\s\S]*$/, "error: [redacted]"));
    };
  return { info: at("info"), debug: at("debug"), warn: at("warn"), error: at("error") };
}

export function dbosConfig(opts: LaunchOptions, pool: pg.Pool): DBOSConfig {
  return {
    name: "ursitoare",
    systemDatabaseUrl: opts.endpoint.url,
    systemDatabasePool: pool,
    systemDatabaseSchemaName: DBOS_SCHEMA,
    runMigrations: false,
    enableOTLP: false,
    applicationVersion: APPLICATION_VERSION,
    logger: dbosLogger(opts.logger),
  };
}

async function closeEngine(opts: LaunchOptions, pool: pg.Pool | null): Promise<void> {
  const warn = (error: unknown): void => {
    opts.logger.warn({ component: "dbos", code: errorCode(error) }, "durable shutdown failed");
  };
  try {
    await DBOS.shutdown();
  } catch (error) {
    warn(error);
  }
  if (pool !== null) {
    try {
      await (opts.closePool ?? ((p: pg.Pool) => p.end()))(pool);
    } catch (error) {
      warn(error);
    }
  }
}

async function startEngine(opts: LaunchOptions, concurrency: number, polling: number): Promise<pg.Pool> {
  let parsed: URL;
  try {
    parsed = new URL(opts.endpoint.url);
  } catch {
    throw new DurableError("DURABLE_INVALID", "invalid durable endpoint", { reason: "bad_endpoint" });
  }
  if (!SCHEMES.has(parsed.protocol) || parsed.pathname.replace(/^\//, "") === "") {
    throw new DurableError("DURABLE_INVALID", "invalid durable endpoint", { reason: "bad_endpoint" });
  }
  if (parsed.password !== "") {
    throw new DurableError("DURABLE_INVALID", "invalid durable endpoint", {
      reason: "password_in_url",
    });
  }

  let pool: pg.Pool;
  try {
    pool = createPool(opts.endpoint, {
      max: 10,
      applicationName: DURABLE_APPLICATION_NAME,
      onError: (error) => {
        opts.logger.warn({ component: "dbos", code: errorCode(error) }, "durable pool error");
      },
    });
  } catch (error) {
    opts.logger.warn({ component: "dbos", code: errorCode(error) }, "durable pool refused");
    throw unavailable("config_failed");
  }

  const fail = async (reason: string, error: unknown, shutdownDbos: boolean): Promise<never> => {
    opts.logger.warn({ component: "dbos", code: errorCode(error) }, "durable launch failed");
    if (shutdownDbos) {
      try {
        await DBOS.shutdown();
      } catch {
        // the launch already failed; only the pool must not leak
      }
    }
    try {
      await pool.end();
    } catch {
      // nothing more to release
    }
    throw unavailable(reason);
  };

  try {
    const result = await pool.query<{ present: string | null }>(
      "SELECT to_regclass('\"dbos\".\"dbos_migrations\"') AS present",
    );
    if (result.rows[0]?.present === null || result.rows[0] === undefined) {
      try {
        await pool.end();
      } catch {
        // nothing more to release
      }
      throw unavailable("not_prepared");
    }
  } catch (error) {
    if (error instanceof DurableError) {
      throw error;
    }
    return fail("launch_failed", error, false);
  }

  try {
    DBOS.setConfig(dbosConfig(opts, pool));
    await DBOS.launch();
  } catch (error) {
    return fail("launch_failed", error, true);
  }

  try {
    await DBOS.registerQueue(RUNS_QUEUE, {
      minPollingIntervalMs: polling,
      workerConcurrency: concurrency,
    });
  } catch (error) {
    return fail("queue_failed", error, true);
  }
  return pool;
}

function checkId(workflowId: string): void {
  if (!WORKFLOW_ID.test(workflowId)) {
    throw new DurableError("DURABLE_INVALID", "invalid workflow id", { reason: "bad_workflow_id" });
  }
}

async function dbosCall(call: () => Promise<unknown>): Promise<void> {
  try {
    await call();
  } catch (error) {
    if (error instanceof DurableError) {
      throw error;
    }
    throw new DurableError("DURABLE_UNAVAILABLE", "the durable call failed", {
      reason: "dbos_failed",
    });
  }
}

export function launchBusy(): boolean {
  return pending > 0 || active?.kind === "running";
}

function makeHandle(): DurableRuntime {
  const handle: DurableRuntime = {
    applicationVersion: APPLICATION_VERSION,
    enqueue(workflow: string, workflowId: string, input: DurableJson): Promise<void> {
      return guarded(handle, async () => {
        if (!isRegistered(workflow)) {
          throw new DurableError("DURABLE_WORKFLOW_UNKNOWN", "unknown workflow", {
            reason: "not_registered",
          });
        }
        checkId(workflowId);
        if (!isDurableJson(input)) {
          throw new DurableError("DURABLE_INVALID", "invalid workflow input", { reason: "bad_input" });
        }
        await dbosCall(async () => {
          await DBOS.enqueueWorkflowWithOptions(
            {
              workflowName: workflow,
              queueName: RUNS_QUEUE,
              workflowID: workflowId,
              appVersion: APPLICATION_VERSION,
              workflowIDReusePolicy: "return-existing",
            },
            input,
          );
        });
      });
    },
    cancel(workflowId: string): Promise<void> {
      return guarded(handle, async () => {
        checkId(workflowId);
        await dbosCall(() => DBOS.cancelWorkflow(workflowId));
      });
    },
    status(workflowId: string): Promise<WorkflowInfo | null> {
      return guarded(handle, async () => {
        checkId(workflowId);
        try {
          const found = await DBOS.getWorkflowStatus(workflowId);
          if (found === null) {
            return null;
          }
          return {
            workflowId: found.workflowID,
            workflow: found.workflowName,
            state: found.status as WorkflowState,
          };
        } catch (error) {
          if (error instanceof DurableError) {
            throw error;
          }
          throw new DurableError("DURABLE_UNAVAILABLE", "the durable call failed", {
            reason: "dbos_failed",
          });
        }
      });
    },
    shutdown(): Promise<void> {
      return serial(async () => {
        if (active === null || active.handle !== handle) {
          return;
        }
        await settleInflight();
        const current = active;
        active = null;
        if (current.kind === "running") {
          await closeEngine(current.opts, current.pool);
        }
      });
    },
  };
  return handle;
}

function checkState(handle: DurableRuntime): void {
  if (active === null || active.handle !== handle) {
    throw new DurableError("DURABLE_NOT_LAUNCHED", "the durable runtime is shut down", {
      reason: "shut_down",
    });
  }
  if (active.kind === "suspended") {
    throw new DurableError("DURABLE_NOT_LAUNCHED", "the durable runtime is suspended", {
      reason: "suspended",
    });
  }
}

function guarded<T>(handle: DurableRuntime, call: () => Promise<T>): Promise<T> {
  const start = (): Promise<T> => {
    checkState(handle);
    const promise = call();
    inflight.add(promise);
    const forget = (): void => {
      inflight.delete(promise);
    };
    promise.then(forget, forget);
    return promise;
  };
  if (pending === 0) {
    try {
      return start();
    } catch (error) {
      return Promise.reject(error);
    }
  }
  const tail = chain;
  return tail.then(start);
}

async function settleInflight(): Promise<void> {
  await Promise.allSettled([...inflight]);
}

export function launchDurable(opts: LaunchOptions): Promise<DurableRuntime> {
  return serial(async () => {
    const polling = readOption(opts.pollingIntervalMs, "pollingIntervalMs", 50, 10, 60000);
    const concurrency = readOption(opts.concurrency, "concurrency", 4, 1, 64);
    if (active?.kind === "running") {
      throw new DurableError("DURABLE_ALREADY_LAUNCHED", "a durable runtime is already running", {
        reason: "running",
      });
    }
    const pool = await startEngine(opts, concurrency, polling);
    const handle = makeHandle();
    active = { kind: "running", opts, pool, handle };
    return handle;
  });
}

export function suspendDurable(): Promise<DurableRuntime | null> {
  return serial(async () => {
    if (active === null) {
      return null;
    }
    const current = active;
    if (current.kind === "running") {
      await settleInflight();
      await closeEngine(current.opts, current.pool);
      active = { ...current, kind: "suspended", pool: null };
    }
    return current.handle;
  });
}

export function resumeDurable(): Promise<DurableRuntime | null> {
  return serial(async () => {
    if (active?.kind !== "suspended") {
      return null;
    }
    const current = active;
    const polling = readOption(current.opts.pollingIntervalMs, "pollingIntervalMs", 50, 10, 60000);
    const concurrency = readOption(current.opts.concurrency, "concurrency", 4, 1, 64);
    const pool = await startEngine(current.opts, concurrency, polling);
    active = { ...current, kind: "running", pool };
    return current.handle;
  });
}
