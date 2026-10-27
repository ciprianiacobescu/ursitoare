# Delivered shapes taken by add-web-sign-in

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-web-shell (web/src/api/client.ts)
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }); }
type QueryValue = string | number | boolean | undefined;
interface RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown; }
interface ApiClient { request<T>(method: string, path: string, opts?: RequestOptions): Promise<T>; get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; delete<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; }
interface ApiClientOptions { baseUrl?: string; fetch?: typeof globalThis.fetch; }
function createApiClient(opts?: ApiClientOptions): ApiClient;
// add-web-shell (web/src/app/features.ts)
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode; }
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
function fixedClock(iso: string): Clock;
interface IdSource { next(prefix: string): string; }
// add-db-foundation (src/db/pool.ts)
interface EndpointLike { url: string; password: { reveal(): string; } | null; }
interface PoolOptions { max?: number; connectionTimeoutMs?: number; idleTimeoutMs?: number; statementTimeoutMs?: number; applicationName?: string; onError?: (err: Error) => void; }
function createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool;
// add-db-foundation (test/support/pg.ts)
interface TestCluster { host: string; port: number; adminUrl: string; ownerPassword: string; appPassword: string; template: string; }
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>;
// add-tenancy-foundation (src/tenancy)
type ReviewProfile = "solo" | "team";
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">;
type TenantTx = Pick<pg.PoolClient, "query">;
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>;
interface EnsureTenantOptions { ids?: IdSource; clock?: Clock; }
function ensureDefaultTenant(pool: TenantPool, name: string, opts?: EnsureTenantOptions): Promise<TenantContext>;
// add-tenancy-foundation (test/support/tenants.ts)
const TENANT_B_ID: string;
// add-e2e-stack (test/support/e2e-stack/part.ts)
class E2eStackError extends Error { code: string; details: Readonly<Record<string, string | number | string[]>>; constructor(code: string, message: string, details?: Record<string, string | number | string[]>, options?: { cause?: unknown }); }
interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void>; }
type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle>; }>;
interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void>; }
// add-e2e-stack (test/support/e2e-stack/database-part.ts)
const E2E_TENANT_NAME: string;
type DatabaseApi = Readonly<{ host: "127.0.0.1"; port: number; database: string; ownerUrl: string; }>;
function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi;
// add-e2e-stack (test/support/e2e-stack/stack.ts, discover.ts)
type E2eStack = Readonly<{ url: string; controlUrl: string; handles: ReadonlyMap<string, PartHandle>; close(): Promise<void>; }>;
interface StackOptions { port?: number; controlPort?: number; dataDir?: string; parts?: readonly E2eStackPart[]; log?: boolean; }
function startE2eStack(opts?: StackOptions): Promise<E2eStack>;
function discoverParts(dir?: string): Promise<E2eStackPart[]>;
// add-e2e-stack (test/support/e2e-stack/faults.ts, control.ts)
interface Fault { method: string; url: string; delayMs?: number; status?: number; }
interface FaultTable { add(fault: Fault): void; clear(): void; list(): Fault[]; hook(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply | undefined>; }
function createFaultTable(opts?: { sleep?: (ms: number) => Promise<void>; }): FaultTable;
type ControlServer = Readonly<{ url: string; close(): Promise<void>; }>;
function startControlServer(deps: { port: number; faults: FaultTable; reset(): Promise<void>; }): Promise<ControlServer>;
```

## Facts from the merged code

At main@bd7f38e.

- `src/db/migrations/0002_tenancy.sql:7` is `ALTER TABLE ursitoare.tenant ENABLE ROW LEVEL SECURITY;` with no `FORCE`, and no migration forces it. The table's owner therefore bypasses its policy, so a raw owner `INSERT` into `ursitoare.tenant` (task 4.2) works without `app.tenant_id` or `withTenantTx`.
- `src/tenancy/catalog.ts:6` `CATALOG_GLOBAL_TABLES` is `["schema_migration", "tenant", "tenant_route"]` (asserted in `src/tenancy/catalog.test.ts:112`), which exempts `tenant` from the `rls_not_forced` rule.
- `src/tenancy/bootstrap.ts:71-73`: `ensureDefaultTenant` itself reads `ursitoare.tenant` with a raw owner query.
- `src/tenancy/bootstrap.ts:71-84`: `ensureDefaultTenant` first runs `SELECT tenant_id, review_profile FROM ursitoare.tenant WHERE name = $1` and returns that tenant when found; only when no tenant of that name exists and another tenant does, it throws `TENANT_DEFAULT_CONFLICT`. A re-seed after tenant B exists finds the default tenant by name and succeeds, whether or not `/reset` removed tenant B.
