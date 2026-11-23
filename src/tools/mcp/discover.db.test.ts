import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { GatewayError } from "../../gateway/index.ts";
import type { BrokerToken, CallTag, Gateway, GatewayResponse, OutboundRequest } from "../../gateway/index.ts";
import { createLogger } from "../../observability/index.ts";
import { createPolicyEngine, defaultSrcDir, tenantEntity, userEntity } from "../../pdp/index.ts";
import type { Decision, Egress, PolicyRequest, PrincipalEntity } from "../../pdp/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { FAKE_MCP_TOOLS } from "../../../test/support/fake-mcp/index.ts";
import { discoverMcp, discoveryRequest } from "./discover.ts";
import type { McpDiscovery, McpDiscoveryDeps, ServiceLookup } from "./discover.ts";

const S_ID = "87caf624-f579-8435-9540-24d6eb57aeff";
const W3 = "76269e460a435d1338b204ce7cd4f0be1b20e25e1da8ad458d0a4b8e3e164c3f";
const W7 = "eebbe51f5dd813a8e1420ab847891635c37d07cd14b81fe6e2c4478bf546d942";
const W8 = "86d054baa44ee2f470bd2acda333ee42f8ffae1f5764a0c502bc10ae88720d7b";
const VERSION = "a".repeat(64);
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const CAROL: PrincipalEntity = {
  tenantId: "tenant_a",
  userId: "u_carol",
  kind: "human",
  roles: ["tenant_admin"],
  teams: [],
};
const ALICE: PrincipalEntity = { ...CAROL, userId: "u_alice", roles: ["author"] };
const EGRESS: Egress = {
  method: "POST",
  host: "mcp.fake.test",
  path: "/mcp",
  bodyDigest: W3,
  serviceId: S_ID,
  ttlSeconds: 60,
};
const CTX: TenantContext = { tenantId: "tenant_a", reviewProfile: "team" };
const CTX_B: TenantContext = { tenantId: "tenant_b", reviewProfile: "team" };
const T_FIND = FAKE_MCP_TOOLS[0];
const T_LOG = FAKE_MCP_TOOLS[1];

function silentLogger() {
  return createLogger({ level: "silent", destination: { write(_line: string): void {} } });
}

