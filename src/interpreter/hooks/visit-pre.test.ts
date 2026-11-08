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
  MemoryWorkflowOps,
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
const LEAD = ["run:load", "run:start"];

interface Scene {
  result: RunRecord;
  executed: readonly string[];
  values: readonly JsonValue[];
  calls: ToolCall[];
  gateCalls: ToolCall[];
  obs: string[];
  entries: HookTraceEntry[];
  sandboxRuns: number;
  steps: StepRecord[];
}

interface Options {
  observer?: (nodeId: string, entry: HookTraceEntry) => void;
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
    sleep: (ms: number) => base.sleep(ms),
    get executed(): readonly string[] {
      return base.executed;
    },
    get slept(): readonly number[] {
      return base.slept;
    },
  };
}

async function runFlow(version: LoadedVersion, options: Options = {}): Promise<Scene> {
  const store: RunStore = createMemoryRunStore();
  const pool = createWorkerSandbox({ size: 1 });
  let sandboxRuns = 0;
  const sandbox: WorkerSandbox = {
    ...pool,
    run: (code, input, limits, opts) => {
      if (opts.binding === "ctx") sandboxRuns += 1;
      return pool.run(code, input, limits, opts);
    },
  } as WorkerSandbox;
  const calls: ToolCall[] = [];
  const gateCalls: ToolCall[] = [];
  const obs: string[] = [];
  const entries: HookTraceEntry[] = [];
  const invoker: ToolInvoker = {
    async invoke(call) {
      calls.push(call);
      if (call.tool === "erp.lookup_vendor@1") return { output: LOOKUP_OK };
      if (call.tool === "erp.create_payment@1") return { output: PAID };
      throw new Error(`unexpected tool ${call.tool}`);
    },
  };
  const gate: EffectGate = {
    async before(call) {
      gateCalls.push(call);
      return { action: "invoke", idemKey: "ik_pay_1" };
    },
    async after() {},
  };
  const observer = (nodeId: string, entry: HookTraceEntry): void => {
    obs.push(`${nodeId}/${entry.label}${entry.fused ? "*" : ""}`);
    entries.push(entry);
    options.observer?.(nodeId, entry);
  };
  const base: InterpreterDeps = {
    store,
    durable: null,
    loadVersion: async () => version,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => invoker,
    effects: gate,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    sandbox,
  };
  const deps = { ...base, hookObserver: observer } as InterpreterDeps;
  try {
    await startRun(deps, T_A, {
      flowId: version.flowId,
      hash: version.hash,
      mode: "mock",
      input: INPUT,
      mocks: null,
      principal: ALICE,
      actorChain: [ALICE.userId],
      runId: "r_1",
    });
    const values: JsonValue[] = [];
    const ops = memoryWorkflowOps("r_1");
    const result = await executeRun(tagged(ops, values), deps, T_A, "r_1");
    const listed = await store.listSteps(T_A, "r_1", { limit: 100 });
    return {
      result,
      executed: ops.executed,
      values,
      calls,
      gateCalls,
      obs,
      entries,
      sandboxRuns,
      steps: listed.steps,
    };
  } finally {
    await pool.close();
  }
}

function variant(of: string, name: string, from: string, to: string): LoadedVersion {
  const text = readHookRunText(of);
  assert.ok(text.includes(from), "the replacement text is in the fixture");
  return { ...hookRunVersion(of), flow: parseCatalogueFlow(text.replace(from, to), name) };
}

function onionOwn(): LoadedVersion {
  return variant(
    "onion",
    "onion-own",
    "post: {kind: code, source: \"return;\"}}\n  - {id: rule_b",
    "post: {kind: code, source: \"return;\", routes: [done]}}\n  - {id: rule_b",
  );
}

const OBS_ONION = [
  "lookup/pre:rule.rule_b*",
  "lookup/post:rule.rule_b*",
  "pay/pre:rule.rule_a*",
  "pay/pre:rule.rule_b*",
  "pay/pre:pay_pre_note*",
  "pay/post:pay_post_note*",
  "pay/post:rule.rule_b*",
  "pay/post:rule.rule_a*",
];

function row(scene: Scene, nodeId: string): StepRecord {
  const found = scene.steps.find((step) => step.nodeId === nodeId);
  assert.ok(found !== undefined, `row ${nodeId}`);
  return found;
}

