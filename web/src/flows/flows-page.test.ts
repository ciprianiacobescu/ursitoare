/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { FLOW_PAGES, flowFeatureLiterals } from "./pages.ts";

assert.equal(typeof flowFeatureLiterals, "function");

const FEATURE_URL = new URL("../features/70-flows.tsx", import.meta.url);
const PAGE_URL = new URL("./FlowsPage.tsx", import.meta.url);

test("C-1f5393c5: the flows feature file declares the first page", () => {
  assert.equal(existsSync(FEATURE_URL), true);
  const literals = flowFeatureLiterals(existsSync(FEATURE_URL) ? readFileSync(FEATURE_URL, "utf8") : "");
  assert.deepEqual(literals, {
    id: FLOW_PAGES[0]?.id,
    path: FLOW_PAGES[0]?.path,
    navLabel: FLOW_PAGES[0]?.navLabel,
    capability: FLOW_PAGES[0]?.capability,
  });
});

test("C-1f5393c5: FlowsPage is implemented and renders no raw html", () => {
  const source = readFileSync(PAGE_URL, "utf8");
  assert.equal(source.includes("dangerouslySetInnerHTML"), false);
  assert.equal(source.includes("not implemented"), false);
  assert.equal(source.includes("Create flow"), true);
});
