import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  BlockNode,
  CodeNode,
  EndNode,
  JsonValue,
  SwitchNode,
  WaitNode,
} from "../../authoring/index.ts";
import { NO_EFFECT_GATE, memoryWorkflowOps, nodeRuntimeFor, resolveValue } from "../index.ts";
import type {
  EffectGate,
  EffectMode,
  MemoryWorkflowOps,
  NodeOutcome,
  NodeServices,
  StepContext,
  ToolCall,
  ToolInvoker,
  WorkflowOps,
} from "../index.ts";
import type { SandboxResult, WorkerSandbox } from "../../sandbox/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import type { NodeHooks, PreHookResult } from "./types.ts";

const CATALOGUE = loadTestCatalogue();
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const POST_OUT = { vendor_id: "v9", status: "active" };
const PAID = { payment_id: "pay-1", status: "paid" };
const PAY_ARGS = { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" };
const NORMALIZED = { amount: 120, currency: "EUR", is_large: false };

type PreAnswer = (input: JsonValue | null) => PreHookResult;

interface Spy {
  hooks: NodeHooks;
  pre: (JsonValue | null)[];
  post: { output: JsonValue | null; outcome: string | null; next: string | null }[];
}

function spy(log: string[], answer: PreAnswer = (input) => ({ action: "run", input })): Spy {
  const rec: Spy = {
    pre: [],
    post: [],
    hooks: {
      async pre(input) {
        log.push("pre");
        rec.pre.push(input);
        return answer(input);
      },
      async post(result) {
        log.push("post");
        rec.post.push(result);
        return { output: result.output };
      },
    },
  };
  return rec;
}

function ctx(nodeId: string, kind: StepContext["kind"], mode: EffectMode = "mock", attempt = 1): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "hooks",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId,
    kind,
    mode,
    attempt,
    effect: null,
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: new Date("2026-11-02T10:00:00Z"),
  };
}

function loggingOps(base: MemoryWorkflowOps, log: string[]): WorkflowOps {
  return {
    get workflowId() {
      return base.workflowId;
    },
    runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      return base.runStep(name, async () => {
        log.push(`step:${name}`);
        return fn();
      });
    },
    sleep: (ms) => base.sleep(ms),
  };
}

interface Seen {
  call: ToolCall;
}

function invoker(seen: Seen[], log: string[], answer: JsonValue): ToolInvoker {
  return {
    async invoke(call) {
      log.push("invoke");
      seen.push({ call });
      return { output: answer };
    },
  };
}

function services(
  ops: WorkflowOps,
  inv: ToolInvoker,
  hooks: NodeHooks,
  extra: { effects?: EffectGate; sandbox?: WorkerSandbox; scope?: JsonValue } = {},
): NodeServices {
  const inputs = extra.scope ?? { vendor: "Acme", mode: "a" };
  return {
    ops,
    invoker: inv,
    effects: extra.effects ?? NO_EFFECT_GATE,
    resolve: (value: unknown) => resolveValue(value, { inputs, nodes: new Map() }),
    block: (ref: string) => CATALOGUE.block(ref),
    ...(extra.sandbox === undefined ? {} : { sandbox: extra.sandbox }),
    hooks,
  } as NodeServices;
}

function run(kind: string, node: unknown, context: StepContext, s: NodeServices): Promise<NodeOutcome> {
  const runtime = nodeRuntimeFor(kind as "block");
  assert.ok(runtime !== undefined);
  return runtime.execute(node as BlockNode, context, s);
}

async function rejection(promise: Promise<unknown>): Promise<Error & { code?: string; details?: unknown }> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }
  assert.fail("expected a rejection");
}

const LOOKUP: BlockNode = {
  kind: "block",
  uses: "erp.lookup_vendor@1",
  with: { vendor_name: "${{ inputs.vendor }}" },
  next: "route",
};

test("C-2b34404c lookup runs on the input a pre-hook returns and posts its output", async () => {
  const log: string[] = [];
  const base = memoryWorkflowOps("r_1");
  const seen: Seen[] = [];
  const h = spy(log, () => ({ action: "run", input: { vendor_name: "Acme2" } }));
  h.hooks.post = async (result) => {
    h.post.push(result);
    return { output: POST_OUT };
  };
  const outcome = await run("block", LOOKUP, ctx("lookup", "block"), services(base, invoker(seen, log, LOOKUP_OK), h.hooks));
  assert.deepEqual(h.pre, [{ vendor_name: "Acme" }]);
  assert.deepEqual(seen.map((s) => s.call.args), [{ vendor_name: "Acme2" }]);
  assert.deepEqual(h.post, [{ output: LOOKUP_OK, outcome: null, next: "route" }]);
  assert.deepEqual(outcome.output, POST_OUT);
});

