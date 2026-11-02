# Delivered shapes taken by add-mock-test-runs

Merged names, as declared on main (e06fdb3), without `export`. The siblings' names are in their folders.

```ts
// shared with add-runs-api (same commit)
interface Clock { now(): Date; }                                      // core/clock.ts:1
interface IdSource { next(prefix: string): string; }                  // core/ids.ts:6
function fixedClock(iso: string): Clock; function sequentialIds(seed?: number): IdSource; const systemClock: Clock; const systemIds: IdSource
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }   // tenancy/context.ts:5
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
class ApiError extends Error { readonly status: number; readonly code: string; readonly details: unknown; constructor(status: number, code: string, message: string, details?: unknown); }
interface ResourceRef { type: ResourceType; id: string; tenantId: string; attrs?: Record<string, unknown>; }      // route.ts:25
// route.ts:37-51: ListFilter = { kind: "sql"; predicate(p: Principal, first: number): SqlPredicate } | { kind: "item"; ... }; RouteDef { method; url; auth; action?; resource?: (req) => Promise<ResourceRef | null>; listFilter?; schema; errors: readonly string[]; handler }
function defineRoute(server: FastifyInstance, def: RouteDef): void
const ERROR_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>>
interface Principal { tenantId: string; userId: string; kind: "human" | "service"; sessionId?: string; roles: string[]; teams: string[]; actorChain: string[]; }   // identity/oidc/principal.ts:3
function entityRef(type: string, id: string): { __entity: { type: string; id: string } }; function scopedId(tenantId: string, localId: string): string
function createTestSession(db: TestDatabase, ctx: TenantContext, subject: string, clock: Clock): Promise<{ cookie: string; userId: string; csrfToken: string; }>
function seedFlowActors(db: TestDatabase, ctx: TenantContext, actors: readonly FlowActorSpec[], clock: Clock): Promise<{ [subject: string]: string }>   // FlowActorSpec { subject; roles; teams }
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }>
// src/authoring
interface Flow { ursitoare: string; flow: string; version: string; description?: string; inputs: JsonSchema; start: string; nodes: { [id: string]: FlowNode }; hooks?: HookRule[]; expose?: "mcp"; }  // format/types.ts:234
interface BlockDef { effect: Effect; description?: string; input: JsonSchema; output: JsonSchema; untrusted_fields?: string[]; data_class?: "public" | "private"; untrusted_result?: boolean; unsafe_to_retry?: boolean; }  // format/catalogue.ts:5
interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined; }  // catalogue.ts:34; const emptyCatalogue: Catalogue at :44
function successorFields(node: unknown): SuccessorField[]  // format/nodes.ts:80; SuccessorField { path: string; id: unknown; producesOutput: boolean }
// src/registry
type VersionState = "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"  // flows/flows.ts:17
interface VersionDetail extends VersionSummary { text: string; canonical: unknown; result: ValidationResult | null; }  // flows.ts:38
function getVersion(tx: TenantTx, ctx: TenantContext, flowId: string, hash: string): Promise<VersionDetail | null>  // flows/versions.ts:185
function flowOwnerTeam(tx: TenantTx, ctx: TenantContext, flowId: string): Promise<string | null>  // flows/flows.ts:218
function createFlow(tx: TenantTx, ctx: TenantContext, input: { name: string; ownerTeam: string }, actor: FlowActor, opts?: FlowOptions): Promise<FlowRecord>  // flows.ts:152
function saveFlowVersion(tx: TenantTx, ctx: TenantContext, input: { flowId: string; format: FlowFormat; text: string }, actor: FlowActor, opts?: FlowOptions): Promise<{ version: VersionSummary; created: boolean }>  // versions.ts:62
function validateVersion(tx: TenantTx, ctx: TenantContext, input: { flowId: string; hash: string; catalogue: Catalogue }, actor: FlowActor, opts?: FlowOptions): Promise<{ version: VersionSummary; result: ValidationResult }>  // validate.ts:17
function importCatalogue(pool: TenantPool, ctx: TenantContext, blocks: { [ref: string]: BlockImport }, actor: { kind: "user" | "service" | "system"; id: string }, opts?: { clock?: Clock }): Promise<ImportReport>  // block-store.ts:82
function loadRegistryCatalogue(pool: TenantPool, ctx: TenantContext): Promise<Catalogue>  // registry/catalogue.ts:55
// src/api
const IDEMPOTENCY_HEADER_SCHEMA: Readonly<Record<string, unknown>>; function idempotencyKeyOf(req: FastifyRequest): string | null  // idempotency.ts:14,43
function requestDigestOf(parts: { method: string; route: string; params?: unknown; query?: unknown; body?: unknown }): string  // idempotency.ts:72
function withIdempotency(ctx: { pool: TenantPool; tenant: TenantContext; clock: Clock }, principal: { userId: string }, key: string, requestDigest: string, fn: (tx: TenantTx) => Promise<IdempotentResponse>): Promise<IdempotentResponse & { replayed: boolean }>  // idempotency.ts:112; IdempotentResponse { status: number; body: unknown }
const FLOW_ID_PATTERN = "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"  // flow-common.ts:10
// test/support
function loadTestCatalogue(path?: string): TestCatalogue; function readCatalogueDocument(path?: string): CatalogueDocument; function readTestFlowText(name: string): string  // catalogue/loader.ts:85, document.ts:151, flows.ts:33
```

## Facts from the merged code

- `src/main.flows.test.ts:150-165`: the frozen test counts the public routes whose url starts with `/api/v1/flows` and expects exactly `FLOW_ROUTES.length` (seven).
- `src/api/flow-routes.ts:72`: the Flow resource attrs are `{ owner_team: entityRef("Team", scopedId(tenantId, ownerTeam)), reviewed: false }`. `src/api/idempotency.ts:255`: a replay sets `Idempotent-Replayed: true`.
- `src/api/route.ts:264-275`: a route's `errors` also hold `UNAUTHENTICATED`, `FORBIDDEN`, `AUTHZ_UNAVAILABLE`, `CSRF_INVALID` (session, non-GET), `NOT_FOUND` (with a `resource` loader). `src/api/pep.ts:64-68`: a loader returning `null` is 404 `NOT_FOUND`; `src/api/server.ts:43`: `removeAdditional: false`, so a schema violation is 400 `VALIDATION_FAILED`, checked after authentication and before the PEP.
- `src/registry/flows/versions.ts:185-210`: `getVersion` answers `null` for a malformed hash or an absent version. `src/authoring/validate/validate.ts:72-98`: `validateFlowText` returns only the result, not the document. `src/identity/oidc/principal.ts:21`: a session principal has `actorChain: []`.
- `src/pdp/actions.ts:123`: `test_flow` applies to `Tenant` and `Flow`; `src/pdp/fragments.ts:44`: policies are read from `<srcDir>/<module>/policy/*.cedar`; `test/arch/modules.ts`: `interpreter` has no `egress`.
