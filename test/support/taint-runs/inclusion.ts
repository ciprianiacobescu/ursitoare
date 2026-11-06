// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, Flow } from "../../../src/authoring/index.ts";
import type { producedTaint } from "../../../src/authoring/taint/runtime.ts";

export interface InclusionReport {
  paths: number;
  checked: string[];
  cut: string[];
  violations: string[];
}

export function flowPaths(_flow: Flow, _max: number): string[][] {
  throw new Error("not implemented");
}

export function inclusionReport(
  _flow: Flow,
  _catalogue: Catalogue,
  _produced?: typeof producedTaint,
): InclusionReport {
  throw new Error("not implemented");
}
