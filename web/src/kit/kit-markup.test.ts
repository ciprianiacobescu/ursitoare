/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findCssImports, findBannedImports, findPaletteUtilities } from "../ui/rules.ts";
import { findInlineStyleUse } from "./contrast.ts";

const FILES = [
  "./ConfirmDialog.tsx",
  "./EmptyState.tsx",
  "./ErrorPanel.tsx",
  "./LoadingState.tsx",
  "./ToastRegion.tsx",
  "./data/DataTable.tsx",
  "./data/Field.tsx",
  "./data/Form.tsx",
  "./data/SchemaForm.tsx",
  "./layout/PageHeader.tsx",
  "./layout/Section.tsx",
] as const;

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function holds(text: string, needles: readonly string[]): string[] {
  return needles.filter((needle) => !text.includes(needle));
}

test("C-2c488542 kit sources keep their roles texts and order and the confirm carries its tone", () => {
  const dialog = read("./ConfirmDialog.tsx");
  assert.deepEqual(
    holds(dialog, [
      "<dialog",
      '<form method="dialog">',
      'className="ui-dialog"',
      "showModal()",
      'data-tone={props.destructive === true ? "danger" : "primary"}',
    ]),
    [],
  );
  assert.equal(count(dialog, "data-tone"), 1);
  assert.ok(dialog.indexOf('value="cancel"') >= 0);
  assert.ok(dialog.indexOf('value="cancel"') < dialog.indexOf('value="confirm"'));

  const form = read("./data/Form.tsx");
  assert.deepEqual(
    holds(form, [
      'aria-disabled={model.submit === "busy"}',
      "noValidate",
      'className="ui-form-actions"',
    ]),
    [],
  );
  assert.equal(count(form, 'data-tone="primary"'), 1);
  assert.equal(count(form, "data-tone"), 1);
  assert.equal(count(form, 'role="alert"'), 1);

  const error = read("./ErrorPanel.tsx");
  assert.deepEqual(
    holds(error, [
      'role="alert"',
      "<h2>{model.title}</h2>",
      "Error code: <code>{model.code}</code>",
      "Decision id: <code>{model.decisionId}</code>",
      "Copy decision id",
    ]),
    [],
  );
  assert.equal(count(error, "data-tone"), 0);

  const loading = read("./LoadingState.tsx");
  assert.deepEqual(holds(loading, ['role="status" aria-busy="true"', "ui-spinner"]), []);
  assert.equal(count(loading, "data-tone"), 0);

  const empty = read("./EmptyState.tsx");
  assert.deepEqual(holds(empty, ['className="ui-empty"', "createElement(model.headingTag"]), []);
  assert.equal(count(empty, "data-tone"), 0);

  const toast = read("./ToastRegion.tsx");
  assert.deepEqual(
    holds(toast, [
      'className="ui-toasts" aria-live="polite" aria-atomic="false"',
      'className="ui-toast"',
      "Dismiss",
    ]),
    [],
  );
  assert.equal(count(toast, "data-tone"), 0);

  for (const path of FILES) {
    const text = read(path);
    assert.deepEqual(findInlineStyleUse(text), [], path);
    assert.deepEqual(findCssImports(text), [], path);
    assert.deepEqual(findBannedImports(text), [], path);
    assert.deepEqual(findPaletteUtilities(text), [], path);
    assert.equal(count(text, "buttonClasses"), 0, path);
    assert.equal(count(text, "ui/button"), 0, path);
  }
  for (const path of ["./data/DataTable.tsx", "./data/Field.tsx", "./data/SchemaForm.tsx"]) {
    assert.equal(count(read(path), "data-tone"), 0, path);
  }
});
