## Purpose

The Postgres foundation: pool, migration runner, roles, partitions, health check and test Postgres.

## ADDED Requirements

### Requirement: Pool from a database endpoint
`createPool(source, opts?)` SHALL return a `pg` pool for a `postgres:` or `postgresql:` URL or config endpoint without connecting, and refuse anything else with `DB_INVALID`, `details.reason` naming the first failed rule (scheme `bad_scheme`, read from the raw text; parse `bad_url`; host `missing_host`; then the rest), the message never holding the URL or a password.

#### Scenario: Endpoint with a separate password
- **WHEN** `createPool({ url: "postgres://u@127.0.0.1:5433/d", password: { reveal: () => "s3cret-x" } })` and `createPool("postgresql://u@127.0.0.1:5433/d")` are called
- **THEN** the first `pool.options` has `host` `"127.0.0.1"`, `port` `5433`, `user` `"u"`, `database` `"d"`, `max` `10`, `password` `"s3cret-x"`, `ssl` `false`, and `pool.totalCount` is `0`; the second the same `host`; `?sslmode=verify-full` gives `ssl` `{ rejectUnauthorized: true }`

#### Scenario: Bad input is refused without echoing it
- **WHEN** the source is `"mysql://u@h/d"`, `"not a url"`, `"postgres:///d"`, `"postgres://u@/d"`, `"postgres://h:99999/d"`, `"postgres://u@h/d?host=x"`, `"postgres://u:p4ss@h/d?sslmode=require"`, an endpoint whose password is `""`, or the options are `{ max: 0 }`
- **THEN** each throws `DB_INVALID` without `"p4ss"` or the URL in the message, `details.reason` being `bad_scheme` (twice), `missing_host`, `bad_url` (twice), `unsupported_parameter`, `unsupported_sslmode`, `bad_password`, `bad_option`

#### Scenario: An idle client error does not crash the process
- **WHEN** `pool.emit("error", new Error("boom"))` runs on a pool made with an `onError` recorder, and on one without
- **THEN** the recorder gets that error once and neither call throws

### Requirement: Migration file names
`readMigrationFiles(dir)` SHALL return the files of `dir` as `{ version, name, file, sql, checksum }` in ascending order, and refuse with `MIGRATION_INVALID_NAME` an entry that is not a regular file named `NNNN_<name>.sql` (`NNNN` at least 1) or a repeated version; gaps are allowed.

#### Scenario: Valid directory
- **WHEN** `dir` holds `0002_b.sql` and `0001_a.sql`
- **THEN** versions are `[1, 2]`, names `["a", "b"]`, files `["0001_a.sql", "0002_b.sql"]`, each `checksum` the SHA-256 hex of its bytes; an empty directory gives `[]`

#### Scenario: Invalid entries
- **WHEN** `dir` holds `0001_a.sql` plus `0001_b.sql`; or plus one of `1_a.sql`, `0002_A.sql`, `0002_a.SQL`, `README.md`; or plus a subdirectory `0002_d.sql`; or `0000_z.sql` alone
- **THEN** `MIGRATION_INVALID_NAME` is thrown with `details.file` the offending name and `details.reason` `duplicate_version`, `bad_name` (four times), `not_regular_file`, `bad_name`

#### Scenario: Empty file, transaction control, no directory
- **WHEN** a file is empty, or holds a line `commit;`, or `dir` does not exist
- **THEN** `MIGRATION_FAILED` is thrown, `details.reason` `empty`, `transaction_control` or `directory_unreadable`

### Requirement: Forward-only migration runner
`migrate(pool, dir?, opts?)` SHALL apply pending files in ascending version order, each in its own transaction after `SET LOCAL search_path = ursitoare, pg_catalog`, record each in `ursitoare.schema_migration`, and return `{ applied }` (names like `"0001_base"`); it SHALL apply nothing and fail with `MIGRATION_CHECKSUM_MISMATCH` when an applied file changed, or `MIGRATION_FILE_MISSING` when a ledger row has no file of that version and name.

