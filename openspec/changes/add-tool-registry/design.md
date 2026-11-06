## Context

An admin registers a server with its origin and an inline surface (the `fixture` adapter, D15); a second admin approves the surface digest; approval writes one immutable, bound block version per tool through `importCatalogue`; a changed surface drifts the server until its new digest is approved. U50 reads the result through `ToolDirectory`.

## Decisions

### Module layout
`tools` may not import `authoring` (`test/arch/modules.ts:23`), so `Effect` and `JsonSchema` alias `BlockImport["effect"]` and `["input"]` (D24). Module-internal: `checkSurface`, `toolBlock`, `toolHash` (`surface.ts`), `assertTenant` (`store.ts`).

### validateOrigin
`new URL(url)`; the first failing check is the reason: unparsable or over 2048 characters `not_url`; scheme not `https:` (`http:` too when `local`) `scheme`; a user name or password `credentials`; `href` not equal to `origin + "/"` (a path, query, fragment, bare `?`) `path`; then the host, without a trailing dot, in one class. IPv4: `169.254.169.254` `metadata`; `127/8`, `0/8` `loopback`; `169.254/16` `link_local`; `10/8`, `172.16/12`, `192.168/16`, `100.64/10` (RFC 6598 shared address space: cloud networks, Tailscale) `private`. IPv6: `::`, `::1` `loopback`; `fd00:ec2::254` `metadata`; IPv4-mapped, IPv4-compatible and `64:ff9b::/96` by their IPv4; `fe80::/10` `link_local`; `fc00::/7` `private`; an IPv6 host that passes every class (public, or `private` with `local`) is `ipv6`, because the PDP's permit host pattern (`src/pdp/permit.ts:5`, `^[a-z0-9.-]{1,253}(:[0-9]{1,5})?$`, merged U11) admits no bracketed host, so such a server could never be called; IPv6 tool origins are a later change of the PDP, this unit and U46 together. Names: `localhost`, `*.localhost` `loopback`; `metadata.google.internal` `metadata`; `broker`, `vault`, `proxy`, `postgres`, `keycloak`, `engine` and the compose names of architecture §4.3, `ursitoare`, `mintkey-broker`, `mintkey-proxy`, `mintkey-vault`, bare or with `.local`, `service_name` (test-plan § Origins rows 26 and 27 are `http://mintkey-vault:8084`, the plaintext vault port, and `http://ursitoare:8090`, the internal listener, both with `local` and both `service_name`); `host.docker.internal`, `host-gateway` `private`. `private` passes when `local`. WHATWG parsing turns `2130706433` into `127.0.0.1`.

