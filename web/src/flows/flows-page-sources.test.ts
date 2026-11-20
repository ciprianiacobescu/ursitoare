/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../kit/contrast.ts";
import { findPaletteUtilities } from "../ui/rules.ts";

const PAGE = (): string => readFileSync(new URL("./FlowsPage.tsx", import.meta.url), "utf8");

function count(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

test("C-529a32ce FlowsPage keeps its labels and uses the datalist", () => {
  const page = PAGE();
  for (const needle of [
    "Create flow",
    "Flow name",
    "Owner team",
    "list=",
    "<datalist",
    "ownerTeamSuggestions(",
    "useMyTeams(",
    "captionDisplayFor(",
    "checkOwnerTeam(",
  ]) {
    assert.ok(page.includes(needle), `FlowsPage.tsx holds ${needle}`);
  }
  assert.equal(count(page, "<PageHeader"), 1);
  assert.equal(count(page, "<Section"), 1);
  for (const banned of ["<select", "<h1", "flow-section", '.css"']) {
    assert.equal(page.includes(banned), false, `FlowsPage.tsx has no ${banned}`);
  }
  assert.deepEqual(findInlineStyleUse(page), []);
  assert.deepEqual(findPaletteUtilities(page), []);
});
