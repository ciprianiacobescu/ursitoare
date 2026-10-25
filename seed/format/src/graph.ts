import { escPtr } from "./refs.ts";
import { isObj } from "./jsonschema.ts";

export interface Edge {
  from: string;
  to: string;
  /** JSON Pointer of the field holding the successor id */
  path: string;
  /** does the source node's output exist on this edge? false for timeout edges */
  producesOutput: boolean;
}

/** Single source of truth for which fields of which kinds are successors. */
export function successorFields(node: any): Array<{ path: string; id: unknown; producesOutput: boolean }> {
  const out: Array<{ path: string; id: unknown; producesOutput: boolean }> = [];
  if (!isObj(node)) return out;
  const add = (path: string, id: unknown, producesOutput = true) => {
    if (id !== undefined) out.push({ path, id, producesOutput });
  };
  switch (node.kind) {
    case "block":
    case "code":
    case "llm.extract":
    case "llm.generate":
    case "agent":
    case "foreach":
    case "subflow":
    case "wait":
      add("/next", node.next);
      break;
    case "human.form":
      add("/next", node.next);
      add("/on_timeout", node.on_timeout, false);
      break;
    case "delegate":
      add("/next", node.next);
      add("/on_timeout", node.on_timeout, false);
      break;
    case "llm.decide":
      if (isObj(node.cases)) for (const [k, v] of Object.entries(node.cases)) add(`/cases/${escPtr(k)}`, v);
      break;
    case "switch":
      if (isObj(node.cases)) for (const [k, v] of Object.entries(node.cases)) add(`/cases/${escPtr(k)}`, v);
      add("/default", node.default);
      break;
    case "human.approval":
      if (isObj(node.cases))
        for (const [k, v] of Object.entries(node.cases)) add(`/cases/${escPtr(k)}`, v, k !== "timeout");
      break;
    default:
      break;
  }
  return out;
}

/** Kinds whose `next` (and for some, `on_timeout`) are mandatory successors. */
export function requiredSuccessorFields(kind: string): string[] {
  switch (kind) {
    case "block":
    case "code":
    case "llm.extract":
    case "llm.generate":
    case "agent":
    case "foreach":
    case "subflow":
    case "wait":
      return ["next"];
    case "human.form":
    case "delegate":
      return ["next", "on_timeout"];
    default:
      return [];
  }
}

/** Edges whose target exists; nodes iterated in sorted id order so results are deterministic. */
export function buildEdges(nodes: Record<string, any>): Edge[] {
  const edges: Edge[] = [];
  for (const id of Object.keys(nodes).sort()) {
    for (const f of successorFields(nodes[id])) {
      if (typeof f.id === "string" && Object.prototype.hasOwnProperty.call(nodes, f.id))
        edges.push({ from: id, to: f.id, path: `/nodes/${escPtr(id)}${f.path}`, producesOutput: f.producesOutput });
    }
  }
  return edges;
}

export function reachableFrom(start: string, edges: Edge[]): Set<string> {
  const adj = new Map<string, string[]>();
  for (const e of edges) (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length) {
    const n = stack.pop()!;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const t of adj.get(n) ?? []) stack.push(t);
  }
  return seen;
}

/** All distinct cycles (as node-id lists, rotated to start at the smallest id). Deterministic. */
export function findCycles(ids: string[], edges: Edge[]): string[][] {
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const e of edges) adj.get(e.from)!.push(e.to);
  for (const v of adj.values()) v.sort();
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const found = new Map<string, string[]>();
  const visit = (n: string) => {
    color.set(n, 1);
    stack.push(n);
    for (const t of adj.get(n) ?? []) {
      const c = color.get(t) ?? 0;
      if (c === 0) visit(t);
      else if (c === 1) {
        const cyc = stack.slice(stack.indexOf(t));
        const min = cyc.reduce((a, b) => (b < a ? b : a));
        const i = cyc.indexOf(min);
        const rot = [...cyc.slice(i), ...cyc.slice(0, i)];
        found.set(rot.join(">"), rot);
      }
    }
    stack.pop();
    color.set(n, 2);
  };
  for (const id of [...ids].sort()) if ((color.get(id) ?? 0) === 0) visit(id);
  return [...found.keys()].sort().map((k) => found.get(k)!);
}

/** Topological order of an acyclic graph (Kahn, ties broken by id). */
export function topoOrder(ids: string[], edges: Edge[]): string[] {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const id of ids) {
    indeg.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    adj.get(e.from)!.push(e.to);
  }
  const ready = ids.filter((i) => indeg.get(i) === 0).sort();
  const out: string[] = [];
  while (ready.length) {
    ready.sort();
    const n = ready.shift()!;
    out.push(n);
    for (const t of adj.get(n)!) {
      indeg.set(t, indeg.get(t)! - 1);
      if (indeg.get(t) === 0) ready.push(t);
    }
  }
  return out;
}

/**
 * avail[n] = ids of nodes whose output is guaranteed to exist whenever control reaches n,
 * i.e. the producer lies on EVERY path from start to n and completed normally. A node is never in its own
 * set (strict dominance). Timeout edges do not carry the source node's output.
 */
export function availability(start: string, order: string[], edges: Edge[]): Map<string, Set<string>> {
  const incoming = new Map<string, Edge[]>();
  for (const e of edges) (incoming.get(e.to) ?? incoming.set(e.to, []).get(e.to)!).push(e);
  const avail = new Map<string, Set<string>>();
  for (const n of order) {
    if (n === start) {
      avail.set(n, new Set());
      continue;
    }
    const sets: Set<string>[] = [];
    for (const e of incoming.get(n) ?? []) {
      const src = avail.get(e.from);
      if (!src) continue; // unreachable predecessor: contributes no paths
      const s = new Set(src);
      if (e.producesOutput) s.add(e.from);
      sets.push(s);
    }
    const acc: Set<string> = sets.length ? sets.reduce((x, y) => new Set([...x].filter((v) => y.has(v)))) : new Set();
    avail.set(n, acc);
  }
  return avail;
}
