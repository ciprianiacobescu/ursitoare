## Context

`add-engine-skeleton` (U01) gives, from `src/core/index.ts` (restated exactly): `interface Clock { now(): Date }`, `systemClock: Clock`, `fixedClock(iso: string): Clock`, `interface IdSource { next(prefix: string): string }`, `systemIds: IdSource`, `sequentialIds(seed?: number): IdSource` (ids `${prefix}_00000000-0000-7000-8000-<counter, 12 hex>` from `seed`, default 0).

`add-db-foundation` (U02) gives, from `src/db/index.ts` and `test/support/pg.ts` (restated exactly): `ROLE_OWNER: string` (`"ursitoare_owner"`), `ROLE_APP: string` (`"ursitoare_app"`), `createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool`, `freePort(): Promise<number>`, `readTestCluster(env?): TestCluster`, and `withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase>` with `TestDatabase { name; ownerUrl; appUrl; ownerEndpoint; appEndpoint; ownerPool; appPool; close() }`. Its runner applies `src/db/migrations/NNNN_<name>.sql` as `ursitoare_owner`, one transaction per file; versions are unique, gaps allowed. `withTestDatabase()` clones a template migrated in the test global setup, so it holds every migration. `0001_base.sql` grants `ursitoare_app` only `USAGE` on the schema and no `PUBLIC` execute on new owner functions.

`src/tenancy` imports only `src/core`, `src/db` and `pg` types; no new dependency.

## Decisions

1. **Tenant ids are `text`** matching `^[A-Za-z0-9_-]{1,64}$`: a `uuid` cast in a policy would raise on the empty string a pooled connection reports after `set_config`. `/` is excluded (Cedar ids use it).
2. **The tenant is set with `set_config('app.tenant_id', $1, true)`**, a bound parameter, not `SET LOCAL`; policies read `current_setting('app.tenant_id', true)`. Before release `inTransaction` runs `set_config('app.tenant_id', '', false)`, so a session value cannot leak.
3. **`tenant`: RLS enabled, not forced; the app role has only `SELECT`;** the owner provisions tenants.
4. **`tenant_route` has no RLS;** it is closed by privilege and reached through three `SECURITY DEFINER` functions (owner `ursitoare_owner`, `SET search_path = pg_catalog, pg_temp`, all objects schema-qualified). Failures use SQLSTATE `U0001` (no tenant set), `U0002` (held by another tenant), `U0003` (bad kind or hash), `U0004` (reserved kind), mapped in TypeScript. Parameters carry a `p_` prefix (a bare name would bind to the column).
5. **Reserved kinds are enforced in SQL.** `register_tenant_route` and `unregister_tenant_route` raise `U0004` when `p_kind = ANY (ARRAY['idp'])` and `session_user <> 'ursitoare_owner'`: a kind with a guessable key is provisioned on the owner pool, never claimed from a request path. A later unit that adds a provisioned kind replaces both functions with a longer array.
6. **The catalog checker is a module function,** so negative controls prove it can fail; `catalog.test.ts` runs it on a migrated database, so it checks every later migration, and pins the allowlist. Partitions need no RLS, but no app privilege.
7. **Error messages are fixed strings;** none holds a key, hash, input tenant id or driver text.
8. **Only `code` and `details` are contract** (decided by the orchestrator on 2026-10-25): no caller parses a message. `details` is empty except `sqlstate` for `TENANT_BOOTSTRAP_FAILED`; tests assert `hashRouteKey`'s message and that no message holds a key, hash or input.
9. **A caught SQL error fails closed** (decided by the orchestrator on 2026-10-25): Postgres answers `COMMIT` of an aborted transaction with `ROLLBACK`, no error, so ignoring the tag would report success and lose every write. `inTransaction` reads it and throws `TENANT_TX_ABORTED`; a savepoint that `fn` rolled back leaves the transaction healthy.
10. **Policies count by membership** (decided by the orchestrator on 2026-10-25): a permissive policy applies when `polroles` holds `0` or a role `r` with `pg_has_role(<app oid>, r, 'MEMBER')` (app role included; role missing: only `0`); a `USING (true)` policy for an inherited group opens rows too.
11. **Catalog edge cases** (decided by the orchestrator on 2026-10-25): a table with no primary key or no `tenant_id` is `not_tenant_leading`, and its unique indexes and foreign keys are reported, so a null comparison is a violation; `view_open_to_app` also covers materialized and foreign tables; `ownerRole` is the only accepted owner of definer functions.
12. **Catalog requirements are capability `tenancy-catalog`** (decided by the orchestrator on 2026-10-25): one spec file passed 18,000 characters.

## Interfaces

