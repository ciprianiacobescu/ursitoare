# admin-api Specification

## Purpose
REST routes for a tenant administrator to manage users, service accounts, roles, teams, IdP group mappings, IdP links and the review profile, each policy-checked, tenant-scoped and audited.

## Requirements

### Requirement: Every admin route is a session route under the right action
`registerAdminRoutes` SHALL define exactly the 19 routes of design.md § Interfaces through `defineRoute` with `auth: { kind: "session" }`, the action `manage_users_roles` (`manage_tenant` for `PUT /api/v1/tenant/review-profile`), the declared `errors` of that table, and no route that takes a tenant or principal from a request.

#### Scenario: The route table
- **WHEN** `registerAdminRoutes` runs on a server with `installPep` (once with a pool, once with `pool: null`) and `listDefinedRoutes(server)` is read
- **THEN** both servers list the 19 rows (method, url, action) of the table with `auth` `{ kind: "session" }` and an `errors` list containing the row's codes, and `unregisteredRouteErrors(listDefinedRoutes(server))` is `[]`

#### Scenario: Who may call
- **WHEN** under `roles.cedar` carol (operator grant `tenant_admin`), alice (operator grant `author`) and a caller with no cookie send `GET /api/v1/roles`, and carol and alice send `PUT /api/v1/tenant/review-profile` with `{ "reviewProfile": "team" }`
- **THEN** carol gets 200 with `items` `[{ roleId: "approver" }, { roleId: "auditor" }, { roleId: "author" }, { roleId: "tenant_admin" }]` and `next_cursor` `null`, alice gets 403 `FORBIDDEN` with `details.decisionId` (profile unchanged) and the caller with no cookie 401 `UNAUTHENTICATED`; carol's switch is 200

#### Scenario: Another tenant and a forged tenant
- **WHEN** tenant A holds humans ann and bob and a service account, tenant B holds human zed, and B's admin sends `GET /api/v1/users`, `GET` and `PATCH /api/v1/users/<ann>`, `PUT /api/v1/service-accounts/<svc>/roles/author`, `GET /api/v1/users/<ann>/idp-links` and `POST /api/v1/teams` with `{ "teamId": "x", "tenantId": "tenant_a" }`
- **THEN** the list holds only zed, the next four answer 404 `NOT_FOUND`, the last 400 `VALIDATION_FAILED`, and tenant A's rows are unchanged

### Requirement: Admin errors are registered codes
`ERROR_CODES` SHALL hold six more entries (scenario "The registry" of the requirement "Every error code is registered", modified in `specs/api-conventions/spec.md`), and `adminApiError` SHALL turn the errors of `add-roles-and-memberships` and `add-identity-model` and the `AdminError` codes that a route can return into `ApiError` answers with them, passing every other error through.

#### Scenario: The mapping
- **WHEN** `adminApiError` gets `RbacError` and `AdminError` and `IdentityError` instances of `RBAC_INVALID`, `IDENTITY_INVALID`, `ADMIN_INVALID`, `RBAC_NOT_FOUND`, `ADMIN_NOT_FOUND`, `RBAC_EXISTS`, `ADMIN_EXISTS`, `RBAC_IN_USE`, `RBAC_ELEVATION`, `RBAC_UNKNOWN_ISSUER`, `ADMIN_UNKNOWN_ISSUER`, `ADMIN_SELF_DISABLE`, `ADMIN_WRONG_KIND`, `IDENTITY_OWNER_INVALID`
- **THEN** each result is an `ApiError` with status and code `400 VALIDATION_FAILED` (x3), `404 NOT_FOUND` (x2), `409 ALREADY_EXISTS` (x2), `409 IN_USE`, `403 ELEVATION_REFUSED`, `422 UNKNOWN_ISSUER` (x2), and `422 OPERATION_REFUSED` with `details.reason` `self_disable`, `wrong_kind`, `owner_invalid`; no output message contains `secret-input`, the message given to every input error

