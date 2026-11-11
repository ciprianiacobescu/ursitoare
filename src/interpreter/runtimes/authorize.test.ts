import assert from "node:assert/strict";
import { test } from "node:test";

import type { BlockNode, JsonValue } from "../../authoring/index.ts";
import { InterpreterError, toInterpreterError } from "../errors.ts";
import { memoryWorkflowOps, nodeRuntimeFor, resolveValue } from "../index.ts";
import type { MemoryWorkflowOps } from "../index.ts";
import type {
  CallAuthorization,
  EffectGate,
  NodeOutcome,
  NodeServices,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
  WorkflowOps,
} from "../types.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";

const LOOKUP_OK = { vendor_id: "V-ACME", status: "active" };
const PAID = { payment_id: "pay_1", status: "paid" };
const CATALOGUE = loadTestCatalogue();

const LOOKUP_NODE: BlockNode = {
  kind: "block",
  uses: "erp.lookup_vendor@1",
  with: { vendor_name: "Acme GmbH" },
  next: "pay",
};

const PAY_NODE: BlockNode = {
  kind: "block",
  uses: "erp.create_payment@1",
  with: { vendor_id: "V-ACME", amount: 12.5, currency: "EUR", reference: "inv-1" },
  next: "done",
};

const PERMIT = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: `sha256:${"b".repeat(64)}`,
  serviceId: "S_1",
  ttlSeconds: 60,
};

const ANSWER: CallAuthorization = { decisionId: "dec_1", permit: PERMIT };

function ctxFor(nodeId: string, effect: "read" | "pay"): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "read-then-pay",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId,
    kind: "block",
    mode: "mock",
    attempt: 1,
    effect,
    unsafeToRetry: effect !== "read",
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: new Date("2026-11-06T10:00:00Z"),
  };
}

function recordingOps(runId: string): MemoryWorkflowOps & { values: JsonValue[] } {
  const base = memoryWorkflowOps(runId);
  const values: JsonValue[] = [];
  return {
    get workflowId() {
      return base.workflowId;
    },
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      const value = await base.runStep(name, fn);
      values.push(structuredClone(value));
      return value;
    },
    async sleep(ms) {
      await base.sleep(ms);
    },
    get executed(): readonly string[] {
      return base.executed;
    },
    get slept(): readonly number[] {
      return base.slept;
    },
    values,
  };
}

function invokingGate(idemKey: string | null): EffectGate & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async before() {
      calls.push("before");
      return { action: "invoke", idemKey };
    },
    async after() {
      calls.push("after");
    },
  };
}

type AuthorizeCtx = StepContext & {
  taint?: readonly string[];
  authorization?: CallAuthorization;
  approvals?: readonly never[];
};

interface Seen {
  phase: "authorize" | "invoke";
  call: ToolCall;
  ctx: AuthorizeCtx;
}

function invokerWithAuthorize(options: {
  invokeAnswer: ToolResult;
  authorizeAnswer: CallAuthorization;
  authorizeFailure?: unknown;
}): ToolInvoker & { seen: Seen[] } {
  const seen: Seen[] = [];
  return {
    seen,
    async invoke(call: ToolCall, ctx: StepContext) {
      seen.push({ phase: "invoke", call, ctx });
      return options.invokeAnswer;
    },
    async authorize(call: ToolCall, ctx: StepContext) {
      seen.push({ phase: "authorize", call, ctx });
      if (options.authorizeFailure !== undefined) throw options.authorizeFailure;
      return options.authorizeAnswer;
    },
  } as ToolInvoker & { seen: Seen[] };
}

function plainInvoker(answer: ToolResult): ToolInvoker & { seen: AuthorizeCtx[] } {
  const seen: AuthorizeCtx[] = [];
  return {
    seen,
    async invoke(_call, ctx) {
      seen.push(ctx);
      return answer;
    },
  } as ToolInvoker & { seen: AuthorizeCtx[] };
}

interface ServicesOptions {
  ops: WorkflowOps;
  invoker: ToolInvoker;
  effects: EffectGate;
  inputTaint?: () => readonly string[];
  decided?: (decisionId: string) => void;
}

function servicesFor(options: ServicesOptions): NodeServices {
  return {
    ops: options.ops,
    invoker: options.invoker,
    effects: options.effects,
    resolve(value: unknown): JsonValue {
      return resolveValue(value, { inputs: {}, nodes: new Map() });
    },
    block(ref: string) {
      return CATALOGUE.block(ref);
    },
    ...(options.inputTaint === undefined ? {} : { inputTaint: options.inputTaint }),
    ...(options.decided === undefined ? {} : { decided: options.decided }),
  } as NodeServices;
}

function runtime() {
  const found = nodeRuntimeFor("block");
  assert.ok(found !== undefined, "no runtime registered for block");
  return found;
}

