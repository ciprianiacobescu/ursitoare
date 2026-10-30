// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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
  constructor(_code: RbacErrorCode, message: string) {
    super(message);
    throw new Error("not implemented");
  }
}
