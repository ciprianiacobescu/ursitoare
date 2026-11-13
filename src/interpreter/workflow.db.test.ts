import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, JsonValue } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { launchDurable } from "../durable/index.ts";
import type { DurableRuntime, StepObserver, WorkflowState } from "../durable/index.ts";
import { createLogger } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createRunStore } from "../runs/index.ts";
import type { TenantContext } from "../runs/index.ts";
import {
  bindInterpreter,
  NO_EFFECT_GATE,
  registerRunWorkflow,
  RUN_WORKFLOW,
  startRun,
  workflowIdOf,
} from "./index.ts";
import type { InterpreterDeps, ToolInvoker } from "./index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { waitForRun } from "../../test/support/run-wait.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

const silent: LogDestination = {
  write(): void {
    // discarded
  },
};

const ALICE = { userId: "u_alice", kind: "human" } as const;
const HASH = `sha256:${"a".repeat(64)}`;
const INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };

const FLOW: Flow = {
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

const INVOKER: ToolInvoker = {
  async invoke(call) {
    if (call.tool === "erp.lookup_vendor@1") {
      return { output: LOOKUP_OK };
    }
    return { output: PAID };
  },
};

const TERMINAL: readonly WorkflowState[] = [
  "SUCCESS",
  "ERROR",
  "CANCELLED",
  "MAX_RECOVERY_ATTEMPTS_EXCEEDED",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function finalState(rt: DurableRuntime, id: string): Promise<WorkflowState> {
  const deadline = Date.now() + 20000;
  for (;;) {
    const info = await rt.status(id);
    if (info !== null && TERMINAL.includes(info.state)) {
      return info.state;
    }
    if (Date.now() >= deadline) {
      assert.fail(`workflow ${id} did not finish`);
    }
    await delay(20);
  }
}

test("C-b56c7793 a started run completes on DBOS and bad workflow input ends in ERROR", async () => {
  const db = await withTestDatabase();
  const logger = createLogger({ level: "silent", destination: silent });
  const observed: [string, string][] = [];
  const observer: StepObserver = (phase, step, workflowId) => {
    if (phase === "after") {
      observed.push([workflowId, step]);
    }
  };
  let runtime: DurableRuntime | undefined;
  try {
    const { a } = await seedTwoTenants(db);
    const tenant: TenantContext = { tenantId: a.tenantId, reviewProfile: "solo" };
    const store = createRunStore(db.appPool);
    const deps: InterpreterDeps = {
      store,
      durable: null,
      loadVersion: async (_ctx, flowId) =>
        flowId === "pay-once"
          ? { flowId, hash: HASH, state: "validated", ownerTeam: "finance", flow: FLOW }
          : null,
      catalogueFor: async () => loadTestCatalogue(),
      invokerFor: async () => INVOKER,
      effects: NO_EFFECT_GATE,
      clock: fixedClock("2026-11-02T10:00:00Z"),
      ids: sequentialIds(0),
    };

    assert.doesNotThrow(() => {
      registerRunWorkflow();
      registerRunWorkflow();
      bindInterpreter(deps);
    });

    const rt = await launchDurable({
      endpoint: db.appEndpoint,
      logger,
      pollingIntervalMs: 20,
      stepObserver: observer,
    });
    runtime = rt;

    const workflowId = workflowIdOf(tenant.tenantId, "r_dbos_1");
    await assert.doesNotReject(async () => {
      await startRun({ ...deps, durable: rt }, tenant, {
        flowId: "pay-once",
        hash: HASH,
        mode: "mock",
        input: INPUT,
        mocks: null,
        principal: ALICE,
        actorChain: [],
        runId: "r_dbos_1",
      });
    });

    const run = await waitForRun(store, tenant, "r_dbos_1", ["completed", "failed"]);
    assert.equal(run.state, "completed");
    // The run row turns completed inside the run:finish step, before that step's "after" observer fires; the workflow
    // reaches SUCCESS only after the step returns, so wait for it before reading the observed steps.
    assert.equal(await finalState(rt, workflowId), "SUCCESS");
    assert.deepEqual(
      observed.filter(([id]) => id === workflowId).map(([, step]) => step),
      ["run:load", "run:start", "lookup", "route", "pay", "pay#done", "done", "run:finish"],
    );
    const steps = await store.listSteps(tenant, "r_dbos_1", { limit: 50 });
    assert.deepEqual(
      steps.steps.map((s) => s.seq),
      [0, 1, 2, 3],
    );

    const bad: Record<string, JsonValue>[] = [
      { tenantId: "bad tenant", runId: "r_1", reviewProfile: "solo" },
      { tenantId: "tenant_a", runId: "../r", reviewProfile: "solo" },
      { tenantId: "tenant_a", runId: "r_1", reviewProfile: "other" },
    ];
    const before = await store.listSteps(tenant, "r_dbos_1", { limit: 50 });
    for (const [i, input] of bad.entries()) {
      const id = `bad-input-${String(i)}`;
      await rt.enqueue(RUN_WORKFLOW, id, input);
      assert.equal(await finalState(rt, id), "ERROR");
    }
    assert.deepEqual(await store.listSteps(tenant, "r_dbos_1", { limit: 50 }), before);
    assert.deepEqual(await store.getRun(tenant, "r_dbos_1"), run);
    assert.equal(await store.getRun(tenant, "r_1"), null);
  } finally {
    await runtime?.shutdown().catch(() => undefined);
    await db.close();
  }
});
