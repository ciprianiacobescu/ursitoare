import assert from "node:assert/strict";
import { test } from "node:test";

import { InterpreterError } from "../../interpreter/index.ts";
import type {
  DryRunFakes,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "../../interpreter/index.ts";
import type { Permit } from "../../pdp/index.ts";
import type { TenantContext } from "../../runs/index.ts";
import { stubInvoker } from "./stub.ts";

assert.equal(typeof stubInvoker, "function");

const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const PERMIT: Permit = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.create_payment@1",
  bodyDigest: "9".repeat(64),
  serviceId: S,
  ttlSeconds: 60,
};
const AUTH = { decisionId: "dec_1", permit: PERMIT };
const ANSWER: ToolResult = { output: { vendor_id: "V" } };
const PAY_OUTPUT = { payment_id: "P1" };

const FKT: DryRunFakes = {
  pay: [{ output: PAY_OUTPUT }, { error: { code: "E_DOWN", message: "secret text" } }],
  "pay:post:notify": [{ output: { ts: "1" } }],
};

const TENANT: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };

interface Logged {
  method: "authorize" | "invoke";
  call: ToolCall;
  ctx: StepContext;
}

function recordingLive(
  answer: ToolResult = ANSWER,
  withAuthorize = true,
): { live: ToolInvoker; log: Logged[] } {
  const log: Logged[] = [];
  const live: ToolInvoker = {
    async invoke(call, ctx) {
      log.push({ method: "invoke", call, ctx });
      return answer;
    },
  };
  if (withAuthorize) {
    live.authorize = async (call, ctx) => {
      log.push({ method: "authorize", call, ctx });
      return AUTH;
    };
  }
  return { live, log };
}

function ctx(over: Partial<StepContext> = {}): StepContext {
  return {
    tenant: TENANT,
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId: "pay",
    kind: "block",
    mode: "stub",
    attempt: 1,
    effect: "pay",
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "alice", kind: "human" },
    now: new Date("2026-11-02T10:00:00.000Z"),
    taint: [],
    ...over,
  };
}

