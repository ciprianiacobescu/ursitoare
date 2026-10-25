## Purpose

Tenant isolation for every later table: the `tenant` table, a tenant-scoped transaction helper, a closed routing table behind three SECURITY DEFINER functions; the catalog test is capability `tenancy-catalog`.

## ADDED Requirements

### Requirement: Route keys are hashed
`hashRouteKey(key)` SHALL return the 32-byte SHA-256 of the key's UTF-8 bytes as a `Buffer`, and refuse an empty, ill-formed or longer than 4096 UTF-16 code units key with `TenancyError` `TENANT_INVALID` whose message is `"invalid route key"`.

#### Scenario: Known value
- **WHEN** `hashRouteKey("abc")` and `hashRouteKey("é")` are called
- **THEN** the first is a `Buffer` of hex `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`, the second the SHA-256 of bytes `c3 a9`

#### Scenario: Refused keys
- **WHEN** the key is `""`, `"\ud800"`, `"x".repeat(4097)`, and `"x".repeat(4096)`
- **THEN** the first three throw `TENANT_INVALID` (message `"invalid route key"`); the last returns 32 bytes

### Requirement: The tenant table shows a session only its own tenant
Migration `0002_tenancy.sql` SHALL create `ursitoare.tenant` (`tenant_id`, `name`, `review_profile`, `mintkey_tenant_uuid`, `created_at`) with a row-level-security policy comparing `tenant_id` to `current_setting('app.tenant_id', true)`, grant `ursitoare_app` only `SELECT`, and answer a query without `app.tenant_id` with no rows, not an error.

#### Scenario: Own row only
- **WHEN** `seedTwoTenants(db)` ran, and `db.appPool` selects `tenant_id, name, review_profile, mintkey_tenant_uuid` from `ursitoare.tenant` in `withTenantTx` for `a`, and for `b`
- **THEN** the rows are exactly `[{ tenant_id: "tenant_a", name: "Tenant A", review_profile: "solo", mintkey_tenant_uuid: null }]` and the same for `tenant_b`; `db.ownerPool` sees both, `relrowsecurity` is `true`, a policy expression contains `app.tenant_id`

#### Scenario: Nothing without a tenant, and no error
- **WHEN** `db.appPool` selects all of `ursitoare.tenant` outside the helper, and in a transaction after `set_config('app.tenant_id', 'ghost', true)` and after `''`
- **THEN** each resolves with `rowCount` `0`

#### Scenario: Read-only for the app role
- **WHEN** the app pool runs `UPDATE ursitoare.tenant SET name = 'x'`, `INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'C')` and `DELETE FROM ursitoare.tenant`, each in its own `withTenantTx` for `a`
- **THEN** each fails with `42501`; the owner sees the two rows

#### Scenario: Defaults and constraints
- **WHEN** the owner inserts a tenant with only `tenant_id` and `name`, then tries `review_profile` `'admin'`, `tenant_id` `""` or `"a/b"`, a padded name and a repeated name
- **THEN** the first row has `review_profile` `"solo"`, `mintkey_tenant_uuid` null and a `created_at`; the failures are `23514`, and `23505` for the repeat

### Requirement: A tenant transaction sets and always resets the tenant
`withTenantTx(pool, ctx, fn)` SHALL run `fn` in one transaction after `set_config('app.tenant_id', ctx.tenantId, true)`, commit on return, roll back and rethrow the same error when `fn` throws, reject with `TENANT_TX_ABORTED` and commit nothing when `fn` returns after catching a SQL error (Postgres answers `COMMIT` of an aborted transaction with `ROLLBACK`, losing every write), and leave no tenant on the pooled connection either way, even if `fn` set one at session level.

#### Scenario: Set inside, reset after commit
- **WHEN** a pool from `createPool(db.appEndpoint, { max: 1 })` runs `withTenantTx(pool, a, tx => tx.query("SELECT current_setting('app.tenant_id', true) AS t"))`, then `pool.query` runs that select and `SELECT count(*)::int AS n FROM ursitoare.tenant`
- **THEN** the helper resolves to the query result with `t` `"tenant_a"`; afterwards `t` is `null` or `""` and `n` is `0`

