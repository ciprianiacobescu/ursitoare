import assert from "node:assert/strict";
import { test } from "node:test";

import type { ToolCall, ToolInvoker, StepContext } from "../../interpreter/index.ts";
import type { BrokerToken, Gateway, GatewayResponse } from "../../gateway/index.ts";
import type { TenantContext } from "../../runs/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import { invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import {
  kitBinding,
  kitCodeRunner,
  kitHttpAdapter,
  kitMcpAdapter,
} from "../../../test/support/adapter-kit.ts";

const T0 = "2026-11-06T10:00:00.000Z";
const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const TENANT_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALLOW_ALL =
  '@id("t-allow-all") permit (principal, action == Action::"invoke_tool", resource);';

const W1_EGRESS = {
  method: "POST",
  host: "tools.fake.test",
  path: "/vendors/find",
  bodyDigest: D_LV,
  serviceId: S,
  ttlSeconds: 60,
};

const LOOKUP: ToolCall = {
  tool: "acme.lookup_vendor@1",
  args: { vendor_name: "Acme GmbH" },
  nodeId: "lookup",
  effectSeq: 0,
};

function callOf(args: ToolCall["args"]): ToolCall {
  return { ...LOOKUP, args };
}

function ctxOf(runId: string, nodeId: string): StepContext {
  return {
    tenant: TENANT_A,
    runId,
    lineageId: runId,
    flowId: "read-then-pay",
    flowHash: "sha256:" + "e".repeat(64),
    nodeId,
    kind: "block",
    mode: "live",
    attempt: 1,
    effect: "read",
    unsafeToRetry: false,
    idemKey: "IK",
    principal: { userId: "alice", kind: "human" },
    now: new Date(T0),
    taint: [],
  } as StepContext;
}

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

interface Sent {
  permit: unknown;
  request: { method: string; path: string; headers: Record<string, string> };
}

interface Rig {
  h: InvokeHarness;
  inv: ToolInvoker;
  sent: Sent[];
  tokens: unknown[];
  answers: GatewayResponse[];
}

function json(status: number, text: string): GatewayResponse {
  return { status, headers: {}, body: new TextEncoder().encode(text) };
}

async function rig(
  binding: ToolBinding,
  answers: GatewayResponse[],
  code?: HarnessWrap["code"],
): Promise<Rig> {
  const sent: Sent[] = [];
  const tokens: unknown[] = [];
  const gateway = (): Gateway => ({
    requestToken: (permit): Promise<BrokerToken> => {
      tokens.push(permit);
      return Promise.resolve({ serviceId: S, expiresAt: 4102444800 });
    },
    send: (permit, request): Promise<GatewayResponse> => {
      sent.push({ permit, request: request as unknown as Sent["request"] });
      return Promise.resolve(answers.shift() ?? json(500, ""));
    },
  });
  const wrap: HarnessWrap = {
    tools: () => ({ resolve: async () => binding }),
    gateway,
    calls: { http: kitHttpAdapter, mcp: kitMcpAdapter },
    ...(code === undefined ? {} : { code }),
  };
  const h = await settled("invokeHarness resolves", () => invokeHarness(wrap));
  await settled("deploy", () => h.deploy(ALLOW_ALL));
  const run = await settled("h.start resolves", () =>
    h.start("H1", { vendor_name: "Acme GmbH", amount: 12.5 }, "r_1"),
  );
  const inv = await settled("liveInvoker resolves", () => h.path.liveInvoker(run));
  return { h, inv, sent, tokens, answers };
}

async function authorized(r: Rig, call: ToolCall): Promise<StepContext> {
  assert.ok(r.inv.authorize !== undefined, "the live invoker has authorize");
  const ctx = ctxOf("r_1", "lookup");
  const authorization = await settled("authorize resolves", () =>
    (r.inv.authorize as NonNullable<ToolInvoker["authorize"]>)(call, ctx),
  );
  return { ...ctx, authorization };
}

function invokeOf(r: Rig, call: ToolCall, ctx: StepContext): Promise<unknown> {
  return (r.inv.invoke as NonNullable<ToolInvoker["invoke"]>)(call, ctx);
}

async function failsWith(
  p: Promise<unknown>,
  code: string,
  details: Record<string, string>,
): Promise<void> {
  await assert.rejects(p, (e: unknown) => {
    const err = e as { code?: unknown; message?: unknown; details?: unknown };
    assert.equal(err.code, code);
    if (code === "INTERPRETER_TOOL_FAILED") assert.equal(err.message, "node execution failed");
    assert.deepEqual(err.details, details);
    assert.ok(!JSON.stringify(e).includes("secret_text"));
    return true;
  });
}

