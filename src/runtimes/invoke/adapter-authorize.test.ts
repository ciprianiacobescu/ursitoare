import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../../core/index.ts";
import type { Gateway } from "../../gateway/index.ts";
import type { PolicyRuntime } from "../../grants/index.ts";
import type { StepContext, ToolCall, ToolInvoker } from "../../interpreter/index.ts";
import type { Decision } from "../../pdp/index.ts";
import type { PrincipalEntity, ToolArgType } from "../../pdp/index.ts";
import type { RunRecord, TenantContext } from "../../runs/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import { captureLogger } from "../../../test/support/gateway-kit.ts";
import { acmeCatalogue } from "../../../test/support/invoke-runs/harness.ts";
import { invokeRunVersion } from "../../../test/support/invoke-runs/index.ts";
import { kitBinding, kitHttpAdapter } from "../../../test/support/adapter-kit.ts";
import { createInvokePath } from "./path.ts";
import type { InvokePathDeps } from "./types.ts";

const T0 = "2026-11-06T10:00:00.000Z";
const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const ORIGIN = "https://tools.fake.test";
const TENANT_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };

const LOOKUP: ToolCall = {
  tool: "acme.lookup_vendor@1",
  args: { vendor_name: "Acme GmbH" },
  nodeId: "lookup",
  effectSeq: 0,
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
  mode: "String",
};

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
    idemKey: null,
    principal: { userId: "alice", kind: "human" },
    now: new Date(T0),
    taint: [],
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

interface Counts {
  check: number;
  connect: number;
  gateway: number;
  principals: number;
  services: number;
}

interface Extra {
  calls?: unknown;
  code?: unknown;
  services?: () => Promise<{ serviceId: string; origin: string } | null>;
}

async function rig(binding: ToolBinding, extra: Extra = {}): Promise<{ invoker: ToolInvoker; counts: Counts }> {
  const counts: Counts = { check: 0, connect: 0, gateway: 0, principals: 0, services: 0 };
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
          permit: {
            method: "POST",
            host: "tools.fake.test",
            path: "/vendors/find",
            bodyDigest: "0".repeat(64),
            serviceId: S,
            ttlSeconds: 60,
          },
        };
      },
    },
    toolArgs: async () => TOOL_ARGS,
    reload: async () => undefined,
  } as unknown as PolicyRuntime;
  const deps = {
    pool: {
      connect: () => {
        counts.connect += 1;
        return Promise.reject(new Error("db down"));
      },
    },
    policy,
    gateway,
    tools: { resolve: async () => binding },
    services: {
      resolve: () => {
        counts.services += 1;
        return (extra.services ?? (async () => ({ serviceId: S, origin: ORIGIN })))();
      },
    },
    principals: async () => {
      counts.principals += 1;
      return ALICE;
    },
    loadVersion: async () => invokeRunVersion("read-then-pay"),
    catalogueFor: async () => acmeCatalogue(),
    clock: fixedClock(T0),
    logger: captureLogger().logger,
    ...(extra.calls === undefined ? {} : { calls: extra.calls }),
    ...(extra.code === undefined ? {} : { code: extra.code }),
  } as unknown as InvokePathDeps;
  let invoker: ToolInvoker | undefined;
  await assert.doesNotReject(async () => {
    invoker = await createInvokePath(deps).liveInvoker(runRecord("r_9"));
  }, "liveInvoker resolves");
  assert.ok(invoker !== undefined, "liveInvoker answered");
  return { invoker, counts };
}

function authorizeOf(inv: ToolInvoker, call: ToolCall) {
  assert.ok(inv.authorize !== undefined, "the live invoker has authorize");
  return inv.authorize(call, ctxOf("r_9", call.nodeId));
}

interface Err {
  message?: unknown;
  code?: unknown;
  node?: unknown;
  details?: unknown;
}

async function unavailable(binding: ToolBinding, extra: Extra): Promise<void> {
  const { invoker, counts } = await rig(binding, extra);
  await assert.rejects(authorizeOf(invoker, LOOKUP), (e: unknown) => {
    const err = e as Err;
    assert.equal(err.code, "INTERPRETER_TOOL_DENIED");
    assert.equal(err.message, 'tool call of "lookup" is not permitted (adapter_unavailable)');
    assert.deepEqual(err.details, { reason: "adapter_unavailable" });
    return true;
  });
  assert.deepEqual(counts, { check: 0, connect: 0, gateway: 0, principals: 0, services: 0 });
}

const noCode = async () => ({ output: {} });

test("C-40162b00 a call binding without its adapter is refused before the check, rows Q1 to Q3", async () => {
  await unavailable(kitBinding("http"), {});
  await unavailable(kitBinding("mcp"), { calls: { http: kitHttpAdapter } });
  await unavailable(kitBinding("code"), {});
});

test("C-40162b00 a code call skips the service lookup and reaches the check, row Q4", async () => {
  const { invoker, counts } = await rig(kitBinding("code"), {
    code: noCode,
    services: async () => null,
  });
  await assert.rejects(authorizeOf(invoker, LOOKUP), (e: unknown) => {
    const err = e as Err;
    assert.equal(err.code, "INTERPRETER_TOOL_DENIED");
    assert.deepEqual(err.details, { reason: "decision_unrecorded" });
    return true;
  });
  assert.equal(counts.check, 1);
  assert.equal(counts.principals, 1);
  assert.equal(counts.services, 0);
  assert.equal(counts.gateway, 0);
});

async function buildFailed(mode: string, reason: string): Promise<void> {
  const { invoker, counts } = await rig(kitBinding("http"), { calls: { http: kitHttpAdapter } });
  const call: ToolCall = { ...LOOKUP, args: { vendor_name: "x", mode } };
  await assert.rejects(authorizeOf(invoker, call), (e: unknown) => {
    const err = e as Err;
    assert.equal(err.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(err.message, "node execution failed");
    assert.deepEqual(err.details, { stage: "request", reason });
    const text = JSON.stringify({ message: err.message, details: err.details });
    assert.ok(!text.includes("secret_text"));
    assert.ok(!text.includes("Bad Reason"));
    return true;
  });
  assert.equal(counts.check, 0);
  assert.equal(counts.gateway, 0);
}

test("C-40162b00 a refused build is a request failure that sends nothing, rows Q5 and Q6", async () => {
  await buildFailed("refuse", "refused_args");
  await buildFailed("text", "adapter_reason");
  await buildFailed("throw", "adapter_error");
});
