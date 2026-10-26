import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import { freePort, startCluster, type Cluster } from "../../test/support/pg.ts";
import { DbError, createPool, ensureRoles, migrate, type EndpointLike } from "./index.ts";

const OWNER = "ursitoare_owner";
const OWNER_PASSWORD = "migrate-owner-pw";
const APP_PASSWORD = "migrate-app-pw";
const DOWN_PASSWORD = "pw-Q9";
const LOCK_KEY = "hashtextextended('ursitoare:migrate', 0)";

let cluster: Cluster | undefined;
let adminPool: pg.Pool | undefined;
let sequence = 0;

before(async () => {
  cluster = await startCluster();
  adminPool = createPool(cluster.adminUrl, { max: 6 });
  await ensureRoles(adminPool, { ownerPassword: OWNER_PASSWORD, appPassword: APP_PASSWORD });
});

after(async () => {
  await adminPool?.end().catch(() => undefined);
  await cluster?.stop().catch(() => undefined);
});

function runningCluster(): Cluster {
  assert.ok(cluster !== undefined, "the test cluster is running");
  return cluster;
}

function admin(): pg.Pool {
  assert.ok(adminPool !== undefined, "the test cluster has an admin pool");
  return adminPool;
}

function sha256(bytes: string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function makeDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ursitoare-migrate-"));
}

async function resolved<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

async function rejectsWith(run: () => Promise<unknown>, code: string): Promise<DbError> {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof DbError, `expected a DbError, got ${String(error)}`);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`expected the call to reject with ${code}`);
}

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row, "the query returns one row");
  return row;
}

