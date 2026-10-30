## Context

Adds roles, teams, IdP group mappings and memberships (ADR-12) to `src/identity`, with the permits and the e2e seed. Merged dependencies are in `delivered-shapes.md`; the others as their folders define them:

- `add-oidc-login`: the callback runs one `withTenantTx` with `upsertUserFromClaims`, the session-hint seal and `createSession` (its decision 6); a failure there is a 302 to `/sign-in?error=OIDC_INTERNAL`, audited as `auth.login_refused`; `principalOf(session)` returns empty `roles` and `teams`.
- `add-api-pep`: the `session` verifier in `src/api/session-auth.ts` returns `{ principal: principalOf(session), tenant: session.tenant, session }` using `PepDeps.pool`; a verifier that throws is 503 `AUTHZ_UNAVAILABLE`.
- `add-policy-catalogue`: `<srcDir>/<module>/policy/*.cedar` are platform-layer sources; `Role` ids are plain (`tenant_admin`), `Team` ids `<tenant>/<team>`; `userEntity(principal)` makes `roles` and `teams` the principal's Cedar parents.

## Decisions

1. **Files:** as in the tasks; `names.ts` also holds the internal validators and the tenant check. `test/arch/modules.ts` is unchanged (test files are exempt from the module graph rule).
2. **Membership:** one row per user, target (role or team) and source. `idp_claim` rows carry the issuer and come only from `syncMemberships`; `local` rows (roles only, `granted_by` set) only from `grantRole`. The effective set is the union.
3. **Mappings:** one target per `(issuer, group)` (architecture §6), the group compared as the IdP sends it; `reviewed_by` is the actor's `userId` or `operator:<name>`. The same target again is a no-op without an event.
4. **Sync** (under `pg_advisory_xact_lock` on tenant and user): read the targets of the mappings whose group is in the token, insert the missing `idp_claim` rows, delete the stale ones of that issuer, move `synced_at` of the kept ones. `added` and `removed` list `role:<id>` and `team:<id>`, sorted. A new mapping applies at the next sign-in; removing or replacing one deletes its `idp_claim` memberships at once.
5. **Elevation:** a user or service actor (its `roles` from the authenticated principal) may grant or revoke a role only with `tenant_admin` or that role, and never for itself (`grantRole` and `revokeRole` only; `RBAC_ELEVATION`). A mapping needs the same of its targets, before the no-op test: `setGroupMapping` checks the replaced mapping's target and the new one, `removeGroupMapping` the removed one; a role target needs `tenant_admin` or that role, a team target `tenant_admin`. An operator (break-glass CLI, seed) is exempt, is audited as `{ kind: "system", id: "operator:<name>" }` and alone may change a human's `local` roles (`RBAC_DIRECT_GRANT_REFUSED` otherwise). Order: input, tenant, role, user, human target, elevation.
6. **Default roles:** trigger `tenant_default_roles` on `ursitoare.tenant` calls `ursitoare.seed_default_roles`, which sets `app.tenant_id` for the owner's insert (forced row-level security binds the owner) and restores it; the migration backfills the same way. The app role cannot write roles.
7. **Bootstrap:** under an advisory lock on the tenant, if any mapping targets `tenant_admin` the answer is `already_mapped` and nothing is written; else it checks the issuer, upserts the mapping and appends only `identity.bootstrap_admin_mapped`. `bootstrapAdminGroup(env)` validates a given record; no `process.env` read is added.
8. **Principal:** `resolvePrincipal` reads `loadMemberships` in `withTenantTx(pool, session.tenant, ...)` and returns `{ ...principalOf(session), roles, teams }`. `loadMemberships` joins the user (nothing for a non-`active` one), sorts, de-duplicates and never truncates. Above 64 roles or teams (the limit of `PrincipalEntity`) `resolvePrincipal` rejects with `RBAC_TOO_MANY_MEMBERSHIPS`: a cut list would fail open for a policy that forbids on a membership. That rejection or a database failure makes add-api-pep's verifier throw: 503 `AUTHZ_UNAVAILABLE`, never an empty principal. No `add-admin-api` route maps the code; only `resolvePrincipal` raises it.
9. **Groups:** `groupsFromIdToken` decodes the payload (base64url JSON) of an already verified ID token, checks no signature and never throws; it keeps strings of 1 to 255 well-formed characters without newline or NUL that equal their trim, drops duplicates and keeps the first 1000.
10. **Audit:** every change appends its `identity.*` event (types and payloads in the spec) with `appendAudit` in the caller's transaction; actor `{ kind, id: userId }` of a user or service actor, an operator as in 5, or sync `{ kind: "system", id: "oidc" }`.
11. **Names:** role and team as the `CHECK`s of the data model; user id `^[A-Za-z0-9_-]{1,64}$`; operator `^[A-Za-z0-9._@-]{1,64}$`; group 1 to 255 characters, well formed, no newline or NUL, equal to its trim; issuer 1 to 2048 characters without newline. An `RbacError` message is fixed per code and echoes no input.
12. **e2e part:** `rbacPart` needs the `database` and `oidc` handles (`databaseApi`, `oidcApi`); `start` returns `{ env: {}, close }`. `seed` lists `ursitoare.tenant` on a one-connection owner pool and, in each tenant's `withTenantTx` (row-level security binds the owner), skips a tenant with no `tenant_idp` row for the fake's issuer, else, as operator `e2e-seed`, runs `createTeam` `finance` unless `listTeams` has it, `setGroupMapping` for each of `RBAC_SEED_MAPPINGS`, and `mapBootstrapAdminGroup` for `ursitoare-admins`.

