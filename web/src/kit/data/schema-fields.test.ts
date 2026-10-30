/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { fieldModel } from "./field.ts";
import { formModel } from "./form.ts";
import { schemaToFields } from "./schema-fields.ts";
import type { SchemaField, SchemaFields } from "./schema-fields.ts";

assert.equal(typeof schemaToFields, "function");

function known<T>(value: T | undefined, name: string): T {
  assert.ok(value !== undefined, `${name} was produced`);
  return value;
}

function parsed(schema: unknown, name: string): SchemaFields {
  let result: SchemaFields | undefined;
  assert.doesNotThrow(() => {
    result = schemaToFields(schema);
  }, `${name} does not throw`);
  assert.ok(result !== undefined, `${name} parsed to fields`);
  return result;
}

interface UnSupported {
  readonly kind: string;
  readonly name: string;
  readonly label: string;
  readonly reason: string;
  readonly error: string;
}

function unsupported(field: SchemaField): UnSupported {
  const record = field as unknown as Record<string, unknown>;
  return {
    kind: String(record["kind"] ?? "?"),
    name: String(record["name"] ?? "?"),
    label: String(record["label"] ?? "?"),
    reason: String(record["reason"] ?? "?"),
    error: String(record["error"] ?? "?"),
  };
}

test("C-832d250d schemaToFields types every supported kind in order", () => {
  const result = parsed(
    {
      type: "object",
      required: ["title", "count"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 40, pattern: "^[A-Z]", description: "Short name" },
        count: { type: "integer", minimum: 1, maximum: 9 },
        ratio: { type: "number" },
        urgent: { type: "boolean", title: "Rush it", description: "Escalate it" },
        kind: { type: "string", enum: ["bug", "task"] },
        tags: { type: "array", items: { type: "string", minLength: 2 } },
        due_date: { type: "string" },
      },
    },
    "the every supported kind schema",
  );
  assert.deepEqual(result.problems, []);
  assert.deepEqual([...result.fields], [
    { name: "title", label: "Title", hint: "Short name", required: true, kind: "string", minLength: 3, maxLength: 40, pattern: "^[A-Z]" },
    { name: "count", label: "Count", hint: null, required: true, kind: "integer", minimum: 1, maximum: 9 },
    { name: "ratio", label: "Ratio", hint: null, required: false, kind: "number", minimum: null, maximum: null },
    { name: "urgent", label: "Rush it", hint: "Escalate it", required: false, kind: "boolean" },
    { name: "kind", label: "Kind", hint: null, required: false, kind: "enum", options: ["bug", "task"] },
    { name: "tags", label: "Tags", hint: null, required: false, kind: "string-list", itemMinLength: 2, itemMaxLength: null, itemPattern: null },
    { name: "due_date", label: "Due date", hint: null, required: false, kind: "string", minLength: null, maxLength: null, pattern: null },
  ]);
});

test("C-a36860e0 schemaToFields derives labels from names and caps hints", () => {
  const result = parsed(
    {
      type: "object",
      properties: {
        dueDate: { type: "string" },
        url: { type: "string" },
        plenty: { type: "string", description: "x".repeat(301) },
        markup: { type: "string", description: "<b>hi</b>" },
      },
    },
    "a schema with name labels and long hints",
  );
  assert.deepEqual(result.problems, []);
  assert.deepEqual(result.fields.map((field) => field.kind), ["string", "string", "string", "string"]);
  assert.deepEqual(result.fields.map((field) => field.label), ["Due date", "Url", "Plenty", "Markup"]);
  assert.deepEqual(result.fields.map((field) => field.hint), [null, null, `${"x".repeat(299)}…`, "<b>hi</b>"]);
});

test("C-78331251 schemaToFields marks each unsupported property with its reason", () => {
  const result = parsed(
    {
      type: "object",
      properties: {
        a: { type: "string", format: "email" },
        b: { type: "object" },
        c: {},
        d: { type: "string", pattern: "(" },
        e: true,
        f: { type: "array", items: { type: "number" } },
        g: { type: "string", enum: [1, 2] },
      },
    },
    "a schema of seven unsupported properties",
  );
  assert.deepEqual(result.problems, []);
  assert.equal(result.fields.length, 7);
  const views = result.fields.map((field) => unsupported(field));
  assert.ok(views.every((view) => view.kind === "unsupported"), "every unsupported property is an unsupported field");
  assert.deepEqual(views.map((view) => view.name), ["a", "b", "", "d", "e", "f", "g"]);
  assert.deepEqual(views.map((view) => view.reason), [
    'keyword "format" is not supported',
    'type "object" is not supported',
    "the property has no type",
    "pattern is not a valid expression",
    "the property schema must be an object",
    "array items must be strings",
    "enum must hold 1 to 100 distinct text values of 1 to 200 characters",
  ]);
  assert.ok(views.every((view) => view.error === `Unsupported: ${view.reason}`), "each error is Unsupported plus the reason");
});

