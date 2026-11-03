import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResult, QueryResultRow } from "pg";

import { freePort, withTestDatabase } from "../../test/support/pg.ts";
import { DurableError, prepareDurable } from "./index.ts";

const BAD_OWNER_URLS = [
  "not a url",
  "mysql://o:p@h/db",
  "postgres://o:p@h",
  "postgres://o:p@h/",
];

function oneRow<T extends QueryResultRow>(result: Promise<QueryResult<T>>): Promise<T> {
  return result.then(({ rows }) => {
    const row = rows[0];
    assert.ok(row, "the query returns one row");
    return row;
  });
}

async function ledgerVersions(database: {
  ownerPool: { query<T extends QueryResultRow>(text: string): Promise<QueryResult<T>> };
}): Promise<string[]> {
  const { rows } = await database.ownerPool.query<{ version: string }>(
    "SELECT version::text AS version FROM dbos.dbos_migrations ORDER BY version",
  );
  return rows.map((row) => row.version);
}

function assertDurableFailure(error: unknown, code: string, reason: string): true {
  assert.ok(error instanceof DurableError, `expected a DurableError, got ${String(error)}`);
  assert.equal(error.code, code);
  assert.equal(error.details.reason, reason);
  assert.equal(error.message.includes("postgres://"), false, "the message never names a URL");
  return true;
}

test("C-25c32649 prepareDurable creates the dbos schema and repeats as a no-op", async () => {
  const database = await withTestDatabase({ migrated: false });

  try {
    const absent = await oneRow(
      database.ownerPool.query<{ name: string | null }>(
        "SELECT to_regclass('dbos.dbos_migrations')::text AS name",
      ),
    );
    assert.equal(absent.name, null, "the database starts without the dbos schema");

    await assert.doesNotReject(async () => {
      await prepareDurable(database.ownerUrl);
    });

    const schema = await oneRow(
      database.ownerPool.query<{ owner: string }>(
        "SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname = 'dbos'",
      ),
    );
    assert.equal(schema.owner, "ursitoare_owner");

    const privileges = await oneRow(
      database.ownerPool.query<{ usage_ok: boolean; create_ok: boolean }>(
        "SELECT has_schema_privilege('ursitoare_app', 'dbos', 'USAGE') AS usage_ok, " +
          "has_schema_privilege('ursitoare_app', 'dbos', 'CREATE') AS create_ok",
      ),
    );
    assert.equal(privileges.usage_ok, true, "the app role has USAGE");
    assert.equal(privileges.create_ok, false, "the app role has no CREATE");

    await assert.rejects(database.appPool.query("CREATE TABLE dbos.x (i int)"), { code: "42501" });

    const first = await ledgerVersions(database);
    assert.ok(first.length > 0, "the first call writes the migration ledger");

    await assert.doesNotReject(async () => {
      await prepareDurable(database.ownerUrl);
    });
    assert.deepEqual(await ledgerVersions(database), first, "the second call leaves the ledger unchanged");
  } finally {
    await database.close();
  }

  const clone = await withTestDatabase();
  try {
    const migrated = await oneRow(
      clone.ownerPool.query<{ name: string | null }>(
        "SELECT to_regclass('dbos.dbos_migrations')::text AS name",
      ),
    );
    assert.equal(migrated.name, "dbos.dbos_migrations", "the default clone carries the dbos ledger");
  } finally {
    await clone.close();
  }
});

test("C-25c32649 prepareDurable refuses bad owner URLs and an unmigrated app role", async () => {
  for (const url of BAD_OWNER_URLS) {
    await assert.rejects(prepareDurable(url), (error) =>
      assertDurableFailure(error, "DURABLE_INVALID", "bad_url"),
    );
  }

  const other = await withTestDatabase({ migrated: false });
  try {
    await assert.rejects(prepareDurable(other.appUrl), (error) =>
      assertDurableFailure(error, "DURABLE_UNAVAILABLE", "42501"),
    );
  } finally {
    await other.close();
  }

  const port = await freePort();
  await assert.rejects(
    prepareDurable(`postgres://ursitoare_owner@127.0.0.1:${port}/ursitoare`),
    (error) => assertDurableFailure(error, "DURABLE_UNAVAILABLE", "migrate_failed"),
  );
});
