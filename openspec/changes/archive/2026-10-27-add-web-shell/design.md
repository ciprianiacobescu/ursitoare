## Context

The base has `web/index.html`, the owner's `web/vite.config.ts` (`outDir: "dist"`), a placeholder `web/src/main.tsx` and a `web/tsconfig.json` with the DOM lib and `types: ["vite/client"]`. Shapes used from the dependencies, as their changes define them:

```ts
// add-engine-skeleton (U01)
// src/api: class ApiError extends Error { status: number; code: string; details: unknown; constructor(status: number, code: string, message: string, details?: unknown) }
//   buildServer(deps: ServerDeps): Promise<FastifyInstance>  // has the 404 NOT_FOUND handler; never listens
// healthPayload(version: string): { status: "ok"; version: string }; sequentialIds(seed?: number): IdSource; noopTracer: Tracer
// createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger
// loadConfig(env: Env, readSecret?: SecretReader): AppConfig; AppConfig.webDist: string | null (null when unset)
// main(deps?: Partial<MainDeps>): Promise<RunningServer | null>; MainDeps { loadConfig: () => AppConfig; destination: LogDestination; signals: SignalSource; exit: (code: number) => void }
//   plus the optional openDatabase (add-db-foundation, gives Database { appPool; close() }, awaited before buildServer) and configureServer (add-e2e-stack, awaited after buildServer, before listen); registerWebApp runs between them
// add-e2e-stack (U06): E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; seed?(ctx: PartContext): Promise<void> }
//   PartContext { readonly name: string; readonly dataDir: string; readonly engineOrigin: string; readonly controlOrigin: string; readonly env: Readonly<Record<string, string>>; readonly handles: ReadonlyMap<string, PartHandle> }
//   PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void> }  // env required, {} when none
//   test/support/e2e-stack/stack.ts: discoverParts(dir?: string): Promise<E2eStackPart[]>  // imports parts/NN-<name>.ts in file-name order, named export `part`
```

Fastify 5.12.7: `GET /*` also matches `/` and derives `HEAD`; a more specific route wins in any registration order; a root `onSend` hook runs for every route, the not-found handler and error replies; a socket delivers raw paths such as `/../../x`, `server.inject` normalises `..`.

## Decisions

