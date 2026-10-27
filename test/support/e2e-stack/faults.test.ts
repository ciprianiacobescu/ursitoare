import assert from "node:assert/strict";
import { test } from "node:test";

import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import type { Fault } from "./faults.ts";
import { FaultInvalidError, createFaultTable, parseFault } from "./faults.ts";

type Outcome<T> = { value: T } | { error: string };

// Turns any throw (including the stubs') into data, so the test fails on its assertion.
function attempt<T>(call: () => T): Outcome<T> {
  try {
    return { value: call() };
  } catch (error) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

async function attemptAsync<T>(call: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { value: await call() };
  } catch (error) {
    return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}

function reasonOf(input: unknown): string {
  try {
    parseFault(input);
    return "accepted";
  } catch (error) {
    if (error instanceof FaultInvalidError) return error.reason;
    return `other: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function appWith(table: ReturnType<typeof createFaultTable>): Promise<FastifyInstance> {
  const app = Fastify();
  app.route({ method: ["GET", "POST"], url: "/health", handler: async () => ({ status: "ok" }) });
  app.route({ method: ["GET", "POST"], url: "/api/v1/x", handler: async () => ({ route: "x" }) });
  app.route({ method: "GET", url: "/apix", handler: async () => ({ route: "apix" }) });
  app.addHook("onRequest", table.hook);
  await app.ready();
  return app;
}

test("C-14cae224 parseFault names the first failing field of an invalid fault", () => {
  assert.equal(typeof parseFault, "function");
  const observed = {
    empty: reasonOf({}),
    noEffect: reasonOf({ method: "GET", url: "/x" }),
    lower: reasonOf({ method: "get", url: "/x", status: 500 }),
    relative: reasonOf({ method: "GET", url: "x", status: 500 }),
    query: reasonOf({ method: "GET", url: "/a?b=1", status: 500 }),
    status200: reasonOf({ method: "GET", url: "/x", status: 200 }),
    delay: reasonOf({ method: "GET", url: "/x", delayMs: 30001 }),
    extra: reasonOf({ method: "GET", url: "/x", status: 500, extra: 1 }),
    nullBody: reasonOf(null),
    arrayBody: reasonOf([]),
    extraFirst: reasonOf({ method: "nope", extra: 1 }),
    midStar: reasonOf({ method: "GET", url: "/a*/b", status: 500 }),
    fraction: reasonOf({ method: "GET", url: "/x", delayMs: 1.5 }),
  };
  assert.deepEqual(observed, {
    empty: "bad_method",
    noEffect: "empty_fault",
    lower: "bad_method",
    relative: "bad_url",
    query: "bad_url",
    status200: "bad_status",
    delay: "bad_delay",
    extra: "unknown_property",
    nullBody: "not_object",
    arrayBody: "not_object",
    extraFirst: "unknown_property",
    midStar: "bad_url",
    fraction: "bad_delay",
  });
});

test("C-14cae224 FaultInvalidError carries its code, reason and message", () => {
  const made = attempt(() => {
    const error = new FaultInvalidError("bad_json");
    return { code: error.code, reason: error.reason, message: error.message };
  });
  assert.deepEqual(made, {
    value: { code: "FAULT_INVALID", reason: "bad_json", message: "Invalid fault: bad_json" },
  });
});

test("C-14cae224 the 101st distinct fault is refused with too_many and the table is unchanged", () => {
  const outcome = attempt(() => {
    const table = createFaultTable();
    for (let i = 0; i < 100; i += 1) table.add({ method: "GET", url: `/f${i}`, status: 500 });
    table.add({ method: "GET", url: "/f0", status: 503 }); // replacement is not a new fault
    const before = table.list();
    let reason = "accepted";
    try {
      table.add({ method: "GET", url: "/f100", status: 500 });
    } catch (error) {
      reason = error instanceof FaultInvalidError ? error.reason : "other";
    }
    return { count: before.length, first: before[0], reason, after: table.list().length };
  });
  assert.deepEqual(outcome, {
    value: { count: 100, first: { method: "GET", url: "/f0", status: 503 }, reason: "too_many", after: 100 },
  });
});

test("C-9383903b parseFault accepts exact, prefix, delay and status faults", () => {
  const parsed = attempt(() => [
    parseFault({ method: "GET", url: "/health", status: 503 }),
    parseFault({ method: "POST", url: "/api/*", delayMs: 250 }),
    parseFault({ method: "DELETE", url: "/", delayMs: 0, status: 599 }),
  ]);
  assert.deepEqual(parsed, {
    value: [
      { method: "GET", url: "/health", status: 503 },
      { method: "POST", url: "/api/*", delayMs: 250 },
      { method: "DELETE", url: "/", delayMs: 0, status: 599 },
    ],
  });
});

test("C-9383903b a prefix delay sleeps once for the matching request, which continues, and a replacement answers 500", async () => {
  const outcome = await attemptAsync(async () => {
    const sleeps: number[] = [];
    const table = createFaultTable({
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });
    table.add({ method: "GET", url: "/api/*", delayMs: 250 });
    const app = await appWith(table);
    try {
      const first = await app.inject({ method: "GET", url: "/api/v1/x?y=1" });
      const second = await app.inject({ method: "GET", url: "/apix" });
      const third = await app.inject({ method: "POST", url: "/api/v1/x" });
      const sleptBefore = [...sleeps];
      table.add({ method: "GET", url: "/api/*", status: 500 });
      const listed = table.list();
      const replaced = await app.inject({ method: "GET", url: "/api/v1/x" });
      return {
        sleptBefore,
        statuses: [first.statusCode, second.statusCode, third.statusCode],
        listed,
        replaced: replaced.statusCode,
      };
    } finally {
      await app.close();
    }
  });
  assert.deepEqual(outcome, {
    value: {
      sleptBefore: [250],
      statuses: [200, 200, 200],
      listed: [{ method: "GET", url: "/api/*", status: 500 }],
      replaced: 500,
    },
  });
});

test("C-9383903b an exact fault matches its method and the path before the query only, first match wins", async () => {
  const outcome = await attemptAsync(async () => {
    const table = createFaultTable();
    table.add({ method: "GET", url: "/health", status: 503 });
    table.add({ method: "GET", url: "/*", status: 502 });
    const app = await appWith(table);
    try {
      const health = await app.inject({ method: "GET", url: "/health?probe=1" });
      const post = await app.inject({ method: "POST", url: "/health" });
      const other = await app.inject({ method: "GET", url: "/apix" });
      return [health.statusCode, post.statusCode, other.statusCode];
    } finally {
      await app.close();
    }
  });
  assert.deepEqual(outcome, { value: [503, 200, 502] });
});

test("C-346ddf48 a status fault answers the injected envelope and clear restores the route", async () => {
  const outcome = await attemptAsync(async () => {
    const table = createFaultTable();
    table.add({ method: "GET", url: "/health", status: 503 });
    const app = await appWith(table);
    try {
      const faulted = await app.inject({ method: "GET", url: "/health" });
      const body = faulted.json() as unknown;
      const other = await app.inject({ method: "GET", url: "/nowhere" });
      table.clear();
      const cleared = await app.inject({ method: "GET", url: "/health" });
      return { status: faulted.statusCode, body, other: other.statusCode, cleared: cleared.statusCode, left: table.list() };
    } finally {
      await app.close();
    }
  });
  assert.deepEqual(outcome, {
    value: {
      status: 503,
      body: { error: { code: "FAULT_INJECTED", message: "Injected fault", details: { status: 503 } } },
      other: 404,
      cleared: 200,
      left: [] as Fault[],
    },
  });
});
