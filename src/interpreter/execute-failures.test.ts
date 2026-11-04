import assert from "node:assert/strict";
import { test } from "node:test";

import { Error as DBOSErrors } from "@dbos-inc/dbos-sdk";

import type { Flow, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore, payloadDigest } from "../runs/index.ts";
import type { RunError, RunRecord, RunStore, StepRecord, TenantContext } from "../runs/index.ts";
import {
  executeRun,
  InterpreterError,
  memoryWorkflowOps,
  NO_EFFECT_GATE,
  startRun,
} from "./index.ts";
import type {
  EffectDecision,
  EffectGate,
  InterpreterDeps,
  LoadedVersion,
  MemoryWorkflowOps,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const T_B: TenantContext = { tenantId: "tenant_b", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const HASH = `sha256:${"a".repeat(64)}`;
const INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const BLOCKED = { vendor_id: "v2", status: "blocked" };
const PAID = { payment_id: "pay-1", status: "paid" };
const END_OUTPUT = { payment_id: "pay-1" };
const CATALOGUE = loadTestCatalogue();
const NOW = new Date("2026-11-02T10:00:00Z");

const E_SECRET = new Error("connect failed password=hunter2");
const CANCELLED = new DBOSErrors.DBOSWorkflowCancelledError("w1");

function inputsSchema(): Flow["inputs"] {
  return {
    type: "object",
    properties: {
      vendor: { type: "string" },
      invoice: { type: "string" },
      amount: { type: "number" },
    },
    required: ["vendor", "invoice", "amount"],
  };
}

function payOnceFlow(): Flow {
  return {
    ursitoare: "0.1",
    flow: "pay-once",
    version: "1.0.0",
    inputs: inputsSchema(),
    start: "lookup",
    nodes: {
      lookup: {
        kind: "block",
        uses: "erp.lookup_vendor@1",
        with: { vendor_name: "${{ inputs.vendor }}" },
        next: "route",
      },
      route: {
        kind: "switch",
        on: "${{ nodes.lookup.output.status }}",
        cases: { active: "pay" },
        default: "rejected",
      },
      pay: {
        kind: "block",
        uses: "erp.create_payment@1",
        with: {
          vendor_id: "${{ nodes.lookup.output.vendor_id }}",
          amount: "${{ inputs.amount }}",
          currency: "EUR",
          reference: "${{ inputs.invoice }}",
        },
        next: "done",
      },
      done: {
        kind: "end",
        status: "completed",
        output: { payment_id: "${{ nodes.pay.output.payment_id }}" },
      },
      rejected: { kind: "end", status: "failed" },
    },
  };
}

function payPoFlow(): Flow {
  const flow = payOnceFlow();
  flow.flow = "pay-po";
  const pay = flow.nodes["pay"];
  if (pay !== undefined && pay.kind === "block") {
    pay.with = { ...pay.with, reference: "${{ inputs.po_number }}" };
  }
  return flow;
}

function payNoNextFlow(): Flow {
  return {
    ursitoare: "0.1",
    flow: "pay-nonext",
    version: "1.0.0",
    inputs: inputsSchema(),
    start: "lookup",
    nodes: {
      lookup: {
        kind: "block",
        uses: "erp.lookup_vendor@1",
        with: { vendor_name: "${{ inputs.vendor }}" },
      },
    },
  };
}

function spinFlow(): Flow {
  return {
    ursitoare: "0.1",
    flow: "spin",
    version: "1.0.0",
    inputs: { type: "object" },
    start: "spin",
    nodes: {
      spin: { kind: "switch", on: "x", cases: {}, default: "spin" },
    },
  };
}

function loaded(flow: Flow): LoadedVersion {
  return {
    flowId: flow.flow,
    hash: HASH,
    state: "validated",
    ownerTeam: "finance",
    flow,
  };
}

const VERSIONS: ReadonlyMap<string, LoadedVersion> = new Map([
  ["pay-once", loaded(payOnceFlow())],
  ["pay-po", loaded(payPoFlow())],
  ["pay-nonext", loaded(payNoNextFlow())],
  ["spin", loaded(spinFlow())],
]);

const defaultLoader = async (_ctx: TenantContext, flowId: string) => {
  const found = VERSIONS.get(flowId);
  return found === undefined ? null : structuredClone(found);
};

function makeDeps(store: RunStore, over: Partial<InterpreterDeps> = {}): InterpreterDeps {
  return {
    store,
    durable: null,
    loadVersion: defaultLoader,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => {
      throw new Error("executeRun must ask for an invoker through invokerFor");
    },
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    ...over,
  };
}

interface InvokerLog {
  call: ToolCall;
  ctx: StepContext;
}

interface FailingInvoker extends ToolInvoker {
  log: InvokerLog[];
}

function invokerAnswering(
  answers: Readonly<Record<string, JsonValue | Error>>,
): FailingInvoker {
  const log: InvokerLog[] = [];
  return {
    log,
    async invoke(call, context) {
      log.push({ call, ctx: context });
      if (!Object.hasOwn(answers, call.tool)) {
        throw new Error(`unexpected tool ${call.tool}`);
      }
      const answer = answers[call.tool];
      if (answer instanceof Error) throw answer;
      return { output: answer as JsonValue };
    },
  };
}

interface GateLog {
  phase: "before" | "after";
  call: ToolCall;
  ctx: StepContext;
  result?: ToolResult;
}

interface RecordingGate extends EffectGate {
  log: GateLog[];
}

function recordingGate(decision: EffectDecision): RecordingGate {
  const log: GateLog[] = [];
  return {
    log,
    async before(call, context) {
      log.push({ phase: "before", call, ctx: context });
      return decision;
    },
    async after(call, context, result) {
      log.push({ phase: "after", call, ctx: context, result });
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

async function queuedRun(
  store: RunStore,
  flowId = "pay-once",
  input: JsonValue = INPUT,
): Promise<void> {
  await assert.doesNotReject(async () => {
    await startRun(makeDeps(store), T_A, {
      flowId,
      hash: HASH,
      mode: "mock",
      input,
      mocks: null,
      principal: ALICE,
      actorChain: [ALICE.userId],
      runId: "r_1",
    });
  });
}

async function storedSteps(store: RunStore, ctxToUse: TenantContext = T_A): Promise<StepRecord[]> {
  const listed = await store.listSteps(ctxToUse, "r_1", { limit: 100 });
  return listed.steps;
}

interface Captured {
  value?: RunRecord;
  error?: unknown;
}

async function capture(promise: Promise<RunRecord>): Promise<Captured> {
  try {
    return { value: await promise };
  } catch (error) {
    return { error };
  }
}

function failedRun(captured: Captured): RunRecord {
  assert.equal(captured.error, undefined, `unexpected rejection ${String(captured.error)}`);
  assert.ok(captured.value !== undefined, "executeRun returned no run");
  assert.equal(captured.value.state, "failed");
  return captured.value;
}

function errorRun(run: RunRecord): RunError {
  assert.ok(run.error !== null, "the failed run has no error");
  return run.error;
}

function rowAt(rows: readonly StepRecord[], seq: number): StepRecord {
  const row = rows.find((entry) => entry.seq === seq);
  assert.ok(row !== undefined, `no step row with seq ${seq}`);
  return row;
}

test("C-acbe41c3 a run fails when a later node has an unresolved reference", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store, "pay-po");
  const ops = taggedOps("r_1");
  const invoker = invokerAnswering({
    "erp.lookup_vendor@1": LOOKUP_OK,
    "erp.create_payment@1": PAID,
  });
  const gate = recordingGate({ action: "invoke", idemKey: "ik_pay_1" });
  const deps = makeDeps(store, {
    invokerFor: async () => invoker,
    effects: gate,
  });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  const run = failedRun(captured);
  const error = errorRun(run);
  assert.equal(error.code, "INTERPRETER_REF_UNRESOLVED");
  assert.equal(error.node, "pay");
  assert.equal(run.terminalNode, "pay");
  assert.ok(error.message.includes("inputs.po_number"));
  assert.equal(run.outputRef, null);

  const rows = await storedSteps(store);
  assert.equal(rows.length, 3);
  assert.equal(rowAt(rows, 0).nodeId, "lookup");
  assert.equal(rowAt(rows, 0).state, "completed");
  assert.equal(rowAt(rows, 1).nodeId, "route");
  assert.equal(rowAt(rows, 1).state, "completed");
  const pay = rowAt(rows, 2);
  assert.equal(pay.nodeId, "pay");
  assert.equal(pay.state, "failed");
  assert.equal(pay.error?.code, "INTERPRETER_REF_UNRESOLVED");
  assert.equal(pay.inputRef, null);

  assert.deepEqual(invoker.log.map((entry) => entry.call.nodeId), ["lookup"]);
  assert.equal(gate.log.length, 0);
});

test("C-acbe41c3 a rejecting invoker fails the run without leaking its message", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  const ops = taggedOps("r_1");
  const invoker = invokerAnswering({
    "erp.lookup_vendor@1": E_SECRET,
    "erp.create_payment@1": PAID,
  });
  const gate = recordingGate({ action: "invoke", idemKey: "ik_pay_1" });
  const deps = makeDeps(store, { invokerFor: async () => invoker, effects: gate });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  const run = failedRun(captured);
  const error = errorRun(run);
  assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
  assert.equal(error.node, "lookup");
  assert.equal(run.terminalNode, "lookup");
  assert.ok(!error.message.includes("hunter2"));
  assert.ok(!JSON.stringify(run).includes("hunter2"));

  const rows = await storedSteps(store);
  assert.equal(rows.length, 1);
  assert.equal(rowAt(rows, 0).nodeId, "lookup");
  assert.equal(rowAt(rows, 0).state, "failed");
  assert.ok(!JSON.stringify(rows).includes("hunter2"));
  assert.equal(gate.log.length, 0);
});

test("C-acbe41c3 a failed end node fails the run at that node", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  const ops = taggedOps("r_1");
  const invoker = invokerAnswering({
    "erp.lookup_vendor@1": BLOCKED,
    "erp.create_payment@1": PAID,
  });
  const gate = recordingGate({ action: "invoke", idemKey: "ik_pay_1" });
  const deps = makeDeps(store, { invokerFor: async () => invoker, effects: gate });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  const run = failedRun(captured);
  const error = errorRun(run);
  assert.equal(error.code, "FLOW_FAILED");
  assert.equal(error.node, "rejected");
  assert.equal(run.terminalNode, "rejected");
  assert.equal(run.outputRef, null);

  const rows = await storedSteps(store);
  assert.equal(rows.length, 3);
  assert.equal(rowAt(rows, 0).nodeId, "lookup");
  assert.equal(rowAt(rows, 1).nodeId, "route");
  const rejected = rowAt(rows, 2);
  assert.equal(rejected.nodeId, "rejected");
  assert.equal(rejected.state, "failed");
  assert.equal(rejected.error?.code, "FLOW_FAILED");
  assert.equal(gate.log.length, 0);
});

test("C-acbe41c3 an unknown effect decision fails the run and keeps its idem key", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  const ops = taggedOps("r_1");
  const invoker = invokerAnswering({
    "erp.lookup_vendor@1": LOOKUP_OK,
    "erp.create_payment@1": PAID,
  });
  const gate = recordingGate({ action: "unknown", idemKey: "ik_pay_1" });
  const deps = makeDeps(store, { invokerFor: async () => invoker, effects: gate });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  const run = failedRun(captured);
  const error = errorRun(run);
  assert.equal(error.code, "INTERPRETER_EFFECT_UNKNOWN");
  assert.equal(error.node, "pay");
  assert.equal(run.terminalNode, "pay");

  const rows = await storedSteps(store);
  assert.equal(rows.length, 3);
  const pay = rowAt(rows, 2);
  assert.equal(pay.nodeId, "pay");
  assert.equal(pay.state, "failed");
  assert.equal(pay.idemKey, "ik_pay_1");

  assert.deepEqual(invoker.log.map((entry) => entry.call.nodeId), ["lookup"]);
  assert.equal(gate.log.length, 1);
  assert.equal(gate.log[0]?.phase, "before");
  assert.ok(!ops.executed.includes("pay#done"));
});

