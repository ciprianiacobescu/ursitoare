// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface MockNode {
  nodeId: string;
  uses: string;
}

export function mockableNodes(_canonical: unknown): MockNode[] {
  return [];
}

export interface MockRow {
  nodeId: string;
  answers: string[];
}

export function mockRowsFromText(_text: string, _nodes: readonly MockNode[]): MockRow[] | null {
  return null;
}

export function mockTextFromRows(
  _rows: readonly MockRow[],
): { ok: true; text: string } | { ok: false; nodeId: string; index: number; message: string } {
  throw new Error("not implemented");
}

export function answerLabel(_nodeId: string, _index: number): string {
  return "";
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
