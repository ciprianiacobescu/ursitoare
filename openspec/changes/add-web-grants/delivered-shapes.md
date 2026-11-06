Declarations of the merged names this change takes, copied from main@cf34c628 and read against the files named (`export` omitted), then the response shapes it reads from the three sibling routes.

```ts
// web/src/app/features.ts:14-20, :24-28, :41-45, :157; nav() at :178-190 lists a feature with a navLabel when it has no capability or the set holds it, in registration order
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode }
function createFeatureRegistry(): { register(spec: FeatureSpec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[] }   // NavItem: { id, path, label }
// web/src/kit/capabilities.ts:7-17, :144-151
type CapabilityState = { status: "signed_out" } | { status: "failed"; code: string } | { status: "ready"; me: Me }   // Me: { user: { id, displayName, email }, tenant: { id, name, reviewProfile: "solo" | "team" }, capabilities: ReadonlySet<string>, csrfToken }
function visibleNav(state: CapabilityState | null, nav?: (capabilities?: ReadonlySet<string>) => NavItem[]): NavItem[]
// web/src/admin/pages.ts:100-133 (the string literals id, path, navLabel, capability after "export const feature"; null when one is not a literal); admin/shared.ts:13
function featureLiterals(source: string): { id: string; path: string; navLabel: string; capability: string } | null
type Api<K extends keyof ApiClient> = Pick<ApiClient, K>
// web/src/api/client.ts:13-32, :43-50, :90 (base URL "/api/v1": a path in web code is "/grants")
class ApiRequestError extends Error { status: number; code: string; details: unknown; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
interface ApiClient { get<T>(path: string, opts?: RequestOptions): Promise<T>; post<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>; delete<T>(path: string, opts?: RequestOptions): Promise<T> }   // RequestOptions: query?, headers?, signal?
// web/src/kit/data/cursor-list.ts:23; page-fetcher.ts:29-64
type FetchPage<T> = (request: { cursor: string | null; limit: number; signal: AbortSignal }) => Promise<{ items: readonly T[]; next_cursor: string | null }>
function cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null }): FetchPage<T>   // GET { query: { limit, cursor? }, signal }; a null item is ApiRequestError(200, "INVALID_RESPONSE", "Invalid page")
// web/src/kit/data/data-table.ts:5-16, :62; kit/confirm.ts:3-11; kit/data/form.ts:6-12; Field.tsx:8-19
interface DataTableSpec { caption: string; columns: readonly { key: string; header: string; rowHeader?: boolean }[]; emptyTitle?: string; emptyDescription?: string }
function dataTableModel(spec: DataTableSpec): DataTableModel   // cell tag th for a rowHeader column, else td
interface ConfirmDialogProps { open: boolean; title: string; description?: string; action: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }   // ConfirmDialog.tsx:59-79 renders no children; action 1-40 characters, not generic
interface FormSpec { label: string; submitLabel: string; fields: readonly string[]; errors: FormErrors; busy?: boolean }   // Form: form named label, submit button named submitLabel; Field: layout "inline" puts the control before its label
// web/src/kit/error-panel.ts:44; admin/messages.ts:6-24
function errorPanelModel(error: unknown): { code: string; status: number | null; title: string; message: string; decisionId: string | null }   // decisionId for a 403 only
function registerAdminMessages(): void   // registers OPERATION_REFUSED "The engine refused this operation." among others; a repeat is harmless
```

Kit texts asserted (`web/src/kit/messages.ts:4-5`, `:6-18`): `FORBIDDEN` "You are not allowed to do this. If you think you should be, give the decision id to an administrator."; `NOT_FOUND` "That item does not exist, or you cannot see it."; `AUTHZ_UNAVAILABLE` "Authorization is unavailable right now. Try again in a moment."; the fallback "Something went wrong. Try again, and tell an administrator if it keeps happening.". Patterns the grant form reuses: role `^[a-z][a-z0-9_]{0,31}$` (`admin/users.ts:33`), user id `^[A-Za-z0-9_-]{1,64}$` (`users.ts:32`), flow `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` up to 64 (`flows/flows.ts:29-30`), step `^[a-z][a-z0-9_]*$` (`src/authoring/validate/schema.ts:92`), block ref `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+@[0-9]+$` (`schema.ts:94`).

Sibling response shapes (their specs and test plans): lists answer `{ items, next_cursor }`; a tool-server item is U47's `ToolServerRecord` (with `local`, `registeredAt`), the detail adds `approvedSurface` and `pendingSurface`, and no answer names the submitter (design decision 2); `POST .../surface/approve` answers `{ server, blocks }`; a grant item is U49's `GrantRecord` (`subject: { kind: "role", role } | { kind: "user", userId }`, `scope: { kind: "any_step" } | { kind: "node", flowId, nodeId }`) as `{ grant, status }` (U49 `listGrants`; design decision 6); `POST /grants` answers 201 with the record; `GET /policies` answers `{ current: PolicySetRecord | null, pendingGrants }` (`version` 64 hex, `source` the hand-written text); `POST /policies/validate` answers `PolicyValidation`; `POST /policies/deploy` answers 201 with the record or 422 `OPERATION_REFUSED` `{ reason: "policy_invalid", problems }`.
