import assert from "node:assert/strict";
import { test } from "node:test";

import pg from "pg";

import type { Env, SecretReader } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { prepareDatabase } from "../../db/index.ts";
import { readTestCluster, withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { createCommandRegistry } from "../registry.ts";
import type { OwnerConnection } from "../run.ts";
import { runCli } from "../run.ts";
import { dbPrepareCommand } from "./db-prepare.ts";

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

const NOW = "2026-11-25T10:00:00.000Z";

function ownerEnv(db: TestDatabase): Env {
  return {
    URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
    URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
  };
}

async function run(db: TestDatabase): Promise<Run> {
  const registry = createCommandRegistry();
  registry.registerCommand("db-prepare", dbPrepareCommand);
  let stdout = "";
  let stderr = "";
  const readSecret: SecretReader = () => db.ownerEndpoint.password?.reveal() ?? "";
  const code = await runCli(["db-prepare"], {
    env: ownerEnv(db),
    stdout: { write: (text) => void (stdout += text) },
    stderr: { write: (text) => void (stderr += text) },
    registry,
    clock: fixedClock(NOW),
    ids: sequentialIds(0),
    readSecret,
    connectOwner: (): OwnerConnection => ({ pool: db.ownerPool, close: async () => undefined }),
  });
  return { code, stdout, stderr };
}

async function scalar(db: TestDatabase, sql: string): Promise<string | null> {
  const result = await db.ownerPool.query<{ v: string | null }>(sql);
  return result.rows[0]?.v ?? null;
}

test("C-c61c6116 db-prepare apply, repeat and failure", async () => {
  const reference = await withTestDatabase({ migrated: false });
  const first = await withTestDatabase({ migrated: false });
  const other = await withTestDatabase({ migrated: false });
  try {
    const expected = await prepareDatabase(reference.ownerPool, fixedClock(NOW));
    const n = expected.applied.length;
    const m = expected.partitions.length;
    assert.ok(n > 0 && m > 0, "the reference run applies migrations and partitions");

    assert.deepEqual(await run(first), {
      code: 0,
      stdout: `migrations: ${n} applied; partitions: ${m}; dbos: ready\n`,
      stderr: "",
    });
    assert.equal(
      await scalar(first, "SELECT count(*)::text AS v FROM ursitoare.schema_migration"),
      String(n),
    );
    assert.equal(await scalar(first, "SELECT to_regclass('dbos.dbos_migrations')::text AS v"), "dbos.dbos_migrations");

    assert.deepEqual(await run(first), {
      code: 0,
      stdout: "migrations: 0 applied; partitions: 0; dbos: ready\n",
      stderr: "",
    });

    await first.ownerPool.query(
      "UPDATE ursitoare.schema_migration SET checksum = repeat('0', 64) WHERE version = 1",
    );
    assert.deepEqual(await run(first), {
      code: 1,
      stdout: "",
      stderr: "CLI_PREPARE_FAILED: database preparation failed (MIGRATION_CHECKSUM_MISMATCH)\n",
    });

    const adminUrl = new URL(readTestCluster().adminUrl);
    adminUrl.pathname = `/${other.name}`;
    const admin = new pg.Client({ connectionString: adminUrl.toString() });
    await admin.connect();
    try {
      await admin.query(`CREATE SCHEMA dbos`);
    } finally {
      await admin.end();
    }
    assert.deepEqual(await run(other), {
      code: 1,
      stdout: "",
      stderr: "CLI_PREPARE_FAILED: database preparation failed (DURABLE_UNAVAILABLE)\n",
    });
  } finally {
    await reference.close();
    await first.close();
    await other.close();
  }
});
