import assert from "node:assert/strict";
import { mock, test } from "node:test";

import type { FaultTable } from "./faults.ts";
import { createFaultTable } from "./faults.ts";
import type { E2eStackPart, PartContext } from "./part.ts";
import { E2eStackError } from "./part.ts";
import { createResetRunner } from "./reset.ts";

type Outcome<T> = { value: T } | { error: string };

type Settled = { ok: true } | { ok: false; name: string; code?: string; details?: unknown };

// Turns any throw (including the stubs') into data, so the test fails on its assertion.
async function attemptAsync<T>(call: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { value: await call() };
  } catch (error) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

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

function fakePart(name: string, seed?: (ctx: PartContext) => Promise<void>): E2eStackPart {
  return {
    name,
    start: async () => ({ env: {}, close: async () => undefined }),
    ...(seed === undefined ? {} : { seed }),
  };
}

const context = (part: E2eStackPart): PartContext => contextFor(part.name);

test("C-20bba381 seedAll seeds every part in order without clearing faults or probing the engine", async () => {
  assert.equal(typeof createResetRunner, "function");

  const outcome = await attemptAsync(async () => {
    const calls: string[] = [];
    const faults = createFaultTable();
    faults.add({ method: "GET", url: "/health", status: 503 });
    let probes = 0;
    const runner = createResetRunner({
      parts: [
        fakePart("a", async (ctx) => {
          calls.push(`seed:${ctx.name}`);
        }),
        fakePart("b", async (ctx) => {
          calls.push(`seed:${ctx.name}`);
        }),
      ],
      context,
      faults,
      engineHealthy: async () => {
        probes += 1;
        return true;
      },
    });

    await runner.seedAll();
    return { calls, faults: faults.list(), probes };
  });

  assert.deepEqual(outcome, {
    value: {
      calls: ["seed:a", "seed:b"],
      faults: [{ method: "GET", url: "/health", status: 503 }],
      probes: 0,
    },
  });
});

test("C-20bba381 a reset clears the faults before seeding every part in order and probing the engine", async () => {
  const outcome = await attemptAsync(async () => {
    const calls: string[] = [];
    const real = createFaultTable();
    real.add({ method: "GET", url: "/health", status: 503 });
    const faults: FaultTable = {
      add(fault) {
        real.add(fault);
      },
      clear() {
        calls.push("faults:clear");
        real.clear();
      },
      list() {
        return real.list();
      },
      hook(request, reply) {
        return real.hook(request, reply);
      },
    };
    let probes = 0;
    const runner = createResetRunner({
      parts: [
        fakePart("a", async (ctx) => {
          calls.push(`seed:${ctx.name}`);
        }),
        fakePart("b", async (ctx) => {
          calls.push(`seed:${ctx.name}`);
        }),
      ],
      context,
      faults,
      engineHealthy: async () => {
        calls.push("probe");
        probes += 1;
        return true;
      },
    });

    await runner.reset();
    return { calls, faults: faults.list(), probes };
  });

  assert.deepEqual(outcome, {
    value: { calls: ["faults:clear", "seed:a", "seed:b", "probe"], faults: [], probes: 1 },
  });
});

test("C-20bba381 two resets started together seed serially with a maximum concurrency of one", async () => {
  const outcome = await attemptAsync(async () => {
    const seeds: string[] = [];
    let active = 0;
    let maxActive = 0;
    const seed = async (ctx: PartContext): Promise<void> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      seeds.push(ctx.name);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active -= 1;
    };
    let probes = 0;
    const runner = createResetRunner({
      parts: [fakePart("a", seed), fakePart("b", seed)],
      context,
      faults: createFaultTable(),
      engineHealthy: async () => {
        probes += 1;
        return true;
      },
    });

    await runner.seedAll();
    await Promise.all([runner.reset(), runner.reset()]);
    const counts: Record<string, number> = {};
    for (const name of seeds) counts[name] = (counts[name] ?? 0) + 1;
    return { seeds, counts, maxActive, probes };
  });

  assert.deepEqual(outcome, {
    value: {
      seeds: ["a", "b", "a", "b", "a", "b"],
      counts: { a: 3, b: 3 },
      maxActive: 1,
      probes: 2,
    },
  });
});

test("C-20bba381 a rejecting seed rejects STACK_RESET_FAILED naming the part and the next reset still runs", async () => {
  const outcome = await attemptAsync(async () => {
    const seeds: string[] = [];
    let fail = true;
    let probes = 0;
    const runner = createResetRunner({
      parts: [
        fakePart("a", async (ctx) => {
          seeds.push(ctx.name);
        }),
        fakePart("b", async (ctx) => {
          seeds.push(ctx.name);
          if (fail) throw new Error("seed failed");
        }),
      ],
      context,
      faults: createFaultTable(),
      engineHealthy: async () => {
        probes += 1;
        return true;
      },
    });

    const failed = await settled(runner.reset());
    const probesAfterFailure = probes;
    fail = false;
    const recovered = await settled(runner.reset());
    return { failed, seeds, probesAfterFailure, recovered, probes };
  });

  assert.deepEqual(outcome, {
    value: {
      failed: { ok: false, name: "E2eStackError", code: "STACK_RESET_FAILED", details: { part: "b" } },
      seeds: ["a", "b", "a", "b"],
      probesAfterFailure: 0,
      recovered: { ok: true },
      probes: 1,
    },
  });
});

test("C-c3238bfc reset retries the health probe until it answers true, using three calls", async () => {
  const outcome = await attemptAsync(async () => {
    const replies = [false, false, true];
    let probes = 0;
    const runner = createResetRunner({
      parts: [fakePart("a", async () => undefined)],
      context,
      faults: createFaultTable(),
      engineHealthy: async () => {
        const reply = replies[probes] ?? true;
        probes += 1;
        return reply;
      },
    });

    const result = await settled(runner.reset());
    return { result, probes };
  });

  assert.deepEqual(outcome, { value: { result: { ok: true }, probes: 3 } });
});

test("C-c3238bfc five unhealthy probes reject STACK_RESET_FAILED for the engine after exactly five calls without a timer", async () => {
  const realSetTimeout = globalThis.setTimeout;
  const outcome = await attemptAsync(async () => {
    let probes = 0;
    const runner = createResetRunner({
      parts: [],
      context,
      faults: createFaultTable(),
      engineHealthy: async () => {
        probes += 1;
        return false;
      },
    });

    const spy = mock.method(globalThis, "setTimeout");
    try {
      const result = await Promise.race([
        settled(runner.reset()),
        new Promise<{ timedOut: true }>((resolve) => realSetTimeout(() => resolve({ timedOut: true }), 5000)),
      ]);
      return { result, probes, timers: spy.mock.callCount() };
    } finally {
      spy.mock.restore();
    }
  });

  assert.deepEqual(outcome, {
    value: {
      result: { ok: false, name: "E2eStackError", code: "STACK_RESET_FAILED", details: { part: "engine" } },
      probes: 5,
      timers: 0,
    },
  });
});
