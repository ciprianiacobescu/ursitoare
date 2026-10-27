# Delivered shapes taken by add-identity-model

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
const systemClock: Clock;
function fixedClock(iso: string): Clock;
interface IdSource { next(prefix: string): string; }
const systemIds: IdSource;
function sequentialIds(seed?: number): IdSource;
// add-db-foundation (src/db)
function createPool(source: string | EndpointLike, opts?: PoolOptions): pg.Pool;
// add-db-foundation (test/support/pg.ts)
function freePort(): Promise<number>;
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>;
// add-tenancy-foundation (src/tenancy)
type ReviewProfile = "solo" | "team";
type TenancyErrorCode = "TENANT_INVALID" | "TENANT_CONTEXT_MISSING" | "TENANT_UNKNOWN" | "TENANT_ROUTE_CONFLICT" | "TENANT_ROUTE_RESERVED" | "TENANT_DEFAULT_CONFLICT" | "TENANT_BOOTSTRAP_FAILED" | "TENANT_TX_ABORTED";
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">;
type TenantTx = Pick<pg.PoolClient, "query">;
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>;
function registerTenantRoute(tx: TenantTx, kind: string, key: string): Promise<RouteRegistration>;
function resolveTenantBy(pool: TenantPool, kind: string, key: string): Promise<TenantContext | null>;
function hashRouteKey(key: string): Buffer;
class TenancyError extends Error { readonly code: TenancyErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: TenancyErrorCode, message: string, details?: Record<string, string | number>); }
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>;
// add-tenancy-foundation (test/support/tenants.ts)
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>;
```
