## Purpose

The web shell is the first thing a person sees: the engine serves the built web app with safe defaults, and the app offers a page shell, a route and nav registry, an API client for the error envelope and a landing page that reports engine health.

## ADDED Requirements

### Requirement: Every response carries the security headers
The engine started by `main` SHALL send on every response (`startServer`, which never registers the web app, is exempt; `registerSecurityHeaders` gives any instance the same headers) `content-security-policy` equal to `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer` and `x-frame-options: DENY`.

#### Scenario: Success, error and not-found responses
- **WHEN** `typeof registerSecurityHeaders` is `"function"` and a `buildServer` instance with the hook gets `GET /health`, `GET /missing`, a route that throws, a route that throws `ApiError(401, "AUTH_REQUIRED", "x")` and a POST with an invalid JSON body
- **THEN** all five responses have the four headers with exactly these values, and the CSP contains neither `unsafe-inline` nor `unsafe-eval`

#### Scenario: A handler cannot weaken them and a second call changes nothing
- **WHEN** a route sets `content-security-policy: *` and `registerSecurityHeaders` is called twice on the instance
- **THEN** that response carries the exact CSP as one value (not a list), and `SECURITY_HEADERS["x-frame-options"]` is `"DENY"`

### Requirement: The engine serves the web build
`registerWebApp(server, { distDir })` SHALL answer GET and HEAD for a regular file under `distDir` with 200, its content type and a cache policy: `no-store` for `index.html`, `public, max-age=31536000, immutable` for hashed files under `assets/`, `no-cache` for others. Extensions are compared without regard to case, and a hashed file is `<name>-<8 hash characters>.<ext>`.

#### Scenario: Files, types and cache
- **WHEN** `distDir` holds `index.html`, `assets/index-Ab3dEf9Z.js` and `favicon.svg`, and each is requested with GET, and the script also with HEAD
- **THEN** the types are `text/html; charset=utf-8`, `text/javascript; charset=utf-8`, `image/svg+xml`; the cache-control values are `no-store`, `public, max-age=31536000, immutable`, `no-cache`; the HEAD answer has status 200, the same two headers and an empty body

#### Scenario: Names, types and cache policy
- **WHEN** `isAssetName` gets `a.js`, `a.JS`, `a.js.map`, `a.cd`, `a`, `.js`, `a.` and the empty string; `contentTypeFor` gets `index.html`, `a.JS`, `LOGO.PNG`, `a.js.map`, `data.bin`, `a` and `.js`; `cacheControlFor` gets `index.html`, `assets/index-Ab3dEf9Z.js`, `assets/index-Ab3dEf9Z.js.map`, `assets/INDEX-Ab3dEf9Z.JS`, `assets/short-1.js`, `assets/my-long-name.js`, `assets/index-Ab3dEf9Z1.js`, `assets/logo.svg` and `favicon.svg`
- **THEN** `isAssetName` gives `true`, `true`, `true`, `false`, `false`, `false`, `false`, `false`; `contentTypeFor` gives `text/html; charset=utf-8`, `text/javascript; charset=utf-8`, `image/png`, `application/json; charset=utf-8`, then `application/octet-stream` three times; `cacheControlFor` gives `no-store`, then `public, max-age=31536000, immutable` three times, then `no-cache` five times

#### Scenario: Unknown extension
- **WHEN** `distDir` holds `data.bin` and it is requested
- **THEN** the type is `application/octet-stream` and `x-content-type-options` is `nosniff`

### Requirement: Deep links return the app
The engine SHALL answer a GET for a non-file path outside the reserved roots with `index.html`, 200, `text/html; charset=utf-8` and `no-store`, and a missing file with an asset extension with 404 `NOT_FOUND`.

#### Scenario: Client routes
- **WHEN** `GET /`, `/flows`, `/runs/r1/`, `/t/ab.cd?x=1` and `/assets` (a directory) are requested
- **THEN** each answers 200 with the bytes of `index.html`

#### Scenario: Missing asset
- **WHEN** `GET /assets/missing-Ab3dEf9Z.js`, `GET /logo.png` and `GET /app.JS` are requested and no such file exists
- **THEN** all three answer 404 with `content-type` starting `application/json` and `error.code` `"NOT_FOUND"`

### Requirement: Static file requests stay inside the web build
The engine SHALL answer 404 `NOT_FOUND` for a path that leaves `distDir` or names a hidden file, and SHALL read no file outside it.

