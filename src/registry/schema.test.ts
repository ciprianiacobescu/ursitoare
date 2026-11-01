import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_APP } from "../db/index.ts";
import {
  checkTenancyCatalog,
  withTenantTx,
  type TenantContext,
  type TenantPool,
} from "../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const ZERO_HASH: string = "sha256:" + "0".repeat(64);

const VALID: Record<string, unknown> = {
  tenant_id: "tenant_a",
  ref: "invoices.get@1",
  effect: "read",
  description: "Fetch an invoice.",
  input: JSON.stringify({
    type: "object",
    properties: { invoice_id: { type: "string" } },
    required: ["invoice_id"],
  }),
  output: JSON.stringify({
    type: "object",
    properties: { raw_text: { type: "string" }, vendor_name: { type: "string" } },
  }),
  untrusted_fields: ["raw_text", "vendor_name"],
  data_class: "private",
  untrusted_result: false,
  unsafe_to_retry: false,
  binding: null,
  content_hash: ZERO_HASH,
  imported_by: "operator:t",
  imported_at: "2026-10-31T09:00:00Z",
};

function placeholders(columns: string[]): string[] {
  return columns.map((column, index) => {
    const position = `$${index + 1}`;
    if (column === "input" || column === "output" || column === "binding") {
      return `${position}::jsonb`;
    }
    if (column === "untrusted_fields") {
      return `${position}::text[]`;
    }
    return position;
  });
}

async function insertVersion(
  pool: TenantPool,
  ctx: TenantContext,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const row = { ...VALID, ...overrides };
  const columns = Object.keys(row);
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.block_version (${columns.join(", ")}) VALUES (${placeholders(columns).join(", ")})`,
      columns.map((column) => row[column]),
    );
  });
}

async function assertMigrated(db: TestDatabase): Promise<void> {
  const ledger = await db.ownerPool.query<{ version: number; name: string }>(
    "SELECT version, name FROM ursitoare.schema_migration WHERE version = 260",
  );
  const entry = ledger.rows[0];
  assert.ok(entry !== undefined, "the ledger holds version 260");
  assert.equal(entry.version, 260);
  assert.equal(entry.name, "block_registry");

  const table = await db.ownerPool.query<{ found: string | null }>(
    "SELECT to_regclass('ursitoare.block_version')::text AS found",
  );
  assert.ok(table.rows[0]?.found, "ursitoare.block_version exists");
}

test("C-ab2d00df migration 0260 stores immutable block versions per tenant", async () => {
  const db = await withTestDatabase();
  try {
    await assertMigrated(db);

    const violations = await checkTenancyCatalog(db.ownerPool);
    assert.deepEqual(violations, []);

    const privileges = await db.ownerPool.query<{
      select: boolean;
      insert: boolean;
      update: boolean;
      delete: boolean;
    }>(
      `SELECT has_table_privilege($1, 'ursitoare.block_version', 'SELECT') AS select,
              has_table_privilege($1, 'ursitoare.block_version', 'INSERT') AS insert,
              has_table_privilege($1, 'ursitoare.block_version', 'UPDATE') AS update,
              has_table_privilege($1, 'ursitoare.block_version', 'DELETE') AS "delete"`,
      [ROLE_APP],
    );
    assert.equal(privileges.rows[0]?.select, true);
    assert.equal(privileges.rows[0]?.insert, true);
    assert.equal(privileges.rows[0]?.update, false);
    assert.equal(privileges.rows[0]?.delete, false);

    const { a, b } = await seedTwoTenants(db);

    await insertVersion(db.appPool, a);

    const selected = await withTenantTx(db.appPool, a, (tx) =>
      tx.query<{ ref: string }>("SELECT ref FROM ursitoare.block_version"),
    );
    assert.equal(selected.rowCount, 1);
    assert.equal(selected.rows[0]?.ref, "invoices.get@1");

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        tx.query("UPDATE ursitoare.block_version SET effect = 'write' WHERE ref = 'invoices.get@1'"),
      ),
      { code: "42501" },
    );
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => tx.query("DELETE FROM ursitoare.block_version")),
      { code: "42501" },
    );
    await assert.rejects(
      insertVersion(db.appPool, a, { tenant_id: "tenant_b" }),
      { code: "42501" },
    );

    await assert.rejects(
      insertVersion(db.ownerPool, a, { effect: "delete" }),
      { code: "23514" },
    );
    await assert.rejects(insertVersion(db.ownerPool, a, { ref: "Bad@1" }), { code: "23514" });
    await assert.rejects(insertVersion(db.ownerPool, a, { ref: "a@01" }), { code: "23514" });
    await assert.rejects(insertVersion(db.ownerPool, a, { content_hash: "abc" }), {
      code: "23514",
    });
    await assert.rejects(insertVersion(db.ownerPool, a, { data_class: "secret" }), {
      code: "23514",
    });
    await assert.rejects(insertVersion(db.ownerPool, a, { input: JSON.stringify([]) }), {
      code: "23514",
    });
    await assert.rejects(insertVersion(db.ownerPool, a), { code: "23505" });

    const seenByB = await withTenantTx(db.appPool, b, (tx) =>
      tx.query("SELECT ref FROM ursitoare.block_version"),
    );
    assert.equal(seenByB.rowCount, 0);

    await insertVersion(db.appPool, b, { tenant_id: "tenant_b" });
    const ownB = await withTenantTx(db.appPool, b, (tx) =>
      tx.query<{ ref: string }>("SELECT ref FROM ursitoare.block_version"),
    );
    assert.equal(ownB.rowCount, 1);
    assert.equal(ownB.rows[0]?.ref, "invoices.get@1");

    const stillOne = await withTenantTx(db.appPool, a, (tx) =>
      tx.query("SELECT ref FROM ursitoare.block_version"),
    );
    assert.equal(stillOne.rowCount, 1);
  } finally {
    await db.close();
  }
});
