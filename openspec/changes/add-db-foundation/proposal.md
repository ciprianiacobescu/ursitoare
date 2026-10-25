## Why

Every later unit stores data in Postgres, and the architecture's tenant isolation (ADR-13) only works if the engine connects as a role that cannot bypass row-level security. Today the repository has no database code, no migration mechanism and no Postgres in its tests, so each unit would invent its own.

Observable result: `prepareDatabase(ownerPool, clock)` applies `src/db/migrations/0001_base.sql` to an empty database as `ursitoare_owner`, so schema `ursitoare` and the ledger `ursitoare.schema_migration` exist and `ursitoare_app` can use the schema but nothing in it, then creates the partitions that partitioned tables need; running it again returns `{ applied: [], partitions: [] }`. An edited applied file, a missing role or a failing statement ends in a stable error code; a second concurrent runner waits and does nothing. The engine never migrates and never holds the owner credentials. It registers a `db` health check only when `URSITOARE_DATABASE_URL` is configured: without it `GET /health` stays 200 with `checks: {}`; with it, `/health` shows `checks.db` `"ok"`, and 503 `"fail"` when the database is unmigrated. An app endpoint that is a superuser, `BYPASSRLS`, the schema owner or a member of the owner stops the engine at boot, and so does a Postgres that stays down past `openTimeoutMs`. `pnpm run test` starts one embedded Postgres 18.4 cluster, and any test calls `withTestDatabase()` for a fresh migrated database with an owner pool and an app-role pool.

## What Changes

- `src/db`: `createPool`, `readMigrationFiles`, `migrate`, `ensureRoles`, `ensurePartitions`, `prepareDatabase`, `createDbHealthCheck`, `openDatabase`, `DbError` with its codes, `ROLE_OWNER`, `ROLE_APP`, `DEFAULT_MIGRATIONS_DIR`.
- `src/db/migrations/0001_base.sql`: schema, ledger privileges and the grants model for `ursitoare_owner` (owns objects, runs migrations) and `ursitoare_app` (runtime; not superuser, no `BYPASSRLS`, owns nothing, in no privileged role).
- `ensureRoles(adminPool, passwords)` is the admin bootstrap that makes the roles exist (password sent as a SCRAM verifier); `migrate` refuses without them. `ensurePartitions` creates range partitions ahead for tables that carry the comment `partition: day|month`.
- `src/main.ts`: `main` honours the scaffold's optional `MainDeps.openDatabase`: it opens the database before it listens and registers `db` when configured. `startServer(port, host)` is untouched.
- `test/support/pg.ts` (`startCluster`, `readTestCluster`, `withTestDatabase`) and `test/support/global-setup.ts` (one embedded cluster per run, a template migrated by `prepareDatabase`, teardown); their requirements are the capability `test-database`, the rest is `database`.

## Impact

- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them.
- **Depends on:** `add-engine-skeleton` (U01). Evidence: `AppConfig.database` with `DatabaseEndpoint { url, password }` and `Secret.reveal()` (`src/config`), `createHealthRegistry`, `HealthRegistry` and `ServerDeps.health` (`src/api`), `systemClock` (`src/core`), `main`, `MainDeps` with its scaffolded optional `openDatabase` and the one fatal startup line (`src/main.ts`). `src/db` itself imports no other module.
- **Base code relied on:** the placeholders `globalSetup` and `globalTeardown` in `test/support/global-setup.ts`; the `pnpm run test` script with `--test-global-setup=test/support/global-setup.ts`; `pnpm-workspace.yaml` listing the `@embedded-postgres/*` packages in `onlyBuiltDependencies` (owner file).
- **Files implemented** (stubs from the scaffold): `src/db/{errors,pool,files,migrate,roles,partitions,prepare,health,open,index}.ts`, `test/support/pg.ts`. **Files created:** one `*.test.ts` each for `pool`, `files`, `migrate`, `roles`, `partitions`, `prepare`, `health`, `open`, plus `src/db/base.test.ts`, `src/main.db.test.ts`, `test/support/pg.test.ts`, `test/support/global-setup.test.ts`, `src/db/migrations/0001_base.sql`.
- **Files changed:** `src/main.ts`, `test/support/global-setup.ts`. No existing test changes; the scaffold installs `pg`, `@types/pg` and `embedded-postgres`.
- **Migrations:** `0001_base.sql`; from M1 a unit's version is 10 × its unit number (+5 for `b`, +6 for `c`); gaps are allowed. **Tables:** `ursitoare.schema_migration` (global ledger, created by the runner). **Env:** none read by `src/db`; the tests use `TEST_PG_CLUSTER`.

