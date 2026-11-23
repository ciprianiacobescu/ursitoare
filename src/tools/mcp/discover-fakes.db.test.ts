import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createGateway, mintkeyTenantId } from "../../gateway/index.ts";
import type { StepContext, ToolCall } from "../../interpreter/index.ts";
import { createLogger } from "../../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../../pdp/index.ts";
import type { PrincipalEntity } from "../../pdp/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { submitAdapterSurfaceTx } from "../adapter-store.ts";
import { approveSurface } from "../store.ts";
import { surfaceDigest } from "../surface.ts";
import { startFakeEgress } from "../../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../../test/support/fake-egress/index.ts";
import {
  FAKE_MCP_HOST,
  FAKE_MCP_ORIGIN,
  FAKE_MCP_TOOLS,
  startFakeMcp,
} from "../../../test/support/fake-mcp/index.ts";
import type { FakeMcp, FakeMcpOptions, FakeMcpTool } from "../../../test/support/fake-mcp/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import { kitBinding } from "../../../test/support/adapter-kit.ts";
import { mcpCallAdapter } from "./adapter.ts";
import { discoverMcp } from "./discover.ts";
import type { McpDiscovery, McpDiscoveryDeps } from "./discover.ts";
import { registerMcpServerTx } from "./register.ts";

assert.equal(typeof discoverMcp, "function");
assert.equal(typeof registerMcpServerTx, "function");

const T0 = "2026-11-06T10:00:00.000Z";
const S_ID = "87caf624-f579-8435-9540-24d6eb57aeff";
const W1 = "884bf0ecc3569c8bc3cb7ee6d3fe044f5ae98593478ddbbaa9975e35801bba28";
const W3 = "76269e460a435d1338b204ce7cd4f0be1b20e25e1da8ad458d0a4b8e3e164c3f";
const W4 = "7024e8cbb64460ab1752dbdb0e218cba37841854275e7e21a7227e1144f49ce6";
const W5 = "c01acc5d43647dfe74d55a6c24e26a748188851204d330e6d1f1d7e64b2ed999";
const W6 = "c2e762215efb0d1e2077566a9267636485e3e582db86b133dddb60e338beb8a2";
const W8 = "86d054baa44ee2f470bd2acda333ee42f8ffae1f5764a0c502bc10ae88720d7b";
const SESSION_MESSAGE = "the MCP server needs a stateful session, which Ursitoare does not support yet";
const ALLOW_ALL = '@id("t-allow-all") permit (principal, action == Action::"invoke_tool", resource);';
const D1_HINT = "fake-mcp-session-1";
const CAROL: PrincipalEntity = {
  tenantId: "tenant_a",
  userId: "u_carol",
  kind: "human",
  roles: ["tenant_admin"],
  teams: [],
};
const INPUT = { serverId: "docs", endpoint: "/mcp", principal: CAROL, overlay: { tools: {} } };
const INPUT_L1 = { vendor_name: "Acme GmbH", amount: 12.5 };

function toolAt(index: number): FakeMcpTool {
  const tool = FAKE_MCP_TOOLS[index];
  if (tool === undefined) throw new Error("fake MCP tool is missing");
  return tool;
}

const T_FIND = toolAt(0);
const T_LOG = toolAt(1);

function silentLogger() {
  return createLogger({ level: "silent", destination: { write(_line: string): void {} } });
}

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

interface Fakes {
  db: TestDatabase;
  ctx: TenantContext;
  mcp: FakeMcp;
  egress: FakeEgress;
  deps: McpDiscoveryDeps;
  close(): Promise<void>;
}

