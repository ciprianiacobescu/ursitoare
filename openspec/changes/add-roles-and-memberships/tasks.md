## 1. The schema

- [ ] 1.1 Write `src/identity/rbac/schema.test.ts` first (`withTestDatabase()`, `seedTwoTenants(db)`; each test begins with `assert.ok` on `to_regclass` of the four tables and the ledger row `version = 170`, `name = 'rbac'`; owner fixtures through `withTenantTx(db.ownerPool, ...)`; each forbidden app statement is its own `withTenantTx(db.appPool, a, ...)` with `await assert.rejects(p, { code: "42501" })`; scenarios "Created with the tenant" (it compares with `[...DEFAULT_ROLES].sort()`), "Idempotent, and the tenant setting is restored" and "Objects, catalog, privileges and checks"), then create `src/db/migrations/0170_rbac.sql` exactly as in design.md § Data model and implement `DEFAULT_ROLES` (`["tenant_admin", "author", "approver", "auditor"]`), `DEFAULT_BOOTSTRAP_ADMIN_GROUP` (`"ursitoare-admins"`) and `BOOTSTRAP_ADMIN_GROUP_ENV` (`"URSITOARE_BOOTSTRAP_ADMIN_GROUP"`) in `src/identity/rbac/names.ts`, implementing requirements "Every tenant has the four default roles" and "The rbac tables are tenant-leading and narrowly granted"

## 2. Roles and teams

- [ ] 2.1 Write `src/identity/rbac/teams.test.ts` first (users and events as in design.md § Test plan; scenarios "Create, list, delete" and "Refusals"; the used teams are made with owner SQL inserts into `ursitoare.idp_group_map` and `ursitoare.membership`), then implement `RbacError` (one fixed message per code, no input echoed) in `src/identity/rbac/errors.ts`, the module-internal validators of design.md decision 11 and the tenant check (`current_setting('app.tenant_id', true)` against `ctx.tenantId`, else `RBAC_TENANT_MISMATCH`) in `src/identity/rbac/names.ts`, and `listRoles`, `listTeams`, `createTeam`, `deleteTeam` in `src/identity/rbac/teams.ts` (audit events of decision 10; `deleteTeam` pre-checks mappings and memberships, and maps the foreign-key error `23503` to `RBAC_IN_USE`), exporting every new public symbol of these files from `src/identity/index.ts`, implementing requirement "Roles are listed and teams are managed inside one tenant"

## 3. Group mappings

- [ ] 3.1 Write `src/identity/rbac/group-map.test.ts` first (`provisionTenantIdp(db.ownerPool, ...)` for `tenant_a` and `tenant_b`; memberships of the removal scenario inserted by owner SQL; scenarios "Map, replace, list", "Refusals and no elevation" and "Removing revokes what the mapping granted"), then implement `listGroupMappings`, `setGroupMapping` and `removeGroupMapping` in `src/identity/rbac/group-map.ts` (decisions 3 and 5; the issuer must be in `ursitoare.tenant_idp`; an identical mapping is a no-op; a replaced or removed target loses its `idp_claim` memberships of that issuer; events `identity.group_mapped` and `identity.group_unmapped`), exporting them from `src/identity/index.ts`, implementing requirement "A group mapping links one IdP group to one role or team"

## 4. Memberships from token groups

- [ ] 4.1 Write `src/identity/rbac/sync.test.ts` and `src/identity/rbac/memberships.test.ts` first (a helper builds `header.payload.signature` strings with base64url JSON for `groupsFromIdToken`; users from `upsertUserFromClaims`; mappings from `setGroupMapping` with an operator actor; a mutable clock; scenarios "The claim", "Add, keep, replace, remove", "Other sources are untouched", "Bad input and tenants" and "Load"), then implement `groupsFromIdToken` and `syncMemberships` in `src/identity/rbac/sync.ts` (decisions 4 and 9) and `loadMemberships` in `src/identity/rbac/memberships.ts` (decision 8; membership ids from `opts.ids.next("mem")`), exporting them from `src/identity/index.ts`, implementing requirements "Token groups become memberships at sign-in" and "The principal carries the roles and teams of its memberships"

## 5. Direct grants

- [ ] 5.1 Write `src/identity/rbac/grants.test.ts` first (a human owner and a service account from `createServiceAccount`; two parallel transactions on separate connections of `db.appPool` for the concurrent grant; scenarios "Grant and revoke on a service account", "Humans and elevation" and "Missing, invalid, concurrent, disabled"), then implement `grantRole` and `revokeRole` in `src/identity/rbac/grants.ts` (decision 5 and its check order; `INSERT ... ON CONFLICT DO NOTHING` decides `granted` or `exists`; events `identity.role_granted` and `identity.role_revoked` only when a row changed; `revokeRole` deletes `local` rows only), exporting them from `src/identity/index.ts`, implementing requirement "A role is granted directly only to a service account, or by an operator"

