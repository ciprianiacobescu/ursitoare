/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const REGIONS = ["New grant", "Create team", "Map a group", "Chain verification", "Filter the audit log", "Surface"];

test("C-3802bfd0 the browser test measures the Section layout of all six admin regions", () => {
  const source = readFileSync(new URL("../../../e2e/test_m6b_section_layout.py", import.meta.url), "utf8");
  for (const name of REGIONS) {
    assert.ok(source.includes(`"${name}"`), `${name} is measured`);
  }
  assert.ok(source.includes("getBoundingClientRect"), "children are measured with getBoundingClientRect");
  assert.ok(source.includes('@pytest.mark.l4("C-3802bfd0")'), "the browser tests carry the criterion");
});
