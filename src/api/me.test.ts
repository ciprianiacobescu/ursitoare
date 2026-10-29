import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { principalOf, resolveSession, verifyCsrfToken } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { ACTION_NAMES, createPolicyEngine } from "../pdp/index.ts";
import type { ActionName, Decision, PolicyEngine, PrincipalEntity } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerMeRoute } from "./me.ts";
import { installPep } from "./pep.ts";
import type { PepDeps } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const POLICY_SET_VERSION = "a".repeat(64);

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

interface MeBody {
  user: { id: string; displayName: string; email: string | null };
  tenant: { id: string; name: string; reviewProfile: "solo" | "team" };
  capabilities: ActionName[];
  csrfToken: string;
}

interface RecordedCapabilityCall {
  principal?: PrincipalEntity;
  actions?: readonly ActionName[];
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

async function engineWithoutTenantPolicy(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-me-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(500),
    logger: silentLogger(),
  });
}

function stubEngine(
  clock: Clock,
  capabilities: ActionName[],
  recorded: RecordedCapabilityCall,
): PolicyEngine {
  const allow: Decision = {
    decision: "allow",
    decisionId: "decision-me",
    decidedAt: clock.now().toISOString(),
    reasons: [],
    errors: [],
    policySetVersion: POLICY_SET_VERSION,
  };
  return {
    policySetVersion: POLICY_SET_VERSION,
    actions: [],
    policies: [],
    check: async () => allow,
    allowedActions: async (principal, actions) => {
      recorded.principal = principal;
      recorded.actions = actions;
      return capabilities;
    },
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

function sessionIdOf(cookie: string): string {
  return cookie.slice("ursitoare_session=".length);
}

function meDeps(db: TestDatabase, clock: Clock, engine: PolicyEngine): PepDeps {
  return { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL };
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

assert.equal(typeof registerMeRoute, "function");

test("C-0f1f124b GET /api/v1/me reports the user, tenant, capabilities and a fresh CSRF token", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await engineWithoutTenantPolicy(clock);
    const deps = meDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerMeRoute(server, deps);
    }, "registerMeRoute");

    const alice = await session(db, a, "alice", clock);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: alice.cookie },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as MeBody;
    assert.deepEqual(Object.keys(body).sort(), ["capabilities", "csrfToken", "tenant", "user"]);
    assert.deepEqual(body.user, { id: alice.userId, displayName: "alice", email: null });
    assert.deepEqual(body.tenant, {
      id: "tenant_a",
      name: "Tenant A",
      reviewProfile: a.reviewProfile,
    });
    assert.deepEqual(body.capabilities, ["read_self"]);
    assert.equal(typeof body.csrfToken, "string");
    assert.equal(body.csrfToken.length, 43);
    assert.equal(response.headers["cache-control"], "no-store");

    const resolved = await resolveSession(db.appPool, sessionIdOf(alice.cookie), { clock });
    assert.ok(resolved !== null, "alice's session is live");
    assert.equal(
      await verifyCsrfToken(db.appPool, resolved, body.csrfToken),
      true,
      "the fresh token verifies",
    );
    assert.equal(
      await verifyCsrfToken(db.appPool, resolved, alice.csrfToken),
      false,
      "the token from createTestSession is refused",
    );

    const rows = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<{ action: string; decision: string }>(
        "SELECT action, decision FROM ursitoare.policy_decision WHERE action = 'read_self'",
      );
      return result.rows;
    });
    assert.equal(rows.length, 1, "one read_self decision row is recorded");
    assert.equal(rows[0]?.decision, "allow");
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-07420469 GET /api/v1/me stays inside the session tenant and ignores tenant selectors", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a, b } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await engineWithoutTenantPolicy(clock);
    const deps = meDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerMeRoute(server, deps);
    }, "registerMeRoute");

    const alice = await session(db, a, "alice", clock);
    const carol = await session(db, b, "carol", clock);

    const forB = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: carol.cookie },
    });
    assert.equal(forB.statusCode, 200);
    const bodyB = forB.json() as MeBody;
    assert.equal(bodyB.tenant.id, "tenant_b");
    assert.equal(bodyB.tenant.name, "Tenant B");
    assert.equal(bodyB.user.id, carol.userId);
    assert.equal(bodyB.user.displayName, "carol");

    const forged = await server.inject({
      method: "GET",
      url: "/api/v1/me?tenant_id=tenant_b",
      headers: { cookie: alice.cookie, "x-tenant-id": "tenant_b" },
    });
    assert.equal(forged.statusCode, 200);
    const bodyA = forged.json() as MeBody;
    assert.equal(bodyA.tenant.id, "tenant_a");
    assert.equal(bodyA.tenant.name, "Tenant A");
    assert.equal(bodyA.user.id, alice.userId);
    assert.equal(bodyA.user.displayName, "alice");

    assert.equal(forB.body.includes("tenant_a"), false, "tenant B's body names no tenant A id");
    assert.equal(forB.body.includes("Tenant A"), false, "tenant B's body names no tenant A name");
    assert.equal(forged.body.includes("tenant_b"), false, "tenant A's body names no tenant B id");
    assert.equal(forged.body.includes("Tenant B"), false, "tenant A's body names no tenant B name");
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-c3bb1913 GET /api/v1/me refuses missing and disabled sessions, has no HEAD and reports stub capabilities", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const recorded: RecordedCapabilityCall = {};
    const engine = stubEngine(clock, ["read_self", "read_flow"], recorded);
    const deps = meDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerMeRoute(server, deps);
    }, "registerMeRoute");

    const alice = await session(db, a, "alice", clock);

    const withoutCookie = await server.inject({ method: "GET", url: "/api/v1/me" });
    assert.equal(withoutCookie.statusCode, 401);
    assert.deepEqual(withoutCookie.json(), {
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });

    const head = await server.inject({ method: "HEAD", url: "/api/v1/me" });
    assert.equal(head.statusCode, 404);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: alice.cookie },
    });
    assert.equal(response.statusCode, 200);
    const body = response.json() as MeBody;
    assert.deepEqual(body.capabilities, ["read_self", "read_flow"]);

    const resolved = await resolveSession(db.appPool, sessionIdOf(alice.cookie), { clock });
    assert.ok(resolved !== null, "alice's session is live");
    assert.deepEqual(recorded.principal, principalOf(resolved));
    assert.deepEqual(recorded.actions, [...ACTION_NAMES]);

    await withTenantTx(db.appPool, a, async (tx) => {
      await tx.query(
        'UPDATE ursitoare."user" SET state = $1 WHERE tenant_id = $2 AND user_id = $3',
        ["disabled", a.tenantId, alice.userId],
      );
    });

    const disabled = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: alice.cookie },
    });
    assert.equal(disabled.statusCode, 401);
    assert.deepEqual(disabled.json(), {
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    });
  } finally {
    await server.close();
    await db.close();
  }
});
