export type RbacErrorCode =
  | "RBAC_INVALID"
  | "RBAC_NOT_FOUND"
  | "RBAC_EXISTS"
  | "RBAC_IN_USE"
  | "RBAC_ELEVATION"
  | "RBAC_DIRECT_GRANT_REFUSED"
  | "RBAC_UNKNOWN_ISSUER"
  | "RBAC_TENANT_MISMATCH"
  | "RBAC_TOO_MANY_MEMBERSHIPS";

export class RbacError extends Error {
  readonly code: RbacErrorCode;
  constructor(code: RbacErrorCode, message: string) {
    super(message);
    this.name = "RbacError";
    this.code = code;
  }
}

const MESSAGES: Record<RbacErrorCode, string> = {
  RBAC_INVALID: "invalid rbac input",
  RBAC_NOT_FOUND: "rbac target not found",
  RBAC_EXISTS: "rbac target already exists",
  RBAC_IN_USE: "rbac target is in use",
  RBAC_ELEVATION: "rbac elevation refused",
  RBAC_DIRECT_GRANT_REFUSED: "direct role grant refused",
  RBAC_UNKNOWN_ISSUER: "issuer is not routed to the tenant",
  RBAC_TENANT_MISMATCH: "transaction tenant does not match the tenant context",
  RBAC_TOO_MANY_MEMBERSHIPS: "too many memberships",
};

// Module-internal: not exported from index.ts.
export function rbacError(code: RbacErrorCode): RbacError {
  return new RbacError(code, MESSAGES[code]);
}