test("C-78331251 C-852bb719 schemaToFields labels an untyped property by its name", () => {
  const result = parsed(
    {
      type: "object",
      properties: {
        a: { type: "string", format: "email" },
        b: { type: "object" },
        c: {},
        d: { type: "string", pattern: "(" },
        e: true,
        f: { type: "array", items: { type: "number" } },
        g: { type: "string", enum: [1, 2] },
      },
    },
    "the unsupported properties schema",
  );
  assert.deepEqual(result.problems, []);
  assert.equal(result.fields.length, 7);
  const views = result.fields.map((field) => unsupported(field));
  assert.deepEqual(views.map((view) => view.name), ["a", "b", "", "d", "e", "f", "g"]);
  assert.deepEqual(views.map((view) => view.label), ["A", "B", "C", "D", "E", "F", "G"]);
  assert.deepEqual(views.map((view) => view.reason), [
    'keyword "format" is not supported',
    'type "object" is not supported',
    "the property has no type",
    "pattern is not a valid expression",
    "the property schema must be an object",
    "array items must be strings",
    "enum must hold 1 to 100 distinct text values of 1 to 200 characters",
  ]);
  assert.ok(views.every((view) => view.error === `Unsupported: ${view.reason}`), "each error is Unsupported plus the reason");
});

test("C-69d9392a schemaToFields names a required property that has no schema", () => {
  const result = parsed({ type: "object", required: ["ghost"] }, "a required name with no property schema");
  assert.deepEqual(result.problems, []);
  assert.equal(result.fields.length, 1);
  const ghost = unsupported(known(result.fields[0], "the ghost field"));
  assert.equal(ghost.kind, "unsupported");
  assert.equal(ghost.name, "ghost");
  assert.equal(ghost.reason, "a required property has no schema");
  assert.equal(ghost.error, "Unsupported: a required property has no schema");
});

test("C-69d9392a schemaToFields keeps every property and caps the derived text", () => {
  const NAME = "aBcD".repeat(16);
  const KEY = "x".repeat(600);
  const schemaText = `{"type":"object","required":["ghost","ghost"],"properties":{"__proto__":{"type":"string"},"a-b":{"type":"string"},"":{"type":"string"},"${NAME}":{"type":"string","title":"  "},"k":{"type":"string","${KEY}":1}}}`;
  const schema: Record<string, unknown> = JSON.parse(schemaText);
  const props = schema["properties"] as Record<string, unknown>;
  assert.equal(Object.hasOwn(props, "__proto__"), true, "the parsed schema holds __proto__ as an own key");
  assert.equal(Object.getPrototypeOf(schema), Object.prototype);

  const result = parsed(schema, "a hostile schema of names and bounds");
  assert.deepEqual(result.problems, []);
  assert.equal(result.fields.length, 6);
  const views = result.fields.map((field) => unsupported(field));
  assert.ok(views.every((view) => view.error.length <= 500), "every error is at most 500 characters");
  assert.deepEqual(views.map((view) => view.name), ["__proto__", "a-b", "", NAME, "k", "ghost"]);
  const badNames = views.slice(0, 3);
  assert.ok(badNames.every((view) => view.kind === "unsupported"));
  assert.deepEqual(badNames.map((view) => view.reason), [
    "the property name is not supported",
    "the property name is not supported",
    "the property name is not supported",
  ]);
  assert.deepEqual(badNames.map((view) => view.label), ["__proto__", "a-b", "Field 3"]);
  assert.equal(views[4]?.reason, `keyword "${"x".repeat(39)}…" is not supported`);
  assert.equal(views[5]?.reason, "a required property has no schema");

  const kept = result.fields.filter((field) => field.kind !== "unsupported");
  assert.equal(kept.length, 1);
  const nField = known(kept[0], "the aBcD field");
  const nRecord = nField as unknown as Record<string, unknown>;
  assert.equal(nRecord["name"], NAME);
  assert.equal(nRecord["kind"], "string");
  const unit = "a bc d";
  const label = `A${unit.repeat(16).slice(1, 79)}…`;
  assert.equal(nRecord["label"], label);
  assert.equal(String(nRecord["label"]).length, 80);
  assert.ok(String(nRecord["label"]).startsWith("A bc da bc d"));
  assert.ok(String(nRecord["label"]).endsWith("bc da…"));

  assert.equal(Object.hasOwn(props, "__proto__"), true, "the parsed schema keeps __proto__ as an own key");
  assert.equal(Object.getPrototypeOf(schema), Object.prototype);
  assert.equal(Object.getPrototypeOf(props), Object.prototype);
  assert.equal(typeof result, "object");
});

