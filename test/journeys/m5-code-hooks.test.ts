import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { ApiRequestError } from "../../web/src/api/client.ts";
import type { ApiClient } from "../../web/src/api/client.ts";
import { postFlow } from "../../web/src/flows/flows.ts";
import { diagnosticRows } from "../../web/src/flows/diagnostics.ts";
import { loadVersion, saveVersion, validateVersion } from "../../web/src/flows/versions.ts";
import { graphView } from "../../web/src/flow-graph/graph-model.ts";
import { hookOverlay } from "../../web/src/flow-graph/hook-overlay.ts";
import { layoutFlow } from "../../web/src/flow-graph/layout.ts";
import { hookRows, hookTraceNote } from "../../web/src/runs/hook-rows.ts";
import { registerRunMessages } from "../../web/src/runs/messages.ts";
import { followRun } from "../../web/src/runs/polling.ts";
import type { RunSnapshot } from "../../web/src/runs/polling.ts";
import { loadPayload, loadSteps } from "../../web/src/runs/runs-source.ts";
import { startTestRun, testRunFormErrors } from "../../web/src/runs/test-run.ts";
import type { StepView } from "../../web/src/runs/types.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";
import { startE2eStack } from "../support/e2e-stack/stack.ts";
import { sessionClient, signInAs } from "./session.ts";
import type { TestSession } from "./session.ts";

const DEMO_HOOKS = `ursitoare: "0.1"
flow: demo-hooks
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, amount: { type: number } }
  required: [vendor_name, amount]
start: lookup
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "\${{ inputs.vendor_name }}" }, next: normalize }
  normalize:
    kind: code
    language: js
    input: { amount: "\${{ inputs.amount }}", status: "\${{ nodes.lookup.output.status }}" }
    source: "return { amount: Math.round(input.amount * 100) / 100, route: input.status === 'active' ? 'pay' : 'blocked' };"
    output_schema:
      type: object
      properties: { amount: { type: number }, route: { type: string, enum: [pay, blocked] } }
      required: [amount, route]
    next: route
  route: { kind: switch, on: "\${{ nodes.normalize.output.route }}", cases: { pay: pay }, default: blocked }
  pay:
    kind: block
    uses: erp.create_payment@1
    with: { vendor_id: "\${{ nodes.lookup.output.vendor_id }}", amount: "\${{ nodes.normalize.output.amount }}", currency: EUR, reference: demo }
    pre:
      - { id: guard, kind: code, source: "if (ctx.input.amount > 10000) return { action: 'fail', reason: 'over limit' };" }
    post:
      - { id: notify, kind: block, uses: slack.post_message@1, with: { channel: ap, text: "paid \${{ hook.output.payment_id }}" }, on_error: continue }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "\${{ nodes.pay.output.payment_id }}" } }
  blocked: { kind: end, status: failed }
`;

const DEMO_X3 = `ursitoare: "0.1"
flow: demo-x3
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, amount: { type: number } }
  required: [vendor_name, amount]
start: lookup
hooks:
  - { id: audit, match: { kind: [code] }, post: { kind: code, source: "return;" } }
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "\${{ inputs.vendor_name }}" }, next: classify }
  classify:
    kind: code
    language: js
    input: { amount: "\${{ inputs.amount }}" }
    source: "return { amount: input.amount };"
    output_schema:
      type: object
      properties: { amount: { type: number } }
      required: [amount]
    post:
      - { id: rush, kind: code, routes: [pay], source: "return { action: 'redirect', to: 'pay' };" }
    next: review
  review:
    kind: code
    language: js
    input: { amount: "\${{ nodes.classify.output.amount }}" }
    source: "return { approved: input.amount < 10000 };"
    output_schema:
      type: object
      properties: { approved: { type: boolean } }
      required: [approved]
    next: pay
  pay:
    kind: block
    uses: erp.create_payment@1
    with: { vendor_id: "\${{ nodes.lookup.output.vendor_id }}", amount: "\${{ nodes.classify.output.amount }}", currency: EUR, reference: demo }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "\${{ nodes.pay.output.payment_id }}" } }
`;