async function engine() {
  return createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock: fixedClock("2026-11-06T10:00:00.000Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

function sha(bytes: Uint8Array | null): string {
  return createHash("sha256")
    .update(bytes ?? new Uint8Array(0))
    .digest("hex");
}

test("C-1673addc Q1 carol is allowed and the permit is the egress of the API's request", async () => {
  const pdp = await engine();
  let request: PolicyRequest | undefined;
  try {
    request = discoveryRequest(CTX, CAROL, EGRESS);
  } catch {
    request = undefined;
  }
  assert.deepEqual(request, {
    principal: userEntity(CAROL).uid,
    action: "register_tool_server",
    resource: tenantEntity("tenant_a").uid,
    context: {},
    entities: [userEntity(CAROL), tenantEntity("tenant_a")],
    egress: EGRESS,
  });
  const decision = await pdp.check(request as PolicyRequest);
  assert.equal(decision.decision, "allow");
  assert.deepEqual(decision.reasons, ["tools-register-admin"]);
  assert.deepEqual(decision.permit, EGRESS);
});

test("C-1673addc Q2 to Q5 alice, tenant B, no egress and a bad path", async () => {
  const pdp = await engine();
  const build = (principal: PrincipalEntity, ctx: TenantContext, egress: Egress): PolicyRequest => {
    try {
      return discoveryRequest(ctx, principal, egress);
    } catch {
      assert.fail("discoveryRequest is not implemented");
    }
  };
  const q2 = await pdp.check(build(ALICE, CTX, EGRESS));
  assert.equal(q2.decision, "deny");
  assert.deepEqual(q2.reasons, []);
  assert.deepEqual(q2.errors, []);
  assert.equal(build(ALICE, CTX, EGRESS).action, "register_tool_server");

  const q3 = await pdp.check(build(CAROL, CTX_B, EGRESS));
  assert.equal(q3.decision, "deny");
  assert.deepEqual(q3.reasons, ["platform-cross-tenant-forbid"]);

  const full = build(CAROL, CTX, EGRESS);
  const bare: PolicyRequest = {
    principal: full.principal,
    action: full.action,
    resource: full.resource,
    context: full.context,
    entities: full.entities,
  };
  const q4 = await pdp.check(bare);
  assert.equal(q4.decision, "allow");
  assert.equal(q4.permit, undefined);
  assert.equal(build(CAROL, CTX, EGRESS).egress?.path, "/mcp");

  const q5 = await pdp.check(build(CAROL, CTX, { ...EGRESS, path: "/a b" }));
  assert.equal(q5.decision, "deny");
  assert.deepEqual(q5.errors, ["PDP_REQUEST_INVALID"]);
});

type Answer = { status: number; headers?: Record<string, string>; text: string } | Error;

interface Sent {
  permit: Egress;
  request: OutboundRequest;
  tag: CallTag;
}

interface Rig {
  deps: McpDiscoveryDeps;
  sent: Sent[];
  checks: PolicyRequest[];
  tokens: number;
}

let db: TestDatabase | undefined;
let decisionCounter = 0;

async function database(): Promise<TestDatabase> {
  if (db === undefined) {
    db = await withTestDatabase();
    await seedTwoTenants(db);
  }
  return db;
}

after(async () => {
  await db?.close();
});

function ok(text: string): Answer {
  return { status: 200, headers: { "content-type": "application/json" }, text };
}
function reply(id: number, result: unknown): Answer {
  return ok(JSON.stringify({ jsonrpc: "2.0", id, result }));
}
const DISC = reply(1, { resultType: "complete", supportedVersions: ["2026-07-28", "2025-11-25"] });
const LEG: Answer = { status: 400, text: "" };
const ACK: Answer = { status: 202, text: "" };
function INIT(id: number, version: string): Answer {
  return reply(id, { protocolVersion: version, capabilities: {}, serverInfo: { name: "x", version: "1" } });
}
function LIST(id: number, tools: unknown[], cursor?: string): Answer {
  return reply(id, cursor === undefined ? { tools } : { tools, nextCursor: cursor });
}

function allow(req: PolicyRequest): Decision {
  decisionCounter += 1;
  return {
    decision: "allow",
    decisionId: `dec_00000000-0000-7000-8000-${String(decisionCounter).padStart(12, "0")}`,
    decidedAt: "2026-11-06T10:00:00.000Z",
    reasons: ["tools-register-admin"],
    errors: [],
    policySetVersion: VERSION,
    ...(req.egress === undefined ? {} : { permit: req.egress }),
  };
}

function denied(req: PolicyRequest): Decision {
  const { permit: _permit, ...rest } = allow(req);
  return { ...rest, decision: "deny", reasons: [] };
}

async function rig(
  answers: Answer[],
  opts: {
    check?: (req: PolicyRequest, n: number) => Promise<Decision>;
    services?: ServiceLookup;
    pool?: McpDiscoveryDeps["pool"];
    tokenError?: Error;
  } = {},
): Promise<Rig> {
  const database_ = await database();
  const sent: Sent[] = [];
  const checks: PolicyRequest[] = [];
  const state = { tokens: 0 };
  const queue = [...answers];
  const gateway: Gateway = {
    async requestToken(): Promise<BrokerToken> {
      if (opts.tokenError !== undefined) throw opts.tokenError;
      state.tokens += 1;
      return { serviceId: S_ID, expiresAt: 4102444800 };
    },
    async send(permit, request, _token, tag): Promise<GatewayResponse> {
      sent.push({ permit, request, tag });
      const next = queue.shift();
      if (next === undefined) throw new Error("script exhausted");
      if (next instanceof Error) throw next;
      return {
        status: next.status,
        headers: next.headers ?? {},
        body: encoder.encode(next.text),
      };
    },
  };
  const deps: McpDiscoveryDeps = {
    pool: opts.pool ?? database_.appPool,
    policy: {
      check: async (req: PolicyRequest): Promise<Decision> => {
        checks.push(req);
        return opts.check === undefined ? allow(req) : opts.check(req, checks.length);
      },
    },
    gateway,
    services: opts.services ?? { resolve: async () => ({ serviceId: S_ID, origin: "https://mcp.fake.test" }) },
    ids: sequentialIds(1),
  };
  return {
    deps,
    sent,
    checks,
    get tokens() {
      return state.tokens;
    },
  };
}

const INPUT = { serverId: "docs", endpoint: "/mcp", principal: CAROL, overlay: { tools: {} } };

async function outcome(r: Rig): Promise<{ value?: McpDiscovery; error?: { code?: unknown; details?: Record<string, unknown> } }> {
  try {
    return { value: await discoverMcp(r.deps, CTX, INPUT) };
  } catch (error) {
    return { error: error as { code?: unknown; details?: Record<string, unknown> } };
  }
}

async function refusal(r: Rig, code = "TOOLS_REFUSED"): Promise<Record<string, unknown>> {
  const { error, value } = await outcome(r);
  assert.equal(value, undefined, "discovery did not refuse");
  assert.equal(error?.code, code);
  return error?.details ?? {};
}

async function rowCount(): Promise<number> {
  const d = await database();
  const r = await d.ownerPool.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM ursitoare.policy_decision WHERE tenant_id = 'tenant_a'",
  );
  return r.rows[0]?.n ?? -1;
}

async function newRows(before: number): Promise<{ decision: string; errors: string[]; permit: unknown }[]> {
  const d = await database();
  const r = await d.ownerPool.query<{ decision: string; errors: string[]; permit: unknown }>(
    `SELECT decision, errors, permit FROM ursitoare.policy_decision
      WHERE tenant_id = 'tenant_a' ORDER BY decided_at, decision_id OFFSET $1`,
    [before],
  );
  return r.rows;
}

function names(d: McpDiscovery): string[] {
  return d.surface.tools.map((t) => t.name);
}

test("C-85421c4d D1 pages are followed with request ids 1 to 3 and the third is W7", async () => {
  const r = await rig([DISC, LIST(2, [T_FIND], "page-1"), LIST(3, [T_LOG])]);
  const before = await rowCount();
  const { value, error } = await outcome(r);
  assert.equal(error, undefined);
  assert.equal(value?.era, "modern");
  assert.deepEqual([...(value ? names(value) : [])].sort(), ["find_vendor", "log_note"]);
  assert.equal(r.sent.length, 3);
  assert.equal(sha(r.sent[0]?.request.body ?? null), W3);
  assert.equal(sha(r.sent[2]?.request.body ?? null), W7);
  assert.deepEqual(
    r.sent.map((s) => s.tag.attempt),
    [1, 2, 3],
  );
  assert.equal(r.sent[0]?.tag.nodeId, "docs");
  assert.equal(r.sent[0]?.tag.tenantId, "tenant_a");
  assert.equal(r.sent[0]?.permit.bodyDigest, W3);
  assert.equal(r.tokens, 3);
  assert.equal((await newRows(before)).length, 3);
});

test("C-85421c4d D2 an error -32601 on server discover is modern and goes on", async () => {
  const r = await rig([
    { status: 404, headers: { "content-type": "application/json" }, text: JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "x" } }) },
    LIST(2, [T_FIND]),
  ]);
  const { value } = await outcome(r);
  assert.equal(value?.era, "modern");
  assert.equal(r.sent.length, 2);
});

