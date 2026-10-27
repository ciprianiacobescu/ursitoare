## Purpose

Users, their IdP links and the issuer-and-organization routes of each tenant: a verified token's claims resolve to exactly one tenant and one user of that tenant, and nothing of one tenant is visible in another.

## ADDED Requirements

### Requirement: The IdP route key is exact
`idpRouteKey(issuer, organization)` SHALL return `issuer + "\n" + organization` (one line feed), and refuse with `IdentityError` `IDENTITY_INVALID` (message `"invalid identity input"`) an issuer or organization that is not a string, is empty, is padded with whitespace, contains NUL or a line feed, is ill-formed, or exceeds 2048 (issuer) or 255 (organization) code units. `IDP_ROUTE_KIND` SHALL be `"idp"`.

#### Scenario: Known value and refused halves
- **WHEN** `idpRouteKey("https://idp.example/realms/ursitoare", "org-a")` is called, and with issuer `""`, `" https://x"`, `"a\nb"`, `"a\u0000b"`, `"\ud800"`, `5` (cast) or 2049 `x`, or organization `""`, `"o\nrg"`, `"org "`, `"\ud800"` or 256 `x`
- **THEN** the first returns `"https://idp.example/realms/ursitoare\norg-a"` and `IDP_ROUTE_KIND` is `"idp"`; each other call throws `IDENTITY_INVALID`; an issuer of 2048 `x` with `"o"`, and `"https://x"` with an organization of 255 `x`, return keys; `("a", "b\nc")` and `("a\nb", "c")` are both refused, so no two pairs share a key

### Requirement: A token names exactly one organization
`organizationFromClaim(organization)` SHALL return the single organization of a list of one string (or of a bare string), refuse a list of two or more with `IDENTITY_AMBIGUOUS_ORGANIZATION` and every other shape with `IDENTITY_NO_ORGANIZATION`, with fixed messages that hold no claim value.

#### Scenario: One organization
- **WHEN** the claim is `["org-a"]` and `"org-a"`
- **THEN** both return `"org-a"`

#### Scenario: None
- **WHEN** the claim is `undefined`, `null`, `[]`, `[""]`, `[5]`, `["a\nb"]`, `{ "org-a": { "id": "1" } }`, `7` or `true`
- **THEN** each throws `IDENTITY_NO_ORGANIZATION` with message `"token has no usable organization"`

#### Scenario: Ambiguous
- **WHEN** the claim is `["x-secret-one", "y-secret-two"]` and `["org-a", "org-a"]`
- **THEN** each throws `IDENTITY_AMBIGUOUS_ORGANIZATION` (message `"token names more than one organization"`, without `x-secret-one` or `y-secret-two`)

### Requirement: Identity tables are tenant-leading and narrowly granted
Migration `0100_identity.sql` SHALL create `ursitoare."user"`, `ursitoare.idp_link` and `ursitoare.tenant_idp`, each with `tenant_id` leading its primary key, forced row-level security on `app.tenant_id` and tenant-scoped foreign keys, and grant `ursitoare_app` only `SELECT`, `INSERT` and `UPDATE (display_name, email, state, updated_at)` on `"user"`, `SELECT` and `INSERT` on `idp_link`, and `SELECT` on `tenant_idp`. `checkTenancyCatalog` SHALL report nothing on the migrated database.

#### Scenario: Objects, ledger and catalog
- **WHEN** on `withTestDatabase()` the test reads `to_regclass` of the tables, the ledger, `relrowsecurity` and `relforcerowsecurity` of each, and `checkTenancyCatalog(db.ownerPool)`
- **THEN** the tables exist, the ledger holds version `100` named `identity`, both flags are `true` for each, and the violations are `[]`

#### Scenario: Tenant A sees only its rows
- **WHEN** `seedTwoTenants(db)` ran, the owner inserted for each tenant one human `u1`, one `idp_link` `(ISS, "sub-1", "u1")` and one `tenant_idp` `(ISS, "org-<a|b>")`, and `withTenantTx(db.appPool, a, ...)` selects all rows of the three tables
- **THEN** each result holds one `tenant_a` row; the same selects on `db.appPool` outside the helper return `0` rows without error

