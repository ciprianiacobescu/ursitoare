# Delivered shapes taken by add-roles-and-memberships

The merged names this change takes, as main@e226f8c declares them (`tsc --emitDeclarationOnly`, without `export` and `declare`). The code is the truth.

```ts
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
function fixedClock(iso: string): Clock
interface IdSource { next(prefix: string): string; }
function sequentialIds(seed?: number): IdSource
// add-engine-skeleton (src/observability, src/api)
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock; }): Logger
function buildServer(deps: ServerDeps): Promise<FastifyInstance>
// add-db-foundation (src/db/pool.ts, test/support/pg.ts)
function createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>
// add-tenancy-foundation (src/tenancy, test/support/tenants.ts)
type ReviewProfile = "solo" | "team"
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
interface CatalogViolation { readonly rule: CatalogRule; readonly object: string; }
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>
// add-audit-chain (src/audit)
interface AppendOptions { clock?: Clock; }
function appendAudit(tx: TenantTx, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string; }>
interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string; }; target?: { kind: string; id: string; }; payload?: Record<string, unknown>; origin?: AuditOrigin; mk?: { traceId?: string; requestId?: string; jti?: string; }; }
// add-identity-model (src/identity)
interface IdentityOptions { ids?: IdSource; clock?: Clock; }
interface TokenClaims { issuer: string; subject: string; email?: string | undefined; name?: string | undefined; preferredUsername?: string | undefined; }
function upsertUserFromClaims(tx: TenantTx, ctx: TenantContext, claims: TokenClaims, opts?: IdentityOptions): Promise<User>
function createServiceAccount(tx: TenantTx, ctx: TenantContext, input: { displayName: string; ownerUserId: string; }, opts?: IdentityOptions): Promise<User>
interface User { readonly userId: string; readonly kind: UserKind; readonly ownerUserId: string | null; readonly displayName: string; readonly email: string | null; readonly state: UserState; }
function provisionTenantIdp(ownerPool: TenantPool, ctx: TenantContext, idp: IdpPair, opts?: IdentityOptions): Promise<void>
interface IdpPair { issuer: string; organization: string; }
// add-pdp-cedar (src/pdp/types.ts)
type PolicyLayer = "platform" | "tenant"
interface Pdp { readonly policySetVersion: string; readonly actions: readonly string[]; readonly policies: readonly { id: string; layer: PolicyLayer }[]; check(req: PolicyRequest): Promise<Decision>; }
interface PolicyRequest { principal: EntityUid; action: string; resource: EntityUid; context: Record<string, unknown>; entities: Entity[]; egress?: Egress; }
interface Decision { decision: "allow" | "deny"; decisionId: string; decidedAt: string; reasons: string[]; errors: string[]; policySetVersion: string; permit?: Permit; }
// add-e2e-stack (test/support/e2e-stack/part.ts, database-part.ts, discover.ts)
class E2eStackError extends Error { code: string; details: Readonly<Record<string, string | number | string[]>>; constructor(code: string, message: string, details?: Record<string, string | number | string[]>, options?: { cause?: unknown; }); }
interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void>; }
type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle>; }>
interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void>; }
type DatabaseApi = Readonly<{ host: "127.0.0.1"; port: number; database: string; ownerUrl: string; }>
function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi
const databasePart: E2eStackPart
function discoverParts(dir?: string): Promise<E2eStackPart[]>
// add-fake-oidc (test/support/fake-oidc/types.ts)
function startFakeOidc(opts?: { port?: number; host?: string; now?: () => Date; redirectUri?: string; }): Promise<FakeOidc>
interface FakeOidc { readonly issuer: string; readonly url: string; clientSecret(clientId: string): string; passwordOf(username: string): string; mintToken(opts: MintOptions): string; rotateSigningKey(): void; registerRedirect(uri: string, opts?: { clientId?: string; postLogout?: boolean; }): void; requests(): RecordedRequest[]; close(): Promise<void>; }
```

## Facts from the merged code

- `src/tenancy/tx.ts:21`: `withTenantTx` runs `await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);`; `inTransaction` ends with `set_config('app.tenant_id', '', false)` (line 56).
- `src/audit/append.ts:30-37`: `appendAudit` reads `SELECT nullif(current_setting('app.tenant_id', true), '') AS t` and throws `AuditError("AUDIT_CONTEXT_MISMATCH", ...)` when it is unset or differs from `ctx.tenantId`.
- `src/audit/event.ts:16`: `const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;` (for `eventType` and `target.kind`); `isIdentifier` (lines 49-56) accepts an actor or target id of 1 to 200 well-formed characters without control characters.
- `src/db/migrations/0002_tenancy.sql:7,11`: `ALTER TABLE ursitoare.tenant ENABLE ROW LEVEL SECURITY;` (the file has no `FORCE`) and `GRANT SELECT ON TABLE ursitoare.tenant TO ursitoare_app;`: only the owner inserts tenants, and the owner sees every row.
- `src/tenancy/bootstrap.ts:66,88`: `ensureDefaultTenant` runs `return await inTransaction(pool, async (client) => {` and `INSERT INTO ursitoare.tenant (tenant_id, name, created_at)`, with no tenant setting active. `test/support/tenants.ts:12`: `seedTwoTenants` runs `INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_a', 'Tenant A'), ('tenant_b', 'Tenant B') ON CONFLICT DO NOTHING` on `db.ownerPool`.
- `src/db/roles.ts:12`: `const ROLE_ATTRIBUTES = "LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS";`: the owner is bound by `FORCE ROW LEVEL SECURITY` tables.
- `src/tenancy/catalog.ts:53`: `const TENANT_PREDICATE = "(tenant_id = current_setting(''app.tenant_id''::text, true))";` is the accepted policy text; lines 85-107 flag a non-primary unique index whose first column is not `tenant_id` and a foreign key that does not map `tenant_id` to the referenced `tenant_id`.
- `test/support/fake-oidc/seed.ts:52-55`: `seedUser("alice", "org-a", ["ursitoare-authors", "team-finance"])`, `seedUser("bob", "org-a", ["ursitoare-approvers", "team-finance"])`, `seedUser("carol", "org-a", ["ursitoare-admins"])`, `seedUser("mallory", "org-b", ["ursitoare-authors"])`; `tokens.ts:50`: ID token claims always hold `groups: [...user.groups],`.
- `test/support/e2e-stack/database-part.ts:39,54-55,159`: `const states = new WeakMap<PartHandle, DatabaseState>();` and `databaseApi` uses `const state = handle === undefined ? undefined : states.get(handle);`, so only the handle `databasePart` made works; its `seed` runs `await ensureDefaultTenant(ownerPool, E2E_TENANT_NAME, {`. The stack seeds parts in file-name order after start and again on every reset (`reset.ts`).
- `test/arch/rules.ts:377` (`checkModuleGraph`): `if (isTestFile(file.path)) continue;`, so a `*.test.ts` file may import any module; `test/arch/modules.ts:10-13`: `identity: { allowed: ["core", "config", "db", "tenancy", "audit", "observability"], egress: "oidc" }`.
- `src/pdp/load.ts:146` and `212-214`: `const id = json.json.annotations?.["id"];` and `const policies = [...byId.entries()].map(([id, entry]) => ({ id, layer: entry.layer }))` (then sorted by id): `Pdp.policies` lists the `@id` annotation values of the loaded permits, not the fragment source ids.
