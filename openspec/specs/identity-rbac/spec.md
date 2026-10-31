# identity-rbac Specification

## Purpose
Roles, teams, IdP group mappings and memberships inside one tenant: IdP groups decide, through a reviewed mapping, who holds which role or team, and the principal carries that into policy checks.

## Requirements

### Requirement: Every tenant has the four default roles
The database SHALL give every tenant, when it is inserted, the roles `tenant_admin`, `author`, `approver` and `auditor` in `ursitoare.role`, and `ursitoare.seed_default_roles(tenant_id)` SHALL give an existing tenant the same roles (the migration calls it for every existing tenant).

#### Scenario: Created with the tenant
- **WHEN** after `seedTwoTenants(db)` the owner inserts tenant `tenant_c`, and `SELECT role_id FROM ursitoare.role` is read for each tenant inside `withTenantTx(db.ownerPool, ...)`
- **THEN** each of `tenant_a`, `tenant_b`, `tenant_c` has exactly `approver`, `auditor`, `author`, `tenant_admin`, and `[...DEFAULT_ROLES].sort()` equals that list

#### Scenario: Idempotent, setting restored
- **WHEN** `to_regprocedure('ursitoare.seed_default_roles(text)')` is not null, the owner deletes the 4 roles of `tenant_a`, then in one owner transaction with `app.tenant_id` set to `keep` runs `SELECT ursitoare.seed_default_roles('tenant_a')` twice and inserts tenant `tenant_d`
- **THEN** `tenant_a` has 4 roles again, `tenant_d` has 4, and `current_setting('app.tenant_id', true)` is `keep` after each statement

### Requirement: The rbac tables are tenant-leading and narrowly granted
Migration `0170_rbac.sql` SHALL create `role`, `team`, `idp_group_map` and `membership` with `tenant_id` leading every key, tenant-scoped foreign keys, forced row-level security and the grants of design.md § Data model.

#### Scenario: Objects, catalog, privileges, checks
- **WHEN** `to_regclass` of the four tables and ledger row `version = 170`, `name = 'rbac'` are asserted, `checkTenancyCatalog(db.ownerPool)` runs, and as the app role in `tenant_a` `INSERT INTO ursitoare.role`, `DELETE FROM ursitoare.role`, `UPDATE ursitoare.team SET team_id = 'x'`, an insert into `ursitoare.membership` for `tenant_b` and `SELECT role_id FROM ursitoare.role` run; then the owner inserts a `membership` row with both `role_id` and `team_id`, and a `local` row for a team
- **THEN** the tables exist, the ledger matches, the violations are `[]`, the first four statements fail with SQLSTATE `42501`, the select returns only `tenant_a`'s 4 roles, and the last two inserts fail with SQLSTATE `23514`

### Requirement: Roles are listed and teams are managed inside one tenant
`listRoles` and `listTeams` SHALL return the ids of the tenant, sorted; `createTeam` and `deleteTeam` SHALL change only the transaction's tenant, append an audit event, and refuse bad input, a duplicate, a team in use and a foreign transaction with an `RbacError` code.

#### Scenario: Create, list, delete
- **WHEN** `createTeam(tx, a, { teamId: "finance" }, { kind: "operator", name: "e2e" })` runs in `tenant_a`, then `listTeams` in `tenant_a` and in `tenant_b`, `listRoles` in `tenant_a`, and `deleteTeam(tx, a, "finance", actor)`
- **THEN** the results are `{ teamId: "finance" }`, `["finance"]`, `[]`, `["approver", "auditor", "author", "tenant_admin"]` and `undefined`; `tenant_a` holds `identity.team_created` (target `{ kind: "team", id: "finance" }`, actor `{ kind: "system", id: "operator:e2e" }`) then `identity.team_deleted`

#### Scenario: Refusals
- **WHEN** `createTeam` gets `teamId` `Finance`, `1x`, `""`, `fin ance`, 65 characters and the number `5`, then `finance` twice; `deleteTeam` gets `missing`; `createTeam(txOfB, a, ...)` runs; `deleteTeam` runs for a team that a mapping uses and for one that a membership uses
- **THEN** the codes are `RBAC_INVALID` (x6), `RBAC_EXISTS`, `RBAC_NOT_FOUND`, `RBAC_TENANT_MISMATCH`, `RBAC_IN_USE` (x2); nothing is written and the used teams remain

