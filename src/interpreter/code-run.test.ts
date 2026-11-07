import assert from "node:assert/strict";
import { test } from "node:test";

import { validateFlowText } from "../authoring/index.ts";
import type { JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore, payloadDigest } from "../runs/index.ts";
import type { RunRecord, RunStore, TenantContext } from "../runs/index.ts";
import { createWorkerSandbox } from "../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "../sandbox/index.ts";
import { executeRun, memoryWorkflowOps, NO_EFFECT_GATE, startRun } from "./index.ts";
import type { InterpreterDeps, ToolInvoker, WorkflowOps } from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { CODE_PAY_TEXT, codePayVersion } from "../../test/support/code-pay.ts";

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const NOW = "2026-11-02T10:00:00Z";
const PAY_INPUT: JsonValue = {
  vendor: "Acme",
  invoice: "inv-1",
  amount: 1234.567,
  currency: "eur",
};
const LOOKUP_OK: JsonValue = { vendor_id: "v1", status: "active" };
const PAID: JsonValue = { payment_id: "pay-1", status: "paid" };
const NORMALIZED: JsonValue = { amount: 1234.57, currency: "EUR", is_large: true };
const PAY_ARGS: JsonValue = {
  vendor_id: "v1",
  amount: 1234.57,
  currency: "EUR",
  reference: "inv-1",
};

interface InvokerCall {
  tool: string;
  args: JsonValue;
}

function recordingInvoker(calls: InvokerCall[]): ToolInvoker {
  return {
    async invoke(call) {
      calls.push({ tool: call.tool, args: call.args });
      if (call.tool === "erp.lookup_vendor@1") {
        return { output: LOOKUP_OK };
      }
      if (call.tool === "erp.create_payment@1") {
        return { output: PAID };
      }
      throw new Error(`unexpected tool ${call.tool}`);
    },
  };
}

interface SandboxCall {
  code: string;
  input: SandboxJson;
  limits: SandboxLimits;
  options: SandboxOptions;
}

interface CountingSandbox extends WorkerSandbox {
  readonly calls: SandboxCall[];
}

function counting(pool: WorkerSandbox): CountingSandbox {
  const calls: SandboxCall[] = [];
  return {
    get size(): number {
      return pool.size;
    },
    get respawns(): number {
      return pool.respawns;
    },
    calls,
    async run(
      code: string,
      input: SandboxJson,
      limits: SandboxLimits,
      options: SandboxOptions,
    ): Promise<SandboxResult> {
      calls.push({ code, input, limits, options });
      return pool.run(code, input, limits, options);
    },
    async close(): Promise<void> {
      return pool.close();
    },
  };
}

interface RecordingOps {
  ops: WorkflowOps;
  steps: string[];
  values: JsonValue[];
}

function recordingOps(inner: WorkflowOps): RecordingOps {
  const steps: string[] = [];
  const values: JsonValue[] = [];
  return {
    steps,
    values,
    ops: {
      get workflowId(): string {
        return inner.workflowId;
      },
      async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
        steps.push(name);
        const value = await inner.runStep<T>(name, fn);
        values.push(value);
        return value;
      },
      sleep(ms: number): Promise<void> {
        return inner.sleep(ms);
      },
    },
  };
}

function makeDeps(
  store: RunStore,
  sandbox: WorkerSandbox | undefined,
  invoker: ToolInvoker,
): InterpreterDeps {
  return {
    store,
    durable: null,
    loadVersion: async (_ctx, flowId) => (flowId === "code-pay" ? codePayVersion() : null),
    catalogueFor: async () => loadTestCatalogue(),
    invokerFor: async () => invoker,
    effects: NO_EFFECT_GATE,
    clock: fixedClock(NOW),
    ids: sequentialIds(0),
    ...(sandbox === undefined ? {} : { sandbox }),
  };
}

function startRequest(runId: string) {
  return {
    flowId: "code-pay",
    hash: codePayVersion().hash,
    mode: "mock" as const,
    input: PAY_INPUT,
    mocks: null,
    principal: ALICE,
    actorChain: [ALICE.userId],
    runId,
  };
}

async function outputOf(store: RunStore, run: RunRecord): Promise<JsonValue | null> {
  if (run.outputRef === null) {
    return null;
  }
  const payload = await store.getPayload(T_A, run.outputRef);
  return payload === null ? null : (payload.data as JsonValue);
}

