## Context

Dependencies as their folders define them; merged names: `delivered-shapes.md`.

- `add-api-pep`: `defineRoute(server, { method, url, auth: { kind: "session" }, action, schema, errors, handler })`; with no `resource` the resource is the principal's tenant; `request.principal` (`userId`, `kind`, `roles`) and `request.tenant` come only from the session; a non-GET session route needs `X-CSRF-Token` and, when sent, the public `Origin`; a refusal is 403 `FORBIDDEN` (`details.decisionId`); `createTestSession(db, ctx, subject, clock)` gives `{ cookie, userId, csrfToken }`.
- `add-api-conventions`: `ERROR_CODES` (16 entries; "a later unit that adds a code adds it to `ERROR_CODES`"), `unregisteredRouteErrors`, `readPage`, `startAfter` (bad cursor: 400 `CURSOR_INVALID`), `paginate` (over `limit + 1` rows), `encodeCursor`, `deriveCursorKey(engineKey)` (`RangeError` for `null`), `respondIdempotent`, `IDEMPOTENCY_HEADER_SCHEMA`; a unit that adds a route regenerates `docs/api/openapi.json`.
- `add-roles-and-memberships`: its functions append their own `identity.*` events in the caller's transaction; the four default roles are listed only; `tenant_admin` alone holds `manage_users_roles` and `manage_tenant`; `grantRole` of a human needs an operator. `add-oidc-login`: `resolveSession` is `null` for a user not `active`.

## Decisions

