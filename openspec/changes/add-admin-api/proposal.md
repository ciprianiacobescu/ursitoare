## Why

Roles, teams and IdP group mappings exist as functions (`add-roles-and-memberships`) and users and service accounts as tables (`add-identity-model`), but nobody can manage them over HTTP or switch a tenant's review profile without editing the database.

Observable result: a signed-in tenant administrator (`tenant_admin` alone holds `manage_users_roles` and `manage_tenant`) lists, reads, disables and enables the tenant's users (`/api/v1/users`), creates and disables service accounts and grants them roles (`/service-accounts`), lists the default roles (`/roles`), creates and deletes teams (`/teams`), sets, lists and removes IdP group mappings (`/idp-group-map`) and links one more IdP identity to a user (`/users/{userId}/idp-links`). Each change appends an audit event in its own transaction, a disabled user's session stops at once, a role above the caller's is refused, and another tenant's rows stay invisible. `PUT /api/v1/tenant/review-profile` switches the tenant between `solo` and `team`, is audited, and answers a `warning` when a `solo` tenant has two or more active human members. Lists use the cursor contract, creates honour `Idempotency-Key`, and every error code is registered.

## What Changes

- `src/identity/admin/`: account, IdP link and review-profile functions. `src/api`: `adminApiError`, `pageRows` and `registerAdminRoutes` with 19 routes.
- Migration `0180_admin_api.sql` (one column grant); six new entries in `ERROR_CODES`; `src/main.ts` registers the routes; `docs/api/openapi.json` is regenerated.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the exports of `src/identity/index.ts` and `src/api/index.ts` (each task adds its own), the six entries of `ERROR_CODES` and the call in `src/main.ts` (tasks 5.1 and 7.1), and the regenerated `docs/api/openapi.json`; tests import each symbol from the file that defines it. No new dependency.
- **Depends on** (evidence is the list under Interfaces taken): `add-audit-chain` (U08), `add-api-pep` (U13), `add-api-conventions` (U14), `add-roles-and-memberships` (U17), and, beyond the roadmap row, `add-identity-model` (users, links, service accounts), `add-policy-catalogue` (the actions and the engine), `add-oidc-login` (`Principal`, sessions) and the M0 units whose names are used. `test/arch/modules.ts` needs no change: `api` may import `identity`, which may import `audit` and `tenancy`.
- **Files implemented** (stubs from the scaffold): `src/identity/admin/{errors,accounts,idp-links,review-profile}.ts`, `src/api/{admin-errors,admin-page,admin-routes}.ts`. **Created:** `src/api/{admin-users,admin-service-accounts,admin-rbac,admin-tenant}.ts`, `src/db/migrations/0180_admin_api.sql` and a `*.test.ts` for each task. **Changed:** `src/identity/index.ts`, `src/api/{index,error-codes}.ts`, `src/main.ts`, `docs/api/openapi.json`, and one test, `src/api/error-codes.test.ts::The registry` (it pinned 16 codes; it now expects them and the six new ones).
- **Migrations:** `0180_admin_api.sql` (`GRANT UPDATE (review_profile)` on `ursitoare.tenant` to the app role). **Tables, env:** none. **Endpoints:** the 19 below. **Audit events:** `identity.service_account_created`, `identity.user_state_changed`, `identity.idp_linked`, `identity.review_profile_changed`, plus those of the `add-roles-and-memberships` functions called. **Error codes added:** `ALREADY_EXISTS` 409, `IN_USE` 409, `ELEVATION_REFUSED` 403, `DIRECT_GRANT_REFUSED` 422, `UNKNOWN_ISSUER` 422, `OPERATION_REFUSED` 422.

**Interfaces given** (exact shapes in `design.md` § Interfaces; declarations omit `export`)

