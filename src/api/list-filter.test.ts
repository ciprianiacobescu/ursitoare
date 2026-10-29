import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { Decision, PolicyEngine, PolicyRequest } from "../pdp/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { ApiError } from "./errors.ts";
import { listPredicate } from "./list-filter.ts";
import { installPep } from "./pep.ts";
import { defineRoute } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    advance(seconds: number): void {
      millis += seconds * 1000;
    },
  };
}

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function permitAllEngine(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-list-filter-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(600),
    logger: silentLogger(),
  });
}

async function engineWithoutTenantPolicy(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-list-filter-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(610),
    logger: silentLogger(),
  });
}

const POLICY_SET_VERSION = "a".repeat(64);

function stubEngine(check: (request: PolicyRequest) => Promise<Decision>): PolicyEngine {
  return {
    policySetVersion: POLICY_SET_VERSION,
    actions: [],
    policies: [],
    check,
    allowedActions: async () => [],
  };
}

function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
}

async function session(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  clock: Clock,
): Promise<{ cookie: string; userId: string; csrfToken: string }> {
  let created: { cookie: string; userId: string; csrfToken: string } | undefined;
  await assert.doesNotReject(async () => {
    created = await createTestSession(db, ctx, subject, clock);
  });
  assert.ok(created !== undefined, "createTestSession returns a session");
  return created;
}

function whichOf(request: FastifyRequest): string {
  return (request.query as { which?: string }).which ?? "";
}

