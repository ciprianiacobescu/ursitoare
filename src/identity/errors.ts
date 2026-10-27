// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type IdentityErrorCode =
  | "IDENTITY_INVALID"
  | "IDENTITY_NO_ORGANIZATION"
  | "IDENTITY_AMBIGUOUS_ORGANIZATION"
  | "IDENTITY_UNKNOWN_TENANT"
  | "IDENTITY_IDP_TAKEN"
  | "IDENTITY_OWNER_REQUIRED"
  | "IDENTITY_USER_DISABLED"
  | "IDENTITY_OWNER_INVALID"
  | "IDENTITY_TENANT_MISMATCH";

export class IdentityError extends Error {
  readonly code: IdentityErrorCode;
  constructor(_code: IdentityErrorCode, message: string) {
    super(message);
    throw new Error("not implemented");
  }
}

// Module-internal: not exported from index.ts.
export function identityError(_code: IdentityErrorCode): IdentityError {
  throw new Error("not implemented");
}
