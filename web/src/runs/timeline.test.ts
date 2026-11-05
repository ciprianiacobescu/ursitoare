/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import {
  decisionHref,
  payloadShown,
  runErrorText,
  setPayloadLoad,
  stepDetailRows,
  stepStateLabel,
  timelineItems,
} from "./timeline.ts";
import type { PayloadLoad } from "./timeline.ts";
import type { RunState, StepState, StepView } from "./types.ts";

const D = (c: string): string => c.repeat(64);

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
    startedAt: "2026-11-02T10:00:01.000000Z",
    endedAt: "2026-11-02T10:00:01.500000Z",
    ...over,
  };
}

const LOOKUP = step(0, "lookup", "block", { inputRef: D("1"), outputRef: D("2") });
const ROUTE = step(1, "route", "switch", { outcome: "active" });
const PAY = step(2, "pay", "block", {
  inputRef: D("3"),
  outputRef: D("4"),
  idemKey: "ik1_" + D("d"),
  taint: ["untrusted"],
});
const DONE = step(3, "done", "end");

const STATES: StepState[] = ["started", "completed", "failed", "skipped"];
const RUN_STATES: RunState[] = ["queued", "running", "completed", "failed", "cancelled"];

test("C-95befb77: a started step of a terminal run is Interrupted, else the state", () => {
  for (const state of STATES) {
    for (const runState of RUN_STATES) {
      let got: { label: string; note: string | null } | undefined;
      assert.doesNotThrow(() => {
        got = stepStateLabel(state, runState);
      });
      let want: { label: string; note: string | null } = { label: state, note: null };
      if (state === "started" && ["completed", "failed", "cancelled"].includes(runState)) {
        want = { label: "Interrupted", note: "Not finalized" };
      }
      assert.deepEqual(got, want, `${state}/${runState}`);
    }
  }
});

test("C-95befb77: timeline items are in seq order with kind, outcome and state", () => {
  let items: { seq: number; nodeId: string; text: string }[] = [];
  assert.doesNotThrow(() => {
    items = timelineItems([PAY, LOOKUP, DONE, ROUTE], "completed");
  });
  assert.deepEqual(items, [
    { seq: 0, nodeId: "lookup", text: "block · completed" },
    { seq: 1, nodeId: "route", text: "switch: active · completed" },
    { seq: 2, nodeId: "pay", text: "block · completed" },
    { seq: 3, nodeId: "done", text: "end · completed" },
  ]);
});

test("C-95befb77: a started step reads running only in a live run", () => {
  const started = step(0, "lookup", "block", { state: "started", endedAt: null });
  const texts: Record<string, string | undefined> = {};
  assert.doesNotThrow(() => {
    for (const rs of ["running", "failed", "cancelled", "completed"] as const) {
      texts[rs] = timelineItems([started], rs)[0]?.text;
    }
  });
  assert.equal(texts["running"], "block · running");
  for (const rs of ["failed", "cancelled", "completed"]) {
    assert.equal(texts[rs], "block · Interrupted (Not finalized)");
  }
});

test("C-95befb77: a mocked wait shows its skipped outcome", () => {
  let items: { seq: number; nodeId: string; text: string }[] = [];
  assert.doesNotThrow(() => {
    items = timelineItems([step(1, "nap", "wait", { outcome: "skipped" })], "completed");
  });
  assert.deepEqual(items, [{ seq: 1, nodeId: "nap", text: "wait: skipped · completed" }]);
});

test("C-95befb77: detail rows of a completed block step", () => {
  let rows: unknown;
  assert.doesNotThrow(() => {
    rows = stepDetailRows(PAY, "completed");
  });
  const row = (term: string, value: string) => ({ term, value, href: null });
  assert.deepEqual(rows, [
    row("Node", "pay"),
    row("Kind", "block"),
    row("State", "completed"),
    row("Outcome", "none"),
    row("Started", "2026-11-02T10:00:01.000000Z"),
    row("Ended", "2026-11-02T10:00:01.500000Z"),
    row("Effect sequence", "0"),
    row("Attempt", "1"),
    row("Idempotency key", "ik1_" + D("d")),
    row("Taint", "untrusted"),
  ]);
});