#### Scenario: Another tenant's rows cannot be written
- **WHEN** each in its own `withTenantTx(db.appPool, a, ...)` the app inserts a `"user"` row with `tenant_id` `tenant_b`, inserts an `idp_link` with `tenant_id` `tenant_b`, and updates `display_name` of the `u1` of `tenant_b`
- **THEN** the inserts fail with SQLSTATE `42501`, the update has `rowCount` `0`, and the owner sees `tenant_b`'s rows unchanged

#### Scenario: Privileges are narrow
- **WHEN** each in its own `withTenantTx(db.appPool, a, ...)` the app runs `UPDATE ursitoare."user" SET kind = 'service'`, `DELETE FROM ursitoare."user"`, `UPDATE ursitoare.idp_link SET user_id = 'x'`, `DELETE FROM ursitoare.idp_link`, an `INSERT` into `ursitoare.tenant_idp`, and `UPDATE ursitoare."user" SET display_name = 'Z' WHERE user_id = 'u1'`
- **THEN** the first five fail with SQLSTATE `42501` and the last has `rowCount` `1`

### Requirement: Identity rows cannot hold an impossible shape
The identity tables SHALL reject, by `CHECK` and tenant-scoped foreign keys, a human with an owner, a service account without an owner or owned by itself, an unknown `kind` or `state`, a padded or empty name, a link or owner in another tenant or of a missing user, a repeated key, and a line feed in a `tenant_idp` issuer.

#### Scenario: Each bad row fails with its code
- **WHEN** `u1` (human) exists for `tenant_a` and `u2` for `tenant_b`, and each of these is inserted by the owner in its own `withTenantTx(db.ownerPool, ctx, ...)`, for `a` unless stated: (1) a human with `owner_user_id` `u1`; (2) a service account without an owner; (3) a service account owned by itself; (4) `kind` `admin`; (5) `state` `gone`; (6) `display_name` `""` or `" x"`; (7) a service account owned by `u2`; (8) a second `u1`; (9) an `idp_link` for user `ghost`; (10) the existing `idp_link` `(ISS, "sub-1")` again; (11) the existing `tenant_idp` row again; (12) a `tenant_idp` with issuer `"a\nb"`; (13) a `"user"` with `tenant_id` `nobody`, run for `{ tenantId: "nobody", reviewProfile: "solo" }`
- **THEN** the SQLSTATE codes are `23514` for (1) to (6), `23503` for (7), `23505` for (8), `23503` for (9), `23505` for (10) and (11), `23514` for (12) and `23503` for (13)

### Requirement: An identity provider is provisioned on the owner pool only
`provisionTenantIdp(ownerPool, ctx, idp, opts?)` SHALL, in one transaction on a pool connected as `ursitoare_owner`, route `(issuer, organization)` to the tenant under kind `idp` and record it in `tenant_idp`, succeed again for the same tenant without a second row or route, refuse a pair another tenant holds with `IDENTITY_IDP_TAKEN`, and refuse any other connection with `IDENTITY_OWNER_REQUIRED`.

#### Scenario: Provision and resolve
- **WHEN** `provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" }, { clock: fixedClock("2026-10-25T08:00:00Z") })` runs
- **THEN** it resolves `undefined`; the owner finds in `tenant_idp` the single row `{ tenant_id: "tenant_a", issuer: ISS, organization: "org-a", created_at: 2026-10-25T08:00:00.000Z }`; `resolveTenantBy(db.appPool, "idp", ISS + "\norg-a")` gives `{ tenantId: "tenant_a", reviewProfile: "solo" }`; the one `tenant_route` row of kind `idp` has `key_hash` equal to `hashRouteKey(ISS + "\norg-a")`