test("C-2b34404c an ill-typed pre-hook input is refused before the invoker", async () => {
  const log: string[] = [];
  const seen: Seen[] = [];
  const h = spy(log, () => ({ action: "run", input: { vendor: 1 } }));
  const error = await rejection(
    run("block", LOOKUP, ctx("lookup", "block"), services(memoryWorkflowOps("r_1"), invoker(seen, log, LOOKUP_OK), h.hooks)),
  );
  assert.deepEqual(h.pre, [{ vendor_name: "Acme" }]);
  assert.equal(error.code, "INTERPRETER_INPUT_INVALID");
  assert.deepEqual(error.details, { path: "/", keyword: "required" });
  assert.equal(seen.length, 0);
});

test("C-2b34404c a pre-hook skip does no read work and its output flows to post", async () => {
  const log: string[] = [];
  const seen: Seen[] = [];
  const h = spy(log, () => ({ action: "skip", output: POST_OUT }));
  const outcome = await run("block", LOOKUP, ctx("lookup", "block"), services(memoryWorkflowOps("r_1"), invoker(seen, log, LOOKUP_OK), h.hooks));
  assert.equal(h.pre.length, 1);
  assert.equal(seen.length, 0);
  assert.deepEqual(h.post, [{ output: POST_OUT, outcome: null, next: "route" }]);
  assert.deepEqual(outcome.output, POST_OUT);
});

const PAY: BlockNode = { kind: "block", uses: "erp.create_payment@1", with: PAY_ARGS, next: "done" };

function payGate(log: string[], calls: ToolCall[]): EffectGate {
  return {
    async before(call) {
      log.push("before");
      calls.push(call);
      return { action: "invoke", idemKey: null };
    },
    async after(call) {
      log.push("after");
      calls.push(call);
    },
  };
}

test("C-2b34404c pay runs pre inside its first step and post inside the done step", async () => {
  const log: string[] = [];
  const calls: ToolCall[] = [];
  const seen: Seen[] = [];
  const h = spy(log, (input) => ({
    action: "run",
    input: { ...(input as Record<string, JsonValue>), currency: "USD" },
  }));
  const s = services(loggingOps(memoryWorkflowOps("r_1"), log), invoker(seen, log, PAID), h.hooks, {
    effects: payGate(log, calls),
  });
  s.resolve = () => PAY_ARGS;
  await run("block", PAY, ctx("pay", "block"), s);
  assert.deepEqual(log, ["step:pay", "pre", "before", "invoke", "step:pay#done", "after", "post"]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0]?.args, { ...PAY_ARGS, currency: "USD" });
  assert.deepEqual(calls[1]?.args, { ...PAY_ARGS, currency: "USD" });
  assert.equal("generation" in (calls[0] as object), false);
});

test("C-2b34404c a block call carries generation attempt minus one above attempt 1", async () => {
  const log: string[] = [];
  const calls: ToolCall[] = [];
  const seen: Seen[] = [];
  const h = spy(log);
  const s = services(memoryWorkflowOps("r_1"), invoker(seen, log, PAID), h.hooks, {
    effects: payGate(log, calls),
  });
  s.resolve = () => PAY_ARGS;
  await run("block", PAY, ctx("pay", "block", "mock", 2), s);
  assert.equal(h.pre.length, 1);
  const gens = [...calls, ...seen.map((x) => x.call)].map((c) => (c as { generation?: number }).generation);
  assert.deepEqual(gens, [1, 1, 1]);
});

const NORM: CodeNode = {
  kind: "code",
  language: "js",
  source: "return input;",
  input: { amount: 1 },
  output_schema: {
    type: "object",
    properties: { amount: { type: "number" }, currency: { type: "string" }, is_large: { type: "boolean" } },
    required: ["amount", "currency", "is_large"],
  },
  next: "pay",
};

function recordingSandbox(inputs: unknown[]): WorkerSandbox {
  return {
    size: 1,
    respawns: 0,
    async run(_code, input): Promise<SandboxResult> {
      inputs.push(input);
      return { ok: true, value: NORMALIZED, stats: { ms: 1, memBytes: 0 } };
    },
    async close() {
      return undefined;
    },
  };
}

test("C-2b34404c a code node runs the sandbox on the pre-hook input", async () => {
  const log: string[] = [];
  const inputs: unknown[] = [];
  const h = spy(log, () => ({ action: "run", input: { amount: 5 } }));
  const s = services(memoryWorkflowOps("r_1"), invoker([], log, {}), h.hooks, { sandbox: recordingSandbox(inputs) });
  const outcome = await run("code", NORM, ctx("normalize", "code"), s);
  assert.deepEqual(h.pre, [{ amount: 1 }]);
  assert.deepEqual(inputs, [{ amount: 5 }]);
  assert.deepEqual(h.post, [{ output: NORMALIZED, outcome: null, next: "pay" }]);
  assert.deepEqual(outcome.output, NORMALIZED);
});