### Requirement: A group mapping links one IdP group to one role or team
`setGroupMapping` SHALL store, for an issuer routed to the tenant by `tenant_idp`, one mapping from a group to exactly one existing role or team, replacing an earlier one; `removeGroupMapping` SHALL delete it; both SHALL delete the `idp_claim` memberships of the target they stop mapping, and no user actor SHALL set or remove a mapping whose current or new target it may not grant (a role it holds or `tenant_admin`; a team needs `tenant_admin`).

#### Scenario: Map, replace, list
- **WHEN** an actor `{ kind: "user", userId: "u-admin", roles: ["tenant_admin"] }` maps `ursitoare-authors` of `https://idp.example/realms/ursitoare` to `roleId: "author"`, repeats the same call, then maps it to `teamId: "finance"`, and `listGroupMappings` runs in `tenant_a` and `tenant_b`
- **THEN** the first result is `{ issuer, group: "ursitoare-authors", roleId: "author", teamId: null, reviewedBy: "u-admin" }`; the repeat appends no event; the replacement lists one row with `teamId: "finance"`, `roleId: null`; `tenant_b` lists `[]`; two `identity.group_mapped` events hold payloads `{ issuer, group, roleId: "author", teamId: null, revoked: 0 }` and `{ issuer, group, roleId: null, teamId: "finance", revoked: 0 }`

#### Scenario: Refusals and no elevation
- **WHEN** a mapping (for a group not yet mapped) is set with both `roleId` and `teamId`, with neither, with group `""`, 256 characters, or `a\nb`, with role `ghost`, with team `ghost`, with issuer `https://other.example` (no `tenant_idp` row), by `{ kind: "user", userId: "u-author", roles: ["author"] }` to `tenant_admin`, and then by that actor to `author`, by an operator to `tenant_admin`
- **THEN** the codes are `RBAC_INVALID` (x5), `RBAC_NOT_FOUND` (x2), `RBAC_UNKNOWN_ISSUER`, `RBAC_ELEVATION`; the last two calls succeed

#### Scenario: No demoting of the admin mapping
- **WHEN** `ursitoare-admins` maps to `tenant_admin` team `finance` exists and `u-admin` holds that `idp_claim` membership; `{ kind: "user", userId: "u-author", roles: ["author"] }` replaces the mapping with `roleId: "author"`, removes it, and maps `team-finance` to team `finance`
- **THEN** all three reject with `RBAC_ELEVATION`; the mapping still has `roleId: "tenant_admin"`, `u-admin` keeps the membership, and no event is appended

#### Scenario: Removing revokes what the mapping granted
- **WHEN** `ursitoare-authors` and `ursitoare-writers` both map to `author`, the owner gives user `u1` an `idp_claim` membership of `author` from that issuer and `u2` a `local` one, then `removeGroupMapping` runs for `ursitoare-authors`, again, and for `nope`
- **THEN** the results are `true`, `false`, `false`; `u1` has no `author` membership and `u2` still has its one; one `identity.group_unmapped` event holds payload `{ issuer, group: "ursitoare-authors", revoked: 1 }`

### Requirement: Token groups become memberships at sign-in
`syncMemberships` SHALL make a user's `idp_claim` memberships for an issuer equal to the targets of the token's mapped groups, appending one event only on a change; `groupsFromIdToken` SHALL read the `groups` claim of an ID token that `verifyIdToken` accepted; the callback of add-oidc-login SHALL call both in the transaction that creates the session.

#### Scenario: The claim
- **WHEN** `groupsFromIdToken` gets a token whose payload `groups` is `["ursitoare-authors", "team-finance", "ursitoare-authors", 5, "", " x", "a\nb"]`; one without `groups`; one with `groups` the string `ursitoare-admins`; `a.b`; `nope`; one with 1200 distinct groups
- **THEN** the results are `["ursitoare-authors", "team-finance"]`, `[]`, `[]`, `[]`, `[]` and the first 1000

