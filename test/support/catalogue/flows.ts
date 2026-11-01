// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Flow } from "../../../src/authoring/index.ts";

export type TestFlowName = "rf-1-invoice-intake" | "rf-1-core" | "rf-1-core-approval";

export const TEST_FLOW_NAMES: readonly TestFlowName[] = [];

export function testFlowPath(_name: string): string {
  throw new Error("not implemented");
}

export function readTestFlowText(_name: string): string {
  throw new Error("not implemented");
}

export function parseCatalogueFlow(_text: string, _label: string): Flow {
  throw new Error("not implemented");
}

export function loadTestFlow(_name: string): Flow {
  throw new Error("not implemented");
}
