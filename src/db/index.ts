// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export { DbError } from "./errors.ts";
export type { EndpointLike, PoolOptions } from "./pool.ts";
export { createPool } from "./pool.ts";
export type { MigrationFile } from "./files.ts";
export { readMigrationFiles } from "./files.ts";
export { DEFAULT_MIGRATIONS_DIR, migrate } from "./migrate.ts";
export { ROLE_OWNER, ROLE_APP, ensureRoles } from "./roles.ts";
export { ensurePartitions } from "./partitions.ts";
export { prepareDatabase } from "./prepare.ts";
export { createDbHealthCheck } from "./health.ts";
export type { Database, OpenDeps } from "./open.ts";
export { openDatabase } from "./open.ts";
