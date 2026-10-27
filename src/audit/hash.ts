import { createHash } from "node:crypto";

import { canonicalize } from "./canonical.ts";
import { AuditError } from "./errors.ts";

export type AuditOrigin = "ursitoare" | "mintkey";

export interface AuditRecord {
  tenantId: string;
  seq: bigint;
  at: string;
  eventType: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
  origin: AuditOrigin;
  mkTraceId: string | null;
  mkRequestId: string | null;
  mkJti: string | null;
}

export const GENESIS_HASH: Buffer = Buffer.alloc(32);

const AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

function fail(reason: "bad_at" | "bad_prev_hash"): never {
  throw new AuditError("AUDIT_EVENT_INVALID", "audit event is invalid", { reason });
}

export function formatAt(at: Date): string {
  if (Number.isNaN(at.getTime())) {
    fail("bad_at");
  }
  const year = at.getUTCFullYear();
  if (year < 1970 || year > 9999) {
    fail("bad_at");
  }
  const iso = at.toISOString();
  return `${iso.slice(0, -1)}000Z`;
}

export function canonicalEvent(rec: AuditRecord): string {
  if (!AT_PATTERN.test(rec.at)) {
    fail("bad_at");
  }
  return canonicalize({
    tenant_id: rec.tenantId,
    seq: rec.seq.toString(),
    at: rec.at,
    event_type: rec.eventType,
    actor: rec.actor,
    target: rec.target,
    payload: rec.payload,
    origin: rec.origin,
    mk_trace_id: rec.mkTraceId,
    mk_request_id: rec.mkRequestId,
    mk_jti: rec.mkJti,
  });
}

export function chainHash(prevHash: Buffer, rec: AuditRecord): Buffer {
  if (!Buffer.isBuffer(prevHash) || prevHash.length !== 32) {
    fail("bad_prev_hash");
  }
  return createHash("sha256")
    .update(prevHash)
    .update(canonicalEvent(rec), "utf8")
    .digest();
}
