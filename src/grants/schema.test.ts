import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkTenancyCatalog,
  withTenantTx,
  type TenantContext,
  type TenantPool,
} from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const NOW = "2026-11-06T09:00:00.000Z";
const ROLE_APP = "ursitoare_app";

const GRANT_1 = "grant_00000000-0000-7000-8000-000000000001";
const GRANT_2 = "grant_00000000-0000-7000-8000-000000000002";
const GRANT_3 = "grant_00000000-0000-7000-8000-000000000003";
const GRANT_4 = "grant_00000000-0000-7000-8000-000000000004";
const GRANT_5 = "grant_00000000-0000-7000-8000-000000000005";
const GRANT_6 = "grant_00000000-0000-7000-8000-000000000006";
const GRANT_7 = "grant_00000000-0000-7000-8000-000000000007";

interface GrantInsert {
  tenant_id?: string;
  grant_id?: string;
  subject_kind?: string;
  subject_id?: string;
  tool?: string;
  scope_kind?: string;
  flow_id?: string | null;
  node_id?: string | null;
  args?: unknown;
  fingerprints?: string[];
  state?: string;
  created_by?: string;
  created_at?: string;
  revoked_by?: string | null;
  revoked_at?: string | null;
}

async function insertGrant(
  pool: TenantPool,
  ctx: TenantContext,
  overrides: GrantInsert = {},
): Promise<void> {
  const row: Required<GrantInsert> = {
    tenant_id: ctx.tenantId,
    grant_id: GRANT_1,
    subject_kind: "role",
    subject_id: "author",
    tool: "acme.lookup_vendor@1",
    scope_kind: "any_step",
    flow_id: null,
    node_id: null,
    args: [],
    fingerprints: [],
    state: "active",
    created_by: "carol",
    created_at: NOW,
    revoked_by: null,
    revoked_at: null,
    ...overrides,
  };
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."grant"
         (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind, flow_id, node_id,
          args, fingerprints, state, created_by, created_at, revoked_by, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15)`,
      [
        row.tenant_id,
        row.grant_id,
        row.subject_kind,
        row.subject_id,
        row.tool,
        row.scope_kind,
        row.flow_id,
        row.node_id,
        JSON.stringify(row.args),
        row.fingerprints,
        row.state,
        row.created_by,
        row.created_at,
        row.revoked_by,
        row.revoked_at,
      ],
    );
  });
}

async function appExec(
  pool: TenantPool,
  ctx: TenantContext,
  sql: string,
): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const result = await tx.query(sql);
    return result.rowCount ?? 0;
  });
}

test("C-8ca21fe5 migration 0490 stores grants with little mutable state", async () => {
  const db = await withTestDatabase();
  try {
    const ledger = await db.ownerPool.query<{ version: number; name: string }>(
      "SELECT version, name FROM ursitoare.schema_migration WHERE version = 490",
    );
    const entry = ledger.rows[0];
    assert.ok(entry !== undefined, "the ledger holds version 490");
    assert.deepEqual(entry, { version: 490, name: "grants" });

    const table = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass('ursitoare.\"grant\"')::text AS found",
    );
    assert.ok(table.rows[0]?.found, "ursitoare.grant exists");

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    const privileges = await db.ownerPool.query<{
      select: boolean;
      insert: boolean;
      update: boolean;
      delete: boolean;
    }>(
      `SELECT has_table_privilege($1, 'ursitoare."grant"', 'SELECT') AS select,
              has_table_privilege($1, 'ursitoare."grant"', 'INSERT') AS insert,
              has_table_privilege($1, 'ursitoare."grant"', 'UPDATE') AS update,
              has_table_privilege($1, 'ursitoare."grant"', 'DELETE') AS "delete"`,
      [ROLE_APP],
    );
    assert.equal(privileges.rows[0]?.select, true);
    assert.equal(privileges.rows[0]?.insert, true);
    assert.equal(privileges.rows[0]?.update, false);
    assert.equal(privileges.rows[0]?.delete, false);

    const columns = await db.ownerPool.query<{
      fingerprints: boolean;
      state: boolean;
      revoked_by: boolean;
      revoked_at: boolean;
      tool: boolean;
      created_by: boolean;
    }>(
      `SELECT has_column_privilege($1, 'ursitoare."grant"', 'fingerprints', 'UPDATE') AS fingerprints,
              has_column_privilege($1, 'ursitoare."grant"', 'state', 'UPDATE') AS state,
              has_column_privilege($1, 'ursitoare."grant"', 'revoked_by', 'UPDATE') AS revoked_by,
              has_column_privilege($1, 'ursitoare."grant"', 'revoked_at', 'UPDATE') AS revoked_at,
              has_column_privilege($1, 'ursitoare."grant"', 'tool', 'UPDATE') AS tool,
              has_column_privilege($1, 'ursitoare."grant"', 'created_by', 'UPDATE') AS created_by`,
      [ROLE_APP],
    );
    assert.equal(columns.rows[0]?.fingerprints, true);
    assert.equal(columns.rows[0]?.state, true);
    assert.equal(columns.rows[0]?.revoked_by, true);
    assert.equal(columns.rows[0]?.revoked_at, true);
    assert.equal(columns.rows[0]?.tool, false);
    assert.equal(columns.rows[0]?.created_by, false);

    const { a, b } = await seedTwoTenants(db);

    await insertGrant(db.appPool, a);

    const selected = await withTenantTx(db.appPool, a, (tx) =>
      tx.query<{ grant_id: string }>('SELECT grant_id FROM ursitoare."grant"'),
    );
    assert.equal(selected.rowCount, 1);
    assert.equal(selected.rows[0]?.grant_id, GRANT_1);

    const refused: GrantInsert[] = [
      { grant_id: GRANT_2, scope_kind: "node", flow_id: "pay-run", node_id: "pay" },
      { grant_id: GRANT_3, fingerprints: ["nf1_aa"] },
      {
        grant_id: GRANT_4,
        scope_kind: "node",
        flow_id: "pay-run",
        node_id: "pay",
        fingerprints: ["nf1_aa"],
      },
      { grant_id: GRANT_5, state: "revoked" },
      { grant_id: "g1" },
      { grant_id: GRANT_6, args: Array.from({ length: 9 }, () => ({ arg: "limit", op: "eq", value: 1 })) },
    ];
    for (const row of refused) {
      await assert.rejects(insertGrant(db.ownerPool, a, row), { code: "23514" });
    }

    await assert.rejects(
      appExec(db.appPool, a, `UPDATE ursitoare."grant" SET tool = 'acme.create_payment@1'`),
      { code: "42501" },
    );
    await assert.rejects(appExec(db.appPool, a, 'DELETE FROM ursitoare."grant"'), {
      code: "42501",
    });
    await assert.rejects(
      insertGrant(db.appPool, a, { tenant_id: "tenant_b", grant_id: GRANT_7 }),
      { code: "42501" },
    );

    const appRows = await withTenantTx(db.appPool, b, (tx) =>
      tx.query<{ n: number }>('SELECT count(*)::int AS n FROM ursitoare."grant"'),
    );
    assert.equal(appRows.rows[0]?.n, 0);
  } finally {
    await db.close();
  }
});
