import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow, HookDef } from "../authoring/index.ts";
import {
  PAY_ONCE_PAID_OUTPUT,
  payOnceCatalogue,
  payOnceVersion,
} from "../../test/support/crash/pay-once.ts";
import { InterpreterError } from "./errors.ts";
import { checkMocks, createMockInvoker } from "./mocks.ts";
import type { MockProblem, TestMocks } from "./mocks.ts";
import type { StepContext, ToolCall } from "./types.ts";

const LOOKUP = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const HASH = `sha256:${"a".repeat(64)}`;

const AUDIT: HookDef = {
  id: "audit",
  kind: "block",
  uses: "invoices.get@1",
  with: { invoice_id: "${{ inputs.invoice }}" },
};
const NOTIFY: HookDef = {
  id: "notify",
  kind: "block",
  uses: "slack.post_message@1",
  with: { channel: "#ap", text: "${{ hook.node.id }} paid ${{ hook.output.payment_id }}" },
};
const TAG: HookDef = { id: "tag", kind: "code", source: "return;" };

function hooked(extraNodes: Record<string, unknown> = {}, extraPost: HookDef[] = []): Flow {
  const flow = payOnceVersion().flow;
  const pay = flow.nodes["pay"];
  if (pay === undefined || pay.kind !== "block") {
    throw new Error("pay-once has no pay block");
  }
  return {
    ...flow,
    hooks: [{ id: "audit", match: { nodes: ["lookup"] }, pre: AUDIT }],
    nodes: {
      ...flow.nodes,
      pay: { ...pay, post: [NOTIFY, TAG, ...extraPost] },
      ...extraNodes,
    },
  } as unknown as Flow;
}

const FULL: TestMocks = {
  lookup: [{ output: LOOKUP }],
  pay: [{ output: PAID }],
  "lookup:pre:rule.audit": [{ output: { invoice_id: "inv-1", raw_text: "t" } }],
  "pay:post:notify": [{ output: { ts: "1.0" } }],
};

function check(flow: Flow, mocks: unknown): { mocks: TestMocks | null; problems: MockProblem[] } {
  let value: { mocks: TestMocks | null; problems: MockProblem[] } | undefined;
  assert.doesNotThrow(() => {
    value = checkMocks(flow, payOnceCatalogue(), mocks);
  });
  assert.ok(value !== undefined, "checkMocks answered");
  return value;
}

function rows(problems: readonly MockProblem[]): string[] {
  return problems.map((p) => `${p.nodeId} ${p.index === null ? "null" : String(p.index)} ${p.reason}`);
}

test("C-81ab0867: a full set of hook mocks passes and is copied", () => {
  const result = check(hooked(), FULL);
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.mocks, FULL);
  assert.notEqual(result.mocks, FULL);
});

test("C-81ab0867: a missing hook mock is reported by key", () => {
  const result = check(hooked(), { lookup: FULL["lookup"], pay: FULL["pay"] });
  assert.deepEqual(rows(result.problems), [
    "lookup:pre:rule.audit null missing",
    "pay:post:notify null missing",
  ]);
  assert.equal(result.mocks, null);
  assert.deepEqual(rows(check(hooked(), { ...FULL, "pay:post:notify": [] }).problems), [
    "pay:post:notify null missing",
  ]);
});

test("C-81ab0867: a hook mock is checked against the hook block", () => {
  const schema = check(hooked(), { ...FULL, "pay:post:notify": [{ output: { ts: 5 } }] });
  assert.deepEqual(rows(schema.problems), ["pay:post:notify 0 schema"]);
  assert.equal(schema.problems[0]?.detail, "/ts type");
  assert.deepEqual(rows(check(hooked(), { ...FULL, "pay:post:notify": "x" }).problems), [
    "pay:post:notify null shape",
  ]);
  const errors = check(hooked(), {
    ...FULL,
    "pay:post:notify": [{ error: { code: "E_DOWN", message: "m" } }, { output: { ts: "1.0" } }],
  });
  assert.deepEqual(errors.problems, []);
});

