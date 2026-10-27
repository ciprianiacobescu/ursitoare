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

  constructor(code: AuditErrorCode, message: string, details: Record<string, string | number> = {}) {
    super(message);
    this.name = "AuditError";
    this.code = code;
    this.details = details;
  }
}

// Module-internal: not exported from index.ts.
export function wrapStoreError(err: unknown): unknown {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return new AuditError("AUDIT_STORE_FAILED", "audit store failed", { sqlstate: code });
    }
  }
  return err;
}
