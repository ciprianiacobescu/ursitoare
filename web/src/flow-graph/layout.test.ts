/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GRAPH_GEOMETRY,
  MAX_GRAPH_NODES,
  layoutFlow,
} from "./layout.ts";
import type { GraphLayout, LayoutResult } from "./layout.ts";

function resultOf(doc: unknown, label: string): LayoutResult {
  let result: LayoutResult | undefined;
  assert.doesNotThrow(() => {
    result = layoutFlow(doc);
  }, `${label} does not throw`);
  assert.ok(result !== undefined, `${label} returns a result`);
  return result;
}

function layoutOf(doc: unknown, label: string): GraphLayout {
  const result = resultOf(doc, label);
  assert.ok(result.status === "ok", `${label} is a flow`);
  return result.layout;
}

function deepFreeze(value: unknown): unknown {
  if (typeof value === "object" && value !== null) {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
  return value;
}

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

function withReversedNodeKeys(doc: unknown): unknown {
  const flow = doc as { start?: unknown; nodes: Record<string, unknown> };
  return { start: flow.start, nodes: Object.fromEntries(Object.entries(flow.nodes).reverse()) };
}

const S_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "block",
      known: true,
      reachable: true,
      start: true,
      layer: 0,
      index: 0,
      x: 112,
      y: 16,
      successors: ["b"],
      missing: [],
    },
    {
      id: "b",
      kind: "switch",
      known: true,
      reachable: true,
      start: false,
      layer: 1,
      index: 0,
      x: 112,
      y: 120,
      successors: ["c", "d"],
      missing: [],
    },
    {
      id: "c",
      kind: "block",
      known: true,
      reachable: true,
      start: false,
      layer: 2,
      index: 0,
      x: 16,
      y: 224,
      successors: ["e"],
      missing: [],
    },
    {
      id: "d",
      kind: "end",
      known: true,
      reachable: true,
      start: false,
      layer: 2,
      index: 1,
      x: 208,
      y: 224,
      successors: [],
      missing: [],
    },
    {
      id: "e",
      kind: "end",
      known: true,
      reachable: true,
      start: false,
      layer: 3,
      index: 0,
      x: 112,
      y: 328,
      successors: [],
      missing: [],
    },
  ],
  edges: [
    {
      from: "a",
      to: "b",
      label: null,
      paths: ["/next"],
      upward: false,
      x1: 192,
      y1: 64,
      x2: 192,
      y2: 120,
      labelX: 192,
      labelY: 92,
    },
    {
      from: "b",
      to: "c",
      label: "x",
      paths: ["/cases/x"],
      upward: false,
      x1: 192,
      y1: 168,
      x2: 96,
      y2: 224,
      labelX: 144,
      labelY: 196,
    },
    {
      from: "b",
      to: "d",
      label: "y, default",
      paths: ["/cases/y", "/default"],
      upward: false,
      x1: 192,
      y1: 168,
      x2: 288,
      y2: 224,
      labelX: 240,
      labelY: 196,
    },
    {
      from: "c",
      to: "e",
      label: null,
      paths: ["/next"],
      upward: false,
      x1: 96,
      y1: 272,
      x2: 192,
      y2: 328,
      labelX: 144,
      labelY: 300,
    },
  ],
  width: 384,
  height: 392,
  layers: 4,
  start: "a",
};

const SLASH_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "switch",
      known: true,
      reachable: true,
      start: true,
      layer: 0,
      index: 0,
      x: 16,
      y: 16,
      successors: ["b"],
      missing: [],
    },
    {
      id: "b",
      kind: "end",
      known: true,
      reachable: true,
      start: false,
      layer: 1,
      index: 0,
      x: 16,
      y: 120,
      successors: [],
      missing: [],
    },
  ],
  edges: [
    {
      from: "a",
      to: "b",
      label: "a/b, c~d, default",
      paths: ["/cases/a~1b", "/cases/c~0d", "/default"],
      upward: false,
      x1: 96,
      y1: 64,
      x2: 96,
      y2: 120,
      labelX: 96,
      labelY: 92,
    },
  ],
  width: 192,
  height: 184,
  layers: 2,
  start: "a",
};

const ONE_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "end",
      known: true,
      reachable: true,
      start: true,
      layer: 0,
      index: 0,
      x: 16,
      y: 16,
      successors: [],
      missing: [],
    },
  ],
  edges: [],
  width: 192,
  height: 80,
  layers: 1,
  start: "a",
};

