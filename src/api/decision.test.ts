import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { Decision, PolicyEngine, PolicyRequest } from "../pdp/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { installPep } from "./pep.ts";
import { defineRoute } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const POLICY_SET_VERSION = "a".repeat(64);

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

async function engineWithTenantPolicy(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-decision-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(300),
    logger: silentLogger(),
  });
}

async function engineWithoutTenantPolicy(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-decision-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(400),
    logger: silentLogger(),
  });
}

function stubEngine(check: (request: PolicyRequest) => Promise<Decision>): PolicyEngine {
  return {
    policySetVersion: POLICY_SET_VERSION,
    actions: [],
    policies: [],
    check,
    allowedActions: async () => [],
  };
}

function decisionOf(
  clock: Clock,
  decision: "allow" | "deny",
  decisionId: string,
  errors: string[],
): Decision {
  return {
    decision,
    decisionId,
    decidedAt: clock.now().toISOString(),
    reasons: [],
    errors,
    policySetVersion: POLICY_SET_VERSION,
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

function poolFailingAudit(pool: TestDatabase["appPool"]): TenantPool {
  const wrapped = {
    async connect() {
      const client = await pool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            const raw = target as unknown as {
              query: (query: unknown, values?: unknown) => Promise<unknown>;
            };
            return (query: unknown, values?: unknown) => {
              const text =
                typeof query === "string"
                  ? query
                  : (query as { text?: unknown } | null)?.text;
              if (typeof text === "string" && text.includes("audit_")) {
                return Promise.reject(new Error("audit statements are unavailable"));
              }
              return raw.query(query, values);
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
  return wrapped as unknown as TenantPool;
}

interface DecisionRow {
  decision_id: string;
  action: string;
  decision: string;
  principal: string;
  resource: string;
  errors: string[];
}

async function decisionRows(db: TestDatabase, ctx: TenantContext): Promise<DecisionRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<DecisionRow>(
      "SELECT decision_id, action, decision, principal, resource, errors FROM ursitoare.policy_decision ORDER BY decided_at, decision_id",
    );
    return result.rows;
  });
}

interface AuditRow {
  event_type: string;
  actor: { kind: string; id: string };
  target: { kind: string; id: string } | null;
  payload: Record<string, unknown>;
}

async function auditRows(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      "SELECT event_type, actor, target, payload FROM ursitoare.audit_event ORDER BY seq",
    );
    return result.rows;
  });
}