1. **Files.** `src/identity/admin/{errors,accounts,idp-links,review-profile}.ts`; `src/api/{admin-errors,admin-page,admin-routes}.ts` and the internal registrars `admin-users.ts`, `admin-service-accounts.ts`, `admin-rbac.ts`, `admin-tenant.ts` (no test imports them); `src/db/migrations/0180_admin_api.sql`; `src/api/error-codes.ts` gains six entries. `test/arch/modules.ts` is unchanged.
2. **Routes** (table below). All `defineRoute`, `auth: { kind: "session" }`, no `resource`. Every body and query schema has `additionalProperties: false` (a `tenantId` property is 400 `VALIDATION_FAILED`), params have the id patterns of identity (`userId` `^[A-Za-z0-9_-]{1,64}$`) and rbac (`roleId`, `teamId`), text is bounded (issuer 2048, subject 512, group 255, display name 200); finer rules stay in the functions. Response schemas declare every returned property. Handlers run in `withTenantTx` (creates in `respondIdempotent`) and pass errors through `adminApiError`.
3. **Actors.** U17 functions get `{ kind: "user", userId: principal.userId, roles: principal.roles }`; the new ones get `{ kind: principal.kind === "service" ? "service" : "user", userId }`, the audit actor `{ kind, id }`.
4. **Audit.** U17 functions audit themselves. The new ones append one event in the caller's transaction, only when a row changed: `identity.service_account_created` (target `{ kind: "user", id }`, payload `{ ownerUserId, displayName }`), `identity.user_state_changed` (target user, payload `{ from, to, kind }`), `identity.idp_linked` (target user, payload `{ issuer, subject }`), `identity.review_profile_changed` (target `{ kind: "tenant", id }`, payload `{ from, to, humanMembers }`).
5. **Error mapping** (`adminApiError`; message = registry default unless stated): `RBAC_INVALID`, `IDENTITY_INVALID`, `ADMIN_INVALID` become 400 `VALIDATION_FAILED` ("Request validation failed", no details); `RBAC_NOT_FOUND`, `ADMIN_NOT_FOUND` 404 `NOT_FOUND` ("Resource not found"); `RBAC_EXISTS`, `ADMIN_EXISTS` 409 `ALREADY_EXISTS`; `RBAC_IN_USE` 409 `IN_USE`; `RBAC_ELEVATION` 403 `ELEVATION_REFUSED`; `RBAC_DIRECT_GRANT_REFUSED` 422 `DIRECT_GRANT_REFUSED`; `RBAC_UNKNOWN_ISSUER`, `ADMIN_UNKNOWN_ISSUER` 422 `UNKNOWN_ISSUER`; `ADMIN_SELF_DISABLE`, `ADMIN_WRONG_KIND`, `IDENTITY_OWNER_INVALID` 422 `OPERATION_REFUSED` with `details: { reason }` = `self_disable`, `wrong_kind`, `owner_invalid`. Anything else (the `*_TENANT_MISMATCH` codes, `AuditError`, driver errors) is returned unchanged, so the root handler answers 500 `INTERNAL`. The six new registry entries (status and message) are listed in the spec; the registry then holds 22.
6. **Pages.** Every list takes `limit` and `cursor` and answers `{ items, next_cursor }`. Small lists are read whole and cut by `pageRows`: sort by key arrays (entry by entry, strings by code unit), keep rows after the cursor's position, take `limit + 1`, call `paginate`. Keys: `[roleId]`, `[teamId]`, `[sha256hex(issuer), group]`, `[sha256hex(issuer + "\n" + subject)]` (an issuer can exceed the 256-character position entry). Users and service accounts page in SQL: `listAccounts` with `after` = the position `[userId]`, and `next_cursor` from `encodeCursor`. Scopes: `users`, `service_accounts`, `service_account_roles`, `roles`, `teams`, `idp_group_map`, `idp_links`. `key` is `deriveCursorKey(deps.engineKey)` computed once in `registerAdminRoutes`, or `null` for a `null` engine key; then a request with a `cursor` is 400 `CURSOR_INVALID`, a response that needs `next_cursor` is a plain `Error` (500, log `{ code: "ADMIN_API_NO_ENGINE_KEY" }`), and a list that fits one page works.
7. **Creates.** The three POST routes take `schema.headers: IDEMPOTENCY_HEADER_SCHEMA` and answer through `respondIdempotent`; PUT, PATCH and DELETE are idempotent by themselves.
8. **Accounts.** `/users` lists `kind = 'human'`, `/service-accounts` the service accounts; an id of the other kind is 404. `listAccounts` orders by `user_id COLLATE "C"`. `setAccountState` locks the row (`FOR UPDATE`), refuses disabling oneself (`ADMIN_SELF_DISABLE`, after the existence check), writes `state` and `updated_at`, and answers `changed: false` for the same state. A disabled user's sessions end at once; nothing cascades to its service accounts.
9. **Service accounts.** The owner defaults to `principal.userId`; a given owner must be an active human (`IDENTITY_OWNER_INVALID`), so a service principal without one is refused. Roles use `grantRole` and `revokeRole` (`revokeRole` answering `false` is 404); `GET .../roles` checks the id is a service account, then lists `loadMemberships(...).roles`.
10. **IdP links.** `addIdpLink` takes the advisory lock of the sign-in path (`pg_advisory_xact_lock(hashtextextended('ursitoare:idp_link:' || tenant || E'\n' || issuer || E'\n' || subject, 0))`), requires, in this order, an existing user (`ADMIN_NOT_FOUND`), a human (`ADMIN_WRONG_KIND`) and an issuer in `ursitoare.tenant_idp` for the tenant (`ADMIN_UNKNOWN_ISSUER`), and inserts with `ON CONFLICT DO NOTHING`; no row is `ADMIN_EXISTS` (any user holds the pair; the answer does not say which). `issuer` and `subject` follow identity's text rule (no newline, no padding). `listIdpLinks` throws `ADMIN_NOT_FOUND` for an absent or non-human user. There is no unlink (see the last section).
11. **Review profile.** `setReviewProfile` validates the value (`ADMIN_INVALID`), locks the tenant row, counts active humans, and updates `review_profile` only when it differs. `warning` is `{ code: "SOLO_TENANT_HAS_MANY_HUMANS", message: "This solo tenant has N active human members; each may review their own flows.", humanMembers: N }` when the resulting profile is `solo` and `N >= 2` (also when nothing changed), else `null`; the switch is applied either way.
12. **Migration** `0180_admin_api.sql` (§ Data model); `name`, `INSERT` and `DELETE` on `tenant` stay refused to the app role.
13. **Wiring.** `src/main.ts` calls `registerAdminRoutes(server, { pool: pep.pool, clock: pep.clock, ids: systemIds, engineKey: config.engineKey })` right after `registerMeRoute(server, pep)`, also when `pep.pool` is null, so the OpenAPI document lists the routes; `docs/api/openapi.json` is regenerated.

