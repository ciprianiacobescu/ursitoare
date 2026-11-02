// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../authoring/index.ts";
import type { RunScope } from "./types.ts";

export function resolveValue(_value: unknown, _scope: RunScope): JsonValue {
  throw new Error("not implemented");
}

export function durationMs(_iso: string): number {
  throw new Error("not implemented");
}
