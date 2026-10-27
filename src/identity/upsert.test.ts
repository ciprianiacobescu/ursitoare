import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { listUsers, upsertUserFromClaims } from "./index.ts";
import type { TokenClaims, User } from "./index.ts";

const ISS = "https://idp.example/realms/ursitoare";
const T08 = "2026-10-25T08:00:00Z";
const T09 = "2026-10-25T09:00:00Z";
const T10 = "2026-10-25T10:00:00Z";
const T11 = "2026-10-25T11:00:00Z";
const ALICE_ID = "usr_00000000-0000-7000-8000-000000000000";

async function signIn(
  db: TestDatabase,
  ctx: TenantContext,
  claims: TokenClaims,
  at: string,
  ids = sequentialIds(),
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, claims, { ids, clock: fixedClock(at) }),
    );
  });
  return user as User;
}

async function ownerRows(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => (await tx.query(sql, params)).rows);
}

const alice: TokenClaims = {
  issuer: ISS,
  subject: "sub-alice",
  email: "alice@example.test",
  name: "Alice A",
  preferredUsername: "alice",
};

test("C-c54d1b54 First sign-in", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const user = await signIn(db, a, alice, T08);
    assert.deepEqual(user, {
      userId: ALICE_ID,
      kind: "human",
      ownerUserId: null,
      displayName: "Alice A",
      email: "alice@example.test",
      state: "active",
    });
    const users = await ownerRows(db, a, 'SELECT * FROM ursitoare."user"');
    assert.equal(users.length, 1);
    assert.equal((users[0]?.["created_at"] as Date).toISOString(), "2026-10-25T08:00:00.000Z");
    assert.equal((users[0]?.["updated_at"] as Date).toISOString(), "2026-10-25T08:00:00.000Z");
    const links = await ownerRows(db, a, "SELECT * FROM ursitoare.idp_link");
    assert.equal(links.length, 1);
    assert.equal(links[0]?.["tenant_id"], "tenant_a");
    assert.equal(links[0]?.["issuer"], ISS);
    assert.equal(links[0]?.["subject"], "sub-alice");
    assert.equal(links[0]?.["user_id"], ALICE_ID);
    assert.equal((links[0]?.["linked_at"] as Date).toISOString(), "2026-10-25T08:00:00.000Z");
  } finally {
    await db.close();
  }
});

test("C-d87c60d4 Display name fallbacks", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const u1 = await signIn(db, a, { issuer: ISS, subject: "sub-1", name: "  Bo  ", preferredUsername: "bo" }, T08, ids);
    const u2 = await signIn(db, a, { issuer: ISS, subject: "sub-2", preferredUsername: "cy" }, T08, ids);
    const u3 = await signIn(db, a, { issuer: ISS, subject: "sub-3", email: "di@example.test" }, T08, ids);
    const u4 = await signIn(db, a, { issuer: ISS, subject: "sub-4" }, T08, ids);
    const u5 = await signIn(db, a, { issuer: ISS, subject: "sub-5", name: "x".repeat(300) }, T08, ids);
    assert.equal(u1.displayName, "Bo");
    assert.equal(u2.displayName, "cy");
    assert.equal(u3.displayName, "di@example.test");
    assert.equal(u4.displayName, "sub-4");
    assert.equal(u5.displayName, "x".repeat(200));
  } finally {
    await db.close();
  }
});

test("C-13b4a891 Display name cut to 200 code points", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const x199 = "x".repeat(199);
    const u6 = await signIn(db, a, { issuer: ISS, subject: "sub-6", name: `${x199} tail` }, T08, ids);
    const u7 = await signIn(db, a, { issuer: ISS, subject: "sub-7", name: `${x199}\u{1F600}z` }, T08, ids);
    const u8 = await signIn(db, a, { issuer: ISS, subject: `${"s".repeat(199)} ${"t".repeat(50)}` }, T08, ids);
    assert.equal(u6.displayName, x199);
    assert.equal(u7.displayName, `${x199}\u{1F600}`);
    assert.equal(Array.from(u7.displayName).length, 200);
    assert.equal(u8.displayName, "s".repeat(199));

    const again = await signIn(db, a, { issuer: ISS, subject: "sub-6", name: `${x199} tail` }, T09, ids);
    assert.equal(again.userId, u6.userId);
    const stored = await ownerRows(db, a, 'SELECT display_name, updated_at FROM ursitoare."user" WHERE user_id = $1', [u6.userId]);
    assert.equal(stored[0]?.["display_name"], x199);
    assert.equal((stored[0]?.["updated_at"] as Date).toISOString(), "2026-10-25T08:00:00.000Z");

    const y199 = "y".repeat(199);
    const changed = await signIn(db, a, { issuer: ISS, subject: "sub-6", name: `${y199} tail` }, T10, ids);
    assert.equal(changed.userId, u6.userId);
    assert.equal(changed.displayName, y199);
    const stored2 = await ownerRows(db, a, 'SELECT updated_at FROM ursitoare."user" WHERE user_id = $1', [u6.userId]);
    assert.equal((stored2[0]?.["updated_at"] as Date).toISOString(), "2026-10-25T10:00:00.000Z");
  } finally {
    await db.close();
  }
});