test("C-85421c4d D3 unsupported protocol answers stop after one send", async () => {
  const rpcError = (code: number): Answer => ({
    status: 400,
    headers: { "content-type": "application/json" },
    text: JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code, message: "x" } }),
  });
  const only2025 = reply(1, { resultType: "complete", supportedVersions: ["2025-11-25"] });
  for (const answer of [rpcError(-32022), rpcError(-32020), only2025]) {
    const r = await rig([answer]);
    const details = await refusal(r);
    assert.equal(details["reason"], "protocol_unsupported");
    assert.equal(r.sent.length, 1);
  }
});

test("C-85421c4d D4 a legacy server is initialised and listed with W8", async () => {
  const r = await rig([LEG, INIT(2, "2025-11-25"), ACK, LIST(4, [T_LOG])]);
  const { value } = await outcome(r);
  assert.equal(value?.era, "legacy");
  assert.equal(value?.protocolVersion, "2025-11-25");
  assert.equal(r.sent.length, 4);
  assert.equal(sha(r.sent[3]?.request.body ?? null), W8);
  assert.equal(r.sent[3]?.request.headers["mcp-method"], undefined);
});

test("C-85421c4d D5 a legacy answer version is used afterwards and an unknown one is refused", async () => {
  const r = await rig([LEG, INIT(2, "2025-06-18"), { status: 200, text: "" }, LIST(4, [T_LOG])]);
  const { value } = await outcome(r);
  assert.equal(value?.protocolVersion, "2025-06-18");
  assert.equal(r.sent[3]?.request.headers["mcp-protocol-version"], "2025-06-18");
  assert.equal(value?.surface.tools[0]?.call?.kind, "mcp");
  assert.equal((value?.surface.tools[0]?.call as { protocolVersion?: string } | undefined)?.protocolVersion, "2025-06-18");

  const bad = await rig([LEG, INIT(2, "2024-11-05")]);
  const details = await refusal(bad);
  assert.equal(details["reason"], "protocol_unsupported");
  assert.equal(bad.sent.length, 2);
});

