## Why

Nothing decides who may call the API. `GET /health`, the static handler and the OIDC routes are raw Fastify routes, no request carries a principal, no request calls the policy engine, and a route added tomorrow could skip authentication and policy unnoticed. Sessions (`add-oidc-login`) and policy (`add-pdp-cedar`, `add-policy-catalogue`) exist but are not joined.

Observable result: every route is registered through `defineRoute(server, def)`, which names how it authenticates (`session`, `bearer`, `hmac`, `service_token` or `public`) and, for a non-public route, a known policy action; a kind with no verifier is refused at registration. A session request is authenticated before its body is parsed (401 `UNAUTHENTICATED`), a POST needs the session's `X-CSRF-Token` and a matching `Origin` (403 `CSRF_INVALID`), the resource is loaded under the tenant, `Pdp.check` decides, and every decision is a `policy_decision` row. A denial is a 403 `FORBIDDEN` with `details.decisionId` and an `authz.denied` audit event; if the engine cannot decide or record, the answer is 503 `AUTHZ_UNAVAILABLE` and no handler runs. `GET /api/v1/me` returns `{ user, tenant, capabilities, csrfToken }` for the session's own tenant. An internal listener (`buildInternalServer`, `URSITOARE_INTERNAL_PORT`) takes only `service_token` routes. A coverage test lists every route of both listeners and fails on one that `defineRoute` did not create. This is the API half of exit test 6 (deny on error) and the PEP half of exit test 18.

## What Changes

- `src/api`: `defineRoute`, the verifier registry, `installPep` (authentication, CSRF and Origin, resource loading, policy check, decision log, 401/403/503 envelopes, refusal audit), the list-filter contract, `definePublicRoutes`, `checkRouteCoverage`, `buildInternalServer`, `GET /api/v1/me`; `src/tenancy/profile.ts` (`getTenantProfile`); `test/support/api-session.ts` (`createTestSession`).
- Existing files: `src/api/server.ts` (`GET /health` through `defineRoute`), `src/api/web.ts` (`GET /*` as `public(static)`), `src/main.ts` (engine, PEP, `/me`, OIDC routes as `public(oidc)`, internal listener), `src/config/config.ts` (`URSITOARE_INTERNAL_PORT`).

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: `ServerDeps.listener` (task 2.1), `AppConfig.internalPort` and the `parseInternalPort` export (task 8.1), the `getTenantProfile` export (task 9.1) and the exports of `src/api/index.ts`; tests import each symbol from the file that defines it and read the new members through a cast. The scaffold declares `MainDeps.inspectServers` in `src/main.ts`.
- **Depends on** (evidence is the list under Interfaces taken): `add-engine-skeleton`, `add-db-foundation`, `add-tenancy-foundation`, `add-web-shell`, `add-pdp-cedar`, `add-policy-catalogue`, `add-oidc-login`, `add-audit-chain`, `add-identity-model`. `test/arch/modules.ts` needs no change: `api` may import all of these modules.
- **Files implemented** (stubs from the scaffold): `src/api/{route,pep,coverage,public-group,internal,me,list-filter}.ts`, `src/config/internal.ts`, `src/tenancy/profile.ts`, `test/support/api-session.ts`. **Files created:** `src/api/{types,session-auth,csrf,refusal,decision}.ts` and a `*.test.ts` for each task. **Files changed:** `src/api/{server,web,index}.ts`, `src/main.ts`, `src/config/{config,index}.ts`, `src/tenancy/index.ts`; no existing test changes.
- **Migrations:** none. **Tables:** none. **Env:** `URSITOARE_INTERNAL_PORT` (default 8090). **Endpoints:** `GET /api/v1/me`. **Audit events:** `authz.denied`, `authz.csrf_refused`. **Error codes:** `UNAUTHENTICATED`, `FORBIDDEN`, `CSRF_INVALID`, `AUTHZ_UNAVAILABLE`, and the registration codes of `RouteDefinitionError`.

**Interfaces given** (exact shapes also in `design.md` § Interfaces; declarations omit `export`)

