import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyFault } from "./index.ts";
import type { FaultFacts, SandboxFaultCode } from "./index.ts";

interface Vector {
  id: string;
  facts: FaultFacts;
  code: SandboxFaultCode;
  message: string;
}

function E(name: string, message: string): { name: string; message: string } {
  return { name, message };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      deepFreeze((value as unknown as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

type Answer =
  | { ok: true; value: { code: SandboxFaultCode; message: string } }
  | { ok: false; error: unknown };

// Turns a throwing stub into a value, so a missing behaviour fails on the comparison below.
function attempt(facts: FaultFacts): Answer {
  try {
    return { ok: true, value: classifyFault(facts) };
  } catch (error) {
    return { ok: false, error };
  }
}

test("C-9712a346 classifyFault matches each classification vector twice on frozen facts", () => {
  const timeoutMessage = "execution exceeded timeoutMs";
  const neverSettledMessage =
    "the code body returned a promise that can never settle (deadlock, or an out-of-memory failure swallowed inside a promise job)";
  const ceilingMessage =
    "allocation failed at the Wasm memory ceiling (no exception object could be built)";
  const vectors: readonly Vector[] = [
    {
      id: "R1",
      facts: { stage: "args", error: E("code", "code must be a string") },
      code: "input_invalid",
      message: "code must be a string",
    },
    {
      id: "R2",
      facts: { stage: "compile", error: E("InternalError", "interrupted"), interrupted: true },
      code: "timeout",
      message: timeoutMessage,
    },
    {
      id: "R3",
      facts: { stage: "compile", error: E("SyntaxError", "expecting ';'") },
      code: "syntax_error",
      message: "SyntaxError: expecting ';'",
    },
    {
      id: "R4",
      facts: { stage: "compile", error: E("InternalError", "out of memory") },
      code: "runtime_error",
      message: "InternalError: out of memory",
    },
    {
      id: "R5",
      facts: { stage: "jobs", error: null },
      code: "memory_limit",
      message: "guest heap exceeded memoryBytes (job queue)",
    },
    {
      id: "R6a",
      facts: { stage: "jobs", error: null, interrupted: true },
      code: "timeout",
      message: timeoutMessage,
    },
    {
      id: "R6b",
      facts: { stage: "jobs", error: E("InternalError", "stack overflow") },
      code: "stack_overflow",
      message: "stack overflow",
    },
    {
      id: "R7a",
      facts: { stage: "output", interrupted: true, bytes: 10, maxBytes: 100 },
      code: "timeout",
      message: timeoutMessage,
    },
    {
      id: "R7b",
      facts: { stage: "pending", interrupted: true },
      code: "timeout",
      message: timeoutMessage,
    },
    {
      id: "R8",
      facts: { stage: "run", error: E("Error", "boom") },
      code: "runtime_error",
      message: "Error: boom",
    },
    {
      id: "R9",
      facts: { stage: "output", bytes: 98, maxBytes: 97 },
      code: "output_too_large",
      message: "output is 98 bytes, limit 97",
    },
    {
      id: "R10",
      facts: { stage: "pending" },
      code: "never_settled",
      message: neverSettledMessage,
    },
    {
      id: "R11",
      facts: { stage: "host", error: E("RangeError", "m".repeat(400)) },
      code: "sandbox_crash",
      message: "RangeError: " + "m".repeat(300),
    },
    {
      id: "R12a",
      facts: { stage: "watchdog", ms: 300.6, timeoutMs: 50, graceMs: 250 },
      code: "timeout",
      message: "worker watchdog killed the sandbox after 301 ms (limit 50 + grace 250)",
    },
    {
      id: "R12b",
      facts: { stage: "exit" },
      code: "sandbox_crash",
      message: "worker thread exited unexpectedly",
    },
    {
      id: "R12c",
      facts: { stage: "spawn" },
      code: "sandbox_crash",
      message: "worker thread could not be started",
    },
    {
      id: "V1a",
      facts: { stage: "run", error: E("NullThrown", ""), nearCeiling: true },
      code: "memory_limit",
      message: ceilingMessage,
    },
    {
      id: "V1b",
      facts: { stage: "run", error: null, interrupted: true, nearCeiling: true },
      code: "timeout",
      message: timeoutMessage,
    },
    {
      id: "V1c",
      facts: { stage: "run", error: E("NullThrown", "") },
      code: "runtime_error",
      message: "null was thrown",
    },
    {
      id: "V2",
      facts: { stage: "run", error: E("InternalError", "out of memory"), interrupted: true },
      code: "timeout",
      message: timeoutMessage,
    },
    {
      id: "V3",
      facts: { stage: "run", error: E("InternalError", "out of memory") },
      code: "memory_limit",
      message: "guest heap exceeded memoryBytes",
    },
    {
      id: "V4a",
      facts: { stage: "run", error: E("InternalError", "stack overflow") },
      code: "stack_overflow",
      message: "stack overflow",
    },
    {
      id: "V4b",
      facts: { stage: "run", error: E("RangeError", "Maximum call stack size exceeded") },
      code: "stack_overflow",
      message: "Maximum call stack size exceeded",
    },
    {
      id: "V5",
      facts: { stage: "run", error: E("OutputTooLargeError", "output exceeds size limit") },
      code: "output_too_large",
      message: "output exceeds size limit",
    },
    {
      id: "V6",
      facts: {
        stage: "run",
        error: E("OutputError", "output is not JSON-serializable at $: toJSON present"),
      },
      code: "output_invalid",
      message: "output is not JSON-serializable at $: toJSON present",
    },
    {
      id: "V7",
      facts: { stage: "run", error: E("InternalError", "x") },
      code: "runtime_error",
      message: "InternalError: x",
    },
  ];

  assert.equal(vectors.length, 26);

  for (const vector of vectors) {
    const facts = deepFreeze(vector.facts);
    const first = attempt(facts);
    if (!first.ok) {
      assert.fail(`${vector.id} threw on the first call: ${String(first.error)}`);
    }
    const second = attempt(facts);
    if (!second.ok) {
      assert.fail(`${vector.id} threw on the second call: ${String(second.error)}`);
    }
    const expected = { code: vector.code, message: vector.message };
    assert.deepEqual(first.value, expected, vector.id);
    assert.deepEqual(second.value, expected, vector.id);
    assert.deepEqual(second.value, first.value, vector.id);
  }
});
