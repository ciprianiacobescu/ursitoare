/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { KitError } from "./errors.ts";
import type { EmptyStateProps } from "./states.ts";
import { emptyStateModel, loadingStateModel } from "./states.ts";

assert.equal(typeof emptyStateModel, "function");

const NOT_SET = Symbol("not set");

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

test("C-af45d5fe the models", () => {
  assert.equal(typeof loadingStateModel, "function");

  const noFlows = call(() => emptyStateModel({ title: " No flows " }));
  assert.deepEqual(noFlows, { title: "No flows", description: null, headingTag: "h2" });

  const blankDescription = call(() =>
    emptyStateModel({ title: "T", description: "  ", headingLevel: 1 }),
  );
  assert.deepEqual(blankDescription, { title: "T", description: null, headingTag: "h1" });

  const described = call(() => emptyStateModel({ title: "T", description: "d" }));
  assert.deepEqual(described, { title: "T", description: "d", headingTag: "h2" });

  const defaultLoading = call(() => loadingStateModel());
  assert.deepEqual(defaultLoading, { label: "Loading", role: "status", ariaBusy: true });

  const labelledLoading = call(() => loadingStateModel({ label: " Loading flows " }));
  assert.deepEqual(labelledLoading, {
    label: "Loading flows",
    role: "status",
    ariaBusy: true,
  });
});

test("C-844ec099 invalid properties", () => {
  const invalidEmpty: readonly [string, EmptyStateProps][] = [
    ["an empty title", { title: "" }],
    ["a 121-character title", { title: "x".repeat(121) }],
    ["a 301-character description", { title: "T", description: "x".repeat(301) }],
    ["heading level 5", { title: "T", headingLevel: 5 } as unknown as EmptyStateProps],
  ];
  for (const [label, props] of invalidEmpty) {
    assert.throws(
      () => emptyStateModel(props),
      isKitError("KIT_PROP_INVALID"),
      `${label} is rejected`,
    );
  }

  for (const [label, props] of [
    ["a blank label", { label: "  " }],
    ["an 81-character label", { label: "x".repeat(81) }],
  ] as const) {
    assert.throws(
      () => loadingStateModel(props),
      isKitError("KIT_PROP_INVALID"),
      `${label} is rejected`,
    );
  }
});
