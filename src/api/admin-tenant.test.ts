import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
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

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
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
  ann: Session;
  bob: Session;
}

const MULTIPLE_HUMANS_WARNING = {
  code: "SOLO_TENANT_HAS_MANY_HUMANS",
  message: "This solo tenant has 3 active human members; each may review their own flows.",
  humanMembers: 3,
};

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
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-tenant-src-"));
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

  const carol = await session(db, a, "carol", clock);
  const ann = await session(db, a, "ann", clock);
  const bob = await session(db, a, "bob", clock);
  await operatorGrant(db, a, carol.userId, "tenant_admin");

  return { db, server, a, b, clock, carol, ann, bob };
}

async function closeHarness(harness: Harness): Promise<void> {
  await harness.server.close();
  await harness.db.close();
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

async function ownerProfile(db: TestDatabase, tenantId: string): Promise<string | null> {
  const { rows } = await db.ownerPool.query<{ review_profile: string | null }>(
    "SELECT review_profile FROM ursitoare.tenant WHERE tenant_id = $1",
    [tenantId],
  );
  return rows[0]?.review_profile ?? null;
}

async function putProfile(
  server: FastifyInstance,
  actor: Session,
  payload: unknown,
): Promise<{ statusCode: number; json: () => unknown }> {
  return server.inject({
    method: "PUT",
    url: "/api/v1/tenant/review-profile",
    headers: writeHeaders(actor),
    payload: JSON.stringify(payload),
  });
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-10655032 the review profile switches warns and stays audited through the server", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, b, carol, ann, bob } = harness;

    const toTeam = await putProfile(server, carol, { reviewProfile: "team" });
    assert.equal(toTeam.statusCode, 200, "put team answers 200");
    assert.deepEqual(toTeam.json(), {
      tenantId: "tenant_a",
      reviewProfile: "team",
      previous: "solo",
      changed: true,
      humanMembers: 3,
      warning: null,
    });

    const toSolo = await putProfile(server, carol, { reviewProfile: "solo" });
    assert.equal(toSolo.statusCode, 200, "put solo answers 200");
    assert.deepEqual(toSolo.json(), {
      tenantId: "tenant_a",
      reviewProfile: "solo",
      previous: "team",
      changed: true,
      humanMembers: 3,
      warning: MULTIPLE_HUMANS_WARNING,
    });

    const toSoloAgain = await putProfile(server, carol, { reviewProfile: "solo" });
    assert.equal(toSoloAgain.statusCode, 200, "put solo again answers 200");
    assert.deepEqual(toSoloAgain.json(), {
      tenantId: "tenant_a",
      reviewProfile: "solo",
      previous: "solo",
      changed: false,
      humanMembers: 3,
      warning: MULTIPLE_HUMANS_WARNING,
    });

    for (const member of [ann, bob]) {
      const disabled = await server.inject({
        method: "PATCH",
        url: `/api/v1/users/${member.userId}`,
        headers: writeHeaders(carol),
        payload: JSON.stringify({ state: "disabled" }),
      });
      assert.equal(disabled.statusCode, 200, "the member is disabled");
    }

    const soloWithOne = await putProfile(server, carol, { reviewProfile: "solo" });
    assert.equal(soloWithOne.statusCode, 200, "put solo with one human answers 200");
    assert.deepEqual(soloWithOne.json(), {
      tenantId: "tenant_a",
      reviewProfile: "solo",
      previous: "solo",
      changed: false,
      humanMembers: 1,
      warning: null,
    });

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.review_profile_changed",
    );
    assert.equal(events.length, 2, "only the two real changes are audited");
    assert.deepEqual(events[0]?.target, { kind: "tenant", id: "tenant_a" });
    assert.deepEqual(events[0]?.actor, { kind: "user", id: carol.userId });
    assert.deepEqual(events[0]?.payload, { from: "solo", to: "team", humanMembers: 3 });
    assert.deepEqual(events[1]?.target, { kind: "tenant", id: "tenant_a" });
    assert.deepEqual(events[1]?.actor, { kind: "user", id: carol.userId });
    assert.deepEqual(events[1]?.payload, { from: "team", to: "solo", humanMembers: 3 });

    assert.deepEqual(
      await Promise.all([ownerProfile(db, a.tenantId), ownerProfile(db, b.tenantId)]),
      ["solo", "solo"],
      "the owner reads solo for A and B",
    );
  } finally {
    await closeHarness(harness);
  }
});

test("C-1801fd2c the review profile route refuses a bad body and keeps the profile", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, carol } = harness;

    const unknownProfile = await putProfile(server, carol, { reviewProfile: "duo" });
    assert.equal(unknownProfile.statusCode, 400, "duo is a bad profile value");
    assert.equal(errorOf(unknownProfile).code, "VALIDATION_FAILED");

    const empty = await putProfile(server, carol, {});
    assert.equal(empty.statusCode, 400, "a body with no profile is refused");
    assert.equal(errorOf(empty).code, "VALIDATION_FAILED");

    const extra = await putProfile(server, carol, { reviewProfile: "team", x: 1 });
    assert.equal(extra.statusCode, 400, "a body with an unknown property is refused");
    assert.equal(errorOf(extra).code, "VALIDATION_FAILED");

    assert.equal(await ownerProfile(db, a.tenantId), "solo", "the refusals leave tenant A solo");
    assert.equal(await ownerProfile(db, "tenant_b"), "solo", "tenant B stays solo");
  } finally {
    await closeHarness(harness);
  }
});
