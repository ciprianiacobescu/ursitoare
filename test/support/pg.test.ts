import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, test } from "node:test";

import pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import {
  TestClusterError,
  startCluster,
  withTestDatabase,
  type Cluster,
  type TestCluster,
} from "./pg.ts";

const OWNER_PASSWORD = "owner-test-pw";
const APP_PASSWORD = "app-test-pw";
const TEMPLATE = "ursitoare_test_template";
const CHECKSUM = "a".repeat(64);

let cluster: Cluster | undefined;
let shared: TestCluster | undefined;

async function resolved<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

async function ensureCluster(): Promise<TestCluster> {
  if (shared !== undefined) {
    return shared;
  }

  cluster = await startCluster();

  const admin = new pg.Client({ connectionString: cluster.adminUrl });
  await admin.connect();
  try {
    await admin.query(
      `CREATE ROLE ursitoare_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${OWNER_PASSWORD}'`,
    );
    await admin.query(
      `CREATE ROLE ursitoare_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${APP_PASSWORD}'`,
    );
    await admin.query(`CREATE DATABASE ${TEMPLATE} OWNER ursitoare_owner`);
  } finally {
    await admin.end();
  }

  const owner = new pg.Client({
    connectionString: databaseUrl(cluster, "ursitoare_owner", OWNER_PASSWORD, TEMPLATE),
  });
  await owner.connect();
  try {
    await owner.query("CREATE SCHEMA ursitoare AUTHORIZATION ursitoare_owner");
    await owner.query("GRANT USAGE ON SCHEMA ursitoare TO ursitoare_app");
    await owner.query("CREATE TABLE ursitoare.marker (id integer)");
    await owner.query(
      `CREATE TABLE ursitoare.schema_migration (
        version integer PRIMARY KEY CHECK (version > 0),
        name text NOT NULL,
        checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
        applied_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await owner.query(
      "INSERT INTO ursitoare.schema_migration (version, name, checksum) VALUES (1, 'base', $1)",
      [CHECKSUM],
    );
  } finally {
    await owner.end();
  }

  shared = {
    host: cluster.host,
    port: cluster.port,
    adminUrl: cluster.adminUrl,
    ownerPassword: OWNER_PASSWORD,
    appPassword: APP_PASSWORD,
    template: TEMPLATE,
  };
  return shared;
}

function databaseUrl(endpoint: { host: string; port: number }, role: string, password: string, database: string): string {
  return `postgres://${role}:${password}@${endpoint.host}:${endpoint.port}/${database}`;
}

function adminUrlFor(testCluster: TestCluster, database: string): string {
  const url = new URL(testCluster.adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row, "the query returns one row");
  return row;
}

async function databaseExists(testCluster: TestCluster, name: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: testCluster.adminUrl });
  await client.connect();
  try {
    const { rows } = await client.query<{ present: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS present",
      [name],
    );
    return rows[0]?.present ?? false;
  } finally {
    await client.end();
  }
}

after(async () => {
  if (cluster !== undefined) {
    await cluster.stop();
  }
});

test("C-6d9f36e4 withTestDatabase clones fresh isolated databases with owner and app pools", async () => {
  const testCluster = await resolved(ensureCluster);
  const first = await resolved(() => withTestDatabase({ cluster: testCluster }));
  const second = await resolved(() => withTestDatabase({ cluster: testCluster }));

  try {
    assert.notEqual(first.name, second.name);

    assert.equal(decodeURIComponent(new URL(first.ownerUrl).password), OWNER_PASSWORD);
    assert.equal(decodeURIComponent(new URL(first.appUrl).password), APP_PASSWORD);

    assert.ok(first.ownerEndpoint.password);
    assert.equal(first.ownerEndpoint.password.reveal(), OWNER_PASSWORD);
    assert.equal(new URL(first.ownerEndpoint.url).password, "");
    assert.ok(first.appEndpoint.password);
    assert.equal(first.appEndpoint.password.reveal(), APP_PASSWORD);
    assert.equal(new URL(first.appEndpoint.url).password, "");

    const owner = await oneRow(first.ownerPool.query<{ current_user: string }>("SELECT current_user"));
    assert.equal(owner.current_user, "ursitoare_owner");

    const app = await oneRow(second.appPool.query<{ current_user: string }>("SELECT current_user"));
    assert.equal(app.current_user, "ursitoare_app");

    for (const database of [first, second]) {
      const ledger = await database.ownerPool.query<{ version: number; name: string }>(
        "SELECT version, name FROM ursitoare.schema_migration ORDER BY version",
      );
      assert.equal(ledger.rows.length, 1);
      assert.equal(ledger.rows[0]?.version, 1);
      assert.equal(ledger.rows[0]?.name, "base");
    }

    await first.ownerPool.query("CREATE TABLE ursitoare.only_here (id integer)");
    const absent = await oneRow(
      second.ownerPool.query<{ present: boolean }>(
        "SELECT to_regclass('ursitoare.only_here') IS NOT NULL AS present",
      ),
    );
    assert.equal(absent.present, false);
  } finally {
    await first.close();
    await first.close();
    await second.close();
  }

  assert.equal(await databaseExists(testCluster, first.name), false);
  assert.equal(await databaseExists(testCluster, second.name), false);
});

