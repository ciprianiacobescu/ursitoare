// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { HookRunner } from "./types.ts";

export function registerHookRunner(_kind: "code" | "block", _runner: HookRunner): void {
  throw new Error("not implemented");
}

export function hookRunnerFor(_kind: string): HookRunner | undefined {
  throw new Error("not implemented");
}
