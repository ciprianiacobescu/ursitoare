// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, FlowFormat } from "../../../src/authoring/index.ts";

export type CaseGroup = "invalid" | "valid" | "warnings";

export interface FlowCase {
  group: CaseGroup;
  name: string;
  path: string;
  text: string;
  format: FlowFormat;
  expect: string[];
  expectWarnings: string[];
}

export function flowCases(_group: CaseGroup, _namePrefix?: string): FlowCase[] {
  throw new Error("not implemented");
}

export function caseCatalogue(): Catalogue {
  throw new Error("not implemented");
}
