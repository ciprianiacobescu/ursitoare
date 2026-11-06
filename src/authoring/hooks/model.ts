// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type {
  Catalogue,
  Flow,
  HookDef,
  HookSelector,
  HookWhen,
  NodeKind,
} from "../format/index.ts";
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

export const HOOKLESS_KINDS: readonly NodeKind[] = [];

export function nodeMeta(_flow: Flow, _nodeId: string, _catalogue: Catalogue): NodeMeta | null {
  throw new Error("not implemented");
}

export function selectorMatches(_selector: HookSelector | undefined, _meta: NodeMeta | null): boolean {
  throw new Error("not implemented");
}

export function whenMatches(
  _when: HookWhen | undefined,
  _from: NodeMeta | null,
  _next: NodeMeta | null,
  _outcome: string | null,
): boolean {
  throw new Error("not implemented");
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
