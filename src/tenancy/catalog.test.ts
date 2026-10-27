import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";

import pg from "pg";

import type { TestDatabase } from "../../test/support/pg.ts";
import { readTestCluster, withTestDatabase } from "../../test/support/pg.ts";
import { CATALOG_GLOBAL_TABLES, checkTenancyCatalog, type CatalogViolation } from "./index.ts";

const TENANT_PREDICATE = "tenant_id = current_setting('app.tenant_id', true)";

const probeRoles: string[] = [];

interface RoleNames {
  group: string;
  member: string;
}

function newProbeRoles(): RoleNames {
  const hex = randomBytes(6).toString("hex");
  return { group: `probe_grp_${hex}`, member: `probe_${hex}` };
}

async function createProbeRoles(names: RoleNames): Promise<void> {
  const client = new pg.Client({ connectionString: readTestCluster().adminUrl });
  await client.connect();
  try {
    await client.query(`CREATE ROLE "${names.group}"`);
    await client.query(`CREATE ROLE "${names.member}"`);
    await client.query(`GRANT "${names.group}" TO "${names.member}"`);
  } finally {
    await client.end();
  }
  probeRoles.push(names.member, names.group);
}

after(async () => {
  if (probeRoles.length === 0) {
    return;
  }
  const client = new pg.Client({ connectionString: readTestCluster().adminUrl });
  await client.connect();
  try {
    for (const role of probeRoles) {
      await client.query(`DROP ROLE IF EXISTS "${role}"`);
    }
  } finally {
    await client.end();
  }
});

function sortViolations(violations: CatalogViolation[]): CatalogViolation[] {
  return [...violations].sort((left, right) => {
    if (left.rule !== right.rule) {
      return left.rule < right.rule ? -1 : 1;
    }
    if (left.object !== right.object) {
      return left.object < right.object ? -1 : 1;
    }
    return 0;
  });
}

async function addTenantPolicy(db: TestDatabase, table: string): Promise<void> {
  await db.ownerPool.query(
    `CREATE POLICY ${table}_isolation ON ursitoare.${table}
       USING (${TENANT_PREDICATE})
       WITH CHECK (${TENANT_PREDICATE})`,
  );
}

async function enableForcedRls(db: TestDatabase, table: string): Promise<void> {
  await db.ownerPool.query(`ALTER TABLE ursitoare.${table} ENABLE ROW LEVEL SECURITY`);
  await db.ownerPool.query(`ALTER TABLE ursitoare.${table} FORCE ROW LEVEL SECURITY`);
}

async function createCompliantTable(
  db: TestDatabase,
  table: string,
  extra = "",
): Promise<void> {
  await db.ownerPool.query(
    `CREATE TABLE ursitoare.${table} (
       tenant_id text NOT NULL,
       id text NOT NULL,
       email text,
       ok_id text,
       other_tenant text,
       PRIMARY KEY (tenant_id, id)${extra})`,
  );
  await enableForcedRls(db, table);
  await addTenantPolicy(db, table);
}

async function violationsOf(
  db: TestDatabase,
  opts?: { appRole?: string },
): Promise<CatalogViolation[]> {
  let violations: CatalogViolation[] = [];
  await assert.doesNotReject(async () => {
    violations = await checkTenancyCatalog(db.ownerPool, opts);
  });
  return violations;
}

test("C-7a21b515 the migrated database is clean", async () => {
  const db = await withTestDatabase();
  try {
    const violations = await violationsOf(db);
    assert.deepEqual(violations, []);
    assert.deepEqual(CATALOG_GLOBAL_TABLES, ["schema_migration", "tenant", "tenant_route"]);
  } finally {
    await db.close();
  }
});

