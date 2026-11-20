import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../kit/contrast.ts";
import { findCssImports, findPaletteUtilities } from "../ui/rules.ts";

function readSource(name: string): string {
  const url = new URL(name, import.meta.url);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

const BANNED = [
  "dangerouslySetInnerHTML",
  "<Link",
  "<code",
  'role="status"',
  'role="alert"',
  "outline-none",
];

function assertPlain(name: string, source: string): void {
  assert.ok(source.length > 0, `${name} exists`);
  assert.deepEqual(findInlineStyleUse(source), [], `${name} has no inline style`);
  assert.deepEqual(findPaletteUtilities(source), [], `${name} has no palette utility`);
  assert.deepEqual(findCssImports(source), [], `${name} imports no stylesheet`);
  for (const text of BANNED) {
    assert.ok(!source.includes(text), `${name} does not contain ${text}`);
  }
}

test("C-b538162f: InputForm.tsx renders a fieldset with the legend Inputs and follows the source rules", () => {
  assert.equal(typeof findInlineStyleUse, "function");
  assert.equal(typeof findPaletteUtilities, "function");
  const source = readSource("InputForm.tsx");
  assertPlain("InputForm.tsx", source);
  assert.ok(source.includes("<fieldset"), "a fieldset");
  assert.ok(source.includes("<legend"), "a legend");
  assert.ok(source.includes("Inputs"), "the legend reads Inputs");
});

test("C-b538162f: MockRows.tsx uses Collapsible and Button and follows the source rules", () => {
  const source = readSource("MockRows.tsx");
  assertPlain("MockRows.tsx", source);
  assert.ok(source.includes("Collapsible"), "uses Collapsible");
  assert.ok(source.includes("Button"), "uses Button");
});

test("C-b538162f: use-run-document.ts reads the version with loadRunDocument and follows the source rules", () => {
  const source = readSource("use-run-document.ts");
  assertPlain("use-run-document.ts", source);
  assert.ok(source.includes("loadRunDocument("), "calls loadRunDocument");
  assert.ok(source.includes("AbortController"), "aborts a stale read");
  assert.ok(source.includes("runDocumentWanted("), "asks runDocumentWanted");
});
