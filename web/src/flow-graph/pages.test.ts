/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { createEditorPanelRegistry } from "../flows/editor-panels.ts";
import { FLOW_PAGES, flowFeatureLiterals } from "../flows/pages.ts";
import { createFeatureRegistry } from "../app/features.ts";
import { findInlineStyleUse } from "../kit/contrast.ts";
import { GRAPH_PAGE, GRAPH_PANEL, graphPath, versionNote } from "./pages.ts";

assert.equal(typeof graphPath, "function");
assert.equal(typeof versionNote, "function");
assert.equal(typeof flowFeatureLiterals, "function");
assert.equal(typeof findInlineStyleUse, "function");
assert.equal(typeof createFeatureRegistry, "function");

const PANEL_URL = new URL("./GraphPanel.tsx", import.meta.url);
const PAGE_URL = new URL("./FlowGraphPage.tsx", import.meta.url);
const FEATURE_URL = new URL("../features/75-flow-graph.tsx", import.meta.url);
const SOURCE_URLS = [PANEL_URL, PAGE_URL, FEATURE_URL];

function readSource(url: URL): string {
  assert.equal(existsSync(url), true, `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

test("C-5be45b98: the graph page and panel are registered with the flow pages", () => {
  assert.deepEqual(GRAPH_PAGE, {
    id: "flow-graph",
    file: "75-flow-graph.tsx",
    path: "/flows/:flowId/graph",
    navLabel: null,
    capability: null,
  });
  assert.deepEqual(GRAPH_PANEL, { id: "graph", title: "Graph" });

  const features = createFeatureRegistry();
  for (const page of FLOW_PAGES) {
    features.register({
      id: page.id,
      path: page.path,
      ...(page.navLabel === null ? {} : { navLabel: page.navLabel }),
      ...(page.capability === null ? {} : { capability: page.capability }),
      element: null,
    });
  }
  features.register({
    id: GRAPH_PAGE.id,
    path: GRAPH_PAGE.path,
    ...(GRAPH_PAGE.navLabel === null ? {} : { navLabel: GRAPH_PAGE.navLabel }),
    ...(GRAPH_PAGE.capability === null ? {} : { capability: GRAPH_PAGE.capability }),
    element: null,
  });

  assert.deepEqual(
    features.list().map((feature) => feature.id),
    ["flows", "flow-editor", "flow-graph"],
    "the registry lists the flow pages and the graph page",
  );
  assert.deepEqual(
    features.nav(new Set(["read_flow"])),
    [{ id: "flows", path: "/flows", label: "Flows" }],
    "the dynamic graph page adds no navigation entry",
  );

  const panels = createEditorPanelRegistry();
  let registered: readonly string[] = [];
  assert.doesNotThrow(() => {
    panels.register({
      id: GRAPH_PANEL.id,
      title: GRAPH_PANEL.title,
      render: () => null,
    });
    registered = panels.list().map((panel) => panel.id);
  }, "the graph panel registers");
  assert.deepEqual(registered, ["graph"], "the graph panel is in the registry");
});

test("C-5be45b98: graphPath validates the id and versionNote names the version", () => {
  let graph = "";
  assert.doesNotThrow(() => {
    graph = graphPath("demo-graph");
  }, "a flow id is accepted");
  assert.equal(graph, "/flows/demo-graph/graph");

  for (const bad of ["Bad_Name", "../x", ""]) {
    assert.throws(() => graphPath(bad), RangeError, `${JSON.stringify(bad)} is rejected`);
  }

  let note = "";
  let noVersion = "";
  assert.doesNotThrow(() => {
    note = versionNote(2);
    noVersion = versionNote(null);
  }, "versionNote reads a version and none");
  assert.equal(note, "Showing version 2.");
  assert.equal(noVersion, "No version saved yet.");
});

test("C-5be45b98: the feature file declares the page and registers the panel", () => {
  const featureSource = readSource(FEATURE_URL);
  assert.deepEqual(
    flowFeatureLiterals(featureSource),
    { id: "flow-graph", path: "/flows/:flowId/graph", navLabel: null, capability: null },
    "the feature literals describe the graph page",
  );
  assert.equal(
    featureSource.includes("registerEditorPanel("),
    true,
    "the feature file registers the editor panel",
  );
  assert.equal(featureSource.includes("GRAPH_PANEL"), true, "the feature file names GRAPH_PANEL");

  for (const url of SOURCE_URLS) {
    const source = readSource(url);
    assert.deepEqual(findInlineStyleUse(source), [], `${url.pathname} has no inline style`);
    assert.equal(
      source.includes("dangerouslySetInnerHTML"),
      false,
      `${url.pathname} sets no raw html`,
    );
  }
});
