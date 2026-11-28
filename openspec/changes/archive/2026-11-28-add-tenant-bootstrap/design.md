## Context

No production path creates the roles, the schema, a tenant, a `tenant_idp` row or a sink binding, so `admin bootstrap-admin` refuses on a fresh stack. The owner job (U59), the e2e seeding (U61b) and the reset (U61d) run the five commands; U60 calls `bindSinkTokens`. Every fixture value was produced by a throwaway implementation of this design on embedded Postgres in a scratch copy of main@31968a29; the arch tests `owner-endpoint`, `network`, `hygiene`, `imports`, `modules`, `cli-sandbox` and `repo` pass with it.

## Decisions

1. **Five top-level commands, one file each in `src/cli/setup/`.** `db-roles` is `database: false` (it needs the superuser; no owner role exists yet). The other four are `database: true`: `runCli` loads the configuration, connects as `ursitoare_owner` and checks the role. `loadConfig` refuses `URSITOARE_DATABASE_PASSWORD_FILE` without `URSITOARE_DATABASE_URL`, so an environment that gives `db-roles` the app password file must give the other four the app URL too. `CliCall` has no secret reader, so the commands read real files.
2. **`db-roles`.** The four variables are checked in the order URL, admin file, owner file, app file before `loadAdminDatabase` (an unset one is `CLI_DATABASE_ADMIN_REQUIRED`); then both role password files through `readSecretValue`. It connects to `postgres` on the URL's server, creates the named database with `format('CREATE DATABASE %I', name)` when `pg_database` lacks it (SQLSTATE `42P04` counts as present), prints `database: created|present`, connects to that database and runs `ensureRoles`. The database stays owned by the admin user: the grants of `ensureRoles` suffice (by probe) for every migration and the DBOS migration as `ursitoare_owner`. Both passwords are set on every run, so a repeat prints `roles: updated`. Errors: no SQLSTATE, class `08` or `28`, or `DB_UNAVAILABLE` → `CLI_DATABASE_UNAVAILABLE`; another SQL error creating the database → `CLI_ROLES_FAILED: could not create the engine database`; any other `DbError` → `CLI_ROLES_FAILED: could not bootstrap the database roles (<code>)`.
3. **`db-prepare`.** `prepareDatabase(owner.pool, call.clock)`, then `prepareDurable` on the owner URL with the password set through the URL API. A `DbError` or `DurableError` becomes `CLI_PREPARE_FAILED: database preparation failed (<original code>)` (`CliError` has no details member, so only the code is printed).
4. **`ensureTenant`.** One transaction, advisory lock `ursitoare:ensure_tenant`, lookup by the unique `name`, insert with the profile, `created_at` from `opts.clock`, id from `opts.ids.next("ten")` only when it inserts. Another stored profile → `TENANT_PROFILE_CONFLICT` with `details.reviewProfile` the stored one. SQL failures map to `TENANT_BOOTSTRAP_FAILED` as in `ensureDefaultTenant` (untouched).
5. **Naming.** `resolveSetupTenant` takes `Pick<pg.Pool, "query" | "connect">` (`findTenantByName` needs `connect`, `resolveCliTenant` needs `query`): a name → `findTenantByName`, unknown → `CLI_TENANT_UNKNOWN: no tenant has that name`; an id or nothing → `resolveCliTenant`. `admin bootstrap-admin` keeps its options, so its caller passes `--tenant <id>` from the `tenant-create` line.
6. **Sink binding.** `bindSinkTokens` takes strings, not `Secret` (`tenancy` imports only `core` and `db`). Both routes are registered in one `withTenantTx`, so a conflict leaves neither. Equal tokens are refused in `bindSinkTokens` (`TENANT_INVALID`) and, before any database work, in `tenant-sink` (`CLI_SINK_TOKENS_EQUAL`). Routes store `sha256` only; the engine and every command but `tenant-sink` never read the two token variables. A new token adds a route; these commands never remove one.
7. **Codes.** New `CliErrorCode` members `CLI_DATABASE_ADMIN_REQUIRED`, `CLI_ROLES_FAILED`, `CLI_PREPARE_FAILED`, `CLI_SINK_TAKEN`, `CLI_SINK_TOKENS_EQUAL`; new `TenancyErrorCode` member `TENANT_PROFILE_CONFLICT`. No frozen list of either union exists.
8. **The registry.** `src/cli/builtin.ts` registers the five commands after the `init-secrets` line; `list()` sorts, so `init-secrets` is no longer last. This unit is the second owner of the requirement: the MODIFIED block restates U57's text whole with five more names, and four frozen tests change in place.
9. **Tests.** Embedded Postgres only. `db-roles` and the chain use a fresh cluster so the shared cluster's roles keep their passwords; the others use `withTestDatabase`.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md`.

