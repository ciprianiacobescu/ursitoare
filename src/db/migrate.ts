import { fileURLToPath } from "node:url";

import type pg from "pg";

import { DbError } from "./errors.ts";
import { readMigrationFiles, type MigrationFile } from "./files.ts";

export const DEFAULT_MIGRATIONS_DIR: string = fileURLToPath(new URL("./migrations", import.meta.url));

const LEDGER_SCHEMA = "CREATE SCHEMA IF NOT EXISTS ursitoare";

const LEDGER_TABLE = `CREATE TABLE IF NOT EXISTS ursitoare.schema_migration (
  version integer PRIMARY KEY CHECK (version > 0),
  name text NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

const MAX_MESSAGE_LENGTH = 200;

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function sqlState(error: unknown): string | undefined {
  const code = errorCode(error);
  return code !== undefined && code.length === 5 ? code : undefined;
}

function unavailable(error: unknown): DbError {
  return new DbError("DB_UNAVAILABLE", "database unavailable", {
    reason: errorCode(error) ?? "unknown",
  });
}

function migrationFailed(file: MigrationFile, error: unknown): DbError {
  const detail = error instanceof Error ? error.message : "migration statement failed";
  return new DbError("MIGRATION_FAILED", `${file.file}: ${detail.slice(0, MAX_MESSAGE_LENGTH)}`, {
    file: file.file,
    sqlstate: sqlState(error) ?? "unknown",
  });
}

function migrationName(file: MigrationFile): string {
  return file.file.replace(/\.sql$/, "");
}

async function appliedVersions(client: pg.PoolClient): Promise<Set<number>> {
  const result = await client.query<{ version: number }>(
    "SELECT version FROM ursitoare.schema_migration",
  );
  return new Set(result.rows.map((row) => row.version));
}

async function applyFile(
  client: pg.PoolClient,
  file: MigrationFile,
): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL search_path = ursitoare, pg_catalog");
    await client.query(file.sql);
    await client.query(
      "INSERT INTO ursitoare.schema_migration (version, name, checksum) VALUES ($1, $2, $3)",
      [file.version, file.name, file.checksum],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (sqlState(error) === undefined) {
      throw unavailable(error);
    }
    throw migrationFailed(file, error);
  }
}

export async function migrate(
  pool: pg.Pool,
  dir: string = DEFAULT_MIGRATIONS_DIR,
  _opts?: { lockTimeoutMs?: number },
): Promise<{ applied: string[] }> {
  const files = await readMigrationFiles(dir);

  let client: pg.PoolClient;
  try {
    client = await pool.connect();
  } catch (error) {
    throw unavailable(error);
  }

  const applied: string[] = [];
  try {
    let alreadyApplied: Set<number>;
    try {
      await client.query(LEDGER_SCHEMA);
      await client.query(LEDGER_TABLE);
      alreadyApplied = await appliedVersions(client);
    } catch (error) {
      throw unavailable(error);
    }

    for (const file of files) {
      if (alreadyApplied.has(file.version)) {
        continue;
      }
      await applyFile(client, file);
      applied.push(migrationName(file));
    }
  } finally {
    client.release();
  }

  return { applied };
}
