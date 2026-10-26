import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "./clock.ts";
import type { Clock } from "./clock.ts";
import { createIds, sequentialIds, systemIds } from "./ids.ts";

const UUIDV7_RUN_PATTERN =
  /^run_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("C-6f8e2578 createIds writes the timestamp version counter variant and random bits", () => {
  const ids = createIds(fixedClock("1970-01-01T00:00:00.000Z"), (size) => {
    assert.equal(size, 8);
    return new Uint8Array(size).fill(255);
  });

  assert.equal(ids.next("req"), "req_00000000-0000-7000-bfff-ffffffffffff");
  assert.equal(ids.next("req"), "req_00000000-0000-7001-bfff-ffffffffffff");
});

test("C-6004f84c the counter rolls into the timestamp after 4096 ids", () => {
  assert.doesNotThrow(() => {
    const ids = createIds(
      fixedClock("1970-01-01T00:00:00.000Z"),
      (size) => new Uint8Array(size).fill(0),
    );

    let last = "";
    for (let call = 0; call < 4097; call += 1) {
      last = ids.next("req");
    }

    assert.equal(last, "req_00000000-0001-7000-8000-000000000000");
    assert.equal(last.slice("req_".length).split("-").slice(0, 2).join(""), "000000000001");
    assert.equal(last.slice("req_".length).split("-")[2], "7000");
  });
});

test("C-6004f84c ids stay ordered when the clock moves forward and back", () => {
  assert.doesNotThrow(() => {
    let millis = Date.parse("2026-10-25T08:50:00.000Z");
    const clock: Clock = { now: () => new Date(millis) };
    const ids = createIds(clock, (size) => new Uint8Array(size).fill(0));

    const first = ids.next("req");
    millis += 1;
    const second = ids.next("req");
    millis -= 1000;
    const third = ids.next("req");
    const fourth = ids.next("req");

    assert.ok(first < second);
    assert.ok(second < third);
    assert.ok(third < fourth);
  });
});

test("C-68b36af5 createIds rejects prefixes outside the lower-case rule", () => {
  const clock = fixedClock("2026-10-25T08:50:00.000Z");
  const random = (size: number): Uint8Array => new Uint8Array(size).fill(0);

  assert.throws(() => createIds(clock, random).next(""), RangeError);
  assert.throws(() => createIds(clock, random).next("Run"), RangeError);
  assert.throws(() => createIds(clock, random).next("a_b"), RangeError);
});

test("C-68b36af5 systemIds returns a uuidv7 with its prefix", () => {
  assert.match(systemIds.next("run"), UUIDV7_RUN_PATTERN);
});

test("C-68b36af5 sequentialIds counts from its seed", () => {
  const ids = sequentialIds(1);

  assert.equal(ids.next("run"), "run_00000000-0000-7000-8000-000000000001");
  assert.equal(ids.next("req"), "req_00000000-0000-7000-8000-000000000002");
  assert.equal(sequentialIds().next("run"), "run_00000000-0000-7000-8000-000000000000");
});

test("C-68b36af5 sequentialIds rejects a bad seed and overflow", () => {
  assert.throws(() => sequentialIds(-1), RangeError);
  assert.throws(() => sequentialIds(1.5), RangeError);
  assert.throws(() => sequentialIds(0x1_0000_0000_0000), RangeError);

  const ids = sequentialIds(0xffff_ffff_ffff);
  assert.equal(ids.next("run"), "run_00000000-0000-7000-8000-ffffffffffff");
  assert.throws(() => ids.next("req"), RangeError);
});