test("C-e9060697 onion runs its eight hooks fused in onion order", async () => {
  const scene = await runFlow(hookRunVersion("onion"));
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(scene.executed, [...LEAD, "lookup", "normalize", "pay", "pay#done", "done", "run:finish"]);
  assert.deepEqual(scene.obs, OBS_ONION);
  assert.equal(scene.sandboxRuns, 8);
  assert.deepEqual(
    scene.steps.map((step) => step.state),
    ["completed", "completed", "completed", "completed"],
  );
  assert.deepEqual(
    scene.steps.map((step) => step.idemKey),
    [null, null, "ik_pay_1", null],
  );
  assert.equal(row(scene, "done").inputRef, null);
  const lookup = scene.values.find(
    (value) => typeof value === "object" && value !== null && !Array.isArray(value) && "__fused" in value,
  ) as { value: JsonValue; __fused: JsonValue[] } | undefined;
  assert.ok(lookup !== undefined, "a fused step value");
  assert.deepEqual(lookup.value, LOOKUP_OK);
  assert.equal(lookup.__fused.length, 2);
});

test("C-e9060697 onion-own runs one hook as a step of its own", async () => {
  const scene = await runFlow(onionOwn());
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(scene.executed, [
    ...LEAD,
    "lookup",
    "normalize",
    "pay",
    "pay#done",
    "pay:post:rule.rule_a",
    "done",
    "run:finish",
  ]);
  assert.equal(scene.obs.length, 8);
  assert.ok(scene.obs.includes("pay/post:rule.rule_a"));
});

test("C-e9060697 a throwing observer changes nothing in the run", async () => {
  const recording = await runFlow(hookRunVersion("onion"));
  let calls = 0;
  const throwing = await runFlow(hookRunVersion("onion"), {
    observer: () => {
      calls += 1;
      throw new Error("observer failure");
    },
  });
  assert.equal(calls, 8);
  assert.equal(throwing.result.state, "completed");
  assert.deepEqual(throwing.executed, recording.executed);
  assert.deepEqual(throwing.steps, recording.steps);
  assert.deepEqual(throwing.values, recording.values);
});

test("C-290267b9 mutate changes the lookup input and the normalize output", async () => {
  const scene = await runFlow(hookRunVersion("mutate"));
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(scene.calls[0]?.args, { vendor_name: "Acme" });
  assert.equal(row(scene, "lookup").inputRef, payloadDigest({ vendor_name: "Acme" }));
  assert.equal(row(scene, "normalize").outputRef, payloadDigest({ amount: 120, currency: "EUR" }));
  const pay = scene.gateCalls[0]?.args as { currency?: string } | undefined;
  assert.equal(pay?.currency, "EUR");
});

test("C-290267b9 bad-upper fails the output check at normalize", async () => {
  const version = variant(
    "mutate",
    "bad-upper",
    "output: { amount: ctx.output.amount, currency: ctx.output.currency.toUpperCase() }",
    'output: { amount: "x", currency: "EUR" }',
  );
  const scene = await runFlow(version);
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "INTERPRETER_OUTPUT_INVALID");
  assert.deepEqual(scene.result.error?.details, {
    path: "/amount",
    keyword: "type",
    hook: "normalize:post:upper_currency",
  });
  assert.equal(row(scene, "normalize").state, "failed");
  assert.equal(scene.gateCalls.length, 0);
});

test("C-290267b9 skip-read skips the lookup and the row shows the effective input", async () => {
  const scene = await runFlow(hookRunVersion("skip-read"));
  assert.equal(scene.result.state, "completed");
  assert.equal(scene.calls.filter((call) => call.tool === "erp.lookup_vendor@1").length, 0);
  const lookup = row(scene, "lookup");
  assert.equal(lookup.state, "skipped");
  assert.equal(lookup.outputRef, payloadDigest({ vendor_id: "v-cached", status: "active" }));
  assert.equal(lookup.inputRef, payloadDigest({ vendor_name: "  Acme " }));
  const pay = scene.gateCalls[0]?.args as { vendor_id?: string } | undefined;
  assert.equal(pay?.vendor_id, "v-cached");
});

test("C-290267b9 skip-pay is refused before any effect", async () => {
  const scene = await runFlow(hookRunVersion("skip-pay"));
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_ACTION_FORBIDDEN");
  assert.deepEqual(scene.result.error?.details, { hook: "pay:pre:fake_payment", action: "skip" });
  assert.equal(row(scene, "pay").state, "failed");
  assert.equal(scene.gateCalls.length, 0);
});

test("C-290267b9 end-pre makes the changed input the run output", async () => {
  const scene = await runFlow(hookRunVersion("end-pre"));
  const output = { payment_id: "pay-1", paid: true };
  assert.equal(scene.result.state, "completed");
  assert.equal(scene.result.outputRef, payloadDigest(output));
  assert.equal(row(scene, "done").inputRef, payloadDigest(output));
  assert.equal(row(scene, "done").outputRef, payloadDigest(output));
});
