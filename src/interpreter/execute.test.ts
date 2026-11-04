import assert from "node:assert/strict";
import { test } from "node:test";

import type { Catalogue, Flow, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore, payloadDigest } from "../runs/index.ts";
import type { RunRecord, RunStore, StepRecord, TenantContext } from "../runs/index.ts";
import { executeRun, memoryWorkflowOps, NO_EFFECT_GATE, startRun } from "./index.ts";
import type {
  EffectDecision,
  EffectGate,
  EffectMode,
  InterpreterDeps,
  LoadedVersion,
  MemoryWorkflowOps,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";

assert.equal(typeof executeRun, "function");
assert.equal(typeof startRun, "function");

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const HASH = `sha256:${"a".repeat(64)}`;
const INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };
const END_OUTPUT = { payment_id: "pay-1" };
const PAY_ARGS = { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" };
const CATALOGUE = loadTestCatalogue();
const UNSAFE_PAY_CATALOGUE: Catalogue = {
  block(ref) {
    const def = CATALOGUE.block(ref);
    if (ref === "erp.create_payment@1" && def !== undefined) {
      return { ...def, unsafe_to_retry: true };
    }
    return def;
  },
  modelProfile: (ref) => CATALOGUE.modelProfile(ref),
  role: (name) => CATALOGUE.role(name),
  delegateTarget: (target, workflow) => CATALOGUE.delegateTarget(target, workflow),
  flow: (ref, major) => CATALOGUE.flow(ref, major),
};
const AT = "2026-11-02T10:00:00.000000Z";
const NOW = new Date("2026-11-02T10:00:00Z");

function payOnceFlow(): Flow {
  return {
    ursitoare: "0.1",
    flow: "pay-once",
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: {
        vendor: { type: "string" },
        invoice: { type: "string" },
        amount: { type: "number" },
      },
      required: ["vendor", "invoice", "amount"],
    },
    start: "lookup",
    nodes: {
      lookup: {
        kind: "block",
        uses: "erp.lookup_vendor@1",
        with: { vendor_name: "${{ inputs.vendor }}" },
        next: "route",
      },
      route: {
        kind: "switch",
        on: "${{ nodes.lookup.output.status }}",
        cases: { active: "pay" },
        default: "rejected",
      },
      pay: {
        kind: "block",
        uses: "erp.create_payment@1",
        with: {
          vendor_id: "${{ nodes.lookup.output.vendor_id }}",
          amount: "${{ inputs.amount }}",
          currency: "EUR",
          reference: "${{ inputs.invoice }}",
        },
        next: "done",
      },
      done: {
        kind: "end",
        status: "completed",
        output: { payment_id: "${{ nodes.pay.output.payment_id }}" },
      },
      rejected: { kind: "end", status: "failed" },
    },
  };
}

function loadedPayOnce(): LoadedVersion {
  return {
    flowId: "pay-once",
    hash: HASH,
    state: "validated",
    ownerTeam: "finance",
    flow: payOnceFlow(),
  };
}

function makeDeps(store: RunStore, over: Partial<InterpreterDeps> = {}): InterpreterDeps {
  return {
    store,
    durable: null,
    loadVersion: async (_ctx, flowId) => (flowId === "pay-once" ? loadedPayOnce() : null),
    catalogueFor: async () => UNSAFE_PAY_CATALOGUE,
    invokerFor: async () => {
      throw new Error("executeRun must ask for an invoker through invokerFor");
    },
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    ...over,
  };
}

function ctx(
  nodeId: string,
  effect: StepContext["effect"] = "read",
  unsafeToRetry = false,
  idemKey: string | null = null,
): StepContext {
  return {
    tenant: T_A,
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: HASH,
    nodeId,
    kind: "block",
    mode: "mock",
    attempt: 1,
    effect,
    unsafeToRetry,
    idemKey,
    principal: ALICE,
    now: NOW,
  };
}

interface InvokerLog {
  call: ToolCall;
  ctx: StepContext;
}

