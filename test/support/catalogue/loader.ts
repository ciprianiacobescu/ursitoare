// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue } from "../../../src/authoring/index.ts";
import type { CatalogueDocument } from "./document.ts";

export interface TestCatalogue extends Catalogue {
  blockRefs(): string[];
  modelProfileRefs(): string[];
  roleNames(): string[];
}

export function catalogueFromDocument(_doc: CatalogueDocument): TestCatalogue {
  throw new Error("not implemented");
}

export function loadTestCatalogue(_path?: string): TestCatalogue {
  throw new Error("not implemented");
}
