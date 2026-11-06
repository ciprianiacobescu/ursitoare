// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Flow } from "../../../src/authoring/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";

export type TaintRunName = "untrusted-code" | "trusted-code";

export const TAINT_RUN_NAMES: readonly TaintRunName[] = [];

export const TAINT_RUN_HASH: string = "";

export function loadTaintRun(_name: string): Flow {
  throw new Error("not implemented");
}

export function readTaintRunText(_name: string): string {
  throw new Error("not implemented");
}

export function taintRunVersion(_name: string): LoadedVersion {
  throw new Error("not implemented");
}
