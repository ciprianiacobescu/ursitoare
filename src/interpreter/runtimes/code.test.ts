import assert from "node:assert/strict";
import { test } from "node:test";

import type { CodeNode, JsonSchema, JsonValue, Values } from "../../authoring/index.ts";
import { NO_EFFECT_GATE, memoryWorkflowOps, resolveValue } from "../index.ts";
import type {
  NodeOutcome,
  NodeServices,
  RunScope,
  StepContext,
  ToolInvoker,
  WorkflowOps,
} from "../index.ts";
import { InterpreterError } from "../errors.ts";
import { DEFAULT_SANDBOX_LIMITS, createWorkerSandbox } from "../../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "../../sandbox/index.ts";
import { CODE_LIMITS, codeRuntime, codeSeed } from "./code.ts";

assert.equal(typeof codeRuntime.execute, "function");
assert.equal(typeof codeSeed, "function");

const NORM_SRC =
  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";

const RAND_SRC =
  "return { t: Date.now(), r: Math.random(), iso: new Date().toISOString() };";

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

type SandboxObject = { [key: string]: SandboxJson };

const NORMALIZED: SandboxObject = {
  amount: 1234.57,
  currency: "EUR",
  is_large: true,
};

const SCOPE: RunScope = {
  inputs: { vendor: "Acme", invoice: "inv-1", amount: 1234.567, currency: "eur" },
  nodes: new Map(),
};

const NO_INVOKER: ToolInvoker = {
  async invoke() {
    throw new Error("no invoker");
  },
};

type Services = NodeServices & { sandbox?: WorkerSandbox };

function ctx(
  nodeId: string,
  attempt = 1,
  now = new Date("2026-11-02T10:00:00Z"),
): StepContext {
  return {
    tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
    runId: "r_1",
    lineageId: "r_1",
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    nodeId,
    kind: "code",
    mode: "mock",
    attempt,
    effect: null,
    unsafeToRetry: false,
    idemKey: null,
    principal: { userId: "u_alice", kind: "human" },
    now,
  };
}

function normNode(
  source: string,
  options: { schema?: JsonSchema; input?: Values; next?: string | null } = {},
): CodeNode {
  const next = options.next === undefined ? "pay" : options.next;
  return {
    kind: "code",
    language: "js",
    source,
    input: options.input ?? {
      amount: "${{ inputs.amount }}",
      currency: "${{ inputs.currency }}",
    },
    output_schema: options.schema ?? NORM_SCHEMA,
    ...(next === null ? {} : { next }),
  };
}

function randNode(): CodeNode {
  return {
    kind: "code",
    language: "js",
    source: RAND_SRC,
    input: {},
    output_schema: ANY_SCHEMA,
    next: "done",
  };
}

