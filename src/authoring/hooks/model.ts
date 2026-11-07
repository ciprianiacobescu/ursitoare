// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type {
  Catalogue,
  Flow,
  HookDef,
  HookSelector,
  HookWhen,
  NodeKind,
} from "../format/index.ts";
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

export function hookPlacements(
  _flow: Flow,
  _nodeId: string,
  _catalogue: Catalogue,
): { pre: HookPlacement[]; post: HookPlacement[] } {
  throw new Error("not implemented");
}

export function hookRoutes(_flow: Flow, _nodeId: string, _catalogue: Catalogue): string[] {
  throw new Error("not implemented");
}

export function augmentedSuccessors(
  _flow: Flow,
  _catalogue: Catalogue,
): ReadonlyMap<string, readonly string[]> {
  throw new Error("not implemented");
}

export function declaresHooks(_doc: unknown): boolean {
  throw new Error("not implemented");
}
