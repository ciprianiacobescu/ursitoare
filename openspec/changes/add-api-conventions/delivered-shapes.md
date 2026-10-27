# Delivered shapes taken by add-api-conventions

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
// add-engine-skeleton (src/core)
interface Clock { now(): Date; }
function sequentialIds(seed?: number): IdSource
// add-engine-skeleton (src/observability)
const noopTracer: Tracer
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock; }): Logger
// add-engine-skeleton (src/config/config.ts)
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
// add-engine-skeleton (src/main.ts)
const VERSION = "0.0.0"
interface RunningServer { url: string; close(): Promise<void>; }
interface MainDeps {
  loadConfig: () => AppConfig;
  destination: LogDestination;
  signals: SignalSource;
  exit: (code: number) => void;
  openDatabase?: typeof openDatabase;
  configureServer?: (server: FastifyInstance) => void | Promise<void>;
}
function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>
// add-db-foundation (test/support/pg.ts)
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void>; }
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>
// add-tenancy-foundation (src/tenancy)
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>
// add-tenancy-foundation (test/support/tenants.ts)
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>
// add-web-shell (src/api/web-paths.ts, exported by src/api/index.ts)
const RESERVED_ROOTS: readonly (readonly string[])[]
// add-web-shell (web/src/app/features.ts)
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode; }
// add-architecture-fitness (test/arch/sources.ts)
interface Violation { code: string; file: string; line: number; message: string; }
interface SourceFile { path: string; text: string; }
interface Snapshot { files: SourceFile[]; srcDirs: string[]; }
function isTestFile(path: string): boolean
function snapshotOf(files: Record<string, string>): Snapshot
function readSnapshot(root?: string): Snapshot
function sortViolations(vs: Violation[]): Violation[]
```
