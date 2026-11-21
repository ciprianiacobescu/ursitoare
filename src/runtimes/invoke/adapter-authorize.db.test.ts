import assert from "node:assert/strict";
import { test } from "node:test";

import type { ToolCall, ToolInvoker, StepContext } from "../../interpreter/index.ts";
import type { PolicyRuntime } from "../../grants/index.ts";
import type { Decision } from "../../pdp/index.ts";
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

const CODE_CALL: ToolCall = { ...LOOKUP, args: { text: "a b c" } };

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

interface Seen {
  requests: Record<string, unknown>[];
  decisionId: string;
}

type Wrap = HarnessWrap & { calls?: unknown; code?: unknown };

function stubPolicy(seen: Seen): NonNullable<HarnessWrap["policy"]> {
  return (real) =>
    ({
      engine: Object.assign(Object.create(real.engine) as object, {
        check: (req: Record<string, unknown>): Promise<Decision> => {
          seen.requests.push(req);
          return Promise.resolve({
            decision: "allow",
            decisionId: seen.decisionId,
            decidedAt: T0,
            reasons: ["g"],
            errors: [],
            policySetVersion: real.engine.policySetVersion,
          });
        },
      }),
      toolArgs: (tenantId: string) => real.toolArgs(tenantId),
      reload: (tenantId: string) => real.reload(tenantId),
    }) as unknown as PolicyRuntime;
}

async function open(wrap: Wrap): Promise<InvokeHarness> {
  return settled("invokeHarness resolves", () => invokeHarness(wrap as HarnessWrap));
}

async function invokerOf(h: InvokeHarness): Promise<ToolInvoker> {
  const run = await settled("h.start resolves", () =>
    h.start("H1", { vendor_name: "Acme GmbH", amount: 12.5 }, "r_1"),
  );
  return settled("liveInvoker resolves", () => h.path.liveInvoker(run));
}

function authorizeOf(inv: ToolInvoker, call: ToolCall, ctx: StepContext) {
  assert.ok(inv.authorize !== undefined, "the live invoker has authorize");
  return inv.authorize(call, ctx);
}

function toolsOf(binding: ToolBinding): NonNullable<HarnessWrap["tools"]> {
  return () => ({ resolve: async () => binding });
}

async function permitMissing(h: InvokeHarness, inv: ToolInvoker, id: string): Promise<void> {
  await assert.rejects(authorizeOf(inv, LOOKUP, ctxOf("r_1", "lookup")), (e: unknown) => {
    const err = e as { code?: unknown; message?: unknown; details?: unknown };
    assert.equal(err.code, "INTERPRETER_TOOL_DENIED");
    assert.equal(err.message, 'tool call of "lookup" is not permitted (permit_missing)');
    assert.deepEqual(err.details, { reason: "permit_missing", decisionId: id });
    return true;
  });
  const rows = await h.decisions("r_1");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.decision, "allow");
  assert.equal(rows[0]?.permit, null);
  assert.equal(h.gateway.calls.length, 0);
  assert.deepEqual(h.egress.issued(), []);
}