### The surface check
`checkSurface` throws `TOOLS_INVALID` with `details` `{ field, reason }`, `field` relative to the surface: `tools` (`not_object`, `not_array`, `size` outside 1-100); per tool `tools/<i>` (`not_object`, `unknown_property`), `…/name` (`bad_value`, `duplicate`), `…/http` (`not_object`), `…/http/method`, `…/http/path` (`bad_value`, also for a path holding `#` or `\`, or a segment before `?` that is `.` or `..` once `%2e` is decoded, which U46's `send` always refuses), `…/http/method` `method_without_body` for `GET` or `DELETE` when `input.properties` or `input.patternProperties` has a key; then `normalizeBlockImport` of the tool's block, its `RegistryError` becoming `tools/<i>/<details.field>` with `details.reason` (`schema_invalid` for `REGISTRY_SCHEMA_INVALID`).

### The digest and fixtureSurface
`surfaceDigest` is `sha256:` plus the hex SHA-256 of `canonicalize` (U08) over the unwrapped array of tools sorted by name (code units), each `{ name, description ?? null, effect, input, output, untrusted_fields (sorted copy, [] when absent), untrusted_result ?? true, unsafe_to_retry ?? false, data_class ?? null, http: { method, path } }`. `fixtureSurface` takes `loadTestCatalogue().block(ref)` (else `Error("unknown test block <ref>")`), names the tool by the text between the first `.` and the last `@` (a repeat is `Error("duplicate tool name <name>")`), copies `description`, `untrusted_fields`, `data_class`, `unsafe_to_retry` when present, sets `untrusted_result` only when `opts.untrustedResult` has the ref (`Object.hasOwn`) and `http` to `{ method: "POST", path: fakeToolPath(ref) }`; `D_A` pins the content of `SURF_A`.

### The block of a tool
`toolBlock` is the tool without `name` and `http`, `untrusted_fields ?? []`, `untrusted_result ?? true`, `unsafe_to_retry ?? false`, plus `binding: { server, tool }`; `toolHash` is its `normalizeBlockImport(…).contentHash`, independent of the ref; `resolve` compares it with the version's `contentHash`, so an older major stops resolving once its tool's block changed. `http` is outside the block: a changed `http` keeps the ref and the approved digest covers it. `taken` is read by paging `listBlockVersions(tx, ctx, { limit: 201, after })` from the cursor `"<serverId>."` while refs start with that prefix (contiguous in `COLLATE "C"`, unbound `erp.*`-style blocks included).

### Tables and operations
Besides keys and grants: `tool_server` `CHECK ((state = 'pending') = (approved_digest IS NULL))`; `tool_surface` a `CHECK` that the approval columns are all null or all set; `registered_by`, `submitted_by`, `approved_by` hold an audit actor id with no foreign key. The newest surface has the greatest `(submitted_at, surface_digest)`. Submit runs in one transaction with the server row `FOR UPDATE`; a stored digest passes only as the newest unapproved one. Approve: transaction 1 decides in the spec's order and computes `taken` and refs; `importCatalogue` runs as `{ kind: "user", id: userId }`; transaction 2 locks the server row, re-checks that the newest surface is the same unapproved digest (else `digest_mismatch`), sets the approval columns (`self_approved` = approver is submitter), `state` and `approved_digest`, and appends the event with the sorted refs.

### Routes
`adapter` is an enum of the four values (`bogus` is 400, `mcp` 422). `TOOLS_INVALID` becomes 400 `VALIDATION_FAILED` with `fields[0]` `{ field, message: reason }`, `field` being `body/surface/<field>` when it starts `tools` on register and `body/<field>` otherwise; `TOOLS_EXISTS` 409 `ALREADY_EXISTS`; `TOOLS_REFUSED` 422 `OPERATION_REFUSED` `{ reason }`; `TOOLS_NOT_FOUND` 404 `NOT_FOUND`. Lists page by `[id]` in scope `tool_servers` as `block-routes.ts` does. Audit targets are `{ kind: "tool_server", id }`.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Merged shapes: `delivered-shapes.md`.

```ts
// src/tools/types.ts (exported from src/tools/index.ts)
type Effect = BlockImport["effect"];      // module-internal aliases: `tools` may not import `authoring`
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
  approvedDigest: string | null; pendingDigest: string | null; pendingSubmittedBy: string | null;   // submitter of the newest unapproved surface, else null (addition, ruling U52-1)
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
  // one tool per test-catalogue ref, named by the part between the first "." and "@"
```

## Failure cases and security

An error between `importCatalogue` and the second transaction leaves the server `pending` and the blocks inert; the repeat finds them `unchanged`. A submit between the steps makes the second transaction throw `digest_mismatch`, and a ref taken meanwhile with other content is `ref_conflict` (derived, not run). `resolve` rejects on a database failure, so U50 fails closed. Forced RLS plus `assertTenant` isolate tenants. The engine never resolves a tool host: U46 sends every call to the configured proxy and only compares `request.origin` with the permit, so a public name whose DNS answer is a loopback, private, link-local or metadata address passes here. The address check after resolution belongs to the egress network in front of the proxy and is a first-stack-run check of M8, as D16's vault write is.

## Decisions made while writing

- Per-file headers; `AuditActor` becomes `AuditEventInput["actor"]` (ruling R3); `Effect` and `JsonSchema` derive from `BlockImport`.
- Seam additions: `registerToolServerTx` (the server and the route's idempotency record commit together, R2), `ToolServerDetail`, `getToolServerDetail` (the approval view needs the surfaces).
- A stored digest that is neither the approved nor the newest unapproved is refused (`surface_known`): the card grants no update of `submitted_at`, so a rollback needs a later unit.
- The approver is compared with the pending surface's submitter (the card); `100.64.0.0/10` is `private` (orchestrator ruling on question 4).
