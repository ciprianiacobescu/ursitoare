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

const EXIT_WORKER_URL = new URL("../../test/support/sandbox-exit-worker.ts", import.meta.url);

interface FactoryCall {
  url: URL;
  options: WorkerOptions;
  worker: Worker;
}

function runWithDefaults(sandbox: WorkerSandbox, code: string, input: SandboxJson): Promise<SandboxResult> {
  return sandbox.run(code, input, { ...LIM } as SandboxLimits, { ...OPT } as SandboxOptions);
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

function exitThenRealPool(): { sandbox: WorkerSandbox; calls: FactoryCall[] } {
  const calls: FactoryCall[] = [];
  let first = true;
  const sandbox = createWorkerSandbox({
    size: 1,
    workerFactory: (url, options) => {
      const worker = first ? new Worker(EXIT_WORKER_URL, options) : new Worker(url, options);
      first = false;
      calls.push({ url, options, worker });
      return worker;
    },
  });
  return { sandbox, calls };
}

test("C-57ff720c: a worker that exits during a job is replaced and the run reports sandbox_crash", async () => {
  const { sandbox, calls } = exitThenRealPool();
  try {
    const crashed = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    const message = expectFault(crashed, "the first run on the exiting worker", "sandbox_crash");
    assert.equal(message, "worker thread exited unexpectedly", "the exit message");
    assert.equal(crashed.stats.memBytes, -1, "a crashed run reports no memory sample");
    assert.equal(sandbox.respawns, 1, "the exited worker is replaced and counted");
    assert.equal(calls.length, 2, "the pool spawned a replacement at once");

    const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(after, "the second run"), NORMALIZE_VALUE);
    assert.equal(sandbox.respawns, 1, "the replacement answers without another respawn");
    assert.equal(calls.length, 2, "the replacement answers without another spawn");
  } finally {
    await sandbox.close();
  }
});

test("C-57ff720c: an idle worker exit is replaced lazily on the next run", async () => {
  const { sandbox, calls } = exitThenRealPool();
  try {
    const crashed = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    expectFault(crashed, "the first run on the exiting worker", "sandbox_crash");
    const second = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(second, "the second run"), NORMALIZE_VALUE);
    assert.equal(sandbox.respawns, 1, "the first replacement is counted");
    assert.equal(calls.length, 2, "the pool has one live worker after the second run");

    const idle = calls[1];
    assert.ok(idle !== undefined, "the replacement worker was recorded");
    const exited = new Promise<void>((resolve) => {
      idle.worker.once("exit", () => {
        resolve();
      });
    });
    await idle.worker.terminate();
    await exited;

    assert.equal(sandbox.respawns, 1, "an idle exit is not counted before the next run");
    assert.equal(calls.length, 2, "an idle exit spawns no worker by itself");

    const third = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(third, "the run after the idle exit"), NORMALIZE_VALUE);
    assert.equal(sandbox.respawns, 2, "the lazy replacement is counted on the next run");
    assert.equal(calls.length, 3, "the next run spawns the replacement");
  } finally {
    await sandbox.close();
  }
});

test("C-57ff720c: a factory that throws reports sandbox_crash and the next run succeeds", async () => {
  let attempts = 0;
  const sandbox = createWorkerSandbox({
    size: 1,
    workerFactory: (url, options) => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("no worker");
      }
      return new Worker(url, options);
    },
  });
  try {
    const crashed = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    const message = expectFault(crashed, "the run whose factory throws", "sandbox_crash");
    assert.equal(message, "worker thread could not be started", "the spawn failure message");
    assert.equal(crashed.stats.memBytes, -1, "a failed spawn reports no memory sample");

    const after = await runWithDefaults(sandbox, NORMALIZE, INPUT);
    assert.deepEqual(asValue(after, "the run after a failed spawn"), NORMALIZE_VALUE);
    assert.equal(attempts, 2, "the next run tries the factory again");
  } finally {
    await sandbox.close();
  }
});