```ts
// src/identity/admin/{errors,accounts,idp-links,review-profile}.ts (exported by src/identity/index.ts)
type AdminErrorCode = "ADMIN_INVALID" | "ADMIN_NOT_FOUND" | "ADMIN_EXISTS" | "ADMIN_UNKNOWN_ISSUER" | "ADMIN_SELF_DISABLE" | "ADMIN_WRONG_KIND" | "ADMIN_TENANT_MISMATCH"
class AdminError extends Error { readonly code: AdminErrorCode; constructor(code: AdminErrorCode, message: string) }
interface AdminActor { kind: "user" | "service"; userId: string }
function listAccounts(tx: TenantTx, ctx: TenantContext, q: { kind: UserKind; state?: UserState | undefined; limit: number; after?: string | undefined }): Promise<{ users: User[]; next: string | null }>
function provisionServiceAccount(tx: TenantTx, ctx: TenantContext, input: { displayName: string; ownerUserId: string }, actor: AdminActor, opts?: IdentityOptions): Promise<User>
function setAccountState(tx: TenantTx, ctx: TenantContext, input: { userId: string; kind: UserKind; state: UserState }, actor: AdminActor, opts?: IdentityOptions): Promise<{ user: User; changed: boolean }>
interface IdpLinkRecord { issuer: string; subject: string; linkedAt: string }
function listIdpLinks(tx: TenantTx, ctx: TenantContext, userId: string): Promise<IdpLinkRecord[]>
function addIdpLink(tx: TenantTx, ctx: TenantContext, input: { userId: string; issuer: string; subject: string }, actor: AdminActor, opts?: IdentityOptions): Promise<IdpLinkRecord>
interface ReviewProfileWarning { code: "SOLO_TENANT_HAS_MANY_HUMANS"; message: string; humanMembers: number }
interface ReviewProfileChange { tenantId: string; reviewProfile: ReviewProfile; previous: ReviewProfile; changed: boolean; humanMembers: number; warning: ReviewProfileWarning | null }
function setReviewProfile(tx: TenantTx, ctx: TenantContext, profile: ReviewProfile, actor: AdminActor, opts?: IdentityOptions): Promise<ReviewProfileChange>
// src/api/{admin-errors,admin-page,admin-routes}.ts (exported by src/api/index.ts)
function adminApiError(error: unknown): unknown
interface PageBinding { key: CursorKey | null; tenantId: string; scope: string }
function pageRows<T>(rows: readonly T[], page: { limit: number; cursor: string | null }, binding: PageBinding, keyOf: (row: T) => CursorPosition): Page<T>
interface AdminApiDeps { pool: TenantPool | null; clock: Clock; ids: IdSource; engineKey: KeyMaterial | null }
function registerAdminRoutes(server: FastifyInstance, deps: AdminApiDeps): void
// SQL: migration 0180_admin_api.sql grants UPDATE (review_profile) on ursitoare.tenant to the app role
```

Also given, all `session` routes under `/api/v1` with action `manage_users_roles` (the last under `manage_tenant`); lists take `limit`, `cursor` and answer `{ items, next_cursor }`; `Account` = `{ userId, kind, ownerUserId, displayName, email, state }`, `IdpLink` = `{ issuer, subject, linkedAt }`, `GroupMapping` = `{ issuer, group, roleId, teamId, reviewedBy }`; error answers use `{ error: { code, message, details? } }` with the codes of the table in `design.md`:

