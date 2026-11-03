import { randomUUID } from "node:crypto";

import type { DurableJson, DurableRuntime } from "../../../src/durable/index.ts";
import {
  prepareDurable,
  registerWorkflow,
  resumeDurable,
  runStep,
  suspendDurable,
} from "../../../src/durable/index.ts";
import { databaseApi, E2E_TEMPLATE } from "./database-part.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const DURABLE_READY_WORKFLOW: string = "stack.ready";

export interface ReadyOptions {
  timeoutMs?: number;
  pollMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  workflowId?: string;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_POLL_MS = 20;
const FAILED_STATES: ReadonlySet<string> = new Set([
  "ERROR",
  "CANCELLED",
  "MAX_RECOVERY_ATTEMPTS_EXCEEDED",
]);

function notReady(details: Record<string, string>): E2eStackError {
  return new E2eStackError("STACK_DURABLE_NOT_READY", "the durable runtime is not ready", details);
}

function badOption(): E2eStackError {
  return notReady({ reason: "bad_option" });
}

function readTimeout(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  if (!Number.isInteger(value) || value < 1 || value > 60000) {
    throw badOption();
  }
  return value;
}

function readPoll(value: number | undefined, timeoutMs: number): number {
  if (value === undefined) {
    return Math.min(DEFAULT_POLL_MS, timeoutMs);
  }
  if (!Number.isInteger(value) || value < 1 || value > timeoutMs) {
    throw badOption();
  }
  return value;
}

export async function checkDurableReady(
  runtime: DurableRuntime,
  opts: ReadyOptions = {},
): Promise<void> {
  const timeoutMs = readTimeout(opts.timeoutMs);
  const pollMs = readPoll(opts.pollMs, timeoutMs);
  const now = opts.now ?? (() => Date.now());
  const sleep =
    opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const workflowId = opts.workflowId ?? `ready-${randomUUID()}`;

  await runtime.enqueue(DURABLE_READY_WORKFLOW, workflowId, "ping");

  const startedAt = now();
  for (;;) {
    const info = await runtime.status(workflowId);
    const state = info?.state ?? "missing";
    if (state === "SUCCESS") {
      return;
    }
    if (FAILED_STATES.has(state)) {
      throw notReady({ state });
    }
    if (now() - startedAt >= timeoutMs) {
      throw notReady({ state });
    }
    await sleep(pollMs);
  }
}

async function readyWorkflow(input: DurableJson): Promise<DurableJson> {
  return runStep("ping", async () => input);
}

let readyRegistered = false;

function ensureReadyWorkflow(): void {
  if (readyRegistered) {
    return;
  }
  registerWorkflow(DURABLE_READY_WORKFLOW, readyWorkflow);
  readyRegistered = true;
}

async function quietly<T>(run: () => Promise<T>): Promise<T> {
  const original = {
    log: console.log,
    info: console.info,
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  };
  const silent = (): void => undefined;
  console.log = silent;
  console.info = silent;
  console.debug = silent;
  console.warn = silent;
  console.error = silent;
  try {
    return await run();
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.debug = original.debug;
    console.warn = original.warn;
    console.error = original.error;
  }
}

async function start(ctx: PartContext): Promise<PartHandle> {
  ensureReadyWorkflow();

  const ownerUrl = new URL(databaseApi(ctx.handles).ownerUrl);
  ownerUrl.pathname = `/${E2E_TEMPLATE}`;
  await quietly(() => prepareDurable(ownerUrl.toString()));

  return {
    env: {},
    close: async (): Promise<void> => {
      const runtime = await suspendDurable();
      if (runtime !== null) {
        await runtime.shutdown();
      }
    },
  };
}

async function beforeReset(): Promise<void> {
  await suspendDurable();
}

async function seed(): Promise<void> {
  const runtime = await resumeDurable();
  if (runtime === null) {
    return;
  }
  await checkDurableReady(runtime);
}

export const durablePart: E2eStackPart = {
  name: "durable",
  start,
  beforeReset,
  seed,
};
