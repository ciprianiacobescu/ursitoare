## Context

`src/cli` is a new module (its row in `test/arch/modules.ts` already allows every import used). It is the break-glass path of ADR-12: an operator with a shell in the engine container runs `ursitoare admin ...` with the database owner credentials, for one tenant at a time. There is no network endpoint, session or policy check; the trust boundary is access to the owner credentials, so every run leaves an audit event. The engine never holds those credentials: the operator passes `URSITOARE_DATABASE_OWNER_URL` and `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` for the one command (the merged `AppConfig.database.owner`). Later units add commands to the same registry (`init-secrets`, `flow validate`, `pause-triggers`, retention). No table, endpoint, migration, dependency or e2e part is added.

`add-roles-and-memberships` gives `grantRole` (operator actor `{ kind: "operator"; name }`; it appends `identity.role_granted` only when a row changes), `mapBootstrapAdminGroup` (appends only `identity.bootstrap_admin_mapped`), `bootstrapAdminGroup(env)`, `loadMemberships` and `listGroupMappings`; its `RbacError` messages are fixed.

## Decisions

1. **Registry:** an instance from `createCommandRegistry()`, not a module-level singleton, so tests are isolated. Names are `^[a-z][a-z0-9-]{0,31}$` or `admin|flow`, one space and such a word; `admin`, `flow` and `help` alone are reserved; a duplicate, a bad name and an option named `help` throw `CliError("CLI_INVALID_COMMAND")`. `find(words)` takes two words when the first is `admin` or `flow`, else one, and returns the rest. `list()` sorts by name in code-point order. `createDefaultRegistry()` in `src/cli/builtin.ts` is the one list of `register*Commands(registry)` calls (static imports: `src/` may not use a computed `import()`); a unit that adds commands adds one call there and names that file in a task.
2. **Dispatch** (`runCli`): `[]`, `help`, `--help` and `-h` print every command as `<name>  <summary>` lines, exit 0; a lone group name prints that group's lines; an unknown command is `CLI_UNKNOWN_COMMAND`. Flags go through `node:util` `parseArgs` (`strict: true`, `allowPositionals: false`, the command's options plus boolean `help`; `--name=abc` and `--name abc` both work); `--help` is honoured before required options are checked; a parse error or missing required option is `CLI_USAGE`. `--help` prints `usage: ursitoare <name> --x <string> [--y]` (required bare, optional in brackets), the summary, then one line per option. Exit codes: 0 success, 1 failure or refusal, 2 `CLI_USAGE` and `CLI_UNKNOWN_COMMAND`, 3 a broken chain. Errors print as `CODE: message\n` on stderr.
3. **Error mapping** (shared by `runCli` and `defineAdminCommand`): an `Error` whose `code` is a string matching `^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_[A-Z0-9_]+$` (a `CliError` or another class with fixed messages) prints that code and message and is "refused" in the audit; anything else, driver errors included, prints `CLI_INTERNAL: command failed` and is "failed". `CLI_USAGE` exits 2, the rest 1.
4. **Configuration is lazy:** `loadConfig(deps.env, deps.readSecret)` runs only for a command with `database: true`, so `init-secrets` works on a host with no configuration. A `ConfigError` becomes `CLI_CONFIG_INVALID` with its message `<variable>: <reason>` (never a value).
5. **Owner connection** (`src/cli/owner.ts`): no `config.database.owner` is `CLI_OWNER_REQUIRED`. The connection is `deps.connectOwner(endpoint)` or by default `createPool(endpoint, { max: 4, applicationName: "ursitoare-cli" })` as `{ pool, close: () => pool.end() }` (4: `verify-audit` reads on a second connection while the command transaction is open). The first statement is `SELECT session_user AS u`: a rejection is `CLI_DATABASE_UNAVAILABLE`, a value other than `ROLE_OWNER` (`ursitoare_owner`) is `CLI_OWNER_ROLE_INVALID` (the app role would run under row-level security and report no tenant). `close` runs once in a `finally`.
6. **Tenant:** `resolveCliTenant(db, requested)` checks `requested` against `TENANT_ID_PATTERN` (`CLI_USAGE`), then reads `SELECT tenant_id, review_profile FROM ursitoare.tenant ORDER BY tenant_id` (with `WHERE tenant_id = $1` when requested): none is `CLI_NO_TENANT`, a missing requested one `CLI_TENANT_UNKNOWN`, several without `--tenant` `CLI_TENANT_REQUIRED`. The owner reads `ursitoare.tenant` with no tenant setting (row-level security is not forced there); `withTestDatabase()` has none until a test inserts one.
7. **`defineAdminCommand(name, spec)`** returns a `CliCommand` with `database: true` and the spec's options plus `tenant`, `operator` (strings) and `json` (boolean); a spec declaring one of these throws `CLI_INVALID_COMMAND`. Its `run`: (a) operator = `--operator`, else `env.USER` when it matches `^[A-Za-z0-9._@-]{1,64}$`, else `cli`; an invalid `--operator` is `CLI_USAGE`; (b) tenant by decision 6; a failure here exits before any audit (no chain to write to); (c) `withTenantTx(owner.pool, tenant, async (tx) => { result = await spec.run(call); await appendAudit(tx, tenant, event, { clock }); })`; (d) on a throw the effect is rolled back and the event is appended with `appendAuditCommitted(owner.pool, tenant, event, { clock })`; if that rejects too, stderr gets the error line and then `CLI_AUDIT_FAILED: audit event could not be written`; (e) only after the commit, stdout gets `result.lines` joined by `\n` plus a final `\n`, or with `--json` `JSON.stringify(result.data)` plus `\n`; (f) the exit code is `result.exitCode ?? 0`.
8. **Audit event** per run: `eventType` `cli.command_run`, actor `{ kind: "system", id: "operator:<name>" }` (as `add-roles-and-memberships` records operators), target `{ kind: "tenant", id }`, payload `{ command: <name>, outcome: "ok" | "refused" | "failed", code?: string, ...result.audit }` (`code` only on refusal or failure, `result.audit` only on success, framework keys win). A changing `grant-role` or `bootstrap-admin` leaves two events, the identity event then this one; a "nothing to do" run still leaves this one.
9. **`bootstrap-admin`:** options `group` (when absent, `bootstrapAdminGroup(call.env)`, which throws `RBAC_INVALID` for a bad `URSITOARE_BOOTSTRAP_ADMIN_GROUP`; an empty `--group ""` counts as given) and `issuer`. Without `--issuer` it reads `SELECT DISTINCT issuer FROM ursitoare.tenant_idp WHERE tenant_id = $1 ORDER BY issuer` through `call.tx` (no module lists them): none is `CLI_NO_IDP`, several `CLI_ISSUER_REQUIRED`. Then `mapBootstrapAdminGroup(call.tx, tenant, { issuer, group, operator }, { clock, ids })`. Lines `mapped <group> to tenant_admin` or `already mapped: tenant_admin has a group; nothing changed`; `data` and `audit` `{ result, group, issuer }`.
10. **`grant-role`:** required `user`, `role`; `grantRole(call.tx, tenant, { userId, roleId }, { kind: "operator", name: operator }, { clock, ids })`. Lines `granted <role> to <user>` or `already held: <role> for <user>`; `data` and `audit` `{ result, userId, roleId }`. A human target is allowed (an operator is exempt in `grantRole`).
11. **`verify-audit`:** option `no-anchors` (boolean). The engine key is `call.config.engineKey` (a `Secret`, whose `reveal()` makes it a `KeyMaterial`); null without `--no-anchors` throws `CLI_ENGINE_KEY_REQUIRED`. `verifyChain(call.pool, tenant, { engineKey })` (without the key under `--no-anchors`) reads on a second connection; the event is appended afterwards, so it is never part of the run it reports. Intact: lines `chain ok: <n> events checked` and `anchors: checked` or `anchors: not checked`, exit 0. Broken: lines `chain broken at seq <seq>: <reason>` and `checked: <n>`, `exitCode: 3`. `data` and `audit`: `{ ok, checked, firstBadSeq: string | null, reason: string | null, anchorsChecked }` (the seq is a decimal string: payloads cannot hold a bigint).
12. **`list-users`:** options `limit` (`^[0-9]{1,3}$`, 1 to 200, default 50) and `after` (`^[A-Za-z0-9_-]{1,64}$`), else `CLI_USAGE` (exit 2, audited as refused). `listUsers(call.tx, tenant, { limit, after })`, then `loadMemberships(call.tx, tenant, userId)` per user. Line: id, kind, state, roles and teams (each joined by `,`), `safeText(displayName)`, tab-separated; `next: <id>` when `listUsers` gives `next`; `no users` for none. `data` `{ users: [{ userId, kind, state, displayName, email, ownerUserId, roles, teams }], next }`; `audit` `{ count }`. `safeText` replaces each control, line-separator and bidi-override code point (`U+0000-001F`, `007F-009F`, `2028-2029`, `202A-202E`, `2066-2069`) by `?`.
13. **Entry:** `cliMain(argv, deps?)` fills `env` from `readProcessEnv()`, `stdout` and `stderr` from `process.stdout.write` and `process.stderr.write`, `registry` from `createDefaultRegistry()`, and returns `runCli`. `src/cli/main.ts` ends with the guard of `src/main.ts` (`process.argv[1] === fileURLToPath(import.meta.url)`) and `process.exitCode = await cliMain(process.argv.slice(2))`; it runs as `node src/cli/main.ts admin list-users`. `readProcessEnv(): Env` returns `{ ...process.env }`, because `process.env` may be read only in `src/config`.
14. **Owner-endpoint rule** (`test/arch/owner-endpoint.ts`, modelled on `test/arch/control-routes.ts`): over non-test files of `src/` outside `cli`, `config` and `db`, with the TypeScript AST, report a property access `X.database.owner`, a variable declaration whose object binding pattern names `owner` and whose initialiser ends in `.database`, and any string literal or template text containing `DATABASE_OWNER`, with the message `the owner database endpoint is read only in src/cli, src/config and src/db`, sorted by `sortViolations`.

