import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { createServiceAccount, grantRole, provisionTenantIdp } from "../identity/index.ts";
import type { User } from "../identity/index.ts";
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
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const ISS = "https://idp.example/realms/ursitoare";
const OPERATOR = { kind: "operator", name: "cli" } as const;

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

interface HarnessOptions {
  failingAudit?: boolean;
  logDestination?: LogDestination;
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  a: TenantContext;
  clock: MutableClock;
  carol: Session;
  alice: Session;
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-refusals-src-"));
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

async function testServer(destination: LogDestination): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "warn", destination }),
    tracer: noopTracer,
  });
}

function poolFailingAudit(pool: TenantPool): TenantPool {
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

async function createHarness(options?: HarnessOptions): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
  const clock = mutableClock(T0);
  const engine = await permitAllEngine(clock);
  const destination = options?.logDestination ?? silentDestination;
  const server = await testServer(destination);

  assert.doesNotThrow(() => {
    installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");

  const deps: AdminApiDeps = {
    pool: options?.failingAudit === true ? poolFailingAudit(db.appPool) : db.appPool,
    clock,
    ids: sequentialIds(5000),
    engineKey: { reveal: () => "k".repeat(64) },
  };
  assert.doesNotThrow(() => {
    registerAdminRoutes(server, deps);
  }, "registerAdminRoutes");

  const carol = await session(db, a, "carol", clock);
  const alice = await session(db, a, "alice", clock);
  await operatorGrant(db, a, carol.userId, "tenant_admin");
  await operatorGrant(db, a, alice.userId, "author");

  return { db, server, a, clock, carol, alice };
}

async function closeHarness(harness: Harness): Promise<void> {
  await harness.server.close();
  await harness.db.close();
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

function writeHeaders(actor: Session): Record<string, string> {
  return {
    cookie: actor.cookie,
    "x-csrf-token": actor.csrfToken,
    "content-type": "application/json",
  };
}

function withKey(actor: Session, key: string): Record<string, string> {
  return { ...writeHeaders(actor), "idempotency-key": key };
}

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

async function auditIn(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      `SELECT event_type, actor, target, payload FROM ursitoare.audit_event
       WHERE tenant_id = $1 ORDER BY seq`,
      [ctx.tenantId],
    );
    return result.rows;
  });
}

function capturing(lines: string[]): LogDestination {
  return { write(line: string): void { lines.push(line); } };
}

function loggedCodes(lines: readonly string[]): string[] {
  const codes: string[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as { code?: unknown };
      if (typeof parsed.code === "string") codes.push(parsed.code);
    } catch {
      continue;
    }
  }
  return codes;
}

