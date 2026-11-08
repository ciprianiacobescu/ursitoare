// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ToolSurface } from "./types.ts";

export function surfaceDigest(_surface: ToolSurface): string {
  throw new Error("not implemented");
}

export function surfaceRefs(
  _serverId: string,
  _surface: ToolSurface,
  _taken: ReadonlyMap<string, string>,
): Record<string, string> {
  throw new Error("not implemented");
}