async function startFakes(opts: FakeMcpOptions = {}): Promise<Fakes> {
  const closers: (() => Promise<void>)[] = [];
  try {
    const db = await withTestDatabase();
    closers.push(() => db.close());
    const { a: ctx } = await seedTwoTenants(db);
    const mcp = await startFakeMcp({ keyHeader: null, ...opts });
    closers.push(() => mcp.close());
    const egress = await startFakeEgress({ now: () => new Date(T0) });
    closers.push(() => egress.close());
    egress.addUpstream(FAKE_MCP_HOST, mcp.origin);
    egress.addCredentialless(S_ID, mintkeyTenantId("tenant_a"), FAKE_MCP_ORIGIN);
    const logger = silentLogger();
    const clock = fixedClock(T0);
    const gateway = createGateway(
      {
        brokerUrl: egress.brokerUrl,
        proxyUrl: egress.proxyUrl,
        brokerToken: new Secret(egress.brokerServiceToken),
        agentId: "ursitoare-engine",
        vault: null,
      },
      { clock, logger },
    );
    const policy = await createPolicyEngine({ srcDir: defaultSrcDir(), clock, ids: sequentialIds(1), logger });
    const deps: McpDiscoveryDeps = {
      pool: db.appPool,
      policy,
      gateway,
      services: { resolve: async () => ({ serviceId: S_ID, origin: FAKE_MCP_ORIGIN }) },
      ids: sequentialIds(1),
    };
    let closed = false;
    return {
      db,
      ctx,
      mcp,
      egress,
      deps,
      async close(): Promise<void> {
        if (closed) return;
        closed = true;
        for (const closer of [...closers].reverse()) {
          await closer().catch(() => undefined);
        }
      },
    };
  } catch (error) {
    for (const closer of [...closers].reverse()) {
      await closer().catch(() => undefined);
    }
    throw error;
  }
}

async function discover(f: Fakes): Promise<McpDiscovery> {
  return settled("discoverMcp resolves", () => discoverMcp(f.deps, f.ctx, INPUT));
}

interface DecisionRow {
  decision_id: string;
  decision: string;
  action: string;
  reasons: string[];
  run_id: string | null;
  node_id: string | null;
  permit: unknown;
}

async function decisionsOf(f: Fakes): Promise<DecisionRow[]> {
  const result = await withTenantTx(f.db.appPool, f.ctx, (tx) =>
    tx.query<DecisionRow>(
      `SELECT decision_id, decision, action, reasons, run_id, node_id, permit
         FROM ursitoare.policy_decision
        WHERE tenant_id = $1
        ORDER BY decision_id`,
      [f.ctx.tenantId],
    ),
  );
  return result.rows;
}

