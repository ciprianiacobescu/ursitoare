/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Api } from "../admin/shared.ts";
import { ApiRequestError, createApiClient } from "../api/client.ts";
import {
  loadAllGrants,
  loadAllToolServers,
  parseGrantRecord,
} from "./ref-carry.ts";

assert.equal(typeof parseGrantRecord, "function");
assert.equal(typeof loadAllGrants, "function");
assert.equal(typeof loadAllToolServers, "function");

const CP1 = "ledger.create_payment@1";
const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

async function settled<T>(p: Promise<T>): Promise<T> {
  await assert.doesNotReject(p);
  return await p;
}

async function rejected(p: Promise<unknown>): Promise<unknown> {
  try {
    await p;
  } catch (error) {
    return error;
  }
  assert.fail("the call must reject");
}

async function invalid(p: Promise<unknown>): Promise<void> {
  const error = await rejected(p);
  assert.ok(error instanceof ApiRequestError, "the error is an ApiRequestError");
  assert.equal(error.status, 200);
  assert.equal(error.code, "INVALID_RESPONSE");
}

function G(over: Record<string, unknown> = {}, status = "active"): Record<string, unknown> {
  return {
    grant: {
      id: "grant_1",
      subject: { kind: "role", role: "author" },
      tool: CP1,
      scope: { kind: "any_step" },
      args: [],
      fingerprints: [],
      state: "active",
      createdBy: "u_carol",
      createdAt: "2026-11-06T10:00:00.000000Z",
      revokedBy: null,
      revokedAt: null,
      ...over,
    },
    status,
  };
}

function arg(
  name: string,
  value: string | number | boolean,
  op = "eq",
): Record<string, unknown> {
  return { arg: name, op, value };
}

function manyArgs(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_value, i) => arg(`a${i}`, i));
}

const THREE = [
  { arg: "amount", op: "lte", value: 100 },
  { arg: "currency", op: "eq", value: "EUR" },
  { arg: "dry", op: "eq", value: true },
];

const MALFORMED: [string, unknown][] = [
  ["null", null],
  ["array", []],
  ["string", "x"],
  ["status paused", G({}, "paused")],
  ["no grant", { status: "active" }],
  ["grant is a number", { grant: 5, status: "active" }],
  ["id g1", G({ id: "g1" })],
  ["id too long", G({ id: "grant_" + "a".repeat(64) })],
  ["tool without at", G({ tool: "no-at" })],
  ["tool too long", G({ tool: "a." + "b".repeat(125) + "@1" })],
  ["subject team", G({ subject: { kind: "team", role: "author" } })],
  ["role Author", G({ subject: { kind: "role", role: "Author" } })],
  ["user id too long", G({ subject: { kind: "user", userId: "u".repeat(65) } })],
  ["node without nodeId", G({ scope: { kind: "node", flowId: "pay-run" } })],
  ["flow Pay", G({ scope: { kind: "node", flowId: "Pay", nodeId: "pay" } })],
  ["scope any", G({ scope: { kind: "any" } })],
  ["args string", G({ args: "none" })],
  ["nine args", G({ args: manyArgs(9) })],
  ["arg Amount", G({ args: [{ arg: "Amount", op: "eq", value: "x" }] })],
  ["op ne", G({ args: [{ arg: "amount", op: "ne", value: 1 }] })],
  ["value null", G({ args: [{ arg: "amount", op: "eq", value: null }] })],
  ["value object", G({ args: [{ arg: "amount", op: "eq", value: {} }] })],
  ["value too long", G({ args: [{ arg: "amount", op: "eq", value: "x".repeat(257) }] })],
];

interface RecordedGet {
  path: string;
  opts: unknown;
}

function getFake(replies: readonly unknown[]): { calls: RecordedGet[]; api: Api<"get"> } {
  const calls: RecordedGet[] = [];
  let index = 0;
  const api = {
    get: async (path: string, opts?: unknown): Promise<unknown> => {
      calls.push({ path, opts });
      const reply = replies[Math.min(index, replies.length - 1)];
      index += 1;
      if (reply instanceof Error) throw reply;
      return reply;
    },
  } as unknown as Api<"get">;
  return { calls, api };
}