function invokerAnswering(
  answers: Readonly<Record<string, JsonValue>>,
): ToolInvoker & { log: InvokerLog[] } {
  const log: InvokerLog[] = [];
  return {
    log,
    async invoke(call, context) {
      log.push({ call, ctx: context });
      if (!Object.hasOwn(answers, call.tool)) {
        throw new Error(`unexpected tool ${call.tool}`);
      }
      return { output: answers[call.tool] as JsonValue };
    },
  };
}

interface GateLog {
  call: ToolCall;
  ctx: StepContext;
  result?: ToolResult;
}

function recordingGate(decision: EffectDecision): EffectGate & { log: GateLog[] } {
  const log: GateLog[] = [];
  return {
    log,
    async before(call, context) {
      log.push({ call, ctx: context });
      return decision;
    },
    async after(call, context, result) {
      log.push({ call, ctx: context, result });
    },
  };
}

interface TaggedOps extends MemoryWorkflowOps {
  readonly values: readonly JsonValue[];
}

function taggedOps(workflowId: string, recorded: readonly JsonValue[] = []): TaggedOps {
  const base = memoryWorkflowOps(workflowId, recorded);
  const values: JsonValue[] = [];
  return {
    get workflowId(): string {
      return base.workflowId;
    },
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      const value = await base.runStep(name, fn);
      values.push(value);
      return value;
    },
    async sleep(ms: number): Promise<void> {
      await base.sleep(ms);
    },
    get executed(): readonly string[] {
      return base.executed;
    },
    get slept(): readonly number[] {
      return base.slept;
    },
    get values(): readonly JsonValue[] {
      return values;
    },
  };
}

interface Scene {
  ops: TaggedOps;
  invoker: ToolInvoker & { log: InvokerLog[] };
  gate: EffectGate & { log: GateLog[] };
  invokerForCalls: { mode: EffectMode; run: RunRecord }[];
  result: RunRecord;
}

async function storeWithQueuedRun(): Promise<RunStore> {
  const store = createMemoryRunStore();
  const deps = makeDeps(store);
  await assert.doesNotReject(async () => {
    await startRun(deps, T_A, {
      flowId: "pay-once",
      hash: HASH,
      mode: "mock",
      input: INPUT,
      mocks: null,
      principal: ALICE,
      actorChain: [ALICE.userId],
      runId: "r_1",
    });
  });
  return store;
}

async function executeScene(
  store: RunStore,
  recorded: readonly JsonValue[] = [],
): Promise<Scene> {
  const ops = taggedOps("r_1", recorded);
  const invoker = invokerAnswering({
    "erp.lookup_vendor@1": LOOKUP_OK,
    "erp.create_payment@1": PAID,
  });
  const gate = recordingGate({ action: "invoke", idemKey: "ik_pay_1" });
  const invokerForCalls: { mode: EffectMode; run: RunRecord }[] = [];
  const deps = makeDeps(store, {
    invokerFor: async (mode, run) => {
      invokerForCalls.push({ mode, run });
      return invoker;
    },
    effects: gate,
  });

  let result: RunRecord | undefined;
  await assert.doesNotReject(async () => {
    result = await executeRun(ops, deps, T_A, "r_1");
  });
  assert.ok(result !== undefined, "executeRun did not return a run");
  return { ops, invoker, gate, invokerForCalls, result };
}