## Interfaces

```ts
// src/cli/errors.ts, src/cli/output.ts
type CliErrorCode = "CLI_USAGE" | "CLI_UNKNOWN_COMMAND" | "CLI_INVALID_COMMAND" | "CLI_CONFIG_INVALID" | "CLI_OWNER_REQUIRED" | "CLI_OWNER_ROLE_INVALID" | "CLI_DATABASE_UNAVAILABLE" | "CLI_NO_TENANT" | "CLI_TENANT_REQUIRED" | "CLI_TENANT_UNKNOWN" | "CLI_NO_IDP" | "CLI_ISSUER_REQUIRED" | "CLI_ENGINE_KEY_REQUIRED" | "CLI_AUDIT_FAILED" | "CLI_INTERNAL"
class CliError extends Error { readonly code: CliErrorCode; constructor(code: CliErrorCode, message: string) }
interface CliOutput { write(text: string): void }
function safeText(text: string): string
// src/cli/registry.ts
interface CliOption { type: "string" | "boolean"; summary: string; required?: boolean }
interface OwnerAccess { pool: pg.Pool; config: AppConfig }
interface CliCall { args: Readonly<Record<string, string | boolean>>; env: Env; stdout: CliOutput; stderr: CliOutput; clock: Clock; ids: IdSource; owner: OwnerAccess | null }
interface CliCommand { summary: string; options: Readonly<Record<string, CliOption>>; database: boolean; run(call: CliCall): Promise<number> }
interface CommandRegistry { registerCommand(name: string, command: CliCommand): void; find(words: readonly string[]): { name: string; command: CliCommand; rest: string[] } | null; list(): { name: string; command: CliCommand }[] }
function createCommandRegistry(): CommandRegistry
// src/cli/run.ts
interface OwnerConnection { pool: pg.Pool; close(): Promise<void> }
interface CliDeps { env: Env; stdout: CliOutput; stderr: CliOutput; registry: CommandRegistry; clock?: Clock; ids?: IdSource; readSecret?: SecretReader; connectOwner?: (e: DatabaseEndpoint) => OwnerConnection }
function runCli(argv: readonly string[], deps: CliDeps): Promise<number>
// src/cli/tenant.ts, src/cli/admin/define.ts
function resolveCliTenant(db: Pick<pg.Pool, "query">, requested?: string): Promise<TenantContext>
interface AdminCall { tx: TenantTx; pool: pg.Pool; tenant: TenantContext; operator: string; args: CliCall["args"]; env: Env; config: AppConfig; clock: Clock; ids: IdSource }
interface AdminResult { lines: string[]; data: Record<string, unknown>; audit: Record<string, string | number | boolean | null>; exitCode?: number }
interface AdminSpec { summary: string; options: Readonly<Record<string, CliOption>>; run(call: AdminCall): Promise<AdminResult> }
function defineAdminCommand(name: string, spec: AdminSpec): CliCommand
// src/cli/admin/{bootstrap-admin,grant-role,verify-audit,list-users,index}.ts
const bootstrapAdminCommand: CliCommand; const grantRoleCommand: CliCommand; const verifyAuditCommand: CliCommand; const listUsersCommand: CliCommand
function registerAdminCommands(registry: CommandRegistry): void
// src/cli/builtin.ts, main.ts; src/config/environment.ts
function createDefaultRegistry(): CommandRegistry
function cliMain(argv: readonly string[], deps?: Partial<CliDeps>): Promise<number>
function readProcessEnv(): Env
// test/arch/owner-endpoint.ts
function checkOwnerEndpoint(s: Snapshot): Violation[]
```

