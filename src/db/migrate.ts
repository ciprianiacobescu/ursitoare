import { fileURLToPath } from "node:url";

import type pg from "pg";

import { DbError } from "./errors.ts";
import { readMigrationFiles, type MigrationFile } from "./files.ts";
import { ROLE_APP, ROLE_OWNER } from "./roles.ts";

export const DEFAULT_MIGRATIONS_DIR: string = fileURLToPath(new URL("./migrations", import.meta.url));

const LEDGER_SCHEMA = "CREATE SCHEMA IF NOT EXISTS ursitoare";

const LEDGER_TABLE = `CREATE TABLE IF NOT EXISTS ursitoare.schema_migration (
  version integer PRIMARY KEY CHECK (version > 0),
  name text NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

const LOCK_TIMEOUT_DEFAULT = 60000;
const LOCK_TIMEOUT_MIN = 1;
const LOCK_TIMEOUT_MAX = 600000;
const LOCK_EXPRESSION = "hashtextextended('ursitoare:migrate', 0)";
const LOCK_BUSY_SQLSTATE = "55P03";

const MAX_MESSAGE_LENGTH = 200;

interface MigrateOptions {
  lockTimeoutMs?: number;
}

interface LedgerRow {
  version: number;
  name: string;
  checksum: string;
}

interface RoleRow {
  rolname: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
  owner_member: boolean | null;
  privileged_member: boolean;
}

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

function badOption(): never {
  throw new DbError("DB_INVALID", "invalid migration option", { reason: "bad_option" });
}

function roleInvalid(reason: string): never {
  throw new DbError("MIGRATION_ROLE_INVALID", "database roles are not safe for migrations", {
    reason,
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

function lockTimeout(opts: MigrateOptions | undefined): number {
  if (opts === undefined || opts.lockTimeoutMs === undefined) {
    return LOCK_TIMEOUT_DEFAULT;
  }
  const value = opts.lockTimeoutMs;
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < LOCK_TIMEOUT_MIN ||
    value > LOCK_TIMEOUT_MAX
  ) {
    badOption();
  }
  return value;
}

async function checkRoles(client: pg.PoolClient): Promise<void> {
  let currentUser: string;
  let rows: RoleRow[];
  try {
    const userResult = await client.query<{ current_user: string }>(
      "SELECT current_user AS current_user",
    );
    currentUser = userResult.rows[0]?.current_user ?? "";
    const roleResult = await client.query<RoleRow>(
      `SELECT r.rolname,
              r.rolsuper,
              r.rolbypassrls,
              (SELECT pg_has_role(r.oid, o.oid, 'MEMBER')
                 FROM pg_roles o
                WHERE o.rolname = $2
                  AND o.oid <> r.oid) AS owner_member,
              EXISTS (
                SELECT 1
                  FROM pg_roles p
                 WHERE p.oid <> r.oid
                   AND (p.rolsuper OR p.rolbypassrls)
                   AND pg_has_role(r.oid, p.oid, 'MEMBER')
              ) AS privileged_member
         FROM pg_roles r
        WHERE r.rolname = ANY($1::text[])`,
      [[ROLE_OWNER, ROLE_APP], ROLE_OWNER],
    );
    rows = roleResult.rows;
  } catch (error) {
    throw unavailable(error);
  }

  const byName = new Map(rows.map((row) => [row.rolname, row]));
  const missing = [ROLE_OWNER, ROLE_APP].filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new DbError("MIGRATION_ROLE_MISSING", "database roles are missing", { roles: missing });
  }

  const owner = byName.get(ROLE_OWNER);
  const app = byName.get(ROLE_APP);
  if (owner === undefined || app === undefined) {
    throw new DbError("MIGRATION_ROLE_MISSING", "database roles are missing", {
      roles: [ROLE_OWNER, ROLE_APP].filter((name) => !byName.has(name)),
    });
  }

  if (currentUser !== ROLE_OWNER) {
    roleInvalid("wrong_session_role");
  }
  if (owner.rolsuper || owner.rolbypassrls) {
    roleInvalid("owner_role_privileged");
  }
  if (
    app.rolsuper ||
    app.rolbypassrls ||
    app.owner_member === true ||
    app.privileged_member
  ) {
    roleInvalid("app_role_privileged");
  }
}

async function verifyLedger(
  client: pg.PoolClient,
  files: MigrationFile[],
): Promise<Set<number>> {
  const result = await client.query<LedgerRow>(
    "SELECT version, name, checksum FROM ursitoare.schema_migration ORDER BY version",
  );

  const byVersion = new Map(files.map((file) => [file.version, file]));
  const applied = new Set<number>();

  for (const row of result.rows) {
    applied.add(row.version);
    const file = byVersion.get(row.version);
    if (file === undefined || file.name !== row.name) {
      throw new DbError("MIGRATION_FILE_MISSING", "an applied migration file is missing", {
        version: row.version,
      });
    }
    if (file.checksum !== row.checksum) {
      throw new DbError("MIGRATION_CHECKSUM_MISMATCH", "an applied migration file changed", {
        file: file.file,
      });
    }
  }

  return applied;
}

async function applyFile(client: pg.PoolClient, file: MigrationFile): Promise<void> {
  let begun = false;
  try {
    await client.query("BEGIN");
    begun = true;
    await client.query("SET LOCAL search_path = ursitoare, pg_catalog");
    await client.query(file.sql);
    await client.query(
      "INSERT INTO ursitoare.schema_migration (version, name, checksum) VALUES ($1, $2, $3)",
      [file.version, file.name, file.checksum],
    );
    await client.query("COMMIT");
  } catch (error) {
    if (begun) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    if (sqlState(error) === undefined) {
      throw unavailable(error);
    }
    throw migrationFailed(file, error);
  }
}

export async function migrate(
  pool: pg.Pool,
  dir: string = DEFAULT_MIGRATIONS_DIR,
  opts?: MigrateOptions,
): Promise<{ applied: string[] }> {
  const timeoutMs = lockTimeout(opts);
  const files = await readMigrationFiles(dir);

  let client: pg.PoolClient;
  try {
    client = await pool.connect();
  } catch (error) {
    throw unavailable(error);
  }

  let lockHeld = false;
  const applied: string[] = [];
  try {
    await checkRoles(client);

    try {
      await client.query(`SET lock_timeout = ${timeoutMs}`);
      try {
        await client.query(`SELECT pg_advisory_lock(${LOCK_EXPRESSION})`);
        lockHeld = true;
      } catch (error) {
        if (sqlState(error) === LOCK_BUSY_SQLSTATE) {
          throw new DbError("MIGRATION_LOCK_TIMEOUT", "timed out waiting for the migration lock");
        }
        throw unavailable(error);
      }
      await client.query("RESET lock_timeout");
    } catch (error) {
      if (error instanceof DbError) {
        throw error;
      }
      throw unavailable(error);
    }

    let alreadyApplied: Set<number>;
    try {
      await client.query(LEDGER_SCHEMA);
      await client.query(LEDGER_TABLE);
      alreadyApplied = await verifyLedger(client, files);
    } catch (error) {
      if (error instanceof DbError) {
        throw error;
      }
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
    await client.query("RESET lock_timeout").catch(() => undefined);
    if (lockHeld) {
      await client.query(`SELECT pg_advisory_unlock(${LOCK_EXPRESSION})`).catch(() => undefined);
    }
    client.release();
  }

  return { applied };
}
