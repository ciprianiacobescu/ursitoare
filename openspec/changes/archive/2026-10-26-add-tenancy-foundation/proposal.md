## Why

Every later table must be tenant-leading with row-level security, and some lookups (a session cookie, an OIDC issuer, a webhook id) must find the tenant before it is known. Today the repository has no tenant, no way to scope a database session to one, and no guard that stops a later unit from adding a table that skips the rules.

Observable result: migration `0002_tenancy.sql` creates `ursitoare.tenant` and the routing table `ursitoare.tenant_route`. As `ursitoare_app`, a query on `tenant` sees only the row whose id equals `app.tenant_id`, and sees no rows (not an error) when the setting is absent; `tenant_route` cannot be read or written at all. `withTenantTx(pool, ctx, fn)` runs `fn` as that tenant and leaves no tenant on the connection after commit or rollback, even when `fn` set one at session level, and rejects with `TENANT_TX_ABORTED`, committing nothing, when `fn` caught a SQL error and returned. `registerTenantRoute`, `unregisterTenantRoute` and `resolveTenantBy` register, remove and find a tenant by a hashed key; a key held by another tenant is refused, a removal never touches another tenant's route, a guessable kind (`idp`) can be registered only on the owner connection, and `resolve_tenant` answers only exact pairs. `ensureDefaultTenant` creates the single tenant once. A catalog test over every migration fails the build when a later table lacks a tenant-leading primary key, unique index or foreign key, forced RLS or a tenant-only policy (every permissive policy for the app role restricts rows to `tenant_id = current_setting('app.tenant_id', true)`), or when the runtime role gains a privilege it must not have. This is the foundation of exit test 18.

## What Changes

- `src/db/migrations/0002_tenancy.sql`: `tenant` (RLS, app role read-only), `tenant_route` (no app privilege), and the `SECURITY DEFINER` functions `register_tenant_route`, `unregister_tenant_route` and `resolve_tenant` (owner `ursitoare_owner`, pinned `search_path`).
- `src/tenancy`: `TenantContext`, `withTenantTx`, `ensureDefaultTenant`, `hashRouteKey`, `registerTenantRoute`, `unregisterTenantRoute`, `resolveTenantBy`, `TenancyError`, and `checkTenancyCatalog` with the pinned allowlist.
- `test/support/tenants.ts`: `seedTwoTenants(db)`.
- Tests: the two-tenant isolation tests on the app pool only, and the catalog test that runs on every migrated test database. Specs: capability `tenancy`, and capability `tenancy-catalog` for the two catalog requirements (one file would pass 18,000 characters).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them.
- **Depends on:** `add-db-foundation` (U02): `ROLE_OWNER`, `ROLE_APP`, `createPool` (`src/db`), `withTestDatabase`, `TestDatabase`, `readTestCluster` and `freePort` (`test/support/pg.ts`), the migration runner that applies `src/db/migrations/0002_tenancy.sql` after `0001_base.sql` (versions are unique, gaps allowed), the template database that `prepareDatabase` migrates in the test global setup, and the grants model (the app role has `USAGE` only). `add-engine-skeleton` (U01): `src/tenancy` imports `Clock`, `IdSource`, `systemClock` and `systemIds` from `src/core`; tests use `fixedClock` and `sequentialIds`.
- **Files implemented** (stubs from the scaffold): `src/tenancy/{errors,context,tx,bootstrap,routes,catalog,index}.ts`, `test/support/tenants.ts`. **Files created:** `src/tenancy/{context,schema,tx,bootstrap,routes,resolve,unregister,catalog,catalog.roles}.test.ts`, `src/db/migrations/0002_tenancy.sql`, `test/support/tenants.test.ts`.
- **Files changed:** none; no existing test changes (`src/db/base.test.ts::Ledger and ownership` already asserts one ledger row per migration file). No `package.json` change.
- **Migrations:** `0002_tenancy.sql`. **Tables:** `ursitoare.tenant`, `ursitoare.tenant_route` (both on the closed allowlist).

**Interfaces given** (exact shapes and behaviour in `design.md` § Interfaces):

```ts
type TenancyErrorCode = "TENANT_INVALID" | "TENANT_CONTEXT_MISSING" | "TENANT_UNKNOWN" | "TENANT_ROUTE_CONFLICT" | "TENANT_ROUTE_RESERVED" | "TENANT_DEFAULT_CONFLICT" | "TENANT_BOOTSTRAP_FAILED" | "TENANT_TX_ABORTED"
class TenancyError extends Error { readonly code: TenancyErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: TenancyErrorCode, message: string, details?: Record<string, string | number>) }
type ReviewProfile = "solo" | "team"
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }
const TENANT_ID_PATTERN: RegExp; const ROUTE_KIND_PATTERN: RegExp; const MAX_ROUTE_KEY_LENGTH: number
function hashRouteKey(key: string): Buffer
type TenantPool = Pick<pg.Pool, "connect">; type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
interface EnsureTenantOptions { ids?: IdSource; clock?: Clock }
function ensureDefaultTenant(pool: TenantPool, name: string, opts?: EnsureTenantOptions): Promise<TenantContext>
type RouteRegistration = "created" | "exists"
function registerTenantRoute(tx: TenantTx, kind: string, key: string): Promise<RouteRegistration>
function unregisterTenantRoute(tx: TenantTx, kind: string, key: string): Promise<boolean>
function resolveTenantBy(pool: TenantPool, kind: string, key: string): Promise<TenantContext | null>
const CATALOG_GLOBAL_TABLES: readonly string[]
type CatalogRule = "not_tenant_leading" | "unique_not_tenant_leading" | "fk_not_tenant_scoped" | "rls_not_enabled" | "rls_not_forced" | "no_tenant_policy" | "partition_open_to_app" | "view_open_to_app" | "route_table_open" | "definer_function_unsafe" | "app_role_missing" | "app_role_privileged" | "app_role_owns_relation"
interface CatalogViolation { readonly rule: CatalogRule; readonly object: string }
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string }): Promise<CatalogViolation[]>
// test/support/tenants.ts
const TENANT_A_ID: string; const TENANT_B_ID: string
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>
// SQL, schema ursitoare
register_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
unregister_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
resolve_tenant(p_kind text, p_key_hash bytea) RETURNS text
```

**Interfaces taken:**

- From `add-engine-skeleton`: `Clock`, `IdSource`, `systemClock`, `systemIds`, `fixedClock`, `sequentialIds` (`src/core`).
- From `add-db-foundation`: `ROLE_OWNER`, `ROLE_APP`, `createPool` (`src/db`); `withTestDatabase`, `TestDatabase`, `readTestCluster`, `freePort` (`test/support/pg.ts`).

## Out of scope

Authentication and the resolution of a token to a tenant (`add-identity-model`), the route kinds themselves and expiry of routes (a unit that issues expiring keys calls `unregisterTenantRoute`), tenant provisioning and an API or UI for it, audit events for tenant creation, the `cell` column and several tenants per deployment (Phase 2), the Cedar `Tenant` entity, partitioning, DBOS isolation, and the full cross-tenant sweep over routes and Cedar decisions (`add-tenant-isolation-sweep`).
