import assert from "node:assert/strict";
import { test } from "node:test";

import type { CodeNode, JsonSchema, JsonValue } from "../../authoring/index.ts";
import type {
  NodeOutcome,
  NodeServices,
  RunScope,
  StepContext,
  ToolInvoker,
} from "../index.ts";
import { NO_EFFECT_GATE, memoryWorkflowOps, resolveValue } from "../index.ts";
import { InterpreterError, toInterpreterError } from "../errors.ts";
import { SandboxError, createWorkerSandbox } from "../../sandbox/index.ts";
import type {
  SandboxFaultCode,
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "../../sandbox/index.ts";
import type { ConformanceCase } from "../../../test/support/node-conformance.ts";
import { runConformance } from "../../../test/support/node-conformance.ts";
import { codeRuntime } from "./code.ts";

assert.equal(typeof codeRuntime.execute, "function");
assert.equal(typeof runConformance, "function");

const LEAK = "secret-" + "token-" + "123";

const NO_SANDBOX_CODE = "INTERPRETER_NO_SANDBOX";
const CODE_FAILED_CODE = "INTERPRETER_CODE_FAILED";
const OUTPUT_INVALID_CODE = "INTERPRETER_OUTPUT_INVALID";
const SANDBOX_UNAVAILABLE_FAULT = "sandbox_unavailable";

const FAULT_CODES = [
  "timeout",
  "memory_limit",
  "stack_overflow",
  "output_too_large",
  "output_invalid",
  "input_invalid",
  "syntax_error",
  "runtime_error",
  "never_settled",
  "sandbox_crash",
] as const;

const NORM_SRC =
  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";

const LOOP_SRC = "for (;;) {}";
const BOMB_SRC =
  "const a = []; for (;;) a.push(new Array(100000).fill(1)); return { n: a.length };";
const DEEP_SRC = "function f() { return f() + 1; } return { n: f() };";
const THROW_SRC = `throw new Error(${JSON.stringify(LEAK)});`;

const NORM_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    amount: { type: "number" },
    currency: { type: "string" },
    is_large: { type: "boolean" },
  },
  required: ["amount", "currency", "is_large"],
};

const ANY_SCHEMA: JsonSchema = { type: "object" };

const MORE_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: { type: "number" },
};

const NORMALIZED = { amount: 1234.57, currency: "EUR", is_large: true };

type SandboxObject = { [key: string]: SandboxJson };

function nest(n: number): SandboxObject {
  let value: SandboxObject = {};
  for (let i = 1; i < n; i += 1) {
    value = { n: value };
  }
  return value;
}

const BAD_VALUES: SandboxObject[] = [
  { amount: 1, currency: "a\u0000b", is_large: true },
  { amount: 1, currency: "\ud800", is_large: true },
  nest(65),
];

const PATH_VALUES: SandboxObject[] = [
  { ["a\u0000"]: "x" },
  { ["k".repeat(300)]: "x" },
  { ["\ud800"]: "x" },
];

const SCOPE: RunScope = {
  inputs: { vendor: "Acme", invoice: "inv-1", amount: 1234.567, currency: "eur" },
  nodes: new Map(),
};

const NO_INVOKER: ToolInvoker = {
  async invoke() {
    throw new Error("no invoker");
  },
};

function ctx(nodeId: string): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId,
    kind: "code",
    mode: "mock",
    attempt: 1,
    effect: null,
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now: new Date("2026-11-02T10:00:00Z"),
  };
}

function normNode(source: string, schema: JsonSchema = NORM_SCHEMA): CodeNode {
  return {
    kind: "code",
    language: "js",
    source,
    input: {
      amount: "${{ inputs.amount }}",
      currency: "${{ inputs.currency }}",
    },
    output_schema: schema,
    next: "pay",
  };
}

function servicesFor(ops: ReturnType<typeof memoryWorkflowOps>, sandbox?: WorkerSandbox): NodeServices {
  return {
    ops,
    invoker: NO_INVOKER,
    effects: NO_EFFECT_GATE,
    resolve(value: unknown): JsonValue {
      return resolveValue(value, SCOPE);
    },
    block() {
      return undefined;
    },
    ...(sandbox === undefined ? {} : { sandbox }),
  };
}

