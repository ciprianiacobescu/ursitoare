## Context

`add-engine-skeleton` gives, with these exact shapes:

```ts
// src/config: AppConfig.database is { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null }
export interface DatabaseEndpoint { readonly url: string; readonly password: Secret | null }   // url carries no password
export class Secret { reveal(): string }
// src/api: createHealthRegistry(): HealthRegistry; src/core: systemClock
export interface HealthRegistry { registerHealthCheck(name: string, check: () => Promise<"ok" | "fail">): void; /* run(...) not used here */ }
// src/main.ts (the last two members are optional, declared by the scaffold; U01 ignores them)
export interface MainDeps { loadConfig: () => AppConfig; destination: LogDestination; signals: SignalSource; exit: (code: number) => void;
  openDatabase?: typeof openDatabase; configureServer?: (server: FastifyInstance) => void | Promise<void> }
export function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>;
```

`/health` answers 200 while every check is `"ok"`, else 503; `startServer` has no database and stays. A startup failure writes one fatal line `{ code, msg, variable?, reason?, host?, port? }` (`code` and `reason` from the error's `code` and `details.reason`), then `exit(1)`; this unit reuses it.

## Decisions

1. `src/db` imports no other `src` module; skeleton shapes and the clock `{ now(): Date }` are matched structurally. `pg` is imported as `import pg from "pg"`; `test/support` may import `src/core` and `src/db`.
2. `createPool` parses the URL with `new URL` and passes `host`, `port`, `user`, `database`, `password`, `ssl` to `pg.Pool`, never `connectionString`: an endpoint's `password` wins, else a password in the URL (tests). The scheme is `postgres:` or `postgresql:`; the only query parameter is `sslmode` (`disable`, the default, or `verify-full`); `add-engine-skeleton`'s config applies the same rule and also refuses any password in the URL. Pools get an `error` listener.
3. The runner creates `ursitoare` and the ledger under the lock. Files are plain SQL run as `ursitoare_owner` after `SET LOCAL search_path = ursitoare, pg_catalog`. Versions are unique and at least 1, gaps allowed, pending files apply in ascending order. Numbering: `0001` base (this unit), `0002` tenancy; from M1 a unit's version is 10 × its roadmap unit number, plus 5 for a `b` suffix and 6 for `c` (U08 `0080_audit.sql`, U11b `0115_*.sql`).
4. `main` never runs `migrate` or `ensurePartitions` and never opens `database.owner`: the API process never holds the owner credentials. `prepareDatabase(ownerPool, clock)` (migrate, then `ensurePartitions`) is called by `test/support/global-setup.ts` and add-e2e-stack's database part (on their templates), later by the deployment migration job and the CLI. The role guard fails closed: `openDatabase` retries the inspection every 500 ms until it succeeds or `openTimeoutMs` passes. An unmigrated database does not stop the engine: it logs `not_migrated` and `/health` shows `db: fail`.
5. Test coordinates travel in the JSON env var `TEST_PG_CLUSTER` (no `URSITOARE_` prefix, so `loadConfig` ignores it).

## Interfaces

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

Declarations omit `export`. Constants are typed `string` (stub `""`): `ROLE_OWNER` `"ursitoare_owner"`, `ROLE_APP` `"ursitoare_app"`, `DEFAULT_MIGRATIONS_DIR` the absolute path of `src/db/migrations`; `DbError.code` is one of `DB_INVALID`, `DB_UNAVAILABLE`, `DB_ROLES_FAILED`, `DB_ROLE_UNSAFE`, `MIGRATION_INVALID_NAME`, `MIGRATION_CHECKSUM_MISMATCH`, `MIGRATION_FILE_MISSING`, `MIGRATION_FAILED`, `MIGRATION_ROLE_MISSING`, `MIGRATION_ROLE_INVALID`, `MIGRATION_LOCK_TIMEOUT`, `PARTITION_GRANULARITY_MISSING`, `PARTITION_KEY_UNSUPPORTED`. `PoolOptions` defaults 10, 5000, 30000, unset, `"ursitoare"`; bounds 1-100, 1-120000, 0-600000, 1-3600000. `lockTimeoutMs` 1-600000 (60000); `openTimeoutMs` 0-600000 (30000); `sleep` and `clock` default to real ones. `TestClusterError.code` is `TEST_CLUSTER_MISSING` or `TEST_CLUSTER_START_FAILED`; `Cluster.host` is `"127.0.0.1"`; `adminUrl` is a superuser URL on database `postgres`; the env var is `TEST_PG_CLUSTER`. Not exported: `checksumOf`, `inspectRuntime`.

### Behaviour details

- **`migrate`**, in order: `readMigrationFiles(dir)`; role check; on one client `SET lock_timeout`, then `pg_advisory_lock(hashtextextended('ursitoare:migrate', 0))`; bootstrap schema and ledger; verify every ledger row; apply pending files ascending, each as `BEGIN`, `SET LOCAL search_path`, the file, the ledger `INSERT`, `COMMIT`; unlock in `finally`. Before any file runs, a connect or query failure is `DB_UNAVAILABLE` (`details.reason` the error code); SQLSTATE `55P03` is `MIGRATION_LOCK_TIMEOUT`; a missing directory is `MIGRATION_FAILED` (`directory_unreadable`). An SQL error is `MIGRATION_FAILED` after `ROLLBACK`: message `<file>: <Postgres message, at most 200 characters>`, `details { file, sqlstate }`.
- **`readMigrationFiles`:** each entry must be a regular file named `^(\d{4})_([a-z][a-z0-9_]{0,62})\.sql$` with a number of at least 1, versions unique: `MIGRATION_INVALID_NAME`, `details { file, reason }` (`bad_name`, also for `0000`; `not_regular_file`; `duplicate_version`). An empty file, or a line that is only `BEGIN;`, `COMMIT;`, `ROLLBACK;` or `START TRANSACTION;` (any case), is `MIGRATION_FAILED` (`reason` `empty` or `transaction_control`).
- **Role predicates**, for a role R: `owner_member` is "`ursitoare_owner` exists, is not R, and `pg_has_role(R, 'ursitoare_owner', 'MEMBER')`"; `privileged_member` is "another role with `rolsuper` or `rolbypassrls` exists and `pg_has_role(R, oid, 'MEMBER')`".
- **Role check** (before any DDL, in order): a missing role is `MIGRATION_ROLE_MISSING` (`details.roles`); `current_user` not the owner, the owner with `rolsuper` or `rolbypassrls`, or the app role with `rolsuper`, `rolbypassrls`, `owner_member` or `privileged_member`, is `MIGRATION_ROLE_INVALID` (`reason` `wrong_session_role`, `owner_role_privileged`, `app_role_privileged`).
- **`ensureRoles`**, one transaction under an advisory lock: each role is created `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS` or re-altered to those attributes; `REVOKE ursitoare_owner FROM ursitoare_app` when that membership exists; a password is set only when given; `CONNECT` on the current database goes to both roles and `CREATE` to the owner. A password is 1-512 printable ASCII characters, else `DB_INVALID` (`reason` `bad_password`) before the transaction. It is sent as a SCRAM-SHA-256 verifier computed in `src/db/roles.ts` with `node:crypto` (formula in task 4.1); the plaintext never reaches the server or its log. A failing statement is `DB_ROLES_FAILED` (`details.sqlstate`). `created` lists new names, owner first.
- **`ensurePartitions`:** one transaction under `pg_advisory_xact_lock(hashtextextended('ursitoare:ensure_partitions', 0))`. It reads every parent of schema `ursitoare` with `relkind 'p'`, `partstrat 'r'` and `relispartition` false (list and hash parents are ignored); a key that is not one `timestamptz`, `timestamp` or `date` column is `PARTITION_KEY_UNSUPPORTED`, a comment other than exactly `partition: day` or `partition: month` is `PARTITION_GRANULARITY_MISSING` (`details.table`), both before anything is created. `monthsBack` is an integer 0-12, `monthsAhead` 0-24, else `DB_INVALID` (`reason` `bad_option`). A partition covers `FROM (start) TO (next)` in UTC (`+00` literals for `timestamptz`); a name over 63 bytes is `DB_INVALID` (`name_too_long`); an existing name is present. Creating a missing one: SQLSTATE `42P17` (another partition covers the range) counts as present, `23514` (DEFAULT holds rows of the range) lists it in `skipped`, anything else is `DB_UNAVAILABLE` with `details.reason` the code. Both lists hold `ursitoare.<name>` ascending.
- **`prepareDatabase`:** `migrate(ownerPool)` (default directory), then `ensurePartitions(ownerPool, clock)`; it returns `applied` and the `created` names as `partitions`; a `migrate` failure stops it first.
- **Inspection** (`inspectRuntime(pool)`, internal): one query returns `migrated` (`to_regnamespace('ursitoare') IS NOT NULL`), `rolsuper`, `rolbypassrls`, `owns_schema` (for `current_user`), `owner_member`, `privileged_member`. `createDbHealthCheck` is `"ok"` only for the schema plus all five flags false; any other result is `"fail"`; it never throws or logs.
- **`openDatabase`:** `app` null returns `null` and registers nothing; with `owner` set it first logs one warn (`DB_INVALID`, `owner_without_app`). Else it creates the app pool (`onError` logs a warn) and inspects; on any failure it waits `min(500, remaining)` ms through `deps.sleep` and retries until `deps.clock` passes the deadline, then ends the pool and throws `DB_UNAVAILABLE` (`details.reason` the last error's string `code`, else `"unknown"`). One attempt can last `connectionTimeoutMs`. A privileged role ends the pool and throws `DB_ROLE_UNSAFE`, `reason` the first of `superuser`, `bypassrls`, `owns_schema`, `owner_member`, `privileged_member`. A missing schema logs one warn (`DB_UNAVAILABLE`, `not_migrated`). Then it registers `db`.
- **`main`:** it creates `createHealthRegistry()`, awaits `(deps.openDatabase ?? openDatabase)(config, { health, logger })` (a throw: the fatal line, exit 1, no port), passes `health` as `ServerDeps.health`, and makes its shutdown `close` also await `database.close()` (also when listening fails). It never calls `migrate`, `ensurePartitions` or `createPool` for `database.owner`.

## Data model

The runner creates the ledger:

```sql
CREATE SCHEMA IF NOT EXISTS ursitoare;
CREATE TABLE IF NOT EXISTS ursitoare.schema_migration (
  version integer PRIMARY KEY CHECK (version > 0), name text NOT NULL,
  checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL DEFAULT now());
```

`src/db/migrations/0001_base.sql`, verbatim (no other object; `schema_migration` is on the global allowlist of `add-tenancy-foundation`):

```sql
CREATE SCHEMA IF NOT EXISTS ursitoare;
REVOKE ALL ON SCHEMA ursitoare FROM PUBLIC;
GRANT USAGE ON SCHEMA ursitoare TO ursitoare_app;
REVOKE ALL ON TABLE ursitoare.schema_migration FROM PUBLIC, ursitoare_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ursitoare_owner REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
```

Grants model: `ursitoare_owner` owns every object and runs migrations; `ursitoare_app` has `LOGIN`, `CONNECT`, `USAGE` on `ursitoare` and nothing else, and is in no other role. The app role gets privileges on a partitioned parent only, never on a leaf.

## Failure cases

- Postgres down: `migrate`, `ensureRoles` and `ensurePartitions` give `DB_UNAVAILABLE` (no URL or password in the text); at engine boot `openDatabase` retries until `openTimeoutMs`, then `main` logs the fatal line, exits 1 and opens no port. Up but not migrated: the engine starts, warns `not_migrated`, `/health` is 503.
- Bad URL, option, password or window: `DB_INVALID` with `details.reason`. Migration SQL error: rolled back, `MIGRATION_FAILED` names the file. Edited or missing file: `MIGRATION_CHECKSUM_MISMATCH` or `MIGRATION_FILE_MISSING`, nothing applied. Second runner: waits, then `MIGRATION_LOCK_TIMEOUT`.
- Roles absent or unsafe: `MIGRATION_ROLE_MISSING`, `MIGRATION_ROLE_INVALID`; privileged app endpoint: `DB_ROLE_UNSAFE`. Bad partitioned table: `PARTITION_*` error, nothing created; rows in DEFAULT: `skipped`.
- Test cluster cannot start: `TEST_CLUSTER_START_FAILED`; no env var: `TEST_CLUSTER_MISSING`.

## Security

1. No new endpoint; `/health` stays public and gains only `checks.db`, `"ok"` or `"fail"`.
2. Tenant isolation: no tenant data; `schema_migration` is a global ledger the app role cannot read. A forced-RLS probe table proves the app pool is subject to RLS; a superuser, `BYPASSRLS`, owner or owner-member app role is refused.
3. Validation: URLs, options, file names, table keys and passwords are checked before use; statements use `format` or parameters.
4. Secrets: passwords come from `*_FILE` through `Secret.reveal()`, read only in `createPool` and `ensureRoles`, which sends a SCRAM verifier; no error, log line or `details` holds a URL, password or driver message, except `MIGRATION_FAILED`, which carries at most 200 characters of the Postgres message for a statement of a reviewed migration file. The API process never holds the owner credentials.
5. Abuse cases, each a scenario: edited migration; superuser, owner or owner-member as app endpoint; Postgres late, then privileged; two migrators; a quoted password; the app role touching the ledger; a URL with a password in an error; a bad partitioned table; the owner endpoint on the engine.

## Test plan

Node test runner, a `*.test.ts` beside each file; loopback only, no sleeps (`openDatabase` tests inject `sleep` and `clock`). No driver error escapes a test: it first asserts with `assert.ok` that the objects it reads exist (`to_regclass`, `to_regprocedure`, the constants, the file `0001_base.sql`) and expects SQL failures with `await assert.rejects(p, { code })`. `src/db/{roles,migrate,partitions,prepare,base}.test.ts` and `test/support/pg.test.ts` start their own cluster (`base.test.ts` builds its own migrated template and passes it as `opts.cluster`); `health.test.ts`, `open.test.ts` and `src/main.db.test.ts` use `withTestDatabase()`, the last starting with `assert.equal(typeof startServer, "function")` and `assert.equal(typeof openDatabase, "function")`. `test/support/global-setup.test.ts` begins with `assert.ok(process.env.TEST_PG_CLUSTER, "globalSetup did not publish TEST_PG_CLUSTER")`.

## Decisions made while writing

- **`sslmode=require`** is refused: it encrypts without verifying. Roles come from `ensureRoles`, never from migrations.
- **`createPool`:** `opts?` is added to the roadmap's `createPool(url)`. It takes any password of 1-512 characters without NUL; `ensureRoles` allows printable ASCII only (the verifier is built without SASLprep).
- **Fail closed:** at boot the engine waits up to 30 s for Postgres before it listens, so compose must start Postgres first or allow the wait.
- **`ensurePartitions`:** "partitioned table" means range-partitioned; a range table with an unusable key fails loudly instead of silently filling DEFAULT; the window is whole months (a day table gets about 150 partitions); a range covered by a differently named partition is left alone.
- **Interface list trimmed** to the 3,000 characters `proposal.md` allows: type aliases and internal helpers (`DbErrorCode`, `checksumOf`, the lock SQL) are not exported or are inline.
- **Two capabilities:** the test-support requirements live in `specs/test-database` so that `database/spec.md` stays under 18,000 characters.
- **Task order:** the base migration precedes the shared cluster, so `globalSetup` migrates a directory that has a file.
- **Hand-off:** add-e2e-stack's database part calls `prepareDatabase(ownerPool, systemClock)` on its template and restates `OpenDeps.openTimeoutMs`.
