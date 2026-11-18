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
import type { Decision, PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { PEOPLE_MAX_IDS, registerPeopleRoutes } from "./people-routes.ts";
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

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface PersonItem {
  userId: string;
  displayName: string;
  kind: "human" | "service";
}

interface PeopleBody {
  items: PersonItem[];
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface SeedRow {
  userId: string;
  displayName: string;
  kind: "human" | "service";
  ownerUserId?: string;
  state?: "active" | "disabled";
  email?: string;
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

async function allowEngine(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-people-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(500),
    logger: silentLogger(),
  });
}

function denyEngine(clock: Clock): PolicyEngine {
  const deny: Decision = {
    decision: "deny",
    decisionId: "decision-deny",
    decidedAt: clock.now().toISOString(),
    reasons: [],
    errors: [],
    policySetVersion: POLICY_SET_VERSION,
  };
  return {
    policySetVersion: POLICY_SET_VERSION,
    actions: [],
    policies: [],
    check: async () => deny,
    allowedActions: async () => [],
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

function peopleDeps(db: TestDatabase, clock: Clock, engine: PolicyEngine): PepDeps {
  return { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL };
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

async function insertUser(db: TestDatabase, ctx: TenantContext, row: SeedRow): Promise<void> {
  await withTenantTx(db.appPool, ctx, (tx) =>
    tx.query(
      'INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, email, state) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [
        ctx.tenantId,
        row.userId,
        row.kind,
        row.ownerUserId ?? null,
        row.displayName,
        row.email ?? null,
        row.state ?? "active",
      ],
    ),
  );
}

async function seedPeople(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }> {
  const { a, b } = await seedTwoTenants(db);
  await insertUser(db, a, {
    userId: "u_carol",
    displayName: "Carol Example",
    kind: "human",
    email: "carol@example.test",
  });
  await insertUser(db, a, {
    userId: "u_dan",
    displayName: "Dan Disabled",
    kind: "human",
    state: "disabled",
    email: "dan@example.test",
  });
  await insertUser(db, a, {
    userId: "svc_ci",
    displayName: "CI bot",
    kind: "service",
    ownerUserId: "u_carol",
  });
  await insertUser(db, a, { userId: "twin", displayName: "Alice Twin", kind: "human" });
  await insertUser(db, b, { userId: "twin", displayName: "Mallory Twin", kind: "human" });
  await insertUser(db, b, { userId: "u_erin", displayName: "Erin Other", kind: "human" });
  return { a, b };
}

async function readSelfDecisions(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<{ decision: string }[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ decision: string }>(
      "SELECT decision FROM ursitoare.policy_decision WHERE action = 'read_self'",
    );
    return result.rows;
  });
}

async function auditCount(db: TestDatabase, ctx: TenantContext): Promise<number> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.audit_event");
    return Number(result.rows[0]?.n ?? "0");
  });
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-57481c19 a member reads the names of the ids it holds", async () => {
  assert.equal(typeof registerPeopleRoutes, "function");
  assert.equal(typeof PEOPLE_MAX_IDS, "number");

  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedPeople(db);
    const clock = mutableClock(T0);
    const engine = await allowEngine(clock);
    const deps = peopleDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerPeopleRoutes(server, deps);
    }, "registerPeopleRoutes");

    const alice = await session(db, a, "alice", clock);
    await withTenantTx(db.appPool, a, (tx) =>
      tx.query('UPDATE ursitoare."user" SET email = $1 WHERE tenant_id = $2 AND user_id = $3', [
        "alice@example.test",
        a.tenantId,
        alice.userId,
      ]),
    );

    const auditBefore = await auditCount(db, a);
    const ids = ["svc_ci", "u_dan", "nobody", alice.userId, "svc_ci", "u_erin", "twin"];
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/people?ids=${ids.join(",")}`,
      headers: { cookie: alice.cookie },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json() as PeopleBody;
    assert.deepEqual(body.items, [
      { userId: "svc_ci", displayName: "CI bot", kind: "service" },
      { userId: "u_dan", displayName: "Dan Disabled", kind: "human" },
      { userId: alice.userId, displayName: "alice", kind: "human" },
      { userId: "twin", displayName: "Alice Twin", kind: "human" },
    ]);
    for (const item of body.items) {
      assert.deepEqual(Object.keys(item).sort(), ["displayName", "kind", "userId"]);
    }
    assert.equal(response.body.includes("@example.test"), false, "no email is returned");
    assert.equal(response.body.includes("email"), false, "no email member is returned");
    assert.equal(response.headers["cache-control"], "no-store");

    const decisions = await readSelfDecisions(db, a);
    assert.equal(decisions.length, 1, "one read_self decision row is recorded");
    assert.equal(decisions[0]?.decision, "allow");
    assert.equal(await auditCount(db, a), auditBefore, "a read writes no audit event");
  } finally {
    await server.close();
    await db.close();
  }

  const denyDb = await withTestDatabase();
  const denyServer = await testServer();
  try {
    const { a } = await seedTwoTenants(denyDb);
    const clock = mutableClock(T0);
    const deps = peopleDeps(denyDb, clock, denyEngine(clock));

    assert.doesNotThrow(() => {
      installPep(denyServer, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerPeopleRoutes(denyServer, deps);
    }, "registerPeopleRoutes");

    const alice = await session(denyDb, a, "alice", clock);
    const response = await denyServer.inject({
      method: "GET",
      url: `/api/v1/people?ids=${alice.userId}`,
      headers: { cookie: alice.cookie },
    });
    assert.equal(response.statusCode, 403);
    assert.deepEqual(response.json(), {
      error: {
        code: "FORBIDDEN",
        message: "Action not permitted",
        details: { decisionId: "decision-deny" },
      },
    });
  } finally {
    await denyServer.close();
    await denyDb.close();
  }
});

test("C-59f63ed0 a member of tenant B gets nothing for tenant A's ids", async () => {
  assert.equal(typeof registerPeopleRoutes, "function");

  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a, b } = await seedPeople(db);
    const clock = mutableClock(T0);
    const engine = await allowEngine(clock);
    const deps = peopleDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerPeopleRoutes(server, deps);
    }, "registerPeopleRoutes");

    const alice = await session(db, a, "alice", clock);
    const mallory = await session(db, b, "mallory", clock);

    const first = await server.inject({
      method: "GET",
      url: `/api/v1/people?ids=${[alice.userId, "u_carol", "svc_ci", "u_dan", "twin", "u_erin"].join(",")}`,
      headers: { cookie: mallory.cookie },
    });
    assert.equal(first.statusCode, 200);
    assert.deepEqual((first.json() as PeopleBody).items, [
      { userId: "twin", displayName: "Mallory Twin", kind: "human" },
      { userId: "u_erin", displayName: "Erin Other", kind: "human" },
    ]);

    const second = await server.inject({
      method: "GET",
      url: `/api/v1/people?ids=${[alice.userId, "u_carol", "svc_ci", "u_dan"].join(",")}`,
      headers: { cookie: mallory.cookie, "x-tenant-id": "tenant_a" },
    });
    assert.equal(second.statusCode, 200);
    assert.deepEqual(second.json(), { items: [] });

    const third = await server.inject({
      method: "GET",
      url: "/api/v1/people?ids=ghost1,ghost2,ghost3,ghost4",
      headers: { cookie: mallory.cookie },
    });
    assert.equal(third.statusCode, 200);
    assert.deepEqual(third.json(), { items: [] });
    assert.equal(second.body, third.body, "another tenant's id matches an id that exists nowhere");

    const fourth = await server.inject({
      method: "GET",
      url: "/api/v1/people?tenant_id=tenant_a&ids=u_carol",
      headers: { cookie: mallory.cookie },
    });
    assert.equal(fourth.statusCode, 400);
    const fourthBody = fourth.json() as ErrorBody;
    assert.equal(fourthBody.error.code, "VALIDATION_FAILED");
    const fields = (fourthBody.error.details as { fields: { field: string }[] }).fields;
    assert.equal(fields[0]?.field, "querystring/tenant_id");

    const aliceTwin = await server.inject({
      method: "GET",
      url: "/api/v1/people?ids=twin",
      headers: { cookie: alice.cookie },
    });
    assert.equal(aliceTwin.statusCode, 200);
    assert.deepEqual((aliceTwin.json() as PeopleBody).items, [
      { userId: "twin", displayName: "Alice Twin", kind: "human" },
    ]);

    for (const response of [first, second, third, fourth]) {
      assert.equal(response.body.includes("Alice Twin"), false, "no tenant A twin name");
      assert.equal(response.body.includes("Carol Example"), false, "no tenant A name");
      assert.equal(response.body.includes("Dan Disabled"), false, "no tenant A name");
      assert.equal(response.body.includes("tenant_a"), false, "no tenant selector is echoed");
    }
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-1c488737 the people route refuses bad ids, accepts the limit and bounds the largest answer", async () => {
  assert.equal(typeof registerPeopleRoutes, "function");
  assert.equal(typeof PEOPLE_MAX_IDS, "number");

  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedPeople(db);
    const clock = mutableClock(T0);
    const engine = await allowEngine(clock);
    const deps = peopleDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerPeopleRoutes(server, deps);
    }, "registerPeopleRoutes");

    const alice = await session(db, a, "alice", clock);

    const tooMany = Array.from({ length: PEOPLE_MAX_IDS + 1 }, (_, index) => `n${index}`).join(",");
    const refusals = [
      { url: "/api/v1/people", field: "querystring/ids" },
      { url: "/api/v1/people?ids=", field: "querystring/ids" },
      { url: "/api/v1/people?ids=a%20b", field: "querystring/ids" },
      { url: "/api/v1/people?ids=a,,b", field: "querystring/ids" },
      { url: "/api/v1/people?ids=a%0A", field: "querystring/ids" },
      { url: `/api/v1/people?ids=${"x".repeat(65)}`, field: "querystring/ids" },
      { url: `/api/v1/people?ids=${tooMany}`, field: "querystring/ids" },
      { url: "/api/v1/people?ids=a&ids=b", field: "querystring/ids" },
      { url: "/api/v1/people?ids=a&x=1", field: "querystring/x" },
    ];

    const before = (await readSelfDecisions(db, a)).length;
    for (const refusal of refusals) {
      const response = await server.inject({
        method: "GET",
        url: refusal.url,
        headers: { cookie: alice.cookie },
      });
      assert.equal(response.statusCode, 400, `${refusal.url} is refused`);
      const body = response.json() as ErrorBody;
      assert.equal(body.error.code, "VALIDATION_FAILED", `${refusal.url} is a validation failure`);
      const details = body.error.details as { fields: { field: string; message: string }[] };
      assert.equal(details.fields[0]?.field, refusal.field, `${refusal.url} names its field`);
      if (refusal.url === "/api/v1/people?ids=a&ids=b") {
        assert.equal(details.fields[0]?.message, "must be string");
      }
    }
    assert.equal(
      (await readSelfDecisions(db, a)).length,
      before,
      "refusals leave the read_self decision count unchanged",
    );

    const limit = Array.from({ length: PEOPLE_MAX_IDS }, (_, index) => `n${index}`).join(",");
    const atLimit = await server.inject({
      method: "GET",
      url: `/api/v1/people?ids=${limit}`,
      headers: { cookie: alice.cookie },
    });
    assert.equal(atLimit.statusCode, 200);
    assert.deepEqual(atLimit.json(), { items: [] });

    const bigIds = Array.from(
      { length: PEOPLE_MAX_IDS },
      (_, index) => `big${String(index).padStart(2, "0")}${"x".repeat(59)}`,
    );
    await withTenantTx(db.appPool, a, async (tx) => {
      for (const userId of bigIds) {
        await tx.query(
          'INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, email, state) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [a.tenantId, userId, "service", "u_carol", "\u0001".repeat(200), null, "active"],
        );
      }
    });

    const largest = await server.inject({
      method: "GET",
      url: `/api/v1/people?ids=${bigIds.join(",")}`,
      headers: { cookie: alice.cookie },
    });
    assert.equal(largest.statusCode, 200);
    assert.equal((largest.json() as PeopleBody).items.length, PEOPLE_MAX_IDS);
    const bytes = Buffer.byteLength(largest.body, "utf8");
    assert.equal(bytes, 65_611, "the worst-case answer measures 65,611 bytes");
    assert.ok(bytes <= 66_000, "the answer is at most 66,000 bytes");
  } finally {
    await server.close();
    await db.close();
  }
});
