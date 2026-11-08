/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { hookRows, hookTraceNote, parseStepHooks } from "./hook-rows.ts";
import type { HookEntryView, HookRowView, StepHooksView } from "./hook-rows.ts";
import { parseStepView } from "./types.ts";
import type { StepView } from "./types.ts";

const D = (c: string): string => c.repeat(64);
const K = "ik" + "1_" + "e".repeat(64);
const NOTE = "This step's hook trace could not be read.";

type StepWithHooks = StepView & { hooks?: StepHooksView | null };

const G: HookEntryView = {
  label: "pre:guard",
  kind: "code",
  fused: true,
  attempt: 1,
  state: "completed",
  action: "continue",
  mutated: null,
  to: null,
  error: null,
  tool: null,
  idemKey: null,
};

const N: HookEntryView = {
  label: "post:notify",
  kind: "block",
  fused: false,
  attempt: 1,
  state: "completed",
  action: null,
  mutated: null,
  to: null,
  error: null,
  tool: "slack.post_message@1",
  idemKey: K,
};

const STEP: StepView = {
  seq: 3,
  nodeId: "pay",
  kind: "block",
  effectSeq: 0,
  attempt: 1,
  state: "completed",
  outcome: null,
  error: null,
  inputRef: D("1"),
  outputRef: D("2"),
  idemKey: K,
  policyDecisionId: null,
  taint: [],
  startedAt: "2026-11-06T09:00:00.000000Z",
  endedAt: "2026-11-06T09:00:01.000000Z",
};

function T(to: unknown): { inputOriginalRef: null; entries: HookEntryView[] } {
  const entry = { ...G, action: "redirect" as const, to };
  return { inputOriginalRef: null, entries: [entry as unknown as HookEntryView] };
}

function parsed(raw: unknown): StepHooksView | null | undefined {
  let result: StepHooksView | null | undefined;
  assert.doesNotThrow(() => {
    result = parseStepHooks(raw);
  }, "parseStepHooks answers");
  return result;
}

function rowsOf(step: StepView): HookRowView[] {
  let result: HookRowView[] | undefined;
  assert.doesNotThrow(() => {
    result = hookRows(step);
  }, "hookRows answers");
  return result as HookRowView[];
}

function noteOf(step: StepView): string | null {
  let result: string | null | undefined;
  assert.doesNotThrow(() => {
    result = hookTraceNote(step);
  }, "hookTraceNote answers");
  return result as string | null;
}

test("C-c595362a: parseStepHooks reads absent, valid and malformed traces", () => {
  assert.equal(parsed(undefined), undefined);

  const valid = { inputOriginalRef: null, entries: [G, N] };
  const copy = parsed(valid);
  assert.notStrictEqual(copy, valid);
  assert.ok(copy !== null && copy !== undefined, "a valid trace is kept");
  assert.notStrictEqual(copy.entries, valid.entries);
  assert.notStrictEqual(copy.entries[0], G);
  assert.deepEqual(copy, valid);

  const many = parsed({
    inputOriginalRef: null,
    entries: Array.from({ length: 64 }, () => ({ ...G })),
  });
  assert.ok(many !== null && many !== undefined, "64 entries are kept");
  assert.equal(many.entries.length, 64);

  for (const to of ["review", "a".repeat(128)]) {
    const trace = T(to);
    const parsedTrace = parsed(trace);
    assert.notStrictEqual(parsedTrace, trace);
    assert.deepEqual(parsedTrace, trace);
    assert.equal((parsedTrace as StepHooksView).entries[0]?.to, to);
  }

  const malformed: readonly unknown[] = [
    null,
    "trace",
    [],
    { inputOriginalRef: null },
    { inputOriginalRef: null, entries: {} },
    { inputOriginalRef: "ab", entries: [] },
    { inputOriginalRef: null, entries: [{ ...G, label: "guard" }] },
    { inputOriginalRef: null, entries: [{ ...G, kind: "llm" }] },
    { inputOriginalRef: null, entries: [{ ...G, attempt: 0 }] },
    { inputOriginalRef: null, entries: [{ ...G, attempt: Number.NaN }] },
    { inputOriginalRef: null, entries: [{ ...G, action: "explode" }] },
    { inputOriginalRef: null, entries: [{ label: "pre:guard" }] },
    { inputOriginalRef: null, entries: Array.from({ length: 65 }, () => ({ ...G })) },
    { inputOriginalRef: null, entries: [{ ...G, error: { code: 1 } }] },
    { inputOriginalRef: null, entries: [{ ...G, idemKey: "ik" + "1_x" }] },
    T("Review"),
    T("a".repeat(129)),
    T(""),
    T(5),
  ];
  assert.equal(malformed.length, 19);
  for (const raw of malformed) {
    assert.equal(parsed(raw), null);
  }
});

