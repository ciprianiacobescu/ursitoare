// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FlowFormat } from "../../../src/authoring/index.ts";

export type HookCaseGroup = "invalid" | "valid" | "warnings";

export interface HookCase {
  group: HookCaseGroup;
  name: string;
  path: string;
  text: string;
  format: FlowFormat;
  expect: string[];
  expectWarnings: string[];
}

export function hookCases(_group: HookCaseGroup, _namePrefix?: string): HookCase[] {
  throw new Error("not implemented");
}