const INPUT = { vendor_name: "ACME", amount: 12.5 };
const MOCKS_HOOKS: Record<string, unknown> = {
  lookup: [{ output: { vendor_id: "V-1", status: "active" } }],
  pay: [{ output: { payment_id: "P-1", status: "created" } }],
  "pay:post:notify": [{ output: { ts: "1" } }],
};
const MISSING = "A block node has no mock. Add a list of mocks for every block node.";
const IDEM_KEY = /^ik1_[0-9a-f]{64}$/;

const G = {
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
} as const;

const N = {
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
  idemKey: null,
} as const;

let stack: E2eStack | undefined;

before(async () => {
  stack = await startE2eStack({ port: 0, controlPort: 0 });
  assert.ok(stack.handles.has("durable"));
});

after(async () => {
  await stack?.close();
});

function running(): E2eStack {
  assert.ok(stack !== undefined);
  return stack;
}

async function signedIn(username: string): Promise<{ client: ApiClient; session: TestSession }> {
  const current = running();
  let session: TestSession | undefined;
  await assert.doesNotReject(async () => {
    session = await signInAs(current, username);
  });
  assert.ok(session !== undefined);
  return { client: sessionClient(current, session), session };
}

async function rejection(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  assert.ok(error instanceof ApiRequestError);
  return error;
}

function mocksWithoutHook(): Record<string, unknown> {
  const mocks: Record<string, unknown> = structuredClone(MOCKS_HOOKS);
  delete mocks["pay:post:notify"];
  return mocks;
}

function stepOf(steps: readonly StepView[], nodeId: string): StepView {
  const step = steps.find((candidate) => candidate.nodeId === nodeId);
  assert.ok(step !== undefined, `there is a ${nodeId} step`);
  return step;
}