## Failure cases

| Situation | Behaviour |
|---|---|
| Unknown command, bad or valueless flag, extra word, missing required flag, bad `--operator` or `--tenant` | `CLI_UNKNOWN_COMMAND` or `CLI_USAGE`, exit 2, nothing run (`--limit` and `--after` are checked in `run`: audited as refused) |
| Configuration, owner endpoint, database, role or tenant unusable | `CLI_CONFIG_INVALID`, `CLI_OWNER_REQUIRED`, `CLI_DATABASE_UNAVAILABLE`, `CLI_OWNER_ROLE_INVALID`, `CLI_NO_TENANT`, `CLI_TENANT_REQUIRED`, `CLI_TENANT_UNKNOWN`; exit 1, connection closed, not audited (no chain yet) |
| A function taken refuses (`RBAC_*`, `IDENTITY_*`, `AUDIT_*`, `TENANT_*`) | Rolled back; event `outcome: "refused"` with the code, in its own transaction; exit 1 |
| Driver error or any unexpected exception | Rolled back; `CLI_INTERNAL: command failed`; event `outcome: "failed"`; exit 1 |
| The event cannot be written | The command transaction rolls back too (no effect without its event), then as the line above plus `CLI_AUDIT_FAILED` if the second write fails |
| Two commands at once; a broken chain | Serialised by the functions taken and the audit head lock; `verify-audit` exits 3 and its event says `ok: false` |

