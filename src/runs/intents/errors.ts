export type IntentErrorCode = "INTENT_INVALID" | "INTENT_NOT_FOUND";

export class IntentError extends Error {
  readonly code: IntentErrorCode;

  constructor(code: IntentErrorCode, message: string) {
    super(message);
    this.name = "IntentError";
    this.code = code;
  }
}
