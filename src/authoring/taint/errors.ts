// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const TAINT_LIMITS: {
  readonly maxNodes: number;
  readonly maxHookPairs: number;
  readonly maxEdges: number;
} = { maxNodes: 0, maxHookPairs: 0, maxEdges: 0 };

export type TaintErrorCode = "TAINT_TOO_LARGE";

export class TaintError extends Error {
  readonly code: TaintErrorCode;

  constructor(_code: TaintErrorCode, message: string) {
    super(message);
    throw new Error("not implemented");
  }
}
