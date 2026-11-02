/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { chooseNode, graphView, kindText, nodeDetailRows } from "./graph-model.ts";
import type { GraphView } from "./graph-model.ts";
import { layoutFlow } from "./layout.ts";
import type { GraphLayout, LayoutNode } from "./layout.ts";

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

function flowNOSTART(): unknown {
  return { nodes: { b: { kind: "end" }, a: { kind: "end" } } };
}

function flowONE(): unknown {
  return { start: "a", nodes: { a: { kind: "end" } } };
}

function flowWithNodeCount(count: number): unknown {
  const nodes: Record<string, unknown> = {};
  for (let index = 0; index < count; index += 1) {
    nodes[`n${String(index).padStart(3, "0")}`] = { kind: "end" };
  }
  return { start: "n000", nodes };
}

function layoutOf(doc: unknown): GraphLayout {
  const result = layoutFlow(doc);
  assert.ok(result.status === "ok", "the document is a flow");
  return result.layout;
}

function nodeOf(layout: GraphLayout, id: string): LayoutNode {
  const node = layout.nodes.find((candidate) => candidate.id === id);
  assert.ok(node !== undefined, `the layout has node ${id}`);
  return node;
}

function viewOf(canonical: unknown, saved: boolean): GraphView {
  let view: GraphView | undefined;
  assert.doesNotThrow(() => {
    view = graphView(canonical, saved);
  }, "graphView does not throw");
  assert.ok(view !== undefined, "graphView returns a view");
  return view;
}

test("C-cf729adf states messages and the node list", () => {
  const sView = viewOf(flowS(), true);
  assert.equal(sView.state, "ready");
  assert.equal(sView.message, "Flow graph: 5 nodes, 4 edges, 4 layers.");
  assert.deepEqual(sView.items, [
    { id: "a", label: "a", summary: "block · Start · Next: b" },
    { id: "b", label: "b", summary: "switch · Next: c, d" },
    { id: "c", label: "c", summary: "block · Next: e" },
    { id: "d", label: "d", summary: "end · Next: none" },
    { id: "e", label: "e", summary: "end · Next: none" },
  ]);
  assert.deepEqual(sView.layout, layoutOf(flowS()));

  const oddView = viewOf(flowODD(), true);
  assert.equal(oddView.state, "ready");
  assert.equal(
    oddView.message,
    "Flow graph: 4 nodes, 0 edges, 2 layers. 3 nodes cannot be reached from the start node.",
  );
  assert.deepEqual(oddView.items, [
    { id: "a", label: "a", summary: "block · Start · Next: ghost (missing)" },
    {
      id: "constructor",
      label: "constructor",
      summary: "block · Next: toString (missing) · Not reachable",
    },
    { id: "q", label: "q", summary: "mystery (unknown kind) · Next: none · Not reachable" },
    { id: "z", label: "z", summary: "no kind · Next: none · Not reachable" },
  ]);
  assert.deepEqual(oddView.layout, layoutOf(flowODD()));

  const oneView = viewOf(flowONE(), true);
  assert.equal(oneView.state, "ready");
  assert.equal(oneView.message, "Flow graph: 1 node, 0 edges, 1 layer.");
  assert.deepEqual(oneView.items, [{ id: "a", label: "a", summary: "end · Start · Next: none" }]);
  assert.deepEqual(oneView.layout, layoutOf(flowONE()));

  const noStartView = viewOf(flowNOSTART(), true);
  assert.equal(noStartView.state, "ready");
  assert.equal(
    noStartView.message,
    "Flow graph: 2 nodes, 0 edges, 1 layer. 2 nodes cannot be reached from the start node.",
  );
  assert.deepEqual(noStartView.items, [
    { id: "a", label: "a", summary: "end · Next: none · Not reachable" },
    { id: "b", label: "b", summary: "end · Next: none · Not reachable" },
  ]);
  assert.deepEqual(noStartView.layout, layoutOf(flowNOSTART()));

  const unsavedView = viewOf(flowS(), false);
  assert.equal(unsavedView.state, "unsaved");
  assert.equal(
    unsavedView.message,
    "The graph shows a saved version. Save the flow text as a version in the editor to draw it.",
  );
  assert.equal(unsavedView.layout, null);
  assert.deepEqual(unsavedView.items, []);

  const notMappingView = viewOf("x", true);
  assert.equal(notMappingView.state, "invalid");
  assert.equal(
    notMappingView.message,
    "This version's document is not a flow: it is not a mapping.",
  );
  assert.equal(notMappingView.layout, null);
  assert.deepEqual(notMappingView.items, []);

  const noNodesView = viewOf({}, true);
  assert.equal(noNodesView.state, "invalid");
  assert.equal(noNodesView.message, 'This version\'s document has no "nodes" mapping.');
  assert.equal(noNodesView.layout, null);
  assert.deepEqual(noNodesView.items, []);

  const emptyView = viewOf({ start: "a", nodes: {} }, true);
  assert.equal(emptyView.state, "empty");
  assert.equal(emptyView.message, "This flow has no nodes yet.");
  assert.equal(emptyView.layout, null);
  assert.deepEqual(emptyView.items, []);

  const tooLargeView = viewOf(flowWithNodeCount(201), true);
  assert.equal(tooLargeView.state, "too_large");
  assert.equal(
    tooLargeView.message,
    "This flow has 201 nodes. The graph draws at most 200 nodes. Read the flow text in the editor.",
  );
  assert.equal(tooLargeView.layout, null);
  assert.deepEqual(tooLargeView.items, []);

  const oddNodes = layoutOf(flowODD()).nodes;
  assert.doesNotThrow(() => {
    assert.deepEqual(
      oddNodes.map((node) => [node.id, kindText(node)]),
      [
        ["a", "block"],
        ["constructor", "block"],
        ["q", "mystery (unknown kind)"],
        ["z", "no kind"],
      ],
    );
  });
});

