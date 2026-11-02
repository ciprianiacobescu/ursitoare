/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";
import { drawEdges, drawNodes } from "./drawing.ts";
import { layoutFlow } from "./layout.ts";
import type { GraphLayout } from "./layout.ts";

const CSS_URL = new URL("./flow-graph.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);
const VIEW_URL = new URL("./FlowGraphView.tsx", import.meta.url);

function flowS(): unknown {
  return {
    start: "a",
    nodes: {
      a: { kind: "block", next: "b" },
      b: { kind: "switch", on: "x", cases: { x: "c", y: "d" }, default: "d" },
      c: { kind: "block", next: "e" },
      d: { kind: "end" },
      e: { kind: "end" },
    },
  };
}

function flowODD(): unknown {
  return {
    start: "a",
    nodes: {
      a: { kind: "block", next: "ghost" },
      q: { kind: "mystery", next: "a" },
      z: 7,
      constructor: { kind: "block", next: "toString" },
    },
  };
}

function flowCYCLE(): unknown {
  return {
    start: "a",
    nodes: { a: { kind: "block", next: "b" }, b: { kind: "block", next: "a" } },
  };
}

function layoutOf(doc: unknown): GraphLayout {
  const result = layoutFlow(doc);
  assert.ok(result.status === "ok", "the document is a flow");
  return result.layout;
}

function collectClasses(layout: GraphLayout, selected: string | null, into: Set<string>): void {
  for (const node of drawNodes(layout, selected)) {
    for (const name of node.className.split(" ")) into.add(name);
  }
  for (const edge of drawEdges(layout)) {
    for (const name of edge.className.split(" ")) into.add(name);
  }
}

function drawnClasses(): string[] {
  const names = new Set<string>();
  collectClasses(layoutOf(flowS()), "b", names);
  collectClasses(layoutOf(flowODD()), null, names);
  collectClasses(layoutOf(flowCYCLE()), null, names);
  return [...names].sort();
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

function definesClass(css: string, name: string): boolean {
  return new RegExp(`\\.${name}(?![A-Za-z0-9_-])`).test(css);
}

test("C-ada22065: the flow graph stylesheet defines the drawn classes from kit tokens", () => {
  assert.ok(existsSync(CSS_URL), `${CSS_URL.pathname} must exist`);
  assert.ok(existsSync(TOKENS_CSS_URL), `${TOKENS_CSS_URL.pathname} must exist`);

  const css = readFileSync(CSS_URL, "utf8");
  const tokens = parseTokens(readFileSync(TOKENS_CSS_URL, "utf8"));

  assert.deepEqual(findRawColours(css), [], "flow-graph.css holds no raw colour");
  assert.deepEqual(findInlineStyleUse(css), [], "flow-graph.css uses no inline style");
  for (const name of tokenUses(css)) {
    assert.ok(Object.hasOwn(tokens, name), `flow-graph.css uses the kit token ${name}`);
  }

  assert.deepEqual(drawnClasses(), [
    "flow-graph-edge",
    "flow-graph-edge--upward",
    "flow-graph-node",
    "flow-graph-node--selected",
    "flow-graph-node--start",
    "flow-graph-node--unknown",
    "flow-graph-node--unreachable",
  ]);

  for (const name of drawnClasses()) {
    assert.equal(definesClass(css, name), true, `flow-graph.css defines .${name}`);
  }
  assert.equal(definesClass(css, "flow-graph-svg"), true, "flow-graph.css defines .flow-graph-svg");
});

test("C-ada22065: the flow graph view is decorative and free of inline styles", () => {
  assert.ok(existsSync(VIEW_URL), `${VIEW_URL.pathname} must exist`);

  const source = readFileSync(VIEW_URL, "utf8");
  assert.deepEqual(findInlineStyleUse(source), [], "FlowGraphView.tsx has no inline style");
  for (const banned of ["dangerouslySetInnerHTML", "fill=", "stroke="]) {
    assert.equal(source.includes(banned), false, `FlowGraphView.tsx lacks ${banned}`);
  }
  assert.equal(
    /#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/.test(source),
    false,
    "FlowGraphView.tsx holds no raw colour",
  );
  assert.equal(source.includes('aria-hidden="true"'), true, "the drawing is hidden from assistive tech");
  assert.equal(source.includes('focusable="false"'), true, "the drawing is not focusable");
  assert.equal(source.includes("aria-pressed"), true, "the list buttons report selection");
});
