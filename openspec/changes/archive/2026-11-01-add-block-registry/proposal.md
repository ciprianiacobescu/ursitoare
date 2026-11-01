## Why

The flow validator checks a flow against a `Catalogue`, and the only catalogue so far is the static test one. A tenant needs its own: the blocks its flows may call, with effect class, schemas and taint markers, kept as versions that never change under a published flow, plus its real roles.

Observable result: a tenant's blocks live in `ursitoare.block_version`, one immutable row per `name@major` ref. `importCatalogue(pool, ctx, blocks, actor)` checks each block of a map (the test catalogue's `blocks` shape: shape, size, valid schemas, `untrusted_fields` that name output properties), stores the new ones in one transaction with one `registry.block_imported` audit event each, reports `{ imported, unchanged }`, leaves a repeat untouched, and refuses the whole import, with an audit event, when a held ref comes with other content. `loadRegistryCatalogue(pool, ctx)` returns a synchronous `Catalogue` snapshot of the tenant's blocks and roles, which `add-flow-registry` hands to the validator. A signed-in tenant admin, author or approver calls `GET /api/v1/blocks` and gets the tenant's blocks a page at a time in ref order; another tenant's blocks stay invisible.

## What Changes

- New module `src/registry/`: block normalisation and content hash, the audited import, the readers, `RegistryCatalogue` and `loadRegistryCatalogue`.
- Migration `0260_block_registry.sql` (table `block_version`, forced row-level security, `SELECT` and `INSERT` only) and the policy fragment `src/registry/policy/blocks.cedar` (`read_registry` for `tenant_admin`, `author`, `approver`).
- `src/api/block-routes.ts` (`GET /api/v1/blocks`), registered in `src/main.ts`; `docs/api/openapi.json` is regenerated.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Tests import each symbol from its defining file. Not scaffolded, because they change existing files or are not code: the exports of `registerBlockRoutes` and `BlockApiDeps` from `src/api/index.ts`, the call in `src/main.ts`, the regenerated `docs/api/openapi.json`, the migration, the Cedar file and the tests. No new dependency.
- **Depends on** (evidence: Interfaces taken): `add-tenancy-foundation` (U03), `add-audit-chain` (U08), `add-api-pep` (U13), `add-api-conventions` (U14), `add-roles-and-memberships` (U17) and `add-flow-validator` (U25), as the roadmap row says; beyond it `add-flow-format-model` (U22: `BlockDef`, `Catalogue`, `parseVersionedRef`), `add-admin-api` (U18: `pageRows`), `add-policy-catalogue` (the action, the fragment loader), `add-pdp-cedar`, `add-oidc-login` and the M0 units whose names are used. U22 and U25 are written, not merged. `test/arch/modules.ts` needs no change (`registry` may import `core`, `db`, `tenancy`, `audit`, `authoring`, `pdp`, `identity`; `api` may import `registry`). This change and `add-flow-registry` (U27) both edit `src/main.ts`, `src/api/index.ts` and `docs/api/openapi.json`: U27 runs after it.
- **Files implemented** (stubs): `src/registry/{errors,block-input,block-store,catalogue,index}.ts`, `src/api/block-routes.ts`. **Created:** the migration, the Cedar file and a `*.test.ts` per task. **Changed:** `src/api/index.ts`, `src/main.ts`, `docs/api/openapi.json`; no existing test.
- **Migrations:** `0260_block_registry.sql`. **Tables:** `ursitoare.block_version`. **Endpoints:** `GET /api/v1/blocks` (action `read_registry`, which exists). **Env:** none. **Audit events:** `registry.block_imported`, `registry.import_refused`. **Error codes:** none added to `ERROR_CODES` (the route uses `CURSOR_INVALID`, `ENGINE_KEY_REQUIRED`, `VALIDATION_FAILED`); `REGISTRY_*` are library codes.

**Interfaces given** (declarations omit `export`; the same text as the first block of design.md § Interfaces)

