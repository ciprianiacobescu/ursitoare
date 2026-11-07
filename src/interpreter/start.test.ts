import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore, payloadDigest } from "../runs/index.ts";
import type { RunRecord, RunStore, TenantContext } from "../runs/index.ts";
import {
  InterpreterError,
  NO_EFFECT_GATE,
  startRun,
  workflowIdOf,
} from "./index.ts";
import type {
  InterpreterDeps,
  LoadedVersion,
  StartRunRequest,
  VersionLoader,
} from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { loadTestFlow } from "../../test/support/catalogue/flows.ts";

assert.equal(typeof startRun, "function");
assert.equal(typeof workflowIdOf, "function");

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const T_B: TenantContext = { tenantId: "tenant_b", reviewProfile: "solo" };
const T_U: TenantContext = { tenantId: "_t", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const HASH = `sha256:${"a".repeat(64)}`;
const INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
const MOCKS: JsonValue = { lookup: {} };
const CATALOGUE = loadTestCatalogue();

interface Enqueued {
  workflow: string;
  workflowId: string;
  input: JsonValue;
}

interface Captured<T> {
  value?: T;
  error?: unknown;
}

interface Rig {
  store: RunStore;
  calls: Enqueued[];
  deps: InterpreterDeps;
}

function payOnceFlow(lookupUses = "erp.lookup_vendor@1"): Flow {
  return {
    ursitoare: "0.1",
    flow: "pay-once",
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: {
        vendor: { type: "string" },
        invoice: { type: "string" },
        amount: { type: "number" },
      },
      required: ["vendor", "invoice", "amount"],
    },
    start: "lookup",
    nodes: {
      lookup: {
        kind: "block",
        uses: lookupUses,
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

function payCodeFlow(): Flow {
  return {
    ursitoare: "0.1",
    flow: "pay-code",
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: { vendor: { type: "string" } },
      required: ["vendor"],
    },
    start: "normalize",
    nodes: {
      normalize: {
        kind: "code",
        language: "js",
        source: "return { n: 1 };",
        input: {},
        output_schema: { type: "object" },
        next: "done",
      },
      done: {
        kind: "end",
        status: "completed",
        output: { n: "${{ nodes.normalize.output.n }}" },
      },
    },
  };
}

const VERSIONS: ReadonlyMap<string, LoadedVersion> = new Map([
  [
    "pay-once",
    {
      flowId: "pay-once",
      hash: HASH,
      state: "validated",
      ownerTeam: "finance",
      flow: payOnceFlow(),
    },
  ],
  [
    "pay-draft",
    {
      flowId: "pay-draft",
      hash: HASH,
      state: "draft",
      ownerTeam: "finance",
      flow: { ...payOnceFlow(), flow: "pay-draft" },
    },
  ],
  [
    "pay-missing",
    {
      flowId: "pay-missing",
      hash: HASH,
      state: "validated",
      ownerTeam: "finance",
      flow: { ...payOnceFlow("erp.unknown@1"), flow: "pay-missing" },
    },
  ],
  [
    "rf-1-core",
    {
      flowId: "rf-1-core",
      hash: HASH,
      state: "validated",
      ownerTeam: "finance",
      flow: loadTestFlow("rf-1-core"),
    },
  ],
  [
    "pay-code",
    {
      flowId: "pay-code",
      hash: HASH,
      state: "validated",
      ownerTeam: "finance",
      flow: payCodeFlow(),
    },
  ],
]);

const defaultLoader: VersionLoader = async (_ctx, flowId) => {
  const found = VERSIONS.get(flowId);
  return found === undefined ? null : structuredClone(found);
};

function recordingDurable(failure?: Error): {
  calls: Enqueued[];
  durable: NonNullable<InterpreterDeps["durable"]>;
} {
  const calls: Enqueued[] = [];
  return {
    calls,
    durable: {
      async enqueue(workflow, workflowId, input) {
        calls.push({ workflow, workflowId, input });
        if (failure !== undefined) {
          throw failure;
        }
      },
    },
  };
}

function makeDeps(store: RunStore, over: Partial<InterpreterDeps> = {}): InterpreterDeps {
  return {
    store,
    durable: null,
    loadVersion: defaultLoader,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => {
      throw new Error("startRun must not ask for an invoker");
    },
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
    ...over,
  };
}

function makeRig(options: {
  deps?: Partial<InterpreterDeps>;
  enqueueError?: Error;
} = {}): Rig {
  const store = createMemoryRunStore();
  const enqueued = recordingDurable(options.enqueueError);
  const deps = makeDeps(store, { durable: enqueued.durable, ...options.deps });
  return { store, calls: enqueued.calls, deps };
}

async function capture<T>(promise: Promise<T>): Promise<Captured<T>> {
  try {
    return { value: await promise };
  } catch (error) {
    return { error };
  }
}

function captureSync<T>(fn: () => T): Captured<T> {
  try {
    return { value: fn() };
  } catch (error) {
    return { error };
  }
}

function request(flowId: string, overrides: Partial<StartRunRequest> = {}): StartRunRequest {
  return {
    flowId,
    hash: HASH,
    mode: "mock",
    input: INPUT,
    mocks: null,
    principal: ALICE,
    actorChain: [ALICE.userId],
    ...overrides,
  };
}

function startOn(
  rig: Rig,
  ctx: TenantContext,
  flowId: string,
  overrides: Partial<StartRunRequest> = {},
): Promise<Captured<RunRecord>> {
  return capture(startRun(rig.deps, ctx, request(flowId, overrides)));
}

function interpreterError(captured: Captured<RunRecord>, label: string): InterpreterError {
  assert.ok(
    captured.error instanceof InterpreterError,
    `${label}: expected InterpreterError, got ${String(captured.error)}`,
  );
  return captured.error;
}

function valueOf(captured: Captured<RunRecord>, label: string): RunRecord {
  assert.equal(
    captured.error,
    undefined,
    `${label}: unexpected failure ${String(captured.error)}`,
  );
  assert.ok(captured.value !== undefined, `${label}: no run returned`);
  return captured.value;
}

async function expectRefusal(
  flowId: string,
  overrides: Partial<StartRunRequest>,
  expected: {
    code: string;
    reason?: string;
    kinds?: readonly string[];
    blocks?: readonly string[];
    path?: string;
    field?: string;
  },
): Promise<void> {
  const rig = makeRig();
  const captured = await startOn(rig, T_A, flowId, { runId: "r_7", ...overrides });
  const error = interpreterError(captured, flowId);
  assert.equal(error.code, expected.code, flowId);
  if (expected.reason !== undefined) {
    assert.equal(error.details["reason"], expected.reason, flowId);
  }
  if (expected.kinds !== undefined) {
    assert.deepEqual(error.details["kinds"], expected.kinds, flowId);
  }
  if (expected.blocks !== undefined) {
    assert.deepEqual(error.details["blocks"], expected.blocks, flowId);
  }
  if (expected.path !== undefined) {
    assert.equal(error.details["path"], expected.path, flowId);
  }
  if (expected.field !== undefined) {
    assert.equal(error.details["field"], expected.field, flowId);
  }
  assert.equal(rig.calls.length, 0, `${flowId}: nothing is enqueued`);
  assert.equal(await rig.store.getRun(T_A, "r_7"), null, `${flowId}: no run is stored`);
}

test("C-d807f118 startRun refuses missing draft unsupported and unknown block versions", async () => {
  await expectRefusal("missing-flow", {}, { code: "INTERPRETER_VERSION_NOT_FOUND" });
  await expectRefusal("pay-draft", {}, {
    code: "INTERPRETER_VERSION_NOT_RUNNABLE",
    reason: "draft",
  });
  await expectRefusal("rf-1-core", {}, {
    code: "INTERPRETER_KIND_UNSUPPORTED",
    kinds: ["llm.decide", "llm.extract"],
  });
  await expectRefusal("pay-missing", {}, {
    code: "INTERPRETER_VERSION_NOT_RUNNABLE",
    reason: "block_missing",
    blocks: ["erp.unknown@1"],
  });
});

test("C-d807f118 startRun admits a validated flow with code nodes", async () => {
  const rig = makeRig();
  const captured = await startOn(rig, T_A, "pay-code", { runId: "r_code" });
  const run = valueOf(captured, "code start");
  assert.equal(run.runId, "r_code");
  assert.equal(run.state, "queued");
  assert.equal(run.flowId, "pay-code");
  assert.deepEqual(rig.calls, [
    {
      workflow: "ursitoare.run",
      workflowId: "tenant_a:r_code",
      input: { tenantId: "tenant_a", reviewProfile: "solo", runId: "r_code" },
    },
  ]);
  assert.deepEqual(await rig.store.getRun(T_A, "r_code"), run);
});

test("C-d807f118 startRun refuses ill-typed input and an invalid run id", async () => {
  await expectRefusal("pay-once", { input: { vendor: "Acme" } }, {
    code: "INTERPRETER_INPUT_INVALID",
    path: "/",
  });
  await expectRefusal("pay-once", { runId: "bad id" }, {
    code: "INTERPRETER_INPUT_INVALID",
    field: "runId",
  });
});

test("C-d807f118 startRun stores a queued run and enqueues its workflow", async () => {
  const rig = makeRig();
  const captured = await startOn(rig, T_A, "pay-once", { runId: "r_7", mocks: MOCKS });
  const run = valueOf(captured, "valid start");
  assert.equal(run.runId, "r_7");
  assert.equal(run.lineageId, "r_7");
  assert.equal(run.state, "queued");
  assert.equal(run.ownerTeam, "finance");
  assert.equal(run.trigger, "test");
  assert.equal(run.mode, "mock");
  assert.equal(run.flowId, "pay-once");
  assert.equal(run.flowHash, HASH);
  assert.deepEqual(run.principal, { userId: ALICE.userId, kind: "human" });
  assert.deepEqual(run.actorChain, [ALICE.userId]);
  assert.equal(run.inputRef, payloadDigest(INPUT));
  assert.equal(run.mocksRef, payloadDigest(MOCKS));
  assert.deepEqual(rig.calls, [
    {
      workflow: "ursitoare.run",
      workflowId: "tenant_a:r_7",
      input: { tenantId: "tenant_a", reviewProfile: "solo", runId: "r_7" },
    },
  ]);
  assert.deepEqual(await rig.store.getRun(T_A, "r_7"), run);
});

test("C-d807f118 startRun answers the stored run and keeps tenants apart", async () => {
  const rig = makeRig();
  const first = valueOf(
    await startOn(rig, T_A, "pay-once", { runId: "r_7", mocks: MOCKS }),
    "first start",
  );
  const firstCall = { ...rig.calls[0] };
  const second = valueOf(
    await startOn(rig, T_A, "pay-once", {
      runId: "r_7",
      mocks: MOCKS,
      input: { vendor: "Beta", invoice: "inv-2", amount: 42 },
    }),
    "second start",
  );
  assert.deepEqual(second, first);
  assert.deepEqual(rig.calls[1], firstCall);

  const other = valueOf(
    await startOn(rig, T_B, "pay-once", { runId: "r_7", mocks: MOCKS }),
    "tenant B start",
  );
  assert.equal(other.runId, "r_7");
  assert.deepEqual(rig.calls[2], {
    workflow: "ursitoare.run",
    workflowId: "tenant_b:r_7",
    input: { tenantId: "tenant_b", reviewProfile: "solo", runId: "r_7" },
  });

  assert.deepEqual(await rig.store.getRun(T_A, "r_7"), first);
  assert.deepEqual(await rig.store.getRun(T_B, "r_7"), other);
});

test("C-d807f118 startRun derives an id skips enqueue and names the workflow", async () => {
  const named = captureSync(() => workflowIdOf("tenant_a", "r_7"));
  assert.equal(named.error, undefined, `workflowIdOf failed: ${String(named.error)}`);
  assert.equal(named.value, "tenant_a:r_7");
  const underscored = captureSync(() => workflowIdOf("_t", "r_7"));
  assert.equal(
    underscored.error,
    undefined,
    `workflowIdOf failed: ${String(underscored.error)}`,
  );
  assert.equal(underscored.value, "_t:r_7");

  const derived = makeRig({ deps: { ids: sequentialIds(0) } });
  const derivedRun = valueOf(await startOn(derived, T_A, "pay-once"), "derived id");
  assert.equal(derivedRun.runId, "run_00000000-0000-7000-8000-000000000000");
  assert.equal(derived.calls.length, 1);

  const notDurable = makeRig({ deps: { durable: null } });
  const undurableRun = valueOf(
    await startOn(notDurable, T_A, "pay-once", { runId: "r_8" }),
    "durable null",
  );
  assert.equal(undurableRun.state, "queued");
  assert.equal(notDurable.calls.length, 0);

  const underscoredTenant = makeRig();
  valueOf(
    await startOn(underscoredTenant, T_U, "pay-once", { runId: "r_7", mocks: MOCKS }),
    "underscored tenant",
  );
  assert.equal(underscoredTenant.calls[0]?.workflowId, "_t:r_7");
});

test("C-d807f118 a rejected enqueue fails the run and reports it as unbound", async () => {
  const rig = makeRig({ enqueueError: new Error("down") });
  const captured = await startOn(rig, T_A, "pay-once", { runId: "r_7", mocks: MOCKS });
  const error = interpreterError(captured, "enqueue rejection");
  assert.equal(error.code, "INTERPRETER_UNBOUND");
  assert.ok(!error.message.includes("down"));
  assert.equal(rig.calls.length, 1);

  const stored = await rig.store.getRun(T_A, "r_7");
  assert.ok(stored !== null, "the failed run is stored");
  assert.equal(stored.state, "failed");
  assert.equal(stored.error?.code, "INTERPRETER_UNBOUND");
  assert.ok(!(stored.error?.message ?? "").includes("down"));
});

test("C-d807f118 startRun propagates loader and catalogue rejections unchanged", async () => {
  const loadFailure = new Error("load_failed");
  const loaderRig = makeRig({
    deps: {
      loadVersion: async () => {
        throw loadFailure;
      },
    },
  });
  const loaderCaptured = await startOn(loaderRig, T_A, "pay-once", { runId: "r_7" });
  assert.equal(loaderCaptured.error, loadFailure);
  assert.equal(loaderRig.calls.length, 0);
  assert.equal(await loaderRig.store.getRun(T_A, "r_7"), null);

  const catalogueFailure = new Error("catalogue_failed");
  const catalogueRig = makeRig({
    deps: {
      catalogueFor: async () => {
        throw catalogueFailure;
      },
    },
  });
  const catalogueCaptured = await startOn(catalogueRig, T_A, "pay-once", { runId: "r_7" });
  assert.equal(catalogueCaptured.error, catalogueFailure);
  assert.equal(catalogueRig.calls.length, 0);
  assert.equal(await catalogueRig.store.getRun(T_A, "r_7"), null);
});
