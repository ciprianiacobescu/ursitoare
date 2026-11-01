# Delivered shapes taken by add-block-registry

The merged names this change takes (proposal.md), as declared on main@3142c5f with `export` dropped. Names of `add-flow-format-model` and `add-flow-validator` (not merged) are restated in proposal.md.

```ts
// add-engine-skeleton (src/core, src/observability, src/api/errors.ts, src/api/server.ts, src/main.ts)
interface Clock { now(): Date }
const systemClock: Clock
function fixedClock(iso: string): Clock
class ApiError extends Error { readonly status: number; readonly code: string; readonly details: unknown; constructor(status: number, code: string, message: string, details?: unknown) }
interface ServerDeps { readonly version: string; readonly ids: IdSource; readonly logger: Logger; readonly tracer: Tracer; readonly health?: HealthRegistry; readonly healthCheckTimeoutMs?: number; readonly listener?: "public" | "internal" }
function buildServer(deps: ServerDeps): Promise<FastifyInstance>
interface MainDeps { loadConfig: () => AppConfig; destination: LogDestination; signals: SignalSource; exit: (code: number) => void; openDatabase?: typeof openDatabase; configureServer?: (server: FastifyInstance) => void | Promise<void>; inspectServers?: (s: { public: FastifyInstance; internal: FastifyInstance }) => void | Promise<void> }
interface RunningServer { url: string; close(): Promise<void> }
function main(deps: Partial<MainDeps> = {}): Promise<RunningServer | null>
// add-db-foundation (test/support/pg.ts)
interface TestDatabase { name: string; ownerUrl: string; appUrl: string; ownerEndpoint: EndpointLike; appEndpoint: EndpointLike; ownerPool: pg.Pool; appPool: pg.Pool; close(): Promise<void> }
// add-tenancy-foundation (src/tenancy, test/support/tenants.ts)
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string }): Promise<CatalogViolation[]>
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>
// add-audit-chain (src/audit)
interface KeyMaterial { reveal(): string }
interface AppendOptions { clock?: Clock }
interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; target?: { kind: string; id: string }; payload?: Record<string, unknown>; origin?: AuditOrigin; mk?: { traceId?: string; requestId?: string; jti?: string } }
function appendAudit(tx: TenantTx, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string }>
function appendAuditCommitted(pool: TenantPool, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string }>
class AuditError extends Error { readonly code: AuditErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: AuditErrorCode, message: string, details?: Record<string, string | number>) }
function canonicalize(value: unknown): string
function formatAt(at: Date): string
// add-roles-and-memberships (src/identity/rbac/teams.ts, exported by src/identity/index.ts)
function listRoles(tx: TenantTx, ctx: TenantContext): Promise<string[]>
// add-pdp-cedar, add-policy-catalogue (src/pdp)
interface PolicyEngineOptions { srcDir: string; tenantPolicies?: readonly PolicySource[]; toolArgs?: Readonly<Record<string, ToolArgType>> | undefined; clock: Clock; ids: IdSource; logger: Logger }
function createPolicyEngine(opts: PolicyEngineOptions): Promise<PolicyEngine>
interface PolicyEngine extends Pdp { allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]): Promise<ActionName[]> }
interface Pdp { readonly policySetVersion: string; readonly actions: readonly string[]; readonly policies: readonly { id: string; layer: PolicyLayer }[]; check(req: PolicyRequest): Promise<Decision> }
function defaultSrcDir(): string
// add-api-pep (src/api/route.ts, src/api/pep.ts, test/support/api-session.ts)
function defineRoute(server: FastifyInstance, def: RouteDef): void
interface DefinedRoute { method: string; url: string; auth: AuthKind; action: ActionName | null; errors: readonly string[]; schema: FastifySchema; listener: "public" | "internal" }
function listDefinedRoutes(server: FastifyInstance): DefinedRoute[]
interface PepDeps { pool: TenantPool | null; engine: PolicyEngine | null; clock: Clock; publicBaseUrl: string }
function installPep(server: FastifyInstance, deps: PepDeps): void
function createTestSession(db: TestDatabase, ctx: TenantContext, subject: string, clock: Clock): Promise<{ cookie: string; userId: string; csrfToken: string }>
// add-api-conventions (src/api/error-codes.ts, pagination.ts, cursor.ts; test/support/openapi-docs.ts)
const ERROR_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>>
function unregisteredRouteErrors(routes: readonly { method: string; url: string; errors: readonly string[] }[]): string[]
const PAGE_QUERY_SCHEMA: Readonly<Record<string, unknown>>
function readPage(query: unknown): { limit: number; cursor: string | null }
function startAfter(binding: CursorBinding, cursor: string | null): CursorPosition | null
function deriveCursorKey(engineKey: KeyMaterial | null): CursorKey
type CursorPosition = readonly (string | number)[]
const OPENAPI_FILE: string
function servedOpenApiText(): Promise<string>
// add-admin-api (src/api/admin-page.ts)
interface PageBinding { key: CursorKey | null; tenantId: string; scope: string }
function pageRows<T>(rows: readonly T[], page: { limit: number; cursor: string | null }, binding: PageBinding, keyOf: (row: T) => CursorPosition): Page<T>
```

## Facts from the merged code

Read at main@3142c5f.