test("C-be7b9eeb each broken object is reported", async () => {
  const db = await withTestDatabase();
  try {
    await createCompliantTable(db, "ok_t");

    await createCompliantTable(
      db,
      "ok_child",
      `, CONSTRAINT ok_child_tenant_fkey FOREIGN KEY (tenant_id, ok_id)
         REFERENCES ursitoare.ok_t (tenant_id, id)`,
    );

    await db.ownerPool.query(
      `CREATE TABLE ursitoare.ok_part (
         tenant_id text NOT NULL,
         id text NOT NULL,
         email text,
         ok_id text,
         other_tenant text,
         PRIMARY KEY (tenant_id, id)) PARTITION BY LIST (tenant_id)`,
    );
    await db.ownerPool.query(
      "CREATE TABLE ursitoare.ok_part_a PARTITION OF ursitoare.ok_part FOR VALUES IN ('tenant_a')",
    );
    await enableForcedRls(db, "ok_part");
    await addTenantPolicy(db, "ok_part");

    await db.ownerPool.query(
      `CREATE TABLE ursitoare.ok_and (
         tenant_id text NOT NULL,
         id text NOT NULL,
         email text,
         ok_id text,
         other_tenant text,
         PRIMARY KEY (tenant_id, id))`,
    );
    await enableForcedRls(db, "ok_and");
    await db.ownerPool.query(
      `CREATE POLICY ok_and_isolation ON ursitoare.ok_and
         USING (${TENANT_PREDICATE} AND email <> '')
         WITH CHECK (${TENANT_PREDICATE})`,
    );

    await db.ownerPool.query(
      `CREATE TABLE ursitoare.bad_pk (
         tenant_id text NOT NULL,
         id text NOT NULL,
         email text,
         ok_id text,
         other_tenant text,
         PRIMARY KEY (id))`,
    );
    await enableForcedRls(db, "bad_pk");
    await addTenantPolicy(db, "bad_pk");

    await db.ownerPool.query(
      `CREATE TABLE ursitoare.bad_open (
         tenant_id text NOT NULL,
         id text NOT NULL,
         email text,
         ok_id text,
         other_tenant text,
         PRIMARY KEY (tenant_id, id))`,
    );

    await createCompliantTable(db, "bad_policy");
    await db.ownerPool.query(
      `CREATE POLICY bad_policy_open ON ursitoare.bad_policy USING (true)`,
    );

    await createCompliantTable(db, "bad_weak");
    await db.ownerPool.query(
      "DROP POLICY bad_weak_isolation ON ursitoare.bad_weak",
    );
    await db.ownerPool.query(
      `CREATE POLICY bad_weak_open ON ursitoare.bad_weak
         USING (current_setting('app.tenant_id', true) IS NOT NULL)`,
    );

    await createCompliantTable(db, "bad_or");
    await db.ownerPool.query("DROP POLICY bad_or_isolation ON ursitoare.bad_or");
    await db.ownerPool.query(
      `CREATE POLICY bad_or_open ON ursitoare.bad_or USING (${TENANT_PREDICATE} OR true)`,
    );

    await createCompliantTable(db, "bad_extra");
    await db.ownerPool.query(
      "CREATE POLICY open ON ursitoare.bad_extra USING (true)",
    );

    await createCompliantTable(db, "bad_check");
    await db.ownerPool.query("DROP POLICY bad_check_isolation ON ursitoare.bad_check");
    await db.ownerPool.query(
      `CREATE POLICY bad_check_isolation ON ursitoare.bad_check
         USING (${TENANT_PREDICATE})
         WITH CHECK (true)`,
    );

    await createCompliantTable(
      db,
      "bad_unique",
      ", CONSTRAINT bad_unique_email_key UNIQUE (email)",
    );

    await createCompliantTable(
      db,
      "bad_fk",
      `, CONSTRAINT bad_fk_scope FOREIGN KEY (other_tenant, ok_id)
         REFERENCES ursitoare.ok_t (tenant_id, id)`,
    );

    await createCompliantTable(
      db,
      "bad_swap",
      `, CONSTRAINT bad_swap_fkey FOREIGN KEY (tenant_id, ok_id)
         REFERENCES ursitoare.ok_t (id, tenant_id)`,
    );

    const violations = await violationsOf(db);
    assert.deepEqual(
      violations,
      sortViolations([
        { rule: "fk_not_tenant_scoped", object: "ursitoare.bad_fk_scope" },
        { rule: "fk_not_tenant_scoped", object: "ursitoare.bad_swap_fkey" },
        { rule: "no_tenant_policy", object: "ursitoare.bad_check" },
        { rule: "no_tenant_policy", object: "ursitoare.bad_extra" },
        { rule: "no_tenant_policy", object: "ursitoare.bad_open" },
        { rule: "no_tenant_policy", object: "ursitoare.bad_or" },
        { rule: "no_tenant_policy", object: "ursitoare.bad_policy" },
        { rule: "no_tenant_policy", object: "ursitoare.bad_weak" },
        { rule: "not_tenant_leading", object: "ursitoare.bad_pk" },
        { rule: "rls_not_enabled", object: "ursitoare.bad_open" },
        { rule: "rls_not_forced", object: "ursitoare.bad_open" },
        {
          rule: "unique_not_tenant_leading",
          object: "ursitoare.bad_unique_email_key",
        },
      ]),
    );
  } finally {
    await db.close();
  }
});

