# web-shell Specification

## Purpose
The web shell is the first thing a person sees: the engine serves the built web app with safe defaults, and the app offers a page shell, a route and nav registry, an API client for the error envelope and a landing page that reports engine health.

## Requirements

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
- **WHEN** the journey opens `/no-such-page-deep-link`, a path no feature owns
- **THEN** the link "Ursitoare" in the banner and the heading "Page not found" are visible, the page title is `Page not found · Ursitoare`, and the response status is 200

### Requirement: The offline stack serves the built app and the journey passes
The e2e stack SHALL give the engine `URSITOARE_WEB_DIST` through the part `web` (`parts/20-web.ts`, discovered like any part), and `e2e/test_m0_skeleton.py` SHALL prove the M0 outcome through it.

#### Scenario: The part
- **WHEN** `typeof discoverParts` is `"function"`, `await discoverParts()` is read and `webPart.start(ctx)` runs with a hand-made context
- **THEN** the names start with `["database", "web"]`, the second part is `webPart`, the handle's `env` is exactly `{ URSITOARE_WEB_DIST: WEB_DIST_PATH }`, `WEB_DIST_PATH` is absolute and ends with `web/dist`, and `close()` resolves

#### Scenario: The M0 journey
- **WHEN** the journey runs against the served stack
- **THEN** `GET /` carries the four security headers with the exact CSP; `GET /api/v1/does-not-exist` is 404 with `error.code` `"NOT_FOUND"`; `GET /%2e%2e%2f%2e%2e%2fetc/passwd` is 404 JSON; and the landing page shows the heading "Ursitoare" and "Engine healthy"

### Requirement: Navigation entries are grouped by a fixed map
`NAV_GROUP_OF` SHALL map `home` to `"home"`, `flows` and `runs` to `"build"`, and `admin-users`, `admin-roles-teams`, `admin-group-mappings`, `admin-audit`, `admin-tool-servers`, `admin-grants` and `admin-policies` to `"admin"`, and nothing else; `NAV_GROUP_LABELS` SHALL be `{ home: null, build: "Build", admin: "Admin", more: "More" }`. `navGroups(items)` SHALL return the groups in the order home, build, admin, more, leave out empty groups, send an id that is not an own key of `NAV_GROUP_OF` to `"more"`, keep the input order inside a group, give every item exactly once and unchanged, and not mutate its input.

#### Scenario: The map covers every navigation id and nothing else
- **WHEN** `nav-group-map.test.ts` reads `NAV_GROUP_OF`, `NAV_GROUP_LABELS`, and the ids with a `navLabel` in `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES` and `RUN_PAGES` plus the literal `home` (test-plan.md T1)
- **THEN** `NAV_GROUP_OF` has exactly the 10 keys of T1 with the values of T1 (`Object.keys` sorted), the ten ids gathered from the four tables are exactly those keys, `NAV_GROUP_LABELS` deep-equals `{ home: null, build: "Build", admin: "Admin", more: "More" }`, and `flow-editor` and `run` (`navLabel: null`) are not keys

#### Scenario: Entries are grouped, ordered and passed through
- **WHEN** `navGroups` gets the inputs G1 to G9 of test-plan.md T2, among them carol's ten entries, alice's three, `home` alone, `[]`, an unknown id, the ids `constructor`, `toString` and `__proto__`, and a frozen array of frozen items
- **THEN** G1 gives `home [home]`, `build [flows, runs]`, `admin [admin-users, admin-roles-teams, admin-group-mappings, admin-audit, admin-tool-servers, admin-grants, admin-policies]` with labels `null`, `"Build"`, `"Admin"`; G2 gives home and build only; G3 home only; G4 `[]`; G5 puts `zz-new` in `more` labelled `"More"` after `build`; G6 puts all four prototype-style ids in `more`; G7 returns the same item objects (`===`), ten in all, with the input still 10 long and no throw; G8 and G9 keep input order inside a group

### Requirement: The layout is a sidebar from 1024 px and collapsed below
`shellLayout(widthPx)` SHALL answer `"sidebar"` when `widthPx >= 1024` and `"collapsed"` otherwise, including for `NaN` and negative numbers.

