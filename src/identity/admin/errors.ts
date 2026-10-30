// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type AdminErrorCode =
  | "ADMIN_INVALID"
  | "ADMIN_NOT_FOUND"
  | "ADMIN_EXISTS"
  | "ADMIN_UNKNOWN_ISSUER"
  | "ADMIN_SELF_DISABLE"
  | "ADMIN_WRONG_KIND"
  | "ADMIN_TENANT_MISMATCH";

export class AdminError extends Error {
  readonly code: AdminErrorCode;
  constructor(_code: AdminErrorCode, message: string) {
    super(message);
    throw new Error("not implemented");
  }
}
