import assert from "node:assert/strict";
import { test } from "node:test";

import type { PolicyDecisionRecord } from "../pdp/index.ts";
import { toDecisionView } from "./run-decisions.ts";
import type { DecisionView } from "./run-decisions.ts";

const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const V64 = "b".repeat(64);
const PL = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.lookup_vendor@1",
  bodyDigest: "9".repeat(64),
  serviceId: S,
  ttlSeconds: 60,
};
const PERMIT_KEYS = [
  "method",
  "host",
  "path",
  "bodyDigest",
  "serviceId",
  "ttlSeconds",
];
const VIEW_KEYS = [
  "decisionId",
  "decidedAt",
  "nodeId",
  "resource",
  "decision",
  "reasons",
  "policySetVersion",
  "permit",
];

const REC: PolicyDecisionRecord = {
  decisionId: "d_1",
  decidedAt: "2026-11-02T10:00:01.000000Z",
  runId: "r_1",
  nodeId: "lookup",
  action: "invoke_tool",
  principal: 'User::"tenant_a/alice"',
  resource: 'Block::"tenant_a/pay-once/lookup"',
  decision: "allow",
  reasons: ["g-lookup"],
  errors: [],
  policySetVersion: V64,
  requestDigest: "c".repeat(64),
  permit: { ...PL },
};

function record(overrides: Partial<PolicyDecisionRecord> = {}): PolicyDecisionRecord {
  return { ...REC, ...overrides };
}

function viewOf(input: PolicyDecisionRecord): DecisionView {
  let view: DecisionView | undefined;
  assert.doesNotThrow(() => {
    view = toDecisionView(input);
  }, "toDecisionView answers for a stored record");
  if (view === undefined) assert.fail("toDecisionView returned no view");
  return view;
}

const VW: DecisionView = {
  decisionId: "d_1",
  decidedAt: "2026-11-02T10:00:01.000000Z",
  nodeId: "lookup",
  resource: 'Block::"tenant_a/pay-once/lookup"',
  decision: "allow",
  reasons: ["g-lookup"],
  policySetVersion: V64,
  permit: { ...PL },
};

test("C-b7eca3f6 V1 and V2 a view shows the recorded values in the eight keys", () => {
  const view = viewOf(REC);
  assert.deepEqual(view, VW);
  assert.deepEqual(Object.keys(view), VIEW_KEYS, "the view has the eight keys in order");
  assert.deepEqual(view.permit, PL, "the permit is the recorded permit");

  view.reasons.push("changed in the view");
  assert.deepEqual(REC.reasons, ["g-lookup"], "changing a view leaves the record unchanged");
  assert.notEqual(viewOf(REC).reasons, REC.reasons, "the reasons are a copy");

  const denied = viewOf(
    record({ decision: "deny", reasons: [], errors: ["e1"], nodeId: null, permit: null }),
  );
  assert.deepEqual(denied, {
    decisionId: "d_1",
    decidedAt: "2026-11-02T10:00:01.000000Z",
    nodeId: null,
    resource: 'Block::"tenant_a/pay-once/lookup"',
    decision: "deny",
    reasons: [],
    policySetVersion: V64,
    permit: null,
  });
  assert.deepEqual(Object.keys(denied), VIEW_KEYS, "a deny view has the eight keys in order");
});

test("C-b7eca3f6 V3 to V5 an extra permit member is dropped and a malformed permit is null", () => {
  const extra = viewOf(record({ permit: { ...PL, x: 1 } }));
  assert.deepEqual(extra.permit, PL, "an extra permit member is not shown");
  assert.ok(extra.permit !== null);
  assert.deepEqual(
    Object.keys(extra.permit),
    PERMIT_KEYS,
    "the permit has exactly its six members",
  );

  const noTtl = viewOf(
    record({
      permit: {
        method: PL.method,
        host: PL.host,
        path: PL.path,
        bodyDigest: PL.bodyDigest,
        serviceId: PL.serviceId,
      },
    }),
  );
  assert.equal(noTtl.permit, null, "a permit without ttlSeconds is null");

  const wrongTtl = viewOf(record({ permit: { ...PL, ttlSeconds: "60" } }));
  assert.equal(wrongTtl.permit, null, "a permit with a string ttlSeconds is null");
});
