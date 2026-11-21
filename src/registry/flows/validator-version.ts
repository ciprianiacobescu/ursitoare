// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { VersionState } from "./flows.ts";

export async function validatorVersionOf(
  _tx: TenantTx,
  _ctx: TenantContext,
  _flowId: string,
  _hash: string,
): Promise<number | null> {
  throw new Error("not implemented");
}

export function isValidationStale(_state: VersionState, _validatorVersion: number | null): boolean {
  throw new Error("not implemented");
}
