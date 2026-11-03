export type DurableErrorCode =
  | "DURABLE_UNAVAILABLE"
  | "DURABLE_INVALID"
  | "DURABLE_NOT_LAUNCHED"
  | "DURABLE_ALREADY_LAUNCHED"
  | "DURABLE_WORKFLOW_UNKNOWN";

export class DurableError extends Error {
  readonly code: DurableErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(code: DurableErrorCode, message: string, details: Record<string, string> = {}) {
    super(message);
    this.name = "DurableError";
    this.code = code;
    this.details = details;
  }
}