test("C-85421c4d D6 a failing request is discovery_failed with its stage and status", async () => {
  const fail = async (answers: Answer[], stage: string, status: string | undefined, sends: number): Promise<void> => {
    const r = await rig(answers);
    const details = await refusal(r);
    assert.equal(details["reason"], "discovery_failed");
    assert.equal(details["stage"], stage);
    assert.equal(details["status"], status);
    assert.equal(r.sent.length, sends);
  };
  await fail([{ status: 503, text: "" }], "discover", "503", 1);
  await fail([ok("<html>")], "discover", undefined, 1);
  await fail([{ status: 401, text: "" }], "discover", "401", 1);
  await fail([{ status: 302, text: "" }], "discover", "302", 1);
  await fail([LEG, { status: 500, text: "" }], "initialize", "500", 2);
  await fail([LEG, INIT(2, "2025-11-25"), { status: 500, text: "" }], "initialized", "500", 3);
  await fail([LEG, INIT(2, "2025-11-25"), ACK, { status: 500, text: "" }], "tools", "500", 4);
  await fail([DISC, reply(2, {})], "tools", undefined, 2);
});

test("C-85421c4d D7 an eleventh page is never asked for", async () => {
  const pages: Answer[] = [];
  for (let i = 0; i < 11; i++) pages.push(LIST(i + 2, [T_LOG], `p${i}`));
  const r = await rig([DISC, ...pages]);
  const details = await refusal(r);
  assert.equal(details["reason"], "too_many_tools");
  assert.equal(r.sent.length, 11);
});

test("C-85421c4d D8 a gateway failure passes or names its stage", async () => {
  const unavailable = new GatewayError("GATEWAY_UNAVAILABLE", "down");
  const a = await rig([DISC], { tokenError: unavailable });
  const { error } = await outcome(a);
  assert.equal((error as unknown), unavailable);

  const b = await rig([DISC], { tokenError: new GatewayError("GATEWAY_TOKEN_REFUSED", "no") });
  assert.equal((await refusal(b))["stage"], "token");
  assert.equal((await refusal(await rig([new GatewayError("GATEWAY_INVALID", "bad")])))["stage"], "send");
});

test("C-85421c4d D9 a deny, an error and a missing permit send nothing", async () => {
  const deny = await rig([DISC], {
    check: async (req) => denied(req),
  });
  let before = await rowCount();
  const d1 = await refusal(deny);
  assert.equal(d1["reason"], "discovery_denied");
  assert.equal(typeof d1["decisionId"], "string");
  assert.equal(deny.sent.length, 0);
  assert.equal(deny.tokens, 0);
  let rows = await newRows(before);
  assert.deepEqual(
    rows.map((x) => x.decision),
    ["deny"],
  );

  const erring = await rig([DISC], {
    check: async (req) => ({ ...allow(req), errors: ["PDP_EVALUATION_ERROR:p1"] }),
  });
  before = await rowCount();
  assert.equal((await refusal(erring))["reason"], "discovery_denied");
  assert.equal(erring.sent.length, 0);
  rows = await newRows(before);
  assert.deepEqual(
    rows.map((x) => [x.decision, x.errors, x.permit]),
    [["deny", ["PDP_EVALUATION_ERROR:p1"], null]],
  );

  const nopermit = await rig([DISC], {
    check: async (req) => {
      const { permit: _p, ...rest } = allow(req);
      return rest;
    },
  });
  before = await rowCount();
  assert.equal((await refusal(nopermit))["reason"], "discovery_denied");
  assert.equal(nopermit.sent.length, 0);
  rows = await newRows(before);
  assert.deepEqual(
    rows.map((x) => [x.decision, x.permit]),
    [["allow", null]],
  );

  const rejecting = await rig([DISC], {
    check: async () => {
      throw new Error("db down");
    },
  });
  before = await rowCount();
  assert.equal((await refusal(rejecting))["stage"], "policy");
  assert.equal(rejecting.sent.length, 0);
  assert.equal((await newRows(before)).length, 0);
});

test("C-85421c4d D10 no service target is credential_missing before any decision", async () => {
  const r = await rig([DISC], { services: { resolve: async () => null } });
  const before = await rowCount();
  assert.equal((await refusal(r))["reason"], "credential_missing");
  assert.equal(r.checks.length, 0);
  assert.equal(r.sent.length, 0);
  assert.equal((await newRows(before)).length, 0);
});

test("C-85421c4d D11 a failed recording sends nothing and a later deny stops after one send", async () => {
  const failing = await rig([DISC], {
    pool: {
      connect: async () => {
        throw new Error("connect failed");
      },
    } as unknown as McpDiscoveryDeps["pool"],
  });
  assert.equal((await refusal(failing))["stage"], "decision");
  assert.equal(failing.sent.length, 0);

  const r = await rig([DISC, LIST(2, [T_FIND])], {
    check: async (req, n) => (n === 1 ? allow(req) : denied(req)),
  });
  const before = await rowCount();
  assert.equal((await refusal(r))["reason"], "discovery_denied");
  assert.equal(r.sent.length, 1);
  assert.equal((await newRows(before)).length, 2);
  assert.equal(decoder.decode(r.sent[0]?.request.body ?? new Uint8Array()).includes("server/discover"), true);
});
