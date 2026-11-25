import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import type { ApiClient } from "../../web/src/api/client.ts";
import { postFlow } from "../../web/src/flows/flows.ts";
import { saveVersion, validateVersion } from "../../web/src/flows/versions.ts";
import { decisionRows, loadDecisions } from "../../web/src/runs/decisions.ts";
import { startDryRun } from "../../web/src/runs/dry-run.ts";
import { followRun } from "../../web/src/runs/polling.ts";
import type { RunSnapshot } from "../../web/src/runs/polling.ts";
import { loadPayload } from "../../web/src/runs/runs-source.ts";
import { credentialBody, storeCredential } from "../../web/src/tools/credentials.ts";
import { postGrant } from "../../web/src/tools/grants.ts";
import { deployPolicy } from "../../web/src/tools/policies.ts";
import {
  codeRegistration,
  mcpRegistration,
  openApiRegistration,
  previewOperations,
  previewRequest,
  registerServer,
} from "../../web/src/tools/register.ts";
import type { RegistrationRequest } from "../../web/src/tools/register.ts";
import {
  changesView,
  discoverBody,
  discoverTools,
  initialDraft,
  loadServerReview,
  parseReviewTools,
} from "../../web/src/tools/review.ts";
import { approveToolSurface } from "../../web/src/tools/servers.ts";
import { egressApi } from "../support/e2e-stack/egress-part.ts";
import { mcpApi } from "../support/e2e-stack/mcp-part.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";
import { startE2eStack } from "../support/e2e-stack/stack.ts";
import { toolsApi } from "../support/e2e-stack/tools-part.ts";
import { FAKE_MCP_TOOLS } from "../support/fake-mcp/index.ts";
import type { FakeMcpTool } from "../support/fake-mcp/index.ts";
import { sessionClient, signInAs } from "./session.ts";

const CRM_KEY = "e2e-crm-key";
const LEDGER_KEY = "e2e-ledger-key";
const W1 = "884bf0ecc3569c8bc3cb7ee6d3fe044f5ae98593478ddbbaa9975e35801bba28";
const W3 = "76269e460a435d1338b204ce7cd4f0be1b20e25e1da8ad458d0a4b8e3e164c3f";

const INPUT = { vendor_name: "Acme GmbH", vendor_id: "V-ACME", amount: 12.5 };
const FAKES = { pay: [{ output: { payment_id: "P-7", status: "created" } }] };
const SRC = 'return { band: input.amount > 1000 ? "high" : "low" };';
const CALC_IN = JSON.stringify({
  type: "object",
  properties: { amount: { type: "number" } },
  required: ["amount"],
  additionalProperties: false,
});
const CALC_OUT = JSON.stringify({
  type: "object",
  properties: { band: { type: "string" } },
  required: ["band"],
  additionalProperties: false,
});

const PAY_IN = {
  type: "object",
  properties: {
    vendor_id: { type: "string" },
    amount: { type: "number" },
    currency: { type: "string" },
    reference: { type: "string" },
  },
  required: ["vendor_id", "amount", "currency", "reference"],
};
const PAY_OUT = {
  type: "object",
  properties: { payment_id: { type: "string" }, status: { type: "string" } },
  required: ["payment_id", "status"],
};
const LOOK_IN = {
  type: "object",
  properties: { vendor_name: { type: "string" } },
  required: ["vendor_name"],
};
const LOOK_OUT = {
  type: "object",
  properties: {
    vendor_id: { type: "string" },
    status: { type: "string", enum: ["active", "blocked"] },
    payment_terms_days: { type: "integer" },
  },
  required: ["vendor_id", "status"],
};

function operation(id: string, code: string, req: unknown, res: unknown): unknown {
  return {
    post: {
      operationId: id,
      requestBody: { content: { "application/json": { schema: req } } },
      responses: { [code]: { description: "ok", content: { "application/json": { schema: res } } } },
    },
  };
}