#### Scenario: A session-level setting does not survive
- **WHEN** on a pool of `max: 1`, `fn` for `a` runs `SELECT set_config('app.tenant_id', 'tenant_b', false)`, then `pool.query` runs the `t` and `n` selects as above
- **THEN** `t` is `""` and `n` is `0`

#### Scenario: Rollback when fn throws
- **WHEN** the owner created `note` (design.md § Test plan), and `fn` on an app pool of `max: 1` inserts a `tenant_a` note, then throws `new Error("boom")`
- **THEN** `withTenantTx` rejects with that same error object, the superuser (design.md § Test plan) sees `0` notes, and on the same connection `t` is `null` or `""`

#### Scenario: A caught SQL error fails closed
- **WHEN** the owner created `note`, and `fn` for `a` on an app pool of `max: 1` inserts a `tenant_a` note, runs `SELECT 1/0` in its own `try/catch` and returns `"done"`
- **THEN** `withTenantTx` rejects with `TENANT_TX_ABORTED`, not `"done"`; the superuser sees `0` notes, and on that connection `t` is `null` or `""`

#### Scenario: Tenant A cannot read or write tenant B rows
- **WHEN** the owner seeded one `note` per tenant (one transaction per tenant, tenant set first, design.md § Test plan), and in `withTenantTx` for `a` the app pool selects all notes, selects `tenant_b` from `ursitoare.tenant`, updates `body` of tenant B's note and inserts note `n9` for `tenant_b`
- **THEN** the notes select returns only `tenant_a`'s, the tenant select `0` rows, the update `rowCount` `0`, the insert fails with SQLSTATE `42501`; the superuser sees tenant B's note unchanged and no `n9`

#### Scenario: Invalid context is refused before connecting
- **WHEN** `withTenantTx` gets a spy pool counting `connect` calls and `ctx` is `{ tenantId: "", reviewProfile: "solo" }`, `{ tenantId: "a/b", reviewProfile: "solo" }` or `{ tenantId: "tenant_a", reviewProfile: "admin" }`
- **THEN** each rejects with `TENANT_INVALID`; `fn` and `connect` are never called

#### Scenario: Database down or connection lost
- **WHEN** the pool points at a closed port from `freePort()`; and on a pool of `max: 1` `fn` runs `SELECT pg_terminate_backend(pg_backend_pid())`
- **THEN** the first rejects with `code` `"ECONNREFUSED"`, `fn` not called; the second rejects, and the next `withTenantTx` for `b` on that pool succeeds, seeing only `tenant_b`

#### Scenario: Concurrent tenants stay apart
- **WHEN** `withTenantTx` for `a` and `b` run together on a pool of `max: 2`, each running `pg_sleep(0.05)` then selecting `tenant_id` from `tenant`
- **THEN** the rows are `["tenant_a"]` and `["tenant_b"]`

### Requirement: The default tenant is created once
`ensureDefaultTenant(pool, name, opts?)` SHALL, on a pool connected as `ursitoare_owner`, return the tenant called `name`, creating it as `solo` only when no tenant exists, never a second one.

#### Scenario: Create, then repeat
- **WHEN** `ensureDefaultTenant(db.ownerPool, "Acme", { ids: sequentialIds(), clock: fixedClock("2026-10-25T08:00:00Z") })` runs twice on a database without tenants
- **THEN** both return `{ tenantId: "ten_00000000-0000-7000-8000-000000000000", reviewProfile: "solo" }` and one row exists with `created_at` `2026-10-25T08:00:00.000Z`; eight concurrent calls with one name on a fresh database return one `tenantId` and leave one row

#### Scenario: Another tenant exists
- **WHEN** `seedTwoTenants(db)` ran, then `ensureDefaultTenant(db.ownerPool, ...)` runs with "Acme" and with "Tenant A"
- **THEN** the first rejects with `TENANT_DEFAULT_CONFLICT`, adding no row; the second returns `{ tenantId: "tenant_a", reviewProfile: "solo" }`

