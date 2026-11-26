# Test plan: add-tenant-bootstrap

Every value in the specs was produced by running a throwaway implementation of `design.md` on embedded Postgres. `N` (migrations) and `M` (partitions) are read from a reference run, never frozen; at main@31968a29 they are 22 and 166 under the fixed clock.

## Test files and ids

| File | Test (name starts with) | Scenario |
|---|---|---|
| `src/config/admin.test.ts` | `C-4433906a loadAdminDatabase reads and refuses` | Valid and refused admin settings |
| `src/cli/setup/db-roles.test.ts` | `C-21ae96cc db-roles fresh, repeat and dropped database`; `C-f4a01e13 db-roles refusals` | the two db-roles scenarios |
| `src/cli/setup/db-prepare.test.ts` | `C-c61c6116 db-prepare apply, repeat and failure` | Apply, repeat and a failing step |
| `src/cli/setup/tenant-create.test.ts` | `C-da899ae8 tenant-create once by name` | Create, repeat, conflict and bad input |
| `src/cli/setup/tenant-option.test.ts` | `C-0f153418 resolveSetupTenant id, name, ambiguous` | By id, by name and ambiguous |
| `src/cli/setup/tenant-idp.test.ts` | `C-1fc4a1df tenant-idp register, repeat, taken` | Register, repeat and taken |
| `src/cli/setup/tenant-sink.test.ts` | `C-602138c7 tenant-sink bind, repeat, taken` | Bind, repeat, taken and refused tokens |
| `src/cli/setup/bootstrap-chain.test.ts` | `C-d5ac552b five steps twice on a fresh cluster` | Five steps twice with two other tenants present |
| `src/cli/setup/registry.test.ts` | `C-2687097e the default registry lists thirteen commands` (new test of the MODIFIED scenario) | The default registry through cliMain |
| `src/tenancy/ensure-tenant.test.ts` | `C-6dcf07eb ensureTenant by name` | Create, repeat, conflict, bad input and race |
| `src/tenancy/sink-binding.test.ts` | `C-238cef58 bindSinkTokens two hash-only routes` | Bind, repeat, resolve and roll back |

**Changed in place** (the four tests of `proposal.md`; names kept; each fails at red and passes after task 4.1): the last `deepEqual` list of `main.test.ts` and `ALL_COMMANDS` of `test-registry.test.ts` become the thirteen names in `list()` order (`ADMIN_COMMANDS`, `db-prepare`, `db-roles`, `flow test`, `flow validate`, `init-secrets`, `tenant-create`, `tenant-idp`, `tenant-sink`); the help assertions of `init-secrets-registry.test.ts` count thirteen lines, `flow test` at line 8 (was 6), `init-secrets` at line 10 (was 8). `C-54587b81` keeps its frozen test; no other copy of the list exists.

Test files follow `tasks.md`; the shared cluster is never given `db-roles`.

## Fixtures

| Name | Content |
|---|---|
| `CLOCK`, `IDS` | `fixedClock("2026-11-25T10:00:00.000Z")`, `sequentialIds(0)` (one `IDS` per test) |
| `exec(argv, env, db?)` | `runCli(argv, { env, stdout, stderr, registry, clock: CLOCK, ids, readSecret, connectOwner })` with buffers for both streams, returning `{ code, out, err }`; the registry holds only the command under test, except in `bootstrap-chain.test.ts` and `registry.test.ts` (`createDefaultRegistry()`); with a `TestDatabase`, `readSecret` returns its owner password and `connectOwner` returns its `ownerPool` (closing nothing); a fresh-cluster test passes neither |
| `OW`, `AP`, `OW2`, `BT`, `PT` | 64 `o`, 64 `a`, 64 `p`, 64 `b`, 64 `c` characters; each file holds the value and one `\n` |

### Chain environment (`bootstrap-chain.test.ts`, `db-roles.test.ts`)

`<port>` is `cluster.port`; `D` a `mkdtemp` directory; `D/admin` holds the password of `cluster.adminUrl`.

| Variable | Value |
|---|---|
| `URSITOARE_DATABASE_ADMIN_URL` | `postgres://postgres@127.0.0.1:<port>/ursitoare` |
| `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE`, `…_OWNER_PASSWORD_FILE`, `URSITOARE_DATABASE_PASSWORD_FILE` | `D/admin`, `D/owner` (`OW`), `D/app` (`AP`) |
| `URSITOARE_DATABASE_OWNER_URL`, `URSITOARE_DATABASE_URL` | `postgres://ursitoare_owner@127.0.0.1:<port>/ursitoare`, `postgres://ursitoare_app@127.0.0.1:<port>/ursitoare` (`loadConfig` needs the app URL beside the app password file) |
| `URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE`, `…_PROXY_TOKEN_FILE` | `D/broker` (`BT`), `D/proxy` (`PT`) |

## How the tests drive their rows

- **db-roles.** Test 1 reads `pg_database` and `pg_roles` through a superuser `pg.Client` on `cluster.adminUrl`, logs in as each role (a refused login reads SQLSTATE `28P01`) and drops the database with `WITH (FORCE)` once its other connections are closed. Test 2 first runs one valid `db-roles` (setup).
- **db-prepare.** A second `withTestDatabase({ migrated: false })` runs `prepareDatabase(ref.ownerPool, CLOCK)`; its `applied.length` and `partitions.length` are `N` and `M`. The third run follows `UPDATE ursitoare.schema_migration SET checksum = repeat('0', 64) WHERE version = 1`; the fourth runs on a fresh `withTestDatabase({ migrated: false })` after a superuser `pg.Client` (`readTestCluster().adminUrl` with the path set to that database) ran `CREATE SCHEMA dbos`, so `prepareDurable` cannot migrate (stdout stays empty).
- **tenant-\* and resolveSetupTenant.** `withTestDatabase()`; `tenant_c` is inserted by SQL; `tenant_idp` rows are read in `withTenantTx(db.ownerPool, ctx, …)` (row-level security hides them from a bare owner query); routes through `SELECT kind, tenant_id, encode(key_hash, 'hex') AS h FROM ursitoare.tenant_route`; the text search covers `t::text` of each row.
- **bootstrap-chain.** One fresh cluster; the id is `line.split(" ")[1]` of the `tenant-create` line; afterwards an app-role pool (password `AP`) resolves `("mintkey_sink_broker", BT)` to the tenant.
- **registry.** `cliMain(["help"], …)` with no `registry`; thirteen lines, the seven named lines compared whole.

## STACK-ONLY

The chain scenario is gate-decided on embedded Postgres by `C-d5ac552b`; its image half (the same steps in the owner-job container against `postgres:18`) is the delegate's, and the task text says so:

| Criterion | Step | Asserts |
|---|---|---|
| not a criterion: the chain of `C-d5ac552b` run in the owner-job image | step 6 of `scripts/stack-e2e.sh` (`up -d --wait`, U61), then `scripts/stack-e2e.d/20-reset.sh` (U61d) and the next run's step 6 | the owner job exits 0 on a fresh volume, and again after `20-reset.sh` recreated the engine database from the template, which at U61d's head is tenant-less (schema only; the seeded state comes from U61b) |

