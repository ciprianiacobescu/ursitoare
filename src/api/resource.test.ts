import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import type { Principal } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, entityRef } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { ApiError } from "./errors.ts";
import { installPep } from "./pep.ts";
import { defineRoute } from "./route.ts";
import type { ResourceRef } from "./route.ts";
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-resource-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(500),
    logger: silentLogger(),
  });
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

interface DecisionRow {
  decision_id: string;
  action: string;
  decision: string;
  resource: string;
  reasons: string[];
}

async function decisionRows(db: TestDatabase, ctx: TenantContext): Promise<DecisionRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<DecisionRow>(
      "SELECT decision_id, action, decision, resource, reasons FROM ursitoare.policy_decision ORDER BY decided_at, decision_id",
    );
    return result.rows;
  });
}

function flowIdOf(request: FastifyRequest): string {
  return (request.params as { flowId?: string }).flowId ?? "";
}

assert.equal(typeof defineRoute, "function");
assert.equal(typeof installPep, "function");

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-7eb422a8 a loaded resource is checked under its tenant and the loaded ref is decided", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    const loaderPrincipals: (Principal | undefined)[] = [];
    let handlerCalls = 0;
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/flows/:flowId",
        auth: { kind: "session" },
        action: "read_flow",
        resource: async (request): Promise<ResourceRef | null> => {
          loaderPrincipals.push(request.principal);
          const flowId = flowIdOf(request);
          if (flowId !== "flow-1") {
            return null;
          }
          return {
            type: "Flow",
            id: "flow-1",
            tenantId: "tenant_a",
            attrs: {
              owner_team: entityRef("Team", "tenant_a/finance"),
              reviewed: false,
            },
          };
        },
        schema: {},
        errors: [],
        handler: async () => {
          handlerCalls += 1;
          return { ok: true };
        },
      });
    }, "defineRoute");

    const alice = await session(db, a, "alice", clock);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/test/flows/flow-1",
      headers: { cookie: alice.cookie },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.equal(handlerCalls, 1);

    assert.equal(loaderPrincipals.length, 1, "the loader runs exactly once");
    const loaderPrincipal = loaderPrincipals[0];
    assert.ok(loaderPrincipal !== undefined, "the loader sees the principal");
    assert.equal(loaderPrincipal.userId, alice.userId);

    const rows = await decisionRows(db, a);
    assert.equal(rows.length, 1, "tenant A holds exactly one decision row");
    const row = rows[0];
    assert.ok(row !== undefined);
    assert.equal(row.action, "read_flow");
    assert.equal(row.decision, "allow");
    assert.equal(row.resource, 'Flow::"tenant_a/flow-1"');
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-d88f7662 an absent foreign or failing resource is refused before a decision is made", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    let handlerCalls = 0;
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/flows/:flowId",
        auth: { kind: "session" },
        action: "read_flow",
        resource: async (request): Promise<ResourceRef | null> => {
          const flowId = flowIdOf(request);
          switch (flowId) {
            case "flow-9":
              return null;
            case "flow-b":
              return {
                type: "Flow",
                id: "flow-b",
                tenantId: "tenant_b",
                attrs: {
                  owner_team: entityRef("Team", "tenant_b/finance"),
                  reviewed: false,
                },
              };
            case "flow-lock":
              throw new ApiError(409, "FLOW_LOCKED", "Flow is locked");
            case "flow-err":
              throw new Error("boom");
            default:
              return null;
          }
        },
        schema: {},
        errors: [],
        handler: async () => {
          handlerCalls += 1;
          return { ok: true };
        },
      });
    }, "defineRoute");

    const alice = await session(db, a, "alice", clock);

    const absent = await server.inject({
      method: "GET",
      url: "/api/v1/test/flows/flow-9",
      headers: { cookie: alice.cookie },
    });
    assert.equal(absent.statusCode, 404);
    assert.equal((absent.json() as { error: { code: string } }).error.code, "NOT_FOUND");
    assert.deepEqual(await decisionRows(db, a), [], "an absent resource records no decision");

    const foreign = await server.inject({
      method: "GET",
      url: "/api/v1/test/flows/flow-b",
      headers: { cookie: alice.cookie },
    });
    assert.equal(foreign.statusCode, 403);
    const foreignBody = foreign.json() as {
      error: { code: string; details?: { decisionId?: string } };
    };
    assert.equal(foreignBody.error.code, "FORBIDDEN");
    const decisionId = foreignBody.error.details?.decisionId;
    assert.equal(typeof decisionId, "string");
    const foreignRows = await decisionRows(db, a);
    const denied = foreignRows.find((row) => row.decision_id === decisionId);
    assert.ok(denied !== undefined, "the cross-tenant decision is recorded");
    assert.equal(denied.decision, "deny");
    assert.ok(
      denied.reasons.includes("platform-cross-tenant-forbid"),
      "the platform cross-tenant forbid is a reason",
    );

    const locked = await server.inject({
      method: "GET",
      url: "/api/v1/test/flows/flow-lock",
      headers: { cookie: alice.cookie },
    });
    assert.equal(locked.statusCode, 409);
    assert.deepEqual(locked.json(), {
      error: { code: "FLOW_LOCKED", message: "Flow is locked" },
    });

    const failing = await server.inject({
      method: "GET",
      url: "/api/v1/test/flows/flow-err",
      headers: { cookie: alice.cookie },
    });
    assert.equal(failing.statusCode, 500);
    assert.equal((failing.json() as { error: { code: string } }).error.code, "INTERNAL");
    assert.ok(!failing.body.includes("boom"), "the error message does not leak");

    assert.equal(handlerCalls, 0, "the handler never runs without a resource");
    assert.equal((await decisionRows(db, a)).length, 1, "only the foreign decision is recorded");
  } finally {
    await server.close();
    await db.close();
  }
});
