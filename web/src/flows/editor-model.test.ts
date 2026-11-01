/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { editorStatus, planValidate, saveMessage } from "./editor-model.ts";
import type { Baseline } from "./editor-model.ts";
import type { SaveResult, VersionRow } from "./versions.ts";

assert.equal(typeof editorStatus, "function");

const H = `sha256:${"a".repeat(64)}`;

function version(number: number, validationOk: boolean | null): VersionRow {
  return {
    flowId: "rf-1-core",
    number,
    hash: H,
    state: "draft",
    surface: "yaml",
    author: "u1",
    requestedBy: null,
    createdAt: "2026-10-25T09:00:00.000000Z",
    validatedAt: null,
    validationOk,
  };
}

function baseline(validationOk: boolean | null): Baseline {
  return { text: "a", version: version(3, validationOk) };
}

test("C-ba506c1d: editorStatus says what is saved", () => {
  assert.doesNotThrow(() => {
    assert.equal(editorStatus(null, "a"), "Not saved yet.");
    assert.equal(editorStatus(baseline(null), "a"), "Version 3 saved. Not validated yet.");
    assert.equal(editorStatus(baseline(false), "a"), "Version 3 saved. Validation found errors.");
    assert.equal(editorStatus(baseline(true), "a"), "Version 3 saved and validated.");
    assert.equal(editorStatus(baseline(true), "b"), "Unsaved changes since version 3.");
  });
});

test("C-ba506c1d: planValidate saves first unless the text is the baseline", () => {
  assert.doesNotThrow(() => {
    assert.equal(planValidate(null, "a"), "save-first");
    assert.equal(planValidate(baseline(null), "a"), "validate");
    assert.equal(planValidate(baseline(null), "b"), "save-first");
  });
});

test("C-94bf935b: saveMessage reports whether a version was made", () => {
  const made: SaveResult = { version: version(2, null), created: true };
  const same: SaveResult = { version: version(2, null), created: false };
  assert.doesNotThrow(() => {
    assert.equal(saveMessage(made), "Saved version 2.");
    assert.equal(saveMessage(same), "Nothing to save: this text is already version 2.");
  });
});
