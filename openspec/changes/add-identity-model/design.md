## Context

Dependencies, restated exactly.

`add-engine-skeleton` (`src/core`): `interface Clock { now(): Date }`, `systemClock: Clock`, `fixedClock(iso: string): Clock`, `interface IdSource { next(prefix: string): string }`, `systemIds: IdSource`, `sequentialIds(seed?: number): IdSource` (ids `${prefix}_00000000-0000-7000-8000-<counter, 12 hex>` counting from `seed`, default 0).

`add-db-foundation`: `createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool` (`src/db`); in `test/support/pg.ts` `freePort(): Promise<number>` and `withTestDatabase(opts?): Promise<TestDatabase>` with `TestDatabase { name; ownerUrl; appUrl; ownerEndpoint; appEndpoint; ownerPool; appPool; close() }`. The runner applies `src/db/migrations/NNNN_<name>.sql` as `ursitoare_owner` (versions unique, gaps allowed); `withTestDatabase()` clones a template migrated by `prepareDatabase`, so it holds `0100_identity.sql`; `ursitoare_app` has only `USAGE` on schema `ursitoare` until a migration grants more.

`add-tenancy-foundation` (`src/tenancy/index.ts`, `test/support/tenants.ts`): `interface TenantContext { readonly tenantId: string; readonly reviewProfile: "solo" | "team" }`; `type TenantPool = Pick<pg.Pool, "connect">`; `type TenantTx = Pick<pg.PoolClient, "query">`; `withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>` (one transaction with `set_config('app.tenant_id', ctx.tenantId, true)`; an invalid `ctx` is `TenancyError` `TENANT_INVALID` before connecting); `registerTenantRoute(tx: TenantTx, kind: string, key: string): Promise<"created" | "exists">` (`TenancyError` codes `TENANT_ROUTE_CONFLICT` for a pair another tenant holds, `TENANT_ROUTE_RESERVED` for kind `idp` unless the session user is `ursitoare_owner`, `TENANT_UNKNOWN` for a missing tenant); `resolveTenantBy(pool: TenantPool, kind: string, key: string): Promise<TenantContext | null>`; `hashRouteKey(key: string): Buffer`; `checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?): Promise<CatalogViolation[]>`; `seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>` (`tenant_a`, `tenant_b`, both `solo`).

`src/identity` imports only `src/core` and `src/tenancy`; it makes no outbound call and adds no dependency.

## Decisions

