/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { createPreviewQueue } from "./run-view.ts";

assert.equal(typeof createPreviewQueue, "function");

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

interface HandSettled {
  work: (ref: string) => Promise<void>;
  log: string[];
  settle(ref: string): void;
  settleAll(): void;
  maxInFlight(): number;
  inFlight(): number;
}

function handSettled(): HandSettled {
  const log: string[] = [];
  const pending = new Map<string, () => void>();
  let inFlight = 0;
  let maxInFlight = 0;
  const work = (ref: string): Promise<void> => {
    log.push(ref);
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    return new Promise<void>((resolve) => {
      pending.set(ref, () => {
        inFlight -= 1;
        pending.delete(ref);
        resolve();
      });
    });
  };
  const settle = (ref: string): void => {
    const release = pending.get(ref);
    assert.ok(release !== undefined, `ref ${ref} is in flight`);
    release();
  };
  const settleAll = (): void => {
    for (const ref of [...pending.keys()]) settle(ref);
  };
  return {
    work,
    log,
    settle,
    settleAll,
    maxInFlight: () => maxInFlight,
    inFlight: () => inFlight,
  };
}

function queueFor(
  work: (ref: string) => Promise<void>,
  limit?: number,
): ReturnType<typeof createPreviewQueue> {
  let queue: ReturnType<typeof createPreviewQueue> | undefined;
  assert.doesNotThrow(() => {
    queue = createPreviewQueue(work, limit);
  }, "createPreviewQueue answers");
  assert.ok(queue !== undefined);
  return queue;
}

function enqueue(queue: ReturnType<typeof createPreviewQueue>, refs: readonly string[]): void {
  assert.doesNotThrow(() => {
    queue.enqueue(refs);
  }, "enqueue answers");
}

test("C-aeec17be four requests stay in flight and each ref runs once in order", async () => {
  const w = handSettled();
  const queue = queueFor(w.work);

  enqueue(queue, ["a", "b", "c", "d", "e", "f", "a"]);
  await tick();
  assert.deepEqual(w.log, ["a", "b", "c", "d"]);
  assert.equal(w.maxInFlight(), 4);

  w.settle("a");
  await tick();
  assert.deepEqual(w.log, ["a", "b", "c", "d", "e"]);

  enqueue(queue, ["b", "g"]);
  await tick();
  assert.deepEqual(w.log, ["a", "b", "c", "d", "e"]);

  w.settleAll();
  await tick();
  w.settleAll();
  await tick();

  assert.equal(w.log.length, 7);
  assert.deepEqual([...w.log].sort(), ["a", "b", "c", "d", "e", "f", "g"]);
  assert.equal(w.maxInFlight(), 4);
  assert.equal(w.inFlight(), 0);
});

test("C-aeec17be a rejected work is swallowed and both refs are called", async () => {
  const seen: string[] = [];
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown): void => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);
  try {
    const queue = queueFor((ref) => {
      seen.push(ref);
      return Promise.reject(new Error("boom"));
    });
    enqueue(queue, ["x", "y"]);
    await tick();
    await tick();
    assert.deepEqual(seen, ["x", "y"]);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }
});

test("C-aeec17be a limit of one starts the next ref only after the first settles", async () => {
  const w = handSettled();
  const queue = queueFor(w.work, 1);

  enqueue(queue, ["a", "b"]);
  await tick();
  assert.deepEqual(w.log, ["a"]);

  w.settle("a");
  await tick();
  assert.deepEqual(w.log, ["a", "b"]);
});
