import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, JsonValue, Taint, ValidationResult } from "../authoring/index.ts";
import {
  analyzeTaint,
  normalizeTaint,
  taintIncludes,
  validateFlowText,
} from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore } from "../runs/index.ts";
import type { RunStore, StepRecord, StepWrite, TenantContext } from "../runs/index.ts";
import { createWorkerSandbox } from "../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "../sandbox/index.ts";
import { executeRun, memoryWorkflowOps, NO_EFFECT_GATE, startRun } from "./index.ts";
import type { InterpreterDeps, LoadedVersion, MemoryWorkflowOps, ToolInvoker } from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import {
  TAINT_RUN_HASH,
  readTaintRunText,
  taintRunVersion,
} from "../../test/support/taint-runs/index.ts";

const T: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const U: Taint = ["untrusted"];
const INPUT_UNTRUSTED: JsonValue = { invoice_id: "i1" };
const INPUT_TRUSTED: JsonValue = { vendor: "Acme" };
const LOOKUP_ANSWER: JsonValue = {
  vendor_id: "v1",
  status: "active",
  payment_terms_days: 30,
};

function fetchAnswer(rawText: string): JsonValue {
  return {
    invoice_id: "i1",
    vendor_name: "V",
    raw_text: rawText,
    received_at: "2026-11-01T00:00:00Z",
  };
}

interface RecordedWrite {
  ctx: TenantContext;
  step: StepWrite;
}

interface RecordingStore extends RunStore {
  readonly writes: RecordedWrite[];
}

function recordingStore(): RecordingStore {
  const inner = createMemoryRunStore();
  const writes: RecordedWrite[] = [];
  return {
    writes,
    createRun(ctx, run, at) {
      return inner.createRun(ctx, run, at);
    },
    getRun(ctx, runId) {
      return inner.getRun(ctx, runId);
    },
    transition(ctx, runId, change) {
      return inner.transition(ctx, runId, change);
    },
    async recordStep(ctx, step) {
      writes.push({ ctx, step });
      return inner.recordStep(ctx, step);
    },
    listSteps(ctx, runId, q) {
      return inner.listSteps(ctx, runId, q);
    },
    getPayload(ctx, sha256) {
      return inner.getPayload(ctx, sha256);
    },
  };
}

interface TaggedOps extends MemoryWorkflowOps {
  readonly values: readonly JsonValue[];
}

function taggedOps(workflowId: string, recorded: readonly JsonValue[] = []): TaggedOps {
  const base = memoryWorkflowOps(workflowId, recorded);
  const values: JsonValue[] = [];
  return {
    get workflowId(): string {
      return base.workflowId;
    },
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      const value = await base.runStep(name, fn);
      values.push(value);
      return value;
    },
    async sleep(ms: number): Promise<void> {
      await base.sleep(ms);
    },
    get executed(): readonly string[] {
      return base.executed;
    },
    get slept(): readonly number[] {
      return base.slept;
    },
    get values(): readonly JsonValue[] {
      return values;
    },
  };
}

function invokerAnswering(answers: Readonly<Record<string, JsonValue>>): ToolInvoker {
  return {
    async invoke(call) {
      if (!Object.hasOwn(answers, call.nodeId)) {
        throw new Error(`unexpected node ${call.nodeId}`);
      }
      return { output: structuredClone(answers[call.nodeId] as JsonValue) };
    },
  };
}

function makeDeps(
  store: RunStore,
  version: LoadedVersion,
  invoker: ToolInvoker,
  sandbox?: WorkerSandbox,
): InterpreterDeps {
  return {
    store,
    durable: null,
    loadVersion: async (_ctx, flowId, hash) =>
      flowId === version.flowId && hash === version.hash ? version : null,
    catalogueFor: async () => loadTestCatalogue(),
    invokerFor: async () => invoker,
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    ...(sandbox === undefined ? {} : { sandbox }),
  };
}

