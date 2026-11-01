import assert from "node:assert/strict";
import { test } from "node:test";

import { jsonSchemaProblem } from "./jsonschema.ts";

function problem(schema: unknown): string | null {
  let result: string | null = null;
  assert.doesNotThrow(() => {
    result = jsonSchemaProblem(schema);
  });
  return result;
}

function assertOneLine(value: string | null): void {
  if (value === null) {
    assert.fail("expected a schema problem");
  }
  assert.notEqual(value, "", "the problem is not empty");
  assert.ok(!value.includes("\n"), "the problem is one line");
}

test("C-3a87587c Valid embedded schemas are accepted", () => {
  assert.equal(
    problem({
      type: "object",
      properties: { a: { type: "string" } },
      required: ["a"],
    }),
    null,
  );
  assert.equal(
    problem({ x: { $ref: "https://example.com/s.json" }, "x-vendor": 1 }),
    null,
  );
});

test("C-3a87587c Invalid embedded schemas are reported", () => {
  assertOneLine(problem({ type: "nope" }));
  assertOneLine(problem({ $schema: "http://json-schema.org/draft-07/schema#" }));

  assert.equal(problem([]), "schema must be a JSON object");
  assert.equal(problem(null), "schema must be a JSON object");
  assert.equal(problem(true), "schema must be a JSON object");
});
