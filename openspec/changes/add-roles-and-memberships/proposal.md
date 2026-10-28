## Why

Users can sign in (`add-oidc-login`) but hold no role: every principal has empty `roles` and `teams`, so nobody can administer anything. Authority comes from the identity provider's groups through a reviewed mapping (ADR-12); this unit builds the mapping, the memberships it produces and the permits that give the default roles meaning. It is the identity half of exit test 18 and the base of the M2 admin API, CLI and UI.

Observable result: every tenant has the roles `tenant_admin`, `author`, `approver` and `auditor`. An operator maps the bootstrap admin group (default `ursitoare-admins`) to `tenant_admin` once, audited. When alice signs in with the groups `ursitoare-authors` and `team-finance`, the callback turns them, through the tenant's mappings, into the membership `author` and team `finance`; her request principal carries `roles: ["author"]`, `teams: ["finance"]`, so `GET /api/v1/me` lists only `read_self` for her and lists `manage_users_roles`, `manage_tenant`, `read_audit` for carol, whose group maps to `tenant_admin`. A role is granted directly only to a service account (by an admin) or by an operator; nobody grants a role they lack or changes their own. The e2e part `parts/30-rbac.ts` seeds the mappings of the fake users in every tenant.

## What Changes

- `src/db/migrations/0170_rbac.sql`: `role`, `team`, `idp_group_map`, `membership` (tenant-leading, forced row-level security), and a trigger that gives each new tenant its four default roles.
- `src/identity/rbac/`: errors, teams, group mappings, sign-in sync and `groupsFromIdToken`, `loadMemberships`, direct grants, the once-only admin bootstrap, `resolvePrincipal`.
- `src/identity/policy/roles.cedar`: four platform-layer permits (`principal in Role::"<role>"`).
- Callers changed: the callback transaction of add-oidc-login syncs memberships; the session verifier of add-api-pep builds the principal with `resolvePrincipal`.
- `test/support/e2e-stack/rbac-part.ts` with `parts/30-rbac.ts`.

## Impact

- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the re-exports in `src/identity/index.ts` (each task adds its own), the migration (task 1.1), the call in `src/identity/oidc/callback.ts` (task 9.1) and the verifier line in `src/api/session-auth.ts` (task 8.2). No npm dependency is added.
- **Depends on:** `add-identity-model` (users, `tenant_idp`, service accounts), `add-policy-catalogue` (fragment loader, `Role` and `Team` entities, `userEntity`), `add-oidc-login` (callback transaction, `SessionContext`, `Principal`, fake sign-in helpers, `oidcPart`), `add-api-pep` (session verifier, `/me`, `installPep`; beyond the roadmap row U10, U11b, U12, because the principal is built there), and the merged `add-engine-skeleton`, `add-db-foundation`, `add-tenancy-foundation`, `add-audit-chain`, `add-pdp-cedar`, `add-e2e-stack`, `add-fake-oidc` (evidence: Interfaces taken).
- **Files implemented** (stubs): `src/identity/rbac/{errors,names,teams,group-map,sync,memberships,grants,bootstrap,principal}.ts`, `test/support/e2e-stack/rbac-part.ts`. **Created:** `src/db/migrations/0170_rbac.sql`, `src/identity/policy/roles.cedar`, `test/support/e2e-stack/parts/30-rbac.ts` and a `*.test.ts` for each task. **Changed:** `src/identity/index.ts`, `src/identity/oidc/callback.ts`, `src/api/session-auth.ts`; no existing test changes. `test/arch/modules.ts` needs no change.
- **Migrations:** `0170_rbac.sql`; tables `ursitoare.role`, `team`, `idp_group_map`, `membership` (not partitioned); function `ursitoare.seed_default_roles`. **Env:** `URSITOARE_BOOTSTRAP_ADMIN_GROUP` (read by `bootstrapAdminGroup(env)` for its callers). **Endpoints:** none. **Audit events:** `identity.team_created`, `team_deleted`, `group_mapped`, `group_unmapped`, `memberships_synced`, `role_granted`, `role_revoked`, `bootstrap_admin_mapped`. **Error codes:** the eight `RbacErrorCode` values (`add-admin-api` registers those it can return). **Policy ids:** `identity-rbac-tenant-admin-manage-users-roles`, `identity-rbac-tenant-admin-manage-tenant`, `identity-rbac-tenant-admin-read-audit`, `identity-rbac-auditor-read-audit`.

**Interfaces given** (exact shapes in `design.md` § Interfaces; declarations omit `export`)

