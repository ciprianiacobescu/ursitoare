## Why

Main refuses every adapter but `fixture`; add-tool-adapters (U47b) gives the seam for another. This is the first adapter on it: an admin uploads an OpenAPI 3.0 or 3.1 JSON document and an overlay, previews the tools, registers the server and replaces its document later, and a flow calls the tools through the policy point and the gateway. The upload is read from the request, never fetched.

Observable result: `SHOP_DOC` with `SHOP_OVERLAY` (test-plan.md) registers server `shop` pending with four tools and digest `726b207d…c7ba`; after approval a call of `shop.get_vendor@1` with `{ vendor_id: "V ACME/1", expand: true, limit: 5 }` reaches the echo upstream as `GET /v1/vendors/V%20ACME%2F1?expand=true&limit=5`, equal to the method, host, path and body digest of its stored permit (exit 13).

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: the HTTP/OpenAPI adapter and its three routes. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

New: `src/tools/openapi/{types,read,schema,register}.ts`, `src/tools/http/adapter.ts`, `src/api/openapi-tool-routes.ts`, `test/support/openapi-kit.ts`, tests; capability `tool-http`. Edited in named tasks: the export lines of `src/tools/index.ts` and `src/api/index.ts`, `src/main.ts` (`calls: { http: httpCallAdapter }` in `createInvokePath`; `registerOpenApiToolRoutes`) and `docs/api/openapi.json` (regenerated; shared with U27b, U54, U55). No migration, e2e part, API error code, action, dependency or egress site. Effects come only from the overlay: an operation it does not name is not a tool. The generic `POST /api/v1/tool-servers` stays fixture-only.

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch, with the type declarations. Not scaffolded: the value of `HTTP_EMPTY_OUTPUT`; the export lines of `src/tools/index.ts` (the five types, type-only, and the seven values of the files below) and of `src/api/index.ts`; the two edits of `src/main.ts`; the regenerated document; the values of the kit (test-plan.md § Fixtures). No frozen test is edited.
- **Depends on:** `add-audit-chain`, `add-api-pep`, `add-api-conventions`, `add-flow-format-model`, `add-block-registry`, `add-fake-egress-proxy`, `add-gateway-client`, `add-tool-registry`, `add-credentials`, `add-tool-invocation` (all merged), `add-tool-adapters` (U47b, the seam), `add-validator-version` (U27b, shared `docs/api/openapi.json` only).

**Interfaces taken:** From `add-tool-adapters`: `ToolJson`, `HttpCallSpec`, `CallAdapter`, `ToolHttpRequest`, `CallBuild`, `ToolHttpResponse`, `CallAnswer`, `toolNameOf`, `checkAdapterSurface`, `registerAdapterServerTx`, `submitAdapterSurfaceTx`, `callRequest`, and the `calls` option of the invoke harness. From `add-validator-version`: no name, only the shared `docs/api/openapi.json`. Shapes of the delivered names: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (`design.md` § Interfaces)

```ts
// src/tools/openapi/types.ts (exported from src/tools/index.ts)
export interface OpenApiOverlayEntry { effect: Effect; name?: string; description?: string; untrusted_result?: boolean; unsafe_to_retry?: boolean; data_class?: "public" | "private" }
export interface OpenApiOverlay { operations: Readonly<Record<string, OpenApiOverlayEntry>> }   // key: operationId; 1-100 entries
export type OpenApiExclusion =
  | "no_operation_id" | "method_unsupported" | "param_location" | "param_schema" | "param_collision" | "path_template"
  | "body_media_type" | "body_not_object" | "response_not_object" | "ref_remote" | "ref_cycle" | "schema_invalid" | "reserved_name";
export interface OpenApiOperation { operationId: string | null; method: string; path: string; name: string | null; excluded: OpenApiExclusion | null }
export interface OpenApiPreview { version: "3.0" | "3.1"; basePath: string; operations: OpenApiOperation[] }
// src/tools/openapi/read.ts
export function readOpenApi(document: unknown, origin: string): OpenApiPreview;                              // ToolsError TOOLS_INVALID { field, reason }
export function importOpenApi(document: unknown, origin: string, overlay: OpenApiOverlay): ToolSurface;      // ToolsError TOOLS_INVALID { field, reason }
// src/tools/openapi/schema.ts
export function translateSchema(schema: unknown, version: "3.0" | "3.1", document: Readonly<Record<string, unknown>>):
  { ok: true; schema: { [key: string]: ToolJson } } | { ok: false; reason: "ref_remote" | "ref_cycle" | "schema_invalid" };
// src/tools/http/adapter.ts
export const httpCallAdapter: CallAdapter<HttpCallSpec>;
export const HTTP_EMPTY_OUTPUT: Readonly<{ type: "object"; additionalProperties: false }>;
// src/tools/openapi/register.ts
export function registerOpenApiServerTx(tx: TenantTx, ctx: TenantContext, input: { id: string; origin: string; local: boolean; document: unknown; overlay: OpenApiOverlay }, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
export function submitOpenApiTx(tx: TenantTx, ctx: TenantContext, serverId: string, input: { document: unknown; overlay: OpenApiOverlay }, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
// src/api/openapi-tool-routes.ts (exported from src/api/index.ts)
export interface OpenApiToolApiDeps { pool: TenantPool | null; clock: Clock; engineKey: KeyMaterial | null }
export function registerOpenApiToolRoutes(server: FastifyInstance, deps: OpenApiToolApiDeps): void;
// test/support/openapi-kit.ts (fixtures of this unit's tests; values in test-plan.md)
export const SHOP_ORIGIN: string;
export const SHOP_DOC: Readonly<Record<string, unknown>>;
export const SHOP_OVERLAY: OpenApiOverlay;
export function docOf(path: string, method: string, op: Record<string, unknown>, extra?: Record<string, unknown>, version?: string): Record<string, unknown>;
```

## Out of scope

Documents fetched by url, YAML, remote `$ref`, header and cookie parameters, non-JSON bodies, security schemes (the credential is Mintkey's), `servers` variables, effects read from the document, a `README` row for the kit (U47b and U54b edit that file), the web form (U56).
