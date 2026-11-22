import assert from "node:assert/strict";
import { test } from "node:test";

import { isValidationStale } from "./validator-version.ts";
import type { VersionState } from "./flows.ts";

test("C-565b53f2 isValidationStale answers the staleness table", () => {
  const rows: Array<[VersionState, number | null, boolean]> = [
    ["draft", null, false],
    ["draft", 1, false],
    ["draft", 2, false],
    ["validated", null, true],
    ["validated", 1, true],
    ["validated", 2, false],
    ["validated", 3, false],
    ["tested", null, true],
    ["reviewed", 1, true],
    ["published", 2, false],
    ["deprecated", null, true],
  ];
  assert.doesNotThrow(() => {
    for (const [state, version, expected] of rows) {
      assert.equal(isValidationStale(state, version), expected, `${state} ${String(version)}`);
    }
  });
  assert.equal(isValidationStale("validated", null), true);
});
