import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { grantRole } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerAdminRoutes } from "./admin-routes.ts";
import type { AdminApiDeps } from "./admin-routes.ts";
import { unregisteredRouteErrors } from "./error-codes.ts";
import { installPep } from "./pep.ts";
import { listDefinedRoutes } from "./route.ts";
import type { DefinedRoute } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const OPERATOR = { kind: "operator", name: "cli" } as const;
const ROLES_CEDAR = join(import.meta.dirname, "..", "identity", "policy", "roles.cedar");

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface RouteRow {
  method: DefinedRoute["method"];
  url: string;
  action: "manage_users_roles" | "manage_tenant";
  codes: readonly string[];
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

const ADMIN_ROUTES: readonly RouteRow[] = [
  {
    method: "GET",
    url: "/api/v1/users",
    action: "manage_users_roles",
    codes: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/service-accounts",
    action: "manage_users_roles",
    codes: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/users/:userId",
    action: "manage_users_roles",
    codes: ["NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "PATCH",
    url: "/api/v1/users/:userId",
    action: "manage_users_roles",
    codes: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
  },
  {
    method: "PATCH",
    url: "/api/v1/service-accounts/:userId",
    action: "manage_users_roles",
    codes: ["NOT_FOUND", "OPERATION_REFUSED", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/users/:userId/idp-links",
    action: "manage_users_roles",
    codes: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "POST",
    url: "/api/v1/users/:userId/idp-links",
    action: "manage_users_roles",
    codes: [
      "ALREADY_EXISTS",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "NOT_FOUND",
      "OPERATION_REFUSED",
      "UNKNOWN_ISSUER",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "POST",
    url: "/api/v1/service-accounts",
    action: "manage_users_roles",
    codes: [
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "OPERATION_REFUSED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "GET",
    url: "/api/v1/service-accounts/:userId/roles",
    action: "manage_users_roles",
    codes: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "PUT",
    url: "/api/v1/service-accounts/:userId/roles/:roleId",
    action: "manage_users_roles",
    codes: ["ELEVATION_REFUSED", "NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "DELETE",
    url: "/api/v1/service-accounts/:userId/roles/:roleId",
    action: "manage_users_roles",
    codes: ["ELEVATION_REFUSED", "NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/roles",
    action: "manage_users_roles",
    codes: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/teams",
    action: "manage_users_roles",
    codes: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
  {
    method: "GET",
    url: "/api/v1/idp-group-map",
    action: "manage_users_roles",
    codes: ["CURSOR_INVALID", "ENGINE_KEY_REQUIRED", "VALIDATION_FAILED"],
  },
  {
    method: "POST",
    url: "/api/v1/teams",
    action: "manage_users_roles",
    codes: [
      "ALREADY_EXISTS",
      "IDEMPOTENCY_IN_PROGRESS",
      "IDEMPOTENCY_KEY_REUSED",
      "VALIDATION_FAILED",
    ],
  },
  {
    method: "DELETE",
    url: "/api/v1/teams/:teamId",
    action: "manage_users_roles",
    codes: ["IN_USE", "NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "PUT",
    url: "/api/v1/idp-group-map",
    action: "manage_users_roles",
    codes: ["ELEVATION_REFUSED", "NOT_FOUND", "UNKNOWN_ISSUER", "VALIDATION_FAILED"],
  },
  {
    method: "DELETE",
    url: "/api/v1/idp-group-map",
    action: "manage_users_roles",
    codes: ["ELEVATION_REFUSED", "NOT_FOUND", "VALIDATION_FAILED"],
  },
  {
    method: "PUT",
    url: "/api/v1/tenant/review-profile",
    action: "manage_tenant",
    codes: ["VALIDATION_FAILED"],
  },
];

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

async function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
}

async function permitAllEngine(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-policy-permit-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function rolesCedarEngine(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-policy-roles-src-"));
  engineDirs.push(srcDir);
  const text = await readFile(ROLES_CEDAR, "utf8").catch(() => "");
  assert.notEqual(text, "", "roles.cedar is readable");
  const policyDir = join(srcDir, "identity", "policy");
  await mkdir(policyDir, { recursive: true });
  await writeFile(join(policyDir, "roles.cedar"), text, "utf8");
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(700),
    logger: silentLogger(),
  });
}

async function registerOn(
  pool: TenantPool | null,
  engine: PolicyEngine,
  clock: Clock,
): Promise<FastifyInstance> {
  const server = await testServer();
  assert.doesNotThrow(() => {
    installPep(server, { pool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");
  const deps: AdminApiDeps = {
    pool,
    clock,
    ids: sequentialIds(5000),
    engineKey: { reveal: () => "k".repeat(64) },
  };
  assert.doesNotThrow(() => {
    registerAdminRoutes(server, deps);
  }, "registerAdminRoutes");
  return server;
}

function adminRoutesOf(server: FastifyInstance): DefinedRoute[] {
  return listDefinedRoutes(server).filter(
    (route) => route.action === "manage_users_roles" || route.action === "manage_tenant",
  );
}

async function session(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  clock: Clock,
): Promise<Session> {
  let created: Session | undefined;
  await assert.doesNotReject(async () => {
    created = await createTestSession(db, ctx, subject, clock);
  });
  assert.ok(created !== undefined, "createTestSession returns a session");
  return created;
}

async function operatorGrant(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  roleId: string,
): Promise<void> {
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      await grantRole(tx, ctx, { userId, roleId }, OPERATOR);
    });
  });
}

function getHeaders(actor: Session): Record<string, string> {
  return { cookie: actor.cookie };
}

function writeHeaders(actor: Session): Record<string, string> {
  return {
    cookie: actor.cookie,
    "x-csrf-token": actor.csrfToken,
    "content-type": "application/json",
  };
}

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

async function ownerProfile(db: TestDatabase, tenantId: string): Promise<string | null> {
  const { rows } = await db.ownerPool.query<{ review_profile: string | null }>(
    "SELECT review_profile FROM ursitoare.tenant WHERE tenant_id = $1",
    [tenantId],
  );
  return rows[0]?.review_profile ?? null;
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-8a23d872 the admin route table holds 19 session routes with their actions and codes", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(T0);
  const engine = await permitAllEngine(clock);
  const pooled = await registerOn(db.appPool, engine, clock);
  const keyless = await registerOn(null, engine, clock);
  try {
    for (const [label, server] of [
      ["with a pool", pooled],
      ["with pool null", keyless],
    ] as const) {
      const routes = adminRoutesOf(server);
      assert.equal(routes.length, ADMIN_ROUTES.length, `${label}: 19 admin routes are defined`);

      const byKey = new Map<string, DefinedRoute>();
      for (const route of routes) {
        byKey.set(`${route.method} ${route.url}`, route);
      }

      for (const row of ADMIN_ROUTES) {
        const route = byKey.get(`${row.method} ${row.url}`);
        assert.ok(route !== undefined, `${label}: ${row.method} ${row.url} is defined`);
        assert.deepEqual(route.auth, { kind: "session" }, `${label}: ${row.url} is a session route`);
        assert.equal(route.action, row.action, `${label}: ${row.url} action`);
        for (const code of row.codes) {
          assert.ok(
            route.errors.includes(code),
            `${label}: ${row.method} ${row.url} declares ${code}`,
          );
        }
      }

      assert.deepEqual(
        unregisteredRouteErrors(listDefinedRoutes(server)),
        [],
        `${label}: every declared code is registered`,
      );
    }
  } finally {
    await keyless.close();
    await pooled.close();
    await db.close();
  }
});

test("C-a4888ef3 roles cedar permits only the tenant admin on the admin routes", async () => {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = mutableClock(T0);
  const engine = await rolesCedarEngine(clock);
  const server = await registerOn(db.appPool, engine, clock);
  try {
    const carol = await session(db, a, "carol", clock);
    const alice = await session(db, a, "alice", clock);
    await operatorGrant(db, a, carol.userId, "tenant_admin");
    await operatorGrant(db, a, alice.userId, "author");

    const carolRoles = await server.inject({
      method: "GET",
      url: "/api/v1/roles",
      headers: getHeaders(carol),
    });
    assert.equal(carolRoles.statusCode, 200, "the tenant admin lists the roles");
    assert.deepEqual(carolRoles.json(), {
      items: [
        { roleId: "approver" },
        { roleId: "auditor" },
        { roleId: "author" },
        { roleId: "tenant_admin" },
      ],
      next_cursor: null,
    });

    const aliceRoles = await server.inject({
      method: "GET",
      url: "/api/v1/roles",
      headers: getHeaders(alice),
    });
    assert.equal(aliceRoles.statusCode, 403, "an author cannot list the roles");
    assert.equal(errorOf(aliceRoles).code, "FORBIDDEN");
    assert.equal(
      typeof (errorOf(aliceRoles).details as { decisionId?: unknown }).decisionId,
      "string",
      "the refusal carries a decision id",
    );

    const noCookie = await server.inject({ method: "GET", url: "/api/v1/roles" });
    assert.equal(noCookie.statusCode, 401, "a caller with no cookie is unauthenticated");
    assert.equal(errorOf(noCookie).code, "UNAUTHENTICATED");

    const aliceSwitch = await server.inject({
      method: "PUT",
      url: "/api/v1/tenant/review-profile",
      headers: writeHeaders(alice),
      payload: JSON.stringify({ reviewProfile: "team" }),
    });
    assert.equal(aliceSwitch.statusCode, 403, "an author cannot switch the review profile");
    assert.equal(errorOf(aliceSwitch).code, "FORBIDDEN");
    assert.equal(
      typeof (errorOf(aliceSwitch).details as { decisionId?: unknown }).decisionId,
      "string",
      "the refusal carries a decision id",
    );
    assert.equal(await ownerProfile(db, "tenant_a"), "solo", "alice's refusal leaves the profile solo");

    const carolSwitch = await server.inject({
      method: "PUT",
      url: "/api/v1/tenant/review-profile",
      headers: writeHeaders(carol),
      payload: JSON.stringify({ reviewProfile: "team" }),
    });
    assert.equal(carolSwitch.statusCode, 200, "the tenant admin switches the review profile");
    assert.deepEqual(carolSwitch.json(), {
      tenantId: "tenant_a",
      reviewProfile: "team",
      previous: "solo",
      changed: true,
      humanMembers: 2,
      warning: null,
    });
  } finally {
    await server.close();
    await db.close();
  }
});