**Interfaces given:**

```ts
// src/db/index.ts
const ROLE_OWNER: string; const ROLE_APP: string; const DEFAULT_MIGRATIONS_DIR: string
class DbError extends Error { code: string; details: Record<string, string | number | string[]>; constructor(code: string, message: string, details?: Record<string, string | number | string[]>) }
interface EndpointLike { url: string; password: { reveal(): string } | null }
interface PoolOptions { max?: number; connectionTimeoutMs?: number; idleTimeoutMs?: number; statementTimeoutMs?: number; applicationName?: string; onError?: (err: Error) => void }
function createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool
interface MigrationFile { version: number; name: string; file: string; sql: string; checksum: string }
function readMigrationFiles(dir: string): Promise<MigrationFile[]>
function migrate(pool: pg.Pool, dir?: string, opts?: { lockTimeoutMs?: number }): Promise<{ applied: string[] }>
function ensureRoles(adminPool: pg.Pool, passwords?: { ownerPassword?: string | { reveal(): string }; appPassword?: string | { reveal(): string } }): Promise<{ created: string[] }>
function ensurePartitions(ownerPool: pg.Pool, clock: { now(): Date }, opts?: { monthsBack?: number; monthsAhead?: number }): Promise<{ created: string[]; skipped: string[] }>
function prepareDatabase(ownerPool: pg.Pool, clock: { now(): Date }): Promise<{ applied: string[]; partitions: string[] }>
function createDbHealthCheck(pool: Pick<pg.Pool, "query">, opts?: { timeoutMs?: number }): () => Promise<"ok" | "fail">
interface Database { appPool: pg.Pool; close(): Promise<void> }
interface OpenDeps { health: { registerHealthCheck(name: string, check: () => Promise<"ok" | "fail">): void }; logger: { warn(obj: object, msg: string): void }; openTimeoutMs?: number; sleep?: (ms: number) => Promise<void>; clock?: { now(): Date } }
function openDatabase(config: { database: { app: EndpointLike | null; owner: EndpointLike | null } }, deps: OpenDeps): Promise<Database | null>
// src/main.ts: MainDeps.openDatabase?: typeof openDatabase
// test/support/pg.ts
class TestClusterError extends Error { code: string; dataDir?: string }
interface Cluster { host: string; port: number; dataDir: string; adminUrl: string; stop(): Promise<void> }
function freePort(): Promise<number>
function startCluster(opts?: { port?: number }): Promise<Cluster>
interface TestCluster { host: string; port: number; adminUrl: string; ownerPassword: string; appPassword: string; template: string }
function readTestCluster(env?: Record<string, string | undefined>): TestCluster
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void> }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase>
// test/support/global-setup.ts
function globalSetup(): Promise<void>; function globalTeardown(): Promise<void>
```
**Interfaces taken:**

- From `add-engine-skeleton`: `AppConfig`, `DatabaseEndpoint`, `Secret` (`src/config`); `createHealthRegistry`, `HealthRegistry` (`src/api`); `systemClock` (`src/core`); `main`, `MainDeps`, `startServer`, `RunningServer` (`src/main.ts`).

## Out of scope

Tenancy tables, `TenantContext` and RLS policies (`add-tenancy-foundation`); a migrate CLI or the deployment migration job (`add-e2e-stack` and later units call `prepareDatabase`); the `dbos` schema and its role (`add-dbos-runtime`); dedicated or crash-test clusters; creating partitions from the running engine, dropping or moving partitions (retention); backups; TLS other than `verify-full`.
