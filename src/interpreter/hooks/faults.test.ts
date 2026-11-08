import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createMemoryRunStore } from "../../runs/index.ts";
import type { RunRecord, RunStore, StepRecord, TenantContext } from "../../runs/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import type { SandboxResult, WorkerSandbox } from "../../sandbox/index.ts";
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
const CATALOGUE = loadTestCatalogue();
const LEAD = ["run:load", "run:start"];
const SECRET = "secret-" + "token";

type SandboxKind = "none" | "pool" | ((pool: WorkerSandbox) => WorkerSandbox);

interface Scene {
  result: RunRecord;
  executed: readonly string[];
  calls: ToolCall[];
  obs: HookTraceEntry[];
  steps: StepRecord[];
  hookCalls: number;
}

async function runFlow(
  version: LoadedVersion,
  sandboxKind: SandboxKind = "pool",
  input: JsonValue = INPUT,
): Promise<Scene> {
  const store: RunStore = createMemoryRunStore();
  const pool = createWorkerSandbox({ size: 1 });
  let hookCalls = 0;
  const counting = {
    ...pool,
    run: (...args: Parameters<WorkerSandbox["run"]>) => {
      if (args[3].binding === "ctx") hookCalls += 1;
      return pool.run(...args);
    },
  } as WorkerSandbox;
  const calls: ToolCall[] = [];
  const obs: HookTraceEntry[] = [];
  const invoker: ToolInvoker = {
    async invoke(call) {
      calls.push(call);
      if (call.tool === "erp.lookup_vendor@1") return { output: { vendor_id: "v1", status: "active" } };
      if (call.tool === "erp.create_payment@1") return { output: { payment_id: "pay-1", status: "paid" } };
      throw new Error(`unexpected tool ${call.tool}`);
    },
  };
  const gate: EffectGate = {
    async before() {
      return { action: "invoke", idemKey: "ik_pay_1" };
    },
    async after() {},
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
    ...(sandboxKind === "none"
      ? {}
      : { sandbox: sandboxKind === "pool" ? counting : sandboxKind(counting) }),
  };
  const deps = { ...base, hookObserver: (_node: string, entry: HookTraceEntry) => obs.push(entry) } as InterpreterDeps;
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
    return { result, executed: ops.executed, calls, obs, steps: listed.steps, hookCalls };
  } finally {
    await pool.close();
  }
}

function variant(of: string, name: string, from: string, to: string): LoadedVersion {
  const text = readHookRunText(of);
  assert.ok(text.includes(from), "the replacement text is in the fixture");
  return { ...hookRunVersion(of), flow: parseCatalogueFlow(text.replace(from, to), name) };
}

const CACHE_SOURCE = 'return { action: "skip", output: { vendor_id: "v-cached", status: "active" } };';

function skipReadWith(source: string, name: string): LoadedVersion {
  return variant("skip-read", name, CACHE_SOURCE, source);
}

function rejecting(sandbox: WorkerSandbox, result: () => Promise<SandboxResult>): WorkerSandbox {
  return { ...sandbox, run: () => result() } as WorkerSandbox;
}

const FAULT_CODES = [
  "timeout",
  "memory_limit",
  "stack_overflow",
  "output_too_large",
  "output_invalid",
  "input_invalid",
  "syntax_error",
  "runtime_error",
  "never_settled",
  "sandbox_crash",
] as const;

function noSecret(scene: Scene): void {
  const text = JSON.stringify([scene.result, scene.steps, scene.obs]);
  assert.equal(text.includes(SECRET), false, "no secret text anywhere");
}

test("C-8243f499 a code hook with no sandbox fails before the first step", async () => {
  const scene = await runFlow(hookRunVersion("skip-read"), "none");
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "INTERPRETER_NO_SANDBOX");
  assert.equal(scene.result.error?.node, "lookup");
  assert.deepEqual(scene.result.error?.details, { hook: "lookup:pre:cache_hit" });
  assert.deepEqual(scene.executed, [...LEAD, "run:finish"]);
  assert.deepEqual(scene.steps, []);
});

test("C-8243f499 a throwing hook fails HOOK_ERROR with runtime_error and leaks nothing", async () => {
  const scene = await runFlow(skipReadWith(`throw new Error("${SECRET}");`, "F1"));
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_ERROR");
  assert.deepEqual(scene.result.error?.details, { hook: "lookup:pre:cache_hit", fault: "runtime_error" });
  assert.equal(scene.steps[0]?.state, "failed");
  assert.equal(scene.calls.length, 0);
  noSecret(scene);
});

