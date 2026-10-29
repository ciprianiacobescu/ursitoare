/// <reference types="node" />
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";

import { KEYBOARD } from "./keyboard.ts";

assert.equal(typeof KEYBOARD, "object");

const KIT_DIR = new URL("./", import.meta.url);

function directChildComponentNames(): string[] {
  return readdirSync(KIT_DIR)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => name.slice(0, -4))
    .sort();
}

test("C-d9604877 keyboard documentation matches the component files", () => {
  const componentNames = directChildComponentNames();
  assert.ok(componentNames.length > 0, "the kit holds its component files");

  const documented = [...Object.keys(KEYBOARD)].sort();

  assert.deepEqual(
    documented,
    componentNames,
    "every component file has a KEYBOARD entry",
  );

  for (const name of documented) {
    const bindings = KEYBOARD[name];
    assert.ok(bindings !== undefined, `the entry for ${name} exists`);
    assert.ok(
      bindings.length > 0,
      `the entry for ${name} holds at least one binding`,
    );
    assert.ok(
      bindings.some(
        (binding) =>
          binding.keys.trim().length > 0 && binding.effect.trim().length > 0,
      ),
      `the entry for ${name} has a binding with non-blank keys and effect`,
    );
  }
});
