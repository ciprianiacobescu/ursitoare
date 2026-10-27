export type TenancyErrorCode =
  | "TENANT_INVALID"
  | "TENANT_CONTEXT_MISSING"
  | "TENANT_UNKNOWN"
  | "TENANT_ROUTE_CONFLICT"
  | "TENANT_ROUTE_RESERVED"
  | "TENANT_DEFAULT_CONFLICT"
  | "TENANT_BOOTSTRAP_FAILED"
  | "TENANT_TX_ABORTED";

export class TenancyError extends Error {
  readonly code: TenancyErrorCode;
  readonly details: Readonly<Record<string, string | number>>;

  constructor(code: TenancyErrorCode, message: string, details: Record<string, string | number> = {}) {
    super(message);
    this.name = "TenancyError";
    this.code = code;
    this.details = details;
  }
}