function startRequest(flowId: string, input: JsonValue) {
  return {
    flowId,
    hash: TAINT_RUN_HASH,
    mode: "mock" as const,
    input,
    mocks: null,
    principal: ALICE,
    actorChain: [ALICE.userId],
    runId: "r_1",
  };
}

function triples(writes: readonly RecordedWrite[]): (readonly [string, string, readonly string[]])[] {
  return writes.map((write) => [write.step.nodeId, write.step.state, write.step.taint]);
}

async function rowsOf(store: RunStore): Promise<StepRecord[]> {
  const listed = await store.listSteps(T, "r_1", { limit: 100 });
  return listed.steps;
}

interface SandboxLog {
  readonly calls: (readonly [string, SandboxJson, SandboxLimits, SandboxOptions])[];
}

function loggingSandbox(pool: WorkerSandbox): WorkerSandbox & SandboxLog {
  const calls: (readonly [string, SandboxJson, SandboxLimits, SandboxOptions])[] = [];
  return {
    calls,
    get size(): number {
      return pool.size;
    },
    get respawns(): number {
      return pool.respawns;
    },
    async run(
      code: string,
      input: SandboxJson,
      limits: SandboxLimits,
      options: SandboxOptions,
    ): Promise<SandboxResult> {
      calls.push([code, input, limits, options]);
      return pool.run(code, input, limits, options);
    },
    async close(): Promise<void> {
      return pool.close();
    },
  };
}

function failedCountVersion(): LoadedVersion {
  const base = taintRunVersion("untrusted-code");
  const flow: Flow = structuredClone(base.flow);
  const count = flow.nodes["count"];
  assert.ok(count !== undefined && count.kind === "code", "count is a code node");
  count.output_schema = {
    type: "object",
    properties: { size: { type: "string", enum: ["small"] } },
    required: ["size"],
  };
  return { ...base, flow };
}

test("C-bb09f0c8 rows of untrusted-code and trusted-code carry the effective input taint", async () => {
  const catalogue = loadTestCatalogue();
  for (const name of ["untrusted-code", "trusted-code"] as const) {
    const validation: ValidationResult = validateFlowText(
      readTaintRunText(name),
      "yaml",
      catalogue,
    );
    assert.equal(validation.ok, true, name);
    assert.deepEqual(validation.errors, [], name);
    assert.deepEqual(validation.warnings, [], name);
    assert.deepEqual(validation.layers_run, ["L1", "L2", "L3"], name);
  }

  const pool = createWorkerSandbox({ size: 1 });
  try {
    const untrustedVersion = taintRunVersion("untrusted-code");
    const trustedVersion = taintRunVersion("trusted-code");

    const shortStore = recordingStore();
    const shortDeps = makeDeps(
      shortStore,
      untrustedVersion,
      invokerAnswering({ fetch: fetchAnswer("short") }),
      pool,
    );
    await startRun(shortDeps, T, startRequest("untrusted-code", INPUT_UNTRUSTED));
    const shortRun = await executeRun(taggedOps("r_1"), shortDeps, T, "r_1");
    assert.equal(shortRun.state, "completed");
    assert.deepEqual(triples(shortStore.writes), [
      ["fetch", "started", []],
      ["fetch", "completed", []],
      ["count", "started", U],
      ["count", "completed", U],
      ["route", "started", U],
      ["route", "completed", U],
      ["done", "started", []],
      ["done", "completed", []],
    ]);

    const longStore = recordingStore();
    const longDeps = makeDeps(
      longStore,
      untrustedVersion,
      invokerAnswering({ fetch: fetchAnswer("a much longer invoice text body") }),
      pool,
    );
    await startRun(longDeps, T, startRequest("untrusted-code", INPUT_UNTRUSTED));
    const longRun = await executeRun(taggedOps("r_1"), longDeps, T, "r_1");
    assert.equal(longRun.state, "completed");
    assert.deepEqual(triples(longStore.writes), [
      ["fetch", "started", []],
      ["fetch", "completed", []],
      ["count", "started", U],
      ["count", "completed", U],
      ["route", "started", U],
      ["route", "completed", U],
      ["done_big", "started", []],
      ["done_big", "completed", []],
    ]);

    const trustedStore = recordingStore();
    const trustedDeps = makeDeps(
      trustedStore,
      trustedVersion,
      invokerAnswering({ lookup: LOOKUP_ANSWER }),
      pool,
    );
    await startRun(trustedDeps, T, startRequest("trusted-code", INPUT_TRUSTED));
    const trustedRun = await executeRun(taggedOps("r_1"), trustedDeps, T, "r_1");
    assert.equal(trustedRun.state, "completed");
    assert.deepEqual(
      (await rowsOf(trustedStore)).map((row) => [row.nodeId, row.taint]),
      [
        ["lookup", []],
        ["shape", []],
        ["done", []],
      ],
    );

    for (const store of [shortStore, longStore, trustedStore]) {
      for (const write of store.writes) {
        assert.deepEqual(write.ctx, T, "the recorded tenant is the run tenant");
      }
    }

    const runs: readonly (readonly [string, RecordingStore])[] = [
      ["untrusted-code", shortStore],
      ["untrusted-code", longStore],
      ["trusted-code", trustedStore],
    ];
    for (const [name, store] of runs) {
      const analysis = analyzeTaint(taintRunVersion(name).flow, catalogue);
      for (const row of await rowsOf(store)) {
        const node = analysis.nodes[row.nodeId];
        assert.ok(node !== undefined, `${name} ${row.nodeId} is analysed`);
        assert.equal(
          taintIncludes(node.input, normalizeTaint(row.taint)),
          true,
          `${name} ${row.nodeId} static input includes the row taint`,
        );
      }
    }
  } finally {
    await pool.close();
  }
});

