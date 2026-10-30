## Context

Dependencies as their folders define them; merged names: `delivered-shapes.md`.

- `add-api-pep`: `defineRoute(server, { method, url, auth: { kind: "session" }, action, schema, errors, handler })` (no `resource`: the principal's tenant); `request.principal` (`userId`, `kind`, `roles`) and `request.tenant` come only from the session; a refusal is 403 `FORBIDDEN` (`details.decisionId`); `createTestSession(db, ctx, subject, clock)` gives `{ cookie, userId, csrfToken }`.
- `add-api-conventions`: `ERROR_CODES` (16 entries; a later unit adds its codes), `startAfter` (bad cursor: 400 `CURSOR_INVALID`), `paginate`, `encodeCursor`, `deriveCursorKey(engineKey)` (`RangeError` for `null`), `respondIdempotent`; a unit that adds a route regenerates `docs/api/openapi.json`.
- `add-roles-and-memberships`: its functions append their own `identity.*` events in the caller's transaction; `tenant_admin` alone holds `manage_users_roles` and `manage_tenant`; `RbacActor` is `{ kind: "user" | "service"; userId; roles } | { kind: "operator"; name }`. `add-oidc-login`: `resolveSession` is `null` for a user not `active`.

## Decisions

1. **Files.** `src/identity/admin/{errors,accounts,idp-links,review-profile}.ts`; `src/api/{admin-errors,admin-page,admin-routes}.ts` and the internal registrars `admin-users.ts`, `admin-service-accounts.ts`, `admin-rbac.ts`, `admin-tenant.ts` (no test imports them); `src/db/migrations/0180_admin_api.sql`; six entries in `src/api/error-codes.ts`.
2. **Routes** (table below). All `defineRoute`, `auth: { kind: "session" }`, no `resource`. Body and query schemas have `additionalProperties: false` (a `tenantId` is 400 `VALIDATION_FAILED`), params the id patterns of identity (`userId` `^[A-Za-z0-9_-]{1,64}$`) and rbac, text is bounded (issuer 2048, subject 512, group 255, display name 200); finer rules stay in the functions. Response schemas list every property. Handlers run in `withTenantTx`; errors go through `adminApiError`.
3. **Actors.** Every function gets `{ kind: principal.kind === "service" ? "service" : "user", userId: principal.userId, roles: principal.roles }`; the new functions type it `Extract<RbacActor, { userId: string }>`; the audit actor is `{ kind, id: userId }`.
4. **Audit.** U17 functions audit themselves; the new ones append one event in the same transaction, only when a row changed: `identity.service_account_created`, `identity.user_state_changed` and `identity.idp_linked` (target `{ kind: "user", id }`) and `identity.review_profile_changed` (target `{ kind: "tenant", id }`), with the payloads of the scenarios.
5. **Error mapping.** `adminApiError` maps the codes listed in scenario "The mapping" to `ApiError`s with the registry's status and message; `ADMIN_SELF_DISABLE`, `ADMIN_WRONG_KIND` and `IDENTITY_OWNER_INVALID` carry `details: { reason }` = `self_disable`, `wrong_kind`, `owner_invalid`. Anything else (the `*_TENANT_MISMATCH` codes, `RBAC_DIRECT_GRANT_REFUSED`, which no route reaches, `AuditError`, driver errors) is returned unchanged, so the root handler answers 500 `INTERNAL`. The registry then holds 22.
6. **Pages.** Every list takes `limit` and `cursor` and answers `{ items, next_cursor }`. Small lists are read whole and cut by `pageRows`: sort by key arrays (strings by code unit), keep rows after the cursor's position, take `limit + 1`, call `paginate`. Keys: `[roleId]`, `[teamId]`, `[sha256hex(issuer), group]`, `[sha256hex(issuer + "\n" + subject)]` (an issuer can exceed a 256-character entry). Users and service accounts page in SQL (`listAccounts`, `after` = the position `[userId]`, `next_cursor` from `encodeCursor`). Scopes: `users`, `service_accounts`, `service_account_roles`, `roles`, `teams`, `idp_group_map`, `idp_links`. `key` is `deriveCursorKey(deps.engineKey)` computed once, or `null` for a `null` engine key; then a request with a `cursor`, or whose page would carry `next_cursor`, is 503 `ENGINE_KEY_REQUIRED` (also the rule of add-audit-api), and a list that fits one page without a cursor is served.
7. **Creates.** The three POST routes take `schema.headers: IDEMPOTENCY_HEADER_SCHEMA` and answer through `respondIdempotent`; PUT, PATCH and DELETE are idempotent by themselves.
8. **Accounts.** `/users` lists `kind = 'human'`, `/service-accounts` the service accounts; on `GET` and `PATCH /users/{userId}`, `PATCH /service-accounts/{userId}` and the three `roles` routes an id of the other kind is 404 (`getAccount` gives `null`). `getAccount` and `listAccounts` return `AccountView`: `roles` (every source), `teams` and `localRoles` (source `local`), sorted by code unit, whatever the account's state, from one query over `ursitoare.membership` for the user ids; `listAccounts` orders by `user_id COLLATE "C"`. `setAccountState` locks the row (`FOR UPDATE`), refuses disabling oneself (`ADMIN_SELF_DISABLE`, after the existence check), writes `state` and `updated_at`, and answers `changed: false` for the same state. A disable suspends the user's open sessions (`resolveSession` is `null` while the user is not `active`: 401) and an enable restores the sessions that have not expired meanwhile (30 min idle, 12 h absolute); add-oidc-login has only a per-session `revokeSession`. Nothing cascades. `PATCH` answers 200 with `getAccount` read after the change.
9. **Service accounts.** The owner defaults to `principal.userId`; a given owner must be an active human (`IDENTITY_OWNER_INVALID`). All three `roles` routes first read `getAccount(tx, ctx, userId, "service")` (`null` is 404), so a human's id is 404 on `GET`, `PUT` and `DELETE` alike and `RBAC_DIRECT_GRANT_REFUSED` cannot occur. Then `grantRole` and `revokeRole` (`revokeRole` answering `false` is 404); `GET .../roles` lists the account's `localRoles`, also when it is disabled.
10. **IdP links.** `addIdpLink` takes the advisory lock of the sign-in path (`pg_advisory_xact_lock(hashtextextended('ursitoare:idp_link:' || tenant || E'\n' || issuer || E'\n' || subject, 0))`), requires, in order, an existing user (`ADMIN_NOT_FOUND`), a human (`ADMIN_WRONG_KIND`) and an issuer in `ursitoare.tenant_idp` (`ADMIN_UNKNOWN_ISSUER`), and inserts with `ON CONFLICT DO NOTHING`; no row is `ADMIN_EXISTS`. `issuer` and `subject` follow identity's text rule. `linkedAt` is `to_char(linked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` (six fraction digits, as every M2 timestamp). `listIdpLinks` throws `ADMIN_NOT_FOUND` for an absent or non-human user. There is no unlink.
11. **Review profile.** `setReviewProfile` validates the value (`ADMIN_INVALID`), locks the tenant row, counts active humans, and updates `review_profile` only when it differs. `warning` is set (see scenario "Switch and warning") when the resulting profile is `solo` and `N >= 2` active humans, also when nothing changed; the switch is applied either way.
12. **Migration** `0180_admin_api.sql` (§ Data model).
13. **Wiring.** `src/main.ts` calls `registerAdminRoutes(server, { pool: pep.pool, clock: pep.clock, ids: systemIds, engineKey: config.engineKey })` right after `registerMeRoute(server, pep)`, also when `pep.pool` is null (the OpenAPI document lists the routes); `docs/api/openapi.json` is regenerated.
14. **Refusals are audited.** When a handler's error maps to 403 `ELEVATION_REFUSED` or 422 `OPERATION_REFUSED` (domain codes `RBAC_ELEVATION`, `ADMIN_SELF_DISABLE`, `ADMIN_WRONG_KIND`, `IDENTITY_OWNER_INVALID`; the transaction rolled back), the wrapper in `src/api/admin-routes.ts` calls `appendAuditCommitted(deps.pool, request.tenant, event, { clock: deps.clock })` with `eventType` `identity.change_refused`, actor `{ kind, id: principal.userId }`, target `{ kind: "action", id: <the route's action> }` and payload `{ code: <domain code>, route: request.routeOptions.url }`. A failed append logs `request.log.warn({ code: "AUDIT_FAILED" }, "refusal audit failed")`; the answer is unchanged.

## Interfaces

Same text as proposal.md § Interfaces given.

```ts
// src/identity/admin/{errors,accounts,idp-links,review-profile}.ts (exported by src/identity/index.ts)
type AdminErrorCode = "ADMIN_INVALID" | "ADMIN_NOT_FOUND" | "ADMIN_EXISTS" | "ADMIN_UNKNOWN_ISSUER" | "ADMIN_SELF_DISABLE" | "ADMIN_WRONG_KIND" | "ADMIN_TENANT_MISMATCH"
class AdminError extends Error { readonly code: AdminErrorCode; constructor(code: AdminErrorCode, message: string) }
interface AccountView extends User { roles: string[]; teams: string[]; localRoles: string[] }
function getAccount(tx: TenantTx, ctx: TenantContext, userId: string, kind: UserKind): Promise<AccountView | null>
function listAccounts(tx: TenantTx, ctx: TenantContext, q: { kind: UserKind; state?: UserState | undefined; limit: number; after?: string | undefined }): Promise<{ users: AccountView[]; next: string | null }>
function provisionServiceAccount(tx: TenantTx, ctx: TenantContext, input: { displayName: string; ownerUserId: string }, actor: Extract<RbacActor, { userId: string }>, opts?: IdentityOptions): Promise<User>
function setAccountState(tx: TenantTx, ctx: TenantContext, input: { userId: string; kind: UserKind; state: UserState }, actor: Extract<RbacActor, { userId: string }>, opts?: IdentityOptions): Promise<{ user: User; changed: boolean }>
interface IdpLinkRecord { issuer: string; subject: string; linkedAt: string }
function listIdpLinks(tx: TenantTx, ctx: TenantContext, userId: string): Promise<IdpLinkRecord[]>
function addIdpLink(tx: TenantTx, ctx: TenantContext, input: { userId: string; issuer: string; subject: string }, actor: Extract<RbacActor, { userId: string }>, opts?: IdentityOptions): Promise<IdpLinkRecord>
interface ReviewProfileWarning { code: "SOLO_TENANT_HAS_MANY_HUMANS"; message: string; humanMembers: number }
interface ReviewProfileChange { tenantId: string; reviewProfile: ReviewProfile; previous: ReviewProfile; changed: boolean; humanMembers: number; warning: ReviewProfileWarning | null }
function setReviewProfile(tx: TenantTx, ctx: TenantContext, profile: ReviewProfile, actor: Extract<RbacActor, { userId: string }>, opts?: IdentityOptions): Promise<ReviewProfileChange>
// src/api/{admin-errors,admin-page,admin-routes}.ts (exported by src/api/index.ts)
function adminApiError(error: unknown): unknown
interface PageBinding { key: CursorKey | null; tenantId: string; scope: string }
function pageRows<T>(rows: readonly T[], page: { limit: number; cursor: string | null }, binding: PageBinding, keyOf: (row: T) => CursorPosition): Page<T>
interface AdminApiDeps { pool: TenantPool | null; clock: Clock; ids: IdSource; engineKey: KeyMaterial | null }
function registerAdminRoutes(server: FastifyInstance, deps: AdminApiDeps): void
// ERROR_CODES gains ALREADY_EXISTS 409, IN_USE 409, ELEVATION_REFUSED 403, UNKNOWN_ISSUER 422, OPERATION_REFUSED 422, ENGINE_KEY_REQUIRED 503 "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)"
```

HTTP, under `/api/v1`, every route `session` with action `manage_users_roles` (the last: `manage_tenant`); answers are in the spec. Codes: `V` = `VALIDATION_FAILED`, `N` = `NOT_FOUND`, `P` = `CURSOR_INVALID`, `ENGINE_KEY_REQUIRED` and `V`, `I` = `IDEMPOTENCY_IN_PROGRESS` and `IDEMPOTENCY_KEY_REUSED`; the PEP adds its own.

| Route | Body or query | Declared `errors` |
|---|---|---|
| `GET /users`, `GET /service-accounts` | `limit`, `cursor`, `state` | `P` |
| `GET /users/{userId}` | | `N`, `V` |
| `PATCH /users/{userId}`, `PATCH /service-accounts/{userId}` | `{ state }` | `N`, `OPERATION_REFUSED`, `V` |
| `GET /users/{userId}/idp-links` | `limit`, `cursor` | `P`, `N` |
| `POST /users/{userId}/idp-links` | `{ issuer, subject }` | `ALREADY_EXISTS`, `I`, `N`, `OPERATION_REFUSED`, `UNKNOWN_ISSUER`, `V` |
| `POST /service-accounts` | `{ displayName, ownerUserId? }` | `I`, `OPERATION_REFUSED`, `V` |
| `GET /service-accounts/{userId}/roles` | `limit`, `cursor` | `P`, `N` |
| `PUT`, `DELETE /service-accounts/{userId}/roles/{roleId}` | | `ELEVATION_REFUSED`, `N`, `V` |
| `GET /roles`, `GET /teams`, `GET /idp-group-map` | `limit`, `cursor` | `P` |
| `POST /teams` | `{ teamId }` | `ALREADY_EXISTS`, `I`, `V` |
| `DELETE /teams/{teamId}` | | `IN_USE`, `N`, `V` |
| `PUT /idp-group-map` | `{ issuer, group, roleId }` or `{ issuer, group, teamId }` | `ELEVATION_REFUSED`, `N`, `UNKNOWN_ISSUER`, `V` |
| `DELETE /idp-group-map` | query `issuer`, `group` | `ELEVATION_REFUSED`, `N`, `V` |
| `PUT /tenant/review-profile` | `{ reviewProfile }` | `V` |

## Data model

`src/db/migrations/0180_admin_api.sql`, verbatim (the runner supplies the transaction); no table is added.

```sql
GRANT UPDATE (review_profile) ON TABLE ursitoare.tenant TO ursitoare_app;
```

## Failure cases

| Situation | Behaviour |
|---|---|
| No session; no action; no database or engine | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` with `details.decisionId`; 503 `AUTHZ_UNAVAILABLE` (PEP) |
| Unknown property, bad id or value, `tenantId` | 400 `VALIDATION_FAILED`; nothing written |
| Unknown user, account of the other kind (also on a role route), absent role, team or mapping | 404 `NOT_FOUND` |
| Duplicate team or link; team in use | 409 `ALREADY_EXISTS`; 409 `IN_USE` |
| Role above the actor's; issuer not routed; disabling oneself, a link on a service account, a bad owner | 403 `ELEVATION_REFUSED`; 422 `UNKNOWN_ISSUER`; 422 `OPERATION_REFUSED` with `details.reason`; the first and the last also append `identity.change_refused` (a failed append is only logged) |
| Concurrent identical creates or state changes | one wins (claim, unique key, row lock); the other gets `ALREADY_EXISTS`, a replay or `changed: false` |
| Audit or database error in a handler | rollback; 500 `INTERNAL`, no driver text |
| Edited, foreign or other-list cursor; a cursor, or a page that needs one, with no engine key | 400 `CURSOR_INVALID`; 503 `ENGINE_KEY_REQUIRED` |

