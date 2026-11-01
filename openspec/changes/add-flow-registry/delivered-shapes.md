# Delivered shapes taken by add-flow-registry

Merged names, as declared on main (3142c5f): `tsc --emitDeclarationOnly` output without `export` and `declare`. Unmerged names (U22, U24, U25, U26) are in `proposal.md`.

```ts
// src/core/clock.ts, src/tenancy, src/audit (add-engine-skeleton, add-tenancy-foundation, add-audit-chain)
interface Clock { now(): Date; }
type TenantPool = Pick<pg.Pool, "connect">
type TenantTx = Pick<pg.PoolClient, "query">
interface TenantContext { readonly tenantId: string; readonly reviewProfile: ReviewProfile; }
function withTenantTx<T>(pool: TenantPool, ctx: TenantContext, fn: (tx: TenantTx) => Promise<T>): Promise<T>
function checkTenancyCatalog(db: Pick<pg.Pool, "query">, opts?: { appRole?: string; ownerRole?: string; }): Promise<CatalogViolation[]>
// AuditEventInput: { eventType, actor: { kind, id }, target?: { kind, id }, payload? } (add-audit-chain)
function appendAudit(tx: TenantTx, ctx: TenantContext, event: AuditEventInput, opts?: AppendOptions): Promise<{ seq: bigint; hash: string; }>
// src/api (add-api-pep, add-api-conventions)
class ApiError extends Error { readonly status: number; readonly code: string; readonly details: unknown; constructor(status: number, code: string, message: string, details?: unknown); }
interface ResourceRef { type: ResourceType; id: string; tenantId: string; attrs?: Record<string, unknown>; }
interface SqlPredicate { sql: string; values: unknown[]; }
interface RouteDef { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; url: string; auth: AuthKind; action?: ActionName; resource?: (req: FastifyRequest) => Promise<ResourceRef | null>; listFilter?: ListFilter; schema: FastifySchema; errors: readonly string[]; handler: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>; }
interface DefinedRoute { method: string; url: string; auth: AuthKind; action: ActionName | null; errors: readonly string[]; schema: FastifySchema; listener: "public" | "internal"; }
function defineRoute(server: FastifyInstance, def: RouteDef): void
function listDefinedRoutes(server: FastifyInstance): DefinedRoute[]
function listPredicate(request: FastifyRequest, first: number): SqlPredicate
interface PepDeps { pool: TenantPool | null; engine: PolicyEngine | null; clock: Clock; publicBaseUrl: string; }
function installPep(server: FastifyInstance, deps: PepDeps): void
const ERROR_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>>
function unregisteredRouteErrors(routes: readonly { method: string; url: string; errors: readonly string[] }[]): string[]
interface KeyMaterial { reveal(): string; }
function deriveCursorKey(engineKey: KeyMaterial | null): CursorKey
// also used as `add-api-conventions` gives them: PAGE_QUERY_SCHEMA, readPage, CursorPosition, CursorBinding, startAfter, encodeCursor, IDEMPOTENCY_HEADER_SCHEMA
function respondIdempotent(deps: { pool: TenantPool; clock: Clock; }, req: FastifyRequest, reply: FastifyReply, fn: (tx: TenantTx) => Promise<IdempotentResponse>): Promise<FastifyReply>
// src/identity (add-oidc-login, add-identity-model, add-roles-and-memberships)
interface Principal { tenantId: string; userId: string; kind: "human" | "service"; sessionId?: string; roles: string[]; teams: string[]; actorChain: string[]; }
type RbacActor = { kind: "user" | "service"; userId: string; roles: readonly string[]; } | { kind: "operator"; name: string; }
interface IdentityOptions { ids?: IdSource; clock?: Clock; }
class RbacError extends Error { readonly code: RbacErrorCode; constructor(code: RbacErrorCode, message: string); }
function provisionTenantIdp(ownerPool: TenantPool, ctx: TenantContext, idp: { issuer: string; organization: string; }, opts?: IdentityOptions): Promise<void>
function upsertUserFromClaims(tx: TenantTx, ctx: TenantContext, claims: TokenClaims, opts?: IdentityOptions): Promise<User>
function createTeam(tx: TenantTx, ctx: TenantContext, input: { teamId: string; }, actor: RbacActor, opts?: IdentityOptions): Promise<{ teamId: string; }>
function deleteTeam(tx: TenantTx, ctx: TenantContext, teamId: string, actor: RbacActor, opts?: IdentityOptions): Promise<void>
function setGroupMapping(tx: TenantTx, ctx: TenantContext, input: { issuer: string; group: string; roleId?: string | undefined; teamId?: string | undefined; }, actor: RbacActor, opts?: IdentityOptions): Promise<GroupMapping>
function syncMemberships(tx: TenantTx, ctx: TenantContext, userId: string, input: { issuer: string; groups: readonly string[]; }, opts?: IdentityOptions): Promise<SyncResult>
function grantRole(tx: TenantTx, ctx: TenantContext, input: { userId: string; roleId: string; }, actor: RbacActor, opts?: IdentityOptions): Promise<"granted" | "exists">
// src/pdp (add-pdp-cedar, add-policy-catalogue)
function entityRef(type: string, id: string): { __entity: { type: string; id: string; }; }
function scopedId(tenantId: string, localId: string): string
function createPolicyEngine(opts: { srcDir: string; tenantPolicies?: readonly PolicySource[]; clock: Clock; ids: IdSource; logger: Logger; }): Promise<PolicyEngine>
function defaultSrcDir(): string
// src/main.ts, test/support
function main(deps?: Partial<MainDeps>): Promise<RunningServer | null>
function withTestDatabase(opts?: { migrated?: boolean; cluster?: TestCluster; }): Promise<TestDatabase>
function seedTwoTenants(db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext; }>
function createTestSession(db: TestDatabase, ctx: TenantContext, subject: string, clock: Clock): Promise<{ cookie: string; userId: string; csrfToken: string; }>
function servedOpenApiText(): Promise<string>
```