#### Scenario: The width decides the layout
- **WHEN** `shellLayout` gets 0, 1023, 1023.9, 1024, 1280, 1366, `NaN`, `Infinity` and -1
- **THEN** the answers are `"collapsed"`, `"collapsed"`, `"collapsed"`, `"sidebar"`, `"sidebar"`, `"sidebar"`, `"collapsed"`, `"sidebar"` and `"collapsed"`

### Requirement: The shell holds one banner, one navigation, one main and one footer
`Shell.tsx` SHALL render, in this order, the skip link "Skip to content" (`href="#main"`), one `header`, `main#main` with `tabIndex={-1}` around `<Outlet />`, one `footer` "Ursitoare workflow engine" and `<ToastRegion />`, inside a `TooltipProvider`, and exactly one `nav` with `aria-label="Main"` and `id="main-nav"`: after the `header` (sidebar placement, built from `navGroups(`) or inside it (inline placement). Each sidebar group SHALL be a `p` label (never a heading) followed by a `ul` named by it through `aria-labelledby`; the current page SHALL carry `aria-current="page"`. The shell SHALL render no `role="status"`, `role="alert"` or `aria-live`, no heading, no inline style and no palette utility, and SHALL NOT use `@radix-ui` or the classes `app-shell`, `app-banner` and `app-nav`.

#### Scenario: The shell source holds the landmark, group and menu markup
- **WHEN** `shell-sources.test.ts` reads `Shell.tsx` (test-plan.md T3)
- **THEN** it contains `navGroups(`, `aria-labelledby`, `<p id={`, `aria-expanded`, `aria-controls`, `TooltipProvider`, `lg:hidden`, `lg:block`, `useState(` and `<main id="main" tabIndex={-1}`; it also contains `navPlacement(` and `useSession()`; it holds two `<nav` and two `aria-label="Main"` (one per placement, one rendered at a time), one `<header`, one `<footer`, one `<main` and the word "Ursitoare" twice; "Skip to content", `<header`, `{inline ? null : nav}`, `<main` and `<footer` occur in that order; it contains none of `role="status"`, `role="alert"`, `aria-live`, `app-nav`, `app-banner`, `app-shell`, `Collapsible`, `@radix-ui`, `DropdownMenu`, `style=`, `outline-none` and `disabled`, no `<h1` to `<h6`; and `findInlineStyleUse`, `findPaletteUtilities`, `findCssImports` and `findBannedImports` are `[]` on it

#### Scenario: Carol's navigation is grouped and the banner is compact
- **WHEN** `test_carols_navigation_is_grouped_and_the_banner_is_compact` mocks `/api/v1/me` with carol's seven capabilities and opens `/` at 1366 by 860, then at 1280 by 720 (test-plan-browser.md)
- **THEN** the page has one `navigation` named "Main" whose links read, in order, Home, Flows, Runs, Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants, Policies; the visible labels "Build" and "Admin" head the lists "Build" (Flows, Runs) and "Admin" (7 links); one link has `aria-current="page"`, "Home"; the nav is 240 px wide with `main` starting at x 240; `assert_layout(page, 72)` passes with a measured banner of 56 px at both sizes; the last link ends above y 720 at 1280 by 720 (measured 514); `assert_accessible(page)` passes and the `watch_csp` list is `[]`

#### Scenario: Alice and a signed-out visitor see fewer groups
- **WHEN** `test_alice_and_a_signed_out_visitor_see_fewer_groups` opens `/` at 1366 by 860 with `/api/v1/me` mocked for alice's capabilities `read_self`, `read_flow`, `read_run`, and then with it answered 401
- **THEN** alice's links read Home, Flows, Runs under the label "Build" and no label "Admin" or "More" exists; with the 401 there is still one `navigation` named "Main", inside the banner, whose links read Home alone, with one list, no group label, no button "Menu", `main` at x 0 and the nav's bottom edge at most 56 px from the page top; both pages pass `assert_layout(page, 72)` and `assert_accessible(page)` and the `watch_csp` list is `[]`

#### Scenario: Key stops keep their ring and script focus draws none
- **WHEN** `test_key_stops_keep_their_ring_and_script_focus_draws_none` opens `/` at 1280 by 720 with a mocked ready session, presses Tab four times, reloads, presses Tab and Enter, focuses the home `status` from script, then answers `/api/v1/me` with an aborted request and clicks "Dismiss" on the toast
- **THEN** the four Tab stops are the link "Skip to content", the link "Ursitoare", the button "Sign out" and the link "Home", each with a computed `outlineStyle` other than `none` and an `outlineWidth` of at least 2 px (measured 3); after Enter on the skip link `main` is focused with `outlineStyle` `none`; the focused `status` (`tabindex="-1"`) has `outlineStyle` `none`; after "Dismiss" `main` is focused again with `outlineStyle` `none`; the `watch_csp` list is `[]`

