import { timingSafeEqual } from "node:crypto";
import { withTenantTx, type TenantContext, type TenantPool } from "../tenancy/index.ts";
import { AuditError } from "./errors.ts";
import { GENESIS_HASH, chainHash } from "./hash.ts";
import type { AuditOrigin } from "./hash.ts";
import { anchorMac } from "./mac.ts";
import type { KeyMaterial } from "./mac.ts";

interface AnchorRow {
  seq_text: string;
  hash: Buffer;
  mac: Buffer;
}

export interface ChainReport {
  ok: boolean;
  checked: number;
  firstBadSeq?: bigint;
  reason?: "hash" | "gap" | "anchor";
}

interface EventRow {
  seq_text: string;
  at_text: string;
  prev_hash: Buffer;
  hash: Buffer;
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
  origin: AuditOrigin;
  mk_trace_id: string | null;
  mk_request_id: string | null;
  mk_jti: string | null;
}

const AT_FORMAT = `to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export async function verifyChain(
  pool: TenantPool,
  ctx: TenantContext,
  opts?: { fromSeq?: bigint; engineKey?: KeyMaterial; batchSize?: number },
): Promise<ChainReport> {
  const fromSeq = opts?.fromSeq ?? 1n;
  if (typeof fromSeq !== "bigint" || fromSeq < 1n) {
    throw new AuditError("AUDIT_OPTIONS_INVALID", "audit options are invalid", { reason: "bad_from_seq" });
  }
  const batchSize = opts?.batchSize ?? 500;
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) {
    throw new AuditError("AUDIT_OPTIONS_INVALID", "audit options are invalid", { reason: "bad_batch_size" });
  }
  const engineKey = opts?.engineKey;
  if (engineKey !== undefined) {
    anchorMac(engineKey, ctx.tenantId, 1n, "0".repeat(64));
  }
  return withTenantTx(pool, ctx, async (tx) => {
    let anchors: AnchorRow[] = [];
    if (engineKey !== undefined) {
      const anchorRes = await tx.query<AnchorRow>(
        "SELECT seq::text AS seq_text, hash, mac FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq >= $2::bigint ORDER BY seq",
        [ctx.tenantId, fromSeq.toString()],
      );
      anchors = anchorRes.rows;
    }
    const anchorSeqs = new Set(anchors.map((a) => a.seq_text));
    const walkedHashes = new Map<string, Buffer>();
    const headRes = await tx.query<{ seq_text: string; hash: Buffer }>(
      "SELECT seq::text AS seq_text, hash FROM ursitoare.audit_head WHERE tenant_id = $1",
      [ctx.tenantId],
    );
    const head = headRes.rows[0];

    let prev: Buffer | null = GENESIS_HASH;
    if (fromSeq > 1n) {
      const before = await tx.query<{ hash: Buffer }>(
        "SELECT hash FROM ursitoare.audit_event WHERE tenant_id = $1 AND seq = $2::bigint ORDER BY at LIMIT 1",
        [ctx.tenantId, (fromSeq - 1n).toString()],
      );
      prev = before.rows[0]?.hash ?? null;
    }

    let checked = 0;
    let expected = fromSeq;
    let cursorSeq = (fromSeq - 1n).toString();
    let cursorAt: string | null = null;
    let lastHash: Buffer | null = null;
    for (;;) {
      const res: { rows: EventRow[] } = await tx.query<EventRow>(
        `SELECT seq::text AS seq_text, ${AT_FORMAT} AS at_text, prev_hash, hash, event_type, actor, target, payload, origin, mk_trace_id, mk_request_id, mk_jti
         FROM ursitoare.audit_event
         WHERE tenant_id = $1 AND (seq > $2::bigint OR (seq = $2::bigint AND $3::timestamptz IS NOT NULL AND at > $3::timestamptz))
         ORDER BY seq, at LIMIT $4`,
        [ctx.tenantId, cursorSeq, cursorAt, batchSize],
      );
      for (const row of res.rows) {
        const seq = BigInt(row.seq_text);
        if (seq !== expected) {
          return { ok: false, checked, firstBadSeq: expected, reason: "gap" };
        }
        const prevOk = (prev ?? row.prev_hash).equals(row.prev_hash);
        const computed = chainHash(row.prev_hash, {
          tenantId: ctx.tenantId,
          seq,
          at: row.at_text,
          eventType: row.event_type,
          actor: row.actor,
          target: row.target,
          payload: row.payload,
          origin: row.origin,
          mkTraceId: row.mk_trace_id,
          mkRequestId: row.mk_request_id,
          mkJti: row.mk_jti,
        });
        if (!prevOk || !computed.equals(row.hash)) {
          return { ok: false, checked, firstBadSeq: seq, reason: "hash" };
        }
        checked += 1;
        expected = seq + 1n;
        prev = row.hash;
        lastHash = row.hash;
        if (anchorSeqs.has(row.seq_text)) {
          walkedHashes.set(row.seq_text, row.hash);
        }
        cursorSeq = row.seq_text;
        cursorAt = row.at_text;
      }
      if (res.rows.length < batchSize) {
        break;
      }
    }

    if (head !== undefined) {
      const headSeq = BigInt(head.seq_text);
      if (headSeq >= fromSeq) {
        if (headSeq >= expected) {
          return { ok: false, checked, firstBadSeq: expected, reason: "gap" };
        }
        if (headSeq === expected - 1n && (lastHash === null || !lastHash.equals(head.hash))) {
          return { ok: false, checked, firstBadSeq: headSeq, reason: "hash" };
        }
      }
    }
    if (engineKey !== undefined) {
      for (const anchor of anchors) {
        const seq = BigInt(anchor.seq_text);
        const walked = walkedHashes.get(anchor.seq_text);
        const expectedMac = Buffer.from(anchorMac(engineKey, ctx.tenantId, seq, anchor.hash.toString("hex")), "hex");
        const macOk = anchor.mac.length === expectedMac.length && timingSafeEqual(anchor.mac, expectedMac);
        if (!macOk || walked === undefined || !walked.equals(anchor.hash)) {
          return { ok: false, checked, firstBadSeq: seq, reason: "anchor" };
        }
      }
    }
    return { ok: true, checked };
  });
}
