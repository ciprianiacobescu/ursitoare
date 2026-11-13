/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { stepDetailRows } from "./timeline.ts";
import type { DetailRow } from "./timeline.ts";
import type { StepView } from "./types.ts";

function step(seq: number, nodeId: string, kind: string, over: Partial<StepView> = {}): StepView {
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
    startedAt: "2026-11-06T10:00:01.000000Z",
    endedAt: "2026-11-06T10:00:01.500000Z",
    ...over,
  };
}

const row = (term: string, value: string, href: string | null = null): DetailRow => ({
  term,
  value,
  href,
});

function base(nodeId: string, kind: string, outcome: string, state = "completed"): DetailRow[] {
  return [
    row("Node", nodeId),
    row("Kind", kind),
    row("State", state),
    row("Outcome", outcome),
    row("Started", "2026-11-06T10:00:01.000000Z"),
    row("Ended", "2026-11-06T10:00:01.500000Z"),
  ];
}

test("C-acb416e2: a switch step gains Taint none after its Branch row", () => {
  let rows: DetailRow[] = [];
  assert.doesNotThrow(() => {
    rows = stepDetailRows(step(1, "route", "switch", { outcome: "active" }), "completed");
  });
  assert.deepEqual(rows, [...base("route", "switch", "active"), row("Branch", "active"), row("Taint", "none")]);
});

test("C-acb416e2: a wait step lists its labels and an end step reads none", () => {
  let wait: DetailRow[] = [];
  let end: DetailRow[] = [];
  assert.doesNotThrow(() => {
    wait = stepDetailRows(
      step(2, "nap", "wait", { outcome: "skipped", taint: ["untrusted", "private"] }),
      "completed",
    );
    end = stepDetailRows(step(3, "done", "end"), "completed");
  });
  assert.deepEqual(wait, [
    ...base("nap", "wait", "skipped"),
    row("Wait", "skipped"),
    row("Taint", "untrusted, private"),
  ]);
  assert.deepEqual(end, [...base("done", "end", "none"), row("Taint", "none")]);
});

test("C-acb416e2: an unknown kind gains its labels", () => {
  let rows: DetailRow[] = [];
  assert.doesNotThrow(() => {
    rows = stepDetailRows(step(3, "weird", "mystery", { taint: ["untrusted"] }), "completed");
  });
  assert.deepEqual(rows, [...base("weird", "mystery", "none"), row("Taint", "untrusted")]);
});

test("C-acb416e2: Taint comes before Error and Decision of a failed switch", () => {
  let rows: DetailRow[] = [];
  assert.doesNotThrow(() => {
    rows = stepDetailRows(
      step(3, "route", "switch", {
        outcome: "active",
        state: "failed",
        error: { code: "E_X", message: "failed", node: "route" },
        policyDecisionId: "dec_1",
      }),
      "failed",
    );
  });
  assert.deepEqual(rows, [
    ...base("route", "switch", "active", "failed"),
    row("Branch", "active"),
    row("Taint", "none"),
    row("Error", "E_X: failed"),
    row("Decision", "dec_1", "/api/v1/policy-decisions?decision_id=dec_1"),
  ]);
});

test("C-acb416e2: a block step keeps its ten rows with one Taint", () => {
  const key = "ik1_" + "d".repeat(64);
  let rows: DetailRow[] = [];
  assert.doesNotThrow(() => {
    rows = stepDetailRows(
      step(0, "lookup", "block", { idemKey: key, taint: ["untrusted"] }),
      "completed",
    );
  });
  assert.deepEqual(rows, [
    ...base("lookup", "block", "none"),
    row("Effect sequence", "0"),
    row("Attempt", "1"),
    row("Idempotency key", key),
    row("Taint", "untrusted"),
  ]);
  assert.equal(rows.length, 10);
  assert.equal(rows.filter((r) => r.term === "Taint").length, 1);
  // a step whose renderer lacks Taint must differ, so this test fails before the change
  assert.equal(stepDetailRows(step(1, "r", "switch"), "completed").filter((r) => r.term === "Taint").length, 1);
});