interface RecordedCall {
  code: string;
  input: SandboxJson;
  limits: SandboxLimits;
  options: SandboxOptions;
}

interface RecordingSandbox extends WorkerSandbox {
  readonly calls: RecordedCall[];
}

function recordingSandbox(answer: SandboxResult): RecordingSandbox {
  const calls: RecordedCall[] = [];
  return {
    size: 1,
    respawns: 0,
    calls,
    async run(code, input, limits, options) {
      calls.push({ code, input, limits, options });
      return answer;
    },
    async close() {
      return undefined;
    },
  };
}

function rejectingSandbox(error: unknown): RecordingSandbox {
  const calls: RecordedCall[] = [];
  return {
    size: 1,
    respawns: 0,
    calls,
    async run(code, input, limits, options) {
      calls.push({ code, input, limits, options });
      throw error;
    },
    async close() {
      return undefined;
    },
  };
}

function okAnswer(value: SandboxObject): SandboxResult {
  return { ok: true, value, stats: { ms: 1, memBytes: 0 } };
}

function faultAnswer(fault: SandboxFaultCode): SandboxResult {
  return {
    ok: false,
    fault: { code: fault, message: LEAK },
    stats: { ms: 1, memBytes: 0 },
  };
}

async function rejection(promise: Promise<unknown>): Promise<Record<string, unknown>> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof InterpreterError, "the runtime threw an InterpreterError");
    return error as unknown as Record<string, unknown>;
  }
  assert.fail("expected a rejection");
}

function leakFree(caught: Record<string, unknown>, label: string): void {
  const rendered = JSON.stringify([caught["message"], caught["details"]]) ?? "";
  assert.ok(!rendered.includes(LEAK), `${label} leaks no sandbox message`);
}

type FaultExpect = { outcome: NodeOutcome } | { error: string };

type FaultCase = {
  name: string;
  node: CodeNode;
  scope: RunScope;
  mode: "mock";
  sandbox?: WorkerSandbox;
  expect: FaultExpect;
};

function outcomeOf(output: unknown): FaultExpect {
  return { outcome: { output: output as JsonValue, outcome: null, next: "pay", end: null } };
}

function buildCases(pool: WorkerSandbox): FaultCase[] {
  return [
    {
      name: "ok",
      node: normNode(NORM_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer(NORMALIZED)),
      expect: outcomeOf(NORMALIZED),
    },
    {
      name: "mismatch",
      node: normNode(NORM_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer({ amount: "x", currency: "EUR", is_large: true })),
      expect: { error: OUTPUT_INVALID_CODE },
    },
    {
      name: "no sandbox",
      node: normNode(NORM_SRC),
      scope: SCOPE,
      mode: "mock",
      expect: { error: NO_SANDBOX_CODE },
    },
    {
      name: "loop",
      node: normNode(LOOP_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: pool,
      expect: { error: CODE_FAILED_CODE },
    },
    {
      name: "bomb",
      node: normNode(BOMB_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: pool,
      expect: { error: CODE_FAILED_CODE },
    },
    {
      name: "deep",
      node: normNode(DEEP_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: pool,
      expect: { error: CODE_FAILED_CODE },
    },
    {
      name: "throws",
      node: normNode(THROW_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: pool,
      expect: { error: CODE_FAILED_CODE },
    },
    {
      name: "nul",
      node: normNode(NORM_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer({ amount: 1, currency: "a\u0000b", is_large: true })),
      expect: { error: OUTPUT_INVALID_CODE },
    },
    {
      name: "surrogate",
      node: normNode(NORM_SRC),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer({ amount: 1, currency: "\ud800", is_large: true })),
      expect: { error: OUTPUT_INVALID_CODE },
    },
    {
      name: "nest 65",
      node: normNode(NORM_SRC, ANY_SCHEMA),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer(nest(65))),
      expect: { error: OUTPUT_INVALID_CODE },
    },
    {
      name: "nest 64",
      node: normNode(NORM_SRC, ANY_SCHEMA),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer(nest(64))),
      expect: outcomeOf(nest(64)),
    },
    {
      name: "badkey",
      node: normNode(NORM_SRC, MORE_SCHEMA),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer(PATH_VALUES[0] as SandboxObject)),
      expect: { error: OUTPUT_INVALID_CODE },
    },
    {
      name: "longkey",
      node: normNode(NORM_SRC, MORE_SCHEMA),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer(PATH_VALUES[1] as SandboxObject)),
      expect: { error: OUTPUT_INVALID_CODE },
    },
    {
      name: "surrkey",
      node: normNode(NORM_SRC, MORE_SCHEMA),
      scope: SCOPE,
      mode: "mock",
      sandbox: recordingSandbox(okAnswer(PATH_VALUES[2] as SandboxObject)),
      expect: { error: OUTPUT_INVALID_CODE },
    },
  ];
}

