import assert from "node:assert/strict";
import { test } from "node:test";

import { InterpreterError, testRunInvokers } from "../../interpreter/index.ts";
import type {
  DryRunFakes,
  EffectMode,
  InterpreterDeps,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "../../interpreter/index.ts";
import type { Permit } from "../../pdp/index.ts";
import { createMemoryRunStore } from "../../runs/index.ts";
import type { NewRun, PayloadValue, RunRecord, RunStore, TenantContext } from "../../runs/index.ts";
import { dryRunInvokers, stubInvoker } from "./stub.ts";
import type { InvokePath } from "./types.ts";

assert.equal(typeof dryRunInvokers, "function");
assert.equal(typeof stubInvoker, "function");

const AT = new Date("2026-11-06T10:00:00.000Z");
const TENANT: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
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
    now: AT,
    taint: [],
    ...over,
  };
}

function call(nodeId: string, over: Partial<ToolCall> = {}): ToolCall {
  return { tool: "t", args: {}, nodeId, effectSeq: 0, ...over };
}

function newRun(runId: string, mocks: PayloadValue): NewRun {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    ownerTeam: "finance",
    mode: "stub",
    trigger: "test",
    principal: { userId: "alice", kind: "human" },
    actorChain: ["alice"],
    input: { vendor: "Acme" },
    mocks,
  };
}

interface Seeded {
  base: RunStore;
  r1: RunRecord;
  r2: RunRecord;
  r3: RunRecord;
}

async function seeded(): Promise<Seeded> {
  const base = createMemoryRunStore();
  const r1 = await base.createRun(TENANT, newRun("r_1", FKT as unknown as PayloadValue), AT);
  const r2 = await base.createRun(TENANT, newRun("r_2", null), AT);
  const r3 = await base.createRun(TENANT, newRun("r_3", []), AT);
  return { base, r1, r2, r3 };
}

interface PayloadCall {
  ctx: TenantContext;
  sha: string;
}

function counting(base: RunStore): { store: RunStore; calls: PayloadCall[] } {
  const calls: PayloadCall[] = [];
  const store: RunStore = {
    ...base,
    async getPayload(ctx, sha256) {
      calls.push({ ctx, sha: sha256 });
      return base.getPayload(ctx, sha256);
    },
  };
  return { store, calls };
}

function fakePath(live: (run: RunRecord) => Promise<ToolInvoker>): {
  path: InvokePath;
  calls: RunRecord[];
} {
  const calls: RunRecord[] = [];
  return {
    path: {
      async liveInvoker(run) {
        calls.push(run);
        return live(run);
      },
    },
    calls,
  };
}

interface FallbackCall {
  mode: EffectMode;
  run: RunRecord;
}

