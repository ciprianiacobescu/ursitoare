// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { layoutFlow } from "../flow-graph/layout.ts";

export interface MockNode {
  nodeId: string;
  uses: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mockableNodes(canonical: unknown): MockNode[] {
  if (!isRecord(canonical) || !isRecord(canonical["nodes"])) return [];
  const nodes = canonical["nodes"];
  const layout = layoutFlow(canonical);
  const order =
    layout.status === "ok"
      ? layout.layout.nodes.map((n) => n.id)
      : Object.keys(nodes).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const out: MockNode[] = [];
  for (const id of order) {
    const node = nodes[id];
    if (!isRecord(node) || node["kind"] !== "block") continue;
    out.push({ nodeId: id, uses: typeof node["uses"] === "string" ? node["uses"] : "" });
  }
  return out;
}

export interface MockRow {
  nodeId: string;
  answers: string[];
}

export function mockRowsFromText(text: string, nodes: readonly MockNode[]): MockRow[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  const known = new Set(nodes.map((n) => n.nodeId));
  for (const key of Object.keys(parsed)) if (!known.has(key)) return null;
  const rows: MockRow[] = [];
  for (const node of nodes) {
    const entries = Object.hasOwn(parsed, node.nodeId) ? parsed[node.nodeId] : [];
    if (!Array.isArray(entries)) return null;
    const answers: string[] = [];
    for (const entry of entries) {
      if (!isRecord(entry)) return null;
      const keys = Object.keys(entry);
      if (keys.length !== 1 || keys[0] !== "output") return null;
      answers.push(JSON.stringify(entry["output"], null, 2));
    }
    rows.push({ nodeId: node.nodeId, answers });
  }
  return rows;
}

export function mockTextFromRows(
  rows: readonly MockRow[],
): { ok: true; text: string } | { ok: false; nodeId: string; index: number; message: string } {
  const map: Record<string, unknown[]> = {};
  for (const row of rows) {
    const entries: unknown[] = [];
    for (const [index, answer] of row.answers.entries()) {
      if (answer.trim() === "") continue;
      try {
        entries.push({ output: JSON.parse(answer) as unknown });
      } catch {
        return { ok: false, nodeId: row.nodeId, index, message: "This is not valid JSON." };
      }
    }
    if (entries.length > 0) map[row.nodeId] = entries;
  }
  return { ok: true, text: JSON.stringify(map, null, 2) };
}

export function answerLabel(nodeId: string, index: number): string {
  return `Output ${index + 1} for ${nodeId}`;
}

export interface RowSync {
  text: string;
  rows: MockRow[];
  attempted: boolean;
  source: "rows" | "json";
}

export type RowSyncEvent =
  | { type: "answer"; nodeId: string; index: number; value: string }
  | { type: "add"; nodeId: string }
  | { type: "remove"; nodeId: string; index: number }
  | { type: "text"; text: string }
  | { type: "attempt" };

export interface RowSyncView {
  answerErrors: Readonly<Record<string, string>>;
  jsonError: string | null;
  hint: string | null;
  formError: string | null;
  blocked: boolean;
}

export function rowSyncStart(_nodes: readonly MockNode[], text: string): RowSync {
  return { text, rows: [], attempted: false, source: "json" };
}

export function rowSyncStep(_nodes: readonly MockNode[], sync: RowSync, _event: RowSyncEvent): RowSync {
  return sync;
}

export function rowSyncView(_nodes: readonly MockNode[], _sync: RowSync): RowSyncView {
  return { answerErrors: {}, jsonError: null, hint: null, formError: null, blocked: false };
}