#### Scenario: Apply, repeat, extend, fill a gap
- **WHEN** a bare database is migrated with `0001_a.sql` (`CREATE TABLE widget (id int)`), `0002_b.sql` and `0003_c.sql`, again, and a third time after `0004_d.sql` is added; another is migrated with `0001_a.sql` and `0003_c.sql`, then again after `0002_b.sql` is added
- **THEN** the results are `{ applied: ["0001_a", "0002_b", "0003_c"] }`, `{ applied: [] }`, `{ applied: ["0004_d"] }`, with ledger versions 1 to 4, names, 64-hex checksums, `applied_at` and `ursitoare.widget`; the other gives `["0001_a", "0003_c"]` then `["0002_b"]`, ledger versions `[1, 2, 3]`

#### Scenario: A failing migration rolls back and stops
- **WHEN** `0002_b.sql` is `CREATE TABLE ursitoare.t (x int); SELECT 1/0;` and `0003_c.sql` is valid
- **THEN** it rejects with `MIGRATION_FAILED`, message starting `0002_b.sql:`, `details.sqlstate` `"22012"`; `ursitoare.t` is absent, the ledger holds only version 1, `pg_try_advisory_lock(hashtextextended('ursitoare:migrate', 0))` returns `true` elsewhere; with `0002_b.sql` fixed the next run returns `["0002_b", "0003_c"]`

#### Scenario: Empty directory and Postgres down
- **WHEN** an empty directory is migrated on a bare database, and a pool with password `"pw-Q9"` aimed at a closed `freePort()` migrates a valid directory
- **THEN** the first returns `{ applied: [] }` with an empty ledger table; the second rejects with `DB_UNAVAILABLE`, `details.reason` `"ECONNREFUSED"`, the message without `"pw-Q9"`

#### Scenario: Edited, gone or renamed file
- **WHEN** versions 1 and 2 are applied and `0003_c.sql` is added, then `0001_a.sql` gets a comment line appended; or `0002_b.sql` is deleted, or renamed `0002_z.sql` with the same bytes, or the directory is emptied
- **THEN** `migrate` rejects with `MIGRATION_CHECKSUM_MISMATCH` (`details.file` `"0001_a.sql"`), then `MIGRATION_FILE_MISSING` (`details.version` `2`, `1` if emptied); `0003_c` stays unapplied and the ledger is unchanged

### Requirement: Concurrent runners are serialised
`migrate` SHALL hold the advisory lock `pg_advisory_lock(hashtextextended('ursitoare:migrate', 0))` while it runs, so a second runner waits and applies nothing, or fails with `MIGRATION_LOCK_TIMEOUT` after `opts.lockTimeoutMs`, and SHALL release it on every exit.

#### Scenario: Two runners
- **WHEN** two pools call `migrate` at once on a bare database; three files each run `SELECT pg_sleep(0.05)`
- **THEN** both resolve, one with `applied` of length 3 and the other with `[]`, and the ledger has 3 rows

#### Scenario: Lock held elsewhere
- **WHEN** another session holds `SELECT pg_advisory_lock(hashtextextended('ursitoare:migrate', 0))` and `migrate(pool, dir, { lockTimeoutMs: 200 })` runs
- **THEN** it rejects with `MIGRATION_LOCK_TIMEOUT`, ledger untouched; after the unlock `migrate` succeeds

### Requirement: Roles are bootstrapped and checked
`ensureRoles(adminPool, passwords?)` SHALL idempotently create or repair the login roles `ursitoare_owner` and `ursitoare_app` (no superuser, `BYPASSRLS`, `CREATEDB`, `CREATEROLE` or `REPLICATION`; every membership of the app role revoked) and send only a SCRAM-SHA-256 verifier to the server; `migrate` SHALL refuse before any DDL, with `MIGRATION_ROLE_MISSING` or `MIGRATION_ROLE_INVALID`, unless both roles exist unprivileged and the session user is `ursitoare_owner`.

#### Scenario: Create, repeat, repair
- **WHEN** `ensureRoles(admin, { ownerPassword: "o-1", appPassword: "a-1" })` runs twice on a pristine cluster, then, after `ALTER ROLE ursitoare_app BYPASSRLS`, `GRANT ursitoare_owner TO ursitoare_app`, `GRANT pg_read_all_data TO ursitoare_app` and, by a `CREATEROLE` login holding `pg_monitor` `WITH ADMIN OPTION`, `GRANT pg_monitor TO ursitoare_app`, `ensureRoles(admin, { appPassword: "a-2" })`
- **THEN** `created` is `["ursitoare_owner", "ursitoare_app"]`, `[]`, `[]`; neither role has `rolsuper`, `rolbypassrls`, `rolcreatedb` or `rolcreaterole`; `pg_auth_members` has no row whose `member` is `ursitoare_app`; `"a-2"` logs in as the app role and `"a-1"` does not; both `pg_authid.rolpassword` values start with `SCRAM-SHA-256$4096:` and lack `a-2`

