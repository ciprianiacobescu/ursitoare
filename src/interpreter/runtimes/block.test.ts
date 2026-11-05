import assert from "node:assert/strict";
import { test } from "node:test";

import type { BlockNode, JsonValue } from "../../authoring/index.ts";
import { memoryWorkflowOps, nodeRuntimeFor, resolveValue } from "../index.ts";
import type {
  EffectGate,
  MemoryWorkflowOps,
  NodeOutcome,
  NodeRuntime,
  NodeServices,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "../index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";

const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const CATALOGUE = loadTestCatalogue();

const NODE: BlockNode = {
  kind: "block",
  uses: "erp.lookup_vendor@1",
  with: { vendor_name: "${{ inputs.vendor }}" },
  next: "route",
};

function ctx(nodeId: string): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId,
    kind: "block",
    mode: "mock",
    attempt: 1,
    effect: "read",
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: new Date("2026-11-02T10:00:00Z"),
  };
}

interface Logged {
  call: ToolCall;
  ctx: StepContext;
}

function invokerAnswering(answer: ToolResult | Error): ToolInvoker & { log: Logged[] } {
  const log: Logged[] = [];
  return {
    log,
    async invoke(call, context) {
      log.push({ call, ctx: context });
      if (answer instanceof Error) {
        throw answer;
      }
      return answer;
    },
  };
}

function gate(): EffectGate & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async before() {
      calls.push("before");
      return { action: "invoke", idemKey: null };
    },
    async after() {
      calls.push("after");
    },
  };
}

function servicesFor(
  ops: MemoryWorkflowOps,
  invoker: ToolInvoker,
  effects: EffectGate,
  vendor: JsonValue,
  known = true,
): NodeServices {
  return {
    ops,
    invoker,
    effects,
    resolve(value: unknown): JsonValue {
      return resolveValue(value, { inputs: { vendor }, nodes: new Map() });
    },
    block(ref: string) {
      return known ? CATALOGUE.block(ref) : undefined;
    },
  };
}

function runtime(): NodeRuntime {
  const found = nodeRuntimeFor("block");
  assert.ok(found !== undefined, "no runtime registered for block");
  return found;
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

test("C-99fa375d a read block calls the invoker once and returns its output", async () => {
  const ops = memoryWorkflowOps("r_1");
  const invoker = invokerAnswering({ output: LOOKUP_OK });
  const effects = gate();
  const outcome = await runtime().execute(
    NODE,
    ctx("lookup"),
    servicesFor(ops, invoker, effects, "Acme"),
  );
  assert.deepEqual(outcome, { output: LOOKUP_OK, outcome: null, next: "route", end: null });
  assert.deepEqual(ops.executed, ["lookup"]);
  assert.deepEqual(invoker.log, [
    {
      call: {
        tool: "erp.lookup_vendor@1",
        args: { vendor_name: "Acme" },
        nodeId: "lookup",
        effectSeq: 0,
      },
      ctx: ctx("lookup"),
    },
  ]);
  assert.deepEqual(effects.calls, []);
});

test("C-99fa375d an ill-typed input is refused before any invoker call", async () => {
  const invoker = invokerAnswering({ output: LOOKUP_OK });
  const error = await rejection(
    runtime().execute(
      NODE,
      ctx("lookup"),
      servicesFor(memoryWorkflowOps("r_1"), invoker, gate(), 5),
    ),
  );
  assert.equal(error.code, "INTERPRETER_INPUT_INVALID");
  assert.equal(error.node, "lookup");
  assert.equal(invoker.log.length, 0);
});

test("C-99fa375d an output that breaks the schema is refused", async () => {
  const error = await rejection(
    runtime().execute(
      NODE,
      ctx("lookup"),
      servicesFor(
        memoryWorkflowOps("r_1"),
        invokerAnswering({ output: { status: "active" } }),
        gate(),
        "Acme",
      ),
    ),
  );
  assert.equal(error.code, "INTERPRETER_OUTPUT_INVALID");
  assert.equal(error.node, "lookup");
});

test("C-99fa375d a rejecting invoker becomes TOOL_FAILED without its message", async () => {
  const error = await rejection(
    runtime().execute(
      NODE,
      ctx("lookup"),
      servicesFor(
        memoryWorkflowOps("r_1"),
        invokerAnswering(new Error("db password=hunter2")),
        gate(),
        "Acme",
      ),
    ),
  );
  assert.equal(error.code, "INTERPRETER_TOOL_FAILED");
  assert.equal(error.node, "lookup");
  assert.ok(!error.message.includes("hunter2"));
});

test("C-99fa375d a block missing from the services is not runnable", async () => {
  const error = await rejection(
    runtime().execute(
      NODE,
      ctx("lookup"),
      servicesFor(
        memoryWorkflowOps("r_1"),
        invokerAnswering({ output: LOOKUP_OK }),
        gate(),
        "Acme",
        false,
      ),
    ),
  );
  assert.equal(error.code, "INTERPRETER_VERSION_NOT_RUNNABLE");
  assert.equal(error.node, "lookup");
});