test("C-6c525799 Same subject in two tenants, same email under a new subject", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const ua = await signIn(db, a, alice, T08, ids);
    const ub = await signIn(db, b, alice, T08, ids);
    assert.notEqual(ua.userId, ub.userId);
    const eve = await signIn(db, a, { issuer: ISS, subject: "sub-eve", email: "alice@example.test" }, T08, ids);
    assert.notEqual(eve.userId, ua.userId);
    const listA = await withTenantTx(db.appPool, a, (tx) => listUsers(tx, a));
    const listB = await withTenantTx(db.appPool, b, (tx) => listUsers(tx, b));
    assert.deepEqual(listA.users.map((u) => u.userId).sort(), [ua.userId, eve.userId].sort());
    assert.deepEqual(listB.users.map((u) => u.userId), [ub.userId]);
    assert.equal(listA.users.filter((u) => u.email === "alice@example.test").length, 2);
  } finally {
    await db.close();
  }
});

test("C-cb7ab02a Concurrent first sign-ins", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const ids = sequentialIds();
    let results: User[] = [];
    await assert.doesNotReject(async () => {
      results = await Promise.all(
        Array.from({ length: 8 }, () =>
          withTenantTx(db.appPool, a, (tx) =>
            upsertUserFromClaims(tx, a, { issuer: ISS, subject: "sub-race" }, { ids, clock: fixedClock(T08) }),
          ),
        ),
      );
    });
    assert.equal(results.length, 8);
    assert.equal(new Set(results.map((u) => u.userId)).size, 1);
    assert.equal((await ownerRows(db, a, 'SELECT 1 FROM ursitoare."user"')).length, 1);
    assert.equal((await ownerRows(db, a, "SELECT 1 FROM ursitoare.idp_link")).length, 1);
  } finally {
    await db.close();
  }
});

test("C-a8fc2be1 Bad claims", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const bad: unknown[] = [
      { issuer: "", subject: "s" },
      { issuer: ISS, subject: "" },
      { issuer: ISS, subject: " s" },
      { issuer: ISS, subject: "s".repeat(513) },
      { issuer: ISS, subject: "s", name: 5 },
      { issuer: ISS, subject: "s", email: "e".repeat(321) },
      { issuer: ISS, subject: "s", email: "a\u0000b" },
      { issuer: ISS, subject: "s", preferredUsername: "\ud800" },
    ];
    let usable: unknown;
    await withTenantTx(db.appPool, a, async (tx) => {
      for (const claims of bad) {
        await assert.rejects(
          upsertUserFromClaims(tx, a, claims as TokenClaims, { ids: sequentialIds(), clock: fixedClock(T08) }),
          { name: "IdentityError", code: "IDENTITY_INVALID" },
        );
      }
      usable = (await tx.query("SELECT 1 AS one")).rows[0];
    });
    assert.deepEqual(usable, { one: 1 });
    assert.equal((await ownerRows(db, a, 'SELECT 1 FROM ursitoare."user"')).length, 0);
    assert.equal((await ownerRows(db, a, "SELECT 1 FROM ursitoare.idp_link")).length, 0);
  } finally {
    await db.close();
  }
});

test("C-85a51e03 Unchanged", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const first = await signIn(db, a, alice, T08);
    assert.equal(first.userId, ALICE_ID);
    const second = await signIn(db, a, alice, T09);
    assert.deepEqual(second, first);
    const rows = await ownerRows(db, a, 'SELECT updated_at FROM ursitoare."user"');
    assert.equal(rows.length, 1);
    assert.equal((rows[0]?.["updated_at"] as Date).toISOString(), "2026-10-25T08:00:00.000Z");
    assert.equal((await ownerRows(db, a, "SELECT 1 FROM ursitoare.idp_link")).length, 1);
  } finally {
    await db.close();
  }
});