test("C-c1de3761 layers order coordinates and labels of a small flow", () => {
  assert.deepEqual(resultOf(flowS(), "S"), { status: "ok", layout: S_LAYOUT });
  assert.deepEqual(layoutOf(withReversedNodeKeys(flowS()), "S reversed"), S_LAYOUT);
  assert.deepEqual(layoutOf(deepFreeze(flowS()), "S frozen"), S_LAYOUT);
  assert.deepEqual(layoutOf({ start: "a", nodes: { a: { kind: "switch", on: "x", cases: { "a/b": "b", "c~d": "b" }, default: "b" }, b: { kind: "end" } } }, "SLASH"), SLASH_LAYOUT);
  assert.deepEqual(layoutOf({ start: "a", nodes: { a: { kind: "end" } } }, "ONE"), ONE_LAYOUT);
  assert.deepEqual(GRAPH_GEOMETRY, { nodeWidth: 160, nodeHeight: 48, gapX: 32, gapY: 56, margin: 16 });
  assert.equal(MAX_GRAPH_NODES, 200);
});

const CYCLE_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "block",
      known: true,
      reachable: true,
      start: true,
      layer: 0,
      index: 0,
      x: 16,
      y: 16,
      successors: ["b"],
      missing: [],
    },
    {
      id: "b",
      kind: "block",
      known: true,
      reachable: true,
      start: false,
      layer: 1,
      index: 0,
      x: 16,
      y: 120,
      successors: ["a"],
      missing: [],
    },
  ],
  edges: [
    {
      from: "a",
      to: "b",
      label: null,
      paths: ["/next"],
      upward: false,
      x1: 96,
      y1: 64,
      x2: 96,
      y2: 120,
      labelX: 96,
      labelY: 92,
    },
    {
      from: "b",
      to: "a",
      label: null,
      paths: ["/next"],
      upward: true,
      x1: 96,
      y1: 168,
      x2: 96,
      y2: 16,
      labelX: 96,
      labelY: 92,
    },
  ],
  width: 192,
  height: 184,
  layers: 2,
  start: "a",
};

const LOOP_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "block",
      known: true,
      reachable: true,
      start: true,
      layer: 0,
      index: 0,
      x: 16,
      y: 16,
      successors: ["a"],
      missing: [],
    },
  ],
  edges: [
    {
      from: "a",
      to: "a",
      label: null,
      paths: ["/next"],
      upward: true,
      x1: 96,
      y1: 64,
      x2: 96,
      y2: 16,
      labelX: 96,
      labelY: 40,
    },
  ],
  width: 192,
  height: 80,
  layers: 1,
  start: "a",
};

const ODD_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "block",
      known: true,
      reachable: true,
      start: true,
      layer: 0,
      index: 0,
      x: 208,
      y: 16,
      successors: [],
      missing: ["ghost"],
    },
    {
      id: "constructor",
      kind: "block",
      known: true,
      reachable: false,
      start: false,
      layer: 1,
      index: 0,
      x: 16,
      y: 120,
      successors: [],
      missing: ["toString"],
    },
    {
      id: "q",
      kind: "mystery",
      known: false,
      reachable: false,
      start: false,
      layer: 1,
      index: 1,
      x: 208,
      y: 120,
      successors: [],
      missing: [],
    },
    {
      id: "z",
      kind: null,
      known: false,
      reachable: false,
      start: false,
      layer: 1,
      index: 2,
      x: 400,
      y: 120,
      successors: [],
      missing: [],
    },
  ],
  edges: [],
  width: 576,
  height: 184,
  layers: 2,
  start: "a",
};

const NOSTART_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "end",
      known: true,
      reachable: false,
      start: false,
      layer: 0,
      index: 0,
      x: 16,
      y: 16,
      successors: [],
      missing: [],
    },
    {
      id: "b",
      kind: "end",
      known: true,
      reachable: false,
      start: false,
      layer: 0,
      index: 1,
      x: 208,
      y: 16,
      successors: [],
      missing: [],
    },
  ],
  edges: [],
  width: 384,
  height: 80,
  layers: 1,
  start: null,
};

