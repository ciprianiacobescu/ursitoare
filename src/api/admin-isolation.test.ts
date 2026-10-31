import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createServiceAccount, grantRole } from "../identity/index.ts";
import type { User } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerAdminRoutes } from "./admin-routes.ts";
import type { AdminApiDeps } from "./admin-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const OPERATOR = { kind: "operator", name: "cli" } as const;

const engineDirs: string[] = [];

interface AccountBody {
  userId: string;
  kind: "human" | "service";
  ownerUserId: string | null;
  displayName: string;
  email: string | null;
  state: "active" | "disabled";
  roles: string[];
  teams: string[];
  localRoles: string[];
}

interface PageBody<T> {
  items: T[];
  next_cursor: string | null;
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface TenantRows {
  users: unknown[];
  teams: unknown[];
  memberships: unknown[];
  links: unknown[];
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  a: TenantContext;
  b: TenantContext;
}

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function permitAllEngine(): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-isolation-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock: fixedClock(T0),
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(T0);
  const engine = await permitAllEngine();
  const server = await testServer();

  assert.doesNotThrow(() => {
    installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");

  const deps: AdminApiDeps = {
    pool: db.appPool,
    clock,
    ids: sequentialIds(5000),
    engineKey: { reveal: () => "k".repeat(64) },
  };
  assert.doesNotThrow(() => {
    registerAdminRoutes(server, deps);
  }, "registerAdminRoutes");

  return { db, server, a, b };
}

async function closeHarness(harness: Harness): Promise<void> {
  await harness.server.close();
  await harness.db.close();
}

async function session(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
): Promise<Session> {
  let created: Session | undefined;
  await assert.doesNotReject(async () => {
    created = await createTestSession(db, ctx, subject, fixedClock(T0));
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

async function makeServiceAccount(
  db: TestDatabase,
  ctx: TenantContext,
  input: { displayName: string; ownerUserId: string },
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) => createServiceAccount(tx, ctx, input));
  });
  assert.ok(user !== undefined, "createServiceAccount resolves");
  return user;
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

async function tenantRows(db: TestDatabase, ctx: TenantContext): Promise<TenantRows> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const users = await tx.query(
      `SELECT user_id, kind, owner_user_id, display_name, email, state
       FROM ursitoare."user" WHERE tenant_id = $1 ORDER BY user_id`,
      [ctx.tenantId],
    );
    const teams = await tx.query(
      `SELECT team_id FROM ursitoare.team WHERE tenant_id = $1 ORDER BY team_id`,
      [ctx.tenantId],
    );
    const memberships = await tx.query(
      `SELECT user_id, role_id, team_id, source, source_issuer
       FROM ursitoare.membership WHERE tenant_id = $1
       ORDER BY user_id, role_id NULLS FIRST, team_id NULLS FIRST, source, source_issuer`,
      [ctx.tenantId],
    );
    const links = await tx.query(
      `SELECT user_id, issuer, subject FROM ursitoare.idp_link
       WHERE tenant_id = $1 ORDER BY user_id, issuer, subject`,
      [ctx.tenantId],
    );
    return {
      users: users.rows,
      teams: teams.rows,
      memberships: memberships.rows,
      links: links.rows,
    };
  });
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-598727de tenant B admin cannot reach tenant A rows and a forged tenant is refused", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, b } = harness;
    const ann = await session(db, a, "ann");
    const bob = await session(db, a, "bob");
    const service = await makeServiceAccount(db, a, {
      displayName: "Nightly bot",
      ownerUserId: ann.userId,
    });
    const zed = await session(db, b, "zed");
    await operatorGrant(db, b, zed.userId, "tenant_admin");

    const before = await tenantRows(db, a);
    assert.deepEqual(
      before.users.map((row) => (row as { user_id: string }).user_id),
      [ann.userId, bob.userId, service.userId].sort(),
      "tenant A holds ann bob and the service account",
    );

    const listed = await server.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: getHeaders(zed),
    });
    assert.equal(listed.statusCode, 200);
    const page = listed.json() as PageBody<AccountBody>;
    assert.deepEqual(page.items.map((item) => item.userId), [zed.userId]);
    assert.ok(
      !page.items.some((item) => item.userId === ann.userId || item.userId === bob.userId),
      "tenant B sees none of tenant A's humans",
    );

    const read = await server.inject({
      method: "GET",
      url: `/api/v1/users/${ann.userId}`,
      headers: getHeaders(zed),
    });
    assert.equal(read.statusCode, 404);
    assert.equal(errorOf(read).code, "NOT_FOUND");

    const patch = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${ann.userId}`,
      headers: writeHeaders(zed),
      payload: JSON.stringify({ state: "disabled" }),
    });
    assert.equal(patch.statusCode, 404);
    assert.equal(errorOf(patch).code, "NOT_FOUND");

    const grant = await server.inject({
      method: "PUT",
      url: `/api/v1/service-accounts/${service.userId}/roles/author`,
      headers: writeHeaders(zed),
    });
    assert.equal(grant.statusCode, 404);
    assert.equal(errorOf(grant).code, "NOT_FOUND");

    const links = await server.inject({
      method: "GET",
      url: `/api/v1/users/${ann.userId}/idp-links`,
      headers: getHeaders(zed),
    });
    assert.equal(links.statusCode, 404);
    assert.equal(errorOf(links).code, "NOT_FOUND");

    const forged = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: { ...writeHeaders(zed), "idempotency-key": "k-forged" },
      payload: JSON.stringify({ teamId: "x", tenantId: "tenant_a" }),
    });
    assert.equal(forged.statusCode, 400);
    assert.equal(errorOf(forged).code, "VALIDATION_FAILED");

    const after = await tenantRows(db, a);
    assert.deepEqual(after, before, "tenant A's rows are unchanged");
    assert.ok(
      !after.teams.some((row) => (row as { team_id: string }).team_id === "x"),
      "the forged team was not created",
    );
  } finally {
    await closeHarness(harness);
  }
});
