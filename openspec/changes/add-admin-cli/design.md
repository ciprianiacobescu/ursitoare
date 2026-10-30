## Context

`src/cli` is a new module (its `test/arch/modules.ts` row allows every import used): the break-glass path of ADR-12. An operator with a shell in the engine container runs `admin ...` commands with the owner credentials, for one tenant at a time. There is no endpoint, session or policy check; the boundary is access to the owner credentials, which the engine never holds: the operator passes `URSITOARE_DATABASE_OWNER_URL` and `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` for the one command, so every run leaves an audit event. No table, endpoint, migration, dependency or e2e part is added.

## Decisions

1. **Registry:** an instance from `createCommandRegistry()`, not a singleton. Names are `^[a-z][a-z0-9-]{0,31}$` or `admin|flow`, a space and such a word; `admin`, `flow`, `help` alone are reserved; a duplicate, a bad name and an option named `help` throw `CliError("CLI_INVALID_COMMAND")`. `find(words)` takes two words when the first is `admin` or `flow`, else one. `list()` sorts by code point. `createDefaultRegistry()` in `src/cli/builtin.ts` is the one list of `register*Commands(registry)` calls.
2. **Dispatch** (`runCli`): `[]`, `help`, `--help`, `-h` print every command as `<name>  <summary>` lines, exit 0; a lone group name prints its group. Flags go through `node:util` `parseArgs` (`strict: true`, `allowPositionals: false`, the command's options plus boolean `help`); `--help` is honoured before required options are checked. It prints `usage: ${CLI_PROGRAM} <name> --x <string> [--y]` (required bare, optional in brackets; `CLI_PROGRAM` is `"node src/cli/main.ts"`), the summary, the `details` lines when set, then one line per option. Exit codes: 0 success, 1 failure or refusal, 2 `CLI_USAGE` and `CLI_UNKNOWN_COMMAND`, 3 a broken chain. An error prints as `CODE: message\n` on stderr.
3. **Error mapping and messages** (shared by `runCli` and `defineAdminCommand`): an `Error` whose `code` matches `^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_[A-Z0-9_]+$` prints that code and message and is "refused" in the audit; anything else, driver errors included, prints `CLI_INTERNAL: command failed` and is "failed". Messages (after `CODE: `): `CLI_USAGE`: `missing required option --<name>`, `invalid arguments; run with --help` (a `parseArgs` error), `--tenant is not a valid tenant id`, `--operator is not a valid operator name`, `--limit must be an integer from 1 to 200`, `--after is not a valid user id`, `--group is not a valid group name`, `--issuer is not a valid issuer`; `CLI_UNKNOWN_COMMAND`: `unknown command; run with --help to list the commands`; `CLI_INVALID_COMMAND`: `invalid command name or options` (thrown at registration); `CLI_CONFIG_INVALID`: `<variable>: <reason>` of the `ConfigError`; `CLI_OWNER_REQUIRED`: `set URSITOARE_DATABASE_OWNER_URL and URSITOARE_DATABASE_OWNER_PASSWORD_FILE for this command`; `CLI_OWNER_ROLE_INVALID`: `the owner variables must name the ursitoare_owner role`; `CLI_DATABASE_UNAVAILABLE`: `the database is unreachable with the owner credentials`; `CLI_NO_TENANT`: `no tenant exists`; `CLI_TENANT_REQUIRED`: `several tenants exist; pass --tenant <id>`; `CLI_TENANT_UNKNOWN`: `no tenant has that id`; `CLI_NO_IDP`: `the tenant has no identity provider; provision one first`; `CLI_ISSUER_REQUIRED`: `the tenant has several identity providers; pass --issuer <url>`; `CLI_ENGINE_KEY_REQUIRED`: `set URSITOARE_ENGINE_KEY_FILE, or pass --no-anchors to check hashes only`; `CLI_AUDIT_FAILED`: `audit event could not be written`; `CLI_INTERNAL`: `command failed`. An `RBAC_*` line carries the fixed message of `add-roles-and-memberships`.
4. **Configuration is lazy:** `loadConfig(deps.env, deps.readSecret)` runs only for `database: true` commands, so `init-secrets` works on a bare host; a `ConfigError` is `CLI_CONFIG_INVALID` with `<variable>: <reason>`.
5. **Owner connection** (`src/cli/owner.ts`): no `config.database.owner` is `CLI_OWNER_REQUIRED`. The connection is `deps.connectOwner(endpoint)` or by default `createPool(endpoint, { max: 4, applicationName: "ursitoare-cli" })` as `{ pool, close: () => pool.end() }` (4: `verify-audit` reads on a second connection). `SELECT session_user AS u` runs first: a rejection is `CLI_DATABASE_UNAVAILABLE`, another value than `ROLE_OWNER` is `CLI_OWNER_ROLE_INVALID` (the app role sees no tenant). `close` runs once in a `finally`.
6. **Tenant:** `resolveCliTenant(db, requested)` checks `requested` against `TENANT_ID_PATTERN` (`CLI_USAGE`), then reads `SELECT tenant_id, review_profile FROM ursitoare.tenant ORDER BY tenant_id` (`WHERE tenant_id = $1` when requested): none is `CLI_NO_TENANT`, a missing requested one `CLI_TENANT_UNKNOWN`, several without `--tenant` `CLI_TENANT_REQUIRED`. RLS is not forced on that table.
7. **`defineAdminCommand(name, spec)`** returns a `CliCommand` with `database: true`, the spec's `summary` and `details`, and its options plus `tenant`, `operator` (strings) and `json` (boolean); a spec declaring one of these throws `CLI_INVALID_COMMAND`. Its `run`: (a) operator = `--operator`, else `env.USER` when it matches `^[A-Za-z0-9._@-]{1,64}$`, else `cli`; an invalid `--operator` is `CLI_USAGE`; (b) tenant by decision 6, failing before any audit (no chain yet); (c) `withTenantTx(owner.pool, tenant, async (tx) => { result = await spec.run(call); await appendAudit(tx, tenant, event, { clock }); })`; (d) on a throw the effect rolls back and `appendAuditCommitted(owner.pool, tenant, event, { clock })` writes the event; if that rejects too, stderr gets the error line, then `CLI_AUDIT_FAILED`; (e) after the commit only, stdout gets `result.lines` joined by `\n` and a final `\n`, or with `--json` `safeJson(result.data)` and `\n`; (f) exit `result.exitCode ?? 0`. `safeJson(value)` is `JSON.stringify(value)` with U+007F to U+009F, U+2028, U+2029, U+202A to U+202E and U+2066 to U+2069 written as `\uXXXX` (four lowercase hex digits): `JSON.parse` gives back the value and a name cannot steer a terminal.
8. **Audit event** per run: `eventType` `cli.command_run`, actor `{ kind: "system", id: "operator:<name>" }`, target `{ kind: "tenant", id }`, payload `{ command, outcome: "ok" | "refused" | "failed", code?, ...result.audit }` (`code` on refusal or failure, `result.audit` on success). A changing `grant-role`, `revoke-role` or `bootstrap-admin` leaves the identity event, then this one; a "nothing to do" run leaves this one.
9. **`bootstrap-admin`:** `details` is two lines, `Prerequisite: the tenant's identity provider is provisioned.` and `Effect: members of the group get tenant_admin at their next sign-in.`; options `group` (when absent, `bootstrapAdminGroup(call.env)`; `--group ""` counts as given) and `issuer` (empty, over 2048 characters or holding a newline is `CLI_USAGE`). Without `--issuer` it reads `SELECT DISTINCT issuer FROM ursitoare.tenant_idp WHERE tenant_id = $1 ORDER BY issuer` through `call.tx`: none is `CLI_NO_IDP`, several `CLI_ISSUER_REQUIRED`. Then `mapBootstrapAdminGroup(call.tx, tenant, { issuer, group, operator }, { clock, ids })`. Its `RBAC_INVALID` becomes `CLI_USAGE` `--group is not a valid group name` for the flag, `CLI_CONFIG_INVALID` `URSITOARE_BOOTSTRAP_ADMIN_GROUP: is not a valid group name` for the variable. Lines `mapped <group> to tenant_admin` and `members of <group> get tenant_admin at their next sign-in`, or `already mapped: tenant_admin has a group; nothing changed`; `data` and `audit` `{ result, group, issuer }`.
10. **`grant-role`:** required `user`, `role`; `grantRole(call.tx, tenant, { userId, roleId }, { kind: "operator", name: operator }, { clock, ids })` (an operator may target a human). Lines `granted <role> to <user>` or `already held: <role> for <user>`; `data` and `audit` `{ result, userId, roleId }`.
11. **`verify-audit`:** option `no-anchors`. The engine key is `call.config.engineKey` (a `Secret`; `reveal()` is a `KeyMaterial`); null without `--no-anchors` is `CLI_ENGINE_KEY_REQUIRED`. `verifyChain(call.pool, tenant, { engineKey })` (no key under `--no-anchors`) reads on a second connection and checks only the anchor rows that exist. When the chain is intact and a key is used, `anchorsVerified` is `SELECT count(*)::int AS n FROM ursitoare.audit_anchor WHERE tenant_id = $1 AND seq >= $2` through `call.tx` with `$2` `"1"` (the default `fromSeq`); else 0; `anchorsChecked` is `anchorsVerified > 0`. The event is appended afterwards, so never part of the run it reports. Intact: `chain ok: <n> events checked` and `anchors: <k> checked` (k > 0), `anchors: none recorded yet` (key, k = 0) or `anchors: not checked` (`--no-anchors`), exit 0. Broken: `chain broken at seq <seq>: <reason>` and `checked: <n>`, `exitCode: 3`. `data` and `audit`: `{ ok, checked, firstBadSeq: string | null, reason: string | null, anchorsChecked, anchorsVerified }` (the seq as a decimal string: payloads hold no bigint).
12. **`list-users`:** options `limit` (`^[0-9]{1,3}$`, 1 to 200, default 50) and `after` (`^[A-Za-z0-9_-]{1,64}$`), else `CLI_USAGE` (exit 2, audited). `listUsers(call.tx, tenant, { limit, after })`, then `loadMemberships(call.tx, tenant, userId)` per user. Line: id, kind, state, roles and teams (each joined by `,`), `safeText(displayName)`, tab-separated; `next: <id>` when `listUsers` gives `next`; `no users` for none. `data` `{ users: [{ userId, kind, state, displayName, email, ownerUserId, roles, teams }], next }`; `audit` `{ count }`. `safeText` replaces each of `U+0000-001F`, `007F-009F`, `2028-2029`, `202A-202E`, `2066-2069` by `?`.
13. **Entry:** `cliMain(argv, deps?)` fills `env` from `readProcessEnv()`, the writers from `process.stdout.write` and `process.stderr.write`, `registry` from `createDefaultRegistry()`, and returns `runCli`. `src/cli/main.ts` ends with the entry guard of `src/main.ts` and `process.exitCode = await cliMain(process.argv.slice(2))`. `readProcessEnv(): Env` returns `{ ...process.env }`.
14. **Owner-endpoint rule** (`test/arch/owner-endpoint.ts`, modelled on `test/arch/control-routes.ts`): over non-test files of `src/` outside `cli`, `config` and `db`, with the TypeScript AST, report six forms (message `the owner database endpoint is read only in src/cli, src/config and src/db`, sorted by `sortViolations`): `config.database.owner`; `config.database["owner"]`; `const { owner } = config.database;`; `const { database: { owner } } = config;`; a string literal or template text containing `DATABASE_OWNER`; `.owner` or `["owner"]` of an identifier initialised in the same file from an expression ending in `.database`.
15. **`revoke-role`** (`src/cli/admin/revoke-role.ts`): required `user`, `role`; `revokeRole(call.tx, tenant, { userId, roleId }, { kind: "operator", name: operator }, { clock, ids })` gives `true` (removed) or `false` (no direct grant, so also a role held only through `idp_claim`). Lines `revoked <role> from <user>` or `not held: <role> for <user>`, both exit 0; `data` and `audit` `{ result: "revoked" | "absent", userId, roleId }`.

## Interfaces

```ts
// errors, output
type CliErrorCode = "CLI_USAGE" | "CLI_UNKNOWN_COMMAND" | "CLI_INVALID_COMMAND" | "CLI_CONFIG_INVALID" | "CLI_OWNER_REQUIRED" | "CLI_OWNER_ROLE_INVALID" | "CLI_DATABASE_UNAVAILABLE" | "CLI_NO_TENANT" | "CLI_TENANT_REQUIRED" | "CLI_TENANT_UNKNOWN" | "CLI_NO_IDP" | "CLI_ISSUER_REQUIRED" | "CLI_ENGINE_KEY_REQUIRED" | "CLI_AUDIT_FAILED" | "CLI_INTERNAL"
class CliError extends Error { readonly code: CliErrorCode; constructor(code: CliErrorCode, message: string) }
interface CliOutput { write(text: string): void }
const CLI_PROGRAM: string
function safeText(text: string): string
function safeJson(value: unknown): string
// registry
interface CliOption { type: "string" | "boolean"; summary: string; required?: boolean }
interface OwnerAccess { pool: pg.Pool; config: AppConfig }
interface CliCall { args: Readonly<Record<string, string | boolean>>; env: Env; stdout: CliOutput; stderr: CliOutput; clock: Clock; ids: IdSource; owner: OwnerAccess | null }
interface CliCommand { summary: string; details?: string; options: Readonly<Record<string, CliOption>>; database: boolean; run(call: CliCall): Promise<number> }
interface CommandRegistry { registerCommand(name: string, command: CliCommand): void; find(words: readonly string[]): { name: string; command: CliCommand; rest: string[] } | null; list(): { name: string; command: CliCommand }[] }
function createCommandRegistry(): CommandRegistry
// run
interface OwnerConnection { pool: pg.Pool; close(): Promise<void> }
interface CliDeps { env: Env; stdout: CliOutput; stderr: CliOutput; registry: CommandRegistry; clock?: Clock; ids?: IdSource; readSecret?: SecretReader; connectOwner?: (e: DatabaseEndpoint) => OwnerConnection }
function runCli(argv: readonly string[], deps: CliDeps): Promise<number>
// tenant, admin/define
function resolveCliTenant(db: Pick<pg.Pool, "query">, requested?: string): Promise<TenantContext>
interface AdminCall { tx: TenantTx; pool: pg.Pool; tenant: TenantContext; operator: string; args: CliCall["args"]; env: Env; config: AppConfig; clock: Clock; ids: IdSource }
interface AdminResult { lines: string[]; data: Record<string, unknown>; audit: Record<string, string | number | boolean | null>; exitCode?: number }
interface AdminSpec { summary: string; details?: string; options: Readonly<Record<string, CliOption>>; run(call: AdminCall): Promise<AdminResult> }
function defineAdminCommand(name: string, spec: AdminSpec): CliCommand
// admin/*
const bootstrapAdminCommand: CliCommand
const grantRoleCommand: CliCommand
const revokeRoleCommand: CliCommand
const verifyAuditCommand: CliCommand
const listUsersCommand: CliCommand
function registerAdminCommands(registry: CommandRegistry): void
// builtin, main; ../config/environment
function createDefaultRegistry(): CommandRegistry
function cliMain(argv: readonly string[], deps?: Partial<CliDeps>): Promise<number>
function readProcessEnv(): Env
// test/arch/owner-endpoint
function checkOwnerEndpoint(s: Snapshot): Violation[]
```

## Failure cases

- Unknown command, bad or valueless flag, extra word, missing required flag, bad `--operator` or `--tenant`: `CLI_UNKNOWN_COMMAND` or `CLI_USAGE`, exit 2, nothing run (`--limit`, `--after`, `--group`, `--issuer` are checked in `run`: audited as refused).
- Configuration, owner endpoint, database, role or tenant unusable: the `CLI_*` code of decision 3, exit 1, connection closed, not audited (no chain yet).
- A function taken refuses (`RBAC_*`, `IDENTITY_*`, `AUDIT_*`, `TENANT_*`) or throws anything else: rolled back; event `refused` with the code, or `failed` with `CLI_INTERNAL`, in its own transaction; exit 1. If that write fails too, `CLI_AUDIT_FAILED` follows.
- Two commands at once are serialised by the audit head lock; a broken chain makes `verify-audit` exit 3.

## Security

1. **Authentication and PEP:** none by design: no endpoint, no session; the boundary is the owner credentials and a shell in the container. The operator name is a label.
2. **Tenant isolation:** every statement but the tenant list runs in `withTenantTx` for the one chosen tenant, so forced row-level security binds even the owner; two-tenant scenarios cover every command.
3. **Input and output:** strict `parseArgs`; ids, tenant, operator, limit, group and issuer are checked before use. Display names are untrusted: `safeText` for text, `safeJson` for `--json`.
4. **Secrets:** the owner password and engine key come only from `*_FILE` paths through `loadConfig`. Error lines are fixed text or `ConfigError` messages; audit payloads hold ids, group names, issuers and counts only.
5. **Abuse cases:** the app role as owner; another module reading the owner endpoint (architecture rule); the wrong tenant by omission; a hostile display name; a verify claiming anchors it never checked; an effect with no audit event; a break-glass role that cannot be taken back.

## Test plan

Node test runner, `*.test.ts` beside each file, loopback only; each test file builds its own harness: a `capture()` writer pair, `readSecret` answering `/run/owner-pw` with `db.ownerEndpoint.password?.reveal() ?? ""` and `/run/engine-key` with `"ab".repeat(32)`, an `env` with `URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url` and `URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw"` (the spec's "owner variables"; with `URSITOARE_ENGINE_KEY_FILE: "/run/engine-key"` it is "the engine key"), `fixedClock("2031-03-10T00:00:00.000Z")`, `sequentialIds(1)` and the command under test in a registry. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; chains are read in `withTenantTx(db.ownerPool, ...)` by `seq`. A red test turns a stub's throw into an assertion: `const code = await runCli(...).then((v) => v, (e: unknown) => e)`, then `assert.equal(code, 0)`; a synchronous call returns its thrown value through a `try`. Errors are asserted by `code`; the `process.exitCode` guard has no test.

## Decisions made while writing

- **`--group` is optional:** the default `bootstrapAdminGroup(env)` keeps the `URSITOARE_BOOTSTRAP_ADMIN_GROUP` contract of U17.
- **First admin on a real install (architecture F8, "the first user becomes its owner"):** the realm of U58 puts the first user in `ursitoare-admins`, and the one-shot owner job of U59 runs `admin bootstrap-admin` right after `prepareDatabase`; the command is idempotent (`already_mapped`). `--help` states the prerequisite and effect (decision 9). The roadmap rows of U58 and U59 say so.
- **`revoke-role`, a fifth command beyond the card:** without it a break-glass `grant-role` is permanent, since `add-admin-api` refuses role changes on humans.
- **Anchors are counted, not assumed:** no unit writes head anchors yet (`anchorHead` has no non-test caller), so `verify-audit` reports the count it found (`none recorded yet` at zero); its own query keeps `add-audit-api` out of the dependencies. A missing engine key cannot pass as a full check.
- **Optional `details`** on `CliCommand` and `AdminSpec` carries the help prerequisite without a long summary in every listing.
- **Direct SQL on `ursitoare.tenant`, `tenant_idp`, `audit_anchor`:** no module lists them for this use.
- **One shared list** (`src/cli/builtin.ts`): discovery by directory needs a computed `import()`, forbidden in `src/`, so a unit adding commands names that file in a task, and two such units in one milestone need a `depends_on` edge.
- **Module ownership:** `cli` and `config` (`readProcessEnv` lives in `src/config`, the only module that may read `process.env`); the roadmap lists U20 among the owners of `config`.
- **Not here:** `init-secrets` (`add-init-secrets` registers it), list-tenants and create commands, a spawned-process test, migration `0200`.
