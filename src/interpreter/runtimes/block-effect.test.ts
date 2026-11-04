import assert from "node:assert/strict";
import { test } from "node:test";

import type { BlockNode, JsonValue } from "../../authoring/index.ts";
import { NO_EFFECT_GATE, memoryWorkflowOps, nodeRuntimeFor } from "../index.ts";
import type {
  EffectDecision,
  EffectGate,
  MemoryWorkflowOps,
  NodeOutcome,
  NodeServices,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
  WorkflowOps,
} from "../index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";

const PAY_ARGS = { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" };
const PAID = { payment_id: "pay-1", status: "paid" };
const REUSED = { payment_id: "pay-0", status: "paid" };
const CATALOGUE = loadTestCatalogue();

const NODE: BlockNode = {
  kind: "block",
  uses: "erp.create_payment@1",
  with: PAY_ARGS,
  next: "done",
};

const CALL: ToolCall = { tool: "erp.create_payment@1", args: PAY_ARGS, nodeId: "pay", effectSeq: 0 };

function ctxFor(mode: "live" | "mock" | "stub"): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId: "pay",
    kind: "block",
    mode,
    attempt: 1,
    effect: "pay",
    unsafeToRetry: true,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: new Date("2026-11-02T10:00:00Z"),
  };
}

interface Rig {
  log: string[];
  ops: MemoryWorkflowOps;
  services: (effects: EffectGate, invoker: ToolInvoker) => NodeServices;
}

function rig(): Rig {
  const log: string[] = [];
  const base = memoryWorkflowOps("r_1");
  let current = "";
  const ops: WorkflowOps = {
    get workflowId() {
      return base.workflowId;
    },
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      return base.runStep(name, async () => {
        const previous = current;
        current = name;
        try {
          return await fn();
        } finally {
          current = previous;
        }
      });
    },
    sleep: (ms) => base.sleep(ms),
  };
  return {
    log,
    ops: base,
    services: (effects, invoker) => ({
      ops,
      invoker,
      effects,
      resolve: () => PAY_ARGS,
      block: (ref) => CATALOGUE.block(ref),
    }),
  };
}

function loggingGate(
  log: string[],
  decision: EffectDecision,
  failures: { before?: Error; after?: Error } = {},
): EffectGate {
  return {
    async before(call, ctx) {
      log.push(`before ${JSON.stringify([call, ctx])}`);
      if (failures.before) throw failures.before;
      return decision;
    },
    async after(call, ctx, result) {
      log.push(`after ${JSON.stringify([call, ctx, result])}`);
      if (failures.after) throw failures.after;
    },
  };
}

