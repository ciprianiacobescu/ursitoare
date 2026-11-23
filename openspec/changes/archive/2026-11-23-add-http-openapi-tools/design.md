## Decisions

1. **Where the code sits.** `tools` may import `registry` but not `authoring`, so `translateSchema` decides `schema_invalid` by calling `normalizeBlockImport("probe@1", { effect: "read", input: schema, output: { type: "object" } })` and mapping any `RegistryError` to it. `src/tools/http/adapter.ts` imports no gateway name, so the three frozen egress inventories stay as they are (U47b's `callRequest` builds the egress). The read, import, translate and build functions are pure.
2. **Translation, checked on main, not as the card assumed.** Ran: `normalizeBlockImport` accepts `nullable`, `example`, `xml`, `externalDocs`, `x-*` and `format: int64` untranslated (it only meta-validates; strict errors need `compile`), the one runtime compiler, `checkSchema`, is `strict: false`, and Ajv understands `nullable`; so conflict 17 ("fail unless translated") is false for these keywords. Translation stays for other reasons: L3 `typeSet` (`src/authoring/validate/jsonschema.ts:55`) reads only `type`, so `nullable` would type a nullable output as never null; U47b's `param_type` needs a plain `type`; the stored schema is plain 2020-12. Ran, and these bite: a kept `$id` fails the second `checkSchema` of an equal schema (each load gives a new object, so every call after the first would be refused); a 3.0 boolean `exclusiveMinimum` fails the meta-schema; an unresolved `$ref` passes it but fails every `compile`, rejecting the output after the request went out. So `$id` and `$schema` are dropped and `$ref` is inlined or refused. Lens C added three bounds. `pattern` is dropped and `patternProperties` refused: `checkSchema` runs a third party's regular expression on the main thread (`^(a+)+$` took 5 s on 30 characters), and dropping `patternProperties` would turn its properties into `additionalProperties` failures. Inlining stops at 20,000 schema objects, because the depth bound of 32 allows 2^31 nodes from a 3 KB document and the size bounds are checked only on the result. Nesting past 64 is refused before descending, so a 1 MiB document of 100,000 nested objects cannot overflow the stack.
3. **What the card left open.** `method_unsupported` also covers a `get` or `delete` with a `requestBody` (`HttpCallSpec.body` is for `POST`, `PUT`, `PATCH`); a nullable query parameter is `param_schema` (a `type` array fails U47b's `param_type`); parameter names are limited to `^[A-Za-z0-9_.-]{1,64}$` (the name is written into the query); `.` and `..` segments are `path_template` (U47b's `badPath` refuses them) and a path value `.` or `..` is `path_param` (`encodeURIComponent` keeps dots); style and explode are ignored (scalars only); a repeated `operationId` refuses the document, as the overlay is keyed by it; `x-*` is dropped for 3.0 only, as carded.
4. **Effects are the admin's.** The document sets no effect or flag; defaults are `untrusted_result` true and `unsafe_to_retry` false for `read`, true for every other effect: on recovery after a crash the engine re-invokes an intent whose tool is not `unsafe_to_retry`, so a `pay` tool of an API that ignores `Idempotency-Key` must not default to safe (as MCP, R3). No web control sets the flag; only the overlay does (a `read` on a non-GET operation makes dry runs call the real tool: U56b's review should say so).
5. **One path through the seam.** Lookups keyed by an operationId use `Object.hasOwn`, so an operation named `constructor` or an overlay key `toString` reads no inherited member. `submitOpenApiTx` reads `adapter` and `origin` of the server row in its transaction (immutable: the app role updates `state` and `approved_digest` only), imports with that origin, then `submitAdapterSurfaceTx`, so the lock, `surface_known` and the same-instant rule are U47b's. The document is not stored; a changed document or overlay is a new digest. Imports run before any insert.
6. **Routes.** The record schema and error mapping copy those of `src/api/tool-server-routes.ts` (module-internal, not this unit's to edit). Preview needs the PEP like the others, so a null pool is 503.
7. **Inherited reasons.** `httpCallAdapter` never throws and its reasons match `^[a-z][a-z0-9_]{0,63}$`, so U47b's `authorize` reports a build failure as `INTERPRETER_TOOL_FAILED` `{ stage: "request", reason }` (`adapter_reason` and `adapter_error` are its fallbacks for a bad text and a throw) and an allow without a permit as `permit_missing`; this unit adds none.
8. **Tests.** The exit rows run the harness of `src/runtimes/invoke/invoke.db.test.ts` with U47b's `calls` option and `shop` registered and approved in its database, so the call resolves through the real directory and the PEP records a real decision. Main registers the routes whatever its database, so the served OpenAPI document proves them; no unit test builds the invoke path of `src/main.ts` (it needs a database, an egress and a durable runtime), so `calls` is asserted by reading its text and U56c's journey exercises it live.

## Interfaces

Equal to `proposal.md`. Merged shapes: `delivered-shapes.md`.

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

## Failure cases and security

A bad document or overlay is a `TOOLS_INVALID` with a field and a reason; no `$ref` is followed outside the document; chains are bounded (32) and so is the surface (1,048,576 characters, since inlining can multiply a schema). A path value cannot add a segment, a dot segment or a query part. The request goes only through the gateway under its permit, and no error or log line holds uploaded text, a header value or a token.

## Verification

**Ran** (Node 24.22.2, scratch copy of main@3daa5c35, scratch versions of the functions): every row of `test-plan.md`, the findings of decision 2 and the wire of E1 to E3. **Derived by reading:** `test-plan-runs.md` (it needs U47b's code), the field mapping and the `src/main.ts` placement.
