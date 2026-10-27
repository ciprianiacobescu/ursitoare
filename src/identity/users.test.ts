import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { getUser, listUsers, upsertUserFromClaims } from "./index.ts";
import type { User } from "./index.ts";

const ISS = "https://idp.example/realms/ursitoare";
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

test("C-569586e2 Get", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const alice = await signIn(db, a, "sub-alice");
    const mallory = await signIn(db, b, "sub-mallory", sequentialIds(7));
    const got = await withTenantTx(db.appPool, a, async (tx) => {
      let own: User | null = null;
      await assert.doesNotReject(async () => {
        own = await getUser(tx, a, alice.userId);
      });
      return own;
    });
    assert.deepEqual(got, alice);
    await withTenantTx(db.appPool, a, async (tx) => {
      assert.equal(await getUser(tx, a, "usr_none"), null);
      assert.equal(await getUser(tx, a, mallory.userId), null);
      await assert.rejects(getUser(tx, a, "a/b"), { name: "IdentityError", code: "IDENTITY_INVALID" });
      await assert.rejects(getUser(tx, a, ""), { name: "IdentityError", code: "IDENTITY_INVALID" });
    });
  } finally {
    await db.close();
  }
});

test("C-cffba88c Pages", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const created: User[] = [];
    for (const n of [1, 2, 3, 4, 5]) created.push(await signIn(db, a, `sub-${n}`, ids));
    const id = (n: number): string => (created[n - 1] as User).userId;
    await withTenantTx(db.appPool, a, async (tx) => {
      let first: User | null = null;
      await assert.doesNotReject(async () => {
        first = await getUser(tx, a, id(1));
      });
      const p1 = await listUsers(tx, a, { limit: 2 });
      assert.deepEqual(p1.users, [created[0], created[1]]);
      assert.equal(p1.next, id(2));
      assert.deepEqual(first, p1.users[0]);
      const p2 = await listUsers(tx, a, { limit: 2, after: p1.next as string });
      assert.deepEqual(p2.users, [created[2], created[3]]);
      assert.equal(p2.next, id(4));
      const p3 = await listUsers(tx, a, { limit: 2, after: p2.next as string });
      assert.deepEqual(p3.users, [created[4]]);
      assert.equal(p3.next, null);
      const all = await listUsers(tx, a);
      assert.deepEqual(all.users, created);
      assert.equal(all.next, null);
      for (const page of [{ limit: 0 }, { limit: 201 }, { limit: 1.5 }, { after: "a/b" }]) {
        await assert.rejects(listUsers(tx, a, page), { name: "IdentityError", code: "IDENTITY_INVALID" });
      }
    });
    await withTenantTx(db.appPool, b, async (tx) => {
      assert.deepEqual(await listUsers(tx, b), { users: [], next: null });
    });
    await signIn(db, b, "sub-b", sequentialIds(100));
    await withTenantTx(db.appPool, b, async (tx) => {
      const mine = await listUsers(tx, b);
      assert.equal(mine.users.length, 1);
      assert.ok(!mine.users.some((u) => created.some((c) => c.userId === u.userId)));
    });
  } finally {
    await db.close();
  }
});

test("C-dcd3307a Wrong or missing tenant for getUser and listUsers", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const alice = await signIn(db, a, "sub-alice");
    const before = [await userCount(db, a), await userCount(db, b)];
    await withTenantTx(db.appPool, b, async (tx) => {
      await assert.rejects(getUser(tx, a, alice.userId), MISMATCH);
      await assert.rejects(listUsers(tx, a), MISMATCH);
    });
    const client = await db.appPool.connect();
    try {
      await client.query("BEGIN");
      await assert.rejects(getUser(client, a, alice.userId), MISMATCH);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
    assert.deepEqual([await userCount(db, a), await userCount(db, b)], before);
  } finally {
    await db.close();
  }
});
