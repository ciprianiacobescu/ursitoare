import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import type pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import { freePort, startCluster, type Cluster } from "../../test/support/pg.ts";
import { DbError, createPool, ensurePartitions, ensureRoles } from "./index.ts";

const OWNER = "ursitoare_owner";
const OWNER_PASSWORD = "partitions-owner-pw";
const APP_PASSWORD = "partitions-app-pw";
const DOWN_PASSWORD = "partitions-down-pw";

let cluster: Cluster | undefined;
let adminPool: pg.Pool | undefined;
let sequence = 0;

before(async () => {
  cluster = await startCluster();
  adminPool = createPool(cluster.adminUrl, { max: 4 });
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

async function resolved<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

async function rejectsWith(
  run: () => Promise<unknown>,
  code: string,
  reason?: string,
): Promise<DbError> {
  try {
    await run();
  } catch (error) {
    assert.ok(error instanceof DbError, `expected a DbError, got ${String(error)}`);
    assert.equal(error.code, code);
    if (reason !== undefined) {
      assert.equal(error.details.reason, reason);
    }
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

async function createBareDatabase(label: string): Promise<{ name: string; pool: pg.Pool }> {
  sequence += 1;
  const name = `partitions_${label}_${process.pid}_${sequence}`;
  await admin().query(`CREATE DATABASE "${name}" OWNER ${OWNER}`);
  const current = runningCluster();
  const pool = createPool(
    {
      url: `postgres://${OWNER}@${current.host}:${current.port}/${name}`,
      password: { reveal: () => OWNER_PASSWORD },
    },
    { max: 4, connectionTimeoutMs: 5000 },
  );
  await pool.query("CREATE SCHEMA ursitoare");
  return { name, pool };
}

async function closeDatabase(database: { name: string; pool: pg.Pool }): Promise<void> {
  await database.pool.end().catch(() => undefined);
  await admin()
    .query(`DROP DATABASE IF EXISTS "${database.name}" WITH (FORCE)`)
    .catch(() => undefined);
}

async function assertTableExists(pool: pg.Pool, name: string): Promise<void> {
  const row = await oneRow(
    pool.query<{ name: string | null }>("SELECT to_regclass($1)::text AS name", [name]),
  );
  assert.equal(row.name, name, `${name} exists`);
}

async function createMonthTable(pool: pg.Pool): Promise<void> {
  await pool.query("CREATE TABLE ursitoare.pt_month (at timestamptz) PARTITION BY RANGE (at)");
  await pool.query("CREATE TABLE ursitoare.pt_month_default PARTITION OF ursitoare.pt_month DEFAULT");
  await pool.query("COMMENT ON TABLE ursitoare.pt_month IS 'partition: month'");
  await assertTableExists(pool, "ursitoare.pt_month");
}

async function countMonthWindows(pool: pg.Pool): Promise<string> {
  const row = await oneRow(
    pool.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'ursitoare'
          AND c.relname LIKE 'pt_month_p%'`,
    ),
  );
  return row.count;
}

test("C-fb7ba2ed ensurePartitions creates the monthly window and routes rows", async () => {
  const database = await createBareDatabase("month");

  try {
    await createMonthTable(database.pool);

    const clock = { now: () => new Date("2026-10-15T12:00:00Z") };
    const first = await resolved(() => ensurePartitions(database.pool, clock));
    assert.deepEqual(first.created, [
      "ursitoare.pt_month_p202609",
      "ursitoare.pt_month_p202610",
      "ursitoare.pt_month_p202611",
      "ursitoare.pt_month_p202612",
      "ursitoare.pt_month_p202701",
    ]);
    assert.deepEqual(first.skipped, []);

    const second = await resolved(() => ensurePartitions(database.pool, clock));
    assert.deepEqual(second, { created: [], skipped: [] });

    await database.pool.query(
      "INSERT INTO ursitoare.pt_month (at) VALUES ('2026-10-31T23:59:59Z'), ('2026-11-01T00:00:00Z')",
    );
    const routed = await database.pool.query<{ partition: string }>(
      "SELECT tableoid::regclass::text AS partition FROM ursitoare.pt_month ORDER BY at",
    );
    assert.deepEqual(
      routed.rows.map((row) => row.partition),
      ["ursitoare.pt_month_p202610", "ursitoare.pt_month_p202611"],
    );

    const untouchedDefault = await oneRow(
      database.pool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM ursitoare.pt_month_default",
      ),
    );
    assert.equal(untouchedDefault.count, "0");

    const privilege = await oneRow(
      database.pool.query<{ allowed: boolean }>(
        "SELECT has_table_privilege('ursitoare_app', 'ursitoare.pt_month_p202609', 'SELECT') AS allowed",
      ),
    );
    assert.equal(privilege.allowed, false);
  } finally {
    await closeDatabase(database);
  }
});

test("C-c37e9432 ensurePartitions creates daily partitions and refuses bad window options", async () => {
  const database = await createBareDatabase("day");

  try {
    await database.pool.query("CREATE TABLE ursitoare.pt_day (at date) PARTITION BY RANGE (at)");
    await database.pool.query("COMMENT ON TABLE ursitoare.pt_day IS 'partition: day'");
    await assertTableExists(database.pool, "ursitoare.pt_day");

    const clock = { now: () => new Date("2026-02-10T00:00:00Z") };
    const february = Array.from({ length: 28 }, (_, index) => {
      const day = String(index + 1).padStart(2, "0");
      return `ursitoare.pt_day_p202602${day}`;
    });

    const created = await resolved(() =>
      ensurePartitions(database.pool, clock, { monthsBack: 0, monthsAhead: 0 }),
    );
    assert.deepEqual(created.created, february);
    assert.deepEqual(created.skipped, []);

    for (const opts of [{ monthsAhead: -1 }, { monthsBack: 1.5 }]) {
      const error = await rejectsWith(
        () => ensurePartitions(database.pool, clock, opts),
        "DB_INVALID",
        "bad_option",
      );
      assert.equal(error.code, "DB_INVALID");
    }
  } finally {
    await closeDatabase(database);
  }
});

test("C-5cc5a771 ensurePartitions ignores list and hash parents and refuses unusable range tables", async () => {
  const ignored = await createBareDatabase("ignored");

  try {
    await ignored.pool.query(
      "CREATE TABLE ursitoare.pt_list (region text) PARTITION BY LIST (region)",
    );
    await ignored.pool.query("CREATE TABLE ursitoare.pt_hash (id integer) PARTITION BY HASH (id)");
    await assertTableExists(ignored.pool, "ursitoare.pt_list");
    await assertTableExists(ignored.pool, "ursitoare.pt_hash");

    const clock = { now: () => new Date("2026-10-15T12:00:00Z") };
    const ignoredResult = await resolved(() => ensurePartitions(ignored.pool, clock));
    assert.deepEqual(ignoredResult, { created: [], skipped: [] });
  } finally {
    await closeDatabase(ignored);
  }

  const cases = [
    {
      label: "nocomment",
      table: "pt_nocomment",
      code: "PARTITION_GRANULARITY_MISSING",
      statements: [
        "CREATE TABLE ursitoare.pt_nocomment (at timestamptz) PARTITION BY RANGE (at)",
      ],
    },
    {
      label: "week",
      table: "pt_week",
      code: "PARTITION_GRANULARITY_MISSING",
      statements: [
        "CREATE TABLE ursitoare.pt_week (at timestamptz) PARTITION BY RANGE (at)",
        "COMMENT ON TABLE ursitoare.pt_week IS 'partition: week'",
      ],
    },
    {
      label: "multikey",
      table: "pt_multi",
      code: "PARTITION_KEY_UNSUPPORTED",
      statements: [
        "CREATE TABLE ursitoare.pt_multi (at timestamptz, id integer) PARTITION BY RANGE (at, id)",
        "COMMENT ON TABLE ursitoare.pt_multi IS 'partition: month'",
      ],
    },
    {
      label: "textkey",
      table: "pt_text",
      code: "PARTITION_KEY_UNSUPPORTED",
      statements: [
        "CREATE TABLE ursitoare.pt_text (at text) PARTITION BY RANGE (at)",
        "COMMENT ON TABLE ursitoare.pt_text IS 'partition: month'",
      ],
    },
  ];

  for (const entry of cases) {
    const database = await createBareDatabase(`bad_${entry.label}`);

    try {
      await createMonthTable(database.pool);
      for (const statement of entry.statements) {
        await database.pool.query(statement);
      }
      await assertTableExists(database.pool, `ursitoare.${entry.table}`);

      const error = await rejectsWith(
        () => ensurePartitions(database.pool, { now: () => new Date("2026-10-15T12:00:00Z") }),
        entry.code,
      );
      assert.equal(error.details.table, `ursitoare.${entry.table}`);

      assert.equal(await countMonthWindows(database.pool), "0");
      const october = await oneRow(
        database.pool.query<{ name: string | null }>(
          "SELECT to_regclass('ursitoare.pt_month_p202610')::text AS name",
        ),
      );
      assert.equal(october.name, null);
    } finally {
      await closeDatabase(database);
    }
  }
});

test("C-f0ece24f ensurePartitions skips a range whose rows already sit in the DEFAULT partition", async () => {
  const database = await createBareDatabase("defaultrows");

  try {
    await createMonthTable(database.pool);
    await database.pool.query(
      "INSERT INTO ursitoare.pt_month (at) VALUES ('2026-11-10T12:00:00Z')",
    );
    await database.pool.query(
      `CREATE TABLE ursitoare.pt_month_old PARTITION OF ursitoare.pt_month
         FOR VALUES FROM ('2026-10-01T00:00:00Z') TO ('2026-11-01T00:00:00Z')`,
    );
    await assertTableExists(database.pool, "ursitoare.pt_month_old");

    const result = await resolved(() =>
      ensurePartitions(database.pool, { now: () => new Date("2026-10-15T12:00:00Z") }),
    );
    assert.deepEqual(result.skipped, ["ursitoare.pt_month_p202611"]);
    assert.deepEqual(result.created, [
      "ursitoare.pt_month_p202609",
      "ursitoare.pt_month_p202612",
      "ursitoare.pt_month_p202701",
    ]);

    const october = await oneRow(
      database.pool.query<{ name: string | null }>(
        "SELECT to_regclass('ursitoare.pt_month_p202610')::text AS name",
      ),
    );
    assert.equal(october.name, null, "October is neither created nor skipped");

    const kept = await oneRow(
      database.pool.query<{ partition: string }>(
        "SELECT tableoid::regclass::text AS partition FROM ursitoare.pt_month WHERE at = '2026-11-10T12:00:00Z'",
      ),
    );
    assert.equal(kept.partition, "ursitoare.pt_month_default");
  } finally {
    await closeDatabase(database);
  }
});

test("C-87e84b3f ensurePartitions serialises callers and fails closed when Postgres is down", async () => {
  const database = await createBareDatabase("concurrent");
  const clock = { now: () => new Date("2026-10-15T12:00:00Z") };

  try {
    await createMonthTable(database.pool);

    const results = await resolved(() =>
      Promise.all([
        ensurePartitions(database.pool, clock),
        ensurePartitions(database.pool, clock),
      ]),
    );
    const lengths = results
      .map((result) => result.created.length)
      .sort((left, right) => left - right);
    assert.deepEqual(lengths, [0, 5]);
  } finally {
    await closeDatabase(database);
  }

  const port = await freePort();
  const downPool = createPool(
    {
      url: `postgres://postgres@127.0.0.1:${port}/postgres`,
      password: { reveal: () => DOWN_PASSWORD },
    },
    { max: 2, connectionTimeoutMs: 2000 },
  );

  try {
    const error = await rejectsWith(
      () => ensurePartitions(downPool, clock),
      "DB_UNAVAILABLE",
      "ECONNREFUSED",
    );
    assert.equal(error.message.includes(DOWN_PASSWORD), false);
  } finally {
    await downPool.end().catch(() => undefined);
  }
});
