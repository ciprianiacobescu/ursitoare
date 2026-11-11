import assert from "node:assert/strict";
import { test } from "node:test";

import type { ToolCall, ToolInvoker, StepContext } from "../../interpreter/index.ts";
import { fixedClock } from "../../core/index.ts";
import type { Gateway } from "../../gateway/index.ts";
import type { PolicyRuntime } from "../../grants/index.ts";
import { isIssuedPermit } from "../../pdp/index.ts";
import type { Decision, PrincipalEntity, ToolArgType } from "../../pdp/index.ts";
import type { RunRecord, TenantContext } from "../../runs/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import { captureLogger } from "../../../test/support/gateway-kit.ts";
import { acmeCatalogue, invokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import type { HarnessWrap, InvokeHarness } from "../../../test/support/invoke-runs/harness.ts";
import { invokeRunVersion } from "../../../test/support/invoke-runs/index.ts";
import { createInvokePath } from "./path.ts";
import type { InvokePathDeps } from "./types.ts";

const T0 = "2026-11-06T10:00:00.000Z";
const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const ORIGIN = "https://tools.fake.test";
const D_LV = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
const TENANT_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };

const V1_PERMIT = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.lookup_vendor@1",
  bodyDigest: D_LV,
  serviceId: S,
  ttlSeconds: 60,
};

const G_LOOKUP = {
  subject: { kind: "role", role: "author" },
  tool: "acme.lookup_vendor@1",
  scope: { kind: "any_step" },
  args: [],
};

const LOOKUP: ToolCall = {
  tool: "acme.lookup_vendor@1",
  args: { vendor_name: "Acme GmbH" },
  nodeId: "lookup",
  effectSeq: 0,
};

const LV: ToolBinding = {
  serverId: "acme",
  origin: ORIGIN,
  local: false,
  state: "approved",
  ref: "acme.lookup_vendor@1",
  tool: "lookup_vendor",
  effect: "read",
  http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
  untrustedResult: false,
  unsafeToRetry: false,
};

const ALICE: PrincipalEntity = {
  tenantId: "tenant_a",
  userId: "alice",
  kind: "human",
  roles: ["author"],
  teams: ["finance"],
};

const TOOL_ARGS: Record<string, ToolArgType> = {
  vendor_name: "String",
  vendor_id: "String",
  amount: "decimal",
  currency: "String",
  reference: "String",
};

function ctxOf(runId: string, nodeId: string, extra: Record<string, unknown> = {}): StepContext {
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
    idemKey: null,
    principal: { userId: "alice", kind: "human" },
    now: new Date(T0),
    taint: [],
    ...extra,
  } as StepContext;
}

function runRecord(runId: string): RunRecord {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "read-then-pay",
    flowHash: invokeRunVersion("read-then-pay").hash,
    ownerTeam: "finance",
    mode: "live",
    trigger: "test",
    state: "running",
    principal: { userId: "alice", kind: "human" },
    actorChain: [],
    inputRef: null,
    mocksRef: null,
    outputRef: null,
    error: null,
    terminalNode: null,
    runDay: "2026-11-06",
    createdAt: T0,
    startedAt: T0,
    endedAt: null,
  } as RunRecord;
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

async function openHarness(wrap?: HarnessWrap): Promise<InvokeHarness> {
  return settled("invokeHarness resolves", () => invokeHarness(wrap));
}

async function liveInvokerOf(h: InvokeHarness, runId: string): Promise<ToolInvoker> {
  const run = await settled("h.start resolves", () => h.start("H1", INPUT, runId));
  return settled("liveInvoker resolves", () => h.path.liveInvoker(run));
}

function authorizeOf(inv: ToolInvoker, call: ToolCall, ctx: StepContext) {
  assert.ok(inv.authorize !== undefined, "the live invoker has authorize");
  return inv.authorize(call, ctx);
}

interface Denied {
  message?: unknown;
  code?: unknown;
  node?: unknown;
  details?: unknown;
}

async function refused(
  p: Promise<unknown>,
  node: string,
  details: Record<string, string>,
  forbidden: readonly string[] = [],
): Promise<void> {
  await assert.rejects(p, (e: unknown) => {
    const err = e as Denied;
    assert.equal(err.code, "INTERPRETER_TOOL_DENIED");
    assert.equal(err.message, `tool call of "${node}" is not permitted (${details["reason"]})`);
    assert.equal(err.node, node);
    assert.deepEqual(err.details, details);
    const text = JSON.stringify({ message: err.message, details: err.details });
    for (const word of ["db down", ...forbidden]) {
      assert.ok(!text.includes(word), `the error does not contain ${word}`);
    }
    return true;
  });
}

