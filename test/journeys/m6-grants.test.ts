import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { seedServiceId } from "../../src/credentials/index.ts";
import { ApiRequestError } from "../../web/src/api/client.ts";
import type { ApiClient } from "../../web/src/api/client.ts";
import { postFlow } from "../../web/src/flows/flows.ts";
import { saveVersion, validateVersion } from "../../web/src/flows/versions.ts";
import { createCapabilityLoader } from "../../web/src/kit/capabilities.ts";
import { decisionRows, loadDecisions } from "../../web/src/runs/decisions.ts";
import { parseFakes, startDryRun } from "../../web/src/runs/dry-run.ts";
import { followRun } from "../../web/src/runs/polling.ts";
import type { RunSnapshot } from "../../web/src/runs/polling.ts";
import { loadPayload } from "../../web/src/runs/runs-source.ts";
import { stepDetailRows } from "../../web/src/runs/timeline.ts";
import { postGrant } from "../../web/src/tools/grants.ts";
import { deployPolicy, loadPolicy } from "../../web/src/tools/policies.ts";
import { approveToolSurface, loadToolServer, toolRows } from "../../web/src/tools/servers.ts";
import { egressApi } from "../support/e2e-stack/egress-part.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";
import { startE2eStack } from "../support/e2e-stack/stack.ts";
import { toolsApi } from "../support/e2e-stack/tools-part.ts";
import { sessionClient, signInAs } from "./session.ts";

const DEMO_GRANTS = [
  'ursitoare: "0.1"',
  "flow: demo-grants",
  "version: 1.0.0",
  "inputs:",
  "  type: object",
  "  properties: { vendor_name: { type: string }, amount: { type: number } }",
  "  required: [vendor_name, amount]",
  "start: lookup",
  "nodes:",
  '  lookup: { kind: block, uses: acme.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: pay }',
  "  pay:",
  "    kind: block",
  "    uses: acme.create_payment@1",
  '    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
  "    next: done",
  '  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }',
  "",
].join("\n");

const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
const FAKES_TEXT = '{"pay":[{"output":{"payment_id":"P-1","status":"created"}}]}';
const LOOKUP_PATH = "/blocks/erp.lookup_vendor@1";
const PAY_PATH = "/blocks/erp.create_payment@1";
const LOOKUP_TEXT = `lookup · allow · POST tools.fake.test${LOOKUP_PATH}`;
const PAY_TEXT = `pay · allow · stubbed · POST tools.fake.test${PAY_PATH}`;

let stack: E2eStack | undefined;

before(async () => {
  stack = await startE2eStack({ port: 0, controlPort: 0 });
  for (const handle of ["durable", "egress", "tools", "tool-servers"]) {
    assert.ok(stack.handles.has(handle), `handle ${handle}`);
  }
});

after(async () => {
  await stack?.close();
});

function running(): E2eStack {
  assert.ok(stack !== undefined);
  return stack;
}

async function signedIn(username: string): Promise<ApiClient> {
  const current = running();
  let client: ApiClient | undefined;
  await assert.doesNotReject(async () => {
    client = sessionClient(current, await signInAs(current, username));
  });
  assert.ok(client !== undefined);
  return client;
}

async function follow(client: ApiClient, runId: string): Promise<RunSnapshot> {
  let followed: RunSnapshot | undefined;
  await assert.doesNotReject(async () => {
    followed = await followRun(client, runId);
  });
  assert.ok(followed !== undefined);
  return followed;
}

function fakesOf(text: string): Record<string, unknown[]> {
  const parsed = parseFakes(text);
  assert.ok(parsed.ok);
  return parsed.fakes;
}

