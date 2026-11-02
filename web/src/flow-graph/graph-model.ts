// Text equivalent, node details and selection for the saved flow graph (design.md decisions 4 to 6).

import { clip } from "../admin/shared.ts";
import type { GraphLayout, LayoutNode } from "./layout.ts";
import { layoutFlow } from "./layout.ts";

export type GraphState = "unsaved" | "invalid" | "too_large" | "empty" | "ready";

export interface NodeListItem {
  id: string;
  label: string;
  summary: string;
}

export interface GraphView {
  state: GraphState;
  message: string;
  layout: GraphLayout | null;
  items: NodeListItem[];
}

export interface DetailRow {
  name: string;
  value: string;
}

const UNSAVED =
  "The graph shows a saved version. Save the flow text as a version in the editor to draw it.";
const NOT_MAPPING = "This version's document is not a flow: it is not a mapping.";
const NO_NODES = 'This version\'s document has no "nodes" mapping.';
const EMPTY = "This flow has no nodes yet.";
const MAX_NODES = 200;

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function successorText(node: LayoutNode): string {
  const targets = [
    ...node.successors,
    ...node.missing.map((id) => `${id} (missing)`),
  ];
  return targets.length === 0 ? "none" : targets.join(", ");
}

function nodeSummary(node: LayoutNode): string {
  const parts = [kindText(node)];
  if (node.start) parts.push("Start");
  parts.push(`Next: ${successorText(node)}`);
  if (!node.reachable) parts.push("Not reachable");
  return parts.join(" · ");
}

function readyMessage(layout: GraphLayout): string {
  const unreachable = layout.nodes.filter((node) => !node.reachable).length;
  const base = `Flow graph: ${plural(layout.nodes.length, "node")}, ${plural(
    layout.edges.length,
    "edge",
  )}, ${plural(layout.layers, "layer")}.`;
  if (unreachable === 0) return base;
  return `${base} ${plural(unreachable, "node")} cannot be reached from the start node.`;
}

export function graphView(canonical: unknown, saved: boolean): GraphView {
  if (!saved) {
    return { state: "unsaved", message: UNSAVED, layout: null, items: [] };
  }
  const result = layoutFlow(canonical);
  if (result.status === "invalid") {
    return {
      state: "invalid",
      message: result.reason === "not_object" ? NOT_MAPPING : NO_NODES,
      layout: null,
      items: [],
    };
  }
  if (result.status === "too_large") {
    return {
      state: "too_large",
      message: `This flow has ${result.count} nodes. The graph draws at most ${MAX_NODES} nodes. Read the flow text in the editor.`,
      layout: null,
      items: [],
    };
  }
  const layout = result.layout;
  if (layout.nodes.length === 0) {
    return { state: "empty", message: EMPTY, layout: null, items: [] };
  }
  return {
    state: "ready",
    message: readyMessage(layout),
    layout,
    items: layout.nodes.map((node) => ({
      id: node.id,
      label: clip(node.id, 80),
      summary: nodeSummary(node),
    })),
  };
}

export function kindText(node: LayoutNode): string {
  if (node.kind === null) return "no kind";
  if (node.known) return node.kind;
  return `${clip(node.kind, 40)} (unknown kind)`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodeRecord(doc: unknown, id: string): Record<string, unknown> | undefined {
  if (!isRecord(doc)) return undefined;
  const nodes = doc["nodes"];
  if (!isRecord(nodes)) return undefined;
  const map = new Map<string, unknown>(Object.entries(nodes));
  const node = map.get(id);
  return isRecord(node) ? node : undefined;
}

function detailValue(value: unknown): string {
  if (typeof value === "string") return clip(value, 300);
  if (value === null) return "null";
  if (typeof value === "object") {
    const text = JSON.stringify(value);
    return clip(text ?? String(value), 300);
  }
  return String(value);
}

export function nodeDetailRows(doc: unknown, node: LayoutNode): DetailRow[] {
  const rows: DetailRow[] = [
    { name: "Node", value: clip(node.id, 300) },
    { name: "Kind", value: kindText(node) },
    { name: "Successors", value: successorText(node) },
  ];
  if (!node.reachable) {
    rows.push({ name: "Reachability", value: "Not reachable from the start node." });
  }
  const record = nodeRecord(doc, node.id);
  if (record !== undefined) {
    const names = Object.keys(record)
      .filter((name) => name !== "kind")
      .sort();
    for (const name of names) {
      rows.push({ name, value: detailValue(record[name]) });
    }
  }
  return rows;
}

export function chooseNode(
  layout: GraphLayout | null,
  current: string | null,
  id: string,
): string | null {
  if (layout === null) return null;
  const ids = new Set(layout.nodes.map((node) => node.id));
  return ids.has(id) ? id : current;
}