function getAnswer(answer: () => unknown): { calls: RecordedGet[]; api: Api<"get"> } {
  const calls: RecordedGet[] = [];
  const api = {
    get: async (path: string, opts?: unknown): Promise<unknown> => {
      calls.push({ path, opts });
      const reply = answer();
      if (reply instanceof Error) throw reply;
      return reply;
    },
  } as unknown as Api<"get">;
  return { calls, api };
}

function RC(id: string): Record<string, unknown> {
  return {
    id,
    adapter: "http_openapi",
    origin: "https://tools.fake.test",
    state: "approved",
    registeredBy: "u_carol",
    approvedDigest: null,
    pendingDigest: null,
    pendingSubmittedBy: null,
    tools: [{ name: "create_payment", effect: "pay", ref: `${id}.create_payment@1` }],
  };
}

test("C-d7d00513 parseGrantRecord reads a grant with its arguments and the boundary values", () => {
  const role = call(() => parseGrantRecord(G({ args: THREE })));
  assert.ok(role !== null);
  assert.deepEqual(role, {
    id: "grant_1",
    subject: { kind: "role", role: "author" },
    tool: CP1,
    scope: { kind: "any_step" },
    args: THREE,
    status: "active",
  });
  assert.ok(!("fingerprints" in role), "the view does not hold fingerprints");
  assert.ok(!("state" in role), "the view does not hold state");

  const user = call(() =>
    parseGrantRecord(
      G(
        {
          id: "grant_2",
          subject: { kind: "user", userId: "u_bob" },
          scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
          fingerprints: ["x"],
        },
        "needs_reconfirm",
      ),
    ),
  );
  assert.deepEqual(user, {
    id: "grant_2",
    subject: { kind: "user", userId: "u_bob" },
    tool: CP1,
    scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
    args: [],
    status: "needs_reconfirm",
  });

  const longId = "grant_" + "a".repeat(63);
  assert.equal(call(() => parseGrantRecord(G({ id: longId })))?.id, longId);

  const longTool = "a." + "b".repeat(124) + "@1";
  assert.equal(call(() => parseGrantRecord(G({ tool: longTool })))?.tool, longTool);

  assert.equal(call(() => parseGrantRecord(G({ args: manyArgs(8) })))?.args.length, 8);

  const longValue = "x".repeat(256);
  const longValueRecord = call(() =>
    parseGrantRecord(G({ args: [{ arg: "amount", op: "eq", value: longValue }] })),
  );
  assert.equal(longValueRecord?.args[0]?.value, longValue);

  const longUser = "u".repeat(64);
  assert.deepEqual(
    call(() => parseGrantRecord(G({ subject: { kind: "user", userId: longUser } })))?.subject,
    { kind: "user", userId: longUser },
  );
});

test("C-d7d00513 parseGrantRecord refuses each malformed record", () => {
  assert.equal(MALFORMED.length, 23);
  for (const [name, raw] of MALFORMED) {
    assert.equal(call(() => parseGrantRecord(raw)), null, name);
  }
});

test("C-b97e74b9 loadAllGrants reads every page with its cursor limit and signal", async () => {
  const signal = new AbortController().signal;
  const { calls, api } = getFake([
    { items: [G(), G({ id: "grant_2" })], next_cursor: "c2" },
    { items: [G({ id: "grant_3" })], next_cursor: null },
  ]);

  const result = await settled(loadAllGrants(api, signal));

  assert.deepEqual(
    result.grants.map((grant) => grant.id),
    ["grant_1", "grant_2", "grant_3"],
  );
  assert.equal(result.complete, true);
  assert.deepEqual(calls, [
    { path: "/grants", opts: { query: { limit: 100 }, signal } },
    { path: "/grants", opts: { query: { limit: 100, cursor: "c2" }, signal } },
  ]);
});

