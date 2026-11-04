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
    code: InterpreterErrorCode,
    message: string,
    node?: string | null,
    details?: Record<string, string | string[]>,
  ) {
    super(message);
    this.name = "InterpreterError";
    this.code = code;
    this.node = node ?? null;
    this.details = details ?? {};
  }
}
