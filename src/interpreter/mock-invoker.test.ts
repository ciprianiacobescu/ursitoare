import assert from "node:assert/strict";
import { test } from "node:test";

import { createMemoryRunStore } from "../runs/index.ts";
import type { NewRun, RunRecord, TenantContext } from "../runs/index.ts";
import {
  PAY_ONCE_INPUT,
  PAY_ONCE_PAID_OUTPUT,
} from "../../test/support/crash/pay-once.ts";
import { createMockInvoker, testRunInvokers } from "./mocks.ts";
import type { TestMocks } from "./mocks.ts";
import { InterpreterError } from "./errors.ts";
import type { StepContext, ToolCall, ToolResult } from "./types.ts";

const T_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const T_B: TenantContext = { tenantId: "tenant_b", reviewProfile: "solo" };
const ALICE = { userId: "u_alice", kind: "human" } as const;
const HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-11-02T10:00:00Z");
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const MOCKS: TestMocks = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };
const ERROR_MOCKS: TestMocks = {
  lookup: [{ output: LOOKUP_OK }],
  pay: [{ error: { code: "E_DOWN", message: "secret-text" } }, { output: PAID }],
};

function call(nodeId: string): ToolCall {
  return { tool: "erp.lookup_vendor@1", args: {}, nodeId, effectSeq: 0 };
}

function ctx(nodeId: string, attempt = 1, tenant: TenantContext = T_A): StepContext {
  return {
    tenant,
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: HASH,
    nodeId,
    kind: "block",
    mode: "mock",
    attempt,
    effect: "read",
    unsafeToRetry: false,
    idemKey: null,
    principal: ALICE,
    now: AT,
  };
}

function newRun(runId: string, overrides: Partial<NewRun> = {}): NewRun {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "pay-once",
    flowHash: HASH,
    ownerTeam: "finance",
    mode: "mock",
    trigger: "test",
    principal: { userId: ALICE.userId, kind: "human" },
    actorChain: [ALICE.userId],
    input: PAY_ONCE_INPUT,
    mocks: MOCKS,
    ...overrides,
  };
}

async function failure(promise: Promise<unknown>): Promise<InterpreterError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(
      error instanceof InterpreterError,
      `expected InterpreterError, got ${String(error)}`,
    );
    return error;
  }
  assert.fail("expected a rejection");
}

async function seededStore(): Promise<{
  store: ReturnType<typeof createMemoryRunStore>;
  r1: RunRecord;
  r2: RunRecord;
}> {
  const store = createMemoryRunStore();
  const r1 = await store.createRun(T_A, newRun("r_1"), AT);
  const r2 = await store.createRun(T_A, newRun("r_2", { mocks: null }), AT);
  return { store, r1, r2 };
}

test("C-e19890aa: the mock invoker answers the entry at the attempt index", async () => {
  await assert.doesNotReject(async () => {
    const invoker = createMockInvoker(ERROR_MOCKS);

    const first = await invoker.invoke(call("lookup"), ctx("lookup"));
    assert.deepEqual(first, { output: LOOKUP_OK });
    (first.output as Record<string, unknown>)["status"] = "mutated";

    const second = await invoker.invoke(call("lookup"), ctx("lookup"));
    assert.deepEqual(second, { output: LOOKUP_OK });
    assert.notEqual(first.output, second.output);

    const paid = await invoker.invoke(call("pay"), ctx("pay", 2));
    assert.deepEqual(paid, { output: PAID });
  });
});

test("C-e19890aa: error entries, missing nodes and exhausted lists fail", async () => {
  await assert.doesNotReject(async () => {
    const invoker = createMockInvoker(ERROR_MOCKS);

    const errored = await failure(invoker.invoke(call("pay"), ctx("pay", 1)));
    assert.equal(errored.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(errored.node, "pay");
    assert.deepEqual(errored.details, { reason: "mock_error", mockCode: "E_DOWN" });
    assert.equal(errored.message.includes("secret-text"), false);

    const exhausted = await failure(invoker.invoke(call("pay"), ctx("pay", 3)));
    assert.equal(exhausted.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(exhausted.node, "pay");
    assert.equal(exhausted.details["reason"], "mock_exhausted");

    const missing = await failure(invoker.invoke(call("ghost"), ctx("ghost")));
    assert.equal(missing.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(missing.node, "ghost");
    assert.equal(missing.details["reason"], "mock_missing");
  });
});

test("C-e19890aa: the mock invoker makes no outbound call", async () => {
  const original = globalThis.fetch;
  const calls: unknown[][] = [];
  globalThis.fetch = (async (...args: unknown[]) => {
    calls.push(args);
    throw new Error("unexpected fetch");
  }) as unknown as typeof fetch;
  try {
    await assert.doesNotReject(async () => {
      const invoker = createMockInvoker(ERROR_MOCKS);
      await invoker.invoke(call("lookup"), ctx("lookup"));
      const paid: ToolResult = await invoker.invoke(call("pay"), ctx("pay", 2));
      assert.deepEqual(paid, { output: PAID });
      await failure(invoker.invoke(call("pay"), ctx("pay", 1)));
      assert.equal(calls.length, 0);
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("C-2e79b082: the invoker answers from the mocks stored with the run", async () => {
  await assert.doesNotReject(async () => {
    const { store, r1 } = await seededStore();
    const f = testRunInvokers(store);

    const invoker = await f("mock", r1);
    const lookup = await invoker.invoke(call("lookup"), ctx("lookup"));
    assert.deepEqual(lookup, { output: LOOKUP_OK });
    const pay = await invoker.invoke(call("pay"), ctx("pay", 1));
    assert.deepEqual(pay, { output: PAID });
  });
});

test("C-2e79b082: other modes and unavailable mocks are refused", async () => {
  await assert.doesNotReject(async () => {
    const { store, r1, r2 } = await seededStore();
    const f = testRunInvokers(store);

    for (const mode of ["live", "stub"] as const) {
      const refused = await failure(f(mode, r1));
      assert.equal(refused.code, "INTERPRETER_NO_INVOKER");
    }

    const noMocks = await f("mock", r2);
    const unavailable = await failure(noMocks.invoke(call("lookup"), ctx("lookup")));
    assert.equal(unavailable.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(unavailable.details["reason"], "mocks_unavailable");

    const otherTenant = await f("mock", r1);
    const isolated = await failure(otherTenant.invoke(call("lookup"), ctx("lookup", 1, T_B)));
    assert.equal(isolated.code, "INTERPRETER_TOOL_FAILED");
    assert.equal(isolated.details["reason"], "mocks_unavailable");
  });
});