### Requirement: With nobody signed in the navigation sits in the banner and there is no sidebar
`navPlacement(state)` SHALL answer `"inline"` when `state.status` is `"signed_out"` or `"failed"` and `"sidebar"` for `"ready"` and for `null`. Inline, `Shell.tsx` SHALL render the one `nav` "Main" inside the `header` after the brand as a single flat list, without group labels, a "Menu" button or a grid, so `main` is full width.

#### Scenario: The placement follows the session state
- **WHEN** `nav-placement.test.ts` calls `navPlacement` with `null`, `{ status: "signed_out" }`, `{ status: "failed", code: "UNKNOWN_ERROR" }` and a ready state (test-plan.md T2b)
- **THEN** the answers are `"sidebar"`, `"inline"`, `"inline"` and `"sidebar"`

### Requirement: The banner stays at most 72 px tall
The banner SHALL be one non-wrapping row of at least `--ui-banner-height` (56 px); the brand and the buttons SHALL NOT shrink, and the "Signed in as" and "Tenant:" paragraphs SHALL truncate with `text-overflow: ellipsis`, so the banner stays at most 72 px at every width.

#### Scenario: Names of 60 characters truncate and never grow the banner
- **WHEN** `test_long_names_truncate_and_never_grow_the_banner` mocks a display name of 60 "W" and a tenant name of 60 "M" and opens `/` at 1366 by 860 and at 900 by 800
- **THEN** the banner text contains both whole names; `assert_layout(page, 72)` passes with a banner of 56 px; both paragraphs compute `text-overflow: ellipsis` and are cut (`scrollWidth` greater than `clientWidth`; font-dependent, measured on macOS 921 against 607 and 804 against 530 at 1366, 921 against 323 and 804 against 282 at 900); the right edge of "Sign out" is at most the viewport width (measured 1350 and 884)

### Requirement: Below 1024 px a Menu button folds the navigation
For a signed-in user (sidebar placement), below 1024 px wide the button "Menu" SHALL be visible with `aria-expanded="false"` and `aria-controls="main-nav"`, and the navigation SHALL be hidden (not in the accessibility tree); a click SHALL show it (`aria-expanded="true"`), a second click hide it, and a change of route SHALL close it. From 1024 px the button SHALL be hidden and the navigation shown. The toggle SHALL be React state, not a Radix primitive.

#### Scenario: The menu folds below 1024 px
- **WHEN** `test_the_menu_folds_below_1024_px` mocks a ready session and opens `/` at 1023 by 800 and at 1024 by 800, then at 900 by 800 clicks "Menu" twice and opens `/no-such-page`, clicks "Menu" and then the link "Home"
- **THEN** at 1023 the button "Menu" is visible with `aria-expanded="false"` and there are 0 `navigation` elements; at 1024 the button is hidden and there is 1, whose `id` is `main-nav`; at 900 the first click gives `aria-expanded="true"` with the navigation visible and `assert_layout(page, 72)` and `assert_accessible(page)` passing, the second `"false"` and 0 navigations; after the click on "Home" the URL path is `/`, `aria-expanded` is `"false"` and there are 0 navigations; the `watch_csp` list is `[]`

### Requirement: Shell and auth stylesheets hold tokens only and a light colour scheme
`shell.css` SHALL declare `color-scheme: light` and not `light dark`, keep `.skip-link` and `.skip-link:focus` with `var(--ui-focus-width)`, replace `main:focus` by `[tabindex="-1"]:focus { outline: none; }` so that an element which only receives focus from script (`main`, a page `h1`, the home `status`) draws no frame while every interactive stop keeps the kit's `:focus-visible` outline, and hold none of the old `.app-*` selectors, `Canvas` or `currentColor`. `auth.css` SHALL keep `.auth-account` and `.auth-page`, with `text-overflow: ellipsis`, `max-width: 24rem`, `var(--ui-color-divider)`, `var(--ui-radius-lg)` and `var(--ui-shadow-sm)`. Both files SHALL hold no raw colour and use only tokens of `tokens.css`.

