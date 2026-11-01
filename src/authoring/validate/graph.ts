/**
 * The flow graph: edges, reachability, cycles, topological order and dominance (design D4). Ported from
 * the seed's `graph.ts` without `any`; successor fields come from `../format/nodes.ts`.
 */

import { escapePointer, successorFields } from "../format/index.ts";

export interface Edge {
  from: string;
  to: string;
  /** JSON Pointer of the field holding the successor id. */
  path: string;
  /** Does the source node's output exist on this edge? False for timeout edges. */
  producesOutput: boolean;
}

function addTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
}

/** Edges whose target exists; nodes iterated in sorted id order so results are deterministic. */
export function buildEdges(nodes: Record<string, unknown>): Edge[] {
  const edges: Edge[] = [];
  for (const id of Object.keys(nodes).sort()) {
    for (const field of successorFields(nodes[id])) {
      if (typeof field.id === "string" && Object.hasOwn(nodes, field.id)) {
        edges.push({
          from: id,
          to: field.id,
          path: `/nodes/${escapePointer(id)}${field.path}`,
          producesOutput: field.producesOutput,
        });
      }
    }
  }
  return edges;
}

export function reachableFrom(start: string, edges: Edge[]): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) addTo(adjacency, edge.from, edge.to);
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const node = stack.pop() as string;
    if (seen.has(node)) continue;
    seen.add(node);
    for (const next of adjacency.get(node) ?? []) stack.push(next);
  }
  return seen;
}

/** All distinct cycles (node-id lists, rotated to start at the smallest id). Deterministic. */
export function findCycles(ids: string[], edges: Edge[]): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const id of ids) adjacency.set(id, []);
  for (const edge of edges) adjacency.get(edge.from)?.push(edge.to);
  for (const list of adjacency.values()) list.sort();
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const found = new Map<string, string[]>();
  const visit = (node: string): void => {
    color.set(node, 1);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const state = color.get(next) ?? 0;
      if (state === 0) {
        visit(next);
      } else if (state === 1) {
        const cycle = stack.slice(stack.indexOf(next));
        const min = cycle.reduce((a, b) => (b < a ? b : a));
        const at = cycle.indexOf(min);
        const rotated = [...cycle.slice(at), ...cycle.slice(0, at)];
        found.set(rotated.join(">"), rotated);
      }
    }
    stack.pop();
    color.set(node, 2);
  };
  for (const id of [...ids].sort()) {
    if ((color.get(id) ?? 0) === 0) visit(id);
  }
  return [...found.keys()].sort().map((key) => found.get(key) as string[]);
}

/** Topological order of an acyclic graph (Kahn, ties broken by id). */
export function topoOrder(ids: string[], edges: Edge[]): string[] {
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const id of ids) {
    indegree.set(id, 0);
    adjacency.set(id, []);
  }
  for (const edge of edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    adjacency.get(edge.from)?.push(edge.to);
  }
  const ready = ids.filter((id) => indegree.get(id) === 0).sort();
  const out: string[] = [];
  while (ready.length > 0) {
    ready.sort();
    const node = ready.shift() as string;
    out.push(node);
    for (const next of adjacency.get(node) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) ready.push(next);
    }
  }
  return out;
}

/**
 * avail[n] = ids of nodes whose output is guaranteed to exist whenever control reaches n, i.e. the
 * producer lies on EVERY path from start to n and completed normally. A node is never in its own set
 * (strict dominance). Timeout edges do not carry the source node's output.
 */
export function availability(start: string, order: string[], edges: Edge[]): Map<string, Set<string>> {
  const incoming = new Map<string, Edge[]>();
  for (const edge of edges) addTo(incoming, edge.to, edge);
  const avail = new Map<string, Set<string>>();
  for (const node of order) {
    if (node === start) {
      avail.set(node, new Set());
      continue;
    }
    const sets: Set<string>[] = [];
    for (const edge of incoming.get(node) ?? []) {
      const source = avail.get(edge.from);
      if (source === undefined) continue; // unreachable predecessor: contributes no paths
      const own = new Set(source);
      if (edge.producesOutput) own.add(edge.from);
      sets.push(own);
    }
    const first = sets[0];
    const acc = new Set<string>();
    if (first !== undefined) {
      for (const value of first) {
        if (sets.every((set) => set.has(value))) acc.add(value);
      }
    }
    avail.set(node, acc);
  }
  return avail;
}
