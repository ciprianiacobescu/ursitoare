## Why

A verified OIDC token carries an issuer, an `organization` claim and a subject. Today nothing maps them to a tenant or a user: there is no `user`, no IdP link, no way to say which tenant owns an identity provider, and no refusal for a token that names no organization, two, or an unknown one. `add-oidc-login` (sign-in), the policy core and the admin API all need this model, and exit test 18 (two-tenant isolation) starts with "a token of tenant B never yields tenant A".

Observable result: migration `0100_identity.sql` creates `ursitoare."user"`, `ursitoare.idp_link` and `ursitoare.tenant_idp`, each tenant-leading with forced row-level security. As `ursitoare_app`, a transaction for tenant A sees and writes only A's rows. On the owner pool, `provisionTenantIdp` routes an `(issuer, organization)` pair to one tenant under route kind `idp` (raw keys are never stored; a pair held by another tenant is refused with `IDENTITY_IDP_TAKEN`; the app pool is refused). `resolveTenantForToken(pool, { issuer, organization })` then returns exactly that tenant, or throws `IDENTITY_NO_ORGANIZATION`, `IDENTITY_AMBIGUOUS_ORGANIZATION` or `IDENTITY_UNKNOWN_TENANT` with a message that never echoes a claim. `upsertUserFromClaims` creates a human user and its link at the first sign-in, updates name and email only when they changed, never links by email, and refuses a disabled user. `createServiceAccount` makes a service user owned by an active human of the same tenant.

## What Changes

- `src/db/migrations/0100_identity.sql`: the three tables, their policies and grants (`ursitoare."user"` is quoted: `user` is a reserved word).
- `src/identity`: `IdentityError`, `idpRouteKey`, `organizationFromClaim`, `provisionTenantIdp`, `resolveTenantForToken`, `upsertUserFromClaims`, `getUser`, `listUsers`, `createServiceAccount`, and the `User` type.
- Tests: pure tests for the route key and the claim, SQL tests of the migration, and two-tenant tests for every function, all on the app pool of `withTestDatabase()`.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold also provides the module-internal `requireText` (`src/identity/text.ts`) and `identityError` (`src/identity/errors.ts`) named in design.md § Interfaces.
- **Depends on:** `add-tenancy-foundation` (U03): `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `registerTenantRoute` (kind `idp` is reserved to the owner connection; a held pair is `TENANT_ROUTE_CONFLICT`), `resolveTenantBy`, `hashRouteKey`, `checkTenancyCatalog`, `seedTwoTenants`, and the table `ursitoare.tenant` the new tables reference. `add-db-foundation` (U02): the migration runner that applies `0100_identity.sql`, `createPool`, `withTestDatabase`, `TestDatabase`, `freePort`. `add-engine-skeleton` (U01): `Clock`, `IdSource`, `systemClock`, `systemIds` in `src/core`; tests use `fixedClock` and `sequentialIds`.
- **Files implemented** (stubs from the scaffold): `src/identity/{errors,text,route,tenant-idp,users,index}.ts`. **Files created:** `src/db/migrations/0100_identity.sql`, `src/identity/{route,schema,provision,resolve,upsert,users,service}.test.ts`.
- **Files changed:** none. No existing test changes, no dependency is added, `test/arch/modules.ts` already allows `identity` to import `core`, `tenancy` and `db`, and no e2e-stack part is added (`add-oidc-login` provisions the test organization with `provisionTenantIdp`).
- **Migrations:** `0100_identity.sql`. **Tables:** `ursitoare."user"`, `ursitoare.idp_link`, `ursitoare.tenant_idp` (none partitioned, so the partition-ready rule does not apply). Exit 18 (part).

**Interfaces given** (exact shapes and behaviour in `design.md` § Interfaces; the declarations omit `export`):

```ts
// src/identity/index.ts (TenantContext, TenantPool, TenantTx come from src/tenancy; Clock, IdSource from src/core)
type IdentityErrorCode = "IDENTITY_INVALID" | "IDENTITY_NO_ORGANIZATION" | "IDENTITY_AMBIGUOUS_ORGANIZATION" | "IDENTITY_UNKNOWN_TENANT" | "IDENTITY_IDP_TAKEN" | "IDENTITY_OWNER_REQUIRED" | "IDENTITY_USER_DISABLED" | "IDENTITY_OWNER_INVALID" | "IDENTITY_TENANT_MISMATCH"
class IdentityError extends Error { readonly code: IdentityErrorCode; constructor(code: IdentityErrorCode, message: string) }
type UserKind = "human" | "service"; type UserState = "active" | "disabled"
interface User { readonly userId: string; readonly kind: UserKind; readonly ownerUserId: string | null; readonly displayName: string; readonly email: string | null; readonly state: UserState }
interface IdentityOptions { ids?: IdSource; clock?: Clock }
const IDP_ROUTE_KIND: string
function idpRouteKey(issuer: string, organization: string): string
function organizationFromClaim(organization: unknown): string
interface IdpPair { issuer: string; organization: string }
function provisionTenantIdp(ownerPool: TenantPool, ctx: TenantContext, idp: IdpPair, opts?: IdentityOptions): Promise<void>
function resolveTenantForToken(pool: TenantPool, claims: { issuer: string; organization: unknown }): Promise<TenantContext>
interface TokenClaims { issuer: string; subject: string; email?: string | undefined; name?: string | undefined; preferredUsername?: string | undefined }
function upsertUserFromClaims(tx: TenantTx, ctx: TenantContext, claims: TokenClaims, opts?: IdentityOptions): Promise<User>
function getUser(tx: TenantTx, ctx: TenantContext, userId: string): Promise<User | null>
interface UserPage { limit?: number | undefined; after?: string | undefined }
function listUsers(tx: TenantTx, ctx: TenantContext, page?: UserPage): Promise<{ users: User[]; next: string | null }>
function createServiceAccount(tx: TenantTx, ctx: TenantContext, input: { displayName: string; ownerUserId: string }, opts?: IdentityOptions): Promise<User>
// SQL, schema ursitoare (migration 0100_identity.sql): tables "user", idp_link, tenant_idp
```

**Interfaces taken:**

- From `add-engine-skeleton`: `Clock`, `IdSource`, `systemClock`, `systemIds` (`src/core`); `fixedClock`, `sequentialIds` in tests.
- From `add-db-foundation`: `createPool` (`src/db`); `withTestDatabase`, `TestDatabase`, `freePort` (`test/support/pg.ts`); the runner that applies `src/db/migrations/0100_identity.sql`.
- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `registerTenantRoute`, `resolveTenantBy`, `hashRouteKey`, `TenancyError`, `checkTenancyCatalog` (`src/tenancy`); `seedTwoTenants` (`test/support/tenants.ts`); SQL table `ursitoare.tenant` and route kind `idp`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@fb48c96, checked line by line).

## Out of scope

The OIDC relying party, ID-token validation, sessions and their routes (`add-oidc-login`); roles, teams, memberships and IdP group mappings (`add-roles-and-memberships`); the admin API, disabling or unlinking users and changing a tenant's IdP list (`add-admin-api`); audit events (`add-audit-chain` and its users); the break-glass CLI (`add-admin-cli`); a cursor contract (`add-api-conventions`); the full cross-tenant sweep (`add-tenant-isolation-sweep`); tenant provisioning itself and Keycloak realm setup.