#### Scenario: Bad input, a weak admin and quotes
- **WHEN** `appPassword` is `""`, holds a NUL, holds `"é"` or is 513 characters long; `ensureRoles` gets a pool connected as `ursitoare_app`; and `appPassword` is `o'brien";DROP ROLE ursitoare_owner;--` in two concurrent calls
- **THEN** the first four reject with `DB_INVALID`, `details.reason` `bad_password`, the fifth with `DB_ROLES_FAILED`, `details.sqlstate` `"42501"`; the concurrent calls resolve, the app role logs in with that password and `ursitoare_owner` still exists

#### Scenario: Migration preconditions
- **WHEN** `migrate` runs on bare databases (a) with only `ursitoare_owner` made by raw `CREATE ROLE`; (b) after `ensureRoles`, on a superuser pool; then as the owner (c) after `ALTER ROLE ursitoare_app BYPASSRLS`; (d) after `GRANT ursitoare_owner TO ursitoare_app`; (e) after granting the app role a `BYPASSRLS` role; (f) after `ALTER ROLE ursitoare_owner BYPASSRLS`
- **THEN** it rejects with `MIGRATION_ROLE_MISSING` (`details.roles` `["ursitoare_app"]`), `MIGRATION_ROLE_INVALID` `wrong_session_role`, for (c) to (e) `MIGRATION_ROLE_INVALID` `app_role_privileged`, for (f) `owner_role_privileged`; none creates schema `ursitoare`

### Requirement: Base migration and grants model
`0001_base.sql` SHALL create schema `ursitoare` owned by `ursitoare_owner`, grant `ursitoare_app` only `USAGE` on it, hide `schema_migration` from the app role, remove `PUBLIC` execution from new owner functions, and leave `ursitoare_app` owning nothing.

#### Scenario: Ledger and ownership
- **WHEN** a `withTestDatabase()` database is inspected as the owner
- **THEN** the ledger has a row per file of `DEFAULT_MIGRATIONS_DIR`, version `1` named `"base"` with the SHA-256 of `0001_base.sql` as checksum; the schema owner is `ursitoare_owner`; `ursitoare_app` owns no row of `pg_class`, `pg_namespace`, `pg_proc` or `pg_type`

#### Scenario: The app role has no more than USAGE
- **WHEN** `appPool` runs `SELECT * FROM ursitoare.schema_migration`, `UPDATE ursitoare.schema_migration SET name = 'x'`, `DROP TABLE ursitoare.schema_migration` and `CREATE TABLE ursitoare.x (a int)`
- **THEN** each fails with SQLSTATE `42501`, `has_schema_privilege('ursitoare_app', 'ursitoare', 'USAGE')` is `true`, and `current_user` is `ursitoare_app` with `rolsuper` and `rolbypassrls` `false`

#### Scenario: New objects start closed
- **WHEN** the owner creates function `ursitoare.probe()` and table `ursitoare.probe_t`
- **THEN** `has_function_privilege('ursitoare_app', 'ursitoare.probe()', 'EXECUTE')` and `has_table_privilege('ursitoare_app', 'ursitoare.probe_t', 'SELECT')` are `false`, and `true` after the owner grants them

### Requirement: Partitions are created ahead by whoever migrates
`ensurePartitions(ownerPool, clock, opts?)` SHALL create the missing UTC partitions `<table>_pYYYYMMDD` or `_pYYYYMM` of every range table of schema `ursitoare` with one time key and the comment `partition: day|month`, from `monthsBack` (default 1) months before to `monthsAhead` (default 3) after the clock's month, idempotently and never touching DEFAULT; `prepareDatabase(ownerPool, clock)` SHALL run `migrate` then `ensurePartitions`; the engine SHALL call neither.

