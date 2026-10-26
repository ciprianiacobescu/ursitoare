import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { after, before, test } from "node:test";

import type pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import { startCluster, type Cluster } from "../../test/support/pg.ts";
import {
  DEFAULT_MIGRATIONS_DIR,
  createPool,
  ensureRoles,
  prepareDatabase,
  readMigrationFiles,
} from "./index.ts";

const OWNER = "ursitoare_owner";
const OWNER_PASSWORD = "prepare-owner-pw";
const APP_PASSWORD = "prepare-app-pw";
const BASE_FILE = "0001_base.sql";

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

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row, "the query returns one row");
  return row;
}

async function createBareDatabase(label: string): Promise<{ name: string; pool: pg.Pool }> {
  sequence += 1;
  const name = `prepare_${label}_${process.pid}_${sequence}`;
  await admin().query(`CREATE DATABASE "${name}" OWNER ${OWNER}`);
  const current = runningCluster();
  const pool = createPool(
    {
      url: `postgres://${OWNER}@${current.host}:${current.port}/${name}`,
      password: { reveal: () => OWNER_PASSWORD },
    },
    { max: 4, connectionTimeoutMs: 5000 },
  );
  return { name, pool };
}

async function closeDatabase(database: { name: string; pool: pg.Pool }): Promise<void> {
  await database.pool.end().catch(() => undefined);
  await admin()
    .query(`DROP DATABASE IF EXISTS "${database.name}" WITH (FORCE)`)
    .catch(() => undefined);
}

test("C-58e0ebf0 prepareDatabase migrates first and then creates the partition window", async () => {
  assert.ok(
    existsSync(join(DEFAULT_MIGRATIONS_DIR, BASE_FILE)),
    `the base migration ${BASE_FILE} exists`,
  );
  const files = await readMigrationFiles(DEFAULT_MIGRATIONS_DIR);
  const expectedApplied = files.map((file) => file.file.replace(/\.sql$/, ""));
  assert.ok(expectedApplied.length > 0, "the default migrations directory has files");

  const database = await createBareDatabase("bare");

  try {
    const clock = { now: () => new Date("2026-10-15T12:00:00Z") };
    const first = await resolved(() => prepareDatabase(database.pool, clock));
    assert.deepEqual(first.applied, expectedApplied);
    assert.deepEqual(first.partitions, []);

    await database.pool.query(
      "CREATE TABLE ursitoare.pt_month (at timestamptz) PARTITION BY RANGE (at)",
    );
    await database.pool.query(
      "CREATE TABLE ursitoare.pt_month_default PARTITION OF ursitoare.pt_month DEFAULT",
    );
    await database.pool.query("COMMENT ON TABLE ursitoare.pt_month IS 'partition: month'");
    const month = await oneRow(
      database.pool.query<{ name: string | null }>(
        "SELECT to_regclass('ursitoare.pt_month')::text AS name",
      ),
    );
    assert.equal(month.name, "ursitoare.pt_month");

    const second = await resolved(() => prepareDatabase(database.pool, clock));
    assert.deepEqual(second.applied, []);
    assert.deepEqual(second.partitions, [
      "ursitoare.pt_month_p202609",
      "ursitoare.pt_month_p202610",
      "ursitoare.pt_month_p202611",
      "ursitoare.pt_month_p202612",
      "ursitoare.pt_month_p202701",
    ]);
  } finally {
    await closeDatabase(database);
  }
});
