import assert from "node:assert/strict";
import { test } from "node:test";

import { checkTenancyCatalog, withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";

const ISS = "https://idp.example/realms/ursitoare";

async function assertIdentityObjects(db: TestDatabase): Promise<void> {
  const { rows } = await db.ownerPool.query<{
    user_table: boolean;
    link: boolean;
    idp: boolean;
    version: number | null;
    name: string | null;
  }>(
    `SELECT to_regclass('ursitoare."user"') IS NOT NULL AS user_table,
            to_regclass('ursitoare.idp_link') IS NOT NULL AS link,
            to_regclass('ursitoare.tenant_idp') IS NOT NULL AS idp,
            (SELECT version FROM ursitoare.schema_migration WHERE version = 100) AS version,
            (SELECT name FROM ursitoare.schema_migration WHERE version = 100) AS name`,
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  assert.ok(row.user_table, "ursitoare.user exists");
  assert.ok(row.link, "ursitoare.idp_link exists");
  assert.ok(row.idp, "ursitoare.tenant_idp exists");
  assert.equal(row.version, 100, "the ledger holds version 100");
  assert.equal(row.name, "identity", "version 100 is named identity");
}

async function ownerExec(
  db: TestDatabase,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query(text, values);
    return { rowCount: result.rowCount, rows: result.rows as Record<string, unknown>[] };
  });
}

async function appExec(
  db: TestDatabase,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query(text, values);
    return { rowCount: result.rowCount, rows: result.rows as Record<string, unknown>[] };
  });
}

const INSERT_USER =
  'INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state) VALUES ($1, $2, $3, $4, $5, $6)';

async function seedIdentity(
  db: TestDatabase,
  a: TenantContext,
  b: TenantContext,
): Promise<void> {
  for (const [ctx, org] of [
    [a, "org-a"],
    [b, "org-b"],
  ] as const) {
    await ownerExec(db, ctx, INSERT_USER, [ctx.tenantId, "u1", "human", null, "User One", "active"]);
    await ownerExec(
      db,
      ctx,
      "INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id) VALUES ($1, $2, 'sub-1', 'u1')",
      [ctx.tenantId, ISS],
    );
    await ownerExec(
      db,
      ctx,
      "INSERT INTO ursitoare.tenant_idp (tenant_id, issuer, organization) VALUES ($1, $2, $3)",
      [ctx.tenantId, ISS, org],
    );
  }
}

const TABLES = ['ursitoare."user"', "ursitoare.idp_link", "ursitoare.tenant_idp"];

test("C-30864f4c Objects, ledger and catalog", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdentityObjects(db);
    for (const table of TABLES) {
      const { rows } = await db.ownerPool.query<{ rls: boolean; forced: boolean }>(
        "SELECT relrowsecurity AS rls, relforcerowsecurity AS forced FROM pg_class WHERE oid = to_regclass($1)",
        [table],
      );
      assert.equal(rows[0]?.rls, true, `${table} has row security`);
      assert.equal(rows[0]?.forced, true, `${table} forces row security`);
    }
    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});

test("C-69e05eb7 Tenant A sees only its rows", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdentityObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await seedIdentity(db, a, b);
    for (const table of TABLES) {
      const inTenant = await appExec(db, a, `SELECT tenant_id FROM ${table}`);
      assert.deepEqual(inTenant.rows, [{ tenant_id: "tenant_a" }], table);
      const outside = await db.appPool.query(`SELECT * FROM ${table}`);
      assert.equal(outside.rowCount, 0, table);
    }
  } finally {
    await db.close();
  }
});

test("C-465620b5 Another tenant's rows cannot be written", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdentityObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await seedIdentity(db, a, b);
    await assert.rejects(appExec(db, a, INSERT_USER, ["tenant_b", "u9", "human", null, "X", "active"]), {
      code: "42501",
    });
    await assert.rejects(
      appExec(
        db,
        a,
        "INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id) VALUES ('tenant_b', $1, 'sub-9', 'u1')",
        [ISS],
      ),
      { code: "42501" },
    );
    const update = await appExec(
      db,
      a,
      "UPDATE ursitoare.\"user\" SET display_name = 'Hacked' WHERE tenant_id = 'tenant_b' AND user_id = 'u1'",
    );
    assert.equal(update.rowCount, 0);
    const seen = await ownerExec(db, b, 'SELECT user_id, display_name FROM ursitoare."user"');
    assert.deepEqual(seen.rows, [{ user_id: "u1", display_name: "User One" }]);
    const links = await ownerExec(db, b, "SELECT subject FROM ursitoare.idp_link");
    assert.deepEqual(links.rows, [{ subject: "sub-1" }]);
  } finally {
    await db.close();
  }
});

