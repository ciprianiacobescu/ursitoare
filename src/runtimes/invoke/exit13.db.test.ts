import assert from "node:assert/strict";
import { test } from "node:test";

import type { PolicyDecisionRecord } from "../../pdp/index.ts";
import { createRunStore } from "../../runs/index.ts";
import type { RunRecord, StepRecord } from "../../runs/index.ts";
import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";

const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const D_PAY = "af25dc0c3f8ca575c8b06c393f52c90967511a03d6db13a277b748379e77d4f8";
const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };

const V1_PERMIT = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.lookup_vendor@1",
  bodyDigest: D_LV,
  serviceId: S,
  ttlSeconds: 60,
};

const V2_PERMIT = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: D_PAY,
  serviceId: S,
  ttlSeconds: 60,
};

const G_LOOKUP = {
  subject: { kind: "role", role: "author" },
  tool: "acme.lookup_vendor@1",
  scope: { kind: "any_step" },
  args: [],
};

const G_PAY = {
  subject: { kind: "role", role: "author" },
  tool: "acme.create_payment@1",
  scope: { kind: "node", flowId: "read-then-pay", nodeId: "pay" },
  args: [],
};

const PAY_IDEM_KEY = "ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714";

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function settled<T>(what: string, fn: () => Promise<T>): Promise<T> {
  let value: T | undefined;
  let done = false;
  await assert.doesNotReject(async () => {
    value = await fn();
    done = true;
  }, what);
  assert.ok(done, `${what} resolved`);
  return value as T;
}

function finalRowOf(steps: readonly StepRecord[], nodeId: string): StepRecord | undefined {
  let found: StepRecord | undefined;
  for (const step of steps) {
    if (step.nodeId === nodeId) {
      found = step;
    }
  }
  return found;
}

function assertRow(row: PolicyDecisionRecord, grantId: string, permit: unknown): void {
  assert.equal(row.decision, "allow");
  assert.equal(row.action, "invoke_tool");
  assert.deepEqual(row.reasons, [grantId]);
  assert.deepEqual(row.errors, []);
  assert.deepEqual(row.permit, permit);
}

test("C-5f1d4a7d a live run sends exactly what each permit allows", async () => {
  const h = await settled("invokeHarness resolves", () => invokeHarness());
  try {
    assert.equal(typeof h.run, "function");
    const gLookup = await settled("G_LOOKUP is created", () => h.grant(G_LOOKUP));
    const gPay = await settled("G_PAY is created", () =>
      h.grant({ ...G_PAY, versionHash: h.hashes.H1 }),
    );
    await settled("the granted layer is deployed", () => h.deploy(""));

    const run: RunRecord = await settled("h.run resolves", () => h.run("H1", INPUT, "r_1"));
    assert.equal(run.state, "completed");

    const rows = await h.decisions("r_1");
    assert.equal(rows.length, 2);
    const lookupRow = rows[0];
    const payRow = rows[1];
    assert.ok(lookupRow !== undefined && payRow !== undefined);
    assert.equal(lookupRow.nodeId, "lookup");
    assert.equal(payRow.nodeId, "pay");
    assertRow(lookupRow, gLookup.id, V1_PERMIT);
    assertRow(payRow, gPay.id, V2_PERMIT);

    const calls = h.tools.calls();
    assert.equal(calls.length, 2);
    const lookupCall = calls[0];
    const payCall = calls[1];
    assert.ok(lookupCall !== undefined && payCall !== undefined);
    assert.equal(lookupCall.method, "POST");
    assert.equal(lookupCall.host, "tools.fake.test");
    assert.equal(lookupCall.path, "/blocks/erp.lookup_vendor@1");
    assert.equal(lookupCall.bodySha256, D_LV);
    assert.equal(lookupCall.callHeader, "r_1:lookup:1");
    assert.equal(lookupCall.idempotencyKey, null);
    assert.equal(payCall.method, "POST");
    assert.equal(payCall.host, "tools.fake.test");
    assert.equal(payCall.path, "/blocks/erp.create_payment@1");
    assert.equal(payCall.bodySha256, D_PAY);
    assert.equal(payCall.callHeader, "r_1:pay:1");
    assert.equal(payCall.idempotencyKey, PAY_IDEM_KEY);

    const forwards = h.egress.requests();
    assert.equal(forwards.length, 2);
    for (const forward of forwards) {
      assert.equal(forward.outcome, "allowed");
      assert.equal(forward.serviceId, S);
    }
    const tokens = h.egress.issued();
    assert.equal(tokens.length, 2);
    for (const token of tokens) {
      assert.equal(token.serviceId, S);
      assert.equal(token.ttlSeconds, 60);
    }

    const store = createRunStore(h.pool);
    const listed = await settled("the run steps are listed", () =>
      store.listSteps(h.ctx, "r_1", { limit: 50 }),
    );
    const lookupRow0 = finalRowOf(listed.steps, "lookup");
    const payRow0 = finalRowOf(listed.steps, "pay");
    const doneRow = finalRowOf(listed.steps, "done");
    assert.ok(lookupRow0 !== undefined && payRow0 !== undefined && doneRow !== undefined);
    assert.equal(lookupRow0.policyDecisionId, lookupRow.decisionId);
    assert.equal(payRow0.policyDecisionId, payRow.decisionId);
    assert.equal(doneRow.policyDecisionId, null);
  } finally {
    await h.close();
  }
});