#### Scenario: Add, keep, replace, remove
- **WHEN** `ursitoare-authors` maps to `author`, `team-finance` to team `finance`, `ursitoare-approvers` to `approver`; user `u1` is synced with `["ursitoare-authors", "team-finance", "other"]`, again with a later clock, with `["ursitoare-approvers"]`, and with `[]`
- **THEN** the results are `{ added: ["role:author", "team:finance"], removed: [] }`, `{ added: [], removed: [] }` (`synced_at` moves to the later clock), `{ added: ["role:approver"], removed: ["role:author", "team:finance"] }` and `{ added: [], removed: ["role:approver"] }`; `loadMemberships` matches each time; `tenant_a` holds 3 `identity.memberships_synced` events (target `{ kind: "user", id: <u1> }`, actor `{ kind: "system", id: "oidc" }`, payload `{ added, removed }`)

#### Scenario: Other sources are untouched
- **WHEN** `u1` holds an `idp_claim` membership from `https://idp2.example` and a `local` grant of `auditor`, and `syncMemberships` runs for `https://idp.example/realms/ursitoare` with `[]`
- **THEN** both rows remain (2 rows) and no `identity.memberships_synced` event is appended

#### Scenario: Bad input and tenants
- **WHEN** `syncMemberships` gets user `ghost`, issuer `""`, `groups` that is a string, and a `tenant_b` transaction with the context of `tenant_a`; and `tenant_b` syncs the same group names
- **THEN** the codes are `RBAC_NOT_FOUND`, `RBAC_INVALID`, `RBAC_INVALID`, `RBAC_TENANT_MISMATCH`; the `tenant_b` user gets only `tenant_b` mappings and no team `finance`

#### Scenario: Sign-in applies the mappings
- **WHEN** both tenants map `ursitoare-authors` to `author`, `tenant_a` also maps `team-finance` to team `finance`, and alice (org-a) signs in twice and mallory (org-b) once through `GET /auth/oidc/login`, `completeFakeLogin` and `GET /auth/oidc/callback`
- **THEN** each callback answers 302 with an `ursitoare_session` cookie; `loadMemberships` gives alice `{ roles: ["author"], teams: ["finance"] }` and mallory `{ roles: ["author"], teams: [] }`; alice has 2 membership rows and one `identity.memberships_synced` event

#### Scenario: A failing sync refuses the sign-in
- **WHEN** a pool wrapper rejects every statement that mentions `ursitoare.membership` and alice signs in
- **THEN** the callback answers 302 to `/sign-in?error=OIDC_INTERNAL`, no session row and no membership row exists, and `tenant_a` holds an `auth.login_refused` event with payload `{ code: "OIDC_INTERNAL" }`

### Requirement: A role is granted directly only to a service account, or by an operator
`grantRole` and `revokeRole` SHALL change `local` role memberships only for a service account when an admin acts, or for any user when an operator acts, and an admin SHALL NOT grant a role it neither holds nor outranks as `tenant_admin`, nor change its own.

#### Scenario: Grant and revoke on a service account
- **WHEN** human `u-owner` owns service account `svc` (from `createServiceAccount`), and `{ kind: "user", userId: "u-admin", roles: ["tenant_admin"] }` runs `grantRole` of `author` twice, `loadMemberships(svc)`, then `revokeRole` twice
- **THEN** the results are `"granted"`, `"exists"`, `{ roles: ["author"], teams: [] }`, `true`, `false`; one `identity.role_granted` (target `{ kind: "user", id: <svc> }`, actor `{ kind: "user", id: "u-admin" }`, payload `{ roleId: "author", via: "admin" }`) and one `identity.role_revoked`

#### Scenario: Humans and elevation
- **WHEN** `{ kind: "user", userId: "u-admin", roles: ["tenant_admin"] }` grants `author` to human alice; `{ kind: "operator", name: "cli" }` does; `{ kind: "user", userId: "u-author", roles: ["author"] }` grants `approver` to `svc`, then `author`; `svc` acting as `{ kind: "service", userId: <svc>, roles: ["tenant_admin"] }` grants `author` to itself
- **THEN** the results are `RBAC_DIRECT_GRANT_REFUSED`, `"granted"` (event actor `{ kind: "system", id: "operator:cli" }`, payload `{ roleId: "author", via: "operator" }`), `RBAC_ELEVATION`, `"granted"`, `RBAC_ELEVATION`