test("C-0965869a Privileges are narrow", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdentityObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await seedIdentity(db, a, b);
    const denied = [
      "UPDATE ursitoare.\"user\" SET kind = 'service'",
      'DELETE FROM ursitoare."user"',
      "UPDATE ursitoare.idp_link SET user_id = 'x'",
      "DELETE FROM ursitoare.idp_link",
      "INSERT INTO ursitoare.tenant_idp (tenant_id, issuer, organization) VALUES ('tenant_a', 'https://x', 'o')",
    ];
    for (const statement of denied) {
      await assert.rejects(appExec(db, a, statement), { code: "42501" }, statement);
    }
    const ok = await appExec(
      db,
      a,
      "UPDATE ursitoare.\"user\" SET display_name = 'Z' WHERE user_id = 'u1'",
    );
    assert.equal(ok.rowCount, 1);
  } finally {
    await db.close();
  }
});

test("C-4b056702 Each bad row fails with its code", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdentityObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await ownerExec(db, a, INSERT_USER, ["tenant_a", "u1", "human", null, "User One", "active"]);
    await ownerExec(db, b, INSERT_USER, ["tenant_b", "u2", "human", null, "User Two", "active"]);
    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id) VALUES ('tenant_a', $1, 'sub-1', 'u1')",
      [ISS],
    );
    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.tenant_idp (tenant_id, issuer, organization) VALUES ('tenant_a', $1, 'org-a')",
      [ISS],
    );
    const nobody: TenantContext = { tenantId: "nobody", reviewProfile: "solo" };
    const cases: { name: string; ctx: TenantContext; sql: string; values: unknown[]; code: string }[] = [
      { name: "human with owner", ctx: a, sql: INSERT_USER, values: ["tenant_a", "h2", "human", "u1", "H", "active"], code: "23514" },
      { name: "service without owner", ctx: a, sql: INSERT_USER, values: ["tenant_a", "s1", "service", null, "S", "active"], code: "23514" },
      { name: "service owned by itself", ctx: a, sql: INSERT_USER, values: ["tenant_a", "s2", "service", "s2", "S", "active"], code: "23514" },
      { name: "kind admin", ctx: a, sql: INSERT_USER, values: ["tenant_a", "h3", "admin", null, "H", "active"], code: "23514" },
      { name: "state gone", ctx: a, sql: INSERT_USER, values: ["tenant_a", "h4", "human", null, "H", "gone"], code: "23514" },
      { name: "empty name", ctx: a, sql: INSERT_USER, values: ["tenant_a", "h5", "human", null, "", "active"], code: "23514" },
      { name: "padded name", ctx: a, sql: INSERT_USER, values: ["tenant_a", "h6", "human", null, " x", "active"], code: "23514" },
      { name: "owner in another tenant", ctx: a, sql: INSERT_USER, values: ["tenant_a", "s3", "service", "u2", "S", "active"], code: "23503" },
      { name: "second u1", ctx: a, sql: INSERT_USER, values: ["tenant_a", "u1", "human", null, "Again", "active"], code: "23505" },
      {
        name: "link to ghost",
        ctx: a,
        sql: "INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id) VALUES ('tenant_a', $1, 'sub-9', 'ghost')",
        values: [ISS],
        code: "23503",
      },
      {
        name: "repeated link",
        ctx: a,
        sql: "INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id) VALUES ('tenant_a', $1, 'sub-1', 'u1')",
        values: [ISS],
        code: "23505",
      },
      {
        name: "repeated tenant_idp",
        ctx: a,
        sql: "INSERT INTO ursitoare.tenant_idp (tenant_id, issuer, organization) VALUES ('tenant_a', $1, 'org-a')",
        values: [ISS],
        code: "23505",
      },
      {
        name: "line feed in issuer",
        ctx: a,
        sql: "INSERT INTO ursitoare.tenant_idp (tenant_id, issuer, organization) VALUES ('tenant_a', $1, 'org-x')",
        values: ["a\nb"],
        code: "23514",
      },
      { name: "missing tenant", ctx: nobody, sql: INSERT_USER, values: ["nobody", "h7", "human", null, "H", "active"], code: "23503" },
    ];
    for (const c of cases) {
      await assert.rejects(ownerExec(db, c.ctx, c.sql, c.values), { code: c.code }, c.name);
    }
  } finally {
    await db.close();
  }
});
