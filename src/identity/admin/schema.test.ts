import assert from "node:assert/strict";
import { test } from "node:test";

import { checkTenancyCatalog, withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";

interface LedgerRow {
  version: number | null;
  name: string | null;
}

// AGENTS.md: a test of a migration first asserts that the ledger holds the expected versions.
async function assertAdminLedger(db: TestDatabase): Promise<void> {
  const { rows } = await db.ownerPool.query<LedgerRow>(
    `SELECT (SELECT version FROM ursitoare.schema_migration WHERE version = 180) AS version,
            (SELECT name FROM ursitoare.schema_migration WHERE version = 180) AS name`,
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the ledger query returns one row");
  assert.ok(row.version !== null, "the ledger holds version 180");
  assert.equal(row.version, 180, "the ledger holds version 180");
  assert.equal(row.name, "admin_api", "version 180 is named admin_api");
}

async function appExec(
  db: TestDatabase,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<{ rowCount: number | null }> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query(text, values);
    return { rowCount: result.rowCount };
  });
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

test("C-7a958882 Objects and privileges", async () => {
  const db = await withTestDatabase();
  try {
    await assertAdminLedger(db);
    const { a, b } = await seedTwoTenants(db);

    // The app role switches only its own tenant's review profile.
    const own = await appExec(
      db,
      a,
      "UPDATE ursitoare.tenant SET review_profile = 'team' WHERE tenant_id = 'tenant_a'",
    );
    assert.equal(own.rowCount, 1, "tenant A switches its own review profile");

    // Another tenant's row is out of reach and keeps its profile.
    const outside = await appExec(
      db,
      a,
      "UPDATE ursitoare.tenant SET review_profile = 'team' WHERE tenant_id = 'tenant_b'",
    );
    assert.equal(outside.rowCount, 0, "tenant B's row is not updated");
    const bProfile = await ownerExec(
      db,
      b,
      "SELECT review_profile FROM ursitoare.tenant WHERE tenant_id = 'tenant_b'",
    );
    assert.deepEqual(
      bProfile.rows,
      [{ review_profile: "solo" }],
      "tenant B stays solo",
    );

    // Nothing more than UPDATE (review_profile) is granted.
    await assert.rejects(
      appExec(db, a, "UPDATE ursitoare.tenant SET name = 'x' WHERE tenant_id = 'tenant_a'"),
      { code: "42501" },
      "the app role cannot set name",
    );
    await assert.rejects(
      appExec(
        db,
        a,
        "UPDATE ursitoare.tenant SET review_profile = 'bogus' WHERE tenant_id = 'tenant_a'",
      ),
      { code: "23514" },
      "the check constraint holds on review_profile",
    );
    await assert.rejects(
      appExec(db, a, "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'C')"),
      { code: "42501" },
      "the app role cannot insert a tenant",
    );
    await assert.rejects(
      appExec(db, a, "DELETE FROM ursitoare.tenant WHERE tenant_id = 'tenant_a'"),
      { code: "42501" },
      "the app role cannot delete a tenant",
    );

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});