## Facts from the merged code

- `src/pdp/actions.ts:91,111`: `edit_flow: defineAction("edit_flow", ["Tenant", "Flow"], "{}", true),` and `read_flow: defineAction("read_flow", ["Tenant", "Flow"], "{}", true),`. `src/pdp/cedar-schema.ts:49`: `"entity Flow { tenant: String, owner_team: Team, reviewed: Bool };"`.
- `src/pdp/fragments.ts:10,65`: policy files are read from `<srcDir>/<module>/policy/*.cedar` as layer `platform`; `src/main.ts:199` uses `srcDir: defaultSrcDir()`.
- `src/pdp/policy-engine.test.ts:192,204`: `permit (principal, action == Action::"edit_flow", resource is Flow) when { principal in resource.owner_team };` loads; unguarded `resource` is `PDP_POLICY_INVALID`. `src/pdp/principal.ts:77-82` (teams come from `ursitoare.membership` per request, `src/identity/rbac/principal.ts:24-25`): a user entity has `teams: teams.map((t) => entityRef("Team", scopedId(p.tenantId, t)))` and the same `Team` uids as parents, so `principal in resource.owner_team` holds for a member.
- `src/api/decision.ts:15,33`: a non-Tenant resource id is `scopedId(ref.tenantId, ref.id)`; its attributes are `{ ...ref.attrs, tenant: ref.tenantId }`, `parents: []`. `src/api/pep.ts:64-68`: a `resource` loader returning `null` throws `ApiError(404, "NOT_FOUND", "Resource not found")` before any decision; `src/api/route.ts:274-275`: a route with a `resource` implies `NOT_FOUND`; one without is decided on the `Tenant`.
- `src/api/list-filter.ts:75`: a `sql` filter whose predicate the handler never fetched through `listPredicate` fails with `Error("the sql list predicate was not applied")` (500).
- `src/identity/rbac/teams.ts:93`: `deleteTeam` turns a `23503` violation into `RBAC_IN_USE`; `0170_rbac.sql:8` and `0100_identity.sql:11`: `team` has primary key `(tenant_id, team_id)`, `"user"` `(tenant_id, user_id)`.
- `test/support/api-session.ts:23`: `createTestSession` upserts the user with `{ issuer: "https://idp.test", subject, name: subject }`.
- `src/audit/event.ts:16,18,25`: `EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/` (event types, target kinds), `MAX_PAYLOAD_BYTES = 32_768`, and payload keys containing `password`, `secret`, `token`, `apikey` or `credential` fail.
- `src/api/server.ts:32-45` sets no `bodyLimit` (Fastify's default: 1,048,576 bytes); `src/api/errors.ts:117` maps a 413 to `PAYLOAD_TOO_LARGE`.
- `test/arch/modules.ts:17,102`: `registry` may import `authoring`, `pdp`, `identity`, `audit`; `api` may import `registry`. `test/support/openapi-docs.ts:49-52`, run directly, writes `docs/api/openapi.json`.
