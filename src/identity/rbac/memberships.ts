import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { assertTenantMatches } from "./names.ts";

export interface MembershipSet {
  roles: string[];
  teams: string[];
}

interface MembershipRow {
  role_id: string | null;
  team_id: string | null;
}

export async function loadMemberships(
  tx: TenantTx,
  ctx: TenantContext,
  userId: string,
): Promise<MembershipSet> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<MembershipRow>(
    `SELECT DISTINCT m.role_id, m.team_id
     FROM ursitoare.membership m
     JOIN ursitoare."user" u ON u.tenant_id = m.tenant_id AND u.user_id = m.user_id
     WHERE m.tenant_id = $1 AND m.user_id = $2 AND u.state = 'active'`,
    [ctx.tenantId, userId],
  );

  const roles = new Set<string>();
  const teams = new Set<string>();
  for (const row of result.rows) {
    if (row.role_id !== null) roles.add(row.role_id);
    if (row.team_id !== null) teams.add(row.team_id);
  }

  return {
    roles: [...roles].sort(),
    teams: [...teams].sort(),
  };
}
