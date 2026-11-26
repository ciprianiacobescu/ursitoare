# Delivered shapes taken by add-tenant-bootstrap

Declarations from main@31968a29 (`file:line`), each read in the file named; only what a red test or the code uses. Every unit named in `proposal.md` is merged and archived except `add-init-secrets`, which gives no code name used here.

```ts
// src/cli (U20)
cli/registry.ts:8-35    CliCall { args: Readonly<Record<string, string | boolean>>; env: Env; stdout: CliOutput; stderr: CliOutput; clock: Clock; ids: IdSource; owner: OwnerAccess | null }; OwnerAccess { pool: pg.Pool; config: AppConfig }; CliCommand { summary: string; details?: string; options: Readonly<Record<string, CliOption>>; database: boolean; run(call: CliCall): Promise<number> }; CliOption { type: "string" | "boolean"; summary: string; required?: boolean }   // no secret reader
cli/registry.ts:65      createCommandRegistry(): CommandRegistry   // registerCommand, find, list() sorted by name
cli/errors.ts:3-28      CliErrorCode (15 members, closed); CliError extends Error { readonly code: CliErrorCode; constructor(code, message) }   // no details
cli/run.ts:15-26,91-104,143-180 CliDeps { env; stdout; stderr; registry; clock?; ids?; readSecret?: SecretReader; connectOwner?: (e: DatabaseEndpoint) => OwnerConnection }; runCli(argv, deps): Promise<number>; codes matching ^(CLI|RBAC|IDENTITY|AUDIT|TENANT)_ print `<code>: <message>` (exit 2 for CLI_USAGE, else 1), a ConfigError `CLI_CONFIG_INVALID: <message>`, anything else `CLI_INTERNAL: command failed`; a `database: true` command loads loadConfig(deps.env, deps.readSecret), connects (CLI_DATABASE_UNAVAILABLE when unreachable) and runs with owner { pool, config }; a `database: false` command runs with owner null and no config load
cli/tenant.ts:12-45     resolveCliTenant(db: Pick<pg.Pool, "query">, requested?: string): Promise<TenantContext>   // CLI_USAGE "--tenant is not a valid tenant id"; CLI_TENANT_UNKNOWN "no tenant has that id"; CLI_NO_TENANT; CLI_TENANT_REQUIRED "several tenants exist; pass --tenant <id>"
cli/output.ts:23; cli/builtin.ts:6-11 safeText(text: string): string ("?" for control and bidi characters); createDefaultRegistry(): CommandRegistry
// src/config (U01)
config/config.ts:15-20,169,188-210 Env; DatabaseEndpoint { readonly url: string; readonly password: Secret | null }; isDatabaseUrl(value: string): boolean (exported since the M8 scaffold, `docs/decisions/0002`, so no task adds the export; postgres scheme, a host, no password, only sslmode disable or verify-full; an empty path passes); an app password variable without the app URL → ConfigError CONFIG_INVALID "<variable>: set only together with <url variable>"
config/secret.ts:5,10,40 SecretReader = (path: string) => string; Secret { reveal(): string; toJSON() gives "[REDACTED]" }; readSecretValue(variable, path, readSecret): Secret   // strips one trailing newline; unreadable or empty → CONFIG_SECRET_EMPTY "<variable>: file is missing, unreadable or empty"
config/errors.ts:1-13   ConfigError { code: "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY"; variable; constructor(code, variable, reason) }   // message `<variable>: <reason>`; config/index.ts does not export readSecretValue
// src/db (U02), src/durable (U30)
db/roles.ts:7,9,159     ROLE_OWNER = "ursitoare_owner"; ROLE_APP = "ursitoare_app"; ensureRoles(adminPool: pg.Pool, passwords?: { ownerPassword?: string | { reveal(): string }; appPassword?: string | { reveal(): string } }): Promise<{ created: string[] }>   // ALTERs both roles every run; CONNECT to both, CREATE to the owner on current_database(); bad password → DbError DB_INVALID; SQL failure → DB_ROLES_FAILED; no connection → DB_UNAVAILABLE
db/pool.ts:56; db/prepare.ts:6-13 createPool(source: string | { url: string; password: { reveal(): string } | null }, opts?): pg.Pool; prepareDatabase(ownerPool: pg.Pool, clock: { now(): Date }): Promise<{ applied: string[]; partitions: string[] }>   // DbError MIGRATION_CHECKSUM_MISMATCH, …; DbError { code: string } (db/errors.ts)
durable/prepare.ts:41   prepareDurable(ownerUrl: string): Promise<void>   // URL holds the password; failures → DurableError DURABLE_INVALID or DURABLE_UNAVAILABLE
// src/tenancy (U03), src/identity (U10)
tenancy/context.ts:5-18 ReviewProfile = "solo" | "team"; TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }; hashRouteKey(key: string): Buffer   // sha256; empty or ill-formed → TENANT_INVALID "invalid route key"
tenancy/tx.ts:6-27      TenantPool = Pick<pg.Pool, "connect">; withTenantTx(pool, ctx, fn); inTransaction(pool, fn) (module-internal)
tenancy/errors.ts:1-9   TenancyErrorCode (8 members, closed); TenancyError { code; details: Readonly<Record<string, string | number>>; constructor(code, message, details?) }
tenancy/routes.ts:7,64,116 RouteRegistration = "created" | "exists"; registerTenantRoute(tx, kind, key): Promise<RouteRegistration> (held elsewhere → TENANT_ROUTE_CONFLICT "route is already registered"; unknown tenant → TENANT_UNKNOWN); resolveTenantBy(pool, kind, key): Promise<TenantContext | null>
tenancy/bootstrap.ts:8-11,26-52 EnsureTenantOptions { ids?: IdSource; clock?: Clock }; module-internal assertTenantName (empty, padded or over 200 characters → TENANT_INVALID "invalid tenant name"), toContext, sqlState; ensureDefaultTenant (:55-110) unchanged
0002_tenancy.sql        `tenant` (name UNIQUE, review_profile DEFAULT 'solo') and `tenant_idp` are row-level secured; only kind `idp` is reserved
identity/tenant-idp.ts:11,16 IdpPair { issuer: string; organization: string }; provisionTenantIdp(ownerPool: TenantPool, ctx: TenantContext, idp: IdpPair, opts?: IdentityOptions): Promise<void>   // idempotent; taken pair → IDENTITY_IDP_TAKEN; newline or padded text → IDENTITY_INVALID
// src/core, test/support
core/clock.ts:11; core/ids.ts:63 fixedClock(iso: string): Clock; sequentialIds(seed = 0): IdSource   // first "ten" id ten_00000000-0000-7000-8000-000000000000
test/support/pg.ts:31,53,95,208,280 Cluster { host; port; dataDir; adminUrl; stop() }; freePort(): Promise<number>; startCluster(opts?): Promise<Cluster> (fresh embedded cluster; adminUrl postgres://postgres:<password>@127.0.0.1:<port>/postgres; the caller removes dataDir); TestDatabase { ownerEndpoint; ownerPool; appPool; close() }; withTestDatabase(opts?: { migrated?: boolean }): Promise<TestDatabase>; readTestCluster().adminUrl (the shared cluster's superuser URL)
test/support/tenants.ts:8 seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>   // tenant_a, tenant_b ("Tenant A", "Tenant B")
```
