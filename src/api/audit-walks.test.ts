import assert from "node:assert/strict";
import { test } from "node:test";

import { createWalkQueue } from "./audit-routes.ts";
import type { WalkQueue } from "./audit-routes.ts";

assert.equal(typeof createWalkQueue, "function");

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function queueOf(maxConcurrent: number): WalkQueue {
  let queue: WalkQueue | undefined;
  assert.doesNotThrow(() => {
    queue = createWalkQueue(maxConcurrent);
  }, "createWalkQueue returns a queue");
  assert.ok(queue !== undefined, "createWalkQueue did not throw");
  return queue;
}

const START_A1 = 1n;
const START_A2 = 2n;
const START_B = 1n;
const START_C = 1n;

test("C-e8203aba equal requests share a walk", async () => {
  const q = queueOf(2);
  let s1Calls = 0;
  let s2Calls = 0;
  const d1 = deferred<string>();
  const walk = (): Promise<string> => {
    s1Calls += 1;
    return d1.promise;
  };
  const duplicate = (): Promise<string> => {
    s2Calls += 1;
    return Promise.resolve("r2");
  };

  const p1 = q.run("a", START_A1, walk);
  const p2 = q.run("a", START_A1, duplicate);

  assert.equal(s1Calls, 1, "the first request started the walk at once");
  assert.equal(s2Calls, 0, "the equal request never called its own start");
  assert.strictEqual(p1, p2, "both callers hold the same promise");

  d1.resolve("r1");
  await assert.doesNotReject(async () => {
    await p1;
    await p2;
  }, "the shared walk resolves for both callers");
  assert.equal(await p1, "r1", "the shared promise gives r1");
  assert.equal(await p2, "r1", "the second caller gets the same r1");

  let s3Calls = 0;
  const settled = (): Promise<string> => {
    s3Calls += 1;
    return Promise.resolve("r3");
  };
  const p3 = q.run("a", START_A1, settled);
  assert.equal(s3Calls, 1, "after the walk settled the next equal request starts it again");
  assert.equal(await p3, "r3");
});

test("C-010f914e another start of a tenant waits while other tenants do not", async () => {
  const q = queueOf(2);
  const counts = { a1: 0, a2: 0, b: 0, c: 0 };
  const dA1 = deferred<string>();
  const dB = deferred<string>();
  const startA1 = (): Promise<string> => {
    counts.a1 += 1;
    return dA1.promise;
  };
  const startA2 = (): Promise<string> => {
    counts.a2 += 1;
    return Promise.resolve("ra2");
  };
  const startB = (): Promise<string> => {
    counts.b += 1;
    return dB.promise;
  };
  const startC = (): Promise<string> => {
    counts.c += 1;
    return Promise.resolve("rc");
  };

  const pA1 = q.run("a", START_A1, startA1);
  const pA2 = q.run("a", START_A2, startA2);
  const pB = q.run("b", START_B, startB);
  const pC = q.run("c", START_C, startC);

  assert.deepEqual(counts, { a1: 1, a2: 0, b: 1, c: 0 }, "only the first walk of each running tenant started");

  dA1.resolve("ra1");
  await assert.doesNotReject(() => pA1, "the first walk of tenant a settles");
  assert.equal(counts.a2, 1, "tenant a's waiting start ran as soon as its first walk settled");
  assert.equal(counts.c, 0, "tenant c is still held back while two walks run");

  dB.resolve("rb");
  await assert.doesNotReject(() => pB, "tenant b's walk settles");
  assert.equal(counts.c, 1, "tenant c's walk started once a slot opened");
  assert.equal(await pA2, "ra2");
  assert.equal(await pC, "rc");
});

test("C-d85800a6 a failed walk is not kept", async () => {
  const q = queueOf(1);
  let s1Calls = 0;
  let s2Calls = 0;
  const error = new Error("db down");
  const d1 = deferred<string>();
  const start1 = (): Promise<string> => {
    s1Calls += 1;
    return d1.promise;
  };
  const start2 = (): Promise<string> => {
    s2Calls += 1;
    return Promise.resolve("r2");
  };

  const p1 = q.run("a", START_A1, start1);
  const p1Again = q.run("a", START_A1, start1);
  const p2 = q.run("a", START_A2, start2);

  assert.equal(s1Calls, 1, "the first walk started once");
  assert.strictEqual(p1, p1Again, "the equal call shares the failing walk");
  assert.equal(s2Calls, 0, "the next walk of the same tenant waits");

  d1.reject(error);
  await assert.rejects(
    () => p1Again,
    (caught: unknown) => {
      assert.strictEqual(caught, error, "the second caller gets the error itself");
      return true;
    },
    "the shared promise rejects with error",
  );
  await assert.rejects(
    () => p1,
    (caught: unknown) => {
      assert.strictEqual(caught, error, "the first caller gets the error itself");
      return true;
    },
    "the first promise rejects with error",
  );

  assert.equal(s2Calls, 1, "the waiting start ran after the failed walk settled");
  assert.equal(await p2, "r2");

  let s3Calls = 0;
  const start3 = (): Promise<string> => {
    s3Calls += 1;
    return Promise.resolve("r3");
  };
  const p3 = q.run("a", START_A1, start3);
  assert.equal(s3Calls, 1, "the next equal request runs its own start after a failure");
  assert.equal(await p3, "r3");
});

test("C-d11a92d3 a start that throws rejects and the size is checked", async () => {
  const q = queueOf(1);
  const error = new Error("bad start");

  const p1 = q.run("a", START_A1, () => {
    throw error;
  });
  await assert.rejects(
    () => p1,
    (caught: unknown) => {
      assert.strictEqual(caught, error, "the walk rejects with the thrown error");
      return true;
    },
    "a start that throws gives a rejected walk",
  );

  let s4Calls = 0;
  const start4 = (): Promise<string> => {
    s4Calls += 1;
    return Promise.resolve("r4");
  };
  const p4 = q.run("a", START_A1, start4);
  assert.equal(s4Calls, 1, "after the failed walk settled the next request started");
  assert.equal(await p4, "r4");

  assert.throws(() => createWalkQueue(0), RangeError, "size 0 is a RangeError");
  assert.throws(() => createWalkQueue(1.5), RangeError, "a fractional size is a RangeError");
  assert.throws(() => createWalkQueue(-1), RangeError, "a negative size is a RangeError");
});
