Names taken from merged main@71defd22 (read against the file named, `export` omitted), each cited `file:line`; paths without a directory are in `web/src/tools/`.

```ts
// servers.ts
:7-24   interface ToolServerView { id: string; adapter: string; origin: string; state: "pending" | "approved" | "drifted"; registeredBy: string; pendingDigest: string | null; approvedDigest: string | null; tools: { name: string; effect: "read" | "write" | "send" | "pay"; ref: string | null; untrusted_result: boolean; unsafe_to_retry: boolean; http: { method: string; path: string } | null }[]; pendingSubmittedBy: string | null }
:130    function parseToolServer(raw: unknown): ToolServerView | null   // :150-168: with a pendingSurface the tools are the pending surface's, each with the ref of the same name in the record's `tools` (null when new); else the approved surface's; else the record's. A ref matches /^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$/, at most 128 characters (:28, :95)
:346    function approveToolSurface(client: Api<"post">, id: string, body: { digest: string; selfApproval: boolean }): Promise<ToolServerView>   // parses answer.server
// review.ts
:8-16   interface ReviewTool { name: string; effect: string; ... }   // the other members are not read here
:175    function parseReviewTools(surface: unknown): ReviewTool[] | null   // a raw approvedSurface or pendingSurface; null when unreadable
:665-687 loadServerReview gives { server, approved, pending }: the raw surfaces, null when absent
// grants.ts
:6-12   interface GrantView { id: string; subject: string; tool: string; scope: string; status: "active" | "needs_reconfirm" | "revoked" }
:14-20  patterns ID /^grant_[A-Za-z0-9-]{1,64}$/ (at most 69 characters), TOOL (the ref pattern, at most 128), ROLE, USER, FLOW (64), NODE (128)   // module-internal
:30     function parseGrant(raw: unknown): GrantView | null   // item { grant, status }; not edited
:61     function grantRowText(g: GrantView): string   // `${subject} · ${tool} · ${scope} · ${status}`; not edited
// ../admin/shared.ts
:13     type Api<K extends keyof ApiClient> = Pick<ApiClient, K>
// ../api/client.ts
:13-32  class ApiRequestError extends Error { status: number; code: string; details: unknown; requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
:89-98  function createApiClient(opts?: { baseUrl?: string; fetch?: typeof fetch }): ApiClient   // baseUrl "/api/v1" and `globalThis.fetch` by default: no session-end handler (`browserSession.api` adds one)
:36-50  RequestOptions { query?, headers?, signal?, body? }; ApiClient { get<T>(path, opts?): Promise<T>; post<T>(path, body?, opts?): Promise<T>; ... }
// ../kit/data/page-fetcher.ts
:29-62  function cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null; query? }): (request: { cursor: string | null; limit: number; signal: AbortSignal }) => Promise<{ items: T[]; next_cursor: string | null }>   // calls client.get(path, { query: { limit, cursor? }, signal }); an unreadable page or item throws ApiRequestError(200, "INVALID_RESPONSE", "Invalid page")
// ../kit/ErrorPanel.tsx
:6      function ErrorPanel(props: { error: unknown }): ReactNode   // role "alert"
// ../ui/badge.tsx
:14     function Badge(props: { tone: Tone; children: ReactNode; className?: string }): ReactNode   // <span data-slot="badge" data-tone=...>, classes "inline-flex items-center rounded-(--ui-radius) px-2 py-0.5 text-sm font-medium" plus bg-warning-surface text-warning-text, bg-info-surface text-info-text, ...
```

`browserSession.api` (`../auth/browser-session.ts:4`) is an `ApiClient` whose fetch is wrapped by `withSessionEnd` (`../auth/session-fetch.ts:47-72`): a 401 with error code `UNAUTHENTICATED` redirects to sign-in (`../auth/return-to.ts:84-95`). Routes (`src/api/`, not edited):

- `GET /api/v1/grants` (`grant-routes.ts:274-280`, action `deploy_policy`, `limit` 1 to 200, `src/api/pagination.ts:7-23`): `{ items: { grant, status }[], next_cursor }` (`:149-168`); `grant` holds `id, subject, tool, scope, args, fingerprints, state, createdBy, createdAt, revokedBy, revokedAt` (`:118-147`), at most 8 `args` (`src/grants/store.ts:52`, `:151`). No tool filter.
- `POST /api/v1/grants` (`:306-346`, body `{ subject, tool, scope, args, versionHash? }` `:89-100`, header `Idempotency-Key` `^[!-~]+$`, 1 to 128 characters, `src/api/idempotency.ts:14-19`): 201 with the grant record; 422 `OPERATION_REFUSED` with `details.reason` among `role_unknown`, `user_unknown`, `tool_unknown`, `flow_unknown`, `version_not_validated`, `node_unknown`, `arg_unknown`, `arg_type`, `value_invalid` (`src/grants/store.ts:183-209`, `:253-273`).
- `GET /api/v1/tool-servers` (`tool-server-routes.ts:220-226`, action `register_tool_server`): pages of the record `{ id, adapter, origin, local, state, registeredBy, registeredAt, approvedDigest, pendingDigest, pendingSubmittedBy, tools: [{ name, effect, ref }] }` (`:64-96`), no surfaces; `tools` are those of the approved surface (`src/tools/store.ts:159-183`).
- `POST /api/v1/tool-servers/:id/surface/approve` (`:289-298`, action `approve_tool_surface`): 200 `{ server: record, blocks }` (`:109-114`), the new blocks imported first (`src/tools/store.ts:447-562`).
- A ref is `${serverId}.${tool.name}@${major}`, the lowest `major` whose stored hash is the tool's (`src/tools/surface.ts:80-100`); a server id and a tool name hold no `.` (`servers.ts:26-27`). New grants are pending until a deploy (`src/grants/policy-sets.ts:279-301`).