#### Scenario: A month table gets its window
- **WHEN** the owner creates `ursitoare.pt_month` (`at timestamptz`, `PARTITION BY RANGE (at)`, DEFAULT partition, comment `partition: month`) and `ensurePartitions(ownerPool, clock)` runs twice with the clock at `2026-10-15T12:00:00Z`
- **THEN** the first `created` is `ursitoare.pt_month_p202609`, `_p202610`, `_p202611`, `_p202612`, `_p202701`, `skipped` `[]`; the second has both `[]`; rows at `2026-10-31T23:59:59Z` and `2026-11-01T00:00:00Z` land in `_p202610` and `_p202611`; DEFAULT is unchanged and `ursitoare_app` has no privilege on a new partition

#### Scenario: A day table and the window options
- **WHEN** `ursitoare.pt_day` (`at date`, comment `partition: day`) exists and `ensurePartitions(ownerPool, clock, { monthsBack: 0, monthsAhead: 0 })` runs with the clock at `2026-02-10T00:00:00Z`; then with `{ monthsAhead: -1 }` and `{ monthsBack: 1.5 }`
- **THEN** `created` holds the 28 names `ursitoare.pt_day_p20260201` to `_p20260228`; the bad options reject with `DB_INVALID`, `details.reason` `bad_option`

#### Scenario: Tables that are skipped or refused
- **WHEN** the schema holds a LIST and a HASH partitioned table and `ensurePartitions` runs; then, beside a valid `pt_month` and one at a time, a range table with no comment, with the comment `partition: week`, or keyed on `(at, id)` or on a `text` column (both with comment `partition: month`) is added
- **THEN** the first run resolves with `created` `[]`; the comment cases reject with `PARTITION_GRANULARITY_MISSING`, the key cases with `PARTITION_KEY_UNSUPPORTED`, `details.table` naming the bad table, and nothing is created, not even for `pt_month`

#### Scenario: Rows already in DEFAULT
- **WHEN** `pt_month` holds a row dated `2026-11-10` in DEFAULT and a partition `pt_month_old` covers October 2026, and `ensurePartitions` runs with the clock at `2026-10-15T12:00:00Z`
- **THEN** it resolves, `skipped` is `["ursitoare.pt_month_p202611"]`, `created` holds the September, December and January names, the row stays in DEFAULT, and October is neither created nor skipped

#### Scenario: Concurrent callers and Postgres down
- **WHEN** two calls run at once on a fresh `pt_month`, and a pool on a closed port calls it
- **THEN** `created` lengths are `0` and `5`; the third rejects with `DB_UNAVAILABLE`, `details.reason` `"ECONNREFUSED"`

#### Scenario: prepareDatabase migrates then partitions
- **WHEN** `prepareDatabase(ownerPool, clock)` runs on a bare database with both roles, the owner then creates `pt_month`, and it runs again
- **THEN** the first has `applied` every file name of `DEFAULT_MIGRATIONS_DIR` and `partitions` `[]`; the second `applied` `[]` and `partitions` of length `5`

### Requirement: Database opening and health check
`openDatabase(config, deps)` SHALL return `null` without an app endpoint; otherwise inspect the runtime role, retrying every 500 ms until it succeeds or `openTimeoutMs` (default 30000) passes, throw `DB_ROLE_UNSAFE` for a superuser, `BYPASSRLS`, schema owner or member of `ursitoare_owner` or of a privileged role, throw `DB_UNAVAILABLE` at the deadline, and else register the check `db`: `"ok"` only when schema `ursitoare` exists and the role is unprivileged.

#### Scenario: Not configured
- **WHEN** `openDatabase` is called with `app: null` and `owner: null`, then with only `owner` set
- **THEN** both results are `null`, nothing is registered, and only the second logs one warn `{ code: "DB_INVALID", reason: "owner_without_app" }`, message `URSITOARE_DATABASE_OWNER_URL is set without URSITOARE_DATABASE_URL; database disabled`

#### Scenario: Configured, then closed
- **WHEN** it is called with a `withTestDatabase()` database's `appEndpoint`
- **THEN** `"db"` is registered once and the check gives `"ok"`; after `database.close()` (twice) it gives `"fail"`

