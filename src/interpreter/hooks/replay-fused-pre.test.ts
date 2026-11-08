import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createMemoryRunStore, payloadDigest } from "../../runs/index.ts";
import type { RunRecord, RunStore, StepRecord, TenantContext } from "../../runs/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import type { WorkerSandbox } from "../../sandbox/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { parseCatalogueFlow } from "../../../test/support/catalogue/flows.ts";
import { hookRunVersion, readHookRunText } from "../../../test/support/hook-runs/index.ts";
import { executeRun, memoryWorkflowOps, startRun } from "../index.ts";
import type {
  EffectGate,
  InterpreterDeps,
  LoadedVersion,
  ToolCall,
  ToolInvoker,
} from "../index.ts";
import type { HookTraceEntry } from "./types.ts";

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const INPUT: JsonValue = { vendor: "  Acme ", amount: 120, currency: "eur" };
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };
const CATALOGUE = loadTestCatalogue();

const SEE_INPUT =
  'return { action: "continue", output: { ...ctx.output, seen_vendor_name: ctx.input.vendor_name } };';

function mutateWithOwnPost(): LoadedVersion {
  const text = readHookRunText("mutate");
  const from = `{ vendor_name: ctx.input.vendor_name.trim() } };'}]}`;
  assert.ok(text.includes(from), "the replacement text is in the fixture");
  const to = `{ vendor_name: ctx.input.vendor_name.trim() } };'}], post: [{id: see_input, kind: code, source: '${SEE_INPUT}', routes: [normalize]}]}`;
  return {
    ...hookRunVersion("mutate"),
    flow: parseCatalogueFlow(text.replace(from, to), "mutate-own-post"),
  };
}

interface Pass {
  result: RunRecord;
  executed: readonly string[];
  values: JsonValue[];
  steps: StepRecord[];
  obs: string[];
  lookupPostInputs: JsonValue[];
  payCalls: ToolCall[];
  lookupCalls: number;
  sandboxRuns: number;
}

async function pass(
  setup: LoadedVersion,
  store: RunStore,
  recorded: readonly JsonValue[] | null,
): Promise<Pass> {
  const pool = createWorkerSandbox({ size: 1 });
  let sandboxRuns = 0;
  const lookupPostInputs: JsonValue[] = [];
  const sandbox: WorkerSandbox = {
    ...pool,
    run: (code, hctx, limits, opts) => {
      if (opts.binding === "ctx") sandboxRuns += 1;
      const hook = hctx as { phase?: string; node?: { id?: string }; input?: JsonValue };
      if (hook.phase === "post" && hook.node?.id === "lookup") {
        lookupPostInputs.push(structuredClone(hook.input as JsonValue));
      }
      return pool.run(code, hctx, limits, opts);
    },
  } as WorkerSandbox;
  const payCalls: ToolCall[] = [];
  let lookupCalls = 0;
  const obs: string[] = [];
  const invoker: ToolInvoker = {
    async invoke(call) {
      if (call.tool === "erp.lookup_vendor@1") {
        lookupCalls += 1;
        return { output: LOOKUP_OK };
      }
      if (call.tool === "erp.create_payment@1") {
        payCalls.push(call);
        return { output: PAID };
      }
      throw new Error(`unexpected tool ${call.tool}`);
    },
  };
  const gate: EffectGate = {
    async before() {
      return { action: "invoke", idemKey: "ik_pay_1" };
    },
    async after() {},
  };
  const deps = {
    store,
    durable: null,
    loadVersion: async () => setup,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => invoker,
    effects: gate,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    sandbox,
    hookObserver: (nodeId: string, entry: HookTraceEntry): void => {
      obs.push(`${nodeId}/${entry.label}${entry.fused ? "*" : ""}`);
    },
  } as InterpreterDeps;
  try {
    if (recorded === null) {
      await startRun(deps, T_A, {
        flowId: setup.flowId,
        hash: setup.hash,
        mode: "mock",
        input: INPUT,
        mocks: null,
        principal: ALICE,
        actorChain: [ALICE.userId],
        runId: "r_1",
      });
    }
    const values: JsonValue[] = [];
    const base = memoryWorkflowOps("r_1", recorded ?? []);
    const ops = {
      get workflowId(): string {
        return base.workflowId;
      },
      async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
        const value = await base.runStep(name, fn);
        values.push(value);
        return value;
      },
      sleep: (ms: number) => base.sleep(ms),
      get executed(): readonly string[] {
        return base.executed;
      },
      get slept(): readonly number[] {
        return base.slept;
      },
    };
    const result = await executeRun(ops, deps, T_A, "r_1");
    const listed = await store.listSteps(T_A, "r_1", { limit: 100 });
    return {
      result,
      executed: base.executed,
      values,
      steps: listed.steps,
      obs,
      lookupPostInputs,
      payCalls,
      lookupCalls,
      sandboxRuns,
    };
  } finally {
    await pool.close();
  }
}

test("a replay restores a fused pre hook input before the own post hook runs", async () => {
  const setup = mutateWithOwnPost();
  const store = createMemoryRunStore();
  const first = await pass(setup, store, null);
  assert.equal(first.result.state, "completed");
  assert.deepEqual(first.lookupPostInputs, [{ vendor_name: "Acme" }]);
  const lookupRow = first.steps.find((step) => step.nodeId === "lookup");
  assert.equal(lookupRow?.inputRef, payloadDigest({ vendor_name: "Acme" }));

  const lookupIndex = first.executed.indexOf("lookup");
  assert.ok(lookupIndex >= 0, "the first run executes lookup");
  const replay = await pass(
    setup,
    store,
    first.values.slice(0, lookupIndex + 1),
  );
  assert.equal(replay.result.state, "completed");
  assert.equal(replay.lookupCalls, 0);
  assert.ok(replay.executed.includes("lookup:post:see_input"));
  assert.deepEqual(replay.lookupPostInputs, first.lookupPostInputs);
  assert.deepEqual(replay.obs, first.obs);
  assert.deepEqual(replay.steps, first.steps);
  assert.equal(replay.steps.find((step) => step.nodeId === "lookup")?.inputRef, lookupRow?.inputRef);
});
