import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
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

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

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

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  a: TenantContext;
  b: TenantContext;
  clock: MutableClock;
  carol: Session;
  bob: Session;
  alice: Session;
}

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

let harness: Harness | undefined;

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
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-service-src-"));
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

async function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
}

async function createSession(
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

function withKey(actor: Session, key: string): Record<string, string> {
  return { ...writeHeaders(actor), "idempotency-key": key };
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

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

function targetUserId(target: unknown): string | undefined {
  if (typeof target !== "object" || target === null) return undefined;
  const id = (target as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

function requireHarness(): Harness {
  if (harness === undefined) throw new Error("the harness is not ready");
  return harness;
}

before(async () => {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = mutableClock(T0);
  const engine = await permitAllEngine(clock);
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

  const carol = await createSession(db, a, "carol", clock);
  const bob = await createSession(db, a, "bob", clock);
  const alice = await createSession(db, a, "alice", clock);
  await operatorGrant(db, a, carol.userId, "tenant_admin");
  await operatorGrant(db, a, alice.userId, "author");

  harness = { db, server, a, b, clock, carol, bob, alice };
});

after(async () => {
  if (harness !== undefined) {
    await harness.server.close();
    await harness.db.close();
  }
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-8087d00f service accounts are created listed owned and disabled", async () => {
  const { db, server, a, carol, bob } = requireHarness();

  const created = await server.inject({
    method: "POST",
    url: "/api/v1/service-accounts",
    headers: withKey(carol, "k1"),
    payload: JSON.stringify({ displayName: "Nightly bot" }),
  });
  assert.equal(created.statusCode, 201);
  const account = created.json() as AccountBody;
  assert.deepEqual(Object.keys(account).sort(), [
    "displayName",
    "email",
    "kind",
    "localRoles",
    "ownerUserId",
    "roles",
    "state",
    "teams",
    "userId",
  ]);
  assert.equal(account.kind, "service");
  assert.equal(account.ownerUserId, carol.userId);
  assert.equal(account.displayName, "Nightly bot");
  assert.equal(account.email, null);
  assert.equal(account.state, "active");
  assert.deepEqual(account.roles, []);
  assert.deepEqual(account.teams, []);
  assert.deepEqual(account.localRoles, []);

  const replayed = await server.inject({
    method: "POST",
    url: "/api/v1/service-accounts",
    headers: withKey(carol, "k1"),
    payload: JSON.stringify({ displayName: "Nightly bot" }),
  });
  assert.equal(replayed.statusCode, 201);
  assert.deepEqual(replayed.json(), account);
  assert.equal(replayed.headers["idempotent-replayed"], "true");

  const ownedByBob = await server.inject({
    method: "POST",
    url: "/api/v1/service-accounts",
    headers: withKey(carol, "k2"),
    payload: JSON.stringify({ displayName: "Bob's bot", ownerUserId: bob.userId }),
  });
  assert.equal(ownedByBob.statusCode, 201);
  const bobAccount = ownedByBob.json() as AccountBody;
  assert.equal(bobAccount.kind, "service");
  assert.equal(bobAccount.ownerUserId, bob.userId);

  const ownedByService = await server.inject({
    method: "POST",
    url: "/api/v1/service-accounts",
    headers: withKey(carol, "k3"),
    payload: JSON.stringify({ displayName: "Nested bot", ownerUserId: account.userId }),
  });
  assert.equal(ownedByService.statusCode, 422);
  const serviceOwnerError = errorOf(ownedByService);
  assert.equal(serviceOwnerError.code, "OPERATION_REFUSED");
  assert.deepEqual(serviceOwnerError.details, { reason: "owner_invalid" });

  const ownedByUnknown = await server.inject({
    method: "POST",
    url: "/api/v1/service-accounts",
    headers: withKey(carol, "k4"),
    payload: JSON.stringify({ displayName: "Ghost bot", ownerUserId: "ghost" }),
  });
  assert.equal(ownedByUnknown.statusCode, 422);
  const unknownOwnerError = errorOf(ownedByUnknown);
  assert.equal(unknownOwnerError.code, "OPERATION_REFUSED");
  assert.deepEqual(unknownOwnerError.details, { reason: "owner_invalid" });

  const emptyName = await server.inject({
    method: "POST",
    url: "/api/v1/service-accounts",
    headers: withKey(carol, "k5"),
    payload: JSON.stringify({ displayName: "" }),
  });
  assert.equal(emptyName.statusCode, 400);
  assert.equal(errorOf(emptyName).code, "VALIDATION_FAILED");

  const listed = await server.inject({
    method: "GET",
    url: "/api/v1/service-accounts",
    headers: getHeaders(carol),
  });
  assert.equal(listed.statusCode, 200);
  const list = listed.json() as PageBody<AccountBody>;
  const listedIds = list.items.map((item) => item.userId).sort();
  assert.deepEqual(listedIds, [account.userId, bobAccount.userId].sort());
  assert.ok(
    list.items.every((item) => item.kind === "service"),
    "the list holds service accounts only",
  );
  assert.equal(list.next_cursor, null);

  const disabled = await server.inject({
    method: "PATCH",
    url: `/api/v1/service-accounts/${account.userId}`,
    headers: writeHeaders(carol),
    payload: JSON.stringify({ state: "disabled" }),
  });
  assert.equal(disabled.statusCode, 200);
  const disabledAccount = disabled.json() as AccountBody;
  assert.equal(disabledAccount.userId, account.userId);
  assert.equal(disabledAccount.state, "disabled");

  const createdEvents = (await auditIn(db, a)).filter(
    (row) => row.event_type === "identity.service_account_created",
  );
  assert.equal(createdEvents.length, 2, "one event per account created");
  const firstEvents = createdEvents.filter(
    (row) => targetUserId(row.target) === account.userId,
  );
  assert.equal(firstEvents.length, 1, "the replay appends no event");
  assert.deepEqual(firstEvents[0]?.target, { kind: "user", id: account.userId });
  assert.deepEqual(firstEvents[0]?.payload, {
    ownerUserId: carol.userId,
    displayName: "Nightly bot",
  });
});

test("C-c102e454 service account roles are granted listed and revoked", async () => {
  const { db, server, a, carol, bob } = requireHarness();
  const service = await makeServiceAccount(db, a, {
    displayName: "Nightly bot",
    ownerUserId: carol.userId,
  });

  const granted = await server.inject({
    method: "PUT",
    url: `/api/v1/service-accounts/${service.userId}/roles/author`,
    headers: writeHeaders(carol),
  });
  assert.equal(granted.statusCode, 200);
  assert.deepEqual(granted.json(), { roleId: "author", result: "granted" });

  const repeated = await server.inject({
    method: "PUT",
    url: `/api/v1/service-accounts/${service.userId}/roles/author`,
    headers: writeHeaders(carol),
  });
  assert.equal(repeated.statusCode, 200);
  assert.deepEqual(repeated.json(), { roleId: "author", result: "exists" });

  const roles = await server.inject({
    method: "GET",
    url: `/api/v1/service-accounts/${service.userId}/roles`,
    headers: getHeaders(carol),
  });
  assert.equal(roles.statusCode, 200);
  assert.deepEqual(roles.json(), {
    items: [{ roleId: "author" }],
    next_cursor: null,
  });

  const unknownRole = await server.inject({
    method: "PUT",
    url: `/api/v1/service-accounts/${service.userId}/roles/ghost`,
    headers: writeHeaders(carol),
  });
  assert.equal(unknownRole.statusCode, 404);
  assert.equal(errorOf(unknownRole).code, "NOT_FOUND");

  const badRole = await server.inject({
    method: "PUT",
    url: `/api/v1/service-accounts/${service.userId}/roles/Bad`,
    headers: writeHeaders(carol),
  });
  assert.equal(badRole.statusCode, 400);
  assert.equal(errorOf(badRole).code, "VALIDATION_FAILED");

  const humanPut = await server.inject({
    method: "PUT",
    url: `/api/v1/service-accounts/${bob.userId}/roles/author`,
    headers: writeHeaders(carol),
  });
  assert.equal(humanPut.statusCode, 404);
  assert.equal(errorOf(humanPut).code, "NOT_FOUND");

  const humanGet = await server.inject({
    method: "GET",
    url: `/api/v1/service-accounts/${bob.userId}/roles`,
    headers: getHeaders(carol),
  });
  assert.equal(humanGet.statusCode, 404);
  assert.equal(errorOf(humanGet).code, "NOT_FOUND");

  const humanDelete = await server.inject({
    method: "DELETE",
    url: `/api/v1/service-accounts/${bob.userId}/roles/author`,
    headers: writeHeaders(carol),
  });
  assert.equal(humanDelete.statusCode, 404);
  assert.equal(errorOf(humanDelete).code, "NOT_FOUND");

  const disabled = await server.inject({
    method: "PATCH",
    url: `/api/v1/service-accounts/${service.userId}`,
    headers: writeHeaders(carol),
    payload: JSON.stringify({ state: "disabled" }),
  });
  assert.equal(disabled.statusCode, 200);
  assert.equal((disabled.json() as AccountBody).state, "disabled");

  const rolesWhileDisabled = await server.inject({
    method: "GET",
    url: `/api/v1/service-accounts/${service.userId}/roles`,
    headers: getHeaders(carol),
  });
  assert.equal(rolesWhileDisabled.statusCode, 200);
  assert.deepEqual(rolesWhileDisabled.json(), {
    items: [{ roleId: "author" }],
    next_cursor: null,
  });

  const enabled = await server.inject({
    method: "PATCH",
    url: `/api/v1/service-accounts/${service.userId}`,
    headers: writeHeaders(carol),
    payload: JSON.stringify({ state: "active" }),
  });
  assert.equal(enabled.statusCode, 200);
  assert.equal((enabled.json() as AccountBody).state, "active");

  const revoked = await server.inject({
    method: "DELETE",
    url: `/api/v1/service-accounts/${service.userId}/roles/author`,
    headers: writeHeaders(carol),
  });
  assert.equal(revoked.statusCode, 204);

  const revokedAgain = await server.inject({
    method: "DELETE",
    url: `/api/v1/service-accounts/${service.userId}/roles/author`,
    headers: writeHeaders(carol),
  });
  assert.equal(revokedAgain.statusCode, 404);
  assert.equal(errorOf(revokedAgain).code, "NOT_FOUND");

  const events = (await auditIn(db, a)).filter(
    (row) => targetUserId(row.target) === service.userId,
  );
  const grantedEvents = events.filter((row) => row.event_type === "identity.role_granted");
  assert.equal(grantedEvents.length, 1, "one grant event");
  const revokedEvents = events.filter((row) => row.event_type === "identity.role_revoked");
  assert.equal(revokedEvents.length, 1, "one revoke event");
});

test("C-50b6b834 service account role grants cannot exceed the caller", async () => {
  const { db, server, a, carol, alice } = requireHarness();
  const service = await makeServiceAccount(db, a, {
    displayName: "Nightly bot",
    ownerUserId: carol.userId,
  });

  const elevated = await server.inject({
    method: "PUT",
    url: `/api/v1/service-accounts/${service.userId}/roles/tenant_admin`,
    headers: writeHeaders(alice),
  });
  assert.equal(elevated.statusCode, 403);
  assert.equal(errorOf(elevated).code, "ELEVATION_REFUSED");

  const afterRefusal = await server.inject({
    method: "GET",
    url: `/api/v1/service-accounts/${service.userId}/roles`,
    headers: getHeaders(carol),
  });
  assert.equal(afterRefusal.statusCode, 200);
  assert.deepEqual(afterRefusal.json(), { items: [], next_cursor: null });

  const allowed = await server.inject({
    method: "PUT",
    url: `/api/v1/service-accounts/${service.userId}/roles/author`,
    headers: writeHeaders(alice),
  });
  assert.equal(allowed.statusCode, 200);
  assert.deepEqual(allowed.json(), { roleId: "author", result: "granted" });

  const events = (await auditIn(db, a)).filter(
    (row) =>
      row.event_type === "identity.role_granted" &&
      targetUserId(row.target) === service.userId,
  );
  assert.equal(events.length, 1, "only the allowed grant is audited");
  assert.deepEqual(events[0]?.payload, { roleId: "author", via: "admin" });
});
