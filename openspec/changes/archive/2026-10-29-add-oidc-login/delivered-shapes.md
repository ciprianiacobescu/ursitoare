# Delivered shapes taken by add-oidc-login

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
const systemClock: Clock;
type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
interface IdSource { next(prefix: string): string; }
function sequentialIds(seed?: number): IdSource;
// add-engine-skeleton (src/config; readSecretValue is defined in src/config/secret.ts and is not re-exported by src/config/index.ts)
type Env = Readonly<Record<string, string | undefined>>;
type Role = "all" | "api" | "worker" | "sandbox";
interface DatabaseEndpoint { readonly url: string; readonly password: Secret | null; }
interface AppConfig { readonly role: Role; readonly host: string; readonly port: number; readonly logLevel: LogLevel; readonly publicBaseUrl: string; readonly webDist: string | null; readonly shutdownDrainMs: number; readonly engineKey: Secret | null; readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null; }; }
function loadConfig(env: Env, readSecret?: SecretReader): AppConfig;
type SecretReader = (path: string) => string;
class Secret { #private; constructor(value: string); reveal(): string; toJSON(): string; toString(): string; [inspect.custom](): string; }
function readSecretValue(variable: string, path: string, readSecret: SecretReader): Secret;
type ConfigErrorCode = "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY";
class ConfigError extends Error { readonly code: ConfigErrorCode; readonly variable: string; constructor(code: ConfigErrorCode, variable: string, reason: string); }
// add-engine-skeleton (src/main.ts)
interface RunningServer { url: string; close(): Promise<void>; }
interface MainDeps { loadConfig: () => AppConfig; destination: LogDestination; signals: SignalSource; exit: (code: number) => void; openDatabase?: typeof openDatabase; configureServer?: (server: FastifyInstance) => void | Promise<void>; }
function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>;
// add-engine-skeleton (src/api; ServerDeps and the types it names)
interface ServerDeps { readonly version: string; readonly ids: IdSource; readonly logger: Logger; readonly tracer: Tracer; readonly health?: HealthRegistry; readonly healthCheckTimeoutMs?: number; }
function buildServer(deps: ServerDeps): Promise<FastifyInstance>;
type Signal = "SIGTERM" | "SIGINT";
interface SignalSource { on(signal: Signal, handler: () => void): unknown; off(signal: Signal, handler: () => void): unknown; }
type HealthStatus = "ok" | "fail";
type HealthCheck = () => Promise<HealthStatus>;
type HealthFailureReason = "returned_fail" | "threw" | "timeout" | "invalid_result";
interface HealthReport { status: HealthStatus; checks: Record<string, HealthStatus>; failures: { name: string; reason: HealthFailureReason; }[]; }
interface HealthRegistry { registerHealthCheck(name: string, check: HealthCheck): void; run(timeoutMs: number): Promise<HealthReport>; }
// add-engine-skeleton (src/observability)
type Logger = PinoLogger; // PinoLogger is Logger from "pino"
interface LogDestination { write(line: string): void; }
type SpanValue = string | number | boolean;
interface Span { setAttribute(key: string, value: SpanValue): void; end(): void; }
interface Tracer { startSpan(name: string, attrs?: Readonly<Record<string, SpanValue>>): Span; }
const noopTracer: Tracer;
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock; }): Logger;
// add-db-foundation (src/db)
interface EndpointLike { url: string; password: { reveal(): string; } | null; }
interface Database { appPool: pg.Pool; close(): Promise<void>; }
interface OpenDeps { health: { registerHealthCheck(name: string, check: () => Promise<"ok" | "fail">): void; }; logger: { warn(obj: object, msg: string): void; }; openTimeoutMs?: number; sleep?: (ms: number) => Promise<void>; clock?: { now(): Date; }; }
function openDatabase(config: { database: { app: EndpointLike | null; owner: EndpointLike | null; }; }, deps: OpenDeps): Promise<Database | null>;
// add-db-foundation (src/db: the runner that applies 0120_sessions.sql; MigrateOptions is a non-exported interface)
interface MigrateOptions { lockTimeoutMs?: number; }
function migrate(pool: pg.Pool, dir?: string, opts?: MigrateOptions): Promise<{ applied: string[]; }>;
// add-db-foundation (test/support/pg.ts)
interface TestCluster { host: string; port: number; adminUrl: string; ownerPassword: string; appPassword: string; template: string; }
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>;
function freePort(): Promise<number>;
// add-tenancy-foundation (src/tenancy)
type ReviewProfile = "solo" | "team";
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">;
type TenantTx = Pick<pg.PoolClient, "query">;
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>;
type RouteRegistration = "created" | "exists";
function registerTenantRoute(tx: TenantTx, kind: string, key: string): Promise<RouteRegistration>;
function resolveTenantBy(pool: TenantPool, kind: string, key: string): Promise<TenantContext | null>;
function hashRouteKey(key: string): Buffer;
interface EnsureTenantOptions { ids?: IdSource; clock?: Clock; }
function ensureDefaultTenant(pool: TenantPool, name: string, opts?: EnsureTenantOptions): Promise<TenantContext>;
type CatalogRule = "not_tenant_leading" | "unique_not_tenant_leading" | "fk_not_tenant_scoped" | "rls_not_enabled" | "rls_not_forced" | "no_tenant_policy" | "partition_open_to_app" | "view_open_to_app" | "route_table_open" | "definer_function_unsafe" | "app_role_missing" | "app_role_privileged" | "app_role_owns_relation";
interface CatalogViolation { readonly rule: CatalogRule; readonly object: string; }
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>;
// add-tenancy-foundation (test/support/tenants.ts)
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>;
// add-e2e-stack (test/support/e2e-stack/part.ts)
class E2eStackError extends Error { code: string; details: Readonly<Record<string, string | number | string[]>>; constructor(code: string, message: string, details?: Record<string, string | number | string[]>, options?: { cause?: unknown; }); }
interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void>; }
type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle>; }>;
interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void>; }
// add-e2e-stack (test/support/e2e-stack/database-part.ts)
const E2E_TENANT_NAME: string;
type DatabaseApi = Readonly<{ host: "127.0.0.1"; port: number; database: string; ownerUrl: string; }>;
function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi;
// add-e2e-stack (test/support/e2e-stack/discover.ts)
function discoverParts(dir?: string): Promise<E2eStackPart[]>;
```

## Facts from the merged code

Checked at main@bd7f38e.

- `test/support/e2e-stack/stack.ts:88-97`: `stackEnvironment(enginePort, engineKeyFile)` returns `URSITOARE_ROLE: "all"`, `URSITOARE_HOST: "127.0.0.1"`, `URSITOARE_PORT`, ``URSITOARE_PUBLIC_BASE_URL: `http://127.0.0.1:${enginePort}` ``, `URSITOARE_LOG_LEVEL`, `URSITOARE_SHUTDOWN_DRAIN_MS` and `URSITOARE_ENGINE_KEY_FILE: engineKeyFile`. The stack engine therefore has an engine key file and a public base URL equal to the engine origin.
- `test/support/e2e-stack/database-part.ts:106`: the database part sets `URSITOARE_DATABASE_URL: roleUrl(cluster, ROLE_APP, null, E2E_DATABASE)`. The stack engine therefore has a database URL.
