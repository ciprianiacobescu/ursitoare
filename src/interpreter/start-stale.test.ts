import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore } from "../runs/index.ts";
import type { RunRecord, TenantContext } from "../runs/index.ts";
import { InterpreterError, NO_EFFECT_GATE, startRun } from "./index.ts";
import type { InterpreterDeps, LoadedVersion, StartRunRequest } from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { loadTestFlow } from "../../test/support/catalogue/flows.ts";

const TENANT: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const HASH = `sha256:${"a".repeat(64)}`;
const INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
const MSG = `flow "pay-once" version "${HASH}" was validated by an older validator; validate it again`;
const CATALOGUE = loadTestCatalogue();

interface Enqueued {
  workflow: string;
  workflowId: string;
}

function supportedFlow(): Flow {
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

function record(over: Record<string, unknown>): LoadedVersion {
  return {
    flowId: "pay-once",
    hash: HASH,
    state: "validated",
    ownerTeam: "finance",
    flow: supportedFlow(),
    ...over,
  } as LoadedVersion;
}

function request(runId: string, input: JsonValue = INPUT): StartRunRequest {
  return {
    flowId: "pay-once",
    hash: HASH,
    mode: "mock",
    input,
    mocks: null,
    principal: { userId: "u_alice", kind: "human" },
    actorChain: [],
    runId,
  };
}

function rig() {
  const store = createMemoryRunStore();
  const calls: Enqueued[] = [];
  let loaded: LoadedVersion = record({});
  const deps: InterpreterDeps = {
    store,
    durable: {
      async enqueue(workflow, workflowId) {
        calls.push({ workflow, workflowId });
      },
    },
    loadVersion: async () => structuredClone(loaded),
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => {
      throw new Error("startRun must not ask for an invoker");
    },
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
  };
  return {
    store,
    calls,
    deps,
    load(next: LoadedVersion): void {
      loaded = next;
    },
  };
}

async function failure(promise: Promise<RunRecord>): Promise<InterpreterError | null> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof InterpreterError, `unexpected error ${String(error)}`);
    return error;
  }
  return null;
}

function assertStale(error: InterpreterError | null, label: string): void {
  assert.ok(error !== null, `${label}: expected a refusal`);
  assert.equal(error.code, "INTERPRETER_VERSION_NOT_RUNNABLE", label);
  assert.equal(error.message, MSG, label);
  assert.equal(error.node, null, label);
  assert.deepEqual(error.details, { reason: "validation_stale" }, label);
}

test("C-ccc4a2fb S1 and S2: a stale validated or reviewed version is refused", async () => {
  const r = rig();
  r.load(record({ state: "validated", stale: true }));
  assertStale(await failure(startRun(r.deps, TENANT, request("r_s1"))), "S1");
  r.load(record({ state: "reviewed", stale: true }));
  assertStale(await failure(startRun(r.deps, TENANT, request("r_s2"))), "S2");
  assert.equal(await r.store.getRun(TENANT, "r_s1"), null);
  assert.equal(await r.store.getRun(TENANT, "r_s2"), null);
  assert.equal(r.calls.length, 0);
});

test("C-ccc4a2fb S3: a stale draft reports the draft", async () => {
  const r = rig();
  r.load(record({ state: "draft", stale: true }));
  const error = await failure(startRun(r.deps, TENANT, request("r_s3")));
  assert.ok(error !== null);
  assert.equal(error.code, "INTERPRETER_VERSION_NOT_RUNNABLE");
  assert.equal(error.message, `flow "pay-once" version "${HASH}" is a draft`);
  assert.deepEqual(error.details, { reason: "draft" });
  assert.equal(await r.store.getRun(TENANT, "r_s3"), null);
  // a real refusal of S1 distinguishes this from a run that merely starts
  r.load(record({ stale: true }));
  assertStale(await failure(startRun(r.deps, TENANT, request("r_s3b"))), "stale");
});

test("C-ccc4a2fb S4: a version without stale starts and is enqueued once", async () => {
  const r = rig();
  const stale = rig();
  stale.load(record({ stale: true }));
  assertStale(await failure(startRun(stale.deps, TENANT, request("r_s4x"))), "stale");
  const run = await startRun(r.deps, TENANT, request("r_s4"));
  assert.equal(run.state, "queued");
  assert.equal(run.runId, "r_s4");
  assert.equal(r.calls.length, 1);
  assert.deepEqual(r.calls[0], { workflow: "ursitoare.run", workflowId: "tenant_a:r_s4" });
});

test("C-ccc4a2fb S5 and S6: staleness is reported before input and node-kind checks", async () => {
  const r = rig();
  r.load(record({ stale: true, flow: loadTestFlow("rf-1-core") }));
  assertStale(await failure(startRun(r.deps, TENANT, request("r_s5", { vendor: "Acme" }))), "S5");
  const base = loadTestFlow("rf-1-core") as Flow;
  const agent = {
    kind: "agent",
    input: {},
    goal: "g",
    tools: ["erp.lookup_vendor@1"],
    max_steps: 1,
    output_schema: { type: "object" },
    next: "route",
  };
  const flow = { ...base, nodes: { ...base.nodes, lookup: agent } } as unknown as Flow;
  r.load(record({ stale: true, flow }));
  assertStale(await failure(startRun(r.deps, TENANT, request("r_s6"))), "S6");
  assert.equal(await r.store.getRun(TENANT, "r_s5"), null);
  assert.equal(await r.store.getRun(TENANT, "r_s6"), null);
  assert.equal(r.calls.length, 0);
});
