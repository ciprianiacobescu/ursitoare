/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { KitError } from "../errors.ts";
import { fieldModel, isFieldName } from "./field.ts";
import type { FieldModel, FieldSpec } from "./field.ts";

assert.equal(typeof fieldModel, "function");
assert.equal(typeof isFieldName, "function");

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

function built(spec: FieldSpec, prefix: string, name: string): FieldModel {
  let model: FieldModel | undefined;
  assert.doesNotThrow(() => {
    model = fieldModel(spec, prefix);
  }, `${name} builds a model`);
  assert.ok(model !== undefined, `${name} produced a model`);
  return model;
}

test("C-d3d35a1c fieldModel links hint and error ids to the control", () => {
  const full = built(
    { name: "title", label: " Title ", hint: "Short name", error: "Required", required: true },
    "f1",
    "the fully described field",
  );
  assert.equal(full.name, "title");
  assert.equal(full.label, "Title");
  assert.equal(full.hint, "Short name");
  assert.equal(full.error, "Required");
  assert.equal(full.required, true);
  assert.equal(full.layout, "stacked");
  assert.equal(full.controlId, "f1-title");
  assert.equal(full.hintId, "f1-title-hint");
  assert.equal(full.errorId, "f1-title-error");
  assert.equal(full.describedBy, "f1-title-hint f1-title-error");
  assert.equal(full.invalid, true);

  const errorOnly = built({ name: "title", label: "Title", error: "Required" }, "f1", "the error only field");
  assert.equal(errorOnly.hint, null);
  assert.equal(errorOnly.hintId, null);
  assert.equal(errorOnly.errorId, "f1-title-error");
  assert.equal(errorOnly.describedBy, "f1-title-error");
  assert.equal(errorOnly.invalid, true);
  assert.equal(errorOnly.required, false);

  const plain = built({ name: "title", label: "Title" }, "f1", "the plain field");
  assert.equal(plain.hint, null);
  assert.equal(plain.error, null);
  assert.equal(plain.hintId, null);
  assert.equal(plain.errorId, null);
  assert.equal(plain.describedBy, null);
  assert.equal(plain.invalid, false);
  assert.equal(plain.required, false);
});

test("C-d3d35a1c fieldModel trims a blank hint or error away and keeps the inline layout", () => {
  const blankError = built(
    { name: "title", label: "Title", error: "   " },
    "f1",
    "the blank error field",
  );
  assert.equal(blankError.error, null);
  assert.equal(blankError.errorId, null);
  assert.equal(blankError.describedBy, null);
  assert.equal(blankError.invalid, false);

  const hintAtCap = built(
    { name: "title", label: "Title", hint: "h".repeat(400) },
    "f1",
    "the hint at its cap",
  );
  assert.equal(hintAtCap.hint, "h".repeat(400));
  assert.equal(hintAtCap.hintId, "f1-title-hint");
  assert.equal(hintAtCap.describedBy, "f1-title-hint");

  const longName = built({ name: "a".repeat(64), label: "Title" }, "f1", "the 64 character name");
  assert.equal(longName.controlId, `f1-${"a".repeat(64)}`);

  const inline = built({ name: "title", label: "Title", layout: "inline" }, "f1", "the inline field");
  assert.equal(inline.layout, "inline");
});

test("C-36608f1a isFieldName admits plain names and rejects every other shape", () => {
  assert.equal(isFieldName("title"), true);
  assert.equal(isFieldName("due_date"), true);
  assert.equal(isFieldName("1x"), false);
  assert.equal(isFieldName("a-b"), false);
  assert.equal(isFieldName("__proto__"), false);
  assert.equal(isFieldName(5), false);
});

test("C-36608f1a fieldModel throws KitError for a spec it cannot trust", () => {
  const bad: readonly [string, FieldSpec, string][] = [
    ["a bad name", { name: "9x", label: "Title" }, "f1"],
    ["a blank label", { name: "title", label: "   " }, "f1"],
    ["an 81 character label", { name: "title", label: "x".repeat(81) }, "f1"],
    ["a 401 character hint", { name: "title", label: "Title", hint: "x".repeat(401) }, "f1"],
    ["a 501 character error", { name: "title", label: "Title", error: "x".repeat(501) }, "f1"],
    ["a 65 character name", { name: "x".repeat(65), label: "Title" }, "f1"],
    ["a prefix with a space", { name: "title", label: "Title" }, "a b"],
    ["an empty prefix", { name: "title", label: "Title" }, ""],
    ["a 65 character prefix", { name: "title", label: "Title" }, "a".repeat(65)],
  ];
  for (const [name, spec, prefix] of bad) {
    assert.throws(() => fieldModel(spec, prefix), isKitError("KIT_PROP_INVALID"), `${name} throws KitError`);
  }
});
