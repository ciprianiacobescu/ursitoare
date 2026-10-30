# Delivered shapes taken by add-web-admin

The names this change takes from merged code ("Interfaces taken"), as declared on main@9dbc21e with `export` dropped; the code is the truth.

```ts
// add-web-shell (web/src/api/client.ts)
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
type QueryValue = string | number | boolean | undefined
interface RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown }
interface ApiClient { request<T>(method: string, path: string, opts?: RequestOptions): Promise<T>; get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; delete<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> }
interface ApiClientOptions { baseUrl?: string; fetch?: typeof globalThis.fetch }
function createApiClient(opts?: ApiClientOptions): ApiClient
// add-web-shell (web/src/app/features.ts)
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode }
interface FeatureRegistry { register(spec: FeatureSpec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[] }
function createFeatureRegistry(): FeatureRegistry
// add-e2e-stack (test/support/e2e-stack/stack.ts, part.ts)
type E2eStack = Readonly<{ url: string; controlUrl: string; handles: ReadonlyMap<string, PartHandle>; close(): Promise<void> }>
interface StackOptions { port?: number; controlPort?: number; dataDir?: string; parts?: readonly E2eStackPart[]; log?: boolean }
function startE2eStack(opts?: StackOptions): Promise<E2eStack>
interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void> }
```

The kit names; a limit broken throws `KitError`:

```ts
// add-web-ui-kit (web/src/kit/)
type StringMap = Readonly<Record<string, string>>
const FALLBACK_MESSAGE: string
function messageFor(code: string): string
function registerMessages(messages: StringMap): void  // code ^[A-Z][A-Z0-9_]{1,63}$, text 1 to 200 characters; other text for a registered code throws, identical text is accepted
interface ErrorPanelModel { code: string; status: number | null; title: string; message: string; decisionId: string | null }  // no details
function errorPanelModel(error: unknown): ErrorPanelModel
function ErrorPanel(props: { error: unknown }): ReactNode
function LoadingState(props: { label?: string }): ReactNode
interface ConfirmDialogProps { open: boolean; title: string; description?: string; action: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }  // title 1 to 120, description at most 300, action 1 to 40 and not generic ("OK", "Confirm")
interface ToastSpec { kind: "info" | "success" | "error"; message: string; durationMs?: number | null }  // message 1 to 300
function toast(spec: ToastSpec): string
// add-web-data-kit (web/src/kit/data/)
interface CursorListOptions { pageSize?: number }  // 1 to 200
type FetchPage<T> = (request: { cursor: string | null; limit: number; signal: AbortSignal }) => Promise<{ items: readonly T[]; next_cursor: string | null }>
interface CursorList<T> { getState(): { status: "idle" | "loading" | "loaded" | "error"; items: readonly T[]; nextCursor: string | null; error: unknown }; subscribe(listener: () => void): () => void; load(): Promise<void>; loadMore(): Promise<void>; retry(): Promise<void>; reset(): void }
function createCursorList<T>(fetchPage: FetchPage<T>, opts?: CursorListOptions): CursorList<T>
function cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null; query?: Readonly<Record<string, QueryValue>> }): FetchPage<T>  // query holds no limit or cursor
type FormErrors = Readonly<Record<string, string>>
function mapEnvelopeErrors(error: unknown, fields: readonly string[]): FormErrors
interface DataColumn { key: string; header: string; rowHeader?: boolean }
interface DataTableSpec { caption: string; columns: readonly DataColumn[]; emptyTitle?: string; emptyDescription?: string }
function dataTableModel(spec: DataTableSpec): DataTableModel
interface DataTableProps<T> extends DataTableSpec { columns: readonly (DataColumn & { cell: (row: T) => ReactNode })[]; list: CursorList<T>; rowKey: (row: T) => string }
interface FormProps { label: string; submitLabel: string; fields: readonly string[]; errors: FormErrors; busy?: boolean; onSubmit: () => void; children?: ReactNode }  // submitLabel 1 to 40
interface FieldProps { idPrefix: string; name: string; label: string; hint?: string | null; error?: string | null; required?: boolean; children: (control: { id: string; name: string; "aria-describedby"?: string; "aria-invalid"?: true; "aria-required"?: true }) => ReactNode }
```