test("C-5ebb76ed the conformance suite reports a code verdict for every case", async () => {
  const pool = createWorkerSandbox({ size: 1 });
  try {
    const cases = buildCases(pool);
    let verdicts: { name: string; ok: boolean; detail: string }[] | undefined;
    await assert.doesNotReject(async () => {
      verdicts = await runConformance(
        "code",
        codeRuntime,
        cases as unknown as readonly ConformanceCase[],
      );
    });
    assert.ok(verdicts !== undefined, "runConformance returned verdicts");
    assert.deepEqual(
      verdicts,
      cases.map((entry) => ({ name: entry.name, ok: true, detail: "" })),
    );
  } finally {
    await pool.close();
  }
});

test("C-5ebb76ed a missing sandbox is a typed terminal refusal", async () => {
  const caught = await rejection(
    codeRuntime.execute(
      normNode(NORM_SRC),
      ctx("node_under_test"),
      servicesFor(memoryWorkflowOps("r_1")),
    ),
  );

  assert.equal(caught["code"], NO_SANDBOX_CODE);
  assert.equal(caught["node"], "node_under_test");
  assert.equal(caught["message"], 'no sandbox is available for code node "node_under_test"');
});

test("C-5ebb76ed an unstorable code output is refused at the root", async () => {
  for (const value of BAD_VALUES) {
    const rec = recordingSandbox(okAnswer(value));
    const caught = await rejection(
      codeRuntime.execute(
        normNode(NORM_SRC),
        ctx("node_under_test"),
        servicesFor(memoryWorkflowOps("r_1"), rec),
      ),
    );

    assert.equal(caught["code"], OUTPUT_INVALID_CODE);
    assert.equal(caught["node"], "node_under_test");
    assert.equal(caught["message"], 'output of "node_under_test" cannot be stored');
    assert.deepEqual(caught["details"], { path: "/", keyword: "payload" });
    assert.equal(rec.calls.length, 1, "the sandbox is called once before the payload check");
    assert.ok(!JSON.stringify(value).includes(LEAK), "the probe value holds no secret");
  }
});

test("C-5ebb76ed an ill formed schema path is reported at the root", async () => {
  for (const value of PATH_VALUES) {
    const rec = recordingSandbox(okAnswer(value));
    const caught = await rejection(
      codeRuntime.execute(
        normNode(NORM_SRC, MORE_SCHEMA),
        ctx("node_under_test"),
        servicesFor(memoryWorkflowOps("r_1"), rec),
      ),
    );

    assert.equal(caught["code"], OUTPUT_INVALID_CODE);
    assert.equal(caught["node"], "node_under_test");
    assert.equal(caught["message"], 'output of "node_under_test" does not match its output_schema');
    assert.deepEqual(caught["details"], { path: "/", keyword: "type" });
    assert.equal(rec.calls.length, 1, "the sandbox is called once");
  }
});