- `src/db/index.ts` exports no `Pool` type; `src/db/pool.ts:56`: `export function createPool(source: string | EndpointLike, opts: PoolOptions = {}): pg.Pool {`. `src/tenancy/tx.ts:6`: `export type TenantPool = Pick<pg.Pool, "connect">;`.
- `src/db/migrations/0170_rbac.sql:42-43`: `ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY` and a policy `USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true))`; line 68: `CREATE TRIGGER tenant_default_roles AFTER INSERT ON ursitoare.tenant` (a new tenant gets the default roles).
- `src/identity/rbac/schema.test.ts:167-175` asserts `{ code: "42501" }` for an `INSERT`, `DELETE` or `UPDATE` the application role may not do and for an `INSERT` of tenant B's row in A's transaction.
- `src/tenancy/catalog.ts:6-10`: `CATALOG_GLOBAL_TABLES` is `["schema_migration", "tenant", "tenant_route"]`; `checkTenancyCatalog` reports any other table of schema `ursitoare` that is not tenant-leading with forced row-level security and a tenant policy.
- `src/identity/rbac/teams.ts:13-20`: `listRoles` runs ``'SELECT role_id FROM ursitoare.role WHERE tenant_id = $1 ORDER BY role_id COLLATE "C"'`` after `assertTenantMatches`. `src/identity/rbac/names.ts:12-17`: `DEFAULT_ROLES` is `["tenant_admin", "author", "approver", "auditor"]`.
- `src/tenancy/tx.ts:21`: `await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);` inside `BEGIN`. `src/audit/append.ts:25`: `const valid = validateEvent(event);` is the first statement of `appendAudit`; lines 30-37 throw `AuditError("AUDIT_CONTEXT_MISMATCH", ...)` when `app.tenant_id` is unset or differs from `ctx.tenantId`; lines 76-77: `} catch (err) { throw wrapStoreError(err);`.
- `src/audit/event.ts:16,25`: `EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/`, `SECRET_PARTS = ["password", "secret", "token", "apikey", "credential"]` (a payload key containing one fails); an actor or target id is 1 to 200 characters without control characters. `src/audit/errors.ts:26-34`: `wrapStoreError` maps an error whose `code` matches `/^[0-9A-Z]{5}$/` to `AuditError("AUDIT_STORE_FAILED", ...)`.
- `src/audit/canonical.ts:3,70`: `MAX_DEPTH = 64` and `Object.keys(record).sort()`; `canonicalize` throws `AuditError("AUDIT_CANONICAL_INVALID", ...)` for `NaN`, `undefined`, non-plain objects, U+0000 and deeper nesting. `src/audit/hash.ts:38-39`: ``return `${iso.slice(0, -1)}000Z`;`` so `formatAt` gives `"2026-10-31T09:00:00.000000Z"`.
- `src/pdp/actions.ts:112`: `read_registry: defineAction("read_registry", ["Tenant"], "{}", true),`. `src/identity/policy/roles.cedar` holds four permits, none for it; their form is `@id("identity-rbac-tenant-admin-manage-users-roles")` `permit (principal in Role::"tenant_admin", action == Action::"manage_users_roles", resource);`.
- `src/pdp/fragments.ts:8-10`: `FRAGMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_./-]{0,127}$/`, suffix `.cedar`, directory `policy`: the loader reads `<srcDir>/<module>/policy/*.cedar` of every module directory (layer `platform`). `src/main.ts:199` builds the engine from `defaultSrcDir()` (only with a database). `src/identity/roles-policy.test.ts:179` asserts the ids starting `identity-rbac-` are exactly four.
- `src/api/decision.ts:98-100`: `throw new ApiError(403, "FORBIDDEN", "Action not permitted", { decisionId: decision.decisionId, });`; a route without `resource` is checked against the principal's tenant. `src/api/server.ts:43`: `ajv: { customOptions: { removeAdditional: false, allErrors: false } },` so `additionalProperties: false` on a querystring is 400 `VALIDATION_FAILED`; `src/api/pagination.ts:19-24`: `limit` is an integer from 1 to 200 (default 50), `cursor` a string of 1 to 1024 characters.
- `src/api/admin-page.ts:71-74`: `if (binding.key === null) { if (page.cursor !== null) throw engineKeyRequired(); if (rows.length > page.limit) throw engineKeyRequired(); ...` (503 `ENGINE_KEY_REQUIRED`); with a key it drops rows up to the cursor's position and calls `paginate`. `src/api/cursor.ts:188-190`: `if (claims.t !== expect.tenantId || claims.s !== expect.scope) { throw cursorInvalid(); }` (400 `CURSOR_INVALID`; a wrong MAC is the same error).
- `src/main.ts:207-220`: `installPep(...); registerMeRoute(...); registerAdminRoutes(...); registerAuditRoutes(server, { pool: pep.pool, clock: pep.clock, engineKey: config.engineKey, }); registerOpenApiRoute(server, { version: VERSION });`. `src/main.admin.test.ts:173` asserts the committed `docs/api/openapi.json` equals `servedOpenApiText()`, so a new route needs the regenerated document.
- `src/api/error-codes.test.ts:11`: the test title is `C-96e47324 The registry holds exactly the 16 codes of the API with status and message`; its `EXPECTED_CODES` holds 22 entries, including `CURSOR_INVALID`, `VALIDATION_FAILED`, `ENGINE_KEY_REQUIRED`. `test/arch/modules.ts:17`: `registry: { allowed: ["core", "db", "tenancy", "audit", "authoring", "pdp", "identity"] },`; the `api` row lists `"registry"` and `"authoring"`.
