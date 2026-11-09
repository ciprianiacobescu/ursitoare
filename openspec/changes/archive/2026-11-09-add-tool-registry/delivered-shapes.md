# Delivered shapes taken by add-tool-registry

Declarations from main@cf34c628 (`file:line`; `…` elides unused members) and from `add-fake-tools` (U45b, its Interfaces given).

```ts
// src/registry/block-input.ts (U26)
:14  type BlockBinding = { [key: string]: JsonValue }   :16  type BlockImport = BlockDef & { binding?: BlockBinding }   // BlockDef { effect; description?; input; output; untrusted_fields?; data_class?; untrusted_result?; unsafe_to_retry? }
:203 normalizeBlockImport(ref: unknown, block: unknown): NormalizedBlock   // { ref; def; binding; contentHash }; throws RegistryError REGISTRY_INVALID { field, reason } or REGISTRY_SCHEMA_INVALID { ref, field }
// src/registry/block-store.ts
:13  interface BlockVersion { ref: string; def: BlockDef; binding: BlockBinding | null; contentHash: string; importedBy: string; importedAt: string }
:82  importCatalogue(pool: TenantPool, ctx: TenantContext, blocks: { [ref: string]: BlockImport }, actor: { kind: "user" | "service" | "system"; id: string }, opts?: { clock?: Clock }): Promise<{ imported: string[]; unchanged: string[] }>
     // own transaction; a held ref with another hash is REGISTRY_CONFLICT; at most 200 blocks; audit registry.block_imported per new block
:194 getBlockVersion(tx: TenantTx, ctx: TenantContext, ref: string): Promise<BlockVersion | null>   // REGISTRY_TENANT_MISMATCH for another tenant's transaction
:209 listBlockVersions(tx: TenantTx, ctx: TenantContext, q: { limit: number; after?: string }): Promise<BlockVersion[]>   // limit 1-201, ordered by ref COLLATE "C", refs after `after`
// src/registry/errors.ts:7  RegistryError { code: "REGISTRY_INVALID" | "REGISTRY_SCHEMA_INVALID" | "REGISTRY_CONFLICT" | "REGISTRY_TENANT_MISMATCH"; details }
// src/audit
event.ts:5   interface AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; target?: { kind: string; id: string }; payload?: Record<string, unknown>; … }   // :25 secret-like payload keys are refused
append.ts:19 appendAudit(tx: TenantTx, ctx: TenantContext, event: AuditEventInput, opts?: { clock?: Clock }): Promise<{ seq: bigint; hash: string }>
hash.ts:30   formatAt(at: Date): string      canonical.ts:78 canonicalize(value: unknown): string
// src/tenancy   type TenantPool = Pick<pg.Pool, "connect">   type TenantTx = Pick<pg.PoolClient, "query">   TenantContext { readonly tenantId: string; readonly reviewProfile: "solo" | "team" }   tx.ts:14 withTenantTx<T>(pool, ctx, fn: (tx: TenantTx) => Promise<T>): Promise<T>
// src/api
route.ts:280  defineRoute(server, def: RouteDef)   // { method; url; auth: { kind: "session" }; action?; resource?; schema; errors: readonly string[]; handler }; without `resource` the Tenant (pep.ts:72); other auth kinds throw ROUTE_AUTH_UNWIRED (:353)
errors.ts:11  class ApiError extends Error { constructor(status: number, code: string, message: string, details?: unknown) }
idempotency.ts:221 respondIdempotent(deps: { pool: TenantPool; clock: Clock }, req, reply, fn: (tx: TenantTx) => Promise<{ status: number; body: unknown }>): Promise<FastifyReply>   :14 IDEMPOTENCY_HEADER_SCHEMA
pagination.ts:17 PAGE_QUERY_SCHEMA   :52 readPage(query): { limit: number; cursor: string | null }   :82 startAfter(binding, cursor)    admin-page.ts:65 pageRows(rows, page, binding: { key; tenantId; scope }, keyOf): { items; next_cursor }    cursor.ts:101 deriveCursorKey(engineKey)
// src/pdp/actions.ts:86,116 the actions approve_tool_surface and register_tool_server (resource Tenant)     src/identity/index.ts:60 grantRole(tx, ctx, { userId, roleId }, actor)
// test/support/catalogue/loader.ts:85 loadTestCatalogue(path?): TestCatalogue   // block(ref): BlockDef | undefined
// src/audit/mac.ts:4 (and src/api/cursor.ts:7) KeyMaterial { reveal(): string }   // the engine key; never logged
// src/api/pep.ts:42 installPep(server: FastifyInstance, deps: PepDeps): void   // once per server, before every defineRoute; ROUTE_DUPLICATE on a second call
// add-fake-tools (U45b), test/support/fake-tools/index.ts
FAKE_TOOLS_ORIGIN: string   // "https://tools.fake.test"      fakeToolPath(ref: string): string   // `/blocks/${ref}`, e.g. "/blocks/erp.lookup_vendor@1"
```

Read for the tests and routes (main@cf34c628):

- `src/registry/block-store.ts:110-113`: `importCatalogue`'s first statement in its transaction is `tx.query("SELECT pg_advisory_xact_lock(hashtextextended('ursitoare:block_import:' || $1::text, 0))", [ctx.tenantId])`, so row `delta`'s hook matches the text `ursitoare:block_import:`.
- `src/api/block-routes.ts:80` `bound: version.binding !== null`, `:27` `ANY_OBJECT = { type: "object", additionalProperties: true }`; `src/api/pagination.ts:6,20` limit default 50 (maximum 200), so 23 blocks fit one page. `src/registry/policy/blocks.cedar:1-2` permits `tenant_admin` the action `read_registry`.
- `src/tenancy/routes.ts:140-147` (`resolveTenantBy`) reads `review_profile` from `ursitoare.tenant` on every call, so a change by owner SQL holds from the next request.
- `src/api/flow-routes.ts:85-88` maps `principal.kind === "service" ? "service" : "user"`; `route.ts:396-397`: authentication is `onRequest` and the decision `preHandler`, so schema validation runs between them.
- `src/api/errors.ts:56-72` `validationField` (rule in design § Routes); `:90-106` each Ajv issue is `{ field, message }` in a 400 `VALIDATION_FAILED`; `:108-113` an empty or malformed JSON body is `[{ field: "body", message: "malformed JSON" }]`.
