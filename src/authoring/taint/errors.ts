export const TAINT_LIMITS: {
  readonly maxNodes: number;
  readonly maxHookPairs: number;
  readonly maxEdges: number;
} = Object.freeze({ maxNodes: 5000, maxHookPairs: 200000, maxEdges: 100000 });

export type TaintErrorCode = "TAINT_TOO_LARGE";

export class TaintError extends Error {
  readonly code: TaintErrorCode;

  constructor(code: TaintErrorCode, message: string) {
    super(message);
    this.name = "TaintError";
    this.code = code;
  }
}
