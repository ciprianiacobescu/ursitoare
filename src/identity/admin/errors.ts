export type AdminErrorCode =
  | "ADMIN_INVALID"
  | "ADMIN_NOT_FOUND"
  | "ADMIN_EXISTS"
  | "ADMIN_UNKNOWN_ISSUER"
  | "ADMIN_SELF_DISABLE"
  | "ADMIN_WRONG_KIND"
  | "ADMIN_TENANT_MISMATCH";

const MESSAGES: Record<AdminErrorCode, string> = {
  ADMIN_INVALID: "invalid admin input",
  ADMIN_NOT_FOUND: "admin target not found",
  ADMIN_EXISTS: "admin target already exists",
  ADMIN_UNKNOWN_ISSUER: "issuer is not routed to the tenant",
  ADMIN_SELF_DISABLE: "cannot disable oneself",
  ADMIN_WRONG_KIND: "account is of the wrong kind",
  ADMIN_TENANT_MISMATCH: "transaction tenant does not match the tenant context",
};

export class AdminError extends Error {
  readonly code: AdminErrorCode;
  constructor(code: AdminErrorCode, _message: string) {
    super(MESSAGES[code]);
    this.name = "AdminError";
    this.code = code;
  }
}

// Module-internal: not exported from index.ts.
export function adminError(code: AdminErrorCode): AdminError {
  return new AdminError(code, MESSAGES[code]);
}