test("C-81ab0867: code hooks and ghost hooks have no mock key", () => {
  const result = check(hooked(), {
    ...FULL,
    "pay:post:tag": [{ output: {} }],
    "pay:post:ghost": [{ output: {} }],
  });
  assert.deepEqual(rows(result.problems), [
    "pay:post:ghost null unknown_node",
    "pay:post:tag null unknown_node",
  ]);
  const proto = JSON.parse(JSON.stringify(FULL)) as Record<string, unknown>;
  Object.defineProperty(proto, "__proto__", { value: [], enumerable: true, configurable: true });
  assert.deepEqual(rows(check(hooked(), proto).problems), ["__proto__ null unknown_node"]);
});

test("C-81ab0867: an unreachable node's hook needs no mock but a bad one is reported", () => {
  const orphan = {
    orphan: {
      kind: "block",
      uses: "erp.flag_vendor@1",
      with: { vendor_id: "v1", reason: "r" },
      next: "done",
      post: [{ id: "n2", kind: "block", uses: "slack.post_message@1", with: { channel: "#x", text: "t" } }],
    },
  };
  const flow = hooked(orphan);
  assert.deepEqual(check(flow, FULL).problems, []);
  const bad = check(flow, { ...FULL, "orphan:post:n2": [{ output: { ts: 5 } }] });
  assert.deepEqual(rows(bad.problems), ["orphan:post:n2 0 schema"]);
});

test("C-81ab0867: a node reached only by a hook route needs a mock", () => {
  const review = {
    review: { kind: "block", uses: "erp.lookup_vendor@1", with: { vendor_name: "x" }, next: "done" },
  };
  const toReview: HookDef = { id: "to_review", kind: "code", source: "return;", routes: ["review"] };
  const result = check(hooked(review, [toReview]), FULL);
  assert.deepEqual(rows(result.problems), ["review null missing"]);
});

function hookCtx(nodeId: string, attempt: number): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: HASH,
    nodeId,
    kind: "block",
    mode: "mock",
    attempt,
    effect: "send",
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: new Date("2026-11-02T10:00:00Z"),
  };
}

async function failure(promise: Promise<unknown>): Promise<InterpreterError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof InterpreterError, `expected InterpreterError, got ${String(error)}`);
    return error;
  }
  assert.fail("expected a rejection");
}

test("C-7d6b8ba9: a hook call is answered under its hook key", async () => {
  const mocks: TestMocks = {
    lookup: [{ output: LOOKUP }],
    pay: [{ output: PAID }],
    "pay:post:notify": [
      { error: { code: "E_DOWN", message: "secret-text" } },
      { output: { ts: "1.0" } },
    ],
  };
  const realFetch = globalThis.fetch;
  let fetched = 0;
  globalThis.fetch = (() => {
    fetched += 1;
    return Promise.reject(new Error("no egress"));
  }) as typeof fetch;
  try {
    const invoker = createMockInvoker(mocks);
    const notify: ToolCall = {
      tool: "slack.post_message@1",
      args: {},
      nodeId: "pay",
      effectSeq: 1,
      phase: "post",
      hookId: "notify",
    };
    const first = await failure(invoker.invoke(notify, hookCtx("pay", 1)));
    assert.equal(first.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(first.node, "pay");
    assert.deepEqual(first.details, {
      reason: "mock_error",
      hook: "pay:post:notify",
      mockCode: "E_DOWN",
    });
    assert.ok(!first.message.includes("secret-text"));
    assert.deepEqual(await invoker.invoke(notify, hookCtx("pay", 2)), { output: { ts: "1.0" } });
    const third = await failure(invoker.invoke(notify, hookCtx("pay", 3)));
    assert.deepEqual(third.details, { reason: "mock_exhausted", hook: "pay:post:notify" });
    const audit: ToolCall = { ...notify, effectSeq: 2, phase: "pre", hookId: "audit" };
    const missing = await failure(invoker.invoke(audit, hookCtx("pay", 1)));
    assert.deepEqual(missing.details, { reason: "mock_missing", hook: "pay:pre:audit" });
    const node: ToolCall = { tool: "erp.create_payment@1", args: {}, nodeId: "pay", effectSeq: 0 };
    assert.deepEqual(await invoker.invoke(node, hookCtx("pay", 1)), { output: PAID });
    assert.deepEqual(await invoker.invoke({ ...node, phase: "post" }, hookCtx("pay", 1)), {
      output: PAID,
    });
    assert.equal(fetched, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});