test("C-f287b385 a granted read is authorised", async () => {
  const h = await openHarness();
  try {
    await settled("grant", () => h.grant(G_LOOKUP));
    await settled("deploy", () => h.deploy(""));
    const inv = await liveInvokerOf(h, "r_1");
    const auth = await settled("authorize resolves", () =>
      authorizeOf(inv, LOOKUP, ctxOf("r_1", "lookup")),
    );
    assert.deepEqual(auth.permit, V1_PERMIT);
    assert.equal(isIssuedPermit(auth.permit), true);

    const rows = await h.decisions("r_1");
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row !== undefined);
    assert.equal(row.decisionId, auth.decisionId);
    assert.equal(row.action, "invoke_tool");
    assert.equal(row.principal, 'User::"tenant_a/alice"');
    assert.equal(row.resource, 'Block::"tenant_a/read-then-pay/lookup"');
    assert.equal(row.nodeId, "lookup");
    assert.equal(row.decision, "allow");
    assert.equal(row.reasons.length, 1);
    assert.deepEqual(row.errors, []);
    assert.deepEqual(row.permit, V1_PERMIT);
    assert.equal(h.gateway.calls.length, 0);
    assert.equal(await h.intents("r_1"), 0);
  } finally {
    await h.close();
  }
});

type Check = () => Promise<Decision>;

function policyFrom(current: { check: Check }): NonNullable<HarnessWrap["policy"]> {
  return (real) =>
    ({
      engine: Object.assign(Object.create(real.engine) as object, {
        check: () => current.check(),
      }),
      toolArgs: (tenantId: string) => real.toolArgs(tenantId),
      reload: (tenantId: string) => real.reload(tenantId),
    }) as unknown as PolicyRuntime;
}

test("C-8b5cbc41 policy errors and an unrecorded decision deny with fixed reasons", async () => {
  const current: { check: Check } = {
    check: () => Promise.reject(new Error("not set")),
  };
  const h = await openHarness({ policy: policyFrom(current) });
  try {
    await settled("grant", () => h.grant(G_LOOKUP));
    await settled("deploy", () => h.deploy(""));
    const inv = await liveInvokerOf(h, "r_9");
    const version = h.runtime.engine.policySetVersion;
    const forbidden = ["POLICY_SET_UNAVAILABLE", "PDP_EVALUATION_ERROR"];
    const decision = (over: Partial<Decision> & { decisionId: string }): Decision => ({
      decision: "deny",
      decidedAt: T0,
      reasons: [],
      errors: [],
      policySetVersion: version,
      ...over,
    });
    const call = () => authorizeOf(inv, LOOKUP, ctxOf("r_9", "lookup"));

    current.check = async () =>
      decision({ decisionId: "dec_e1", errors: ["POLICY_SET_UNAVAILABLE"] });
    await refused(
      call(),
      "lookup",
      { reason: "policy_error", decisionId: "dec_e1", errorCount: "1" },
      forbidden,
    );
    let rows = await h.decisions("r_9");
    assert.deepEqual(
      rows.map((r) => [r.decisionId, r.decision, r.reasons, r.errors, r.permit]),
      [["dec_e1", "deny", [], ["POLICY_SET_UNAVAILABLE"], null]],
    );

    current.check = async () =>
      decision({
        decisionId: "dec_e2",
        reasons: ["t-x"],
        errors: ["PDP_EVALUATION_ERROR:t-a", "PDP_EVALUATION_ERROR:t-b"],
      });
    await refused(
      call(),
      "lookup",
      { reason: "policy_error", decisionId: "dec_e2", errorCount: "2" },
      forbidden,
    );

    current.check = async () =>
      decision({
        decision: "allow",
        decisionId: "dec_e3",
        reasons: ["g"],
        errors: ["PDP_EVALUATION_ERROR:t-a"],
        permit: V1_PERMIT,
      });
    await refused(
      call(),
      "lookup",
      { reason: "policy_error", decisionId: "dec_e3", errorCount: "1" },
      forbidden,
    );
    rows = await h.decisions("r_9");
    assert.deepEqual(
      rows.map((r) => [r.decisionId, r.decision, r.errors.length, r.permit]),
      [
        ["dec_e1", "deny", 1, null],
        ["dec_e2", "deny", 2, null],
        ["dec_e3", "deny", 1, null],
      ],
    );

    current.check = () =>
      Promise.reject(Object.assign(new Error("db down"), { code: "ECONNREFUSED" }));
    await refused(call(), "lookup", { reason: "policy_unavailable", code: "ECONNREFUSED" });
    current.check = () => Promise.reject(new Error("db down"));
    await refused(call(), "lookup", { reason: "policy_unavailable", code: "UNKNOWN" });
    assert.equal((await h.decisions("r_9")).length, 3);

    current.check = async () =>
      decision({
        decision: "allow",
        decisionId: "dec_e7",
        reasons: ["g"],
        permit: V1_PERMIT,
      });
    const first = await settled("first dec_e7", call);
    assert.deepEqual(first.permit, V1_PERMIT);
    assert.equal(first.decisionId, "dec_e7");
    await refused(call(), "lookup", { reason: "decision_unrecorded" });
    assert.equal((await h.decisions("r_9")).length, 4);

    assert.equal(h.gateway.calls.length, 0);
    assert.equal(await h.intents("r_9"), 0);
  } finally {
    await h.close();
  }
});

