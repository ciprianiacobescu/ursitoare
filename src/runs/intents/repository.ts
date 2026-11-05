import { payloadDigest } from "../store/canonical.ts";
import { envelopeStore } from "../store/envelope-store.ts";
import type { PayloadValue, RunMode, TenantContext, TenantTx } from "../store/types.ts";
import { IntentError } from "./errors.ts";
import {
  assertAt,
  assertIdemKey,
  assertIntentWrite,
  assertTenantMatches,
  formatTimestamp,
} from "./validate.ts";

export type IntentState = "intent" | "done" | "unknown";

export interface IntentRecord {
  idemKey: string;
  runId: string;
  nodeId: string;
  tool: string;
  argsDigest: string;
  mode: RunMode;
  state: IntentState;
  resultRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface IntentWrite {
  idemKey: string;
  runId: string;
  nodeId: string;
  tool: string;
  args: PayloadValue;
  mode: RunMode;
}

const INTENT_COLUMNS = `idem_key, run_id, node_id, tool, args_digest, mode, state, result_ref,
  created_at, completed_at`;

interface IntentRow {
  idem_key: string;
  run_id: string;
  node_id: string;
  tool: string;
  args_digest: string;
  mode: string;
  state: string;
  result_ref: string | null;
  created_at: Date;
  completed_at: Date | null;
}

function toIntentRecord(row: IntentRow): IntentRecord {
  return {
    idemKey: row.idem_key,
    runId: row.run_id,
    nodeId: row.node_id,
    tool: row.tool,
    argsDigest: row.args_digest,
    mode: row.mode as RunMode,
    state: row.state as IntentState,
    resultRef: row.result_ref,
    createdAt: formatTimestamp(row.created_at),
    completedAt: row.completed_at === null ? null : formatTimestamp(row.completed_at),
  };
}

const SELECT_INTENT = `SELECT ${INTENT_COLUMNS} FROM ursitoare.effect_intent
  WHERE tenant_id = $1 AND idem_key = $2`;

const SELECT_INTENT_FOR_UPDATE = `${SELECT_INTENT} FOR UPDATE`;

async function selectIntent(
  tx: TenantTx,
  tenantId: string,
  idemKey: string,
): Promise<IntentRecord | null> {
  const { rows } = await tx.query<IntentRow>(SELECT_INTENT, [tenantId, idemKey]);
  const row = rows[0];
  return row === undefined ? null : toIntentRecord(row);
}

export async function recordIntent(
  tx: TenantTx,
  ctx: TenantContext,
  intent: IntentWrite,
  at: Date,
): Promise<{ record: IntentRecord; created: boolean }> {
  await assertTenantMatches(tx, ctx);

  assertIntentWrite(intent);
  assertAt(at);

  const argsDigest = payloadDigest(intent.args);

  const { rows } = await tx.query<IntentRow>(
    `INSERT INTO ursitoare.effect_intent
       (tenant_id, idem_key, run_id, node_id, tool, args_digest, mode, state, result_ref, created_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'intent', NULL, $8, NULL)
     ON CONFLICT (tenant_id, idem_key) DO NOTHING
     RETURNING ${INTENT_COLUMNS}`,
    [
      ctx.tenantId,
      intent.idemKey,
      intent.runId,
      intent.nodeId,
      intent.tool,
      argsDigest,
      intent.mode,
      at,
    ],
  );

  const inserted = rows[0];
  if (inserted !== undefined) {
    return { record: toIntentRecord(inserted), created: true };
  }

  const existing = await selectIntent(tx, ctx.tenantId, intent.idemKey);
  if (existing === null) {
    throw new IntentError("INTENT_INVALID", "intent not found after insert");
  }
  return { record: existing, created: false };
}

export async function completeIntent(
  tx: TenantTx,
  ctx: TenantContext,
  idemKey: string,
  result: PayloadValue,
  at: Date,
): Promise<IntentRecord> {
  await assertTenantMatches(tx, ctx);

  assertIdemKey(idemKey);
  assertAt(at);

  const { rows } = await tx.query<IntentRow>(SELECT_INTENT_FOR_UPDATE, [ctx.tenantId, idemKey]);
  const current = rows[0];
  if (current === undefined) {
    throw new IntentError("INTENT_NOT_FOUND", "intent not found");
  }
  if (current.state === "done") {
    return toIntentRecord(current);
  }

  const stored = await envelopeStore.put(tx, ctx, result);

  const updated = await tx.query<IntentRow>(
    `UPDATE ursitoare.effect_intent
        SET state = 'done', result_ref = $3, completed_at = $4
      WHERE tenant_id = $1 AND idem_key = $2
      RETURNING ${INTENT_COLUMNS}`,
    [ctx.tenantId, idemKey, stored.sha256, at],
  );
  const row = updated.rows[0];
  if (row === undefined) {
    throw new IntentError("INTENT_NOT_FOUND", "intent not found");
  }
  return toIntentRecord(row);
}

export async function markIntentUnknown(
  tx: TenantTx,
  ctx: TenantContext,
  idemKey: string,
  at: Date,
): Promise<IntentRecord> {
  await assertTenantMatches(tx, ctx);

  assertIdemKey(idemKey);
  assertAt(at);

  const { rows } = await tx.query<IntentRow>(SELECT_INTENT_FOR_UPDATE, [ctx.tenantId, idemKey]);
  const current = rows[0];
  if (current === undefined) {
    throw new IntentError("INTENT_NOT_FOUND", "intent not found");
  }
  if (current.state !== "intent") {
    return toIntentRecord(current);
  }

  const updated = await tx.query<IntentRow>(
    `UPDATE ursitoare.effect_intent
        SET state = 'unknown', result_ref = NULL, completed_at = NULL
      WHERE tenant_id = $1 AND idem_key = $2
      RETURNING ${INTENT_COLUMNS}`,
    [ctx.tenantId, idemKey],
  );
  const row = updated.rows[0];
  if (row === undefined) {
    throw new IntentError("INTENT_NOT_FOUND", "intent not found");
  }
  return toIntentRecord(row);
}

export async function getIntent(
  tx: TenantTx,
  ctx: TenantContext,
  idemKey: string,
): Promise<IntentRecord | null> {
  await assertTenantMatches(tx, ctx);

  assertIdemKey(idemKey);
  return selectIntent(tx, ctx.tenantId, idemKey);
}
