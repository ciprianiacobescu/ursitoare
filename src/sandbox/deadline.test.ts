import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import type { WorkerOptions } from "node:worker_threads";

import { createWorkerSandbox } from "./index.ts";
import type {
  SandboxFaultCode,
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
  WorkerSandboxOptions,
} from "./index.ts";

const LIM: SandboxLimits = {
  timeoutMs: 1000,
  memoryBytes: 33554432,
  maxStackBytes: 262144,
  maxOutputBytes: 1048576,
};

const OPT: SandboxOptions = {
  seed: "r_1:normalize:1",
  nowIso: "2026-10-24T12:00:00.000Z",
  binding: "input",
  result: "object",
};

const INPUT: SandboxJson = { amount: 1234.567, currency: "eur" };

const NORMALIZE =
  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";

const NORMALIZE_VALUE: SandboxJson = { amount: 1234.57, currency: "EUR", is_large: true };

const LOOP = "for (;;) {}";

const BIG = "const x = 3n ** 150000n; return { l: (x * x * x * x).toString().length };";

const LATE = "const x = 3n ** 100000n; return { l: (x * x * x * x).toString().length };";

const TIMEOUT_MESSAGE = "execution exceeded timeoutMs";

interface FactoryLog {
  url: URL;
  options: WorkerOptions;
}

function recordingPool(extra: WorkerSandboxOptions = {}): {
  sandbox: WorkerSandbox;
  calls: FactoryLog[];
} {
  const calls: FactoryLog[] = [];
  const sandbox = createWorkerSandbox({
    ...extra,
    workerFactory: (url, options) => {
      calls.push({ url, options });
      return new Worker(url, options);
    },
  });
  return { sandbox, calls };
}

function runWithDefaults(
  sandbox: WorkerSandbox,
  code: string,
  input: SandboxJson,
  limitsPatch: Partial<SandboxLimits> = {},
): Promise<SandboxResult> {
  return sandbox.run(
    code,
    input,
    { ...LIM, ...limitsPatch } as SandboxLimits,
    { ...OPT } as SandboxOptions,
  );
}

function asValue(result: SandboxResult, label: string): SandboxJson | null {
  if (!result.ok) {
    assert.fail(`${label}: expected ok, got fault ${result.fault.code}: ${result.fault.message}`);
  }
  return result.value;
}

function expectFault(result: SandboxResult, label: string, code: SandboxFaultCode): string {
  if (result.ok) {
    assert.fail(`${label}: expected fault ${code}, got ok ${JSON.stringify(result.value)}`);
  }
  assert.equal(result.fault.code, code, `${label}: fault code`);
  return result.fault.message;
}

async function timedRun(
  sandbox: WorkerSandbox,
  code: string,
  limitsPatch: Partial<SandboxLimits>,
): Promise<{ result: SandboxResult; elapsed: number }> {
  const started = performance.now();
  const result = await runWithDefaults(sandbox, code, {}, limitsPatch);
  return { result, elapsed: performance.now() - started };
}

test("C-8bb9cb9b: a loop is interrupted at its deadline and the pool keeps working", async () => {
  const sandbox = createWorkerSandbox({ size: 1 });
  try {
    const warm = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(warm, "warm-up NORMALIZE"), NORMALIZE_VALUE);

    const loop = await timedRun(sandbox, LOOP, { timeoutMs: 200 });
    const message = expectFault(loop.result, "LOOP at timeoutMs 200", "timeout");
    assert.equal(message, TIMEOUT_MESSAGE, "LOOP is interrupted, not killed by the watchdog");
    assert.ok(loop.elapsed >= 200, `LOOP finished after ${loop.elapsed} ms, at least its deadline`);
    assert.ok(loop.elapsed <= 2450, `LOOP finished after ${loop.elapsed} ms, within the window`);
    assert.equal(sandbox.respawns, 0, "an interrupted run does not respawn a worker");

    const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(after, "NORMALIZE after LOOP"), NORMALIZE_VALUE);
  } finally {
    await sandbox.close();
  }
});

test("C-8bb9cb9b: a late finish is a timeout without a respawn", async () => {
  const sandbox = createWorkerSandbox({ size: 1, graceMs: 8000 });
  try {
    const warm = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(warm, "warm-up NORMALIZE"), NORMALIZE_VALUE);

    const late = await timedRun(sandbox, LATE, { timeoutMs: 50 });
    const message = expectFault(late.result, "LATE at timeoutMs 50", "timeout");
    assert.equal(message, TIMEOUT_MESSAGE, "a run that ends after its deadline is a timeout");
    assert.ok(late.elapsed >= 50, `LATE finished after ${late.elapsed} ms, at least its deadline`);
    assert.ok(late.elapsed <= 10050, `LATE finished after ${late.elapsed} ms, before the watchdog`);
    assert.equal(sandbox.respawns, 0, "a late finish does not respawn a worker");
  } finally {
    await sandbox.close();
  }
});

test("C-8bb9cb9b: the watchdog kills a stuck worker and a replacement answers", async () => {
  const { sandbox, calls } = recordingPool({ size: 1 });
  try {
    const big = await timedRun(sandbox, BIG, { timeoutMs: 50 });
    const message = expectFault(big.result, "BIG at timeoutMs 50", "timeout");
    assert.match(
      message,
      /^worker watchdog killed the sandbox after \d+ ms \(limit 50 \+ grace 250\)$/,
      "the watchdog message names the limit and the default grace",
    );
    assert.ok(big.elapsed >= 50, `BIG finished after ${big.elapsed} ms, at least its deadline`);
    assert.ok(big.elapsed <= 2300, `BIG finished after ${big.elapsed} ms, within the window`);
    assert.equal(big.result.stats.memBytes, -1, "a watchdog timeout reports no memory sample");
    assert.equal(sandbox.respawns, 1, "the watchdog replacement counts one respawn");
    assert.equal(calls.length, 2, "the pool spawned the killed worker and its replacement");

    const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(after, "NORMALIZE on the replacement"), NORMALIZE_VALUE);
    assert.equal(calls.length, 2, "the replacement answers without another spawn");
  } finally {
    await sandbox.close();
  }
});

test("C-8bb9cb9b: the watchdog message names a custom grace", async () => {
  const sandbox = createWorkerSandbox({ size: 1, graceMs: 1000 });
  try {
    const big = await timedRun(sandbox, BIG, { timeoutMs: 50 });
    const message = expectFault(big.result, "BIG at timeoutMs 50 with grace 1000", "timeout");
    assert.match(
      message,
      /^worker watchdog killed the sandbox after \d+ ms \(limit 50 \+ grace 1000\)$/,
      "the watchdog message names the custom grace",
    );
    assert.ok(big.elapsed >= 50, `BIG finished after ${big.elapsed} ms, at least its deadline`);
    assert.ok(big.elapsed <= 3050, `BIG finished after ${big.elapsed} ms, within the window`);
    assert.equal(sandbox.respawns, 1, "a watchdog kill counts one respawn");
  } finally {
    await sandbox.close();
  }
});
