# Verification: openspec:add-db-foundation: PASS (round 1)

traceability: 40/40 criteria covered by a discriminating test

- Base: `6c9571af8dcf3137bba40615a90d88eb589cdae3`
- Head: `970db98ce68d4ee10c4f13162024dc2b4859183e`
- Implementer profiles: deepseek, glm, claude-sonnet
- Judge: gemini-judge, 2 call(s), judged in 2 parts, prompt sha256 `48261b185910f0eedfdfa954a72c67e0a19be7b7538d7400d4b3275730f28a0e`
  - part 1: 17 file(s), 112340 characters, profile gemini-judge, reply valid
  - part 2: 10 file(s), 89842 characters, profile gemini-judge, reply valid
- Judge replies of gemini-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): gemini-judge google (declared), deepseek deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.6223

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@6c9571af8d contained |
| 1 | integrity | ok | 10.8 | 10 sub-checks; scope: 30 changed file(s) |
| 2 | build | ok | 15.5 |  |
| 3 | tests | ok | 14.8 |  |
| 4 | traceability | ok | 0.0 | 40/40 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/db/errors.ts, src/db/files.ts, src/db/health.ts, src/db/index.ts, src/db/migrate.ts and 8 more |
| 8 | s1 judge | ok | 2.8 | 40/40 criteria judged by jev |
| 9 | judge | ok | 400.4 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261026T1403Z-88d4/264-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261026T1403Z-88d4/265-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261026T1403Z-88d4/266-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261026T1403Z-88d4/267-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261026T1403Z-88d4/268-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261026T1403Z-88d4/269-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261026T1403Z-88d4/270-e2e.log |

## Files by part

