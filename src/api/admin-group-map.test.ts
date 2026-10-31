import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { createTeam, grantRole, provisionTenantIdp } from "../identity/index.ts";
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

interface Mapping {
  issuer: string;
  group: string;
  roleId: string | null;
  teamId: string | null;
  reviewedBy: string;
}

interface PageBody<T> {
  items: T[];
  next_cursor: string | null;
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  a: TenantContext;
  b: TenantContext;
  clock: MutableClock;
  carol: Session;
  zed: Session;
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-gmap-src-"));
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

async function createHarness(): Promise<Harness> {
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

  const carol = await session(db, a, "carol", clock);
  const zed = await session(db, b, "zed", clock);
  const alice = await session(db, a, "alice", clock);
  await operatorGrant(db, a, carol.userId, "tenant_admin");
  await operatorGrant(db, b, zed.userId, "tenant_admin");

  return { db, server, a, b, clock, carol, zed, alice };
}

async function closeHarness(harness: Harness): Promise<void> {
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

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-09ace5ca group mapping is set replaced listed removed and tenant scoped", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, carol, zed } = harness;

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        await createTeam(tx, a, { teamId: "finance" }, OPERATOR);
      });
    });

    const putRole = await server.inject({
      method: "PUT",
      url: "/api/v1/idp-group-map",
      headers: writeHeaders(carol),
      payload: JSON.stringify({ issuer: ISS, group: "ursitoare-authors", roleId: "author" }),
    });
    assert.equal(putRole.statusCode, 200, "the put with roleId answers 200");
    assert.deepEqual(putRole.json(), {
      issuer: ISS,
      group: "ursitoare-authors",
      roleId: "author",
      teamId: null,
      reviewedBy: carol.userId,
    });

    const putTeam = await server.inject({
      method: "PUT",
      url: "/api/v1/idp-group-map",
      headers: writeHeaders(carol),
      payload: JSON.stringify({ issuer: ISS, group: "ursitoare-authors", teamId: "finance" }),
    });
    assert.equal(putTeam.statusCode, 200, "the replacing put with teamId answers 200");
    assert.deepEqual(putTeam.json(), {
      issuer: ISS,
      group: "ursitoare-authors",
      roleId: null,
      teamId: "finance",
      reviewedBy: carol.userId,
    });

    const listedA = await server.inject({
      method: "GET",
      url: "/api/v1/idp-group-map",
      headers: getHeaders(carol),
    });
    assert.equal(listedA.statusCode, 200, "tenant A lists its mappings");
    const mappingPage = listedA.json() as PageBody<Mapping>;
    assert.deepEqual(mappingPage.items, [
      {
        issuer: ISS,
        group: "ursitoare-authors",
        roleId: null,
        teamId: "finance",
        reviewedBy: carol.userId,
      },
    ]);
    assert.equal(mappingPage.next_cursor, null);

    const deleted = await server.inject({
      method: "DELETE",
      url: `/api/v1/idp-group-map?issuer=${encodeURIComponent(ISS)}&group=ursitoare-authors`,
      headers: writeHeaders(carol),
    });
    assert.equal(deleted.statusCode, 204, "the remove of the stored mapping answers 204");

    const deletedAgain = await server.inject({
      method: "DELETE",
      url: `/api/v1/idp-group-map?issuer=${encodeURIComponent(ISS)}&group=ursitoare-authors`,
      headers: writeHeaders(carol),
    });
    assert.equal(deletedAgain.statusCode, 404, "the second remove finds no mapping");
    assert.equal(errorOf(deletedAgain).code, "NOT_FOUND");

    const listedB = await server.inject({
      method: "GET",
      url: "/api/v1/idp-group-map",
      headers: getHeaders(zed),
    });
    assert.equal(listedB.statusCode, 200, "tenant B lists its own mappings");
    assert.deepEqual(listedB.json(), { items: [], next_cursor: null });
  } finally {
    await closeHarness(harness);
  }
});

test("C-11a09b04 group mapping refusals keep the map empty", async () => {
  const harness = await createHarness();
  try {
    const { server, carol, alice } = harness;
    await operatorGrant(harness.db, harness.a, alice.userId, "author");

    const put = async (payload: object): Promise<{ statusCode: number; body: ErrorBody }> => {
      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/idp-group-map",
        headers: writeHeaders(carol),
        payload: JSON.stringify(payload),
      });
      return { statusCode: response.statusCode, body: response.json() as ErrorBody };
    };

    const both = await put({ issuer: ISS, group: "ursitoare-authors", roleId: "author", teamId: "finance" });
    assert.equal(both.statusCode, 400, "a mapping with both targets is refused");
    assert.equal(both.body.error.code, "VALIDATION_FAILED");

    const neither = await put({ issuer: ISS, group: "ursitoare-authors" });
    assert.equal(neither.statusCode, 400, "a mapping with neither target is refused");
    assert.equal(neither.body.error.code, "VALIDATION_FAILED");

    const ghost = await put({ issuer: ISS, group: "ursitoare-authors", roleId: "ghost" });
    assert.equal(ghost.statusCode, 404, "a mapping to an absent role is refused");
    assert.equal(ghost.body.error.code, "NOT_FOUND");

    const foreignIssuer = await put({
      issuer: "https://other.example",
      group: "ursitoare-authors",
      roleId: "author",
    });
    assert.equal(foreignIssuer.statusCode, 422, "a mapping of an unrouted issuer is refused");
    assert.equal(foreignIssuer.body.error.code, "UNKNOWN_ISSUER");

    const longGroup = await put({
      issuer: ISS,
      group: "g".repeat(256),
      roleId: "author",
    });
    assert.equal(longGroup.statusCode, 400, "an overlong group name is refused");
    assert.equal(longGroup.body.error.code, "VALIDATION_FAILED");

    const elevation = await server.inject({
      method: "PUT",
      url: "/api/v1/idp-group-map",
      headers: writeHeaders(alice),
      payload: JSON.stringify({ issuer: ISS, group: "ursitoare-authors", roleId: "tenant_admin" }),
    });
    assert.equal(elevation.statusCode, 403, "an author cannot map to tenant_admin");
    assert.equal(errorOf(elevation).code, "ELEVATION_REFUSED");

    const listed = await server.inject({
      method: "GET",
      url: "/api/v1/idp-group-map",
      headers: getHeaders(carol),
    });
    assert.equal(listed.statusCode, 200, "the list answers after the refusals");
    assert.deepEqual(listed.json(), { items: [], next_cursor: null });
  } finally {
    await closeHarness(harness);
  }
});
