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
  constructor(code: IdentityErrorCode, message: string) {
    super(message);
    this.name = "IdentityError";
    this.code = code;
  }
}

const MESSAGES: Record<IdentityErrorCode, string> = {
  IDENTITY_INVALID: "invalid identity input",
  IDENTITY_NO_ORGANIZATION: "token has no usable organization",
  IDENTITY_AMBIGUOUS_ORGANIZATION: "token names more than one organization",
  IDENTITY_UNKNOWN_TENANT: "tenant not found",
  IDENTITY_IDP_TAKEN: "identity provider already routed",
  IDENTITY_OWNER_REQUIRED: "owner connection required",
  IDENTITY_USER_DISABLED: "user cannot sign in",
  IDENTITY_OWNER_INVALID: "owner must be an active human user",
  IDENTITY_TENANT_MISMATCH: "transaction tenant does not match the tenant context",
};

// Module-internal: not exported from index.ts.
export function identityError(code: IdentityErrorCode): IdentityError {
  return new IdentityError(code, MESSAGES[code]);
}
