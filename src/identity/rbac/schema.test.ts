import assert from "node:assert/strict";
import { test } from "node:test";

import { checkTenancyCatalog, withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";

const ISS = "https://idp.example/realms/ursitoare";
const DEFAULT_ROLE_IDS = ["approver", "auditor", "author", "tenant_admin"];

async function assertRbacObjects(db: TestDatabase): Promise<void> {
  const { rows } = await db.ownerPool.query<{
    role: boolean;
    team: boolean;
    group_map: boolean;
    membership: boolean;
    version: number | null;
    name: string | null;
  }>(
    `SELECT to_regclass('ursitoare.role') IS NOT NULL AS role,
            to_regclass('ursitoare.team') IS NOT NULL AS team,
            to_regclass('ursitoare.idp_group_map') IS NOT NULL AS group_map,
            to_regclass('ursitoare.membership') IS NOT NULL AS membership,
            (SELECT version FROM ursitoare.schema_migration WHERE version = 170) AS version,
            (SELECT name FROM ursitoare.schema_migration WHERE version = 170) AS name`,
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  assert.ok(row.role, "ursitoare.role exists");
  assert.ok(row.team, "ursitoare.team exists");
  assert.ok(row.group_map, "ursitoare.idp_group_map exists");
  assert.ok(row.membership, "ursitoare.membership exists");
  assert.equal(row.version, 170, "the ledger holds version 170");
  assert.equal(row.name, "rbac", "version 170 is named rbac");
}

async function rolesOf(db: TestDatabase, ctx: TenantContext): Promise<string[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const { rows } = await tx.query<{ role_id: string }>(
      "SELECT role_id FROM ursitoare.role ORDER BY role_id",
    );
    return rows.map((row) => row.role_id);
  });
}

async function insertUser(db: TestDatabase, ctx: TenantContext, userId: string): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, $2, 'human', NULL, $2, 'active')`,
      [ctx.tenantId, userId],
    );
  });
}

test("C-bb91aeca Created with the tenant", async () => {
  const db = await withTestDatabase();
  try {
    await assertRbacObjects(db);
    const { a, b } = await seedTwoTenants(db);
    await db.ownerPool.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'Tenant C')",
    );
    const c: TenantContext = { tenantId: "tenant_c", reviewProfile: "solo" };
    for (const ctx of [a, b, c]) {
      assert.deepEqual(await rolesOf(db, ctx), DEFAULT_ROLE_IDS, ctx.tenantId);
    }
    assert.deepEqual([...DEFAULT_ROLE_IDS].sort(), DEFAULT_ROLE_IDS);
  } finally {
    await db.close();
  }
});

test("C-eb484eda Idempotent, setting restored", async () => {
  const db = await withTestDatabase();
  try {
    await assertRbacObjects(db);
    const { rows: fnRows } = await db.ownerPool.query<{ present: boolean }>(
      "SELECT to_regprocedure('ursitoare.seed_default_roles(text)') IS NOT NULL AS present",
    );
    assert.ok(fnRows[0]?.present, "ursitoare.seed_default_roles(text) exists");

    const { a } = await seedTwoTenants(db);
    const deleted = await withTenantTx(db.ownerPool, a, async (tx) => {
      const result = await tx.query("DELETE FROM ursitoare.role WHERE tenant_id = $1", [a.tenantId]);
      return result.rowCount;
    });
    assert.equal(deleted, 4, "the four roles of tenant_a are deleted");

    const client = await db.ownerPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', 'keep', true)");

      await client.query("SELECT ursitoare.seed_default_roles('tenant_a')");
      const afterFirst = await client.query<{ setting: string | null }>(
        "SELECT current_setting('app.tenant_id', true) AS setting",
      );
      assert.equal(afterFirst.rows[0]?.setting, "keep", "the setting survives the first seed");

      await client.query("SELECT ursitoare.seed_default_roles('tenant_a')");
      const afterSecond = await client.query<{ setting: string | null }>(
        "SELECT current_setting('app.tenant_id', true) AS setting",
      );
      assert.equal(afterSecond.rows[0]?.setting, "keep", "the setting survives the second seed");

      await client.query(
        "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_d', 'Tenant D')",
      );
      const afterInsert = await client.query<{ setting: string | null }>(
        "SELECT current_setting('app.tenant_id', true) AS setting",
      );
      assert.equal(afterInsert.rows[0]?.setting, "keep", "the setting survives the tenant insert");

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    assert.deepEqual(await rolesOf(db, a), DEFAULT_ROLE_IDS, "tenant_a has its four roles again");
    const d: TenantContext = { tenantId: "tenant_d", reviewProfile: "solo" };
    assert.deepEqual(await rolesOf(db, d), DEFAULT_ROLE_IDS, "tenant_d has its four roles");
  } finally {
    await db.close();
  }
});

test("C-8a5b7447 Objects, catalog, privileges, checks", async () => {
  const db = await withTestDatabase();
  try {
    await assertRbacObjects(db);
    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    const { a, b } = await seedTwoTenants(db);
    await insertUser(db, a, "u1");
    await insertUser(db, b, "u1");
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await tx.query("INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')", [
        a.tenantId,
      ]);
    });

    const denied: { sql: string; values: unknown[] }[] = [
      {
        sql: "INSERT INTO ursitoare.role (tenant_id, role_id) VALUES ('tenant_a', 'new_role')",
        values: [],
      },
      {
        sql: "DELETE FROM ursitoare.role WHERE tenant_id = 'tenant_a'",
        values: [],
      },
      {
        sql: "UPDATE ursitoare.team SET team_id = 'x'",
        values: [],
      },
      {
        sql: `INSERT INTO ursitoare.membership
                (tenant_id, membership_id, user_id, role_id, source, source_issuer)
              VALUES ('tenant_b', 'm-b', 'u1', 'author', 'idp_claim', $1)`,
        values: [ISS],
      },
    ];
    for (const statement of denied) {
      await assert.rejects(
        withTenantTx(db.appPool, a, async (tx) => {
          await tx.query(statement.sql, statement.values);
        }),
        { code: "42501" },
        statement.sql,
      );
    }

    const visible = await withTenantTx(db.appPool, a, async (tx) => {
      const { rows } = await tx.query<{ role_id: string }>(
        "SELECT role_id FROM ursitoare.role ORDER BY role_id",
      );
      return rows.map((row) => row.role_id);
    });
    assert.deepEqual(visible, DEFAULT_ROLE_IDS);

    await assert.rejects(
      withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query(
          `INSERT INTO ursitoare.membership
             (tenant_id, membership_id, user_id, role_id, team_id, source, source_issuer)
           VALUES ('tenant_a', 'm-both', 'u1', 'author', 'finance', 'idp_claim', $1)`,
          [ISS],
        );
      }),
      { code: "23514" },
      "a membership with both a role and a team",
    );

    await assert.rejects(
      withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query(
          `INSERT INTO ursitoare.membership
             (tenant_id, membership_id, user_id, team_id, source, granted_by)
           VALUES ('tenant_a', 'm-local', 'u1', 'finance', 'local', 'u-admin')`,
        );
      }),
      { code: "23514" },
      "a local membership for a team",
    );
  } finally {
    await db.close();
  }
});