#### Scenario: The stylesheets use tokens and a light scheme
- **WHEN** `shell-css.test.ts` reads `shell.css`, `auth.css` and `tokens.css` (test-plan.md T4)
- **THEN** `shell.css` contains `color-scheme: light;`, `.skip-link:focus`, `[tabindex="-1"]:focus`, `outline: none;` and `var(--ui-focus-width)` and none of `main:focus`, `light dark`, `Canvas`, `currentColor` and `.app-shell`; `auth.css` contains `text-overflow: ellipsis`, `max-width: 24rem`, `var(--ui-color-divider)`, `var(--ui-radius-lg)` and `var(--ui-shadow-sm)` and not `max-width: 32rem`; `findRawColours` is `[]` for both and every `var(--…)` name they use is a key of `parseTokens(tokens.css)`

### Requirement: The sign-in and not-found pages are cards in the shell
`AccountMenu.tsx`, `SignInPage.tsx` and `App.tsx` SHALL use `Button` for "Sign out", "Sign in" and "Go to the landing page" (a link through `asChild`) and no `className="ui-button"`, keep their roles, names, texts and `aria-disabled`, and hold no native `disabled` and no inline style. The sign-in page SHALL be a card at most 24rem wide and the not-found page a card with the heading "Page not found", each centred in `main`, which is the full page width when nobody is signed in.

#### Scenario: The account, sign-in and not-found sources use the shared Button
- **WHEN** `auth-sources.test.ts` reads `AccountMenu.tsx`, `SignInPage.tsx` and `App.tsx` (test-plan.md T3)
- **THEN** each contains `<Button` and `from "../ui/button.tsx"` and none contains `className="ui-button"`, `style=` or a native `disabled=`; `AccountMenu.tsx` also contains `role="group"`, `aria-label="Account"`, `Signed in as`, `Tenant:`, `Sign out`, `aria-disabled` and `asChild`; `SignInPage.tsx` contains `tone="primary"`, `<h1>Sign in</h1>` twice, `ErrorPanel` and `Checking your session`; `App.tsx` contains `Page not found`, `Go to the landing page`, `asChild` and `DocumentTitle routeId="not-found"`; `findInlineStyleUse` and `findPaletteUtilities` are `[]` on all three

#### Scenario: Sign-in and not-found render as centred cards
- **WHEN** `test_sign_in_and_not_found_render_as_centred_cards` opens `/sign-in`, `/sign-in?error=OIDC_USER_DISABLED` and `/no-such-page` signed out at 1366 by 860
- **THEN** on both sign-in pages `main` starts at x 0, the card `main > div` is 384 px wide, at y 104 and centred on the page (centre x 683), and the button "Sign in" is 334 px wide (one such button); with the error the card holds the one `alert`; on the not-found page `main` starts at x 0, the card is 448 px wide, at y 128, centred on the page, the heading "Page not found" is visible, the link "Go to the landing page" has `href` `/`, and the title is `Page not found · Ursitoare`; every page passes `assert_layout(page, 72)` and `assert_accessible(page)` and the `watch_csp` list is `[]`

### Requirement: Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table
- **WHEN** the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800,
- **THEN** the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.

### Requirement: The banner stays at most 72 px tall — regression 2
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60...
- **WHEN** the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800,
- **THEN** the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.

### Requirement: Only a ready session gets the dashboard
`homeView(session)` SHALL answer `{ kind: "public" }` for `null`, `signed_out` and `failed`, and `{ kind: "dashboard", capabilities, userId, displayName }` from `me.capabilities`, `me.user.id` and `me.user.displayName` for a ready session. `HomePage` SHALL render the landing page's markup unchanged for `public`, the dashboard for `dashboard`, and make one health request per load.

#### Scenario: The view follows the session state
- **WHEN** `home-rows.test.ts` calls `homeView` with `null`, `{ status: "signed_out" }`, `{ status: "failed", code: "UNKNOWN_ERROR" }` and a ready state of user `usr_me` "Alice Example" with capabilities `read_self` and `read_run` (test-plan.md T1)
- **THEN** the first three answers deep-equal `{ kind: "public" }`; the fourth has `kind` `"dashboard"`, capabilities `["read_self", "read_run"]`, `userId` `"usr_me"` and `displayName` `"Alice Example"`

