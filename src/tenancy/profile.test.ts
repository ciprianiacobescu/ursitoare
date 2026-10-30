import assert from "node:assert/strict";
import { test } from "node:test";

import { withTenantTx, type TenantContext } from "./index.ts";
import { getTenantProfile } from "./profile.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

assert.equal(typeof getTenantProfile, "function");

test("C-2be08620 getTenantProfile reads its own tenant profile and null for another", async () => {
  const db = await withTestDatabase();
  try {
    const { rows } = await db.ownerPool.query<{ tenant: string | null }>(
      "SELECT to_regclass('ursitoare.tenant')::text AS tenant",
    );
    assert.ok(rows[0]?.tenant, "ursitoare.tenant exists");

    const { a, b } = await seedTwoTenants(db);
    const missing: TenantContext = { tenantId: "tenant_zz", reviewProfile: "solo" };

    await assert.doesNotReject(async () => {
      const own = await withTenantTx(db.appPool, a, (tx) => getTenantProfile(tx, a));
      assert.deepEqual(own, {
        tenantId: "tenant_a",
        name: "Tenant A",
        reviewProfile: "solo",
      });

      const foreign = await withTenantTx(db.appPool, a, (tx) => getTenantProfile(tx, b));
      assert.equal(foreign, null);

      const absent = await withTenantTx(db.appPool, a, (tx) => getTenantProfile(tx, missing));
      assert.equal(absent, null);
    });
  } finally {
    await db.close();
  }
});