test("C-c595362a: parseStepView keeps the trace as its last member or null", () => {
  const first = parseStepView(STEP);
  assert.ok(first !== null);
  assert.equal("hooks" in first, false);

  const valid = { inputOriginalRef: null, entries: [G, N] };
  const second = parseStepView({ ...STEP, hooks: valid });
  assert.ok(second !== null);
  assert.deepEqual(Object.keys(second), [...Object.keys(STEP), "hooks"]);
  assert.deepEqual(second, { ...STEP, hooks: valid });

  const third = parseStepView({ ...STEP, hooks: { entries: 5 } });
  assert.ok(third !== null);
  assert.deepEqual(Object.keys(third), [...Object.keys(STEP), "hooks"]);
  assert.equal("hooks" in third, true);
  assert.equal((third as StepWithHooks).hooks, null);
  const { hooks: _hooks, ...rest } = third as StepWithHooks;
  assert.deepEqual(rest, first);
});

test("C-ff5e87af: hook rows read the labels, texts and details of a trace", () => {
  const step: StepWithHooks = { ...STEP, hooks: { inputOriginalRef: null, entries: [G, N] } };
  const rows = rowsOf(step);
  assert.deepEqual(
    rows.map((row) => row.label),
    ["pre:guard", "post:notify"],
  );
  assert.deepEqual(
    rows.map((row) => row.text),
    [
      "pre:guard · code (fused) · completed · continue",
      "post:notify · block · completed",
    ],
  );
  assert.deepEqual(rows[0]?.details, [
    { term: "Attempt", value: "1" },
    { term: "Mutated", value: "none" },
    { term: "Tool", value: "none" },
    { term: "Idempotency key", value: "none" },
  ]);
  assert.deepEqual(rows[1]?.details, [
    { term: "Attempt", value: "1" },
    { term: "Mutated", value: "none" },
    { term: "Tool", value: "slack.post_message@1" },
    { term: "Idempotency key", value: K },
  ]);
  assert.equal(noteOf(step), null);
});

test("C-ff5e87af: hook rows show redirects, retries and errors", () => {
  const rush: HookEntryView = {
    label: "post:rush",
    kind: "code",
    fused: false,
    attempt: 1,
    state: "completed",
    action: "redirect",
    mutated: null,
    to: "pay",
    error: null,
    tool: null,
    idemKey: null,
  };
  const trim: HookEntryView = {
    label: "pre:trim",
    kind: "code",
    fused: true,
    attempt: 2,
    state: "completed",
    action: "continue",
    mutated: "input",
    to: null,
    error: null,
    tool: null,
    idemKey: null,
  };
  const tell: HookEntryView = {
    label: "post:tell",
    kind: "block",
    fused: false,
    attempt: 1,
    state: "failed",
    action: null,
    mutated: null,
    to: null,
    error: { code: "HOOK_ERROR", message: "block hook failed (tool_failed)" },
    tool: "slack.post_message@1",
    idemKey: K,
  };
  const step: StepWithHooks = {
    ...STEP,
    hooks: { inputOriginalRef: null, entries: [rush, trim, tell] },
  };
  const rows = rowsOf(step);
  assert.deepEqual(
    rows.map((row) => row.text),
    [
      "post:rush · code · completed · redirect → pay",
      "pre:trim · code (fused) · completed · continue",
      "post:tell · block · failed",
    ],
  );
  assert.deepEqual(rows[1]?.details, [
    { term: "Attempt", value: "2" },
    { term: "Mutated", value: "input" },
    { term: "Tool", value: "none" },
    { term: "Idempotency key", value: "none" },
  ]);
  assert.deepEqual(rows[2]?.details, [
    { term: "Attempt", value: "1" },
    { term: "Mutated", value: "none" },
    { term: "Tool", value: "slack.post_message@1" },
    { term: "Idempotency key", value: K },
    { term: "Error", value: "HOOK_ERROR: block hook failed (tool_failed)" },
  ]);
  assert.equal(noteOf(step), null);
});

test("C-ff5e87af: a malformed trace gives no rows and a note", () => {
  const malformed: StepWithHooks = { ...STEP, hooks: null };
  assert.deepEqual(rowsOf(malformed), []);
  assert.equal(noteOf(malformed), NOTE);
  assert.deepEqual(rowsOf(STEP), []);
  assert.equal(noteOf(STEP), null);
});
