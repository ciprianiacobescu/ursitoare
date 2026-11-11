import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore } from "../runs/index.ts";
import type { RunStore, StepRecord, StepWrite, TenantContext } from "../runs/index.ts";
import { InterpreterError } from "./errors.ts";
import { createMockInvoker, executeRun, memoryWorkflowOps, startRun } from "./index.ts";
import type { InterpreterDeps } from "./index.ts";
import type {
  CallAuthorization,
  EffectGate,
  EffectMode,
  StepContext,
  ToolCall,
  ToolInvoker,
} from "./types.ts";
import { acmeCatalogue } from "../../test/support/invoke-runs/harness.ts";
import { INVOKE_RUN_HASH, invokeRunVersion } from "../../test/support/invoke-runs/index.ts";

const T: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const INPUT: JsonValue = { vendor_name: "Acme GmbH", amount: 12.5 };
const LOOKUP_OK = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };
const PAID = { payment_id: "PAY-1", status: "created" };
const VERSION = invokeRunVersion("read-then-pay");

const PERMIT = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: `sha256:${"b".repeat(64)}`,
  serviceId: "S_1",
  ttlSeconds: 60,
};

const GATE: EffectGate = {
  async before(call: ToolCall) {
    return { action: "invoke", idemKey: call.nodeId === "pay" ? "ik_pay_1" : null };
  },
  async after() {
    return;
  },
};

interface Recording {
  readonly store: RunStore;
  readonly writes: StepWrite[];
}

function recordingStore(): Recording {
  const inner = createMemoryRunStore();
  const writes: StepWrite[] = [];
  const store: RunStore = {
    createRun: (ctx, run, at) => inner.createRun(ctx, run, at),
    getRun: (ctx, runId) => inner.getRun(ctx, runId),
    transition: (ctx, runId, change) => inner.transition(ctx, runId, change),
    async recordStep(ctx, step) {
      writes.push(step);
      return inner.recordStep(ctx, step);
    },
    listSteps: (ctx, runId, q) => inner.listSteps(ctx, runId, q),
    getPayload: (ctx, sha256) => inner.getPayload(ctx, sha256),
  };
  return { store, writes };
}

function authorizingInvoker(
  denial?: (call: ToolCall) => InterpreterError | null,
): ToolInvoker & { authorized: string[]; invoked: string[] } {
  const authorized: string[] = [];
  const invoked: string[] = [];
  return {
    authorized,
    invoked,
    async authorize(call: ToolCall, _ctx: StepContext): Promise<CallAuthorization> {
      authorized.push(call.nodeId);
      const denied = denial?.(call) ?? null;
      if (denied !== null) throw denied;
      return { decisionId: `dec_${call.nodeId}`, permit: PERMIT };
    },
    async invoke(call: ToolCall): Promise<{ output: JsonValue }> {
      invoked.push(call.nodeId);
      return { output: call.nodeId === "pay" ? PAID : LOOKUP_OK };
    },
  };
}

function depsFor(store: RunStore, invoker: ToolInvoker): InterpreterDeps {
  return {
    store,
    durable: null,
    loadVersion: async (_ctx, flowId, hash) =>
      flowId === VERSION.flowId && hash === VERSION.hash ? VERSION : null,
    catalogueFor: async () => acmeCatalogue(),
    invokerFor: async () => invoker,
    effects: GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
  };
}

async function start(deps: InterpreterDeps, mode: EffectMode): Promise<void> {
  await startRun(deps, T, {
    flowId: VERSION.flowId,
    hash: INVOKE_RUN_HASH,
    mode,
    input: INPUT,
    mocks: null,
    principal: ALICE,
    actorChain: [ALICE.userId],
    runId: "r_1",
  });
}

async function finalRows(store: RunStore): Promise<Record<string, StepRecord>> {
  const listed = await store.listSteps(T, "r_1", { limit: 100 });
  return Object.fromEntries(listed.steps.map((row) => [row.nodeId, row]));
}

function idsOf(rows: Record<string, StepRecord>): Record<string, string | null> {
  return Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, row.policyDecisionId]));
}