function call(nodeId: string, over: Partial<ToolCall> = {}): ToolCall {
  return { tool: "t", args: {}, nodeId, effectSeq: 0, ...over };
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
async function settled<T>(what: string, fn: () => Promise<T>): Promise<T> {
  let value: T | undefined;
  let done = false;
  await assert.doesNotReject(async () => {
    value = await fn();
    done = true;
  }, what);
  assert.ok(done, `${what} resolved`);
  return value as T;
}

async function rejectsTool(
  p: Promise<unknown>,
  message: string,
  node: string | null,
  details: Record<string, string>,
): Promise<InterpreterError> {
  let caught: unknown;
  await assert.rejects(p, (error: unknown) => {
    caught = error;
    return true;
  });
  if (!(caught instanceof InterpreterError)) {
    assert.fail("an InterpreterError");
  }
  assert.equal(caught.code, "INTERPRETER_TOOL_FAILED");
  assert.equal(caught.message, message);
  assert.equal(caught.node, node);
  assert.deepEqual({ ...caught.details }, details);
  return caught;
}

test("C-0b1e8815 T1 a read goes live with the same call and context", async () => {
  const { live, log } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  const c = call("lookup");
  const x = ctx({ effect: "read" });
  const result = await stub.invoke(c, x);
  assert.equal(log.length, 1);
  const entry = log[0];
  assert.ok(entry !== undefined);
  assert.equal(entry.method, "invoke");
  assert.strictEqual(entry.call, c);
  assert.strictEqual(entry.ctx, x);
  assert.strictEqual(result, ANSWER);
});

test("C-0b1e8815 T2 an effect is answered by a copy of its fake", async () => {
  const { live, log } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  const result = await stub.invoke(call("pay"), ctx({ attempt: 1 }));
  assert.deepEqual(result, { output: PAY_OUTPUT });
  assert.notStrictEqual(result.output, PAY_OUTPUT);
  assert.equal(log.length, 0);
});

test("C-0b1e8815 T3 a fake error has its code and no message", async () => {
  const { live } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  const error = await rejectsTool(stub.invoke(call("pay"), ctx({ attempt: 2 })), "dry run fake_error", "pay", {
    reason: "fake_error",
    fakeCode: "E_DOWN",
  });
  const text = JSON.stringify({ message: error.message, details: error.details });
  assert.equal(text.includes("secret text"), false);
});

test("C-0b1e8815 T4 an exhausted list is fake_exhausted", async () => {
  const { live } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  await rejectsTool(stub.invoke(call("pay"), ctx({ attempt: 3 })), "dry run fake_exhausted", "pay", {
    reason: "fake_exhausted",
  });
});

test("C-0b1e8815 T5 a hook call reads its own fake key", async () => {
  const { live } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  const answer = await stub.invoke(
    call("pay", { effectSeq: 1, phase: "post", hookId: "notify" }),
    ctx({ effect: "send" }),
  );
  assert.deepEqual(answer, { output: { ts: "1" } });
  await rejectsTool(
    stub.invoke(
      call("pay", { effectSeq: 1, phase: "pre", hookId: "audit" }),
      ctx({ effect: "send" }),
    ),
    "dry run fake_missing",
    "pay",
    { reason: "fake_missing", hook: "pay:pre:audit" },
  );
});

test("C-0b1e8815 T6 only reads go live", async () => {
  const { live, log } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  await rejectsTool(stub.invoke(call("flag"), ctx({ effect: "write" })), "dry run fake_missing", "flag", {
    reason: "fake_missing",
  });
  const answer = await stub.invoke(call("pay"), ctx({ effect: null, attempt: 1 }));
  assert.deepEqual(answer, { output: PAY_OUTPUT });
  assert.equal(log.length, 0);
});

test("C-0b1e8815 T7 authorize is forwarded only when the live invoker has one", async () => {
  const { live, log } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  const c = call("lookup");
  const x = ctx({ effect: "read" });
  assert.ok(stub.authorize !== undefined, "the stub has authorize");
  const answer = await stub.authorize(c, x);
  assert.equal(log.length, 1);
  const entry = log[0];
  assert.ok(entry !== undefined);
  assert.equal(entry.method, "authorize");
  assert.strictEqual(entry.call, c);
  assert.strictEqual(entry.ctx, x);
  assert.strictEqual(answer, AUTH);

  const bare = recordingLive(ANSWER, false);
  const plain = await settled("stubInvoker answers", async () => stubInvoker(bare.live, FKT));
  assert.equal("authorize" in plain, false);
});

test("C-0b1e8815 T8 an unchecked bad code has no fakeCode", async () => {
  const { live } = recordingLive();
  const fakes: DryRunFakes = { pay: [{ error: { code: "bad code", message: "m" } }] };
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, fakes));
  await rejectsTool(stub.invoke(call("pay"), ctx({ attempt: 1 })), "dry run fake_error", "pay", {
    reason: "fake_error",
  });
});

test("C-0b1e8815 T9 a hook key outside the pattern has no hook detail", async () => {
  const { live } = recordingLive();
  const stub = await settled("stubInvoker answers", async () => stubInvoker(live, FKT));
  await rejectsTool(
    stub.invoke(
      call("pay", { effectSeq: 1, phase: "post", hookId: "bad id" }),
      ctx({ effect: "send" }),
    ),
    "dry run fake_missing",
    "pay",
    { reason: "fake_missing" },
  );
  await rejectsTool(
    stub.invoke(
      call("pay", { effectSeq: 1, phase: "post", hookId: "x".repeat(250) }),
      ctx({ effect: "send" }),
    ),
    "dry run fake_missing",
    "pay",
    { reason: "fake_missing" },
  );
});
