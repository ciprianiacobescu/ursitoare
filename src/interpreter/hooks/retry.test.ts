import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { idemKey } from "../../runs/intents/key.ts";
import { createMemoryRunStore } from "../../runs/index.ts";
import type { RunRecord, RunStore, StepRecord, TenantContext } from "../../runs/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import type { WorkerSandbox } from "../../sandbox/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadHookFlow } from "../../../test/support/hook-flows/index.ts";
import { hookRunVersion } from "../../../test/support/hook-runs/index.ts";
import { executeRun, memoryWorkflowOps, startRun } from "../index.ts";
import type {
  EffectDecision,
  EffectGate,
  InterpreterDeps,
  LoadedVersion,
  ToolCall,
  ToolInvoker,
} from "../index.ts";

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const CATALOGUE = loadTestCatalogue();
const LEAD = ["run:load", "run:start"];

const KEY_G0 = "ik1_747c7cba46904f6f82b4fb4bc8a2c40e0285a7fef47ba9d2bc15bace1ca7e3d0";
const KEY_G1 = "ik1_952c2e1e9477855eb2769897ce482e08a368e983d0dea3e4063ef0c4f77e4b71";

interface SeenContext {
  attempt: number;
  feedback: JsonValue | null;
}

interface Scene {
  result: RunRecord;
  executed: readonly string[];
  calls: { call: ToolCall; attempt: number }[];
  gateCalls: ToolCall[];
  contexts: SeenContext[];
  steps: StepRecord[];
}

function versionOf(name: string): LoadedVersion {
  return { ...hookRunVersion("onion"), flowId: name, flow: loadHookFlow(name) };
}

async function runFlow(
  version: LoadedVersion,
  input: JsonValue,
  unknownFirst = false,
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
  const calls: { call: ToolCall; attempt: number }[] = [];
  const gateCalls: ToolCall[] = [];
  let searches = 0;
  const invoker: ToolInvoker = {
    async invoke(call, ctx) {
      calls.push({ call, attempt: ctx.attempt });
      if (call.tool === "kb.search@1") {
        searches += 1;
        const passages = [{ text: "t0", source: "s0" }];
        if (searches > 1) passages.push({ text: "t1", source: "s1" });
        return { output: { passages } };
      }
      if (call.tool === "mail.send@1") return { output: { message_id: `m-${calls.length}` } };
      throw new Error(`unexpected tool ${call.tool}`);
    },
  };
  let gateSeen = 0;
  const gate: EffectGate = {
    async before(call, ctx): Promise<EffectDecision> {
      gateCalls.push(structuredClone(call));
      gateSeen += 1;
      const key = idemKey(T_A.tenantId, ctx.runId, call.nodeId, call.effectSeq, call.generation ?? 0);
      if (unknownFirst && gateSeen === 1) return { action: "unknown", idemKey: key };
      return { action: "invoke", idemKey: key };
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
    return { result, executed: ops.executed, calls, gateCalls, contexts, steps: listed.steps };
  } finally {
    await pool.close();
  }
}

function summary(step: StepRecord): unknown[] {
  return [step.nodeId, step.attempt, step.seq, step.state];
}

test("C-01ad1003 a post-hook retry re-runs the node as attempt 2 with the new input", async () => {
  const scene = await runFlow(versionOf("f-ret"), { query: "q" });
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(
    scene.calls.map((entry) => [entry.call.args, entry.call.generation, entry.attempt]),
    [
      [{ query: "q", top_k: 1 }, undefined, 1],
      [{ query: "q", top_k: 2 }, 1, 2],
    ],
  );
  assert.equal("generation" in (scene.calls[0]?.call ?? {}), false);
  assert.deepEqual(scene.executed, [
    ...LEAD,
    "search",
    "search:post:enough_passages",
    "search:r2",
    "search:post:enough_passages:r2",
    "done",
    "run:finish",
  ]);
  assert.deepEqual(scene.steps.map(summary), [
    ["search", 1, 0, "completed"],
    ["search", 2, 1, "completed"],
    ["done", 1, 2, "completed"],
  ]);
  const last = scene.contexts[scene.contexts.length - 1];
  assert.equal(last?.attempt, 2);
  assert.equal(last?.feedback, "need 2 passages");
});

test("C-01ad1003 a retry beyond max_retries fails HOOK_RETRY_EXHAUSTED", async () => {
  const scene = await runFlow(versionOf("f-ret-exhausted"), { query: "q" });
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_RETRY_EXHAUSTED");
  assert.deepEqual(scene.result.error?.details, {
    hook: "search:post:enough_passages",
    attempts: "2",
  });
  assert.equal(scene.calls.length, 2);
  assert.deepEqual(scene.steps.map(summary), [
    ["search", 1, 0, "completed"],
    ["search", 2, 1, "failed"],
  ]);
});

test("C-01ad1003 an effect retry is keyed by generation and gets its own rows", async () => {
  const scene = await runFlow(versionOf("f-eff"), {});
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(
    scene.gateCalls.map((call) => call.generation),
    [undefined, 1],
  );
  assert.equal("generation" in (scene.gateCalls[0] ?? {}), false);
  assert.deepEqual(scene.executed, [
    ...LEAD,
    "send",
    "send#done",
    "send:post:fix_subject",
    "send:r2",
    "send#done:r2",
    "send:post:fix_subject:r2",
    "done",
    "run:finish",
  ]);
  assert.deepEqual(
    scene.steps.map((step) => [step.nodeId, step.attempt, step.seq, step.idemKey]),
    [
      ["send", 1, 0, KEY_G0],
      ["send", 2, 1, KEY_G1],
      ["done", 1, 2, null],
    ],
  );
});

test("C-01ad1003 an unknown effect fails the node at once with no retry", async () => {
  const retried = await runFlow(versionOf("f-eff"), {});
  assert.equal(retried.calls.length, 2, "the same flow retries when the gate says invoke");
  const scene = await runFlow(versionOf("f-eff"), {}, true);
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "INTERPRETER_EFFECT_UNKNOWN");
  assert.equal(scene.calls.length, 0);
  assert.deepEqual(scene.executed, [...LEAD, "send", "run:finish"]);
  assert.deepEqual(scene.steps.map(summary), [["send", 1, 0, "failed"]]);
});
