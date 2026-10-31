import assert from "node:assert/strict";
import { test } from "node:test";

import * as identity from "../index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";

const SEEDED_DEFAULT_ROLES: readonly string[] = [
  "approver",
  "auditor",
  "author",
  "tenant_admin",
];

async function rolesOf(db: TestDatabase, ctx: TenantContext): Promise<string[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const { rows } = await tx.query<{ role_id: string }>(
      "SELECT role_id FROM ursitoare.role ORDER BY role_id",
    );
    return rows.map((row) => row.role_id);
  });
}

async function seedThreeTenants(db: TestDatabase): Promise<TenantContext[]> {
  const { a, b } = await seedTwoTenants(db);
  await db.ownerPool.query(
    "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'Tenant C')",
  );
  const c: TenantContext = { tenantId: "tenant_c", reviewProfile: "solo" };
  return [a, b, c];
}

async function assertEveryTenantHasSeededRoles(db: TestDatabase): Promise<void> {
  for (const ctx of await seedThreeTenants(db)) {
    assert.deepEqual(
      await rolesOf(db, ctx),
      [...SEEDED_DEFAULT_ROLES],
      `${ctx.tenantId} has exactly the four seeded default roles`,
    );
  }
}

test("C-bb91aeca Created with the tenant ties exported DEFAULT_ROLES to the seeded roles", async () => {
  assert.ok(
    Array.isArray(identity.DEFAULT_ROLES),
    "DEFAULT_ROLES is exported from the identity module index",
  );
  const db = await withTestDatabase();
  try {
    await assertEveryTenantHasSeededRoles(db);
    assert.deepEqual(
      [...identity.DEFAULT_ROLES].sort(),
      [...SEEDED_DEFAULT_ROLES],
      "the exported constant equals the list every tenant receives",
    );
  } finally {
    await db.close();
  }
});

test("C-24fd43c4 Schema test checks exported DEFAULT_ROLES against every tenant", async () => {
  assert.ok(
    Array.isArray(identity.DEFAULT_ROLES),
    "DEFAULT_ROLES is exported from the identity module index",
  );
  const db = await withTestDatabase();
  try {
    await assertEveryTenantHasSeededRoles(db);
    assert.deepEqual(
      [...identity.DEFAULT_ROLES].sort(),
      [...SEEDED_DEFAULT_ROLES],
      "the exported constant equals the list every tenant receives",
    );
  } finally {
    await db.close();
  }
});

test("C-e5f925ef Regression check sorts exported DEFAULT_ROLES against the seeded list", async () => {
  assert.ok(
    Array.isArray(identity.DEFAULT_ROLES),
    "DEFAULT_ROLES is exported from the identity module index",
  );
  const db = await withTestDatabase();
  try {
    await assertEveryTenantHasSeededRoles(db);
    assert.deepEqual(
      [...identity.DEFAULT_ROLES].sort(),
      [...SEEDED_DEFAULT_ROLES],
      "the sorted exported constant equals the seeded list",
    );
  } finally {
    await db.close();
  }
});
