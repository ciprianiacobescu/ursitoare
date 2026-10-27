import assert from "node:assert/strict";
import { test } from "node:test";

import { canonicalize } from "./canonical.ts";
import { AuditError } from "./errors.ts";

const RFC_SAMPLE = String.raw`{"numbers":[333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001],"string":"\u20ac$\u000F\u000aA'\u0042\u0022\u005c\\\"\/","literals":[null,true,false]}`;

const RFC_SAMPLE_CANONICAL = String.raw`{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"€$\u000f\nA'B\"\\\\\"/"}`;

const CANONICAL_MESSAGE = "value cannot be canonicalized";

function nestedArrays(depth: number): unknown {
  let value: unknown = 0;
  for (let level = 0; level < depth; level += 1) {
    value = [value];
  }
  return value;
}

function sparseArray(): unknown[] {
  const sparse: unknown[] = [];
  sparse.length = 2;
  sparse[1] = 1;
  return sparse;
}

function selfReferentialObject(): Record<string, unknown> {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  return cycle;
}

test("C-3266a83e canonicalize writes the RFC 8785 section 3.2.4 document", () => {
  let result = "";
  assert.doesNotThrow(() => {
    result = canonicalize(JSON.parse(RFC_SAMPLE));
  });
  assert.equal(result, RFC_SAMPLE_CANONICAL);
});

test("C-3266a83e canonicalize sorts keys by code unit and writes safe bigints as numbers", () => {
  const keyed = {
    "\u20ac": 1,
    "\r": 2,
    "\ufb33": 3,
    "1": 4,
    "\ud83d\ude00": 5,
    "\u0080": 6,
    "\u00f6": 7,
  };
  const expectedKeys = `{"\\r":2,"1":4,"\u0080":6,"\u00f6":7,"\u20ac":1,"\ud83d\ude00":5,"\ufb33":3}`;

  let keyResult = "";
  let bigintResult = "";
  assert.doesNotThrow(() => {
    keyResult = canonicalize(keyed);
    bigintResult = canonicalize({ m: 2n ** 53n - 1n, a: -0 });
  });
  assert.equal(keyResult, expectedKeys);
  assert.equal(bigintResult, `{"a":0,"m":9007199254740991}`);
});

test("C-b6ba3144 canonicalize refuses values it cannot write exactly", () => {
  const refused: ReadonlyArray<readonly [unknown, string]> = [
    [Number.NaN, "nan"],
    [Number.POSITIVE_INFINITY, "infinity"],
    [Number.NEGATIVE_INFINITY, "infinity"],
    [undefined, "undefined"],
    [{ a: undefined }, "undefined"],
    [sparseArray(), "undefined"],
    [() => 1, "function"],
    [Symbol("s"), "symbol"],
    [2n ** 53n, "bigint_range"],
    [-(2n ** 53n), "bigint_range"],
    ["\ud800", "ill_formed_string"],
    [{ "\ud800": 1 }, "ill_formed_string"],
    ["a\u0000b", "nul"],
    [{ "a\u0000": 1 }, "nul"],
    [new Date(0), "not_plain_object"],
    [Buffer.alloc(1), "not_plain_object"],
    [nestedArrays(65), "too_deep"],
    [selfReferentialObject(), "too_deep"],
  ];

  for (const [value, reason] of refused) {
    assert.throws(
      () => canonicalize(value),
      (error: unknown) => {
        assert.ok(error instanceof AuditError, "the refusal is an AuditError");
        assert.equal(error.code, "AUDIT_CANONICAL_INVALID");
        assert.equal(error.message, CANONICAL_MESSAGE, "the message holds no value");
        assert.equal(error.details.reason, reason);
        return true;
      },
    );
  }
});

test("C-b6ba3144 canonicalize accepts 64 nested arrays", () => {
  let result = "";
  assert.doesNotThrow(() => {
    result = canonicalize(nestedArrays(64));
  });
  assert.equal(result, `${"[".repeat(64)}0${"]".repeat(64)}`);
});