test("C-5d0424c6 a table with no key or no tenant column is reported", async () => {
  const db = await withTestDatabase();
  try {
    await db.ownerPool.query(
      `CREATE TABLE ursitoare.bad_nopk (
         tenant_id text NOT NULL,
         id text NOT NULL)`,
    );
    await enableForcedRls(db, "bad_nopk");
    await addTenantPolicy(db, "bad_nopk");

    await db.ownerPool.query(
      `CREATE TABLE ursitoare.bad_notid (
         id text PRIMARY KEY,
         email text,
         parent text,
         CONSTRAINT bad_notid_email_key UNIQUE (email),
         CONSTRAINT bad_notid_parent_fk FOREIGN KEY (parent)
           REFERENCES ursitoare.bad_notid (id))`,
    );
    await enableForcedRls(db, "bad_notid");
    await db.ownerPool.query(
      `CREATE POLICY bad_notid_open ON ursitoare.bad_notid
         USING (current_setting('app.tenant_id', true) IS NOT NULL)`,
    );

    const violations = await violationsOf(db);
    assert.deepEqual(
      violations,
      sortViolations([
        { rule: "fk_not_tenant_scoped", object: "ursitoare.bad_notid_parent_fk" },
        { rule: "no_tenant_policy", object: "ursitoare.bad_notid" },
        { rule: "not_tenant_leading", object: "ursitoare.bad_nopk" },
        { rule: "not_tenant_leading", object: "ursitoare.bad_notid" },
        {
          rule: "unique_not_tenant_leading",
          object: "ursitoare.bad_notid_email_key",
        },
      ]),
    );
  } finally {
    await db.close();
  }
});

test("C-0c61db8f a policy for the app role or its group counts", async () => {
  const names = newProbeRoles();
  await createProbeRoles(names);
  const db = await withTestDatabase();
  try {
    await createCompliantTable(db, "bad_app");
    await db.ownerPool.query(
      "CREATE POLICY open_app ON ursitoare.bad_app TO ursitoare_app USING (true)",
    );

    await createCompliantTable(db, "bad_grp");
    await db.ownerPool.query(
      `CREATE POLICY open_grp ON ursitoare.bad_grp TO "${names.group}" USING (true)`,
    );

    assert.deepEqual(await violationsOf(db), [
      { rule: "no_tenant_policy", object: "ursitoare.bad_app" },
    ]);
    assert.deepEqual(await violationsOf(db, { appRole: names.member }), [
      { rule: "no_tenant_policy", object: "ursitoare.bad_grp" },
    ]);
  } finally {
    await db.close();
  }
});
