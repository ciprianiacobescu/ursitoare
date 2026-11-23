## Why

An admin registers an MCP server by URL; its tools are discovered through the egress gateway under a recorded policy decision per request, the surface is approved and a flow calls the tools. MCP is spoken by hand (an SDK would send outside the permit check). Three rules bind: **R2** a server that needs a session is refused at discovery, **R3** a server's annotations never decide an effect or retry safety, **R4** a tool that is left out is reported.

Observable result: `discoverMcp` through the fake egress records 2 allow decisions whose permits equal the fake MCP's `bodySha256`; a session server is refused `mcp_session_required` after 2 requests; `find_vendor` (`readOnlyHint: true`) is `write` and unsafe to retry until the overlay says `read`; `route_ticket` is listed `x_mcp_header`.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: the MCP client, its discovery and its routes. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New `src/tools/mcp/{wire,adapter,surface,discover,register}.ts`, `src/api/mcp-tool-routes.ts`, migration `0540_mcp_servers.sql` (`mcp_server`, immutable), tests. Capability `tool-mcp` ADDED; one `tool-invocation` requirement MODIFIED (the egress inventory).
- `src/tools/mcp/discover.ts` is the only egress site M7 adds (D10); the three frozen inventory copies change in task 4.1. Named edits of `src/main.ts`, `docs/api/openapi.json` and two index files, after U53's.
- `src/api/idempotency.ts` gains one ADDED read-only helper, `storedIdempotentReply`, so a replayed discover answers the stored body and sends nothing; the base `respondIdempotent` requirement is untouched.
- No new API error code, action, fragment or dependency (D21): discovery reuses `register_tool_server` with an `egress` member, so the PEP issues a permit.

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch. The stub of `src/tools/mcp/discover.ts` imports the gateway as types only (a value import would make it an uninventoried egress site on the base). Not scaffolded: migration `0540_mcp_servers.sql`; the call of `storedIdempotentReply` in the discover route; the export lines of `src/tools/index.ts` and `src/api/index.ts`; the `calls.mcp` and routes edits of `src/main.ts`; `docs/api/openapi.json`; the three inventory literals.
- **Depends on:** `add-tenancy-foundation`, `add-audit-chain`, `add-pdp-cedar`, `add-api-conventions`, `add-api-pep`, `add-block-registry`, `add-gateway-client`, `add-fake-egress-proxy`, `add-tool-registry`, `add-credentials`, `add-tool-invocation`, `add-tool-adapters` (U47b: the seam), `add-fake-mcp` (U54b), `add-flow-format-model`, `add-policy-deploy`, `add-http-openapi-tools` (U53: it edits `src/main.ts`, `docs/api/openapi.json` and the same export lines first; this unit follows in named tasks).
- **Changed (frozen):** the inventory literal of `test/arch/egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory`, `src/credentials/egress-site.test.ts::C-0c230dcb the credentials module is one inventoried egress site` and `src/runtimes/invoke/request.test.ts::C-2a04f1cb only request ts is an egress site of runtimes` gains `src/tools/mcp/discover.ts`; a new test of this unit's own C-id is `src/tools/mcp/egress-site.test.ts`.
- **Rulings** (`m7-decisions.md`): D10 to D17, R2, R3, R4, R6. R3 replaces D14's defaults; the server's claims are `call.hints`, a member U47b gives `McpCallSpec`.
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (`design.md` § Interfaces)

