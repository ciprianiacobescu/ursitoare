import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResult, QueryResultRow } from "pg";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { checkTenancyCatalog, withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { idemKey } from "./key.ts";

const AT = "2026-11-02T10:00:00Z";
const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);

const K1 = idemKey("tenant_a", "r_1", "pay", 0);
const K_MAIL = idemKey("tenant_a", "r_1", "mail", 0);

const RUN_INSERT = `INSERT INTO ursitoare.run
    (tenant_id, run_id, lineage_id, flow_id, flow_hash, owner_team, mode, trigger, state,
     principal_user_id, principal_kind, run_day, created_at)
  VALUES ($1, $2, $3, 'pay-once', $4, 'finance', 'live', 'test', 'queued',
          'u_alice', 'human', '2026-11-02', $5)`;

const INTENT_INSERT = `INSERT INTO ursitoare.effect_intent
    (tenant_id, idem_key, run_id, node_id, tool, args_digest, mode, state, result_ref,
     completed_at, created_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

interface IntentOverrides {
  tenantId?: string;
  idemKey?: string;
  runId?: string;
  nodeId?: string;
  tool?: string;
  argsDigest?: string;
  mode?: string;
  state?: string;
  resultRef?: string | null;
  completedAt?: string | null;
}

async function appQuery<T extends QueryResultRow = QueryResultRow>(
  pool: TenantPool,
  ctx: TenantContext,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return withTenantTx(pool, ctx, (tx) => tx.query<T>(text, values));
}

async function insertIntent(
  pool: TenantPool,
  ctx: TenantContext,
  overrides: IntentOverrides = {},
): Promise<QueryResult> {
  return appQuery(pool, ctx, INTENT_INSERT, [
    overrides.tenantId ?? ctx.tenantId,
    overrides.idemKey ?? K1,
    overrides.runId ?? "r_1",
    overrides.nodeId ?? "pay",
    overrides.tool ?? "erp.create_payment@1",
    overrides.argsDigest ?? DIGEST_A,
    overrides.mode ?? "live",
    overrides.state ?? "intent",
    overrides.resultRef ?? null,
    overrides.completedAt ?? null,
    AT,
  ]);
}

test("C-6269a4a2 effect_intent is a tenant table with narrow privileges", async () => {
  const db = await withTestDatabase();
  try {
    const ledger = await db.ownerPool.query<{ name: string }>(
      "SELECT name FROM ursitoare.schema_migration WHERE version = 340",
    );
    assert.ok(ledger.rows[0] !== undefined, "the ledger holds version 340");
    assert.equal(ledger.rows[0].name, "effect_intent");

    const regclass = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass('ursitoare.effect_intent')::text AS found",
    );
    assert.equal(regclass.rows[0]?.found, "ursitoare.effect_intent");

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    const { a, b } = await seedTwoTenants(db);
    await appQuery(db.appPool, a, RUN_INSERT, [a.tenantId, "r_1", "r_1", FLOW_HASH, AT]);
    await appQuery(db.appPool, b, RUN_INSERT, [b.tenantId, "r_9", "r_9", FLOW_HASH, AT]);

    const first = await insertIntent(db.appPool, a);
    assert.equal(first.rowCount, 1, "the first insert succeeds");

    const checkRows: IntentOverrides[] = [
      { idemKey: "bad" },
      { idemKey: idemKey("tenant_a", "r_1", "bad_state", 0), state: "weird" },
      { idemKey: idemKey("tenant_a", "r_1", "bad_mode", 0), mode: "x" },
      { idemKey: idemKey("tenant_a", "r_1", "bad_digest", 0), argsDigest: "zz" },
      { idemKey: idemKey("tenant_a", "r_1", "done_null", 0), state: "done" },
      {
        idemKey: idemKey("tenant_a", "r_1", "intent_full", 0),
        resultRef: DIGEST_B,
        completedAt: AT,
      },
    ];
    for (const overrides of checkRows) {
      await assert.rejects(insertIntent(db.appPool, a, overrides), { code: "23514" });
    }

    await assert.rejects(
      insertIntent(db.appPool, a, {
        idemKey: idemKey("tenant_a", "r_1", "missing_run", 0),
        runId: "nope",
      }),
      { code: "23503" },
    );

    await assert.rejects(
      insertIntent(db.appPool, a, {
        tenantId: b.tenantId,
        idemKey: idemKey("tenant_b", "r_9", "pay", 0),
        runId: "r_9",
      }),
      { code: "42501" },
    );

    await assert.rejects(
      appQuery(db.appPool, a, "UPDATE ursitoare.effect_intent SET tool = 'other.tool@1' WHERE idem_key = $1", [
        K1,
      ]),
      { code: "42501" },
    );
    await assert.rejects(
      appQuery(
        db.appPool,
        a,
        "UPDATE ursitoare.effect_intent SET idem_key = $2 WHERE idem_key = $1",
        [K1, idemKey("tenant_a", "r_1", "pay_renamed", 0)],
      ),
      { code: "42501" },
    );

    const completed = await appQuery(
      db.appPool,
      a,
      "UPDATE ursitoare.effect_intent SET state = 'done', result_ref = $2, completed_at = $3 WHERE idem_key = $1",
      [K1, DIGEST_B, AT],
    );
    assert.equal(completed.rowCount, 1, "the valid update succeeds");

    await assert.rejects(
      appQuery(
        db.appPool,
        a,
        "UPDATE ursitoare.effect_intent SET state = 'unknown', result_ref = NULL, completed_at = NULL WHERE idem_key = $1",
        [K1],
      ),
      { code: "U3401" },
      "a done row cannot become unknown",
    );
    await assert.rejects(
      appQuery(
        db.appPool,
        a,
        "UPDATE ursitoare.effect_intent SET result_ref = $2 WHERE idem_key = $1",
        [K1, DIGEST_C],
      ),
      { code: "U3401" },
      "a done row cannot be rewritten",
    );

    await insertIntent(db.appPool, a, {
      idemKey: K_MAIL,
      nodeId: "mail",
      tool: "mail.send@1",
    });
    const marked = await appQuery(
      db.appPool,
      a,
      "UPDATE ursitoare.effect_intent SET state = 'unknown', result_ref = NULL, completed_at = NULL WHERE idem_key = $1",
      [K_MAIL],
    );
    assert.equal(marked.rowCount, 1, "an intent row becomes unknown");
    await assert.rejects(
      appQuery(
        db.appPool,
        a,
        "UPDATE ursitoare.effect_intent SET state = 'intent' WHERE idem_key = $1",
        [K_MAIL],
      ),
      { code: "U3401" },
      "an unknown row cannot become intent",
    );

    await assert.rejects(
      appQuery(db.appPool, a, "DELETE FROM ursitoare.effect_intent WHERE idem_key = $1", [K1]),
      { code: "42501" },
    );

    const count = await appQuery<{ n: string }>(
      db.appPool,
      b,
      "SELECT count(*)::text AS n FROM ursitoare.effect_intent",
    );
    assert.equal(count.rows[0]?.n, "0", "tenant B sees no rows");
    const stranger = await appQuery(
      db.appPool,
      b,
      "UPDATE ursitoare.effect_intent SET state = 'unknown', result_ref = NULL, completed_at = NULL WHERE idem_key = $1",
      [K1],
    );
    assert.equal(stranger.rowCount, 0, "tenant B cannot update tenant A's row");

    const owner = await appQuery<{ state: string; result_ref: string | null }>(
      db.ownerPool,
      a,
      "SELECT state, result_ref FROM ursitoare.effect_intent WHERE idem_key = $1",
      [K1],
    );
    assert.deepEqual(owner.rows[0], { state: "done", result_ref: DIGEST_B });
  } finally {
    await db.close();
  }
});
