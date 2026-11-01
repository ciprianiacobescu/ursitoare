// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const GRAPH_GEOMETRY: {
  nodeWidth: number;
  nodeHeight: number;
  gapX: number;
  gapY: number;
  margin: number;
} = { nodeWidth: 0, nodeHeight: 0, gapX: 0, gapY: 0, margin: 0 };

export const MAX_GRAPH_NODES: number = 0;

export const GRAPH_NODE_KINDS: readonly string[] = [];

export interface LayoutNode {
  id: string;
  kind: string | null;
  known: boolean;
  reachable: boolean;
  start: boolean;
  layer: number;
  index: number;
  x: number;
  y: number;
  successors: string[];
  missing: string[];
}

export interface LayoutEdge {
  from: string;
  to: string;
  label: string | null;
  paths: string[];
  upward: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
}

export interface GraphLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  layers: number;
  start: string | null;
}

export type LayoutResult =
  | { status: "ok"; layout: GraphLayout }
  | { status: "invalid"; reason: "not_object" | "no_nodes" }
  | { status: "too_large"; count: number; limit: number };

export function successorTargets(_node: unknown): { path: string; id: unknown }[] {
  throw new Error("not implemented");
}

export function layoutFlow(_doc: unknown): LayoutResult {
  throw new Error("not implemented");
}