```ts
// src/identity/rbac/{errors,names}.ts
type RbacErrorCode = "RBAC_INVALID" | "RBAC_NOT_FOUND" | "RBAC_EXISTS" | "RBAC_IN_USE" | "RBAC_ELEVATION" | "RBAC_DIRECT_GRANT_REFUSED" | "RBAC_UNKNOWN_ISSUER" | "RBAC_TENANT_MISMATCH"
class RbacError extends Error { readonly code: RbacErrorCode; constructor(code: RbacErrorCode, message: string) }
type RbacActor = { kind: "user"; userId: string; roles: readonly string[] } | { kind: "operator"; name: string }
const DEFAULT_ROLES: readonly string[]; const DEFAULT_BOOTSTRAP_ADMIN_GROUP: string; const BOOTSTRAP_ADMIN_GROUP_ENV: string
// teams.ts
function listRoles(tx: TenantTx, ctx: TenantContext): Promise<string[]>
function listTeams(tx: TenantTx, ctx: TenantContext): Promise<string[]>
function createTeam(tx: TenantTx, ctx: TenantContext, input: { teamId: string }, actor: RbacActor, opts?: IdentityOptions): Promise<{ teamId: string }>
function deleteTeam(tx: TenantTx, ctx: TenantContext, teamId: string, actor: RbacActor, opts?: IdentityOptions): Promise<void>
// group-map.ts
interface GroupMapping { issuer: string; group: string; roleId: string | null; teamId: string | null; reviewedBy: string }
function listGroupMappings(tx: TenantTx, ctx: TenantContext): Promise<GroupMapping[]>
function setGroupMapping(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string; roleId?: string | undefined; teamId?: string | undefined }, actor: RbacActor, opts?: IdentityOptions): Promise<GroupMapping>
function removeGroupMapping(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string }, actor: RbacActor, opts?: IdentityOptions): Promise<boolean>
// sync.ts, memberships.ts
interface SyncResult { added: string[]; removed: string[] }
interface MembershipSet { roles: string[]; teams: string[] }
function groupsFromIdToken(idToken: string): string[]
function syncMemberships(tx: TenantTx, ctx: TenantContext, userId: string, input: { issuer: string; groups: readonly string[] }, opts?: IdentityOptions): Promise<SyncResult>
function loadMemberships(tx: TenantTx, ctx: TenantContext, userId: string): Promise<MembershipSet>
// grants.ts, bootstrap.ts, principal.ts
function grantRole(tx: TenantTx, ctx: TenantContext, input: { userId: string; roleId: string }, actor: RbacActor, opts?: IdentityOptions): Promise<"granted" | "exists">
function revokeRole(tx: TenantTx, ctx: TenantContext, input: { userId: string; roleId: string }, actor: RbacActor, opts?: IdentityOptions): Promise<boolean>
function mapBootstrapAdminGroup(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string; operator: string }, opts?: IdentityOptions): Promise<"mapped" | "already_mapped">
function bootstrapAdminGroup(env: Readonly<Record<string, string | undefined>>): string
function resolvePrincipal(pool: TenantPool, session: SessionContext): Promise<Principal>
// test/support/e2e-stack/rbac-part.ts (parts/30-rbac.ts re-exports rbacPart as part)
const rbacPart: E2eStackPart; const RBAC_SEED_TEAM: string; const RBAC_SEED_MAPPINGS: readonly { group: string; roleId: string | null; teamId: string | null }[]
// SQL: tables ursitoare.role, team, idp_group_map, membership; function ursitoare.seed_default_roles(p_tenant_id text)
```

**Interfaces taken:**

- From `add-engine-skeleton`: `Clock`, `fixedClock`, `sequentialIds`, `createLogger`, `noopTracer`, `buildServer`, `Secret`.
- From `add-db-foundation`: `createPool`, `withTestDatabase`, `TestDatabase`; the runner that applies `0170_rbac.sql`.
- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `seedTwoTenants`, `checkTenancyCatalog`; table `ursitoare.tenant`.
- From `add-audit-chain`: `appendAudit`; table `ursitoare.audit_event`.
- From `add-identity-model`: `IdentityOptions`, `upsertUserFromClaims`, `createServiceAccount`, `provisionTenantIdp`; tables `ursitoare."user"` and `ursitoare.tenant_idp`.
- From `add-pdp-cedar`: `PolicyRequest`, `Decision`.
- From `add-policy-catalogue`: `createPolicyEngine`, `PolicyEngine`, `PrincipalEntity`, `userEntity`, `tenantEntity`, `defaultSrcDir`.
- From `add-oidc-login`: `Principal`, `principalOf`, `SessionContext`, `createSession`, `registerOidcRoutes`, `completeFakeLogin`, `oidcPart`, `oidcApi`.
- From `add-api-pep`: `installPep`, `registerMeRoute`, `defineRoute`, `PepDeps`, `createTestSession`.
- From `add-e2e-stack`: `E2eStackPart`, `PartContext`, `PartHandle`, `E2eStackError`, `databaseApi`, `databasePart`, `discoverParts`.
- From `add-fake-oidc`: `startFakeOidc`, `FakeOidc`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e226f8c, checked line by line).

## Out of scope

HTTP endpoints for users, roles, teams and mappings (`add-admin-api`); the `ursitoare admin` commands and reading the environment (`add-admin-cli`); screens (`add-web-admin`); the periodic membership sync for `run_as` owners and token-refresh sync (`add-membership-sync`); custom roles; permits for flows, runs, tasks, tools and policy (the units that implement them); creating tenants and the tenant routing of issuers (`add-identity-model`); the review-profile switch.
