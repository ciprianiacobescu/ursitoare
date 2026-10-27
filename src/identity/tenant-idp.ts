// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { systemClock } from "../core/index.ts";
import { TenancyError, registerTenantRoute, resolveTenantBy, withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { identityError } from "./errors.ts";
import { IDP_ROUTE_KIND, idpRouteKey, organizationFromClaim } from "./route.ts";
import { requireText } from "./text.ts";
import type { IdentityOptions } from "./users.ts";

export interface IdpPair {
  issuer: string;
  organization: string;
}

export async function provisionTenantIdp(
  ownerPool: TenantPool,
  ctx: TenantContext,
  idp: IdpPair,
  opts?: IdentityOptions,
): Promise<void> {
  const key = idpRouteKey(idp.issuer, idp.organization);
  const clock = opts?.clock ?? systemClock;
  try {
    await withTenantTx(ownerPool, ctx, async (tx) => {
      await registerTenantRoute(tx, IDP_ROUTE_KIND, key);
      await tx.query(
        `INSERT INTO ursitoare.tenant_idp (tenant_id, issuer, organization, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id, issuer, organization) DO NOTHING`,
        [ctx.tenantId, idp.issuer, idp.organization, clock.now()],
      );
    });
  } catch (err) {
    if (err instanceof TenancyError) {
      if (err.code === "TENANT_ROUTE_CONFLICT") throw identityError("IDENTITY_IDP_TAKEN");
      if (err.code === "TENANT_ROUTE_RESERVED") throw identityError("IDENTITY_OWNER_REQUIRED");
      if (err.code === "TENANT_UNKNOWN") throw identityError("IDENTITY_UNKNOWN_TENANT");
    }
    throw err;
  }
}

export async function resolveTenantForToken(
  pool: TenantPool,
  claims: { issuer: string; organization: unknown },
): Promise<TenantContext> {
  const organization = organizationFromClaim(claims.organization);
  let issuer: string;
  try {
    issuer = requireText(claims.issuer, 2048);
  } catch {
    throw identityError("IDENTITY_UNKNOWN_TENANT");
  }
  const ctx = await resolveTenantBy(pool, IDP_ROUTE_KIND, idpRouteKey(issuer, organization));
  if (ctx === null) throw identityError("IDENTITY_UNKNOWN_TENANT");
  return ctx;
}
