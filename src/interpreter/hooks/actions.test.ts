import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookPlacement, JsonValue, NodeMeta } from "../../authoring/index.ts";
import { InterpreterError } from "../errors.ts";
import { checkHookAction, normalizeHookReturn } from "./actions.ts";
import type { HookActionVerdict, HookOutcome } from "./types.ts";

const LABEL = "n:pre:h";

function ok<T>(fn: () => T): T | undefined {
  let value: T | undefined;
  assert.doesNotThrow(() => {
    value = fn();
  });
  return value;
}

function nested(depth: number): JsonValue {
  let value: JsonValue = { leaf: 1 };
  for (let i = 1; i < depth; i += 1) value = { next: value };
  return value;
}

function normalized(value: unknown): HookOutcome | undefined {
  return ok(() => normalizeHookReturn(value as JsonValue | null, LABEL));
}

function invalid(value: unknown): { code: string; details: Record<string, unknown> } | null {
  try {
    normalizeHookReturn(value as JsonValue | null, LABEL);
  } catch (error) {
    assert.ok(error instanceof InterpreterError, "InterpreterError");
    return { code: String(error.code), details: { ...error.details } };
  }
  return null;
}

test("C-01455379 normalizeHookReturn turns null and an empty object into continue", () => {
  assert.deepEqual(normalized(null), { action: "continue" });
  assert.deepEqual(normalized({}), { action: "continue" });
});

test("C-01455379 normalizeHookReturn keeps a valid action as given", () => {
  const deep = { action: "continue", output: nested(64) };
  const rows: unknown[] = [
    { action: "continue", input: { a: 1 } },
    { action: "skip", output: { a: 1 } },
    { action: "redirect", to: "review" },
    { action: "retry", input: { a: 1 }, feedback: "f" },
    { action: "fail", reason: "no" },
    deep,
  ];
  for (const row of rows) assert.deepEqual(normalized(row), row);
});

test("C-01455379 normalizeHookReturn refuses a non-object and an unknown action", () => {
  for (const value of [[], 5, "s"]) {
    assert.deepEqual(invalid(value), {
      code: "HOOK_ACTION_INVALID",
      details: { hook: LABEL, reason: "not_object" },
    });
  }
  for (const value of [{ action: "explode" }, { x: 1 }]) {
    assert.deepEqual(invalid(value), {
      code: "HOOK_ACTION_INVALID",
      details: { hook: LABEL, reason: "unknown_action" },
    });
  }
});

test("C-01455379 normalizeHookReturn refuses a bad skip, redirect or fail", () => {
  const rows: [unknown, string][] = [
    [{ action: "skip" }, "skip_output"],
    [{ action: "skip", output: [1] }, "skip_output"],
    [{ action: "redirect", to: 5 }, "redirect_to"],
    [{ action: "redirect", to: "Bad Id" }, "redirect_to"],
    [{ action: "fail" }, "fail_reason"],
    [{ action: "fail", reason: "x".repeat(201) }, "fail_reason"],
    [{ action: "fail", reason: "a\u0000b" }, "fail_reason"],
    [{ action: "fail", reason: "a\ud800b" }, "fail_reason"],
  ];
  for (const [value, reason] of rows) {
    assert.deepEqual(
      invalid(value),
      { code: "HOOK_ACTION_INVALID", details: { hook: LABEL, reason } },
      reason,
    );
  }
});

test("C-01455379 normalizeHookReturn refuses a payload that cannot be stored", () => {
  const bad: unknown[] = ["a\u0000b", "a\ud800b", nested(65)];
  for (const payload of bad) {
    for (const [action, member] of [
      ["continue", "input"],
      ["continue", "output"],
      ["retry", "feedback"],
    ] as const) {
      const got = invalid({ action, [member]: payload });
      assert.equal(got?.code, "HOOK_ACTION_INVALID", member);
      assert.equal(got?.details["hook"], LABEL, member);
      assert.equal(got?.details["keyword"], "payload", member);
    }
  }
});

function node(kind: string, effect: NodeMeta["effect"]): NodeMeta {
  return { id: "n", kind, effect, tags: [] };
}

const B_R = node("block", "read");
const B_P = node("block", "pay");
const B_S = node("block", "send");
const B_N = node("block", null);
const C = node("code", "read");
const S = node("switch", "read");
const W = node("wait", "read");
const E = node("end", "read");

