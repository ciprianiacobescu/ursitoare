import { systemClock } from "../core/index.ts";
import { withTenantTx, type TenantContext, type TenantPool } from "../tenancy/index.ts";
import type { AppendOptions } from "./append.ts";
import { AuditError, wrapStoreError } from "./errors.ts";
import { anchorMac, type KeyMaterial } from "./mac.ts";

export interface Anchor {
  tenantId: string;
  seq: bigint;
  hash: string;
  mac: string;
  at: Date;
}

interface AnchorRow {
  seq_text: string;
  hash: Buffer;
  mac: Buffer;
  at: Date;
}

const ANCHOR_COLUMNS = "seq::text AS seq_text, hash, mac, at";

function toAnchor(tenantId: string, row: AnchorRow): Anchor {
  return {
    tenantId,
    seq: BigInt(row.seq_text),
    hash: row.hash.toString("hex"),
    mac: row.mac.toString("hex"),
    at: row.at,
  };
}

export async function anchorHead(
  pool: TenantPool,
  ctx: TenantContext,
  engineKey: KeyMaterial,
  opts?: AppendOptions,
): Promise<Anchor> {
  // Validates the key before any query.
  anchorMac(engineKey, ctx.tenantId, 1n, "0".repeat(64));
  const clock = opts?.clock ?? systemClock;
  try {
    return await withTenantTx(pool, ctx, async (tx) => {
      const head = (
        await tx.query<{ seq_text: string; hash: Buffer }>(
          "SELECT seq::text AS seq_text, hash FROM ursitoare.audit_head WHERE tenant_id = $1",
          [ctx.tenantId],
        )
      ).rows[0];
      if (head === undefined || head.seq_text === "0") {
        throw new AuditError("AUDIT_CHAIN_EMPTY", "audit chain empty");
      }
      const event = (
        await tx.query<{ hash: Buffer }>(
          "SELECT hash FROM ursitoare.audit_event WHERE tenant_id = $1 AND seq = $2 ORDER BY at DESC LIMIT 1",
          [ctx.tenantId, head.seq_text],
        )
      ).rows[0];
      if (event === undefined || !event.hash.equals(head.hash)) {
        throw new AuditError("AUDIT_HEAD_MISMATCH", "audit head mismatch", { seq: head.seq_text });
      }
      const seq = BigInt(head.seq_text);
      const mac = anchorMac(engineKey, ctx.tenantId, seq, head.hash.toString("hex"));
      const inserted = await tx.query<AnchorRow>(
        `INSERT INTO ursitoare.audit_anchor (tenant_id, seq, hash, mac, at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (tenant_id, seq) DO NOTHING RETURNING ${ANCHOR_COLUMNS}`,
        [ctx.tenantId, head.seq_text, head.hash, Buffer.from(mac, "hex"), clock.now()],
      );
      const row = inserted.rows[0];
      if (row !== undefined) return toAnchor(ctx.tenantId, row);
      const stored = (
        await tx.query<AnchorRow>(
          `SELECT ${ANCHOR_COLUMNS} FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq = $2`,
          [ctx.tenantId, head.seq_text],
        )
      ).rows[0];
      if (stored === undefined || stored.mac.toString("hex") !== mac) {
        throw new AuditError("AUDIT_ANCHOR_CONFLICT", "audit anchor conflict", { seq: head.seq_text });
      }
      return toAnchor(ctx.tenantId, stored);
    });
  } catch (err) {
    throw wrapStoreError(err);
  }
}
