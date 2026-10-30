/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { KitError } from "../errors.ts";
import { FORM_ERROR_KEY } from "./form-errors.ts";
import type { FormErrors } from "./form-errors.ts";
import { attemptFocus, focusTargetFor, formModel } from "./form.ts";
import type { AttemptFocus, FocusTarget, FormModel, FormSpec } from "./form.ts";

assert.equal(typeof formModel, "function");
assert.equal(typeof focusTargetFor, "function");
assert.equal(typeof attemptFocus, "function");

type Submit = FormModel["submit"];

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

function baseSpec(label: string, submitLabel: string, fields: readonly string[], errors: FormErrors, busy?: boolean): FormSpec {
  const spec: FormSpec = { label, submitLabel, fields, errors };
  if (busy !== undefined) spec.busy = busy;
  return spec;
}

function built(spec: FormSpec, name: string): FormModel {
  let model: FormModel | undefined;
  assert.doesNotThrow(() => {
    model = formModel(spec);
  }, `${name} builds a model`);
  assert.ok(model !== undefined, `${name} produced a model`);
  return model;
}

function target(fields: readonly string[], errors: FormErrors, name: string): FocusTarget {
  let found: FocusTarget | undefined;
  assert.doesNotThrow(() => {
    found = focusTargetFor(fields, errors);
  }, `${name} builds a target`);
  assert.ok(found !== undefined, `${name} produced a target`);
  return found;
}

function attempted(
  attempt: number,
  focused: number,
  submit: Submit,
  fields: readonly string[],
  errors: FormErrors,
  name: string,
): AttemptFocus {
  let result: AttemptFocus | undefined;
  assert.doesNotThrow(() => {
    result = attemptFocus(attempt, focused, submit, fields, errors);
  }, `${name} builds an attempt result`);
  assert.ok(result !== undefined, `${name} produced an attempt result`);
  return result;
}

test("C-547ad66e formModel builds the model of a valid spec in the enabled and busy states", () => {
  const idle = built(
    baseSpec(" New task ", "Save", ["title", "due"], { due: "Required", [FORM_ERROR_KEY]: "Not saved" }),
    "the idle form",
  );
  assert.deepEqual(idle, {
    label: "New task",
    submitLabel: "Save",
    submit: "enabled",
    formError: "Not saved",
    invalidFields: ["due"],
  });

  const busy = built(
    baseSpec(" New task ", "Save", ["title", "due"], { due: "Required", [FORM_ERROR_KEY]: "Not saved" }, true),
    "the busy form",
  );
  assert.deepEqual(busy, {
    label: "New task",
    submitLabel: "Save",
    submit: "busy",
    formError: "Not saved",
    invalidFields: ["due"],
  });
});

test("C-547ad66e formModel lists the invalid fields in field order and drops a form only message", () => {
  const both = built(
    baseSpec("New task", "Save", ["title", "due"], { due: "Required", title: "Too long" }),
    "the form with two invalid fields",
  );
  assert.deepEqual(both.invalidFields, ["title", "due"]);
  assert.equal(both.formError, null);
  assert.equal(both.submit, "enabled");

  const formOnly = built(
    baseSpec("New task", "Save", ["title", "due"], { [FORM_ERROR_KEY]: "Not saved" }),
    "the form with only a form level message",
  );
  assert.deepEqual(formOnly.invalidFields, []);
  assert.equal(formOnly.formError, "Not saved");
});

test("C-547ad66e focusTargetFor names the first invalid field, the form or none", () => {
  const field = target(["title", "due", "tags"], { due: "Required", tags: "x" }, "two invalid fields");
  assert.deepEqual(field, { kind: "field", name: "due" });

  const form = target(["title"], { [FORM_ERROR_KEY]: "x" }, "a form level message");
  assert.deepEqual(form, { kind: "form" });

  const none = target(["title"], { other: "x" }, "an error for a field the form does not hold");
  assert.deepEqual(none, { kind: "none" });
});

test("C-547ad66e attemptFocus skips a busy attempt and repeats an earlier attempt", () => {
  const busy = attempted(2, 1, "busy", ["title", "due"], { due: "Required" }, "a busy attempt");
  assert.deepEqual(busy, { target: { kind: "none" }, focused: 1 });

  const settled = attempted(2, 1, "enabled", ["title", "due"], { title: "Required" }, "a settled attempt");
  assert.deepEqual(settled, { target: { kind: "field", name: "title" }, focused: 2 });

  const first = attempted(0, 0, "enabled", ["title"], { title: "Required" }, "the first attempt");
  assert.deepEqual(first, { target: { kind: "none" }, focused: 0 });
});

test("C-36608f1a formModel throws KitError for a blank label and a duplicate field", () => {
  assert.throws(
    () => formModel(baseSpec("   ", "Save", ["title"], {})),
    isKitError("KIT_PROP_INVALID"),
    "a blank label throws KitError",
  );
  assert.throws(
    () => formModel(baseSpec("New task", "Save", ["title", "title"], {})),
    isKitError("KIT_PROP_INVALID"),
    "a duplicate field throws KitError",
  );
});

test("C-36608f1a formModel throws KitError outside the label submitLabel and fields bounds", () => {
  assert.throws(
    () => formModel(baseSpec("x".repeat(121), "Save", [], {})),
    isKitError("KIT_PROP_INVALID"),
    "a 121 character label throws KitError",
  );
  assert.throws(
    () => formModel(baseSpec("New task", "x".repeat(41), [], {})),
    isKitError("KIT_PROP_INVALID"),
    "a 41 character submitLabel throws KitError",
  );
  assert.throws(
    () => formModel(baseSpec("New task", "Save", ["9x"], {})),
    isKitError("KIT_PROP_INVALID"),
    "a field whose name isFieldName rejects throws KitError",
  );
  assert.throws(
    () => formModel(baseSpec("New task", "Save", Array.from({ length: 101 }, (_, i) => `f${i}`), {})),
    isKitError("KIT_PROP_INVALID"),
    "more than 100 unique fields throw KitError",
  );

  const atBounds = built(
    baseSpec("x".repeat(120), "x".repeat(40), ["title", "due"], {}),
    "the form at the label and submitLabel bounds",
  );
  assert.equal(atBounds.label, "x".repeat(120));
  assert.equal(atBounds.submitLabel, "x".repeat(40));
  assert.deepEqual(atBounds.invalidFields, []);
  assert.equal(atBounds.submit, "enabled");
});
