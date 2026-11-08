// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { CredentialRecord } from "./types.ts";

export async function listCredentials(
  _pool: TenantPool,
  _ctx: TenantContext,
): Promise<CredentialRecord[]> {
  throw new Error("not implemented");
}
