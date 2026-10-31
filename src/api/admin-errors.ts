import { AdminError, IdentityError, RbacError } from "../identity/index.ts";
import { ERROR_CODES } from "./error-codes.ts";
import { ApiError } from "./errors.ts";

interface Mapping {
  readonly code: string;
  readonly reason?: string;
}

const MAPPING: Readonly<Record<string, Mapping>> = {
  RBAC_INVALID: { code: "VALIDATION_FAILED" },
  IDENTITY_INVALID: { code: "VALIDATION_FAILED" },
  ADMIN_INVALID: { code: "VALIDATION_FAILED" },
  RBAC_NOT_FOUND: { code: "NOT_FOUND" },
  ADMIN_NOT_FOUND: { code: "NOT_FOUND" },
  RBAC_EXISTS: { code: "ALREADY_EXISTS" },
  ADMIN_EXISTS: { code: "ALREADY_EXISTS" },
  RBAC_IN_USE: { code: "IN_USE" },
  RBAC_ELEVATION: { code: "ELEVATION_REFUSED" },
  RBAC_UNKNOWN_ISSUER: { code: "UNKNOWN_ISSUER" },
  ADMIN_UNKNOWN_ISSUER: { code: "UNKNOWN_ISSUER" },
  ADMIN_SELF_DISABLE: { code: "OPERATION_REFUSED", reason: "self_disable" },
  ADMIN_WRONG_KIND: { code: "OPERATION_REFUSED", reason: "wrong_kind" },
  IDENTITY_OWNER_INVALID: { code: "OPERATION_REFUSED", reason: "owner_invalid" },
};

function domainCodeOf(error: unknown): string | undefined {
  if (
    error instanceof RbacError ||
    error instanceof AdminError ||
    error instanceof IdentityError
  ) {
    return error.code;
  }
  return undefined;
}

export function adminApiError(error: unknown): unknown {
  const domainCode = domainCodeOf(error);
  if (domainCode === undefined) return error;

  const mapping = MAPPING[domainCode];
  if (mapping === undefined) return error;

  const entry = ERROR_CODES[mapping.code];
  if (entry === undefined) return error;

  const details = mapping.reason === undefined ? undefined : { reason: mapping.reason };
  return new ApiError(entry.status, mapping.code, entry.message, details);
}