function longNodeDoc(): unknown {
  return {
    start: "n",
    nodes: {
      n: {
        kind: "block",
        source: "x".repeat(400),
        retries: 3,
        flag: true,
        none: null,
        list: ["a", "b"],
        deep: { k: { j: 1 } },
      },
    },
  };
}

function protoNodeDoc(): unknown {
  return {
    start: "n",
    nodes: { n: JSON.parse('{"kind":"end","__proto__":{"x":1}}') as unknown },
  };
}

test("C-793687fa node details are read only text", () => {
  const sDoc = flowS();
  const sLayout = layoutOf(sDoc);
  const b = nodeOf(sLayout, "b");
  const c = nodeOf(sLayout, "c");

  const oddDoc = flowODD();
  const oddLayout = layoutOf(oddDoc);
  const q = nodeOf(oddLayout, "q");
  const z = nodeOf(oddLayout, "z");

  const longDoc = longNodeDoc();
  const longNode = nodeOf(layoutOf(longDoc), "n");

  const protoDoc = protoNodeDoc();
  const protoNode = nodeOf(layoutOf(protoDoc), "n");

  assert.doesNotThrow(() => {
    assert.deepEqual(nodeDetailRows(sDoc, b), [
      { name: "Node", value: "b" },
      { name: "Kind", value: "switch" },
      { name: "Successors", value: "c, d" },
      { name: "cases", value: '{"x":"c","y":"d"}' },
      { name: "default", value: "d" },
      { name: "on", value: "x" },
    ]);

    assert.deepEqual(nodeDetailRows(sDoc, c), [
      { name: "Node", value: "c" },
      { name: "Kind", value: "block" },
      { name: "Successors", value: "e" },
      { name: "next", value: "e" },
    ]);

    assert.deepEqual(nodeDetailRows(oddDoc, q), [
      { name: "Node", value: "q" },
      { name: "Kind", value: "mystery (unknown kind)" },
      { name: "Successors", value: "none" },
      { name: "Reachability", value: "Not reachable from the start node." },
      { name: "next", value: "a" },
    ]);

    assert.deepEqual(nodeDetailRows(oddDoc, z), [
      { name: "Node", value: "z" },
      { name: "Kind", value: "no kind" },
      { name: "Successors", value: "none" },
      { name: "Reachability", value: "Not reachable from the start node." },
    ]);

    assert.deepEqual(nodeDetailRows(longDoc, longNode), [
      { name: "Node", value: "n" },
      { name: "Kind", value: "block" },
      { name: "Successors", value: "none" },
      { name: "deep", value: '{"k":{"j":1}}' },
      { name: "flag", value: "true" },
      { name: "list", value: '["a","b"]' },
      { name: "none", value: "null" },
      { name: "retries", value: "3" },
      { name: "source", value: `${"x".repeat(299)}…` },
    ]);

    assert.deepEqual(nodeDetailRows(protoDoc, protoNode), [
      { name: "Node", value: "n" },
      { name: "Kind", value: "end" },
      { name: "Successors", value: "none" },
      { name: "__proto__", value: '{"x":1}' },
    ]);
  });
});

test("C-54028b08 selecting a node", () => {
  const layout = layoutOf(flowS());
  assert.doesNotThrow(() => {
    assert.equal(chooseNode(layout, null, "b"), "b");
    assert.equal(chooseNode(layout, "b", "d"), "d");
    assert.equal(chooseNode(layout, "b", "ghost"), "b");
    assert.equal(chooseNode(layout, "b", "__proto__"), "b");
    assert.equal(chooseNode(layout, "b", "toString"), "b");
    assert.equal(chooseNode(null, "b", "b"), null);
  });
});
