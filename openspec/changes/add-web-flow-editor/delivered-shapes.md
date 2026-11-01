# Delivered shapes taken by add-web-flow-editor

Names taken from merged code, as declared on main@3142c5f with `export` dropped; the code is the truth.

```ts
// web/src/api/client.ts (add-web-shell)
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
type QueryValue = string | number | boolean | undefined
interface RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown }
interface ApiClient { get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; /* request, put, patch, delete as well */ }
// web/src/app/features.ts (add-web-shell)
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode }
function createFeatureRegistry(): FeatureRegistry   // register(spec): void; list(); nav(capabilities?: ReadonlySet<string>): NavItem[] with NavItem { id; path; label }
// web/src/admin/shared.ts (add-web-admin)
type Check<T> = { ok: true; value: T } | { ok: false; message: string }
type Api<K extends keyof ApiClient> = Pick<ApiClient, K>
function clip(text: string, max = 80): string   // longer than max: the first max-1 characters plus "…"
// web/src/auth/browser-session.ts (add-web-sign-in)
const browserSession: BrowserSession   // BrowserSession { api: ApiClient; logout: ApiClient; signOut(): Promise<SignOutResult> }
// web/src/kit/ (add-web-ui-kit)
const FALLBACK_MESSAGE: string
function errorPanelModel(error: unknown): ErrorPanelModel   // { code; status: number | null; title; message; decisionId: string | null }
function parseTokens(css: string): StringMap
function findRawColours(css: string): SourceHit[]
function findInlineStyleUse(source: string): SourceHit[]
// web/src/kit/data/ (add-web-data-kit)
type FetchPage<T> = (request: { cursor: string | null; limit: number; signal: AbortSignal }) => Promise<{ items: readonly T[]; next_cursor: string | null }>
function cursorPageFetcher<T>(client: Pick<ApiClient, "get">, path: string, opts: { parseItem: (raw: unknown) => T | null; query?: Readonly<Record<string, QueryValue>> }): FetchPage<T>
interface DataTableSpec { caption: string; columns: readonly { key: string; header: string; rowHeader?: boolean }[]; emptyTitle?: string; emptyDescription?: string }
type FormErrors = Readonly<Record<string, string>>
function mapEnvelopeErrors(error: unknown, fields: readonly string[]): FormErrors
// the components DataTable, Form and Field, ErrorPanel, LoadingState and toast(spec: { kind: "info" | "success" | "error"; message: string }) are used as in web/src/admin/TeamsPage.tsx
// test/ (add-e2e-stack, add-fake-oidc, add-roles-and-memberships, add-web-admin)
type E2eStack = Readonly<{ url: string; controlUrl: string; handles: ReadonlyMap<string, PartHandle>; close(): Promise<void> }>
function startE2eStack(opts?: { port?: number; controlPort?: number; dataDir?: string; parts?: readonly E2eStackPart[]; log?: boolean }): Promise<E2eStack>
interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void> }   // PartHandle { env; api?; close() }
function discoverParts(dir?: string): Promise<E2eStackPart[]>   // sorted by file name NN-name.ts
function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi   // has ownerUrl
function oidcApi(handles: ReadonlyMap<string, PartHandle>): { fake: FakeOidc }   // fake.issuer
function signInAs(stack: Pick<E2eStack, "url" | "handles">, username: string): Promise<TestSession>   // test/journeys/session.ts
function sessionClient(stack: Pick<E2eStack, "url">, session: TestSession): ApiClient
```

`e2e/conftest.py`: fixtures `fresh_state` and `users` (alice, bob, carol, mallory), `login(page, user, path="/sign-in")`, `assert_accessible(page)` (axe-core, fails on serious or critical).

## Facts from the merged code

- `src/api/security-headers.ts:3-4`: `CONTENT_SECURITY_POLICY` is the constant `"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"`; lines 21-25 add it to every response in an `onSend` hook; no nonce exists.
- `src/pdp/capabilities.ts:19`: the probe is `resource: { type: "Tenant", id: principal.tenantId }`, so `/me` lists an action only when the Tenant resource permits it (`src/api/me.ts:81-84`).
- `web/src/app/features.ts:135-142` throws `FEATURE_INVALID` for a `navLabel` on a dynamic path; lines 181-186 skip a feature without `navLabel` and one whose `capability` is missing from the set. `web/src/features/index.ts:4-8` registers every `./*.tsx` `feature`, sorted by file name.
- `web/src/api/client.ts:100-103` refuses a path holding `?`, `#`, `\` or `://` with `RangeError`; a non-2xx `{ error: { code, message, details } }` becomes `ApiRequestError(status, code, message, { details })`.
- `web/src/kit/messages.ts:4-17`: `FALLBACK_MESSAGE` is the generic "Something went wrong…" text; `FORBIDDEN` is "You are not allowed to do this. If you think you should be, give the decision id to an administrator.". `web/src/kit/error-panel.ts:63`: `decisionId` is set for status 403 only; `message` is `messageFor(code)`, so an unregistered code gives `FALLBACK_MESSAGE`.
- `web/src/kit/data/cursor-list.ts:4`: `DEFAULT_PAGE_SIZE` is 50. `web/src/kit/contrast.ts:164`: `INLINE_STYLE` matches `style=`, `<style` and `setAttribute("style"`.
- Root `tsconfig.json`: `lib` `["es2024"]`, `types` `["node"]`, `skipLibCheck: true` (line 20), `exclude` holds `web`; `web/tsconfig.json` has `dom`. `web/package.json` owns the `@codemirror/*` dependencies (installed in `web/node_modules` only). A `test/` file that imports a `web/src/**/*.ts` module, even one importing `@codemirror/lang-yaml`, passes root `tsc -p tsconfig.json --noEmit` and runs under `node --test` (checked on the scaffold, main@fce6efe); a `test/` file importing `@codemirror/*` directly fails with TS2307.
- `test/support/e2e-stack/rbac-part.ts:48-72`: `seed` opens an owner pool with `createPool(ownerUrl, { max: 1, applicationName })`, lists `SELECT tenant_id, review_profile FROM ursitoare.tenant ORDER BY tenant_id COLLATE "C"`, and per tenant, in `withTenantTx`, returns unless `SELECT 1 FROM ursitoare.tenant_idp WHERE tenant_id = $1 AND issuer = $2 LIMIT 1` (with `fake.issuer`) finds a row; `start` calls `databaseApi` and `oidcApi` and returns `{ env: {}, close }`; `parts/30-rbac.ts` is the one line `export { rbacPart as part } from "../rbac-part.ts";`.