#### Scenario: Traversal forms over a socket
- **WHEN** a listening instance gets raw `node:http` requests for `/../secret.txt`, `/assets/../../secret.txt`, `/%2e%2e/secret.txt`, `/%2e%2e%2fsecret.txt`, `/..%5csecret.txt`, `/a%00b`, `/.git/config`, `/link.txt` (a symlink to a file outside `distDir`) and `/%252e%252e/secret.txt`
- **THEN** every answer is 404 with `error.code` `"NOT_FOUND"` and no body contains the text of `secret.txt`

#### Scenario: The classifier on raw strings
- **WHEN** `classifyWebPath` gets `/`, `/flows/`, `/a/../b`, `/%zz`, `/x%2fy`, `/api`, `/Api/v1/x`, `/%61pi/x`, `/auth/oidc/cb`, `/auth/other`, `/.well-known/x`, `/.hidden` and `/assets/a.js?v=1`
- **THEN** the kinds are `spa`, `file ["flows"]`, `refused`, `refused`, `refused`, `reserved`, `reserved`, `reserved`, `reserved`, `file ["auth","other"]`, `reserved`, `refused` and `file ["assets","a.js"]`

### Requirement: Unknown API and root paths answer the JSON 404
The engine SHALL answer a request that matches no route under `/api`, `/health`, `/auth/oidc`, `/.well-known`, `/hooks`, `/callbacks` or `/mcp`, and every non-GET request on an unmatched path, with 404 `{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }`, never HTML.

#### Scenario: Unknown API paths
- **WHEN** `GET /api/v1/does-not-exist`, `GET /API/v1/x`, `GET /api`, `GET /health/extra` and `POST /api/v1/x` are sent to an instance whose `distDir` is valid
- **THEN** all answer 404 with the exact body above and a JSON content type

#### Scenario: Non-GET on a client route, and routes added later win
- **WHEN** `POST /flows`, `PUT /flows` and `DELETE /` are sent, and then a route `GET /api/v1/ping` registered after `registerWebApp` is requested
- **THEN** the first three answer 404 `NOT_FOUND`, and the ping route answers its own 200 body

### Requirement: A missing build is reported and does not stop the engine
When `distDir` is missing or has no readable `index.html`, the engine SHALL still start, answer every SPA and file request with 503 `WEB_NOT_BUILT` and `details.hint` `"run pnpm run build or set URSITOARE_WEB_DIST"` without serving any file, and serve the build as soon as it appears.

#### Scenario: Missing then built
- **WHEN** `distDir` does not exist and `GET /` and `GET /health` are sent, and then `index.html` is created and `GET /` is sent again
- **THEN** `/` answers 503 `error.code` `"WEB_NOT_BUILT"` and the `error.details.hint` above, with the security headers and without the directory path in the body, `/health` answers 200, and the last `/` answers 200 with the file; `isWebBuilt` is `false`, `false`, then `true` for the missing directory, an empty one and the built one

#### Scenario: A directory that is not a web build
- **WHEN** `distDir` holds only `secret.txt` and `GET /secret.txt` and `GET /flows` are sent
- **THEN** both answer 503 `WEB_NOT_BUILT` and no body contains the text of `secret.txt`

#### Scenario: Bad registration
- **WHEN** `registerWebApp` gets `distDir` `""` or `"a\u0000b"`, and then a valid directory twice on one instance
- **THEN** the first two throw `WebAppError` `WEB_DIST_INVALID` and the second valid call throws `WEB_APP_DUPLICATE`

### Requirement: The composition root serves the web app
`main` SHALL call `registerWebApp` with `resolve(config.webDist ?? DEFAULT_WEB_DIST)` before it listens and log one `WEB_NOT_BUILT` warning when that directory holds no build, and `DEFAULT_WEB_DIST` SHALL be the repository's `web/dist`.

#### Scenario: Configured directory
- **WHEN** `typeof main` is `"function"` and `main` runs with an injected `loadConfig` (port 0, `webDist` a temp directory with `index.html`, no database)
- **THEN** `GET /` over loopback is 200 with that file and the CSP, `GET /health` is 200 with `status` `"ok"` and the four security headers, and `GET /api/v1/x` is 404 `NOT_FOUND`

#### Scenario: Unbuilt directory warns once
- **WHEN** `typeof main` is `"function"` and `main` runs with `webDist` an empty temp directory, and then `GET /` and `GET /health` are sent
- **THEN** exactly one captured log line has `code` `"WEB_NOT_BUILT"` and the message `web app is not built; run pnpm run build or set URSITOARE_WEB_DIST`, it holds no path, `/` answers 503 `WEB_NOT_BUILT`, `/health` answers 200, and a run with a built directory logs no such line

