/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { parsePayloadView, parseRunView, parseStepView } from "./types.ts";
import type { PayloadView, RunView, StepView } from "./types.ts";

assert.equal(typeof parseRunView, "function");

const D = (c: string): string => c.repeat(64);

const RUN: RunView = {
  id: "run_1",
  flowId: "demo-pay",
  flowHash: `sha256:${D("a")}`,
  mode: "mock",
  trigger: "test",
  state: "completed",
  ownerTeam: "finance",
  principal: { userId: "u_alice", kind: "human" },
  terminalNode: "done",
  error: null,
  inputRef: D("b"),
  outputRef: D("c"),
  createdAt: "2026-11-02T10:00:00.000000Z",
  startedAt: "2026-11-02T10:00:01.000000Z",
  endedAt: "2026-11-02T10:00:02.000000Z",
};

function step(seq: number, nodeId: string, kind: string, over: Partial<StepView>): StepView {
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

const PAY: StepView = step(2, "pay", "block", {
  inputRef: D("3"),
  outputRef: D("4"),
  idemKey: `ik1_${D("d")}`,
  taint: ["untrusted"],
});

const PAYLOAD: PayloadView = {
  sha256: D("4"),
  mediaType: "application/json",
  size: 38,
  data: { payment_id: "P-1" },
};

function parsedRun(raw: unknown, label: string): RunView | null {
  let result: RunView | null | undefined;
  assert.doesNotThrow(() => {
    result = parseRunView(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== undefined, `${label} returned an answer`);
  return result as RunView | null;
}

function parsedStep(raw: unknown, label: string): StepView | null {
  let result: StepView | null | undefined;
  assert.doesNotThrow(() => {
    result = parseStepView(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== undefined, `${label} returned an answer`);
  return result as StepView | null;
}

function parsedPayload(raw: unknown, label: string): PayloadView | null {
  let result: PayloadView | null | undefined;
  assert.doesNotThrow(() => {
    result = parsePayloadView(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== undefined, `${label} returned an answer`);
  return result as PayloadView | null;
}

test("C-2ceae13f the parsers keep the valid views with copies of their nested values", () => {
  const run = parsedRun(RUN, "the run");
  assert.deepEqual(run, RUN, "the valid run is kept whole");
  assert.ok(run !== null, "the valid run parsed");
  assert.ok(run.principal !== RUN.principal, "the principal of the run is a copy");
  assert.deepEqual(run.principal, RUN.principal, "the copied principal holds the same values");

  const pay = parsedStep(PAY, "the pay step");
  assert.deepEqual(pay, PAY, "the valid step is kept whole");
  assert.ok(pay !== null, "the valid step parsed");
  assert.ok(pay.taint !== PAY.taint, "the taint of the step is a copy");
  assert.deepEqual(pay.taint, PAY.taint, "the copied taint holds the same values");

  const payload = parsedPayload(PAYLOAD, "the payload");
  assert.deepEqual(payload, PAYLOAD, "the valid payload is kept whole");
});

test("C-2ceae13f the parsers refuse the malformed views", () => {
  assert.equal(parsedRun({ ...RUN, state: "paused" }, "a run with a state outside the union"), null);
  const withoutTeam: Record<string, unknown> = { ...RUN } as Record<string, unknown>;
  delete withoutTeam.ownerTeam;
  assert.equal(parsedRun(withoutTeam, "a run without an owner team"), null);
  assert.equal(
    parsedRun({ ...RUN, principal: { userId: "u_alice", kind: "robot" } }, "a run whose principal is a robot"),
    null,
  );
  assert.equal(parsedRun({ ...RUN, error: { code: "X" } }, "a run whose error misses fields"), null);
  assert.equal(parsedRun({ ...RUN, inputRef: "b".repeat(63) }, "a run with a 63 character inputRef"), null);

  assert.equal(parsedStep({ ...PAY, seq: -1 }, "a step with a negative seq"), null);
  assert.equal(parsedStep({ ...PAY, taint: [1] }, "a step with a numeric taint entry"), null);
  assert.equal(parsedStep({ ...PAY, state: "done" }, "a step with a state outside the union"), null);

  assert.equal(parsedPayload({ ...PAYLOAD, size: -1 }, "a payload with a negative size"), null);
  const withoutData: Record<string, unknown> = { ...PAYLOAD } as Record<string, unknown>;
  delete withoutData.data;
  assert.equal(parsedPayload(withoutData, "a payload without data"), null);
});

test("C-2ceae13f parseRunView drops a property it does not know", () => {
  const extra = parsedRun({ ...RUN, extra: 1 }, "a run with an extra property");
  assert.deepEqual(extra, RUN, "the unknown property is dropped");
  assert.ok(extra !== null, "the run with the extra property parsed");
  assert.equal(Object.hasOwn(extra, "extra"), false, "no extra property survives");
});
