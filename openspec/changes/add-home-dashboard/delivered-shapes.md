Declarations this change takes, copied from main@3daa5c35 and checked line by line.

```ts
// web/src/auth/use-session.ts:14
function useSession(): CapabilityState | null   // null while loading; shares the capability loader's one in-flight /api/v1/me
// web/src/kit/capabilities.ts:7-12, :14-17
interface Me { user: { id: string; displayName: string; email: string | null }; tenant: { id: string; name: string; reviewProfile: "solo" | "team" }; capabilities: ReadonlySet<string>; csrfToken: string }
type CapabilityState = { status: "signed_out" } | { status: "failed"; code: string } | { status: "ready"; me: Me }
// web/src/flows/flows.ts:8-15, :65, :159
interface FlowRow { flowId: string; ownerTeam: string; createdBy: string; createdAt: string; versionCount: number; latest: VersionRow | null }
function parseFlow(raw: unknown): FlowRow | null   // flowId ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ (64), instants ISO with 0-6 fraction digits
function flowListFetcher(client: Api<"get">): FetchPage<FlowRow>   // cursorPageFetcher(client, "/flows", { parseItem: parseFlow })
// web/src/flows/versions.ts:10-16, :18-30
type VersionState = "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"
interface VersionRow { flowId: string; number: number; hash: string; state: VersionState; surface: FlowFormat; author: string; requestedBy: string | null; createdAt: string; validatedAt: string | null; validationOk: boolean | null }
// web/src/runs/types.ts:33, :45-61, :163
type RunState = "queued" | "running" | "completed" | "failed" | "cancelled"
interface RunView { id: string; flowId: string; flowHash: string; mode: RunMode; trigger: "test"; state: RunState; ownerTeam: string; principal: { userId: string; kind: "human" | "service" }; terminalNode: string | null; error: RunError | null; inputRef: string | null; outputRef: string | null; createdAt: string; startedAt: string | null; endedAt: string | null }   // 15 keys
function parseRunView(raw: unknown): RunView | null   // flowHash ^sha256:[0-9a-f]{64}$, id ^[A-Za-z0-9_-]{1,128}$
// web/src/runs/runs-source.ts:17
function runListFetcher(client: Pick<ApiClient, "get">): FetchPage<RunView>   // cursorPageFetcher(client, "/runs", { parseItem: parseRunView })
// web/src/kit/data/page-fetcher.ts:9-27, :29-61
function parseCursorPage(body: unknown): CursorPage<unknown> | null   // { items: array; next_cursor: null | string of 1-1024 characters }
function cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null; query?: Readonly<Record<string, QueryValue>> }): FetchPage<T>
  // asks client.get(path, { query: { ...query, limit, cursor? }, signal }); a query holding limit or cursor throws KitError (:35-43);
  // a non-page body or an item parseItem refuses throws ApiRequestError(200, "INVALID_RESPONSE", "Invalid page")
// web/src/kit/data/cursor-list.ts:23: type FetchPage<T> = (request: { cursor: string | null; limit: number; signal: AbortSignal }) => Promise<{ items: readonly T[]; next_cursor: string | null }>
// web/src/kit/EmptyState.tsx:6, web/src/kit/states.ts:3-7
function EmptyState(props: { title: string; description?: string; headingLevel?: 1 | 2 | 3 | 4 } & { children?: ReactNode }): ReactNode   // div.ui-empty > h1-h4 (default 2), p, children
// web/src/app/health.ts:3, :13, :42
type EngineHealth = "healthy" | "unavailable"
function loadEngineHealth(client: Pick<ApiClient, "get">, signal?: AbortSignal): Promise<EngineHealth>
function healthView(state: EngineHealth | "loading", rechecking: boolean): { text: string; button: "hidden" | "enabled" | "busy"; focusStatus: boolean }
// web/src/api/client.ts:13, :43, :89
class ApiRequestError extends Error { status: number; code: string; details: unknown; requestId: string | null }
interface ApiClient { get<T>(path: string, opts?: { query?: Readonly<Record<string, QueryValue>>; signal?: AbortSignal }): Promise<T> /* and request, post, put, patch, delete */ }
function createApiClient(opts?: { baseUrl?: string; fetch?: typeof fetch }): ApiClient   // baseUrl default "/api/v1"; no session-end handler
// web/src/kit/contrast.ts:166
function findInlineStyleUse(source: string): { line: number; text: string }[]
```

Behaviour this change relies on (the session client, the cedar permits and the two list orders are cited in design.md decisions 2, 4 and 5):

| file:line | fact |
|---|---|
| `src/api/me.ts:81-84` | `capabilities` is `engine.allowedActions(principal, ACTION_NAMES)`: what the PDP permits on the tenant. |
| `src/api/tool-server-routes.ts:220-226`, `web/src/tools/servers.ts:7-14` | `GET /tool-servers` (`register_tool_server`); `state` is `"pending" \| "approved" \| "drifted"`. |
| `src/api/admin-users.ts:36-60, :185-193` | `GET /users` (`manage_users_roles`); accounts have `kind`, `state` (`"active" \| "disabled"`), `roles`, `localRoles`. |
| `src/api/policy-routes.ts:96-108`, `web/src/tools/policies.ts:23-32` | `GET /policies` (`deploy_policy`) answers `{ current: null \| { version, source }, pendingGrants: number }`. |
| `web/src/{admin,tools,flows,runs}/pages.ts` | paths `/admin/users`, `/admin/roles-and-teams`, `/admin/group-mappings`, `/admin/audit`, `/admin/tool-servers`, `/admin/grants`, `/admin/policies`, `/flows`, `/flows/:flowId`, `/runs`, `/runs/:runId`. |
