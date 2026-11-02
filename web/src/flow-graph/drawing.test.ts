/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { drawEdges, drawNodes, viewBox } from "./drawing.ts";
import type { DrawEdge, DrawNode } from "./drawing.ts";
import { layoutFlow } from "./layout.ts";
import type { GraphLayout } from "./layout.ts";

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

function nodesOf(layout: GraphLayout, selected: string | null): DrawNode[] {
  let nodes: DrawNode[] | undefined;
  assert.doesNotThrow(() => {
    nodes = drawNodes(layout, selected);
  }, "drawNodes does not throw");
  assert.ok(nodes !== undefined, "drawNodes returns nodes");
  return nodes;
}

function edgesOf(layout: GraphLayout): DrawEdge[] {
  let edges: DrawEdge[] | undefined;
  assert.doesNotThrow(() => {
    edges = drawEdges(layout);
  }, "drawEdges does not throw");
  assert.ok(edges !== undefined, "drawEdges returns edges");
  return edges;
}

test("C-5070339e viewBox of the S layout", () => {
  assert.equal(typeof viewBox, "function");
  const layout = layoutOf(flowS());
  let box: string | undefined;
  assert.doesNotThrow(() => {
    box = viewBox(layout);
  }, "viewBox does not throw");
  assert.equal(box, "0 0 384 392");
});

test("C-5070339e drawNodes of S and its classes", () => {
  assert.equal(typeof drawNodes, "function");
  const layout = layoutOf(flowS());
  const nodes = nodesOf(layout, "b");
  assert.deepEqual(nodes, [
    {
      id: "a",
      x: 112,
      y: 16,
      width: 160,
      height: 48,
      textX: 192,
      titleY: 36,
      subtitleY: 54,
      title: "a",
      subtitle: "block",
      className: "flow-graph-node flow-graph-node--start",
    },
    {
      id: "b",
      x: 112,
      y: 120,
      width: 160,
      height: 48,
      textX: 192,
      titleY: 140,
      subtitleY: 158,
      title: "b",
      subtitle: "switch",
      className: "flow-graph-node flow-graph-node--selected",
    },
    {
      id: "c",
      x: 16,
      y: 224,
      width: 160,
      height: 48,
      textX: 96,
      titleY: 244,
      subtitleY: 262,
      title: "c",
      subtitle: "block",
      className: "flow-graph-node",
    },
    {
      id: "d",
      x: 208,
      y: 224,
      width: 160,
      height: 48,
      textX: 288,
      titleY: 244,
      subtitleY: 262,
      title: "d",
      subtitle: "end",
      className: "flow-graph-node",
    },
    {
      id: "e",
      x: 112,
      y: 328,
      width: 160,
      height: 48,
      textX: 192,
      titleY: 348,
      subtitleY: 366,
      title: "e",
      subtitle: "end",
      className: "flow-graph-node",
    },
  ]);
});

test("C-5070339e drawNodes of ODD with an added long id", () => {
  assert.equal(typeof drawNodes, "function");
  const longId = "x".repeat(30);
  const doc = flowODD() as { start: string; nodes: Record<string, unknown> };
  doc.nodes[longId] = { kind: "end" };
  const nodes = nodesOf(layoutOf(doc), null);

  const q = nodes.find((node) => node.id === "q");
  assert.ok(q !== undefined, "the drawing has node q");
  assert.equal(q.className, "flow-graph-node flow-graph-node--unknown flow-graph-node--unreachable");
  assert.equal(q.subtitle, "mystery (unknown kind)");

  const long = nodes.find((node) => node.id === longId);
  assert.ok(long !== undefined, "the drawing has the long id");
  assert.equal(long.title, `${"x".repeat(21)}\u2026`);
});

test("C-5070339e drawEdges of S CYCLE and a long case label", () => {
  assert.equal(typeof drawEdges, "function");

  assert.deepEqual(edgesOf(layoutOf(flowS())), [
    {
      key: "a>b",
      d: "M 192 64 L 192 120",
      className: "flow-graph-edge",
      label: null,
      labelX: 192,
      labelY: 92,
    },
    {
      key: "b>c",
      d: "M 192 168 L 96 224",
      className: "flow-graph-edge",
      label: "x",
      labelX: 144,
      labelY: 196,
    },
    {
      key: "b>d",
      d: "M 192 168 L 288 224",
      className: "flow-graph-edge",
      label: "y, default",
      labelX: 240,
      labelY: 196,
    },
    {
      key: "c>e",
      d: "M 96 272 L 192 328",
      className: "flow-graph-edge",
      label: null,
      labelX: 144,
      labelY: 300,
    },
  ]);

  const cycle = edgesOf(layoutOf(flowCYCLE()));
  const upward = cycle.find((edge) => edge.key === "b>a");
  assert.ok(upward !== undefined, "the cycle has the closing edge");
  assert.equal(upward.className, "flow-graph-edge flow-graph-edge--upward");

  const longKey = "k".repeat(30);
  const switchDoc = {
    start: "a",
    nodes: {
      a: { kind: "switch", on: "x", cases: { [longKey]: "b" } },
      b: { kind: "end" },
    },
  };
  const switchEdges = edgesOf(layoutOf(switchDoc));
  assert.equal(switchEdges.length, 1);
  const edge = switchEdges[0];
  assert.ok(edge !== undefined, "the switch has an edge");
  assert.equal(edge.label, `${"k".repeat(23)}\u2026`);
});