All exported from `src/tenancy/index.ts` (and `test/support/tenants.ts`); `import type pg from "pg"`. Module-internal (not exported from `index.ts`; no test imports them): `assertTenantContext(ctx: TenantContext): void` in `context.ts` and `inTransaction<T>(pool: TenantPool, fn: (client: pg.PoolClient) => Promise<T>): Promise<T>` in `tx.ts`.

```ts
type TenancyErrorCode = "TENANT_INVALID" | "TENANT_CONTEXT_MISSING" | "TENANT_UNKNOWN" | "TENANT_ROUTE_CONFLICT" | "TENANT_ROUTE_RESERVED" | "TENANT_DEFAULT_CONFLICT" | "TENANT_BOOTSTRAP_FAILED" | "TENANT_TX_ABORTED"
class TenancyError extends Error { readonly code: TenancyErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: TenancyErrorCode, message: string, details?: Record<string, string | number>) }
type ReviewProfile = "solo" | "team"
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }
const TENANT_ID_PATTERN: RegExp; const ROUTE_KIND_PATTERN: RegExp; const MAX_ROUTE_KEY_LENGTH: number
function hashRouteKey(key: string): Buffer
type TenantPool = Pick<pg.Pool, "connect">; type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
interface EnsureTenantOptions { ids?: IdSource; clock?: Clock }
function ensureDefaultTenant(pool: TenantPool, name: string, opts?: EnsureTenantOptions): Promise<TenantContext>
type RouteRegistration = "created" | "exists"
function registerTenantRoute(tx: TenantTx, kind: string, key: string): Promise<RouteRegistration>
function unregisterTenantRoute(tx: TenantTx, kind: string, key: string): Promise<boolean>
function resolveTenantBy(pool: TenantPool, kind: string, key: string): Promise<TenantContext | null>
const CATALOG_GLOBAL_TABLES: readonly string[]
type CatalogRule = "not_tenant_leading" | "unique_not_tenant_leading" | "fk_not_tenant_scoped" | "rls_not_enabled" | "rls_not_forced" | "no_tenant_policy" | "partition_open_to_app" | "view_open_to_app" | "route_table_open" | "definer_function_unsafe" | "app_role_missing" | "app_role_privileged" | "app_role_owns_relation"
interface CatalogViolation { readonly rule: CatalogRule; readonly object: string }
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string }): Promise<CatalogViolation[]>
// test/support/tenants.ts
const TENANT_A_ID: string; const TENANT_B_ID: string
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>
// SQL, schema ursitoare
register_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
unregister_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
resolve_tenant(p_kind text, p_key_hash bytea) RETURNS text
```

Values: `TENANT_ID_PATTERN` is `/^[A-Za-z0-9_-]{1,64}$/`, `ROUTE_KIND_PATTERN` is `/^[a-z][a-z0-9_]{0,31}$/`, `MAX_ROUTE_KEY_LENGTH` is `4096`, `CATALOG_GLOBAL_TABLES` is `["schema_migration", "tenant", "tenant_route"]`, `TENANT_A_ID` is `"tenant_a"` and `TENANT_B_ID` is `"tenant_b"`. Defaults: `ensureDefaultTenant` uses `systemIds` and `systemClock`; `checkTenancyCatalog` uses `ROLE_APP` and `ROLE_OWNER`. The constants have wide declared types; the scaffold stubs them as `/(?!)/`, `0`, `""` and `[]` (`docs/decisions/0002`).

### Behaviour details

- **`withTenantTx`:** `ctx` is validated (id pattern; `solo` or `team`) before `pool.connect()`. An error rolls back, releases the client and is rethrown as is; if the rollback or the final reset fails, the connection is destroyed. If `COMMIT` answers with command `ROLLBACK` (`fn` caught a SQL error), nothing is committed and it throws `TENANT_TX_ABORTED` after the reset; `inTransaction` does this for the other helpers too. A connect failure propagates; `fn` does not run.
- **`ensureDefaultTenant`:** `name` must be trimmed, 1 to 200 characters. Under an advisory lock it returns the tenant with that name, else `TENANT_DEFAULT_CONFLICT` if any tenant exists, else inserts one (`ids.next("ten")`, `clock.now()`). A SQL error is `TENANT_BOOTSTRAP_FAILED` (`details.sqlstate`); it needs the owner role.
- **`registerTenantRoute`, `unregisterTenantRoute`:** kind and key are validated in TypeScript (`TENANT_INVALID`, no SQL); `U0001`, `U0002`, `U0003`, `U0004` map to `TENANT_CONTEXT_MISSING`, `TENANT_ROUTE_CONFLICT`, `TENANT_INVALID`, `TENANT_ROUTE_RESERVED`, and a foreign-key violation (`23503`, no such tenant, register only) to `TENANT_UNKNOWN`. `unregisterTenantRoute` returns `false` for an absent or foreign route (no existence signal). After an error the transaction is aborted.
- **`resolveTenantBy`:** an invalid `kind` is `TENANT_INVALID`; a key `hashRouteKey` refuses gives `null`. One transaction resolves with no tenant set, then reads `review_profile` with it set. A connection error propagates.
- **`checkTenancyCatalog`** reads `pg_catalog` only and returns distinct `(rule, object)` pairs sorted by `rule`, then `object` (plain `<`); objects are `ursitoare.<relation>`, `ursitoare.<index or constraint>`, `ursitoare.<function>(<args>)` or the role name. Spec requirements "The catalog test guards every table" and "The runtime role is unprivileged" define the rules; tasks 7.1 and 7.2 list the queries. `app_role_missing` skips the role-dependent rules. A membership test skips the app role itself (`pg_has_role` is true for itself and for a superuser).