test("C-66c38d56 code-pay runs its code node, replays it and needs a sandbox", async () => {
  const validation = validateFlowText(CODE_PAY_TEXT, "yaml", loadTestCatalogue());
  assert.deepEqual(validation, {
    ok: true,
    errors: [],
    warnings: [],
    layers_run: ["L1", "L2", "L3"],
  });

  const version = codePayVersion();
  assert.equal(version.flowId, "code-pay");
  const store = createMemoryRunStore();
  const pool = counting(createWorkerSandbox({ size: 1 }));
  try {
    const firstCalls: InvokerCall[] = [];
    const deps = makeDeps(store, pool, recordingInvoker(firstCalls));

    const started = await startRun(deps, T_A, startRequest("r_cp"));
    assert.equal(started.state, "queued");

    const recorder = recordingOps(memoryWorkflowOps("r_cp"));
    const run = await executeRun(recorder.ops, deps, T_A, "r_cp");
    assert.equal(run.state, "completed");
    assert.equal(run.terminalNode, "done");
    assert.deepEqual(await outputOf(store, run), { payment_id: "pay-1" });

    assert.deepEqual(recorder.steps, [
      "run:load",
      "run:start",
      "lookup",
      "normalize",
      "pay",
      "pay#done",
      "done",
      "run:finish",
    ]);

    const listed = await store.listSteps(T_A, "r_cp", { limit: 50 });
    assert.deepEqual(listed.steps.map((step) => step.seq), [0, 1, 2, 3]);
    assert.deepEqual(listed.steps.map((step) => step.nodeId), [
      "lookup",
      "normalize",
      "pay",
      "done",
    ]);
    assert.deepEqual(listed.steps.map((step) => step.kind), [
      "block",
      "code",
      "block",
      "end",
    ]);

    const normalize = listed.steps[1];
    assert.ok(normalize !== undefined, "normalize is recorded");
    assert.equal(normalize.state, "completed");
    assert.equal(
      normalize.inputRef,
      payloadDigest({ amount: 1234.567, currency: "eur" }),
    );
    assert.equal(normalize.outputRef, payloadDigest(NORMALIZED));
    assert.equal(normalize.outcome, null);
    assert.deepEqual(normalize.taint, []);
    assert.equal(normalize.attempt, 1);
    assert.equal(normalize.generation, 0);
    assert.equal(normalize.idemKey, null);

    assert.deepEqual(firstCalls, [
      { tool: "erp.lookup_vendor@1", args: { vendor_name: "Acme" } },
      { tool: "erp.create_payment@1", args: PAY_ARGS },
    ]);
    assert.equal(pool.calls.length, 1);
    assert.deepEqual(pool.calls[0]?.input, { amount: 1234.567, currency: "eur" });

    const beforeReplay = await store.listSteps(T_A, "r_cp", { limit: 50 });
    const replayed = await executeRun(memoryWorkflowOps("r_cp", recorder.values), deps, T_A, "r_cp");
    assert.deepEqual(replayed, run);
    assert.deepEqual(await store.listSteps(T_A, "r_cp", { limit: 50 }), beforeReplay);
    assert.equal(pool.calls.length, 1);

    const secondCalls: InvokerCall[] = [];
    const noSandbox = makeDeps(store, undefined, recordingInvoker(secondCalls));
    await startRun(noSandbox, T_A, startRequest("r_cp2"));
    const failed = await executeRun(memoryWorkflowOps("r_cp2"), noSandbox, T_A, "r_cp2");
    assert.equal(failed.state, "failed");
    assert.deepEqual(failed.error, {
      code: "INTERPRETER_NO_SANDBOX",
      message: 'no sandbox is available for code node "normalize"',
      node: "normalize",
    });
    assert.equal(failed.terminalNode, "normalize");

    const failedSteps = (await store.listSteps(T_A, "r_cp2", { limit: 50 })).steps;
    assert.deepEqual(failedSteps.map((step) => step.nodeId), ["lookup", "normalize"]);
    assert.equal(failedSteps[0]?.state, "completed");
    assert.equal(failedSteps[1]?.state, "failed");
    assert.deepEqual(failedSteps[1]?.error, failed.error);
    assert.deepEqual(secondCalls, [
      { tool: "erp.lookup_vendor@1", args: { vendor_name: "Acme" } },
    ]);
    assert.equal(pool.calls.length, 1);
  } finally {
    await pool.close();
  }
});
