# Delivered shapes (main@e06fdb3)

Declarations this change takes, from the merged code, grouped by file; then the behaviour facts its scenarios rely on.

```ts
// src/db/pool.ts:5-8, :56
export interface EndpointLike { url: string; password: { reveal(): string } | null; }
export function createPool(source: string | EndpointLike, opts: PoolOptions = {}): pg.Pool {
// src/db/roles.ts:7, :9
export const ROLE_OWNER: string = "ursitoare_owner";
export const ROLE_APP: string = "ursitoare_app";
// src/observability/logger.ts:7, :9-11, :47
export type Logger = PinoLogger;
export interface LogDestination { write(line: string): void; }
export function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger {
// src/config/config.ts:11, :21, :29
export type Role = "all" | "api" | "worker" | "sandbox";
  readonly role: Role;
  readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null };
// src/main.ts:103-114, :116
export interface MainDeps { loadConfig: () => AppConfig; destination: LogDestination; signals: SignalSource; exit: (code: number) => void; openDatabase?: typeof openDatabase; configureServer?: (server: FastifyInstance) => void | Promise<void>; inspectServers?: (s: { public: FastifyInstance; internal: FastifyInstance; }) => void | Promise<void>; }
export async function main(deps: Partial<MainDeps> = {}): Promise<RunningServer | null> {
// src/tenancy/tx.ts:14-18; src/tenancy/context.ts:5-8
export async function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
export interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
// test/support/tenants.ts:7-9
export async function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }> {
// test/support/pg.ts:208-217, :280-283
export interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
export async function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase> {
// test/support/e2e-stack/part.ts:19-38 (E2eStackError :3-17 has code, details, cause)
export interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void>; }
export type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle>; }>;
export interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void>; }
// test/support/e2e-stack/reset.ts:7-12
export function createResetRunner(deps: { parts: readonly E2eStackPart[]; context(part: E2eStackPart): PartContext; faults: FaultTable; engineHealthy(): Promise<boolean>; }): { seedAll(): Promise<void>; reset(): Promise<void> } {
// test/support/e2e-stack/database-part.ts:22, :61; stack.ts:101
export const E2E_TEMPLATE: string = "ursitoare_e2e_template";
export function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi {
export async function startE2eStack(opts: StackOptions = {}): Promise<E2eStack> {
// test/arch/sources.ts:28-33, :44-47, :129-134, :162
export interface Violation { code: string; file: string; line: number; message: string; }
export interface Snapshot { files: SourceFile[]; srcDirs: string[]; }
export function collectImports(file: SourceFile): ImportRef[] {
```

## Facts from the merged code

- `src/main.ts:137`: `database = await (deps.openDatabase ?? openDatabase)(config, { health, logger });`. Frozen tests stub `openDatabase` while the config says `database: { app: null, owner: null }` (`src/main.configure.test.ts:50`, `:83`), so the launch reads `config.database.app`.
- `src/main.ts:251-255`: `closeAll` closes `server`, `internal`, then `database`. `src/main.ts:56-68` (`fatalFields`) copies a string `error.code` and a string `error.details.reason`.
- `src/db/open.ts:105`: `deps.health.registerHealthCheck("db", createDbHealthCheck(pool));` is the only check; frozen `C-fb007fe9` and `C-f55456d0` assert `checks` is `{ db: "ok" }`.
- `src/db/pool.ts:72-73`: `const parameters = [...parsed.searchParams.entries()];` and `if (parameters.some(([key]) => key !== "sslmode")) invalid("unsupported_parameter");`, which throws `DbError` `DB_INVALID` for `?foo=1` (checked by running `createPool`); the spec proves `config_failed` through it only.
- `test/support/e2e-stack/reset.ts:57-63`: `reset()` runs `deps.faults.clear()`, `seedParts("STACK_RESET_FAILED")`, `probeEngine()` through one serial queue; `seedParts` (`:24-40`) wraps a failure as `E2eStackError(code, "Seed failed for part: <name>", { part })`. `part.ts:46-57` `validatePart` throws `STACK_PART_INVALID` unless `start` is a function and `seed` is undefined or one.
- `test/support/e2e-stack/database-part.ts:149-152` seeds with `DROP DATABASE IF EXISTS "ursitoare_e2e" WITH (FORCE)` then `CREATE DATABASE ... TEMPLATE "ursitoare_e2e_template"` (SQLSTATE 55006 if a session is on the template); `:102` builds `ownerUrl` as `postgres://ursitoare_owner:<password>@127.0.0.1:<port>/ursitoare_e2e`.
- `test/support/e2e-stack/stack.ts:91` sets `URSITOARE_ROLE: "all"`; `:266-277` runs `seedAll()` then `main(...)` in the same process; `:211-217` closes handles in reverse order; `:315-323` closes the engine first.
- `test/support/e2e-stack/stack.db.test.ts:213-221` (frozen): every `ursitoare_e2e` session not named `e2e-stack` or `e2e-test` uses `ursitoare_app`.
- `test/support/global-setup.ts:52`: `await prepareDatabase(ownerPool, systemClock);`; the owner pool ends in `finally`, before any clone. `src/tenancy/tx.ts:21`: `await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);`.
- `test/arch/modules.ts:19`: `durable: { allowed: ["core", "config", "db", "observability"] },`. `package.json:33` (scaffold eb7ef13) pins `"@dbos-inc/dbos-sdk": "5.3.0",`; no task of this change touches `package.json` or the lockfile.
- DBOS 5.3.0 facts (spike `ursitoare-spikes/dbos-reset`, a probe on embedded Postgres 18.4): `design.md` decisions 3 and 5.
