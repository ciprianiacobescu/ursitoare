// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type RunDataErrorCode = "RUN_DATA_INVALID" | "RUN_DATA_TOO_LARGE";

export class RunDataError extends Error {
  readonly code: RunDataErrorCode;

  constructor(_code: RunDataErrorCode, message: string) {
    super(message);
    throw new Error("not implemented");
  }
}
