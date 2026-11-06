// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { BlockDef, Catalogue, ProducedTaint, TaintOf } from "../authoring/index.ts";


export function blocksCatalogue(_blocks: Readonly<Record<string, BlockDef>>): Catalogue {
  throw new Error("not implemented");
}

export interface RunTaints {
  readonly taintOf: TaintOf;
  record(nodeId: string, produced: ProducedTaint): void;
}

export function createRunTaints(): RunTaints {
  throw new Error("not implemented");
}
