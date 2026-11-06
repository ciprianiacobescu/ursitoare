// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { HookPlacement } from "../../authoring/index.ts";

export function hookStepName(_nodeId: string, _placement: HookPlacement): string {
  throw new Error("not implemented");
}

export function attemptStepName(_name: string, _attempt: number): string {
  throw new Error("not implemented");
}

export function hookSlot(
  _p: { pre: readonly HookPlacement[]; post: readonly HookPlacement[] },
  _placement: HookPlacement,
): number {
  throw new Error("not implemented");
}

export function isFusable(_placement: HookPlacement): boolean {
  throw new Error("not implemented");
}

export function splitFused(_p: {
  pre: readonly HookPlacement[];
  post: readonly HookPlacement[];
}): {
  ownPre: HookPlacement[];
  fusedPre: HookPlacement[];
  fusedPost: HookPlacement[];
  ownPost: HookPlacement[];
} {
  throw new Error("not implemented");
}
