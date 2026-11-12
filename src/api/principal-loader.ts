import { getUser, loadMemberships } from "../identity/index.ts";
import type { PrincipalEntity } from "../pdp/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";

export function createPrincipalLoader(
  pool: TenantPool,
): (ctx: TenantContext, userId: string) => Promise<PrincipalEntity | null> {
  return async (ctx, userId) =>
    withTenantTx(pool, ctx, async (tx) => {
      const user = await getUser(tx, ctx, userId);
      if (user === null || user.state !== "active") return null;
      const memberships = await loadMemberships(tx, ctx, userId);
      return {
        tenantId: ctx.tenantId,
        userId,
        kind: user.kind,
        roles: memberships.roles,
        teams: memberships.teams,
      };
    });
}