## Interfaces

```ts
// src/identity/rbac/*.ts
type RbacErrorCode = "RBAC_INVALID" | "RBAC_NOT_FOUND" | "RBAC_EXISTS" | "RBAC_IN_USE" | "RBAC_ELEVATION" | "RBAC_DIRECT_GRANT_REFUSED" | "RBAC_UNKNOWN_ISSUER" | "RBAC_TENANT_MISMATCH" | "RBAC_TOO_MANY_MEMBERSHIPS"
class RbacError extends Error { readonly code: RbacErrorCode; constructor(code: RbacErrorCode, message: string) }
type RbacActor = { kind: "user" | "service"; userId: string; roles: readonly string[] } | { kind: "operator"; name: string }
const DEFAULT_ROLES: readonly string[]; const DEFAULT_BOOTSTRAP_ADMIN_GROUP: string; const BOOTSTRAP_ADMIN_GROUP_ENV: string
function listRoles(tx: TenantTx, ctx: TenantContext): Promise<string[]>
function listTeams(tx: TenantTx, ctx: TenantContext): Promise<string[]>
function createTeam(tx: TenantTx, ctx: TenantContext, input: { teamId: string }, actor: RbacActor, opts?: IdentityOptions): Promise<{ teamId: string }>
function deleteTeam(tx: TenantTx, ctx: TenantContext, teamId: string, actor: RbacActor, opts?: IdentityOptions): Promise<void>
interface GroupMapping { issuer: string; group: string; roleId: string | null; teamId: string | null; reviewedBy: string }
function listGroupMappings(tx: TenantTx, ctx: TenantContext): Promise<GroupMapping[]>
function setGroupMapping(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string; roleId?: string | undefined; teamId?: string | undefined }, actor: RbacActor, opts?: IdentityOptions): Promise<GroupMapping>
function removeGroupMapping(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string }, actor: RbacActor, opts?: IdentityOptions): Promise<boolean>
interface SyncResult { added: string[]; removed: string[] }
interface MembershipSet { roles: string[]; teams: string[] }
function groupsFromIdToken(idToken: string): string[]
function syncMemberships(tx: TenantTx, ctx: TenantContext, userId: string, input: { issuer: string; groups: readonly string[] }, opts?: IdentityOptions): Promise<SyncResult>
function loadMemberships(tx: TenantTx, ctx: TenantContext, userId: string): Promise<MembershipSet>
function grantRole(tx: TenantTx, ctx: TenantContext, input: { userId: string; roleId: string }, actor: RbacActor, opts?: IdentityOptions): Promise<"granted" | "exists">
function revokeRole(tx: TenantTx, ctx: TenantContext, input: { userId: string; roleId: string }, actor: RbacActor, opts?: IdentityOptions): Promise<boolean>
function mapBootstrapAdminGroup(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string; operator: string }, opts?: IdentityOptions): Promise<"mapped" | "already_mapped">
function bootstrapAdminGroup(env: Readonly<Record<string, string | undefined>>): string
function resolvePrincipal(pool: TenantPool, session: SessionContext): Promise<Principal>
// test/support/e2e-stack/rbac-part.ts
const rbacPart: E2eStackPart; const RBAC_SEED_TEAM: string; const RBAC_SEED_MAPPINGS: readonly { group: string; roleId: string | null; teamId: string | null }[]
// SQL: tables ursitoare.role, team, idp_group_map, membership; function ursitoare.seed_default_roles(p_tenant_id text)
```

## Data model