#### Scenario: Repeat changes nothing
- **WHEN** the same call runs again with `fixedClock("2026-10-26T08:00:00Z")`, and `a` also provisions `(ISS, "org-a2")`
- **THEN** both resolve; the first pair keeps one route and one `tenant_idp` row with `created_at` `2026-10-25T08:00:00.000Z`; `a` holds two pairs

#### Scenario: A pair held by another tenant is refused
- **WHEN** `a` holds `(ISS, "org-a")` and `provisionTenantIdp(db.ownerPool, b, { issuer: ISS, organization: "org-a" })` runs, then `b` provisions `("https://other.example/realms/x", "org-a")`
- **THEN** the first rejects with `IDENTITY_IDP_TAKEN` whose message holds neither `org-a` nor the issuer, `b` has no `tenant_idp` row for that pair, and `resolveTenantBy(db.appPool, "idp", ISS + "\norg-a")` is still `tenant_a`; the second succeeds and its pair routes to `tenant_b`

#### Scenario: Two tenants race for one pair
- **WHEN** `a` and `b` provision `(ISS, "org-race")` at once with `Promise.all`
- **THEN** exactly one succeeds and the other rejects with `IDENTITY_IDP_TAKEN`; one route and one `tenant_idp` row exist

#### Scenario: Not from the app role, bad input, unknown tenant, database down
- **WHEN** `provisionTenantIdp` gets `db.appPool` with a valid pair; a spy pool counting `connect` calls with organization `"a\nb"`; `db.ownerPool` with `ctx` `{ tenantId: "ghost", reviewProfile: "solo" }` and with `{ tenantId: "a/b", reviewProfile: "solo" }`; and a pool aimed at a closed port with a valid call
- **THEN** they reject with `IDENTITY_OWNER_REQUIRED` (no `idp` route and no `tenant_idp` row exists), `IDENTITY_INVALID` (`connect` never called), `IDENTITY_UNKNOWN_TENANT` (no route added), `TenancyError` `TENANT_INVALID`, and `code` `"ECONNREFUSED"`

### Requirement: A token resolves to one tenant by its exact issuer and organization
`resolveTenantForToken(pool, claims)` SHALL return the `TenantContext` routed for kind `idp` and the pair `(claims.issuer, the single organization of claims.organization)`, and otherwise throw `IdentityError` with the codes of `organizationFromClaim` or `IDENTITY_UNKNOWN_TENANT` (message `"tenant not found"`, never holding a claim value), while a database failure propagates.

#### Scenario: Each organization finds its own tenant
- **WHEN** `a` holds `(ISS, "org-a")`, `b` holds `(ISS, "org-b")`, and `resolveTenantForToken(db.appPool, ...)` gets `{ issuer: ISS, organization: ["org-b"] }`, `{ issuer: ISS, organization: ["org-a"] }` and `{ issuer: ISS, organization: "org-a" }`
- **THEN** the results are `{ tenantId: "tenant_b", reviewProfile: "solo" }`, then `tenant_a`, then `tenant_a`; after the owner sets `tenant_a` to `team`, the `tenant_a` result has `reviewProfile` `"team"`

#### Scenario: Nothing is guessed
- **WHEN** the claims are organization `["org-c"]` or `["ORG-A"]` with `ISS`, `["org-a"]` with issuer `"https://other.example/realms/x"`, `ISS + "/"`, `""` or `"a\nb"`
- **THEN** each rejects with `IDENTITY_UNKNOWN_TENANT` (message `"tenant not found"`, without `org-c` or `other.example`)

#### Scenario: Claim problems are decided before any lookup; database down
- **WHEN** a spy pool counting `connect` calls gets organization `undefined`, `[]` and `["org-a", "org-b"]` with `ISS`; and a pool aimed at a closed port gets `{ issuer: ISS, organization: ["org-a"] }`
- **THEN** the first three reject with `IDENTITY_NO_ORGANIZATION`, `IDENTITY_NO_ORGANIZATION`, `IDENTITY_AMBIGUOUS_ORGANIZATION` and `connect` is never called; the last rejects with `code` `"ECONNREFUSED"`, not an `IdentityError`

