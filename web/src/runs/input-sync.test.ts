/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { inputFormModel, inputSyncStart, inputSyncStep, inputSyncView } from "./input-form.ts";
import type { InputFormModel, InputSync, InputSyncEvent, InputSyncView } from "./input-form.ts";

assert.equal(typeof inputSyncStart, "function");
assert.equal(typeof inputSyncStep, "function");
assert.equal(typeof inputSyncView, "function");

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

const MODEL: InputFormModel = inputFormModel(D);

const KEPT = "Kept in step with the fields above.";
const MISMATCH = "The JSON no longer matches the form; it is used as written.";
const NOT_JSON = "This is not valid JSON.";
const VENDOR_ONLY = '{\n  "vendor_name": "ACME"\n}';
const BOTH = '{\n  "vendor_name": "ACME",\n  "amount": 12.5\n}';

function start(model: InputFormModel | null, text: string): InputSync {
  let result: InputSync | undefined;
  assert.doesNotThrow(() => {
    result = inputSyncStart(model, text);
  });
  assert.ok(result !== undefined);
  return result;
}

function step(model: InputFormModel | null, sync: InputSync, event: InputSyncEvent): InputSync {
  let result: InputSync | undefined;
  assert.doesNotThrow(() => {
    result = inputSyncStep(model, sync, event);
  });
  assert.ok(result !== undefined);
  return result;
}

function view(model: InputFormModel | null, sync: InputSync): InputSyncView {
  let result: InputSyncView | undefined;
  assert.doesNotThrow(() => {
    result = inputSyncView(model, sync);
  });
  assert.ok(result !== undefined);
  return result;
}

function field(name: string, value: string | boolean): InputSyncEvent {
  return { type: "field", name, value };
}

function text(value: string): InputSyncEvent {
  return { type: "text", text: value };
}

test("C-3695054c S1 start keeps the text and shows no error", () => {
  const s1 = start(MODEL, "{}");
  assert.equal(s1.text, "{}");
  assert.equal(s1.source, "json");
  assert.deepEqual(s1.raw, { vendor_name: "", amount: "" });
  assert.deepEqual(view(MODEL, s1), { fieldErrors: {}, jsonError: null, hint: KEPT, blocked: false });
});

test("C-3695054c S2 to S5 a form edit rewrites the text and blocks while invalid", () => {
  const s1 = start(MODEL, "{}");
  const s2 = step(MODEL, s1, field("vendor_name", "ACME"));
  assert.equal(s2.text, VENDOR_ONLY);
  assert.equal(s2.source, "form");
  assert.deepEqual(view(MODEL, s2), { fieldErrors: {}, jsonError: null, hint: KEPT, blocked: true });

  const s3 = step(MODEL, s2, field("amount", "12."));
  assert.equal(s3.text, VENDOR_ONLY);
  assert.equal(s3.source, "form");
  assert.deepEqual(view(MODEL, s3), {
    fieldErrors: { amount: "Enter a number" },
    jsonError: null,
    hint: KEPT,
    blocked: true,
  });

  const s4 = step(MODEL, s3, { type: "attempt" });
  assert.equal(s4.text, VENDOR_ONLY);
  assert.deepEqual(view(MODEL, s4).fieldErrors, { amount: "Enter a number" });
  assert.equal(view(MODEL, s4).blocked, true);

  const s5 = step(MODEL, s4, field("amount", "12.5"));
  assert.equal(s5.text, BOTH);
  assert.deepEqual(view(MODEL, s5), { fieldErrors: {}, jsonError: null, hint: KEPT, blocked: false });
});

test("C-3695054c S6 a text edit keeps its bytes and refills the buffer", () => {
  const s2 = step(MODEL, start(MODEL, "{}"), field("vendor_name", "ACME"));
  const typed = '{"vendor_name":"Z"}';
  const s6 = step(MODEL, s2, text(typed));
  assert.equal(s6.text, typed);
  assert.equal(s6.source, "json");
  assert.deepEqual(s6.raw, { vendor_name: "Z", amount: "" });
  assert.deepEqual(view(MODEL, s6), { fieldErrors: {}, jsonError: null, hint: KEPT, blocked: false });
});