test("C-8243f499 an input that is not a storable payload fails HOOK_ACTION_INVALID", async () => {
  const scene = await runFlow(
    skipReadWith('return { action: "continue", input: { vendor_name: "a\\u0000b" } };', "F2"),
  );
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_ACTION_INVALID");
  assert.equal(scene.result.error?.details?.["keyword"], "payload");
  assert.equal(scene.steps[0]?.state, "failed");
  assert.equal(scene.calls.length, 0);
});

test("C-8243f499 a skip output outside the schema fails INTERPRETER_OUTPUT_INVALID", async () => {
  const scene = await runFlow(
    skipReadWith('return { action: "skip", output: { vendor_id: 5, status: "active" } };', "F3"),
  );
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "INTERPRETER_OUTPUT_INVALID");
  assert.deepEqual(scene.result.error?.details, {
    path: "/vendor_id",
    keyword: "type",
    hook: "lookup:pre:cache_hit",
  });
});

test("C-8243f499 a return outside the grammar fails the node", async () => {
  const scene = await runFlow(skipReadWith("return 5;", "F4"));
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_ERROR");
  assert.equal(scene.result.error?.details?.["fault"], "output_invalid");
  assert.equal(scene.steps[0]?.state, "failed");
});

test("C-8243f499 an unresolved input reference fails before any hook runs", async () => {
  const version = variant("skip-read", "F5", "${{ inputs.vendor }}", "${{ inputs.missing }}");
  const scene = await runFlow(version);
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "INTERPRETER_REF_UNRESOLVED");
  assert.equal(scene.hookCalls, 0);
});

test("C-8243f499 a mutated post output that is not a payload fails inside its own step", async () => {
  const version = variant(
    "redirect",
    "F6",
    "if (ctx.output.risk === 'high' && ctx.next.id === 'pay') return { action: 'redirect', to: 'review' };",
    "return { action: 'continue', output: { risk: 'a\\\\u0000b' } };",
  );
  const scene = await runFlow(version, "pool", { vendor: "Acme", amount: 2000, mode: "auto" });
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_ACTION_INVALID");
  assert.equal(scene.result.error?.details?.["keyword"], "payload");
  assert.equal(scene.executed[scene.executed.length - 2], "classify:post:to_review");
  assert.equal(scene.steps.find((step) => step.nodeId === "classify")?.state, "failed");
});

test("C-8243f499 a hook of a kind with no runner fails HOOK_UNSUPPORTED with no row", async () => {
  const version = variant("skip-read", "F7", "kind: code, source", "kind: mystery, source");
  const scene = await runFlow(version);
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_UNSUPPORTED");
  assert.deepEqual(scene.result.error?.details, { hook: "lookup:pre:cache_hit", kind: "mystery" });
  assert.deepEqual(scene.executed, [...LEAD, "run:finish"]);
  assert.deepEqual(scene.steps, []);
});

test("C-8243f499 a rejecting sandbox run fails the node sandbox_unavailable", async () => {
  const scene = await runFlow(
    hookRunVersion("skip-read"),
    (pool) =>
      rejecting(pool, async () => {
        throw new Error(`${SECRET} closed`);
      }),
  );
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "HOOK_ERROR");
  assert.deepEqual(scene.result.error?.details, {
    hook: "lookup:pre:cache_hit",
    fault: "sandbox_unavailable",
  });
  assert.equal(scene.executed[scene.executed.length - 2], "lookup");
  assert.equal(scene.steps[0]?.state, "failed");
  noSecret(scene);
});

for (const code of FAULT_CODES) {
  test(`C-8243f499 sandbox fault ${code} fails the node HOOK_ERROR`, async () => {
    const scene = await runFlow(hookRunVersion("skip-read"), (pool) =>
      rejecting(pool, async () => ({
        ok: false,
        fault: { code, message: `${SECRET} ${code}` },
        stats: { ms: 1, memBytes: 0 },
      })) as WorkerSandbox,
    );
    assert.equal(scene.result.state, "failed");
    assert.equal(scene.result.error?.code, "HOOK_ERROR");
    assert.deepEqual(scene.result.error?.details, { hook: "lookup:pre:cache_hit", fault: code });
    assert.equal(scene.result.error?.message, `hook "lookup:pre:cache_hit" failed (${code})`);
    assert.equal(scene.executed[scene.executed.length - 2], "lookup");
    assert.equal(scene.steps[0]?.state, "failed");
    noSecret(scene);
  });
}