assert.equal(typeof listPredicate, "function");
assert.equal(typeof defineRoute, "function");
assert.equal(typeof installPep, "function");

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-8690a372 an item filter keeps only the readable items and refuses a bare array payload", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    const payloads: Record<string, unknown> = {
      full: { items: [{ id: 1, team: "finance" }, { id: 2, team: "ops" }], next_cursor: "c1" },
      empty: { items: [] },
    };
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/items",
        auth: { kind: "session" },
        action: "read_flow",
        listFilter: {
          kind: "item",
          canRead: (_p, item) => (item as { team?: string }).team === "finance",
        },
        schema: {},
        errors: [],
        handler: async (request) => {
          if (whichOf(request) === "bare") {
            return [{ id: 3, team: "finance" }];
          }
          return payloads[whichOf(request)];
        },
      });
    }, "defineRoute");

    const alice = await session(db, a, "alice", clock);

    const full = await server.inject({
      method: "GET",
      url: "/api/v1/test/items?which=full",
      headers: { cookie: alice.cookie },
    });
    assert.equal(full.statusCode, 200);
    assert.deepEqual(full.json(), {
      items: [{ id: 1, team: "finance" }],
      next_cursor: "c1",
    });

    const empty = await server.inject({
      method: "GET",
      url: "/api/v1/test/items?which=empty",
      headers: { cookie: alice.cookie },
    });
    assert.equal(empty.statusCode, 200);
    assert.deepEqual(empty.json(), { items: [] });

    const bare = await server.inject({
      method: "GET",
      url: "/api/v1/test/items?which=bare",
      headers: { cookie: alice.cookie },
    });
    assert.equal(bare.statusCode, 500);
    assert.equal(
      (bare.json() as { error?: { code?: string } }).error?.code,
      "INTERNAL",
      "a bare array payload is refused",
    );
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-f2f45e63 a sql filter marks the request and refuses a handler that skips its predicate", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/items-sql",
        auth: { kind: "session" },
        action: "read_flow",
        listFilter: {
          kind: "sql",
          predicate: (p, first) => ({
            sql: "owner_team = ANY($" + first + ")",
            values: [p.teams],
          }),
        },
        schema: {},
        errors: [],
        handler: async (request) => ({
          items: [],
          where: listPredicate(request, 2),
        }),
      });
    }, "defineRoute the sql route");

    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/items-sql-skip",
        auth: { kind: "session" },
        action: "read_flow",
        listFilter: {
          kind: "sql",
          predicate: (p, first) => ({
            sql: "owner_team = ANY($" + first + ")",
            values: [p.teams],
          }),
        },
        schema: {},
        errors: [],
        handler: async () => ({ items: [{ id: 1 }] }),
      });
    }, "defineRoute the skipping route");

    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/items-plain",
        auth: { kind: "session" },
        action: "read_flow",
        schema: {},
        errors: [],
        handler: async (request) => {
          try {
            listPredicate(request, 1);
            return { items: [] };
          } catch (error) {
            return {
              caught: (error as { code?: string }).code ?? null,
              reason: (error as { details?: { reason?: string } }).details?.reason ?? null,
            };
          }
        },
      });
    }, "defineRoute the route without a sql filter");

    const alice = await session(db, a, "alice", clock);

    const applied = await server.inject({
      method: "GET",
      url: "/api/v1/test/items-sql",
      headers: { cookie: alice.cookie },
    });
    assert.equal(applied.statusCode, 200);
    assert.deepEqual(applied.json(), {
      items: [],
      where: { sql: "owner_team = ANY($2)", values: [[]] },
    });

    const skipped = await server.inject({
      method: "GET",
      url: "/api/v1/test/items-sql-skip",
      headers: { cookie: alice.cookie },
    });
    assert.equal(skipped.statusCode, 500);
    assert.equal(
      (skipped.json() as { error?: { code?: string } }).error?.code,
      "INTERNAL",
      "a handler that skips its sql predicate is refused",
    );
    assert.ok(!skipped.body.includes("items"), "no items reach the body");

    const plain = await server.inject({
      method: "GET",
      url: "/api/v1/test/items-plain",
      headers: { cookie: alice.cookie },
    });
    assert.equal(plain.statusCode, 200);
    assert.deepEqual(plain.json(), {
      caught: "ROUTE_DEF_INVALID",
      reason: "no_sql_filter",
    });
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-ff0152a4 error replies pass a list route unchanged", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const permitAll = await permitAllEngine(clock);
    const engine = await engineWithoutTenantPolicy(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/items",
        auth: { kind: "session" },
        action: "read_flow",
        listFilter: { kind: "item", canRead: () => false },
        schema: {},
        errors: [],
        handler: async () => ({ items: [{ id: 1 }] }),
      });
    }, "defineRoute the item route");

    const alice = await session(db, a, "alice", clock);

    const unauthenticated = await server.inject({
      method: "GET",
      url: "/api/v1/test/items",
    });
    assert.equal(unauthenticated.statusCode, 401);
    assert.deepEqual(unauthenticated.json(), {
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });

    const forbidden = await server.inject({
      method: "GET",
      url: "/api/v1/test/items",
      headers: { cookie: alice.cookie },
    });
    assert.equal(forbidden.statusCode, 403);
    const forbiddenBody = forbidden.json() as {
      error: { code: string; message: string; details?: { decisionId?: string } };
    };
    assert.equal(forbiddenBody.error.code, "FORBIDDEN");
    assert.equal(forbiddenBody.error.message, "Action not permitted");
    assert.equal(typeof forbiddenBody.error.details?.decisionId, "string");

    const permitAllServer = await testServer();
    try {
      assert.doesNotThrow(() => {
        installPep(permitAllServer, {
          pool: db.appPool,
          engine: permitAll,
          clock,
          publicBaseUrl: BASE_URL,
        });
      }, "installPep the permit-all server");

      assert.doesNotThrow(() => {
        defineRoute(permitAllServer, {
          method: "GET",
          url: "/api/v1/test/items-error",
          auth: { kind: "session" },
          action: "read_flow",
          listFilter: {
            kind: "sql",
            predicate: (p, first) => ({
              sql: "owner_team = ANY($" + first + ")",
              values: [p.teams],
            }),
          },
          schema: {},
          errors: [],
          handler: async () => {
            throw new ApiError(409, "FLOW_LOCKED", "Flow is locked");
          },
        });
      }, "defineRoute the throwing sql route");

      const locked = await permitAllServer.inject({
        method: "GET",
        url: "/api/v1/test/items-error",
        headers: { cookie: alice.cookie },
      });
      assert.equal(locked.statusCode, 409);
      assert.deepEqual(locked.json(), {
        error: { code: "FLOW_LOCKED", message: "Flow is locked" },
      });
    } finally {
      await permitAllServer.close();
    }

    const peplessServer = await testServer();
    try {
      assert.doesNotThrow(() => {
        installPep(peplessServer, {
          pool: null,
          engine: stubEngine(async () => ({} as Decision)),
          clock,
          publicBaseUrl: BASE_URL,
        });
      }, "installPep without a pool");

      assert.doesNotThrow(() => {
        defineRoute(peplessServer, {
          method: "GET",
          url: "/api/v1/test/items",
          auth: { kind: "session" },
          action: "read_flow",
          listFilter: { kind: "item", canRead: () => false },
          schema: {},
          errors: [],
          handler: async () => ({ items: [{ id: 1 }] }),
        });
      }, "defineRoute on the pepless server");

      const unavailable = await peplessServer.inject({
        method: "GET",
        url: "/api/v1/test/items",
        headers: { cookie: alice.cookie },
      });
      assert.equal(unavailable.statusCode, 503);
      assert.deepEqual(unavailable.json(), {
        error: { code: "AUTHZ_UNAVAILABLE", message: "Authorization is unavailable" },
      });
    } finally {
      await peplessServer.close();
    }
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-da500cdd a list route refuses a 2xx string or Buffer payload", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/items-string",
        auth: { kind: "session" },
        action: "read_flow",
        listFilter: { kind: "item", canRead: () => false },
        schema: {},
        errors: [],
        handler: async () => "secret",
      });
    }, "defineRoute the string route");

    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/items-buffer",
        auth: { kind: "session" },
        action: "read_flow",
        listFilter: {
          kind: "sql",
          predicate: (p, first) => ({
            sql: "owner_team = ANY($" + first + ")",
            values: [p.teams],
          }),
        },
        schema: {},
        errors: [],
        handler: async () => Buffer.from("secret"),
      });
    }, "defineRoute the buffer route");

    const alice = await session(db, a, "alice", clock);

    const stringReply = await server.inject({
      method: "GET",
      url: "/api/v1/test/items-string",
      headers: { cookie: alice.cookie },
    });
    assert.equal(stringReply.statusCode, 500);
    assert.equal(
      (stringReply.json() as { error?: { code?: string } }).error?.code,
      "INTERNAL",
    );
    assert.ok(!stringReply.body.includes("secret"), "the string payload is not sent");

    const bufferReply = await server.inject({
      method: "GET",
      url: "/api/v1/test/items-buffer",
      headers: { cookie: alice.cookie },
    });
    assert.equal(bufferReply.statusCode, 500);
    assert.equal(
      (bufferReply.json() as { error?: { code?: string } }).error?.code,
      "INTERNAL",
    );
    assert.ok(!bufferReply.body.includes("secret"), "the Buffer payload is not sent");
  } finally {
    await server.close();
    await db.close();
  }
});