### Requirement: The first sign-in creates a human user and its IdP link
`upsertUserFromClaims(tx, ctx, claims, opts?)` SHALL, when `(issuer, subject)` is not linked in the tenant, create an active human user and its `idp_link` in the caller's transaction and return the `User`, naming it from `name`, else `preferredUsername`, else `email`, else `subject`, and never linking by email.

#### Scenario: First sign-in
- **WHEN** `withTenantTx(db.appPool, a, tx => upsertUserFromClaims(tx, a, { issuer: ISS, subject: "sub-alice", email: "alice@example.test", name: "Alice A", preferredUsername: "alice" }, { ids: sequentialIds(), clock: fixedClock("2026-10-25T08:00:00Z") }))` runs
- **THEN** it returns `{ userId: "usr_00000000-0000-7000-8000-000000000000", kind: "human", ownerUserId: null, displayName: "Alice A", email: "alice@example.test", state: "active" }`; the owner sees one `"user"` row with `created_at` and `updated_at` `2026-10-25T08:00:00.000Z` and one `idp_link` `(tenant_a, ISS, sub-alice, usr_00000000-0000-7000-8000-000000000000)` with `linked_at` `08:00`

#### Scenario: Display name fallbacks
- **WHEN** five new subjects sign in under `a` with claims: `sub-1` `{ name: "  Bo  ", preferredUsername: "bo" }`, `sub-2` `{ preferredUsername: "cy" }`, `sub-3` `{ email: "di@example.test" }`, `sub-4` none of the optional claims, and `sub-5` `{ name }` of 300 `x` characters
- **THEN** the display names are `"Bo"`, `"cy"`, `"di@example.test"`, `"sub-4"` and 200 `x` characters

#### Scenario: Same subject in two tenants, same email under a new subject
- **WHEN** the same `(ISS, "sub-alice")` signs in under `a` and under `b`, then `(ISS, "sub-eve")` with `email` `"alice@example.test"` signs in under `a`
- **THEN** the two `userId` values differ and each tenant's `listUsers` shows only its own; `sub-eve` is a new user of `a` with another `userId` than alice's, so `a` holds two users with that email

#### Scenario: Concurrent first sign-ins
- **WHEN** eight `withTenantTx(db.appPool, a, ...)` calls upsert `(ISS, "sub-race")` at once
- **THEN** the eight results carry one `userId`, and the owner sees one user and one link for it

#### Scenario: Bad claims
- **WHEN** the claims have issuer `""`, subject `""`, `" s"` or 513 characters, `name` `5` (cast), `email` of 321 characters or with `"\u0000"`, or `preferredUsername` `"\ud800"`
- **THEN** each rejects with `IDENTITY_INVALID` before any SQL, the transaction remains usable (a following query succeeds), and no row exists

### Requirement: Later sign-ins update only what changed and refuse users who cannot sign in
`upsertUserFromClaims` SHALL, for a linked human user, update `display_name` (from `name`) or `email` only when the claim is present and differs (setting `updated_at`), never clear a stored value from an absent claim, change nothing when nothing differs, and refuse a disabled user or a link to a non-human user with `IDENTITY_USER_DISABLED` without writing.

#### Scenario: Unchanged
- **WHEN** alice signs in with the same claims at `2026-10-25T09:00:00Z`
- **THEN** the returned user equals the first result, `updated_at` is still `2026-10-25T08:00:00.000Z`, and no row was added

#### Scenario: Changed name and email
- **WHEN** she signs in at `2026-10-25T09:00:00Z` with `name` `"Alice B"` and `email` `"alice.b@example.test"`, then at `10:00` with only `name` `"Alice B"`, then at `11:00` with neither
- **THEN** the first returns `displayName` `"Alice B"` and the new email, and the stored `updated_at` is `09:00`; the second and third change nothing (`updated_at` stays `09:00`) and the third returns the stored name and email; `created_at` stays `08:00` and the `userId` is unchanged throughout