#### Scenario: Bad name and the app role
- **WHEN** the name is `""`, `" x"` or 201 characters, and `ensureDefaultTenant(db.appPool, "Acme")` runs on an empty database
- **THEN** the first three reject with `TENANT_INVALID`, the last with `TENANT_BOOTSTRAP_FAILED` (`details.sqlstate` `"42501"`); no row exists

### Requirement: The routing table is closed to the app role
`ursitoare.tenant_route` SHALL grant `ursitoare_app` no privilege, so the app role reaches it only through `ursitoare.register_tenant_route`, `ursitoare.unregister_tenant_route` and `ursitoare.resolve_tenant` (`SECURITY DEFINER`, owned by `ursitoare_owner`, `search_path` pinned, no `PUBLIC` execute); `resolve_tenant` SHALL return only a `tenant_id` or null for an exact pair.

#### Scenario: Direct access fails
- **WHEN** `db.appPool` runs `SELECT *`, `SELECT key_hash`, an `INSERT`, an `UPDATE` and a `DELETE` on `tenant_route`
- **THEN** each fails with SQLSTATE `42501`, and `has_table_privilege` and `has_any_column_privilege` for the app role are `false`

#### Scenario: Function attributes
- **WHEN** `pg_proc` is read for the three functions
- **THEN** each has `prosecdef` `true`, owner `ursitoare_owner`, `proconfig` `search_path=pg_catalog, pg_temp`, no `EXECUTE` for `PUBLIC` and `EXECUTE` for `ursitoare_app`

#### Scenario: A shadowing temp table changes nothing
- **WHEN** `a` holds `("session", hashRouteKey("k1"))`, and one app-pool connection creates `TEMP TABLE tenant_route (kind text, key_hash bytea, tenant_id text)` holding that pair for `b`, sets `search_path = pg_temp, public` and resolves it
- **THEN** the result is `tenant_a`

#### Scenario: No way to enumerate
- **WHEN** `a` holds `("session", hashRouteKey("k1"))` (registered by a raw `register_tenant_route` call in a transaction that set the tenant), and the app pool selects from `ursitoare.resolve_tenant($1, $2)` with that pair, a non-matching hash, a null kind, kind `'%'` and a 31-byte hash
- **THEN** one column; the exact pair gives `tenant_a`, the others give null and no error

### Requirement: Routes are registered only for the current tenant
`registerTenantRoute(tx, kind, key)` SHALL insert `(kind, hashRouteKey(key))` for the tenant in `app.tenant_id` and resolve `"created"`, or `"exists"` when that tenant holds it, and refuse with `TENANT_ROUTE_CONFLICT` when another tenant does, `TENANT_CONTEXT_MISSING` when none is set, or `TENANT_ROUTE_RESERVED` for kind `idp` on any connection except `ursitoare_owner`.

#### Scenario: Create, repeat, take over
- **WHEN** `withTenantTx` for `a` registers `("session", "tok-Z9q")` twice, then `withTenantTx` for `b` registers the same pair
- **THEN** the results are `"created"`, `"exists"`, then `b` rejects with `TENANT_ROUTE_CONFLICT` whose message holds neither `tok-Z9q` nor its hash in hex; one row exists, for `tenant_a`, its `key_hash` equals `hashRouteKey("tok-Z9q")` and no column holds `tok-Z9q`

#### Scenario: Two tenants race for one key
- **WHEN** `a` and `b` register `("session", "tok-race")` at once
- **THEN** exactly one resolves `"created"`, the other rejects with `TENANT_ROUTE_CONFLICT`, and one row exists

#### Scenario: A reserved kind needs the owner connection
- **WHEN** in `withTenantTx` for `a` on the app pool, `registerTenantRoute(tx, "idp", "https://issuer.example|org-1")` runs; and then the same call runs through `withTenantTx(db.ownerPool, a, ...)`
- **THEN** the first rejects with `TENANT_ROUTE_RESERVED`, adding no row; the second returns `"created"`