`fresh_state` is Python in `e2e/conftest.py`: a fixture that POSTs `/reset` on `E2E_CONTROL_URL` (default `http://127.0.0.1:39081`) and does nothing when `E2E_PROFILE` is `stack`.

## Facts from the merged code

At main@9dbc21e.

- `web/src/features/index.ts:4` is `const mods = import.meta.glob<{ feature: FeatureSpec }>("./*.tsx", { eager: true });` and line 6 sorts the modules by file name before `registerFeature(mod.feature)`: a new `web/src/features/NN-<name>.tsx` that exports `feature` is registered with no edit to a shared file.
- `web/src/app/features.ts:4-11` lists the reserved roots `["api"]`, `["health"]`, `["auth", "oidc"]`, `[".well-known"]`, `["hooks"]`, `["callbacks"]`, `["mcp"]`; `/admin` is not among them.
- `web/src/app/features.ts:135-142` throws `FeatureError("FEATURE_INVALID", ...)` for a `navLabel` when `parsed.dynamic` is true: a feature with a `navLabel` has a static path.
- `web/src/app/features.ts:181-186` is the nav filter: `if (feature.navLabel === undefined) { continue; }` and `if (feature.capability !== undefined && !capabilities.has(feature.capability)) { continue; }`.
- `web/src/api/client.ts:100` is `path.includes("?") ||`, inside the check that throws `RangeError`: a query goes in `opts.query`. Lines 162-171 turn a non-2xx `{ error: { code, message } }` answer into `ApiRequestError(response.status, envelope.code, envelope.message, { details: envelope.details, requestId })`; lines 174-175 are `if (text.trim() === "") { return undefined as T; }`: a 204 resolves to `undefined`.
- `src/api/web.ts:171-177` is `defineRoute(server, { method: "GET", url: "/*", auth: { kind: "public", reason: "static" }, …, handler: async (request, reply) => {`; lines 202-209 answer an asset-named path with not-found and otherwise send `index.html`, so `/admin/users` gets the single-page app.
- `test/support/e2e-stack/stack.ts:96` is `URSITOARE_ENGINE_KEY_FILE: engineKeyFile,` and lines 130-131 write `randomBytes(ENGINE_KEY_BYTES).toString("hex")` to `engine.key`: the stack engine has an engine key, so cursors can be issued and signed anchors checked.
- `web/src/app/App.tsx:10` is `document.title = pageTitle(routeId);`, set by a `DocumentTitle` effect rendered before a feature's element, so a page effect that sets `document.title` runs later and wins.
- `tsconfig.json` (root) has `"types": ["node"]`, `"include": ["src/**/*.ts", "test/**/*.ts"]` and `"exclude": ["node_modules", "dist", "seed", "web", "e2e"]`: a file under `test/` that imports `web/src/**/*.ts` makes the root typecheck read them under Node's global types.
- `test/support/e2e-stack/database-part.ts:149-152` (the database part's `seed`) runs ``DROP DATABASE IF EXISTS "${E2E_DATABASE}" WITH (FORCE)`` and then ``CREATE DATABASE "${E2E_DATABASE}" OWNER ${ROLE_OWNER} TEMPLATE "${E2E_TEMPLATE}"``; `test/support/e2e-stack/reset.ts:59-60` makes `reset()` run `deps.faults.clear();` and `await seedParts("STACK_RESET_FAILED");`, which seeds every part in order. A reset therefore removes every user, session, team and mapping a test made, and the seeds of the later parts (`rbac`) run again.
- `web/src/kit/data/cursor-list.ts:195-219`: `load`, `loadMore` and `retry` return `Promise.resolve()` when they start nothing; else the promise is resolved by `finishPending` (70-76) once the request has committed its page or error (148, 154, 163), or `reset()` (228) or a newer request (129) drops it. It never rejects: a failure shows in `getState()`.