#### Scenario: Other errors pass through
- **WHEN** `adminApiError` gets `RbacError("RBAC_TENANT_MISMATCH", ...)`, `RbacError("RBAC_DIRECT_GRANT_REFUSED", ...)`, `AdminError("ADMIN_TENANT_MISMATCH", ...)`, `new Error("boom")` and the string `"x"`
- **THEN** each result is strictly equal (`===`) to its input

### Requirement: The app role may switch only its own tenant's review profile
Migration `0180_admin_api.sql` SHALL grant the app role `UPDATE (review_profile)` on `ursitoare.tenant` and nothing more.

#### Scenario: Objects and privileges
- **WHEN** the ledger row `version = 180`, `name = 'admin_api'` is asserted, then as the app role in `tenant_a` a test runs `UPDATE ursitoare.tenant SET review_profile = 'team' WHERE tenant_id = 'tenant_a'`, the same `WHERE tenant_id = 'tenant_b'`, `SET name = 'x'`, `SET review_profile = 'bogus'`, an `INSERT` and a `DELETE`, and `checkTenancyCatalog(db.ownerPool)` runs
- **THEN** the first changes 1 row, the second 0 rows (tenant B stays `solo`), `name`, `INSERT` and `DELETE` fail with SQLSTATE `42501`, `'bogus'` with `23514`, and the violations are `[]`

### Requirement: Users are listed, read, disabled and enabled
`GET /api/v1/users` SHALL page the tenant's human accounts and `GET /api/v1/users/{userId}` SHALL read one, each with `roles`, `teams` and `localRoles`; `PATCH /api/v1/users/{userId}` SHALL set `state` (`active` or `disabled`) and answer 200 with the account item (the `AdminAccount` with `roles`, `teams` and `localRoles`, read by `getAccount` after the change), appending `identity.user_state_changed` only on a change, refusing self-disable, and suspending open sessions while disabled; an enable restores the sessions that have not expired meanwhile (30 min idle, 12 h absolute).

#### Scenario: List, page, filter, read
- **WHEN** tenant A holds humans ann, bob, cat and a service account, and carol (a fourth human) calls `GET /api/v1/users?limit=2` and the `next_cursor`, `?state=disabled`, `?limit=0`, `GET` of ann, of the service account, of an unknown valid id and of `bad%20id`
- **THEN** the pages hold 2 then 2 users ordered by `userId`, with `next_cursor` set then `null`, none a service account; each item has exactly `userId`, `kind` `human`, `ownerUserId` `null`, `displayName`, `email`, `state`, `roles`, `teams`, `localRoles` (arrays); the filter gives `{ items: [], next_cursor: null }`; the rest answer 400, 200 with ann's item, 404, 404, 400

#### Scenario: Roles and teams of accounts
- **WHEN** ann holds `author` by an operator grant and, through `syncMemberships` of groups mapped to `approver` and to team `finance`, those two; bob holds nothing; ann is then patched to `disabled`; and carol sends `GET /api/v1/users` and `GET /api/v1/users/<ann>`
- **THEN** ann's item (in both) has `state` `disabled`, `roles` `["approver", "author"]`, `teams` `["finance"]` and `localRoles` `["author"]`; bob's arrays are `[]`; tenant B sees none

#### Scenario: Disable and enable
- **WHEN** bob (with a live session) is patched to `disabled` twice, carol patches herself to `disabled`, `{ "state": "deleted" }` is sent, bob's session calls `GET /api/v1/users`, bob is patched to `active`, bob's same session calls `GET /api/v1/users` again, and the service account's id is patched through `/users`
- **THEN** the answers are 200 with the item, `state: "disabled"` (x2), 422 `OPERATION_REFUSED` with `details.reason` `self_disable` (carol stays `active`), 400, 401 `UNAUTHENTICATED`, 200 with the item, `state: "active"`, 200 (session works again), 404; the chain holds one `identity.user_state_changed` per real change (two) with target `{ kind: "user", id: <bob> }`, actor `{ kind: "user", id: <carol> }` and payloads `{ from: "active", to: "disabled", kind: "human" }` then `{ from: "disabled", to: "active", kind: "human" }`

