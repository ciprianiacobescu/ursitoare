## Why

A real tool is not a block until an admin has said where it lives, what it accepts and returns and what effect it has, and a second admin has approved exactly that. U47 stores tool servers and surfaces per tenant, binds approved tools to immutable block versions, drifts a server whose surface changes, and gives U50 a directory from block ref to binding.

Observable result: carol (`tenant_admin`) posts `acme` (two tools) and gets 201 `pending`. In a team tenant she cannot approve it (422 `approver_is_submitter`) but dave can, and `GET /api/v1/blocks` lists its two refs with `bound` true. A `PUT` of a changed surface makes `acme` `drifted`; approving it writes `acme.lookup_vendor@2`. A solo tenant approves its own surface only with `selfApproval: true`.

Batch `m6-grants` (closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`; batch profile `none`) delivers M6. This unit's part: the registry, surface approval, the bound block versions and the directory the invoke path reads; after it merges, L4 runs acceptance profile `all`.

## What Changes

- New module `src/tools/` (with `policy/tools.cedar`), `src/api/tool-server-routes.ts`, `test/support/tool-surface.ts`, migration `0470_tool_registry.sql`, each with tests; capability `tool-registry` (ADDED).
- Named edits: `src/main.ts` (task 5.2: `registerToolServerRoutes` after `registerBlockRoutes` at `:238`, after U46's edit and before U48's), `src/api/index.ts`, `docs/api/openapi.json` (regenerated), `test/support/README.md` (one row).
- No API error code, action, module edge (D24), dependency, part or frozen-test change. The `adapter` CHECK lists all four adapters (M7 needs no migration); the API accepts only `fixture`.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (`docs/decisions/0002`); this change implements them. The `export type` lines of `src/tools/index.ts` for `ToolDirectory`, `ToolBinding`, `ToolServerRecord` and `ToolSurface` are scaffolded. Not scaffolded: the value export lines of `src/tools/index.ts` (task 3.1) and `src/api/index.ts`, the module-internal `checkSurface`, `toolBlock`, `toolHash` (`surface.ts`), `assertTenant` (`store.ts`), the migration, the fragment, the `main.ts` line, the document, the README row.
- **Depends on:** `add-tenancy-foundation`, `add-audit-chain`, `add-pdp-cedar`, `add-policy-catalogue`, `add-api-pep`, `add-api-conventions`, `add-roles-and-memberships`, `add-flow-format-model`, `add-test-catalogue`, `add-block-registry`, `add-fake-tools` (U03, U08, U11, U11b, U13, U14, U17, U22, U24, U26, U45b).
- Shapes of the delivered names: `delivered-shapes.md` (main@cf34c628 and the M5 folders named).

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// src/tools/types.ts (exported from src/tools/index.ts)
type Effect = BlockImport["effect"];
type JsonSchema = BlockImport["input"];
export type ToolAdapter = "fixture" | "mcp" | "http_openapi" | "code_block";
export type ToolServerState = "pending" | "approved" | "drifted";
export interface SurfaceTool {
  name: string;                    // ^[a-z][a-z0-9_]{0,63}$; block ref `${serverId}.${name}@${major}`
  description?: string; effect: Effect; input: JsonSchema; output: JsonSchema;
  untrusted_fields?: string[];
  untrusted_result?: boolean;      // default true
  unsafe_to_retry?: boolean; data_class?: "public" | "private";
  http: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string };   // fixed path ^/[\x21-\x7e]{0,1023}$; GET and DELETE only when `input` declares no property
}
export interface ToolSurface { tools: SurfaceTool[] }   // 1-100 tools, unique names
export interface ToolServerRecord {
  id: string;                      // ^[a-z][a-z0-9_]{0,31}$
  adapter: ToolAdapter; origin: string; local: boolean; state: ToolServerState;
  registeredBy: string; registeredAt: string;
  approvedDigest: string | null; pendingDigest: string | null; pendingSubmittedBy: string | null;   // submitter of the newest unapproved surface, else null
  tools: { name: string; effect: Effect; ref: string | null }[];
}
export interface ToolBinding {
  serverId: string; origin: string; local: boolean; state: ToolServerState;
  ref: string; tool: string; effect: Effect; http: { method: string; path: string };
  untrustedResult: boolean; unsafeToRetry: boolean;
}
export type OriginCheck =
  | { ok: true; origin: string }
  | { ok: false; reason: "not_url" | "scheme" | "credentials" | "path" | "loopback" | "link_local" | "metadata" | "private" | "service_name" | "ipv6" };
export type ToolsErrorCode = "TOOLS_INVALID" | "TOOLS_NOT_FOUND" | "TOOLS_EXISTS" | "TOOLS_REFUSED" | "TOOLS_TENANT_MISMATCH";
export class ToolsError extends Error { readonly code: ToolsErrorCode; readonly details: Readonly<Record<string, string>>; }
// src/tools/origin.ts (exported from src/tools/index.ts)
export function validateOrigin(url: string, opts: { local: boolean }): OriginCheck;
// src/tools/surface.ts (exported from src/tools/index.ts)
export function surfaceDigest(surface: ToolSurface): string;
export function surfaceRefs(serverId: string, surface: ToolSurface, taken: ReadonlyMap<string, string>): Record<string, string>;   // tool name → ref; `taken`: ref → content hash
// src/tools/store.ts (exported from src/tools/index.ts)
export interface ToolServerDetail extends ToolServerRecord { approvedSurface: ToolSurface | null; pendingSurface: ToolSurface | null }   // addition
export function registerToolServer(pool: TenantPool, ctx: TenantContext, input: { id: string; adapter: ToolAdapter; origin: string; local: boolean; surface: ToolSurface }, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
export function registerToolServerTx(tx: TenantTx, ctx: TenantContext, input: { id: string; adapter: ToolAdapter; origin: string; local: boolean; surface: ToolSurface }, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;   // addition: in the caller's transaction
export function submitSurface(pool: TenantPool, ctx: TenantContext, serverId: string, surface: ToolSurface, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
export function approveSurface(pool: TenantPool, ctx: TenantContext, serverId: string, input: { digest: string; selfApproval: boolean }, actor: { userId: string; kind: "user" }, opts?: { clock?: Clock }): Promise<{ server: ToolServerRecord; blocks: string[] }>;
export function getToolServer(pool: TenantPool, ctx: TenantContext, serverId: string): Promise<ToolServerRecord | null>;
export function getToolServerDetail(pool: TenantPool, ctx: TenantContext, serverId: string): Promise<ToolServerDetail | null>;   // addition
export function listToolServers(pool: TenantPool, ctx: TenantContext, page: { limit: number; after: string | null }): Promise<ToolServerRecord[]>;
// src/tools/directory.ts (exported from src/tools/index.ts)
export interface ToolDirectory { resolve(ctx: TenantContext, ref: string): Promise<ToolBinding | null> }
export function createToolDirectory(pool: TenantPool): ToolDirectory;
// src/api/tool-server-routes.ts (exported from src/api/index.ts)
export interface ToolServerApiDeps { pool: TenantPool | null; clock: Clock; engineKey: KeyMaterial | null }
export function registerToolServerRoutes(server: FastifyInstance, deps: ToolServerApiDeps): void;
// test/support/tool-surface.ts
export function fixtureSurface(refs: readonly string[], opts?: { untrustedResult?: Readonly<Record<string, boolean>> }): ToolSurface;
```

**Interfaces taken:**

- From `add-block-registry`: `importCatalogue`, `getBlockVersion`, `listBlockVersions`, `normalizeBlockImport`, `BlockImport`, `RegistryError`.
- From `add-audit-chain`: `appendAudit`, `canonicalize`, `formatAt`, `AuditEventInput`, `KeyMaterial`. From `add-tenancy-foundation`: `withTenantTx`, `TenantPool`, `TenantTx`, `TenantContext`.
- From `add-api-pep`: `defineRoute`, `installPep`, `ApiError`.
- From `add-api-conventions`: `respondIdempotent`, `IDEMPOTENCY_HEADER_SCHEMA`, `PAGE_QUERY_SCHEMA`, `readPage`, `startAfter`, `pageRows`, `deriveCursorKey`.
- From `add-roles-and-memberships`: `grantRole`. From `add-test-catalogue`: `loadTestCatalogue`. From `add-fake-tools`: `FAKE_TOOLS_ORIGIN`, `fakeToolPath`.

## Out of scope

The MCP, OpenAPI and code-block adapters (U56), credentials (U48), grants (U49), invoking a tool (U50), the web pages (U52), a rollback to an older surface, a DNS check of an origin.
