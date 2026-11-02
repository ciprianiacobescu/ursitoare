/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canonicalizeFlow,
  parseFlowText,
  validateFlow,
} from "../../src/authoring/index.ts";
import { loadTestCatalogue } from "../support/catalogue/loader.ts";
import { loadTestFlow } from "../support/catalogue/flows.ts";
import { layoutFlow } from "../../web/src/flow-graph/layout.ts";
import type {
  GraphLayout,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
} from "../../web/src/flow-graph/layout.ts";

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

function parsed(text: string, label: string): unknown {
  const result = parseFlowText(text, "yaml");
  assert.ok(result.ok === true, `${label} parses`);
  return result.doc;
}

function node(
  id: string,
  kind: string,
  layer: number,
  index: number,
  x: number,
  y: number,
  successors: string[],
): LayoutNode {
  return {
    id,
    kind,
    known: true,
    reachable: true,
    start: false,
    layer,
    index,
    x,
    y,
    successors,
    missing: [],
  };
}

function edge(
  from: string,
  to: string,
  label: string | null,
  paths: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): LayoutEdge {
  return {
    from,
    to,
    label,
    paths,
    upward: false,
    x1,
    y1,
    x2,
    y2,
    labelX: Math.round((x1 + x2) / 2),
    labelY: Math.round((y1 + y2) / 2),
  };
}

const GRAPH_GOOD = [
  'ursitoare: "0.1"',
  "flow: demo-graph",
  "version: 1.0.0",
  "inputs:",
  "  type: object",
  "  properties:",
  "    url:",
  "      type: string",
  "    mode:",
  "      type: string",
  "  required:",
  "    - url",
  "    - mode",
  "start: fetch",
  "nodes:",
  "  fetch:",
  "    kind: block",
  "    uses: docs.fetch@1",
  "    with:",
  "      url: ${{ inputs.url }}",
  "    next: route",
  "  route:",
  "    kind: switch",
  "    on: ${{ inputs.mode }}",
  "    cases:",
  "      fast: done",
  "    default: failed",
  "  done:",
  "    kind: end",
  "    status: completed",
  "  failed:",
  "    kind: end",
  "    status: failed",
  "",
].join("\n");

const GRAPH_BAD = GRAPH_GOOD.replace("docs.fetch@1", "nope.missing@1");

const G_LAYOUT: GraphLayout = {
  nodes: [
    { ...node("fetch", "block", 0, 0, 112, 16, ["route"]), start: true },
    node("route", "switch", 1, 0, 112, 120, ["done", "failed"]),
    node("done", "end", 2, 0, 16, 224, []),
    node("failed", "end", 2, 1, 208, 224, []),
  ],
  edges: [
    edge("fetch", "route", null, ["/next"], 192, 64, 192, 120),
    edge("route", "done", "fast", ["/cases/fast"], 192, 168, 96, 224),
    edge("route", "failed", "default", ["/default"], 192, 168, 288, 224),
  ],
  width: 384,
  height: 288,
  layers: 3,
  start: "fetch",
};

const RF1_LAYOUT: GraphLayout = {
  nodes: [
    { ...node("fetch_invoice", "block", 0, 0, 112, 16, ["extract"]), start: true },
    node("extract", "llm.extract", 1, 0, 112, 120, ["lookup_vendor"]),
    node("lookup_vendor", "block", 2, 0, 112, 224, ["normalize"]),
    node("normalize", "code", 3, 0, 112, 328, ["classify"]),
    node("classify", "llm.decide", 4, 0, 112, 432, ["approval", "notify_rejection", "pay"]),
    node("approval", "human.approval", 5, 0, 112, 536, ["notify_rejection", "pay"]),
    node("notify_rejection", "block", 6, 0, 16, 640, ["rejected"]),
    node("pay", "block", 6, 1, 208, 640, ["archive"]),
    node("archive", "delegate", 7, 0, 16, 744, ["done"]),
    node("rejected", "end", 7, 1, 208, 744, []),
    node("done", "end", 8, 0, 112, 848, []),
  ],
  edges: [
    edge("fetch_invoice", "extract", null, ["/next"], 192, 64, 192, 120),
    edge("extract", "lookup_vendor", null, ["/next"], 192, 168, 192, 224),
    edge("lookup_vendor", "normalize", null, ["/next"], 192, 272, 192, 328),
    edge("normalize", "classify", null, ["/next"], 192, 376, 192, 432),
    edge("classify", "approval", "needs_review", ["/cases/needs_review"], 192, 480, 192, 536),
    edge("classify", "notify_rejection", "reject", ["/cases/reject"], 192, 480, 96, 640),
    edge("classify", "pay", "auto_approve", ["/cases/auto_approve"], 192, 480, 288, 640),
    edge("approval", "notify_rejection", "rejected, timeout", ["/cases/rejected", "/cases/timeout"], 192, 584, 96, 640),
    edge("approval", "pay", "approved", ["/cases/approved"], 192, 584, 288, 640),
    edge("notify_rejection", "rejected", null, ["/next"], 96, 688, 288, 744),
    edge("pay", "archive", null, ["/next"], 288, 688, 96, 744),
    edge("archive", "done", "next, timeout", ["/next", "/on_timeout"], 96, 792, 192, 848),
  ],
  width: 384,
  height: 912,
  layers: 9,
  start: "fetch_invoice",
};

test("C-1129d3e7 RF-1 and the journey flow have fixed coordinates", () => {
  const flow = loadTestFlow("rf-1-invoice-intake");
  assert.deepEqual(layoutOf(flow, "RF-1"), RF1_LAYOUT);
  assert.deepEqual(layoutOf(canonicalizeFlow(flow), "RF-1 canonical"), RF1_LAYOUT);

  const goodDoc = parsed(GRAPH_GOOD, "GRAPH_GOOD");
  const badDoc = parsed(GRAPH_BAD, "GRAPH_BAD");
  assert.deepEqual(layoutOf(goodDoc, "GRAPH_GOOD"), G_LAYOUT);
  assert.deepEqual(layoutOf(badDoc, "GRAPH_BAD"), G_LAYOUT);

  const catalogue = loadTestCatalogue();
  const good = validateFlow(goodDoc, catalogue);
  assert.equal(good.ok, true);
  assert.deepEqual(good.errors, []);
  assert.deepEqual(good.warnings, []);

  const bad = validateFlow(badDoc, catalogue);
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 1);
  const issue = bad.errors[0];
  assert.ok(issue !== undefined);
  assert.equal(issue.code, "L2_UNKNOWN_BLOCK");
  assert.equal(issue.path, "/nodes/fetch/uses");
});
