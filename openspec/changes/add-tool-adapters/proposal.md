## Why

Every place that knows a tool hard-codes the M6 fixture shape (check, digest, directory, invoke path). Three adapters (HTTP/OpenAPI, MCP, code block) need the same changes and rule p allows one owner, so this unit makes them once behind injected adapters; U53, U54 and U55 only add.

Observable result: a stub HTTP adapter is sent as the one request its permit allows (`POST tools.fake.test /vendors/find`, TTL 60); a `code` call is authorised with `permit: null` and runs in the injected runner with no token and no send; an `http` or `mcp` call (or a fixture call) with no permit is refused `permit_missing` before any token request.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: the adapter seam. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

New: `src/tools/{calls,names,adapter-surface,adapter-store}.ts`, `test/support/adapter-kit.ts`, tests. `tool-registry` and `tool-invocation` ADDED; three `tool-invocation` requirements MODIFIED, each with a new scenario and test (rows R1 to R15 and C1 to C10 stay). No route, migration, part, API code, action, dependency, `main.ts` edit or egress site.

Rule R1 (security): a `permit` of `null` exists only for a binding whose call kind is `code`; an `http` or `mcp` call, and every fixture `http` binding, whose authorization has no permit is refused `permit_missing` before any token request or send, the decision row kept. The gateway client's own refusal stays.

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch. Not scaffolded: `SurfaceTool.http` becomes optional and `SurfaceTool` gains `call?: ToolCallSpec` (exactly one of the two); `ToolBinding.http` becomes optional and `ToolBinding` gains `call?: ToolCallSpec` (only for a call tool); `InvokePathDeps` gains `calls?: { readonly http?: CallAdapter<HttpCallSpec>; readonly mcp?: CallAdapter<McpCallSpec> }` and `code?: CodeRunner`; `invokeToolRequest`'s `egress` becomes `Egress | null` (null: no `egress` member); `CallAuthorization.permit` becomes `Permit | null`; `HarnessWrap` (`test/support/invoke-runs/harness.ts`) gains optional `calls` and `code`, passed to `createInvokePath`; the export lines of `src/tools/index.ts` (the names given below) and of `src/runtimes/index.ts` (type `CodeRunner`, value `callRequest`); the values of the five constants; the README row.
- **Depends on:** `add-tenancy-foundation`, `add-audit-chain`, `add-pdp-cedar`, `add-flow-format-model`, `add-block-registry`, `add-envelope-store`, `add-interpreter-core`, `add-effect-intents`, `add-gateway-client`, `add-tool-registry`, `add-tool-registry-followup-1`, `add-credentials`, `add-policy-deploy`, `add-tool-invocation`, `add-dry-runs` (all merged). U53, U54, U55 depend on this unit; U27b edits `src/interpreter/types.ts` after it (another member).
- **Changed:** no frozen test is edited (lesson z). `web/src/tools/servers.ts` already reads a tool without `http` as `http: null` (U56 design 2); no web change here.

**Interfaces taken:** the names in `delivered-shapes.md`. Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (`design.md` § Interfaces)

