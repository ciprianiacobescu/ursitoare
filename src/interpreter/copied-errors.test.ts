import assert from "node:assert/strict";
import { test } from "node:test";

import type { BlockNode, Flow } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createMemoryRunStore } from "../runs/index.ts";
import type { TenantContext } from "../runs/index.ts";
import {
  executeRun,
  memoryWorkflowOps,
  nodeRuntimeFor,
  NO_EFFECT_GATE,
  startRun,
} from "./index.ts";
import type {
  InterpreterDeps,
  NodeRuntime,
  NodeServices,
  StepContext,
  ToolInvoker,
} from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const HASH = `sha256:${"a".repeat(64)}`;
const CATALOGUE = loadTestCatalogue();

const COPY_CODE = "INTERPRETER_INPUT_INVALID";
const COPY_DETAILS = { path: "/vendor_name", keyword: "type" };
const COPIED = {
  name: "InterpreterError",
  message: `input of "lookup" does not match the block schema`,
  code: COPY_CODE,
  node: "lookup",
  details: COPY_DETAILS,
};

const NODE: BlockNode = {
  kind: "block",
  uses: "erp.lookup_vendor@1",
  with: { vendor_name: "${{ inputs.vendor }}" },
  next: "route",
};

function ctx(nodeId: string): StepContext {
  return {
    tenant: T_A,
    runId: "r_1",
    lineageId: "r_1",
    flowId: "copy-fail",
    flowHash: HASH,
    nodeId,
    kind: "block",
    mode: "mock",
    attempt: 1,
    effect: "read",
    unsafeToRetry: false,
    idemKey: null,
    principal: ALICE,
    now: new Date("2026-11-02T10:00:00Z"),
  };
}

function blockRuntime(): NodeRuntime {
  const found = nodeRuntimeFor("block");
  assert.ok(found !== undefined, "no runtime registered for block");
  return found;
}

function services(invoker: ToolInvoker): NodeServices {
  return {
    ops: memoryWorkflowOps("r_1"),
    invoker,
    effects: NO_EFFECT_GATE,
    resolve: () => ({ vendor_name: "Acme" }),
    block: (ref) => CATALOGUE.block(ref),
  };
}

function thrown(error: unknown): Record<string, unknown> {
  assert.ok(typeof error === "object" && error !== null, "the rejection holds no value");
  return error as Record<string, unknown>;
}

function detailsOf(value: unknown): unknown {
  return (value as { details?: unknown } | null)?.details;
}

function copiedFlow(): Flow {
  return {
    ursitoare: "0.1",
    flow: "copy-fail",
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: { vendor: { type: "string" } },
      required: ["vendor"],
    },
    start: "lookup",
    nodes: {
      lookup: {
        kind: "block",
        uses: "erp.lookup_vendor@1",
        with: { vendor_name: "${{ inputs.vendor }}" },
        next: "done",
      },
      done: { kind: "end", status: "completed" },
    },
  };
}

test("C-3414e2db the block runtime keeps a copied interpreter error", async () => {
  const invoker: ToolInvoker = {
    async invoke() {
      throw COPIED;
    },
  };

  let caught: unknown;
  try {
    await blockRuntime().execute(NODE, ctx("lookup"), services(invoker));
  } catch (error) {
    caught = error;
  }

  const failure = thrown(caught);
  assert.equal(failure["code"], COPY_CODE);
  assert.notEqual(failure["code"], "INTERPRETER_TOOL_FAILED");
  assert.equal(failure["node"], "lookup");
  assert.equal(failure["message"], COPIED.message);
  assert.deepEqual(failure["details"], COPY_DETAILS);
});

test("C-e3cb0a11 C-3414e2db a copied interpreter error fails the run with its own code node and details", async () => {
  const store = createMemoryRunStore();
  const flow = copiedFlow();
  const deps: InterpreterDeps = {
    store,
    durable: null,
    loadVersion: async (_ctx, flowId) =>
      flowId === flow.flow
        ? { flowId: flow.flow, hash: HASH, state: "validated", ownerTeam: "finance", flow }
        : null,
    catalogueFor: async () => CATALOGUE,
    invokerFor: async () => ({
      async invoke() {
        throw COPIED;
      },
    }),
    effects: NO_EFFECT_GATE,
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
  };

  await startRun(deps, T_A, {
    flowId: flow.flow,
    hash: HASH,
    mode: "mock",
    input: { vendor: "Acme" },
    mocks: null,
    principal: ALICE,
    actorChain: [ALICE.userId],
    runId: "r_copy",
  });

  const run = await executeRun(memoryWorkflowOps("r_copy"), deps, T_A, "r_copy");
  assert.equal(run.state, "failed");
  assert.ok(run.error !== null);
  assert.equal(run.error.code, COPY_CODE);
  assert.notEqual(run.error.code, "INTERPRETER_TOOL_FAILED");
  assert.equal(run.error.node, "lookup");
  assert.equal(run.error.message, COPIED.message);
  assert.deepEqual(detailsOf(run.error), COPY_DETAILS);
  assert.equal(run.terminalNode, "lookup");

  const listed = await store.listSteps(T_A, "r_copy", { limit: 100 });
  assert.equal(listed.steps.length, 1);
  const row = listed.steps[0];
  assert.ok(row !== undefined);
  assert.equal(row.nodeId, "lookup");
  assert.equal(row.state, "failed");
  assert.ok(row.error !== null);
  assert.equal(row.error.code, COPY_CODE);
  assert.equal(row.error.node, "lookup");
  assert.equal(row.error.message, COPIED.message);
  assert.deepEqual(detailsOf(row.error), COPY_DETAILS);
});