#### Scenario: No tenant, unknown tenant, bad input
- **WHEN** `registerTenantRoute` runs in a raw app-pool transaction with no tenant set; in `withTenantTx` for `{ tenantId: "ghost", reviewProfile: "solo" }`; with kind `"Bad Kind"`; with key `""`; and the SQL `register_tenant_route('session', '\x00'::bytea)` runs in `withTenantTx` for `a`
- **THEN** the results are `TENANT_CONTEXT_MISSING`, `TENANT_UNKNOWN`, `TENANT_INVALID` twice (before SQL) and SQLSTATE `U0003`; no row is added

### Requirement: Routes are removed only by their tenant
`unregisterTenantRoute(tx, kind, key)` SHALL delete the route `(kind, hashRouteKey(key))` held by the tenant in `app.tenant_id` and resolve `true`, resolve `false` when that tenant does not hold it (another tenant's route included, no error), and refuse with `TENANT_CONTEXT_MISSING` when no tenant is set, or `TENANT_ROUTE_RESERVED` for kind `idp` on any connection except `ursitoare_owner`.

#### Scenario: Own route only
- **WHEN** `a` registered `("session", "k1")` and `k2`, `b` registered `k3`; then `a` unregisters `k1`, `b` unregisters `k2`, and `a` unregisters `k1` again
- **THEN** the results are `true`, `false`, `false`; the owner sees `k2` held by `tenant_a` and `k3` by `tenant_b`, and `resolveTenantBy(db.appPool, "session", "k2")` gives `tenant_a`

#### Scenario: No tenant, bad input, reserved kind
- **WHEN** `unregisterTenantRoute` runs in a raw app-pool transaction with no tenant set; with kind `"Bad Kind"`; with key `""`; with `("idp", "https://issuer.example|org-1")` in `withTenantTx` for `a` on the app pool, after the owner registered that pair for `a`; and the SQL `unregister_tenant_route('session', '\x00'::bytea)` runs in `withTenantTx` for `a`
- **THEN** the results are `TENANT_CONTEXT_MISSING`, `TENANT_INVALID` twice (before SQL), `TENANT_ROUTE_RESERVED` (the `idp` row remains) and SQLSTATE `U0003`

### Requirement: Tenants resolve from exact keys only
`resolveTenantBy(pool, kind, key)` SHALL return the `TenantContext` of the tenant routed for `(kind, hashRouteKey(key))`, or `null` when there is none or the key is unusable.

#### Scenario: Known, unknown and wrong kind
- **WHEN** `a` registered `("session", "k1")`, the owner set `tenant_a` to `team`, and `resolveTenantBy(db.appPool, ...)` gets `("session", "k1")`, `("session", "k2")`, `("trigger", "k1")` and `("session", "")`
- **THEN** the results are `{ tenantId: "tenant_a", reviewProfile: "team" }`, `null`, `null` (same key, other kind) and `null`

#### Scenario: Bad kind and database down
- **WHEN** `resolveTenantBy(db.appPool, "Bad Kind", "k1")` runs, and `("session", "k1")` on a pool aimed at a closed port
- **THEN** the first rejects with `TENANT_INVALID`, the second with `code` `"ECONNREFUSED"`, not `null`

### Requirement: Two seeded tenants for isolation tests
`seedTwoTenants(db)` SHALL insert, through `db.ownerPool` and idempotently, tenants `tenant_a` ("Tenant A") and `tenant_b` ("Tenant B") as `solo`, and return their `TenantContext` values.

#### Scenario: Seed, repeat, keep stored values
- **WHEN** `seedTwoTenants(db)` runs twice on `withTestDatabase()`, then the owner sets `tenant_a` to `team` and it runs a third time
- **THEN** the first two return `{ a: { tenantId: "tenant_a", reviewProfile: "solo" }, b: { tenantId: "tenant_b", reviewProfile: "solo" } }`, the third returns `a` as `team`, and the owner sees exactly two rows
