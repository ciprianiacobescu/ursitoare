// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type pg from "pg";

import type { TenantContext } from "../tenancy/index.ts";

export async function resolveCliTenant(
  _db: Pick<pg.Pool, "query">,
  _requested?: string,
): Promise<TenantContext> {
  throw new Error("not implemented");
}
