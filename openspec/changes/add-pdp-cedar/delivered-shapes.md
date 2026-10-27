# Delivered shapes taken by add-pdp-cedar

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
function fixedClock(iso: string): Clock;
interface IdSource { next(prefix: string): string; }
function sequentialIds(seed?: number): IdSource;
type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
// add-engine-skeleton (src/observability)
type Logger = PinoLogger; // PinoLogger is Logger from "pino"
interface LogDestination { write(line: string): void; }
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock; }): Logger;
// add-db-foundation (src/db)
function ensurePartitions(ownerPool: pg.Pool, clock: { now(): Date; }, opts?: { monthsBack?: number; monthsAhead?: number; }): Promise<{ created: string[]; skipped: string[]; }>;
interface EndpointLike { url: string; password: { reveal(): string; } | null; }
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
const TENANT_ID_PATTERN: RegExp;
type CatalogRule = "not_tenant_leading" | "unique_not_tenant_leading" | "fk_not_tenant_scoped" | "rls_not_enabled" | "rls_not_forced" | "no_tenant_policy" | "partition_open_to_app" | "view_open_to_app" | "route_table_open" | "definer_function_unsafe" | "app_role_missing" | "app_role_privileged" | "app_role_owns_relation";
interface CatalogViolation { readonly rule: CatalogRule; readonly object: string; }
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>;
// add-tenancy-foundation (test/support/tenants.ts)
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>;
```
