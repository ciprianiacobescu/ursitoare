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
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerMeRoute } from "./me.ts";
import { registerPeopleRoutes } from "./people-routes.ts";
import { installPep } from "./pep.ts";
import type { PepDeps } from "./pep.ts";
import { listDefinedRoutes } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const ISS = "https://idp.test";

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-me-teams-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(500),
    logger: silentLogger(),
  });
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

async function addTeamMemberships(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  teamIds: readonly string[],
): Promise<void> {
  await withTenantTx(db.appPool, ctx, async (tx) => {
    for (const teamId of teamIds) {
      await tx.query(
        "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [ctx.tenantId, teamId],
      );
    }
    for (const [index, teamId] of teamIds.entries()) {
      await tx.query(
        `INSERT INTO ursitoare.membership
           (tenant_id, membership_id, user_id, team_id, source, source_issuer)
         VALUES ($1,$2,$3,$4,'idp_claim',$5)`,
        [ctx.tenantId, `mt_${userId}_${index}`, userId, teamId, ISS],
      );
    }
  });
}

async function insertUser(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  displayName: string,
): Promise<void> {
  await withTenantTx(db.appPool, ctx, (tx) =>
    tx.query(
      'INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, email, state) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [ctx.tenantId, userId, "human", null, displayName, null, "active"],
    ),
  );
}

