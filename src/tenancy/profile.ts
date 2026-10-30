import type { TenantContext, ReviewProfile } from "./context.ts";
import type { TenantTx } from "./tx.ts";

interface ProfileRow {
  tenant_id: string;
  name: string;
  review_profile: ReviewProfile;
}

export async function getTenantProfile(
  tx: TenantTx,
  ctx: TenantContext,
): Promise<{ tenantId: string; name: string; reviewProfile: ReviewProfile } | null> {
  const result = await tx.query<ProfileRow>(
    "SELECT tenant_id, name, review_profile FROM ursitoare.tenant WHERE tenant_id = $1",
    [ctx.tenantId],
  );
  const row = result.rows[0];
  if (row === undefined) {
    return null;
  }
  return { tenantId: row.tenant_id, name: row.name, reviewProfile: row.review_profile };
}
