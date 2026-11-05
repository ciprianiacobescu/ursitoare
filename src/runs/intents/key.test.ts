import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { IntentError } from "./errors.ts";
import { idemKey, lineageOf } from "./key.ts";

// The two literal vectors of the "Key vectors and refusals" scenario.
const PAY_KEY = "ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714";
const ABC_KEY = "ik1_8173a576070efa7d96f078c1eb61c46622685bc8eb75f7343388fc251fc9ef38";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
function keyOf(
  tenantId: string,
  lineageId: string,
  nodeId: string,
  effectSeq: number,
  generation?: number,
): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result =
      generation === undefined
        ? idemKey(tenantId, lineageId, nodeId, effectSeq)
        : idemKey(tenantId, lineageId, nodeId, effectSeq, generation);
  });
  assert.ok(result !== undefined, "idemKey returned a key");
  return result;
}

function lineageOk(run: { runId: string; lineageId: string }): string {
  let result: string | undefined;
  assert.doesNotThrow(() => {
    result = lineageOf(run);
  });
  assert.ok(result !== undefined, "lineageOf returned a lineage id");
  return result;
}

function refusalOf(call: () => string): IntentError {
  let caught: unknown;
  try {
    call();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof IntentError, "the refusal is an IntentError");
  assert.equal(caught.code, "INTENT_INVALID");
  return caught;
}

test("C-2ad12673 idemKey hashes the ADR-08 vector and the five variants differ", () => {
  assert.equal(keyOf("tenant_a", "r_1", "pay", 0), PAY_KEY);
  assert.equal(keyOf("tenant_a", "r_1", "pay", 0, 0), PAY_KEY);

  assert.equal(keyOf("a", "b", "c", 2, 3), ABC_KEY);
  assert.equal(ABC_KEY, `ik1_${sha256(JSON.stringify(["a", "b", "c", 2, 3]))}`);

  const variants: Array<[string, string, string, number, number]> = [
    ["tenant_a", "r_1", "pay", 0, 1],
    ["tenant_a", "r_1", "pay", 1, 0],
    ["tenant_b", "r_1", "pay", 0, 0],
    ["tenant_a", "r_2", "pay", 0, 0],
    ["tenant_a", "r_1", "mail", 0, 0],
  ];
  const keys: string[] = [];
  for (const [tenantId, lineageId, nodeId, effectSeq, generation] of variants) {
    const key = keyOf(tenantId, lineageId, nodeId, effectSeq, generation);
    assert.equal(
      key,
      `ik1_${sha256(JSON.stringify([tenantId, lineageId, nodeId, effectSeq, generation]))}`,
    );
    keys.push(key);
  }

  for (const key of keys) {
    assert.notEqual(key, PAY_KEY);
  }
  assert.equal(new Set(keys).size, keys.length, "the five variant keys differ from each other");
});

test("C-2ad12673 lineageOf returns the lineage of a run", () => {
  assert.equal(lineageOk({ runId: "r_2", lineageId: "r_1" }), "r_1");
});

test("C-2ad12673 idemKey refuses the twelve parts outside the key patterns", () => {
  const longLineage = "a".repeat(129);
  const refusals: Array<{ value: unknown; call: () => string }> = [
    { value: "", call: () => idemKey("", "r_1", "pay", 0) },
    { value: "a b", call: () => idemKey("a b", "r_1", "pay", 0) },
    { value: "", call: () => idemKey("tenant_a", "", "pay", 0) },
    { value: longLineage, call: () => idemKey("tenant_a", longLineage, "pay", 0) },
    { value: "Pay", call: () => idemKey("tenant_a", "r_1", "Pay", 0) },
    { value: "1pay", call: () => idemKey("tenant_a", "r_1", "1pay", 0) },
    { value: "pay#done", call: () => idemKey("tenant_a", "r_1", "pay#done", 0) },
    { value: -1, call: () => idemKey("tenant_a", "r_1", "pay", -1) },
    { value: 1.5, call: () => idemKey("tenant_a", "r_1", "pay", 1.5) },
    { value: Number.NaN, call: () => idemKey("tenant_a", "r_1", "pay", Number.NaN) },
    { value: 2_147_483_648, call: () => idemKey("tenant_a", "r_1", "pay", 2_147_483_648) },
    { value: -1, call: () => idemKey("tenant_a", "r_1", "pay", 0, -1) },
  ];

  for (const { value, call } of refusals) {
    const error = refusalOf(call);
    const text = String(value);
    if (text.length > 0) {
      assert.ok(!error.message.includes(text), "the message holds no offending value");
    }
  }
});