test("C-e3cb0a11 a looping flow fails at the revisited node", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store, "spin", {});
  const ops = taggedOps("r_1");
  const deps = makeDeps(store, { invokerFor: async () => invokerAnswering({}) });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  const run = failedRun(captured);
  const error = errorRun(run);
  assert.equal(error.code, "INTERPRETER_LOOP_LIMIT");
  assert.equal(error.node, "spin");
  assert.equal(run.terminalNode, "spin");

  const rows = await storedSteps(store);
  assert.equal(rows.length, 1);
  assert.equal(rowAt(rows, 0).nodeId, "spin");
  assert.equal(rowAt(rows, 0).state, "completed");
});

test("C-e3cb0a11 a node without a successor fails the run", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store, "pay-nonext");
  const ops = taggedOps("r_1");
  const invoker = invokerAnswering({ "erp.lookup_vendor@1": LOOKUP_OK });
  const deps = makeDeps(store, { invokerFor: async () => invoker });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  const run = failedRun(captured);
  const error = errorRun(run);
  assert.equal(error.code, "NODE_RUNTIME_INVALID");
  assert.equal(error.node, "lookup");
  assert.equal(run.terminalNode, "lookup");

  const rows = await storedSteps(store);
  assert.equal(rows.length, 1);
  assert.equal(rowAt(rows, 0).nodeId, "lookup");
  assert.equal(rowAt(rows, 0).state, "failed");
});

