# Delivered shapes taken by add-runs-api

Merged names, as declared on main (e06fdb3), without `export`. The siblings' names (U30, U31, U33) are in `proposal.md`.

```ts
// src/core, src/tenancy (add-engine-skeleton, add-tenancy-foundation)
interface Clock { now(): Date; }                                      // core/clock.ts:1
interface IdSource { next(prefix: string): string; }                  // core/ids.ts:6
function fixedClock(iso: string): Clock; function sequentialIds(seed?: number): IdSource; const systemClock: Clock; const systemIds: IdSource
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }   // tenancy/context.ts:5
type TenantPool = Pick<pg.Pool, "connect">; type TenantTx = Pick<pg.PoolClient, "query">          // tenancy/tx.ts:7-8
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
// src/api (add-api-pep, add-api-conventions, add-flow-registry)
class ApiError extends Error { readonly status: number; readonly code: string; readonly details: unknown; constructor(status: number, code: string, message: string, details?: unknown); }
interface ResourceRef { type: ResourceType; id: string; tenantId: string; attrs?: Record<string, unknown>; }      // route.ts:25
// route.ts:37-51: ListFilter = { kind: "sql"; predicate(p: Principal, first: number): SqlPredicate } | { kind: "item"; ... }; RouteDef { method; url; auth; action?; resource?: (req) => Promise<ResourceRef | null>; listFilter?; schema; errors: readonly string[]; handler }
interface DefinedRoute { method: string; url: string; auth: AuthKind; action: ActionName | null; errors: readonly string[]; schema: FastifySchema; listener: "public" | "internal"; }   // route.ts:70
function defineRoute(server: FastifyInstance, def: RouteDef): void; function listDefinedRoutes(server: FastifyInstance): DefinedRoute[]
function listPredicate(request: FastifyRequest, first: number): SqlPredicate        // list-filter.ts:30
function readPage(query: unknown): { limit: number; cursor: string | null }         // pagination.ts:52
function startAfter(binding: CursorBinding, cursor: string | null): CursorPosition | null   // pagination.ts:82; CursorBinding extends CursorScope { key: CursorKey }
type CursorPosition = readonly (string | number)[]; interface CursorScope { tenantId: string; scope: string; }   // cursor.ts:5,15
function deriveCursorKey(engineKey: KeyMaterial | null): CursorKey; function encodeCursor(key: CursorKey, claims: CursorScope & { position: CursorPosition }): string   // KeyMaterial { reveal(): string }
const ERROR_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>>; function unregisteredRouteErrors(routes: readonly { method: string; url: string; errors: readonly string[] }[]): string[]
interface PepDeps { pool: TenantPool | null; engine: PolicyEngine | null; clock: Clock; publicBaseUrl: string; }   // pep.ts:12
// src/api/flow-common.ts (exported helpers this change reuses; they are not flow-specific)
const FLOW_ID_PATTERN = "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"; const PAGE_QUERY   // { type: "object", additionalProperties: false, properties: limit, cursor }
function pageSchema(item: unknown): unknown; function cursorInvalid(): ApiError; function engineKeyRequired(): ApiError; function notFound(): ApiError; function unavailable(): ApiError
// src/identity, src/pdp (add-oidc-login, add-pdp-cedar, add-policy-catalogue)
interface Principal { tenantId: string; userId: string; kind: "human" | "service"; sessionId?: string; roles: string[]; teams: string[]; actorChain: string[]; }   // identity/oidc/principal.ts:3
function entityRef(type: string, id: string): { __entity: { type: string; id: string } }; function scopedId(tenantId: string, localId: string): string
function createPolicyEngine(opts: PolicyEngineOptions): Promise<PolicyEngine>; function defaultSrcDir(): string; function tenantEntity(tenantId: string): Entity; function userEntity(p: PrincipalEntity): Entity
// test/support (add-api-pep, add-flow-registry, add-tenancy-foundation, add-db-foundation, add-api-conventions)
function createTestSession(db: TestDatabase, ctx: TenantContext, subject: string, clock: Clock): Promise<{ cookie: string; userId: string; csrfToken: string; }>
function seedFlowActors(db: TestDatabase, ctx: TenantContext, actors: readonly FlowActorSpec[], clock: Clock): Promise<{ [subject: string]: string }>   // FlowActorSpec { subject; roles; teams }
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>; function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase>
const OPENAPI_FILE: string   // openapi-docs.ts:13; run directly (node test/support/openapi-docs.ts) it writes docs/api/openapi.json
// src/main.ts: MainDeps (inspectServers?: (s: { public: FastifyInstance; internal: FastifyInstance }) => void | Promise<void>), main(deps?: Partial<MainDeps>): Promise<RunningServer | null>
```

