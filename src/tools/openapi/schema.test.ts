import assert from "node:assert/strict";
import { test } from "node:test";

import { checkSchema } from "../../interpreter/schema.ts";
import * as tools from "../index.ts";
import type { ToolJson } from "../calls.ts";
import { translateSchema } from "./schema.ts";

assert.equal(typeof translateSchema, "function");

type Translated = ReturnType<typeof translateSchema>;
type Version = "3.0" | "3.1";

const DOC: Readonly<Record<string, unknown>> = {
  components: {
    schemas: {
      Vendor: {
        type: "object",
        properties: { id: { type: "string", nullable: true } },
      },
      A: { type: "object", properties: { b: { $ref: "#/components/schemas/B" } } },
      B: { type: "object", properties: { a: { $ref: "#/components/schemas/A" } } },
    },
  },
  c: {
    X: { type: "string" },
    "a/b c": { type: "string" },
  },
};

function translate(
  schema: unknown,
  version: Version,
  document: Readonly<Record<string, unknown>> = DOC,
): Translated {
  try {
    return translateSchema(schema, version, document);
  } catch (error) {
    assert.fail(
      `translateSchema threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function expectSchema(
  schema: unknown,
  version: Version,
  document: Readonly<Record<string, unknown>> = DOC,
): { [key: string]: ToolJson } {
  const result = translate(schema, version, document);
  if (!result.ok) {
    assert.fail(`expected a schema, got reason ${result.reason}`);
  }
  assert.equal(
    JSON.stringify(result.schema).includes("$ref"),
    false,
    "an accepted result holds no $ref",
  );
  return result.schema;
}

function expectReason(
  schema: unknown,
  version: Version,
  reason: "ref_remote" | "ref_cycle" | "schema_invalid",
  document: Readonly<Record<string, unknown>> = DOC,
): void {
  assert.deepEqual(translate(schema, version, document), { ok: false, reason });
}

function chainDocument(length: number): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  for (let i = 0; i < length - 1; i += 1) {
    c[`S${i}`] = { $ref: `#/c/S${i + 1}` };
  }
  c[`S${length - 1}`] = { type: "string" };
  return { c };
}

function binaryDocument(levels: number): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  for (let i = 0; i < levels; i += 1) {
    c[`L${i}`] = {
      type: "object",
      properties: {
        a: { $ref: `#/c/L${i + 1}` },
        b: { $ref: `#/c/L${i + 1}` },
      },
    };
  }
  c[`L${levels}`] = { type: "string" };
  return { c };
}

function nested(depth: number): Record<string, unknown> {
  let schema: Record<string, unknown> = { type: "string" };
  for (let i = 0; i < depth; i += 1) {
    schema = { type: "object", properties: { p: schema } };
  }
  return schema;
}

test("C-320b5077 C-8aae211d the tools index exports translateSchema and it translates a string", () => {
  const namespace = tools as unknown as Record<string, unknown>;
  assert.equal(typeof namespace["translateSchema"], "function");
  const fromIndex = namespace["translateSchema"] as typeof translateSchema;
  assert.equal(fromIndex, translateSchema);
  assert.deepEqual(fromIndex({ type: "string" }, "3.1", DOC), {
    ok: true,
    schema: { type: "string" },
  });
});

test("C-8aae211d T1 nullable string becomes a type union that accepts null and string", () => {
  const schema = expectSchema({ type: "string", nullable: true }, "3.0");
  assert.deepEqual(schema, { type: ["string", "null"] });
  assert.deepEqual(checkSchema(schema, null), { ok: true });
  assert.deepEqual(checkSchema(schema, "a"), { ok: true });
  assert.equal(checkSchema(schema, 5).ok, false);
});

test("C-8aae211d T2 nullable false and nullable without a type are dropped", () => {
  assert.deepEqual(expectSchema({ type: "string", nullable: false }, "3.0"), {
    type: "string",
  });
  assert.deepEqual(expectSchema({ nullable: true, enum: ["a"] }, "3.0"), {
    enum: ["a"],
  });
});

test("C-8aae211d T3 non-boolean nullable is schema_invalid", () => {
  expectReason({ type: "string", nullable: "yes" }, "3.0", "schema_invalid");
});

test("C-8aae211d T4 annotations and 3.0 x keywords are dropped at every schema position", () => {
  assert.deepEqual(
    expectSchema(
      {
        type: "object",
        properties: {
          example: { type: "string", example: "e" },
          nullable: { type: "boolean" },
          "x-k": { type: "string", "x-n": 1 },
        },
        xml: { name: "q" },
        externalDocs: { url: "http://x" },
        "x-top": 1,
      },
      "3.0",
    ),
    {
      type: "object",
      properties: {
        example: { type: "string" },
        nullable: { type: "boolean" },
        "x-k": { type: "string" },
      },
    },
  );
});