test("C-e3cb0a11 a missing invoker fails the run with no rows", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  const ops = taggedOps("r_1");
  const deps = makeDeps(store, {
    invokerFor: async () => {
      throw new Error("invoker secret");
    },
  });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  const run = failedRun(captured);
  const error = errorRun(run);
  assert.equal(error.code, "INTERPRETER_NO_INVOKER");
  assert.equal(error.node, null);
  assert.ok(!error.message.includes("invoker secret"));
  assert.deepEqual(ops.executed, ["run:load", "run:start", "run:finish"]);
  assert.deepEqual(await storedSteps(store), []);
});

test("C-e3cb0a11 an unloadable version fails the run and names the stage", async () => {
  const missing = createMemoryRunStore();
  await queuedRun(missing);
  const missingOps = taggedOps("r_1");
  const missingCaptured = await capture(
    executeRun(
      missingOps,
      makeDeps(missing, { loadVersion: async () => null }),
      T_A,
      "r_1",
    ),
  );
  const missingRun = failedRun(missingCaptured);
  assert.equal(errorRun(missingRun).code, "INTERPRETER_VERSION_NOT_FOUND");
  assert.deepEqual(missingOps.executed, ["run:load", "run:finish"]);
  assert.deepEqual(await storedSteps(missing), []);

  const loadFailure = createMemoryRunStore();
  await queuedRun(loadFailure);
  const loadOps = taggedOps("r_1");
  const loadCaptured = await capture(
    executeRun(
      loadOps,
      makeDeps(loadFailure, {
        loadVersion: async () => {
          throw new Error("load secret text");
        },
      }),
      T_A,
      "r_1",
    ),
  );
  const loadRun = failedRun(loadCaptured);
  const loadError = errorRun(loadRun);
  assert.equal(loadError.code, "INTERPRETER_VERSION_NOT_FOUND");
  assert.ok(loadError.message.includes("load_failed"));
  assert.ok(!loadError.message.includes("load secret text"));

  const catalogueFailure = createMemoryRunStore();
  await queuedRun(catalogueFailure);
  const catalogueOps = taggedOps("r_1");
  const catalogueCaptured = await capture(
    executeRun(
      catalogueOps,
      makeDeps(catalogueFailure, {
        catalogueFor: async () => {
          throw new Error("catalogue secret text");
        },
      }),
      T_A,
      "r_1",
    ),
  );
  const catalogueRun = failedRun(catalogueCaptured);
  const catalogueError = errorRun(catalogueRun);
  assert.equal(catalogueError.code, "INTERPRETER_VERSION_NOT_FOUND");
  assert.ok(catalogueError.message.includes("catalogue_failed"));
  assert.ok(!catalogueError.message.includes("catalogue secret text"));
});

