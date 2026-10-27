// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ActionName } from "./actions.ts";
import type { PrincipalEntity } from "./principal.ts";
import type { PolicyRequest } from "./types.ts";

export function probeRequest(_principal: PrincipalEntity, _action: ActionName): PolicyRequest | null {
  throw new Error("not implemented");
}
