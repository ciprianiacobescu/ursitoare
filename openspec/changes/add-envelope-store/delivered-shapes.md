# Delivered shapes taken by add-envelope-store

Declarations copied from main@e06fdb3 (`file:line`); the code is the truth.

```ts
// src/tenancy/context.ts:5-10 (add-tenancy-foundation)
export type ReviewProfile = "solo" | "team";
export interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
// src/tenancy/tx.ts:6,8,14-18
export type TenantPool = Pick<pg.Pool, "connect">;
export type TenantTx = Pick<pg.PoolClient, "query">;
export async function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
// src/tenancy/catalog.ts:269-272
export async function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string }): Promise<CatalogViolation[]>
// test/support/tenants.ts:8-10
export async function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>
// src/db/partitions.ts:245-249 (add-db-foundation)
export async function ensurePartitions(ownerPool: pg.Pool, clock: { now(): Date }, opts?: { monthsBack?: number; monthsAhead?: number }): Promise<{ created: string[]; skipped: string[] }>
// src/db/prepare.ts:6-9
export async function prepareDatabase(ownerPool: pg.Pool, clock: { now(): Date }): Promise<{ applied: string[]; partitions: string[] }>
// src/db/migrate.ts:9
export const DEFAULT_MIGRATIONS_DIR: string
// test/support/pg.ts:208-217, 280-283
export interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
export async function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase>
```

## Facts from the merged code

- `src/tenancy/tx.ts:21`: `await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);` so `current_setting('app.tenant_id', true)` is what a tenant check reads.
- `src/db/migrate.ts:197-199`: `await client.query("BEGIN");`, `begun = true;`, `await client.query("SET LOCAL search_path = ursitoare, pg_catalog");` each file runs in one transaction.
- `src/db/partitions.ts:14`: `const TIME_TYPES = new Set(["timestamptz", "timestamp", "date"]);` so a `date` key is supported; `:130`: `if (row.comment !== "partition: day" && row.comment !== "partition: month") {` parents are found by their comment; `:194`: ``const name = `${parent.name}_p${suffix}`;``; `:303`: `created.sort();`.
- `src/db/prepare.ts:11`: `const { created } = await ensurePartitions(ownerPool, clock);` runs after `migrate`.
- `src/db/prepare.test.ts:97-100`: `const clock = { now: () => new Date("2026-10-15T12:00:00Z") };` ... `assert.deepEqual(first.applied, expectedApplied);` and then `assert.deepEqual(first.partitions, [` with ten literal names, five `audit_event_p…` and five `policy_decision_p…`.
- `src/tenancy/catalog.ts:53`: `const TENANT_PREDICATE = "(tenant_id = current_setting(''app.tenant_id''::text, true))";` the policy form `checkTenancyCatalog` accepts.
- `src/db/migrations/0110_policy_decision.sql:17-25`: the pattern for a partitioned table (comment `partition: month`, DEFAULT partition, `ENABLE` and `FORCE ROW LEVEL SECURITY`, policy `USING` and `WITH CHECK` on `tenant_id = current_setting('app.tenant_id', true)`, `GRANT SELECT, INSERT ... TO ursitoare_app`).
- `test/arch/modules.ts:20`: `runs: { allowed: ["core", "db", "tenancy", "durable"] },`
