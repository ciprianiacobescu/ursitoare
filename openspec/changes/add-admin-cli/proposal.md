## Why

After M1 users can sign in but nobody holds a role, and when the identity provider is down or not yet mapped nobody can administer anything. ADR-12 keeps a break-glass path with no network endpoint: a command line that runs in the engine container with the database owner credentials, audits every use and works on one tenant at a time. Later units also need a place to register their own commands (`init-secrets` before any configuration exists, `flow validate`, `pause-triggers`, retention).

Observable result: `node src/cli/main.ts admin bootstrap-admin --tenant tenant_a` maps the bootstrap admin group (default `ursitoare-admins`, or `--group`) to `tenant_admin` for the tenant's identity provider and prints `mapped ursitoare-admins to tenant_admin` and `members of ursitoare-admins get tenant_admin at their next sign-in`; a second run prints `already mapped: tenant_admin has a group; nothing changed`. `admin grant-role` and `admin revoke-role` (`--user <id> --role <role>`) give and take back a direct role (the audited break-glass grant, human or service account), `admin list-users` prints the tenant's users with their roles and teams, and `admin verify-audit` prints `chain ok: <n> events checked` and `anchors: <k> checked` (or `anchors: none recorded yet`, or `anchors: not checked`) and exits 0, or `chain broken at seq <seq>: <reason>` and exits 3. Every command, refused ones included, leaves one `cli.command_run` event in the tenant's chain, in the transaction of its effect. The registry also holds top-level commands that need no database, so `init-secrets` runs on a bare host with no configuration. Only `src/cli`, `src/config` and `src/db` may read the owner database endpoint; an architecture rule enforces it.

## What Changes

- `src/cli`: error and exit codes with their fixed messages, the command registry, the dispatcher `runCli` (strict flags, help, lazy configuration, an owner connection checked to be `ursitoare_owner`), `defineAdminCommand` (tenant, operator, one audit event, output after commit), the five commands, the default registry and the entry `src/cli/main.ts`.
- `src/config/environment.ts`: `readProcessEnv()` (`process.env` may be read only in `src/config`).
- `test/arch/owner-endpoint.ts` with its test: the owner-endpoint rule.

## Impact

- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the re-export of `readProcessEnv` in `src/config/index.ts` (task 1.1; tests import it from `src/config/environment.ts`). No npm dependency is added.
- **Depends on:** `add-audit-chain` (`appendAudit`, `appendAuditCommitted`, `verifyChain`), `add-roles-and-memberships` (`grantRole`, `revokeRole`, `mapBootstrapAdminGroup`, `bootstrapAdminGroup`, `loadMemberships`), and, beyond the roadmap row U08, U17, `add-identity-model` (`listUsers`, users and identity providers in tests) and the merged `add-engine-skeleton`, `add-db-foundation`, `add-tenancy-foundation`, `add-architecture-fitness` (evidence: Interfaces taken).
- **Files implemented** (stubs): `src/cli/{errors,output,registry,run,tenant,builtin,main,index}.ts`, `src/cli/admin/{define,bootstrap-admin,grant-role,revoke-role,verify-audit,list-users,index}.ts`, `src/config/environment.ts`, `test/arch/owner-endpoint.ts`. **Created:** `src/cli/owner.ts` and a `*.test.ts` for each task. **Changed:** `src/config/index.ts`; no existing test changes; `test/arch/modules.ts` needs no change (the `cli` row allows every import used). Module ownership: `cli` and `config` (design § Decisions made while writing).
- **Migrations, tables, endpoints:** none. **Env read:** `URSITOARE_DATABASE_OWNER_URL`, `URSITOARE_DATABASE_OWNER_PASSWORD_FILE`, `URSITOARE_ENGINE_KEY_FILE`, `URSITOARE_BOOTSTRAP_ADMIN_GROUP`, `USER`. **Audit event:** `cli.command_run` (actor `{ kind: "system", id: "operator:<name>" }`, target `{ kind: "tenant", id }`, payload `{ command, outcome: "ok" | "refused" | "failed", code?, ...per-command keys }`). **Error codes:** the fifteen `CliErrorCode` values, printed as `CODE: message` on stderr with the fixed messages of design Decision 3. **Exit codes:** 0 success, 1 failure or refusal, 2 usage, 3 broken chain. **Admin flags:** `--tenant <id>`, `--operator <name>`, `--json`, `--help`. **Invocation:** `node src/cli/main.ts <words> [flags]`.
- **Extension point:** a unit adds commands in a `register<Unit>Commands(registry)` called from `createDefaultRegistry()` in `src/cli/builtin.ts` (its task names that file; two such units in one milestone need a `depends_on` edge) and writes an admin command as `defineAdminCommand("admin <word>", spec)`.

**Interfaces given** (paths under `src/cli/` unless shown; declarations omit `export`; the same text as design.md § Interfaces)

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

**Interfaces taken:**

- From `add-roles-and-memberships`: `grantRole`, `revokeRole`, `mapBootstrapAdminGroup`, `bootstrapAdminGroup`, `loadMemberships`, `listGroupMappings`, `setGroupMapping`, `syncMemberships`, `RbacActor` (the `operator` branch), `RbacError`; the `RBAC_*` codes and the events `identity.role_granted`, `identity.role_revoked` and `identity.bootstrap_admin_mapped`.
- From `add-audit-chain`: `appendAudit`, `appendAuditCommitted`, `verifyChain`, `anchorHead`, `AuditEventInput`; tables `ursitoare.audit_event`, `ursitoare.audit_anchor`.
- From `add-identity-model`: `listUsers`, `User`, `upsertUserFromClaims`, `createServiceAccount`, `provisionTenantIdp`; table `ursitoare.tenant_idp`.
- From `add-engine-skeleton`: `Clock`, `IdSource`, `systemClock`, `systemIds`, `fixedClock`, `sequentialIds`, `AppConfig`, `Env`, `DatabaseEndpoint`, `SecretReader`, `Secret`, `loadConfig`, `ConfigError`.
- From `add-db-foundation`: `createPool`, `ROLE_OWNER`, `withTestDatabase`, `TestDatabase`.
- From `add-tenancy-foundation`: `TenantContext`, `TenantTx`, `withTenantTx`, `TENANT_ID_PATTERN`, `seedTwoTenants`; table `ursitoare.tenant`.
- From `add-architecture-fitness`: `Snapshot`, `Violation`, `snapshotOf`, `readSnapshot`, `sortViolations`, `isTestFile`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@bda30d2, checked line by line).

## Out of scope

Listing or creating tenants or users, and commands on flows, runs, triggers or retention (their units register their own); `ursitoare init-secrets` itself (`add-init-secrets`); packaging an `ursitoare` executable (a deployment unit); the HTTP admin API (`add-admin-api`) and screens (`add-web-admin`); authenticating the operator beyond access to the owner credentials; ending the open sessions of a user whose role was revoked (a role change applies at the next request through the principal); a spawned-process test of `src/cli/main.ts`.
