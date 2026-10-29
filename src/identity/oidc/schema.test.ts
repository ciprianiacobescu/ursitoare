import assert from "node:assert/strict";
import { test } from "node:test";

import { checkTenancyCatalog, withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";

async function assertSessionObjects(db: TestDatabase): Promise<void> {
  const { rows } = await db.ownerPool.query<{
    session_table: boolean;
    version: number | null;
    name: string | null;
  }>(
    `SELECT to_regclass('ursitoare.session') IS NOT NULL AS session_table,
            (SELECT version FROM ursitoare.schema_migration WHERE version = 120) AS version,
            (SELECT name FROM ursitoare.schema_migration WHERE version = 120) AS name`,
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  assert.ok(row.session_table, "ursitoare.session exists");
  assert.equal(row.version, 120, "the ledger holds version 120");
  assert.equal(row.name, "sessions", "version 120 is named sessions");
}

interface ExecResult {
  rowCount: number | null;
  rows: Record<string, unknown>[];
}

async function ownerExec(
  db: TestDatabase,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<ExecResult> {
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
): Promise<ExecResult> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query(text, values);
    return { rowCount: result.rowCount, rows: result.rows as Record<string, unknown>[] };
  });
}

const INSERT_USER =
  'INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state) VALUES ($1, $2, $3, $4, $5, $6)';

const INSERT_SESSION = `INSERT INTO ursitoare.session
  (tenant_id, session_id_hash, user_id, created_at, last_seen_at, expires_at, idle_timeout_s, csrf_token_hash)
  VALUES ($1, $2, $3, now(), now(), now() + interval '12 hours', 1800, $4)`;

async function seedSessionRows(
  db: TestDatabase,
  a: TenantContext,
  b: TenantContext,
): Promise<void> {
  const rows = [
    { ctx: a, hash: Buffer.alloc(32, 1), csrf: Buffer.alloc(32, 11) },
    { ctx: b, hash: Buffer.alloc(32, 2), csrf: Buffer.alloc(32, 12) },
  ];
  for (const { ctx, hash, csrf } of rows) {
    await ownerExec(db, ctx, INSERT_USER, [ctx.tenantId, "u1", "human", null, "User One", "active"]);
    await ownerExec(db, ctx, INSERT_SESSION, [ctx.tenantId, hash, "u1", csrf]);
  }
}

test("C-8fe6b6fa Session table ledger and catalog", async () => {
  const db = await withTestDatabase();
  try {
    await assertSessionObjects(db);
    await seedTwoTenants(db);
    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});

test("C-8fe6b6fa Session destructive writes are refused", async () => {
  const db = await withTestDatabase();
  try {
    await assertSessionObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await seedSessionRows(db, a, b);

    await assert.rejects(
      appExec(db, a, "UPDATE ursitoare.session SET user_id = 'u2'"),
      { code: "42501" },
      "reassigning a session's user is refused",
    );
    await assert.rejects(
      appExec(db, a, "DELETE FROM ursitoare.session"),
      { code: "42501" },
      "deleting sessions is refused",
    );
    await assert.rejects(
      appExec(db, a, INSERT_SESSION, ["tenant_b", Buffer.alloc(32, 9), "u1", Buffer.alloc(32, 13)]),
      { code: "42501" },
      "inserting for another tenant is refused",
    );
  } finally {
    await db.close();
  }
});

test("C-8fe6b6fa Session select sees only the current tenant", async () => {
  const db = await withTestDatabase();
  try {
    await assertSessionObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await seedSessionRows(db, a, b);

    const inTenant = await appExec(db, a, "SELECT tenant_id FROM ursitoare.session");
    assert.deepEqual(inTenant.rows, [{ tenant_id: "tenant_a" }]);

    const outside = await db.appPool.query("SELECT * FROM ursitoare.session");
    assert.equal(outside.rowCount, 0);
  } finally {
    await db.close();
  }
});