## Interfaces

Same text as proposal.md § Interfaces given (`Page`, `CursorKey`, `CursorPosition`: `add-api-conventions`; `KeyMaterial`: `add-audit-chain`; `User` and its kin: `add-identity-model`).

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

HTTP, under `/api/v1`, every route `session` with action `manage_users_roles` (the last: `manage_tenant`); success bodies are in proposal.md § Interfaces given (`Account`, `IdpLink`, `GroupMapping`). In the last column `V` = `VALIDATION_FAILED`, `N` = `NOT_FOUND`, `P` = `CURSOR_INVALID` and `V`, `I` = `IDEMPOTENCY_IN_PROGRESS` and `IDEMPOTENCY_KEY_REUSED`; the PEP adds its own codes.

| Route | Body or query | Declared `errors` |
|---|---|---|
| `GET /users`, `GET /service-accounts` | `limit`, `cursor`, `state` | `P` |
| `GET /users/{userId}` | | `N`, `V` |
| `PATCH /users/{userId}`, `PATCH /service-accounts/{userId}` | `{ state }` | `N`, `OPERATION_REFUSED`, `V` |
| `GET /users/{userId}/idp-links` | `limit`, `cursor` | `P`, `N` |
| `POST /users/{userId}/idp-links` | `{ issuer, subject }` | `ALREADY_EXISTS`, `I`, `N`, `OPERATION_REFUSED`, `UNKNOWN_ISSUER`, `V` |
| `POST /service-accounts` | `{ displayName, ownerUserId? }` | `I`, `OPERATION_REFUSED`, `V` |
| `GET /service-accounts/{userId}/roles` | `limit`, `cursor` | `P`, `N` |
| `PUT /service-accounts/{userId}/roles/{roleId}` | | `DIRECT_GRANT_REFUSED`, `ELEVATION_REFUSED`, `N`, `V` |
| `DELETE /service-accounts/{userId}/roles/{roleId}` | | `ELEVATION_REFUSED`, `N`, `V` |
| `GET /roles`, `GET /teams` | `limit`, `cursor` | `P` |
| `POST /teams` | `{ teamId }` | `ALREADY_EXISTS`, `I`, `V` |
| `DELETE /teams/{teamId}` | | `IN_USE`, `N`, `V` |
| `GET /idp-group-map` | `limit`, `cursor` | `P` |
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
| No or invalid session; no `manage_users_roles` or `manage_tenant` | 401 `UNAUTHENTICATED`; 403 `FORBIDDEN` with `details.decisionId` (PEP) |
| No database or engine | 503 `AUTHZ_UNAVAILABLE` (PEP) |
| Unknown property, bad id or value, `tenantId` in a body | 400 `VALIDATION_FAILED`; nothing written |
| Unknown user, account of the other kind, absent role, team or mapping | 404 `NOT_FOUND` |
| Duplicate team or link; team in use | 409 `ALREADY_EXISTS`; 409 `IN_USE` |
| Role above the actor's; role to a human; issuer not routed; disabling oneself, a link on a service account, a bad owner | 403 `ELEVATION_REFUSED`; 422 `DIRECT_GRANT_REFUSED`; 422 `UNKNOWN_ISSUER`; 422 `OPERATION_REFUSED` with `details.reason` |
| Concurrent identical creates or state changes | one wins (claim, unique key, row lock); the other gets `ALREADY_EXISTS`, a replay or `changed: false` |
| Audit or database error in a handler | rollback; 500 `INTERNAL`, no driver text |
| Edited, foreign or other-list cursor; any cursor without a key | 400 `CURSOR_INVALID` |