test("C-8aae211d T5 3.1 keeps nullable and x keywords and drops example", () => {
  assert.deepEqual(
    expectSchema(
      { type: "string", nullable: true, example: "s", "x-a": 1 },
      "3.1",
    ),
    { type: "string", nullable: true, "x-a": 1 },
  );
});

test("C-8aae211d T6 id and schema keywords are dropped and the result checks twice", () => {
  const input = {
    $id: "x",
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "string",
  };
  const first = expectSchema(input, "3.1");
  const second = expectSchema(input, "3.1");
  assert.deepEqual(first, { type: "string" });
  assert.deepEqual(second, { type: "string" });
  assert.deepEqual(checkSchema(first, "q"), { ok: true });
  assert.deepEqual(checkSchema(second, "q"), { ok: true });
});

test("C-8aae211d T7 a local ref in array items is inlined", () => {
  assert.deepEqual(
    expectSchema(
      { type: "array", items: { $ref: "#/components/schemas/Vendor" } },
      "3.0",
    ),
    {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: ["string", "null"] } },
      },
    },
  );
});

test("C-8aae211d T8 annotation siblings drop and a non-annotation sibling is schema_invalid", () => {
  assert.deepEqual(
    expectSchema({ $ref: "#/c/X", description: "d", example: "e" }, "3.1"),
    { type: "string" },
  );
  assert.deepEqual(
    expectSchema({ $ref: "#/c/a~1b%20c" }, "3.1"),
    { type: "string" },
  );
  expectReason({ $ref: "#/c/X", maxLength: 3 }, "3.1", "schema_invalid");
});

test("C-8aae211d T9 remote ref and dynamicRef are ref_remote", () => {
  expectReason({ $ref: "other.json#/X" }, "3.1", "ref_remote");
  expectReason({ $dynamicRef: "#meta" }, "3.1", "ref_remote");
});

test("C-8aae211d T10 a ref cycle is ref_cycle and a missing pointer is schema_invalid", () => {
  expectReason(
    { $ref: "#/components/schemas/A" },
    "3.1",
    "ref_cycle",
  );
  expectReason(
    { $ref: "#/components/schemas/Missing" },
    "3.1",
    "schema_invalid",
  );
});

test("C-8aae211d T11 thirty-two expansions are accepted and thirty-three are schema_invalid", () => {
  assert.deepEqual(
    expectSchema({ $ref: "#/c/S0" }, "3.1", chainDocument(32)),
    { type: "string" },
  );
  expectReason(
    { $ref: "#/c/S0" },
    "3.1",
    "schema_invalid",
    chainDocument(33),
  );
});

test("C-8aae211d T12 invalid schemas and an oversized result are schema_invalid", () => {
  expectReason(
    { type: "number", minimum: 1, exclusiveMinimum: true },
    "3.1",
    "schema_invalid",
  );
  expectReason({ type: "nope" }, "3.1", "schema_invalid");
  expectReason("x", "3.1", "schema_invalid");

  const properties: Record<string, unknown> = {};
  for (let i = 0; i < 6000; i += 1) {
    properties[`p${i}`] = { type: "string", description: "x".repeat(40) };
  }
  expectReason({ type: "object", properties }, "3.1", "schema_invalid");
});

test("C-8aae211d T13 pattern is dropped but a property named pattern stays", () => {
  assert.deepEqual(
    expectSchema(
      { type: "string", pattern: "^(a+)+$", maxLength: 40 },
      "3.0",
    ),
    { type: "string", maxLength: 40 },
  );
  assert.deepEqual(
    expectSchema(
      {
        type: "object",
        properties: { pattern: { type: "string", pattern: "^a$" } },
      },
      "3.1",
    ),
    { type: "object", properties: { pattern: { type: "string" } } },
  );
});

test("C-8aae211d T14 an exponential ref tree is schema_invalid while twelve levels are accepted", () => {
  expectReason(
    { $ref: "#/c/L0" },
    "3.1",
    "schema_invalid",
    binaryDocument(31),
  );
  const accepted = translate(
    { $ref: "#/c/L0" },
    "3.1",
    binaryDocument(12),
  );
  assert.equal(accepted.ok, true);
});

test("C-8aae211d T15 nesting past sixty-four is schema_invalid without a throw", () => {
  expectReason(nested(65), "3.1", "schema_invalid");
  expectReason(nested(100000), "3.1", "schema_invalid");
});

test("C-8aae211d T16 patternProperties is schema_invalid", () => {
  expectReason(
    { type: "object", patternProperties: { "^a": { type: "string" } } },
    "3.1",
    "schema_invalid",
  );
});
