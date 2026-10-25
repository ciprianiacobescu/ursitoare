// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type TenancyErrorCode =
  | "TENANT_INVALID"
  | "TENANT_CONTEXT_MISSING"
  | "TENANT_UNKNOWN"
  | "TENANT_ROUTE_CONFLICT"
  | "TENANT_ROUTE_RESERVED"
  | "TENANT_DEFAULT_CONFLICT"
  | "TENANT_BOOTSTRAP_FAILED";

export class TenancyError extends Error {
  readonly code: TenancyErrorCode;
  readonly details: Readonly<Record<string, string | number>>;
  constructor(_code: TenancyErrorCode, _message: string, _details?: Record<string, string | number>) {
    super();
    throw new Error("not implemented");
  }
}
