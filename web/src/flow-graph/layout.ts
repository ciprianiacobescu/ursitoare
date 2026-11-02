// Pure, deterministic layout for the saved flow graph (design.md decisions 2 and 3).

export const GRAPH_GEOMETRY: {
  nodeWidth: number;
  nodeHeight: number;
  gapX: number;
  gapY: number;
  margin: number;
} = { nodeWidth: 160, nodeHeight: 48, gapX: 32, gapY: 56, margin: 16 };

export const MAX_GRAPH_NODES: number = 200;

export const GRAPH_NODE_KINDS: readonly string[] = [
  "block",
  "code",
  "llm.extract",
  "llm.generate",
  "llm.decide",
  "agent",
  "switch",
  "human.approval",
  "human.form",
  "foreach",
  "subflow",
  "delegate",
  "wait",
  "end",
];

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapePointer(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

function compareIds(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Fields of each node kind that hold successor ids (mirrors U22's table). */
export function successorTargets(node: unknown): { path: string; id: unknown }[] {
  const out: { path: string; id: unknown }[] = [];
  if (!isRecord(node)) return out;
  const add = (path: string, id: unknown): void => {
    if (id !== undefined) out.push({ path, id });
  };
  switch (node["kind"]) {
    case "block":
    case "code":
    case "llm.extract":
    case "llm.generate":
    case "agent":
    case "foreach":
    case "subflow":
    case "wait":
      add("/next", node["next"]);
      break;
    case "human.form":
    case "delegate":
      add("/next", node["next"]);
      add("/on_timeout", node["on_timeout"]);
      break;
    case "llm.decide":
      if (isRecord(node["cases"])) {
        for (const [key, value] of Object.entries(node["cases"])) {
          add(`/cases/${escapePointer(key)}`, value);
        }
      }
      break;
    case "switch":
      if (isRecord(node["cases"])) {
        for (const [key, value] of Object.entries(node["cases"])) {
          add(`/cases/${escapePointer(key)}`, value);
        }
      }
      add("/default", node["default"]);
      break;
    case "human.approval":
      if (isRecord(node["cases"])) {
        for (const [key, value] of Object.entries(node["cases"])) {
          add(`/cases/${escapePointer(key)}`, value);
        }
      }
      break;
    default:
      break;
  }
  return out;
}

function pathLabel(path: string): string {
  if (path === "/next") return "next";
  if (path === "/on_timeout") return "timeout";
  if (path === "/default") return "default";
  if (path.startsWith("/cases/")) {
    return path.slice("/cases/".length).replace(/~1/g, "/").replace(/~0/g, "~");
  }
  return path.slice(1);
}

function mergedLabel(paths: readonly string[]): string | null {
  const labels: string[] = [];
  for (const path of paths) {
    const label = pathLabel(path);
    if (!labels.includes(label)) labels.push(label);
  }
  if (labels.length === 1 && labels[0] === "next") return null;
  return labels.join(", ");
}

function edgeKey(from: string, to: string): string {
  return `${from}\u0000${to}`;
}

export function layoutFlow(doc: unknown): LayoutResult {
  if (!isRecord(doc)) return { status: "invalid", reason: "not_object" };
  if (!Object.hasOwn(doc, "nodes")) return { status: "invalid", reason: "no_nodes" };
  const nodesValue = doc["nodes"];
  if (!isRecord(nodesValue)) return { status: "invalid", reason: "no_nodes" };

  const entries = Object.entries(nodesValue);
  const ids = entries.map(([id]) => id).sort(compareIds);
  if (ids.length > MAX_GRAPH_NODES) {
    return { status: "too_large", count: ids.length, limit: MAX_GRAPH_NODES };
  }
  if (ids.length === 0) {
    return {
      status: "ok",
      layout: { nodes: [], edges: [], width: 0, height: 0, layers: 0, start: null },
    };
  }

  const nodeMap = new Map<string, unknown>(entries);
  const idSet = new Set<string>(ids);

  const outTargets = new Map<string, string[]>();
  const missingById = new Map<string, string[]>();
  const pathsByTarget = new Map<string, Map<string, string[]>>();

  for (const id of ids) {
    const targets = successorTargets(nodeMap.get(id));
    const outSet = new Set<string>();
    const missingSet = new Set<string>();
    const byTarget = new Map<string, string[]>();
    for (const target of targets) {
      if (typeof target.id !== "string") continue;
      if (!idSet.has(target.id)) {
        missingSet.add(target.id);
        continue;
      }
      outSet.add(target.id);
      const paths = byTarget.get(target.id) ?? [];
      paths.push(target.path);
      byTarget.set(target.id, paths);
    }
    outTargets.set(id, [...outSet].sort(compareIds));
    missingById.set(id, [...missingSet].sort(compareIds));
    pathsByTarget.set(id, byTarget);
  }

  let start: string | null = null;
  const startValue = doc["start"];
  if (typeof startValue === "string" && idSet.has(startValue)) start = startValue;

  const reachable = new Set<string>();
  const onPath = new Set<string>();
  const closing = new Set<string>();
  const postorder: string[] = [];

  const visit = (id: string): void => {
    reachable.add(id);
    onPath.add(id);
    for (const to of outTargets.get(id) ?? []) {
      if (onPath.has(to)) {
        closing.add(edgeKey(id, to));
      } else if (!reachable.has(to)) {
        visit(to);
      }
    }
    onPath.delete(id);
    postorder.push(id);
  };

  if (start !== null) visit(start);

  const inEdges = new Map<string, string[]>();
  for (const from of ids) {
    if (!reachable.has(from)) continue;
    for (const to of outTargets.get(from) ?? []) {
      if (!reachable.has(to)) continue;
      if (closing.has(edgeKey(from, to))) continue;
      const list = inEdges.get(to) ?? [];
      list.push(from);
      inEdges.set(to, list);
    }
  }

  const layer = new Map<string, number>();
  const reversePostorder = [...postorder].reverse();
  for (const id of reversePostorder) {
    if (id === start) {
      layer.set(id, 0);
      continue;
    }
    let max = -1;
    for (const from of inEdges.get(id) ?? []) {
      const fromLayer = layer.get(from);
      if (fromLayer !== undefined && fromLayer > max) max = fromLayer;
    }
    layer.set(id, max === -1 ? 0 : max + 1);
  }

  let largestReachedLayer = -1;
  for (const id of ids) {
    if (!reachable.has(id)) continue;
    const value = layer.get(id) ?? 0;
    if (value > largestReachedLayer) largestReachedLayer = value;
  }
  const unreachableLayer = largestReachedLayer >= 0 ? largestReachedLayer + 1 : 0;
  for (const id of ids) {
    if (!reachable.has(id)) layer.set(id, unreachableLayer);
  }

  const byLayer = new Map<number, string[]>();
  let layerCount = 0;
  for (const id of ids) {
    const value = layer.get(id) ?? 0;
    const list = byLayer.get(value) ?? [];
    list.push(id);
    byLayer.set(value, list);
    if (value + 1 > layerCount) layerCount = value + 1;
  }
  let maxCount = 0;
  for (const list of byLayer.values()) {
    if (list.length > maxCount) maxCount = list.length;
  }

  const nodes: LayoutNode[] = [];
  const positions = new Map<string, LayoutNode>();
  for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
    const list = byLayer.get(layerIndex) ?? [];
    for (let index = 0; index < list.length; index += 1) {
      const id = list[index];
      if (id === undefined) continue;
      const node = nodeMap.get(id);
      const rawKind = isRecord(node) ? node["kind"] : undefined;
      const kind = typeof rawKind === "string" ? rawKind : null;
      const layoutNode: LayoutNode = {
        id,
        kind,
        known: kind !== null && GRAPH_NODE_KINDS.includes(kind),
        reachable: reachable.has(id),
        start: id === start,
        layer: layerIndex,
        index,
        x: GRAPH_GEOMETRY.margin + (maxCount - list.length) * 96 + index * 192,
        y: GRAPH_GEOMETRY.margin + layerIndex * 104,
        successors: [...(outTargets.get(id) ?? [])],
        missing: [...(missingById.get(id) ?? [])],
      };
      nodes.push(layoutNode);
      positions.set(id, layoutNode);
    }
  }

  const edges: LayoutEdge[] = [];
  for (const node of nodes) {
    const byTarget = pathsByTarget.get(node.id);
    if (byTarget === undefined) continue;
    const targets = [...byTarget.keys()].sort(compareIds);
    for (const to of targets) {
      const target = positions.get(to);
      if (target === undefined) continue;
      const paths = [...(byTarget.get(to) ?? [])].sort(compareIds);
      const x1 = node.x + GRAPH_GEOMETRY.nodeWidth / 2;
      const y1 = node.y + GRAPH_GEOMETRY.nodeHeight;
      const x2 = target.x + GRAPH_GEOMETRY.nodeWidth / 2;
      const y2 = target.y;
      edges.push({
        from: node.id,
        to,
        label: mergedLabel(paths),
        paths,
        upward: target.layer <= node.layer,
        x1,
        y1,
        x2,
        y2,
        labelX: Math.round((x1 + x2) / 2),
        labelY: Math.round((y1 + y2) / 2),
      });
    }
  }

  return {
    status: "ok",
    layout: {
      nodes,
      edges,
      width: 2 * GRAPH_GEOMETRY.margin + maxCount * 192 - 32,
      height: 2 * GRAPH_GEOMETRY.margin + layerCount * 104 - 56,
      layers: layerCount,
      start,
    },
  };
}
