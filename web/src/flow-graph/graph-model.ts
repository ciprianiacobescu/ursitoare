// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { GraphLayout, LayoutNode } from "./layout.ts";

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

export function graphView(_canonical: unknown, _saved: boolean): GraphView {
  throw new Error("not implemented");
}

export function kindText(_node: LayoutNode): string {
  throw new Error("not implemented");
}

export function nodeDetailRows(_doc: unknown, _node: LayoutNode): DetailRow[] {
  throw new Error("not implemented");
}

export function chooseNode(
  _layout: GraphLayout | null,
  _current: string | null,
  _id: string,
): string | null {
  throw new Error("not implemented");
}
