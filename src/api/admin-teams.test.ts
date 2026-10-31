import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { createTeam, grantRole, provisionTenantIdp, setGroupMapping } from "../identity/index.ts";
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

interface TeamBody {
  teamId: string;
}

interface RoleBody {
  roleId: string;
}

interface PageBody<T> {
  items: T[];
  next_cursor: string | null;
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

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  keyless: FastifyInstance;
  a: TenantContext;
  b: TenantContext;
  clock: MutableClock;
  carol: Session;
  ann: Session;
  bob: Session;
  zed: Session;
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-teams-src-"));
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

async function adminServer(): Promise<FastifyInstance> {
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

async function createHarness(opts?: { keyless?: boolean }): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
  const clock = mutableClock(T0);
  const engine = await permitAllEngine(clock);
  const server = await adminServer();

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

  let keyless = server;
  if (opts?.keyless === true) {
    keyless = await adminServer();
    assert.doesNotThrow(() => {
      installPep(keyless, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    }, "installPep on the keyless server");
    const keylessDeps: AdminApiDeps = {
      pool: db.appPool,
      clock,
      ids: sequentialIds(5001),
      engineKey: null,
    };
    assert.doesNotThrow(() => {
      registerAdminRoutes(keyless, keylessDeps);
    }, "registerAdminRoutes on the keyless server");
  }

  const carol = await session(db, a, "carol", clock);
  const ann = await session(db, a, "ann", clock);
  const bob = await session(db, a, "bob", clock);
  const zed = await session(db, b, "zed", clock);
  await operatorGrant(db, a, carol.userId, "tenant_admin");
  await operatorGrant(db, b, zed.userId, "tenant_admin");

  return { db, server, keyless, a, b, clock, carol, ann, bob, zed };
}

async function closeHarness(harness: Harness): Promise<void> {
  if (harness.keyless !== harness.server) {
    await harness.keyless.close();
  }
  await harness.server.close();
  await harness.db.close();
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

function targetId(target: unknown): string | undefined {
  if (typeof target !== "object" || target === null) return undefined;
  const id = (target as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

function editCursor(cursor: string): string {
  const first = cursor.slice(0, 1);
  return first === "0" ? `1${cursor.slice(1)}` : `0${cursor.slice(1)}`;
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-8b40a61c teams are created listed isolated mapped and deleted", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, carol, zed } = harness;

    const created = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: withKey(carol, "k1"),
      payload: JSON.stringify({ teamId: "finance" }),
    });
    assert.equal(created.statusCode, 201, "the create of finance answers 201");
    assert.deepEqual(created.json(), { teamId: "finance" });

    const duplicate = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: withKey(carol, "k2"),
      payload: JSON.stringify({ teamId: "finance" }),
    });
    assert.equal(duplicate.statusCode, 409, "a duplicate team answers 409");
    assert.equal(errorOf(duplicate).code, "ALREADY_EXISTS");

    const badName = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: writeHeaders(carol),
      payload: JSON.stringify({ teamId: "Finance" }),
    });
    assert.equal(badName.statusCode, 400, "an uppercase team id is refused");
    assert.equal(errorOf(badName).code, "VALIDATION_FAILED");

    const listedA = await server.inject({
      method: "GET",
      url: "/api/v1/teams",
      headers: getHeaders(carol),
    });
    assert.equal(listedA.statusCode, 200, "tenant A lists its teams");
    assert.deepEqual(listedA.json(), { items: [{ teamId: "finance" }], next_cursor: null });

    const listedB = await server.inject({
      method: "GET",
      url: "/api/v1/teams",
      headers: getHeaders(zed),
    });
    assert.equal(listedB.statusCode, 200, "tenant B lists its own teams");
    assert.deepEqual(listedB.json(), { items: [], next_cursor: null });

    const ops = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: withKey(carol, "k3"),
      payload: JSON.stringify({ teamId: "ops" }),
    });
    assert.equal(ops.statusCode, 201, "the create of ops answers 201");
    assert.deepEqual(ops.json(), { teamId: "ops" });

    const opsReplay = await server.inject({
      method: "POST",
      url: "/api/v1/teams",
      headers: withKey(carol, "k3"),
      payload: JSON.stringify({ teamId: "ops" }),
    });
    assert.equal(opsReplay.statusCode, 201, "a replayed create answers 201");
    assert.deepEqual(opsReplay.json(), { teamId: "ops" });
    assert.equal(opsReplay.headers["idempotent-replayed"], "true");

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-finance", teamId: "finance" },
          OPERATOR,
        );
      });
    });

    const deleteMapped = await server.inject({
      method: "DELETE",
      url: "/api/v1/teams/finance",
      headers: writeHeaders(carol),
    });
    assert.equal(deleteMapped.statusCode, 409, "the mapped team refuses the delete");
    assert.equal(errorOf(deleteMapped).code, "IN_USE");

    const deleteOps = await server.inject({
      method: "DELETE",
      url: "/api/v1/teams/ops",
      headers: writeHeaders(carol),
    });
    assert.equal(deleteOps.statusCode, 204, "the unused team is deleted");

    const deleteOpsAgain = await server.inject({
      method: "DELETE",
      url: "/api/v1/teams/ops",
      headers: writeHeaders(carol),
    });
    assert.equal(deleteOpsAgain.statusCode, 404, "the second delete finds no team");
    assert.equal(errorOf(deleteOpsAgain).code, "NOT_FOUND");

    const events = await auditIn(db, a);
    const teamCreated = events.filter((row) => row.event_type === "identity.team_created");
    assert.equal(teamCreated.length, 2, "one team_created event per created team");
    assert.deepEqual(
      teamCreated.map((row) => targetId(row.target)).sort(),
      ["finance", "ops"],
    );
    const teamDeleted = events.filter((row) => row.event_type === "identity.team_deleted");
    assert.equal(teamDeleted.length, 1, "one team_deleted event");
    assert.deepEqual(teamDeleted[0]?.target, { kind: "team", id: "ops" });
  } finally {
    await closeHarness(harness);
  }
});

