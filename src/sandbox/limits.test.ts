import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_SANDBOX_LIMITS,
  MIN_STACK_BYTES,
  SANDBOX_POOL_DEFAULTS,
  clampStack,
  memoryBucket,
  poolSize,
  seedOf,
  workerEntryUrl,
} from "./limits.ts";
import { SandboxError } from "./types.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

test("C-105b574e seedOf hashes the empty, ascii, path-like and surrogate-pair seeds", () => {
  const cases: readonly [string, number][] = [
    ["", 2166136261],
    ["a", 3826002220],
    ["r_1:normalize:1", 2599622025],
    ["😀", 3409036472],
  ];
  for (const [input, expected] of cases) {
    assert.equal(answer(() => seedOf(input)), expected);
  }
});

test("C-105b574e memoryBucket rounds up to a whole 16 MiB bucket and never below one", () => {
  const cases: readonly [number, number][] = [
    [1, 16777216],
    [16777216, 16777216],
    [16777217, 33554432],
    [33554432, 33554432],
    [0.5, 16777216],
  ];
  for (const [input, expected] of cases) {
    assert.equal(answer(() => memoryBucket(input)), expected);
  }
});

test("C-105b574e clampStack honours the minimum, the cap and the floor", () => {
  const cases: readonly [number, number, number][] = [
    [262144, 262144, 262144],
    [1, 262144, 32768],
    [536870912, 262144, 262144],
    [100000.9, 262144, 100000],
    [262144, 65536, 65536],
  ];
  for (const [maxStackBytes, capBytes, expected] of cases) {
    assert.equal(answer(() => clampStack(maxStackBytes, capBytes)), expected);
  }
});

test("C-105b574e poolSize is one unless the machine has more than two cpus", () => {
  const cases: readonly [number, number][] = [
    [1, 1],
    [2, 1],
    [3, 2],
    [16, 2],
    [0, 1],
    [NaN, 1],
    [2.5, 1],
  ];
  for (const [input, expected] of cases) {
    assert.equal(answer(() => poolSize(input)), expected);
  }
});

test("C-105b574e workerEntryUrl swaps the pool entry for the worker entry with the same extension", () => {
  assert.equal(
    answer(() => workerEntryUrl("file:///app/src/sandbox/pool.ts").href),
    "file:///app/src/sandbox/worker-entry.ts",
  );
  assert.equal(
    answer(() => workerEntryUrl("file:///app/dist/sandbox/pool.js").href),
    "file:///app/dist/sandbox/worker-entry.js",
  );
});

test("C-105b574e the exported defaults and minimum stack size hold the fixed numbers and are frozen", () => {
  assert.equal(MIN_STACK_BYTES, 32768);
  assert.deepEqual(DEFAULT_SANDBOX_LIMITS, {
    timeoutMs: 1000,
    memoryBytes: 33554432,
    maxStackBytes: 262144,
    maxOutputBytes: 1048576,
  });
  assert.equal(Object.isFrozen(DEFAULT_SANDBOX_LIMITS), true);
  assert.deepEqual(SANDBOX_POOL_DEFAULTS, {
    size: 2,
    graceMs: 250,
    stackSizeMb: 4,
    stackCapBytes: 262144,
    maxOldGenerationSizeMb: 512,
  });
  assert.equal(Object.isFrozen(SANDBOX_POOL_DEFAULTS), true);
});

test("C-105b574e SandboxError is a named Error carrying a code and read-only details", () => {
  assert.doesNotThrow(() => {
    const first = new SandboxError("SANDBOX_INVALID", "m", { option: "size" });
    assert.equal(first instanceof Error, true);
    assert.equal(first.name, "SandboxError");
    assert.equal(first.code, "SANDBOX_INVALID");
    assert.equal(first.message, "m");
    assert.deepEqual(first.details, { option: "size" });

    const second = new SandboxError("SANDBOX_CLOSED", "m");
    assert.equal(second.name, "SandboxError");
    assert.equal(second.code, "SANDBOX_CLOSED");
    assert.equal(second.message, "m");
    assert.deepEqual(second.details, {});
  });
});