#### Scenario: The signed-out home is unchanged
- **WHEN** `test_the_signed_out_home_is_unchanged` answers `/api/v1/me` with 401 and opens `/` at 1366 by 860, then answers every `/api/v1/*` call with alice's `/me` body and opens `/` again
- **THEN** the first `main` text is "Ursitoare Engine healthy" with one `status` and no `region`; the second is the T8 text with 0 `alert`; axe passes on both and the `watch_csp` list is `[]`; `test_l4_c_87996887.py`, `test_m0_skeleton.py` and `test_l4_c_1542e67b.py` pass unchanged

### Requirement: Recent runs show at most five runs with state, flow, time, duration and name
`runRows(runs, ctx)` SHALL return a view for each of the first `HOME_LIMIT` (5) runs in the given order: `href` `/runs/<id>`, `shortId` (the last 8 characters of the id), `state`, `tone` (`runStateTone`), `started`, `startedIso` and `exact` from `startedAt` (else `createdAt`) by `formatAgo` and `formatInstant`, `duration` (`formatDuration(startedAt, endedAt, nowMs)`, `"—"` when `startedAt` is null) and `by`: `"by you"` for `ctx.meId`, `"by <name>"` for a name in `ctx.names` not blank after trimming, else `null`. `recentRunLinkName(run)` SHALL be `Run <last 8 characters of the id> of <flowId>` (the whole id when shorter).

#### Scenario: Seven runs give five rows with distinct link names
- **WHEN** `runRows` gets the runs R1 to R7 of test-plan.md T2 with `nowMs` 2026-11-18T12:00:00Z, `meId` `usr_me` and the names `usr_bob` "Bob Example" and `usr_pad` "   "; `recentRunLinkName` gets `run_01a1eb72-3179-7000-a94d-6c6eaf5d03ac` and `…5d03ad` with `demo-pay`, and `r1` with `x-y`
- **THEN** 5 rows come back with the values of T2 (the first: `af5d03ac`, `completed`, `success`, "3 min ago", "2026-11-18 11:56 UTC", "1.4 s", "by you"; the queued run "1 d ago" and "—"; `usr_ghost` and the blank `usr_pad` give `null`), `runRows([], …)` is `[]`, and the names are `Run af5d03ac of demo-pay`, `Run af5d03ad of demo-pay` and `Run r1 of x-y`

### Requirement: Recent flows are the five changed last
`recentFlows(flows)` SHALL return the `HOME_LIMIT` flows changed last, newest first, where the change instant is `Date.parse` of `latest.createdAt` (else `createdAt`; unparsable counts as 0) and a tie goes to the smaller `flowId`. `flowRows(flows, nowMs)` SHALL map them to `href` `/flows/<id>`, `ownerTeam`, `version` ("No version yet" without a latest version; `v<n> · has errors` with tone `danger` when `validationOk` is false; else `v<n> · <state>` with `versionStateTone`), `changed` (`formatAgo`), `changedIso` and `exact`.

#### Scenario: Seven flows in name order give five by recency
- **WHEN** `flowRows` gets the flows F1 to F7 of test-plan.md T3, in flow-id order as `GET /api/v1/flows` answers, with `nowMs` 2026-11-18T12:00:00Z
- **THEN** the rows are `demo-draft` ("No version yet", "5 min ago"), `demo-pay` ("v2 · validated", `success`, "1 h ago"), `alpha-flow` ("v1 · has errors", `danger`), `beta-flow` and `zeta-flow` (tied at "8 d ago"); `gone` and `old-one` are left out and `recentFlows([])` is `[]`; a published latest version reads "v4 · published" with `info`

### Requirement: Next steps follow the role and the state the API shows
`nextSteps(capabilities, facts)` SHALL return `{ steps, settled }` with, in this order:
- with `test_flow` and known flows: "Create your first flow" (`/flows`) when there is none; else "Start a test run" (`/flows/<id>`) for the flow changed last whose latest version has `validationOk` true; else "Open a flow" (`/flows/<id>`) for the flow changed last;
- with `read_run` and known runs: "Review a failed run" (`/runs/<id>`) for the first `failed` of the first five;
- with `manage_users_roles`: "Give people a role" (`/admin/users`) when the count of active human accounts without a role is above 0;
- with `register_tool_server`: "Review pending tool servers" (`/admin/tool-servers`) when the count of `pending` servers is above 0;
- with `deploy_policy`: "Deploy grant changes" (`/admin/policies`) when `pendingGrants` is above 0.