function servicesFor(ops: WorkflowOps, sandbox?: WorkerSandbox): Services {
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

function okAnswer(value: SandboxObject): SandboxResult {
  return { ok: true, value, stats: { ms: 1, memBytes: 0 } };
}

async function executeOk(
  node: CodeNode,
  context: StepContext,
  services: NodeServices,
): Promise<NodeOutcome> {
  let outcome: NodeOutcome | undefined;
  await assert.doesNotReject(async () => {
    outcome = await codeRuntime.execute(node, context, services);
  });
  assert.ok(outcome !== undefined, "the runtime returned an outcome");
  return outcome;
}

async function rejection(promise: Promise<unknown>): Promise<InterpreterError> {
  try {
    await promise;
  } catch (error) {
    assert.ok(error instanceof InterpreterError, "the runtime threw an InterpreterError");
    return error;
  }
  assert.fail("expected a rejection");
}

function objectOf(value: JsonValue | null): { [key: string]: JsonValue } {
  assert.ok(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "the output is a JSON object",
  );
  return value as { [key: string]: JsonValue };
}

function seedFor(context: StepContext): string {
  let seed: string | undefined;
  assert.doesNotThrow(() => {
    seed = codeSeed(context);
  });
  assert.ok(seed !== undefined, "codeSeed returned a string");
  return seed;
}

test("C-ccb658c5 a code node returns the sandbox object and records its call", async () => {
  const ops = memoryWorkflowOps("r_1");
  const rec = recordingSandbox(okAnswer(NORMALIZED));

  const outcome = await executeOk(normNode(NORM_SRC), ctx("normalize"), servicesFor(ops, rec));

  assert.deepEqual(outcome, {
    output: NORMALIZED,
    outcome: null,
    next: "pay",
    end: null,
  });
  assert.equal(rec.calls.length, 1, "the sandbox is called exactly once");
  assert.deepEqual(rec.calls[0], {
    code: NORM_SRC,
    input: { amount: 1234.567, currency: "eur" },
    limits: CODE_LIMITS,
    options: {
      seed: "r_1:normalize:1",
      nowIso: "2026-11-02T10:00:00.000Z",
      binding: "input",
      result: "object",
    },
  });
  assert.deepEqual(ops.executed, ["normalize"]);
});

test("C-ccb658c5 a code output that misses its schema is refused", async () => {
  const cases: { value: SandboxObject; details: Record<string, string> }[] = [
    {
      value: { amount: 1, currency: "EUR", is_large: "yes" },
      details: { path: "/is_large", keyword: "type" },
    },
    {
      value: { amount: 1, currency: "EUR" },
      details: { path: "/", keyword: "required" },
    },
    {
      value: { amount: "x", currency: "EUR", is_large: true },
      details: { path: "/amount", keyword: "type" },
    },
  ];

  for (const entry of cases) {
    const rec = recordingSandbox(okAnswer(entry.value));
    const error = await rejection(
      codeRuntime.execute(normNode(NORM_SRC), ctx("normalize"), servicesFor(memoryWorkflowOps("r_1"), rec)),
    );
    assert.equal(error.code, "INTERPRETER_OUTPUT_INVALID");
    assert.equal(error.node, "normalize");
    assert.equal(error.message, 'output of "normalize" does not match its output_schema');
    assert.deepEqual(error.details, entry.details);
    assert.equal(rec.calls.length, 1, "the sandbox is called before the schema check");
  }
});

test("C-ccb658c5 an unresolved code input is refused before the sandbox", async () => {
  const rec = recordingSandbox(okAnswer(NORMALIZED));
  const node = normNode(NORM_SRC, { input: { amount: "${{ inputs.missing }}" } });

  const error = await rejection(
    codeRuntime.execute(node, ctx("normalize"), servicesFor(memoryWorkflowOps("r_1"), rec)),
  );

  assert.equal(error.code, "INTERPRETER_REF_UNRESOLVED");
  assert.equal(error.node, "normalize");
  assert.deepEqual(error.details, { ref: "inputs.missing" });
  assert.equal(rec.calls.length, 0, "the sandbox is not called for an unresolved input");
});

test("C-ccb658c5 a code node without next returns a null next", async () => {
  const rec = recordingSandbox(okAnswer(NORMALIZED));

  const outcome = await executeOk(
    normNode(NORM_SRC, { next: null }),
    ctx("normalize"),
    servicesFor(memoryWorkflowOps("r_1"), rec),
  );

  assert.equal(outcome.next, null);
  assert.deepEqual(outcome.output, NORMALIZED);
  assert.equal(outcome.outcome, null);
  assert.equal(outcome.end, null);
});

test("C-98851868 codeSeed joins run id node id and attempt", () => {
  assert.equal(seedFor(ctx("normalize")), "r_1:normalize:1");
  assert.equal(seedFor(ctx("normalize", 2)), "r_1:normalize:2");
  assert.equal(
    seedFor({
      ...ctx("n", 12),
      runId: "run_00000000-0000-7000-8000-000000000000",
      lineageId: "run_00000000-0000-7000-8000-000000000000",
    }),
    "run_00000000-0000-7000-8000-000000000000:n:12",
  );
});

test("C-98851868 CODE_LIMITS is frozen and equals the sandbox defaults", () => {
  assert.equal(Object.isFrozen(CODE_LIMITS), true);
  assert.deepEqual(CODE_LIMITS, DEFAULT_SANDBOX_LIMITS);
  assert.deepEqual(CODE_LIMITS, {
    timeoutMs: 1000,
    memoryBytes: 33554432,
    maxStackBytes: 262144,
    maxOutputBytes: 1048576,
  });
});

test("C-98851868 the same seed and clock give the same code output", async () => {
  const pool = createWorkerSandbox({ size: 1 });
  try {
    const services = servicesFor(memoryWorkflowOps("r_1"), pool);

    const first = objectOf((await executeOk(randNode(), ctx("rand"), services)).output);
    const second = objectOf((await executeOk(randNode(), ctx("rand"), services)).output);
    const third = objectOf((await executeOk(randNode(), ctx("rand"), services)).output);

    assert.deepEqual(second, first);
    assert.deepEqual(third, first);
    assert.equal(first.t, 1793613600000);
    assert.equal(first.iso, "2026-11-02T10:00:00.000Z");
    assert.equal(typeof first.r, "number");
    assert.ok(typeof first.r === "number" && first.r >= 0 && first.r < 1);

    const attemptTwo = objectOf((await executeOk(randNode(), ctx("rand", 2), services)).output);
    assert.equal(attemptTwo.t, first.t);
    assert.equal(attemptTwo.iso, first.iso);
    assert.notEqual(attemptTwo.r, first.r);

    const later = objectOf(
      (await executeOk(randNode(), ctx("rand", 1, new Date("2026-11-03T10:00:00Z")), services))
        .output,
    );
    assert.equal(later.r, first.r);
    assert.equal(later.t, 1793700000000);
    assert.equal(later.iso, "2026-11-03T10:00:00.000Z");
  } finally {
    await pool.close();
  }
});
