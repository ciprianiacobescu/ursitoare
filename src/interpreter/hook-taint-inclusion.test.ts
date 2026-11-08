import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, JsonValue, Taint, TaintAnalysis } from "../authoring/index.ts";
import { analyzeTaint, normalizeTaint, taintIncludes } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore } from "../runs/index.ts";
import type { RunRecord, StepRecord, StepState, TenantContext } from "../runs/index.ts";
import { createWorkerSandbox } from "../sandbox/index.ts";
import type { WorkerSandbox } from "../sandbox/index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import {
  HOOK_RUN_HASH,
  hookRunNames,
  hookRunVersion,
} from "../../test/support/hook-runs/index.ts";
import { executeRun, memoryWorkflowOps, NO_EFFECT_GATE, startRun } from "./index.ts";
import type { InterpreterDeps, LoadedVersion, ToolInvoker } from "./index.ts";

assert.equal(typeof analyzeTaint, "function");
assert.equal(typeof taintIncludes, "function");
assert.equal(typeof executeRun, "function");

const T: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const CATALOGUE = loadTestCatalogue();

const N: Taint = [];
const U: Taint = ["untrusted"];

const INPUT: JsonValue = { vendor: "  Acme ", amount: 120, currency: "eur" };
const REDIRECT_INPUT: JsonValue = { vendor: "Acme", amount: 2000, mode: "auto" };
const UNDECLARED_INPUT: JsonValue = { vendor: "Acme", amount: 20, mode: "auto" };
const TAINT_INPUT: JsonValue = { invoice: "inv-1" };

const ANSWERS: Readonly<Record<string, JsonValue>> = {
  "erp.lookup_vendor@1": { vendor_id: "v1", status: "active" },
  "erp.create_payment@1": { payment_id: "pay-1", status: "paid" },
  "invoices.get@1": { invoice_id: "inv-1", raw_text: "<b>hi</b>" },
};

const BARE = "taint-hook-bare";

interface ExpectedRow {
  node: string;
  state: StepState;
  taint: Taint;
  staticInput: Taint;
}

interface ExpectedRun {
  name: string;
  input: JsonValue;
  state: string;
  code: string | null;
  rows: ExpectedRow[];
}

function row(node: string, state: StepState, taint: Taint, staticInput: Taint = N): ExpectedRow {
  return { node, state, taint, staticInput };
}

const SIMPLE: ExpectedRow[] = [
  row("lookup", "completed", N),
  row("normalize", "completed", N),
  row("pay", "completed", N),
  row("done", "completed", N),
];

const RUNS: readonly ExpectedRun[] = [
  { name: "end-pre", input: INPUT, state: "completed", code: null, rows: SIMPLE },
  { name: "fail", input: INPUT, state: "completed", code: null, rows: SIMPLE },
  { name: "mutate", input: INPUT, state: "completed", code: null, rows: SIMPLE },
  { name: "onion", input: INPUT, state: "completed", code: null, rows: SIMPLE },
  {
    name: "redirect",
    input: REDIRECT_INPUT,
    state: "completed",
    code: null,
    rows: [
      row("gate", "completed", N),
      row("classify", "completed", N),
      row("review", "completed", N),
      row("done", "completed", N),
    ],
  },
  {
    name: "skip-pay",
    input: INPUT,
    state: "failed",
    code: "HOOK_ACTION_FORBIDDEN",
    rows: [
      row("lookup", "completed", N),
      row("normalize", "completed", N),
      row("pay", "failed", N),
    ],
  },
  {
    name: "skip-read",
    input: INPUT,
    state: "completed",
    code: null,
    rows: [
      row("lookup", "skipped", N),
      row("normalize", "completed", N),
      row("pay", "completed", N),
      row("done", "completed", N),
    ],
  },
  {
    name: "taint-hook",
    input: TAINT_INPUT,
    state: "completed",
    code: null,
    rows: [row("fetch", "completed", N, U), row("use_id", "completed", U, U), row("done", "completed", U, U)],
  },
  {
    name: BARE,
    input: TAINT_INPUT,
    state: "completed",
    code: null,
    rows: [row("fetch", "completed", N, N), row("use_id", "completed", U, U), row("done", "completed", U, U)],
  },
  {
    name: "undeclared",
    input: UNDECLARED_INPUT,
    state: "failed",
    code: "HOOK_ROUTE_UNDECLARED",
    rows: [row("gate", "completed", N), row("classify", "failed", N)],
  },
];