interface Doubles {
  tools: (ref: string) => Promise<ToolBinding | null>;
  services: () => Promise<{ serviceId: string; origin: string } | null>;
  principals: (userId: string) => Promise<PrincipalEntity | null>;
  toolArgs: () => Promise<Record<string, ToolArgType>>;
  loadVersion: () => Promise<ReturnType<typeof invokeRunVersion> | null>;
  catalogueFor: () => ReturnType<InvokePathDeps["catalogueFor"]>;
}

interface Rig {
  invoker: ToolInvoker;
  counts: { check: number; connect: number; gateway: number };
}

async function rig(over: Partial<Doubles> = {}): Promise<Rig> {
  const counts = { check: 0, connect: 0, gateway: 0 };
  const doubles: Doubles = {
    tools: async () => LV,
    services: async () => ({ serviceId: S, origin: ORIGIN }),
    principals: async () => ALICE,
    toolArgs: async () => TOOL_ARGS,
    loadVersion: async () => invokeRunVersion("read-then-pay"),
    catalogueFor: async () => acmeCatalogue(),
    ...over,
  };
  const gateway = {
    requestToken: () => {
      counts.gateway += 1;
      return Promise.reject(new Error("gateway used"));
    },
    send: () => {
      counts.gateway += 1;
      return Promise.reject(new Error("gateway used"));
    },
  } as unknown as Gateway;
  const policy = {
    engine: {
      check: async (): Promise<Decision> => {
        counts.check += 1;
        return {
          decision: "allow",
          decisionId: "dec_r",
          decidedAt: T0,
          reasons: ["g"],
          errors: [],
          policySetVersion: "a".repeat(64),
          permit: V1_PERMIT,
        };
      },
    },
    toolArgs: () => doubles.toolArgs(),
    reload: async () => undefined,
  } as unknown as PolicyRuntime;
  const deps: InvokePathDeps = {
    pool: {
      connect: () => {
        counts.connect += 1;
        return Promise.reject(new Error("db down"));
      },
    },
    policy,
    gateway,
    tools: { resolve: (_ctx, ref) => doubles.tools(ref) },
    services: { resolve: () => doubles.services() },
    principals: (_ctx, userId) => doubles.principals(userId),
    loadVersion: () => doubles.loadVersion(),
    catalogueFor: () => doubles.catalogueFor(),
    clock: fixedClock(T0),
    logger: captureLogger().logger,
  };
  let invoker: ToolInvoker | undefined;
  await assert.doesNotReject(async () => {
    invoker = await createInvokePath(deps).liveInvoker(runRecord("r_9"));
  }, "liveInvoker resolves");
  assert.ok(invoker !== undefined, "liveInvoker answered");
  return { invoker, counts };
}

async function expectRefusal(
  over: Partial<Doubles>,
  details: Record<string, string>,
  call: ToolCall = LOOKUP,
  ctxExtra: Record<string, unknown> = {},
): Promise<void> {
  const { invoker, counts } = await rig(over);
  await refused(
    authorizeOf(invoker, call, ctxOf("r_9", call.nodeId, ctxExtra)),
    call.nodeId,
    details,
  );
  const decided = details["reason"] === "decision_unrecorded";
  assert.equal(counts.check, decided ? 1 : 0);
  assert.equal(counts.connect, decided ? 1 : 0);
  assert.equal(counts.gateway, 0);
}