function payRows(): StepRecord[] {
  return [
    {
      runId: "r_1",
      nodeId: "lookup",
      effectSeq: 0,
      turn: 0,
      attempt: 1,
      generation: 0,
      seq: 0,
      kind: "block",
      state: "completed",
      inputRef: payloadDigest({ vendor_name: "Acme" }),
      outputRef: payloadDigest(LOOKUP_OK),
      outcome: null,
      error: null,
      taint: [],
      policyDecisionId: null,
      idemKey: null,
      startedAt: AT,
      endedAt: AT,
    },
    {
      runId: "r_1",
      nodeId: "route",
      effectSeq: 0,
      turn: 0,
      attempt: 1,
      generation: 0,
      seq: 1,
      kind: "switch",
      state: "completed",
      inputRef: payloadDigest({ on: "active" }),
      outputRef: null,
      outcome: "active",
      error: null,
      taint: [],
      policyDecisionId: null,
      idemKey: null,
      startedAt: AT,
      endedAt: AT,
    },
    {
      runId: "r_1",
      nodeId: "pay",
      effectSeq: 0,
      turn: 0,
      attempt: 1,
      generation: 0,
      seq: 2,
      kind: "block",
      state: "completed",
      inputRef: payloadDigest(PAY_ARGS),
      outputRef: payloadDigest(PAID),
      outcome: null,
      error: null,
      taint: [],
      policyDecisionId: null,
      idemKey: "ik_pay_1",
      startedAt: AT,
      endedAt: AT,
    },
    {
      runId: "r_1",
      nodeId: "done",
      effectSeq: 0,
      turn: 0,
      attempt: 1,
      generation: 0,
      seq: 3,
      kind: "end",
      state: "completed",
      inputRef: null,
      outputRef: payloadDigest(END_OUTPUT),
      outcome: null,
      error: null,
      taint: [],
      policyDecisionId: null,
      idemKey: null,
      startedAt: AT,
      endedAt: AT,
    },
  ];
}

async function storedSteps(store: RunStore): Promise<StepRecord[]> {
  const listed = await store.listSteps(T_A, "r_1", { limit: 100 });
  return listed.steps;
}

test("C-c56d71ac a run walks block switch block and end recording numbered rows", async () => {
  const store = await storeWithQueuedRun();
  const scene = await executeScene(store);

  assert.deepEqual(scene.ops.executed, [
    "run:load",
    "run:start",
    "lookup",
    "route",
    "pay",
    "pay#done",
    "done",
    "run:finish",
  ]);

  assert.equal(scene.result.state, "completed");
  assert.equal(scene.result.terminalNode, "done");
  assert.equal(scene.result.outputRef, payloadDigest(END_OUTPUT));
  assert.equal(scene.result.startedAt, AT);
  assert.equal(scene.result.endedAt, AT);
  assert.deepEqual(await store.getRun(T_A, "r_1"), scene.result);

  assert.equal(scene.invokerForCalls.length, 1);
  assert.equal(scene.invokerForCalls[0]?.mode, "mock");
  assert.equal(scene.invokerForCalls[0]?.run.runId, "r_1");

  assert.deepEqual(
    scene.invoker.log.map((entry) => entry.call),
    [
      {
        tool: "erp.lookup_vendor@1",
        args: { vendor_name: "Acme" },
        nodeId: "lookup",
        effectSeq: 0,
      },
      {
        tool: "erp.create_payment@1",
        args: PAY_ARGS,
        nodeId: "pay",
        effectSeq: 0,
      },
    ],
  );
  assert.deepEqual(
    scene.invoker.log.map((entry) => entry.ctx),
    [ctx("lookup"), ctx("pay", "pay", true, "ik_pay_1")],
  );

  assert.deepEqual(await storedSteps(store), payRows());
});

test("C-9272817b replay reuses the recorded numbers and results", async () => {
  const store = await storeWithQueuedRun();
  const first = await executeScene(store);
  const recorded = [...first.ops.values];
  assert.equal(recorded.length, 8, "the first run records eight step values");

  const partial = await executeScene(store, recorded.slice(0, 4));
  assert.deepEqual(partial.ops.executed, ["pay", "pay#done", "done", "run:finish"]);
  assert.equal(partial.invoker.log.length, 1, "only the fresh pay call reaches the invoker");
  assert.equal(partial.invoker.log[0]?.call.nodeId, "pay");
  assert.equal(partial.result.state, "completed");
  assert.deepEqual(await storedSteps(store), payRows());

  const full = await executeScene(store, recorded);
  assert.deepEqual(full.ops.executed, []);
  assert.equal(full.invoker.log.length, 0);
  assert.equal(full.gate.log.length, 0);
  assert.deepEqual(await storedSteps(store), payRows());
  assert.deepEqual(full.result, first.result);
});