async function setUserState(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  state: "active" | "disabled",
): Promise<void> {
  await withTenantTx(db.appPool, ctx, (tx) =>
    tx.query('UPDATE ursitoare."user" SET state = $1 WHERE tenant_id = $2 AND user_id = $3', [
      state,
      ctx.tenantId,
      userId,
    ]),
  );
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-64158aad teams of alice, bob and mallory and the unchanged /me", async () => {
  assert.equal(typeof registerPeopleRoutes, "function");
  assert.equal(typeof registerMeRoute, "function");

  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a, b } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await engineWithoutTenantPolicy(clock);
    const deps = peopleDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerMeRoute(server, deps);
    }, "registerMeRoute");
    assert.doesNotThrow(() => {
      registerPeopleRoutes(server, deps);
    }, "registerPeopleRoutes");

    const alice = await session(db, a, "alice", clock);
    const bob = await session(db, a, "bob", clock);
    const mallory = await session(db, b, "mallory", clock);

    await addTeamMemberships(db, a, alice.userId, ["finance", "audit"]);
    await addTeamMemberships(db, b, mallory.userId, ["ops"]);

    const aliceTeams = await server.inject({
      method: "GET",
      url: "/api/v1/me/teams",
      headers: { cookie: alice.cookie },
    });
    assert.equal(aliceTeams.statusCode, 200);
    assert.deepEqual(aliceTeams.json(), {
      items: [{ id: "audit" }, { id: "finance" }],
      next_cursor: null,
    });
    assert.equal(aliceTeams.headers["cache-control"], "no-store");

    const aliceTeamsForTenantB = await server.inject({
      method: "GET",
      url: "/api/v1/me/teams?tenant_id=tenant_b",
      headers: { cookie: alice.cookie },
    });
    assert.equal(aliceTeamsForTenantB.statusCode, 200);
    assert.deepEqual(aliceTeamsForTenantB.json(), {
      items: [{ id: "audit" }, { id: "finance" }],
      next_cursor: null,
    });
    assert.equal(
      aliceTeamsForTenantB.body,
      aliceTeams.body,
      "a tenant_id member changes nothing",
    );

    const bobTeams = await server.inject({
      method: "GET",
      url: "/api/v1/me/teams",
      headers: { cookie: bob.cookie },
    });
    assert.equal(bobTeams.statusCode, 200);
    assert.deepEqual(bobTeams.json(), { items: [], next_cursor: null });

    const malloryTeams = await server.inject({
      method: "GET",
      url: "/api/v1/me/teams",
      headers: { cookie: mallory.cookie },
    });
    assert.equal(malloryTeams.statusCode, 200);
    assert.deepEqual(malloryTeams.json(), { items: [{ id: "ops" }], next_cursor: null });

    const aliceMe = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: alice.cookie },
    });
    assert.equal(aliceMe.statusCode, 200);
    const meBody = aliceMe.json() as Record<string, unknown>;
    assert.deepEqual(Object.keys(meBody).sort(), [
      "capabilities",
      "csrfToken",
      "tenant",
      "user",
    ]);
    assert.equal(Object.hasOwn(meBody, "teams"), false, "/me keeps no teams member");
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-a68cc186 missing session, disabled caller, HEAD and no database", async () => {
  assert.equal(typeof registerPeopleRoutes, "function");
  assert.equal(typeof registerMeRoute, "function");

  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    await insertUser(db, a, "u_carol", "Carol Example");
    const clock = mutableClock(T0);
    const engine = await engineWithoutTenantPolicy(clock);
    const deps = peopleDeps(db, clock, engine);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerMeRoute(server, deps);
    }, "registerMeRoute");
    assert.doesNotThrow(() => {
      registerPeopleRoutes(server, deps);
    }, "registerPeopleRoutes");

    const alice = await session(db, a, "alice", clock);
    const bob = await session(db, a, "bob", clock);

    const unauthenticated = {
      error: { code: "UNAUTHENTICATED", message: "Authentication required" },
    };

    for (const url of ["/api/v1/people?ids=u_carol", "/api/v1/people?ids=a%20b"]) {
      const response = await server.inject({ method: "GET", url });
      assert.equal(response.statusCode, 401, `${url} without a session is refused`);
      assert.deepEqual(response.json(), unauthenticated, `${url} answers UNAUTHENTICATED`);
    }

    const teamsWithoutSession = await server.inject({
      method: "GET",
      url: "/api/v1/me/teams",
    });
    assert.equal(teamsWithoutSession.statusCode, 401);
    assert.deepEqual(teamsWithoutSession.json(), unauthenticated);

    await setUserState(db, a, bob.userId, "disabled");

    const bobPeople = await server.inject({
      method: "GET",
      url: "/api/v1/people?ids=u_carol",
      headers: { cookie: bob.cookie },
    });
    assert.equal(bobPeople.statusCode, 401);
    assert.deepEqual(bobPeople.json(), unauthenticated);
    assert.equal(bobPeople.body.includes("Carol"), false, "bob's body names no user");

    const bobTeams = await server.inject({
      method: "GET",
      url: "/api/v1/me/teams",
      headers: { cookie: bob.cookie },
    });
    assert.equal(bobTeams.statusCode, 401);
    assert.deepEqual(bobTeams.json(), unauthenticated);

    for (const url of ["/api/v1/people?ids=u_carol", "/api/v1/me/teams"]) {
      const head = await server.inject({
        method: "HEAD",
        url,
        headers: { cookie: alice.cookie },
      });
      assert.equal(head.statusCode, 404, `${url} has no HEAD route`);
    }
  } finally {
    await server.close();
    await db.close();
  }

  const bare = await testServer();
  try {
    const clock = mutableClock(T0);
    const bareDeps: PepDeps = {
      pool: null,
      engine: null,
      clock,
      publicBaseUrl: BASE_URL,
    };
    assert.doesNotThrow(() => {
      installPep(bare, bareDeps);
    }, "installPep without a database");
    assert.doesNotThrow(() => {
      registerPeopleRoutes(bare, bareDeps);
    }, "registerPeopleRoutes mounts without a database");

    const routes = listDefinedRoutes(bare);
    const people = routes.find(
      (route) => route.method === "GET" && route.url === "/api/v1/people",
    );
    assert.ok(people !== undefined, "the people route is defined without a database");
    assert.deepEqual(people.errors, [
      "AUTHZ_UNAVAILABLE",
      "FORBIDDEN",
      "UNAUTHENTICATED",
      "VALIDATION_FAILED",
    ]);
    assert.deepEqual(people.auth, { kind: "session" });
    assert.equal(people.action, "read_self");

    const teams = routes.find(
      (route) => route.method === "GET" && route.url === "/api/v1/me/teams",
    );
    assert.ok(teams !== undefined, "the teams route is defined without a database");
    assert.deepEqual(teams.errors, ["AUTHZ_UNAVAILABLE", "FORBIDDEN", "UNAUTHENTICATED"]);
    assert.deepEqual(teams.auth, { kind: "session" });
    assert.equal(teams.action, "read_self");

    const unavailable = {
      error: { code: "AUTHZ_UNAVAILABLE", message: "Authorization is unavailable" },
    };
    for (const url of ["/api/v1/people?ids=u_carol", "/api/v1/me/teams"]) {
      const response = await bare.inject({ method: "GET", url });
      assert.equal(response.statusCode, 503, `${url} without a PEP pool is unavailable`);
      assert.deepEqual(response.json(), unavailable);
    }
  } finally {
    await bare.close();
  }
});
