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

const ROLE_APP = "ursitoare_app";
const V1 = "a".repeat(64);
const V2 = "b".repeat(64);

function grantId(n: number): string {
  return `grant_00000000-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;
}

interface PolicySetInsert {
  tenant_id?: string;
  deploy_seq: number;
  version?: string;
  source?: string;
  grant_ids?: string[];
  tenant_sources?: unknown;
  tool_args?: unknown;
  current: boolean;
  deployed_by?: string;
  deployed_at?: string;
}

async function insertPolicySet(
  pool: TenantPool,
  ctx: TenantContext,
  overrides: PolicySetInsert,
): Promise<void> {
  const row = {
    tenant_id: ctx.tenantId,
    version: V1,
    source: "",
    grant_ids: [],
    tenant_sources: [],
    tool_args: {},
    deployed_by: "carol",
    deployed_at: "2026-11-06T09:00:00Z",
    ...overrides,
  };
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.policy_set
         (tenant_id, deploy_seq, version, source, grant_ids, tenant_sources, tool_args,
          current, deployed_by, deployed_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10::timestamptz)`,
      [
        row.tenant_id,
        row.deploy_seq,
        row.version,
        row.source,
        row.grant_ids,
        JSON.stringify(row.tenant_sources),
        JSON.stringify(row.tool_args),
        row.current,
        row.deployed_by,
        row.deployed_at,
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

test("C-f3066a28 migration 0495 keeps one current policy set per tenant", async () => {
  const db = await withTestDatabase();
  try {
    const ledger = await db.ownerPool.query<{ version: number; name: string }>(
      "SELECT version, name FROM ursitoare.schema_migration WHERE version = 495",
    );
    const entry = ledger.rows[0];
    assert.ok(entry !== undefined, "the ledger holds version 495");
    assert.deepEqual(entry, { version: 495, name: "policy_sets" });

    const table = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass('ursitoare.policy_set')::text AS found",
    );
    assert.ok(table.rows[0]?.found, "ursitoare.policy_set exists");

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    const privileges = await db.ownerPool.query<{
      select: boolean;
      insert: boolean;
      update: boolean;
      delete: boolean;
    }>(
      `SELECT has_table_privilege($1, 'ursitoare.policy_set', 'SELECT') AS select,
              has_table_privilege($1, 'ursitoare.policy_set', 'INSERT') AS insert,
              has_table_privilege($1, 'ursitoare.policy_set', 'UPDATE') AS update,
              has_table_privilege($1, 'ursitoare.policy_set', 'DELETE') AS "delete"`,
      [ROLE_APP],
    );
    assert.equal(privileges.rows[0]?.select, true);
    assert.equal(privileges.rows[0]?.insert, true);
    assert.equal(privileges.rows[0]?.update, false);
    assert.equal(privileges.rows[0]?.delete, false);

    const columns = await db.ownerPool.query<{
      current: boolean;
      source: boolean;
    }>(
      `SELECT has_column_privilege($1, 'ursitoare.policy_set', 'current', 'UPDATE') AS current,
              has_column_privilege($1, 'ursitoare.policy_set', 'source', 'UPDATE') AS source`,
      [ROLE_APP],
    );
    assert.equal(columns.rows[0]?.current, true);
    assert.equal(columns.rows[0]?.source, false);

    const { a, b } = await seedTwoTenants(db);

    await insertPolicySet(db.appPool, a, { deploy_seq: 1, version: V1, current: true });
    await assert.rejects(
      insertPolicySet(db.appPool, a, {
        deploy_seq: 2,
        version: V2,
        current: true,
        deployed_at: "2026-11-06T10:00:00Z",
      }),
      { code: "23505" },
    );

    await insertPolicySet(db.appPool, a, {
      deploy_seq: 2,
      version: V2,
      current: false,
      deployed_at: "2026-11-06T10:00:00Z",
    });
    await assert.rejects(
      insertPolicySet(db.appPool, a, {
        deploy_seq: 2,
        version: V2,
        current: false,
        deployed_at: "2026-11-06T10:00:00Z",
      }),
      { code: "23505" },
    );
    await insertPolicySet(db.appPool, a, {
      deploy_seq: 3,
      version: V2,
      current: false,
      deployed_at: "2026-11-06T10:00:00Z",
    });
    await insertPolicySet(db.appPool, a, {
      deploy_seq: 4,
      version: V1,
      current: false,
      deployed_at: "2026-11-06T10:00:00Z",
    });
    await insertPolicySet(db.appPool, b, { deploy_seq: 1, version: V1, current: true });

    const refused: PolicySetInsert[] = [
      { deploy_seq: 0, current: false },
      { deploy_seq: 6, version: "xyz", current: false },
      {
        deploy_seq: 6,
        grant_ids: Array.from({ length: 501 }, (_, index) => grantId(index)),
        current: false,
      },
      { deploy_seq: 6, tenant_sources: {}, current: false },
      { deploy_seq: 6, tool_args: [], current: false },
      { deploy_seq: 6, source: "x".repeat(65537), current: false },
    ];
    for (const row of refused) {
      await assert.rejects(insertPolicySet(db.appPool, a, row), { code: "23514" });
    }

    await assert.rejects(
      insertPolicySet(db.appPool, a, {
        tenant_id: "tenant_b",
        deploy_seq: 6,
        current: false,
      }),
      { code: "42501" },
    );
    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.policy_set SET source = 'x'"),
      { code: "42501" },
    );
    await assert.rejects(appExec(db.appPool, a, "DELETE FROM ursitoare.policy_set"), {
      code: "42501",
    });

    assert.equal(
      await appExec(
        db.appPool,
        a,
        "UPDATE ursitoare.policy_set SET current = false WHERE current",
      ),
      2,
    );
    await insertPolicySet(db.appPool, a, {
      deploy_seq: 5,
      version: V1,
      current: true,
      deployed_at: "2026-11-06T12:00:00Z",
    });

    const uRows = await withTenantTx(db.appPool, b, (tx) =>
      tx.query<{ tenant_id: string; version: string }>(
        "SELECT tenant_id, version FROM ursitoare.policy_set",
      ),
    );
    assert.deepEqual(uRows.rows, [{ tenant_id: "tenant_b", version: V1 }]);
  } finally {
    await db.close();
  }
});
