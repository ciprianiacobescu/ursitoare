import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import type { WorkerOptions } from "node:worker_threads";

import { createWorkerSandbox, SandboxError } from "./index.ts";
import type {
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

const NORMALIZE =
  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";

const NORMALIZE_VALUE: SandboxJson = { amount: 1234.57, currency: "EUR", is_large: true };

const INPUT: SandboxJson = { amount: 1234.567, currency: "eur" };

const BUSY = "for (let i = 0; i < 3000000; i++) {} return { i: 0 };";

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

function createWith(opts: unknown): WorkerSandbox {
  return createWorkerSandbox(opts as WorkerSandboxOptions | undefined);
}

function runWithDefaults(
  sandbox: WorkerSandbox,
  code: string,
  input: SandboxJson,
  limitsPatch: Partial<SandboxLimits> = {},
  optionsPatch: Partial<SandboxOptions> = {},
): Promise<SandboxResult> {
  return sandbox.run(
    code,
    input,
    { ...LIM, ...limitsPatch } as SandboxLimits,
    { ...OPT, ...optionsPatch } as SandboxOptions,
  );
}

function asValue(result: SandboxResult, label: string): SandboxJson | null {
  if (!result.ok) {
    assert.fail(`${label}: expected ok, got fault ${result.fault.code}: ${result.fault.message}`);
  }
  return result.value;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function settleWithin<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const outcome = await Promise.race([
    promise.then((value) => ({ timedOut: false as const, value })),
    delay(ms).then(() => ({ timedOut: true as const })),
  ]);
  if (outcome.timedOut) {
    assert.fail(`${label} did not settle within ${ms} ms`);
  }
  return outcome.value;
}

function assertInvalidOption(
  opts: unknown,
  option: string,
  message: string,
  label: string,
): void {
  assert.throws(
    () => createWith(opts),
    (error: unknown) => {
      assert.ok(error instanceof SandboxError, `${label}: error is a SandboxError`);
      assert.equal(error.name, "SandboxError", `${label}: name`);
      assert.equal(error.code, "SANDBOX_INVALID", `${label}: code`);
      assert.deepEqual(error.details, { option }, `${label}: details`);
      assert.equal(error.message, message, `${label}: message`);
      return true;
    },
    `${label}: createWorkerSandbox must throw synchronously`,
  );
}

test("C-061daa6c: the pool spawns lazily, runs up to size jobs, queues in order and validates options", async () => {
  {
    const { sandbox, calls } = recordingPool();
    try {
      assert.equal(sandbox.size, 2, "the default size is 2");
      assert.equal(sandbox.respawns, 0, "a fresh pool has no respawn");
      assert.equal(calls.length, 0, "no worker is spawned before the first run");

      for (let i = 0; i < 5; i += 1) {
        const result = await runWithDefaults(sandbox, NORMALIZE, INPUT);
        assert.deepEqual(asValue(result, `sequential NORMALIZE ${i + 1}`), NORMALIZE_VALUE);
      }

      assert.equal(calls.length, 1, "sequential runs reuse one worker");
      const first = calls[0];
      assert.ok(first !== undefined, "the factory recorded its first call");
      assert.equal(
        first.url.href,
        new URL("./worker-entry.ts", import.meta.url).href,
        "the worker entry URL",
      );
      assert.deepEqual(
        first.options,
        { env: {}, resourceLimits: { stackSizeMb: 4, maxOldGenerationSizeMb: 512 } },
        "the default worker options",
      );
      assert.equal(sandbox.respawns, 0, "five sequential runs cause no respawn");
    } finally {
      await sandbox.close();
    }
  }

  {
    const { sandbox, calls } = recordingPool();
    try {
      const results = await settleWithin(
        Promise.all(
          Array.from({ length: 12 }, () => runWithDefaults(sandbox, NORMALIZE, INPUT)),
        ),
        5000,
        "twelve concurrent runs",
      );
      const values = results.map((result, index) =>
        asValue(result, `concurrent NORMALIZE ${index + 1}`),
      );
      const digests = new Set(values.map((value) => JSON.stringify(value)));
      assert.equal(digests.size, 1, "all concurrent runs return one value");
      assert.deepEqual(values[0], NORMALIZE_VALUE, "the concurrent value is the normalize value");
      assert.equal(calls.length, 2, "a size 2 pool spawns two workers for twelve concurrent runs");
      assert.equal(sandbox.respawns, 0, "concurrent runs cause no respawn");
    } finally {
      await sandbox.close();
    }
  }

  {
    const sandbox = createWorkerSandbox({ size: 1 });
    try {
      const order: string[] = [];
      const runs: Promise<void>[] = [];
      runs.push(
        runWithDefaults(sandbox, BUSY, {}).then((result) => {
          assert.deepEqual(asValue(result, "BUSY"), { i: 0 });
          order.push("BUSY");
        }),
      );
      for (let n = 1; n <= 5; n += 1) {
        runs.push(
          runWithDefaults(sandbox, `return { i: ${n} };`, {}).then((result) => {
            assert.deepEqual(asValue(result, `queued run ${n}`), { i: n });
            order.push(String(n));
          }),
        );
      }
      await settleWithin(Promise.all(runs), 5000, "the size 1 queue");
      assert.deepEqual(
        order,
        ["BUSY", "1", "2", "3", "4", "5"],
        "a size 1 pool serves its queue first in, first out",
      );
    } finally {
      await sandbox.close();
    }
  }

  {
    const { sandbox, calls } = recordingPool({
      size: 3,
      stackSizeMb: 8,
      maxOldGenerationSizeMb: 256,
    });
    try {
      const result = await runWithDefaults(sandbox, NORMALIZE, INPUT);
      assert.deepEqual(asValue(result, "size 3 NORMALIZE"), NORMALIZE_VALUE);
      const first = calls[0];
      assert.ok(first !== undefined, "the size 3 pool spawned a worker");
      assert.deepEqual(
        first.options,
        { env: {}, resourceLimits: { stackSizeMb: 8, maxOldGenerationSizeMb: 256 } },
        "the size 3 pool passes its resource limits",
      );
      assert.equal(sandbox.size, 3, "the requested size is kept");
    } finally {
      await sandbox.close();
    }
  }

  const badRanges: readonly {
    name: string;
    min: number;
    max: number;
    values: readonly unknown[];
  }[] = [
    { name: "size", min: 1, max: 16, values: [0, 17, 1.5, "2", Number.NaN] },
    { name: "graceMs", min: 0, max: 10000, values: [-1, 10001] },
    { name: "stackSizeMb", min: 1, max: 64, values: [0, 65] },
    { name: "stackCapBytes", min: 32768, max: 1048576, values: [32767, 1048577] },
    { name: "maxOldGenerationSizeMb", min: 16, max: 4096, values: [15, 4097] },
  ];
  for (const row of badRanges) {
    for (const value of row.values) {
      assertInvalidOption(
        { [row.name]: value },
        row.name,
        `${row.name} must be an integer from ${row.min} to ${row.max}`,
        `${row.name} ${String(value)}`,
      );
    }
  }

  assertInvalidOption(
    { workerFactory: "x" },
    "workerFactory",
    "workerFactory must be a function",
    "workerFactory is not a function",
  );
  for (const [label, opts] of [
    ["null opts", null],
    ["number opts", 5],
    ["string opts", "x"],
    ["array opts", []],
    ["map opts", new Map()],
  ] as const) {
    assertInvalidOption(opts, "opts", "opts must be a plain object", label);
  }

  assertInvalidOption({ sizes: 2 }, "sizes", "sizes is not an option", "unknown key");
  let reads = 0;
  assertInvalidOption(
    {
      get size() {
        reads += 1;
        throw new Error("x");
      },
      sizes: 2,
    },
    "sizes",
    "sizes is not an option",
    "unknown key before a value",
  );
  assert.equal(reads, 0, "an unknown key is refused before any value is read");
  reads = 0;
  assertInvalidOption(
    {
      sizes: 2,
      get size() {
        reads += 1;
        throw new Error("x");
      },
    },
    "sizes",
    "sizes is not an option",
    "unknown key listed first",
  );
  assert.equal(reads, 0, "an unknown key is refused before any value is read");

  assertInvalidOption(
    {
      get size() {
        throw new Error("x");
      },
    },
    "opts",
    "opts could not be read",
    "a throwing getter",
  );
  assertInvalidOption(
    new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("x");
        },
      },
    ),
    "opts",
    "opts could not be read",
    "a throwing ownKeys trap",
  );
  assertInvalidOption(
    { size: 0, graceMs: -1 },
    "size",
    "size must be an integer from 1 to 16",
    "the first invalid option wins",
  );

  const goodOptions: readonly { label: string; opts: unknown; size: number }[] = [
    { label: "undefined", opts: undefined, size: 2 },
    { label: "empty object", opts: {}, size: 2 },
    { label: "null prototype", opts: Object.create(null), size: 2 },
    { label: "size undefined", opts: { size: undefined }, size: 2 },
    { label: "size minimum", opts: { size: 1 }, size: 1 },
    { label: "size maximum", opts: { size: 16 }, size: 16 },
    { label: "graceMs minimum", opts: { graceMs: 0 }, size: 2 },
    { label: "graceMs maximum", opts: { graceMs: 10000 }, size: 2 },
    { label: "stackSizeMb minimum", opts: { stackSizeMb: 1 }, size: 2 },
    { label: "stackSizeMb maximum", opts: { stackSizeMb: 64 }, size: 2 },
    { label: "stackCapBytes minimum", opts: { stackCapBytes: 32768 }, size: 2 },
    { label: "stackCapBytes maximum", opts: { stackCapBytes: 1048576 }, size: 2 },
    { label: "maxOldGenerationSizeMb minimum", opts: { maxOldGenerationSizeMb: 16 }, size: 2 },
    { label: "maxOldGenerationSizeMb maximum", opts: { maxOldGenerationSizeMb: 4096 }, size: 2 },
  ];
  for (const row of goodOptions) {
    const sandbox = createWith(row.opts);
    assert.equal(sandbox.size, row.size, `${row.label} is accepted`);
    await sandbox.close();
  }

  reads = 0;
  const counting = createWorkerSandbox({
    get size() {
      reads += 1;
      return 3;
    },
  });
  assert.equal(counting.size, 3, "a counting size getter is read and accepted");
  assert.equal(reads, 1, "the size getter is read exactly once");
  await counting.close();
});
