# Delivered shapes taken by add-api-pep

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-engine-skeleton (src/api/errors.ts)
class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown);
}
// add-engine-skeleton (src/api/server.ts)
interface ServerDeps { readonly version: string; readonly ids: IdSource; readonly logger: Logger; readonly tracer: Tracer; readonly health?: HealthRegistry; readonly healthCheckTimeoutMs?: number; }
function buildServer(deps: ServerDeps): Promise<FastifyInstance>
// add-engine-skeleton (src/core/clock.ts)
interface Clock { now(): Date; }
const systemClock: Clock
// add-engine-skeleton (src/config)
type Env = Readonly<Record<string, string | undefined>>
type ConfigErrorCode = "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY"
class ConfigError extends Error { readonly code: ConfigErrorCode; readonly variable: string; constructor(code: ConfigErrorCode, variable: string, reason: string); }
interface AppConfig {
  readonly role: Role;
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly publicBaseUrl: string;
  readonly webDist: string | null;
  readonly shutdownDrainMs: number;
  readonly engineKey: Secret | null;
  readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null; };
}
function loadConfig(env: Env, readSecret?: SecretReader): AppConfig
// add-engine-skeleton (src/main.ts)
interface MainDeps {
  loadConfig: () => AppConfig;
  destination: LogDestination;
  signals: SignalSource;
  exit: (code: number) => void;
  openDatabase?: typeof openDatabase;
  configureServer?: (server: FastifyInstance) => void | Promise<void>;
}
function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>
// add-db-foundation (src/db/open.ts)
interface Database { appPool: pg.Pool; close(): Promise<void>; }
function openDatabase(config: { database: { app: EndpointLike | null; owner: EndpointLike | null; }; }, deps: OpenDeps): Promise<Database | null>
// add-db-foundation (test/support/pg.ts)
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>
function freePort(): Promise<number>
// add-tenancy-foundation (src/tenancy)
type ReviewProfile = "solo" | "team"
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
// add-tenancy-foundation (test/support/tenants.ts)
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>
// add-web-shell (src/api/web.ts)
interface WebAppOptions { readonly distDir: string; }
function registerWebApp(server: FastifyInstance, opts: WebAppOptions): void
```
