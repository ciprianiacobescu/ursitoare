import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createMemoryRunStore, idemKey } from "../../runs/index.ts";
import type {
  RunRecord,
  RunStore,
  StepHookEntry,
  StepRecord,
  TenantContext,
} from "../../runs/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { parseCatalogueFlow } from "../../../test/support/catalogue/flows.ts";
import { hookRunVersion, readHookRunText } from "../../../test/support/hook-runs/index.ts";
import { executeRun, memoryWorkflowOps, startRun } from "../index.ts";
import type {
  EffectGate,
  InterpreterDeps,
  LoadedVersion,
  MemoryWorkflowOps,
  ToolInvoker,
} from "../index.ts";
import type { HookTraceEntry } from "./types.ts";

assert.equal(typeof executeRun, "function");

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const INPUT: JsonValue = { vendor: "  Acme ", amount: 120, currency: "eur" };
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };
const CATALOGUE = loadTestCatalogue();

const PAY_LABELS: readonly string[] = [
  "pre:rule.rule_a",
  "pre:rule.rule_b",
  "pre:pay_pre_note",
  "post:pay_post_note",
  "post:rule.rule_b",
  "post:rule.rule_a",
];

function E(label: string, over: Partial<StepHookEntry> = {}): StepHookEntry {
  return {
    label,
    kind: "code",
    fused: true,
    attempt: 1,
    state: "completed",
    action: "continue",
    mutated: null,
    to: null,
    error: null,
    tool: null,
    idemKey: null,
    ...over,
  };
}

const PAY_ENTRIES: StepHookEntry[] = PAY_LABELS.map((label, index) =>
  index === PAY_LABELS.length - 1 ? E(label, { fused: false }) : E(label),
);

interface Observation {
  nodeId: string;
  entry: HookTraceEntry;
}

interface Scene {
  result: RunRecord;
  executed: readonly string[];
  values: JsonValue[];
  steps: StepRecord[];
  observed: Observation[];
}

function onionOwn(): LoadedVersion {
  const text = readHookRunText("onion");
  const from = 'post: {kind: code, source: "return;"}}\n  - {id: rule_b';
  assert.ok(text.includes(from), "the replacement text is in the fixture");
  return {
    ...hookRunVersion("onion"),
    flow: parseCatalogueFlow(
      text.replace(from, 'post: {kind: code, source: "return;", routes: [done]}}\n  - {id: rule_b'),
      "onion-own",
    ),
  };
}

function tagged(base: MemoryWorkflowOps, values: JsonValue[]): MemoryWorkflowOps {
  return {
    get workflowId(): string {
      return base.workflowId;
    },
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      const value = await base.runStep(name, fn);
      values.push(value);
      return value;
    },
    sleep: (ms) => base.sleep(ms),
    get executed(): readonly string[] {
      return base.executed;
    },
    get slept(): readonly number[] {
      return base.slept;
    },
  };
}

async function runPass(
  version: LoadedVersion,
  input: JsonValue,
  store: RunStore,
  recorded: readonly JsonValue[] | null,
): Promise<Scene> {
  const pool = createWorkerSandbox({ size: 1 });
  const values: JsonValue[] = [];
  const observed: Observation[] = [];
  const invoker: ToolInvoker = {
    async invoke(call) {
      if (call.tool === "erp.lookup_vendor@1") return { output: LOOKUP_OK };
      if (call.tool === "erp.create_payment@1") return { output: PAID };
      throw new Error(`unexpected tool ${call.tool}`);
    },
  };
  const gate: EffectGate = {
    async before(call, ctx) {
      return {
        action: "invoke",
        idemKey: idemKey(T_A.tenantId, ctx.runId, call.nodeId, call.effectSeq, call.generation ?? 0),
      };
    },
    async after() {},
  };
  const deps: InterpreterDeps = {
    store,
    durable: null,
    loadVersion: async () => version,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => invoker,
    effects: gate,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    sandbox: pool,
    hookObserver: (nodeId, entry) => {
      observed.push({ nodeId, entry });
    },
  };
  try {
    if (recorded === null) {
      await startRun(deps, T_A, {
        flowId: version.flowId,
        hash: version.hash,
        mode: "mock",
        input,
        mocks: null,
        principal: ALICE,
        actorChain: [ALICE.userId],
        runId: "r_1",
      });
    }
    const ops = memoryWorkflowOps("r_1", recorded ?? []);
    const result = await executeRun(tagged(ops, values), deps, T_A, "r_1");
    const listed = await store.listSteps(T_A, "r_1", { limit: 100 });
    return { result, executed: ops.executed, values, steps: listed.steps, observed };
  } finally {
    await pool.close();
  }
}

function row(scene: Scene, nodeId: string): StepRecord {
  const found = scene.steps.find((step) => step.nodeId === nodeId);
  assert.ok(found !== undefined, `row ${nodeId}`);
  return found;
}

test("C-c28d77df a replay of onion-own rewrites the same hook trace", async () => {
  const version = onionOwn();
  const store: RunStore = createMemoryRunStore();
  const first = await runPass(version, INPUT, store, null);
  assert.equal(first.result.state, "completed");
  assert.equal(first.values.length, 9);
  assert.deepEqual(row(first, "lookup").hooks, {
    inputOriginalRef: null,
    entries: [E("pre:rule.rule_b"), E("post:rule.rule_b")],
  });
  assert.equal("hooks" in row(first, "normalize"), false);
  assert.deepEqual(row(first, "pay").hooks, {
    inputOriginalRef: null,
    entries: PAY_ENTRIES,
  });
  assert.equal("hooks" in row(first, "done"), false);

  const cases: { k: number; executed: string[] }[] = [
    { k: 4, executed: ["pay", "pay#done", "pay:post:rule.rule_a", "done", "run:finish"] },
    { k: 6, executed: ["pay:post:rule.rule_a", "done", "run:finish"] },
    { k: 9, executed: [] },
  ];
  for (const { k, executed } of cases) {
    const again = await runPass(version, INPUT, store, first.values.slice(0, k));
    assert.equal(again.result.state, "completed", `state for ${k}`);
    assert.deepEqual(again.executed, executed, `executed for ${k}`);
    assert.deepEqual(again.steps, first.steps, `rows for ${k}`);
    assert.deepEqual(again.observed, first.observed, `observer for ${k}`);
    assert.deepEqual(row(again, "pay").hooks, {
      inputOriginalRef: null,
      entries: PAY_ENTRIES,
    });
  }
});