### Requirement: Service accounts are created, listed, disabled and given roles
`POST /api/v1/service-accounts` SHALL create a service account owned by an active human (default: the caller) and append `identity.service_account_created`; `GET` SHALL list them and `PATCH /api/v1/service-accounts/{userId}` SHALL enable or disable one and answer 200 with the account item (as for users); the `roles` routes SHALL list (whatever the account's state), grant and revoke their direct roles through `grantRole` and `revokeRole`, and answer 404 for the id of a human on all three.

#### Scenario: Create, list, owner, state
- **WHEN** carol posts `{ "displayName": "Nightly bot" }` with `Idempotency-Key` `k1` twice, then with `ownerUserId` bob, a service account's id, an unknown id, `displayName` `""`, lists `GET /api/v1/service-accounts`, and patches the first account to `disabled`
- **THEN** the first is 201 `{ userId, kind: "service", ownerUserId: <carol>, displayName: "Nightly bot", email: null, state: "active", roles: [], teams: [], localRoles: [] }` and the repeat the same body with header `idempotent-replayed: true` (one account, one `identity.service_account_created` event, target the account, payload `{ ownerUserId: <carol>, displayName: "Nightly bot" }`); the others 201 with owner bob, 422 `OPERATION_REFUSED` `owner_invalid` (x2), 400; the list holds the 2 service accounts only; the patch is 200 `disabled`

#### Scenario: Roles of a service account
- **WHEN** carol sends `PUT /api/v1/service-accounts/<svc>/roles/author` twice, `GET .../roles`, `PUT .../roles/ghost`, `PUT .../roles/Bad`, `PUT`, `GET` and `DELETE` of `.../roles/author` for human bob's id, patches the service account to `disabled`, repeats `GET .../roles`, patches it back to `active`, and sends `DELETE .../roles/author` twice
- **THEN** the answers are 200 `{ roleId: "author", result: "granted" }`, 200 `result: "exists"`, 200 `items` `[{ roleId: "author" }]`, 404 `NOT_FOUND`, 400, 404 (x3), 200 `disabled`, 200 `items` `[{ roleId: "author" }]`, 200 `active`, 204, 404; the chain holds one `identity.role_granted` and one `identity.role_revoked`

#### Scenario: No elevation
- **WHEN** a caller who holds only `author` (policy `PERMIT_ALL`) sends `PUT .../roles/tenant_admin` and `PUT .../roles/author` for the service account
- **THEN** the first is 403 `ELEVATION_REFUSED` and stores nothing, the second 200 `granted`; one `identity.role_granted` (`author`) is in the chain

### Requirement: Roles and teams are listed and teams managed
`GET /api/v1/roles` and `GET /api/v1/teams` SHALL page the tenant's ids, `POST /api/v1/teams` SHALL create a team and `DELETE /api/v1/teams/{teamId}` SHALL delete an unused one, through the functions of `add-roles-and-memberships`.

#### Scenario: Create, list, delete, refuse
- **WHEN** carol posts `finance` with key `k1`, `finance` with key `k2`, `Finance`, and `ops` with key `k3` twice; lists teams as A and as B; maps a group to `finance`; deletes `finance`; deletes the unused `ops`; deletes `ops` again
- **THEN** the posts answer 201 `{ teamId: "finance" }`, 409 `ALREADY_EXISTS`, 400, 201, and a replayed 201; A lists `[{ teamId: "finance" }]` and B `[]`; the delete of the mapped team is 409 `IN_USE` and of `ops` 204, then 404; the chain holds `identity.team_created` for `finance` and for `ops` once each and one `identity.team_deleted`

### Requirement: Group mappings are set, replaced, listed and removed
`PUT /api/v1/idp-group-map` SHALL map a group of an issuer routed to the tenant to one role or one team, `GET` SHALL page the mappings and `DELETE` with `issuer` and `group` SHALL remove one, through `setGroupMapping` and `removeGroupMapping`.

#### Scenario: Set, replace, list, remove
- **WHEN** the issuer `https://idp.example/realms/ursitoare` is routed to tenant A, and carol puts group `ursitoare-authors` with `roleId` `author`, then `teamId` `finance`, lists, deletes it by `?issuer=<urlencoded>&group=ursitoare-authors` twice, and B lists
- **THEN** the puts answer 200 `{ issuer, group: "ursitoare-authors", roleId: "author", teamId: null, reviewedBy: <carol> }` then the same with `roleId: null`, `teamId: "finance"`; the list holds that one mapping; the deletes are 204 then 404; B's list is `{ items: [], next_cursor: null }`

#### Scenario: Refusals
- **WHEN** carol puts a mapping with both `roleId` and `teamId`, neither, `roleId` `ghost`, issuer `https://other.example`, a 256-character group, and a caller who holds only `author` (policy `PERMIT_ALL`) maps to `tenant_admin`
- **THEN** the answers are 400, 400, 404 `NOT_FOUND`, 422 `UNKNOWN_ISSUER`, 400, 403 `ELEVATION_REFUSED`, and no mapping was stored by them

### Requirement: IdP links are listed and added
`GET /api/v1/users/{userId}/idp-links` SHALL page a human's links, with `linkedAt` as UTC time with six fraction digits, and `POST` SHALL link one more `(issuer, subject)` of an issuer routed to the tenant, appending `identity.idp_linked`.

#### Scenario: List and add
- **WHEN** ann signed in once (issuer `https://idp.example/realms/ursitoare`, subject `sub-ann`, clock `2026-10-25T09:00:00Z`) and carol lists her links, posts `{ issuer, subject: "sub-ann-2" }` with `Idempotency-Key` `k1` twice, and lists again
- **THEN** the first list is `[{ issuer, subject: "sub-ann", linkedAt: "2026-10-25T09:00:00.000000Z" }]`, the post 201 with that shape for `sub-ann-2` and the repeat the same with `idempotent-replayed: true`, the last list holds both in order, and one `identity.idp_linked` event has target `{ kind: "user", id: <ann> }` and payload `{ issuer, subject: "sub-ann-2" }`

#### Scenario: Refusals
- **WHEN** carol posts `sub-ann` again (new key), bob's own pair for ann, an issuer with no `tenant_idp` row, a subject `" x"`, any pair for the service account and for an unknown id, and lists the service account's links
- **THEN** the answers are 409 `ALREADY_EXISTS` (x2), 422 `UNKNOWN_ISSUER`, 400, 422 `OPERATION_REFUSED` `wrong_kind`, 404, 404, and nothing was linked

### Requirement: The review profile is switched, audited, with a solo warning
`PUT /api/v1/tenant/review-profile` under `manage_tenant` SHALL set the tenant's profile to `solo` or `team`, append `identity.review_profile_changed` only on a change, and return `warning` when the resulting profile is `solo` and two or more active humans exist.

#### Scenario: Switch and warning
- **WHEN** tenant A (`solo`) holds active humans ann, bob and carol, and carol puts `team`, `solo` twice, then ann and bob are disabled and she puts `solo`
- **THEN** the answers are 200 `{ tenantId: "tenant_a", reviewProfile: "team", previous: "solo", changed: true, humanMembers: 3, warning: null }`; `solo` with `previous: "team"`, `changed: true` and `warning` `{ code: "SOLO_TENANT_HAS_MANY_HUMANS", message: "This solo tenant has 3 active human members; each may review their own flows.", humanMembers: 3 }`; the same with `previous: "solo"`, `changed: false`; and, with `humanMembers: 1`, `previous: "solo"`, `changed: false`, `warning: null`; the chain holds `identity.review_profile_changed` twice (payloads `{ from: "solo", to: "team", humanMembers: 3 }`, `{ from: "team", to: "solo", humanMembers: 3 }`), the owner reads `solo` for A and B

#### Scenario: Refusals
- **WHEN** carol puts `{ "reviewProfile": "duo" }`, `{}` and `{ "reviewProfile": "team", "x": 1 }`
- **THEN** each answer is 400 `VALIDATION_FAILED`, profile unchanged

### Requirement: A refused change is audited
Each admin answer 403 `ELEVATION_REFUSED` or 422 `OPERATION_REFUSED` SHALL be followed by an `identity.change_refused` event of the caller, appended after the rollback in its own transaction; a failed append SHALL change neither the answer nor what is stored.

#### Scenario: Each refusal leaves one event
- **WHEN** alice (only `author`, `PERMIT_ALL`) maps a group of the routed issuer to `tenant_admin` and puts that role on a service account; carol patches herself to `disabled`, posts a service account owned by a service account, links an IdP identity to a service account; carol sends a bad body, deletes an unknown team and posts one team twice (no key)
- **THEN** the first five answers are 403 `ELEVATION_REFUSED` (x2), 422 `OPERATION_REFUSED` (x3); the chain holds five `identity.change_refused` events, payload `code` `RBAC_ELEVATION` (x2), `ADMIN_SELF_DISABLE`, `IDENTITY_OWNER_INVALID`, `ADMIN_WRONG_KIND`, each with actor `{ kind: "user", id: <caller> }`, target `{ kind: "action", id: "manage_users_roles" }` and `payload.route` the route pattern (`/api/v1/users/:userId` for self-disable); the 400, 404, 409 add none

#### Scenario: A failing audit changes nothing
- **WHEN** the first scenario's elevation request is repeated with a pool whose client rejects statements that mention `audit_`
- **THEN** the answer is the same 403 `ELEVATION_REFUSED`, no role is stored, and the log has a warning `AUDIT_FAILED`

### Requirement: Lists page with the cursor contract
`pageRows` SHALL cut a whole list into `{ items, next_cursor }` ordered by key under cursors bound to tenant and scope, every admin list SHALL accept `limit` and `cursor`, and a list needing a cursor with no engine key SHALL answer 503 `ENGINE_KEY_REQUIRED`.

#### Scenario: pageRows
- **WHEN** `pageRows(["b", "d", "a", "c", "e"], { limit: 2, cursor: null }, binding, (r) => [r])` runs with a key from `deriveCursorKey({ reveal: () => "k".repeat(64) })`, tenant `tenant_a`, scope `teams`, then with each `next_cursor`, with no rows, with a cursor made for `tenant_b` and one made for scope `roles`
- **THEN** the pages hold `a, b`, `c, d`, `e` with `next_cursor` set, set, `null`; the empty list gives `{ items: [], next_cursor: null }`; the last two throw `ApiError` 400 `CURSOR_INVALID`

#### Scenario: Without an engine key
- **WHEN** `pageRows` has `key: null` and gets 2 rows with limit 5, the same with a cursor, and 3 rows with limit 2
- **THEN** the first gives both rows and `next_cursor: null`; the second and the third throw `ApiError` 503 `ENGINE_KEY_REQUIRED`

#### Scenario: Through the server
- **WHEN** tenant A has teams `a1` to `a5` and humans ann and bob, and carol walks `GET /api/v1/teams?limit=2`, edits a cursor, sends the cursor of `GET /api/v1/roles?limit=1` to `/teams`; and a server with `engineKey: null` answers `GET /api/v1/teams?limit=50`, `?limit=2`, `?cursor=x` and `GET /api/v1/users?limit=1`
- **THEN** the walk gives 2, 2, 1 teams once each; the edited and foreign cursors are 400 `CURSOR_INVALID`; the keyless server answers 200, then 503 `ENGINE_KEY_REQUIRED` three times

### Requirement: The engine serves the admin routes and documents them
`main` SHALL register the admin routes after `registerMeRoute`, and `docs/api/openapi.json` SHALL list them.

#### Scenario: The real engine
- **WHEN** `main` runs (port 0, no database) with `inspectServers`, and `docs/api/openapi.json` is read after an `assert.ok` that it exists
- **THEN** the public server defines the 19 routes with their actions, `unregisteredRouteErrors` of all defined routes is `[]`, the document holds every one of the 19 paths and equals `servedOpenApiText()`
