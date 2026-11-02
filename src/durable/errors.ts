// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type DurableErrorCode =
  | "DURABLE_UNAVAILABLE"
  | "DURABLE_INVALID"
  | "DURABLE_NOT_LAUNCHED"
  | "DURABLE_ALREADY_LAUNCHED"
  | "DURABLE_WORKFLOW_UNKNOWN";

export class DurableError extends Error {
  readonly code: DurableErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(_code: DurableErrorCode, message: string, _details?: Record<string, string>) {
    super(message);
    throw new Error("not implemented");
  }
}
