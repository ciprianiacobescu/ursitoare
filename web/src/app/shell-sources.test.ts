/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";

const SHELL_URL = new URL("./Shell.tsx", import.meta.url);

function count(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

test("C-ffb190b2 the shell source holds the landmark, group and menu markup", () => {
  assert.equal(typeof findInlineStyleUse, "function");
  assert.ok(existsSync(SHELL_URL));
  const source = readFileSync(SHELL_URL, "utf8");

  for (const needle of [
    "navGroups(",
    "navPlacement(",
    "useSession()",
    "aria-labelledby",
    "<p id={",
    "aria-expanded",
    "aria-controls",
    "TooltipProvider",
    "lg:hidden",
    "lg:block",
    "useState(",
    "<Outlet />",
    "<ToastRegion />",
    "<AccountMenu />",
    'href="#main"',
    '<main id="main" tabIndex={-1}',
    "Ursitoare workflow engine",
  ]) {
    assert.ok(source.includes(needle), `Shell.tsx contains ${needle}`);
  }

  assert.equal(count(source, "<nav"), 2, "two nav elements");
  assert.equal(count(source, 'aria-label="Main"'), 2, "two Main labels");
  assert.equal(count(source, "<header"), 1);
  assert.equal(count(source, "<footer"), 1);
  assert.equal(count(source, "<main"), 1);
  assert.equal(count(source, "Ursitoare"), 2);

  const order = ["Skip to content", "<header", "{inline ? null : nav}", "<main", "<footer"].map(
    (needle) => source.indexOf(needle),
  );
  for (const [i, at] of order.entries()) {
    assert.ok(at >= 0, `order needle ${i} is present`);
    if (i > 0) assert.ok(at > (order[i - 1] ?? 0), `order needle ${i} follows the previous`);
  }

  for (const banned of [
    'role="status"',
    'role="alert"',
    "aria-live",
    "app-nav",
    "app-banner",
    "app-shell",
    "Collapsible",
    "@radix-ui",
    "DropdownMenu",
    "style=",
    "outline-none",
    "disabled",
  ]) {
    assert.ok(!source.includes(banned), `Shell.tsx does not contain ${banned}`);
  }
  assert.ok(!/<h[1-6]\b/.test(source), "no heading");

  assert.deepEqual(findInlineStyleUse(source), []);
  assert.deepEqual(findPaletteUtilities(source), []);
  assert.deepEqual(findCssImports(source), []);
  assert.deepEqual(findBannedImports(source), []);
});