`src/db/migrations/0170_rbac.sql`, verbatim (the loop gives each table `FORCE` row-level security and the policy text `checkTenancyCatalog` accepts):
```sql
CREATE TABLE ursitoare.role (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  role_id text NOT NULL CHECK (role_id ~ '^[a-z][a-z0-9_]{0,31}$'),
  PRIMARY KEY (tenant_id, role_id));
CREATE TABLE ursitoare.team (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  team_id text NOT NULL CHECK (team_id ~ '^[a-z][a-z0-9_-]{0,63}$'),
  PRIMARY KEY (tenant_id, team_id));
CREATE TABLE ursitoare.idp_group_map (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  issuer text NOT NULL,
  group_name text NOT NULL,
  role_id text,
  team_id text,
  reviewed_by text NOT NULL,
  PRIMARY KEY (tenant_id, issuer, group_name),
  FOREIGN KEY (tenant_id, role_id) REFERENCES ursitoare.role (tenant_id, role_id),
  FOREIGN KEY (tenant_id, team_id) REFERENCES ursitoare.team (tenant_id, team_id),
  CHECK (num_nonnulls(role_id, team_id) = 1));
CREATE TABLE ursitoare.membership (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  membership_id text NOT NULL CHECK (membership_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  user_id text NOT NULL,
  role_id text,
  team_id text,
  source text NOT NULL CHECK (source IN ('idp_claim', 'local')),
  source_issuer text NOT NULL DEFAULT '',
  granted_by text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, membership_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES ursitoare."user" (tenant_id, user_id),
  FOREIGN KEY (tenant_id, role_id) REFERENCES ursitoare.role (tenant_id, role_id),
  FOREIGN KEY (tenant_id, team_id) REFERENCES ursitoare.team (tenant_id, team_id),
  CHECK (num_nonnulls(role_id, team_id) = 1),
  CHECK ((source = 'idp_claim' AND source_issuer <> '' AND granted_by IS NULL)
    OR (source = 'local' AND source_issuer = '' AND role_id IS NOT NULL AND granted_by IS NOT NULL)));
CREATE UNIQUE INDEX membership_role_uq ON ursitoare.membership (tenant_id, user_id, role_id, source, source_issuer) WHERE role_id IS NOT NULL;
CREATE UNIQUE INDEX membership_team_uq ON ursitoare.membership (tenant_id, user_id, team_id, source, source_issuer) WHERE team_id IS NOT NULL;
CREATE INDEX membership_user_idx ON ursitoare.membership (tenant_id, user_id);
DO $do$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['role', 'team', 'idp_group_map', 'membership'] LOOP
    EXECUTE format('ALTER TABLE ursitoare.%I ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY %I ON ursitoare.%I USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true))$p$, t || '_isolation', t);
  END LOOP;
END $do$;
GRANT SELECT ON TABLE ursitoare.role TO ursitoare_app;
GRANT SELECT, INSERT, DELETE ON TABLE ursitoare.team, ursitoare.idp_group_map, ursitoare.membership TO ursitoare_app;
GRANT UPDATE (role_id, team_id, reviewed_by) ON TABLE ursitoare.idp_group_map TO ursitoare_app;
GRANT UPDATE (synced_at) ON TABLE ursitoare.membership TO ursitoare_app;
CREATE FUNCTION ursitoare.seed_default_roles(p_tenant_id text) RETURNS void
LANGUAGE plpgsql SET search_path = pg_catalog, ursitoare, pg_temp AS $fn$
DECLARE v_prev text := current_setting('app.tenant_id', true);
BEGIN
  PERFORM set_config('app.tenant_id', p_tenant_id, true);
  INSERT INTO ursitoare.role (tenant_id, role_id)
  VALUES (p_tenant_id, 'tenant_admin'), (p_tenant_id, 'author'), (p_tenant_id, 'approver'), (p_tenant_id, 'auditor')
  ON CONFLICT DO NOTHING;
  PERFORM set_config('app.tenant_id', coalesce(v_prev, ''), true);
END
$fn$;
CREATE FUNCTION ursitoare.tenant_default_roles() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, ursitoare, pg_temp AS $fn$
BEGIN
  PERFORM ursitoare.seed_default_roles(NEW.tenant_id);
  RETURN NEW;
END
$fn$;
CREATE TRIGGER tenant_default_roles AFTER INSERT ON ursitoare.tenant
  FOR EACH ROW EXECUTE FUNCTION ursitoare.tenant_default_roles();
REVOKE ALL ON FUNCTION ursitoare.seed_default_roles(text), ursitoare.tenant_default_roles() FROM PUBLIC;
SELECT ursitoare.seed_default_roles(tenant_id) FROM ursitoare.tenant;
```

## Failure cases

