// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DurableJson } from "./launch.ts";

export function registerWorkflow<I extends DurableJson, O extends DurableJson>(
  _name: string,
  _fn: (input: I) => Promise<O>,
): void {
  throw new Error("not implemented");
}
