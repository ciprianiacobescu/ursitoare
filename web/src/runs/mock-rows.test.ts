/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { answerLabel, mockRowsFromText, mockTextFromRows, mockableNodes } from "./mock-rows.ts";
import type { MockNode, MockRow } from "./mock-rows.ts";

assert.equal(typeof mockableNodes, "function");
assert.equal(typeof answerLabel, "function");
assert.equal(typeof mockRowsFromText, "function");
assert.equal(typeof mockTextFromRows, "function");

const D = {
  flow: "demo-pay",
  start: "lookup",
  version: "1.0.0",
  ursitoare: "0.1",
  inputs: {
    type: "object",
    required: ["vendor_name", "amount"],
    properties: { amount: { type: "number" }, vendor_name: { type: "string" } },
  },
  nodes: {
    pay: { kind: "block", next: "done", uses: "erp.create_payment@1" },
    done: { kind: "end", status: "completed" },
    route: {
      kind: "switch",
      on: "${{ nodes.lookup.output.status }}",
      cases: { active: "pay" },
      default: "blocked",
    },
    lookup: { kind: "block", next: "route", uses: "erp.lookup_vendor@1" },
    blocked: { kind: "end", status: "failed" },
  },
};

const N: MockNode[] = [
  { nodeId: "lookup", uses: "erp.lookup_vendor@1" },
  { nodeId: "pay", uses: "erp.create_payment@1" },
];

const ids = (nodes: readonly MockNode[]): string[] => nodes.map((n) => n.nodeId);

test("C-c8c4677c the nodes of D are lookup then pay", () => {
  assert.deepEqual(mockableNodes(D), N);
});

test("C-c8c4677c an unreachable block comes last", () => {
  const doc = {
    start: "b",
    nodes: {
      a: { kind: "block", uses: "x@1" },
      b: { kind: "block", uses: "x@1", next: "c" },
      c: { kind: "block", uses: "x@1", next: "end1" },
      end1: { kind: "end", status: "completed" },
    },
  };
  assert.deepEqual(ids(mockableNodes(doc)), ["b", "c", "a"]);
});

test("C-c8c4677c blocks on one layer are ordered by id", () => {
  const doc = {
    start: "s",
    nodes: {
      s: { kind: "switch", on: "${{ x }}", cases: { p: "zed", q: "alpha" }, default: "alpha" },
      zed: { kind: "block", uses: "x@1" },
      alpha: { kind: "block", uses: "x@1" },
    },
  };
  assert.deepEqual(ids(mockableNodes(doc)), ["alpha", "zed"]);
});

test("C-c8c4677c without a start the ids are sorted", () => {
  const doc = {
    nodes: {
      b: { kind: "block", uses: "x@1" },
      a: { kind: "block", uses: "x@1" },
      e: { kind: "end", status: "completed" },
    },
  };
  assert.deepEqual(ids(mockableNodes(doc)), ["a", "b"]);
});

test("C-c8c4677c 201 nodes come back sorted", () => {
  const nodes: Record<string, unknown> = {};
  for (let i = 200; i >= 0; i -= 1) nodes["n" + String(i).padStart(3, "0")] = { kind: "block", uses: "x@1" };
  const got = ids(mockableNodes({ nodes }));
  assert.equal(got.length, 201);
  assert.equal(got[0], "n000");
  assert.equal(got[200], "n200");
});

test("C-c8c4677c empty and odd documents give no nodes and odd nodes keep their uses", () => {
  assert.deepEqual(mockableNodes({ nodes: [] }), []);
  assert.deepEqual(mockableNodes(null), []);
  assert.deepEqual(
    mockableNodes({
      nodes: { a: { kind: "block", uses: "x@1" }, b: { kind: "block" }, c: { kind: "end" }, d: 5 },
    }),
    [
      { nodeId: "a", uses: "x@1" },
      { nodeId: "b", uses: "" },
    ],
  );
});

test("C-c8c4677c the labels count from one", () => {
  assert.equal(answerLabel("pay", 0), "Output 1 for pay");
  assert.equal(answerLabel("pay", 2), "Output 3 for pay");
});

const A2_TEXT =
  '{"pay":[{"output":{"payment_id":"P-1"}},{"output":"x"}],"lookup":[{"output":{"vendor_id":"V-1","status":"active"}}]}';
const A2_ROWS: MockRow[] = [
  { nodeId: "lookup", answers: [JSON.stringify({ vendor_id: "V-1", status: "active" }, null, 2)] },
  { nodeId: "pay", answers: [JSON.stringify({ payment_id: "P-1" }, null, 2), '"x"'] },
];

test("C-c8c4677c an empty map gives an empty row per node", () => {
  assert.deepEqual(mockRowsFromText("{}", N), [
    { nodeId: "lookup", answers: [] },
    { nodeId: "pay", answers: [] },
  ]);
});

test("C-c8c4677c answers become rows in node order and write back", () => {
  assert.deepEqual(mockRowsFromText(A2_TEXT, N), A2_ROWS);
  assert.doesNotThrow(() => {
    const back = mockTextFromRows(A2_ROWS);
    const map = {
      lookup: [{ output: { vendor_id: "V-1", status: "active" } }],
      pay: [{ output: { payment_id: "P-1" } }, { output: "x" }],
    };
    assert.deepEqual(back, { ok: true, text: JSON.stringify(map, null, 2) });
  });
});

test("C-c8c4677c texts that are not answer maps give null", () => {
  assert.deepEqual(mockRowsFromText("{}", N)?.length, 2);
  for (const text of [
    '{"ghost":[]}',
    '{"pay":{}}',
    '{"pay":[{"error":{"code":"E","message":"m"}}]}',
    '{"pay":[{"output":1,"x":2}]}',
    "[]",
    "{",
  ]) {
    assert.equal(mockRowsFromText(text, N), null, text);
  }
});

test("C-c8c4677c blank answers and rows without answers are left out", () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(
      mockTextFromRows([
        { nodeId: "pay", answers: [] },
        { nodeId: "lookup", answers: ["  ", '{"a":1}'] },
      ]),
      { ok: true, text: JSON.stringify({ lookup: [{ output: { a: 1 } }] }, null, 2) },
    );
  });
});

test("C-c8c4677c the first answer that does not parse is named", () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(mockTextFromRows([{ nodeId: "pay", answers: ["{}", "{"] }]), {
      ok: false,
      nodeId: "pay",
      index: 1,
      message: "This is not valid JSON.",
    });
  });
});

test("C-c8c4677c no answers give an empty map", () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(mockTextFromRows([{ nodeId: "pay", answers: [] }]), { ok: true, text: "{}" });
    assert.deepEqual(mockTextFromRows([]), { ok: true, text: "{}" });
  });
});
