import type { SandboxFaultCode } from "./types.ts";

export interface FaultFacts {
  stage: "args" | "compile" | "run" | "jobs" | "output" | "pending" | "host" | "watchdog" | "exit" | "spawn";
  error?: { name: string; message: string } | null;
  interrupted?: boolean;
  nearCeiling?: boolean;
  bytes?: number;
  maxBytes?: number;
  ms?: number;
  timeoutMs?: number;
  graceMs?: number;
}

const TIMEOUT_MESSAGE = "execution exceeded timeoutMs";
const NEVER_SETTLED_MESSAGE =
  "the code body returned a promise that can never settle (deadlock, or an out-of-memory failure swallowed inside a promise job)";
const CEILING_MESSAGE =
  "allocation failed at the Wasm memory ceiling (no exception object could be built)";
const JOB_QUEUE_MESSAGE = "guest heap exceeded memoryBytes (job queue)";

type Fault = { code: SandboxFaultCode; message: string };

function timeout(): Fault {
  return { code: "timeout", message: TIMEOUT_MESSAGE };
}

function errorValue(
  error: { name: string; message: string } | null | undefined,
  interrupted: boolean,
  nearCeiling: boolean,
): Fault {
  if (error === null || error === undefined || error.name === "NullThrown") {
    if (!interrupted && nearCeiling) {
      return { code: "memory_limit", message: CEILING_MESSAGE };
    }
    if (interrupted) return timeout();
    return { code: "runtime_error", message: "null was thrown" };
  }
  if (interrupted) return timeout();
  if (error.name === "InternalError" && error.message === "out of memory") {
    return { code: "memory_limit", message: "guest heap exceeded memoryBytes" };
  }
  if (
    (error.name === "InternalError" && error.message === "stack overflow") ||
    (error.name === "RangeError" && /Maximum call stack size exceeded/.test(error.message))
  ) {
    return { code: "stack_overflow", message: error.message };
  }
  if (error.name === "OutputTooLargeError") {
    return { code: "output_too_large", message: error.message };
  }
  if (error.name === "OutputError") {
    return { code: "output_invalid", message: error.message };
  }
  return { code: "runtime_error", message: `${error.name}: ${error.message}` };
}

function nameOf(error: { name: string; message: string } | null | undefined): string {
  return error?.name ?? "Error";
}

function messageOf(error: { name: string; message: string } | null | undefined): string {
  return error?.message ?? "";
}

export function classifyFault(facts: FaultFacts): Fault {
  const interrupted = facts.interrupted === true;
  const nearCeiling = facts.nearCeiling === true;
  const error = facts.error ?? null;

  switch (facts.stage) {
    case "args":
      return { code: "input_invalid", message: messageOf(error) };
    case "compile":
      if (interrupted) return timeout();
      if (error?.name === "SyntaxError") {
        return { code: "syntax_error", message: `SyntaxError: ${error.message}` };
      }
      return { code: "runtime_error", message: `${nameOf(error)}: ${messageOf(error)}` };
    case "jobs":
      if (error === null) {
        if (interrupted) return timeout();
        return { code: "memory_limit", message: JOB_QUEUE_MESSAGE };
      }
      return errorValue(error, interrupted, nearCeiling);
    case "run":
      return errorValue(error, interrupted, nearCeiling);
    case "output":
      if (interrupted) return timeout();
      if (facts.bytes !== undefined && facts.maxBytes !== undefined && facts.bytes > facts.maxBytes) {
        return {
          code: "output_too_large",
          message: `output is ${facts.bytes} bytes, limit ${facts.maxBytes}`,
        };
      }
      return errorValue(error, interrupted, nearCeiling);
    case "pending":
      if (interrupted) return timeout();
      return { code: "never_settled", message: NEVER_SETTLED_MESSAGE };
    case "host":
      return {
        code: "sandbox_crash",
        message: `${nameOf(error)}: ${messageOf(error).slice(0, 300)}`,
      };
    case "watchdog": {
      const ms = Math.round(facts.ms ?? 0);
      return {
        code: "timeout",
        message: `worker watchdog killed the sandbox after ${ms} ms (limit ${facts.timeoutMs} + grace ${facts.graceMs})`,
      };
    }
    case "exit":
      return { code: "sandbox_crash", message: "worker thread exited unexpectedly" };
    case "spawn":
      return { code: "sandbox_crash", message: "worker thread could not be started" };
  }
}
