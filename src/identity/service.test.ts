import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createServiceAccount, getUser, upsertUserFromClaims } from "./index.ts";
import type { User } from "./index.ts";

const ISS = "https://idp.example/realms/ursitoare";
const OWNER_INVALID = {
  name: "IdentityError",
  code: "IDENTITY_OWNER_INVALID",
  message: "owner must be an active human user",
};
const INVALID = { name: "IdentityError", code: "IDENTITY_INVALID" };
const MISMATCH = {
  name: "IdentityError",
  code: "IDENTITY_TENANT_MISMATCH",
  message: "transaction tenant does not match the tenant context",
};

async function signIn(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  ids = sequentialIds(),
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject, name: subject }, {
        ids,
        clock: fixedClock("2026-10-25T08:00:00Z"),
      }),
    );
  });
  return user as User;
}

async function userCount(db: TestDatabase, ctx: TenantContext): Promise<number> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const res = await tx.query('SELECT count(*)::int AS n FROM ursitoare."user"');
    return (res.rows[0] as { n: number }).n;
  });
}

async function serviceCount(db: TestDatabase, ctx: TenantContext): Promise<number> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const res = await tx.query(
      "SELECT count(*)::int AS n FROM ursitoare.\"user\" WHERE kind = 'service'",
    );
    return (res.rows[0] as { n: number }).n;
  });
}

test("C-4fa2c2cd Create", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const alice = await signIn(db, a, "sub-alice");
    let created: User | undefined;
    await assert.doesNotReject(async () => {
      created = await withTenantTx(db.appPool, a, (tx) =>
        createServiceAccount(
          tx,
          a,
          { displayName: "  Invoice robot ", ownerUserId: alice.userId },
          { ids: sequentialIds(5), clock: fixedClock("2026-10-25T08:00:00Z") },
        ),
      );
    });
    assert.deepEqual(created, {
      userId: "svc_00000000-0000-7000-8000-000000000005",
      kind: "service",
      ownerUserId: alice.userId,
      displayName: "Invoice robot",
      email: null,
      state: "active",
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      const got = await getUser(tx, a, (created as User).userId);
      assert.deepEqual(got, created);
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      const res = await tx.query(
        "SELECT * FROM ursitoare.idp_link WHERE user_id = $1",
        [(created as User).userId],
      );
      assert.equal(res.rows.length, 0);
      const rows = await tx.query(
        `SELECT created_at, updated_at FROM ursitoare."user" WHERE user_id = $1`,
        [(created as User).userId],
      );
      assert.deepEqual((rows.rows[0] as { created_at: Date }).created_at, new Date("2026-10-25T08:00:00Z"));
      assert.deepEqual((rows.rows[0] as { updated_at: Date }).updated_at, new Date("2026-10-25T08:00:00Z"));
    });
  } finally {
    await db.close();
  }
});

test("C-6244c1b6 Invalid owners", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const alice = await signIn(db, a, "sub-alice");
    const robot: User = {
      userId: "svc_00000000-0000-7000-8000-000000000099",
      kind: "service",
      ownerUserId: alice.userId,
      displayName: "robot",
      email: null,
      state: "active",
    };
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await tx.query(
        `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
         VALUES ($1, $2, 'service', $3, 'robot', 'active')`,
        [a.tenantId, robot.userId, alice.userId],
      );
      await tx.query(
        `UPDATE ursitoare."user" SET state = 'disabled' WHERE user_id = $1`,
        [alice.userId],
      );
    });
    const before = await serviceCount(db, a);
    const owners = [
      (robot as User).userId,
      alice.userId,
      "usr_none",
      (await signIn(db, b, "sub-mallory")).userId,
    ];
    await withTenantTx(db.appPool, a, async (tx) => {
      for (const ownerUserId of owners) {
        await assert.rejects(
          createServiceAccount(tx, a, { displayName: "robot", ownerUserId }, {
            ids: sequentialIds(9),
            clock: fixedClock("2026-10-25T08:00:00Z"),
          }),
          OWNER_INVALID,
        );
      }
    });
    assert.equal(await serviceCount(db, a), before);
  } finally {
    await db.close();
  }
});

test("C-4f243a05 Bad input", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const alice = await signIn(db, a, "sub-alice");
    const before = await serviceCount(db, a);
    await withTenantTx(db.appPool, a, async (tx) => {
      for (const displayName of ["", "x".repeat(201), 5]) {
        await assert.rejects(
          createServiceAccount(tx, a, { displayName: displayName as string, ownerUserId: alice.userId }),
          INVALID,
        );
      }
      await assert.rejects(
        createServiceAccount(tx, a, { displayName: "robot", ownerUserId: "a/b" }),
        INVALID,
      );
    });
    assert.equal(await serviceCount(db, a), before);
  } finally {
    await db.close();
  }
});

test("C-dcd3307a Wrong or missing tenant for createServiceAccount", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const alice = await signIn(db, a, "sub-alice");
    const before = [await userCount(db, a), await userCount(db, b)];
    await withTenantTx(db.appPool, b, async (tx) => {
      await assert.rejects(
        createServiceAccount(tx, a, { displayName: "robot", ownerUserId: alice.userId }),
        MISMATCH,
      );
    });
    assert.deepEqual([await userCount(db, a), await userCount(db, b)], before);
  } finally {
    await db.close();
  }
});