test("C-6d6e45b6 alice and carol take acme from pending to a stubbed payment", async () => {
  const current = running();
  const alice = await signedIn("alice");
  const carol = await signedIn("carol");
  const { fake } = egressApi(current.handles);
  const { tools } = toolsApi(current.handles);

  // /me issues a fresh CSRF token, so the tenant is read through a session of its own
  const state = await createCapabilityLoader(await signedIn("alice")).load();
  assert.ok(state.status === "ready");
  const tenantId = state.me.tenant.id;
  const svc = seedServiceId(tenantId, "acme");

  // 1. carol approves the seeded tool server
  const server = await loadToolServer(carol, "acme");
  assert.equal(server.state, "pending");
  assert.equal(server.origin, "https://tools.fake.test");
  assert.match(server.pendingDigest ?? "", /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(
    server.tools.map((t) => [t.name, t.effect, t.ref, t.untrusted_result, t.unsafe_to_retry, t.http]),
    [
      ["lookup_vendor", "read", null, false, false, { method: "POST", path: LOOKUP_PATH }],
      ["create_payment", "pay", null, false, false, { method: "POST", path: PAY_PATH }],
    ],
  );
  assert.deepEqual(
    toolRows(server).map((r) => [r.result, r.call]),
    [
      ["trusted", `POST ${LOOKUP_PATH}`],
      ["trusted", `POST ${PAY_PATH}`],
    ],
  );
  const approved = await approveToolSurface(carol, "acme", {
    digest: server.pendingDigest ?? "",
    selfApproval: false,
  });
  assert.equal(approved.state, "approved");
  assert.deepEqual(
    approved.tools.map((t) => t.ref),
    ["acme.lookup_vendor@1", "acme.create_payment@1"],
  );

  // 2. alice saves and validates demo-grants
  await postFlow(alice, { name: "demo-grants", ownerTeam: "finance" }, "k-create");
  const saved = await saveVersion(alice, { flowId: "demo-grants", text: DEMO_GRANTS }, "k-save");
  const hash = saved.version.hash;
  const validated = await validateVersion(alice, "demo-grants", hash);
  assert.equal(validated.version.validationOk, true);
  assert.deepEqual(validated.result, {
    ok: true,
    errors: [],
    warnings: [],
    layers_run: ["L1", "L2", "L3"],
  });

  // 3. carol is not on the owner team
  const refused = await startDryRun(carol, "demo-grants", hash, INPUT, fakesOf(FAKES_TEXT), "k-c").then(
    () => null,
    (e: unknown) => e,
  );
  assert.ok(refused instanceof ApiRequestError);
  assert.equal(refused.status, 403);
  assert.equal(refused.code, "FORBIDDEN");

  // 4. alice's first dry run is denied: no grant yet
  fake.clearRecords();
  tools.reset();
  const first = await startDryRun(alice, "demo-grants", hash, INPUT, fakesOf(FAKES_TEXT), "k-1");
  assert.equal(first.mode, "stub");
  assert.equal(first.ownerTeam, "finance");
  const firstDone = await follow(alice, first.id);
  assert.equal(firstDone.run.state, "failed");
  assert.deepEqual(firstDone.run.error, {
    code: "INTERPRETER_TOOL_DENIED",
    message: 'tool call of "lookup" is not permitted (policy)',
    node: "lookup",
  });
  const denied = await loadDecisions(alice, first.id);
  assert.equal(denied.decisions.length, 1);
  const deny = denied.decisions[0];
  assert.ok(deny !== undefined);
  assert.equal(deny.nodeId, "lookup");
  assert.equal(deny.resource, `Block::"${tenantId}/demo-grants/lookup"`);
  assert.equal(deny.decision, "deny");
  assert.deepEqual(deny.reasons, []);
  assert.equal(deny.permit, null);
  const denyRows = decisionRows(firstDone.run, firstDone.steps, denied.decisions);
  assert.equal(denyRows[0]?.text, "lookup · deny");
  assert.ok(
    denyRows[0]?.details.some(
      (d) => d.term === "Reasons" && d.value === "No grant or policy allows this call.",
    ),
  );
  assert.deepEqual(fake.issued(), []);
  assert.deepEqual(fake.requests(), []);
  assert.deepEqual(tools.calls(), []);

  // 5. carol grants and deploys
  await postGrant(
    carol,
    { subjectKind: "role", subject: "author", tool: "acme.lookup_vendor@1", scopeKind: "any_step", flowId: "", nodeId: "" },
    "k-g1",
  );
  await postGrant(
    carol,
    {
      subjectKind: "role",
      subject: "author",
      tool: "acme.create_payment@1",
      scopeKind: "node",
      flowId: "demo-grants",
      nodeId: "pay",
    },
    "k-g2",
  );
  const before = await loadPolicy(carol);
  assert.equal(before.version, null);
  assert.equal(before.pendingGrants, 2);
  const version = await deployPolicy(carol, "", "k-d");
  assert.match(version, /^[0-9a-f]{64}$/);
  const after = await loadPolicy(carol);
  assert.equal(after.version, version);
  assert.equal(after.pendingGrants, 0);

  // 6. alice's second dry run reads and stubs
  const second = await startDryRun(alice, "demo-grants", hash, INPUT, fakesOf(FAKES_TEXT), "k-2");
  const secondDone = await follow(alice, second.id);
  assert.equal(secondDone.run.state, "completed");
  assert.equal(secondDone.run.terminalNode, "done");
  assert.equal(secondDone.run.error, null);
  const steps = secondDone.steps;
  assert.deepEqual(
    steps.map((s) => [s.nodeId, s.kind, s.state]),
    [
      ["lookup", "block", "completed"],
      ["pay", "block", "completed"],
      ["done", "end", "completed"],
    ],
  );
  const [lookup, pay, done] = steps;
  assert.ok(lookup !== undefined && pay !== undefined && done !== undefined);
  assert.equal(lookup.idemKey, null);
  assert.match(pay.idemKey ?? "", /^ik1_[0-9a-f]{64}$/);
  const decided = await loadDecisions(alice, second.id);
  assert.equal(decided.decisions.length, 2);
  assert.equal(lookup.policyDecisionId, decided.decisions[0]?.decisionId);
  assert.equal(pay.policyDecisionId, decided.decisions[1]?.decisionId);
  assert.equal(done.policyDecisionId, null);
  assert.ok(lookup.outputRef !== null && pay.outputRef !== null);
  assert.deepEqual((await loadPayload(alice, second.id, lookup.outputRef)).data, {
    vendor_id: "V-ACME",
    status: "active",
    payment_terms_days: 30,
  });
  assert.deepEqual((await loadPayload(alice, second.id, pay.outputRef)).data, {
    payment_id: "P-1",
    status: "created",
  });
  const rows = stepDetailRows(done, "completed");
  assert.deepEqual(rows[rows.length - 1], { term: "Taint", value: "none", href: null });

  // 7. the decisions, the fake tool and the broker agree
  assert.deepEqual(
    decisionRows(secondDone.run, steps, decided.decisions).map((r) => r.text),
    [LOOKUP_TEXT, PAY_TEXT],
  );
  const calls = tools.calls();
  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.ok(call !== undefined);
  assert.equal(call.ref, "erp.lookup_vendor@1");
  assert.equal(call.method, "POST");
  assert.equal(call.host, "tools.fake.test");
  assert.equal(call.path, LOOKUP_PATH);
  assert.equal(call.callHeader, `${second.id}:lookup:1`);
  assert.equal(call.keyHeaderSeen, true);
  assert.deepEqual(call.input, { vendor_name: "Acme GmbH" });
  assert.equal(call.status, 200);
  assert.deepEqual(tools.calls({ ref: "erp.create_payment@1" }), []);
  const issued = fake.issued();
  assert.equal(issued.length, 1);
  assert.equal(issued[0]?.serviceId, svc);
  assert.equal(issued[0]?.ttlSeconds, 60);
  const requests = fake.requests();
  assert.equal(requests.length, 1);
  const request = requests[0];
  assert.ok(request !== undefined);
  assert.equal(request.serviceId, svc);
  assert.equal(request.method, "POST");
  assert.equal(request.host, "tools.fake.test");
  assert.equal(request.path, LOOKUP_PATH);
  assert.equal(request.outcome, "allowed");

  const raw = await alice.get<{ items: { permit: Record<string, unknown> | null }[] }>(
    `/runs/${second.id}/decisions`,
  );
  assert.deepEqual(raw.items[0]?.permit, {
    method: "POST",
    host: "tools.fake.test",
    path: LOOKUP_PATH,
    serviceId: svc,
    bodyDigest: call.bodySha256,
    ttlSeconds: 60,
  });
  assert.equal(raw.items[1]?.permit?.["path"], PAY_PATH);
});