## 6. The bootstrap admin group

- [ ] 6.1 Write `src/identity/rbac/bootstrap.test.ts` first (a fresh tenant for the parallel calls; scenarios "Once, also under concurrency", "Refusals" and "The configured name"), then implement `mapBootstrapAdminGroup` and `bootstrapAdminGroup` in `src/identity/rbac/bootstrap.ts` (decision 7; the env record is a parameter, never `process.env`), exporting them and the three constants of task 1.1 from `src/identity/index.ts`, implementing requirement "The bootstrap admin group is mapped once and audited"

## 7. The permits

- [ ] 7.1 Write `src/identity/roles-policy.test.ts` first (scenarios "Who may do what" and "Loaded with every module's fragments"; the test reads `roles.cedar` with `readFile(...).catch(() => "")` and writes the copy into the temporary `srcDir` only when it is not empty, so that at red the engine has no permit and the first `allow` assertion fails; principals through `userEntity`, resources through `tenantEntity`, requests `{ principal: uid, action, resource: uid, context: {}, entities }`), then create `src/identity/policy/roles.cedar` with exactly these four policies, implementing requirement "Roles are Cedar parents and the admin permits are fixed":

  ```
  @id("identity-rbac-tenant-admin-manage-users-roles")
  permit (principal in Role::"tenant_admin", action == Action::"manage_users_roles", resource);

  @id("identity-rbac-tenant-admin-manage-tenant")
  permit (principal in Role::"tenant_admin", action == Action::"manage_tenant", resource);

  @id("identity-rbac-tenant-admin-read-audit")
  permit (principal in Role::"tenant_admin", action == Action::"read_audit", resource);

  @id("identity-rbac-auditor-read-audit")
  permit (principal in Role::"auditor", action == Action::"read_audit", resource);
  ```

## 8. The request principal

- [ ] 8.1 Write `src/identity/rbac/principal.test.ts` first (sessions from `createSession` in `withTenantTx(db.appPool, a, ...)`, memberships from `grantRole` and `syncMemberships`, a pool whose `connect` rejects; scenario "Resolve"), then implement `resolvePrincipal` in `src/identity/rbac/principal.ts` (decision 8) and export it from `src/identity/index.ts`, implementing requirement "The principal carries the roles and teams of its memberships"
- [ ] 8.2 Write `src/api/session-auth.rbac.test.ts` first (scenario "Requests carry the memberships": `buildServer`, `installPep` with an engine from a temporary `srcDir` holding a copy of `src/identity/policy/roles.cedar`, `registerMeRoute`, a `defineRoute` test route `GET /api/v1/test/principal` with action `read_self`, sessions from `createTestSession`), then change the session verifier in `src/api/session-auth.ts` so that it returns `{ principal: await resolvePrincipal(deps.pool, session), tenant: session.tenant, session }`, importing `resolvePrincipal` from `../identity/index.ts`, implementing requirement "The principal carries the roles and teams of its memberships"

## 9. Sign-in

- [ ] 9.1 Write `src/identity/oidc/memberships.test.ts` first (two tenants, a fake from `startFakeOidc({ now })`, `org-a` and `org-b` provisioned at `fake.issuer`, mappings from `setGroupMapping` with an operator actor, `fake.registerRedirect("http://127.0.0.1:8080/auth/oidc/callback")`, the login driven as in design.md § Test plan; the failing sync is a pool wrapper that rejects statements mentioning `ursitoare.membership`; scenarios "Sign-in applies the mappings" and "A failing sync refuses the sign-in"), then change the single transaction in `src/identity/oidc/callback.ts` so that it calls `syncMemberships(tx, tenant, user.userId, { issuer, groups: groupsFromIdToken(idToken) }, { clock })` right after `upsertUserFromClaims` and before `createSession` (`issuer` from the verified claims, `idToken` the string `verifyIdToken` accepted), implementing requirement "Token groups become memberships at sign-in"

## 10. The e2e part

- [ ] 10.1 Write `test/support/e2e-stack/rbac-part.test.ts` first (scenarios "Seed, re-seed, skip" and "Discovered in order": the shipped `databasePart` and `oidcPart` are started and seeded with `PartContext` values `{ name, dataDir: <mkdtemp>, engineOrigin: "http://127.0.0.1:39080", controlOrigin: "http://127.0.0.1:39081", env: {}, handles }` (`handles` fills as parts start), then the test inserts `tenant_b` and `tenant_c` as the owner and provisions `org-b` for `tenant_b`; `rbacPart.close` and the others close in `finally`), then implement `rbacPart`, `RBAC_SEED_TEAM` (`"finance"`) and `RBAC_SEED_MAPPINGS` in `test/support/e2e-stack/rbac-part.ts` (decision 12) and create `test/support/e2e-stack/parts/30-rbac.ts` as `export { rbacPart as part } from "../rbac-part.ts";`, implementing requirement "The e2e stack seeds the group mappings of every tenant"
