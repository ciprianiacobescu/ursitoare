import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createMemoryRunStore } from "../../runs/index.ts";
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
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };
const CATALOGUE = loadTestCatalogue();
const LEAD = ["run:load", "run:start"];

interface Meta {
  id: string;
}

interface SeenContext {
  phase: string;
  node: Meta;
  from: Meta | null;
  next: Meta | null;
  next_candidates: Meta[];
  input: JsonValue | null;
  output: JsonValue | null;
  outcome: string | null;
  attempt: number;
  feedback: JsonValue | null;
  args: JsonValue;
}

interface Scene {
  result: RunRecord;
  executed: readonly string[];
  payCalls: ToolCall[];
  lookupCalls: ToolCall[];
  obs: string[];
  contexts: SeenContext[];
  steps: StepRecord[];
}

interface Options {
  lookup?: JsonValue;
}

async function runFlow(
  version: LoadedVersion,
  input: JsonValue,
  options: Options = {},
): Promise<Scene> {
  const store: RunStore = createMemoryRunStore();
  const pool = createWorkerSandbox({ size: 1 });
  const contexts: SeenContext[] = [];
  const sandbox: WorkerSandbox = {
    ...pool,
    run: (code, hctx, limits, opts) => {
      if (opts.binding === "ctx") contexts.push(structuredClone(hctx) as unknown as SeenContext);
      return pool.run(code, hctx, limits, opts);
    },
  } as WorkerSandbox;
  const payCalls: ToolCall[] = [];
  const lookupCalls: ToolCall[] = [];
  const obs: string[] = [];
  const invoker: ToolInvoker = {
    async invoke(call) {
      if (call.tool === "erp.lookup_vendor@1") {
        lookupCalls.push(call);
        return { output: options.lookup ?? LOOKUP_OK };
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
    loadVersion: async () => version,
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
    const ops = memoryWorkflowOps("r_1");
    const result = await executeRun(ops, deps, T_A, "r_1");
    const listed = await store.listSteps(T_A, "r_1", { limit: 100 });
    return { result, executed: ops.executed, payCalls, lookupCalls, obs, contexts, steps: listed.steps };
  } finally {
    await pool.close();
  }
}

function variant(of: string, name: string, from: string, to: string): LoadedVersion {
  const text = readHookRunText(of);
  assert.ok(text.includes(from), "the replacement text is in the fixture");
  return { ...hookRunVersion(of), flow: parseCatalogueFlow(text.replace(from, to), name) };
}

function row(scene: Scene, nodeId: string): StepRecord {
  const found = scene.steps.find((step) => step.nodeId === nodeId);
  assert.ok(found !== undefined, `row ${nodeId}`);
  return found;
}

function shape(c: SeenContext): unknown[] {
  return [
    c.phase,
    c.node.id,
    c.from?.id ?? null,
    c.next?.id ?? null,
    c.next_candidates.map((meta) => meta.id),
    c.input,
    c.output,
    c.outcome,
    c.args,
    c.attempt,
    c.feedback,
  ];
}

const REDIRECT_INPUT = { vendor: "Acme", amount: 2000, mode: "auto" };

test("C-3fd59bc9 a redirect changes the successor and each hook sees its context", async () => {
  const scene = await runFlow(hookRunVersion("redirect"), REDIRECT_INPUT);
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(scene.executed, [
    ...LEAD,
    "gate",
    "classify",
    "classify:post:to_review",
    "classify:post:after_redirect",
    "review",
    "done",
    "run:finish",
  ]);
  assert.deepEqual(scene.obs, [
    "gate/post:saw_default*",
    "classify/pre:pre_look*",
    "classify/post:to_review",
    "classify/post:after_redirect",
  ]);
  assert.deepEqual(
    scene.steps.map((step) => step.nodeId),
    ["gate", "classify", "review", "done"],
  );
  assert.equal(scene.payCalls.length, 0);
  assert.deepEqual(scene.contexts.map(shape), [
    ["post", "gate", null, "classify", ["review", "classify"], { on: "auto" }, null, "default", {}, 1, null],
    ["pre", "classify", "gate", "pay", ["pay", "review"], { amount: 2000 }, null, null, { v: "Acme" }, 1, null],
    ["post", "classify", "gate", "pay", ["pay", "review"], { amount: 2000 }, { risk: "high" }, null, { limit: 1000 }, 1, null],
    ["post", "classify", "gate", "review", ["pay", "review"], { amount: 2000 }, { risk: "high" }, null, {}, 1, null],
  ]);
  const quiet = await runFlow(hookRunVersion("redirect"), { ...REDIRECT_INPUT, amount: 20 });
  assert.equal(quiet.result.state, "completed");
  assert.equal(quiet.payCalls.length, 1);
  assert.equal(quiet.obs.includes("classify/post:after_redirect"), false);
  assert.deepEqual(quiet.executed, [
    ...LEAD,
    "gate",
    "classify",
    "classify:post:to_review",
    "pay",
    "pay#done",
    "done",
    "run:finish",
  ]);
});

test("C-3fd59bc9 an undeclared route and an effect target both fail the node", async () => {
  const undeclared = await runFlow(hookRunVersion("undeclared"), { ...REDIRECT_INPUT, amount: 20 });
  assert.equal(undeclared.result.state, "failed");
  assert.equal(undeclared.result.error?.code, "HOOK_ROUTE_UNDECLARED");
  assert.deepEqual(undeclared.result.error?.details, { hook: "classify:post:to_review", to: "pay" });
  assert.equal(row(undeclared, "classify").state, "failed");
  assert.equal(undeclared.payCalls.length, 0);
  const version = variant("undeclared", "f8", "routes: [review], input", "routes: [review, pay], input");
  const scene = await runFlow(version, { ...REDIRECT_INPUT, amount: 20 });
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_ACTION_FORBIDDEN");
  assert.deepEqual(scene.result.error?.details, {
    hook: "classify:post:to_review",
    action: "redirect into an effect node",
  });
  assert.equal(row(scene, "classify").state, "failed");
  assert.equal(scene.payCalls.length, 0);
});

test("C-3fd59bc9 a fail action completes when quiet and fails the node when blocked", async () => {
  const input = { vendor: "  Acme ", amount: 120, currency: "eur" };
  const ok = await runFlow(hookRunVersion("fail"), input);
  assert.equal(ok.result.state, "completed");
  const blocked = await runFlow(hookRunVersion("fail"), input, {
    lookup: { vendor_id: "v2", status: "blocked" },
  });
  assert.equal(blocked.result.state, "failed");
  assert.equal(blocked.result.error?.code, "HOOK_FAILED");
  assert.deepEqual(blocked.result.error?.details, {
    hook: "lookup:post:no_blocked",
    reason: "vendor blocked",
  });
  assert.equal(blocked.lookupCalls.length, 1);
  assert.equal(blocked.payCalls.length, 0);
});