#### Scenario: A bad directory stops the start
- **WHEN** `typeof main` is `"function"` and `main` runs with an injected `loadConfig` (port 0) whose `webDist` is `"a\u0000b"` and an injected `openDatabase` returning a recording `Database`
- **THEN** `main` resolves `null`, `exit` gets `1`, exactly one fatal log line has `code` `"WEB_DIST_INVALID"` and no path, no port is open, and the recording `Database` was closed once

#### Scenario: Default directory
- **WHEN** `DEFAULT_WEB_DIST` is read
- **THEN** it is absolute and equals `<repository root>/web/dist`

### Requirement: ApiClient
`createApiClient({ baseUrl = "/api/v1", fetch? })` SHALL send JSON requests to the same origin and turn every failure into a typed `ApiRequestError` with `status`, `code`, `message`, `details` and `requestId`.

#### Scenario: Success and request shape
- **WHEN** a fake fetch records `client.get("/flows", { query: { limit: 2, q: undefined } })` and `client.post("/flows", { name: "a" })`, answering `{"ok":true}` and 204
- **THEN** the URLs are `/api/v1/flows?limit=2` and `/api/v1/flows`; the second has method `POST`, `content-type: application/json`, body `{"name":"a"}`, `credentials: "same-origin"`, both `accept: application/json`; the results are `{ ok: true }` and `undefined`

#### Scenario: Envelope, other failures and bad input
- **WHEN** fake answers are 404 `{"error":{"code":"FLOW_NOT_FOUND","message":"No flow","details":{"id":"f1"}}}` with `x-request-id: r1`; 503 `{"status":"fail"}`; 200 `not json`; a rejecting fetch; an `AbortError`; and calls with `baseUrl` `"https://x"`, path `"//evil.test/x"`, path `"/a?b=1"` and method `"TRACE"`
- **THEN** the errors are `ApiRequestError` with `(404, "FLOW_NOT_FOUND", "No flow", details { id: "f1" }, requestId "r1")`, `(503, "HTTP_ERROR", "HTTP 503")`, `(200, "INVALID_RESPONSE", "Invalid response")`, `(0, "NETWORK_ERROR")`; the abort is rethrown unchanged; the last four throw `RangeError` before any fetch call

### Requirement: Feature registry
`registerFeature({ id, path, navLabel?, capability?, element })` SHALL add a route and an optional nav entry, refuse invalid, duplicate and reserved entries with a `FeatureError`, and keep the nav in registration order; the web `RESERVED_ROOTS` SHALL equal the engine's.

#### Scenario: Order and filtering
- **WHEN** a new registry is read, and then registers `a` (`/a`, "A"), `b` (`/b`, no label), `c` (`/c`, "C", capability `flows.read`) and `d` (`/d/:id`, no label)
- **THEN** the new registry's `list()` and `nav()` are `[]`; afterwards `list()` ids are `a b c d` and is a copy; `nav()` is `[a]`; `nav(new Set(["flows.read"]))` is `[a, c]`, each as `{ id, path, label }`

#### Scenario: Refusals
- **WHEN** a registry holding `a` (`/a`) and `r` (`/runs/:runId`) gets a repeated id `a`, path `/A` after `/a`, `/runs/:id` after `/runs/:runId`, path `/api/v1`, path `/auth/oidc/x`, path `/.well-known/x`, path `flows`, path `/a/`, path `/x?y`, path `/r.json`, path `/.x`, id `Bad Id`, a `navLabel` of 41 characters, `navLabel` on `/p/:id`, and `element` `undefined`
- **THEN** each throws `FeatureError` with `FEATURE_DUPLICATE_ID`, `FEATURE_DUPLICATE_PATH`, `FEATURE_DUPLICATE_PATH`, `FEATURE_PATH_RESERVED` (three times), `FEATURE_INVALID` (nine times), and `list()` is unchanged

#### Scenario: Reserved roots match whole segments
- **WHEN** a new registry registers `apis` (`/apis`), `healthz` (`/healthz`), `auth` (`/auth`) and `other` (`/auth/other`)
- **THEN** all four are accepted and `list()` ids are `apis healthz auth other`

#### Scenario: The web reserved roots equal the engine's
- **WHEN** `RESERVED_ROOTS` of `web/src/app/features.ts` is compared with `RESERVED_ROOTS` of `src/api/web-paths.ts`
- **THEN** they are deep-equal and the web list is not empty

