# Delivered shapes taken by add-audit-chain

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
const systemClock: Clock;
function fixedClock(iso: string): Clock;
// add-db-foundation (src/db)
function ensurePartitions(ownerPool: pg.Pool, clock: { now(): Date; }, opts?: { monthsBack?: number; monthsAhead?: number; }): Promise<{ created: string[]; skipped: string[]; }>;
// add-db-foundation (test/support/pg.ts)
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>;
// add-tenancy-foundation (src/tenancy)
type ReviewProfile = "solo" | "team";
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">;
type TenantTx = Pick<pg.PoolClient, "query">;
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>;
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>;
// add-tenancy-foundation (test/support/tenants.ts)
const TENANT_A_ID: string;
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>;
```
