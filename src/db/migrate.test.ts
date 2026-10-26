import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
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

async function ledgerSignature(
  pool: pg.Pool,
): Promise<{ version: number; name: string; checksum: string }[]> {
  const result = await pool.query<{ version: number; name: string; checksum: string }>(
    "SELECT version, name, checksum FROM ursitoare.schema_migration ORDER BY version",
  );
  return result.rows;
}

async function assertNoSchema(pool: pg.Pool): Promise<void> {
  const row = await oneRow(
    pool.query<{ name: string | null }>("SELECT to_regnamespace('ursitoare')::text AS name"),
  );
  assert.equal(row.name, null, "no schema ursitoare is created");
}

function poolFor(cluster: Cluster, user: string, password: string, database: string): pg.Pool {
  return createPool(
    {
      url: `postgres://${user}@${cluster.host}:${cluster.port}/${database}`,
      password: { reveal: () => password },
    },
    { max: 2, connectionTimeoutMs: 5000 },
  );
}

function superUrlFor(cluster: Cluster, database: string): string {
  const url = new URL(cluster.adminUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

async function createDatabaseVia(
  adminPool: pg.Pool,
  label: string,
  sink: string[],
): Promise<string> {
  sequence += 1;
  const name = `migrate_${label}_${process.pid}_${sequence}`;
  await adminPool.query(`CREATE DATABASE "${name}" OWNER ${OWNER}`);
  sink.push(name);
  return name;
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

test("C-b2b0429a migrate refuses an edited missing renamed or emptied file set", async () => {
  const dir = await makeDir();
  const database = await createBareDatabase("tamper");
  const a = "CREATE TABLE widget (id int);\n";
  const b = "CREATE TABLE widget_b (id int);\n";
  const c = "CREATE TABLE widget_c (id int);\n";

  try {
    await writeFile(join(dir, "0001_a.sql"), a);
    await writeFile(join(dir, "0002_b.sql"), b);
    assert.deepEqual(await resolved(() => migrate(database.pool, dir)), {
      applied: ["0001_a", "0002_b"],
    });

    await writeFile(join(dir, "0003_c.sql"), c);
    const baseline = await ledgerSignature(database.pool);
    assert.deepEqual(
      baseline.map((row) => row.version),
      [1, 2],
    );

    await writeFile(join(dir, "0001_a.sql"), `${a}-- edited\n`);
    const edited = await rejectsWith(() => migrate(database.pool, dir), "MIGRATION_CHECKSUM_MISMATCH");
    assert.equal(edited.details.file, "0001_a.sql");
    assert.deepEqual(await ledgerSignature(database.pool), baseline, "the ledger is unchanged");

    await writeFile(join(dir, "0001_a.sql"), a);
    await rm(join(dir, "0002_b.sql"));
    const deleted = await rejectsWith(() => migrate(database.pool, dir), "MIGRATION_FILE_MISSING");
    assert.equal(deleted.details.version, 2);
    assert.deepEqual(await ledgerSignature(database.pool), baseline, "the ledger is unchanged");

    await writeFile(join(dir, "0002_b.sql"), b);
    await rename(join(dir, "0002_b.sql"), join(dir, "0002_z.sql"));
    const renamed = await rejectsWith(() => migrate(database.pool, dir), "MIGRATION_FILE_MISSING");
    assert.equal(renamed.details.version, 2);
    assert.deepEqual(await ledgerSignature(database.pool), baseline, "the ledger is unchanged");

    await rename(join(dir, "0002_z.sql"), join(dir, "0002_b.sql"));
    await rm(join(dir, "0001_a.sql"));
    await rm(join(dir, "0002_b.sql"));
    await rm(join(dir, "0003_c.sql"));
    const emptied = await rejectsWith(() => migrate(database.pool, dir), "MIGRATION_FILE_MISSING");
    assert.equal(emptied.details.version, 1);
    assert.deepEqual(await ledgerSignature(database.pool), baseline, "the ledger is unchanged");
  } finally {
    await database.pool.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await dropDatabase(database.name);
  }
});

test("C-77b8f169 two runners are serialised by the advisory lock", async () => {
  const dir = await makeDir();
  const database = await createBareDatabase("concurrent");
  const secondPool = createPool(ownerEndpoint(database.name), { max: 4, connectionTimeoutMs: 5000 });
  const sleepFile = "SELECT pg_sleep(0.05);\n";

  try {
    await writeFile(join(dir, "0001_a.sql"), sleepFile);
    await writeFile(join(dir, "0002_b.sql"), sleepFile);
    await writeFile(join(dir, "0003_c.sql"), sleepFile);

    const settled = await Promise.allSettled([
      migrate(database.pool, dir),
      migrate(secondPool, dir),
    ]);

    for (const result of settled) {
      assert.equal(result.status, "fulfilled", `both runners resolve: ${String(result)}`);
    }

    const lengths = settled
      .map((result) => (result.status === "fulfilled" ? result.value.applied.length : -1))
      .sort((left, right) => left - right);
    assert.deepEqual(lengths, [0, 3]);

    const ledger = await oneRow(
      database.pool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM ursitoare.schema_migration",
      ),
    );
    assert.equal(ledger.count, "3");
  } finally {
    await database.pool.end().catch(() => undefined);
    await secondPool.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await dropDatabase(database.name);
  }
});

test("C-3815951d migrate times out on a held lock and releases its own after a failure", async () => {
  const dir = await makeDir();
  const database = await createBareDatabase("lock");
  const a = "CREATE TABLE widget (id int);\n";
  const holder = new pg.Client({ connectionString: adminUrlFor(database.name) });

  try {
    await writeFile(join(dir, "0001_a.sql"), a);
    await holder.connect();
    await holder.query(`SELECT pg_advisory_lock(${LOCK_KEY})`);

    const held = await rejectsWith(
      () => migrate(database.pool, dir, { lockTimeoutMs: 200 }),
      "MIGRATION_LOCK_TIMEOUT",
    );
    assert.equal(held.code, "MIGRATION_LOCK_TIMEOUT");
    await assertNoSchema(database.pool);

    await holder.query(`SELECT pg_advisory_unlock(${LOCK_KEY})`);
    assert.deepEqual(await resolved(() => migrate(database.pool, dir)), { applied: ["0001_a"] });

    await writeFile(join(dir, "0002_b.sql"), "SELECT 1/0;\n");
    await rejectsWith(() => migrate(database.pool, dir), "MIGRATION_FAILED");

    const other = new pg.Client({ connectionString: adminUrlFor(database.name) });
    await other.connect();
    try {
      const lock = await oneRow(
        other.query<{ locked: boolean }>(`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`),
      );
      assert.equal(lock.locked, true, "the migration lock is released after a failure");
      await other.query(`SELECT pg_advisory_unlock(${LOCK_KEY})`);
    } finally {
      await other.end().catch(() => undefined);
    }
  } finally {
    await holder.query(`SELECT pg_advisory_unlock(${LOCK_KEY})`).catch(() => undefined);
    await holder.end().catch(() => undefined);
    await database.pool.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await dropDatabase(database.name);
  }
});

test("C-3815951d migrate refuses an invalid lock timeout before querying", async () => {
  const dir = await makeDir();
  const database = await createBareDatabase("badlock");

  try {
    await writeFile(join(dir, "0001_a.sql"), "CREATE TABLE widget (id int);\n");

    for (const lockTimeoutMs of [0, 1.5]) {
      const error = await rejectsWith(
        () => migrate(database.pool, dir, { lockTimeoutMs }),
        "DB_INVALID",
      );
      assert.equal(error.details.reason, "bad_option");
    }

    await assertNoSchema(database.pool);
  } finally {
    await database.pool.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await dropDatabase(database.name);
  }
});

test("C-94eda93a migrate refuses missing and privileged roles before any DDL", async () => {
  const ownCluster = await startCluster();
  const ownAdmin = createPool(ownCluster.adminUrl, { max: 4 });
  const dir = await makeDir();
  const ownerPassword = "precondition-owner-pw";
  const appPassword = "precondition-app-pw";
  const databases: string[] = [];
  const pools: pg.Pool[] = [];

  try {
    await writeFile(join(dir, "0001_a.sql"), "CREATE TABLE widget (id int);\n");

    await ownAdmin.query(`CREATE ROLE ${OWNER} LOGIN PASSWORD '${ownerPassword}'`);

    const missingName = await createDatabaseVia(ownAdmin, "precondition_missing", databases);
    const missingPool = poolFor(ownCluster, OWNER, ownerPassword, missingName);
    pools.push(missingPool);
    const missing = await rejectsWith(() => migrate(missingPool, dir), "MIGRATION_ROLE_MISSING");
    assert.deepEqual(missing.details.roles, ["ursitoare_app"]);
    await assertNoSchema(missingPool);

    await ensureRoles(ownAdmin, { ownerPassword, appPassword });

    const superName = await createDatabaseVia(ownAdmin, "precondition_super", databases);
    const superPool = createPool(superUrlFor(ownCluster, superName), { max: 2 });
    pools.push(superPool);
    const wrongSession = await rejectsWith(() => migrate(superPool, dir), "MIGRATION_ROLE_INVALID");
    assert.equal(wrongSession.details.reason, "wrong_session_role");
    await assertNoSchema(superPool);

    await ownAdmin.query("ALTER ROLE ursitoare_app BYPASSRLS");
    const bypassName = await createDatabaseVia(ownAdmin, "precondition_bypassrls", databases);
    const bypassPool = poolFor(ownCluster, OWNER, ownerPassword, bypassName);
    pools.push(bypassPool);
    const bypass = await rejectsWith(() => migrate(bypassPool, dir), "MIGRATION_ROLE_INVALID");
    assert.equal(bypass.details.reason, "app_role_privileged");
    await assertNoSchema(bypassPool);
    await ensureRoles(ownAdmin, { ownerPassword, appPassword });

    await ownAdmin.query(`GRANT ${OWNER} TO ursitoare_app`);
    const memberName = await createDatabaseVia(ownAdmin, "precondition_ownermember", databases);
    const memberPool = poolFor(ownCluster, OWNER, ownerPassword, memberName);
    pools.push(memberPool);
    const member = await rejectsWith(() => migrate(memberPool, dir), "MIGRATION_ROLE_INVALID");
    assert.equal(member.details.reason, "app_role_privileged");
    await assertNoSchema(memberPool);
    await ensureRoles(ownAdmin, { ownerPassword, appPassword });

    await ownAdmin.query("CREATE ROLE precondition_bypass BYPASSRLS");
    await ownAdmin.query("GRANT precondition_bypass TO ursitoare_app");
    const privilegedName = await createDatabaseVia(ownAdmin, "precondition_member", databases);
    const privilegedPool = poolFor(ownCluster, OWNER, ownerPassword, privilegedName);
    pools.push(privilegedPool);
    const privileged = await rejectsWith(
      () => migrate(privilegedPool, dir),
      "MIGRATION_ROLE_INVALID",
    );
    assert.equal(privileged.details.reason, "app_role_privileged");
    await assertNoSchema(privilegedPool);
    await ensureRoles(ownAdmin, { ownerPassword, appPassword });
    await ownAdmin.query("DROP ROLE precondition_bypass");

    await ownAdmin.query(`ALTER ROLE ${OWNER} BYPASSRLS`);
    const ownerName = await createDatabaseVia(ownAdmin, "precondition_ownerbypass", databases);
    const ownerPool = poolFor(ownCluster, OWNER, ownerPassword, ownerName);
    pools.push(ownerPool);
    const ownerPrivileged = await rejectsWith(
      () => migrate(ownerPool, dir),
      "MIGRATION_ROLE_INVALID",
    );
    assert.equal(ownerPrivileged.details.reason, "owner_role_privileged");
    await assertNoSchema(ownerPool);
  } finally {
    for (const pool of pools) {
      await pool.end().catch(() => undefined);
    }
    for (const name of databases) {
      await ownAdmin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`).catch(() => undefined);
    }
    await ownAdmin.query("DROP ROLE IF EXISTS precondition_bypass").catch(() => undefined);
    await ensureRoles(ownAdmin, { ownerPassword, appPassword }).catch(() => undefined);
    await ownAdmin.end().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
    await ownCluster.stop().catch(() => undefined);
  }
});
