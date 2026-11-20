/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";
import { findCssImports, findPaletteUtilities } from "../ui/rules.ts";

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");

const PAGE = (): string => read("./FlowEditorPage.tsx");
const GRAPH_PAGE = (): string => read("../flow-graph/FlowGraphPage.tsx");
const GRAPH_FEATURE = (): string => read("../features/75-flow-graph.tsx");
const FLOWS_CSS = (): string => read("./flows.css");
const GRAPH_CSS = (): string => read("../flow-graph/flow-graph.css");

function count(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

function ruleBodies(css: string, selector: string): string[] {
  const bodies: string[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of css.matchAll(pattern)) {
    const selectors = (match[1] ?? "").split(",").map((s) => s.trim());
    if (selectors.includes(selector)) bodies.push(match[2] ?? "");
  }
  return bodies;
}

test("C-6e1daab9 FlowEditorPage holds the layout, the ids and the index", () => {
  const page = PAGE();
  for (const needle of [
    "splitPanels(listEditorPanels())",
    "jumpLinks(",
    'aria-label="On this page"',
    "sticky top-0",
    'id="flow-editor"',
    'id="flow-diagnostics"',
    'id="flow-versions"',
    "id={`flow-panel-${panel.id}`}",
    "scroll-mt-16",
    "useDisplayNames(",
    "personLabel(",
    "captionDisplayFor(",
    "formatInstant(",
    "<time dateTime={row.createdAt}>",
    'getElementById("flow-editor")',
    'scrollIntoView({ block: "start" })',
    "Owner team: ",
    'rel="noopener noreferrer"',
  ]) {
    assert.ok(page.includes(needle), `FlowEditorPage.tsx holds ${needle}`);
  }
  assert.equal(count(page, "xl:grid-cols-2"), 2);
  assert.equal(count(page, "<PageHeader"), 4);
  assert.equal(count(page, "<Section"), 4);
  for (const banned of ["<nav", "<h1", "<select", 'role="tab', "ui-button", '.css"']) {
    assert.equal(page.includes(banned), false, `FlowEditorPage.tsx has no ${banned}`);
  }
  assert.equal(count(page, "listEditorPanels("), 1);
  assert.ok(page.indexOf("function FlowEditorPage(") >= 0);
  assert.ok(page.indexOf("function FlowEditorPage(") < page.indexOf("listEditorPanels("));
});

test("C-6e1daab9 the graph feature, the CSS files and FlowGraphPage hold their rules", () => {
  const feature = GRAPH_FEATURE();
  for (const needle of ['placement: "side"', "registerEditorPanel(", "GRAPH_PANEL"]) {
    assert.ok(feature.includes(needle), `75-flow-graph.tsx holds ${needle}`);
  }

  const hosts = ruleBodies(FLOWS_CSS(), ".flow-editor-host");
  assert.equal(hosts.length, 1);
  assert.ok((hosts[0] ?? "").includes("height: clamp(20rem, calc(100vh - 33rem), 70vh)"));
  assert.ok((hosts[0] ?? "").includes("overflow-y: auto"));
  assert.equal(FLOWS_CSS().includes(".flow-section"), false);

  const svgs = ruleBodies(GRAPH_CSS(), ".flow-graph-svg");
  assert.equal(svgs.length, 1);
  assert.ok((svgs[0] ?? "").includes("max-width: 36rem"));
  assert.ok((svgs[0] ?? "").includes("margin-inline: auto"));
  assert.ok((svgs[0] ?? "").includes("width: 100%"));

  const graphPage = GRAPH_PAGE();
  for (const needle of ["<PageHeader", '<Section title="Graph"', "Back to the editor"]) {
    assert.ok(graphPage.includes(needle), `FlowGraphPage.tsx holds ${needle}`);
  }
});

test("C-6e1daab9 the edited sources keep the style rules and use tokens only", () => {
  const tokens = parseTokens(read("../kit/tokens.css"));
  for (const source of [PAGE(), GRAPH_PAGE(), GRAPH_FEATURE()]) {
    assert.deepEqual(findInlineStyleUse(source), []);
    assert.deepEqual(findPaletteUtilities(source), []);
    assert.deepEqual(findCssImports(source), []);
  }
  for (const css of [FLOWS_CSS(), GRAPH_CSS()]) {
    assert.deepEqual(findRawColours(css), []);
    for (const match of css.matchAll(/var\((--[A-Za-z0-9_-]+)/g)) {
      const name = match[1] ?? "";
      assert.ok(name in tokens, `${name} is a token`);
    }
  }
  assert.ok(PAGE().includes("jumpLinks("), "the page uses the index");
});
