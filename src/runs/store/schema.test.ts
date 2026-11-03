import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { ensurePartitions } from "../../db/index.ts";
import { checkTenancyCatalog, withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";

const AT = "2026-10-25T00:00:00Z";
const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const PAYLOAD_SHA = "b".repeat(64);
const SOME_SHA = "c".repeat(64);

const TABLES = [
  "ursitoare.run",
  "ursitoare.step_execution",
  "ursitoare.envelope_payload",
  "ursitoare.event",
];

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

const PAYLOAD_INSERT = `INSERT INTO ursitoare.envelope_payload (tenant_id, sha256, size, data)
  VALUES ($1, $2, $3, $4::jsonb)`;

const EVENT_INSERT = `INSERT INTO ursitoare.event
    (tenant_id, event_id, "time", run_id, correlation_id, type, data)
  VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`;

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

async function countRows(pool: TenantPool, ctx: TenantContext, table: string): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`);
    return Number(rows[0]?.n);
  });
}

async function assertMigrated(db: TestDatabase): Promise<void> {
  const ledger = await db.ownerPool.query<{ name: string }>(
    "SELECT name FROM ursitoare.schema_migration WHERE version = 310",
  );
  assert.ok(ledger.rows[0] !== undefined, "the ledger holds version 310");
  assert.equal(ledger.rows[0].name, "run_data");
  for (const name of [...TABLES, "ursitoare.step_execution_default", "ursitoare.event_default"]) {
    const { rows } = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass($1)::text AS found",
      [name],
    );
    assert.ok(rows[0]?.found, `${name} exists`);
  }
}

async function insertRun(
  pool: TenantPool,
  ctx: TenantContext,
  runId: string,
  overrides: { runDay?: string; inputRef?: string | null } = {},
): Promise<void> {
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
    overrides.inputRef ?? null,
    null,
    null,
    null,
    null,
    overrides.runDay ?? "2026-10-25",
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
  overrides: { runDay?: string; attempt?: number } = {},
): Promise<void> {
  await appExec(pool, ctx, STEP_INSERT, [
    ctx.tenantId,
    overrides.runDay ?? "2026-10-25",
    runId,
    nodeId,
    0,
    0,
    overrides.attempt ?? 1,
    0,
    seq,
    "block",
    "started",
    null,
    null,
    null,
    null,
    [],
    null,
    null,
    AT,
    null,
  ]);
}

async function insertPayload(
  pool: TenantPool,
  ctx: TenantContext,
  sha256: string,
  data: string,
): Promise<void> {
  await appExec(pool, ctx, PAYLOAD_INSERT, [ctx.tenantId, sha256, Buffer.byteLength(data), data]);
}

async function insertEvent(
  pool: TenantPool,
  ctx: TenantContext,
  eventId: string,
  time: string,
  overrides: { runId?: string | null; tenantId?: string } = {},
): Promise<void> {
  await appExec(pool, ctx, EVENT_INSERT, [
    overrides.tenantId ?? ctx.tenantId,
    eventId,
    time,
    overrides.runId ?? null,
    null,
    "run.created",
    "{}",
  ]);
}

test("C-d540ef0d run tables are tenant leading with forced row security and narrow privileges", async () => {
  const db = await withTestDatabase();
  try {
    await assertMigrated(db);
    const { a, b } = await seedTwoTenants(db);

    await insertRun(db.appPool, a, "r_1");
    await insertStep(db.appPool, a, "r_1", "n1", 0);
    await insertPayload(db.appPool, a, PAYLOAD_SHA, '{"k":1}');
    await insertEvent(db.appPool, a, "ev_1", AT, { runId: "r_1" });

    const refused = [
      `UPDATE ursitoare.run SET flow_hash = '${FLOW_HASH}' WHERE run_id = 'r_1'`,
      "DELETE FROM ursitoare.run WHERE run_id = 'r_1'",
      "UPDATE ursitoare.envelope_payload SET data = '{}'::jsonb",
      "DELETE FROM ursitoare.event WHERE event_id = 'ev_1'",
      "UPDATE ursitoare.step_execution SET seq = 5 WHERE run_id = 'r_1'",
    ];
    for (const sql of refused) {
      await assert.rejects(appExec(db.appPool, a, sql), { code: "42501" }, sql);
    }

    await assert.doesNotReject(
      appExec(db.appPool, a, "UPDATE ursitoare.run SET state = 'running' WHERE run_id = 'r_1'"),
      "a run state update is allowed",
    );
    await assert.doesNotReject(
      appExec(
        db.appPool,
        a,
        "UPDATE ursitoare.step_execution SET state = 'completed' WHERE run_id = 'r_1'",
      ),
      "a step state update is allowed",
    );

    await assert.rejects(
      appExec(
        db.appPool,
        a,
        `INSERT INTO ursitoare.run
           (tenant_id, run_id, lineage_id, flow_id, flow_hash, owner_team, mode, trigger, state,
            principal_user_id, principal_kind, run_day, created_at)
         VALUES ('tenant_a', 'r_dry', 'r_dry', 'rf-1-core', $1, 'finance', 'dry', 'test', 'queued',
                 'u_alice', 'human', '2026-10-25', $2)`,
        [FLOW_HASH, AT],
      ),
      { code: "23514" },
      "mode dry is refused",
    );

    await assert.rejects(
      appExec(
        db.appPool,
        a,
        `INSERT INTO ursitoare.step_execution
           (tenant_id, run_day, run_id, node_id, effect_seq, turn, attempt, generation, seq, kind, state, started_at)
         VALUES ('tenant_a', '2026-10-25', 'r_1', 'zero', 0, 0, 0, 0, 9, 'block', 'started', $1)`,
        [AT],
      ),
      { code: "23514" },
      "attempt 0 is refused",
    );

    await assert.rejects(
      insertStep(db.appPool, a, "r_1", "n2", 0),
      { code: "23505" },
      "a second step with the same seq is refused",
    );

    for (const table of TABLES) {
      assert.equal(await countRows(db.appPool, b, table), 0, `B sees no ${table} row`);
    }
    await assert.rejects(
      insertEvent(db.appPool, b, "ev_b", AT, { tenantId: "tenant_a" }),
      { code: "42501" },
      "B cannot write a row for tenant_a",
    );

    const flags = await db.ownerPool.query<{
      relname: string;
      relkind: string;
      rls: boolean;
      forced: boolean;
      comment: string | null;
    }>(
      `SELECT c.relname,
              c.relkind::text AS relkind,
              c.relrowsecurity AS rls,
              c.relforcerowsecurity AS forced,
              obj_description(c.oid, 'pg_class') AS comment
         FROM pg_class c
        WHERE c.oid = ANY (ARRAY[
          'ursitoare.run'::regclass,
          'ursitoare.step_execution'::regclass,
          'ursitoare.envelope_payload'::regclass,
          'ursitoare.event'::regclass
        ])
        ORDER BY c.relname`,
    );
    assert.deepEqual(
      flags.rows.map((row) => [row.relname, row.rls, row.forced]),
      [
        ["envelope_payload", true, true],
        ["event", true, true],
        ["run", true, true],
        ["step_execution", true, true],
      ],
    );
    const byName = new Map(flags.rows.map((row) => [row.relname, row]));
    assert.equal(byName.get("step_execution")?.relkind, "p");
    assert.equal(byName.get("step_execution")?.comment, "partition: day");
    assert.equal(byName.get("event")?.relkind, "p");
    assert.equal(byName.get("event")?.comment, "partition: month");

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);
  } finally {
    await db.close();
  }
});

test("C-9c1a9ff9 rows land in the daily and monthly partitions", async () => {
  const db = await withTestDatabase();
  try {
    await assertMigrated(db);
    const { a } = await seedTwoTenants(db);
    await ensurePartitions(db.ownerPool, { now: () => new Date("2031-03-15T00:00:00Z") });

    await insertRun(db.appPool, a, "r_1", { inputRef: SOME_SHA });
    await insertStep(db.appPool, a, "r_1", "s0", 0, { runDay: "2031-03-31" });
    await insertStep(db.appPool, a, "r_1", "s1", 1, { runDay: "2031-04-01" });
    await insertStep(db.appPool, a, "r_1", "s2", 2, { runDay: "2019-06-01" });

    await insertEvent(db.appPool, a, "ev_1", "2031-03-31T23:59:59Z", { runId: "r_1" });
    await insertEvent(db.appPool, a, "ev_2", "2031-04-01T00:00:00Z", { runId: "r_1" });
    await insertEvent(db.appPool, a, "ev_3", "2019-01-01T00:00:00Z", { runId: "r_1" });

    const steps = await withTenantTx(db.appPool, a, async (tx) =>
      tx.query<{ leaf: string }>(
        "SELECT tableoid::regclass::text AS leaf FROM ursitoare.step_execution WHERE run_id = 'r_1' ORDER BY seq",
      ),
    );
    assert.deepEqual(
      steps.rows.map((row) => row.leaf),
      [
        "ursitoare.step_execution_p20310331",
        "ursitoare.step_execution_p20310401",
        "ursitoare.step_execution_default",
      ],
    );

    const events = await withTenantTx(db.appPool, a, async (tx) =>
      tx.query<{ event_id: string; leaf: string }>(
        'SELECT event_id, tableoid::regclass::text AS leaf FROM ursitoare.event ORDER BY event_id',
      ),
    );
    assert.deepEqual(
      events.rows.map((row) => [row.event_id, row.leaf]),
      [
        ["ev_1", "ursitoare.event_p203103"],
        ["ev_2", "ursitoare.event_p203104"],
        ["ev_3", "ursitoare.event_default"],
      ],
    );

    const leaves = [
      "ursitoare.step_execution_p20310331",
      "ursitoare.step_execution_p20310401",
      "ursitoare.step_execution_default",
      "ursitoare.event_p203103",
      "ursitoare.event_p203104",
      "ursitoare.event_default",
    ];
    for (const leaf of leaves) {
      for (const privilege of ["SELECT", "INSERT"]) {
        const { rows } = await db.ownerPool.query<{ ok: boolean }>(
          "SELECT has_table_privilege('ursitoare_app', $1, $2) AS ok",
          [leaf, privilege],
        );
        assert.equal(rows[0]?.ok, false, `the app role has no ${privilege} on ${leaf}`);
      }
    }
  } finally {
    await db.close();
  }
});