test("C-6d9f36e4 migrated false has no schema while the default clone does", async () => {
  const testCluster = await resolved(ensureCluster);
  const migrated = await resolved(() => withTestDatabase({ cluster: testCluster }));
  const bare = await resolved(() => withTestDatabase({ migrated: false, cluster: testCluster }));

  try {
    const present = await oneRow(
      migrated.ownerPool.query<{ schema: string | null }>(
        "SELECT to_regnamespace('ursitoare')::text AS schema",
      ),
    );
    assert.equal(present.schema, "ursitoare");

    const absent = await oneRow(
      bare.ownerPool.query<{ schema: string | null }>(
        "SELECT to_regnamespace('ursitoare')::text AS schema",
      ),
    );
    assert.equal(absent.schema, null);
  } finally {
    await migrated.close();
    await bare.close();
  }
});

test("C-6d9f36e4 eight databases run in parallel and all drop on close", async () => {
  const testCluster = await resolved(ensureCluster);
  const databases = await resolved(() =>
    Promise.all(Array.from({ length: 8 }, () => withTestDatabase({ cluster: testCluster }))),
  );

  try {
    assert.equal(new Set(databases.map((database) => database.name)).size, 8);
    for (const database of databases) {
      const ledger = await oneRow(
        database.ownerPool.query<{ ledger: string | null }>(
          "SELECT to_regclass('ursitoare.schema_migration')::text AS ledger",
        ),
      );
      assert.equal(ledger.ledger, "ursitoare.schema_migration");
    }
  } finally {
    await Promise.all(databases.map((database) => database.close()));
  }

  for (const database of databases) {
    assert.equal(await databaseExists(testCluster, database.name), false);
  }
});

test("C-081c5cff the app pool is subject to row level security", async () => {
  const testCluster = await resolved(ensureCluster);
  const database = await resolved(() => withTestDatabase({ cluster: testCluster }));

  try {
    await database.ownerPool.query("CREATE TABLE ursitoare.rls_probe (tenant_id text)");
    await database.ownerPool.query("INSERT INTO ursitoare.rls_probe (tenant_id) VALUES ('a'), ('b')");
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

    const admin = new pg.Client({ connectionString: adminUrlFor(testCluster, database.name) });
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

test("C-f2409274 startCluster refuses a busy port and removes its data directory", async () => {
  const testCluster = await resolved(ensureCluster);

  await assert.rejects(
    async () => startCluster({ port: testCluster.port }),
    (error: unknown) => {
      assert.ok(error instanceof TestClusterError);
      assert.equal(error.code, "TEST_CLUSTER_START_FAILED");
      assert.match(error.message, new RegExp(String(testCluster.port)));
      const dataDir = error.dataDir;
      assert.ok(dataDir, "the failure names the data directory");
      assert.equal(existsSync(dataDir), false);
      return true;
    },
  );
});

test("C-f2409274 withTestDatabase needs TEST_PG_CLUSTER when no cluster is given", async () => {
  const saved = process.env.TEST_PG_CLUSTER;
  delete process.env.TEST_PG_CLUSTER;

  try {
    await assert.rejects(
      async () => withTestDatabase(),
      (error: unknown) => {
        assert.ok(error instanceof TestClusterError);
        assert.equal(error.code, "TEST_CLUSTER_MISSING");
        assert.match(error.message, /pnpm run test/);
        return true;
      },
    );
  } finally {
    if (saved === undefined) {
      delete process.env.TEST_PG_CLUSTER;
    } else {
      process.env.TEST_PG_CLUSTER = saved;
    }
  }
});