#### Scenario: Missing, invalid, concurrent, disabled
- **WHEN** `grantRole` gets user `ghost`, role `ghost`, role `Bad Role`; `revokeRole` (operator `cli`) gets the same three; two `grantRole` calls for the same pair run in parallel transactions; the owner disables `svc`, then enables it; and `revokeRole` is called for an `idp_claim`-only role
- **THEN** the codes are `RBAC_NOT_FOUND` (x2), `RBAC_INVALID` for each function; the parallel results sorted are `["exists", "granted"]` with one row and one event; `loadMemberships(svc).roles` is `[]` while disabled and `["author"]` after; the revoke gives `false`

### Requirement: The bootstrap admin group is mapped once and audited
`mapBootstrapAdminGroup` SHALL, for a tenant that has no group mapped to `tenant_admin`, map the given group to `tenant_admin` and append `identity.bootstrap_admin_mapped`, and otherwise change nothing; `bootstrapAdminGroup` SHALL give the configured group name, default `ursitoare-admins`.

#### Scenario: Once, also under concurrency
- **WHEN** `mapBootstrapAdminGroup(tx, a, { issuer, group: "ursitoare-admins", operator: "cli" })` runs, then again with group `other-admins`; and in a fresh tenant two calls run in parallel transactions
- **THEN** the results are `"mapped"`, `"already_mapped"` (only `ursitoare-admins` → `tenant_admin` is listed), and sorted `["already_mapped", "mapped"]`; each tenant holds exactly one `identity.bootstrap_admin_mapped` event with actor `{ kind: "system", id: "operator:cli" }` and payload `{ issuer, group }`

#### Scenario: Refusals
- **WHEN** the issuer is `https://other.example`, the group `""`, the operator `bad name!`
- **THEN** the codes are `RBAC_UNKNOWN_ISSUER`, `RBAC_INVALID`, `RBAC_INVALID`, and nothing is mapped

#### Scenario: The configured name
- **WHEN** `bootstrapAdminGroup` gets `{}`, `{ URSITOARE_BOOTSTRAP_ADMIN_GROUP: "corp-admins" }`, `{ URSITOARE_BOOTSTRAP_ADMIN_GROUP: "" }`, a value of 256 characters and `" x"`
- **THEN** the results are `"ursitoare-admins"` (equal to `DEFAULT_BOOTSTRAP_ADMIN_GROUP`), `"corp-admins"`, `"ursitoare-admins"`, then `RBAC_INVALID` twice

### Requirement: The principal carries the roles and teams of its memberships
`loadMemberships` SHALL return all distinct sorted roles and teams of an active user, and `resolvePrincipal` SHALL return the session's principal with them, or reject (`RBAC_TOO_MANY_MEMBERSHIPS` above 64 roles or 64 teams, never truncating), so that every request principal holds them and a failed read fails the request.

#### Scenario: Load
- **WHEN** `u1` holds `author` (IdP and `local`), `local` `tenant_admin`, teams `finance` and `ops`, `u2` nothing, `u3` is disabled with `author`, `u4` holds 70 teams `t00` to `t69`, and `loadMemberships(txOfB, b, "u1")` runs
- **THEN** the results are `{ roles: ["author", "tenant_admin"], teams: ["finance", "ops"] }`, `{ roles: [], teams: [] }`, `{ roles: [], teams: [] }`, all 70 teams `t00` to `t69`, and `{ roles: [], teams: [] }` for the foreign tenant

#### Scenario: Resolve
- **WHEN** `resolvePrincipal(db.appPool, session)` runs for alice (a `createSession` session, with `author` and team `finance`) and for bob (no memberships), and then the pool's `connect` rejects `Error("down")`
- **THEN** the results are `{ tenantId: "tenant_a", userId: <alice>, kind: "human", sessionId: <session.sessionRef>, roles: ["author"], teams: ["finance"], actorChain: [] }`, the same with empty `roles` and `teams`, and a rejection `down`

#### Scenario: More than 64 is refused
- **WHEN** user `u5` holds 64 teams `t00` to `t63`, `u6` holds 65 teams `t00` to `t64`, `u7` holds 65 roles (the four defaults and owner-added `r00` to `r60`), and `resolvePrincipal` runs for each
- **THEN** `u5` resolves with its 64 teams; `u6` and `u7` reject with an `RbacError` whose `code` is `RBAC_TOO_MANY_MEMBERSHIPS`

