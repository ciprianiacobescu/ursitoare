import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createMemoryRunStore, idemKey, payloadDigest } from "../../runs/index.ts";
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
import { PAY_ONCE_INPUT, payOnceVersion } from "../../../test/support/crash/pay-once.ts";
import { loadHookFlow } from "../../../test/support/hook-flows/index.ts";
import { hookRunVersion, readHookRunText } from "../../../test/support/hook-runs/index.ts";
import { executeRun, memoryWorkflowOps, startRun } from "../index.ts";
import type { EffectGate, InterpreterDeps, LoadedVersion, ToolInvoker } from "../index.ts";
import type { HookTraceEntry } from "./types.ts";

assert.equal(typeof executeRun, "function");

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const INPUT: JsonValue = { vendor: "  Acme ", amount: 120, currency: "eur" };
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };
const CATALOGUE = loadTestCatalogue();

const ORIG = { vendor_name: "  Acme " };
const TRIM = { vendor_name: "Acme" };
const D_ORIG = "364f588406d58da425488ae35b7aeb5ae04e6a5b18e212ff5c52472a33a8bd2b";
const D_TRIM = "1f19c0e68ba33e917a5cee0413aec2965a2fcecb63a8c97784998936bd6f67f6";
assert.equal(payloadDigest(ORIG), D_ORIG);
assert.equal(payloadDigest(TRIM), D_TRIM);

const K_PAY = idemKey("tenant_a", "r_1", "pay", 0, 0);
const SECRET = "secret-" + "token";

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

interface Observation {
  nodeId: string;
  entry: HookTraceEntry;
}

interface Scene {
  result: RunRecord;
  steps: StepRecord[];
  observed: Observation[];
  store: RunStore;
}