```ts
// src/registry/errors.ts
type RegistryErrorCode = "REGISTRY_INVALID" | "REGISTRY_SCHEMA_INVALID" | "REGISTRY_CONFLICT" | "REGISTRY_TENANT_MISMATCH"
class RegistryError extends Error { readonly code: RegistryErrorCode; readonly details: Readonly<Record<string, string | number>>; constructor(code: RegistryErrorCode, message: string, details?: Record<string, string | number>) }
// src/registry/block-input.ts
type BlockBinding = { [key: string]: JsonValue }
type BlockImport = BlockDef & { binding?: BlockBinding }
interface NormalizedBlock { ref: string; def: BlockDef; binding: BlockBinding | null; contentHash: string }
function normalizeBlockImport(ref: unknown, block: unknown): NormalizedBlock
function blockContentHash(def: BlockDef, binding: BlockBinding | null): string
// src/registry/block-store.ts
interface BlockVersion { ref: string; def: BlockDef; binding: BlockBinding | null; contentHash: string; importedBy: string; importedAt: string }
interface ImportReport { imported: string[]; unchanged: string[] }
function importCatalogue(pool: TenantPool, ctx: TenantContext, blocks: { [ref: string]: BlockImport }, actor: { kind: "user" | "service" | "system"; id: string }, opts?: { clock?: Clock }): Promise<ImportReport>
function getBlockVersion(tx: TenantTx, ctx: TenantContext, ref: string): Promise<BlockVersion | null>
function listBlockVersions(tx: TenantTx, ctx: TenantContext, q: { limit: number; after?: string | undefined }): Promise<BlockVersion[]>
// src/registry/catalogue.ts
interface RegistryCatalogue extends Catalogue { blockRefs(): string[]; roleNames(): string[] }
function registryCatalogue(blocks: readonly BlockVersion[], roles: readonly string[]): RegistryCatalogue
function loadRegistryCatalogue(pool: TenantPool, ctx: TenantContext): Promise<Catalogue>
// src/api/block-routes.ts
interface BlockApiDeps { pool: TenantPool | null; engineKey: KeyMaterial | null }
function registerBlockRoutes(server: FastifyInstance, deps: BlockApiDeps): void
```

Also given: the table `ursitoare.block_version`, the file `src/registry/policy/blocks.cedar`, the audit event types above, the route `GET /api/v1/blocks` answering `{ items: { ref, def, bound, contentHash, importedAt }[], next_cursor }`, and at most 200 blocks per import. **Seam for `add-flow-registry`:** `loadRegistryCatalogue(pool, ctx)` reads the tenant's block versions and roles in one tenant transaction and returns a synchronous snapshot; `modelProfile`, `delegateTarget` and `flow` answer `undefined`. The card's `Pool` is `TenantPool` (`Pick<pg.Pool, "connect">`, `src/tenancy`): `src/db` exports no `Pool` type, and every `pg.Pool`, such as `db.appPool`, is accepted.

**Interfaces taken** (restated as the giving change defines them; merged shapes are in `delivered-shapes.md`)

- from `add-flow-format-model` (U22, `src/authoring/index.ts`): `type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }`; `interface BlockDef { effect: Effect; description?: string; input: JsonSchema; output: JsonSchema; untrusted_fields?: string[]; data_class?: "public" | "private"; untrusted_result?: boolean; unsafe_to_retry?: boolean }` (`Effect` is `"read" | "write" | "send" | "pay"`); `interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined }`; `function parseVersionedRef(ref: string): { name: string; major: number } | undefined` (pattern `^([a-z][a-z0-9._-]*)@(0|[1-9][0-9]{0,8})$`).
- from `add-flow-validator` (U25, `src/authoring/index.ts`): `function jsonSchemaProblem(schema: unknown): string | null` (`null` when the 2020-12 meta-schema accepts it, else a one-line message).
- from `add-engine-skeleton` and `add-db-foundation`: `Clock`, `fixedClock`, `systemClock`, `ApiError`, `buildServer`, `main`, `withTestDatabase`, `TestDatabase`. From `add-tenancy-foundation` (U03): `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `checkTenancyCatalog`, `seedTwoTenants`. From `add-audit-chain` (U08): `appendAudit`, `appendAuditCommitted`, `AuditEventInput`, `AuditError`, `canonicalize`, `formatAt`, `KeyMaterial`.
- from `add-roles-and-memberships` (U17): `listRoles`, the table `ursitoare.role`, the model fragment `src/identity/policy/roles.cedar`. From `add-policy-catalogue` and `add-pdp-cedar`: the action `read_registry`, `createPolicyEngine`, `defaultSrcDir`, `PolicyEngine`.
- from `add-api-pep` (U13): `defineRoute`, `installPep`, `PepDeps`, `listDefinedRoutes`, `createTestSession`. From `add-api-conventions` (U14): `ERROR_CODES`, `unregisteredRouteErrors`, `PAGE_QUERY_SCHEMA`, `readPage`, `startAfter`, `deriveCursorKey`, `OPENAPI_FILE`, `servedOpenApiText`. From `add-admin-api` (U18): `pageRows`, `PageBinding`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3142c5f, checked line by line).

## Out of scope

An endpoint or CLI command to import or change blocks, and the e2e part `parts/35-catalogue.ts` that seeds the test blocks (`add-web-flow-editor` calls `importCatalogue`); tool servers and the blocks they write (`add-tool-registry`); using `binding` (the gateway units); model profiles, delegate targets and subflow signatures in the catalogue (`add-model-profiles`, `add-delegate-n8n`, `add-subflow`); flows (`add-flow-registry`); deprecating or deleting a block version; filters; web screens.
