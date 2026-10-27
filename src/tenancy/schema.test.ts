import assert from "node:assert/strict";
import { test } from "node:test";

import type pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import { ROLE_APP, ROLE_OWNER } from "../db/index.ts";
import { hashRouteKey } from "./index.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";

const FUNCTIONS: string[] = [
  "register_tenant_route",
  "unregister_tenant_route",
  "resolve_tenant",
];

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row !== undefined, "the query returns one row");
  return row;
}

async function assertTenancyObjects(pool: pg.Pool): Promise<void> {
  const row = await oneRow(
    pool.query<{
      tenant: boolean;
      route: boolean;
      register: boolean;
      unregister: boolean;
      resolve: boolean;
      version: number | null;
      name: string | null;
    }>(
      `SELECT to_regclass('ursitoare.tenant') IS NOT NULL AS tenant,
              to_regclass('ursitoare.tenant_route') IS NOT NULL AS route,
              to_regprocedure('ursitoare.register_tenant_route(text, bytea)') IS NOT NULL AS register,
              to_regprocedure('ursitoare.unregister_tenant_route(text, bytea)') IS NOT NULL AS unregister,
              to_regprocedure('ursitoare.resolve_tenant(text, bytea)') IS NOT NULL AS resolve,
              (SELECT version FROM ursitoare.schema_migration WHERE version = 2) AS version,
              (SELECT name FROM ursitoare.schema_migration WHERE version = 2) AS name`,
    ),
  );
  assert.equal(row.tenant, true, "ursitoare.tenant exists");
  assert.equal(row.route, true, "ursitoare.tenant_route exists");
  assert.equal(row.register, true, "register_tenant_route exists");
  assert.equal(row.unregister, true, "unregister_tenant_route exists");
  assert.equal(row.resolve, true, "resolve_tenant exists");
  assert.equal(row.version, 2, "the ledger holds version 2");
  assert.equal(row.name, "tenancy", "version 2 is named tenancy");
}

async function insertTwoTenants(db: TestDatabase): Promise<void> {
  await db.ownerPool.query(
    "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_a', 'Tenant A'), ('tenant_b', 'Tenant B')",
  );
}

async function queryAsTenant<T extends QueryResultRow>(
  db: TestDatabase,
  tenantId: string,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  const client = await db.appPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const result = await client.query<T>(text, values);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function rawRegister(
  db: TestDatabase,
  tenantId: string,
  kind: string,
  key: Buffer,
): Promise<boolean> {
  const result = await queryAsTenant<{ created: boolean }>(
    db,
    tenantId,
    "SELECT ursitoare.register_tenant_route($1, $2) AS created",
    [kind, key],
  );
  return result.rows[0]?.created === true;
}

async function rawResolve(
  db: TestDatabase,
  kind: string | null,
  key: Buffer,
): Promise<QueryResult<{ tenant_id: string | null }>> {
  return db.appPool.query<{ tenant_id: string | null }>(
    "SELECT ursitoare.resolve_tenant($1::text, $2::bytea) AS tenant_id",
    [kind, key],
  );
}

test("C-468abad0 app sessions see no tenant rows without a tenant setting", async () => {
  const db = await withTestDatabase();
  try {
    await assertTenancyObjects(db.ownerPool);
    await insertTwoTenants(db);

    const outside = await db.appPool.query("SELECT * FROM ursitoare.tenant");
    assert.equal(outside.rowCount, 0);

    const client = await db.appPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', 'ghost', true)");
      const ghost = await client.query("SELECT * FROM ursitoare.tenant");
      assert.equal(ghost.rowCount, 0);
      await client.query("COMMIT");

      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', '', true)");
      const empty = await client.query("SELECT * FROM ursitoare.tenant");
      assert.equal(empty.rowCount, 0);
      await client.query("COMMIT");
    } finally {
      client.release();
    }
  } finally {
    await db.close();
  }
});

test("C-91a17beb tenant defaults and constraints hold", async () => {
  const db = await withTestDatabase();
  try {
    await assertTenancyObjects(db.ownerPool);

    const inserted = await oneRow(
      db.ownerPool.query<{
        tenant_id: string;
        review_profile: string;
        mintkey_tenant_uuid: string | null;
        created_at: Date;
      }>(
        "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_default', 'Default') RETURNING tenant_id, review_profile, mintkey_tenant_uuid, created_at",
      ),
    );
    assert.equal(inserted.tenant_id, "tenant_default");
    assert.equal(inserted.review_profile, "solo");
    assert.equal(inserted.mintkey_tenant_uuid, null);
    assert.ok(inserted.created_at instanceof Date, "created_at is set");

    await assert.rejects(
      db.ownerPool.query(
        "INSERT INTO ursitoare.tenant (tenant_id, name, review_profile) VALUES ('tenant_admin', 'Admin', 'admin')",
      ),
      { code: "23514" },
    );
    await assert.rejects(
      db.ownerPool.query("INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('', 'Empty')"),
      { code: "23514" },
    );
    await assert.rejects(
      db.ownerPool.query("INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('a/b', 'Slash')"),
      { code: "23514" },
    );
    await assert.rejects(
      db.ownerPool.query("INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_pad', ' Padded ')"),
      { code: "23514" },
    );
    await assert.rejects(
      db.ownerPool.query(
        "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_repeat', 'Default')",
      ),
      { code: "23505" },
    );
  } finally {
    await db.close();
  }
});

