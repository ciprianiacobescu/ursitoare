import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { grantRole, revokeRole } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { ActionName, PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { defineRoute } from "./route.ts";
import { installPep } from "./pep.ts";
import type { PepDeps } from "./pep.ts";
import { registerMeRoute } from "./me.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const ISSUER = "https://idp.example/realms/ursitoare";
const OPERATOR = { kind: "operator", name: "cli" } as const;

const ROLES_CEDAR = join(import.meta.dirname, "..", "identity", "policy", "roles.cedar");

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

interface PrincipalBody {
  tenantId: string;
  userId: string;
  kind: "human" | "service";
  sessionId?: string;
  roles: string[];
  teams: string[];
  actorChain: string[];
}

interface MeBody {
  capabilities: ActionName[];
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

async function engineWithCopiedRoles(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-session-rbac-src-"));
  engineDirs.push(srcDir);
  const text = await readFile(ROLES_CEDAR, "utf8").catch(() => "");
  if (text !== "") {
    const policyDir = join(srcDir, "identity", "policy");
    await mkdir(policyDir, { recursive: true });
    await writeFile(join(policyDir, "roles.cedar"), text, "utf8");
  }
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(700),
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

async function ownerExec(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(sql, params);
  });
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

async function operatorRevoke(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  roleId: string,
): Promise<void> {
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      await revokeRole(tx, ctx, { userId, roleId }, OPERATOR);
    });
  });
}

function routeDeps(db: TestDatabase, engine: PolicyEngine, clock: Clock): PepDeps {
  return { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL };
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-d0dff9b1 Requests carry the memberships", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await engineWithCopiedRoles(clock);
    const deps = routeDeps(db, engine, clock);

    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    assert.doesNotThrow(() => {
      registerMeRoute(server, deps);
    }, "registerMeRoute");
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/principal",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler: async (request) => request.principal,
      });
    }, "defineRoute");

    const carol = await session(db, a, "carol", clock);
    const alice = await session(db, a, "alice", clock);
    const bob = await session(db, a, "bob", clock);
    const dave = await session(db, a, "dave", clock);

    await operatorGrant(db, a, carol.userId, "tenant_admin");
    await operatorGrant(db, a, alice.userId, "author");

    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')`,
      [a.tenantId],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, team_id, source, source_issuer)
       VALUES ($1, 'alice_team_finance', $2, 'finance', 'idp_claim', $3)`,
      [a.tenantId, alice.userId, ISSUER],
    );

    const daveTeams = Array.from(
      { length: 65 },
      (_, index) => `t${String(index).padStart(2, "0")}`,
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.team (tenant_id, team_id)
       SELECT $1, t FROM unnest($2::text[]) AS t`,
      [a.tenantId, daveTeams],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, team_id, source, source_issuer)
       SELECT $1, 'dave_' || t, $2, t, 'idp_claim', $3
       FROM unnest($4::text[]) AS t`,
      [a.tenantId, dave.userId, ISSUER, daveTeams],
    );

    const principalFor = async (
      cookie: string,
    ): Promise<{ statusCode: number; body: PrincipalBody }> => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/test/principal",
        headers: { cookie },
      });
      return { statusCode: response.statusCode, body: response.json() as PrincipalBody };
    };

    const carolBefore = await principalFor(carol.cookie);
    assert.equal(carolBefore.statusCode, 200);
    assert.deepEqual(carolBefore.body.roles, ["tenant_admin"]);
    assert.deepEqual(carolBefore.body.teams, []);

    const carolMe = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: carol.cookie },
    });
    assert.equal(carolMe.statusCode, 200);
    assert.deepEqual((carolMe.json() as MeBody).capabilities, [
      "manage_tenant",
      "manage_users_roles",
      "read_audit",
      "read_self",
    ]);

    const alicePrincipal = await principalFor(alice.cookie);
    assert.equal(alicePrincipal.statusCode, 200);
    assert.deepEqual(alicePrincipal.body.roles, ["author"]);
    assert.deepEqual(alicePrincipal.body.teams, ["finance"]);

    const aliceMe = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: alice.cookie },
    });
    assert.equal(aliceMe.statusCode, 200);
    assert.deepEqual((aliceMe.json() as MeBody).capabilities, ["read_self"]);

    const bobPrincipal = await principalFor(bob.cookie);
    assert.equal(bobPrincipal.statusCode, 200);
    assert.deepEqual(bobPrincipal.body.roles, []);
    assert.deepEqual(bobPrincipal.body.teams, []);

    const bobMe = await server.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { cookie: bob.cookie },
    });
    assert.equal(bobMe.statusCode, 200);
    assert.deepEqual((bobMe.json() as MeBody).capabilities, ["read_self"]);

    await operatorRevoke(db, a, carol.userId, "tenant_admin");

    const carolAfter = await principalFor(carol.cookie);
    assert.equal(carolAfter.statusCode, 200);
    assert.deepEqual(carolAfter.body.roles, []);

    const daveResponse = await server.inject({
      method: "GET",
      url: "/api/v1/test/principal",
      headers: { cookie: dave.cookie },
    });
    assert.equal(daveResponse.statusCode, 503);
    assert.deepEqual(daveResponse.json(), {
      error: { code: "AUTHZ_UNAVAILABLE", message: "Authorization is unavailable" },
    });
  } finally {
    await server.close();
    await db.close();
  }
});