test("C-2b621663 a failed node keeps its input taint", async () => {
  const version = failedCountVersion();
  const pool = createWorkerSandbox({ size: 1 });
  try {
    const store = recordingStore();
    const deps = makeDeps(
      store,
      version,
      invokerAnswering({ fetch: fetchAnswer("a much longer invoice text body") }),
      pool,
    );
    await startRun(deps, T, startRequest("untrusted-code", INPUT_UNTRUSTED));
    const run = await executeRun(taggedOps("r_1"), deps, T, "r_1");

    assert.equal(run.state, "failed");
    assert.equal(run.error?.code, "INTERPRETER_OUTPUT_INVALID");
    assert.equal(run.error?.node, "count");
    assert.deepEqual(triples(store.writes), [
      ["fetch", "started", []],
      ["fetch", "completed", []],
      ["count", "started", U],
      ["count", "failed", U],
    ]);
    assert.deepEqual(
      (await rowsOf(store)).map((row) => [row.nodeId, row.state, row.taint]),
      [
        ["fetch", "completed", []],
        ["count", "failed", U],
      ],
    );
    assert.equal(
      (await rowsOf(store)).some((row) => row.nodeId === "route"),
      false,
      "no row for route",
    );
  } finally {
    await pool.close();
  }
});

test("C-5cd5bf46 a replay recomputes the taint of recorded nodes", async () => {
  const pool = createWorkerSandbox({ size: 1 });
  try {
    const untrustedVersion = taintRunVersion("untrusted-code");
    const fullUntrustedStore = recordingStore();
    const fullUntrustedDeps = makeDeps(
      fullUntrustedStore,
      untrustedVersion,
      invokerAnswering({ fetch: fetchAnswer("short") }),
      pool,
    );
    await startRun(fullUntrustedDeps, T, startRequest("untrusted-code", INPUT_UNTRUSTED));
    const fullUntrustedOps = taggedOps("r_1");
    const fullUntrusted = await executeRun(fullUntrustedOps, fullUntrustedDeps, T, "r_1");
    assert.equal(fullUntrusted.state, "completed");
    const untrustedRecorded = [...fullUntrustedOps.values];
    assert.equal(untrustedRecorded.length, 7, "the untrusted run records seven step values");
    const fullUntrustedRows = await rowsOf(fullUntrustedStore);

    const untrustedStore = recordingStore();
    const untrustedSandbox = loggingSandbox(pool);
    const untrustedReplayDeps = makeDeps(
      untrustedStore,
      taintRunVersion("untrusted-code"),
      invokerAnswering({ fetch: fetchAnswer("short") }),
      untrustedSandbox,
    );
    await startRun(untrustedReplayDeps, T, startRequest("untrusted-code", INPUT_UNTRUSTED));
    const untrustedReplayOps = taggedOps("r_1", untrustedRecorded.slice(0, 4));
    const untrustedReplayed = await executeRun(untrustedReplayOps, untrustedReplayDeps, T, "r_1");
    assert.equal(untrustedReplayed.state, "completed");
    assert.deepEqual(untrustedReplayOps.executed, ["route", "done", "run:finish"]);
    assert.deepEqual(untrustedSandbox.calls, [], "no fresh code runs on the replay");
    const untrustedReplayRows = await rowsOf(untrustedStore);
    assert.deepEqual(
      untrustedReplayRows.map((row) => row.nodeId),
      ["route", "done"],
    );
    assert.deepEqual(untrustedReplayRows[0], fullUntrustedRows[2]);
    assert.deepEqual(untrustedReplayRows[1], fullUntrustedRows[3]);
    assert.equal(untrustedReplayRows[0]?.seq, 2);
    assert.deepEqual(untrustedReplayRows[0]?.taint, U);
    assert.equal(untrustedReplayRows[1]?.seq, 3);
    assert.deepEqual(untrustedReplayRows[1]?.taint, []);

    const trustedVersion = taintRunVersion("trusted-code");
    const fullTrustedStore = recordingStore();
    const fullTrustedDeps = makeDeps(
      fullTrustedStore,
      trustedVersion,
      invokerAnswering({ lookup: LOOKUP_ANSWER }),
      pool,
    );
    await startRun(fullTrustedDeps, T, startRequest("trusted-code", INPUT_TRUSTED));
    const fullTrustedOps = taggedOps("r_1");
    const fullTrusted = await executeRun(fullTrustedOps, fullTrustedDeps, T, "r_1");
    assert.equal(fullTrusted.state, "completed");
    const trustedRecorded = [...fullTrustedOps.values];
    assert.equal(trustedRecorded.length, 6, "the trusted run records six step values");
    const fullTrustedRows = await rowsOf(fullTrustedStore);

    const trustedStore = recordingStore();
    const trustedSandbox = loggingSandbox(pool);
    const trustedReplayDeps = makeDeps(
      trustedStore,
      taintRunVersion("trusted-code"),
      invokerAnswering({ lookup: LOOKUP_ANSWER }),
      trustedSandbox,
    );
    await startRun(trustedReplayDeps, T, startRequest("trusted-code", INPUT_TRUSTED));
    const trustedReplayOps = taggedOps("r_1", trustedRecorded.slice(0, 4));
    const trustedReplayed = await executeRun(trustedReplayOps, trustedReplayDeps, T, "r_1");
    assert.equal(trustedReplayed.state, "completed");
    assert.deepEqual(trustedReplayOps.executed, ["done", "run:finish"]);
    assert.deepEqual(trustedSandbox.calls, [], "no fresh code runs on the replay");
    const trustedReplayRows = await rowsOf(trustedStore);
    assert.deepEqual(
      trustedReplayRows.map((row) => row.nodeId),
      ["done"],
    );
    assert.deepEqual(trustedReplayRows[0]?.taint, []);
    assert.deepEqual(trustedReplayRows[0], fullTrustedRows[2]);
  } finally {
    await pool.close();
  }
});
