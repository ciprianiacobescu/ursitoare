// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { layoutFlow } from "../flow-graph/layout.ts";
import { parseTestInputs } from "./test-run.ts";

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

const KEPT_HINT = "Kept in step with the answers above.";
const MISMATCH_HINT = "The JSON no longer matches the answer rows; it is used as written.";
const NOT_JSON = "This is not valid JSON.";
const FORM_ERROR = "Fix the answers that are not valid JSON before you start.";

function emptyRows(nodes: readonly MockNode[]): MockRow[] {
  return nodes.map((n) => ({ nodeId: n.nodeId, answers: [] }));
}

function isJson(answer: string): boolean {
  try {
    JSON.parse(answer);
    return true;
  } catch {
    return false;
  }
}

function textOfValidAnswers(rows: readonly MockRow[]): string {
  const valid = rows.map((row) => ({
    nodeId: row.nodeId,
    answers: row.answers.filter((a) => a.trim() !== "" && isJson(a)),
  }));
  const result = mockTextFromRows(valid);
  return result.ok ? result.text : "{}";
}

export function rowSyncStart(nodes: readonly MockNode[], text: string): RowSync {
  const rows = mockRowsFromText(text, nodes) ?? emptyRows(nodes);
  return { text, rows, attempted: false, source: "json" };
}

export function rowSyncStep(nodes: readonly MockNode[], sync: RowSync, event: RowSyncEvent): RowSync {
  switch (event.type) {
    case "attempt":
      return { ...sync, attempted: true };
    case "text": {
      const rows = mockRowsFromText(event.text, nodes) ?? sync.rows;
      return { text: event.text, rows, attempted: false, source: "json" };
    }
    case "answer":
    case "add":
    case "remove": {
      const rows = sync.rows.map((row) => {
        if (row.nodeId !== event.nodeId) return row;
        if (event.type === "answer") {
          const shown = row.answers.length === 0 ? [""] : row.answers;
          return { ...row, answers: shown.map((a, i) => (i === event.index ? event.value : a)) };
        }
        if (event.type === "add") {
          return { ...row, answers: row.answers.length === 0 ? ["", ""] : [...row.answers, ""] };
        }
        return { ...row, answers: row.answers.filter((_, i) => i !== event.index) };
      });
      return { ...sync, rows, text: textOfValidAnswers(rows), source: "rows" };
    }
  }
}

export function rowSyncView(nodes: readonly MockNode[], sync: RowSync): RowSyncView {
  if (nodes.length === 0) {
    return { answerErrors: {}, jsonError: null, hint: null, formError: null, blocked: false };
  }
  const answerErrors: Record<string, string> = {};
  if (sync.source === "rows") {
    for (const row of sync.rows) {
      for (const [index, answer] of row.answers.entries()) {
        if (answer.trim() !== "" && !isJson(answer)) {
          answerErrors[answerLabel(row.nodeId, index)] = NOT_JSON;
        }
      }
    }
  }
  const blocked = Object.keys(answerErrors).length > 0;
  const parsed = parseTestInputs("{}", sync.text);
  const jsonError = parsed.ok ? null : (parsed.errors["mocks"] ?? null);
  const mismatch = parsed.ok && mockRowsFromText(sync.text, nodes) === null;
  return {
    answerErrors,
    jsonError,
    hint: mismatch ? MISMATCH_HINT : KEPT_HINT,
    formError: blocked && sync.attempted ? FORM_ERROR : null,
    blocked,
  };
}