1. **The route is the lookup; `tenant_idp` is the record.** `resolveTenantForToken` calls `resolveTenantBy(pool, "idp", idpRouteKey(issuer, organization))` and never reads `tenant_idp` (no tenant is known yet, and the table is behind forced security). `provisionTenantIdp` writes both in one transaction.
2. **Provisioning is owner-only twice over:** `register_tenant_route` refuses kind `idp` on any other session user, and the app role has no `INSERT` on `tenant_idp`. Forced security binds the owner too: its write works only because `withTenantTx(ownerPool, ctx, ...)` sets `app.tenant_id`; a raw owner statement sees and writes nothing.
3. **Route key** is `issuer + "\n" + organization` (one LF). Each half is non-empty, well-formed, without NUL, LF or padding whitespace; issuer at most 2048, organization at most 255 code units (the key stays under U03's 4096). The LF rule keeps `a\nb`+`c` and `a`+`b\nc` apart. No normalisation: a trailing slash or other case is another issuer; provision the issuer exactly as tokens carry `iss`.
4. **Organization claim** (`organizationFromClaim`): a list of strings (ADR-13 pins one shape); a bare string counts as a one-entry list. `undefined`, `null`, `[]` and every other shape, Keycloak's alias-keyed object included, give `IDENTITY_NO_ORGANIZATION`, never a guess; two or more entries (duplicates too) give `IDENTITY_AMBIGUOUS_ORGANIZATION`; the single entry must pass the organization rule of decision 3, else `IDENTITY_NO_ORGANIZATION`.
5. **`resolveTenantForToken` order:** organization claim, issuer (unusable: `IDENTITY_UNKNOWN_TENANT`), lookup.
6. **Users are keyed by `(issuer, subject)`, never by email** (an IdP-asserted attribute): a second subject with the same email is a second user.
7. **Concurrent first sign-ins** of one subject are serialised at the start of `upsertUserFromClaims` by `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, `$1` being `ursitoare:idp_link:<tenantId>\n<issuer>\n<subject>`; the second caller then finds the link. The primary key is the backstop.
8. **`ctx` must match the transaction:** every user function first reads `current_setting('app.tenant_id', true)`; any other value, or none, is `IDENTITY_TENANT_MISMATCH` before a write. Ids are `ids.next("usr")` (humans) and `ids.next("svc")` (service accounts), matching `^[A-Za-z0-9_-]{1,64}$`.

## Interfaces

All exported from `src/identity/index.ts`; declarations omit `export`. Module-internal (not in `index.ts`, no test imports them): `requireText(value: unknown, max: number): string` in `text.ts` (1 to `max` code units, well-formed, no NUL, LF or padding, else `IDENTITY_INVALID`); `identityError(code: IdentityErrorCode): IdentityError` in `errors.ts` (fixed message).

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

`IDP_ROUTE_KIND` is `"idp"` (typed `string`; the scaffold stubs it as `""`). Fixed messages, never echoing input: `IDENTITY_INVALID` "invalid identity input"; `IDENTITY_NO_ORGANIZATION` "token has no usable organization"; `IDENTITY_AMBIGUOUS_ORGANIZATION` "token names more than one organization"; `IDENTITY_UNKNOWN_TENANT` "tenant not found"; `IDENTITY_IDP_TAKEN` "identity provider already routed"; `IDENTITY_OWNER_REQUIRED` "owner connection required"; `IDENTITY_USER_DISABLED` "user cannot sign in"; `IDENTITY_OWNER_INVALID` "owner must be an active human user"; `IDENTITY_TENANT_MISMATCH` "transaction tenant does not match the tenant context". `IdentityError.name` is `"IdentityError"`. Option defaults: `systemIds`, `systemClock`.

### Behaviour details

- **`provisionTenantIdp`:** validates `idp` first (`IDENTITY_INVALID`, the pool untouched), then `withTenantTx(ownerPool, ctx, tx => ...)`: `registerTenantRoute(tx, "idp", key)` (`"created"` and `"exists"` both succeed), then `INSERT INTO ursitoare.tenant_idp (tenant_id, issuer, organization, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (tenant_id, issuer, organization) DO NOTHING` with `clock.now()`. `TENANT_ROUTE_CONFLICT` becomes `IDENTITY_IDP_TAKEN`, `TENANT_ROUTE_RESERVED` becomes `IDENTITY_OWNER_REQUIRED`, `TENANT_UNKNOWN` becomes `IDENTITY_UNKNOWN_TENANT`; every other error propagates unchanged.
- **`upsertUserFromClaims`:** validate first (`IDENTITY_INVALID`): `issuer` (1 to 2048) and `subject` (1 to 512) through `requireText`; `email`, `name` and `preferredUsername`, when not `undefined`, are well-formed strings without NUL, then trimmed, an empty result counting as absent; `email` over 320 characters is invalid; names are cut to 200 characters. Then the tenant check, the lock, and `SELECT user_id FROM ursitoare.idp_link WHERE tenant_id = $1 AND issuer = $2 AND subject = $3`. *No link:* insert an active human (display name: `name`, else `preferredUsername`, else `email`, else `subject`, cut to 200; `created_at` and `updated_at` are `clock.now()`), then the link (`linked_at` the same instant). *Linked:* read the user; a `state` other than `active` or a `kind` other than `human` is `IDENTITY_USER_DISABLED`, no write; else one `UPDATE` sets `display_name` (to `name` only) and `email` when present and different, plus `updated_at`; an absent claim never clears a value; nothing different means no write.
- **`getUser`:** tenant check; `userId` must match the id pattern (`IDENTITY_INVALID`); `null` when absent.
- **`listUsers`:** tenant check; `limit` an integer 1 to 200 (default 50) and `after` a user id, else `IDENTITY_INVALID`; selects `limit + 1` rows `WHERE tenant_id = $1 [AND user_id COLLATE "C" > $2] ORDER BY user_id COLLATE "C"`; `next` is the last returned `userId` if a further row exists, else `null`.
- **`createServiceAccount`:** validate (`displayName` trimmed, 1 to 200 code units, well-formed, no NUL; `ownerUserId` the id pattern; `IDENTITY_INVALID`), tenant check, then `SELECT kind, state FROM ursitoare."user" WHERE tenant_id = $1 AND user_id = $2 FOR SHARE` (a concurrent disable of the owner waits); no row, a `service` or a `disabled` owner is `IDENTITY_OWNER_INVALID`; else insert (`kind` `service`, `email` null, `state` `active`, timestamps `clock.now()`).

## Data model

`src/db/migrations/0100_identity.sql`, verbatim (the runner supplies the transaction and `search_path`; `user` is a reserved word, so every reference is `ursitoare."user"`, quoted and qualified):

```sql
CREATE TABLE ursitoare."user" (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  user_id text NOT NULL CHECK (user_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  kind text NOT NULL CHECK (kind IN ('human', 'service')),
  owner_user_id text,
  display_name text NOT NULL CHECK (display_name = btrim(display_name) AND char_length(display_name) BETWEEN 1 AND 200),
  email text CHECK (email IS NULL OR (email = btrim(email) AND char_length(email) BETWEEN 1 AND 320)),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id),
  CONSTRAINT user_owner_fkey FOREIGN KEY (tenant_id, owner_user_id) REFERENCES ursitoare."user" (tenant_id, user_id),
  CONSTRAINT user_kind_owner CHECK ((kind = 'human' AND owner_user_id IS NULL)
    OR (kind = 'service' AND owner_user_id IS NOT NULL AND owner_user_id <> user_id)));

CREATE TABLE ursitoare.idp_link (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  issuer text NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 2048),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 512),
  user_id text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, issuer, subject),
  CONSTRAINT idp_link_user_fkey FOREIGN KEY (tenant_id, user_id) REFERENCES ursitoare."user" (tenant_id, user_id));

