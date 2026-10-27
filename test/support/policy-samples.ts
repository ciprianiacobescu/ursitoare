// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ActionName, PolicyRequest } from "../../src/pdp/index.ts";

export function sampleRequest(
  _action: ActionName,
  _opts?: { principalTenant?: string; resourceTenant?: string },
): PolicyRequest {
  throw new Error("not implemented");
}

export function invokeToolRequest(_opts: {
  effect: string;
  taint: readonly string[];
  blockKind: string;
}): PolicyRequest {
  throw new Error("not implemented");
}
