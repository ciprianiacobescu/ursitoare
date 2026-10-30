// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../tenancy/index.ts";

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

export function isUtcTime(_text: string): boolean {
  throw new Error("not implemented");
}

export async function listAuditEvents(
  _pool: TenantPool,
  _ctx: TenantContext,
  _q: {
    filter?: AuditEventFilter;
    continueAfter?: string;
    order: "asc" | "desc";
    limit: number;
  },
): Promise<AuditEventRecord[]> {
  throw new Error("not implemented");
}

export async function countAnchors(
  _pool: TenantPool,
  _ctx: TenantContext,
  _fromSeq: bigint,
): Promise<number> {
  throw new Error("not implemented");
}