function adminUrlFor(database: string): string {
  const url = new URL(runningCluster().adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

function ownerEndpoint(database: string): EndpointLike {
  const current = runningCluster();
  return {
    url: `postgres://${OWNER}@${current.host}:${current.port}/${database}`,
    password: { reveal: () => OWNER_PASSWORD },
  };
}

async function createBareDatabase(label: string): Promise<{ name: string; pool: pg.Pool }> {
  sequence += 1;
  const name = `migrate_${label}_${process.pid}_${sequence}`;
  await admin().query(`CREATE DATABASE "${name}" OWNER ${OWNER}`);
  return { name, pool: createPool(ownerEndpoint(name), { max: 4, connectionTimeoutMs: 5000 }) };
}

async function dropDatabase(name: string): Promise<void> {
  await admin().query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
}

test("C-c664fa4c migrate applies files in order, repeats, extends and fills a gap", async () => {
  const dir = await makeDir();
  const gapDir = await makeDir();
  const main = await createBareDatabase("apply");
  const gap = await createBareDatabase("gap");
  const sql = {
    a: "CREATE TABLE widget (id int);\n",
    b: "CREATE TABLE widget_b (id int);\n",
    c: "CREATE TABLE widget_c (id int);\n",
    d: "CREATE TABLE widget_d (id int);\n",
  };

  try {
    await writeFile(join(dir, "0001_a.sql"), sql.a);
    await writeFile(join(dir, "0002_b.sql"), sql.b);
    await writeFile(join(dir, "0003_c.sql"), sql.c);

    assert.deepEqual(await resolved(() => migrate(main.pool, dir)), {
      applied: ["0001_a", "0002_b", "0003_c"],
    });
    assert.deepEqual(await resolved(() => migrate(main.pool, dir)), { applied: [] });

    await writeFile(join(dir, "0004_d.sql"), sql.d);
    assert.deepEqual(await resolved(() => migrate(main.pool, dir)), { applied: ["0004_d"] });

    const ledger = await main.pool.query<{
      version: number;
      name: string;
      checksum: string;
      applied_at: Date;
    }>("SELECT version, name, checksum, applied_at FROM ursitoare.schema_migration ORDER BY version");

    assert.deepEqual(
      ledger.rows.map((row) => row.version),
      [1, 2, 3, 4],
    );
    assert.deepEqual(
      ledger.rows.map((row) => row.name),
      ["a", "b", "c", "d"],
    );
    assert.deepEqual(
      ledger.rows.map((row) => row.checksum),
      [sha256(sql.a), sha256(sql.b), sha256(sql.c), sha256(sql.d)],
    );
    for (const row of ledger.rows) {
      assert.match(row.checksum, /^[0-9a-f]{64}$/);
      assert.ok(row.applied_at instanceof Date, "applied_at is recorded as a timestamp");
      assert.equal(Number.isNaN(row.applied_at.getTime()), false);
    }

    const widget = await oneRow(
      main.pool.query<{ name: string | null }>("SELECT to_regclass('ursitoare.widget')::text AS name"),
    );
    assert.equal(widget.name, "ursitoare.widget");

    await writeFile(join(gapDir, "0001_a.sql"), sql.a);
    await writeFile(join(gapDir, "0003_c.sql"), sql.c);
    assert.deepEqual(await resolved(() => migrate(gap.pool, gapDir)), {
      applied: ["0001_a", "0003_c"],
    });

    await writeFile(join(gapDir, "0002_b.sql"), sql.b);
    assert.deepEqual(await resolved(() => migrate(gap.pool, gapDir)), { applied: ["0002_b"] });

    const gapLedger = await gap.pool.query<{ version: number }>(
      "SELECT version FROM ursitoare.schema_migration ORDER BY version",
    );
    assert.deepEqual(
      gapLedger.rows.map((row) => row.version),
      [1, 2, 3],
    );
  } finally {
    await main.pool.end().catch(() => undefined);
    await gap.pool.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await rm(gapDir, { recursive: true, force: true });
    await dropDatabase(main.name);
    await dropDatabase(gap.name);
  }
});

test("C-4a57a001 a failing migration rolls back, releases the lock and stops", async () => {
  const dir = await makeDir();
  const database = await createBareDatabase("failure");
  const validFirst = "CREATE TABLE widget (id int);\n";
  const brokenSecond = "CREATE TABLE ursitoare.t (x int);\nSELECT 1/0;\n";
  const validThird = "CREATE TABLE widget_c (id int);\n";

  try {
    await writeFile(join(dir, "0001_a.sql"), validFirst);
    await writeFile(join(dir, "0002_b.sql"), brokenSecond);
    await writeFile(join(dir, "0003_c.sql"), validThird);

    const error = await rejectsWith(() => migrate(database.pool, dir), "MIGRATION_FAILED");
    assert.match(error.message, /^0002_b\.sql:/);
    assert.equal(error.details.sqlstate, "22012");

    const failedTable = await oneRow(
      database.pool.query<{ name: string | null }>("SELECT to_regclass('ursitoare.t')::text AS name"),
    );
    assert.equal(failedTable.name, null);

    const ledger = await database.pool.query<{ version: number }>(
      "SELECT version FROM ursitoare.schema_migration ORDER BY version",
    );
    assert.deepEqual(
      ledger.rows.map((row) => row.version),
      [1],
    );

    const other = new pg.Client({ connectionString: adminUrlFor(database.name) });
    await other.connect();
    try {
      const lock = await oneRow(
        other.query<{ locked: boolean }>(
          `SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`,
        ),
      );
      assert.equal(lock.locked, true, "the migration lock is free in another session");
      await other.query(`SELECT pg_advisory_unlock(${LOCK_KEY})`);
    } finally {
      await other.end();
    }

    await writeFile(join(dir, "0002_b.sql"), "CREATE TABLE ursitoare.t (x int);\n");
    assert.deepEqual(await resolved(() => migrate(database.pool, dir)), {
      applied: ["0002_b", "0003_c"],
    });

    const fixedTable = await oneRow(
      database.pool.query<{ name: string | null }>("SELECT to_regclass('ursitoare.t')::text AS name"),
    );
    assert.equal(fixedTable.name, "ursitoare.t");
  } finally {
    await database.pool.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await dropDatabase(database.name);
  }
});

test("C-2735b4ff C-c664fa4c migrate bootstraps an empty directory and applies a later file", async () => {
  const dir = await makeDir();
  const database = await createBareDatabase("empty");
  const validFirst = "CREATE TABLE widget (id int);\n";

  try {
    assert.deepEqual(await resolved(() => migrate(database.pool, dir)), { applied: [] });

    const emptyLedger = await oneRow(
      database.pool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM ursitoare.schema_migration",
      ),
    );
    assert.equal(emptyLedger.count, "0");

    await writeFile(join(dir, "0001_a.sql"), validFirst);
    assert.deepEqual(await resolved(() => migrate(database.pool, dir)), { applied: ["0001_a"] });

    const ledger = await database.pool.query<{
      version: number;
      name: string;
      checksum: string;
    }>("SELECT version, name, checksum FROM ursitoare.schema_migration");
    assert.deepEqual(ledger.rows, [{ version: 1, name: "a", checksum: sha256(validFirst) }]);

    const widget = await oneRow(
      database.pool.query<{ name: string | null }>("SELECT to_regclass('ursitoare.widget')::text AS name"),
    );
    assert.equal(widget.name, "ursitoare.widget");
  } finally {
    await database.pool.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await dropDatabase(database.name);
  }

  const downDir = await makeDir();
  await writeFile(join(downDir, "0001_a.sql"), validFirst);
  const port = await freePort();
  const downPool = createPool(
    {
      url: `postgres://postgres@127.0.0.1:${port}/postgres`,
      password: { reveal: () => DOWN_PASSWORD },
    },
    { max: 2, connectionTimeoutMs: 2000 },
  );

  try {
    const error = await rejectsWith(() => migrate(downPool, downDir), "DB_UNAVAILABLE");
    assert.equal(error.details.reason, "ECONNREFUSED");
    assert.equal(error.message.includes(DOWN_PASSWORD), false, "the message never holds the password");
  } finally {
    await downPool.end().catch(() => undefined);
    await rm(downDir, { recursive: true, force: true });
  }
});
