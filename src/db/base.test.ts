import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";

import pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import {
  DEFAULT_MIGRATIONS_DIR,
  ROLE_APP,
  ROLE_OWNER,
  createPool,
  ensureRoles,
  migrate,
  readMigrationFiles,
  type EndpointLike,
} from "./index.ts";
import {
  startCluster,
  withTestDatabase,
  type Cluster,
  type TestCluster,
  type TestDatabase,
} from "../../test/support/pg.ts";

const OWNER_PASSWORD = "base-owner-pw";
const APP_PASSWORD = "base-app-pw";
const TEMPLATE = "ursitoare_template";
const BASE_FILE = "0001_base.sql";

let cluster: Cluster | undefined;
let adminPool: pg.Pool | undefined;
let shared: TestCluster | undefined;

function ownerEndpoint(current: Cluster, database: string): EndpointLike {
  return {
    url: `postgres://${ROLE_OWNER}@${current.host}:${current.port}/${database}`,
    password: { reveal: () => OWNER_PASSWORD },
  };
}

before(async () => {
  const started = await startCluster();
  cluster = started;
  adminPool = createPool(started.adminUrl, { max: 4 });
  await ensureRoles(adminPool, {
    ownerPassword: OWNER_PASSWORD,
    appPassword: APP_PASSWORD,
  });
  await adminPool.query(`CREATE DATABASE "${TEMPLATE}" OWNER ${ROLE_OWNER}`);
  assert.ok(
    existsSync(join(DEFAULT_MIGRATIONS_DIR, BASE_FILE)),
    `the base migration ${BASE_FILE} exists`,
  );

  const ownerPool = createPool(ownerEndpoint(started, TEMPLATE), { max: 2 });
  try {
    await migrate(ownerPool);
  } finally {
    await ownerPool.end();
  }

  shared = {
    host: started.host,
    port: started.port,
    adminUrl: started.adminUrl,
    ownerPassword: OWNER_PASSWORD,
    appPassword: APP_PASSWORD,
    template: TEMPLATE,
  };
});

after(async () => {
  await adminPool?.end().catch(() => undefined);
  await cluster?.stop().catch(() => undefined);
});

function runningCluster(): Cluster {
  assert.ok(cluster !== undefined, "the test cluster is running");
  return cluster;
}

function testCluster(): TestCluster {
  assert.ok(shared !== undefined, "the test cluster coordinates are published");
  return shared;
}

async function freshDatabase(): Promise<TestDatabase> {
  return withTestDatabase({ cluster: testCluster() });
}

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row, "the query returns one row");
  return row;
}

async function assertBasePresent(database: TestDatabase): Promise<void> {
  assert.ok(
    existsSync(join(DEFAULT_MIGRATIONS_DIR, BASE_FILE)),
    `the base migration ${BASE_FILE} exists`,
  );
  const ledger = await oneRow(
    database.ownerPool.query<{ ledger: string | null }>(
      "SELECT to_regclass('ursitoare.schema_migration')::text AS ledger",
    ),
  );
  assert.equal(ledger.ledger, "ursitoare.schema_migration");
}

