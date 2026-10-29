import assert from "node:assert/strict";
import { test } from "node:test";

import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { ApiError } from "./errors.ts";
import { IDEMPOTENCY_HEADER_SCHEMA, idempotencyKeyOf, requestDigestOf } from "./idempotency.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

assert.equal(typeof idempotencyKeyOf, "function");

const silentDestination: LogDestination = { write(): void {} };

function deps(): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  };
}

interface KeyAnswer {
  key?: string | null;
  error?: { status: number; code: string; details: unknown };
}

test("C-4c925b2a idempotencyKeyOf returns valid keys, null when absent and refuses the rest", async (t) => {
  const server = await buildServer(deps());
  t.after(async () => {
    await server.close();
  });
  server.get("/key", async (request): Promise<KeyAnswer> => {
    try {
      return { key: idempotencyKeyOf(request) };
    } catch (error) {
      if (error instanceof ApiError) {
        return { error: { status: error.status, code: error.code, details: error.details } };
      }
      throw error;
    }
  });
  await server.ready();

  async function answerFor(header: string | undefined): Promise<KeyAnswer> {
    const headers: Record<string, string> = header === undefined ? {} : { "idempotency-key": header };
    const response = await server.inject({ method: "GET", url: "/key", headers });
    return response.json() as KeyAnswer;
  }

  const long = "a".repeat(128);
  assert.deepEqual(await answerFor("abc-123_X.~"), { key: "abc-123_X.~" });
  assert.deepEqual(await answerFor(long), { key: long });
  assert.deepEqual(await answerFor(undefined), { key: null });

  for (const bad of ["", "a".repeat(129), "has space", "café"]) {
    const answer = await answerFor(bad);
    assert.equal(answer.error?.status, 400, `${JSON.stringify(bad)} is refused with 400`);
    assert.equal(answer.error?.code, "VALIDATION_FAILED", `${JSON.stringify(bad)} is VALIDATION_FAILED`);
    assert.deepEqual(answer.error?.details, {
      fields: [{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }],
    });
  }
});

test("C-71f81f3b a route with the header schema refuses an invalid key", async (t) => {
  const server = await buildServer(deps());
  t.after(async () => {
    await server.close();
  });
  server.get("/schema", { schema: { headers: IDEMPOTENCY_HEADER_SCHEMA } }, async () => ({ ok: true }));
  await server.ready();

  const good = await server.inject({ method: "GET", url: "/schema", headers: { "idempotency-key": "k-1" } });
  assert.equal(good.statusCode, 200, "k-1 passes");

  const bad = await server.inject({ method: "GET", url: "/schema", headers: { "idempotency-key": "has space" } });
  assert.equal(bad.statusCode, 400, "a key with a space is refused");
  const body = bad.json() as { error?: { code?: string; details?: { fields?: { field?: string }[] } } };
  assert.equal(body.error?.code, "VALIDATION_FAILED");
  assert.ok(
    (body.error?.details?.fields ?? []).some((issue) => issue.field === "headers/idempotency-key"),
    "the refusal names headers/idempotency-key",
  );

  const none = await server.inject({ method: "GET", url: "/schema" });
  assert.equal(none.statusCode, 200, "no key passes");
});

test("C-40ba5812 requestDigestOf is stable over key order and differs per part", () => {
  const digest = (parts: Parameters<typeof requestDigestOf>[0]): string => {
    let value = "";
    assert.doesNotThrow(() => {
      value = requestDigestOf(parts);
    }, "requestDigestOf computes a digest");
    return value;
  };

  const base = {
    method: "POST",
    route: "/api/v1/things",
    params: { id: "1", z: { b: 1, a: 2 } },
    query: { limit: "5", cursor: "c" },
    body: { name: "n", tags: ["a", "b"], nested: { x: 1, y: 2 } },
  };
  const reordered = {
    body: { nested: { y: 2, x: 1 }, tags: ["a", "b"], name: "n" },
    query: { cursor: "c", limit: "5" },
    params: { z: { a: 2, b: 1 }, id: "1" },
    route: "/api/v1/things",
    method: "POST",
  };
  const first = digest(base);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.equal(digest(reordered), first);

  const changed = [
    digest({ ...base, method: "PUT" }),
    digest({ ...base, route: "/api/v1/other" }),
    digest({ ...base, params: { id: "2", z: { b: 1, a: 2 } } }),
    digest({ ...base, query: { limit: "6", cursor: "c" } }),
    digest({ ...base, body: { name: "m", tags: ["a", "b"], nested: { x: 1, y: 2 } } }),
  ];
  for (const other of changed) {
    assert.notEqual(other, first);
  }
  assert.equal(new Set([first, ...changed]).size, 6, "every changed part gives its own digest");

  const omitted = digest({ method: "POST", route: "/r" });
  assert.equal(omitted, digest({ method: "POST", route: "/r", params: null, query: null, body: null }));
  assert.match(omitted, /^[0-9a-f]{64}$/);
});
