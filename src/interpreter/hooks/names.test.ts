import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { HookPlacement } from "../../authoring/index.ts";
import { hookPlacements } from "../../authoring/index.ts";
import { createFaultPoints } from "../../config/index.ts";
import { loadHookFlow } from "../../../test/support/hook-flows/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { InterpreterError } from "../errors.ts";
import { attemptStepName, hookSlot, hookStepName, isFusable, splitFused } from "./names.ts";

function place(
  phase: "pre" | "post",
  label: string,
  hook: Record<string, unknown> = {},
  ruleId: string | null = null,
): HookPlacement {
  return {
    phase,
    hook: { kind: "code", source: "return;", ...hook } as unknown as HookPlacement["hook"],
    ruleId,
    label,
  };
}

function fusable(phase: "pre" | "post", label: string): HookPlacement {
  return place(phase, label);
}

function plain(phase: "pre" | "post", label: string): HookPlacement {
  return place(phase, label, { routes: ["x"] });
}

function run<T>(fn: () => T): T | undefined {
  let value: T | undefined;
  assert.doesNotThrow(() => {
    value = fn();
  });
  return value;
}

function labels(list: readonly HookPlacement[] | undefined): string[] {
  return (list ?? []).map((p) => p.label);
}

test("C-01455379 hookStepName joins node, phase and label", () => {
  const pre = place("pre", "rule.rule_a", {}, "rule_a");
  const post = place("post", "fix_subject");
  assert.equal(run(() => hookStepName("pay", pre)), "pay:pre:rule.rule_a");
  assert.equal(run(() => hookStepName("send", post)), "send:post:fix_subject");
});

test("C-01455379 hook step names are valid fault points", () => {
  const markerDir = mkdtempSync(join(tmpdir(), "hook-names-"));
  const names = [
    run(() => hookStepName("pay", place("pre", "rule.rule_a", {}, "rule_a"))),
    run(() => hookStepName("send", place("post", "fix_subject"))),
  ];
  assert.deepEqual(names, ["pay:pre:rule.rule_a", "send:post:fix_subject"]);
  for (const name of names) {
    assert.doesNotThrow(() => {
      createFaultPoints({ armed: [`after:${String(name)}`], markerDir, kill: () => {} });
    });
  }
});

test("C-01455379 attemptStepName appends the attempt after the first", () => {
  assert.equal(run(() => attemptStepName("send", 1)), "send");
  assert.equal(run(() => attemptStepName("send#done", 2)), "send#done:r2");
  assert.equal(run(() => attemptStepName("pay:post:rule.rule_a", 3)), "pay:post:rule.rule_a:r3");
});

test("C-01455379 isFusable holds for a plain code hook only", () => {
  const block = place("pre", "b", { kind: "block", uses: "erp.lookup_vendor@1" });
  const got = [
    run(() => isFusable(place("pre", "a"))),
    run(() => isFusable(place("pre", "a", { routes: ["x"] }))),
    run(() => isFusable(place("pre", "a", { routes: [] }))),
    run(() => isFusable(place("pre", "a", { max_retries: 1 }))),
    run(() => isFusable(block)),
  ];
  assert.deepEqual(got, [true, false, false, false, false]);
});

test("C-01455379 splitFused takes the fusable suffix of pre and prefix of post", () => {
  const f = (l: string) => fusable("pre", l);
  const n = (l: string) => plain("pre", l);
  const a = run(() => splitFused({ pre: [f("f1"), f("f2"), f("f3")], post: [] }));
  assert.deepEqual(labels(a?.ownPre), []);
  assert.deepEqual(labels(a?.fusedPre), ["f1", "f2", "f3"]);
  const b = run(() => splitFused({ pre: [n("n1"), f("f1"), n("n2"), f("f2")], post: [] }));
  assert.deepEqual(labels(b?.ownPre), ["n1", "f1", "n2"]);
  assert.deepEqual(labels(b?.fusedPre), ["f2"]);
  const c = run(() => splitFused({ pre: [f("f1"), f("f2"), n("n1")], post: [] }));
  assert.deepEqual(labels(c?.ownPre), ["f1", "f2", "n1"]);
  assert.deepEqual(labels(c?.fusedPre), []);
});

test("C-01455379 splitFused takes the fusable prefix of post", () => {
  const f = (l: string) => fusable("post", l);
  const n = (l: string) => plain("post", l);
  const a = run(() => splitFused({ pre: [], post: [f("f1"), n("n1"), f("f2")] }));
  assert.deepEqual(labels(a?.fusedPost), ["f1"]);
  assert.deepEqual(labels(a?.ownPost), ["n1", "f2"]);
  const b = run(() => splitFused({ pre: [], post: [n("n1"), f("f1")] }));
  assert.deepEqual(labels(b?.fusedPost), []);
  assert.deepEqual(labels(b?.ownPost), ["n1", "f1"]);
});

test("C-01455379 splitFused of empty lists gives four empty arrays", () => {
  const empty = run(() => splitFused({ pre: [], post: [] }));
  assert.deepEqual(empty, { ownPre: [], fusedPre: [], fusedPost: [], ownPost: [] });
  const one = run(() => splitFused({ pre: [fusable("pre", "f1")], post: [] }));
  assert.deepEqual(labels(one?.fusedPre), ["f1"]);
});

test("C-01455379 hookSlot is the 1-based position in pre then post", () => {
  const catalogue = loadTestCatalogue();
  const flow = loadHookFlow("s09-onion");
  const pay = hookPlacements(flow, "pay", catalogue);
  const all = [...pay.pre, ...pay.post];
  assert.equal(all.length, 6);
  const slots = all.map((p) => run(() => hookSlot(pay, p)));
  assert.deepEqual(slots, [1, 2, 3, 4, 5, 6]);
});

test("C-01455379 hookSlot of a placement of another node throws HOOK_ERROR", () => {
  const catalogue = loadTestCatalogue();
  const flow = loadHookFlow("s09-onion");
  const pay = hookPlacements(flow, "pay", catalogue);
  const other = hookPlacements(flow, "fetch_invoice", catalogue).pre[0];
  assert.ok(other !== undefined);
  let error: unknown;
  try {
    hookSlot(pay, other);
  } catch (e) {
    error = e;
  }
  assert.ok(error instanceof InterpreterError, "InterpreterError");
  assert.equal(String(error.code), "HOOK_ERROR");
  assert.deepEqual({ ...error.details }, { reason: "slot_missing" });
});