## Security

1. All 19 routes are `session` routes: the PEP authenticates before the body is parsed, then checks the action and (non-GET) the CSRF token. None is public; only `tenant_admin` holds these actions.
2. No new table. Queries run in `withTenantTx` under row-level security (the new column grant on `tenant` is limited by its policy to the caller's row). The tenant comes only from the session; every route requirement has a two-tenant scenario.
3. Schemas refuse unknown properties and bound every value; the functions re-validate. Group names, subjects and display names are untrusted text, returned as data (`cache-control: no-store`), never put in a policy or prompt.
4. No secret is stored; the engine key reaches only `deriveCursorKey`.
5. Abuse cases, each a scenario: no session, a non-admin, another tenant's ids or a `tenantId` in a body, granting above one's roles or to a human, a disabled user's live session, disabling oneself, an issuer of another tenant, taking over a linked subject, an edited cursor.

## Test plan

Node test runner, `*.test.ts` beside each file. Each file starts with `assert.equal(typeof <function it tests>, "function")`; a call that reaches a stub is wrapped in `assert.doesNotThrow` or `await assert.doesNotReject` and the result asserted. Database tests use `withTestDatabase()` and `seedTwoTenants(db)`; the issuer is `https://idp.example/realms/ursitoare`, provisioned with `provisionTenantIdp(db.ownerPool, ctx, { issuer, organization: "org-a" })` (`org-b` for tenant B); humans come from `upsertUserFromClaims`, service accounts from `createServiceAccount`, in `withTenantTx(db.appPool, ...)`; events are read from `ursitoare.audit_event` with `event_type LIKE 'identity.%'`, since a refusal also appends `authz.denied`.

Server tests build the fixture inline: `buildServer` with `sequentialIds()`, a silent `createLogger`, `noopTracer`; a mutable `Clock` from `2026-10-25T09:00:00Z`; `createPolicyEngine({ srcDir: <empty temp dir>, tenantPolicies: [PERMIT_ALL], clock, ids, logger })`, `PERMIT_ALL` being `{ id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }`; `installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: "http://127.0.0.1:8080" })`; `registerAdminRoutes(server, { pool: db.appPool, clock, ids: sequentialIds(5000), engineKey: { reveal: () => "k".repeat(64) } })` inside `assert.doesNotThrow`; sessions from `createTestSession(db, ctx, "carol", clock)` sent as `headers: { cookie }` (non-GET also `"x-csrf-token": csrfToken`, no `Origin`); carol is made `tenant_admin` by `grantRole(tx, ctx, { userId, roleId: "tenant_admin" }, { kind: "operator", name: "test" })`, since U17 checks the actor's roles even when the policy permits all. "Who may call" copies `src/identity/policy/roles.cedar` into `<temp>/identity/policy/` instead of `PERMIT_ALL`; elevation scenarios use a caller with only `author`. `src/main.admin.test.ts` runs `main` as `src/main.api.test.ts` does (port-0 `AppConfig`, no database, `inspectServers`) and checks the admin routes are included, never an exact list.

## Decisions made while writing

- **Six new error codes, one frozen test changed.** U17's 409, 403 and 422 answers have no code among the 16, and U17 leaves their registration to this unit. The task names `src/api/error-codes.test.ts::The registry` (exact name to be re-checked against merged M1), which pinned 16 entries.
- **No unlink of an IdP link.** It needs `DELETE` on `idp_link`, which `src/identity/schema.test.ts::C-0965869a Privileges are narrow` pins as refused; a later unit that needs it changes both.
- **`/users` lists humans only;** roles are granted only to service accounts (people get roles from mapped groups, U17).
- **A list that fits one page needs no engine key,** so the M2 journey works when the stack sets none; a second page needs it.
- **Only the three POST creates take `Idempotency-Key`;** a repeated `solo` still returns the warning.
