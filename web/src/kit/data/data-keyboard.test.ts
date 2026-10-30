/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../contrast.ts";
import { DATA_KEYBOARD } from "./data-keyboard.ts";

assert.equal(typeof findInlineStyleUse, "function");

const COMPONENT_FILES = ["DataTable", "Field", "Form", "SchemaForm"] as const;

const EXPECTED_BINDINGS: Readonly<
  Record<string, readonly { keys: string; effect: string }[]>
> = {
  DataTable: [
    { keys: "Tab", effect: "Table region, then Load more or Try again." },
    {
      keys: "Enter",
      effect:
        "Activates the button; focus stays on Load more, or moves to the table region or to Try again.",
    },
  ],
  Field: [
    {
      keys: "Tab",
      effect: "Moves between controls; hint and error are read with the control.",
    },
  ],
  Form: [{ keys: "Enter", effect: "Submits from a text input." }],
  SchemaForm: [{ keys: "Tab", effect: "As Form; an Unsupported field has no control." }],
};

function sourceFor(name: string): string {
  const url = new URL(`./${name}.tsx`, import.meta.url);
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return readFileSync(url, "utf8");
}

test("C-74fd23b0 data keyboard documents exactly the four components", () => {
  assert.equal(typeof DATA_KEYBOARD, "object");
  assert.deepEqual(
    Object.keys(DATA_KEYBOARD).sort(),
    [...COMPONENT_FILES].sort(),
    "every data component is documented",
  );
  for (const name of COMPONENT_FILES) {
    const bindings = DATA_KEYBOARD[name];
    assert.ok(bindings !== undefined, `the entry for ${name} exists`);
    assert.ok(bindings.length > 0, `the entry for ${name} holds a binding`);
    for (const binding of bindings) {
      assert.notEqual(binding.keys.trim(), "", `${name} has non-blank keys`);
      assert.notEqual(binding.effect.trim(), "", `${name} has a non-blank effect`);
    }
  }
});

test("C-74fd23b0 data keyboard states the documented bindings", () => {
  for (const name of COMPONENT_FILES) {
    assert.deepEqual(DATA_KEYBOARD[name], EXPECTED_BINDINGS[name], `${name} bindings`);
  }
});

test("C-74fd23b0 data component sources use no inline style and no raw HTML", () => {
  assert.deepEqual(
    Object.keys(DATA_KEYBOARD).sort(),
    [...COMPONENT_FILES].sort(),
    "the sources read belong to documented components",
  );
  for (const name of COMPONENT_FILES) {
    const source = sourceFor(name);
    assert.deepEqual(findInlineStyleUse(source), [], `${name}.tsx has no inline style`);
    assert.equal(
      source.includes("dangerouslySetInnerHTML"),
      false,
      `${name}.tsx has no dangerouslySetInnerHTML`,
    );
    assert.equal(source.includes("innerHTML"), false, `${name}.tsx has no innerHTML`);
  }
});