#### Scenario: Disabled user, and a link to a service account
- **WHEN** the owner sets alice's `state` to `disabled` and she signs in with `name` `"Changed"`; and the owner inserts a service account owned by an active human and an `idp_link` `(ISS, "sub-robot")` to it, and `sub-robot` signs in
- **THEN** both reject with `IDENTITY_USER_DISABLED` (message `"user cannot sign in"`), alice's stored `display_name` is unchanged, and no row was added

### Requirement: Users are read within the tenant
`getUser(tx, ctx, userId)` SHALL return the tenant's `User` or `null`, and `listUsers(tx, ctx, page?)` SHALL return the tenant's users ordered by `userId` in pages of `limit` (default 50, at most 200) with `next` set to the last `userId` of a page that has more rows, never a user of another tenant.

#### Scenario: Get
- **WHEN** alice (of `a`) and mallory (of `b`) have signed in, and `getUser` runs in `withTenantTx` for `a` with alice's id, an unknown id `usr_none`, and mallory's id; and with `"a/b"` and `""`
- **THEN** the results are alice's `User`, `null`, `null` (mallory is invisible in `a`), then `IDENTITY_INVALID` twice

#### Scenario: Pages
- **WHEN** `a` has five users `u1` to `u5` created in that order with `sequentialIds()` and `listUsers` runs with `{ limit: 2 }`, then `{ limit: 2, after: <next> }` twice, then with no page, and for an empty tenant
- **THEN** the pages are `[u1, u2]` with `next` `u2`, `[u3, u4]` with `next` `u4`, `[u5]` with `next` `null`; with no page all five and `next` `null`; the empty tenant gives `{ users: [], next: null }`; tenant `b` lists none of `a`'s users; `{ limit: 0 }`, `{ limit: 201 }`, `{ limit: 1.5 }` and `{ after: "a/b" }` each reject with `IDENTITY_INVALID`

### Requirement: A service account is owned by an active human of the same tenant
`createServiceAccount(tx, ctx, { displayName, ownerUserId }, opts?)` SHALL create an active service user with no email and no `idp_link`, owned by `ownerUserId`, and refuse with `IDENTITY_OWNER_INVALID` an owner that is absent, in another tenant, a service account or disabled.

#### Scenario: Create
- **WHEN** alice is an active human of `a` and `createServiceAccount(tx, a, { displayName: "  Invoice robot ", ownerUserId: alice.userId }, { ids: sequentialIds(5), clock: fixedClock("2026-10-25T08:00:00Z") })` runs
- **THEN** it returns `{ userId: "svc_00000000-0000-7000-8000-000000000005", kind: "service", ownerUserId: alice.userId, displayName: "Invoice robot", email: null, state: "active" }`; `getUser` returns the same; the owner finds no `idp_link` for it

#### Scenario: Invalid owners
- **WHEN** the owner is the new service account, a disabled human, `usr_none`, and mallory's id (of `b`)
- **THEN** each rejects with `IDENTITY_OWNER_INVALID` (message `"owner must be an active human user"`) and no row is added

#### Scenario: Bad input
- **WHEN** `displayName` is `""`, 201 `x` characters or `5` (cast), or `ownerUserId` is `"a/b"`
- **THEN** each rejects with `IDENTITY_INVALID`

### Requirement: User functions refuse a transaction of another tenant
`upsertUserFromClaims`, `getUser`, `listUsers` and `createServiceAccount` SHALL throw `IdentityError` `IDENTITY_TENANT_MISMATCH` before any write when `ctx.tenantId` differs from the `app.tenant_id` of the transaction, or none is set.

#### Scenario: Wrong or missing tenant
- **WHEN** each of the four functions runs with `ctx` `a` inside `withTenantTx(db.appPool, b, ...)`, and `getUser` runs with `ctx` `a` in a raw app-pool transaction with no tenant set
- **THEN** each rejects with `IDENTITY_TENANT_MISMATCH` (message `"transaction tenant does not match the tenant context"`) and the owner finds no new row in either tenant
