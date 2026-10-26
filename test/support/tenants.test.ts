import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "./pg.ts";
import { seedTwoTenants } from "./tenants.ts";

test("C-8f310ba8 seedTwoTenants seeds two tenants once and keeps stored values", async () => {
  const db = await withTestDatabase();
  try {
    await assert.doesNotReject(async () => {
      const first = await seedTwoTenants(db);
      assert.deepEqual(first, {
        a: { tenantId: "tenant_a", reviewProfile: "solo" },
        b: { tenantId: "tenant_b", reviewProfile: "solo" },
      });

      const second = await seedTwoTenants(db);
      assert.deepEqual(second, {
        a: { tenantId: "tenant_a", reviewProfile: "solo" },
        b: { tenantId: "tenant_b", reviewProfile: "solo" },
      });

      await db.ownerPool.query(
        "UPDATE ursitoare.tenant SET review_profile = 'team' WHERE tenant_id = 'tenant_a'",
      );

      const third = await seedTwoTenants(db);
      assert.deepEqual(third, {
        a: { tenantId: "tenant_a", reviewProfile: "team" },
        b: { tenantId: "tenant_b", reviewProfile: "solo" },
      });

      const rows = await db.ownerPool.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM ursitoare.tenant ORDER BY tenant_id",
      );
      assert.deepEqual(
        rows.rows.map((row) => row.tenant_id),
        ["tenant_a", "tenant_b"],
      );
    });
  } finally {
    await db.close();
  }
});
