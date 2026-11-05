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

const INTERPRETER_ERROR_CODES = [
  "INTERPRETER_VERSION_NOT_FOUND",
  "INTERPRETER_VERSION_NOT_RUNNABLE",
  "INTERPRETER_KIND_UNSUPPORTED",
  "INTERPRETER_UNBOUND",
  "INTERPRETER_REF_UNRESOLVED",
  "INTERPRETER_INPUT_INVALID",
  "INTERPRETER_OUTPUT_INVALID",
  "INTERPRETER_TOOL_FAILED",
  "INTERPRETER_EFFECT_UNKNOWN",
  "INTERPRETER_NO_INVOKER",
  "INTERPRETER_LOOP_LIMIT",
  "NODE_RUNTIME_DUPLICATE",
  "NODE_RUNTIME_INVALID",
  "FLOW_FAILED",
] as const satisfies readonly InterpreterErrorCode[];

function isInterpreterErrorCode(value: unknown): value is InterpreterErrorCode {
  return (
    typeof value === "string" && (INTERPRETER_ERROR_CODES as readonly string[]).includes(value)
  );
}

function isDetails(value: unknown): value is Record<string, string | string[]> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

export function toInterpreterError(value: unknown): InterpreterError | null {
  if (value instanceof InterpreterError) return value;
  const candidate = value as
    | { code?: unknown; message?: unknown; node?: unknown; details?: unknown }
    | null
    | undefined;
  if (!isInterpreterErrorCode(candidate?.code)) return null;
  const message =
    typeof candidate.message === "string" ? candidate.message : "node execution failed";
  const node = typeof candidate.node === "string" ? candidate.node : null;
  const details = isDetails(candidate.details) ? candidate.details : {};
  return new InterpreterError(candidate.code, message, node, details);
}