#### Scenario: Requests carry the memberships
- **WHEN** a PEP server (`installPep`, `registerMeRoute`, a `GET /api/v1/test/principal` route on `read_self` returning `request.principal`) runs on an engine from `roles.cedar`; carol holds an operator-granted `tenant_admin`, alice `author` and team `finance`, bob nothing, dave 65 teams; carol's grant is revoked between her two requests
- **THEN** the route returns carol's `roles` `["tenant_admin"]` then `[]`, and alice's `roles: ["author"]`, `teams: ["finance"]`; `/api/v1/me` gives carol (before the revoke) `capabilities` `["manage_tenant", "manage_users_roles", "read_audit", "read_self"]` and alice and bob `["read_self"]`; dave's request to the test route answers 503 `AUTHZ_UNAVAILABLE`

### Requirement: Roles are Cedar parents and the admin permits are fixed
The file `src/identity/policy/roles.cedar` SHALL hold exactly four platform-layer permits: `tenant_admin` for `manage_users_roles`, `manage_tenant` and `read_audit`, and `auditor` for `read_audit`, each stated as `principal in Role::"<name>"`.

#### Scenario: Who may do what
- **WHEN** an engine from `createPolicyEngine` over a temporary `srcDir` holding a copy of `roles.cedar` checks, for principals of `tenant_a` with roles `tenant_admin`, `auditor`, `author`, `approver` and none, the actions `manage_users_roles`, `manage_tenant`, `read_audit` and `read_self` on `Tenant::"tenant_a"`, and `tenant_admin` of `tenant_a` on `Tenant::"tenant_b"`
- **THEN** `tenant_admin` is allowed all four; `auditor` is allowed `read_audit` and `read_self` only; every other principal is allowed `read_self` only; the cross-tenant request is denied (`read_self` and the cross-tenant forbid come from the platform layer that `createPolicyEngine` always adds)

#### Scenario: Loaded with every module's fragments
- **WHEN** `createPolicyEngine({ srcDir: defaultSrcDir(), ... })` is built and checks `tenant_admin` for `manage_users_roles`
- **THEN** it resolves, the decision is `allow`, and `engine.policies.map((p) => p.id)` (the `@id`s) includes `identity-rbac-tenant-admin-manage-users-roles`, `identity-rbac-tenant-admin-manage-tenant`, `identity-rbac-tenant-admin-read-audit` and `identity-rbac-auditor-read-audit`

### Requirement: The e2e stack seeds the group mappings of every tenant
`rbacPart` SHALL, in `seed`, give every tenant routed to the fake provider's issuer the team `finance`, the mappings `ursitoare-authors` → `author`, `ursitoare-approvers` → `approver`, `team-finance` → team `finance` and `ursitoare-admins` → `tenant_admin`, and SHALL change nothing when seeded again.

#### Scenario: Seed, re-seed, skip
- **WHEN** the shipped `database` and `oidc` parts start and seed, the test inserts `tenant_b` (provisioned for `org-b` at the fake's issuer) and `tenant_c` (no `tenant_idp` row), `rbacPart.start` and `rbacPart.seed` run twice, and a third `rbacPart.seed` gets a new handles map holding only the `database` handle
- **THEN** the default tenant and `tenant_b` each hold team `finance` and 4 mappings (`RBAC_SEED_MAPPINGS` plus `ursitoare-admins`), `tenant_c` holds none, the second seed appends no event, the handle's `env` is `{}`, and the third call rejects with `STACK_PART_MISSING`

#### Scenario: Discovered in order
- **WHEN** `discoverParts()` runs and `parts/30-rbac.ts` is read
- **THEN** the names include `database` and `oidc` before `rbac`, and the file is `export { rbacPart as part } from "../rbac-part.ts";`

### Requirement: Every tenant has the four default roles — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Schema test does not check the exported DEFAULT_ROLES
- **WHEN** after seedTwoTenants(db) the owner inserts tenant_c and DEFAULT_ROLES is imported from src/identity/index.ts
- **THEN** a

#### Scenario: Schema test does not check the exported DEFAULT_ROLES (2)
- **WHEN** after seedTwoTenants(db) the owner inserts tenant_c and DEFAULT_ROLES is imported from src/identity/index.ts
- **THEN** a test asserts that [...DEFAULT_ROLES].sort() deep-equals [