function hook(
  phase: "pre" | "post",
  extra: Record<string, unknown> = {},
): HookPlacement {
  return {
    phase,
    hook: { kind: "code", source: "return;", ...extra } as unknown as HookPlacement["hook"],
    ruleId: null,
    label: "h",
  };
}

const ALLOWED: HookActionVerdict = { allowed: true };
const forbidden = (what: string): HookActionVerdict => ({
  allowed: false,
  code: "HOOK_ACTION_FORBIDDEN",
  what,
});
const undeclared = (what: string): HookActionVerdict => ({
  allowed: false,
  code: "HOOK_ROUTE_UNDECLARED",
  what,
});

function verdict(p: HookPlacement, outcome: HookOutcome, meta: NodeMeta): HookActionVerdict | undefined {
  return ok(() => checkHookAction(p, outcome, meta));
}

function expectAll(
  p: HookPlacement,
  outcome: HookOutcome,
  nodes: NodeMeta[],
  want: HookActionVerdict,
): void {
  for (const meta of nodes) {
    assert.deepEqual(verdict(p, outcome, meta), want, `${p.phase} ${outcome.action} ${meta.kind}/${String(meta.effect)}`);
  }
}

test("C-01455379 checkHookAction in a pre-hook allows continue and refuses output", () => {
  const pre = hook("pre");
  expectAll(pre, { action: "continue" }, [B_R, B_P, C, S, W, E], ALLOWED);
  expectAll(pre, { action: "continue", input: { a: 1 } }, [B_R, B_P, C, S, W, E], ALLOWED);
  expectAll(pre, { action: "continue", output: { a: 1 } }, [C], forbidden("mutate output in a pre-hook"));
});

test("C-01455379 checkHookAction in a pre-hook allows skip on read blocks and code only", () => {
  const pre = hook("pre");
  const skip: HookOutcome = { action: "skip", output: { a: 1 } };
  expectAll(pre, skip, [B_R, C], ALLOWED);
  expectAll(pre, skip, [B_P, S, W, E, B_N], forbidden("skip"));
  expectAll(pre, { action: "redirect", to: "x" }, [C], forbidden("redirect"));
  expectAll(hook("pre", { max_retries: 2 }), { action: "retry" }, [C], forbidden("retry"));
});

test("C-01455379 checkHookAction in a post-hook limits output, input and skip", () => {
  const post = hook("post");
  const out: HookOutcome = { action: "continue", output: { a: 1 } };
  expectAll(post, out, [C, B_R, B_S, B_P, B_N], ALLOWED);
  expectAll(post, out, [S, W], forbidden("mutate output"));
  expectAll(post, { action: "continue", input: { a: 1 } }, [C], forbidden("mutate input in a post-hook"));
  expectAll(post, { action: "skip", output: { a: 1 } }, [C], forbidden("skip in a post-hook"));
  expectAll(post, { action: "fail", reason: "no" }, [B_R, B_P, C, S, W, E], ALLOWED);
});

test("C-01455379 checkHookAction in a post-hook redirects within routes only", () => {
  const post = hook("post", { routes: ["review"] });
  const to: HookOutcome = { action: "redirect", to: "review" };
  expectAll(post, to, [C, S, W, B_R, B_S, B_P, B_N], ALLOWED);
  expectAll(post, to, [node("human.approval", "read")], forbidden("redirect"));
  expectAll(post, { action: "redirect", to: "other" }, [C], undeclared("redirect"));
  expectAll(hook("post"), to, [C], undeclared("redirect"));
});

test("C-01455379 checkHookAction in a post-hook retries only where it is safe", () => {
  const retry: HookOutcome = { action: "retry" };
  const post = hook("post", { max_retries: 2 });
  expectAll(post, retry, [C, B_R], ALLOWED);
  expectAll(post, retry, [S, W], forbidden("retry"));
  expectAll(post, retry, [B_P, B_S], forbidden("retry"));
  expectAll(hook("post"), retry, [C], forbidden("retry (no max_retries)"));
});

test("C-01455379 checkHookAction allows an effect retry only with the flag and never on pay", () => {
  const retry: HookOutcome = { action: "retry" };
  const flagged = hook("post", { max_retries: 2, allow_effect_retry: true });
  expectAll(flagged, retry, [B_S], ALLOWED);
  expectAll(flagged, retry, [B_P], forbidden("retry"));
  expectAll(hook("post", { max_retries: 2 }), retry, [B_N], forbidden("retry"));
  expectAll(flagged, retry, [B_N], ALLOWED);
  expectAll(hook("pre"), { action: "skip", output: { a: 1 } }, [B_N], forbidden("skip"));
});
