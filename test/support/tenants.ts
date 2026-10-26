import type { TenantContext } from "../../src/tenancy/index.ts";
import type { TestDatabase } from "./pg.ts";

export const TENANT_A_ID: string = "tenant_a";

export const TENANT_B_ID: string = "tenant_b";

export async function seedTwoTenants(
  db: TestDatabase,
): Promise<{ a: TenantContext; b: TenantContext }> {
  await db.ownerPool.query(
    "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_a', 'Tenant A'), ('tenant_b', 'Tenant B') ON CONFLICT DO NOTHING",
  );

  const { rows } = await db.ownerPool.query<{ tenant_id: string; review_profile: string }>(
    "SELECT tenant_id, review_profile FROM ursitoare.tenant WHERE tenant_id = ANY ($1::text[]) ORDER BY tenant_id",
    [[TENANT_A_ID, TENANT_B_ID]],
  );

  const contexts = new Map(
    rows.map((row) => [row.tenant_id, { tenantId: row.tenant_id, reviewProfile: row.review_profile }]),
  );
  const a = contexts.get(TENANT_A_ID);
  const b = contexts.get(TENANT_B_ID);
  if (a === undefined || b === undefined) {
    throw new Error("seeded tenants are missing");
  }
  return {
    a: { tenantId: a.tenantId, reviewProfile: a.reviewProfile as TenantContext["reviewProfile"] },
    b: { tenantId: b.tenantId, reviewProfile: b.reviewProfile as TenantContext["reviewProfile"] },
  };
}
