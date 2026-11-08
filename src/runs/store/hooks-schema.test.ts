import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { ensurePartitions } from "../../db/index.ts";
import { checkTenancyCatalog, withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";

const AT = "2026-11-02T00:00:00Z";
const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const DAY = "2026-11-02";

const RUN_INSERT = `INSERT INTO ursitoare.run
    (tenant_id, run_id, lineage_id, parent_run_id, flow_id, flow_hash, owner_team, mode, trigger,
     state, principal_user_id, principal_kind, actor_chain, input_ref, mocks_ref, output_ref, error,
     terminal_node, run_day, created_at, started_at, ended_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::text[], $14, $15, $16, $17::jsonb,
          $18, $19::date, $20, $21, $22)`;

const STEP_INSERT = `INSERT INTO ursitoare.step_execution
    (tenant_id, run_day, run_id, node_id, effect_seq, turn, attempt, generation, seq, kind, state,
     input_ref, output_ref, outcome, error, taint, policy_decision_id, idem_key, started_at, ended_at)
  VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::jsonb, $16::text[],
          $17, $18, $19, $20)`;

async function appExec(
  pool: TenantPool,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(text, values);
  });
}

async function insertRun(pool: TenantPool, ctx: TenantContext, runId: string): Promise<void> {
  await appExec(pool, ctx, RUN_INSERT, [
    ctx.tenantId,
    runId,
    runId,
    null,
    "rf-1-core",
    FLOW_HASH,
    "finance",
    "mock",
    "test",
    "queued",
    "u_alice",
    "human",
    [],
    null,
    null,
    null,
    null,
    null,
    DAY,
    AT,
    null,
    null,
  ]);
}

async function insertStep(
  pool: TenantPool,
  ctx: TenantContext,
  runId: string,
  nodeId: string,
  seq: number,
): Promise<void> {
  await appExec(pool, ctx, STEP_INSERT, [
    ctx.tenantId,
    DAY,
    runId,
    nodeId,
    0,
    0,
    1,
    0,
    seq,
    "block",
    "completed",
    null,
    null,
    null,
    null,
    [],
    null,
    null,
    AT,
    AT,
  ]);
}

test("C-a8ac9b1d the hooks column is jsonb on every partition with narrow app privileges", async () => {
  const db = await withTestDatabase();
  try {
    await ensurePartitions(db.ownerPool, { now: () => new Date("2026-11-02T00:00:00Z") });
    const { a } = await seedTwoTenants(db);
    await insertRun(db.appPool, a, "r_1");
    await insertStep(db.appPool, a, "r_1", "n1", 0);

    const tables = [
      "ursitoare.step_execution",
      "ursitoare.step_execution_default",
      "ursitoare.step_execution_p20261102",
    ];

    const ledger = await db.ownerPool.query<{ name: string }>(
      "SELECT name FROM ursitoare.schema_migration WHERE version = 425",
    );
    const ledgerRow = ledger.rows[0];
    assert.ok(ledgerRow !== undefined, "the ledger holds version 425");
    assert.deepEqual(
      { version: 425, name: ledgerRow.name },
      { version: 425, name: "step_hooks" },
    );

    for (const table of tables) {
      const { rows } = await db.ownerPool.query<{
        data_type: string;
        is_nullable: string;
      }>(
        `SELECT data_type, is_nullable
           FROM information_schema.columns
          WHERE table_schema = 'ursitoare'
            AND table_name = $1
            AND column_name = 'hooks'`,
        [table.slice("ursitoare.".length)],
      );
      const column = rows[0];
      assert.ok(column !== undefined, `${table} has a hooks column`);
      assert.equal(column.data_type, "jsonb", `${table}.hooks is jsonb`);
      assert.equal(column.is_nullable, "YES", `${table}.hooks is nullable`);
    }

    const valid = [
      `UPDATE ursitoare.step_execution
          SET hooks = '{"inputOriginalRef":null,"entries":[]}'::jsonb
        WHERE run_id = 'r_1'`,
      `UPDATE ursitoare.step_execution
          SET hooks = '{"inputOriginalRef":"${"a".repeat(64)}","entries":[]}'::jsonb
        WHERE run_id = 'r_1'`,
      "UPDATE ursitoare.step_execution SET hooks = NULL WHERE run_id = 'r_1'",
    ];
    for (const sql of valid) {
      await assert.doesNotReject(appExec(db.appPool, a, sql), sql);
    }

    const malformed = [
      "UPDATE ursitoare.step_execution SET hooks = '[]'::jsonb WHERE run_id = 'r_1'",
      "UPDATE ursitoare.step_execution SET hooks = '{\"entries\":{}}'::jsonb WHERE run_id = 'r_1'",
      "UPDATE ursitoare.step_execution SET hooks = '{\"inputOriginalRef\":null}'::jsonb WHERE run_id = 'r_1'",
      `UPDATE ursitoare.step_execution
          SET hooks = '{"inputOriginalRef":"xyz","entries":[]}'::jsonb
        WHERE run_id = 'r_1'`,
      "UPDATE ursitoare.step_execution SET hooks = '{\"inputOriginalRef\":5,\"entries\":[]}'::jsonb WHERE run_id = 'r_1'",
    ];
    for (const sql of malformed) {
      await assert.rejects(appExec(db.appPool, a, sql), { code: "23514" }, sql);
    }

    await assert.rejects(
      appExec(db.appPool, a, "UPDATE ursitoare.step_execution SET seq = 5 WHERE run_id = 'r_1'"),
      { code: "42501" },
      "the app role cannot update seq",
    );

    const leaves = ["ursitoare.step_execution_default", "ursitoare.step_execution_p20261102"];
    for (const leaf of leaves) {
      for (const privilege of ["SELECT", "INSERT"]) {
        const { rows } = await db.ownerPool.query<{ ok: boolean }>(
          "SELECT has_table_privilege('ursitoare_app', $1, $2) AS ok",
          [leaf, privilege],
        );
        assert.equal(rows[0]?.ok, false, `the app role has no ${privilege} on ${leaf}`);
      }
      const hooksLeaf = await db.ownerPool.query<{ ok: boolean }>(
        "SELECT has_column_privilege('ursitoare_app', $1, 'hooks', 'UPDATE') AS ok",
        [leaf],
      );
      assert.equal(hooksLeaf.rows[0]?.ok, false, `the app role has no UPDATE on hooks of ${leaf}`);
    }

    const parentHooks = await db.ownerPool.query<{ ok: boolean }>(
      "SELECT has_column_privilege('ursitoare_app', 'ursitoare.step_execution', 'hooks', 'UPDATE') AS ok",
    );
    assert.equal(parentHooks.rows[0]?.ok, true, "the app role has UPDATE on parent hooks");

    const parentSeq = await db.ownerPool.query<{ ok: boolean }>(
      "SELECT has_column_privilege('ursitoare_app', 'ursitoare.step_execution', 'seq', 'UPDATE') AS ok",
    );
    assert.equal(parentSeq.rows[0]?.ok, false, "the app role has no UPDATE on parent seq");

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});