async function rejection(promise: Promise<NodeOutcome>): Promise<InterpreterError> {
  try {
    await promise;
  } catch (error) {
    const copied = toInterpreterError(error);
    if (copied !== null) return copied;
    assert.fail(`expected an InterpreterError, got ${String(error)}`);
  }
  assert.fail("expected a rejection");
}

function phaseLog(invoker: { seen: Seen[] }): string[] {
  return invoker.seen.map((entry) => entry.phase);
}

test("C-05285483 pay authorizes inside its first step before the gate and records the decision id", async () => {
  const ops = recordingOps("r_1");
  const gate = invokingGate("ik_pay_1");
  const invoker = invokerWithAuthorize({
    invokeAnswer: { output: PAID },
    authorizeAnswer: ANSWER,
  });
  const decided: string[] = [];
  const outcome = await runtime().execute(
    PAY_NODE,
    ctxFor("pay", "pay"),
    servicesFor({
      ops,
      invoker,
      effects: gate,
      inputTaint: () => ["extracted"],
      decided: (id) => {
        decided.push(id);
      },
    }),
  );
  assert.deepEqual(outcome, { output: PAID, outcome: null, next: "done", end: null });
  assert.deepEqual(ops.executed, ["pay", "pay#done"]);
  assert.deepEqual(gate.calls, ["before", "after"]);
  assert.deepEqual(phaseLog(invoker), ["authorize", "invoke"]);
  assert.deepEqual(invoker.seen[0]?.call, {
    tool: "erp.create_payment@1",
    args: { vendor_id: "V-ACME", amount: 12.5, currency: "EUR", reference: "inv-1" },
    nodeId: "pay",
    effectSeq: 0,
  });
  assert.deepEqual(invoker.seen[0]?.ctx, { ...ctxFor("pay", "pay"), taint: ["extracted"] });
  assert.deepEqual(invoker.seen[1]?.ctx, {
    ...ctxFor("pay", "pay"),
    idemKey: "ik_pay_1",
    authorization: ANSWER,
  });
  assert.deepEqual(ops.values[0], { output: PAID, idemKey: "ik_pay_1", decisionId: "dec_1" });
  assert.deepEqual(ops.values[1], null);
  assert.deepEqual(decided, ["dec_1"]);
  const plainOps = recordingOps("r_2");
  const plainGate = invokingGate("ik_pay_1");
  const plain = plainInvoker({ output: PAID });
  const plainDecided: string[] = [];
  const plainOutcome = await runtime().execute(
    PAY_NODE,
    ctxFor("pay", "pay"),
    servicesFor({
      ops: plainOps,
      invoker: plain,
      effects: plainGate,
      decided: (id) => {
        plainDecided.push(id);
      },
    }),
  );
  assert.deepEqual(plainOutcome, { output: PAID, outcome: null, next: "done", end: null });
  assert.deepEqual(plainOps.executed, ["pay", "pay#done"]);
  assert.deepEqual(plainOps.values[0], { output: PAID, idemKey: "ik_pay_1" });
  const m5Invoke = plain.seen[0];
  assert.ok(m5Invoke !== undefined);
  assert.ok(!("authorization" in m5Invoke));
  assert.ok(!("taint" in m5Invoke));
  assert.ok(!("approvals" in m5Invoke));
  assert.deepEqual(plainDecided, []);
});

test("C-05285483 lookup authorizes with an undefined taint and marks its step value", async () => {
  const ops = recordingOps("r_1");
  const gate = invokingGate(null);
  const invoker = invokerWithAuthorize({
    invokeAnswer: { output: LOOKUP_OK },
    authorizeAnswer: { decisionId: "dec_2", permit: PERMIT },
  });
  const decided: string[] = [];
  const outcome = await runtime().execute(
    LOOKUP_NODE,
    ctxFor("lookup", "read"),
    servicesFor({
      ops,
      invoker,
      effects: gate,
      decided: (id) => {
        decided.push(id);
      },
    }),
  );
  assert.deepEqual(outcome, { output: LOOKUP_OK, outcome: null, next: "pay", end: null });
  assert.deepEqual(ops.executed, ["lookup"]);
  assert.deepEqual(gate.calls, []);
  assert.deepEqual(phaseLog(invoker), ["authorize", "invoke"]);
  assert.deepEqual(invoker.seen[0]?.call, {
    tool: "erp.lookup_vendor@1",
    args: { vendor_name: "Acme GmbH" },
    nodeId: "lookup",
    effectSeq: 0,
  });
  assert.deepEqual(invoker.seen[0]?.ctx, { ...ctxFor("lookup", "read"), taint: undefined });
  assert.deepEqual(invoker.seen[1]?.ctx, {
    ...ctxFor("lookup", "read"),
    authorization: { decisionId: "dec_2", permit: PERMIT },
  });
  assert.deepEqual(ops.values, [{ output: LOOKUP_OK, decisionId: "dec_2" }]);
  assert.deepEqual(decided, ["dec_2"]);
  const plainOps = recordingOps("r_2");
  const plain = plainInvoker({ output: LOOKUP_OK });
  const plainDecided: string[] = [];
  const plainOutcome = await runtime().execute(
    LOOKUP_NODE,
    ctxFor("lookup", "read"),
    servicesFor({
      ops: plainOps,
      invoker: plain,
      effects: invokingGate(null),
      decided: (id) => {
        plainDecided.push(id);
      },
    }),
  );
  assert.deepEqual(plainOutcome, { output: LOOKUP_OK, outcome: null, next: "pay", end: null });
  assert.deepEqual(plainOps.executed, ["lookup"]);
  assert.deepEqual(plainOps.values, [LOOKUP_OK]);
  const m5Invoke = plain.seen[0];
  assert.ok(m5Invoke !== undefined);
  assert.ok(!("authorization" in m5Invoke));
  assert.ok(!("taint" in m5Invoke));
  assert.ok(!("approvals" in m5Invoke));
  assert.deepEqual(plainDecided, []);
});

