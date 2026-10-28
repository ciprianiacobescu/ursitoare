# Delivered shapes taken by add-admin-api

The merged names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (e226f8c): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-engine-skeleton (src/core, src/observability, src/api, src/config, src/main.ts)
interface Clock { now(): Date; }
interface IdSource { next(prefix: string): string; }
const systemIds: IdSource
function sequentialIds(seed?: number): IdSource
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock; }): Logger
const noopTracer: Tracer
class ApiError extends Error { readonly status: number; readonly code: string; readonly details: unknown; constructor(status: number, code: string, message: string, details?: unknown); }
interface ServerDeps { readonly version: string; readonly ids: IdSource; readonly logger: Logger; readonly tracer: Tracer; readonly health?: HealthRegistry; readonly healthCheckTimeoutMs?: number; }
function buildServer(deps: ServerDeps): Promise<FastifyInstance>
interface AppConfig { readonly engineKey: Secret | null; /* other members omitted */ }
class Secret { constructor(value: string); reveal(): string; }
function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>
// add-db-foundation (test/support/pg.ts)
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>
// add-tenancy-foundation (src/tenancy, test/support/tenants.ts)
type ReviewProfile = "solo" | "team"
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>
// add-audit-chain (src/audit)
interface KeyMaterial { reveal(): string; }
interface AppendOptions { clock?: Clock; }
function appendAudit(tx: TenantTx, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string; }>
interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string; }; target?: { kind: string; id: string; }; payload?: Record<string, unknown>; origin?: AuditOrigin; mk?: { traceId?: string; requestId?: string; jti?: string; }; }
// add-identity-model (src/identity)
type UserKind = "human" | "service"
type UserState = "active" | "disabled"
interface User { readonly userId: string; readonly kind: UserKind; readonly ownerUserId: string | null; readonly displayName: string; readonly email: string | null; readonly state: UserState; }
interface IdentityOptions { ids?: IdSource; clock?: Clock; }
type IdentityErrorCode = "IDENTITY_INVALID" | "IDENTITY_NO_ORGANIZATION" | "IDENTITY_AMBIGUOUS_ORGANIZATION" | "IDENTITY_UNKNOWN_TENANT" | "IDENTITY_IDP_TAKEN" | "IDENTITY_OWNER_REQUIRED" | "IDENTITY_USER_DISABLED" | "IDENTITY_OWNER_INVALID" | "IDENTITY_TENANT_MISMATCH"
class IdentityError extends Error { readonly code: IdentityErrorCode; constructor(code: IdentityErrorCode, message: string); }
function getUser(tx: TenantTx, ctx: TenantContext, userId: string): Promise<User | null>
function createServiceAccount(tx: TenantTx, ctx: TenantContext, input: { displayName: string; ownerUserId: string; }, opts?: IdentityOptions): Promise<User>
function upsertUserFromClaims(tx: TenantTx, ctx: TenantContext, claims: TokenClaims, opts?: IdentityOptions): Promise<User>
interface TokenClaims { issuer: string; subject: string; email?: string | undefined; name?: string | undefined; preferredUsername?: string | undefined; }
function provisionTenantIdp(ownerPool: TenantPool, ctx: TenantContext, idp: IdpPair, opts?: IdentityOptions): Promise<void>
interface IdpPair { issuer: string; organization: string; }
```

## Facts from the merged code

- `src/db/migrations/0002_tenancy.sql:7-11`: `ALTER TABLE ursitoare.tenant ENABLE ROW LEVEL SECURITY;` (no `FORCE`), policy `tenant_isolation` `USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true))`, and line 11 `GRANT SELECT ON TABLE ursitoare.tenant TO ursitoare_app;`. The column `review_profile text NOT NULL DEFAULT 'solo' CHECK (review_profile IN ('solo', 'team'))` is on line 4.
- `src/db/migrations/0100_identity.sql:42-45`: `GRANT SELECT, INSERT ON TABLE ursitoare."user" TO ursitoare_app;`, `GRANT UPDATE (display_name, email, state, updated_at) ON TABLE ursitoare."user" TO ursitoare_app;`, `GRANT SELECT, INSERT ON TABLE ursitoare.idp_link TO ursitoare_app;`, `GRANT SELECT ON TABLE ursitoare.tenant_idp TO ursitoare_app;`. The three tables have forced row-level security (lines 32-39); `idp_link` has the primary key `(tenant_id, issuer, subject)`, `user_id` and `linked_at`.
- `src/identity/schema.test.ts:156-172`: the test `C-0965869a Privileges are narrow` asserts `{ code: "42501" }` for `"DELETE FROM ursitoare.idp_link"` among others. `src/tenancy/schema.test.ts:417` and `src/tenancy/tx.test.ts:449` assert that `UPDATE ursitoare.tenant SET name = 'x'` fails with `42501` for the app role (a column grant on `review_profile` leaves that true).
- `src/tenancy/routes.ts:139-141`: `resolveTenantBy` runs `SELECT review_profile FROM ursitoare.tenant WHERE tenant_id = $1` on each resolution, so a changed profile reaches the next request's `TenantContext`.
- `src/identity/users.ts:3-7`: the file imports only `../core`, `./errors`, `./text` and `../tenancy`; it has no audit import, so `createServiceAccount` and `upsertUserFromClaims` append no event. Lines 101-102: `upsertUserFromClaims` takes `pg_advisory_xact_lock(hashtextextended($1, 0))` with the text `` `ursitoare:idp_link:${ctx.tenantId}\n${issuer}\n${subject}` ``; line 189: `ORDER BY user_id COLLATE "C"`.
- `src/identity/users.ts:224-225`: `createServiceAccount` throws `identityError("IDENTITY_OWNER_INVALID")` unless the owner row is `kind === "human"` and `state === "active"`.
- `src/identity/text.ts:5-14`: `requireText(value, max)` throws `IDENTITY_INVALID` for a non-string, an empty or too long string, one not well formed, with NUL or a newline, or different from its trim.
- `src/audit/event.ts:16,25`: `const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;` and `const SECRET_PARTS = ["password", "secret", "token", "apikey", "credential"];` (payload keys containing one fail). `src/audit/append.ts:30-37`: `appendAudit` throws `AuditError("AUDIT_CONTEXT_MISMATCH", ...)` when `app.tenant_id` is unset or differs from `ctx.tenantId`.
- `src/tenancy/catalog.ts:8-12,206-225`: `CATALOG_GLOBAL_TABLES` is `["schema_migration", "tenant", "tenant_route"]`, so `tenant` is outside the per-table rules; the checks on the app role read only `rolsuper`, `rolbypassrls`, membership of the owner role (`APP_ROLE_PRIVILEGED`) and `c.relowner = $1` (`APP_ROLE_OWNS_RELATION`), never its table or column grants.
- `test/arch/modules.ts:10-13`: `identity: { allowed: ["core", "config", "db", "tenancy", "audit", "observability"], egress: "oidc" }`.
