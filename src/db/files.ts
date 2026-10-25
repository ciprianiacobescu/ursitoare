// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export const DEFAULT_MIGRATIONS_DIR: string = "";

export interface MigrationFile {
  version: number;
  name: string;
  file: string;
  sql: string;
  checksum: string;
}

export function readMigrationFiles(_dir: string): Promise<MigrationFile[]> {
  throw new Error("not implemented");
}
