/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { flowFeatureLiterals } from "../flows/pages.ts";
import { findInlineStyleUse } from "../kit/contrast.ts";

assert.equal(typeof flowFeatureLiterals, "function");
assert.equal(typeof findInlineStyleUse, "function");

const PANEL_URL = new URL("./DryRunPanel.tsx", import.meta.url);
const RUNS_FEATURE_URL = new URL("../features/80-runs.tsx", import.meta.url);

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

test("C-f665c2d6: DryRunPanel.tsx has the form texts, a code element and no inline style", () => {
  const source = readSource(PANEL_URL);
  assert.deepEqual(findInlineStyleUse(source), [], "the panel has no inline style");
  assert.ok(!source.includes("dangerouslySetInnerHTML"), "the panel injects no HTML");
  for (const text of [
    "Dry run inputs",
    "Start dry run",
    "Input (JSON)",
    "Fakes (JSON)",
    "Started dry run ",
    "Read steps call the real tools through the broker.",
    "<code>",
  ]) {
    assert.ok(source.includes(text), `the panel contains ${text}`);
  }
});

test("C-f665c2d6: 80-runs.tsx registers the Dry run panel beside the Test run panel", () => {
  const source = readSource(RUNS_FEATURE_URL);
  assert.ok(source.includes("DRY_RUN_PANEL"), "the Dry run panel is named");
  assert.equal(source.split("registerEditorPanel(").length - 1, 2, "two panel registrations");
  assert.equal(source.split("registerRunMessages();").length - 1, 1, "one message registration");
  assert.deepEqual(flowFeatureLiterals(source), {
    id: "runs",
    path: "/runs",
    navLabel: "Runs",
    capability: "read_run",
  });
});
