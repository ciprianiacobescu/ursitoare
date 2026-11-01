// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type TaintLabel = "extracted" | "untrusted";

export type Taint = readonly TaintLabel[];

export const TAINT_LABELS: readonly TaintLabel[] = [];

export const NO_TAINT: Taint = [];

export function normalizeTaint(_labels: readonly string[]): Taint {
  throw new Error("not implemented");
}

export function joinTaint(_a: Taint, _b: Taint): Taint {
  throw new Error("not implemented");
}

export function relabelExtract(_input: Taint): Taint {
  throw new Error("not implemented");
}

export function taintIncludes(_outer: Taint, _inner: Taint): boolean {
  throw new Error("not implemented");
}
