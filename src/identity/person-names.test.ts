import assert from "node:assert/strict";
import { test } from "node:test";

import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import * as identity from "./index.ts";
import { getPersonNames } from "./users.ts";
import type { PersonName } from "./users.ts";

const MISMATCH = {
  name: "IdentityError",
  code: "IDENTITY_TENANT_MISMATCH",
  message: "transaction tenant does not match the tenant context",
};

const INVALID = { name: "IdentityError", code: "IDENTITY_INVALID" };

interface SeedRow {
  userId: string;
  displayName: string;
  kind: "human" | "service";
  ownerUserId?: string;
  state?: "active" | "disabled";
  email?: string;
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

interface RecordedQuery {
  text: string;
  values: readonly unknown[] | undefined;
}

type QueryResult = { rows: unknown[] };

function recordingTx(
  handler: (text: string, values: readonly unknown[] | undefined) => QueryResult | Promise<QueryResult>,
): { tx: TenantTx; queries: RecordedQuery[] } {
  const queries: RecordedQuery[] = [];
  const query = async (
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult> => {
    queries.push({ text, values });
    return handler(text, values);
  };
  return { tx: { query } as unknown as TenantTx, queries };
}

function tenantARecorder(): { tx: TenantTx; queries: RecordedQuery[] } {
  return recordingTx((text) => {
    if (text.includes("current_setting('app.tenant_id'")) return { rows: [{ t: "tenant_a" }] };
    return { rows: [] };
  });
}

test("C-748ce889 names come back in first-appearance order once with unknown ids left out", async () => {
  assert.equal(
    typeof (identity as unknown as Record<string, unknown>).getPersonNames,
    "function",
    "getPersonNames is exported from src/identity/index.ts",
  );
  assert.equal(typeof getPersonNames, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedPeople(db);
    let first: PersonName[] | undefined;
    let second: PersonName[] | undefined;
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        first = await getPersonNames(tx, a, [
          "svc_ci",
          "u_dan",
          "nobody",
          "u_carol",
          "svc_ci",
          "u_erin",
          "twin",
        ]);
      });
      await assert.doesNotReject(async () => {
        second = await getPersonNames(tx, a, ["twin", "u_carol"]);
      });
    });
    assert.deepEqual(first, [
      { userId: "svc_ci", displayName: "CI bot", kind: "service" },
      { userId: "u_dan", displayName: "Dan Disabled", kind: "human" },
      { userId: "u_carol", displayName: "Carol Example", kind: "human" },
      { userId: "twin", displayName: "Alice Twin", kind: "human" },
    ]);
    assert.deepEqual(second, [
      { userId: "twin", displayName: "Alice Twin", kind: "human" },
      { userId: "u_carol", displayName: "Carol Example", kind: "human" },
    ]);
    for (const item of first ?? []) {
      assert.deepEqual(Object.keys(item).sort(), ["displayName", "kind", "userId"]);
    }
    const rendered = JSON.stringify(first);
    assert.ok(!rendered.includes("carol@example.test"), "no email is returned");
    assert.ok(!rendered.includes("dan@example.test"), "no email is returned");
  } finally {
    await db.close();
  }
});

test("C-55e76eb6 another tenant's users are never named", async () => {
  assert.equal(typeof getPersonNames, "function");
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedPeople(db);
    let fromB: PersonName[] | undefined;
    await withTenantTx(db.appPool, b, async (tx) => {
      await assert.doesNotReject(async () => {
        fromB = await getPersonNames(tx, b, ["u_carol", "u_dan", "svc_ci", "twin", "u_erin"]);
      });
      await assert.rejects(getPersonNames(tx, a, ["twin"]), MISMATCH);
    });
    assert.deepEqual(fromB, [
      { userId: "twin", displayName: "Mallory Twin", kind: "human" },
      { userId: "u_erin", displayName: "Erin Other", kind: "human" },
    ]);
    const hidden = await withTenantTx(db.appPool, b, (tx) =>
      tx.query<{ user_id: string }>(
        'SELECT user_id FROM ursitoare."user" WHERE user_id = ANY($1::text[])',
        [["u_carol", "u_dan"]],
      ),
    );
    assert.equal(hidden.rows.length, 0, "row-level security hides tenant A's users from tenant B");
  } finally {
    await db.close();
  }
});

test("C-db4fc15e bad input is refused before any query and a failing database is not hidden", async () => {
  assert.equal(typeof getPersonNames, "function");
  const a: TenantContext = { tenantId: "tenant_a", reviewProfile: "team" };
  const { tx, queries } = tenantARecorder();

  const tooMany = Array.from({ length: 51 }, (_, index) => `n${index}`);
  const invalidLists: readonly (readonly string[])[] = [
    tooMany,
    ["a b"],
    [""],
    ["x".repeat(65)],
    ["ok", "a,b"],
    ["é"],
    ["u_carol\n"],
    ["a'b"],
    [7] as unknown as readonly string[],
  ];
  for (const list of invalidLists) {
    await assert.rejects(getPersonNames(tx, a, list), INVALID);
  }
  assert.equal(queries.length, 0, "refused lists make no query");

  let empty: PersonName[] | undefined;
  await assert.doesNotReject(async () => {
    empty = await getPersonNames(tx, a, []);
  });
  assert.deepEqual(empty, []);
  assert.equal(queries.length, 0, "an empty list makes no query");

  const fifty = Array.from({ length: 50 }, (_, index) => `n${index}`);
  let missing: PersonName[] | undefined;
  await assert.doesNotReject(async () => {
    missing = await getPersonNames(tx, a, fifty);
  });
  assert.deepEqual(missing, []);
  assert.equal(queries.length, 2, "a 50-id list makes a tenant check and one SELECT");

  const failing = recordingTx(() => {
    throw new Error("db down");
  });
  await assert.rejects(getPersonNames(failing.tx, a, ["u_carol"]), { message: "db down" });
});