## Security

1. All 19 routes are `session` routes: the PEP authenticates before the body is parsed, then checks the action and (non-GET) the CSRF token. None is public; only `tenant_admin` holds the actions.
2. No new table. Queries run in `withTenantTx` under row-level security (the column grant on `tenant` is limited by its policy to the caller's row). The tenant comes only from the session; each route has a two-tenant scenario.
3. Schemas refuse unknown properties and bound values; the functions re-validate. Group names, subjects and display names are untrusted text, returned as data, never put in a policy or prompt.
4. No secret is stored; the engine key reaches only `deriveCursorKey`.
5. Abuse cases, each a scenario: no session, a non-admin, another tenant's ids or a `tenantId` in a body, granting above one's roles, a role route aimed at a human, a disabled user's live session, disabling oneself, a foreign issuer, taking over a linked subject, an edited cursor.
6. `POST /users/{userId}/idp-links` trusts the tenant admin not to bind a subject they control to another person; the link is audited and needs an unlinked subject. M2 adds nothing more.

## Test plan

Node test runner, `*.test.ts` beside each file (the stub patterns are in tasks.md). Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; the issuer `https://idp.example/realms/ursitoare` is provisioned with `provisionTenantIdp(db.ownerPool, ctx, { issuer, organization: "org-a" })` (`org-b` for B); humans come from `upsertUserFromClaims`, service accounts from `createServiceAccount`; events are read from `ursitoare.audit_event` with `event_type LIKE 'identity.%'` (a PEP refusal also appends `authz.denied`); memberships come from `grantRole` (operator actor), `setGroupMapping` and `syncMemberships`.

Server tests build the fixture inline: `buildServer` with `sequentialIds()`, a silent `createLogger`, `noopTracer`; a mutable `Clock` from `2026-10-25T09:00:00Z`; `createPolicyEngine({ srcDir: <empty temp dir>, tenantPolicies: [PERMIT_ALL], clock, ids, logger })` with `PERMIT_ALL` = `{ id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }`; `installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: "http://127.0.0.1:8080" })`; `registerAdminRoutes(server, { pool: db.appPool, clock, ids: sequentialIds(5000), engineKey: { reveal: () => "k".repeat(64) } })` inside `assert.doesNotThrow`; sessions from `createTestSession(db, ctx, "carol", clock)` as `headers: { cookie }` (non-GET also `"x-csrf-token"`). Carol is made `tenant_admin` by an operator `grantRole`, since U17 checks the actor's roles even when the policy permits all; elevation scenarios use a caller with only `author`. "Who may call" copies `src/identity/policy/roles.cedar` into `<temp>/identity/policy/` instead of `PERMIT_ALL`. A failing audit is a pool wrapper rejecting statements that mention `audit_` (as in add-api-pep). `src/main.admin.test.ts` runs `main` as `src/main.api.test.ts` does (port-0 `AppConfig`, no database, `inspectServers`) and checks that the admin routes are included, never an exact list.

## Decisions made while writing

- **Six new error codes, one earlier unit's test changed.** `src/api/error-codes.test.ts:36` (`C-96e47324 The registry holds exactly the 16 codes…`) asserts exactly 16 keys. From L4 0.4.43 a backticked `path::name` in a task's own text lets red change that test in place (L4-IMP-089): it must then fail by assertion, a rename fails the attempt, and green still opens no earlier test. Task 5.1 names it, so its red moves `EXPECTED_CODES` to 22 entries under the same title. L4's criterion id is the first 8 hex of sha256(`openspec|api-conventions|Every error code is registered|The registry`) (l4 `specs/criteria.py:35`; it gives the merged `C-0965869a Privileges are narrow`); re-checked on main cd81ff3.
- **`ENGINE_KEY_REQUIRED` in place of `DIRECT_GRANT_REFUSED`.** One rule for every M2 list (503 for a cursor, or a page that needs one, with no engine key). The role routes check the account kind first, so `DIRECT_GRANT_REFUSED` is unreachable and unregistered (22 entries).
- **`listAccounts` is a second reader beside merged `listUsers`** (`src/identity/users.ts`), adding the `kind` and `state` filters and the membership read; `listUsers` is merged U10 code that add-admin-cli uses.
- **Roles and teams on accounts** (beyond the roadmap row): otherwise an admin cannot see who is `tenant_admin` or holds a break-glass grant (`localRoles`); disabled accounts are included, unlike `loadMemberships`.
- **Refusals are audited** (Decision 14, beyond the row), only 403 `ELEVATION_REFUSED` and 422 `OPERATION_REFUSED`.
- **A disable suspends sessions;** an enable restores the sessions that have not expired meanwhile (30 min idle, 12 h absolute; a per-user revocation is a roadmap open item).
- **No unlink of an IdP link:** it needs `DELETE` on `idp_link`, which `src/identity/schema.test.ts::C-0965869a Privileges are narrow` pins as refused.
- **`/users` lists humans only;** roles go only to service accounts (people get them from mapped groups, U17). **Only the three POST creates take `Idempotency-Key`.**