## Data model

`src/db/migrations/0002_tenancy.sql`, verbatim (the runner supplies the transaction; the plpgsql keyword is `BEGIN` without a semicolon):

```sql
CREATE TABLE ursitoare.tenant (
  tenant_id text PRIMARY KEY CHECK (tenant_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  name text NOT NULL UNIQUE CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 200),
  review_profile text NOT NULL DEFAULT 'solo' CHECK (review_profile IN ('solo', 'team')),
  mintkey_tenant_uuid uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE ursitoare.tenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON ursitoare.tenant
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT ON TABLE ursitoare.tenant TO ursitoare_app;

CREATE TABLE ursitoare.tenant_route (
  kind text NOT NULL CHECK (kind ~ '^[a-z][a-z0-9_]{0,31}$'),
  key_hash bytea NOT NULL CHECK (octet_length(key_hash) = 32),
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, key_hash));
CREATE INDEX tenant_route_tenant_idx ON ursitoare.tenant_route (tenant_id);
REVOKE ALL ON TABLE ursitoare.tenant_route FROM PUBLIC, ursitoare_app;

CREATE FUNCTION ursitoare.register_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$
DECLARE
  v_tenant text := nullif(current_setting('app.tenant_id', true), '');
  v_existing text;
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'tenant context is not set' USING ERRCODE = 'U0001'; END IF;
  IF p_kind IS NULL OR p_kind !~ '^[a-z][a-z0-9_]{0,31}$' OR p_key_hash IS NULL OR octet_length(p_key_hash) <> 32 THEN
    RAISE EXCEPTION 'invalid route kind or key hash' USING ERRCODE = 'U0003'; END IF;
  IF p_kind = ANY (ARRAY['idp']) AND session_user <> 'ursitoare_owner' THEN
    RAISE EXCEPTION 'route kind is reserved' USING ERRCODE = 'U0004'; END IF;
  INSERT INTO ursitoare.tenant_route (kind, key_hash, tenant_id)
  VALUES (p_kind, p_key_hash, v_tenant) ON CONFLICT (kind, key_hash) DO NOTHING;
  IF FOUND THEN RETURN true; END IF;
  SELECT r.tenant_id INTO v_existing FROM ursitoare.tenant_route r
   WHERE r.kind = p_kind AND r.key_hash = p_key_hash;
  IF v_existing IS DISTINCT FROM v_tenant THEN RAISE EXCEPTION 'route is already registered' USING ERRCODE = 'U0002'; END IF;
  RETURN false;
END;
$fn$;

CREATE FUNCTION ursitoare.unregister_tenant_route(p_kind text, p_key_hash bytea) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$
DECLARE v_tenant text := nullif(current_setting('app.tenant_id', true), '');
BEGIN
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'tenant context is not set' USING ERRCODE = 'U0001'; END IF;
  IF p_kind IS NULL OR p_kind !~ '^[a-z][a-z0-9_]{0,31}$' OR p_key_hash IS NULL OR octet_length(p_key_hash) <> 32 THEN
    RAISE EXCEPTION 'invalid route kind or key hash' USING ERRCODE = 'U0003'; END IF;
  IF p_kind = ANY (ARRAY['idp']) AND session_user <> 'ursitoare_owner' THEN
    RAISE EXCEPTION 'route kind is reserved' USING ERRCODE = 'U0004'; END IF;
  DELETE FROM ursitoare.tenant_route r
   WHERE r.kind = p_kind AND r.key_hash = p_key_hash AND r.tenant_id = v_tenant;
  RETURN FOUND;
END;
$fn$;

CREATE FUNCTION ursitoare.resolve_tenant(p_kind text, p_key_hash bytea) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $fn$
  SELECT r.tenant_id FROM ursitoare.tenant_route r WHERE r.kind = p_kind AND r.key_hash = p_key_hash
$fn$;

REVOKE ALL ON FUNCTION ursitoare.register_tenant_route(text, bytea), ursitoare.unregister_tenant_route(text, bytea), ursitoare.resolve_tenant(text, bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ursitoare.register_tenant_route(text, bytea), ursitoare.unregister_tenant_route(text, bytea), ursitoare.resolve_tenant(text, bytea) TO ursitoare_app;
```

