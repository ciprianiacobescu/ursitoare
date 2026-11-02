// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type IntentErrorCode = "INTENT_INVALID" | "INTENT_NOT_FOUND";

export class IntentError extends Error {
  readonly code: IntentErrorCode;

  constructor(_code: IntentErrorCode, message: string) {
    super(message);
    throw new Error("not implemented");
  }
}