function bareVersion(): LoadedVersion {
  const base = hookRunVersion("taint-hook");
  const flow = structuredClone(base.flow) as Flow;
  flow.flow = BARE;
  const fetch = flow.nodes["fetch"];
  assert.ok(fetch !== undefined && fetch.kind === "block", "fetch is a block");
  const hooks = (fetch as unknown as { post?: unknown }).post;
  assert.ok(Array.isArray(hooks) && hooks.length > 0, "fetch has a post hook");
  const hook = hooks[0] as Record<string, unknown>;
  delete hook.input;
  return { ...base, flowId: BARE, flow };
}

const VERSIONS = new Map<string, LoadedVersion>();
for (const name of hookRunNames()) VERSIONS.set(name, hookRunVersion(name));
const BARE_VERSION = bareVersion();
VERSIONS.set(BARE, BARE_VERSION);

interface Scene {
  result: RunRecord;
  rows: StepRecord[];
}

async function runFlow(version: LoadedVersion, input: JsonValue, pool: WorkerSandbox): Promise<Scene> {
  const store = createMemoryRunStore();
  const invoker: ToolInvoker = {
    async invoke(call) {
      if (!Object.hasOwn(ANSWERS, call.tool)) throw new Error(`unexpected tool ${call.tool}`);
      return { output: structuredClone(ANSWERS[call.tool] as JsonValue) };
    },
  };
  const deps: InterpreterDeps = {
    store,
    durable: null,
    loadVersion: async (_ctx, flowId, hash) =>
      flowId === version.flowId && hash === HOOK_RUN_HASH ? version : null,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => invoker,
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    sandbox: pool,
  };
  await startRun(deps, T, {
    flowId: version.flowId,
    hash: HOOK_RUN_HASH,
    mode: "mock",
    input,
    mocks: null,
    principal: ALICE,
    actorChain: [ALICE.userId],
    runId: "r_1",
  });
  const result = await executeRun(memoryWorkflowOps("r_1"), deps, T, "r_1");
  const listed = await store.listSteps(T, "r_1", { limit: 100 });
  return { result, rows: listed.steps };
}

interface RunResult {
  expected: ExpectedRun;
  scene: Scene;
  analysis: TaintAnalysis;
}

test("C-8f0d2253 Hooked runs stay inside the static input", async () => {
  assert.deepEqual([...hookRunNames()].sort(), [
    "end-pre",
    "fail",
    "mutate",
    "onion",
    "redirect",
    "skip-pay",
    "skip-read",
    "taint-hook",
    "undeclared",
  ]);

  const pool = createWorkerSandbox({ size: 1 });
  const violations: string[] = [];
  const results: RunResult[] = [];
  try {
    for (const expected of RUNS) {
      const version = VERSIONS.get(expected.name);
      assert.ok(version !== undefined, `version ${expected.name} exists`);
      const scene = await runFlow(version, expected.input, pool);

      assert.equal(scene.result.state, expected.state, expected.name);
      if (expected.code === null) {
        assert.equal(scene.result.error, null, expected.name);
      } else {
        assert.equal(scene.result.error?.code, expected.code, expected.name);
      }
      assert.deepEqual(
        scene.rows.map((step) => [step.nodeId, step.state, step.taint]),
        expected.rows.map((want) => [want.node, want.state, want.taint]),
        expected.name,
      );

      const analysis = analyzeTaint(version.flow, CATALOGUE);
      for (const step of scene.rows) {
        const node = analysis.nodes[step.nodeId];
        assert.ok(node !== undefined, `${expected.name} ${step.nodeId} is analysed`);
        const runtime = normalizeTaint(step.taint);
        if (!taintIncludes(node.input, runtime)) {
          const show = (labels: Taint): string => `[${labels.join(", ")}]`;
          violations.push(
            `${expected.name} ${step.nodeId}: static ${show(node.input)} runtime ${show(runtime)}`,
          );
        }
      }
      results.push({ expected, scene, analysis });
    }
  } finally {
    await pool.close();
  }

  assert.deepEqual(violations, [], violations.join("\n"));

  for (const { expected, analysis } of results) {
    for (const want of expected.rows) {
      const node = analysis.nodes[want.node];
      assert.ok(node !== undefined, `${expected.name} ${want.node} is analysed`);
      assert.deepEqual(node.input, want.staticInput, `${expected.name} ${want.node} static input`);
    }
  }
});
