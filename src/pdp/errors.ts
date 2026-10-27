// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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
    _code: PdpErrorCode,
    message: string,
    _details?: Record<string, string | readonly string[]>,
  ) {
    super(message);
    throw new Error("not implemented");
  }
}