## Security

1. **Authentication and PEP:** none by design: no endpoint, no session; the boundary is the owner credentials and a shell in the container. The operator name is a self-declared label.
2. **Tenant isolation:** all statements but the tenant list run in `withTenantTx` for the one chosen tenant, so forced row-level security binds even the owner; several tenants make `--tenant` mandatory. Two-tenant scenarios: tenant selection, `grant-role`, `list-users`, `bootstrap-admin`, `verify-audit`.
3. **Input:** strict `parseArgs`; ids, tenant, operator, limit and group are checked before use. Display names are untrusted: terminal output goes through `safeText`.
4. **Secrets:** the owner password and engine key come only from `*_FILE` paths through `loadConfig` (which refuses secret-shaped plain variables). Error lines are fixed text or `ConfigError` messages; driver errors are never printed. Audit payloads hold ids, group names and issuers only.
5. **Abuse cases:** the app role as owner; another module reading the owner endpoint (architecture rule); the wrong tenant by omission; a hostile display name (`safeText`); verifying without anchors by accident; an effect with no audit event (atomicity scenarios).

## Test plan

Node test runner, `*.test.ts` beside each file, no sleeps, loopback only. Each test file builds its own small harness (no shared helper): a `capture()` writer pair, `readSecret` answering `/run/owner-pw` with `db.ownerEndpoint.password?.reveal() ?? ""` and `/run/engine-key` with `"ab".repeat(32)`, an `env` with `URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url` and `URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw"` (the config refuses a password inside the URL), `fixedClock("2031-03-10T00:00:00.000Z")`, `sequentialIds(1)` and a registry holding the command under test. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; chains are read as the owner in `withTenantTx(db.ownerPool, ctx, ...)` from `ursitoare.audit_event` by `seq`; users come from `upsertUserFromClaims` and `createServiceAccount`, identity providers from `provisionTenantIdp`. The broken chain is made as `tamper` does in `src/audit/verify.test.ts`. A red test turns a stub's throw into an assertion: `const code = await runCli(...).then((v) => v, (e: unknown) => e)`, then `assert.equal(code, 0)`; a synchronous call returns its thrown value through a `try`. Errors are asserted by `code`. The `process.exitCode` guard of `main.ts` has no test.

## Decisions made while writing

- **`--group` is optional:** the card says `bootstrap-admin --group`; the default `bootstrapAdminGroup(env)` keeps the `URSITOARE_BOOTSTRAP_ADMIN_GROUP` contract of `add-roles-and-memberships`.
- **Direct SQL on `ursitoare.tenant` and `ursitoare.tenant_idp`:** `tenancy` and `identity` list neither, and a new function there would edit another unit's module.
- **A registry instance and one shared list** (`src/cli/builtin.ts`): discovery by directory needs a computed `import()`, forbidden in `src/`. The roadmap's `registerCommand(name, command)` is a method of `CommandRegistry`. `add-init-secrets`, `add-flow-validator`, `add-mock-test-runs`, `add-triggers` and `add-retention-partitioning` must name `src/cli/builtin.ts` in a task.
- **`verify-audit` needs the engine key** unless `--no-anchors`: a missing key cannot pass as a full check.
- **Not here:** `init-secrets` (`add-init-secrets` registers it; a test command proves the no-database path), revoke and list-tenants commands, a spawned-process test, migration `0200`.
- **Dependencies beyond the card (U08, U17):** `add-identity-model` (`listUsers`) and the merged M0 units whose names are used.
