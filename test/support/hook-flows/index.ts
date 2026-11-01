// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Flow } from "../../../src/authoring/index.ts";

export type HookFlowGroup = "scenario" | "static";

export function hookFlowNames(_group?: HookFlowGroup): string[] {
  throw new Error("not implemented");
}

export function hookFlowPath(_name: string): string {
  throw new Error("not implemented");
}

export function readHookFlowText(_name: string): string {
  throw new Error("not implemented");
}

export function hookFlowTitle(_name: string): string {
  throw new Error("not implemented");
}

export function loadHookFlow(_name: string): Flow {
  throw new Error("not implemented");
}