- part 1: src/db/migrations/0001_base.sql (495 characters)
- part 1: src/db/base.test.ts (10128 characters)
- part 1: src/db/errors.ts (817 characters)
- part 1: src/db/files.test.ts (6630 characters)
- part 1: src/db/files.ts (3169 characters)
- part 1: test/support/global-setup.test.ts (4950 characters)
- part 1: test/support/global-setup.ts (3011 characters)
- part 1: src/db/health.test.ts (3971 characters)
- part 1: src/db/health.ts (3414 characters)
- part 1: src/db/index.ts (725 characters)
- part 1: src/main.db.test.ts (12262 characters)
- part 1: src/main.ts (2721 characters)
- part 1: src/db/migrate.test.ts (23116 characters)
- part 1: src/db/migrate.ts (8953 characters)
- part 1: src/db/open.test.ts (11371 characters)
- part 1: src/db/open.ts (3643 characters)
- part 1: src/db/partitions.test.ts (12964 characters)
- part 2: src/db/partitions.ts (9946 characters)
- part 2: test/support/pg.test.ts (11040 characters)
- part 2: test/support/pg.ts (9120 characters)
- part 2: src/db/pool.test.ts (4247 characters)
- part 2: src/db/pool.ts (4189 characters)
- part 2: src/db/prepare.test.ts (4471 characters)
- part 2: src/db/prepare.ts (865 characters)
- part 2: src/db/roles.test.ts (8254 characters)
- part 2: src/db/roles.ts (7147 characters)
- part 2: openspec/changes/add-db-foundation/tasks.md (30563 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/db/base.test.ts, src/db/errors.ts, src/db/files.test.ts, src/db/files.ts, src/db/health.test.ts (+20 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 155 of 155 base tests pass on the unit's code with its 12 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-7c1574be | database › Pool from a database endpoint › Endpoint with a separate password | covered | src.db.pool.test.ts::C-7c1574be createPool accepts postgresql URLs and verify-full TLS (passed, red_assertion); src.db.pool.test.ts::C-7c1574be createPool builds a pool from an endpoint password with the default options (passed, red_assertion) | - | 0.94 |
| C-63221721 | database › Pool from a database endpoint › Bad input is refused without echoing it | covered | src.db.pool.test.ts::C-63221721 createPool refuses bad endpoints and options without echoing them (passed, red_assertion) | - | 0.93 |
| C-dc754ade | database › Pool from a database endpoint › An idle client error does not crash the process | covered | src.db.pool.test.ts::C-dc754ade an idle client error reaches onError once and never throws (passed, red_assertion) | - | 0.92 |
| C-8a52d337 | database › Migration file names › Valid directory | covered | src.db.files.test.ts::C-8a52d337 readMigrationFiles allows gaps and returns an empty list for an empty directory (passed, red_assertion); src.db.files.test.ts::C-8a52d337 readMigrationFiles sorts valid files and hashes their bytes (passed, red_assertion) | - | 0.94 |
| C-55276583 | database › Migration file names › Invalid entries | covered | src.db.files.test.ts::C-55276583 readMigrationFiles refuses badly named entries (passed, red_assertion); src.db.files.test.ts::C-55276583 readMigrationFiles refuses duplicate versions (passed, red_assertion); src.db.files.test.ts::C-55276583 readMigrationFiles refuses version zero and non-file entri... | - | 0.92 |
| C-6a2a3916 | database › Migration file names › Empty file, transaction control, no directory | covered | src.db.files.test.ts::C-6a2a3916 readMigrationFiles refuses a directory that does not exist (passed, red_assertion); src.db.files.test.ts::C-6a2a3916 readMigrationFiles refuses an empty file (passed, red_assertion); src.db.files.test.ts::C-6a2a3916 readMigrationFiles refuses transaction control line... | - | 0.94 |
| C-c664fa4c | database › Forward-only migration runner › Apply, repeat, extend, fill a gap | covered | src.db.migrate.test.ts::C-2735b4ff C-c664fa4c migrate bootstraps an empty directory and applies a later file (passed, red_assertion); src.db.migrate.test.ts::C-c664fa4c migrate applies files in order, repeats, extends and fills a gap (passed, red_assertion) | - | 0.94 |
| C-4a57a001 | database › Forward-only migration runner › A failing migration rolls back and stops | covered | src.db.migrate.test.ts::C-4a57a001 a failing migration rolls back, releases the lock and stops (passed, red_assertion) | - | 0.90 |
| C-2735b4ff | database › Forward-only migration runner › Empty directory and Postgres down | covered | src.db.migrate.test.ts::C-2735b4ff C-c664fa4c migrate bootstraps an empty directory and applies a later file (passed, red_assertion) | - | 0.49 |
| C-b2b0429a | database › Forward-only migration runner › Edited, gone or renamed file | covered | src.db.migrate.test.ts::C-b2b0429a migrate refuses an edited missing renamed or emptied file set (passed, red_assertion) | - | 0.93 |
| C-77b8f169 | database › Concurrent runners are serialised › Two runners | covered | src.db.migrate.test.ts::C-77b8f169 two runners are serialised by the advisory lock (passed, red_assertion) | - | 0.74 |
| C-3815951d | database › Concurrent runners are serialised › Lock held elsewhere | covered | src.db.migrate.test.ts::C-3815951d migrate refuses an invalid lock timeout before querying (passed, red_assertion); src.db.migrate.test.ts::C-3815951d migrate times out on a held lock and releases its own after a failure (passed, red_assertion) | - | 0.87 |
| C-f1949ac2 | database › Roles are bootstrapped and checked › Create, repeat, repair | covered | src.db.roles.test.ts::C-f1949ac2 ensureRoles creates repeats and repairs the login roles (passed, red_assertion) | - | 0.92 |
| C-d380769b | database › Roles are bootstrapped and checked › Bad input, a weak admin and quotes | covered | src.db.roles.test.ts::C-d380769b ensureRoles keeps a quoted password and the owner role (passed, red_assertion); src.db.roles.test.ts::C-d380769b ensureRoles refuses a weak admin with DB_ROLES_FAILED (passed, red_assertion); src.db.roles.test.ts::C-d380769b ensureRoles refuses empty non-ASCII NUL an... | - | 0.91 |
| C-94eda93a | database › Roles are bootstrapped and checked › Migration preconditions | covered | src.db.migrate.test.ts::C-94eda93a migrate refuses missing and privileged roles before any DDL (passed, red_assertion) | - | 0.92 |
| C-d4c6bb53 | database › Base migration and grants model › Ledger and ownership | covered | src.db.base.test.ts::C-d4c6bb53 the base migration records the ledger and keeps objects owned by the owner role (passed, red_assertion) | - | 0.93 |
| C-e3e42ffe | database › Base migration and grants model › The app role has no more than USAGE | covered | src.db.base.test.ts::C-e3e42ffe the app role has only USAGE on the schema (passed, red_assertion) | - | 0.87 |
| C-162b9c47 | database › Base migration and grants model › New objects start closed | covered | src.db.base.test.ts::C-162b9c47 new functions and tables start closed to the app role (passed, red_assertion) | - | 0.91 |
| C-fb7ba2ed | database › Partitions are created ahead by whoever migrates › A month table gets its window | covered | src.db.partitions.test.ts::C-fb7ba2ed ensurePartitions creates the monthly window and routes rows (passed, red_assertion) | - | 0.92 |
| C-c37e9432 | database › Partitions are created ahead by whoever migrates › A day table and the window options | covered | src.db.partitions.test.ts::C-c37e9432 ensurePartitions creates daily partitions and refuses bad window options (passed, red_assertion) | - | 0.95 |
| C-5cc5a771 | database › Partitions are created ahead by whoever migrates › Tables that are skipped or refused | covered | src.db.partitions.test.ts::C-5cc5a771 ensurePartitions ignores list and hash parents and refuses unusable range tables (passed, red_assertion) | - | 0.93 |
| C-f0ece24f | database › Partitions are created ahead by whoever migrates › Rows already in DEFAULT | covered | src.db.partitions.test.ts::C-f0ece24f ensurePartitions skips a range whose rows already sit in the DEFAULT partition (passed, red_assertion) | - | 0.92 |
| C-87e84b3f | database › Partitions are created ahead by whoever migrates › Concurrent callers and Postgres down | covered | src.db.partitions.test.ts::C-87e84b3f ensurePartitions serialises callers and fails closed when Postgres is down (passed, red_assertion) | - | 0.92 |
| C-58e0ebf0 | database › Partitions are created ahead by whoever migrates › prepareDatabase migrates then partitions | covered | src.db.prepare.test.ts::C-58e0ebf0 prepareDatabase migrates first and then creates the partition window (passed, red_assertion) | - | 0.93 |
| C-1f0e219e | database › Database opening and health check › Not configured | covered | src.db.open.test.ts::C-1f0e219e openDatabase returns null for no endpoint and warns once for an owner alone (passed, red_assertion) | - | 0.94 |
| C-869163e0 | database › Database opening and health check › Configured, then closed | covered | src.db.open.test.ts::C-869163e0 openDatabase registers db once, ok, then fail after close twice (passed, red_assertion) | - | 0.94 |
| C-7454acfb | database › Database opening and health check › Not migrated | covered | src.db.open.test.ts::C-7454acfb openDatabase on an unmigrated database registers db, fails it and warns once (passed, red_assertion) | - | 0.95 |
| C-32617fd8 | database › Database opening and health check › Postgres down fails closed | covered | src.db.open.test.ts::C-32617fd8 openDatabase fails closed on a closed port after one sleep of the remaining time (passed, red_assertion); src.db.open.test.ts::C-32617fd8 openDatabase rejects a bad openTimeoutMs and a bad scheme without sleeping (passed, red_assertion) | - | 0.92 |
| C-faf8f8a6 | database › Database opening and health check › A privileged role that arrives late | covered | src.db.open.test.ts::C-faf8f8a6 openDatabase refuses a superuser whose cluster starts during the first sleep (passed, red_assertion) | - | 0.93 |
| C-69717e99 | database › Database opening and health check › Privileged endpoints | covered | src.db.open.test.ts::C-69717e99 openDatabase refuses every privileged app endpoint and registers nothing (passed, red_assertion) | - | 0.91 |
| C-ebfa9bed | database › Database opening and health check › Check inputs | covered | src.db.health.test.ts::C-ebfa9bed createDbHealthCheck fails closed when the query rejects or times out (passed, red_assertion); src.db.health.test.ts::C-ebfa9bed createDbHealthCheck refuses an invalid timeout before querying (passed, red_assertion); src.db.health.test.ts::C-ebfa9bed createDbHealthCh... | - | 0.90 |
| C-b3bd64b0 | database › Engine boot with a database › No database keeps /health green | covered | src.main.db.test.ts::C-b3bd64b0 main opens no database and keeps health green (passed, red_assertion) | - | 0.94 |
| C-fb007fe9 | database › Engine boot with a database › Database configured | covered | src.main.db.test.ts::C-fb007fe9 main registers db, serves ok then fail, and never opens the owner (passed, red_assertion) | - | 0.92 |
| C-ad848b65 | database › Engine boot with a database › A failed open stops the start | covered | src.main.db.test.ts::C-ad848b65 main writes one fatal line and opens no port when the open fails (passed, red_assertion) | - | 0.91 |
| C-6d93e8d5 | database › Engine boot with a database › Shutdown and a busy port end the pool | covered | src.main.db.test.ts::C-6d93e8d5 shutdown and a failed listen end the app pool (passed, red_assertion) | - | 0.93 |
| C-589bae1c | test-database › One embedded Postgres cluster per test run › Coordinates reach test files | covered | test.support.global-setup.test.ts::C-589bae1c global setup publishes the coordinates of a migrated shared cluster (passed, red_assertion) | - | 0.61 |
| C-b3edfa92 | test-database › One embedded Postgres cluster per test run › Setup then teardown | covered | test.support.global-setup.test.ts::C-b3edfa92 global setup starts a cluster and global teardown stops it (passed, red_assertion) | - | 0.90 |
| C-f2409274 | test-database › One embedded Postgres cluster per test run › No cluster or no start | covered | test.support.pg.test.ts::C-f2409274 startCluster refuses a busy port and removes its data directory (passed, red_assertion); test.support.pg.test.ts::C-f2409274 withTestDatabase needs TEST_PG_CLUSTER when no cluster is given (passed, red_assertion) | - | 0.92 |
| C-6d9f36e4 | test-database › A fresh database per test › Fresh, isolated, dropped on close | covered | test.support.pg.test.ts::C-6d9f36e4 eight databases run in parallel and all drop on close (passed, red_assertion); test.support.pg.test.ts::C-6d9f36e4 migrated false has no schema while the default clone does (passed, red_assertion); test.support.pg.test.ts::C-6d9f36e4 withTestDatabase clones fresh ... | - | 0.92 |
| C-081c5cff | test-database › A fresh database per test › App pool obeys RLS | covered | src.db.base.test.ts::C-081c5cff the app role is subject to forced row level security (passed, red_assertion); test.support.pg.test.ts::C-081c5cff the app pool is subject to row level security (passed, red_assertion) | - | 0.91 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-db-foundation/.l4/ledger/r-20261026T1345Z-9f1a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-db-foundation/.l4/ledger/r-20261026T1402Z-3a50.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-db-foundation/.l4/ledger/r-20261026T1403Z-88d4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-db-foundation/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/db/base.test.ts` |  | relevant | new test file |
| `src/db/errors.ts` | db | relevant | named in the spec |
| `src/db/files.test.ts` |  | relevant | new test file |
| `src/db/files.ts` | db | relevant | named in the spec |
| `src/db/health.test.ts` |  | relevant | new test file |
| `src/db/health.ts` | db | relevant | named in the spec |
| `src/db/index.ts` | db | relevant | named in the spec |
| `src/db/migrate.test.ts` |  | relevant | new test file |
| `src/db/migrate.ts` | db | relevant | named in the spec |
| `src/db/migrations/0001_base.sql` | db | relevant | named in the spec |
| `src/db/open.test.ts` |  | relevant | new test file |
| `src/db/open.ts` | db | relevant | named in the spec |
| `src/db/partitions.test.ts` |  | relevant | new test file |
| `src/db/partitions.ts` | db | relevant | named in the spec |
| `src/db/pool.test.ts` |  | relevant | new test file |
| `src/db/pool.ts` | db | relevant | named in the spec |
| `src/db/prepare.test.ts` |  | relevant | new test file |
| `src/db/prepare.ts` | db | relevant | named in the spec |
| `src/db/roles.test.ts` |  | relevant | new test file |
| `src/db/roles.ts` | db | relevant | named in the spec |
| `src/main.db.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/support/global-setup.test.ts` |  | relevant | new test file |
| `test/support/global-setup.ts` | test | relevant | named in the spec |
| `test/support/pg.test.ts` |  | relevant | new test file |
| `test/support/pg.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/db/errors.ts, src/db/files.ts, src/db/health.ts, src/db/index.ts, src/db/migrate.ts and 8 more

### Tests

215 of 215 passed, 0 failed, 0 errored, 0 skipped.
59 of 59 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-7c1574be | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63221721 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dc754ade | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8a52d337 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-55276583 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6a2a3916 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c664fa4c | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4a57a001 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2735b4ff | ok | 0.490 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b2b0429a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-77b8f169 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3815951d | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f1949ac2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d380769b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-94eda93a | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d4c6bb53 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e3e42ffe | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-162b9c47 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb7ba2ed | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c37e9432 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5cc5a771 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f0ece24f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87e84b3f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-58e0ebf0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1f0e219e | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-869163e0 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7454acfb | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-32617fd8 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-faf8f8a6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69717e99 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ebfa9bed | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b3bd64b0 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb007fe9 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ad848b65 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6d93e8d5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-589bae1c | ok | 0.610 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b3edfa92 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f2409274 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6d9f36e4 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-081c5cff | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-7c1574be | database › Pool from a database endpoint › Endpoint with a separate password | pass | pass | the judge passed it and a discriminating test passes |
| C-63221721 | database › Pool from a database endpoint › Bad input is refused without echoing it | pass | pass | the judge passed it and a discriminating test passes |
| C-dc754ade | database › Pool from a database endpoint › An idle client error does not crash the process | pass | pass | the judge passed it and a discriminating test passes |
| C-8a52d337 | database › Migration file names › Valid directory | pass | pass | the judge passed it and a discriminating test passes |
| C-55276583 | database › Migration file names › Invalid entries | pass | pass | the judge passed it and a discriminating test passes |
| C-6a2a3916 | database › Migration file names › Empty file, transaction control, no directory | pass | pass | the judge passed it and a discriminating test passes |
| C-c664fa4c | database › Forward-only migration runner › Apply, repeat, extend, fill a gap | pass | pass | the judge passed it and a discriminating test passes |
| C-4a57a001 | database › Forward-only migration runner › A failing migration rolls back and stops | pass | pass | the judge passed it and a discriminating test passes |
| C-2735b4ff | database › Forward-only migration runner › Empty directory and Postgres down | pass | pass | the judge passed it and a discriminating test passes |
| C-b2b0429a | database › Forward-only migration runner › Edited, gone or renamed file | pass | pass | the judge passed it and a discriminating test passes |
| C-77b8f169 | database › Concurrent runners are serialised › Two runners | pass | pass | the judge passed it and a discriminating test passes |
| C-3815951d | database › Concurrent runners are serialised › Lock held elsewhere | pass | pass | the judge passed it and a discriminating test passes |
| C-f1949ac2 | database › Roles are bootstrapped and checked › Create, repeat, repair | pass | pass | the judge passed it and a discriminating test passes |
| C-d380769b | database › Roles are bootstrapped and checked › Bad input, a weak admin and quotes | pass | pass | the judge passed it and a discriminating test passes |
| C-94eda93a | database › Roles are bootstrapped and checked › Migration preconditions | pass | pass | the judge passed it and a discriminating test passes |
| C-d4c6bb53 | database › Base migration and grants model › Ledger and ownership | pass | pass | the judge passed it and a discriminating test passes |
| C-e3e42ffe | database › Base migration and grants model › The app role has no more than USAGE | pass | pass | the judge passed it and a discriminating test passes |
| C-162b9c47 | database › Base migration and grants model › New objects start closed | pass | pass | the judge passed it and a discriminating test passes |
| C-fb7ba2ed | database › Partitions are created ahead by whoever migrates › A month table gets its window | pass | pass | the judge passed it and a discriminating test passes |
| C-c37e9432 | database › Partitions are created ahead by whoever migrates › A day table and the window options | pass | pass | the judge passed it and a discriminating test passes |
| C-5cc5a771 | database › Partitions are created ahead by whoever migrates › Tables that are skipped or refused | pass | pass | the judge passed it and a discriminating test passes |
| C-f0ece24f | database › Partitions are created ahead by whoever migrates › Rows already in DEFAULT | pass | pass | the judge passed it and a discriminating test passes |
| C-87e84b3f | database › Partitions are created ahead by whoever migrates › Concurrent callers and Postgres down | pass | pass | the judge passed it and a discriminating test passes |
| C-58e0ebf0 | database › Partitions are created ahead by whoever migrates › prepareDatabase migrates then partitions | pass | pass | the judge passed it and a discriminating test passes |
| C-1f0e219e | database › Database opening and health check › Not configured | pass | pass | the judge passed it and a discriminating test passes |
| C-869163e0 | database › Database opening and health check › Configured, then closed | pass | pass | the judge passed it and a discriminating test passes |
| C-7454acfb | database › Database opening and health check › Not migrated | pass | pass | the judge passed it and a discriminating test passes |
| C-32617fd8 | database › Database opening and health check › Postgres down fails closed | pass | pass | the judge passed it and a discriminating test passes |
| C-faf8f8a6 | database › Database opening and health check › A privileged role that arrives late | pass | pass | the judge passed it and a discriminating test passes |
| C-69717e99 | database › Database opening and health check › Privileged endpoints | pass | pass | the judge passed it and a discriminating test passes |
| C-ebfa9bed | database › Database opening and health check › Check inputs | pass | pass | the judge passed it and a discriminating test passes |
| C-b3bd64b0 | database › Engine boot with a database › No database keeps /health green | pass | pass | the judge passed it and a discriminating test passes |
| C-fb007fe9 | database › Engine boot with a database › Database configured | pass | pass | the judge passed it and a discriminating test passes |
| C-ad848b65 | database › Engine boot with a database › A failed open stops the start | pass | pass | the judge passed it and a discriminating test passes |
| C-6d93e8d5 | database › Engine boot with a database › Shutdown and a busy port end the pool | pass | pass | the judge passed it and a discriminating test passes |
| C-589bae1c | test-database › One embedded Postgres cluster per test run › Coordinates reach test files | pass | pass | the judge passed it and a discriminating test passes |
| C-b3edfa92 | test-database › One embedded Postgres cluster per test run › Setup then teardown | pass | pass | the judge passed it and a discriminating test passes |
| C-f2409274 | test-database › One embedded Postgres cluster per test run › No cluster or no start | pass | pass | the judge passed it and a discriminating test passes |
| C-6d9f36e4 | test-database › A fresh database per test › Fresh, isolated, dropped on close | pass | pass | the judge passed it and a discriminating test passes |
| C-081c5cff | test-database › A fresh database per test › App pool obeys RLS | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.db.base.test.ts::C-081c5cff the app role is subject to forced row level security` (task 6.1): passed
- `src.db.base.test.ts::C-162b9c47 new functions and tables start closed to the app role` (task 6.1): passed
- `src.db.base.test.ts::C-d4c6bb53 the base migration records the ledger and keeps objects owned by the owner role` (task 6.1): passed
- `src.db.base.test.ts::C-e3e42ffe the app role has only USAGE on the schema` (task 6.1): passed
- `src.db.files.test.ts::C-55276583 readMigrationFiles refuses badly named entries` (task 3.1): passed
- `src.db.files.test.ts::C-55276583 readMigrationFiles refuses duplicate versions` (task 3.1): passed
- `src.db.files.test.ts::C-55276583 readMigrationFiles refuses version zero and non-file entries` (task 3.1): passed
- `src.db.files.test.ts::C-6a2a3916 readMigrationFiles refuses a directory that does not exist` (task 3.1): passed
- `src.db.files.test.ts::C-6a2a3916 readMigrationFiles refuses an empty file` (task 3.1): passed
- `src.db.files.test.ts::C-6a2a3916 readMigrationFiles refuses transaction control lines` (task 3.1): passed
- `src.db.files.test.ts::C-8a52d337 readMigrationFiles allows gaps and returns an empty list for an empty directory` (task 3.1): passed
- `src.db.files.test.ts::C-8a52d337 readMigrationFiles sorts valid files and hashes their bytes` (task 3.1): passed
- `src.db.health.test.ts::C-ebfa9bed createDbHealthCheck fails closed when the query rejects or times out` (task 9.1): passed
- `src.db.health.test.ts::C-ebfa9bed createDbHealthCheck refuses an invalid timeout before querying` (task 9.1): passed
- `src.db.health.test.ts::C-ebfa9bed createDbHealthCheck reports fail after the test database is closed` (task 9.1): passed
- `src.db.health.test.ts::C-ebfa9bed createDbHealthCheck reports fail for an unmigrated test database` (task 9.1): passed
- `src.db.health.test.ts::C-ebfa9bed createDbHealthCheck reports ok for a migrated test database` (task 9.1): passed
- `src.db.health.test.ts::C-ebfa9bed createDbHealthCheck reports ok only for a migrated unprivileged role` (task 9.1): passed
- `src.db.migrate.test.ts::C-2735b4ff C-c664fa4c migrate bootstraps an empty directory and applies a later file` (task 5.1): passed
- `src.db.migrate.test.ts::C-3815951d migrate refuses an invalid lock timeout before querying` (task 5.2): passed
- `src.db.migrate.test.ts::C-3815951d migrate times out on a held lock and releases its own after a failure` (task 5.2): passed
- `src.db.migrate.test.ts::C-4a57a001 a failing migration rolls back, releases the lock and stops` (task 5.1): passed
- `src.db.migrate.test.ts::C-77b8f169 two runners are serialised by the advisory lock` (task 5.2): passed
- `src.db.migrate.test.ts::C-94eda93a migrate refuses missing and privileged roles before any DDL` (task 5.2): passed
- `src.db.migrate.test.ts::C-b2b0429a migrate refuses an edited missing renamed or emptied file set` (task 5.2): passed
- `src.db.migrate.test.ts::C-c664fa4c migrate applies files in order, repeats, extends and fills a gap` (task 5.1): passed
- `src.db.open.test.ts::C-1f0e219e openDatabase returns null for no endpoint and warns once for an owner alone` (task 9.2): passed
- `src.db.open.test.ts::C-32617fd8 openDatabase fails closed on a closed port after one sleep of the remaining time` (task 9.2): passed
- `src.db.open.test.ts::C-32617fd8 openDatabase rejects a bad openTimeoutMs and a bad scheme without sleeping` (task 9.2): passed
- `src.db.open.test.ts::C-69717e99 openDatabase refuses every privileged app endpoint and registers nothing` (task 9.2): passed
- `src.db.open.test.ts::C-7454acfb openDatabase on an unmigrated database registers db, fails it and warns once` (task 9.2): passed
- `src.db.open.test.ts::C-869163e0 openDatabase registers db once, ok, then fail after close twice` (task 9.2): passed
- `src.db.open.test.ts::C-faf8f8a6 openDatabase refuses a superuser whose cluster starts during the first sleep` (task 9.2): passed
- `src.db.partitions.test.ts::C-5cc5a771 ensurePartitions ignores list and hash parents and refuses unusable range tables` (task 7.1): passed
- `src.db.partitions.test.ts::C-87e84b3f ensurePartitions serialises callers and fails closed when Postgres is down` (task 7.1): passed
- `src.db.partitions.test.ts::C-c37e9432 ensurePartitions creates daily partitions and refuses bad window options` (task 7.1): passed
- `src.db.partitions.test.ts::C-f0ece24f ensurePartitions skips a range whose rows already sit in the DEFAULT partition` (task 7.1): passed
- `src.db.partitions.test.ts::C-fb7ba2ed ensurePartitions creates the monthly window and routes rows` (task 7.1): passed
- `src.db.pool.test.ts::C-63221721 createPool refuses bad endpoints and options without echoing them` (task 1.1): passed
- `src.db.pool.test.ts::C-7c1574be createPool accepts postgresql URLs and verify-full TLS` (task 1.1): passed
- `src.db.pool.test.ts::C-7c1574be createPool builds a pool from an endpoint password with the default options` (task 1.1): passed
- `src.db.pool.test.ts::C-dc754ade an idle client error reaches onError once and never throws` (task 1.1): passed
- `src.db.prepare.test.ts::C-58e0ebf0 prepareDatabase migrates first and then creates the partition window` (task 7.1): passed
- `src.db.roles.test.ts::C-d380769b ensureRoles keeps a quoted password and the owner role` (task 4.1): passed
- `src.db.roles.test.ts::C-d380769b ensureRoles refuses a weak admin with DB_ROLES_FAILED` (task 4.1): passed
- `src.db.roles.test.ts::C-d380769b ensureRoles refuses empty non-ASCII NUL and oversized passwords` (task 4.1): passed
- `src.db.roles.test.ts::C-f1949ac2 ensureRoles creates repeats and repairs the login roles` (task 4.1): passed
- `src.main.db.test.ts::C-6d93e8d5 shutdown and a failed listen end the app pool` (task 10.1): passed
- `src.main.db.test.ts::C-ad848b65 main writes one fatal line and opens no port when the open fails` (task 10.1): passed
- `src.main.db.test.ts::C-b3bd64b0 main opens no database and keeps health green` (task 10.1): passed