test("C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging", async () => {
  const harness = await createHarness({ keyless: true });
  try {
    const { db, server, keyless, a, carol } = harness;

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        await createTeam(tx, a, { teamId: "a1" }, OPERATOR);
        await createTeam(tx, a, { teamId: "a2" }, OPERATOR);
        await createTeam(tx, a, { teamId: "a3" }, OPERATOR);
        await createTeam(tx, a, { teamId: "a4" }, OPERATOR);
        await createTeam(tx, a, { teamId: "a5" }, OPERATOR);
      });
    });

    const first = await server.inject({
      method: "GET",
      url: "/api/v1/teams?limit=2",
      headers: getHeaders(carol),
    });
    assert.equal(first.statusCode, 200);
    const firstPage = first.json() as PageBody<TeamBody>;
    assert.deepEqual(
      firstPage.items,
      [{ teamId: "a1" }, { teamId: "a2" }],
      "the first page holds the two smallest teams",
    );
    assert.equal(typeof firstPage.next_cursor, "string", "the first page carries a cursor");

    const firstCursor = firstPage.next_cursor ?? "";
    const second = await server.inject({
      method: "GET",
      url: `/api/v1/teams?limit=2&cursor=${encodeURIComponent(firstCursor)}`,
      headers: getHeaders(carol),
    });
    assert.equal(second.statusCode, 200);
    const secondPage = second.json() as PageBody<TeamBody>;
    assert.deepEqual(
      secondPage.items,
      [{ teamId: "a3" }, { teamId: "a4" }],
      "the second page continues after the cursor",
    );
    const secondCursor = secondPage.next_cursor ?? "";
    assert.equal(typeof secondCursor, "string", "the second page carries a cursor");

    const third = await server.inject({
      method: "GET",
      url: `/api/v1/teams?limit=2&cursor=${encodeURIComponent(secondCursor)}`,
      headers: getHeaders(carol),
    });
    assert.equal(third.statusCode, 200);
    const thirdPage = third.json() as PageBody<TeamBody>;
    assert.deepEqual(
      thirdPage.items,
      [{ teamId: "a5" }],
      "the last page holds the remaining team once",
    );
    assert.equal(thirdPage.next_cursor, null, "the last page ends the walk");

    const edited = await server.inject({
      method: "GET",
      url: `/api/v1/teams?limit=2&cursor=${encodeURIComponent(editCursor(firstCursor))}`,
      headers: getHeaders(carol),
    });
    assert.equal(edited.statusCode, 400, "an edited cursor is refused");
    assert.equal(errorOf(edited).code, "CURSOR_INVALID");

    const rolesPage = await server.inject({
      method: "GET",
      url: "/api/v1/roles?limit=1",
      headers: getHeaders(carol),
    });
    assert.equal(rolesPage.statusCode, 200);
    const roles = rolesPage.json() as PageBody<RoleBody>;
    assert.deepEqual(roles.items, [{ roleId: "approver" }]);
    const rolesCursor = roles.next_cursor ?? "";
    assert.equal(typeof rolesCursor, "string", "the roles page carries a cursor");

    const foreign = await server.inject({
      method: "GET",
      url: `/api/v1/teams?limit=2&cursor=${encodeURIComponent(rolesCursor)}`,
      headers: getHeaders(carol),
    });
    assert.equal(foreign.statusCode, 400, "a foreign-scope cursor is refused");
    assert.equal(errorOf(foreign).code, "CURSOR_INVALID");

    const whole = await keyless.inject({
      method: "GET",
      url: "/api/v1/teams?limit=50",
      headers: getHeaders(carol),
    });
    assert.equal(whole.statusCode, 200, "a page that fits is served without the key");
    const wholePage = whole.json() as PageBody<TeamBody>;
    assert.deepEqual(
      wholePage.items,
      [{ teamId: "a1" }, { teamId: "a2" }, { teamId: "a3" }, { teamId: "a4" }, { teamId: "a5" }],
      "the keyless server lists every team once",
    );
    assert.equal(wholePage.next_cursor, null);

    const crowded = await keyless.inject({
      method: "GET",
      url: "/api/v1/teams?limit=2",
      headers: getHeaders(carol),
    });
    assert.equal(crowded.statusCode, 503, "a page that needs a cursor needs the engine key");
    assert.equal(errorOf(crowded).code, "ENGINE_KEY_REQUIRED");

    const withCursor = await keyless.inject({
      method: "GET",
      url: "/api/v1/teams?cursor=x",
      headers: getHeaders(carol),
    });
    assert.equal(withCursor.statusCode, 503, "a cursor with no engine key is refused");
    assert.equal(errorOf(withCursor).code, "ENGINE_KEY_REQUIRED");

    const users = await keyless.inject({
      method: "GET",
      url: "/api/v1/users?limit=1",
      headers: getHeaders(carol),
    });
    assert.equal(users.statusCode, 503, "a crowded user page needs the engine key too");
    assert.equal(errorOf(users).code, "ENGINE_KEY_REQUIRED");
  } finally {
    await closeHarness(harness);
  }
});

test("the roles list of each tenant holds the default roles", async () => {
  const harness = await createHarness();
  try {
    const { server, carol, zed } = harness;

    const aRoles = await server.inject({
      method: "GET",
      url: "/api/v1/roles",
      headers: getHeaders(carol),
    });
    assert.equal(aRoles.statusCode, 200, "tenant A lists its roles");
    assert.deepEqual(aRoles.json(), {
      items: [
        { roleId: "approver" },
        { roleId: "auditor" },
        { roleId: "author" },
        { roleId: "tenant_admin" },
      ],
      next_cursor: null,
    });

    const bRoles = await server.inject({
      method: "GET",
      url: "/api/v1/roles",
      headers: getHeaders(zed),
    });
    assert.equal(bRoles.statusCode, 200, "tenant B lists its own roles");
    assert.deepEqual(bRoles.json(), {
      items: [
        { roleId: "approver" },
        { roleId: "auditor" },
        { roleId: "author" },
        { roleId: "tenant_admin" },
      ],
      next_cursor: null,
    });
  } finally {
    await closeHarness(harness);
  }
});
