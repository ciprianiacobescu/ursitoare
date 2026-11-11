import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore } from "../runs/index.ts";
import type { TenantContext } from "../runs/index.ts";
import { executeRun, memoryWorkflowOps, nodeRuntimeFor, registerNodeRuntime } from "./index.ts";
import type { InterpreterDeps, LoadedVersion } from "./index.ts";
import type { CallAuthorization, NodeRuntime, StepContext, ToolCall, ToolInvoker } from "./types.ts";
import { acmeCatalogue } from "../../test/support/invoke-runs/harness.ts";
import { INVOKE_RUN_HASH, invokeRunVersion } from "../../test/support/invoke-runs/index.ts";

const T: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const LOOKUP_OK = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };
const PAID = { payment_id: "PAY-1", status: "created" };

const PERMIT = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: `sha256:${"b".repeat(64)}`,
  serviceId: "S_1",
  ttlSeconds: 60,
};

let outcome: "approved" | "rejected" = "approved";

const APPROVAL_RUNTIME: NodeRuntime = {
  async execute() {
    return { output: { approver: "bob" }, outcome, next: "pay", end: null };
  },
};

function approvalVersion(): LoadedVersion {
  const base = invokeRunVersion("read-then-pay");
  const flow = structuredClone(base.flow) as unknown as {
    nodes: Record<string, Record<string, unknown>>;
  };
  (flow.nodes["lookup"] as Record<string, unknown>)["next"] = "approval";
  flow.nodes["approval"] = {
    kind: "human.approval",
    assignee_role: "approver",
    cases: { approved: "pay", rejected: "pay" },
  };
  return { ...base, flow: flow as unknown as Flow };
}

interface Seen {
  authorize: Record<string, unknown>[];
  invoke: Record<string, unknown>[];
}

function recordingInvoker(withAuthorize: boolean): ToolInvoker & { seen: Seen } {
  const seen: Seen = { authorize: [], invoke: [] };
  const invoker: ToolInvoker & { seen: Seen } = {
    seen,
    async invoke(call: ToolCall, ctx: StepContext): Promise<{ output: JsonValue }> {
      seen.invoke.push({ ...ctx });
      return { output: call.nodeId === "pay" ? PAID : LOOKUP_OK };
    },
  };
  if (withAuthorize) {
    invoker.authorize = async (_call: ToolCall, ctx: StepContext): Promise<CallAuthorization> => {
      seen.authorize.push({ ...ctx });
      return { decisionId: `dec_${ctx.nodeId}`, permit: PERMIT };
    };
  }
  return invoker;
}

async function runApproval(
  decision: "approved" | "rejected",
  invoker: ToolInvoker,
): Promise<string> {
  if (nodeRuntimeFor("human.approval" as never) === undefined) {
    registerNodeRuntime("human.approval" as never, APPROVAL_RUNTIME);
  }
  outcome = decision;
  const version = approvalVersion();
  const deps: InterpreterDeps = {
    store: createMemoryRunStore(),
    durable: null,
    loadVersion: async () => version,
    catalogueFor: async () => acmeCatalogue(),
    invokerFor: async () => invoker,
    effects: {
      async before() {
        return { action: "invoke", idemKey: null };
      },
      async after() {
        return;
      },
    },
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
  };
  await deps.store.createRun(
    T,
    {
      runId: "r_1",
      lineageId: "r_1",
      parentRunId: null,
      flowId: version.flowId,
      flowHash: INVOKE_RUN_HASH,
      ownerTeam: version.ownerTeam,
      mode: "live",
      trigger: "test",
      principal: ALICE,
      actorChain: [ALICE.userId],
      input: { vendor_name: "Acme GmbH", amount: 12.5 },
      mocks: null,
    },
    deps.clock.now(),
  );
  const run = await executeRun(memoryWorkflowOps("r_1"), deps, T, "r_1");
  return run.state;
}

const nodesOf = (rows: Record<string, unknown>[]): unknown[] => rows.map((ctx) => ctx["nodeId"]);

test("C-fa51d2ff an approved approval node reaches pay as an approval and an invoker without authorize sees none", async () => {
  const withAuthorize = recordingInvoker(true);
  assert.equal(await runApproval("approved", withAuthorize), "completed");
  assert.deepEqual(nodesOf(withAuthorize.seen.authorize), ["lookup", "pay"]);
  assert.deepEqual(
    withAuthorize.seen.authorize.map((ctx) => ctx["approvals"]),
    [[], [{ nodeId: "approval", decision: "approved", approver: "bob" }]],
  );

  const without = recordingInvoker(false);
  assert.equal(await runApproval("approved", without), "completed");
  assert.deepEqual(nodesOf(without.seen.invoke), ["lookup", "pay"]);
  for (const ctx of without.seen.invoke) {
    assert.equal(Object.hasOwn(ctx, "approvals"), false);
  }
});

test("C-fa51d2ff a rejected approval node reaches pay as a rejected approval", async () => {
  const invoker = recordingInvoker(true);
  assert.equal(await runApproval("rejected", invoker), "completed");
  assert.deepEqual(
    invoker.seen.authorize.map((ctx) => ctx["approvals"]),
    [[], [{ nodeId: "approval", decision: "rejected", approver: "bob" }]],
  );
});
