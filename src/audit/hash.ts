// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

export const GENESIS_HASH: Buffer = Buffer.alloc(0);

export function formatAt(_at: Date): string {
  throw new Error("not implemented");
}

export function canonicalEvent(_rec: AuditRecord): string {
  throw new Error("not implemented");
}

export function chainHash(_prevHash: Buffer, _rec: AuditRecord): Buffer {
  throw new Error("not implemented");
}