test("C-e3cb0a11 a cancelled workflow rejection propagates unchanged", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  const ops = taggedOps("r_1");
  const invoker: ToolInvoker = {
    async invoke() {
      await store.transition(T_A, "r_1", {
        state: "cancelled",
        from: ["running"],
        at: NOW,
      });
      throw CANCELLED;
    },
  };
  const deps = makeDeps(store, { invokerFor: async () => invoker });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  assert.equal(captured.error, CANCELLED);

  const stored = await store.getRun(T_A, "r_1");
  assert.ok(stored !== null);
  assert.equal(stored.state, "cancelled");
  assert.ok(!ops.executed.includes("run:finish"));

  const rows = await storedSteps(store);
  assert.ok(rows.every((row) => row.state !== "failed"));
});

test("C-e3cb0a11 a store rejection propagates and leaves the run as stored", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  const before = await store.getRun(T_A, "r_1");
  const ops = taggedOps("r_1");
  const E = new Error("store unavailable");
  const rejecting: RunStore = {
    ...store,
    async getRun() {
      throw E;
    },
  };

  const captured = await capture(
    executeRun(ops, makeDeps(rejecting), T_A, "r_1"),
  );
  assert.equal(captured.error, E);
  assert.deepEqual(await store.getRun(T_A, "r_1"), before);
});