test("C-fe7e2021 the app role has no direct access to the routing table", async () => {
  const db = await withTestDatabase();
  try {
    await assertTenancyObjects(db.ownerPool);
    await insertTwoTenants(db);

    await assert.rejects(db.appPool.query("SELECT * FROM ursitoare.tenant_route"), {
      code: "42501",
    });
    await assert.rejects(db.appPool.query("SELECT key_hash FROM ursitoare.tenant_route"), {
      code: "42501",
    });
    await assert.rejects(
      db.appPool.query(
        "INSERT INTO ursitoare.tenant_route (kind, key_hash, tenant_id) VALUES ('session', $1, 'tenant_a')",
        [Buffer.alloc(32)],
      ),
      { code: "42501" },
    );
    await assert.rejects(
      db.appPool.query("UPDATE ursitoare.tenant_route SET tenant_id = 'tenant_b'"),
      { code: "42501" },
    );
    await assert.rejects(db.appPool.query("DELETE FROM ursitoare.tenant_route"), {
      code: "42501",
    });

    const privileges = await oneRow(
      db.ownerPool.query<{ table: boolean; column: boolean }>(
        `SELECT has_table_privilege($1, 'ursitoare.tenant_route', 'SELECT') AS table,
                has_any_column_privilege($1, 'ursitoare.tenant_route', 'SELECT') AS column`,
        [ROLE_APP],
      ),
    );
    assert.equal(privileges.table, false);
    assert.equal(privileges.column, false);
  } finally {
    await db.close();
  }
});

test("C-f511db93 the routing functions are safe definers", async () => {
  const db = await withTestDatabase();
  try {
    await assertTenancyObjects(db.ownerPool);

    const result = await db.ownerPool.query<{
      name: string;
      secdef: boolean;
      owner: string;
      config: string[] | null;
      public_execute: boolean;
      app_execute: boolean;
    }>(
      `SELECT p.proname AS name,
              p.prosecdef AS secdef,
              pg_get_userbyid(p.proowner) AS owner,
              p.proconfig AS config,
              EXISTS (
                SELECT 1
                  FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
                 WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'
              ) AS public_execute,
              has_function_privilege($1, p.oid, 'EXECUTE') AS app_execute
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'ursitoare' AND p.proname = ANY($2::text[])
        ORDER BY p.proname`,
      [ROLE_APP, FUNCTIONS],
    );
    assert.equal(result.rows.length, 3);
    assert.deepEqual(
      result.rows.map((row) => row.name),
      [...FUNCTIONS].sort(),
    );

    for (const row of result.rows) {
      assert.equal(row.secdef, true, `${row.name} is SECURITY DEFINER`);
      assert.equal(row.owner, ROLE_OWNER, `${row.name} is owned by the owner role`);
      assert.equal(row.public_execute, false, `${row.name} is not executable by PUBLIC`);
      assert.equal(row.app_execute, true, `${row.name} is executable by the app role`);

      const searchPath = (row.config ?? []).find((entry) => entry.startsWith("search_path="));
      assert.ok(searchPath !== undefined, `${row.name} pins search_path`);
      assert.deepEqual(
        searchPath
          .slice("search_path=".length)
          .split(",")
          .map((part) => part.trim()),
        ["pg_catalog", "pg_temp"],
      );
    }
  } finally {
    await db.close();
  }
});

test("C-5cb45dfc a shadowing temp table changes nothing", async () => {
  const db = await withTestDatabase();
  const client = await db.appPool.connect();
  try {
    await assertTenancyObjects(db.ownerPool);
    await insertTwoTenants(db);

    const keyHash = hashRouteKey("k1");
    assert.equal(await rawRegister(db, "tenant_a", "session", keyHash), true);

    await client.query(
      "CREATE TEMP TABLE tenant_route (kind text, key_hash bytea, tenant_id text)",
    );
    await client.query(
      "INSERT INTO tenant_route (kind, key_hash, tenant_id) VALUES ('session', $1, 'tenant_b')",
      [keyHash],
    );
    await client.query("SET search_path = pg_temp, public");

    const resolved = await client.query<{ tenant_id: string | null }>(
      "SELECT ursitoare.resolve_tenant('session', $1) AS tenant_id",
      [keyHash],
    );
    assert.equal(resolved.rows[0]?.tenant_id, "tenant_a");
  } finally {
    client.release();
    await db.close();
  }
});

