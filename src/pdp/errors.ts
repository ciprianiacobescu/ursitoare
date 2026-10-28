export type PdpErrorCode =
  | "PDP_OPTIONS_INVALID"
  | "PDP_SCHEMA_INVALID"
  | "PDP_POLICY_INVALID"
  | "PDP_DUPLICATE_ID"
  | "PDP_RECORD_INVALID"
  | "PDP_RECORD_FAILED";

export class PdpError extends Error {
  readonly code: PdpErrorCode;
  readonly details: Readonly<Record<string, string | readonly string[]>>;

  constructor(
    code: PdpErrorCode,
    message: string,
    details: Record<string, string | readonly string[]> = {},
  ) {
    super(message);
    this.name = "PdpError";
    this.code = code;
    this.details = details;
  }
}
