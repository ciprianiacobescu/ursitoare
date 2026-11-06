Merged names this change takes, copied from main@3dd549bd and read against the files named (`export` omitted; `…` elides unused members), then the components and helpers its pages render or call, then the sibling response shapes.

```ts
// web/src/app/features.ts:14-20, :24-28, :41-45, :157; nav() :178-190 lists a feature with a navLabel when it has no capability or the set holds it
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode }
function createFeatureRegistry(): { register(spec: FeatureSpec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[] }   // NavItem: { id, path, label }
// web/src/kit/capabilities.ts:7-17, :144-151
type CapabilityState = { status: "signed_out" } | { status: "failed"; code: string } | { status: "ready"; me: Me }   // Me: { user: { id, … }, tenant: { …, reviewProfile: "solo" | "team" }, capabilities: ReadonlySet<string>, … }
function visibleNav(state: CapabilityState | null, nav?: (capabilities?: ReadonlySet<string>) => NavItem[]): NavItem[]
// web/src/admin/pages.ts:100-133 (the literals id, path, navLabel, capability of "export const feature"; null when one is not a literal); admin/shared.ts:13
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
interface ConfirmDialogProps { open: boolean; title: string; description?: string; action: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }   // action 1-40 characters, not generic; no children (ConfirmDialog.tsx:59-79)
interface FormSpec { label: string; submitLabel: string; fields: readonly string[]; errors: FormErrors; busy?: boolean }   // Form: form named label, submit button named submitLabel; Field: layout "inline" puts the control before its label
// web/src/kit/error-panel.ts:44; admin/messages.ts:6-24
function errorPanelModel(error: unknown): { code: string; status: number | null; title: string; message: string; decisionId: string | null }   // decisionId for a 403 only
function registerAdminMessages(): void   // registers OPERATION_REFUSED "The engine refused this operation."; a repeat is harmless
```

**Components and helpers of the pages** (under `web/src/`; imports relative as `admin/UsersPage.tsx:1-15`; models: `UsersPage.tsx:20-151` (list, dialog, title) and `admin/MappingsPage.tsx:205-285` (loading, error, form with a select)):

```ts
// kit/data/DataTable.tsx:13-19: loads its list when idle; shows its own LoadingState, EmptyState and ErrorPanel
function DataTable<T>(props: DataTableSpec & { columns: readonly ({ key: string; header: string; rowHeader?: boolean } & { cell: (row: T) => ReactNode })[]; list: CursorList<T>; rowKey: (row: T) => string }): ReactNode
// kit/data/cursor-list.ts:38-45, :54
function createCursorList<T>(fetchPage: FetchPage<T>, opts?: { pageSize?: number }): CursorList<T>   // CursorList: { …; reset(): void }; reset() makes the list idle, so the table loads page one again
// kit/data/Form.tsx:9-14; Field.tsx:8-19 (field.ts:3-10, :26); form-errors.ts:4, :7
function Form(props: FormSpec & { onSubmit: () => void; children?: ReactNode }): ReactNode   // busy: submit aria-disabled, onSubmit not called; errors["$form"] shows as role="alert"; FormErrors = Readonly<Record<string, string>>
function Field(props: { idPrefix: string; name: string; label: string; hint?: string | null; error?: string | null; required?: boolean; layout?: "stacked" | "inline"; children: (control: { id: string; name: string; "aria-describedby"?: string; "aria-invalid"?: true; "aria-required"?: true }) => ReactNode }): ReactNode   // idPrefix from useId() (MappingsPage.tsx:52); spread the control onto the input or select
// kit/ConfirmDialog.tsx:5 (props: confirm.ts:3-11); kit/LoadingState.tsx:5; kit/ErrorPanel.tsx:6; kit/EmptyState.tsx:5 (states.ts:3-7)
function ConfirmDialog(props: ConfirmDialogProps): ReactNode   // render while a confirmation is pending; onConfirm or onCancel runs when it closes
function LoadingState(props: { label?: string }): ReactNode    // label 1-80 characters; role="status"
function ErrorPanel(props: { error: unknown }): ReactNode      // role="alert"; errorPanelModel above
function EmptyState(props: { title: string; description?: string; … }): ReactNode   // rendered by DataTable only; `toast` is not used (results are role="status" and role="alert" paragraphs)
// auth/browser-session.ts:4; session-client.ts:18-22; auth/use-session.ts:14
const browserSession: { api: ApiClient; … }                    // browserSession.api is the argument of every Api<"get" | "post" | "delete"> helper
function useSession(): CapabilityState | null                  // null until loaded; ready: me.user.id and me.tenant.reviewProfile feed approvalView
// features/60-admin-users.tsx:1-13 models the feature files (export const feature: FeatureSpec = { id, path, navLabel, capability, element: <UsersPage /> } after a registrar call); features/index.ts:4-8 imports every ./*.tsx with import.meta.glob and calls registerFeature (app/features.ts:196): no router or menu file is edited
```

Kit texts asserted are read with `messageFor(code)` of `web/src/kit/messages.ts:4-18` (`FORBIDDEN`, `NOT_FOUND`, `AUTHZ_UNAVAILABLE` and the fallback `FALLBACK_MESSAGE`), never copied into a test. Patterns the grant form reuses: role `^[a-z][a-z0-9_]{0,31}$` (`admin/users.ts:33`), user id `^[A-Za-z0-9_-]{1,64}$` (`users.ts:32`), flow `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` up to 64 (`flows/flows.ts:29-30`), step `^[a-z][a-z0-9_]*$` (`src/authoring/validate/schema.ts:92`), block ref `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+@[0-9]+$` (`schema.ts:94`).

Sibling response shapes (fixtures: test-plan.md): lists answer `{ items, next_cursor }`; a tool-server item is U47's `ToolServerRecord`, the detail adds `approvedSurface` and `pendingSurface`, both carry U47's `pendingSubmittedBy` (ruling U52-1); `POST .../surface/approve` answers `{ server, blocks }`; a grant item is U49's `{ grant: GrantRecord, status }`, `POST /grants` answers 201 with the record; `GET /policies` answers `{ current: PolicySetRecord | null, pendingGrants }`, `POST /policies/validate` a `PolicyValidation`, `POST /policies/deploy` 201 with the record or 422 `OPERATION_REFUSED` `{ reason: "policy_invalid", problems }`.