test("C-f15c9753 a fresh live run writes the decision ids and a mock run writes null", async () => {
  const recording = recordingStore();
  const invoker = authorizingInvoker();
  const deps = depsFor(recording.store, invoker);
  await start(deps, "live");
  const run = await executeRun(memoryWorkflowOps("r_1"), deps, T, "r_1");
  assert.equal(run.state, "completed");
  assert.deepEqual(idsOf(await finalRows(recording.store)), {
    lookup: "dec_lookup",
    pay: "dec_pay",
    done: null,
  });
  for (const write of recording.writes.filter((w) => w.state === "started")) {
    assert.equal(write.policyDecisionId, null, `started ${write.nodeId}`);
  }

  const mockRecording = recordingStore();
  const mockOps = memoryWorkflowOps("r_1");
  const mockDeps = {
    ...depsFor(
      mockRecording.store,
      createMockInvoker({ lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] }),
    ),
  };
  await start(mockDeps, "mock");
  const mockRun = await executeRun(mockOps, mockDeps, T, "r_1");
  assert.equal(mockRun.state, "completed");
  assert.deepEqual(mockOps.executed, [
    "run:load",
    "run:start",
    "lookup",
    "pay",
    "pay#done",
    "done",
    "run:finish",
  ]);
  assert.deepEqual(idsOf(await finalRows(mockRecording.store)), {
    lookup: null,
    pay: null,
    done: null,
  });
});

test("C-f15c9753 replays over recorded values leave the same decision ids", async () => {
  const recording = recordingStore();
  const invoker = authorizingInvoker();
  const deps = depsFor(recording.store, invoker);
  await start(deps, "live");
  const values: JsonValue[] = [];
  const base = memoryWorkflowOps("r_1");
  await executeRun(
    {
      get workflowId(): string {
        return base.workflowId;
      },
      async runStep<V extends JsonValue>(name: string, fn: () => Promise<V>): Promise<V> {
        const value = await base.runStep(name, fn);
        values.push(value);
        return value;
      },
      sleep: (ms: number) => base.sleep(ms),
    },
    deps,
    T,
    "r_1",
  );
  assert.equal(values.length, 7);
  const expected = { lookup: "dec_lookup", pay: "dec_pay", done: null };
  assert.deepEqual(idsOf(await finalRows(recording.store)), expected);

  const calls = invoker.authorized.length;
  await executeRun(memoryWorkflowOps("r_1", values), deps, T, "r_1");
  assert.equal(invoker.authorized.length, calls);
  assert.deepEqual(idsOf(await finalRows(recording.store)), expected);

  await executeRun(memoryWorkflowOps("r_1", values.slice(0, 4)), deps, T, "r_1");
  assert.equal(invoker.authorized.length, calls);
  assert.deepEqual(idsOf(await finalRows(recording.store)), expected);
});

test("C-f15c9753 a denied call writes the denial's decision id, an unbound tool none", async () => {
  const denied = (details: Record<string, string>, reason: string) => (call: ToolCall) =>
    call.nodeId === "pay"
      ? new InterpreterError(
          "INTERPRETER_TOOL_DENIED",
          `tool call of "pay" is not permitted (${reason})`,
          "pay",
          details,
        )
      : null;

  const policy = recordingStore();
  const policyInvoker = authorizingInvoker(
    denied({ reason: "policy", decisionId: "dec_deny" }, "policy"),
  );
  const policyDeps = depsFor(policy.store, policyInvoker);
  await start(policyDeps, "live");
  const failed = await executeRun(memoryWorkflowOps("r_1"), policyDeps, T, "r_1");
  assert.equal(failed.state, "failed");
  assert.deepEqual(failed.error, {
    code: "INTERPRETER_TOOL_DENIED",
    message: 'tool call of "pay" is not permitted (policy)',
    node: "pay",
    details: { reason: "policy", decisionId: "dec_deny" },
  });
  const rows = await finalRows(policy.store);
  assert.equal(rows["pay"]?.state, "failed");
  assert.equal(rows["pay"]?.policyDecisionId, "dec_deny");
  assert.equal(rows["lookup"]?.policyDecisionId, "dec_lookup");

  const unbound = recordingStore();
  const unboundDeps = depsFor(
    unbound.store,
    authorizingInvoker(denied({ reason: "tool_unbound" }, "tool_unbound")),
  );
  await start(unboundDeps, "live");
  const unboundRun = await executeRun(memoryWorkflowOps("r_1"), unboundDeps, T, "r_1");
  assert.equal(unboundRun.state, "failed");
  assert.equal((await finalRows(unbound.store))["pay"]?.policyDecisionId, null);
});