test("C-bac67254 C-a5498805 an http answer is the output, and a null permit is refused, rows A1 and P5", async () => {
  const r = await rig(kitBinding("http"), [json(200, '{"vendor_id":"V-1"}')]);
  try {
    const ctx = await authorized(r, LOOKUP);
    const result = await settled("invoke resolves", () => invokeOf(r, LOOKUP, ctx));
    assert.deepEqual(result, { output: { vendor_id: "V-1" } });
    assert.equal(r.tokens.length, 1);
    assert.deepEqual(r.tokens[0], W1_EGRESS);
    assert.equal(r.sent.length, 1);
    assert.deepEqual(r.sent[0]?.permit, W1_EGRESS);
    assert.equal(r.sent[0]?.request.method, "POST");
    assert.equal(r.sent[0]?.request.path, "/vendors/find");
    assert.deepEqual(r.sent[0]?.request.headers, {
      "content-type": "application/json",
      "idempotency-key": "IK",
    });

    const second = await authorized(r, LOOKUP);
    (second.authorization as { permit: unknown }).permit = null;
    await failsWith(invokeOf(r, LOOKUP, second), "INTERPRETER_TOOL_DENIED", {
      reason: "permit_missing",
      decisionId: (second.authorization as { decisionId: string }).decisionId,
    });
    assert.equal(r.tokens.length, 1);
    assert.equal(r.sent.length, 1);
  } finally {
    await r.h.close();
  }
});

test("C-bac67254 an mcp answer is the output, row A2", async () => {
  const r = await rig(kitBinding("mcp"), [json(200, '{"text":"hit"}')]);
  try {
    const call = callOf({ query: "q" });
    const ctx = await authorized(r, call);
    const result = await settled("invoke resolves", () => invokeOf(r, call, ctx));
    assert.deepEqual(result, { output: { text: "hit" } });
    assert.equal(r.tokens.length, 1);
    assert.equal(r.sent.length, 1);
    assert.equal(r.sent[0]?.request.method, "POST");
    assert.equal(r.sent[0]?.request.path, "/mcp");
  } finally {
    await r.h.close();
  }
});

test("C-bac67254 a body that is not an object, then a throwing answer, fail at the response stage, row A3", async () => {
  const r = await rig(kitBinding("http"), [json(200, "[1]"), json(200, '{"throw":true}')]);
  try {
    const first = await authorized(r, LOOKUP);
    await failsWith(invokeOf(r, LOOKUP, first), "INTERPRETER_TOOL_FAILED", {
      stage: "response",
      reason: "not_json",
    });
    const second = await authorized(r, LOOKUP);
    await failsWith(invokeOf(r, LOOKUP, second), "INTERPRETER_TOOL_FAILED", {
      stage: "response",
      reason: "adapter_error",
    });
  } finally {
    await r.h.close();
  }
});

test("C-bac67254 a 500 answer fails at the upstream stage with its status, row A4", async () => {
  const r = await rig(kitBinding("http"), [json(500, "")]);
  try {
    const ctx = await authorized(r, LOOKUP);
    await failsWith(invokeOf(r, LOOKUP, ctx), "INTERPRETER_TOOL_FAILED", {
      stage: "upstream",
      reason: "status",
      status: "500",
    });
    assert.equal(r.tokens.length, 1);
    assert.equal(r.sent.length, 1);
  } finally {
    await r.h.close();
  }
});

test("C-bac67254 a code call runs with no token and a runner failure maps to runner, rows A5 and A6", async () => {
  const kit = kitCodeRunner();
  const r = await rig(kitBinding("code"), [], kit.run);
  try {
    const call = callOf({ text: "a b c" });
    const ctx = await authorized(r, call);
    const result = await settled("invoke resolves", () => invokeOf(r, call, ctx));
    assert.deepEqual(result, { output: { words: 3 } });
    assert.equal(r.h.gateway.calls.length, 0);
    assert.deepEqual(r.h.egress.issued(), []);
    const rows = await r.h.decisions("r_1");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.decision, "allow");
    assert.equal(rows[0]?.permit, null);

    const timed = callOf({ text: "a", mode: "interp" });
    await failsWith(invokeOf(r, timed, await authorized(r, timed)), "INTERPRETER_TOOL_FAILED", {
      stage: "code",
      reason: "timeout",
    });
    const thrown = callOf({ text: "a", mode: "throw" });
    await failsWith(invokeOf(r, thrown, await authorized(r, thrown)), "INTERPRETER_TOOL_FAILED", {
      stage: "code",
      reason: "runner",
    });
    assert.equal(r.h.gateway.calls.length, 0);
  } finally {
    await r.h.close();
  }
});