function recordingFallback(inner: InterpreterDeps["invokerFor"]): {
  fallback: InterpreterDeps["invokerFor"];
  calls: FallbackCall[];
} {
  const calls: FallbackCall[] = [];
  const fallback: InterpreterDeps["invokerFor"] = async (mode, run) => {
    calls.push({ mode, run });
    return inner(mode, run);
  };
  return { fallback, calls };
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

test("C-0b1e8815 D1 stub mode loads fakes once and answers from them", async () => {
  const { base, r1 } = await seeded();
  const { store, calls: payloadCalls } = counting(base);
  const { live, log } = recordingLive();
  const { path, calls: pathCalls } = fakePath(async () => live);
  const { fallback, calls: fallbackCalls } = recordingFallback(testRunInvokers(base));
  const invokerFor = await settled("dryRunInvokers answers", async () =>
    dryRunInvokers(path, store, fallback),
  );
  const invoker = await settled("stub invoker resolves", () => invokerFor("stub", r1));

  const first = await invoker.invoke(call("pay"), ctx({ attempt: 1 }));
  assert.deepEqual(first, { output: PAY_OUTPUT });
  await rejectsTool(invoker.invoke(call("pay"), ctx({ attempt: 2 })), "dry run fake_error", "pay", {
    reason: "fake_error",
    fakeCode: "E_DOWN",
  });

  assert.equal(pathCalls.length, 1);
  assert.strictEqual(pathCalls[0], r1);
  assert.equal(payloadCalls.length, 1);
  const loaded = payloadCalls[0];
  assert.ok(loaded !== undefined);
  assert.equal(loaded.sha, r1.mocksRef);
  assert.equal(fallbackCalls.length, 0);
  assert.equal(log.length, 0);
});

test("C-0b1e8815 D2 other modes go to the fallback", async () => {
  const { base, r1 } = await seeded();
  const { store, calls: payloadCalls } = counting(base);
  const { live } = recordingLive();
  const { path, calls: pathCalls } = fakePath(async () => live);
  const { fallback, calls: fallbackCalls } = recordingFallback(testRunInvokers(base));
  const invokerFor = await settled("dryRunInvokers answers", async () =>
    dryRunInvokers(path, store, fallback),
  );

  let liveError: unknown;
  await assert.rejects(invokerFor("live", r1), (error: unknown) => {
    liveError = error;
    return true;
  });
  if (!(liveError instanceof InterpreterError)) {
    assert.fail("an InterpreterError");
  }
  assert.equal(liveError.code, "INTERPRETER_NO_INVOKER");

  const mock = await invokerFor("mock", r1);
  assert.equal(typeof mock.invoke, "function");

  assert.equal(fallbackCalls.length, 2);
  assert.equal(fallbackCalls[0]?.mode, "live");
  assert.strictEqual(fallbackCalls[0]?.run, r1);
  assert.equal(fallbackCalls[1]?.mode, "mock");
  assert.strictEqual(fallbackCalls[1]?.run, r1);
  assert.equal(pathCalls.length, 0);
  assert.equal(payloadCalls.length, 0);
});

test("C-0b1e8815 D3 null or non-object fakes are unavailable", async () => {
  const { base, r2, r3 } = await seeded();
  const { live } = recordingLive();
  const { path } = fakePath(async () => live);
  const { fallback } = recordingFallback(testRunInvokers(base));
  const invokerFor = await settled("dryRunInvokers answers", async () =>
    dryRunInvokers(path, base, fallback),
  );

  const absent = await settled("stub invoker resolves", () => invokerFor("stub", r2));
  await rejectsTool(
    absent.invoke(call("pay"), ctx({ attempt: 1 })),
    "dry run fakes_unavailable",
    null,
    { reason: "fakes_unavailable" },
  );
  await rejectsTool(
    absent.invoke(call("lookup"), ctx({ effect: "read" })),
    "dry run fakes_unavailable",
    null,
    { reason: "fakes_unavailable" },
  );

  const array = await settled("stub invoker resolves", () => invokerFor("stub", r3));
  await rejectsTool(
    array.invoke(call("pay"), ctx({ attempt: 1 })),
    "dry run fakes_unavailable",
    null,
    { reason: "fakes_unavailable" },
  );
});

test("C-0b1e8815 D4 authorize is forwarded to the live invoker", async () => {
  const { base, r1 } = await seeded();
  const { live, log } = recordingLive();
  const { path } = fakePath(async () => live);
  const { fallback } = recordingFallback(testRunInvokers(base));
  const invokerFor = await settled("dryRunInvokers answers", async () =>
    dryRunInvokers(path, base, fallback),
  );
  const invoker = await settled("stub invoker resolves", () => invokerFor("stub", r1));

  assert.ok(invoker.authorize !== undefined, "the stub invoker has authorize");
  const c = call("lookup");
  const x = ctx({ effect: "read" });
  const answer = await invoker.authorize(c, x);
  assert.equal(log.length, 1);
  const entry = log[0];
  assert.ok(entry !== undefined);
  assert.equal(entry.method, "authorize");
  assert.strictEqual(entry.call, c);
  assert.strictEqual(entry.ctx, x);
  assert.strictEqual(answer, AUTH);
});

test("C-0b1e8815 D5 a failing payload load is unavailable and not kept", async () => {
  const { base, r1 } = await seeded();
  let calls = 0;
  const store: RunStore = {
    ...base,
    async getPayload(ctx, sha256) {
      calls += 1;
      if (calls === 1) {
        const refused = new Error("db password=hunter2") as Error & { code: string };
        refused.code = "ECONNRESET";
        throw refused;
      }
      return base.getPayload(ctx, sha256);
    },
  };
  const { live, log } = recordingLive();
  const { path } = fakePath(async () => live);
  const { fallback } = recordingFallback(testRunInvokers(base));
  const invokerFor = await settled("dryRunInvokers answers", async () =>
    dryRunInvokers(path, store, fallback),
  );
  const invoker = await settled("stub invoker resolves", () => invokerFor("stub", r1));

  const error = await rejectsTool(
    invoker.invoke(call("lookup"), ctx({ effect: "read" })),
    "dry run fakes_unavailable",
    null,
    { reason: "fakes_unavailable" },
  );
  const text = JSON.stringify({ message: error.message, details: error.details });
  assert.equal(text.includes("hunter2"), false);
  assert.equal(text.includes("ECONNRESET"), false);
  assert.equal(log.length, 0);

  const answer = await invoker.invoke(call("pay"), ctx({ attempt: 1 }));
  assert.deepEqual(answer, { output: PAY_OUTPUT });
  assert.equal(calls, 2);
});

test("C-0b1e8815 D6 a failing live invoker is unavailable", async () => {
  const { base, r1 } = await seeded();
  const { store, calls: payloadCalls } = counting(base);
  const { path } = fakePath(async () => {
    throw new Error("db password=hunter2");
  });
  const { fallback, calls: fallbackCalls } = recordingFallback(testRunInvokers(base));
  const invokerFor = await settled("dryRunInvokers answers", async () =>
    dryRunInvokers(path, store, fallback),
  );

  let caught: unknown;
  await assert.rejects(invokerFor("stub", r1), (error: unknown) => {
    caught = error;
    return true;
  });
  if (!(caught instanceof InterpreterError)) {
    assert.fail("an InterpreterError");
  }
  assert.equal(caught.code, "INTERPRETER_TOOL_FAILED");
  assert.equal(caught.message, "dry run live_unavailable");
  assert.equal(caught.node, null);
  assert.deepEqual({ ...caught.details }, { reason: "live_unavailable" });
  const text = JSON.stringify({ message: caught.message, details: caught.details });
  assert.equal(text.includes("hunter2"), false);
  assert.equal(text.includes("ECONNRESET"), false);
  assert.equal(payloadCalls.length, 0);
  assert.equal(fallbackCalls.length, 0);
});
