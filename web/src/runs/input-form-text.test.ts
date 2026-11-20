/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { formFromInputJson, inputFormModel, inputJsonFromForm } from "./input-form.ts";
import type { InputFormModel } from "./input-form.ts";

assert.equal(typeof inputJsonFromForm, "function");
assert.equal(typeof formFromInputJson, "function");

type FormModel = Extract<InputFormModel, { kind: "form" }>;

const D = {
  inputs: {
    type: "object",
    required: ["vendor_name", "amount"],
    properties: {
      amount: { type: "number" },
      vendor_name: { type: "string" },
    },
  },
};

const K = {
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
};

function formModel(canonical: unknown): FormModel {
  const result = inputFormModel(canonical);
  assert.equal(result.kind, "form");
  if (result.kind !== "form") throw new Error("not a form");
  return result;
}

type Written = ReturnType<typeof inputJsonFromForm>;

function write(model: FormModel, raw: Record<string, string | boolean>): Written {
  let result: Written | undefined;
  assert.doesNotThrow(() => {
    result = inputJsonFromForm(model, raw);
  }, "inputJsonFromForm answers");
  assert.ok(result !== undefined);
  return result;
}

function read(model: FormModel, text: string): ReturnType<typeof formFromInputJson> {
  let result: ReturnType<typeof formFromInputJson> | undefined;
  assert.doesNotThrow(() => {
    result = formFromInputJson(model, text);
  }, "formFromInputJson answers");
  assert.ok(result !== undefined);
  return result;
}

test("C-2e06c4e6 W1 writes the indented text of the valid values", () => {
  assert.deepEqual(write(formModel(D), { vendor_name: "ACME", amount: "12.5" }), {
    ok: true,
    text: '{\n  "vendor_name": "ACME",\n  "amount": 12.5\n}',
  });
});

test("C-2e06c4e6 W2 and W3 refuse a blank and a bad number", () => {
  const model = formModel(D);
  assert.deepEqual(write(model, { vendor_name: "ACME", amount: "" }), {
    ok: false,
    errors: { amount: "Required" },
  });
  assert.deepEqual(write(model, { vendor_name: "ACME", amount: "abc" }), {
    ok: false,
    errors: { amount: "Enter a number" },
  });
});

test("C-2e06c4e6 W4 writes in field order with typed values", () => {
  assert.deepEqual(write(formModel(K), { a: "5", b: true, c: "x", d: "p\nq" }), {
    ok: true,
    text: JSON.stringify({ b: true, a: 5, c: "x", d: ["p", "q"] }, null, 2),
  });
});

test("C-2e06c4e6 R1 and R2 read an object field by field", () => {
  const model = formModel(D);
  assert.deepEqual(read(model, '{"vendor_name":"ACME","amount":12.5}'), {
    vendor_name: "ACME",
    amount: "12.5",
  });
  assert.deepEqual(read(model, "{}"), { vendor_name: "", amount: "" });
});

test("C-2e06c4e6 R3 to R8 give null for a text that does not fit D", () => {
  const model = formModel(D);
  assert.deepEqual(read(model, '{"vendor_name":"ACME","amount":12.5}'), {
    vendor_name: "ACME",
    amount: "12.5",
  });
  for (const text of [
    '{"vendor_name":"ACME","extra":1}',
    '{"vendor_name":"ACME","amount":"12"}',
    '{"vendor_name":null}',
    "[1]",
    "{",
    '{"__proto__":1}',
  ]) {
    assert.equal(read(model, text), null, text);
  }
});

test("C-2e06c4e6 R9 and R14 read booleans, numbers, enums and lists", () => {
  const model = formModel(K);
  assert.deepEqual(read(model, '{"a":5,"b":true,"c":"x","d":["p","q"]}'), {
    b: true,
    a: "5",
    c: "x",
    d: "p\nq",
  });
  assert.deepEqual(read(model, '{"a":1e3}'), { b: false, a: "1000", c: "", d: "" });
});

test("C-2e06c4e6 R10 to R13 give null for values of the wrong type", () => {
  const model = formModel(K);
  assert.deepEqual(read(model, '{"a":1e3}'), { b: false, a: "1000", c: "", d: "" });
  for (const text of [
    '{"a":12.5}',
    '{"c":"z"}',
    '{"d":["a b "]}',
    '{"d":[""]}',
    '{"b":"true"}',
  ]) {
    assert.equal(read(model, text), null, text);
  }
});
