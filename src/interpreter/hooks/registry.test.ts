import assert from "node:assert/strict";
import { test } from "node:test";

import { InterpreterError, toInterpreterError } from "../errors.ts";
import { codeHookRunner } from "./code-runner.ts";
import { hookRunnerFor, registerHookRunner } from "./registry.ts";

function refusal(fn: () => void): { code: string; kind: unknown } {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof InterpreterError, "throws InterpreterError");
    return { code: String(error.code), kind: error.details["kind"] };
  }
  return { code: "NONE", kind: undefined };
}

test("C-c59f8602 a registered hook runner is answered by its kind", () => {
  assert.doesNotThrow(() => {
    registerHookRunner("code", codeHookRunner);
  });
  let code: unknown;
  let mystery: unknown = "unset";
  assert.doesNotThrow(() => {
    code = hookRunnerFor("code");
    mystery = hookRunnerFor("mystery");
  });
  assert.equal(code, codeHookRunner);
  assert.equal(mystery, undefined);
});

test("C-c59f8602 a second or invalid registration is refused with the kind", () => {
  assert.deepEqual(
    refusal(() => registerHookRunner("code", codeHookRunner)),
    { code: "HOOK_RUNNER_DUPLICATE", kind: "code" },
  );
  assert.deepEqual(
    refusal(() => registerHookRunner("llm" as "code", codeHookRunner)),
    { code: "HOOK_RUNNER_INVALID", kind: "llm" },
  );
  assert.deepEqual(
    refusal(() => registerHookRunner("code", {} as typeof codeHookRunner)),
    { code: "HOOK_RUNNER_INVALID", kind: "code" },
  );
  assert.deepEqual(
    refusal(() => registerHookRunner("block", {} as typeof codeHookRunner)),
    { code: "HOOK_RUNNER_INVALID", kind: "block" },
  );
});

test("C-c59f8602 each hook code converts to an InterpreterError of its own code", () => {
  const codes = [
    "HOOK_FAILED",
    "HOOK_ERROR",
    "HOOK_ACTION_INVALID",
    "HOOK_ACTION_FORBIDDEN",
    "HOOK_ROUTE_UNDECLARED",
    "HOOK_RETRY_EXHAUSTED",
    "HOOK_UNSUPPORTED",
    "HOOK_RUNNER_DUPLICATE",
    "HOOK_RUNNER_INVALID",
  ];
  for (const code of codes) {
    const converted = toInterpreterError(Object.assign(new Error("m"), { code }));
    assert.ok(converted instanceof InterpreterError, code);
    assert.equal(String(converted.code), code);
  }
});
