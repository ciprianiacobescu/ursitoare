// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Flow } from "../../../src/authoring/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";

export const HOOK_RUN_HASH: string = "";

export function hookRunNames(): string[] {
  throw new Error("not implemented");
}

export function readHookRunText(_name: string): string {
  throw new Error("not implemented");
}

export function loadHookRun(_name: string): Flow {
  throw new Error("not implemented");
}

export function hookRunVersion(_name: string): LoadedVersion {
  throw new Error("not implemented");
}
