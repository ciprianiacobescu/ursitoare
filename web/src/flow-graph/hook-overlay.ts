// Hooks, hook routes and flow rules that sit beside the saved flow graph (design.md decision 7).

import { clip } from "../admin/shared.ts";
import type { GraphLayout, LayoutNode } from "./layout.ts";
import { GRAPH_GEOMETRY } from "./layout.ts";

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

const MAX_HOOKS_PER_PHASE = 16;
const MAX_RULES = 16;
const MAX_ID = 64;
const MAX_MATCH = 120;
const MATCH_KEYS = ["kind", "effect", "nodes", "tags"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function emptyOverlay(): HookOverlay {
  return { badges: [], routes: [], rules: [], missing: [] };
}

function nodeRecord(doc: Record<string, unknown>, id: string): Record<string, unknown> | undefined {
  const nodes = doc["nodes"];
  if (!isRecord(nodes)) return undefined;
  const node = nodes[id];
  return isRecord(node) ? node : undefined;
}

function hookId(value: unknown): string | null {
  return isRecord(value) && typeof value["id"] === "string" && value["id"] !== ""
    ? clip(value["id"], MAX_ID)
    : null;
}

function phaseIds(node: Record<string, unknown>, phase: "pre" | "post"): string[] {
  const hooks = node[phase];
  if (!Array.isArray(hooks)) return [];
  const ids: string[] = [];
  for (const hook of hooks) {
    const id = hookId(hook);
    if (id === null) continue;
    ids.push(id);
    if (ids.length >= MAX_HOOKS_PER_PHASE) break;
  }
  return ids;
}

function matchText(selector: unknown): string {
  if (!isRecord(selector)) return "all nodes";
  const parts: string[] = [];
  for (const key of MATCH_KEYS) {
    const value = selector[key];
    if (!Array.isArray(value) || value.length === 0) continue;
    parts.push(`${key} ${value.map((item) => String(item)).join(", ")}`);
  }
  return clip(parts.length === 0 ? "all nodes" : parts.join(" and "), MAX_MATCH);
}

function ruleRouteText(id: string, hook: Record<string, unknown>): string {
  const routes = hook["routes"];
  if (!Array.isArray(routes) || routes.length === 0) return `rule.${id}`;
  const targets = routes.filter((route): route is string => typeof route === "string");
  return `rule.${id} routes ${targets.join(", ")}`;
}

function ruleRow(rule: unknown): FlowRuleRow | null {
  if (!isRecord(rule)) return null;
  const raw = rule["id"];
  if (typeof raw !== "string" || raw === "") return null;
  const id = clip(raw, MAX_ID);
  const pre = isRecord(rule["pre"]) ? `rule.${id}` : null;
  const post = isRecord(rule["post"]) ? ruleRouteText(id, rule["post"]) : null;
  return { id, match: matchText(rule["match"]), pre, post };
}

function ruleRows(doc: Record<string, unknown>): FlowRuleRow[] {
  const rules = doc["hooks"];
  if (!Array.isArray(rules)) return [];
  const rows: FlowRuleRow[] = [];
  for (const rule of rules) {
    const row = ruleRow(rule);
    if (row === null) continue;
    rows.push(row);
    if (rows.length >= MAX_RULES) break;
  }
  return rows;
}

function positions(layout: GraphLayout): Map<string, LayoutNode> {
  const map = new Map<string, LayoutNode>();
  for (const node of layout.nodes) map.set(node.id, node);
  return map;
}

export function hookOverlay(doc: unknown, layout: GraphLayout): HookOverlay {
  if (!isRecord(doc) || !isRecord(doc["nodes"])) return emptyOverlay();
  const laidOut = positions(layout);
  const badges: HookBadge[] = [];
  const routes: HookRouteEdge[] = [];
  const missing: string[] = [];
  const seenRoutes = new Set<string>();
  const seenMissing = new Set<string>();

  for (const laid of layout.nodes) {
    const node = nodeRecord(doc, laid.id);
    if (node === undefined) continue;
    const pre = phaseIds(node, "pre");
    const post = phaseIds(node, "post");
    if (pre.length > 0 || post.length > 0) badges.push({ nodeId: laid.id, pre, post });

    const hooks = node["post"];
    if (!Array.isArray(hooks)) continue;
    for (const hook of hooks) {
      const id = hookId(hook);
      if (id === null || !isRecord(hook)) continue;
      const targets = hook["routes"];
      if (!Array.isArray(targets)) continue;
      for (const target of targets) {
        if (typeof target !== "string") continue;
        if (!laidOut.has(target)) {
          if (!seenMissing.has(target)) {
            seenMissing.add(target);
            missing.push(target);
          }
          continue;
        }
        const key = `${laid.id}>${target}:${id}`;
        if (seenRoutes.has(key)) continue;
        seenRoutes.add(key);
        routes.push({ from: laid.id, to: target, hook: id });
      }
    }
  }

  return { badges, routes, rules: ruleRows(doc), missing };
}

export function hookRouteText(edge: HookRouteEdge): string {
  return `hook ${edge.hook}: ${edge.from} may route to ${edge.to}`;
}

function idsText(ids: readonly string[]): string {
  return ids.length === 0 ? "none" : ids.join(", ");
}

export function hookBadgeText(badge: HookBadge): string {
  return `${badge.nodeId}: pre ${idsText(badge.pre)}; post ${idsText(badge.post)}`;
}

export function flowRuleText(row: FlowRuleRow): string {
  return `${row.id}: match ${row.match}; pre ${row.pre ?? "none"}; post ${row.post ?? "none"}`;
}

export function hookRoutePaths(
  edges: readonly HookRouteEdge[],
  layout: GraphLayout,
): { key: string; d: string; className: "hook-route" }[] {
  const laidOut = positions(layout);
  const paths: { key: string; d: string; className: "hook-route" }[] = [];
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const from = laidOut.get(edge.from);
    const to = laidOut.get(edge.to);
    if (from === undefined || to === undefined) continue;
    const x1 = from.x + GRAPH_GEOMETRY.nodeWidth / 2 + 16;
    const y1 = from.y + GRAPH_GEOMETRY.nodeHeight;
    const x2 = to.x + GRAPH_GEOMETRY.nodeWidth / 2 + 16;
    const y2 = to.y;
    paths.push({
      key: `${edge.from}>${edge.to}:${edge.hook}`,
      d: `M ${x1} ${y1} L ${x2} ${y2}`,
      className: "hook-route",
    });
  }
  return paths;
}

export interface HookSectionView {
  hooks: string[];
  routes: string[];
  rules: string[];
  missing: string | null;
}

export function hookSectionView(doc: unknown, layout: GraphLayout | null): HookSectionView | null {
  if (layout === null) return null;
  const overlay = hookOverlay(doc, layout);
  return {
    hooks: overlay.badges.map(hookBadgeText),
    routes: overlay.routes.map(hookRouteText),
    rules: overlay.rules.map(flowRuleText),
    missing:
      overlay.missing.length === 0
        ? null
        : `Hook routes name nodes that do not exist: ${overlay.missing.join(", ")}.`,
  };
}