assert.equal(typeof installPep, "function");
assert.equal(typeof defineRoute, "function");

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-7d0a8576 an allowed request is decided with the default tenant resource and recorded", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await engineWithTenantPolicy(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    let handlerCalls = 0;
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/self",
        auth: { kind: "session" },
        action: "read_self",
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
      url: "/api/v1/test/self",
      headers: { cookie: alice.cookie },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.equal(handlerCalls, 1);

    const rows = await decisionRows(db, a);
    assert.equal(rows.length, 1, "tenant A holds exactly one decision row");
    const row = rows[0];
    assert.ok(row !== undefined);
    assert.equal(row.action, "read_self");
    assert.equal(row.decision, "allow");
    assert.equal(row.principal, `User::"tenant_a/${alice.userId}"`);
    assert.equal(row.resource, 'Tenant::"tenant_a"');
    assert.deepEqual(row.errors, []);

    const denied = (await auditRows(db, a)).filter(
      (event) => event.event_type === "authz.denied",
    );
    assert.deepEqual(denied, []);
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-af47ea36 a denied request is recorded, audited and answers 403 with its decision id", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await engineWithoutTenantPolicy(clock);
    assert.doesNotThrow(() => {
      installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep");

    let handlerCalls = 0;
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/flows",
        auth: { kind: "session" },
        action: "read_flow",
        schema: {},
        errors: [],
        handler: async () => {
          handlerCalls += 1;
          return { items: [] };
        },
      });
    }, "defineRoute");

    const alice = await session(db, a, "alice", clock);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/test/flows",
      headers: { cookie: alice.cookie },
    });

    assert.equal(response.statusCode, 403);
    const body = response.json() as {
      error: { code: string; message: string; details?: { decisionId?: string } };
    };
    assert.equal(body.error.code, "FORBIDDEN");
    assert.equal(body.error.message, "Action not permitted");
    const decisionId = body.error.details?.decisionId;
    assert.equal(typeof decisionId, "string");
    assert.ok(typeof decisionId === "string" && decisionId.length > 0);
    assert.equal(handlerCalls, 0, "the handler never runs on a denial");

    const rows = await decisionRows(db, a);
    const row = rows.find((candidate) => candidate.decision_id === decisionId);
    assert.ok(row !== undefined, "the denied decision is recorded");
    assert.equal(row.decision, "deny");
    assert.equal(row.action, "read_flow");

    const events = await auditRows(db, a);
    assert.equal(events.length, 1, "one authz.denied event");
    const event = events[0];
    assert.ok(event !== undefined);
    assert.equal(event.event_type, "authz.denied");
    assert.deepEqual(event.actor, { kind: "user", id: alice.userId });
    assert.deepEqual(event.target, { kind: "action", id: "read_flow" });
    assert.deepEqual(event.payload, {
      decisionId,
      method: "GET",
      route: "/api/v1/test/flows",
      resourceType: "Tenant",
    });
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-b1687a15 a failing refusal audit still answers 403 and keeps the recorded decision", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await engineWithoutTenantPolicy(clock);
    assert.doesNotThrow(() => {
      installPep(server, {
        pool: poolFailingAudit(db.appPool),
        engine,
        clock,
        publicBaseUrl: BASE_URL,
      });
    }, "installPep");

    let handlerCalls = 0;
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/flows",
        auth: { kind: "session" },
        action: "read_flow",
        schema: {},
        errors: [],
        handler: async () => {
          handlerCalls += 1;
          return { items: [] };
        },
      });
    }, "defineRoute");

    const alice = await session(db, a, "alice", clock);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/test/flows",
      headers: { cookie: alice.cookie },
    });

    assert.equal(response.statusCode, 403);
    const body = response.json() as {
      error: { code: string; message: string; details?: { decisionId?: string } };
    };
    assert.equal(body.error.code, "FORBIDDEN");
    assert.equal(body.error.message, "Action not permitted");
    const decisionId = body.error.details?.decisionId;
    assert.equal(typeof decisionId, "string");
    assert.ok(typeof decisionId === "string" && decisionId.length > 0);
    assert.equal(handlerCalls, 0);

    const rows = await decisionRows(db, a);
    assert.ok(
      rows.some((candidate) => candidate.decision_id === decisionId),
      "the decision row exists despite the failing audit",
    );
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-1cd8fac0 an allow or deny carrying policy evaluation errors is a 403 and the errors are recorded", async () => {
  const db = await withTestDatabase();
  const denyServer = await testServer();
  const allowServer = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await session(db, a, "alice", clock);

    const denyDecisionId = "decision-error-deny";
    const allowDecisionId = "decision-error-allow";
    const errors = ["PDP_EVALUATION_ERROR:p1"];

    const denyEngine = stubEngine(async () =>
      decisionOf(clock, "deny", denyDecisionId, errors),
    );
    const allowEngine = stubEngine(async () =>
      decisionOf(clock, "allow", allowDecisionId, errors),
    );

    assert.doesNotThrow(() => {
      installPep(denyServer, {
        pool: db.appPool,
        engine: denyEngine,
        clock,
        publicBaseUrl: BASE_URL,
      });
    }, "installPep deny");
    assert.doesNotThrow(() => {
      defineRoute(denyServer, {
        method: "GET",
        url: "/api/v1/test/decide",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler: async () => ({ ok: true }),
      });
    }, "defineRoute deny");

    assert.doesNotThrow(() => {
      installPep(allowServer, {
        pool: db.appPool,
        engine: allowEngine,
        clock,
        publicBaseUrl: BASE_URL,
      });
    }, "installPep allow");
    assert.doesNotThrow(() => {
      defineRoute(allowServer, {
        method: "GET",
        url: "/api/v1/test/decide",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler: async () => ({ ok: true }),
      });
    }, "defineRoute allow");

    const denyResponse = await denyServer.inject({
      method: "GET",
      url: "/api/v1/test/decide",
      headers: { cookie: alice.cookie },
    });
    assert.equal(denyResponse.statusCode, 403);
    const denyBody = denyResponse.json() as {
      error: { code: string; message: string; details?: { decisionId?: string } };
    };
    assert.equal(denyBody.error.code, "FORBIDDEN");
    assert.equal(denyBody.error.message, "Action not permitted");
    assert.deepEqual(denyBody.error.details, { decisionId: denyDecisionId });

    const allowResponse = await allowServer.inject({
      method: "GET",
      url: "/api/v1/test/decide",
      headers: { cookie: alice.cookie },
    });
    assert.equal(allowResponse.statusCode, 403);
    const allowBody = allowResponse.json() as {
      error: { code: string; message: string; details?: { decisionId?: string } };
    };
    assert.equal(allowBody.error.code, "FORBIDDEN");
    assert.deepEqual(allowBody.error.details, { decisionId: allowDecisionId });

    const rows = await decisionRows(db, a);
    const recorded = rows.find((candidate) => candidate.decision_id === denyDecisionId);
    assert.ok(recorded !== undefined, "the erroring decision is recorded");
    assert.equal(recorded.decision, "deny");
    assert.deepEqual(recorded.errors, errors);
  } finally {
    await denyServer.close();
    await allowServer.close();
    await db.close();
  }
});