function loggingInvoker(
  log: string[],
  answer: ToolResult | Error,
  seen: StepContext[] = [],
): ToolInvoker {
  return {
    async invoke(call, ctx) {
      log.push(`invoke ${JSON.stringify([call, ctx])}`);
      seen.push(ctx);
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

function run(services: NodeServices, mode: "live" | "mock" | "stub" = "mock"): Promise<NodeOutcome> {
  const runtime = nodeRuntimeFor("block");
  assert.ok(runtime !== undefined, "no runtime registered for block");
  return runtime.execute(NODE, ctxFor(mode), services);
}

async function rejection(promise: Promise<NodeOutcome>): Promise<Error & { code?: string; node?: unknown }> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }
  assert.fail("expected a rejection");
}

const E_GATE = new Error("gate secret");

test("C-9d40929b an invoke decision runs before, invoke and after in order", async () => {
  const r = rig();
  const events: string[] = [];
  const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" });
  const invoker = loggingInvoker(events, { output: PAID });
  const outcome = await run(r.services(effects, invoker), "mock");
  const withKey = { ...ctxFor("mock"), idemKey: "ik_1" };
  assert.deepEqual(events, [
    `before ${JSON.stringify([CALL, ctxFor("mock")])}`,
    `invoke ${JSON.stringify([CALL, withKey])}`,
    `after ${JSON.stringify([CALL, withKey, { output: PAID }])}`,
  ]);
  assert.deepEqual(outcome, { output: PAID, outcome: null, next: "done", end: null });
  assert.deepEqual(r.ops.executed, ["pay", "pay#done"]);
});

test("C-9d40929b each gate call runs in the step named after the node", async () => {
  const steps: string[] = [];
  const r = rig();
  const base = r.services(NO_EFFECT_GATE, loggingInvoker([], { output: PAID }));
  const tagged: NodeServices = {
    ...base,
    effects: {
      async before(call, ctx) {
        steps.push("before");
        return NO_EFFECT_GATE.before(call, ctx);
      },
      async after(call, ctx, result) {
        steps.push("after");
        return NO_EFFECT_GATE.after(call, ctx, result);
      },
    },
  };
  await run(tagged);
  assert.deepEqual(steps, ["before", "after"]);
  assert.deepEqual(r.ops.executed, ["pay", "pay#done"]);
});

test("C-9d40929b a reuse decision skips the invoker and still calls after", async () => {
  const r = rig();
  const events: string[] = [];
  const effects = loggingGate(events, {
    action: "reuse",
    idemKey: "ik_1",
    result: { output: REUSED },
  });
  const outcome = await run(r.services(effects, loggingInvoker(events, { output: PAID })), "live");
  const withKey = { ...ctxFor("live"), idemKey: "ik_1" };
  assert.deepEqual(events, [
    `before ${JSON.stringify([CALL, ctxFor("live")])}`,
    `after ${JSON.stringify([CALL, withKey, { output: REUSED }])}`,
  ]);
  assert.deepEqual(outcome.output, REUSED);
  assert.equal(outcome.next, "done");
});

test("C-9d40929b an unknown decision fails the node after before only", async () => {
  const r = rig();
  const events: string[] = [];
  const effects = loggingGate(events, { action: "unknown", idemKey: "ik_1" });
  const error = await rejection(run(r.services(effects, loggingInvoker(events, { output: PAID }))));
  assert.equal(error.code, "INTERPRETER_EFFECT_UNKNOWN");
  assert.equal(error.node, "pay");
  assert.equal(events.length, 1);
  assert.ok(events[0]?.startsWith("before "));
  assert.deepEqual(r.ops.executed, ["pay"]);
});

test("C-9d40929b the no-effect gate invokes with a null idemKey", async () => {
  const r = rig();
  const seen: StepContext[] = [];
  const outcome = await run(r.services(NO_EFFECT_GATE, loggingInvoker([], { output: PAID }, seen)));
  assert.deepEqual(outcome.output, PAID);
  assert.equal(seen.length, 1);
  assert.equal(seen[0]?.idemKey, null);
  assert.deepEqual(seen[0], ctxFor("mock"));
});

test("C-9d40929b an invalid output still logs after and then is refused", async () => {
  const r = rig();
  const events: string[] = [];
  const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" });
  const invoker = loggingInvoker(events, { output: { payment_id: "p" } });
  const error = await rejection(run(r.services(effects, invoker)));
  assert.equal(error.code, "INTERPRETER_OUTPUT_INVALID");
  assert.equal(error.node, "pay");
  assert.ok(events[events.length - 1]?.startsWith("after "));
  assert.equal(events.filter((e) => e.startsWith("after ")).length, 1);
});

test("C-9d40929b a rejecting before maps to TOOL_FAILED without invoking", async () => {
  const r = rig();
  const events: string[] = [];
  const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" }, { before: E_GATE });
  const error = await rejection(run(r.services(effects, loggingInvoker(events, { output: PAID }))));
  assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
  assert.ok(!error.message.includes("gate secret"));
  assert.ok(!events.some((e) => e.startsWith("invoke ")));
  assert.deepEqual(r.ops.executed, ["pay"]);
});

test("C-9d40929b a rejecting after maps to TOOL_FAILED without the message", async () => {
  const r = rig();
  const events: string[] = [];
  const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" }, { after: E_GATE });
  const error = await rejection(run(r.services(effects, loggingInvoker(events, { output: PAID }))));
  assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
  assert.ok(!error.message.includes("gate secret"));
  assert.ok(events.some((e) => e.startsWith("after ")));
});

test("C-9d40929b a rejecting invoker maps to TOOL_FAILED and skips after", async () => {
  const r = rig();
  const events: string[] = [];
  const effects = loggingGate(events, { action: "invoke", idemKey: "ik_1" });
  const error = await rejection(
    run(r.services(effects, loggingInvoker(events, new Error("boom")))),
  );
  assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
  assert.ok(!error.message.includes("boom"));
  assert.ok(!events.some((e) => e.startsWith("after ")));
});