test("C-95befb77: detail rows of an interrupted step and of a failed step", () => {
  const started = step(0, "lookup", "block", { state: "started", endedAt: null });
  const failed = step(2, "pay", "block", {
    state: "failed",
    error: { code: "E_X", message: "failed", node: "pay" },
    policyDecisionId: "dec_1",
  });
  let a: { term: string; value: string; href: string | null }[] = [];
  let b: { term: string; value: string; href: string | null }[] = [];
  assert.doesNotThrow(() => {
    a = stepDetailRows(started, "completed");
    b = stepDetailRows(failed, "failed");
  });
  assert.deepEqual(a.find((r) => r.term === "State"), {
    term: "State",
    value: "Interrupted (Not finalized)",
    href: null,
  });
  assert.deepEqual(a.find((r) => r.term === "Ended"), { term: "Ended", value: "not ended", href: null });
  assert.deepEqual(b.slice(-4), [
    { term: "Idempotency key", value: "none", href: null },
    { term: "Taint", value: "none", href: null },
    { term: "Error", value: "E_X: failed", href: null },
    { term: "Decision", value: "dec_1", href: "/api/v1/policy-decisions?decision_id=dec_1" },
  ]);
});

test("C-95befb77: decisionHref encodes a good id and refuses a bad one", () => {
  let good: string | null = null;
  let bad: string | null = "x";
  assert.doesNotThrow(() => {
    good = decisionHref("dec_1");
    bad = decisionHref("a b");
  });
  assert.equal(good, "/api/v1/policy-decisions?decision_id=dec_1");
  assert.equal(bad, null);
});

test("C-95befb77: runErrorText joins code, message and node", () => {
  let a: string | null = "x";
  let b: string | null = "x";
  let c: string | null = "x";
  assert.doesNotThrow(() => {
    a = runErrorText({ code: "E_X", message: "failed", node: null });
    b = runErrorText({ code: "E_X", message: "failed", node: "pay" });
    c = runErrorText(null);
  });
  assert.equal(a, "E_X: failed");
  assert.equal(b, "E_X: failed (at pay)");
  assert.equal(c, null);
});

test("C-95befb77: payloadShown gives none, the JSON text or the error message", () => {
  let none = "";
  let ready = "";
  let failed = "";
  assert.doesNotThrow(() => {
    none = payloadShown(null, undefined);
    ready = payloadShown(D("4"), { phase: "ready", value: { payment_id: "P-1" } });
    failed = payloadShown(D("4"), { phase: "error", error: new ApiRequestError(404, "NOT_FOUND", "m") });
  });
  assert.equal(none, "none");
  assert.equal(ready, '{\n  "payment_id": "P-1"\n}');
  assert.equal(failed, "That item does not exist, or you cannot see it.");
});

test("C-95befb77: setPayloadLoad confines a failure to its own digest", () => {
  const ready: PayloadLoad = { phase: "ready", value: { vendor_id: "V-1" } };
  const loads = new Map<string, PayloadLoad>([
    [D("3"), ready],
    [D("4"), { phase: "loading" }],
  ]);
  const error: PayloadLoad = { phase: "error", error: new ApiRequestError(404, "NOT_FOUND", "m") };
  let next: Map<string, PayloadLoad> = new Map();
  assert.doesNotThrow(() => {
    next = setPayloadLoad(loads, D("4"), error);
  });
  assert.notEqual(next, loads);
  assert.equal(next.get(D("3")), ready);
  assert.equal(next.get(D("4")), error);
  assert.deepEqual(loads.get(D("4")), { phase: "loading" });
  assert.equal(payloadShown(D("3"), next.get(D("3"))), '{\n  "vendor_id": "V-1"\n}');
  assert.equal(payloadShown(D("4"), next.get(D("4"))), "That item does not exist, or you cannot see it.");
});