test("C-5ebb76ed every sandbox fault fails the code node once without leaking", async () => {
  for (const fault of FAULT_CODES) {
    const rec = recordingSandbox(faultAnswer(fault));
    const caught = await rejection(
      codeRuntime.execute(
        normNode(NORM_SRC),
        ctx("node_under_test"),
        servicesFor(memoryWorkflowOps("r_1"), rec),
      ),
    );

    assert.equal(caught["code"], CODE_FAILED_CODE, `fault ${fault}`);
    assert.equal(caught["node"], "node_under_test");
    assert.equal(caught["message"], `code node "node_under_test" failed (${fault})`);
    assert.deepEqual(caught["details"], { fault });
    assert.equal(rec.calls.length, 1, `fault ${fault} calls the sandbox once`);
    leakFree(caught, `fault ${fault}`);
  }
});

test("C-5ebb76ed a rejecting sandbox fault is terminal and silent", async () => {
  const rejects = [
    rejectingSandbox(new SandboxError("SANDBOX_CLOSED", "closed")),
    rejectingSandbox(new Error("pool " + LEAK)),
  ];

  for (const sandbox of rejects) {
    const caught = await rejection(
      codeRuntime.execute(
        normNode(NORM_SRC),
        ctx("node_under_test"),
        servicesFor(memoryWorkflowOps("r_1"), sandbox),
      ),
    );

    assert.equal(caught["code"], CODE_FAILED_CODE);
    assert.equal(caught["node"], "node_under_test");
    assert.equal(caught["message"], `code node "node_under_test" failed (${SANDBOX_UNAVAILABLE_FAULT})`);
    assert.deepEqual(caught["details"], { fault: SANDBOX_UNAVAILABLE_FAULT });
    assert.equal(sandbox.calls.length, 1, "the rejecting sandbox is called once");
    leakFree(caught, "a rejecting sandbox");
  }
});

test("C-5ebb76ed the loop fault ends in the cap and the bomb memory growth is capped", async () => {
  const pool = createWorkerSandbox({ size: 1 });
  try {
    const services = servicesFor(memoryWorkflowOps("r_1"), pool);

    const started = Date.now();
    const loop = await rejection(
      codeRuntime.execute(normNode(LOOP_SRC), ctx("node_under_test"), services),
    );
    const elapsed = Date.now() - started;
    assert.equal(loop["code"], CODE_FAILED_CODE);
    assert.equal(loop["message"], 'code node "node_under_test" failed (timeout)');
    assert.deepEqual(loop["details"], { fault: "timeout" });
    assert.ok(elapsed >= 1000, `the loop ran at least 1000 ms but only ${elapsed} ms`);
    assert.ok(elapsed <= 3250, `the loop ended by 3250 ms but took ${elapsed} ms`);

    const rssBefore = process.memoryUsage().rss;
    const bomb = await rejection(
      codeRuntime.execute(normNode(BOMB_SRC), ctx("node_under_test"), services),
    );
    assert.equal(bomb["code"], CODE_FAILED_CODE);
    assert.equal(bomb["message"], 'code node "node_under_test" failed (memory_limit)');
    assert.deepEqual(bomb["details"], { fault: "memory_limit" });
    const growth = process.memoryUsage().rss - rssBefore;
    assert.ok(growth <= 268435456, `rss grew by ${growth} bytes over the bomb`);
  } finally {
    await pool.close();
  }
});

test("C-5ebb76ed a revived plain error copy is recognized for each new code", () => {
  const copies: { code: string; node: string; details: Record<string, string>; message: string }[] = [
    {
      code: NO_SANDBOX_CODE,
      node: "node_under_test",
      details: {},
      message: 'no sandbox is available for code node "node_under_test"',
    },
    {
      code: CODE_FAILED_CODE,
      node: "node_under_test",
      details: { fault: "timeout" },
      message: 'code node "node_under_test" failed (timeout)',
    },
  ];

  for (const copy of copies) {
    const error = new Error(copy.message) as unknown as Record<string, unknown>;
    error["code"] = copy.code;
    error["node"] = copy.node;
    error["details"] = { ...copy.details };

    let revived: unknown;
    assert.doesNotThrow(() => {
      revived = toInterpreterError(error);
    });
    assert.ok(revived instanceof InterpreterError, "the copy revives as an InterpreterError");
    const revivedError = revived;
    assert.equal(revivedError.code, copy.code);
    assert.equal(revivedError.node, copy.node);
    assert.deepEqual(revivedError.details, copy.details);
  }
});
