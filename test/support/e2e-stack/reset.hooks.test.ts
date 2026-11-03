import assert from "node:assert/strict";
import { test } from "node:test";

import { createFaultTable } from "./faults.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";
import { E2eStackError, createPartRegistry } from "./part.ts";
import { createResetRunner } from "./reset.ts";

type HookPart = E2eStackPart & {
  beforeReset?(ctx: PartContext): Promise<void>;
};

type Settled =
  | { ok: true }
  | { ok: false; name: string; code?: string; details?: unknown };

async function settled(promise: Promise<unknown>): Promise<Settled> {
  try {
    await promise;
    return { ok: true };
  } catch (error) {
    const name = error instanceof Error ? error.name : "non-error";
    if (error instanceof E2eStackError) {
      return { ok: false, name, code: error.code, details: error.details };
    }
    return { ok: false, name };
  }
}

function thrown(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  assert.fail("expected the call to throw");
}

function contextFor(name: string): PartContext {
  return {
    name,
    dataDir: `/tmp/${name}`,
    engineOrigin: "http://127.0.0.1:39080",
    controlOrigin: "http://127.0.0.1:39081",
    env: {},
    handles: new Map(),
  };
}

function handle(): PartHandle {
  return { env: {}, close: async () => undefined };
}

const context = (part: E2eStackPart): PartContext => contextFor(part.name);

test("C-2c0ae21b beforeReset hooks run in reverse part order before the seeds and a failed hook rejects STACK_RESET_FAILED naming the part", async () => {
  const log: string[] = [];
  let failP3 = false;

  const p1: HookPart = {
    name: "p1",
    start: async (): Promise<PartHandle> => handle(),
    beforeReset: async (ctx) => {
      log.push(`hook:${ctx.name}`);
    },
    seed: async (ctx) => {
      log.push(`seed:${ctx.name}`);
    },
  };

  const p2: E2eStackPart = {
    name: "p2",
    start: async (): Promise<PartHandle> => handle(),
    seed: async (ctx) => {
      log.push(`seed:${ctx.name}`);
    },
  };

  const p3: HookPart = {
    name: "p3",
    start: async (): Promise<PartHandle> => handle(),
    beforeReset: async (ctx) => {
      log.push(`hook:${ctx.name}`);
      if (failP3) throw new Error("hook failed");
    },
    seed: async (ctx) => {
      log.push(`seed:${ctx.name}`);
    },
  };

  const runner = createResetRunner({
    parts: [p1, p2, p3],
    context,
    faults: createFaultTable(),
    engineHealthy: async () => true,
  });

  await runner.seedAll();
  assert.deepEqual(log, ["seed:p1", "seed:p2", "seed:p3"], "seedAll runs no hook");

  await runner.reset();
  assert.deepEqual(
    log,
    ["seed:p1", "seed:p2", "seed:p3", "hook:p3", "hook:p1", "seed:p1", "seed:p2", "seed:p3"],
    "a reset runs every hook in reverse part order before the seeds",
  );

  failP3 = true;
  const failed = await settled(runner.reset());
  assert.deepEqual(failed, {
    ok: false,
    name: "E2eStackError",
    code: "STACK_RESET_FAILED",
    details: { part: "p3" },
  });
  assert.deepEqual(log.slice(8), ["hook:p3"], "the failing reset stops at p3 and adds no hook:p1 or seed");

  failP3 = false;
  const recovered = await settled(runner.reset());
  assert.deepEqual(recovered, { ok: true }, "the next reset passes once the hook is fixed");
  assert.deepEqual(
    log.slice(9),
    ["hook:p3", "hook:p1", "seed:p1", "seed:p2", "seed:p3"],
    "the recovered reset runs the full hook and seed order again",
  );
});

test("C-2c0ae21b registry refuses a part whose beforeReset is not a function", () => {
  const registry = createPartRegistry();
  const invalid = {
    name: "p4",
    start: async (): Promise<PartHandle> => handle(),
    beforeReset: "x",
  } as unknown as E2eStackPart;

  const error = thrown(() => registry.register(invalid));
  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  assert.equal(error.code, "STACK_PART_INVALID");
  assert.deepEqual(registry.list(), [], "the invalid part is not registered");
});