test("C-e07fdb38 Changed name and email", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await signIn(db, a, alice, T08);
    const updatedAt = async (): Promise<string> => {
      const rows = await ownerRows(db, a, 'SELECT created_at, updated_at FROM ursitoare."user"');
      assert.equal((rows[0]?.["created_at"] as Date).toISOString(), "2026-10-25T08:00:00.000Z");
      return (rows[0]?.["updated_at"] as Date).toISOString();
    };
    const base = { issuer: ISS, subject: "sub-alice" };
    const r1 = await signIn(db, a, { ...base, name: "Alice B", email: "alice.b@example.test" }, T09);
    assert.equal(r1.displayName, "Alice B");
    assert.equal(r1.email, "alice.b@example.test");
    assert.equal(r1.userId, ALICE_ID);
    assert.equal(await updatedAt(), "2026-10-25T09:00:00.000Z");
    const r2 = await signIn(db, a, { ...base, name: "Alice B" }, T10);
    assert.equal(r2.userId, ALICE_ID);
    assert.equal(await updatedAt(), "2026-10-25T09:00:00.000Z");
    const r3 = await signIn(db, a, base, T11);
    assert.equal(r3.displayName, "Alice B");
    assert.equal(r3.email, "alice.b@example.test");
    assert.equal(await updatedAt(), "2026-10-25T09:00:00.000Z");
  } finally {
    await db.close();
  }
});

test("C-26f5ccf3 Disabled user, and a link to a service account", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const first = await signIn(db, a, alice, T08);
    assert.equal(first.userId, ALICE_ID);
    await ownerRows(db, a, "UPDATE ursitoare.\"user\" SET state = 'disabled' WHERE user_id = $1", [ALICE_ID]);
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        upsertUserFromClaims(tx, a, { ...alice, name: "Changed" }, { clock: fixedClock(T09) }),
      ),
      { name: "IdentityError", code: "IDENTITY_USER_DISABLED", message: "user cannot sign in" },
    );
    const stored = await ownerRows(db, a, 'SELECT display_name FROM ursitoare."user" WHERE user_id = $1', [ALICE_ID]);
    assert.equal(stored[0]?.["display_name"], "Alice A");

    await ownerRows(db, a, "UPDATE ursitoare.\"user\" SET state = 'active' WHERE user_id = $1", [ALICE_ID]);
    await ownerRows(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ('tenant_a', 'svc_robot', 'service', $1, 'Robot', 'active')`,
      [ALICE_ID],
    );
    await ownerRows(
      db,
      a,
      "INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id) VALUES ('tenant_a', $1, 'sub-robot', 'svc_robot')",
      [ISS],
    );
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        upsertUserFromClaims(tx, a, { issuer: ISS, subject: "sub-robot" }, { clock: fixedClock(T09) }),
      ),
      { name: "IdentityError", code: "IDENTITY_USER_DISABLED", message: "user cannot sign in" },
    );
    assert.equal((await ownerRows(db, a, 'SELECT 1 FROM ursitoare."user"')).length, 2);
    assert.equal((await ownerRows(db, a, "SELECT 1 FROM ursitoare.idp_link")).length, 2);
  } finally {
    await db.close();
  }
});

test("C-dcd3307a Wrong tenant transaction refused by upsertUserFromClaims", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) => upsertUserFromClaims(tx, a, alice, { clock: fixedClock(T08) })),
      {
        name: "IdentityError",
        code: "IDENTITY_TENANT_MISMATCH",
        message: "transaction tenant does not match the tenant context",
      },
    );
    assert.equal((await ownerRows(db, a, 'SELECT 1 FROM ursitoare."user"')).length, 0);
    assert.equal((await ownerRows(db, b, 'SELECT 1 FROM ursitoare."user"')).length, 0);
    assert.equal((await ownerRows(db, a, "SELECT 1 FROM ursitoare.idp_link")).length, 0);
    assert.equal((await ownerRows(db, b, "SELECT 1 FROM ursitoare.idp_link")).length, 0);
    // a matching tenant must work, so the refusal above is not a blanket failure
    const ok = await signIn(db, a, alice, T08);
    assert.equal(ok.userId, ALICE_ID);
  } finally {
    await db.close();
  }
});
