// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { GraphLayout } from "./layout.ts";

export interface DrawNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  textX: number;
  titleY: number;
  subtitleY: number;
  title: string;
  subtitle: string;
  className: string;
}

export interface DrawEdge {
  key: string;
  d: string;
  className: string;
  label: string | null;
  labelX: number;
  labelY: number;
}

export function viewBox(_layout: GraphLayout): string {
  throw new Error("not implemented");
}

export function drawNodes(_layout: GraphLayout, _selected: string | null): DrawNode[] {
  throw new Error("not implemented");
}

export function drawEdges(_layout: GraphLayout): DrawEdge[] {
  throw new Error("not implemented");
}
