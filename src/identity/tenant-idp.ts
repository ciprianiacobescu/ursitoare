// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { IdentityOptions } from "./users.ts";

export interface IdpPair {
  issuer: string;
  organization: string;
}

export async function provisionTenantIdp(
  _ownerPool: TenantPool,
  _ctx: TenantContext,
  _idp: IdpPair,
  _opts?: IdentityOptions,
): Promise<void> {
  throw new Error("not implemented");
}

export async function resolveTenantForToken(
  _pool: TenantPool,
  _claims: { issuer: string; organization: unknown },
): Promise<TenantContext> {
  throw new Error("not implemented");
}