| Situation | Behaviour |
|---|---|
| Bad input; unknown role, team or user | `RBAC_INVALID`; `RBAC_NOT_FOUND` (`removeGroupMapping` answers `false`); nothing written |
| Duplicate team; team in use (pre-check, or foreign-key error `23503`); issuer not in `tenant_idp` | `RBAC_EXISTS`; `RBAC_IN_USE`; `RBAC_UNKNOWN_ISSUER` |
| Target not grantable, own grant; human target without operator; foreign transaction | `RBAC_ELEVATION`; `RBAC_DIRECT_GRANT_REFUSED`; `RBAC_TENANT_MISMATCH` before any statement |
| Parallel grants or bootstraps | serialised by the unique index or the lock: `granted` and `exists`; `mapped` and `already_mapped` |
| Database error in sync; in `resolvePrincipal`; more than 64 roles or teams | sign-in aborts with `OIDC_INTERNAL`; the promise rejects (503 `AUTHZ_UNAVAILABLE` at the API); `RBAC_TOO_MANY_MEMBERSHIPS` |
| Token without `groups`; mapping added | the issuer's `idp_claim` memberships are removed; applies at the next sign-in |

## Security

1. No endpoint is added (`add-admin-api` exposes these functions under `manage_users_roles`; `add-admin-cli` calls them); the verifier stays behind add-api-pep's authentication.
2. Every table is tenant-leading with forced row-level security and tenant-scoped foreign keys; every function checks `app.tenant_id` first. Two-tenant tests: schema, `listTeams`, `listGroupMappings`, `syncMemberships`, `loadMemberships`, the permit check.
3. Input is validated per decision 11; token group names are untrusted and matched only by equality with the tenant's mappings.
4. No secret is read or stored; errors carry fixed text; payloads hold ids and group names only.
5. Abuse cases, each a scenario: granting above one's roles, to oneself or to a human; demoting the admin mapping; a foreign issuer; a hostile `groups` claim; a removed mapping leaving its roles; equal group names in two tenants; a failing sync; a database error or more than 64 teams giving an empty or cut principal.

## Test plan

Node test runner, `*.test.ts` beside each file; no sleeps. Database tests use `withTestDatabase()`, `seedTwoTenants(db)`, `provisionTenantIdp(db.ownerPool, ctx, { issuer: "https://idp.example/realms/ursitoare", organization })`, users from `upsertUserFromClaims` or `createServiceAccount`, owner fixtures through `withTenantTx(db.ownerPool, ...)`, `fixedClock`, `sequentialIds`. A red test calls the function and asserts a value (`const r = await p.then((v) => v, (e: unknown) => e)`, then `assert.deepEqual`; errors by `code`); a synchronous call (`groupsFromIdToken`, `bootstrapAdminGroup`, the constants) is wrapped in `assert.doesNotThrow(() => { r = f(...) })` or a `try` that returns the thrown value, and then asserted. A migration test first asserts `to_regclass` and the ledger; events are read from `ursitoare.audit_event`. The policy test copies `roles.cedar` to `mkdtemp(...)/identity/policy/` and builds `createPolicyEngine({ srcDir, clock, ids: sequentialIds(), logger: createLogger({ level: "silent" }) })`. Sign-in tests drive `GET /auth/oidc/login`, `completeFakeLogin(fake, <Location>, "alice")` (it returns the callback URL) and `GET` of that path with the login cookie through `server.inject`, over `registerOidcRoutes`.

## Decisions made while writing

- **Extra dependency `add-api-pep`, and module `api`:** the roadmap says roles and teams are "filled by U17"; add-api-pep names `src/api/session-auth.ts` as the place. `rbacPart` seeds the tenants it finds, so `add-web-sign-in` is no dependency.
- **Groups by decoding** the verified ID token, not by widening `verifyIdToken`'s result (its tests may compare it whole).
- **A flat membership** (role or team per row), not the architecture's `(user, team, role)` triple: `PrincipalEntity` has two lists.
- **Permits only for `manage_users_roles`, `manage_tenant`, `read_audit`:** a permit for `edit_flow` or `approve_task` here would be united with, and defeat, those units' own rules.
- **`tenant_admin` may grant any default role** (architecture §9.2), else no admin could map `author`.
- **The seed also bootstraps `ursitoare-admins`,** so carol can administer in the M2 journey.
- **One actor type:** `RbacActor` also serves add-admin-api (`user` or `service` for a caller with a principal, `operator` for the CLI and seeds).
- **Elevation covers mappings:** else an `author` could replace the `tenant_admin` mapping and lock out the admins; a team target needs `tenant_admin`.
- **Fail closed above 64 (a ninth code):** truncating drops memberships that forbid policies match on.
- **`Interfaces given` is over 3,000 characters:** each signature stays whole.
