import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { hashRouteKey, withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { createSession, provisionTenantIdp, upsertUserFromClaims } from "../index.ts";
import type { Principal, SessionContext, User } from "../index.ts";
import { RbacError } from "./errors.ts";
import { grantRole } from "./grants.ts";
import { setGroupMapping } from "./group-map.ts";
import { resolvePrincipal } from "./principal.ts";
import { syncMemberships } from "./sync.ts";
import { createTeam } from "./teams.ts";

const ISS = "https://idp.example/realms/ursitoare";
const OPERATOR = { kind: "operator", name: "seed" } as const;
const OPTIONS = { clock: fixedClock("2026-10-25T08:00:00Z"), ids: sequentialIds() };

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

async function signInUser(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject, name: subject }, OPTIONS),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function sessionFor(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<SessionContext> {
  let sessionId: string | undefined;
  await assert.doesNotReject(async () => {
    const created = await withTenantTx(db.appPool, ctx, (tx) =>
      createSession(tx, ctx, { userId }, OPTIONS),
    );
    sessionId = created.sessionId;
  });
  assert.ok(sessionId !== undefined, "createSession returns a session");
  return {
    tenant: ctx,
    userId,
    sessionRef: hashRouteKey(sessionId).toString("hex"),
    endSessionHint: null,
  };
}

async function resolved(pool: TenantPool, session: SessionContext): Promise<Principal> {
  let principal: Principal | undefined;
  await assert.doesNotReject(async () => {
    principal = await resolvePrincipal(pool, session);
  });
  assert.ok(principal !== undefined, "resolvePrincipal resolves");
  return principal;
}

async function resolveFailure(pool: TenantPool, session: SessionContext): Promise<unknown> {
  return resolvePrincipal(pool, session).then(
    (value) => value,
    (error: unknown) => error,
  );
}

test("C-659b4982 Resolve", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });

    const alice = await signInUser(db, a, "sub-alice");
    const bob = await signInUser(db, a, "sub-bob");

    await withTenantTx(db.appPool, a, async (tx) => {
      await createTeam(tx, a, { teamId: "finance" }, OPERATOR, OPTIONS);
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      await setGroupMapping(
        tx,
        a,
        { issuer: ISS, group: "team-finance", teamId: "finance" },
        OPERATOR,
        OPTIONS,
      );
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      await grantRole(tx, a, { userId: alice.userId, roleId: "author" }, OPERATOR, OPTIONS);
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      await syncMemberships(
        tx,
        a,
        alice.userId,
        { issuer: ISS, groups: ["team-finance"] },
        OPTIONS,
      );
    });

    const aliceSession = await sessionFor(db, a, alice.userId);
    const bobSession = await sessionFor(db, a, bob.userId);

    assert.deepEqual(await resolved(db.appPool, aliceSession), {
      tenantId: a.tenantId,
      userId: alice.userId,
      kind: "human",
      sessionId: aliceSession.sessionRef,
      roles: ["author"],
      teams: ["finance"],
      actorChain: [],
    });
    assert.deepEqual(await resolved(db.appPool, bobSession), {
      tenantId: a.tenantId,
      userId: bob.userId,
      kind: "human",
      sessionId: bobSession.sessionRef,
      roles: [],
      teams: [],
      actorChain: [],
    });

    const downPool = {
      connect: () => Promise.reject(new Error("down")),
    } as unknown as TenantPool;
    const failure = await resolveFailure(downPool, aliceSession);
    assert.ok(failure instanceof Error, "a failing pool rejects");
    assert.equal(failure.message, "down");
  } finally {
    await db.close();
  }
});

test("C-60e440ae More than 64 is refused", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const teams = Array.from({ length: 65 }, (_, index) => `t${String(index).padStart(2, "0")}`);
    const extraRoles = Array.from(
      { length: 61 },
      (_, index) => `r${String(index).padStart(2, "0")}`,
    );

    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.team (tenant_id, team_id)
       SELECT $1, t FROM unnest($2::text[]) AS t`,
      [a.tenantId, teams],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.role (tenant_id, role_id)
       SELECT $1, r FROM unnest($2::text[]) AS r`,
      [a.tenantId, extraRoles],
    );

    const u5 = await signInUser(db, a, "sub-u5");
    const u6 = await signInUser(db, a, "sub-u6");
    const u7 = await signInUser(db, a, "sub-u7");

    const teams64 = teams.slice(0, 64);
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, team_id, source, source_issuer)
       SELECT $1, 'u5_' || t, $2, t, 'idp_claim', $3
       FROM unnest($4::text[]) AS t`,
      [a.tenantId, u5.userId, ISS, teams64],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, team_id, source, source_issuer)
       SELECT $1, 'u6_' || t, $2, t, 'idp_claim', $3
       FROM unnest($4::text[]) AS t`,
      [a.tenantId, u6.userId, ISS, teams],
    );
    const roles65 = ["approver", "auditor", "author", "tenant_admin", ...extraRoles];
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, source, source_issuer, granted_by)
       SELECT $1, 'u7_' || r, $2, r, 'local', '', 'u-admin'
       FROM unnest($3::text[]) AS r`,
      [a.tenantId, u7.userId, roles65],
    );

    const u5Session = await sessionFor(db, a, u5.userId);
    const u6Session = await sessionFor(db, a, u6.userId);
    const u7Session = await sessionFor(db, a, u7.userId);

    assert.deepEqual(await resolved(db.appPool, u5Session), {
      tenantId: a.tenantId,
      userId: u5.userId,
      kind: "human",
      sessionId: u5Session.sessionRef,
      roles: [],
      teams: teams64,
      actorChain: [],
    });

    for (const session of [u6Session, u7Session]) {
      const failure = await resolveFailure(db.appPool, session);
      assert.ok(failure instanceof RbacError, "a principal above 64 is refused");
      assert.equal(failure.code, "RBAC_TOO_MANY_MEMBERSHIPS");
    }
  } finally {
    await db.close();
  }
});
