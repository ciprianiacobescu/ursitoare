import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "./clock.ts";

test("C-6f8e2578 fixedClock returns distinct Date objects for one instant", () => {
  const clock = fixedClock("2026-10-25T08:50:00.000Z");
  const first = clock.now();
  const second = clock.now();
  assert.notStrictEqual(first, second);
  assert.equal(first.toISOString(), "2026-10-25T08:50:00.000Z");
  assert.equal(second.toISOString(), "2026-10-25T08:50:00.000Z");
  assert.equal(first.getTime(), second.getTime());
});

test("C-6f8e2578 fixedClock rejects an invalid date", () => {
  assert.throws(() => fixedClock("not a date"), RangeError);
});