test("C-c28f570f each refusal reason in order, rows R1 to R10 R13 and R14", async () => {
  await expectRefusal({ tools: async () => null }, { reason: "tool_unbound" });
  await expectRefusal(
    { tools: async () => ({ ...LV, state: "pending" }) },
    { reason: "tool_unapproved" },
  );
  await expectRefusal(
    { tools: async () => ({ ...LV, state: "drifted" }) },
    { reason: "surface_drift" },
  );
  await expectRefusal({ services: async () => null }, { reason: "credential_missing" });
  await expectRefusal({ principals: async () => null }, { reason: "principal_unknown" });
  await expectRefusal(
    { principals: async () => ({ ...ALICE, tenantId: "tenant_b" }) },
    { reason: "principal_unknown" },
  );
  await expectRefusal({}, { reason: "args_unconvertible" }, { ...LOOKUP, args: { vendor_name: 5 } });
  await expectRefusal({}, { reason: "fingerprint_unavailable" }, { ...LOOKUP, nodeId: "ghost" });
  await expectRefusal({}, { reason: "decision_unrecorded" });
  await expectRefusal(
    { tools: async () => null },
    { reason: "tool_unbound", hook: "pay:post:notify" },
    { ...LOOKUP, nodeId: "pay" },
    { effect: "pay", hook: { phase: "post", label: "notify" } },
  );
  await expectRefusal({ loadVersion: async () => null }, { reason: "fingerprint_unavailable" });
  await expectRefusal(
    { principals: async (userId) => (userId === "alice" ? ALICE : null) },
    { reason: "principal_unknown" },
    LOOKUP,
    { approvals: [{ nodeId: "approval", decision: "approved", approver: "bob" }] },
  );
});

test("C-c28f570f a dependency that rejects before the check is a failed call, row R11", async () => {
  const down = (): Promise<never> => Promise.reject(new Error("db down"));
  const rows: Partial<Doubles>[] = [
    { tools: down },
    { services: down },
    { principals: down },
    { toolArgs: down },
    { loadVersion: down },
    { catalogueFor: down },
  ];
  for (const over of rows) {
    const { invoker, counts } = await rig(over);
    await assert.rejects(authorizeOf(invoker, LOOKUP, ctxOf("r_9", "lookup")), (e: unknown) => {
      const err = e as Denied;
      assert.equal(err.code, "INTERPRETER_TOOL_FAILED");
      assert.equal(err.message, "node execution failed");
      assert.deepEqual(err.details, { stage: "authorize" });
      assert.ok(!JSON.stringify(e).includes("db down"));
      return true;
    });
    assert.deepEqual(counts, { check: 0, connect: 0, gateway: 0 });
  }
});

test("C-c28f570f the initiator is loaded on each authorize and the version once, row R12", async () => {
  const counts = { principals: 0, loadVersion: 0, catalogueFor: 0 };
  const h = await openHarness({
    principals: (real) => (ctx, userId) => {
      counts.principals += 1;
      return counts.principals > 1 ? Promise.resolve(null) : real(ctx, userId);
    },
    loadVersion: (real) => (ctx, flowId, hash) => {
      counts.loadVersion += 1;
      return real(ctx, flowId, hash);
    },
    catalogueFor: (real) => (ctx) => {
      counts.catalogueFor += 1;
      return real(ctx);
    },
  });
  try {
    await settled("grant", () => h.grant(G_LOOKUP));
    await settled("deploy", () => h.deploy(""));
    const inv = await liveInvokerOf(h, "r_9");
    const first = await settled("first authorize", () =>
      authorizeOf(inv, LOOKUP, ctxOf("r_9", "lookup")),
    );
    assert.deepEqual(first.permit, V1_PERMIT);
    assert.equal((await h.decisions("r_9")).length, 1);
    await refused(authorizeOf(inv, LOOKUP, ctxOf("r_9", "lookup")), "lookup", {
      reason: "principal_unknown",
    });
    assert.equal((await h.decisions("r_9")).length, 1);
    assert.deepEqual(counts, { principals: 2, loadVersion: 1, catalogueFor: 1 });
    assert.equal(h.gateway.calls.length, 0);
  } finally {
    await h.close();
  }
});

test("C-c28f570f the approver of a rejected or null approval is not loaded, row R15", async () => {
  const asked: string[] = [];
  const h = await openHarness({
    principals: (real) => (ctx, userId) => {
      asked.push(userId);
      return real(ctx, userId);
    },
  });
  try {
    await settled("grant", () => h.grant(G_LOOKUP));
    await settled("deploy", () => h.deploy(""));
    const inv = await liveInvokerOf(h, "r_9");
    const auth = await settled("authorize", () =>
      authorizeOf(
        inv,
        LOOKUP,
        ctxOf("r_9", "lookup", {
          approvals: [
            { nodeId: "approval", decision: "rejected", approver: "bob" },
            { nodeId: "approval", decision: "approved", approver: null },
          ],
        }),
      ),
    );
    assert.deepEqual(auth.permit, V1_PERMIT);
    assert.equal((await h.decisions("r_9")).length, 1);
    assert.deepEqual(asked, ["alice"]);
  } finally {
    await h.close();
  }
});