### Requirement: The landing page reports engine health
The landing page at `/` SHALL show the heading "Ursitoare" and the engine health from `GET /health`: "Checking engine health" while loading, "Engine healthy" on `status` `"ok"`, otherwise "Engine unavailable" with a "Check again" button. A click on the button SHALL show "Checking engine health" with the button kept, `aria-disabled="true"` and ignoring activation, keep focus on it while the engine stays unavailable, and move focus to the status region when it becomes healthy.

#### Scenario: Health states in the logic
- **WHEN** `loadEngineHealth` gets a client answering `{ status: "ok", checks: {} }`, then `{ status: "fail" }`, then throwing `ApiRequestError(503, "HTTP_ERROR", "HTTP 503")`, then throwing `ApiRequestError(0, "NETWORK_ERROR", "x")`
- **THEN** it resolves `"healthy"`, `"unavailable"`, `"unavailable"`, `"unavailable"`; `engineHealthText("loading")`, `("healthy")`, `("unavailable")` are the three texts above

#### Scenario: The view for each state
- **WHEN** `healthView` gets `("loading", false)`, `("loading", true)`, `("healthy", false)`, `("healthy", true)`, `("unavailable", false)` and `("unavailable", true)`
- **THEN** the results are `{ text: "Checking engine health", button: "hidden", focusStatus: false }`, the same with `button: "busy"`, `{ text: "Engine healthy", button: "hidden", focusStatus: false }`, the same with `focusStatus: true`, and `{ text: "Engine unavailable", button: "enabled", focusStatus: false }` twice

#### Scenario: Loading, healthy and unavailable in the browser
- **WHEN** the journey opens `/` with `/health` held by `page.route` and then fulfils it with 200 `{"status":"ok"}`; opens `/` again with `/health` answered 503, then holds `/health`, clicks "Check again", and later fulfils it with 200
- **THEN** the status region shows "Checking engine health", then "Engine healthy"; after the 503 it shows "Engine unavailable" and the button "Check again"; after the click it shows "Checking engine health", the button is still present, `aria-disabled` and focused, and after the 200 it shows "Engine healthy", the button is gone and the status region is focused

### Requirement: The shell is accessible and works for deep links
The app SHALL render a banner with the product-name link, `navigation` named "Main" with the registered nav entries, `main`, `contentinfo` and a "Skip to content" link that moves focus to `main`, and SHALL show "Page not found" for a path no feature owns.

#### Scenario: Landmarks, keyboard and CSP
- **WHEN** the journey opens `/` and collects console and page errors, presses Tab once and then Enter
- **THEN** the roles `banner`, `navigation` (name "Main"), `main`, `contentinfo` and the heading "Ursitoare" are visible, the link "Skip to content" is focused, in the viewport and has a computed `outline-style` other than `none`, and then `main` is focused, the link "Home" is in the navigation, and no console message mentions "Content Security Policy" and no page error occurred

#### Scenario: Route table and titles
- **WHEN** `routeTable` gets no features, and then features `a` (`/a`) and `b` (`/b/:id`); `pageTitle` gets `"not-found"`, `"home"` and `"a"`
- **THEN** the tables are `[{ id: "not-found", path: "*" }]` and `[{ id: "a", path: "/a" }, { id: "b", path: "/b/:id" }, { id: "not-found", path: "*" }]`; the titles are `Page not found · Ursitoare`, `Ursitoare` and `Ursitoare`

#### Scenario: Deep link
- **WHEN** the journey opens `/flows`
- **THEN** the link "Ursitoare" in the banner and the heading "Page not found" are visible, the page title is `Page not found · Ursitoare`, and the response status is 200

### Requirement: The offline stack serves the built app and the journey passes
The e2e stack SHALL give the engine `URSITOARE_WEB_DIST` through the part `web` (`parts/20-web.ts`, discovered like any part), and `e2e/test_m0_skeleton.py` SHALL prove the M0 outcome through it.

#### Scenario: The part
- **WHEN** `typeof discoverParts` is `"function"`, `await discoverParts()` is read and `webPart.start(ctx)` runs with a hand-made context
- **THEN** the names start with `["database", "web"]`, the second part is `webPart`, the handle's `env` is exactly `{ URSITOARE_WEB_DIST: WEB_DIST_PATH }`, `WEB_DIST_PATH` is absolute and ends with `web/dist`, and `close()` resolves

#### Scenario: The M0 journey
- **WHEN** the journey runs against the served stack
- **THEN** `GET /` carries the four security headers with the exact CSP; `GET /api/v1/does-not-exist` is 404 with `error.code` `"NOT_FOUND"`; `GET /%2e%2e%2f%2e%2e%2fetc/passwd` is 404 JSON; and the landing page shows the heading "Ursitoare" and "Engine healthy"
