import assert from "node:assert/strict";
import { test } from "node:test";

import { NO_FAULT_POINTS, type FaultPoints } from "../../../src/config/index.ts";
import { faultObserver } from "./observer.ts";

test("C-a2319613: the observer names each fault point as phase and step and passes errors through", () => {
  const calls: string[][] = [];
  const recording: FaultPoints = {
    armed: [],
    hit(point: string): void {
      calls.push([point]);
    },
  };

  assert.doesNotThrow(() => {
    const observer = faultObserver(recording);
    assert.equal(observer("before", "pay", "wf-1"), undefined);
    assert.equal(observer("after", "pay", "wf-1"), undefined);
    assert.equal(observer("after", "mail:send", "wf-2"), undefined);
  });
  assert.deepEqual(calls, [["before:pay"], ["after:pay"], ["after:mail:send"]]);

  const err = new Error("stop");
  const throwing: FaultPoints = {
    armed: [],
    hit(): void {
      throw err;
    },
  };
  assert.throws(
    () => faultObserver(throwing)("after", "x", "w"),
    (error: unknown) => error === err,
  );

  assert.doesNotThrow(() => {
    assert.equal(faultObserver(NO_FAULT_POINTS)("after", "pay", "w"), undefined);
  });
});