```ts
// src/config/admin.ts (exported from src/config/index.ts, with readSecretValue)
export function loadAdminDatabase(env: Env, readSecret?: SecretReader): DatabaseEndpoint;
// src/config/config.ts (an existing function, now exported)
export function isDatabaseUrl(value: string): boolean;
// src/tenancy/bootstrap.ts (exported from src/tenancy/index.ts)
export function ensureTenant(ownerPool: TenantPool, input: { name: string; reviewProfile: ReviewProfile }, opts?: EnsureTenantOptions): Promise<{ tenant: TenantContext; created: boolean }>;
export function findTenantByName(pool: TenantPool, name: string): Promise<TenantContext | null>;
// src/tenancy/sink-binding.ts (exported from src/tenancy/index.ts)
export const MINTKEY_SINK_ROUTE_KINDS: Readonly<{ broker: string; proxy: string }>;   // { broker: "mintkey_sink_broker", proxy: "mintkey_sink_proxy" }
export function bindSinkTokens(pool: TenantPool, ctx: TenantContext, tokens: Readonly<{ broker: string; proxy: string }>): Promise<{ broker: RouteRegistration; proxy: RouteRegistration }>;
// src/cli/setup/tenant-option.ts
export function resolveSetupTenant(pool: Pick<pg.Pool, "query" | "connect">, args: CliCall["args"]): Promise<TenantContext>;
// src/cli/setup/db-roles.ts
export const dbRolesCommand: CliCommand;
// src/cli/setup/db-prepare.ts
export const dbPrepareCommand: CliCommand;
// src/cli/setup/tenant-create.ts
export const tenantCreateCommand: CliCommand;
// src/cli/setup/tenant-idp.ts
export const tenantIdpCommand: CliCommand;
// src/cli/setup/tenant-sink.ts
export const tenantSinkCommand: CliCommand;
```

Red tests import each name from the file its header names, never from `src/config/index.ts`, `src/tenancy/index.ts` or `src/cli/index.ts`; `runCli` comes from `src/cli/run.ts`, `createDefaultRegistry` from `src/cli/builtin.ts`. Scaffold stubs: `loadAdminDatabase`, `ensureTenant`, `findTenantByName` and `bindSinkTokens` throw `not implemented`; `MINTKEY_SINK_ROUTE_KINDS` is `{ broker: "", proxy: "" }`; `resolveSetupTenant` rejects `not implemented`; each command is `{ summary: "", options: {}, database, run: rejects "not implemented" }` with `database` false for `db-roles` and true for the rest.

Command texts: the summaries are the help lines of the registry scenario. Options: `tenant-create` `name` (string, required) and `review-profile` (string); `tenant-idp` and `tenant-sink` `tenant` and `tenant-name` (strings), and for `tenant-idp` `issuer` and `organization` (strings, required). Output lines are exactly those of the specs; `→` is U+2192.

## Failure cases

Each refusal is a scenario row and leaves the database as it was; a database dropped between two steps is `CLI_DATABASE_UNAVAILABLE` from the dispatcher, and the next `db-roles` recreates it.

## UNVERIFIED

Run on embedded Postgres, not `postgres:18` (STACK-ONLY in `test-plan.md`); the owner job's container environment (mounted files, the app URL beside the app password file) was not run.

## Risks

`db-roles` re-applies the role passwords from the files at every `up`; a password file edited without the database changes the database password (U59's `docs/operations.md` says so). If U57's text of the shared requirement changes, the block here changes with it.