## Facts from the merged code

- `src/api/route.ts:185,258`: non-public routes set `cache-control: no-store`; a non-GET session route without a valid `x-csrf-token` is `ApiError(403, "CSRF_INVALID", ...)`. `route.ts:264-275`: a defined route's `errors` also hold `UNAUTHENTICATED`, `FORBIDDEN`, `AUTHZ_UNAVAILABLE` (non-public), `CSRF_INVALID` (session, not GET) and `NOT_FOUND` (when a `resource` loader exists), sorted.
- `src/api/pep.ts:64-68`: a `resource` loader returning `null` throws `ApiError(404, "NOT_FOUND", "Resource not found")`; without a loader the decision is on the `Tenant`. `src/api/decision.ts:12-17,98`: a non-Tenant resource id is `scopedId(tenantId, id)`; a denial is `ApiError(403, "FORBIDDEN", "Action not permitted", { decisionId })` after an `authz.denied` audit event.
- `src/api/list-filter.ts:75`: a `sql` list filter whose predicate the handler never fetched through `listPredicate` fails the response with `Error("the sql list predicate was not applied")`.
- `src/api/flow-routes.ts:118`: no cursor key and a `cursor` throws `engineKeyRequired()` before decoding; a next page without a key throws it after the query. `src/api/cursor.ts:31-33`: a bad, tampered or foreign-scope cursor is `CURSOR_INVALID` 400; `cursor.ts:25,27`: scope pattern `^[a-z][a-z0-9_.:-]{0,63}$`, at most 4 position entries.
- `src/api/server.ts:43`: ajv runs with `removeAdditional: false`, so a query or params schema violation answers 400 `VALIDATION_FAILED`; authentication (`onRequest`) runs before validation, which runs before the PEP (`preHandler`).
- `src/api/openapi.ts:156`: the OpenAPI handler reads `listDefinedRoutes(server)` per request.
- `src/pdp/actions.ts:88,113`: `debug_run` and `read_run` apply to `["Tenant", "Run"]`; `src/pdp/cedar-schema.ts:50`: `entity Run { tenant: String, owner_team: Team, initiator: User };`. `src/pdp/fragments.ts:10,65`: policy files are read from `<srcDir>/<module>/policy/*.cedar`, and `src/main.ts` passes `srcDir: defaultSrcDir()`. `src/pdp/principal.ts:70-82`: a user entity is `User::"<tenant>/<userId>"` with `Team::"<tenant>/<team>"` parents. `src/pdp/platform.ts:4-6`: `platform-cross-tenant-forbid` forbids a request whose principal and resource tenants differ.
- `src/main.ts:223-224,240,251`: `registerFlowRoutes(...)` and `registerOpenApiRoute(...)` are called inside the `try` that holds `inspectServers`, with `database?.appPool ?? null`, `systemClock` and `config.engineKey`; `closeAll` is defined after that block.
- `test/support/api-session.ts:22-24`: `createTestSession` upserts the user by `{ issuer: "https://idp.test", subject }`, so its `userId` equals `seedFlowActors`' for that subject.
- `tsconfig.json:9-10`: `exactOptionalPropertyTypes` is on: an absent optional property is omitted, not `undefined`.