```ts
// src/tools/mcp/wire.ts (exported from src/tools/index.ts)
export const MCP_MODERN_VERSION: "2026-07-28";
export const MCP_LEGACY_VERSIONS: readonly ("2025-11-25" | "2025-06-18" | "2025-03-26")[];   // preference order
export const MCP_CLIENT_INFO: Readonly<{ name: string; version: string }>;                   // { name: "ursitoare", version: "0.1" }
export function mcpBody(id: number | null, method: string, params: { [key: string]: ToolJson }, version: McpCallSpec["protocolVersion"]): Uint8Array;
export function mcpHeaders(method: string, name: string | null, version: McpCallSpec["protocolVersion"], idemKey: string | null): Readonly<Record<string, string>>;
export function mcpNameHeader(name: string): string;
export type McpReply = { ok: true; result: { [key: string]: ToolJson } } | { ok: false; reason: "rpc_error" | "not_json" | "no_reply"; code: number | null };
export function readMcpReply(response: ToolHttpResponse, id: number): McpReply;
// src/tools/mcp/adapter.ts
export const mcpCallAdapter: CallAdapter<McpCallSpec>;
// src/tools/mcp/surface.ts
export interface McpOverlayEntry { skip?: true; name?: string; effect?: Effect; untrusted_result?: boolean; unsafe_to_retry?: boolean; data_class?: "public" | "private" }
export interface McpOverlay { tools: Readonly<Record<string, McpOverlayEntry>> }   // key: the server's tool name; at most 100
export type McpExclusion = "x_mcp_header" | "schema_invalid" | "output_not_object" | "name_invalid" | "not_listed" | "skipped" | "description";
export function mcpSurface(tools: readonly unknown[], at: { endpoint: string; protocolVersion: McpCallSpec["protocolVersion"] }, overlay: McpOverlay):
  { surface: ToolSurface; excluded: { name: string; reason: McpExclusion }[] };   // ToolsError TOOLS_REFUSED { reason: "name_collision" | "no_tools" | "too_many_tools" }; TOOLS_INVALID { field, reason } for a bad overlay
// src/tools/mcp/discover.ts (value-imports bodyDigest and GatewayError: the M7 egress site)
export interface ServiceLookup { resolve(ctx: TenantContext, toolServerId: string): Promise<{ serviceId: string; origin: string } | null> }
export interface McpDiscoveryDeps { pool: TenantPool; policy: Pick<PolicyEngine, "check">; gateway: Gateway; services: ServiceLookup; ids: IdSource }
export interface McpDiscovery { surface: ToolSurface; era: "modern" | "legacy"; protocolVersion: McpCallSpec["protocolVersion"]; excluded: { name: string; reason: McpExclusion }[]; decisionIds: string[] }
export function discoveryRequest(ctx: TenantContext, principal: PrincipalEntity, egress: Egress): PolicyRequest;
export function discoverMcp(deps: McpDiscoveryDeps, ctx: TenantContext, input: { serverId: string; endpoint: string; principal: PrincipalEntity; overlay: McpOverlay }): Promise<McpDiscovery>;
// src/tools/mcp/register.ts
export function registerMcpServerTx(tx: TenantTx, ctx: TenantContext, input: { id: string; url: string; local: boolean }, actor: AuditEventInput["actor"], opts?: { clock?: Clock }): Promise<{ server: ToolServerRecord; endpoint: string }>;
export function mcpEndpointOf(tx: TenantTx, ctx: TenantContext, serverId: string): Promise<string | null>;
// src/api/idempotency.ts (read-only lookup; not re-exported)
export function storedIdempotentReply(ctx: { pool: TenantPool; tenant: TenantContext; clock: Clock }, principal: { userId: string }, key: string, requestDigest: string): Promise<IdempotentResponse | null>;   // the stored { status, body } of a done row of the last 24 h with this digest; null for none, in progress or older; ApiError 422 IDEMPOTENCY_KEY_REUSED for another digest
// src/api/mcp-tool-routes.ts (exported from src/api/index.ts)
export interface McpToolApiDeps { pool: TenantPool | null; clock: Clock; ids: IdSource; engineKey: KeyMaterial | null; policy: Pick<PolicyEngine, "check"> | null; gateway: Gateway | null; services: ServiceLookup | null }
export function registerMcpToolRoutes(server: FastifyInstance, deps: McpToolApiDeps): void;
```

**Interfaces taken:**

- From `add-tool-adapters`: `ToolJson`, `McpCallSpec` (with U47b's optional member `hints?: { readOnly?: boolean; destructive?: boolean; idempotent?: boolean }`, checked by `checkAdapterSurface` for `mcp` only and digested only when present), `ToolHttpResponse`, `CallAdapter`, `CallBuild`, `CallAnswer`, `MCP_TEXT_OUTPUT_SCHEMA`, `toolNameOf`, `checkAdapterSurface`, `registerAdapterServerTx`, `submitAdapterSurfaceTx`, `callRequest`, `kitBinding`.
- From `add-fake-mcp`: `startFakeMcp`, `FakeMcp`, `FakeMcpOptions`, `FakeMcpRequest`, `FAKE_MCP_TOOLS`, `FAKE_MCP_HOST`, `FAKE_MCP_ORIGIN`.

## Out of scope

Stateful legacy sessions (M8 decides), `x-mcp-header` mirroring (M13), scheduled rediscovery, the web (U56, U56b), the other adapters (U53, U55), a real server or Mintkey (M8).
