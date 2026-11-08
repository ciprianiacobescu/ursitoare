import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../../authoring/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createMemoryRunStore } from "../../runs/index.ts";
import type { RunRecord, RunStore, StepRecord, StepWrite, TenantContext } from "../../runs/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { parseCatalogueFlow } from "../../../test/support/catalogue/flows.ts";
import { hookRunVersion, readHookRunText } from "../../../test/support/hook-runs/index.ts";
import { executeRun, memoryWorkflowOps, NO_EFFECT_GATE, startRun } from "../index.ts";
import type { InterpreterDeps, LoadedVersion, ToolInvoker } from "../index.ts";

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const CATALOGUE = loadTestCatalogue();

interface Scene {
  result: RunRecord;
  writes: StepWrite[];
  rows: StepRecord[];
}

async function runFlow(version: LoadedVersion): Promise<Scene> {
  const inner: RunStore = createMemoryRunStore();
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
  const pool = createWorkerSandbox({ size: 1 });
  const invoker: ToolInvoker = {
    async invoke(call) {
      if (call.tool === "invoices.get@1") {
        return {
          output: {
            invoice_id: "inv-1",
            vendor_name: "V",
            raw_text: "<b>hi</b>",
            received_at: "2026-11-01T00:00:00Z",
          },
        };
      }
      throw new Error(`unexpected tool ${call.tool}`);
    },
  };
  const deps: InterpreterDeps = {
    store,
    durable: null,
    loadVersion: async () => version,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => invoker,
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    sandbox: pool,
  };
  try {
    await startRun(deps, T_A, {
      flowId: version.flowId,
      hash: version.hash,
      mode: "mock",
      input: { invoice: "inv-1" } as JsonValue,
      mocks: null,
      principal: ALICE,
      actorChain: [ALICE.userId],
      runId: "r_1",
    });
    const result = await executeRun(memoryWorkflowOps("r_1"), deps, T_A, "r_1");
    const listed = await inner.listSteps(T_A, "r_1", { limit: 100 });
    return { result, writes, rows: listed.steps };
  } finally {
    await pool.close();
  }
}

function taintOf(scene: Scene, nodeId: string): readonly string[] | undefined {
  return scene.rows.find((row) => row.nodeId === nodeId)?.taint;
}

test("C-30f1d456 hooks that read untrusted text taint the rows that follow", async () => {
  const scene = await runFlow(hookRunVersion("taint-hook"));
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(taintOf(scene, "fetch"), []);
  assert.deepEqual(taintOf(scene, "use_id"), ["untrusted"]);
  assert.deepEqual(taintOf(scene, "done"), ["untrusted"]);
  const started = scene.writes.find((write) => write.nodeId === "done" && write.state === "started");
  assert.deepEqual(started?.taint, []);
});

test("C-30f1d456 a post-hook without input cannot launder the labels of fetch", async () => {
  const base = hookRunVersion("taint-hook");
  const text = readHookRunText("taint-hook");
  const from = 'input: {note: "${{ nodes.fetch.output.raw_text }}"}, source: "return { action: \'continue\', output';
  assert.ok(text.includes(from), "the sanitise hook is in the fixture");
  const copy: LoadedVersion = {
    ...base,
    flow: parseCatalogueFlow(
      text.replace(from, 'source: "return { action: \'continue\', output'),
      "taint-hook-copy",
    ),
  };
  const scene = await runFlow(copy);
  assert.equal(scene.result.state, "completed");
  assert.deepEqual(taintOf(scene, "use_id"), ["untrusted"]);
  assert.deepEqual(taintOf(scene, "fetch"), []);
});
