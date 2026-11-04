import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue, WaitNode } from "../../authoring/index.ts";
import {
  durationMs,
  InterpreterError,
  memoryWorkflowOps,
  NO_EFFECT_GATE,
  nodeRuntimeFor,
  resolveValue,
} from "../index.ts";
import type {
  EffectMode,
  MemoryWorkflowOps,
  NodeOutcome,
  NodeServices,
  StepContext,
  ToolInvoker,
} from "../index.ts";

assert.equal(typeof durationMs, "function");
assert.equal(typeof nodeRuntimeFor, "function");

const NOW = new Date("2026-11-02T10:00:00.000Z");

const NO_INVOKER: ToolInvoker = {
  async invoke() {
    throw new Error("no invoker");
  },
};

const BAD_DURATIONS: readonly string[] = [
  "P1Y",
  "PT1.5H",
  "PT1H1",
  "",
  "P",
  "pt1h",
  "P367D",
  "PT31622400.001S",
  `P${"9".repeat(400)}D`,
];

const TOO_LARGE: readonly string[] = BAD_DURATIONS.slice(-3);

function waitNode(duration: string): WaitNode {
  return { kind: "wait", duration, next: "after" };
}

function context(mode: EffectMode): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId: "w",
    kind: "wait",
    mode,
    attempt: 1,
    effect: null,
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: NOW,
  };
}

function servicesFor(ops: MemoryWorkflowOps, inputs: JsonValue): NodeServices {
  return {
    ops,
    invoker: NO_INVOKER,
    effects: NO_EFFECT_GATE,
    resolve(value: unknown): JsonValue {
      return resolveValue(value, { inputs, nodes: new Map() });
    },
    block() {
      return undefined;
    },
  };
}

function runtimeForWait() {
  const runtime = nodeRuntimeFor("wait");
  assert.ok(runtime !== undefined, "no runtime registered for wait");
  assert.equal(typeof runtime.execute, "function");
  return runtime;
}

async function executeWait(
  duration: string,
  mode: EffectMode,
): Promise<{ outcome: NodeOutcome; ops: MemoryWorkflowOps }> {
  const ops = memoryWorkflowOps("r_1");
  const runtime = runtimeForWait();
  const outcome = await runtime.execute(
    waitNode(duration),
    context(mode),
    servicesFor(ops, {}),
  );
  return { outcome, ops };
}

test("C-6b747ab8 durationMs converts every supported component", () => {
  const cases: readonly (readonly [string, number])[] = [
    ["PT0S", 0],
    ["PT1.5S", 1500],
    ["PT90M", 5400000],
    ["P1W", 604800000],
    ["P1DT2H3M4S", 93784000],
    ["P366D", 31622400000],
  ];

  for (const [text, expected] of cases) {
    let actual: number | undefined;
    assert.doesNotThrow(() => {
      actual = durationMs(text);
    }, text);
    assert.equal(actual, expected, text);
  }
});

test("C-6b747ab8 durationMs refuses malformed and oversized durations", () => {
  for (const text of BAD_DURATIONS) {
    let caught: unknown;
    try {
      durationMs(text);
    } catch (error) {
      caught = error;
    }

    assert.ok(
      caught instanceof InterpreterError,
      `${JSON.stringify(text)} threw ${String(caught)}`,
    );
    assert.equal(caught.code, "INTERPRETER_INPUT_INVALID", JSON.stringify(text));
    assert.equal(caught.details.field, "duration", JSON.stringify(text));
    if (TOO_LARGE.includes(text)) {
      assert.equal(caught.details.reason, "duration_too_large", JSON.stringify(text));
    }
  }
});

test("C-6b747ab8 wait sleeps in chunks and continues in live mode", async () => {
  const { outcome, ops } = await executeWait("P2DT1H", "live");

  assert.deepEqual(ops.slept, [86400000, 86400000, 3600000]);
  assert.deepEqual(ops.executed, ["w", "w#wake"]);
  assert.deepEqual(outcome, {
    output: null,
    outcome: null,
    next: "after",
    end: null,
  });
});

test("C-6b747ab8 wait skips in mock mode and sleeps in stub mode", async () => {
  const mocked = await executeWait("PT90M", "mock");
  assert.deepEqual(mocked.ops.slept, []);
  assert.deepEqual(mocked.ops.executed, ["w", "w#wake"]);
  assert.deepEqual(mocked.outcome, {
    output: null,
    outcome: "skipped",
    next: "after",
    end: null,
  });

  const stubbed = await executeWait("PT90M", "stub");
  assert.deepEqual(stubbed.ops.slept, [5400000]);
  assert.deepEqual(stubbed.ops.executed, ["w", "w#wake"]);
  assert.deepEqual(stubbed.outcome, {
    output: null,
    outcome: null,
    next: "after",
    end: null,
  });
});

test("C-6b747ab8 wait of zero sleeps nothing and still wakes", async () => {
  const { outcome, ops } = await executeWait("PT0S", "live");

  assert.deepEqual(ops.slept, []);
  assert.deepEqual(ops.executed, ["w", "w#wake"]);
  assert.deepEqual(outcome, {
    output: null,
    outcome: null,
    next: "after",
    end: null,
  });
});

test("C-6b747ab8 wait rejects an unsupported duration after recording its step", async () => {
  const ops = memoryWorkflowOps("r_1");
  const runtime = runtimeForWait();

  let caught: unknown;
  try {
    await runtime.execute(waitNode("P1Y"), context("mock"), servicesFor(ops, {}));
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof InterpreterError);
  assert.equal(caught.code, "INTERPRETER_INPUT_INVALID");
  assert.equal(caught.details.field, "duration");
  assert.deepEqual(ops.executed, ["w"]);
});
