# Delivered shapes taken by add-tool-adapters

Merged code at main@3daa5c35 (`file:line`; `…` elides unused members).

```ts
// src/tools
types.ts:8-27    type ToolAdapter = "fixture" | "mcp" | "http_openapi" | "code_block"; interface SurfaceTool { name; description?; effect; input; output; untrusted_fields?; untrusted_result?; unsafe_to_retry?; data_class?; http: { method; path } }  interface ToolSurface { tools: SurfaceTool[] }
types.ts:29-54   interface ToolServerRecord { id; adapter; origin; local; state; registeredBy; registeredAt; approvedDigest; pendingDigest; pendingSubmittedBy; tools: { name; effect; ref: string | null }[] }  interface ToolBinding { serverId; origin; local; state; ref; tool; effect; http: { method: string; path: string }; untrustedResult; unsafeToRetry }
types.ts:73-90   type ToolsErrorCode = "TOOLS_INVALID" | "TOOLS_NOT_FOUND" | "TOOLS_EXISTS" | "TOOLS_REFUSED" | "TOOLS_TENANT_MISMATCH"; class ToolsError(code, message, details?: Record<string, string>)
surface.ts:11-32 normalizeTool(tool: SurfaceTool): unknown (reads tool.http at :22); surfaceDigest(surface: ToolSurface): string = "sha256:" + hex of canonicalize(tools sorted by name, normalized)
surface.ts:34-72,144-202 toolBlock, toolHash, surfaceRefs; checkSurface(surface: unknown): ToolSurface (module-internal; an unknown tool key is `tools/<i>` unknown_property)
store.ts:57-94,131-223 assertTenant(tx, ctx); checkAdapter (refuses all but fixture); checkOrigin; newestSurface, approvedSurface, toRecord, loadServer (module-internal)
store.ts:243-305 registerToolServerTx(tx: TenantTx, ctx: TenantContext, input: { id; adapter; origin; local; surface }, actor, opts?: { clock?: Clock }): Promise<ToolServerRecord>
store.ts:307-396 submitSurface(pool, ctx, serverId, surface: ToolSurface, actor, opts?): Promise<ToolServerRecord> (checkSurface, row FOR UPDATE, insert with submitted_at GREATEST(clock, newest + 1 µs)); refused(reason): ToolsError
directory.ts:7-9,95 ToolDirectory { resolve(ctx, ref): Promise<ToolBinding | null> }; createToolDirectory(pool) copies tool.http.method and .path
origin.ts:187 validateOrigin(url, { local }): OriginCheck
// src/runtimes/invoke, src/interpreter
types.ts:14-44   interface InvokePathDeps { pool; policy; gateway; tools; services; principals; loadVersion; catalogueFor; clock; logger }  interface ToolRequest { request: OutboundRequest; egress: Egress }  INVOKE_LIMITS { tokenTtlSeconds: 60; maxEntities: 24 }
request.ts:35,98 toolRequest(binding, target, args, idemKey): ToolRequest (reads binding.http); invokeToolRequest({ …; egress: Egress }): PolicyRequest
path.ts:36-59,66-237 denied(call, ctx, reason, extra), failed(call, details); createInvokePath(deps): authorize (86-179; `permit === undefined` is a `policy` deny, 173-175), invoke (181-228); WeakMap `authorised` (67)
interpreter/types.ts:23-70 ToolCall { tool; args: JsonValue; nodeId; effectSeq; … }  ToolResult { output: JsonValue }  StepContext { …; idemKey; effect; hook?; authorization?; taint? }  CallAuthorization { readonly decisionId: string; readonly permit: Permit }
// other modules
pdp/types.ts:22-50 Egress { method; host; path; bodyDigest; serviceId; ttlSeconds }  Permit = Egress  PolicyRequest { …; egress?: Egress }  Decision { …; permit?: Permit };  pdp/check.ts:75-77 an allow gets a permit only when the request has an egress member;  pdp/log.ts:132 no permit is stored as null
gateway/types.ts:14-20,54-62 OutboundRequest { method; origin; path; headers; body }  Gateway { requestToken(permit, tag); send(permit, request, token, tag) };  gateway/digest.ts:6 bodyDigest(body: Uint8Array | null): string
credentials/types.ts:20 ServiceTarget { serviceId; origin };  audit/event.ts:5 AuditEventInput;  audit/index.ts:5 canonicalize;  tenancy/tx.ts:6-24 TenantTx, withTenantTx;  registry/block-input.ts:203 normalizeBlockImport
// test support
invoke-runs/harness.ts:95-99,214 HarnessWrap (policy, tools, services, principals, loadVersion, catalogueFor wrappers; gateway(real, egress)); invokeHarness(wrap?) calls createInvokePath(deps) at :364
```