async function runFlow(version: LoadedVersion, input: JsonValue): Promise<Scene> {
  const store: RunStore = createMemoryRunStore();
  const pool = createWorkerSandbox({ size: 1 });
  const observed: Observation[] = [];
  let searches = 0;
  const invoker: ToolInvoker = {
    async invoke(call) {
      if (call.tool === "erp.lookup_vendor@1") return { output: LOOKUP_OK };
      if (call.tool === "erp.create_payment@1") return { output: PAID };
      if (call.tool === "kb.search@1") {
        searches += 1;
        const passages = [{ text: "t0", source: "s0" }];
        if (searches > 1) passages.push({ text: "t1", source: "s1" });
        return { output: { passages } };
      }
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
    const result = await executeRun(memoryWorkflowOps("r_1"), deps, T_A, "r_1");
    const listed = await store.listSteps(T_A, "r_1", { limit: 100 });
    return { result, steps: listed.steps, observed, store };
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

function labelsOf(scene: Scene, nodeId: string, attempt: number): string[] {
  return scene.observed
    .filter((seen) => seen.nodeId === nodeId && seen.entry.attempt === attempt)
    .map((seen) => seen.entry.label);
}

function assertRowLabels(scene: Scene): void {
  for (const step of scene.steps) {
    assert.deepEqual(
      (step.hooks?.entries ?? []).map((entry) => entry.label),
      labelsOf(scene, step.nodeId, step.attempt),
      `entries of ${step.nodeId} attempt ${step.attempt}`,
    );
  }
}

test("C-1335c3ed onion rows carry two and six hook entries", async () => {
  const scene = await runFlow(hookRunVersion("onion"), INPUT);
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(
    scene.steps.map((step) => [step.nodeId, step.seq]),
    [
      ["lookup", 0],
      ["normalize", 1],
      ["pay", 2],
      ["done", 3],
    ],
  );
  assert.deepEqual(row(scene, "lookup").hooks, {
    inputOriginalRef: null,
    entries: [E("pre:rule.rule_b"), E("post:rule.rule_b")],
  });
  assert.equal("hooks" in row(scene, "normalize"), false);
  assert.deepEqual(row(scene, "pay").hooks, {
    inputOriginalRef: null,
    entries: PAY_LABELS.map((label) => E(label)),
  });
  assert.equal(row(scene, "pay").idemKey, K_PAY);
  assert.equal("hooks" in row(scene, "done"), false);
  assertRowLabels(scene);
});

test("C-1335c3ed mutate rows carry the original input and the output mutation", async () => {
  const scene = await runFlow(hookRunVersion("mutate"), INPUT);
  assert.equal(scene.result.state, "completed");
  const lookup = row(scene, "lookup");
  assert.deepEqual(lookup.hooks, {
    inputOriginalRef: D_ORIG,
    entries: [E("pre:trim_name", { mutated: "input" })],
  });
  assert.equal(lookup.inputRef, D_TRIM);
  const original = await scene.store.getPayload(T_A, D_ORIG);
  assert.ok(original !== null, "the untrimmed input payload is kept");
  assert.deepEqual(original.data, ORIG);
  assert.deepEqual(row(scene, "normalize").hooks, {
    inputOriginalRef: null,
    entries: [E("post:upper_currency", { mutated: "output" })],
  });
  assert.equal("hooks" in row(scene, "pay"), false);
  assert.equal("hooks" in row(scene, "done"), false);
  assertRowLabels(scene);
});

test("C-1335c3ed f-ret rows carry one retry entry of each attempt", async () => {
  const version: LoadedVersion = {
    ...hookRunVersion("onion"),
    flowId: "f-ret",
    flow: loadHookFlow("f-ret"),
  };
  const scene = await runFlow(version, { query: "q" });
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(
    scene.steps.map((step) => [step.nodeId, step.attempt, step.seq]),
    [
      ["search", 1, 0],
      ["search", 2, 1],
      ["done", 1, 2],
    ],
  );
  assert.deepEqual(row(scene, "search").hooks, {
    inputOriginalRef: null,
    entries: [E("post:enough_passages", { fused: false, action: "retry" })],
  });
  const second = scene.steps.find((step) => step.nodeId === "search" && step.attempt === 2);
  assert.ok(second !== undefined, "the second search attempt has a row");
  assert.deepEqual(second.hooks, {
    inputOriginalRef: null,
    entries: [E("post:enough_passages", { fused: false, attempt: 2 })],
  });
  assert.equal("hooks" in row(scene, "done"), false);
  assertRowLabels(scene);
});

test("C-1335c3ed bad-upper keeps the entry of the refused output hook", async () => {
  const version = variant(
    "mutate",
    "bad-upper",
    "output: { amount: ctx.output.amount, currency: ctx.output.currency.toUpperCase() }",
    'output: { amount: "x", currency: "EUR" }',
  );
  const scene = await runFlow(version, INPUT);
  assert.equal(scene.result.state, "failed");
  assert.equal(scene.result.error?.code, "INTERPRETER_OUTPUT_INVALID");
  assert.deepEqual(row(scene, "lookup").hooks, {
    inputOriginalRef: D_ORIG,
    entries: [E("pre:trim_name", { mutated: "input" })],
  });
  const normalize = row(scene, "normalize");
  assert.equal(normalize.state, "failed");
  assert.deepEqual(normalize.hooks, {
    inputOriginalRef: null,
    entries: [E("post:upper_currency", { mutated: "output" })],
  });
  assert.equal(scene.steps.some((step) => step.nodeId === "pay"), false);
  assertRowLabels(scene);
});

test("C-1335c3ed F1 and pay-once rows have no hooks while onion rows do", async () => {
  const cacheSource = 'return { action: "skip", output: { vendor_id: "v-cached", status: "active" } };';
  const failing = variant(
    "skip-read",
    "F1",
    cacheSource,
    `throw new Error("${SECRET}");`,
  );
  const scene = await runFlow(failing, INPUT);
  assert.equal(scene.result.state, "failed");
  const lookup = row(scene, "lookup");
  assert.equal(lookup.state, "failed");
  assert.equal("hooks" in lookup, false);
  assertRowLabels(scene);

  const plain = await runFlow(payOnceVersion(), PAY_ONCE_INPUT);
  assert.equal(plain.result.state, "completed");
  assert.deepEqual(
    plain.steps.map((step) => step.nodeId),
    ["lookup", "route", "pay", "done"],
  );
  for (const step of plain.steps) {
    assert.equal("hooks" in step, false, `pay-once ${step.nodeId} has no hooks`);
  }

  const traced = await runFlow(hookRunVersion("onion"), INPUT);
  assert.deepEqual(
    row(traced, "lookup").hooks?.entries.map((entry) => entry.label),
    ["pre:rule.rule_b", "post:rule.rule_b"],
  );
});