test("C-e3cb0a11 another tenant sees no run and the owner keeps its completed run", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  await store.transition(T_A, "r_1", { state: "running", from: ["queued"], at: NOW });
  const completed = await store.transition(T_A, "r_1", {
    state: "completed",
    from: ["running"],
    at: NOW,
    output: END_OUTPUT,
    terminalNode: "done",
  });
  assert.ok(completed !== null);

  const ops = taggedOps("r_1");
  const captured = await capture(
    executeRun(ops, makeDeps(store), T_B, "r_1"),
  );
  assert.ok(captured.error instanceof InterpreterError);
  assert.equal(captured.error.code, "INTERPRETER_VERSION_NOT_FOUND");
  assert.equal(captured.error.details["reason"], "run_missing");
  assert.deepEqual(ops.executed, ["run:load"]);

  assert.deepEqual(await store.getRun(T_A, "r_1"), completed);
});

test("C-e3cb0a11 a terminal run is returned without running or invoking", async () => {
  const store = createMemoryRunStore();
  await queuedRun(store);
  await store.transition(T_A, "r_1", { state: "running", from: ["queued"], at: NOW });
  const completed = await store.transition(T_A, "r_1", {
    state: "completed",
    from: ["running"],
    at: NOW,
    output: END_OUTPUT,
    terminalNode: "done",
  });
  assert.ok(completed !== null);

  let invoked = 0;
  const ops = taggedOps("r_1");
  const deps = makeDeps(store, {
    invokerFor: async () => {
      invoked += 1;
      throw new Error("must not ask for an invoker");
    },
  });

  const captured = await capture(executeRun(ops, deps, T_A, "r_1"));
  assert.equal(captured.error, undefined);
  assert.deepEqual(captured.value, completed);
  assert.deepEqual(ops.executed, ["run:load"]);
  assert.equal(invoked, 0);
  assert.equal(payloadDigest(END_OUTPUT), completed.outputRef);
});