```ts
// src/tools/calls.ts (exported from src/tools/index.ts; type-only lines where a stub needs them)
export type ToolJson = null | boolean | number | string | ToolJson[] | { [key: string]: ToolJson };
export interface HttpCallSpec {
  kind: "http";
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;                                             // ^/[\x21-\x7e]{0,1023}$, no "?", "#" or "\"; whole-segment "{name}" placeholders
  params: readonly { name: string; in: "path" | "query" }[]; // send order; the "path" ones are exactly the placeholders
  body: boolean;                                            // true (POST, PUT, PATCH only): the input properties not in params form a JSON object body
}
export interface McpCallSpec {
  kind: "mcp";
  endpoint: string;                                         // ^/[\x21-\x7e]{0,1023}$, no "?" or "#"
  name: string;                                             // the server's tool name, ^[A-Za-z0-9_.-]{1,128}$
  protocolVersion: "2026-07-28" | "2025-11-25" | "2025-06-18" | "2025-03-26";
  output: "structured" | "text";
  hints?: { readOnly?: boolean; destructive?: boolean; idempotent?: boolean };   // the server's annotations as claimed; never decide effect or retry (m7-decisions R3)
}
export interface CodeCallSpec { kind: "code"; source: string }   // 1-65536 characters, no U+0000
export type ToolCallSpec = HttpCallSpec | McpCallSpec | CodeCallSpec;
export interface ToolHttpRequest { method: string; path: string; headers: Readonly<Record<string, string>>; body: Uint8Array | null }
export type CallBuild = { ok: true; request: ToolHttpRequest } | { ok: false; reason: string };
export interface ToolHttpResponse { status: number; headers: Readonly<Record<string, string>>; body: Uint8Array }
export type CallAnswer =
  | { ok: true; output: { [key: string]: ToolJson } }
  | { ok: false; stage: "upstream" | "response"; reason: string; status: number | null };
export interface CallAdapter<S extends HttpCallSpec | McpCallSpec> {
  build(call: S, args: ToolJson, idemKey: string | null): CallBuild;   // path and body never depend on idemKey
  answer(call: S, response: ToolHttpResponse): CallAnswer;
}
export const MCP_TEXT_OUTPUT_SCHEMA: Readonly<{ [key: string]: ToolJson }>;
  // { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false }
// src/tools/names.ts
export function toolNameOf(external: string): string | null;
// src/tools/adapter-surface.ts
export const CODE_BLOCK_ORIGIN: string;                     // "sandbox"
export const ADAPTER_CALL_KINDS: Readonly<Record<"http_openapi" | "mcp" | "code_block", ToolCallSpec["kind"]>>;   // { http_openapi: "http", mcp: "mcp", code_block: "code" }
export const MAX_SURFACE_CHARS: number;                     // 1048576 (canonical JSON of the surface)
export const MAX_CODE_SOURCE_CHARS: number;                 // 65536
export function checkAdapterSurface(adapter: ToolAdapter, surface: unknown): ToolSurface;   // ToolsError TOOLS_INVALID { field, reason }
// src/tools/adapter-store.ts
export function registerAdapterServerTx(tx: TenantTx, ctx: TenantContext, input: { id: string; adapter: "http_openapi" | "mcp" | "code_block"; origin: string; local: boolean; surface: ToolSurface | null }, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
export function submitAdapterSurfaceTx(tx: TenantTx, ctx: TenantContext, serverId: string, surface: ToolSurface, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<ToolServerRecord>;
// src/runtimes/invoke/types.ts (exported from src/runtimes/index.ts)
export type CodeRunner = (call: CodeCallSpec, args: JsonValue, ctx: StepContext) => Promise<ToolResult>;
// src/runtimes/invoke/request.ts (exported from src/runtimes/index.ts)
export function callRequest(target: ServiceTarget, request: ToolHttpRequest): ToolRequest;
  // request { method, origin: target.origin, path, headers, body }; egress { method, host: new URL(target.origin).host,
  // path, bodyDigest: bodyDigest(body), serviceId: target.serviceId, ttlSeconds: INVOKE_LIMITS.tokenTtlSeconds }
// test/support/adapter-kit.ts (stub adapters, runner and fixture surfaces of the U47b tests)
export function kitSurface(kind: ToolCallSpec["kind"], variant?: "b" | "c"): ToolSurface;
export function kitBinding(kind: ToolCallSpec["kind"], over?: Partial<ToolBinding>): ToolBinding;
export const kitHttpAdapter: CallAdapter<HttpCallSpec>;
export const kitMcpAdapter: CallAdapter<McpCallSpec>;
export function kitCodeRunner(): { run: CodeRunner; calls: { source: string; args: JsonValue; nodeId: string }[] };
```

## Out of scope

The adapters (U53-U55), routes, migrations, `main.ts` wiring and the web parse of a `call` tool (U56).