test("C-2b34404c a code skip does not call the sandbox and its output is posted", async () => {
  const log: string[] = [];
  const inputs: unknown[] = [];
  const skipped = { amount: 7, currency: "EUR", is_large: false };
  const h = spy(log, () => ({ action: "skip", output: skipped }));
  const s = services(memoryWorkflowOps("r_1"), invoker([], log, {}), h.hooks, { sandbox: recordingSandbox(inputs) });
  const outcome = await run("code", NORM, ctx("normalize", "code"), s);
  assert.equal(h.pre.length, 1);
  assert.deepEqual(inputs, []);
  assert.deepEqual(h.post, [{ output: skipped, outcome: null, next: "pay" }]);
  assert.deepEqual(outcome.output, skipped);
});

const GATE: SwitchNode = {
  kind: "switch",
  on: "${{ inputs.mode }}",
  cases: { a: "x" },
  default: "y",
};

test("C-2b34404c a switch decides on the pre-hook input", async () => {
  const log: string[] = [];
  const h = spy(log, () => ({ action: "run", input: { on: "b" } }));
  const outcome = await run("switch", GATE, ctx("gate", "switch"), services(memoryWorkflowOps("r_1"), invoker([], log, {}), h.hooks));
  assert.deepEqual(h.pre, [{ on: "a" }]);
  assert.equal(outcome.outcome, "default");
  assert.equal(outcome.next, "y");
  assert.deepEqual(h.post, [{ output: null, outcome: "default", next: "y" }]);
});

test("C-2b34404c a switch input without on is refused", async () => {
  const log: string[] = [];
  const h = spy(log, () => ({ action: "run", input: {} }));
  const error = await rejection(
    run("switch", GATE, ctx("gate", "switch"), services(memoryWorkflowOps("r_1"), invoker([], log, {}), h.hooks)),
  );
  assert.equal(error.code, "INTERPRETER_INPUT_INVALID");
  assert.deepEqual(error.details, { path: "/on", keyword: "required" });
  assert.deepEqual(h.pre, [{ on: "a" }]);
});

const WAIT: WaitNode = { kind: "wait", duration: "PT1H", next: "after" };

test("C-2b34404c a mock wait never sleeps and posts skipped from the wake step", async () => {
  const log: string[] = [];
  const base = memoryWorkflowOps("r_1");
  const h = spy(log, () => ({ action: "run", input: { duration: "PT2H" } }));
  await run("wait", WAIT, ctx("w", "wait"), services(loggingOps(base, log), invoker([], log, {}), h.hooks));
  assert.deepEqual(h.pre, [{ duration: "PT1H" }]);
  assert.deepEqual(base.slept, []);
  assert.deepEqual(h.post, [{ output: null, outcome: "skipped", next: "after" }]);
  assert.deepEqual(log, ["step:w", "pre", "step:w#wake", "post"]);
});

test("C-2b34404c a live wait sleeps the pre-hook duration", async () => {
  const log: string[] = [];
  const base = memoryWorkflowOps("r_1");
  const h = spy(log, () => ({ action: "run", input: { duration: "PT2H" } }));
  await run("wait", WAIT, ctx("w", "wait", "live"), services(base, invoker([], log, {}), h.hooks));
  assert.deepEqual(base.slept, [7_200_000]);
  assert.equal(h.post.length, 1);
});

const END: EndNode = {
  kind: "end",
  status: "completed",
  output: { payment_id: "${{ inputs.pid }}" },
};

test("C-2b34404c an end uses the input a pre-hook returns as its output", async () => {
  const log: string[] = [];
  const h = spy(log, () => ({ action: "run", input: { payment_id: "pay-2" } }));
  const s = services(memoryWorkflowOps("r_1"), invoker([], log, {}), h.hooks, { scope: { pid: "pay-1" } });
  const outcome = await run("end", END, ctx("done", "end"), s);
  assert.deepEqual(h.pre, [{ payment_id: "pay-1" }]);
  assert.deepEqual(outcome.output, { payment_id: "pay-2" });
});

test("C-2b34404c an end with no output hands null to pre", async () => {
  const log: string[] = [];
  const h = spy(log, () => ({ action: "run", input: { x: 1 } }));
  const node: EndNode = { kind: "end", status: "completed" };
  const outcome = await run("end", node, ctx("done", "end"), services(memoryWorkflowOps("r_1"), invoker([], log, {}), h.hooks));
  assert.deepEqual(h.pre, [null]);
  assert.deepEqual(outcome.output, { x: 1 });
});
