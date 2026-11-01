import assert from "node:assert/strict";
import { test } from "node:test";

import type { Taint } from "./index.ts";
import {
  NO_TAINT,
  TAINT_LABELS,
  joinTaint,
  normalizeTaint,
  relabelExtract,
  taintIncludes,
} from "./index.ts";

const LABEL_ORDER = ["extracted", "untrusted"] as const;

const TAINTS: readonly Taint[] = [
  [],
  ["extracted"],
  ["untrusted"],
  ["extracted", "untrusted"],
];

function expectedUnion(a: Taint, b: Taint): Taint {
  return LABEL_ORDER.filter((label) => a.includes(label) || b.includes(label));
}

function callJoin(a: Taint, b: Taint): Taint {
  let result: Taint = [];
  assert.doesNotThrow(() => {
    result = joinTaint(a, b);
  });
  return result;
}

function callNormalize(labels: readonly string[]): Taint {
  let result: Taint = [];
  assert.doesNotThrow(() => {
    result = normalizeTaint(labels);
  });
  return result;
}

function callRelabel(input: Taint): Taint {
  let result: Taint = [];
  assert.doesNotThrow(() => {
    result = relabelExtract(input);
  });
  return result;
}

function callIncludes(outer: Taint, inner: Taint): boolean {
  let result = false;
  assert.doesNotThrow(() => {
    result = taintIncludes(outer, inner);
  });
  return result;
}

test("C-375163e0 join is a union in canonical order", () => {
  for (const a of TAINTS) {
    for (const b of TAINTS) {
      assert.deepEqual(
        callJoin(a, b),
        expectedUnion(a, b),
        `${JSON.stringify(a)} joined with ${JSON.stringify(b)}`,
      );
      assert.deepEqual(callJoin(b, a), callJoin(a, b), "join is commutative");
      assert.deepEqual(callJoin(a, a), a, "join is idempotent");
    }
  }

  for (const a of TAINTS) {
    for (const b of TAINTS) {
      for (const c of TAINTS) {
        assert.deepEqual(
          callJoin(callJoin(a, b), c),
          callJoin(a, callJoin(b, c)),
          "join is associative",
        );
      }
    }
  }

  assert.deepEqual(callJoin(["untrusted", "extracted"], ["extracted"]), [
    "extracted",
    "untrusted",
  ]);
  assert.deepEqual(callJoin(["untrusted", "untrusted"], []), ["untrusted"]);

  assert.deepEqual(TAINT_LABELS, ["extracted", "untrusted"]);
  assert.deepEqual(NO_TAINT, []);
  assert.equal(Object.isFrozen(TAINT_LABELS), true);
  assert.equal(Object.isFrozen(NO_TAINT), true);
});

test("C-9dbb1d4e normalize relabel and include", () => {
  assert.deepEqual(callNormalize(["bogus", "extracted", "extracted"]), [
    "extracted",
    "untrusted",
  ]);
  assert.deepEqual(callNormalize([]), []);

  const relabelInputs: readonly Taint[] = [
    [],
    ["untrusted"],
    ["extracted"],
    ["extracted", "untrusted"],
  ];
  for (const input of relabelInputs) {
    assert.deepEqual(callRelabel(input), ["extracted"], JSON.stringify(input));
  }

  const includes: ReadonlyArray<readonly [Taint, Taint, boolean]> = [
    [["extracted", "untrusted"], ["untrusted"], true],
    [["extracted"], ["untrusted"], false],
    [["untrusted"], [], true],
    [[], [], true],
    [[], ["extracted"], false],
    [["untrusted"], ["bogus"] as unknown as Taint, true],
  ];
  for (const [outer, inner, expected] of includes) {
    assert.equal(
      callIncludes(outer, inner),
      expected,
      `${JSON.stringify(outer)} includes ${JSON.stringify(inner)}`,
    );
  }
});
