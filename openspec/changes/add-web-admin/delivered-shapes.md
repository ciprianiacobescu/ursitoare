# Delivered shapes taken by add-web-admin

The names this change takes from merged code (proposal.md, "Interfaces taken"), as declared on main (main@e226f8c): the declarations of the code, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

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
interface NavItem { id: string; path: string; label: string }
interface FeatureRegistry { register(spec: FeatureSpec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[] }
function createFeatureRegistry(): FeatureRegistry
// add-e2e-stack (test/support/e2e-stack/stack.ts, part.ts)
type E2eStack = Readonly<{ url: string; controlUrl: string; handles: ReadonlyMap<string, PartHandle>; close(): Promise<void> }>
interface StackOptions { port?: number; controlPort?: number; dataDir?: string; parts?: readonly E2eStackPart[]; log?: boolean }
function startE2eStack(opts?: StackOptions): Promise<E2eStack>
interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void> }
```

`fresh_state` is Python in `e2e/conftest.py` (merged code): fixture `fresh_state() -> None`, which POSTs `/reset` on `E2E_CONTROL_URL` (default `http://127.0.0.1:39081`) and does nothing when `E2E_PROFILE` is `stack`.

## Facts from the merged code

At main@e226f8c. Each fact is quoted from the file.

- `web/src/features/index.ts:4` is `const mods = import.meta.glob<{ feature: FeatureSpec }>("./*.tsx", { eager: true });` and line 6 is `for (const [, mod] of Object.entries(mods).sort(([a], [b]) => (a < b ? -1 : 1))) {`. A new file `web/src/features/NN-<name>.tsx` that exports `feature` is registered, in file-name order, with no edit to a shared file.
- `web/src/app/features.ts:4-11` lists the reserved roots: `["api"]`, `["health"]`, `["auth", "oidc"]`, `[".well-known"]`, `["hooks"]`, `["callbacks"]`, `["mcp"]`. `/admin` is not among them.
- `web/src/app/features.ts:135-142` refuses a nav label on a dynamic path: `if (typeof spec.navLabel !== "string" || spec.navLabel.length < 1 || spec.navLabel.length > 40 || hasControlCharacter(spec.navLabel) || parsed.dynamic) { throw new FeatureError("FEATURE_INVALID", ...` (laid out on several lines in the file). A feature with a `navLabel` therefore has a static path.
- `web/src/app/features.ts:181-186` is the nav filter: `if (feature.navLabel === undefined) { continue; }` and `if (feature.capability !== undefined && !capabilities.has(feature.capability)) { continue; }`. An entry whose `capability` is absent from the given set is not listed.
- `web/src/api/client.ts:100` is `path.includes("?") ||`, inside the check that throws `RangeError("path must be a single leading slash relative path")`. A query goes in `opts.query`, never in the path.
- `web/src/api/client.ts:139` is `credentials: "same-origin",`; lines 162-171 turn a non-2xx answer with an `{ error: { code, message } }` body into `ApiRequestError(response.status, envelope.code, envelope.message, { details: envelope.details, requestId })`; lines 174-175 are `if (text.trim() === "") { return undefined as T; }`, so a 204 answer resolves to `undefined`.
- `src/api/web.ts:170` is `server.get("/*", async (request, reply) => {`; lines 195-201 refuse a path whose last segment is an asset name with a not-found error and otherwise send `index.html`. A path such as `/admin/users` (no extension, no file) is answered with the single-page app.
- `test/support/e2e-stack/stack.ts:93` is `URSITOARE_PUBLIC_BASE_URL: \`http://127.0.0.1:${enginePort}\`,` and line 96 is `URSITOARE_ENGINE_KEY_FILE: engineKeyFile,`; lines 130-131 write the key with `randomBytes(ENGINE_KEY_BYTES).toString("hex")` to `engine.key`. The stack engine has an engine key, so a cursor can be issued and signed anchors can be checked.
- `web/src/app/App.tsx:10` is `document.title = pageTitle(routeId);`, set by the `DocumentTitle` effect that renders before a feature's element, so a page effect that sets `document.title` runs later and wins.
- `web/src/app/Shell.tsx:25` is `<main id="main" tabIndex={-1}>`; the page content is rendered inside it.
