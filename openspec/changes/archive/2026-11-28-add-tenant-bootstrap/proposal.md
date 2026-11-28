## Why

No production path creates the database roles, the schema, a tenant, a `tenant_idp` row or the audit-sink token bindings, so on a fresh stack `admin bootstrap-admin` refuses with `CLI_NO_TENANT`. The hobbyist stack's owner job needs steps that run twice without harm.

Observable result: `db-roles`, `db-prepare`, `tenant-create --name <name>`, `tenant-idp --tenant-name <name> …` and `tenant-sink --tenant-name <name>`, run with the owner credentials, each exit 0 and print fixed lines (`database: created`, `tenant ten_… "E2E tenant" created`, `sink tokens: broker created, proxy created → ten_…`); a second run prints `present`, `0 applied`, `unchanged`, `exists`. Every tenant step names its tenant, so extra tenants never make a step ambiguous. `db-roles` recreates a dropped engine database. Then `admin bootstrap-admin --tenant <id>` answers `mapped`, then `already mapped`.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the five owner-credential commands that create the roles, the schema, a tenant with its identity provider and the sink token routes, each safe to run twice. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `src/config/admin.ts`, `src/tenancy/sink-binding.ts`, `src/cli/setup/*.ts` and their tests. Edited: `src/config/index.ts`, `src/tenancy/{bootstrap,errors,index}.ts`, `src/cli/{errors,builtin}.ts` and four frozen tests. Capabilities: `ops-cli` (ADDED, plus one requirement MODIFIED whole, scenario names kept; second owner after `add-init-secrets`) and `tenancy` (ADDED). No migration (the sink binding is a tenant route; only kind `idp` is reserved), route, part, API error code, dependency, web change or `docs/` edit (U59 writes the operator docs).

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in the files their headers name, and `isDatabaseUrl` is exported unchanged. Not scaffolded: the export lines of `src/config/index.ts` (`readSecretValue`, `loadAdminDatabase`) and `src/tenancy/index.ts` (the four tenancy names); the member `"TENANT_PROFILE_CONFLICT"` of `TenancyErrorCode` and the members `"CLI_DATABASE_ADMIN_REQUIRED"`, `"CLI_ROLES_FAILED"`, `"CLI_PREPARE_FAILED"`, `"CLI_SINK_TAKEN"`, `"CLI_SINK_TOKENS_EQUAL"` of `CliErrorCode` (tests read `error.code` as a string); `src/cli/setup/errors.ts` (two internal helpers); the five `registerCommand` lines of `src/cli/builtin.ts`; and the four frozen-test edits.
- **Depends on:** U01 `add-engine-skeleton`, U02 `add-db-foundation`, U03 `add-tenancy-foundation`, U10 `add-identity-model`, U20 `add-admin-cli`, U30 `add-dbos-runtime`: merged and archived, none in this plan, so `delivered-shapes.md` restates what is used. In this plan: `add-init-secrets`, whose restated requirement this unit restates whole with five more names; its `builtin.ts` line and frozen-test edits land first.
- **Changed in place (names kept; four):** `src/cli/main.test.ts::C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands`, `src/cli/flow/test-registry.test.ts::C-2687097e cliMain help lists the seven default commands in order`, `src/cli/flow/test-registry.test.ts::C-2687097e fresh registries list the admin flow and default commands` and `src/cli/init-secrets-registry.test.ts::C-2687097e the default registry lists init-secrets and runs it` (the new test of task 4.1 of `add-init-secrets`): each takes the thirteen names in `list()` order, as `add-init-secrets` left them with eight. Unedited: `main.test.ts::C-2687097e cliMain prints help for the default registry`, `src/cli/registry.test.ts` and `src/tenancy/bootstrap.test.ts`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:** the names of `delivered-shapes.md`. From `add-init-secrets`: the requirement text it restated (restated whole here) and the `init-secrets` summary it fixes; no code name.

## Out of scope

The owner job, compose file and docs (U59); the engine's reading of the sink routes (U60); the e2e seeding and reset (U61b, U61d); `admin bootstrap-admin`'s options; removing a sink route or an idp row; a rotation flag.
