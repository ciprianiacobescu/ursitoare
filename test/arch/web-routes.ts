// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Snapshot, Violation } from "./sources.ts";

export function isReservedPath(_path: string): boolean {
  throw new Error("not implemented");
}

export function routesOutsideReservedRoots(
  _routes: readonly { method: string; url: string }[],
): string[] {
  throw new Error("not implemented");
}

export function checkFeaturePaths(_s: Snapshot): Violation[] {
  throw new Error("not implemented");
}
