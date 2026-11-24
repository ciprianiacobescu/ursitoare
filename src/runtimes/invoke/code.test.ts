import assert from "node:assert/strict";
import { test } from "node:test";

import { InterpreterError } from "../../interpreter/index.ts";
import type { StepContext } from "../../interpreter/index.ts";
import { createWorkerSandbox } from "../../sandbox/index.ts";
import type { WorkerSandbox } from "../../sandbox/index.ts";
import { createCodeRunner } from "./code.ts";
import type { CodeRunner } from "./types.ts";

const SRC_WC = "return { words: input.text.trim().split(/\\s+/).length };";
const SRC_RANDOM = "return { r: Math.random(), t: new Date().toISOString(), n: Date.now() };";
const NOW = "2026-11-06T10:00:00.000Z";

const CTX: StepContext = {
  tenant: { tenantId: "tenant_a", reviewProfile: "solo" },
  runId: "r_1",
  lineageId: "r_1",
  flowId: "count-words",
  flowHash: "sha256:" + "b".repeat(64),
  nodeId: "count",
  kind: "block",
  mode: "live",
  attempt: 1,
  effect: "read",
  unsafeToRetry: false,
  idemKey: null,
  principal: { userId: "u_alice", kind: "human" },
  now: new Date(NOW),
} as StepContext;

interface Outcome {
  value: unknown;
  error: unknown;
}

// Whatever happens, including a stub's "not implemented", comes back as data to assert on.
async function settle(fn: () => Promise<unknown>): Promise<Outcome> {
  try {
    return { value: await fn(), error: undefined };
  } catch (error) {
    return { value: undefined, error };
  }
}

function runOf(runner: () => CodeRunner, source: string, args: unknown, ctx = CTX): Promise<Outcome> {
  return settle(() =>
    runner()({ kind: "code", source } as Parameters<CodeRunner>[0], args as Parameters<CodeRunner>[1], ctx),
  );
}

interface Recorded {
  pool: WorkerSandbox;
  runs: unknown[][];
}

function recording(): Recorded {
  const real = createWorkerSandbox({ size: 1 });
  const runs: unknown[][] = [];
  const pool: WorkerSandbox = {
    get size() {
      return real.size;
    },
    get respawns() {
      return real.respawns;
    },
    run(code, input, limits, options) {
      runs.push([code, input, limits, options]);
      return real.run(code, input, limits, options);
    },
    close: () => real.close(),
  };
  return { pool, runs };
}

function failure(outcome: Outcome): InterpreterError {
  assert.ok(outcome.error instanceof InterpreterError, "the runner rejects with an InterpreterError");
  return outcome.error;
}

test("C-8e70f1b7 O1 runs the source on the pool with the limits and the step options", async () => {
  const { pool, runs } = recording();
  try {
    const out = await runOf(() => createCodeRunner(() => pool), SRC_WC, { text: "a b c" });
    assert.deepEqual(out.value, { output: { words: 3 } });
    assert.deepEqual(runs, [
      [
        SRC_WC,
        { text: "a b c" },
        { timeoutMs: 1000, memoryBytes: 33554432, maxStackBytes: 262144, maxOutputBytes: 1048576 },
        { seed: "r_1:count:1", nowIso: NOW, binding: "input", result: "object" },
      ],
    ]);
  } finally {
    await pool.close();
  }
});

test("C-8e70f1b7 O2 the seed and the clock are the step's", async () => {
  const { pool } = recording();
  try {
    const runner = (): CodeRunner => createCodeRunner(() => pool);
    const first = await runOf(runner, SRC_RANDOM, { text: "a" });
    const again = await runOf(runner, SRC_RANDOM, { text: "a" });
    const second = await runOf(runner, SRC_RANDOM, { text: "a" }, { ...CTX, attempt: 2 });
    const t = { t: NOW, n: 1793959200000 };
    assert.deepEqual(first.value, { output: { r: 0.7660308103077114, ...t } });
    assert.deepEqual(again.value, { output: { r: 0.7660308103077114, ...t } });
    assert.deepEqual(second.value, { output: { r: 0.2398981919977814, ...t } });
  } finally {
    await pool.close();
  }
});

const FAULTS: readonly [string, string, string][] = [
  ["E1", "throw new Error('secret_text');", "runtime_error"],
  ["E2", "return {", "syntax_error"],
  ["E3", "return 5;", "output_invalid"],
  ["E4", "return { s: 'x'.repeat(2000000) };", "output_too_large"],
  ["E5", "while (true) {}", "timeout"],
  ["E6", "function f() { return f() + 1; } return { v: f() };", "stack_overflow"],
];

for (const [row, source, fault] of FAULTS) {
  test(`C-8e70f1b7 ${row} a ${fault} fails the node with fixed details`, async () => {
    const { pool } = recording();
    try {
      const err = failure(await runOf(() => createCodeRunner(() => pool), source, { text: "a" }));
      assert.equal(err.code, "INTERPRETER_TOOL_FAILED");
      assert.equal(err.message, "node execution failed");
      assert.equal(err.node, "count");
      assert.deepEqual(err.details, { stage: "code", fault });
      assert.ok(!JSON.stringify({ message: err.message, node: err.node, details: err.details }).includes("secret_text"));
    } finally {
      await pool.close();
    }
  });
}

test("C-8e70f1b7 N1 a null pool rejects and the same runner works once the pool exists", async () => {
  const { pool } = recording();
  try {
    let current: WorkerSandbox | null = null;
    const runner = createCodeRunnerLazily(() => current);
    const err = failure(await runOf(runner, SRC_WC, { text: "a b c" }));
    assert.equal(err.code, "INTERPRETER_NO_SANDBOX");
    assert.equal(err.message, 'no sandbox is available for tool call of "count"');
    assert.equal(err.node, "count");
    assert.deepEqual(err.details, {});
    current = pool;
    const out = await runOf(runner, SRC_WC, { text: "a b c" });
    assert.deepEqual(out.value, { output: { words: 3 } });
  } finally {
    await pool.close();
  }
});

// One runner for both calls: built on first use, so a stub's throw is data too.
function createCodeRunnerLazily(sandbox: () => WorkerSandbox | null): () => CodeRunner {
  let built: CodeRunner | undefined;
  return () => {
    built ??= createCodeRunner(sandbox);
    return built;
  };
}

test("C-8e70f1b7 N2 a closed pool is sandbox_unavailable", async () => {
  const { pool } = recording();
  await pool.close();
  const err = failure(await runOf(() => createCodeRunner(() => pool), SRC_WC, { text: "a" }));
  assert.equal(err.code, "INTERPRETER_TOOL_FAILED");
  assert.deepEqual(err.details, { stage: "code", fault: "sandbox_unavailable" });
});
