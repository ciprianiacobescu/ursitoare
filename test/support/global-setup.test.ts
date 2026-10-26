import assert from "node:assert/strict";
import { createConnection } from "node:net";
import { test } from "node:test";

import pg from "pg";
import type { QueryResult, QueryResultRow } from "pg";

import { DEFAULT_MIGRATIONS_DIR, readMigrationFiles } from "../../src/db/index.ts";
import { globalSetup, globalTeardown } from "./global-setup.ts";
import { readTestCluster, withTestDatabase } from "./pg.ts";

function connectionRefused(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve(error.code === "ECONNREFUSED");
    });
  });
}

async function waitUntilRefused(port: number): Promise<void> {
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    if (await connectionRefused(port)) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.fail("the cluster port never refused connections");
}

async function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  const { rows } = await result;
  const row = rows[0];
  assert.ok(row, "the query returns one row");
  return row;
}

test("C-589bae1c global setup publishes the coordinates of a migrated shared cluster", async () => {
  assert.ok(process.env.TEST_PG_CLUSTER, "globalSetup did not publish TEST_PG_CLUSTER");

  const cluster = readTestCluster();
  assert.equal(cluster.host, "127.0.0.1");
  assert.equal(new URL(cluster.adminUrl).pathname, "/postgres");

  const admin = new pg.Client({ connectionString: cluster.adminUrl });
  await admin.connect();
  try {
    const version = await oneRow(admin.query<{ server_version: string }>("SHOW server_version"));
    assert.ok(
      version.server_version.startsWith("18.4"),
      `server_version starts with 18.4: ${version.server_version}`,
    );

    const roles = await admin.query<{ rolname: string }>(
      "SELECT rolname FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname",
      [["ursitoare_app", "ursitoare_owner"]],
    );
    assert.deepEqual(
      roles.rows.map((row) => row.rolname),
      ["ursitoare_app", "ursitoare_owner"],
    );

    const connections = await oneRow(
      admin.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = $1",
        [cluster.template],
      ),
    );
    assert.equal(connections.count, 0, "no session is connected to the template");
  } finally {
    await admin.end();
  }

  const database = await withTestDatabase();
  try {
    const files = await readMigrationFiles(DEFAULT_MIGRATIONS_DIR);
    assert.ok(files.length > 0, "the migration directory holds files");

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
  } finally {
    await database.close();
  }
});

test("C-b3edfa92 global setup starts a cluster and global teardown stops it", async () => {
  assert.ok(process.env.TEST_PG_CLUSTER, "globalSetup did not publish TEST_PG_CLUSTER");

  const saved = process.env.TEST_PG_CLUSTER;
  assert.ok(saved !== undefined, "the shared cluster variable is set");
  const previous = readTestCluster({ TEST_PG_CLUSTER: saved });

  let setupRan = false;
  try {
    await globalSetup();
    setupRan = true;

    const published = process.env.TEST_PG_CLUSTER;
    assert.ok(published !== undefined, "globalSetup published a new cluster");
    assert.notEqual(published, saved);

    const cluster = readTestCluster();
    assert.equal(cluster.host, "127.0.0.1");
    assert.notEqual(cluster.port, previous.port);
    const port = cluster.port;

    const client = new pg.Client({ connectionString: cluster.adminUrl });
    await client.connect();
    try {
      const answer = await oneRow(client.query<{ answer: number }>("SELECT 1 AS answer"));
      assert.equal(answer.answer, 1);
    } finally {
      await client.end();
    }

    await globalTeardown();
    assert.equal(process.env.TEST_PG_CLUSTER, undefined);
    await waitUntilRefused(port);
  } finally {
    if (setupRan) {
      await globalTeardown();
    }
    process.env.TEST_PG_CLUSTER = saved;
  }
});