test("C-1f095289 alice and bob run demo-hooks and alice meets the X3 rule", async () => {
  const alice = await signedIn("alice");
  const bob = await signedIn("bob");

  await postFlow(alice.client, { name: "demo-hooks", ownerTeam: "finance" }, "k-hooks-flow");
  await postFlow(alice.client, { name: "demo-x3", ownerTeam: "finance" }, "k-x3-flow");

  const hooksSaved = await saveVersion(
    alice.client,
    { flowId: "demo-hooks", text: DEMO_HOOKS },
    "k-hooks-save",
  );
  const hooksHash = hooksSaved.version.hash;
  const hooksValidation = await validateVersion(alice.client, "demo-hooks", hooksHash);
  assert.equal(hooksValidation.result.ok, true);
  assert.deepEqual(hooksValidation.result.errors, []);
  assert.deepEqual(hooksValidation.result.warnings, []);
  assert.deepEqual(hooksValidation.result.layers_run, ["L1", "L2", "L3", "H"]);
  assert.equal(hooksValidation.version.state, "validated");

  const x3Saved = await saveVersion(
    alice.client,
    { flowId: "demo-x3", text: DEMO_X3 },
    "k-x3-save",
  );
  const x3Hash = x3Saved.version.hash;
  const x3Validation = await validateVersion(alice.client, "demo-x3", x3Hash);
  assert.equal(x3Validation.result.ok, false);
  assert.equal(x3Validation.version.state, "draft");
  assert.equal(x3Validation.result.errors.length, 1);
  const x3Error = x3Validation.result.errors[0];
  assert.ok(x3Error !== undefined);
  assert.equal(x3Error.layer, "H");
  assert.equal(x3Error.code, "H_ROUTE_EFFECT");
  assert.equal(x3Error.node, "classify");
  assert.equal(x3Error.path, "/nodes/classify/post/0/routes/0");
  assert.deepEqual(x3Validation.result.warnings, []);
  assert.deepEqual(x3Validation.result.layers_run, ["L1", "L2", "L3", "H"]);
  const x3Rows = diagnosticRows(x3Validation.result);
  assert.equal(
    x3Rows[0]?.where,
    "Node classify · /nodes/classify/post/0/routes/0",
  );

  const missing = await rejection(
    startTestRun(
      alice.client,
      {
        flowId: "demo-hooks",
        hash: hooksHash,
        input: INPUT,
        mocks: mocksWithoutHook(),
      },
      "k-hooks-start-missing",
    ),
  );
  assert.equal(missing.status, 422);
  assert.equal(missing.code, "TEST_MOCK_MISSING");
  registerRunMessages();
  assert.deepEqual(testRunFormErrors(missing), {
    mocks: `${MISSING} Missing: pay:post:notify.`,
  });

  const started = await startTestRun(
    alice.client,
    {
      flowId: "demo-hooks",
      hash: hooksHash,
      input: INPUT,
      mocks: MOCKS_HOOKS,
    },
    "k-hooks-start",
  );

  let followed: RunSnapshot | undefined;
  await assert.doesNotReject(async () => {
    followed = await followRun(alice.client, started.id);
  });
  assert.ok(followed !== undefined);
  assert.equal(followed.run.state, "completed");
  assert.equal(followed.run.terminalNode, "done");
  const steps = followed.steps;
  assert.deepEqual(
    steps.map((step) => step.nodeId),
    ["lookup", "normalize", "route", "pay", "done"],
  );
  assert.deepEqual(
    steps.map((step) => step.kind),
    ["block", "code", "switch", "block", "end"],
  );
  assert.ok(steps.every((step) => step.state === "completed"));
  const route = stepOf(steps, "route");
  assert.equal(route.outcome, "pay");
  const pay = stepOf(steps, "pay");

  const normalize = stepOf(steps, "normalize");
  assert.ok(normalize.inputRef !== null);
  assert.ok(normalize.outputRef !== null);
  const normalizeInput = await loadPayload(alice.client, started.id, normalize.inputRef);
  const normalizeOutput = await loadPayload(alice.client, started.id, normalize.outputRef);
  assert.deepEqual(normalizeInput.data, { amount: 12.5, status: "active" });
  assert.deepEqual(normalizeOutput.data, { amount: 12.5, route: "pay" });
  assert.ok(pay.outputRef !== null);
  const payOutput = await loadPayload(alice.client, started.id, pay.outputRef);
  assert.deepEqual(payOutput.data, { payment_id: "P-1", status: "created" });

  assert.ok(pay.hooks !== undefined && pay.hooks !== null);
  assert.equal(pay.hooks.inputOriginalRef, null);
  assert.equal(pay.hooks.entries.length, 2);
  const guard = pay.hooks.entries[0];
  assert.ok(guard !== undefined);
  assert.deepEqual(guard, G);
  const notify = pay.hooks.entries[1];
  assert.ok(notify !== undefined);
  assert.deepEqual(notify, { ...N, action: "continue", idemKey: notify.idemKey });
  assert.equal(notify.tool, "slack.post_message@1");
  assert.ok(notify.idemKey !== null && IDEM_KEY.test(notify.idemKey));

  const payRows = hookRows(pay);
  assert.deepEqual(
    payRows.map((row) => row.text),
    [
      "pre:guard · code (fused) · completed · continue",
      "post:notify · block · completed · continue",
    ],
  );
  for (const step of steps) {
    assert.equal(hookTraceNote(step), null, `${step.nodeId} has no unreadable trace`);
  }
  for (const step of steps) {
    if (step.nodeId === "pay") continue;
    assert.equal("hooks" in step, false, `${step.nodeId} carries no hooks key`);
  }

  const bobSteps = await loadSteps(bob.client, started.id);
  assert.deepEqual(bobSteps.steps, steps);

  const x3Start = await rejection(
    startTestRun(
      alice.client,
      {
        flowId: "demo-x3",
        hash: x3Hash,
        input: INPUT,
        mocks: mocksWithoutHook(),
      },
      "k-x3-start",
    ),
  );
  assert.equal(x3Start.status, 422);
  assert.equal(x3Start.code, "OPERATION_REFUSED");
  assert.deepEqual(x3Start.details, {
    reason: "version_not_runnable",
    cause: "draft",
  });

  const x3Version = await loadVersion(alice.client, "demo-x3", x3Hash);
  const layout = layoutFlow(x3Version.canonical);
  assert.equal(layout.status, "ok");
  const overlay = hookOverlay(x3Version.canonical, layout.layout);
  assert.deepEqual(overlay.routes, [{ from: "classify", to: "pay", hook: "rush" }]);
  assert.deepEqual(overlay.rules, [
    { id: "audit", match: "kind code", pre: null, post: "rule.audit" },
  ]);
  assert.deepEqual(overlay.missing, []);

  assert.equal(graphView(x3Version.canonical, true).message, "Flow graph: 5 nodes, 4 edges, 5 layers.");
});
