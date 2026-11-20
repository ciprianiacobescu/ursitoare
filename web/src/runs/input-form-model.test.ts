/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { inputFormModel } from "./input-form.ts";
import type { InputFormModel } from "./input-form.ts";

assert.equal(typeof inputFormModel, "function");

const NO_INPUTS = "This flow declares no inputs.";
const CANNOT_SHOW = "The input schema uses features the form cannot show, so enter the input as JSON.";

const D = {
  flow: "demo-pay",
  start: "lookup",
  version: "1.0.0",
  ursitoare: "0.1",
  inputs: {
    type: "object",
    required: ["vendor_name", "amount"],
    properties: {
      amount: { type: "number" },
      vendor_name: { type: "string" },
    },
  },
  nodes: {
    pay: { kind: "block", next: "done", uses: "erp.create_payment@1" },
    done: { kind: "end", status: "completed" },
    route: {
      kind: "switch",
      on: "${{ nodes.lookup.output.status }}",
      cases: { active: "pay" },
      default: "blocked",
    },
    lookup: { kind: "block", next: "route", uses: "erp.lookup_vendor@1" },
    blocked: { kind: "end", status: "failed" },
  },
};

function model(canonical: unknown): InputFormModel {
  let result: InputFormModel | undefined;
  assert.doesNotThrow(() => {
    result = inputFormModel(canonical);
  }, "inputFormModel answers");
  assert.ok(result !== undefined, "inputFormModel returned a model");
  return result;
}

function stringProperties(count: number): Record<string, { type: "string" }> {
  const properties: Record<string, { type: "string" }> = {};
  for (let index = 0; index < count; index += 1) {
    properties[`f${index}`] = { type: "string" };
  }
  return properties;
}

test("C-9a3cba5e inputFormModel builds demo-pay fields with required names first", () => {
  const result = model(D);
  assert.equal(result.kind, "form");
  if (result.kind !== "form") return;
  assert.deepEqual(result.fields.problems, []);
  assert.deepEqual([...result.fields.fields], [
    {
      name: "vendor_name",
      label: "Vendor name",
      hint: null,
      required: true,
      kind: "string",
      minLength: null,
      maxLength: null,
      pattern: null,
    },
    {
      name: "amount",
      label: "Amount",
      hint: null,
      required: true,
      kind: "number",
      minimum: null,
      maximum: null,
    },
  ]);
});

test("C-9a3cba5e inputFormModel answers the no inputs reason for absent and empty inputs", () => {
  for (const canonical of [
    { flow: "x" },
    null,
    { inputs: { type: "object", properties: {} } },
  ]) {
    assert.deepEqual(model(canonical), { kind: "json", reason: NO_INPUTS });
  }
});

test("C-9a3cba5e inputFormModel answers the cannot show reason for unsupported inputs", () => {
  const oneOf = {
    inputs: {
      type: "object",
      properties: {
        a: { oneOf: [{ type: "string" }, { type: "number" }] },
      },
    },
  };
  const controlName = {
    inputs: {
      type: "object",
      properties: { input: { type: "string" } },
    },
  };
  const tooMany = {
    inputs: {
      type: "object",
      properties: stringProperties(21),
    },
  };
  const missingProperty = {
    inputs: { type: "object", required: ["x"], properties: {} },
  };
  for (const canonical of [oneOf, controlName, tooMany, missingProperty]) {
    assert.deepEqual(model(canonical), { kind: "json", reason: CANNOT_SHOW });
  }
});

test("C-9a3cba5e inputFormModel keeps twenty fields as a form", () => {
  const result = model({
    inputs: { type: "object", properties: stringProperties(20) },
  });
  assert.equal(result.kind, "form");
  if (result.kind !== "form") return;
  assert.deepEqual(result.fields.problems, []);
  assert.equal(result.fields.fields.length, 20);
  assert.deepEqual(
    result.fields.fields.map((field) => field.name),
    Array.from({ length: 20 }, (_, index) => `f${index}`),
  );
  assert.ok(result.fields.fields.every((field) => field.kind === "string" && !field.required));
});

test("C-9a3cba5e inputFormModel lists required names first then the others as given", () => {
  const result = model({
    inputs: {
      type: "object",
      required: ["b"],
      properties: {
        a: { type: "integer" },
        b: { type: "boolean" },
        c: { type: "string", enum: ["x", "y"] },
        d: { type: "array", items: { type: "string" } },
      },
    },
  });
  assert.equal(result.kind, "form");
  if (result.kind !== "form") return;
  assert.deepEqual(result.fields.problems, []);
  assert.deepEqual([...result.fields.fields], [
    { name: "b", label: "B", hint: null, required: true, kind: "boolean" },
    { name: "a", label: "A", hint: null, required: false, kind: "integer", minimum: null, maximum: null },
    { name: "c", label: "C", hint: null, required: false, kind: "enum", options: ["x", "y"] },
    {
      name: "d",
      label: "D",
      hint: null,
      required: false,
      kind: "string-list",
      itemMinLength: null,
      itemMaxLength: null,
      itemPattern: null,
    },
  ]);
});
