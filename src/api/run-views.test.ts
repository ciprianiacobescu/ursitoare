import assert from "node:assert/strict";
import { test } from "node:test";

import { entityRef } from "../pdp/index.ts";
import type { RunRecord, StepRecord } from "../runs/index.ts";
import type { RunView, StepView } from "./run-views.ts";
import {
  RUN_VIEW_SCHEMA,
  STEP_VIEW_SCHEMA,
  runResource,
  toRunView,
  toStepView,
} from "./run-views.ts";

assert.equal(typeof toRunView, "function");
assert.equal(typeof toStepView, "function");
assert.equal(typeof runResource, "function");

const FLOW_HASH = "sha256:" + "a".repeat(64);
const INPUT_REF = "b".repeat(64);
const MOCKS_REF = "c".repeat(64);
const STEP_INPUT_REF = "a".repeat(64);

const RUN_VIEW_KEYS = [
  "id",
  "flowId",
  "flowHash",
  "mode",
  "trigger",
  "state",
  "ownerTeam",
  "principal",
  "terminalNode",
  "error",
  "inputRef",
  "outputRef",
  "createdAt",
  "startedAt",
  "endedAt",
];

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

function runRecord(): RunRecord {
  return {
    runId: "run-4",
    lineageId: "run-4",
    parentRunId: null,
    flowId: "rf-2-ap",
    flowHash: FLOW_HASH,
    ownerTeam: "finance",
    mode: "mock",
    trigger: "test",
    state: "failed",
    principal: { userId: "u_erin", kind: "human" },
    actorChain: ["u_erin"],
    inputRef: INPUT_REF,
    mocksRef: MOCKS_REF,
    outputRef: null,
    error: { code: "FLOW_FAILED", message: "flow ended failed", node: "rejected" },
    terminalNode: "rejected",
    runDay: "2026-11-02",
    createdAt: "2026-11-02T09:00:04.000000Z",
    startedAt: "2026-11-02T09:00:05.000000Z",
    endedAt: "2026-11-02T09:00:06.000000Z",
  };
}

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
    inputRef: STEP_INPUT_REF,
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

function viewOfRun(record: RunRecord): RunView {
  let view: RunView | undefined;
  assert.doesNotThrow(() => {
    view = toRunView(record);
  }, "toRunView over the stored record");
  return view as RunView;
}

function viewOfStep(record: StepRecord): StepView {
  let view: StepView | undefined;
  assert.doesNotThrow(() => {
    view = toStepView(record);
  }, "toStepView over the stored record");
  return view as StepView;
}

test("C-8e399d8e the run view copies the stored row and leaves out internal columns", () => {
  const record = runRecord();
  const view = viewOfRun(record);

  assert.deepEqual(view, {
    id: "run-4",
    flowId: "rf-2-ap",
    flowHash: FLOW_HASH,
    mode: "mock",
    trigger: "test",
    state: "failed",
    ownerTeam: "finance",
    principal: { userId: "u_erin", kind: "human" },
    terminalNode: "rejected",
    error: { code: "FLOW_FAILED", message: "flow ended failed", node: "rejected" },
    inputRef: INPUT_REF,
    outputRef: null,
    createdAt: "2026-11-02T09:00:04.000000Z",
    startedAt: "2026-11-02T09:00:05.000000Z",
    endedAt: "2026-11-02T09:00:06.000000Z",
  });
  assert.deepEqual(Object.keys(view), RUN_VIEW_KEYS, "the view keys are the fifteen of RunView");
  for (const internal of ["lineageId", "parentRunId", "actorChain", "mocksRef", "runDay"]) {
    assert.equal(internal in view, false, `the run view has no ${internal}`);
  }
  assert.notEqual(view.principal, record.principal, "principal is a copy");
  assert.notEqual(view.error, record.error, "error is a copy");
});

test("C-8e399d8e the step view copies the stored row and leaves out internal columns", () => {
  const record = stepRecord();
  const view = viewOfStep(record);

  assert.deepEqual(view, {
    seq: 7,
    nodeId: "pay",
    kind: "block",
    effectSeq: 1,
    attempt: 3,
    state: "completed",
    outcome: "ok",
    error: null,
    inputRef: STEP_INPUT_REF,
    outputRef: null,
    idemKey: "ik1_x",
    policyDecisionId: "dec_1",
    taint: ["untrusted", "private"],
    startedAt: "2026-11-02T09:00:05.000000Z",
    endedAt: null,
  });
  assert.deepEqual(Object.keys(view), STEP_VIEW_KEYS, "the view keys are the fifteen of StepView");
  for (const internal of ["runId", "turn", "generation"]) {
    assert.equal(internal in view, false, `the step view has no ${internal}`);
  }
  assert.notEqual(view.taint, record.taint, "taint is a copy");
});

test("C-8e399d8e the view schemas list exactly the view fields", () => {
  assert.equal(RUN_VIEW_SCHEMA.additionalProperties, false, "the run schema closes its fields");
  const runProperties = (RUN_VIEW_SCHEMA.properties ?? {}) as Record<string, unknown>;
  assert.deepEqual(Object.keys(runProperties), RUN_VIEW_KEYS, "the run schema holds the view fields");
  assert.deepEqual(RUN_VIEW_SCHEMA.required, RUN_VIEW_KEYS, "every run view field is required");

  assert.equal(STEP_VIEW_SCHEMA.additionalProperties, false, "the step schema closes its fields");
  const stepProperties = (STEP_VIEW_SCHEMA.properties ?? {}) as Record<string, unknown>;
  assert.deepEqual(Object.keys(stepProperties), STEP_VIEW_KEYS, "the step schema holds the view fields");
  assert.deepEqual(STEP_VIEW_SCHEMA.required, STEP_VIEW_KEYS, "every step view field is required");
});

test("C-8e399d8e the policy resource names the run, its tenant, owner team and initiator", () => {
  let resource: unknown;
  assert.doesNotThrow(() => {
    resource = runResource("tenant_a", runRecord());
  }, "runResource over the stored record");

  assert.deepEqual(resource, {
    type: "Run",
    id: "run-4",
    tenantId: "tenant_a",
    attrs: {
      owner_team: entityRef("Team", "tenant_a/finance"),
      initiator: entityRef("User", "tenant_a/u_erin"),
    },
  });
});