```ts
// src/api/index.ts
type PublicReason = "health" | "oidc" | "static" | "well_known"
type AuthKind = { kind: "session" } | { kind: "bearer"; audience: string } | { kind: "hmac"; hmacKind: string } | { kind: "service_token" } | { kind: "public"; reason: PublicReason }
interface ResourceRef { type: ResourceType; id: string; tenantId: string; attrs?: Record<string, unknown> }
interface SqlPredicate { sql: string; values: unknown[] }
type ListFilter = { kind: "sql"; predicate(p: Principal, first: number): SqlPredicate } | { kind: "item"; canRead(p: Principal, item: unknown): boolean | Promise<boolean> }
interface RouteDef { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; url: string; auth: AuthKind; action?: ActionName; resource?: (req: FastifyRequest) => Promise<ResourceRef | null>; listFilter?: ListFilter; schema: FastifySchema; errors: readonly string[]; handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown> }
function defineRoute(server: FastifyInstance, def: RouteDef): void
function listPredicate(r: FastifyRequest, first: number): SqlPredicate
interface PepDeps { pool: TenantPool | null; engine: PolicyEngine | null; clock: Clock; publicBaseUrl: string }
function installPep(server: FastifyInstance, deps: PepDeps): void
type AuthVerifier = (req: FastifyRequest, auth: AuthKind, deps: PepDeps) => Promise<{ principal: Principal; tenant: TenantContext; session?: SessionContext } | null>
function registerAuthVerifier(kind: Exclude<AuthKind["kind"], "public">, verifier: AuthVerifier): void
class RouteDefinitionError extends Error { code: string; details: Record<string, string>; constructor(code: string, message: string, details?: Record<string, string>) }
interface DefinedRoute { method: string; url: string; auth: AuthKind; action: ActionName | null; errors: readonly string[]; schema: FastifySchema; listener: "public" | "internal" }
function listDefinedRoutes(server: FastifyInstance): DefinedRoute[]
function definePublicRoutes(server: FastifyInstance, reason: PublicReason, register: (s: FastifyInstance) => unknown): Promise<void>
function checkRouteCoverage(server: FastifyInstance): string[]
function buildInternalServer(deps: ServerDeps & { pep?: PepDeps | null }): Promise<FastifyInstance>
function registerMeRoute(server: FastifyInstance, deps: PepDeps): void
// ServerDeps gains listener?: "public" | "internal"; MainDeps gains inspectServers?: (s: { public: FastifyInstance; internal: FastifyInstance }) => void | Promise<void>
// src/config/internal.ts (AppConfig gains internalPort?: number)
function parseInternalPort(env: Env, publicPort: number): number
// src/tenancy/profile.ts (+ index.ts)
function getTenantProfile(tx: TenantTx, ctx: TenantContext): Promise<{ tenantId: string; name: string; reviewProfile: ReviewProfile } | null>
// test/support/api-session.ts
function createTestSession(db: TestDatabase, ctx: TenantContext, subject: string, clock: Clock): Promise<{ cookie: string; userId: string; csrfToken: string }>
```

**Interfaces taken:**

- From `add-engine-skeleton`: `buildServer`, `ServerDeps`, `ApiError`, `Clock`, `systemClock`, `Env`, `ConfigError`, `AppConfig`, `loadConfig`, `main`, `MainDeps`.
- From `add-db-foundation`: `Database`, `openDatabase`; `withTestDatabase`, `TestDatabase`, `freePort`. From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `ReviewProfile`, `withTenantTx`, `seedTwoTenants`; table `ursitoare.tenant`.
- From `add-web-shell`: `registerWebApp`. From `add-pdp-cedar`: `Decision`, `PolicyRequest`, `Entity`, `recordDecision`, `entityRef`; table `ursitoare.policy_decision`.
- From `add-policy-catalogue`: `PolicyEngine`, `createPolicyEngine`, `defaultSrcDir`, `ACTIONS`, `ACTION_NAMES`, `ActionName`, `ResourceType`, `userEntity`, `scopedId`.
- From `add-oidc-login`: `Principal`, `principalOf`, `SessionContext`, `SESSION_COOKIE`, `parseCookies`, `createSession`, `resolveSession`, `issueCsrfToken`, `verifyCsrfToken`, `registerOidcRoutes`.
- From `add-audit-chain`: `appendAuditCommitted`; table `ursitoare.audit_event`. From `add-identity-model`: `getUser`, `upsertUserFromClaims`.

Shapes of the delivered names (declarations from the merged code, main@fb48c96):

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

## Out of scope

Roles, teams and the actions they allow (`add-roles-and-memberships`); bearer, HMAC and service-token verifiers and the routes that use them (`add-mcp-server`, `add-audit-sink` and others); the cursor contract, the error-code registry, `Idempotency-Key` and the OpenAPI document (`add-api-conventions`); capability filtering in the web nav and the CSRF header in the web client (`add-web-ui-kit`, `add-web-sign-in`); any flow, run or task route; rate limiting; a browser journey (no sign-in page exists yet).