- `GET /users`, `GET /service-accounts` (also `state`): page of `Account`. `GET /users/{userId}`: `Account`. `PATCH /users/{userId}` and `/service-accounts/{userId}` body `{ state: "active" | "disabled" }`: `Account`.
- `POST /service-accounts` body `{ displayName, ownerUserId? }` (owner defaults to the caller): 201 `Account`. `GET /service-accounts/{userId}/roles`: page of `{ roleId }`; `PUT .../roles/{roleId}`: `{ roleId, result: "granted" | "exists" }`; `DELETE .../roles/{roleId}`: 204.
- `GET /roles`: page of `{ roleId }`. `GET /teams`: page of `{ teamId }`; `POST /teams` body `{ teamId }`: 201 `{ teamId }`; `DELETE /teams/{teamId}`: 204.
- `GET /idp-group-map`: page of `GroupMapping`; `PUT /idp-group-map` body `{ issuer, group, roleId }` or `{ issuer, group, teamId }`: `GroupMapping`; `DELETE /idp-group-map?issuer=&group=`: 204.
- `GET /users/{userId}/idp-links`: page of `IdpLink`; `POST` body `{ issuer, subject }`: 201 `IdpLink`.
- `PUT /tenant/review-profile` body `{ reviewProfile: "solo" | "team" }`: `{ tenantId, reviewProfile, previous, changed, humanMembers, warning: { code: "SOLO_TENANT_HAS_MANY_HUMANS", message, humanMembers } | null }`.

**Interfaces taken:**

- From `add-engine-skeleton`: `ApiError`, `Clock`, `IdSource`, `systemIds`, `sequentialIds`, `createLogger`, `noopTracer`, `buildServer`, `AppConfig` (`engineKey`), `main`.
- From `add-db-foundation`: `withTestDatabase`, `TestDatabase`; the migration runner and ledger `ursitoare.schema_migration`.
- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `ReviewProfile`, `withTenantTx`, `seedTwoTenants`, `checkTenancyCatalog`; table `ursitoare.tenant`.
- From `add-audit-chain`: `appendAudit`, `AuditEventInput`, `KeyMaterial`; table `ursitoare.audit_event` (read by the tests).
- From `add-identity-model`: `User`, `UserKind`, `UserState`, `IdentityOptions`, `IdentityError`, `getUser`, `createServiceAccount`, `upsertUserFromClaims`, `provisionTenantIdp`; tables `ursitoare."user"`, `idp_link`, `tenant_idp`.
- From `add-policy-catalogue` (U11b): `createPolicyEngine`, `ActionName` (`manage_users_roles`, `manage_tenant`). From `add-oidc-login` (U12): `Principal`.
- From `add-api-pep` (U13): `defineRoute`, `installPep`, `PepDeps`, `listDefinedRoutes`, `DefinedRoute`, `registerMeRoute`, `createTestSession`, `request.principal` and `request.tenant`, `MainDeps.inspectServers`.
- From `add-api-conventions` (U14): `ERROR_CODES`, `isRegisteredCode`, `unregisteredRouteErrors`, `PAGE_QUERY_SCHEMA`, `readPage`, `startAfter`, `paginate`, `Page`, `CursorBinding`, `CursorKey`, `CursorPosition`, `deriveCursorKey`, `encodeCursor`, `respondIdempotent`, `IDEMPOTENCY_HEADER_SCHEMA`, `servedOpenApiText`; the headers `Idempotency-Key` and `Idempotent-Replayed`; the rule that a unit adding a route or a code regenerates `docs/api/openapi.json` and edits `ERROR_CODES`.
- From `add-roles-and-memberships` (U17): `RbacError`, `RbacErrorCode`, `RbacActor`, `DEFAULT_ROLES`, `listRoles`, `listTeams`, `createTeam`, `deleteTeam`, `GroupMapping`, `listGroupMappings`, `setGroupMapping`, `removeGroupMapping`, `grantRole`, `revokeRole`, `loadMemberships`, `MembershipSet`; the policy file `src/identity/policy/roles.cedar`; the principal's `roles` filled by the session verifier.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e226f8c, checked line by line).

## Out of scope

Unlinking an IdP link and deleting users; custom roles and a role grant to a human (roles come from mapped groups; the break-glass `grant-role` is `add-admin-cli`); the screens and the journey (`add-web-admin`); reading the audit log (`add-audit-api`); cascading a disabled owner to its service accounts and the membership sync (`add-membership-sync`); creating tenants; bearer-token callers; rate limiting.
