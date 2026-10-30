/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { confirmDialogModel, dialogOutcome } from "./confirm.ts";
import type { ConfirmDialogProps } from "./confirm.ts";
import { KitError } from "./errors.ts";

assert.equal(typeof confirmDialogModel, "function");
assert.equal(typeof dialogOutcome, "function");

const NOT_SET = Symbol("not set");

type DialogModelProps = Pick<
  ConfirmDialogProps,
  "title" | "description" | "action" | "destructive"
>;

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

test("C-c149362f the model", () => {
  const destructive = call(() =>
    confirmDialogModel({
      title: "Delete flow",
      action: " Delete flow ",
      destructive: true,
    }),
  );
  assert.deepEqual(destructive, {
    title: "Delete flow",
    description: null,
    confirmLabel: "Delete flow",
    cancelLabel: "Cancel",
    initialFocus: "cancel",
  });

  const publish = call(() =>
    confirmDialogModel({
      title: "Publish",
      description: "Goes live.",
      action: "Publish version",
    }),
  );
  assert.deepEqual(publish, {
    title: "Publish",
    description: "Goes live.",
    confirmLabel: "Publish version",
    cancelLabel: "Cancel",
    initialFocus: "confirm",
  });
});

test("C-51e7abfc the confirm button must name the action", () => {
  const genericActions = ["OK", "Yes.", "Confirm", "continue…"];
  for (const action of genericActions) {
    const props: DialogModelProps = { title: "Delete flow", action };
    assert.throws(
      () => confirmDialogModel(props),
      isKitError("KIT_CONFIRM_LABEL_GENERIC"),
      `${JSON.stringify(action)} is too generic to name the action`,
    );
  }

  const invalidActions = ["Cancel", "", "x".repeat(41)];
  for (const action of invalidActions) {
    const props: DialogModelProps = { title: "Delete flow", action };
    assert.throws(
      () => confirmDialogModel(props),
      isKitError("KIT_PROP_INVALID"),
      `${JSON.stringify(action)} is not a valid action label`,
    );
  }
});

test("C-ab614782 only the exact value confirms", () => {
  assert.equal(call(() => dialogOutcome("confirm")), "confirmed");

  for (const value of ["", "cancel", "Confirm", "confirm "]) {
    assert.equal(
      call(() => dialogOutcome(value)),
      "cancelled",
      `${JSON.stringify(value)} cancels`,
    );
  }
});
