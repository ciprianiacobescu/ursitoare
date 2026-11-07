// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type {
  Catalogue,
  Flow,
  HookDef,
  HookSelector,
  HookWhen,
  NodeKind,
} from "../format/index.ts";
import { successorFields } from "../format/index.ts";
import { effectClass } from "../taint/hooks.ts";
import type { EffectClass } from "../taint/hooks.ts";

export type { EffectClass };

export type HookPhase = "pre" | "post";

export interface NodeMeta {
  id: string;
  kind: string;
  effect: EffectClass | null;
  tags: string[];
}

export interface HookPlacement {
  phase: HookPhase;
  hook: HookDef;
  ruleId: string | null;
  label: string;
}

export const HOOKLESS_KINDS: readonly NodeKind[] = ["agent", "foreach", "human.form", "subflow"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeEffect(node: unknown, catalogue: Catalogue): EffectClass | null {
  try {
    return effectClass(node, catalogue) ?? null;
  } catch {
    return null;
  }
}

export function nodeMeta(flow: Flow, nodeId: string, catalogue: Catalogue): NodeMeta | null {
  const nodes: unknown = isObject(flow) ? flow.nodes : undefined;
  if (!isObject(nodes) || !Object.hasOwn(nodes, nodeId)) return null;
  const node = nodes[nodeId];
  if (!isObject(node)) return null;
  const tags = Array.isArray(node.tags) && node.tags.every((t) => typeof t === "string")
    ? (node.tags as string[]).slice()
    : [];
  return { id: nodeId, kind: String(node.kind), effect: safeEffect(node, catalogue), tags };
}

function listOf(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function selectorMatches(selector: HookSelector | undefined, meta: NodeMeta | null): boolean {
  if (meta === null) return false;
  if (selector === undefined) return true;
  if (!isObject(selector)) return false;
  const sel = selector as Record<string, unknown>;
  for (const field of ["kind", "effect", "nodes", "tags"]) {
    if (sel[field] === undefined) continue;
    if (listOf(sel[field]) === null) return false;
  }
  if (sel.kind !== undefined && !(sel.kind as unknown[]).includes(meta.kind)) return false;
  if (sel.effect !== undefined) {
    if (meta.effect === null || !(sel.effect as unknown[]).includes(meta.effect)) return false;
  }
  if (sel.nodes !== undefined && !(sel.nodes as unknown[]).includes(meta.id)) return false;
  if (sel.tags !== undefined && !(sel.tags as unknown[]).some((t) => meta.tags.includes(t as string))) {
    return false;
  }
  return true;
}

export function whenMatches(
  when: HookWhen | undefined,
  from: NodeMeta | null,
  next: NodeMeta | null,
  outcome: string | null,
): boolean {
  if (when === undefined) return true;
  if (!isObject(when)) return false;
  const w = when as Record<string, unknown>;
  if (w.from !== undefined && !selectorMatches(w.from as HookSelector, from)) return false;
  if (w.next !== undefined && !selectorMatches(w.next as HookSelector, next)) return false;
  if (w.outcome !== undefined) {
    const list = listOf(w.outcome);
    if (outcome === null || list === null || !list.includes(outcome)) return false;
  }
  return true;
}

function hookLabel(hook: Record<string, unknown>, ruleId: string | null): string {
  if (ruleId !== null) return `rule.${ruleId}`;
  return typeof hook.id === "string" ? hook.id : "";
}

export function hookPlacements(
  flow: Flow,
  nodeId: string,
  catalogue: Catalogue,
): { pre: HookPlacement[]; post: HookPlacement[] } {
  const out: { pre: HookPlacement[]; post: HookPlacement[] } = { pre: [], post: [] };
  const meta = nodeMeta(flow, nodeId, catalogue);
  if (meta === null) return out;
  if ((HOOKLESS_KINDS as readonly string[]).includes(meta.kind)) return out;
  const doc = flow as unknown as Record<string, unknown>;
  const node = (doc.nodes as Record<string, unknown>)[nodeId] as Record<string, unknown>;
  const rules: unknown[] = Array.isArray(doc.hooks) ? doc.hooks : [];
  const rulePlacements = (phase: HookPhase): HookPlacement[] => {
    const list: HookPlacement[] = [];
    for (const rule of rules) {
      if (!isObject(rule) || typeof rule.id !== "string") continue;
      const hook = rule[phase];
      if (!isObject(hook)) continue;
      if (rule.match !== undefined && !selectorMatches(rule.match as HookSelector, meta)) continue;
      list.push({ phase, hook: hook as unknown as HookDef, ruleId: rule.id, label: hookLabel(hook, rule.id) });
    }
    return list;
  };
  const own = (phase: HookPhase): HookPlacement[] => {
    const list = node[phase];
    if (!Array.isArray(list)) return [];
    const placements: HookPlacement[] = [];
    for (const hook of list) {
      if (!isObject(hook)) continue;
      placements.push({ phase, hook: hook as unknown as HookDef, ruleId: null, label: hookLabel(hook, null) });
    }
    return placements;
  };
  out.pre = [...rulePlacements("pre"), ...own("pre")];
  if (meta.kind !== "end") out.post = [...own("post"), ...rulePlacements("post").reverse()];
  return out;
}

export function hookRoutes(flow: Flow, nodeId: string, catalogue: Catalogue): string[] {
  const seen = new Set<string>();
  for (const placement of hookPlacements(flow, nodeId, catalogue).post) {
    const routes = (placement.hook as unknown as Record<string, unknown>).routes;
    if (!Array.isArray(routes)) continue;
    for (const r of routes) if (typeof r === "string") seen.add(r);
  }
  return [...seen];
}

export function augmentedSuccessors(
  flow: Flow,
  catalogue: Catalogue,
): ReadonlyMap<string, readonly string[]> {
  const result = new Map<string, readonly string[]>();
  const nodes: unknown = isObject(flow) ? flow.nodes : undefined;
  if (!isObject(nodes)) return result;
  for (const id of Object.keys(nodes)) {
    const targets = new Set<string>();
    for (const field of successorFields(nodes[id])) {
      if (typeof field.id === "string" && Object.hasOwn(nodes, field.id)) targets.add(field.id);
    }
    for (const r of hookRoutes(flow, id, catalogue)) {
      if (Object.hasOwn(nodes, r)) targets.add(r);
    }
    result.set(id, [...targets]);
  }
  return result;
}

export function declaresHooks(doc: unknown): boolean {
  if (!isObject(doc)) return false;
  if (doc.hooks !== undefined) return true;
  if (!isObject(doc.nodes)) return false;
  return Object.values(doc.nodes).some(
    (node) => isObject(node) && (node.pre !== undefined || node.post !== undefined),
  );
}