function payloadOf(row: AuditRow): Record<string, unknown> {
  const payload = row.payload;
  return typeof payload === "object" && payload !== null
    ? (payload as Record<string, unknown>)
    : {};
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-777b5224 each refused admin change appends one change refused event", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, carol, alice } = harness;
    const service = await makeServiceAccount(db, a, {
      displayName: "Nightly bot",
      ownerUserId: carol.userId,
    });

    const mapElevation = await server.inject({
      method: "PUT",
      url: "/api/v1/idp-group-map",
      headers: writeHeaders(alice),
      payload: JSON.stringify({
        issuer: ISS,
        group: "ursitoare-authors",
        roleId: "tenant_admin",
      }),
    });
    assert.equal(mapElevation.statusCode, 403);
    assert.equal(errorOf(mapElevation).code, "ELEVATION_REFUSED");

    const grantElevation = await server.inject({
      method: "PUT",
      url: `/api/v1/service-accounts/${service.userId}/roles/tenant_admin`,
      headers: writeHeaders(alice),
    });
    assert.equal(grantElevation.statusCode, 403);
    assert.equal(errorOf(grantElevation).code, "ELEVATION_REFUSED");

    const selfDisable = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${carol.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "disabled" }),
    });
    assert.equal(selfDisable.statusCode, 422);
    assert.equal(errorOf(selfDisable).code, "OPERATION_REFUSED");

    const badOwner = await server.inject({
      method: "POST",
      url: "/api/v1/service-accounts",
      headers: withKey(carol, "k-owner"),
      payload: JSON.stringify({ displayName: "Nested bot", ownerUserId: service.userId }),
    });
    assert.equal(badOwner.statusCode, 422);
    assert.equal(errorOf(badOwner).code, "OPERATION_REFUSED");

    const wrongKind = await server.inject({
      method: "POST",
      url: `/api/v1/users/${service.userId}/idp-links`,
      headers: withKey(carol, "k-link"),
      payload: JSON.stringify({ issuer: ISS, subject: "sub-service" }),
    });
    assert.equal(wrongKind.statusCode, 422);
    assert.equal(errorOf(wrongKind).code, "OPERATION_REFUSED");

    const refused = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.change_refused",
    );
    assert.equal(refused.length, 5, "the five refusals append five events");

    const codes = refused.map((row) => payloadOf(row).code);
    assert.deepEqual(codes, [
      "RBAC_ELEVATION",
      "RBAC_ELEVATION",
      "ADMIN_SELF_DISABLE",
      "IDENTITY_OWNER_INVALID",
      "ADMIN_WRONG_KIND",
    ]);

    const actors = [alice.userId, alice.userId, carol.userId, carol.userId, carol.userId];
    for (const [index, row] of refused.entries()) {
      assert.deepEqual(row.actor, { kind: "user", id: actors[index] });
      assert.deepEqual(row.target, { kind: "action", id: "manage_users_roles" });
    }

    const routes = refused.map((row) => payloadOf(row).route);
    assert.deepEqual(routes, [
      "/api/v1/idp-group-map",
      "/api/v1/service-accounts/:userId/roles/:roleId",
      "/api/v1/users/:userId",
      "/api/v1/service-accounts",
      "/api/v1/users/:userId/idp-links",
    ]);

    const badBody = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: writeHeaders(carol),
      payload: JSON.stringify({}),
    });
    assert.equal(badBody.statusCode, 400);

    const unknownTeam = await server.inject({
      method: "DELETE",
      url: "/api/v1/teams/ghost",
      headers: writeHeaders(carol),
    });
    assert.equal(unknownTeam.statusCode, 404);

    const firstTeam = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: writeHeaders(carol),
      payload: JSON.stringify({ teamId: "ops" }),
    });
    assert.equal(firstTeam.statusCode, 201);

    const duplicateTeam = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: writeHeaders(carol),
      payload: JSON.stringify({ teamId: "ops" }),
    });
    assert.equal(duplicateTeam.statusCode, 409);

    const afterUnrefused = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.change_refused",
    );
    assert.equal(afterUnrefused.length, 5, "400, 404 and 409 add no refusal event");
  } finally {
    await closeHarness(harness);
  }
});

test("C-e4402b02 a failing refusal audit keeps the answer and logs the failure", async () => {
  const lines: string[] = [];
  const harness = await createHarness({
    failingAudit: true,
    logDestination: capturing(lines),
  });
  try {
    const { db, a, carol, alice } = harness;
    const service = await makeServiceAccount(db, a, {
      displayName: "Nightly bot",
      ownerUserId: carol.userId,
    });

    const response = await harness.server.inject({
      method: "PUT",
      url: `/api/v1/service-accounts/${service.userId}/roles/tenant_admin`,
      headers: writeHeaders(alice),
    });
    assert.equal(response.statusCode, 403);
    assert.equal(errorOf(response).code, "ELEVATION_REFUSED");

    const stored = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<{ role_id: string }>(
        "SELECT role_id FROM ursitoare.membership WHERE tenant_id = $1 AND user_id = $2",
        [a.tenantId, service.userId],
      );
      return result.rows;
    });
    assert.deepEqual(stored, [], "the refused role is not stored");

    assert.ok(
      loggedCodes(lines).includes("AUDIT_FAILED"),
      "the failed refusal audit logs AUDIT_FAILED",
    );

    const refused = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.change_refused",
    );
    assert.equal(refused.length, 0, "the failed append stores no refusal event");
  } finally {
    await closeHarness(harness);
  }
});
