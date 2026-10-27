import { systemClock, type Clock } from "../core/index.ts";
import { withTenantTx, type TenantContext, type TenantPool, type TenantTx } from "../tenancy/index.ts";
import { canonicalize } from "./canonical.ts";
import { AuditError, wrapStoreError } from "./errors.ts";
import { validateEvent, type AuditEventInput } from "./event.ts";
import { GENESIS_HASH, chainHash, formatAt } from "./hash.ts";

export interface AppendOptions {
  clock?: Clock;
}

interface HeadRow {
  seq_text: string;
  hash: Buffer;
}

const SELECT_HEAD = "SELECT seq::text AS seq_text, hash FROM ursitoare.audit_head WHERE tenant_id = $1 FOR UPDATE";

export async function appendAudit(
  tx: TenantTx,
  ctx: TenantContext,
  event: AuditEventInput,
  opts?: AppendOptions,
): Promise<{ seq: bigint; hash: string }> {
  const valid = validateEvent(event);
  const at = (opts?.clock ?? systemClock).now();
  const atText = formatAt(at);
  try {
    const current = await tx.query<{ t: string | null }>(
      "SELECT nullif(current_setting('app.tenant_id', true), '') AS t",
    );
    const set = current.rows[0]?.t ?? null;
    if (set === null) {
      throw new AuditError("AUDIT_CONTEXT_MISMATCH", "audit context mismatch", { reason: "unset" });
    }
    if (set !== ctx.tenantId) {
      throw new AuditError("AUDIT_CONTEXT_MISMATCH", "audit context mismatch", { reason: "differs" });
    }
    let head = (await tx.query<HeadRow>(SELECT_HEAD, [ctx.tenantId])).rows[0];
    if (head === undefined) {
      await tx.query(
        "INSERT INTO ursitoare.audit_head (tenant_id, seq, hash) VALUES ($1, 0, $2) ON CONFLICT (tenant_id) DO NOTHING",
        [ctx.tenantId, GENESIS_HASH],
      );
      head = (await tx.query<HeadRow>(SELECT_HEAD, [ctx.tenantId])).rows[0];
    }
    if (head === undefined) {
      throw new AuditError("AUDIT_STORE_FAILED", "audit store failed", { sqlstate: "23503" });
    }
    const seq = BigInt(head.seq_text) + 1n;
    const hash = chainHash(head.hash, { tenantId: ctx.tenantId, seq, at: atText, ...valid });
    await tx.query("UPDATE ursitoare.audit_head SET seq = $2, hash = $3 WHERE tenant_id = $1", [
      ctx.tenantId,
      seq.toString(),
      hash,
    ]);
    await tx.query(
      "INSERT INTO ursitoare.audit_event (tenant_id, seq, at, prev_hash, hash, event_type, actor, target, payload, origin, mk_trace_id, mk_request_id, mk_jti) VALUES ($1, $2, $3::timestamptz, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13)",
      [
        ctx.tenantId,
        seq.toString(),
        at.toISOString(),
        head.hash,
        hash,
        valid.eventType,
        canonicalize(valid.actor),
        valid.target === null ? null : canonicalize(valid.target),
        canonicalize(valid.payload),
        valid.origin,
        valid.mkTraceId,
        valid.mkRequestId,
        valid.mkJti,
      ],
    );
    return { seq, hash: hash.toString("hex") };
  } catch (err) {
    throw wrapStoreError(err);
  }
}

export async function appendAuditCommitted(
  pool: TenantPool,
  ctx: TenantContext,
  event: AuditEventInput,
  opts?: AppendOptions,
): Promise<{ seq: bigint; hash: string }> {
  return withTenantTx(pool, ctx, (tx) => appendAudit(tx, ctx, event, opts));
}
