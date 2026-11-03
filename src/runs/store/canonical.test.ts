import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { payloadDigest, RunDataError } from "../index.ts";
import type { PayloadValue } from "../index.ts";

const FIRST_DIGEST = "51705a2c9eb3e7e410a58f696a770c3ac3885a0cf43eb7fc88f5e47c11d4d30d";
const NULL_DIGEST = "74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b";
const EMPTY_OBJECT_DIGEST = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function nestedArrays(depth: number): unknown {
  let value: unknown = 0;
  for (let level = 0; level < depth; level += 1) {
    value = [value];
  }
  return value;
}

function selfReferential(): Record<string, unknown> {
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  return cycle;
}

function digestOf(value: unknown): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result = payloadDigest(value as PayloadValue);
  });
  assert.ok(result !== undefined, "payloadDigest returned a digest");
  return result;
}

function refusalOf(value: unknown): RunDataError {
  let caught: unknown;
  try {
    payloadDigest(value as PayloadValue);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof RunDataError, "the refusal is a RunDataError");
  return caught;
}

test("C-193e184c canonical JSON sorts keys by code unit and hashes the UTF-8 text", () => {
  assert.equal(typeof payloadDigest, "function");
  assert.equal(digestOf({ b: 1, a: [true, null] }), FIRST_DIGEST);
  assert.equal(digestOf({ a: [true, null], b: 1 }), FIRST_DIGEST);
  assert.equal(digestOf(null), NULL_DIGEST);
  assert.equal(digestOf({}), EMPTY_OBJECT_DIGEST);
  assert.equal(digestOf({ b: 1, aa: 2 }), sha256('{"aa":2,"b":1}'));
  assert.equal(
    digestOf({ "\uFF5E": 1, "\u{1F600}": 2 }),
    sha256('{"\u{1F600}":2,"\uFF5E":1}'),
  );
  assert.equal(digestOf(-0), sha256("0"));
  assert.equal(digestOf(1e21), sha256("1e+21"));
  assert.match(digestOf(nestedArrays(64)), /^[0-9a-f]{64}$/);
});

test("C-193e184c payloadDigest refuses values that are not plain JSON", () => {
  assert.equal(typeof payloadDigest, "function");
  const refused: readonly unknown[] = [
    Number.NaN,
    undefined,
    () => 1,
    10n,
    new Date(0),
    "a\u0000b",
    "\uD800",
    { "k\u0000": 1 },
    nestedArrays(65),
    selfReferential(),
  ];
  for (const value of refused) {
    const error = refusalOf(value);
    assert.equal(error.code, "RUN_DATA_INVALID");
  }
  const secret = refusalOf({ note: "secret-input", bad: Number.NaN });
  assert.equal(secret.code, "RUN_DATA_INVALID");
  assert.ok(!secret.message.includes("secret-input"), "the message holds no value");
});