test("C-ff9216e2 resolve_tenant answers only exact pairs", async () => {
  const db = await withTestDatabase();
  try {
    await assertTenancyObjects(db.ownerPool);
    await insertTwoTenants(db);

    const keyHash = hashRouteKey("k1");
    assert.equal(await rawRegister(db, "tenant_a", "session", keyHash), true);

    const exact = await rawResolve(db, "session", keyHash);
    assert.equal(exact.fields.length, 1);
    assert.equal(exact.rows[0]?.tenant_id, "tenant_a");

    const unknown = await rawResolve(db, "session", hashRouteKey("k2"));
    assert.equal(unknown.fields.length, 1);
    assert.equal(unknown.rows[0]?.tenant_id, null);

    const nullKind = await rawResolve(db, null, keyHash);
    assert.equal(nullKind.fields.length, 1);
    assert.equal(nullKind.rows[0]?.tenant_id, null);

    const wildcard = await rawResolve(db, "%", keyHash);
    assert.equal(wildcard.fields.length, 1);
    assert.equal(wildcard.rows[0]?.tenant_id, null);

    const shortHash = await rawResolve(db, "session", Buffer.alloc(31));
    assert.equal(shortHash.fields.length, 1);
    assert.equal(shortHash.rows[0]?.tenant_id, null);
  } finally {
    await db.close();
  }
});

test("C-f6d2db43 a tenant session sees only its own tenant row", async () => {
  const db = await withTestDatabase();
  try {
    await assertTenancyObjects(db.ownerPool);
    await insertTwoTenants(db);

    const select =
      "SELECT tenant_id, name, review_profile, mintkey_tenant_uuid FROM ursitoare.tenant";
    const asA = await queryAsTenant<{
      tenant_id: string;
      name: string;
      review_profile: string;
      mintkey_tenant_uuid: string | null;
    }>(db, "tenant_a", select);
    assert.deepEqual(asA.rows, [
      {
        tenant_id: "tenant_a",
        name: "Tenant A",
        review_profile: "solo",
        mintkey_tenant_uuid: null,
      },
    ]);

    const asB = await queryAsTenant<{
      tenant_id: string;
      name: string;
      review_profile: string;
      mintkey_tenant_uuid: string | null;
    }>(db, "tenant_b", select);
    assert.deepEqual(asB.rows, [
      {
        tenant_id: "tenant_b",
        name: "Tenant B",
        review_profile: "solo",
        mintkey_tenant_uuid: null,
      },
    ]);

    const owner = await db.ownerPool.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM ursitoare.tenant ORDER BY tenant_id",
    );
    assert.deepEqual(
      owner.rows.map((row) => row.tenant_id),
      ["tenant_a", "tenant_b"],
    );

    const policy = await oneRow(
      db.ownerPool.query<{ rls: boolean; qual: string | null; check: string | null }>(
        `SELECT c.relrowsecurity AS rls,
                pg_get_expr(p.polqual, p.polrelid) AS qual,
                pg_get_expr(p.polwithcheck, p.polrelid) AS check
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           JOIN pg_policy p ON p.polrelid = c.oid
          WHERE n.nspname = 'ursitoare' AND c.relname = 'tenant'`,
      ),
    );
    assert.equal(policy.rls, true);
    assert.ok(policy.qual !== null && policy.qual.includes("app.tenant_id"));
    assert.ok(policy.check !== null && policy.check.includes("app.tenant_id"));
  } finally {
    await db.close();
  }
});

test("C-96d545df the app role can only read tenants", async () => {
  const db = await withTestDatabase();
  try {
    await assertTenancyObjects(db.ownerPool);
    await insertTwoTenants(db);

    await assert.rejects(
      queryAsTenant(db, "tenant_a", "UPDATE ursitoare.tenant SET name = 'x'"),
      { code: "42501" },
    );
    await assert.rejects(
      queryAsTenant(
        db,
        "tenant_a",
        "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'C')",
      ),
      { code: "42501" },
    );
    await assert.rejects(queryAsTenant(db, "tenant_a", "DELETE FROM ursitoare.tenant"), {
      code: "42501",
    });

    const owner = await db.ownerPool.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM ursitoare.tenant ORDER BY tenant_id",
    );
    assert.deepEqual(
      owner.rows.map((row) => row.tenant_id),
      ["tenant_a", "tenant_b"],
    );
  } finally {
    await db.close();
  }
});