const DOC = JSON.stringify({
  openapi: "3.0.3",
  paths: {
    "/blocks/erp.create_payment@1": operation("createPayment", "201", PAY_IN, PAY_OUT),
    "/blocks/erp.lookup_vendor@1": operation("lookupVendor", "200", LOOK_IN, LOOK_OUT),
  },
});

const DEMO_LIVE = [
  'ursitoare: "0.1"',
  "flow: demo-live",
  "version: 1.0.0",
  "inputs:",
  "  type: object",
  "  properties: { vendor_name: { type: string }, vendor_id: { type: string }, amount: { type: number } }",
  "  required: [vendor_name, vendor_id, amount]",
  "start: find",
  "nodes:",
  '  find: { kind: block, uses: crm.find_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: score }',
  '  score: { kind: block, uses: calc.risk_score@1, with: { amount: "${{ inputs.amount }}" }, next: vendor }',
  '  vendor: { kind: block, uses: ledger.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: pay }',
  "  pay:",
  "    kind: block",
  "    uses: ledger.create_payment@1",
  '    with: { vendor_id: "${{ inputs.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }',
  "    next: done",
  '  done: { kind: end, status: completed, output: { status: "${{ nodes.find.output.status }}", band: "${{ nodes.score.output.band }}", payment_id: "${{ nodes.pay.output.payment_id }}" } }',
  "",
].join("\n");

const HDR: FakeMcpTool = {
  name: "route_ticket",
  inputSchema: {
    type: "object",
    properties: { region: { type: "string", "x-mcp-header": "Region" } },
    required: ["region"],
  },
  annotations: { readOnlyHint: true },
  result: (): { text: string } => ({ text: "routed" }),
};

interface CredentialItems {
  items: { toolServerId: string; serviceId: string }[];
}

interface PolicyDecisionItems {
  items: {
    decision: string;
    reasons: string[];
    permit: Record<string, unknown> | null;
  }[];
}

interface RunDecisionItems {
  items: { nodeId: string | null; permit: Record<string, unknown> | null }[];
}

let stack: E2eStack | undefined;