test("C-05285483 an authorize denial ends the step before the gate and invoke", async () => {
  const ops = recordingOps("r_1");
  const gate = invokingGate("ik_pay_1");
  const invoker = invokerWithAuthorize({
    invokeAnswer: { output: PAID },
    authorizeAnswer: ANSWER,
    authorizeFailure: {
      code: "INTERPRETER_TOOL_DENIED",
      message: 'tool call of "pay" is not permitted (policy)',
      node: "pay",
      details: { reason: "policy", decisionId: "dec_3" },
    },
  });
  const decided: string[] = [];
  const error = await rejection(
    runtime().execute(
      PAY_NODE,
      ctxFor("pay", "pay"),
      servicesFor({
        ops,
        invoker,
        effects: gate,
        decided: (id) => {
          decided.push(id);
        },
      }),
    ),
  );
  assert.equal(error.code, "INTERPRETER_TOOL_DENIED");
  assert.equal(error.message, 'tool call of "pay" is not permitted (policy)');
  assert.equal(error.node, "pay");
  assert.deepEqual(error.details, { reason: "policy", decisionId: "dec_3" });
  assert.deepEqual(phaseLog(invoker), ["authorize"]);
  assert.deepEqual(gate.calls, []);
  assert.deepEqual(ops.values, []);
  assert.deepEqual(decided, []);
});

test("C-05285483 a replayed pay calls decided with its recorded decision id", async () => {
  const fresh = recordingOps("r_1");
  const freshInvoker = invokerWithAuthorize({
    invokeAnswer: { output: PAID },
    authorizeAnswer: ANSWER,
  });
  await runtime().execute(
    PAY_NODE,
    ctxFor("pay", "pay"),
    servicesFor({
      ops: fresh,
      invoker: freshInvoker,
      effects: invokingGate("ik_pay_1"),
      inputTaint: () => ["extracted"],
    }),
  );
  const recorded = fresh.values;
  assert.deepEqual(recorded[0], { output: PAID, idemKey: "ik_pay_1", decisionId: "dec_1" });
  assert.deepEqual(recorded[1], null);
  const ops = memoryWorkflowOps("r_1", recorded);
  const gate = invokingGate("ik_pay_1");
  const invoker = invokerWithAuthorize({
    invokeAnswer: { output: PAID },
    authorizeAnswer: ANSWER,
  });
  const decided: string[] = [];
  const outcome = await runtime().execute(
    PAY_NODE,
    ctxFor("pay", "pay"),
    servicesFor({
      ops,
      invoker,
      effects: gate,
      decided: (id) => {
        decided.push(id);
      },
    }),
  );
  assert.deepEqual(outcome, { output: PAID, outcome: null, next: "done", end: null });
  assert.deepEqual(ops.executed, []);
  assert.deepEqual(gate.calls, []);
  assert.deepEqual(invoker.seen, []);
  assert.deepEqual(decided, ["dec_1"]);
});

test("C-05285483 toInterpreterError accepts the INTERPRETER_TOOL_DENIED code", () => {
  const copied = toInterpreterError({
    code: "INTERPRETER_TOOL_DENIED",
    message: 'tool call of "pay" is not permitted (policy)',
    node: "pay",
    details: { reason: "policy", decisionId: "dec_3" },
  });
  assert.ok(copied instanceof InterpreterError);
  assert.equal(copied.code, "INTERPRETER_TOOL_DENIED");
  assert.equal(copied.node, "pay");
  assert.deepEqual(copied.details, { reason: "policy", decisionId: "dec_3" });
});
