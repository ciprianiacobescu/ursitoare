// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue } from "../format/index.ts";
import type { Issue } from "../validate/index.ts";

export function checkHooks(
  _doc: unknown,
  _catalogue: Catalogue,
): { errors: Issue[]; warnings: Issue[] } {
  throw new Error("not implemented");
}
