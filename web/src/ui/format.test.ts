import assert from "node:assert/strict";
import { test } from "node:test";

import { formatAgo, formatDuration, formatInstant } from "./format.ts";

const start = "2026-11-17T21:00:00Z";
const startMs = Date.parse(start);

test("C-67de6235 formatDuration answers the D rows", () => {
  assert.equal(typeof formatDuration, "function");
  assert.equal(formatDuration(start, "2026-11-17T21:00:00.999Z", 0), "<1 s");
  assert.equal(formatDuration(start, "2026-11-17T21:00:02.349Z", 0), "2.3 s");
  assert.equal(formatDuration(start, "2026-11-17T21:00:59.999Z", 0), "59.9 s");
  assert.equal(formatDuration(start, "2026-11-17T21:04:05Z", 0), "4 min 5 s");
  assert.equal(formatDuration(start, "2026-11-17T21:01:00Z", 0), "1 min 0 s");
  assert.equal(formatDuration(start, "2026-11-17T23:03:30Z", 0), "2 h 3 min");
  assert.equal(formatDuration(start, "2026-11-17T22:00:00Z", 0), "1 h 0 min");
  assert.equal(formatDuration(start, null, startMs + 1500), "1.5 s");
  assert.equal(formatDuration(start, "2026-11-17T20:59:59Z", 0), "—");
  assert.equal(formatDuration("nope", null, startMs), "—");
  assert.equal(formatDuration(start, "2026-11-17T21:00:01Z", 0), "1.0 s");
  assert.equal(formatDuration(start, "2026-11-17T21:00:00Z", 0), "<1 s");
  assert.equal(formatDuration(start, "2026-11-17T21:59:59.999Z", 0), "59 min 59 s");
});

test("C-67de6235 formatInstant answers the I rows", () => {
  assert.equal(typeof formatInstant, "function");
  assert.equal(formatInstant("2026-11-17T21:38:05.123Z"), "2026-11-17 21:38 UTC");
  assert.equal(formatInstant("2026-11-17T22:38:00+01:00"), "2026-11-17 21:38 UTC");
  assert.equal(formatInstant("yesterday"), "yesterday");
  assert.equal(formatInstant(""), "");
  assert.equal(formatInstant("2026-11-17"), "2026-11-17 00:00 UTC");
  assert.equal(
    formatInstant("+275760-09-13T00:00:00.000Z"),
    "+275760-09-13T00:00:00.000Z",
  );
});

test("C-67de6235 formatAgo answers the A rows", () => {
  assert.equal(typeof formatAgo, "function");
  const nowMs = Date.parse("2026-11-18T12:00:00Z");
  assert.equal(formatAgo("2026-11-18T11:59:30Z", nowMs), "just now");
  assert.equal(formatAgo("2026-11-18T11:55:00Z", nowMs), "5 min ago");
  assert.equal(formatAgo("2026-11-18T09:00:00Z", nowMs), "3 h ago");
  assert.equal(formatAgo("2026-11-16T11:00:00Z", nowMs), "2 d ago");
  assert.equal(formatAgo("2026-11-18T12:00:01Z", nowMs), "2026-11-18 12:00 UTC");
  assert.equal(formatAgo("junk", nowMs), "junk");
  assert.equal(formatAgo("2026-11-18T12:00:00Z", nowMs), "just now");
  assert.equal(formatAgo("2026-11-18T11:59:00Z", nowMs), "1 min ago");
  assert.equal(formatAgo("2026-11-18T11:00:00Z", nowMs), "1 h ago");
  assert.equal(formatAgo("2026-11-17T12:00:00Z", nowMs), "1 d ago");
});