1. **No `@fastify/static`.** The engine reads files itself (`readFile`, sent as a `Buffer`), so the confinement rules are ours to test.
2. **One wildcard route.** `registerWebApp` adds `GET /*`; any other method on an unmatched path reaches U01's not-found handler (404 `NOT_FOUND`).
3. **`classifyWebPath` is pure.** Strip `?` and `#`; the path must start with `/`; split on `/`; decode each segment once (`decodeURIComponent`; a failure is `refused`; `%252e%252e` stays the literal name `%2e%2e`, just not found); a decoded segment with `/`, `\`, NUL or a control character, or equal to `.` or `..`, is `refused`; empty segments are dropped. Lower-cased segments matching `RESERVED_ROOTS` are `reserved`; a segment starting with `.` is `refused`. No segments: `spa`; else `file`.
4. **Reserved roots** (never HTML): the roadmap's fixed root endpoints plus `/api`. `refused` and `reserved` both give `ApiError(404, "NOT_FOUND", "Route not found")`.
5. **File or fallback.** For `file` the candidate is `join(root, ...segments)` with `root = await realpath(distDir)`; its `realpath` must start with `root + sep` and be a regular file, else it is not a file (a symlink out is never served); that checked real path is the one read and sent. Not a file: an asset extension (`isAssetName`) gives 404 `NOT_FOUND`, anything else the SPA, so a share link such as `/t/ab.cd` stays a route. Traversal answers 404, not 400 or 403. An extension is the text after the last `.` when a character precedes that `.` and one follows it; `isAssetName`, `contentTypeFor` and `cacheControlFor` ignore its case.
6. **Not built.** Every `file` and `spa` request first checks the disk (no cache) with `isWebBuilt`. If `realpath(distDir)` fails or `<root>/index.html` is not a readable regular file, the answer is `ApiError(503, "WEB_NOT_BUILT", "Web app is not built", { hint: "run pnpm run build or set URSITOARE_WEB_DIST" })`, so a `distDir` that is not a web build publishes nothing, and a later build is served without a restart. When `isWebBuilt` is false, `main` logs one warn line at start (code `WEB_NOT_BUILT`, the message of the spec scenario "Unbuilt directory warns once", no path). add-api-conventions registers `WEB_NOT_BUILT`.
7. **Headers.** `registerSecurityHeaders` adds one root `onSend` hook that sets the four headers (replacing a handler's value); a `WeakSet` makes a second call a no-op.
8. **Cache.** `index.html` and the fallback: `no-store`. A file under `assets/` named `<name>-<hash>.<ext>` (optionally `.map` after) with `<name>` of `[A-Za-z0-9_.-]+`, `<hash>` exactly 8 of `[A-Za-z0-9_-]` (Vite 8's hash length, as in `web/dist/assets/index-sPJnqov5.js`) and `<ext>` an `isAssetName` extension: `public, max-age=31536000, immutable`. Others: `no-cache`.
9. **Default directory.** `DEFAULT_WEB_DIST = fileURLToPath(new URL("../../web/dist", import.meta.url))` (the repository's `web/dist`). Unset `URSITOARE_WEB_DIST` means `DEFAULT_WEB_DIST`, applied in `main` (`AppConfig.webDist` stays `null`); a relative value is relative to the working directory.
10. **CSP consequences.** The web code has no `style` attribute, `<style>` element or inline script (styles are in `shell.css`) and calls only its own origin.
11. **Router and layout.** `react-router` 7.18.4, exact-pinned, installed by the owner before the plan runs (F-2); no task adds it. `client.ts`, `features.ts`, `routes.ts` and `health.ts` are plain TypeScript, so Node runs their tests; `.tsx` stays thin.
12. **Features without a manifest.** A feature is `web/src/features/NN-<name>.tsx` exporting `feature: FeatureSpec`. `web/src/features/index.ts` is written once (task 6.3): an eager `import.meta.glob("./*.tsx")` registered in sorted key order, so nav order is file-name order and a later feature edits no shared file.
13. **Reserved roots on both sides.** `features.ts` holds a literal copy; `reserved-roots.test.ts` asserts it deep-equals `src/api/web-paths.ts` `RESERVED_ROOTS`. `web-paths.ts` imports no `node:` module, so the web typecheck accepts that import.
14. **Check again.** A click sets the state `loading` and `rechecking` true. The button stays rendered with `aria-disabled="true"` and ignores clicks while loading, so focus stays on it; on `unavailable` it is enabled again; on `healthy` it is removed and focus moves to the status region (`tabIndex={-1}`). `healthView` holds the rule.
15. **Readiness review 1, decided by the orchestrator on 2026-10-25:**
    - Extensions match case-insensitively: a missing `/app.JS` is a JSON 404, not HTML for a script URL; `LOGO.PNG` is `image/png`; `.js`, `a.` and `` have no extension.
    - A hash is exactly 8 characters: "8 or more" would cache an unhashed `assets/my-long-name.js` for a year; a missed hash only costs a revalidation.
    - A `WebAppError` in `main` closes the opened database and writes the fatal line with its own code, as add-e2e-stack does for `configureServer`.
    - Feature segments drop `.`, so the SPA fallback serves every registered path; reserved roots match whole segments.
    - The journey checks the focused skip link is in the viewport with an outline; contrast is left to `assert_accessible` (add-web-ui-kit).
    - The busy button has `aria-disabled="true"` and ignores activation, no `inert`, so it keeps focus.
    - No `/api/v1` prefix is mounted here: add-api-pep (`GET /api/v1/me`) is the first unit to register an `/api/v1` route, by its full path.

## Interfaces

```ts
// src/api/security-headers.ts
export const CONTENT_SECURITY_POLICY: string;   // exact string of the spec requirement of that name
export const SECURITY_HEADERS: Readonly<Record<string, string>>;  // the four headers of that requirement, keys in lower case
export function registerSecurityHeaders(server: FastifyInstance): void;
// src/api/web-paths.ts
export type WebTarget = { kind: "spa" | "reserved" | "refused" } | { kind: "file"; segments: readonly string[] };
export const RESERVED_ROOTS: readonly (readonly string[])[];   // [["api"],["health"],["auth","oidc"],[".well-known"],["hooks"],["callbacks"],["mcp"]]
export function classifyWebPath(url: string): WebTarget;       // the request target as received, query allowed
export function isAssetName(name: string): boolean;            // extension in js mjs css map json svg png jpg jpeg gif webp ico woff woff2 ttf txt webmanifest
export function contentTypeFor(name: string): string;   // table in task 2.1; else application/octet-stream
export function cacheControlFor(relativePath: string): string;  // posix path below the root, e.g. "assets/index-Ab3dEf9Z.js"
// src/api/web.ts
export interface WebAppOptions { readonly distDir: string }
export type WebAppErrorCode = "WEB_DIST_INVALID" | "WEB_APP_DUPLICATE";
export class WebAppError extends Error { readonly code: WebAppErrorCode; constructor(code: WebAppErrorCode, message: string) }
export const DEFAULT_WEB_DIST: string;
export function registerWebApp(server: FastifyInstance, opts: WebAppOptions): void;   // also calls registerSecurityHeaders
//   WEB_DIST_INVALID: distDir empty or with NUL; WEB_APP_DUPLICATE: a second call on one instance; messages are fixed texts without the path
//   an unbuilt distDir: ApiError 503 WEB_NOT_BUILT, details { hint: "run pnpm run build or set URSITOARE_WEB_DIST" }
export function isWebBuilt(distDir: string): Promise<boolean>;   // index.html under realpath(distDir) is a readable regular file; never throws
// src/api/index.ts exports all of these except isAssetName, contentTypeFor and cacheControlFor.
// src/main.ts: after buildServer, registerWebApp(server, { distDir: resolve(config.webDist ?? DEFAULT_WEB_DIST) }), then the WEB_NOT_BUILT warn of decision 6;
//   a throw is a startup failure: an opened Database is closed once, the single fatal line { code, msg } of add-engine-skeleton with code = the error's code (WEB_DIST_INVALID), exit(1), main resolves null
// test/support/e2e-stack/web-part.ts
export const WEB_DIST_PATH: string;   // absolute <repo>/web/dist from import.meta.url
export const webPart: E2eStackPart;   // name "web"; start returns { env: { URSITOARE_WEB_DIST: WEB_DIST_PATH }, close }
// test/support/e2e-stack/parts/20-web.ts: export { webPart as part } from "../web-part.ts";   (green of task 5.1 creates it; never a stub)
```

```ts
// web/src/api/client.ts
export class ApiRequestError extends Error {
  readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null;
  constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown });
}
export type QueryValue = string | number | boolean | undefined;
export interface RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown }
export interface ApiClient {
  request<T>(method: string, path: string, opts?: RequestOptions): Promise<T>;
  get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>;   // put and patch have the same signature
  delete<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>;
}
export interface ApiClientOptions { baseUrl?: string; fetch?: typeof globalThis.fetch }   // baseUrl default "/api/v1"
export function createApiClient(opts?: ApiClientOptions): ApiClient;
// web/src/app/features.ts
export const RESERVED_ROOTS: readonly (readonly string[])[];   // equal to src/api/web-paths.ts RESERVED_ROOTS
export interface FeatureSpec { id: string; path: string; navLabel?: string; capability?: string; element: ReactNode }
export type Feature = Readonly<FeatureSpec>;
export interface NavItem { id: string; path: string; label: string }
export type FeatureErrorCode = "FEATURE_INVALID" | "FEATURE_DUPLICATE_ID" | "FEATURE_DUPLICATE_PATH" | "FEATURE_PATH_RESERVED";
export class FeatureError extends Error { readonly code: FeatureErrorCode; constructor(code: FeatureErrorCode, message: string) }
export interface FeatureRegistry { register(spec: FeatureSpec): void; list(): readonly Feature[]; nav(capabilities?: ReadonlySet<string>): NavItem[] }
export function createFeatureRegistry(): FeatureRegistry;
export function registerFeature(spec: FeatureSpec): void;   // the default registry
export function listFeatures(): readonly Feature[];
export function navItems(capabilities?: ReadonlySet<string>): NavItem[];
// web/src/features/NN-<name>.tsx: export const feature: FeatureSpec;   (collected in file-name order)
// web/src/app/routes.ts
export function routeTable(features: readonly Feature[]): readonly { id: string; path: string }[];   // the features in order, then { id: "not-found", path: "*" }
export function pageTitle(routeId: string): string;   // "not-found": "Page not found · Ursitoare"; else "Ursitoare"; `App` sets document.title from it, a feature may set its own
// web/src/app/health.ts
export type EngineHealth = "healthy" | "unavailable";
export function loadEngineHealth(client: Pick<ApiClient, "get">, signal?: AbortSignal): Promise<EngineHealth>;
export function engineHealthText(state: EngineHealth | "loading"): string;   // "Checking engine health", "Engine healthy", "Engine unavailable"
export function healthView(state: EngineHealth | "loading", rechecking: boolean): { text: string; button: "hidden" | "enabled" | "busy"; focusStatus: boolean };
//   text = engineHealthText(state); button "enabled" if unavailable, "busy" if loading and rechecking, else "hidden"; focusStatus only for healthy and rechecking
```

**Scaffold stubs.** `webPart` has methods that throw `new Error("not implemented")`; `RESERVED_ROOTS`, `SECURITY_HEADERS`, `CONTENT_SECURITY_POLICY`, `DEFAULT_WEB_DIST` and `WEB_DIST_PATH` are an empty array, object or string, never `undefined`.

**Client rules and feature rules:** the exact rules for `createApiClient` and `FeatureRegistry` are in tasks 6.1 and 6.2.

## Failure cases

| Situation | Behaviour |
|---|---|
| `web/dist` missing, `index.html` unreadable, or `distDir` not a web build | engine starts and warns once; SPA and file requests 503 `WEB_NOT_BUILT` with `details.hint`; `/health` unaffected |
| Traversal, backslash, NUL, dotfile, symlink out; missing asset-like file; unknown GET under a reserved root; non-GET on an unmatched path | 404 `NOT_FOUND`; nothing outside the root is read; never `index.html` |
| `distDir` empty or with NUL; second `registerWebApp` | `WebAppError`; in `main` a startup failure: database closed once, fatal line with the error's code, exit 1 |
| Unreadable file | the root handler's 500, no path |
| Fetch rejects; `/health` 503, non-JSON or `status` not `"ok"` | `ApiRequestError`; "Engine unavailable" |
| Invalid, duplicate or reserved feature | `FeatureError`; the registering module fails to load |

## Security

1. **Authentication and PEP.** No new `/api` endpoint. Static files and the fallback are public assets without data (architecture §9.2): no PEP action, and `add-api-pep` classifies the wildcard `public(static)`. The page reads only the public `/health`.
2. **Tenant isolation.** No table, tenant or principal; the browser sends no tenant.
3. **Input validation.** The request path is the only input: `classifyWebPath` decodes once and refuses traversal forms, `realpath` confines files, `index.html` must exist first.
4. **Secrets.** None; errors and logs never contain `distDir` or file paths.
5. **Abuse cases:** traversal, encoded forms, symlink escape, dotfiles, `distDir` `/` (requirements "Static file requests stay inside the web build" and "A missing build ..."); `/api/*` as HTML ("Unknown API ..."); script injection and framing ("Every response carries ..."); a missing script as HTML ("Deep links ..."); another origin ("ApiClient").

## Test plan

Node test runner, `*.test.ts` beside the code, loopback only, each file beginning with the `typeof` assertions its task names. Engine tests build a temp `dist` (`index.html`, `assets/index-Ab3dEf9Z.js`, `favicon.svg`, a symlink `link.txt` to a `secret.txt` outside `dist`) and use `buildServer` with `sequentialIds`, `noopTracer` and a `silent` `createLogger`; requests use `server.inject`, traversal requests `node:http` with the raw path. Web tests use a fake `fetch`. The `.tsx` files are proved by `e2e/test_m0_skeleton.py` (role and label locators, no sleeps). `web/dist` exists before the journeys run (F-1): the root `build` script is `tsc -p tsconfig.build.json && pnpm -r --if-present --filter=!ursitoare run build`, the web package's `build` is `vite build`, and L4's `build` gate runs before `test` and `e2e` in every gate run; no task builds it. This unit depends on every other M0 unit, so its journey proves the M0 outcome on a tree holding the whole milestone (F-3).

## Decisions made while writing

- **`main` always registers the web app**, `startServer` never does, so the security headers are required of `main`'s responses only.
- **The banner holds the product name as a link; each page owns its `<h1>`.** Health uses `createApiClient({ baseUrl: "" })` (`/health` is a root endpoint).
- **Capability filter:** this unit implements the pure filter; add-web-ui-kit only fetches `/me.capabilities` and passes the set to `navItems`, and adds `assert_accessible` to the journey.
- **Node tests for the `.tsx` tasks** (Node cannot load `.tsx`): `routeTable`, `pageTitle` and `healthView` hold the logic; there is no landing-state reducer.
- **Task order:** the shell task (6.3) precedes the health task (6.4), so each journey step passes at its own task. add-e2e-stack's `test_health_reports_database_ok` proves `checks.db`.
