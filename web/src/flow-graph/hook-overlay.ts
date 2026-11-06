// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { GraphLayout } from "./layout.ts";

export interface HookBadge {
  nodeId: string;
  pre: string[];
  post: string[];
}

export interface HookRouteEdge {
  from: string;
  to: string;
  hook: string;
}

export interface FlowRuleRow {
  id: string;
  match: string;
  pre: string | null;
  post: string | null;
}

export interface HookOverlay {
  badges: HookBadge[];
  routes: HookRouteEdge[];
  rules: FlowRuleRow[];
  missing: string[];
}

export function hookOverlay(_doc: unknown, _layout: GraphLayout): HookOverlay {
  throw new Error("not implemented");
}

export function hookRouteText(_edge: HookRouteEdge): string {
  throw new Error("not implemented");
}

export function hookBadgeText(_badge: HookBadge): string {
  throw new Error("not implemented");
}

export function flowRuleText(_row: FlowRuleRow): string {
  throw new Error("not implemented");
}

export function hookRoutePaths(
  _edges: readonly HookRouteEdge[],
  _layout: GraphLayout,
): { key: string; d: string; className: "hook-route" }[] {
  throw new Error("not implemented");
}

export interface HookSectionView {
  hooks: string[];
  routes: string[];
  rules: string[];
  missing: string | null;
}

export function hookSectionView(_doc: unknown, _layout: GraphLayout | null): HookSectionView | null {
  throw new Error("not implemented");
}
