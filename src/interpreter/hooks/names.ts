import type { HookPlacement } from "../../authoring/index.ts";
import { InterpreterError } from "../errors.ts";

export function hookStepName(nodeId: string, placement: HookPlacement): string {
  return `${nodeId}:${placement.phase}:${placement.label}`;
}

export function attemptStepName(name: string, attempt: number): string {
  return attempt <= 1 ? name : `${name}:r${attempt}`;
}

export function hookSlot(
  p: { pre: readonly HookPlacement[]; post: readonly HookPlacement[] },
  placement: HookPlacement,
): number {
  const index = [...p.pre, ...p.post].indexOf(placement);
  if (index < 0) {
    throw new InterpreterError("HOOK_ERROR", "hook placement has no slot", null, {
      reason: "slot_missing",
    });
  }
  return index + 1;
}

export function isFusable(placement: HookPlacement): boolean {
  const hook = placement.hook;
  return hook.kind === "code" && hook.routes === undefined && hook.max_retries === undefined;
}

export function splitFused(p: {
  pre: readonly HookPlacement[];
  post: readonly HookPlacement[];
}): {
  ownPre: HookPlacement[];
  fusedPre: HookPlacement[];
  fusedPost: HookPlacement[];
  ownPost: HookPlacement[];
} {
  let preCut = p.pre.length;
  while (preCut > 0 && isFusable(p.pre[preCut - 1] as HookPlacement)) preCut -= 1;
  let postCut = 0;
  while (postCut < p.post.length && isFusable(p.post[postCut] as HookPlacement)) postCut += 1;
  return {
    ownPre: p.pre.slice(0, preCut),
    fusedPre: p.pre.slice(preCut),
    fusedPost: p.post.slice(0, postCut),
    ownPost: p.post.slice(postCut),
  };
}
