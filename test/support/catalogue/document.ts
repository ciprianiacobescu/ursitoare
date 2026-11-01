// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { BlockDef, JsonSchema } from "../../../src/authoring/index.ts";

export const TEST_CATALOGUE_PATH: string = "";

export interface CatalogueDocument {
  catalogue: string;
  version: string;
  notes?: string;
  blocks: { [ref: string]: BlockDef };
  model_profiles: string[];
  roles: string[];
  delegate_targets: { [target: string]: string[] };
  flows_registry: { [ref: string]: { inputs: JsonSchema; outputs: JsonSchema } };
}

export function parseCatalogueDocument(_text: string): CatalogueDocument {
  throw new Error("not implemented");
}

export function readCatalogueDocument(_path?: string): CatalogueDocument {
  throw new Error("not implemented");
}
