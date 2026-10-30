import assert from "node:assert/strict";
import { test } from "node:test";

import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { ApiError } from "./errors.ts";
import { PAGE_QUERY_SCHEMA, readPage } from "./pagination.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

assert.equal(typeof readPage, "function");
assert.ok(PAGE_QUERY_SCHEMA !== undefined, "PAGE_QUERY_SCHEMA is exported");

const silentDestination: LogDestination = { write(): void {} };

interface PageQuery {
  limit: number;
  cursor: string | null;
}

function deps(): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  };
}

function readsPage(query: unknown): PageQuery {
  let page: unknown;
  assert.doesNotThrow(() => {
    page = readPage(query);
  }, "readPage accepts a page query");
  return page as PageQuery;
}

test("C-84761431 readPage answers defaults and bounds of limit and cursor", () => {
  assert.deepEqual(readsPage({}), { limit: 50, cursor: null });
  assert.deepEqual(readsPage({ limit: "25" }), { limit: 25, cursor: null });
  assert.deepEqual(readsPage({ limit: 1 }), { limit: 1, cursor: null });
  assert.deepEqual(readsPage({ limit: "200", cursor: "abc" }), {
    limit: 200,
    cursor: "abc",
  });
});

test("C-63d6bb95 readPage refuses out of range limit and cursor values", () => {
  const badLimits: unknown[] = ["0", "201", "-1", "1.5", "abc", "", ["5", "6"]];
  for (const limit of badLimits) {
    assert.throws(
      () => {
        readPage({ limit });
      },
      (error: unknown) => {
        if (!(error instanceof ApiError)) return false;
        assert.equal(error.status, 400, `readPage refuses limit ${JSON.stringify(limit)} with 400`);
        assert.equal(error.code, "VALIDATION_FAILED", `readPage refuses limit ${JSON.stringify(limit)} with VALIDATION_FAILED`);
        const fields = (error.details as { fields?: { field?: string }[] } | undefined)?.fields ?? [];
        assert.ok(
          fields.some((issue) => issue.field === "querystring/limit"),
          `readPage refuses limit ${JSON.stringify(limit)} with a querystring/limit field`,
        );
        return true;
      },
      `readPage refuses the limit ${JSON.stringify(limit)}`,
    );
  }

  const badCursors: unknown[] = ["", "a".repeat(1025), 7];
  for (const cursor of badCursors) {
    assert.throws(
      () => {
        readPage({ cursor });
      },
      (error: unknown) => {
        if (!(error instanceof ApiError)) return false;
        assert.equal(error.status, 400, `readPage refuses cursor ${JSON.stringify(cursor)} with 400`);
        assert.equal(error.code, "VALIDATION_FAILED", `readPage refuses cursor ${JSON.stringify(cursor)} with VALIDATION_FAILED`);
        const fields = (error.details as { fields?: { field?: string }[] } | undefined)?.fields ?? [];
        assert.ok(
          fields.some((issue) => issue.field === "querystring/cursor"),
          `readPage refuses cursor ${JSON.stringify(cursor)} with a querystring/cursor field`,
        );
        return true;
      },
      `readPage refuses the cursor ${JSON.stringify(cursor)}`,
    );
  }
});

test("C-76c81a8c a route with the page query schema validates limit through the server", async (t) => {
  const server = await buildServer(deps());
  t.after(async () => {
    await server.close();
  });
  server.get(
    "/lists",
    { schema: { querystring: PAGE_QUERY_SCHEMA } },
    async (request) => readPage(request.query),
  );
  await server.ready();

  for (const url of ["/lists?limit=201", "/lists?limit=0", "/lists?limit=abc"]) {
    const refused = await server.inject({ method: "GET", url });
    assert.equal(refused.statusCode, 400, `${url} fails with 400`);
    const body = refused.json() as { error?: { code?: string; details?: { fields?: { field?: string }[] } } };
    assert.equal(body.error?.code, "VALIDATION_FAILED", `${url} fails with VALIDATION_FAILED`);
    const fields = body.error?.details?.fields ?? [];
    assert.ok(
      fields.some((issue) => issue.field === "querystring/limit"),
      `${url} enters a querystring/limit field`,
    );
  }

  const limited = await server.inject({ method: "GET", url: "/lists?limit=20" });
  assert.equal(limited.statusCode, 200, "limit 20 passes");
  assert.deepEqual(limited.json(), { limit: 20, cursor: null });

  const withoutQuery = await server.inject({ method: "GET", url: "/lists" });
  assert.equal(withoutQuery.statusCode, 200, "no query passes");
  assert.deepEqual(withoutQuery.json(), { limit: 50, cursor: null });
});