#### Scenario: Not migrated
- **WHEN** the endpoint is a `{ migrated: false }` test database
- **THEN** it resolves a `Database`, registers `"db"`, the check gives `"fail"`, and exactly one warn is logged, `{ code: "DB_UNAVAILABLE", reason: "not_migrated" }`, message `database is not migrated; run the migrations`

#### Scenario: Postgres down fails closed
- **WHEN** the endpoint aims at a closed port (`freePort()`) with `openTimeoutMs` `50`, a recording `sleep` and a `clock` that `sleep` advances
- **THEN** it rejects with `DB_UNAVAILABLE`, `details.reason` `"ECONNREFUSED"`; `sleep` calls are `[50]`; nothing is registered or logged

#### Scenario: A privileged role that arrives late
- **WHEN** a closed port gets a cluster started by the first `sleep` call, and the endpoint is that cluster's superuser
- **THEN** it rejects with `DB_ROLE_UNSAFE`, `details.reason` `"superuser"`, and registers nothing

#### Scenario: Privileged endpoints
- **WHEN** the endpoint is the cluster superuser, a `BYPASSRLS` login, an `ownerEndpoint`, a login granted `ursitoare_owner`, or a login granted a `BYPASSRLS` role
- **THEN** it rejects with `DB_ROLE_UNSAFE`, `details.reason` `superuser`, `bypassrls`, `owns_schema`, `owner_member` or `privileged_member`, and registers nothing

#### Scenario: Check inputs
- **WHEN** the check runs on stub pools whose `query` resolves `{ rows: [{ migrated: true, rolsuper: false, rolbypassrls: false, owns_schema: false, owner_member: false, privileged_member: false }] }`, the same with `migrated: false`, with `owner_member: true`, with `privileged_member: true`, rejects, or never settles (`timeoutMs: 10`)
- **THEN** it resolves `"ok"`, then `"fail"` five times, never throwing

### Requirement: Engine boot with a database
`main` SHALL open the database before it listens, report it as `checks.db`, never run `migrate` or `ensurePartitions` or open `database.owner`, and when `openDatabase` throws write the engine's one fatal line (`add-engine-skeleton` decision 9), call `exit(1)` and open no port; it SHALL end the app pool (`database.close()`) when the server shuts down and when `listen` fails.

#### Scenario: No database keeps /health green
- **WHEN** `running = await startServer(0)` runs, and `main` runs with `database` `{ app: null, owner: null }` and an `openDatabase` spy that resolves `null`
- **THEN** `typeof startServer` is `"function"`, `typeof running.url` is `"string"`, both `GET /health` answers are 200 with `status` `"ok"` and `checks` `{}`, and the spy was called once with the loaded config

#### Scenario: Database configured
- **WHEN** `main` runs with a migrated test database's `appEndpoint` as `app` and `ownerEndpoint` as `owner`, and an `openDatabase` wrapper keeping the real result, then that `Database` is closed
- **THEN** `/health` answers 200 with `checks` `{ db: "ok" }`, afterwards 503 with `checks` `{ db: "fail" }`; over `adminUrl`, `pg_stat_activity` shows the same number of `ursitoare_owner` sessions on that database before and after the start

#### Scenario: A failed open stops the start
- **WHEN** `main` runs with an `openDatabase` that rejects with `new DbError("DB_UNAVAILABLE", "database unavailable", { reason: "ECONNREFUSED" })`, and again with `new DbError("DB_ROLE_UNSAFE", "unsafe role", { reason: "superuser" })`
- **THEN** exactly one fatal line is logged each time: `code` `"DB_UNAVAILABLE"` then `"DB_ROLE_UNSAFE"`, `reason` `"ECONNREFUSED"` then `"superuser"`, `msg` `"startup failed"` both times, no `variable`, `host` or `port`; each time `exit` gets `1`, no port is open and `main` resolves `null`

#### Scenario: Shutdown and a busy port end the pool
- **WHEN** `main` runs with a port-0 config, an `EventEmitter` signal source, an `exit` spy and an `openDatabase` stub resolving `{ appPool: {} as pg.Pool, close }` with a `close` spy, then `SIGTERM`; and again with the port of a listening server
- **THEN** the first time `close` has run once when `exit` gets `0`; the second time the one fatal line has `code` `"EADDRINUSE"`, `exit` gets `1`, `main` resolves `null` and `close` has run once