CREATE TABLE ursitoare.tenant_idp (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  issuer text NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 2048 AND position(E'\n' in issuer) = 0),
  organization text NOT NULL CHECK (char_length(organization) BETWEEN 1 AND 255 AND position(E'\n' in organization) = 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, issuer, organization));

ALTER TABLE ursitoare."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare."user" FORCE ROW LEVEL SECURITY;
CREATE POLICY user_isolation ON ursitoare."user" USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
ALTER TABLE ursitoare.idp_link ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.idp_link FORCE ROW LEVEL SECURITY;
CREATE POLICY idp_link_isolation ON ursitoare.idp_link USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
ALTER TABLE ursitoare.tenant_idp ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.tenant_idp FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_idp_isolation ON ursitoare.tenant_idp USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

GRANT SELECT, INSERT ON TABLE ursitoare."user" TO ursitoare_app;
GRANT UPDATE (display_name, email, state, updated_at) ON TABLE ursitoare."user" TO ursitoare_app;
GRANT SELECT, INSERT ON TABLE ursitoare.idp_link TO ursitoare_app;
GRANT SELECT ON TABLE ursitoare.tenant_idp TO ursitoare_app;
```

None of the tables is partitioned (architecture §6 partitions only time-series tables), so the partition-ready rule does not apply. `(issuer, organization)` is unique across tenants through the `idp` route, not an index. The app role cannot change `kind`, owner or tenant of a user, and deletes nothing.

## Failure cases

| Situation | Behaviour |
|---|---|
| Missing, empty or non-list organization claim; two or more | `IDENTITY_NO_ORGANIZATION`; `IDENTITY_AMBIGUOUS_ORGANIZATION`, no lookup |
| No route for the pair, or an unusable issuer | `IDENTITY_UNKNOWN_TENANT` |
| Postgres down or connection lost | the driver error propagates |
| Provisioning a pair another tenant holds, also a race | `IDENTITY_IDP_TAKEN` for the loser; nothing written |
| Provisioning on the app pool; a missing tenant; a repeat | `IDENTITY_OWNER_REQUIRED`; `IDENTITY_UNKNOWN_TENANT`; success, nothing added |
| Bad claims, ids, names, `limit`, `after` | `IDENTITY_INVALID` before any SQL |
| Disabled user, or a link to a service account | `IDENTITY_USER_DISABLED`, no write |
| Owner missing, foreign, disabled or a service account | `IDENTITY_OWNER_INVALID` |
| `ctx` differs from the transaction's tenant, or none set | `IDENTITY_TENANT_MISMATCH`, no write |

## Security

1. No endpoint is added, so no PEP action. `add-oidc-login` calls `resolveTenantForToken` and `upsertUserFromClaims` only after it validated the ID token. `provisionTenantIdp` is reachable from no request: it needs the owner pool, which the API process never holds, and the database refuses the app role too.
2. Isolation: tenant-leading keys, forced row-level security with a tenant policy, and `checkTenancyCatalog` clean (`src/tenancy/catalog.test.ts` also runs it on every migrated database). Two-tenant tests run through `appPool` in `withTenantTx`; owner statements only seed and inspect. A token reaches a tenant only through the exact `(issuer, organization)` route.
3. Validation: strings are checked at the function boundary and statements are parameterised. Claim values are untrusted: stored as text, never used for authorization; linking is by `(issuer, subject)` only.
4. Secrets: none are read or stored. Errors carry the fixed messages above, no claim value or driver text; the module logs nothing.
5. Abuse cases, each a spec scenario: another tenant's organization, a held pair taken over, provisioning from the app role, two organizations, a line feed in a key, a victim's email under a new subject, a disabled user, a service account signing in, a foreign or service owner, a wrong `ctx`, rows written for another tenant.

## Test plan

Node test runner, `*.test.ts` beside each file, `withTestDatabase()` and `seedTwoTenants(db)`, `fixedClock` and `sequentialIds` injected, no sleeps. `ISS` is `https://idp.example/realms/ursitoare`. Owner-side seeding and inspection go through `withTenantTx(db.ownerPool, ctx, ...)`, because forced security binds the owner. The migration test first asserts with `assert.ok` that `to_regclass` of the three tables (`'ursitoare."user"'` quoted) is not null and that the ledger holds version 100 named `identity`, so red fails by assertion. Test names are the scenario names (no `.`, `[` or `::`). SQL failures are `await assert.rejects(p, { code })`, identity failures `await assert.rejects(p, { name: "IdentityError", code })`. "Database down" is `createPool` on a closed port from `freePort()`; a spy pool counts `connect` calls.

## Decisions made while writing

- **`opts?: IdentityOptions`** is added to the card's `provisionTenantIdp`, `upsertUserFromClaims` and `createServiceAccount` for deterministic times and ids.
- **`getUser` returns `User | null`**; `listUsers` is a minimal `{ users, next }` page ordered by `user_id` that U14's cursor may wrap.
- **Four error codes** beyond the card's five: `IDENTITY_INVALID`, `IDENTITY_OWNER_REQUIRED`, `IDENTITY_OWNER_INVALID`, `IDENTITY_TENANT_MISMATCH`. A link to a service account is `IDENTITY_USER_DISABLED`.
- **No `DELETE`, and no `UPDATE` on `idp_link`, for the app role:** unlinking is `add-admin-api`'s decision.
- **No audit event here:** `add-oidc-login` audits refusals and `add-admin-api` administration, so there is no dependency on `add-audit-chain`.
