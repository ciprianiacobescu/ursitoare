// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, ReviewProfile } from "./context.ts";
import type { TenantTx } from "./tx.ts";

export async function getTenantProfile(
  _tx: TenantTx,
  _ctx: TenantContext,
): Promise<{ tenantId: string; name: string; reviewProfile: ReviewProfile } | null> {
  throw new Error("not implemented");
}