test("C-a4f43d9a a rejected check or an unrecordable decision answers 503 with no row and no audit", async () => {
  const db = await withTestDatabase();
  const rejectServer = await testServer();
  const emptyIdServer = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await session(db, a, "alice", clock);

    let rejectHandlerCalls = 0;
    let emptyIdHandlerCalls = 0;

    const rejectEngine = stubEngine(async () => {
      throw new Error("the engine cannot decide");
    });
    const emptyIdEngine = stubEngine(async () => decisionOf(clock, "allow", "", []));

    assert.doesNotThrow(() => {
      installPep(rejectServer, {
        pool: db.appPool,
        engine: rejectEngine,
        clock,
        publicBaseUrl: BASE_URL,
      });
    }, "installPep reject");
    assert.doesNotThrow(() => {
      defineRoute(rejectServer, {
        method: "GET",
        url: "/api/v1/test/reject",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler: async () => {
          rejectHandlerCalls += 1;
          return { ok: true };
        },
      });
    }, "defineRoute reject");

    assert.doesNotThrow(() => {
      installPep(emptyIdServer, {
        pool: db.appPool,
        engine: emptyIdEngine,
        clock,
        publicBaseUrl: BASE_URL,
      });
    }, "installPep empty id");
    assert.doesNotThrow(() => {
      defineRoute(emptyIdServer, {
        method: "GET",
        url: "/api/v1/test/empty-id",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler: async () => {
          emptyIdHandlerCalls += 1;
          return { ok: true };
        },
      });
    }, "defineRoute empty id");

    for (const response of [
      await rejectServer.inject({
        method: "GET",
        url: "/api/v1/test/reject",
        headers: { cookie: alice.cookie },
      }),
      await emptyIdServer.inject({
        method: "GET",
        url: "/api/v1/test/empty-id",
        headers: { cookie: alice.cookie },
      }),
    ]) {
      assert.equal(response.statusCode, 503);
      assert.deepEqual(response.json(), {
        error: {
          code: "AUTHZ_UNAVAILABLE",
          message: "Authorization is unavailable",
        },
      });
    }

    assert.equal(rejectHandlerCalls, 0, "the handler never runs when the engine rejects");
    assert.equal(emptyIdHandlerCalls, 0, "the handler never runs when the decision cannot be recorded");
    assert.deepEqual(await decisionRows(db, a), [], "no decision row is recorded");
    const denied = (await auditRows(db, a)).filter(
      (event) => event.event_type === "authz.denied",
    );
    assert.deepEqual(denied, [], "no denial is audited");
  } finally {
    await rejectServer.close();
    await emptyIdServer.close();
    await db.close();
  }
});
