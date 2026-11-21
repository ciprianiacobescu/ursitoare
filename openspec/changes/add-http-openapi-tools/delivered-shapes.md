# Delivered shapes taken by add-http-openapi-tools

Merged code at main@3daa5c35 (`file:line`; `…` elides unused members). The names of add-tool-adapters are in its proposal.

```ts
registry/block-input.ts:203     normalizeBlockImport(ref: unknown, block: unknown): NormalizedBlock   // meta-validates input and output (no compile), definition <= 262144 canonical characters, description <= 2000; throws RegistryError (registry/errors.ts:1-15, code REGISTRY_INVALID | REGISTRY_SCHEMA_INVALID | …)
interpreter/schema.ts:9         checkSchema(schema: unknown, data: JsonValue): { ok: true } | { ok: false; path: string; keyword: string }   // Ajv2020 { strict: false }, compiled on each call; a compile error answers ok false
tools/types.ts:5-41,80-90       Effect; ToolSurface; ToolServerRecord { id; adapter; origin; local; state; registeredBy; registeredAt; approvedDigest; pendingDigest; pendingSubmittedBy; tools: { name; effect; ref }[] }; ToolsError(code: "TOOLS_INVALID" | "TOOLS_NOT_FOUND" | "TOOLS_EXISTS" | "TOOLS_REFUSED" | …, message, details?: Record<string, string>)
tools/surface.ts:26-32,105-114  surfaceDigest(surface: ToolSurface): string = "sha256:" + hex; badPath refuses "#", "\" and "." or ".." segments (also %2e)
tools/store.ts:446-453          approveSurface(pool, ctx, serverId, { digest; selfApproval }, { userId; kind: "user" }, opts?): Promise<{ server: ToolServerRecord; blocks: string[] }>   // imports the blocks <server>.<tool>@1
tools/origin.ts:187             validateOrigin(url: string, opts: { local: boolean }): { ok: true; origin: string } | { ok: false; reason: "not_url" | "scheme" | … }   // origin "https://host[:port]"
api/tool-server-routes.ts:63-98,124-160,162-220   RECORD_SCHEMA and mapToolsError (module-internal): TOOLS_INVALID -> 400 VALIDATION_FAILED { fields: [{ field, message }] }, TOOLS_EXISTS -> 409 ALREADY_EXISTS, TOOLS_REFUSED -> 422 OPERATION_REFUSED { reason }, TOOLS_NOT_FOUND -> 404; the POST route is defineRoute({ method, url, auth: { kind: "session" }, action: "register_tool_server", schema, errors, handler }) with respondIdempotent({ pool, clock }, request, reply, tx => ({ status: 201, body })); its context() throws unavailable() when deps.pool is null
api/route.ts:280; api/idempotency.ts:14,221; api/flow-common.ts:66   defineRoute(server, def); IDEMPOTENCY_HEADER_SCHEMA, respondIdempotent; unavailable(): 503 AUTHZ_UNAVAILABLE
main.ts:292,359                 registerToolServerRoutes(server, { pool: pep.pool, clock: pep.clock, engineKey: config.engineKey }); createInvokePath({ pool, policy, gateway, tools, services, principals, loadVersion, catalogueFor, clock, logger })
pdp/permit.ts:5-6               host ^[a-z0-9.-]{1,253}(:[0-9]{1,5})?$, path ^/[\x21-\x7e]{0,2047}$
pdp/decisions-query.ts:14-28    PolicyDecisionRecord { decisionId; …; permit: Record<string, unknown> | null };  grants/args.ts:99-131 toCedarArgs puts url and url_host = hostOf(url) (pdp/values.ts:32) into context.args and refuses a caller url_host
gateway/tenant.ts:3             mintkeyTenantId(tenantId: string): string
test/support (fake-egress/echo.ts:5-10, fake-egress/index.ts:34-86, invoke-runs/harness.ts:95-118)   startEchoUpstream(): { origin; close() }, which answers 200 { method, path (query removed), query, headers, bodySha256 }; FakeEgress { addUpstream(host, origin); addCredentialless(serviceId, tenantId, targetUrl); requests(): { host; method; path; query; headers; bodySha256; outcome; … }[]; brokerServiceToken }; invokeHarness(wrap?) -> { ctx; pool; egress; decisions(runId); deploy(source); start(key, input, runId); path; logs() }, to whose wrap add-tool-adapters adds `calls`
```
