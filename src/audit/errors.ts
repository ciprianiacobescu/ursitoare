// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type AuditErrorCode =
  | "AUDIT_EVENT_INVALID"
  | "AUDIT_CANONICAL_INVALID"
  | "AUDIT_PAYLOAD_SECRET"
  | "AUDIT_CONTEXT_MISMATCH"
  | "AUDIT_STORE_FAILED"
  | "AUDIT_OPTIONS_INVALID"
  | "AUDIT_ANCHOR_KEY_INVALID"
  | "AUDIT_CHAIN_EMPTY"
  | "AUDIT_HEAD_MISMATCH"
  | "AUDIT_ANCHOR_CONFLICT";

export class AuditError extends Error {
  readonly code: AuditErrorCode;
  readonly details: Readonly<Record<string, string | number>>;
  constructor(_code: AuditErrorCode, message: string, _details?: Record<string, string | number>) {
    super(message);
    throw new Error("not implemented");
  }
}

// Module-internal: not exported from index.ts.
export function wrapStoreError(_err: unknown): unknown {
  throw new Error("not implemented");
}
