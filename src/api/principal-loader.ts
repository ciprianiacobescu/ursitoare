// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PrincipalEntity } from "../pdp/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";

export function createPrincipalLoader(
  _pool: TenantPool,
): (ctx: TenantContext, userId: string) => Promise<PrincipalEntity | null> {
  throw new Error("not implemented");
}
