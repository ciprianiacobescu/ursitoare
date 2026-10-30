// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";

export interface MembershipSet {
  roles: string[];
  teams: string[];
}

export async function loadMemberships(
  _tx: TenantTx,
  _ctx: TenantContext,
  _userId: string,
): Promise<MembershipSet> {
  throw new Error("not implemented");
}