async function surfaceRowsOf(f: Fakes): Promise<number> {
  const result = await withTenantTx(f.db.appPool, f.ctx, (tx) =>
    tx.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM ursitoare.tool_surface
        WHERE tenant_id = $1 AND tool_server_id = $2`,
      [f.ctx.tenantId, "docs"],
    ),
  );
  return result.rows[0]?.n ?? -1;
}

function namesOf(d: McpDiscovery): string[] {
  return d.surface.tools.map((tool) => tool.name);
}

function expectedPermit(bodyDigest: string): unknown {
  return {
    method: "POST",
    host: "mcp.fake.test",
    path: "/mcp",
    bodyDigest,
    serviceId: S_ID,
    ttlSeconds: 60,
  };
}

function assertIssued(f: Fakes, count: number): void {
  const issued = f.egress.issued();
  assert.equal(issued.length, count);
  for (const token of issued) {
    assert.equal(token.serviceId, S_ID);
    assert.equal(token.tenantId, mintkeyTenantId("tenant_a"));
    assert.equal(token.agentId, "ursitoare-engine");
    assert.equal(token.ttlSeconds, 60);
  }
}

test("C-7c08ae13 F1 modern discovery records two decisions through the fake egress", async () => {
  const f = await startFakes();
  try {
    const d = await discover(f);
    assert.equal(d.era, "modern");
    assert.equal(d.protocolVersion, "2026-07-28");
    assert.deepEqual(namesOf(d).sort(), ["find_vendor", "log_note"]);
    assert.deepEqual(d.excluded, []);
    assert.deepEqual(d.decisionIds, [
      "dec_00000000-0000-7000-8000-000000000001",
      "dec_00000000-0000-7000-8000-000000000002",
    ]);

    const requests = f.mcp.requests();
    assert.equal(requests.length, 2);
    const first = requests[0];
    const second = requests[1];
    assert.ok(first !== undefined && second !== undefined);
    assert.equal(first.method, "server/discover");
    assert.equal(first.status, 200);
    assert.equal(first.bodySha256, W3);
    assert.equal(second.method, "tools/list");
    assert.equal(second.status, 200);
    assert.equal(second.bodySha256, W6);
    assert.deepEqual(
      requests.map((request) => request.host),
      ["mcp.fake.test", "mcp.fake.test"],
    );
    assert.deepEqual(
      requests.map((request) => request.callHeader),
      ["disc_00000000-0000-7000-8000-000000000001:docs:1", "disc_00000000-0000-7000-8000-000000000001:docs:2"],
    );

    const rows = await decisionsOf(f);
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => row.decision),
      ["allow", "allow"],
    );
    for (const row of rows) {
      assert.equal(row.action, "register_tool_server");
      assert.deepEqual(row.reasons, ["tools-register-admin"]);
      assert.equal(row.run_id, null);
      assert.equal(row.node_id, null);
    }
    assert.deepEqual(
      rows.map((row) => row.permit),
      [expectedPermit(W3), expectedPermit(W6)],
    );
    assertIssued(f, 2);
  } finally {
    await f.close();
  }
});

test("C-7c08ae13 F2 legacy discovery initialises and lists through the fakes", async () => {
  const f = await startFakes({ era: "legacy" });
  try {
    const d = await discover(f);
    assert.equal(d.era, "legacy");
    assert.equal(d.protocolVersion, "2025-11-25");
    assert.equal(d.decisionIds.length, 4);
    assert.deepEqual(namesOf(d).sort(), ["find_vendor", "log_note"]);

    const requests = f.mcp.requests();
    assert.deepEqual(
      requests.map((request) => [request.method, request.status, request.bodySha256]),
      [
        ["server/discover", 400, W3],
        ["initialize", 200, W4],
        ["notifications/initialized", 202, W5],
        ["tools/list", 200, W8],
      ],
    );
    assert.equal((await decisionsOf(f)).length, 4);
    assertIssued(f, 4);
  } finally {
    await f.close();
  }
});

test("C-7c08ae13 F4 SSE replies give the modern result", async () => {
  const f = await startFakes({ sse: true });
  try {
    const d = await discover(f);
    assert.equal(d.era, "modern");
    assert.equal(d.protocolVersion, "2026-07-28");
    assert.deepEqual(namesOf(d).sort(), ["find_vendor", "log_note"]);
    assert.deepEqual(d.excluded, []);
    assert.deepEqual(d.decisionIds, [
      "dec_00000000-0000-7000-8000-000000000001",
      "dec_00000000-0000-7000-8000-000000000002",
    ]);

    const requests = f.mcp.requests();
    assert.deepEqual(
      requests.map((request) => [request.method, request.status, request.bodySha256]),
      [
        ["server/discover", 200, W3],
        ["tools/list", 200, W6],
      ],
    );
    assert.deepEqual(
      (await decisionsOf(f)).map((row) => row.permit),
      [expectedPermit(W3), expectedPermit(W6)],
    );
    assertIssued(f, 2);
  } finally {
    await f.close();
  }
});

test("C-a94a62c6 F3 a legacy session server is refused after initialize", async () => {
  const f = await startFakes({ era: "legacy", session: true });
  try {
    await assert.rejects(
      discoverMcp(f.deps, f.ctx, INPUT),
      (error: unknown) => {
        const refused = error as { code?: unknown; message?: unknown; details?: unknown };
        assert.equal(refused.code, "TOOLS_REFUSED");
        assert.equal(refused.message, SESSION_MESSAGE);
        assert.deepEqual(refused.details, { reason: "mcp_session_required" });
        assert.equal(JSON.stringify(refused).includes(D1_HINT), false);
        return true;
      },
    );

    const requests = f.mcp.requests();
    assert.deepEqual(
      requests.map((request) => [request.method, request.status]),
      [
        ["server/discover", 400],
        ["initialize", 200],
      ],
    );
    assert.equal(
      requests.some((request) => request.method === "tools/list"),
      false,
    );
    assert.equal(JSON.stringify(requests).includes(D1_HINT), false);

    const rows = await decisionsOf(f);
    assert.equal(rows.length, 2);
    assert.deepEqual(
      rows.map((row) => row.decision),
      ["allow", "allow"],
    );
    assertIssued(f, 2);
  } finally {
    await f.close();
  }
});

test("C-912eaa9b F5 rediscovery drifts an approved server for a changed hint and description", async () => {
  const f = await startFakes();
  try {
    const registered = await settled("registerMcpServerTx resolves", () =>
      registerMcpServerTx(
        f.db.appPool,
        f.ctx,
        { id: "docs", url: "https://mcp.fake.test/mcp", local: false },
        { kind: "user", id: "u_carol" },
        { clock: fixedClock(T0) },
      ),
    );
    assert.equal(registered.server.adapter, "mcp");
    assert.equal(registered.endpoint, "/mcp");

    const first = await discover(f);
    const d1 = surfaceDigest(first.surface);
    const submitted = await settled("submitAdapterSurfaceTx resolves", () =>
      withTenantTx(f.db.appPool, f.ctx, (tx) =>
        submitAdapterSurfaceTx(tx, f.ctx, "docs", first.surface, { kind: "user", id: "u_dave" }, {
          clock: fixedClock(T0),
        }),
      ),
    );
    assert.equal(submitted.state, "pending");
    assert.equal(submitted.pendingDigest, d1);
    assert.deepEqual(submitted.tools, [
      { name: "find_vendor", effect: "write", ref: null },
      { name: "log_note", effect: "write", ref: null },
    ]);

    const approved = await settled("approveSurface resolves", () =>
      approveSurface(
        f.db.appPool,
        f.ctx,
        "docs",
        { digest: d1, selfApproval: false },
        { userId: "u_carol", kind: "user" },
        { clock: fixedClock(T0) },
      ),
    );
    assert.equal(approved.server.state, "approved");
    assert.equal(approved.server.approvedDigest, d1);
    assert.equal(await surfaceRowsOf(f), 1);

    const unchanged = await discover(f);
    assert.equal(surfaceDigest(unchanged.surface), d1);
    const again = await withTenantTx(f.db.appPool, f.ctx, (tx) =>
      submitAdapterSurfaceTx(tx, f.ctx, "docs", unchanged.surface, { kind: "user", id: "u_dave" }, {
        clock: fixedClock(T0),
      }),
    );
    assert.equal(again.state, "approved");
    assert.equal(again.approvedDigest, d1);
    assert.equal(await surfaceRowsOf(f), 1);

    f.mcp.setTools([{ ...T_FIND, annotations: { readOnlyHint: false } }, T_LOG]);
    const hint = await discover(f);
    const d2 = surfaceDigest(hint.surface);
    assert.notEqual(d2, d1);
    const hintSubmit = await withTenantTx(f.db.appPool, f.ctx, (tx) =>
      submitAdapterSurfaceTx(tx, f.ctx, "docs", hint.surface, { kind: "user", id: "u_dave" }, {
        clock: fixedClock(T0),
      }),
    );
    assert.equal(hintSubmit.state, "drifted");
    assert.equal(hintSubmit.pendingDigest, d2);
    assert.equal(hintSubmit.approvedDigest, d1);
    assert.equal(await surfaceRowsOf(f), 2);

    f.mcp.setTools([
      { ...T_FIND, annotations: { readOnlyHint: false } },
      { ...T_LOG, description: "Log a note." },
    ]);
    const described = await discover(f);
    const d3 = surfaceDigest(described.surface);
    assert.notEqual(d3, d2);
    const describedSubmit = await withTenantTx(f.db.appPool, f.ctx, (tx) =>
      submitAdapterSurfaceTx(tx, f.ctx, "docs", described.surface, { kind: "user", id: "u_dave" }, {
        clock: fixedClock(T0),
      }),
    );
    assert.equal(describedSubmit.state, "drifted");
    assert.equal(describedSubmit.pendingDigest, d3);
    assert.equal(describedSubmit.approvedDigest, d1);
    assert.equal(await surfaceRowsOf(f), 3);
  } finally {
    await f.close();
  }
});

function ctxOf(): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "read-then-pay",
    flowHash: "sha256:" + "e".repeat(64),
    nodeId: "lookup",
    kind: "block",
    mode: "live",
    attempt: 1,
    effect: "write",
    unsafeToRetry: true,
    idemKey: null,
    principal: { userId: "alice", kind: "human" },
    now: new Date(T0),
    taint: [],
  } as unknown as StepContext;
}

test("C-452a9a48 L1 a live MCP call sends exactly what its permit allows", async () => {
  const mcp = await settled("startFakeMcp resolves", () => startFakeMcp({ keyHeader: null }));
  let h: InvokeHarness | undefined;
  try {
    const binding = kitBinding("mcp", {
      origin: FAKE_MCP_ORIGIN,
      call: {
        kind: "mcp",
        endpoint: "/mcp",
        name: "find_vendor",
        protocolVersion: "2026-07-28",
        output: "structured",
      },
    });
    const tools: NonNullable<HarnessWrap["tools"]> = () => ({ resolve: async () => binding });
    const services: NonNullable<HarnessWrap["services"]> = () => ({
      resolve: async () => ({ serviceId: S_ID, origin: FAKE_MCP_ORIGIN }),
    });
    h = await settled("invokeHarness resolves", () =>
      invokeHarness({ tools, services, calls: { mcp: mcpCallAdapter } }),
    );
    const harness = h;
    harness.egress.addUpstream(FAKE_MCP_HOST, mcp.origin);
    harness.egress.addCredentialless(S_ID, mintkeyTenantId("tenant_a"), FAKE_MCP_ORIGIN);
    await settled("deploy", () => harness.deploy(ALLOW_ALL));

    const run = await settled("h.start resolves", () => harness.start("H1", INPUT_L1, "r_1"));
    const invoker = await settled("liveInvoker resolves", () => harness.path.liveInvoker(run));
    const authorize = invoker.authorize;
    assert.ok(authorize !== undefined, "the live invoker has authorize");

    const call: ToolCall = {
      tool: "acme.lookup_vendor@1",
      args: { vendor_name: "Acme GmbH" },
      nodeId: "lookup",
      effectSeq: 0,
    };
    const ctx = ctxOf();
    const auth = await settled("authorize resolves", () => authorize.call(invoker, call, ctx));
    const result = await settled("invoke resolves", () =>
      invoker.invoke(call, { ...ctx, authorization: auth }),
    );

    const decisions = await harness.decisions("r_1");
    const decision = decisions.find((row) => row.decisionId === auth.decisionId);
    assert.ok(decision !== undefined, "the decision is stored");
    assert.deepEqual(decision.permit, expectedPermit(W1));
    assert.deepEqual(result, { output: { vendor_id: "V-ACME", status: "active" } });

    const calls = mcp.requests({ method: "tools/call" });
    assert.equal(calls.length, 1);
    const only = calls[0];
    assert.ok(only !== undefined);
    assert.equal(only.toolName, "find_vendor");
    assert.equal(only.callHeader, "r_1:lookup:1");
    assert.equal(only.bodySha256, W1);
  } finally {
    if (h !== undefined) {
      await h.close();
    }
    await mcp.close();
  }
});