A step SHALL appear only for a known fact. A count step SHALL carry its count as `badge` (`"<n>+"` and "At least" in the description when the page was not complete). `settled` SHALL be true when at least one capability asked for a fact and every fact asked for is known.

#### Scenario: An author's steps follow her flows and runs
- **WHEN** `nextSteps` gets the author capabilities and the facts of rows N1 to N5b of test-plan.md T4
- **THEN** no flow gives only `create-first-flow` with `settled` true; `demo-pay` validated gives `start-test-run` at `/flows/demo-pay`; two unvalidated flows give `open-a-flow` at `/flows/demo-draft`; a failed run and no flow give `create-first-flow` then `review-failed-run`; the texts are those of T4

#### Scenario: An administrator's steps are the three setup counts
- **WHEN** `nextSteps` gets carol's eleven capabilities and rows N10 to N15
- **THEN** one unassigned person, 2 pending servers and 2 undeployed grants give `assign-roles` (badge "1"), `review-pending-tool-servers` ("2") and `deploy-grant-changes` ("2") in that order with `settled` true; an incomplete 200 gives badge "200+" and "At least"; counts 0 give `[]` with `settled` true

#### Scenario: Nothing is claimed that the page has not read
- **WHEN** `nextSteps` gets the reader capabilities with rows N6 to N9, and rows N13 and N16 to N18
- **THEN** a completed run gives `[]` with `settled` true; a failed run in sixth place gives `[]`; unknown runs give `[]` with `settled` false; with policy and users unknown and 3 servers incomplete an administrator gets only `review-pending-tool-servers` ("3+") with `settled` false; `read_self` alone and an author with no facts give `[]` with `settled` false

### Requirement: Every next step links to a page that exists
Each `NextStep` SHALL have an `href` that matches the `path` of a page of `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES` or `RUN_PAGES`, a `label` that is not a navigation label and does not contain "Ursitoare", and a unique `id` and `label`.

#### Scenario: The seven steps link to registered pages
- **WHEN** `home-steps.test.ts` collects the steps of an administrator-author with all five facts (5 steps), of an author with a validated flow and of an author with a draft flow (T5)
- **THEN** the ids are exactly `assign-roles`, `create-first-flow`, `deploy-grant-changes`, `open-a-flow`, `review-failed-run`, `review-pending-tool-servers` and `start-test-run`, with the hrefs `/flows`, `/runs/run_01a1eb70-0000-7000-8000-00000000be11`, `/admin/users`, `/admin/tool-servers`, `/admin/policies`, `/flows/demo-pay` and `/flows/demo-draft`; each href matches a path of the four tables; no label equals one of the 10 navigation labels or contains "Ursitoare"; the 7 labels are distinct

### Requirement: The home loaders read one page each and fail loudly
`loadRecentRuns`, `loadFlowSet`, `loadPendingServers`, `loadUnassigned` and `loadPolicyFact` SHALL each make one `GET` with the caller's signal (`/runs` with `limit` 5; `/flows`, `/tool-servers` and `/users` with `limit` `HOME_PAGE_SIZE`; `/policies` with no query). `loadFlowSet` SHALL report `complete` false when `next_cursor` is a string; the counters SHALL count the `pending` servers and the active humans whose `roles` and `localRoles` are both empty. A client rejection SHALL reject the loader with the same error; a body that is not a page, a refused item, a non-record item, or a policy body with a negative or missing `pendingGrants` or a `current` that is neither null nor an object SHALL reject with `ApiRequestError` code `INVALID_RESPONSE` and status 200.

#### Scenario: The loaders ask one page, count, and fail loudly
- **WHEN** `home-load.test.ts` runs the loaders against a fake client with the answers of rows L1 to L9 of test-plan.md T6, then makes the client reject with `ApiRequestError(500, "INTERNAL", "x")` and with an `AbortError`, then answers the malformed bodies of rows L10 to L19
- **THEN** the calls are `{ path: "/runs", query: { limit: 5 } }`, `/flows`, `/tool-servers` and `/users` with `{ limit: 200 }`, and `{ path: "/policies", query: undefined }`; the results are the rows of T6 (`{ count: 2, complete: true }` for servers and users, `complete` false for a flow page with a cursor, `{ deployed: false, pendingGrants: 2 }`); each loader rejects with the same 500 error object after one call, the abort passes through, and each malformed body rejects with `INVALID_RESPONSE` and status 200

