/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { createFeatureRegistry } from "../app/features.ts";
import { flowFeatureLiterals } from "../flows/pages.ts";
import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";
import { RUN_PAGES, RUNS_TITLE, TEST_RUN_PANEL, runLinkName, runPath, runTitle } from "./pages.ts";

assert.equal(typeof runTitle, "function");
assert.equal(typeof runPath, "function");
assert.equal(typeof runLinkName, "function");
assert.equal(typeof flowFeatureLiterals, "function");
assert.equal(typeof findRawColours, "function");
assert.equal(typeof findInlineStyleUse, "function");
assert.equal(typeof parseTokens, "function");
assert.equal(typeof createFeatureRegistry, "function");

const RUNS_CSS_URL = new URL("./runs.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);
const RUNS_FEATURE_URL = new URL("../features/80-runs.tsx", import.meta.url);
const RUN_FEATURE_URL = new URL("../features/81-run.tsx", import.meta.url);
const COMPONENT_URLS: readonly URL[] = [
  new URL("./RunsPage.tsx", import.meta.url),
  new URL("./RunPage.tsx", import.meta.url),
  new URL("./TestRunPanel.tsx", import.meta.url),
];

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function tokenUses(css: string): string[] {
  const found: string[] = [];
  for (const match of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    const name = match[1];
    assert.ok(name !== undefined, "a var use was read");
    found.push(name);
  }
  return found;
}

test("C-b67fc6a7: the run pages carry their fixed names and navigation", () => {
  const expectedPages = [
    {
      id: "runs",
      file: "80-runs.tsx",
      path: "/runs",
      navLabel: "Runs",
      capability: "read_run",
    },
    {
      id: "run",
      file: "81-run.tsx",
      path: "/runs/:runId",
      navLabel: null,
      capability: null,
    },
  ];
  assert.deepEqual(RUN_PAGES, expectedPages, "the run pages are listed in their order");
  assert.deepEqual(TEST_RUN_PANEL, { id: "test-run", title: "Test run" });
  assert.equal(RUNS_TITLE, "Runs · Ursitoare");

  let title = "";
  let path = "";
  let linkName = "";
  assert.doesNotThrow(() => {
    title = runTitle("run_1");
    path = runPath("run_1");
    linkName = runLinkName("run_1");
  }, "the run names are built");
  assert.equal(title, "Run run_1 · Ursitoare");
  assert.equal(path, "/runs/run_1");
  assert.equal(linkName, "Open run run_1");
  assert.throws(() => runPath("a/b"), RangeError, "a run id with a slash is refused");

  const registry = createFeatureRegistry();
  for (const page of RUN_PAGES) {
    registry.register({
      id: page.id,
      path: page.path,
      ...(page.navLabel === null ? {} : { navLabel: page.navLabel }),
      ...(page.capability === null ? {} : { capability: page.capability }),
      element: null,
    });
  }
  assert.deepEqual(
    registry.nav(new Set(["read_run"])),
    [{ id: "runs", path: "/runs", label: "Runs" }],
    "a run reader sees the Runs entry only",
  );
  assert.deepEqual(registry.nav(new Set()), [], "a user with no capability sees no entry");
});

test("C-b67fc6a7: the feature files declare the run pages and register the panel", () => {
  const expectedLiterals = [
    { id: "runs", path: "/runs", navLabel: "Runs", capability: "read_run" },
    { id: "run", path: "/runs/:runId", navLabel: null, capability: null },
  ];
  const runsFeature = readSource(RUNS_FEATURE_URL);
  const runFeature = readSource(RUN_FEATURE_URL);
  assert.deepEqual(
    [flowFeatureLiterals(runsFeature), flowFeatureLiterals(runFeature)],
    expectedLiterals,
    "the feature files declare the run pages",
  );
  assert.deepEqual(
    expectedLiterals,
    RUN_PAGES.map((page) => ({
      id: page.id,
      path: page.path,
      navLabel: page.navLabel,
      capability: page.capability,
    })),
    "the literals equal RUN_PAGES without file",
  );

  assert.equal(runsFeature.includes("registerEditorPanel("), true);
  assert.equal(runsFeature.includes("TEST_RUN_PANEL"), true);
  assert.equal(runsFeature.includes("registerRunMessages();"), true);
});

test("C-b67fc6a7: the run sources use kit tokens and accessible controls", () => {
  const css = readSource(RUNS_CSS_URL);
  const tokens = parseTokens(readSource(TOKENS_CSS_URL));
  assert.deepEqual(findRawColours(css), [], "runs.css holds no raw colour");
  assert.deepEqual(findInlineStyleUse(css), [], "runs.css uses no inline style");
  for (const name of tokenUses(css)) {
    assert.ok(Object.hasOwn(tokens, name), `runs.css uses the kit token ${name}`);
  }

  for (const url of COMPONENT_URLS) {
    const source = readSource(url);
    assert.deepEqual(findInlineStyleUse(source), [], `${url.pathname} has no inline style`);
    assert.equal(
      source.includes("dangerouslySetInnerHTML"),
      false,
      `${url.pathname} sets no raw html`,
    );
  }

  const runPage = readSource(new URL("./RunPage.tsx", import.meta.url));
  assert.equal(runPage.includes("aria-expanded"), true, "RunPage marks the open step");
  assert.equal(runPage.includes("aria-controls"), true, "RunPage points at the details region");
});
