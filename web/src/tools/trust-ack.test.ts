/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  TRUST_NAMES,
  TRUST_WARNING,
  ackStatus,
  fillName,
  trustAckMissing,
  type ToolTrust,
} from "./trust.ts";

const tr: Record<string, ToolTrust> = {
  a: { trusted: true, dataClass: null },
  b: { trusted: true, dataClass: "private" },
  c: { trusted: false, dataClass: "public" },
  d: { trusted: true, dataClass: null },
  e: { trusted: false, dataClass: "private" },
};

test("C-5367a266 AK1 trustAckMissing lists unticked trusted or public keys", () => {
  assert.deepEqual(trustAckMissing(tr, { a: true, d: false }), ["b", "c", "d"]);
});

test("C-5367a266 AK2 trustAckMissing empty and inherited key", () => {
  assert.deepEqual(trustAckMissing({}, {}), []);
  assert.deepEqual(trustAckMissing({ toString: { trusted: true, dataClass: null } }, {}), ["toString"]);
});

test("C-5367a266 AK3 ackStatus shown missing message", () => {
  const result = ackStatus(tr, {}, { b: true });
  assert.deepEqual(result.shown, ["a", "b", "c", "d"]);
  assert.deepEqual(result.missing, ["a", "c", "d"]);
  assert.equal(result.message, "Accept the warning for: a, c, d.");
});

test("C-5367a266 AK4 ackStatus baseline removes shown", () => {
  const result = ackStatus(tr, { a: { trusted: true, dataClass: null }, c: { trusted: false, dataClass: "public" }, d: { trusted: false, dataClass: null } }, {});
  assert.deepEqual(result.shown, ["b", "d"]);
  assert.deepEqual(result.missing, ["b", "d"]);
  assert.equal(result.message, "Accept the warning for: b, d.");
});

test("C-5367a266 AK5 ackStatus all ticks missing empty", () => {
  const result = ackStatus(tr, {}, { a: true, b: true, c: true, d: true });
  assert.deepEqual(result.missing, []);
  assert.equal(result.message, null);
});

test("C-5367a266 AK6 ackStatus untrusting shows nothing", () => {
  const result = ackStatus({ a: { trusted: false, dataClass: null } }, { a: { trusted: true, dataClass: "public" } }, {});
  assert.deepEqual(result.shown, []);
  assert.deepEqual(result.missing, []);
  assert.equal(result.message, null);
});

test("C-5367a266 AK7 ackStatus newly public shows key", () => {
  const result = ackStatus({ a: { trusted: true, dataClass: "public" } }, { a: { trusted: true, dataClass: "private" } }, {});
  assert.deepEqual(result.shown, ["a"]);
  assert.deepEqual(result.missing, ["a"]);
  assert.equal(result.message, "Accept the warning for: a.");
});

test("C-5367a266 AK8 ackStatus keeps dollar ampersand", () => {
  const result = ackStatus({ "x$&y": { trusted: false, dataClass: "public" } }, {}, {});
  assert.equal(result.message, "Accept the warning for: x$&y.");
});

test("C-5367a266 AK9 fillName replaces key literally", () => {
  assert.equal(fillName("Result of {key} is trusted", "createPayment"), "Result of createPayment is trusted");
  assert.equal(fillName("I accept the warning for {key}", "a$&b"), "I accept the warning for a$&b");
  assert.equal(fillName("no placeholder here", "x"), "no placeholder here");
});

test("C-5367a266 NM1 trust names and warning", () => {
  assert.equal(Object.keys(TRUST_NAMES).length, 8);
  const expected: Record<string, string> = {
    trustColumn: "Result trusted",
    dataClassColumn: "Data class",
    trustedOf: "Result of {key} is trusted",
    dataClassOf: "Data class of {key}",
    notSet: "Not set",
    ackOf: "I accept the warning for {key}",
    ackMissing: "Accept the warning for: {keys}.",
    replaceHint: "To change trust, paste the document again.",
  };
  assert.deepEqual(TRUST_NAMES, expected);
  const values = Object.values(TRUST_NAMES);
  assert.equal(new Set(values).size, 8);
  for (const v of values) assert.ok(!v.includes("Ursitoare"));
  assert.equal(TRUST_WARNING.length, 384);
});