### Requirement: The home page keeps its pins
`HomePage.tsx` SHALL hold exactly two `role="status"` (the signed-out line and the dashboard's health pill, one rendered at a time), one `<h1>Ursitoare</h1>` and none of `role="alert"`, `aria-live`, `DataTable`, `ErrorPanel`, `LoadingState`, `browserSession`, `style=`, `outline-none` or a native `disabled`; it SHALL read its lists with `createApiClient()`. `home.ts` SHALL be pure: no React, `browserSession`, `document`, `window`, `Date.now(`, `Math.random(` or `new Date(`.

#### Scenario: The sources keep the pinned markup
- **WHEN** `home-sources.test.ts` reads `HomePage.tsx`, `10-home.tsx` and `home.ts` (test-plan.md T7)
- **THEN** the needles of T7 are present and absent as listed, `10-home.tsx` renders `<HomePage />` with `id: "home"`, `path: "/"` and `navLabel: "Home"`, and `findInlineStyleUse`, `findPaletteUtilities`, `findCssImports` and `findBannedImports` are `[]` on all three files

### Requirement: The dashboard renders each list and step from its own state
Each list SHALL show three `Skeleton` bars while loading (no `status`), its rows when loaded, an `EmptyState` with a link when empty, and "<Recent runs|Recent flows> could not be loaded." with a "Try again" button when its request failed (for a 401 `UNAUTHENTICATED`: "Your session has ended." and a link "Sign in again" to `/sign-in?error=SESSION_ENDED&return_to=%2F`, no redirect); one list's state SHALL NOT change another list, the health line or the page's `alert`, `status` and `[aria-live]` counts.

#### Scenario: Alice sees her runs, flows and next step
- **WHEN** `test_alice_sees_recent_runs_recent_flows_and_her_next_step` mocks alice's six capabilities, three runs, three flows and `/api/v1/people`, and opens `/` at 1366 by 860
- **THEN** "Recent runs" lists 3 items, the first "completed Run af5d03ac of demo-pay 3 min ago · 1.4 s · by you" and the second "failed Run 0000be11 of demo-grants 2 h ago · 1 min 15 s · by Bob Example"; "Recent flows" lists `demo-draft`, `demo-pay` and `alpha-flow`; "Next steps" links "Start a test run" (`/flows/demo-pay`) and "Review a failed run"; hovering the first time shows "<UTC minute of 200 s ago> UTC"; `status`, `alert` and `[aria-live]` counts are 1, 0, 1; there is one `/api/v1/me` and one `/api/v1/people?ids=user-2` request; layout (`assert_layout(page, 72)`), axe and CSP checks pass (the other texts are in test-plan-browser.md)

#### Scenario: Carol sees setup steps from what the API shows
- **WHEN** `test_carol_sees_setup_steps_from_what_the_api_shows` mocks carol's eleven capabilities, empty runs and flows, three tool servers (2 pending), `{ current: null, pendingGrants: 2 }` and three accounts (one active human without a role), and opens `/`
- **THEN** "Next steps" lists "Give people a role", "Review pending tool servers" and "Deploy grant changes" with the texts of T4 N10 and the hrefs `/admin/users`, `/admin/tool-servers` and `/admin/policies`; "No runs yet" and "No flows yet" show the links "Browse flows" and "Go to flows" (`href` `/flows`); layout, axe and CSP checks pass

#### Scenario: A failing list fails alone and Try again reads it again
- **WHEN** `test_a_failing_list_fails_alone_and_try_again_reads_it_again` answers `/api/v1/runs` with 500 once and then an empty page, and `/api/v1/flows` with `{}`, for alice, and clicks "Try again" in "Recent runs"; then a second page whose runs route answers 401 opens `/`
- **THEN** both "could not be loaded." lines show with 0 `alert`, one `status` "Engine healthy" and no "Next steps" region; after the click "No runs yet" and the link "Choose a flow to test" (`/flows`) show, the flows line stays, the runs route was hit twice, and axe and CSP checks pass; the second page shows "Your session has ended." and "Sign in again", no "Try again" in "Recent runs" and one `/api/v1/me`
