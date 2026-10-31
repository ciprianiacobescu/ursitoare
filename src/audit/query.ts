import { withTenantTx, type TenantContext, type TenantPool } from "../tenancy/index.ts";
import { AuditError } from "./errors.ts";

export interface AuditEventFilter {
  eventType?: string;
  actorId?: string;
  targetKind?: string;
  targetId?: string;
  afterSeq?: string;
  from?: string;
  to?: string;
}

export interface AuditEventRecord {
  seq: string;
  at: string;
  eventType: string;
  actor: { kind: "user" | "service" | "system"; id: string };
  target: { kind: string; id: string } | null;
  payload: Record<string, unknown>;
  origin: "ursitoare" | "mintkey";
  mk: { traceId: string | null; requestId: string | null; jti: string | null } | null;
  prevHash: string;
  hash: string;
}

const UTC_TIME_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3}|\.[0-9]{6})?Z$/;
const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]{0,18})$/;
const MAX_BIGINT = 9223372036854775807n;

const AT_FORMAT = `to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

interface EventRow {
  seq: string;
  at: string;
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
  origin: "ursitoare" | "mintkey";
  mk_trace_id: string | null;
  mk_request_id: string | null;
  mk_jti: string | null;
  prev_hash: string;
  hash: string;
}

function reject(reason: "bad_limit" | "bad_order" | "bad_filter" | "bad_position"): never {
  throw new AuditError("AUDIT_OPTIONS_INVALID", "audit options are invalid", { reason });
}

function isBoundedInt(text: string): boolean {
  return DECIMAL_PATTERN.test(text) && BigInt(text) <= MAX_BIGINT;
}

export function isUtcTime(text: string): boolean {
  if (typeof text !== "string" || !UTC_TIME_PATTERN.test(text)) {
    return false;
  }
  const date = new Date(`${text.slice(0, 19)}Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.toISOString().slice(0, 19) === text.slice(0, 19);
}

function isValidFilter(filter: AuditEventFilter): boolean {
  if (filter.eventType !== undefined && !EVENT_TYPE_PATTERN.test(filter.eventType)) {
    return false;
  }
  if (filter.targetKind !== undefined && !EVENT_TYPE_PATTERN.test(filter.targetKind)) {
    return false;
  }
  if (
    filter.actorId !== undefined &&
    (filter.actorId.length < 1 || filter.actorId.length > 200)
  ) {
    return false;
  }
  if (
    filter.targetId !== undefined &&
    (filter.targetId.length < 1 || filter.targetId.length > 200)
  ) {
    return false;
  }
  if (filter.afterSeq !== undefined && !isBoundedInt(filter.afterSeq)) {
    return false;
  }
  if (filter.from !== undefined && !isUtcTime(filter.from)) {
    return false;
  }
  if (filter.to !== undefined && !isUtcTime(filter.to)) {
    return false;
  }
  return true;
}

function toRecord(row: EventRow): AuditEventRecord {
  return {
    seq: row.seq,
    at: row.at,
    eventType: row.event_type,
    actor: row.actor as AuditEventRecord["actor"],
    target: row.target === null ? null : (row.target as { kind: string; id: string }),
    payload: row.payload as Record<string, unknown>,
    origin: row.origin,
    mk:
      row.origin === "mintkey"
        ? {
            traceId: row.mk_trace_id,
            requestId: row.mk_request_id,
            jti: row.mk_jti,
          }
        : null,
    prevHash: row.prev_hash,
    hash: row.hash,
  };
}

export async function listAuditEvents(
  pool: TenantPool,
  ctx: TenantContext,
  q: {
    filter?: AuditEventFilter;
    continueAfter?: string;
    order: "asc" | "desc";
    limit: number;
  },
): Promise<AuditEventRecord[]> {
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
    reject("bad_limit");
  }
  if (q.order !== "asc" && q.order !== "desc") {
    reject("bad_order");
  }
  const filter = q.filter ?? {};
  if (!isValidFilter(filter)) {
    reject("bad_filter");
  }
  const after = q.continueAfter;
  if (after !== undefined && !isBoundedInt(after)) {
    reject("bad_position");
  }

  const dir = q.order === "desc" ? "DESC" : "ASC";
  const params: unknown[] = [ctx.tenantId];
  const where: string[] = ["tenant_id = $1"];

  if (filter.eventType !== undefined) {
    params.push(filter.eventType);
    where.push(`event_type = $${params.length}`);
  }
  if (filter.actorId !== undefined) {
    params.push(filter.actorId);
    where.push(`actor ->> 'id' = $${params.length}`);
  }
  if (filter.targetKind !== undefined) {
    params.push(filter.targetKind);
    where.push(`target ->> 'kind' = $${params.length}`);
  }
  if (filter.targetId !== undefined) {
    params.push(filter.targetId);
    where.push(`target ->> 'id' = $${params.length}`);
  }
  if (filter.afterSeq !== undefined) {
    params.push(filter.afterSeq);
    where.push(`seq > $${params.length}::bigint`);
  }
  if (filter.from !== undefined) {
    params.push(filter.from);
    where.push(`at >= $${params.length}::timestamptz`);
  }
  if (filter.to !== undefined) {
    params.push(filter.to);
    where.push(`at < $${params.length}::timestamptz`);
  }
  if (after !== undefined) {
    params.push(after);
    where.push(`seq ${q.order === "desc" ? "<" : ">"} $${params.length}::bigint`);
  }
  params.push(q.limit);

  return withTenantTx(pool, ctx, async (tx) => {
    const res = await tx.query<EventRow>(
      `SELECT seq::text AS seq, ${AT_FORMAT} AS at, event_type, actor, target, payload, origin,
              mk_trace_id, mk_request_id, mk_jti, encode(prev_hash, 'hex') AS prev_hash, encode(hash, 'hex') AS hash
       FROM ursitoare.audit_event
       WHERE ${where.join(" AND ")}
       ORDER BY seq ${dir}, at ${dir}
       LIMIT $${params.length}`,
      params,
    );
    return res.rows.map(toRecord);
  });
}

export async function countAnchors(
  pool: TenantPool,
  ctx: TenantContext,
  fromSeq: bigint,
): Promise<number> {
  if (typeof fromSeq !== "bigint" || fromSeq < 1n) {
    throw new AuditError("AUDIT_OPTIONS_INVALID", "audit options are invalid", {
      reason: "bad_from_seq",
    });
  }
  return withTenantTx(pool, ctx, async (tx) => {
    const res = await tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq >= $2::bigint",
      [ctx.tenantId, fromSeq],
    );
    return res.rows[0]?.count ?? 0;
  });
}