const UNREACH_LAYOUT: GraphLayout = {
  nodes: [
    {
      id: "a",
      kind: "end",
      known: true,
      reachable: true,
      start: true,
      layer: 0,
      index: 0,
      x: 112,
      y: 16,
      successors: [],
      missing: [],
    },
    {
      id: "b",
      kind: "block",
      known: true,
      reachable: false,
      start: false,
      layer: 1,
      index: 0,
      x: 16,
      y: 120,
      successors: ["c"],
      missing: [],
    },
    {
      id: "c",
      kind: "block",
      known: true,
      reachable: false,
      start: false,
      layer: 1,
      index: 1,
      x: 208,
      y: 120,
      successors: ["a"],
      missing: [],
    },
  ],
  edges: [
    {
      from: "b",
      to: "c",
      label: null,
      paths: ["/next"],
      upward: true,
      x1: 96,
      y1: 168,
      x2: 288,
      y2: 120,
      labelX: 192,
      labelY: 144,
    },
    {
      from: "c",
      to: "a",
      label: null,
      paths: ["/next"],
      upward: true,
      x1: 288,
      y1: 168,
      x2: 192,
      y2: 16,
      labelX: 240,
      labelY: 92,
    },
  ],
  width: 384,
  height: 184,
  layers: 2,
  start: "a",
};

test("C-7a375c7a cycles unreachable nodes unknown kinds and missing targets", () => {
  assert.deepEqual(layoutOf({ start: "a", nodes: { a: { kind: "block", next: "b" }, b: { kind: "block", next: "a" } } }, "CYCLE"), CYCLE_LAYOUT);
  assert.deepEqual(layoutOf({ start: "a", nodes: { a: { kind: "block", next: "a" } } }, "LOOP"), LOOP_LAYOUT);
  assert.deepEqual(layoutOf({ start: "a", nodes: { a: { kind: "block", next: "ghost" }, q: { kind: "mystery", next: "a" }, z: 7, constructor: { kind: "block", next: "toString" } } }, "ODD"), ODD_LAYOUT);
  assert.deepEqual(layoutOf({ nodes: { b: { kind: "end" }, a: { kind: "end" } } }, "NOSTART"), NOSTART_LAYOUT);
  assert.deepEqual(layoutOf({ start: "a", nodes: { a: { kind: "end" }, b: { kind: "block", next: "c" }, c: { kind: "block", next: "a" } } }, "UNREACH"), UNREACH_LAYOUT);
});

const EMPTY_LAYOUT: GraphLayout = {
  nodes: [],
  edges: [],
  width: 0,
  height: 0,
  layers: 0,
  start: null,
};

function chain200(): { start: string; nodes: Record<string, unknown> } {
  const nodes: Record<string, unknown> = {};
  for (let index = 0; index < 200; index += 1) {
    const id = `n${String(index).padStart(3, "0")}`;
    const next = `n${String(index + 1).padStart(3, "0")}`;
    nodes[id] = index === 199 ? { kind: "end" } : { kind: "block", next };
  }
  return { start: "n000", nodes };
}

test("C-024a069e invalid documents the empty flow and the size bound", () => {
  for (const [doc, label] of [
    [null, "null"],
    [[], "an array"],
    ["x", "a string"],
    [42, "a number"],
  ] as const) {
    assert.deepEqual(resultOf(doc, label), { status: "invalid", reason: "not_object" });
  }
  for (const [doc, label] of [
    [{}, "a mapping without nodes"],
    [{ nodes: [] }, "nodes as an array"],
    [{ nodes: null }, "nodes as null"],
  ] as const) {
    assert.deepEqual(resultOf(doc, label), { status: "invalid", reason: "no_nodes" });
  }
  assert.deepEqual(resultOf({ start: "a", nodes: {} }, "EMPTY"), { status: "ok", layout: EMPTY_LAYOUT });
  const chain = layoutOf(chain200(), "Chain200");
  assert.equal(chain.nodes.length, 200);
  assert.equal(chain.edges.length, 199);
  assert.equal(chain.width, 192);
  assert.equal(chain.height, 20776);
  assert.equal(chain.layers, 200);
  assert.equal(chain.start, "n000");
  assert.deepEqual(chain.nodes[199], {
    id: "n199",
    kind: "end",
    known: true,
    reachable: true,
    start: false,
    layer: 199,
    index: 0,
    x: 16,
    y: 20712,
    successors: [],
    missing: [],
  });
  const tooLarge = chain200();
  tooLarge.nodes.n200 = { kind: "end" };
  assert.deepEqual(resultOf(tooLarge, "201 nodes"), { status: "too_large", count: 201, limit: 200 });
});