test("C-69d9392a schemaToFields feeds fieldModel and formModel without prototype changes", () => {
  const NAME = "aBcD".repeat(16);
  const schemaText = `{"type":"object","required":["ghost","ghost"],"properties":{"__proto__":{"type":"string"},"a-b":{"type":"string"},"":{"type":"string"},"${NAME}":{"type":"string"}}}`;
  const schema: Record<string, unknown> = JSON.parse(schemaText);
  const result = parsed(schema, "a schema for the field and form models");
  const names = result.fields.filter((field) => field.kind !== "unsupported").map((field) => field.name);
  assert.deepEqual(names, [NAME]);
  assert.doesNotThrow(() => {
    for (const field of result.fields) {
      if (field.kind === "unsupported") continue;
      fieldModel({ name: field.name, label: field.label, hint: field.hint, required: field.required }, "f1");
    }
    formModel({ label: "Form", submitLabel: "Save", fields: names, errors: {} });
  }, "supported fields build field and form models");
  assert.equal(Object.hasOwn(result, "__proto__"), false);
});

test("C-9d1fffc7 schemaToFields reports root problems without dropping fields", () => {
  const nullSchema = parsed(null, "a null schema");
  assert.deepEqual(nullSchema.fields, []);
  assert.deepEqual(nullSchema.problems, ["the schema must be an object"]);

  const arraySchema = parsed({ type: "array" }, "an array schema");
  assert.deepEqual(arraySchema.fields, []);
  assert.deepEqual(arraySchema.problems, ['the schema must have type "object"']);

  const unknownRoot = parsed({ type: "object", allOf: [], properties: { a: { type: "boolean" } } }, "a root key outside the subset");
  assert.deepEqual(unknownRoot.problems, ['keyword "allOf" is not supported at the top level']);
  assert.equal(unknownRoot.fields.length, 1);
  assert.equal(unsupported(known(unknownRoot.fields[0], "the boolean field")).name, "a");
  assert.equal(unsupported(known(unknownRoot.fields[0], "the boolean field")).kind, "boolean");

  const badAdditional = parsed({ type: "object", additionalProperties: {} }, "a non boolean additionalProperties");
  assert.deepEqual(badAdditional.fields, []);
  assert.deepEqual(badAdditional.problems, ["additionalProperties must be true or false"]);

  const many: Record<string, unknown> = {};
  for (let index = 0; index < 101; index += 1) {
    many[`p${index}`] = { type: "string" };
  }
  const crowded = parsed({ type: "object", properties: many }, "101 properties");
  assert.deepEqual(crowded.fields, []);
  assert.deepEqual(crowded.problems, ["more than 100 properties"]);
});

test("C-a0904f4d schemaToFields treats an enum without type as a text enum", () => {
  const untyped = parsed(
    { type: "object", properties: { kind: { enum: ["bug", "task"] } } },
    "an enum property without a type",
  );
  const typed = parsed(
    { type: "object", properties: { kind: { type: "string", enum: ["bug", "task"] } } },
    "an enum property with the string type",
  );
  assert.deepEqual(untyped.problems, []);
  assert.equal(untyped.fields.length, 1);
  assert.equal(typed.fields.length, 1);
  assert.deepEqual(known(untyped.fields[0], "the untyped enum field"), known(typed.fields[0], "the typed enum field"));
  assert.deepEqual(known(untyped.fields[0], "the untyped enum field"), {
    name: "kind",
    label: "Kind",
    hint: null,
    required: false,
    kind: "enum",
    options: ["bug", "task"],
  });
});

test("C-9d1fffc7 schemaToFields accepts an empty object schema and holds 100 properties", () => {
  const empty = parsed({ type: "object" }, "an object schema without properties");
  assert.deepEqual(empty.fields, []);
  assert.deepEqual(empty.problems, []);

  const limit: Record<string, unknown> = {};
  for (let index = 0; index < 100; index += 1) {
    limit[`p${index}`] = { type: "string" };
  }
  const atLimit = parsed({ type: "object", properties: limit }, "100 properties");
  assert.deepEqual(atLimit.problems, []);
  assert.equal(atLimit.fields.length, 100);
  assert.deepEqual(atLimit.fields.map((field) => field.name), Array.from({ length: 100 }, (_, index) => `p${index}`));
  assert.ok(atLimit.fields.every((field) => field.kind === "string"));
});
