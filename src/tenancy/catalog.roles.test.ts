import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";

import pg from "pg";

import { readTestCluster, withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { checkTenancyCatalog, type CatalogViolation } from "./index.ts";

const TENANT_PREDICATE = "tenant_id = current_setting('app.tenant_id', true)";

interface CatalogOptions {
  appRole?: string;
  ownerRole?: string;
}

interface ProbeRoles {
  ownerMember: string;
  bypassMember: string;
  bypassGroup: string;
}

const createdRoles: string[] = [];

function databaseAdminUrl(db: TestDatabase): string {
  const url = new URL(readTestCluster().adminUrl);
  url.pathname = `/${db.name}`;
  return url.toString();
}

function assertIncludes(violations: CatalogViolation[], expected: CatalogViolation): void {
  assert.ok(
    violations.some(
      (violation) => violation.rule === expected.rule && violation.object === expected.object,
    ),
    `expected ${expected.rule} for ${expected.object}`,
  );
}

async function createCompliantPartitionedTable(db: TestDatabase, table: string): Promise<void> {
  await db.ownerPool.query(
    `CREATE TABLE ursitoare.${table} (
       tenant_id text NOT NULL,
       id text NOT NULL,
       PRIMARY KEY (tenant_id, id)) PARTITION BY LIST (tenant_id)`,
  );
  await db.ownerPool.query(`ALTER TABLE ursitoare.${table} ENABLE ROW LEVEL SECURITY`);
  await db.ownerPool.query(`ALTER TABLE ursitoare.${table} FORCE ROW LEVEL SECURITY`);
  await db.ownerPool.query(
    `CREATE POLICY ${table}_isolation ON ursitoare.${table}
       USING (${TENANT_PREDICATE})
       WITH CHECK (${TENANT_PREDICATE})`,
  );
}

async function createProbeRoles(): Promise<ProbeRoles> {
  const hex = randomBytes(6).toString("hex");
  const names: ProbeRoles = {
    ownerMember: `probe_own_${hex}`,
    bypassMember: `probe_byp_${hex}`,
    bypassGroup: `bypass_grp_${hex}`,
  };
  const client = new pg.Client({ connectionString: readTestCluster().adminUrl });
  await client.connect();
  try {
    await client.query(`CREATE ROLE "${names.ownerMember}" LOGIN`);
    await client.query(`CREATE ROLE "${names.bypassMember}" LOGIN`);
    await client.query(`CREATE ROLE "${names.bypassGroup}" NOLOGIN BYPASSRLS`);
    await client.query(`GRANT ursitoare_owner TO "${names.ownerMember}"`);
    await client.query(`GRANT "${names.bypassGroup}" TO "${names.bypassMember}"`);
  } finally {
    await client.end();
  }
  createdRoles.push(names.ownerMember, names.bypassMember, names.bypassGroup);
  return names;
}

after(async () => {
  if (createdRoles.length === 0) {
    return;
  }
  const client = new pg.Client({ connectionString: readTestCluster().adminUrl });
  await client.connect();
  try {
    for (const role of createdRoles) {
      await client.query(`DROP ROLE IF EXISTS "${role}"`);
    }
  } finally {
    await client.end();
  }
});

test("C-f9e36a0c objects that open a hole are reported", async () => {
  const db = await withTestDatabase();
  const admin = new pg.Client({ connectionString: databaseAdminUrl(db) });
  try {
    await createCompliantPartitionedTable(db, "ok_part");
    await db.ownerPool.query(
      "CREATE TABLE ursitoare.ok_part_a PARTITION OF ursitoare.ok_part FOR VALUES IN ('tenant_a')",
    );
    await db.ownerPool.query("GRANT SELECT ON ursitoare.tenant_route TO ursitoare_app");
    await db.ownerPool.query("GRANT SELECT ON ursitoare.ok_part_a TO ursitoare_app");

    await db.ownerPool.query(
      "CREATE VIEW ursitoare.bad_view AS SELECT * FROM ursitoare.tenant",
    );
    await db.ownerPool.query("GRANT SELECT ON ursitoare.bad_view TO ursitoare_app");

    await db.ownerPool.query(
      "CREATE MATERIALIZED VIEW ursitoare.bad_mv AS SELECT * FROM ursitoare.bad_view",
    );
    await db.ownerPool.query("GRANT SELECT ON ursitoare.bad_mv TO ursitoare_app");

    await admin.connect();
    await admin.query("CREATE FOREIGN DATA WRAPPER probe_fdw");
    await admin.query("GRANT USAGE ON FOREIGN DATA WRAPPER probe_fdw TO ursitoare_owner");
    await db.ownerPool.query("CREATE SERVER probe_srv FOREIGN DATA WRAPPER probe_fdw");
    await db.ownerPool.query(
      "CREATE FOREIGN TABLE ursitoare.bad_ft (x text) SERVER probe_srv",
    );
    await db.ownerPool.query("GRANT SELECT ON ursitoare.bad_ft TO ursitoare_app");

    await db.ownerPool.query(
      "CREATE VIEW ursitoare.ok_view WITH (security_invoker = true) AS SELECT * FROM ursitoare.tenant",
    );
    await db.ownerPool.query("GRANT SELECT ON ursitoare.ok_view TO ursitoare_app");

    await db.ownerPool.query(
      "CREATE FUNCTION ursitoare.bad_fn() RETURNS integer LANGUAGE sql SECURITY DEFINER AS $fn$ SELECT 1 $fn$",
    );
    await db.ownerPool.query(
      "CREATE FUNCTION ursitoare.bad_fn_path() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = ursitoare AS $fn$ SELECT 1 $fn$",
    );
    await db.ownerPool.query(
      "CREATE FUNCTION ursitoare.bad_fn_public() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$ SELECT 1 $fn$",
    );
    await db.ownerPool.query(
      "CREATE FUNCTION ursitoare.bad_fn_exec() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$ SELECT 1 $fn$",
    );
    await db.ownerPool.query(
      "GRANT EXECUTE ON FUNCTION ursitoare.bad_fn_exec() TO PUBLIC",
    );

    const violations = await checkTenancyCatalog(db.ownerPool);
    assert.deepEqual(violations, [
      { rule: "definer_function_unsafe", object: "ursitoare.bad_fn()" },
      { rule: "definer_function_unsafe", object: "ursitoare.bad_fn_exec()" },
      { rule: "definer_function_unsafe", object: "ursitoare.bad_fn_path()" },
      { rule: "definer_function_unsafe", object: "ursitoare.bad_fn_public()" },
      { rule: "partition_open_to_app", object: "ursitoare.ok_part_a" },
      { rule: "route_table_open", object: "ursitoare.tenant_route" },
      { rule: "view_open_to_app", object: "ursitoare.bad_ft" },
      { rule: "view_open_to_app", object: "ursitoare.bad_mv" },
      { rule: "view_open_to_app", object: "ursitoare.bad_view" },
    ]);
  } finally {
    await admin.end().catch(() => undefined);
    await db.close();
  }
});

test("C-58a3293a a definer function of another owner is unsafe", async () => {
  const db = await withTestDatabase();
  const foreignOwner: CatalogOptions = { ownerRole: "postgres" };
  try {
    const violations = await checkTenancyCatalog(db.ownerPool, foreignOwner);
    assert.deepEqual(violations, [
      {
        rule: "definer_function_unsafe",
        object: "ursitoare.register_tenant_route(p_kind text, p_key_hash bytea)",
      },
      {
        rule: "definer_function_unsafe",
        object: "ursitoare.resolve_tenant(p_kind text, p_key_hash bytea)",
      },
      {
        rule: "definer_function_unsafe",
        object: "ursitoare.unregister_tenant_route(p_kind text, p_key_hash bytea)",
      },
    ]);
  } finally {
    await db.close();
  }
});

test("C-ae959f29 the real role and probe roles are checked", async () => {
  const probes = await createProbeRoles();
  const db = await withTestDatabase();
  try {
    assert.deepEqual(await checkTenancyCatalog(db.ownerPool), []);

    assertIncludes(await checkTenancyCatalog(db.ownerPool, { appRole: "postgres" }), {
      rule: "app_role_privileged",
      object: "postgres",
    });

    assertIncludes(await checkTenancyCatalog(db.ownerPool, { appRole: "ursitoare_owner" }), {
      rule: "app_role_owns_relation",
      object: "ursitoare_owner",
    });

    assert.deepEqual(await checkTenancyCatalog(db.ownerPool, { appRole: "no_such_role" }), [
      { rule: "app_role_missing", object: "no_such_role" },
    ]);

    assertIncludes(await checkTenancyCatalog(db.ownerPool, { appRole: probes.ownerMember }), {
      rule: "app_role_privileged",
      object: probes.ownerMember,
    });

    assertIncludes(await checkTenancyCatalog(db.ownerPool, { appRole: probes.bypassMember }), {
      rule: "app_role_privileged",
      object: probes.bypassMember,
    });
  } finally {
    await db.close();
  }
});
