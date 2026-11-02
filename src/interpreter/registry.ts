// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { NodeKind } from "../authoring/index.ts";
import type { NodeRuntime } from "./types.ts";

export const SUPPORTED_KINDS: readonly NodeKind[] = [];

export function registerNodeRuntime(_kind: NodeKind, _runtime: NodeRuntime): void {
  throw new Error("not implemented");
}

export function nodeRuntimeFor(_kind: NodeKind): NodeRuntime | undefined {
  throw new Error("not implemented");
}
