import assert from "node:assert/strict";
import { test } from "node:test";

import type { Ref } from "./index.ts";
import { parseRef } from "./index.ts";

function id(n: number): string {
  return "x" + "a".repeat(n - 1);
}

function callParseRef(content: string): { ref?: Ref; error?: string } {
  let result: { ref?: Ref; error?: string } = {};
  assert.doesNotThrow(() => {
    result = parseRef(content);
  });
  return result;
}

test("C-fd3baa1e parseRef accepts 128 characters and refuses 129", () => {
  assert.equal(typeof parseRef, "function");
  assert.deepEqual(callParseRef(`nodes.${id(128)}.output.v`), {
    ref: { root: "node", id: id(128), field: "output", path: ["v"] },
  });
  assert.deepEqual(callParseRef(`nodes.${id(128)}.outcome`), {
    ref: { root: "node", id: id(128), field: "outcome", path: [] },
  });
  assert.deepEqual(callParseRef(`nodes.${id(129)}.output.v`), {
    error: `invalid node id "${id(129)}" in reference`,
  });
  assert.deepEqual(callParseRef(`nodes.${id(129)}.outcome`), {
    error: `invalid node id "${id(129)}" in reference`,
  });
  assert.deepEqual(callParseRef("nodes.a.output.v"), {
    ref: { root: "node", id: "a", field: "output", path: ["v"] },
  });
  assert.deepEqual(callParseRef("nodes.A.output.v"), {
    error: 'invalid node id "A" in reference',
  });
});