test("C-a5498805 a code call is authorised without a permit and runs in the runner, row P1", async () => {
  const seen: Seen = { requests: [], decisionId: "dec_p1" };
  let kit: ReturnType<typeof kitCodeRunner> | undefined;
  assert.doesNotThrow(() => {
    kit = kitCodeRunner();
  });
  assert.ok(kit !== undefined, "kitCodeRunner answered");
  const h = await open({
    tools: toolsOf(kitBinding("code")),
    policy: stubPolicy(seen),
    calls: { http: kitHttpAdapter, mcp: kitMcpAdapter },
    code: kit.run,
  });
  try {
    await settled("deploy", () => h.deploy(""));
    const inv = await invokerOf(h);
    const ctx = ctxOf("r_1", "lookup");
    const auth = await settled("authorize resolves", () => authorizeOf(inv, CODE_CALL, ctx));
    assert.deepEqual(auth, { decisionId: "dec_p1", permit: null });
    assert.equal(seen.requests.length, 1);
    assert.equal(Object.hasOwn(seen.requests[0] ?? {}, "egress"), false);
    const rows = await h.decisions("r_1");
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.decision, "allow");
    assert.equal(rows[0]?.permit, null);

    assert.ok(inv.invoke !== undefined);
    const result = await settled("invoke resolves", () =>
      (inv.invoke as NonNullable<ToolInvoker["invoke"]>)(CODE_CALL, { ...ctx, authorization: auth }),
    );
    assert.deepEqual(result, { output: { words: 3 } });
    assert.deepEqual(kit.calls, [
      { source: "return { words: 3 };", args: { text: "a b c" }, nodeId: "lookup" },
    ]);
    assert.equal(h.gateway.calls.length, 0);
    assert.deepEqual(h.egress.issued(), []);
  } finally {
    await h.close();
  }
});

test("C-a5498805 an http call with no permit is refused permit_missing, row P2", async () => {
  const seen: Seen = { requests: [], decisionId: "dec_p2" };
  const h = await open({
    tools: toolsOf(kitBinding("http")),
    policy: stubPolicy(seen),
    calls: { http: kitHttpAdapter, mcp: kitMcpAdapter },
  });
  try {
    await settled("deploy", () => h.deploy(""));
    const inv = await invokerOf(h);
    await permitMissing(h, inv, "dec_p2");
    const egress = (seen.requests[0] as { egress?: unknown } | undefined)?.egress;
    assert.deepEqual(egress, W1_EGRESS);
  } finally {
    await h.close();
  }
});

test("C-a5498805 an mcp call with no permit is refused permit_missing, row P3", async () => {
  const seen: Seen = { requests: [], decisionId: "dec_p3" };
  const h = await open({
    tools: toolsOf(kitBinding("mcp")),
    policy: stubPolicy(seen),
    calls: { http: kitHttpAdapter, mcp: kitMcpAdapter },
  });
  try {
    await settled("deploy", () => h.deploy(""));
    const inv = await invokerOf(h);
    await permitMissing(h, inv, "dec_p3");
  } finally {
    await h.close();
  }
});

test("C-a5498805 a fixture call with no permit is refused permit_missing, row P4", async () => {
  const seen: Seen = { requests: [], decisionId: "dec_p4" };
  const h = await open({ policy: stubPolicy(seen) });
  try {
    await settled("deploy", () => h.deploy(""));
    const inv = await invokerOf(h);
    await permitMissing(h, inv, "dec_p4");
  } finally {
    await h.close();
  }
});

test("C-a5498805 an authorization whose permit is set to null is refused by invoke, row P5", async () => {
  const h = await open({
    tools: toolsOf(kitBinding("http")),
    calls: { http: kitHttpAdapter, mcp: kitMcpAdapter },
  });
  try {
    await settled("deploy", () => h.deploy(ALLOW_ALL));
    const inv = await invokerOf(h);
    const ctx = ctxOf("r_1", "lookup");
    const auth = await settled("authorize resolves", () => authorizeOf(inv, LOOKUP, ctx));
    assert.deepEqual(auth.permit, W1_EGRESS);
    (auth as { permit: unknown }).permit = null;
    await assert.rejects(
      (inv.invoke as NonNullable<ToolInvoker["invoke"]>)(LOOKUP, { ...ctx, authorization: auth }),
      (e: unknown) => {
        const err = e as { code?: unknown; details?: unknown };
        assert.equal(err.code, "INTERPRETER_TOOL_DENIED");
        assert.deepEqual(err.details, { reason: "permit_missing", decisionId: auth.decisionId });
        return true;
      },
    );
    assert.equal(h.gateway.calls.length, 0);
    assert.deepEqual(h.egress.issued(), []);
  } finally {
    await h.close();
  }
});
