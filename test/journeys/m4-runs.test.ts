import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { ApiRequestError } from "../../web/src/api/client.ts";
import type { ApiClient } from "../../web/src/api/client.ts";
import { postFlow } from "../../web/src/flows/flows.ts";
import { saveVersion, validateVersion } from "../../web/src/flows/versions.ts";
import { createCapabilityLoader } from "../../web/src/kit/capabilities.ts";
import { registerRunMessages } from "../../web/src/runs/messages.ts";
import { followRun } from "../../web/src/runs/polling.ts";
import type { RunSnapshot } from "../../web/src/runs/polling.ts";
import { loadPayload, loadRun, runListFetcher } from "../../web/src/runs/runs-source.ts";
import { startTestRun, testRunFormErrors } from "../../web/src/runs/test-run.ts";
import type { RunView } from "../../web/src/runs/types.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";
import { startE2eStack } from "../support/e2e-stack/stack.ts";
import { sessionClient, signInAs } from "./session.ts";
import type { TestSession } from "./session.ts";

const DEMO_PAY = [
  'ursitoare: "0.1"',
  "flow: demo-pay",
  "version: 1.0.0",
  "inputs:",
  "  type: object",
  "  properties:",
  "    vendor_name: { type: string }",
  "    amount: { type: number }",
  "  required: [vendor_name, amount]",
  "start: lookup",
  "nodes:",
  '  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: route }',
  '  route: { kind: switch, on: "${{ nodes.lookup.output.status }}", cases: { active: pay }, default: blocked }',
  "  pay:",
  "    kind: block",
  "    uses: erp.create_payment@1",
  '    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
  "    next: done",
  '  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }',
  "  blocked: { kind: end, status: failed }",
  "",
].join("\n");

const INPUT = { vendor_name: "ACME", amount: 12.5 };
const MOCKS = {
  lookup: [{ output: { vendor_id: "V-1", status: "active" } }],
  pay: [{ output: { payment_id: "P-1", status: "created" } }],
};
const PAY_INPUT = { vendor_id: "V-1", amount: 12.5, currency: "EUR", reference: "demo" };
const MISSING = "A block node has no mock. Add a list of mocks for every block node.";

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

async function listIds(client: ApiClient): Promise<string[]> {
  const page = await runListFetcher(client)({ cursor: null, limit: 50, signal: new AbortController().signal });
  return page.items.map((run) => run.id);
}

async function capabilitiesOf(client: ApiClient): Promise<ReadonlySet<string>> {
  const state = await createCapabilityLoader(client).load();
  assert.equal(state.status, "ready");
  assert.ok(state.status === "ready");
  return state.me.capabilities;
}

test("C-e75f18dc alice, bob and mallory use the engine", async () => {
  const alice = await signedIn("alice");
  const bob = await signedIn("bob");
  const mallory = await signedIn("mallory");

  await postFlow(alice.client, { name: "demo-pay", ownerTeam: "finance" }, "k-create");
  const saved = await saveVersion(alice.client, { flowId: "demo-pay", text: DEMO_PAY }, "k-save");
  const hash = saved.version.hash;
  const validated = await validateVersion(alice.client, "demo-pay", hash);
  assert.equal(validated.version.validationOk, true);

  const started = await startTestRun(
    alice.client,
    { flowId: "demo-pay", hash, input: INPUT, mocks: MOCKS },
    "k-start",
  );
  assert.equal(started.flowId, "demo-pay");
  assert.equal(started.mode, "mock");
  assert.equal(started.ownerTeam, "finance");
  assert.equal(started.principal.userId, alice.session.userId);

  let followed: RunSnapshot | undefined;
  await assert.doesNotReject(async () => {
    followed = await followRun(alice.client, started.id);
  });
  assert.ok(followed !== undefined);
  assert.equal(followed.run.state, "completed");
  assert.equal(followed.run.terminalNode, "done");
  assert.equal(followed.truncated, false);
  const steps = followed.steps;
  assert.deepEqual(
    steps.map((s) => s.nodeId),
    ["lookup", "route", "pay", "done"],
  );
  assert.deepEqual(
    steps.map((s) => s.kind),
    ["block", "switch", "block", "end"],
  );
  assert.ok(steps.every((s) => s.state === "completed"));
  assert.equal(steps[1]?.outcome, "active");

  const pay = steps[2];
  assert.ok(pay !== undefined);
  assert.ok(pay.inputRef !== null);
  assert.ok(pay.outputRef !== null);
  const payInput = await loadPayload(alice.client, started.id, pay.inputRef);
  const payOutput = await loadPayload(alice.client, started.id, pay.outputRef);
  assert.deepEqual(payInput.data, PAY_INPUT);
  assert.deepEqual(payOutput.data, { payment_id: "P-1", status: "created" });

  assert.ok((await listIds(alice.client)).includes(started.id));
  assert.ok((await listIds(bob.client)).includes(started.id));
  const seen: RunView = await loadRun(bob.client, started.id);
  assert.equal(seen.id, started.id);

  const refused = await rejection(
    startTestRun(bob.client, { flowId: "demo-pay", hash, input: INPUT, mocks: MOCKS }, "k-bob"),
  );
  assert.equal(refused.status, 403);

  const hidden = await rejection(loadRun(mallory.client, started.id));
  assert.equal(hidden.status, 404);
  assert.deepEqual(await listIds(mallory.client), []);

  const missing = await rejection(
    startTestRun(alice.client, { flowId: "demo-pay", hash, input: INPUT, mocks: {} }, "k-missing"),
  );
  assert.equal(missing.status, 422);
  assert.equal(missing.code, "TEST_MOCK_MISSING");
  registerRunMessages();
  assert.deepEqual(testRunFormErrors(missing), { mocks: `${MISSING} Missing: lookup, pay.` });

  const aliceCapabilities = await capabilitiesOf(alice.client);
  const bobCapabilities = await capabilitiesOf(bob.client);
  assert.ok(aliceCapabilities.has("read_run"));
  assert.ok(bobCapabilities.has("read_run"));
  assert.ok(aliceCapabilities.has("test_flow"));
  assert.equal(bobCapabilities.has("test_flow"), false);
});
