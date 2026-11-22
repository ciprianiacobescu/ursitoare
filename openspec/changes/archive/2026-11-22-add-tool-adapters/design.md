## Decisions

1. **The call union.** A surface tool has `http` or `call`, never both; a binding carries `call` only for a call tool and `http` only for an `http` tool, a member absent and never `undefined` (lesson z). `toolBlock`, `toolHash` and `surfaceRefs` read neither, so a re-approved call (changed source, endpoint or path) keeps its block ref and changes only the digest, which drifts the server until it is approved again (D20; §8.4 "behaviour is pinned" fails for such a ref: flag for the wiki).
2. **Digest and checks.** `normalizeTool` is M6's plus `http` only when present and `call` only when present, so every M6 vector holds; `params` keeps its send order. `checkAdapterSurface` checks structure, then the block part (so `input.properties` is an object), then the rules that read `input` or `output`; `property_unsent` generalises M6's `method_without_body`. For `http_openapi` and `mcp` a leftover `pattern` or `patternProperties` is refused (reason `pattern`), a backstop for U53 and U54: a server-supplied pattern can make Ajv run in exponential time.
3. **One locked submit.** `store.ts` factors the body of `submitSurface` into a module-internal function taking the open transaction, the server id and a callback that checks the surface for the locked row's adapter. `submitSurface` (`checkSurface` first, `adapter_mismatch` for a non-fixture server) and `submitAdapterSurfaceTx` (`adapter_mismatch` for a fixture server, then `checkAdapterSurface`) both call it, so the `FOR UPDATE` and the `GREATEST(now, newest + 1 microsecond)` insert exist once and the newest surface wins a tie. `registerAdapterServerTx` shares an insert helper with `registerToolServerTx`; the helpers `adapter-store.ts` needs are exported from `store.ts`, not `index.ts`.
4. **Dispatch.** `callRequest` sits in `request.ts`, the one inventoried egress site of `runtimes`. After `surface_drift` a call binding needs its adapter (`adapter_unavailable`); a `code` binding skips the service lookup. After `fingerprint_unavailable` the request is built: fixture `toolRequest`; `http` and `mcp` `adapter.build(call, args, null)` then `callRequest(target, build.request)`, whose `egress` goes to the PEP; `code` `invokeToolRequest` with `egress: null`. `invoke` rebuilds with `ctx.idemKey`; the gateway stops a rebuild that differs from the permit (`GATEWAY_PERMIT_MISMATCH`, stage `send`). Adapter `reason` text is copied only when it matches `^[a-z][a-z0-9_]{0,63}$` (lesson t).
5. **R1 in two places.** The PEP gives an allow a permit only for a request with an `egress` member, so a `code` allow has none and `authorize` answers `permit: null`; an allow without a permit for any other binding is refused after its decision is recorded, as `permit_missing` `{ reason, decisionId }`. This replaces M6's `policy` deny for that case; no frozen test pins it (grep). `invoke` repeats the check on the authorization it holds (an unfrozen object, as on main). `HarnessWrap` gains `calls` and `code` because the harness builds `createInvokePath`.

## Interfaces

Equal to `proposal.md`. Merged shapes: `delivered-shapes.md`.

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

## Failure cases and security

- A rejected lookup is `INTERPRETER_TOOL_FAILED` `{ stage: "authorize" }`; a throwing adapter is `adapter_error`; a rejecting runner is `{ stage: "code", reason: "runner" }`; no tool text, header value, token or credential reaches a message, detail or log line. A missing adapter or runner is `adapter_unavailable` before the check; sources and surfaces are bounded; a code tool is `read` and `untrusted_result` false only (D20).

## Verification

**Ran** (Node 24.22.2, scratch copy of main@3daa5c35): the digests, the block part of the four fixture tools, `checkSurface` on `FIX`, `validateOrigin`, every `toolNameOf` vector, the canonical sizes. **Derived by reading:** the K-row fields and rows G, F, H, Q, P, A.
