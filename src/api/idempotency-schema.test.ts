import assert from "node:assert/strict";
import { test } from "node:test";

import { checkTenancyCatalog, withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";

function exec(
  db: TestDatabase,
  ctx: TenantContext,
  pool: "ownerPool" | "appPool",
  text: string,
  values: unknown[] = [],
): Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }> {
  return withTenantTx(db[pool], ctx, async (tx) => {
    const result = await tx.query(text, values);
    return { rowCount: result.rowCount, rows: result.rows as Record<string, unknown>[] };
  });
}

function appExec(
  db: TestDatabase,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }> {
  return exec(db, ctx, "appPool", text, values);
}

async function assertIdempotencyObjects(db: TestDatabase): Promise<void> {
  const { rows } = await db.ownerPool.query<{ exists: boolean; version: number | null; name: string | null }>(
    `SELECT to_regclass('ursitoare.idempotency_key') IS NOT NULL AS exists,
            (SELECT version FROM ursitoare.schema_migration WHERE version = 140) AS version,
            (SELECT name FROM ursitoare.schema_migration WHERE version = 140) AS name`,
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  assert.ok(row.exists, "ursitoare.idempotency_key exists");
  assert.equal(row.version, 140, "the ledger holds version 140");
  assert.equal(row.name, "idempotency", "version 140 is named idempotency");
}

const CREATED_AT = "2026-10-25T09:00:00.000Z";

const INSERT_KEY =
  "INSERT INTO ursitoare.idempotency_key (tenant_id, principal_id, key, request_digest, state, response_status, response_body, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";

function keyValues(overrides: Record<string, unknown>): unknown[] {
  return [
    overrides.tenantId,
    overrides.principalId ?? "u_1",
    overrides.key,
    overrides.digest ?? "a".repeat(64),
    overrides.state ?? "in_progress",
    overrides.responseStatus ?? null,
    overrides.responseBody ?? null,
    overrides.createdAt ?? CREATED_AT,
  ];
}

async function assertRowShape(db: TestDatabase): Promise<void> {
  const { rows } = await db.ownerPool.query<{ rls: boolean; forced: boolean }>(
    "SELECT relrowsecurity AS rls, relforcerowsecurity AS forced FROM pg_class WHERE oid = to_regclass('ursitoare.idempotency_key')",
  );
  assert.equal(rows[0]?.rls, true, "the table has row security");
  assert.equal(rows[0]?.forced, true, "the table forces row security");
}

async function assertColumnOrder(db: TestDatabase): Promise<void> {
  const { rows } = await db.ownerPool.query<{ column_name: string }>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'ursitoare' AND table_name = 'idempotency_key' ORDER BY ordinal_position",
  );
  assert.deepEqual(
    rows.map((row) => row.column_name),
    ["tenant_id", "principal_id", "key", "request_digest", "state", "response_status", "response_body", "created_at"],
  );
}

test("C-7dead04d Shape of the idempotency key table", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdempotencyObjects(db);
    await assertRowShape(db);
    await assertColumnOrder(db);
    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});

test("C-0740c1df Tenant B cannot see or change the keys of tenant A", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdempotencyObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await appExec(db, a, INSERT_KEY, keyValues({ tenantId: a.tenantId, key: "k-a" }));
    const counted = await appExec(db, b, "SELECT count(*)::int AS n FROM ursitoare.idempotency_key");
    const countRow = counted.rows[0];
    assert.ok(countRow !== undefined);
    assert.equal(countRow.n, 0, "tenant B counts no rows");
    await assert.rejects(
      appExec(db, b, INSERT_KEY, keyValues({ tenantId: a.tenantId, key: "k-b" })),
      { code: "42501" },
    );
    const updated = await appExec(
      db,
      b,
      "UPDATE ursitoare.idempotency_key SET response_status = 200 WHERE tenant_id = $1 AND principal_id = $2 AND key = $3",
      [a.tenantId, "u_1", "k-a"],
    );
    assert.equal(updated.rowCount, 0);
    const deleted = await appExec(
      db,
      b,
      "DELETE FROM ursitoare.idempotency_key WHERE tenant_id = $1 AND principal_id = $2 AND key = $3",
      [a.tenantId, "u_1", "k-a"],
    );
    assert.equal(deleted.rowCount, 0);
  } finally {
    await db.close();
  }
});

test("C-6c605e1b Each bad row fails with 23514", async () => {
  const db = await withTestDatabase();
  try {
    await assertIdempotencyObjects(db);
    const { a } = await seedTwoTenants(db);
    const cases: { name: string; values: unknown[] }[] = [
      {
        name: "a space in the key",
        values: keyValues({ tenantId: a.tenantId, key: "has space" }),
      },
      {
        name: "a short digest",
        values: keyValues({ tenantId: a.tenantId, key: "k-1", digest: "xyz" }),
      },
      {
        name: "done without a response status",
        values: keyValues({ tenantId: a.tenantId, key: "k-2", state: "done", responseStatus: null, responseBody: null }),
      },
      {
        name: "in progress with a response status",
        values: keyValues({ tenantId: a.tenantId, key: "k-3", state: "in_progress", responseStatus: 201, responseBody: "{}" }),
      },
    ];
    for (const c of cases) {
      await assert.rejects(appExec(db, a, INSERT_KEY, c.values), { code: "23514" }, c.name);
    }
  } finally {
    await db.close();
  }
});