`ON CONFLICT` waits for a concurrent insert of the same key, so one caller gets `true`.

## Failure cases

| Situation | Behaviour |
|---|---|
| No, unknown or empty `app.tenant_id` | zero rows, no error |
| `fn` throws, or the connection dies | rollback (or connection destroyed), original error rethrown |
| `fn` returns after catching a SQL error | `TENANT_TX_ABORTED`, nothing committed |
| `fn` sets `app.tenant_id` at session level | reset to `''` before release |
| Invalid context, kind, key or name | `TENANT_INVALID` before SQL; `null` from `resolveTenantBy` for an unusable key |
| Route held by another tenant (also a race); no or unknown tenant | `TENANT_ROUTE_CONFLICT` for the loser; `TENANT_CONTEXT_MISSING`, `TENANT_UNKNOWN` |
| Unregister of an absent or foreign route; reserved kind on the app role | `false`, row kept; `TENANT_ROUTE_RESERVED` |
| Postgres down | the driver error propagates, never `null` |
| `ensureDefaultTenant` with another tenant, or as the app role | `TENANT_DEFAULT_CONFLICT`, `TENANT_BOOTSTRAP_FAILED`; nothing added |

## Security

1. No endpoint is added, so no authentication or PEP action.
2. Isolation: `tenant` is row-secured on `app.tenant_id`; every later table must be tenant-leading with forced RLS and tenant-naming policies, which the catalog test enforces on every migration. The setting guards against application bugs, not arbitrary SQL as the app role.
3. Validation: ids, kinds, keys, names and profiles are checked in TypeScript and again by SQL; statements are parameterised; route keys are used only through `hashRouteKey`.
4. Secrets: none are read; route keys can be bearer secrets, so only the SHA-256 is stored, no error or `details` holds one, and nothing is logged.
5. Abuse cases, each a spec scenario: another tenant's rows; a tenant left on a pooled connection or lost by a caught SQL error; reading `tenant_route`; enumerating through `resolve_tenant`; taking over or removing a route; claiming `idp` as the app role; a shadowing temp table; bootstrapping as the app role; a later table with a bad key or policy; an unsafe definer; an app role inside the owner role.

## Test plan

Node test runner, `*.test.ts` beside each file, `withTestDatabase()` for database tests; no sleeps but `pg_sleep(0.05)`; `fixedClock` and `sequentialIds` injected. A test is named after its scenario (no `.`, `[` or `::`). Reset tests use `createPool(db.appEndpoint, { max: 1 })`. `tx.test.ts` creates its probe table as owner: `ursitoare.note(tenant_id text NOT NULL, id text NOT NULL, body text NOT NULL, PRIMARY KEY (tenant_id, id))`, RLS enabled and forced, policy `note_isolation` like `tenant_isolation`, `SELECT, INSERT, UPDATE` granted to `ursitoare_app`.

Each migration test first asserts that the objects it uses exist and the ledger holds version 2 `tenancy` (task 2.1); an expected SQL failure is `await assert.rejects(p, { code })`, so red fails by assertion.

`catalog.test.ts` and `catalog.roles.test.ts` create the bad objects of one scenario as owner in one fresh database and never alter `ursitoare_app` or `ursitoare_owner`; role cases use `postgres`, `ursitoare_owner`, `no_such_role` and probe roles `probe_<hex>` (made through `readTestCluster().adminUrl`, dropped in `after`).

## Decisions made while writing

- **`ensureDefaultTenant` runs as the owner and never makes a second tenant;** the card's `(pool, name)` gains optional `IdSource`, `Clock`.
- **Unregister exists:** units with expiring keys call `unregisterTenantRoute`, which touches only the current tenant's rows.
- **Catalog rules:** one foreign-key rule, `fk_not_tenant_scoped` (object: the constraint name): every `conkey` position holding `tenant_id` must reference the other table's `tenant_id`. The unique rule skips the primary key.
- **Policy rule:** each applicable policy (decision 10) needs `app.tenant_id` in every non-null expression; a policy with both null fails, and a table needs one.
- **`mintkey_tenant_uuid` is `uuid UNIQUE`:** one Mintkey tenant per tenant.