test("C-3695054c S7 and S8 a bad text leaves the buffer alone and says why", () => {
  const s6 = step(MODEL, start(MODEL, "{}"), text('{"vendor_name":"Z"}'));

  const broken = '{"vendor_name"';
  const s7 = step(MODEL, s6, text(broken));
  assert.equal(s7.text, broken);
  assert.equal(s7.source, "json");
  assert.deepEqual(s7.raw, { vendor_name: "Z", amount: "" });
  const v7 = view(MODEL, s7);
  assert.equal(v7.jsonError, NOT_JSON);
  assert.equal(v7.hint, MISMATCH);
  assert.equal(v7.blocked, false);
  assert.deepEqual(v7.fieldErrors, {});

  const foreign = '{"foo":1}';
  const s8 = step(MODEL, s7, text(foreign));
  assert.equal(s8.text, foreign);
  assert.deepEqual(s8.raw, { vendor_name: "Z", amount: "" });
  const v8 = view(MODEL, s8);
  assert.equal(v8.jsonError, null);
  assert.equal(v8.hint, MISMATCH);
  assert.equal(v8.blocked, false);
});

test("C-3695054c S9 a fitting text refills both fields", () => {
  const typed = '{"vendor_name":"ACME","amount":12.5}';
  const s9 = step(MODEL, step(MODEL, start(MODEL, "{}"), text('{"foo":1}')), text(typed));
  assert.equal(s9.text, typed);
  assert.equal(s9.source, "json");
  assert.deepEqual(s9.raw, { vendor_name: "ACME", amount: "12.5" });
  assert.deepEqual(view(MODEL, s9), { fieldErrors: {}, jsonError: null, hint: KEPT, blocked: false });
});

test("C-3695054c T3b errors show after an attempt and block again when blanked", () => {
  let sync = start(MODEL, "{}");
  sync = step(MODEL, sync, field("vendor_name", "ACME"));
  assert.deepEqual(view(MODEL, sync).fieldErrors, {});
  assert.equal(view(MODEL, sync).blocked, true);

  sync = step(MODEL, sync, { type: "attempt" });
  assert.equal(sync.attempted, true);
  assert.deepEqual(view(MODEL, sync).fieldErrors, { amount: "Required" });
  assert.equal(view(MODEL, sync).blocked, true);

  sync = step(MODEL, sync, field("amount", "5"));
  assert.deepEqual(view(MODEL, sync).fieldErrors, {});
  assert.equal(view(MODEL, sync).blocked, false);

  sync = step(MODEL, sync, field("amount", ""));
  assert.equal(sync.text, VENDOR_ONLY);
  assert.deepEqual(view(MODEL, sync).fieldErrors, { amount: "Required" });
  assert.equal(view(MODEL, sync).blocked, true);

  sync = step(MODEL, sync, text("{}"));
  assert.equal(sync.attempted, false);
  assert.deepEqual(sync.touched, []);
  assert.deepEqual(view(MODEL, sync).fieldErrors, {});
  assert.equal(view(MODEL, sync).blocked, false);
});

test("C-3695054c T3c arrival keeps the typed text and fills the fields that fit", () => {
  const typed = '{"vendor_name":"ACME","amount":12.5}';
  const loading = step(null, start(null, "{}"), text(typed));
  assert.equal(loading.text, typed);
  const arrived = start(MODEL, loading.text);
  assert.equal(arrived.text, typed);
  assert.deepEqual(arrived.raw, { vendor_name: "ACME", amount: "12.5" });
  assert.equal(view(MODEL, arrived).hint, KEPT);
});

test("C-3695054c T3c arrival of a text that does not fit leaves the fields empty", () => {
  const typed = '{"foo":1}';
  const loading = step(null, start(null, "{}"), text(typed));
  const arrived = start(MODEL, loading.text);
  assert.equal(arrived.text, typed);
  assert.deepEqual(arrived.raw, { vendor_name: "", amount: "" });
  assert.equal(view(MODEL, arrived).hint, MISMATCH);
});

test("C-3695054c a model that is not a form gives an empty view and ignores field events", () => {
  const empty = { fieldErrors: {}, jsonError: null, hint: null, blocked: false };
  const none: InputFormModel = { kind: "json", reason: "x" };
  for (const model of [none, null]) {
    const broken = step(model, start(model, "{"), text("{"));
    assert.equal(broken.text, "{");
    assert.deepEqual(view(model, broken), empty);
    const same = step(model, broken, field("vendor_name", "ACME"));
    assert.deepEqual(same, broken);
  }
  // the form model proves the same field event does change a form
  const changed = step(MODEL, start(MODEL, "{}"), field("vendor_name", "ACME"));
  assert.equal(changed.text, VENDOR_ONLY);
});
