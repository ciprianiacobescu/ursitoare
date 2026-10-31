import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { upsertUserFromClaims } from "../index.ts";
import type { User } from "../index.ts";
import { loadMemberships, type MembershipSet } from "./memberships.ts";

const ISS = "https://idp.example/realms/ursitoare";

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

async function signIn(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  ids = sequentialIds(),
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject }, {
        ids,
        clock: fixedClock("2026-10-25T08:00:00Z"),
      }),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function load(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<MembershipSet> {
  let result: MembershipSet | undefined;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(db.appPool, ctx, (tx) => loadMemberships(tx, ctx, userId));
  });
  assert.ok(result !== undefined, "loadMemberships resolves");
  return result;
}

test("C-87d71866 Load", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const u1 = await signIn(db, a, "sub-u1", ids);
    const u2 = await signIn(db, a, "sub-u2", ids);
    const u3 = await signIn(db, a, "sub-u3", ids);
    const u4 = await signIn(db, a, "sub-u4", ids);

    const allTeams = ["finance", "ops", ...Array.from({ length: 70 }, (_, index) => `t${String(index).padStart(2, "0")}`)];
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.team (tenant_id, team_id)
       SELECT $1, t FROM unnest($2::text[]) AS t`,
      [a.tenantId, allTeams],
    );
    await ownerExec(
      db,
      a,
      `UPDATE ursitoare."user" SET state = 'disabled' WHERE tenant_id = $1 AND user_id = $2`,
      [a.tenantId, u3.userId],
    );

    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, source, source_issuer, granted_by)
       VALUES ($1, 'm1', $2, 'author', 'idp_claim', $3, NULL),
              ($1, 'm2', $2, 'author', 'local', '', 'u-admin'),
              ($1, 'm3', $2, 'tenant_admin', 'local', '', 'u-admin')`,
      [a.tenantId, u1.userId, ISS],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, team_id, source, source_issuer)
       VALUES ($1, 'm4', $2, 'finance', 'idp_claim', $3),
              ($1, 'm5', $2, 'ops', 'idp_claim', $3)`,
      [a.tenantId, u1.userId, ISS],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, source, source_issuer)
       VALUES ($1, 'm6', $2, 'author', 'idp_claim', $3)`,
      [a.tenantId, u3.userId, ISS],
    );

    const u4Teams = Array.from({ length: 70 }, (_, index) => `t${String(index).padStart(2, "0")}`);
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, team_id, source, source_issuer)
       SELECT $1, 'm_' || t, $2, t, 'idp_claim', $3
       FROM unnest($4::text[]) AS t`,
      [a.tenantId, u4.userId, ISS, u4Teams],
    );

    assert.deepEqual(await load(db, a, u1.userId), {
      roles: ["author", "tenant_admin"],
      teams: ["finance", "ops"],
    });
    assert.deepEqual(await load(db, a, u2.userId), { roles: [], teams: [] });
    assert.deepEqual(await load(db, a, u3.userId), { roles: [], teams: [] });
    assert.deepEqual(await load(db, a, u4.userId), { roles: [], teams: u4Teams });
    assert.deepEqual(await load(db, b, u1.userId), { roles: [], teams: [] });
  } finally {
    await db.close();
  }
});
