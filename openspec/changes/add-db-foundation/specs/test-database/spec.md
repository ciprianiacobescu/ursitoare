## Purpose

The Postgres used by the test gate: one embedded cluster per `pnpm run test` run and a fresh, migrated database for each test, with an owner pool and an app-role pool.

## ADDED Requirements

### Requirement: One embedded Postgres cluster per test run
`test/support/global-setup.ts` SHALL start one Postgres 18.4 cluster on a free loopback port, create both roles with random passwords, build a template with `prepareDatabase(ownerPool, systemClock)`, publish it in `TEST_PG_CLUSTER`, and stop the cluster in `globalTeardown`.

#### Scenario: Coordinates reach test files
- **WHEN** a test file calls `readTestCluster()` during `pnpm run test`, connects over `adminUrl` (database `postgres`) and calls `withTestDatabase()`
- **THEN** `host` is `"127.0.0.1"`, `server_version` starts `"18.4"`, both roles exist, and the cloned database has a ledger row per file in `DEFAULT_MIGRATIONS_DIR`; only `globalSetup` ever connects to the template, before any test file starts

#### Scenario: Setup then teardown
- **WHEN** a test saves `process.env.TEST_PG_CLUSTER`, calls `globalSetup()` then `globalTeardown()` in the test file's own process (no child process), and restores the variable in `finally`
- **THEN** after the first call the variable names a new cluster that accepts a connection; after the second it is unset and that port refuses connections

#### Scenario: No cluster or no start
- **WHEN** `startCluster({ port })` gets the port of a running cluster, and `withTestDatabase()` runs with `TEST_PG_CLUSTER` unset (saved, deleted and restored in `finally`, because global setup sets it for every test file)
- **THEN** the first rejects with `TestClusterError` `TEST_CLUSTER_START_FAILED`, `dataDir` removed; the second with `TEST_CLUSTER_MISSING`, the message naming `pnpm run test`

### Requirement: A fresh database per test
`withTestDatabase(opts?)` SHALL return a database cloned from the template, with `ownerPool` and `appPool` connected as `ursitoare_owner` and `ursitoare_app`, and `close()` SHALL end both pools and drop the database.

#### Scenario: Fresh, isolated, dropped on close
- **WHEN** `withTestDatabase()` is called twice, the owner creates `ursitoare.only_here` in the first, both are closed (the first twice), and eight more calls run in parallel and are closed
- **THEN** the names differ, the second lacks the table, both hold the ledger, `current_user` is `ursitoare_app` on `appPool` and `ursitoare_owner` on `ownerPool`; after closing no `pg_database` row remains and nothing rejects; `{ migrated: false }` has no schema `ursitoare`

#### Scenario: App pool obeys RLS
- **WHEN** the owner creates `ursitoare.rls_probe (tenant_id text)` with policy `tenant_id = current_setting('app.tenant_id', true)`, rows for tenants `a` and `b` inserted before RLS is forced, and `SELECT` granted to the app role
- **THEN** `appPool`, after `set_config('app.tenant_id', 'a', true)` in a transaction, sees only the `a` row, while the superuser from `adminUrl` sees both
