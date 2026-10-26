import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { DbError } from "./errors.ts";

const FILE_PATTERN = /^(\d{4})_([a-z][a-z0-9_]{0,62})\.sql$/;
const TRANSACTION_CONTROL = /^(BEGIN|COMMIT|ROLLBACK|START\s+TRANSACTION)\s*;$/i;

export interface MigrationFile {
  version: number;
  name: string;
  file: string;
  sql: string;
  checksum: string;
}

function checksumOf(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

function invalidName(file: string, reason: string): never {
  throw new DbError("MIGRATION_INVALID_NAME", `invalid migration file: ${reason}`, { file, reason });
}

function migrationFailed(reason: string, message: string): never {
  throw new DbError("MIGRATION_FAILED", message, { reason });
}

export async function readMigrationFiles(dir: string): Promise<MigrationFile[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => {
    migrationFailed("directory_unreadable", "migration directory is unreadable");
  });

  const seen = new Map<number, string>();
  const pending: { version: number; name: string; file: string }[] = [];

  for (const entry of entries) {
    const file = entry.name;
    if (!entry.isFile()) invalidName(file, "not_regular_file");

    const match = FILE_PATTERN.exec(file);
    if (match === null) invalidName(file, "bad_name");

    const versionText = match[1];
    const name = match[2];
    if (versionText === undefined || name === undefined) invalidName(file, "bad_name");

    const version = Number(versionText);
    if (version < 1) invalidName(file, "bad_name");
    if (seen.has(version)) invalidName(file, "duplicate_version");
    seen.set(version, file);

    pending.push({ version, name, file });
  }

  pending.sort((left, right) => left.version - right.version);

  const files: MigrationFile[] = [];
  for (const entry of pending) {
    const sql = await readFile(join(dir, entry.file), "utf8").catch(() => {
      migrationFailed("directory_unreadable", "migration directory is unreadable");
    });

    if (sql.trim() === "") {
      migrationFailed("empty", `${entry.file}: migration file is empty`);
    }

    const hasTransactionControl = sql
      .split(/\r?\n/)
      .some((line) => TRANSACTION_CONTROL.test(line.trim()));
    if (hasTransactionControl) {
      migrationFailed("transaction_control", `${entry.file}: migration file holds transaction control`);
    }

    files.push({
      version: entry.version,
      name: entry.name,
      file: entry.file,
      sql,
      checksum: checksumOf(sql),
    });
  }

  return files;
}
