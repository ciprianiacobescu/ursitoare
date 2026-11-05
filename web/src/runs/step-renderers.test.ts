/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { registerStepRenderer, stepRendererFor, stepRenderers, StepRendererError } from "./step-renderers.ts";
import type { StepRenderer } from "./step-renderers.ts";
import type { StepView } from "./types.ts";

function step(seq: number, nodeId: string, kind: string): StepView {
  return {
    seq,
    nodeId,
    kind,
    effectSeq: 0,
    attempt: 1,
    state: "completed",
    outcome: null,
    error: null,
    inputRef: null,
    outputRef: null,
    idemKey: null,
    policyDecisionId: null,
    taint: [],
    startedAt: "2026-11-02T10:00:01.000000Z",
    endedAt: "2026-11-02T10:00:01.500000Z",
  };
}

function kinds(): string[] {
  return stepRenderers.list().map((r) => r.kind);
}

const LLM: StepRenderer = {
  kind: "llm.extract",
  label: (s) => s.kind,
  details: () => [],
};

test("C-44473e25: the list starts with the four built-ins and lookups return them", () => {
  let list: readonly StepRenderer[] = [];
  assert.doesNotThrow(() => {
    list = stepRenderers.list();
  });
  assert.deepEqual(
    list.map((r) => r.kind),
    ["block", "switch", "wait", "end"],
  );
  for (const r of list) {
    let found: StepRenderer | undefined;
    assert.doesNotThrow(() => {
      found = stepRendererFor(r.kind);
    });
    assert.equal(found, r);
  }
});

test("C-44473e25: an unknown kind and __proto__ give one default renderer", () => {
  let a: StepRenderer | undefined;
  let b: StepRenderer | undefined;
  assert.doesNotThrow(() => {
    a = stepRendererFor("mystery");
    b = stepRendererFor("__proto__");
  });
  assert.equal(a, b);
  assert.equal(a?.kind, "*");
  assert.equal(a?.label(step(0, "x", "mystery")), "mystery (unknown kind)");
  assert.deepEqual(a?.details(step(0, "x", "mystery")), []);
  assert.deepEqual(kinds(), ["block", "switch", "wait", "end"]);
});

test("C-44473e25: a repeat and seven bad renderers are refused and the list is unchanged", () => {
  const bad: unknown[] = [
    { kind: "Bad Kind", label: () => "x", details: () => [] },
    { kind: "", label: () => "x", details: () => [] },
    { kind: "k".repeat(41), label: () => "x", details: () => [] },
    { kind: "okkind", label: "x", details: () => [] },
    { kind: "okkind", label: () => "x" },
    null,
    "block",
  ];
  assert.doesNotThrow(() => registerStepRenderer(LLM));
  assert.equal(stepRendererFor("llm.extract"), LLM);
  assert.deepEqual(kinds(), ["block", "switch", "wait", "end", "llm.extract"]);

  for (const r of [LLM, { ...LLM, kind: "block" }]) {
    assert.throws(
      () => registerStepRenderer(r),
      (e: unknown) => e instanceof StepRendererError && e.code === "STEP_RENDERER_DUPLICATE",
    );
  }
  for (const r of bad) {
    assert.throws(
      () => registerStepRenderer(r as StepRenderer),
      (e: unknown) => e instanceof StepRendererError && e.code === "STEP_RENDERER_INVALID",
    );
  }
  assert.deepEqual(kinds(), ["block", "switch", "wait", "end", "llm.extract"]);
});