test("C-b97e74b9 loadAllGrants stops at a hundred pages and reports it incomplete", async () => {
  let n = 0;
  const { calls, api } = getAnswer(() => {
    n += 1;
    return { items: [G({ id: `grant_${n}` })], next_cursor: `c${n}` };
  });

  const result = await settled(loadAllGrants(api));

  assert.equal(calls.length, 100);
  assert.equal(result.grants.length, 100);
  assert.equal(result.complete, false);
});

test("C-b97e74b9 loadAllGrants refuses a bad item and a bad page", async () => {
  const badItem = getFake([
    { items: [G()], next_cursor: "c2" },
    { items: [G({ id: "grant_2" }), { grant: 5, status: "active" }], next_cursor: null },
  ]);
  await invalid(loadAllGrants(badItem.api));

  const badPage = getFake([{ items: "x", next_cursor: null }]);
  await invalid(loadAllGrants(badPage.api));
});

test("C-b97e74b9 loadAllGrants rejects with the failed request error", async () => {
  const failure = new ApiRequestError(500, "INTERNAL", "m");
  const { api } = getFake([failure]);

  assert.equal(await rejected(loadAllGrants(api)), failure);
});

test("C-b97e74b9 loadAllGrants always passes an AbortSignal", async () => {
  const { calls, api } = getFake([{ items: [], next_cursor: null }]);

  await settled(loadAllGrants(api));

  assert.equal(calls.length, 1);
  const opts = calls[0]?.opts as { signal?: unknown } | undefined;
  assert.ok(opts?.signal instanceof AbortSignal, "the request carries an AbortSignal");
});

test("C-b97e74b9 loadAllToolServers reads every page with its cursor limit and signal", async () => {
  const signal = new AbortController().signal;
  const { calls, api } = getFake([
    { items: [RC("ledger")], next_cursor: "s2" },
    { items: [RC("acme")], next_cursor: null },
  ]);

  const result = await settled(loadAllToolServers(api, signal));

  assert.deepEqual(
    result.servers.map((server) => server.id),
    ["ledger", "acme"],
  );
  assert.deepEqual(
    result.servers.map((server) => server.tools[0]?.ref),
    ["ledger.create_payment@1", "acme.create_payment@1"],
  );
  assert.equal(result.complete, true);
  assert.deepEqual(calls, [
    { path: "/tool-servers", opts: { query: { limit: 100 }, signal } },
    { path: "/tool-servers", opts: { query: { limit: 100, cursor: "s2" }, signal } },
  ]);
});

test("C-b97e74b9 loadAllToolServers refuses an unreadable item", async () => {
  const { api } = getFake([{ items: [RC("ledger"), { id: "Bad" }], next_cursor: null }]);
  await invalid(loadAllToolServers(api));
});

test("C-b97e74b9 loadAllToolServers stops at a hundred pages and reports it incomplete", async () => {
  let n = 0;
  const { calls, api } = getAnswer(() => {
    n += 1;
    return { items: [RC(`srv${n}`)], next_cursor: `s${n}` };
  });

  const result = await settled(loadAllToolServers(api));

  assert.equal(calls.length, 100);
  assert.equal(result.complete, false);
});

test("C-b97e74b9 loadAllToolServers rejects a 401 from the real client", async () => {
  const urls: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    urls.push(url);
    return new Response(
      JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "m" } }),
      { status: 401, headers: { "content-type": "application/json" } },
    );
  }) as typeof globalThis.fetch;
  const client = createApiClient({ fetch: fetchImpl });

  const error = await rejected(loadAllToolServers(client));

  assert.ok(error instanceof ApiRequestError, "the error is an ApiRequestError");
  assert.equal(error.status, 401);
  assert.equal(error.code, "UNAUTHENTICATED");
  assert.deepEqual(urls, ["/api/v1/tool-servers?limit=100"]);
});