function adminUrlFor(database: string): string {
  const url = new URL(runningCluster().adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

test("C-d4c6bb53 the base migration records the ledger and keeps objects owned by the owner role", async () => {
  const database = await freshDatabase();

  try {
    await assertBasePresent(database);

    const files = await readMigrationFiles(DEFAULT_MIGRATIONS_DIR);
    const ledger = await database.ownerPool.query<{
      version: number;
      name: string;
      checksum: string;
    }>("SELECT version, name, checksum FROM ursitoare.schema_migration ORDER BY version");
    assert.deepEqual(
      ledger.rows,
      files.map((file) => ({
        version: file.version,
        name: file.name,
        checksum: file.checksum,
      })),
    );

    const base = files.find((file) => file.file === BASE_FILE);
    assert.ok(base !== undefined, "the base migration is in the default directory");
    assert.equal(base.version, 1);
    assert.equal(base.name, "base");
    const bytes = readFileSync(join(DEFAULT_MIGRATIONS_DIR, BASE_FILE));
    assert.equal(base.checksum, createHash("sha256").update(bytes).digest("hex"));

    const owner = await oneRow(
      database.ownerPool.query<{ owner: string }>(
        "SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname = 'ursitoare'",
      ),
    );
    assert.equal(owner.owner, ROLE_OWNER);

    const catalogOwners = [
      ["pg_class", "relowner"],
      ["pg_namespace", "nspowner"],
      ["pg_proc", "proowner"],
      ["pg_type", "typowner"],
    ] as const;
    for (const [catalog, column] of catalogOwners) {
      const owned = await oneRow(
        database.ownerPool.query<{ count: string }>(
          `SELECT count(*)::text AS count
             FROM ${catalog} c
             JOIN pg_roles r ON r.oid = c.${column}
            WHERE r.rolname = $1`,
          [ROLE_APP],
        ),
      );
      assert.equal(owned.count, "0", `${ROLE_APP} owns no row of ${catalog}`);
    }
  } finally {
    await database.close();
  }
});

test("C-e3e42ffe the app role has only USAGE on the schema", async () => {
  const database = await freshDatabase();

  try {
    await assertBasePresent(database);

    await assert.rejects(
      database.appPool.query("SELECT * FROM ursitoare.schema_migration"),
      { code: "42501" },
    );
    await assert.rejects(
      database.appPool.query("UPDATE ursitoare.schema_migration SET name = 'x'"),
      { code: "42501" },
    );
    await assert.rejects(
      database.appPool.query("DROP TABLE ursitoare.schema_migration"),
      { code: "42501" },
    );
    await assert.rejects(
      database.appPool.query("CREATE TABLE ursitoare.x (a int)"),
      { code: "42501" },
    );

    const usage = await oneRow(
      database.appPool.query<{ usage: boolean }>(
        "SELECT has_schema_privilege('ursitoare_app', 'ursitoare', 'USAGE') AS usage",
      ),
    );
    assert.equal(usage.usage, true);

    const session = await oneRow(
      database.appPool.query<{
        user: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
      }>(
        `SELECT current_user AS user, r.rolsuper, r.rolbypassrls
           FROM pg_roles r
          WHERE r.rolname = current_user`,
      ),
    );
    assert.equal(session.user, ROLE_APP);
    assert.equal(session.rolsuper, false);
    assert.equal(session.rolbypassrls, false);
  } finally {
    await database.close();
  }
});

test("C-162b9c47 new functions and tables start closed to the app role", async () => {
  const database = await freshDatabase();

  try {
    await assertBasePresent(database);

    await database.ownerPool.query(
      "CREATE FUNCTION ursitoare.probe() RETURNS integer LANGUAGE sql AS 'SELECT 1'",
    );
    await database.ownerPool.query("CREATE TABLE ursitoare.probe_t (a integer)");

    const before = await oneRow(
      database.ownerPool.query<{ fn: boolean; table: boolean }>(
        `SELECT has_function_privilege('ursitoare_app', 'ursitoare.probe()', 'EXECUTE') AS fn,
                has_table_privilege('ursitoare_app', 'ursitoare.probe_t', 'SELECT') AS table`,
      ),
    );
    assert.equal(before.fn, false);
    assert.equal(before.table, false);

    await database.ownerPool.query(
      "GRANT EXECUTE ON FUNCTION ursitoare.probe() TO ursitoare_app",
    );
    await database.ownerPool.query("GRANT SELECT ON TABLE ursitoare.probe_t TO ursitoare_app");

    const after = await oneRow(
      database.ownerPool.query<{ fn: boolean; table: boolean }>(
        `SELECT has_function_privilege('ursitoare_app', 'ursitoare.probe()', 'EXECUTE') AS fn,
                has_table_privilege('ursitoare_app', 'ursitoare.probe_t', 'SELECT') AS table`,
      ),
    );
    assert.equal(after.fn, true);
    assert.equal(after.table, true);
  } finally {
    await database.close();
  }
});

test("C-081c5cff the app role is subject to forced row level security", async () => {
  const database = await freshDatabase();

  try {
    await assertBasePresent(database);

    await database.ownerPool.query("CREATE TABLE ursitoare.rls_probe (tenant_id text)");
    await database.ownerPool.query(
      "INSERT INTO ursitoare.rls_probe (tenant_id) VALUES ('a'), ('b')",
    );
    await database.ownerPool.query("ALTER TABLE ursitoare.rls_probe ENABLE ROW LEVEL SECURITY");
    await database.ownerPool.query("ALTER TABLE ursitoare.rls_probe FORCE ROW LEVEL SECURITY");
    await database.ownerPool.query(
      "CREATE POLICY tenant_isolation ON ursitoare.rls_probe USING (tenant_id = current_setting('app.tenant_id', true))",
    );
    await database.ownerPool.query("GRANT SELECT ON ursitoare.rls_probe TO ursitoare_app");

    const client = await database.appPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.tenant_id', $1, true)", ["a"]);
      const visible = await client.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM ursitoare.rls_probe ORDER BY tenant_id",
      );
      assert.deepEqual(visible.rows, [{ tenant_id: "a" }]);
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    const admin = new pg.Client({ connectionString: adminUrlFor(database.name) });
    await admin.connect();
    try {
      const all = await admin.query<{ tenant_id: string }>(
        "SELECT tenant_id FROM ursitoare.rls_probe ORDER BY tenant_id",
      );
      assert.deepEqual(all.rows, [{ tenant_id: "a" }, { tenant_id: "b" }]);
    } finally {
      await admin.end();
    }
  } finally {
    await database.close();
  }
});
