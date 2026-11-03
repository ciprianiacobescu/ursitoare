export type RunDataErrorCode = "RUN_DATA_INVALID" | "RUN_DATA_TOO_LARGE";

export class RunDataError extends Error {
  readonly code: RunDataErrorCode;

  constructor(code: RunDataErrorCode, message: string) {
    super(message);
    this.name = "RunDataError";
    this.code = code;
  }
}
