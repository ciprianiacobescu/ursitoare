import assert from "node:assert/strict";
import { test } from "node:test";

import type { StepHookEntry, StepHooks, StepRecord } from "../runs/index.ts";
import type { StepView } from "./run-views.ts";
import { STEP_VIEW_SCHEMA, toStepView } from "./run-views.ts";

assert.equal(typeof toStepView, "function");
assert.equal(typeof STEP_VIEW_SCHEMA, "object");

const INPUT_ORIGINAL_REF = "d".repeat(64);

const STEP_VIEW_KEYS = [
  "seq",
  "nodeId",
  "kind",
  "effectSeq",
  "attempt",
  "state",
  "outcome",
  "error",
  "inputRef",
  "outputRef",
  "idemKey",
  "policyDecisionId",
  "taint",
  "startedAt",
  "endedAt",
];

const ENTRY: StepHookEntry = {
  label: "post:rule.rule_a",
  kind: "code",
  fused: false,
  attempt: 1,
  state: "completed",
  action: "continue",
  mutated: null,
  to: null,
  error: null,
  tool: null,
  idemKey: null,
};

const TRACE: StepHooks = {
  inputOriginalRef: INPUT_ORIGINAL_REF,
  entries: [ENTRY],
};

function stepRecord(): StepRecord {
  return {
    runId: "run-4",
    nodeId: "pay",
    effectSeq: 1,
    turn: 2,
    attempt: 3,
    generation: 4,
    seq: 7,
    kind: "block",
    state: "completed",
    inputRef: "a".repeat(64),
    outputRef: null,
    outcome: "ok",
    error: null,
    taint: ["untrusted", "private"],
    policyDecisionId: "dec_1",
    idemKey: "ik1_x",
    startedAt: "2026-11-02T09:00:05.000000Z",
    endedAt: null,
  };
}

function hooksOf(step: StepView): StepHooks | undefined {
  return (step as StepView & { hooks?: StepHooks }).hooks;
}

test("C-8e399d8e the step view copies hooks last when the record has one and adds no key otherwise", () => {
  const record = stepRecord();
  const plain = toStepView(record);
  assert.equal("hooks" in plain, false, "a step record without hooks gets no hooks key");

  const traced = toStepView({ ...record, hooks: TRACE });
  assert.deepEqual(
    Object.keys(traced),
    [...STEP_VIEW_KEYS, "hooks"],
    "hooks is the sixteenth key of the traced step view, last",
  );
  let hooks: StepHooks | undefined;
  assert.doesNotThrow(() => {
    hooks = hooksOf(traced);
  }, "the traced step view carries hooks");
  assert.deepEqual(hooks, TRACE, "the view hooks deep-equal the record's hooks");
  assert.notEqual(hooks, record.hooks, "the view hooks are not the record's object");
  const entry = hooks?.entries[0];
  assert.ok(entry !== undefined, "the view hooks hold the one entry");
  assert.notEqual(entry, TRACE.entries[0], "the entry is a copy, not the record's object");
});

test("C-8e399d8e the step schema describes hooks as a closed envelope of closed entries", () => {
  const stepProperties = (STEP_VIEW_SCHEMA.properties ?? {}) as Record<string, unknown>;
  const hookSchema: unknown = stepProperties["hooks"];
  assert.ok(hookSchema !== undefined, "the step schema holds hooks in its properties");
  const hooks = hookSchema as Record<string, unknown>;

  assert.equal(hooks["additionalProperties"], false, "the hooks envelope closes its members");
  assert.deepEqual(
    hooks["required"],
    ["inputOriginalRef", "entries"],
    "the hooks envelope requires the digest and the entries",
  );
  assert.deepEqual(
    hooks["properties"] && (hooks["properties"] as Record<string, unknown>)["inputOriginalRef"],
    { type: ["string", "null"], pattern: "^[0-9a-f]{64}$" },
    "inputOriginalRef is a nullable 64 hex digit string",
  );
  const entriesSchema = (hooks["properties"] as Record<string, unknown>)["entries"] as Record<
    string,
    unknown
  >;
  assert.ok(entriesSchema !== undefined, "the hooks envelope holds entries");
  assert.equal(entriesSchema["type"], "array", "entries is an array");
  const entrySchema = entriesSchema["items"] as Record<string, unknown>;
  assert.ok(entrySchema !== undefined, "entries describes its items");
  assert.equal(entrySchema["additionalProperties"], false, "an entry closes its members");
  assert.deepEqual(
    entrySchema["required"],
    [
      "label",
      "kind",
      "fused",
      "attempt",
      "state",
      "action",
      "mutated",
      "to",
      "error",
      "tool",
      "idemKey",
    ],
    "an entry requires its eleven members in that order",
  );
});