before(async () => {
  stack = await startE2eStack({ port: 0, controlPort: 0 });
  for (const handle of ["durable", "egress", "tools", "tool-servers", "mcp"]) {
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

function present<T>(value: T | null | undefined, what: string): T {
  assert.ok(value !== null && value !== undefined, what);
  return value;
}

function okRequest(req: RegistrationRequest): Extract<RegistrationRequest, { ok: true }> {
  assert.ok(req.ok);
  return req;
}

function toolLines(surface: unknown): string[] {
  const tools = parseReviewTools(surface);
  assert.ok(tools !== null);
  return tools.map((t) =>
    [t.name, t.effect, t.untrusted_result, t.unsafe_to_retry, t.call, t.hints].join("|"),
  );
}

async function serviceOf(client: ApiClient, serverId: string): Promise<string> {
  const list = await client.get<CredentialItems>("/credentials", { query: { limit: 200 } });
  const item = list.items.find((i) => i.toolServerId === serverId);
  return present(item, `credential of ${serverId}`).serviceId;
}

async function follow(client: ApiClient, runId: string): Promise<RunSnapshot> {
  let followed: RunSnapshot | undefined;
  await assert.doesNotReject(async () => {
    followed = await followRun(client, runId);
  });
  return present(followed, "followed run");
}

test("C-ef502704 carol registers three servers and alice dry-runs through all three adapters", async () => {
  const current = running();
  const carol = await signedIn("carol");
  const alice = await signedIn("alice");
  const { fake } = egressApi(current.handles);
  const { tools } = toolsApi(current.handles);
  const { mcp } = mcpApi(current.handles);
  mcp.setTools([...FAKE_MCP_TOOLS, HDR]);

  // 1. MCP: register, store the credential, discover, set find_vendor to read
  const crm = await registerServer(
    carol,
    okRequest(mcpRegistration({ id: "crm", url: "https://mcp.fake.test/mcp", local: false })),
    "k-r-crm",
  );
  assert.equal(crm.id, "crm");
  const crmBody = credentialBody("crm", { authScheme: "BEARER_TOKEN", headerName: "", value: CRM_KEY });
  assert.ok(crmBody.ok);
  await storeCredential(carol, crmBody.body, "k-c-crm");
  const crmSvc = await serviceOf(carol, "crm");

  const first = await discoverTools(carol, "crm", discoverBody(initialDraft([])), "k-d1");
  assert.deepEqual(first, {
    protocolVersion: "2026-07-28",
    era: "modern",
    count: 2,
    excluded: [{ name: "route_ticket", reason: "x_mcp_header" }],
  });
  const review1 = await loadServerReview(carol, "crm");
  assert.equal(review1.server.state, "pending");
  assert.equal(review1.approved, null);
  const changes = changesView(review1.approved, review1.pending);
  assert.deepEqual(
    changes.items.map((i) => i.text),
    ["added find_vendor", "added log_note"],
  );
  for (const item of changes.items) {
    assert.ok(item.lines.includes("Description: (none)"), item.text);
  }
  const lines1 = toolLines(review1.pending);
  assert.equal(lines1[0], "find_vendor|write|true|true|mcp find_vendor (2026-07-28)|read-only");
  assert.ok(present(lines1[1], "log_note line").startsWith("log_note|write|true|true|"));
  assert.ok(present(lines1[1], "log_note line").endsWith("|not read-only, idempotent"));

  await discoverTools(carol, "crm", discoverBody({ effects: { find_vendor: "read", log_note: "" } }), "k-d2");
  const review2 = await loadServerReview(carol, "crm");
  assert.equal(
    toolLines(review2.pending)[0],
    "find_vendor|read|true|true|mcp find_vendor (2026-07-28)|read-only",
  );

  // 2. discovery on the wire
  const discoveryWire = mcp.requests();
  assert.deepEqual(
    discoveryWire.map((r) => r.method),
    ["server/discover", "tools/list", "server/discover", "tools/list"],
  );
  for (const [i, r] of discoveryWire.entries()) {
    assert.equal(r.era, "modern");
    assert.equal(r.host, "mcp.fake.test");
    assert.equal(r.path, "/mcp");
    assert.equal(r.status, 200);
    assert.equal(r.headers["authorization"], "[credential]");
    assert.match(r.callHeader ?? "", /^disc_[0-9a-f-]{36}:crm:[12]$/);
    if (i === 0 || i === 2) assert.equal(r.bodySha256, W3);
  }
  const registerDecisions = await carol.get<PolicyDecisionItems>("/policy-decisions", {
    query: { action: "register_tool_server", order: "asc", limit: 100 },
  });
  const permitted = registerDecisions.items.filter((i) => i.permit !== null);
  assert.equal(permitted.length, 4);
  for (const [i, item] of permitted.entries()) {
    assert.equal(item.decision, "allow");
    assert.ok(item.reasons.includes("tools-register-admin"));
    assert.deepEqual(item.permit, {
      method: "POST",
      host: "mcp.fake.test",
      path: "/mcp",
      serviceId: crmSvc,
      bodyDigest: discoveryWire[i]?.bodySha256,
      ttlSeconds: 60,
    });
  }
  const discoveryTokens = fake.issued();
  assert.equal(discoveryTokens.length, 4);
  for (const t of discoveryTokens) {
    assert.equal(t.serviceId, crmSvc);
    assert.equal(t.ttlSeconds, 60);
  }
  const discoveryForwarded = fake.requests();
  assert.equal(discoveryForwarded.length, 4);
  for (const r of discoveryForwarded) assert.equal(r.outcome, "allowed");

  // 3. OpenAPI and code
  const preview = await previewOperations(
    carol,
    okRequest(previewRequest({ id: "", origin: "https://tools.fake.test", local: false, documentText: DOC, effects: {} })),
  );
  assert.equal(preview.operations.length, 2);
  for (const op of preview.operations) assert.equal(op.excluded, null);
  const ledger = await registerServer(
    carol,
    okRequest(
      openApiRegistration({
        id: "ledger",
        origin: "https://tools.fake.test",
        local: false,
        documentText: DOC,
        effects: { createPayment: "pay", lookupVendor: "read" },
      }),
    ),
    "k-r-ledger",
  );
  assert.equal(ledger.id, "ledger");
  const ledgerBody = credentialBody("ledger", {
    authScheme: "API_KEY_HEADER",
    headerName: "x-fake-tools-key",
    value: LEDGER_KEY,
  });
  assert.ok(ledgerBody.ok);
  const stored = await storeCredential(carol, ledgerBody.body, "k-c-ledger");
  assert.equal(stored.authScheme, "API_KEY_HEADER");
  assert.equal(stored.headerName, "x-fake-tools-key");
  assert.equal(stored.keyVersion, 1);
  const ledgerSvc = await serviceOf(carol, "ledger");
  const ledgerReview = await loadServerReview(carol, "ledger");
  assert.deepEqual(toolLines(ledgerReview.pending), [
    "create_payment|pay|true|true|POST /blocks/erp.create_payment@1|—",
    "lookup_vendor|read|true|false|POST /blocks/erp.lookup_vendor@1|—",
  ]);

  assert.equal(SRC.length, 54);
  await registerServer(
    carol,
    okRequest(
      codeRegistration({
        id: "calc",
        name: "risk_score",
        description: "",
        inputText: CALC_IN,
        outputText: CALC_OUT,
        source: SRC,
      }),
    ),
    "k-r-calc",
  );
  const calcReview = await loadServerReview(carol, "calc");
  assert.deepEqual(toolLines(calcReview.pending), ["risk_score|read|false|false|code (54 characters)|—"]);

  // 4. approve, flow, grants
  const crmApproved = await approveToolSurface(carol, "crm", {
    digest: present(review2.server.pendingDigest, "crm digest"),
    selfApproval: true,
  });
  assert.deepEqual(
    crmApproved.tools.map((t) => t.ref),
    ["crm.find_vendor@1", "crm.log_note@1"],
  );
  await approveToolSurface(carol, "ledger", {
    digest: present(ledgerReview.server.pendingDigest, "ledger digest"),
    selfApproval: true,
  });
  await approveToolSurface(carol, "calc", {
    digest: present(calcReview.server.pendingDigest, "calc digest"),
    selfApproval: true,
  });

  await postFlow(alice, { name: "demo-live", ownerTeam: "finance" }, "k-flow");
  const saved = await saveVersion(alice, { flowId: "demo-live", text: DEMO_LIVE }, "k-save");
  const hash = saved.version.hash;
  const validated = await validateVersion(alice, "demo-live", hash);
  assert.equal(validated.result.ok, true);
  assert.deepEqual(validated.result.errors, []);
  assert.deepEqual(
    validated.result.warnings.map((w: { code: string }) => w.code),
    ["W_LETHAL_TRIFECTA"],
  );

  let grantNo = 0;
  for (const tool of [
    "crm.find_vendor@1",
    "calc.risk_score@1",
    "ledger.lookup_vendor@1",
    "ledger.create_payment@1",
  ]) {
    grantNo += 1;
    await postGrant(
      carol,
      { subjectKind: "role", subject: "author", tool, scopeKind: "any_step", flowId: "", nodeId: "" },
      `k-g${grantNo}`,
    );
  }
  await deployPolicy(carol, "", "k-deploy");
  fake.clearRecords();
  tools.reset();
  mcp.reset();

  // 5. the dry run
  const started = await startDryRun(alice, "demo-live", hash, INPUT, FAKES, "k-1");
  const done = await follow(alice, started.id);
  const runId = started.id;
  assert.equal(done.run.state, "completed");
  assert.equal(done.run.terminalNode, "done");
  assert.deepEqual(
    done.steps.map((s) => [s.nodeId, s.state, s.taint]),
    [
      ["find", "completed", []],
      ["score", "completed", []],
      ["vendor", "completed", []],
      ["pay", "completed", []],
      ["done", "completed", ["untrusted"]],
    ],
  );
  const byNode = new Map(done.steps.map((s) => [s.nodeId, s]));
  for (const id of ["find", "score", "vendor"]) {
    assert.equal(present(byNode.get(id), id).idemKey, null);
  }
  assert.match(present(byNode.get("pay"), "pay").idemKey ?? "", /^ik1_[0-9a-f]{64}$/);
  const expectedOutputs: [string, unknown][] = [
    ["find", { vendor_id: "V-ACME", status: "active" }],
    ["score", { band: "low" }],
    ["vendor", { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 }],
    ["pay", { payment_id: "P-7", status: "created" }],
  ];
  for (const [id, output] of expectedOutputs) {
    const ref = present(present(byNode.get(id), id).outputRef, `${id} output`);
    assert.deepEqual((await loadPayload(alice, runId, ref)).data, output, id);
  }
  const decided = await loadDecisions(alice, runId);
  assert.deepEqual(
    decisionRows(done.run, done.steps, decided.decisions).map((r) => r.text),
    [
      "find · allow · POST mcp.fake.test/mcp",
      "score · allow",
      "vendor · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1",
      "pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1",
    ],
  );

  // 6. each adapter live
  const mcpCalls = mcp.requests();
  assert.equal(mcpCalls.length, 1);
  const mcpCall = present(mcpCalls[0], "mcp call");
  assert.equal(mcpCall.method, "tools/call");
  assert.equal(mcpCall.toolName, "find_vendor");
  assert.equal(mcpCall.callHeader, `${runId}:find:1`);
  assert.equal(mcpCall.bodySha256, W1);
  const raw = await alice.get<RunDecisionItems>(`/runs/${runId}/decisions`);
  const permitOf = (node: string): Record<string, unknown> | null =>
    present(
      raw.items.find((i) => i.nodeId === node),
      `decision of ${node}`,
    ).permit;
  assert.equal(permitOf("find")?.["bodyDigest"], mcpCall.bodySha256);
  assert.equal(permitOf("score"), null);

  const httpCalls = tools.calls();
  assert.equal(httpCalls.length, 1);
  const httpCall = present(httpCalls[0], "tools call");
  assert.equal(httpCall.ref, "erp.lookup_vendor@1");
  assert.equal(httpCall.method, "POST");
  assert.equal(httpCall.callHeader, `${runId}:vendor:1`);
  assert.equal(httpCall.keyHeaderSeen, true);
  assert.deepEqual(httpCall.input, { vendor_name: "Acme GmbH" });
  assert.equal(httpCall.status, 200);
  assert.equal(permitOf("vendor")?.["bodyDigest"], httpCall.bodySha256);
  assert.deepEqual(tools.calls({ ref: "erp.create_payment@1" }), []);

  const issued = fake.issued();
  assert.deepEqual(
    issued.map((t) => [t.serviceId, t.ttlSeconds]),
    [
      [crmSvc, 60],
      [ledgerSvc, 60],
    ],
  );
  const forwarded = fake.requests();
  assert.deepEqual(
    forwarded.map((r) => [r.host, r.path, r.outcome]),
    [
      ["mcp.fake.test", "/mcp", "allowed"],
      ["tools.fake.test", "/blocks/erp.lookup_vendor@1", "allowed"],
    ],
  );

  // no record holds a secret
  const everything = JSON.stringify([discoveryWire, mcpCalls, httpCalls, issued, forwarded, raw, registerDecisions]);
  assert.ok(!everything.includes(CRM_KEY));
  assert.ok(!everything.includes(LEDGER_KEY));
});
