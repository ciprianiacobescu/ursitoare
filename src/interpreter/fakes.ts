// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, Flow } from "../authoring/index.ts";
import type { TestMocks } from "./mocks.ts";

export type DryRunFakes = TestMocks;

export interface FakeProblem {
  key: string;
  index: number | null;
  reason: "missing" | "not_an_effect" | "unknown_node" | "schema" | "shape";
  detail: string;
}

export function checkFakes(
  _flow: Flow,
  _catalogue: Catalogue,
  _fakes: unknown,
): { fakes: DryRunFakes | null; problems: FakeProblem[] } {
  throw new Error("not implemented");
}
