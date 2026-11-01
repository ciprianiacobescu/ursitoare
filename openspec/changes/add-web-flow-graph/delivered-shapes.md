# Delivered shapes taken by add-web-flow-graph

Names taken from merged code, as declared on main@3142c5f with `export` dropped; the code is the truth. Names this unit takes from unmerged siblings (U22 to U28) are in proposal.md § Interfaces taken, as those changes give them.

```ts
// web/src/admin/shared.ts (add-web-admin)
type Api<K extends keyof ApiClient> = Pick<ApiClient, K>
function clip(text: string, max = 80): string   // text.length > max ? `${text.slice(0, max - 1)}…` : text
// web/src/api/client.ts (add-web-shell)
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
interface ApiClient { get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; /* request, put, patch, delete as well */ }
// web/src/app/features.ts (add-web-shell)
interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode }
function createFeatureRegistry(): FeatureRegistry   // register(spec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[] with NavItem { id; path; label }
// web/src/auth/browser-session.ts (add-web-sign-in)
const browserSession: BrowserSession   // BrowserSession { api: ApiClient; ... }
// web/src/kit/ (add-web-ui-kit)
function ErrorPanel(props: { error: unknown }): ReactNode      // ErrorPanel.tsx
function LoadingState(props: { label?: string }): ReactNode    // LoadingState.tsx
interface SourceHit { line: number; text: string }             // contrast.ts
function parseTokens(css: string): StringMap                   // StringMap = Readonly<Record<string, string>>
function findRawColours(css: string): SourceHit[]
function findInlineStyleUse(source: string): SourceHit[]
// test/ (add-e2e-stack, add-fake-oidc, add-roles-and-memberships)
type E2eStack = Readonly<{ url: string; controlUrl: string; handles: ReadonlyMap<string, PartHandle>; close(): Promise<void> }>   // test/support/e2e-stack/stack.ts
function startE2eStack(opts?: StackOptions): Promise<E2eStack>
function signInAs(stack: Pick<E2eStack, "url" | "handles">, username: string): Promise<TestSession>   // test/journeys/session.ts
function sessionClient(stack: Pick<E2eStack, "url">, session: TestSession): ApiClient
```

`e2e/conftest.py`: fixtures `fresh_state` and `users` (`dict[str, dict[str, str]]`: alice, bob, carol, mallory), `login(page, user, path="/sign-in")`, `assert_accessible(page)` (axe-core, fails on serious or critical impact).

## Facts from the merged code

At main@3142c5f.

- `src/api/security-headers.ts:3-4`: `CONTENT_SECURITY_POLICY` is the constant `"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"`.
- `web/src/features/index.ts:4-8`: `const mods = import.meta.glob<{ feature: FeatureSpec }>("./*.tsx", { eager: true });` then `registerFeature(mod.feature)` for every module sorted by file name, so a `.tsx` file there that does not export `feature` is a start-up error.
- `web/src/app/features.ts:140`: a `navLabel` on a path with a `:param` segment makes `validateFeature` throw `FEATURE_INVALID`; `:168` the duplicate-path check compares the normalised paths (every `:param` becomes `:`), so `/flows/:flowId` and `/flows/:flowId/graph` are different paths.
- `web/src/kit/ErrorPanel.tsx`: `<section role="alert">` with an `h2`, "Error code: <code>" and, for a 403, the decision id; `LoadingState.tsx`: `<div role="status" aria-busy="true">`.
- `web/tsconfig.json`: `lib` `["es2023", "dom", "dom.iterable"]`, `types` `["vite/client"]`; root `tsconfig.json`: `lib` `["es2024"]`, `types` `["node"]`, `exclude` holds `web`.
- `src/api/web.ts:194-212`: a path that is not a file under `web/dist` and whose last segment has no asset extension (`js`, `css`, `json`, `svg`, ...) is answered with `index.html`, so `/flows/demo-graph/graph` reaches the single-page app; `src/api/web-paths.ts` reserves only the roots `api`, `health`, `auth/oidc`, `.well-known`, `hooks`, `callbacks` and `mcp`.
