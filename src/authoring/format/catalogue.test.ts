import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyCatalogue, parseVersionedRef } from "./index.ts";

type VersionedRef = { name: string; major: number };

function parseVersioned(input: string): VersionedRef | undefined {
  let result: VersionedRef | undefined = undefined;
  assert.doesNotThrow(() => {
    result = parseVersionedRef(input);
  });
  return result;
}

test("C-118137a2 Empty catalogue and versioned references", () => {
  let lookups: unknown[] = [];
  assert.doesNotThrow(() => {
    lookups = [
      emptyCatalogue.block("invoices.get@1"),
      emptyCatalogue.modelProfile("default"),
      emptyCatalogue.role("approver"),
      emptyCatalogue.delegateTarget("n8n", "archive-invoice"),
      emptyCatalogue.flow("notify-customer", 1),
    ];
  });
  assert.deepEqual(lookups, [undefined, undefined, undefined, undefined, undefined]);

  assert.deepEqual(parseVersioned("invoices.get@1"), { name: "invoices.get", major: 1 });
  assert.deepEqual(parseVersioned("notify-customer@12"), { name: "notify-customer", major: 12 });
  assert.deepEqual(parseVersioned("x@0"), { name: "x", major: 0 });

  for (const input of [
    "invoices.get",
    "@1",
    "a@",
    "A@1",
    "a@01",
    "a@-1",
    "a@1@2",
    "a@1 ",
    "a@1234567890",
  ]) {
    assert.equal(parseVersioned(input), undefined, `${JSON.stringify(input)} is not a versioned ref`);
  }
});
