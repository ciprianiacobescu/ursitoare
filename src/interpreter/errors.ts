// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type InterpreterErrorCode =
  | "INTERPRETER_VERSION_NOT_FOUND"
  | "INTERPRETER_VERSION_NOT_RUNNABLE"
  | "INTERPRETER_KIND_UNSUPPORTED"
  | "INTERPRETER_UNBOUND"
  | "INTERPRETER_REF_UNRESOLVED"
  | "INTERPRETER_INPUT_INVALID"
  | "INTERPRETER_OUTPUT_INVALID"
  | "INTERPRETER_TOOL_FAILED"
  | "INTERPRETER_EFFECT_UNKNOWN"
  | "INTERPRETER_NO_INVOKER"
  | "INTERPRETER_LOOP_LIMIT"
  | "NODE_RUNTIME_DUPLICATE"
  | "NODE_RUNTIME_INVALID"
  | "FLOW_FAILED";

export class InterpreterError extends Error {
  readonly code: InterpreterErrorCode;
  readonly node: string | null;
  readonly details: Readonly<Record<string, string | string[]>>;

  constructor(
    _code: InterpreterErrorCode,
    message: string,
    _node?: string | null,
    _details?: Record<string, string | string[]>,
  ) {
    super(message);
    throw new Error("not implemented");
  }
}
