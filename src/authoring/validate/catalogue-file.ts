// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue } from "../format/index.ts";

export function catalogueFromJson(_text: string): Catalogue {
  throw new Error("not implemented");
}

export class CatalogueFileError extends Error {
  readonly code: "CATALOGUE_FILE_INVALID";

  constructor(message: string) {
    super(message);
    throw new Error("not implemented");
  }
}
