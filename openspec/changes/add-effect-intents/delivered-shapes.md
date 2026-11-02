# Delivered shapes taken by add-effect-intents

Declarations copied from main@e06fdb3 (`file:line`); the code is the truth. Sibling shapes are quoted from their folders.

```ts
// src/tenancy/tx.ts:6,8,14-18; context.ts:5-10; catalog.ts:269-272
export type TenantPool = Pick<pg.Pool, "connect">;
export type TenantTx = Pick<pg.PoolClient, "query">;
export async function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
export interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
export async function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string }): Promise<CatalogViolation[]>
// test/support/tenants.ts:8-10; pg.ts:208-217, 280-283
export async function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>
export interface TestDatabase { ownerPool: pg.Pool; appPool: pg.Pool; appEndpoint: EndpointLike; close(): Promise<void>; /* other members omitted */ }
export async function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase>
// src/db/pool.ts:5-8, 56
export interface EndpointLike { url: string; password: { reveal(): string } | null; }
export function createPool(source: string | EndpointLike, opts: PoolOptions = {}): pg.Pool
// src/core/clock.ts:1-3, 5, 11; ids.ts:6-8, 61, 63; config/config.ts:209
export interface Clock { now(): Date; }
export const systemClock: Clock = { now(): Date { return new Date(); } };
export function fixedClock(iso: string): Clock
export interface IdSource { next(prefix: string): string; }
export const systemIds: IdSource = createIds(systemClock);
export function sequentialIds(seed = 0): IdSource
export function loadConfig(env: Env, readSecret?: SecretReader): AppConfig
// src/authoring: canonical.ts:114; validate/validate.ts:51; format/catalogue.ts:5-14 (BlockDef.unsafe_to_retry?: boolean)
export function canonicalizeFlow(doc: unknown): unknown
export function validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult
// test/support/catalogue/loader.ts:85; flows.ts:43; e2e-stack/database-part.ts:24
export function loadTestCatalogue(path?: string): TestCatalogue
export function parseCatalogueFlow(text: string, label: string): Flow
export const E2E_TENANT_NAME: string = "E2E tenant";
```

## Sibling shapes used (quoted from their folders)

```ts
// add-envelope-store
export type PayloadValue = null | boolean | number | string | PayloadValue[] | { [key: string]: PayloadValue };
export type RunMode = "live" | "mock" | "stub";
export function payloadDigest(value: PayloadValue): string;   // 64 lowercase hex, SHA-256 of canonical JSON
export function createRunStore(pool: TenantPool): RunStore;    // each call in its own withTenantTx
// add-interpreter-core (the port implemented by shape)
export interface ToolCall { tool: string; args: JsonValue; nodeId: string; effectSeq: number; phase?: "pre" | "post"; hookId?: string }
export type EffectDecision =
  | { action: "invoke"; idemKey: string | null }
  | { action: "reuse"; idemKey: string; result: ToolResult }
  | { action: "unknown"; idemKey: string };
export interface EffectGate {
  before(call: ToolCall, ctx: StepContext): Promise<EffectDecision>;
  after(call: ToolCall, ctx: StepContext, result: ToolResult): Promise<void>;
}
```

Every other sibling name is used with the signature in its proposal's "Interfaces given".

## Facts from the merged code

- `src/tenancy/tx.ts:21`: `await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);` so `current_setting('app.tenant_id', true)` is what a tenant check reads, and forced RLS applies to the owner pool too (an owner read of `effect_intent` or `envelope_payload` goes through `withTenantTx(db.ownerPool, ctx, ...)`). `:31`: `const client = await pool.connect();` runs before the `try`, so a rejecting `connect` reaches the caller as the same error object.
- `src/db/migrate.ts:197-199`: `await client.query("BEGIN");` ... `await client.query("SET LOCAL search_path = ursitoare, pg_catalog");` one transaction per file; `src/identity/admin/schema.test.ts:17-18` reads the ledger `WHERE version = 180` and expects the name `admin_api`, so `0340_effect_intent.sql` is version 340, name `effect_intent`.
- `src/tenancy/catalog.ts:53`: `const TENANT_PREDICATE = "(tenant_id = current_setting(''app.tenant_id''::text, true))";` is the policy form `checkTenancyCatalog` accepts.
- `test/support/catalogue/blocks.v0.json:73-74`: `"erp.create_payment@1": {` `"effect": "pay",`; no block of the file has `unsafe_to_retry`, so `payOnceCatalogue({ unsafePay: true })` adds it.
- `test/support/e2e-stack/database-part.ts:159-160`: `await ensureDefaultTenant(ownerPool, E2E_TENANT_NAME, {` `ids: sequentialIds(1),`: the stack database holds one tenant named `E2E tenant`, whose id the parent reads as owner.
- `test/arch/modules.ts:20`: `runs: { allowed: ["core", "db", "tenancy", "durable"] },` so `src/runs/intents` may not import `interpreter` or `authoring`. `src/authoring/format/types.ts:3-9`: `JsonValue` is the same recursive union as `PayloadValue`.
