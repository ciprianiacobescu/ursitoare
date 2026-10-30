# web-auth Specification

## Purpose
The web-auth capability lets a person sign in to the web app through the identity provider, see who they are and which tenant they act for, and sign out, and it makes the browser client send the CSRF header and leave a dead session. It also closes milestone M1 with a browser journey over two tenants.

## Requirements

### Requirement: Every sign-in error code has one text
The web app SHALL register one catalogue text for each code that `/sign-in?error=` can carry and for `OIDC_CSRF_INVALID` and `OIDC_NOT_CONFIGURED`, so no screen shows a server message.

#### Scenario: Every code has a text
- **WHEN** `registerSignInMessages()` runs twice and `messageFor` is called for each code of `SIGN_IN_ERROR_CODES`, for `OIDC_CSRF_INVALID`, for `OIDC_NOT_CONFIGURED` and for `UNKNOWN_ERROR`
- **THEN** nothing throws; `SIGN_IN_ERROR_CODES` is `SESSION_ENDED`, `OIDC_LOGIN_EXPIRED`, `OIDC_STATE_MISMATCH`, `OIDC_BAD_REQUEST`, `OIDC_EXCHANGE_FAILED`, `OIDC_PROVIDER_UNAVAILABLE`, `OIDC_TOKEN_INVALID`, `OIDC_UNKNOWN_TENANT`, `OIDC_USER_DISABLED`, `OIDC_INTERNAL` in that order; each answer equals its `SIGN_IN_MESSAGES` entry and differs from `FALLBACK_MESSAGE`; the ten texts of the list are pairwise different and 1 to 200 characters long; `UNKNOWN_ERROR` gives `FALLBACK_MESSAGE`

#### Scenario: The texts
- **WHEN** `SIGN_IN_MESSAGES` is read
- **THEN** it holds exactly these twelve entries:
  - `SESSION_ENDED`: "Your session has ended, or you are not signed in. Sign in to continue."
  - `OIDC_LOGIN_EXPIRED`: "The sign-in took too long or began in another tab. Try again."
  - `OIDC_STATE_MISMATCH`: "The sign-in did not match this browser. Try again."
  - `OIDC_BAD_REQUEST`: "The sign-in answer was incomplete. Try again."
  - `OIDC_EXCHANGE_FAILED`: "The identity provider refused the sign-in. Try again."
  - `OIDC_PROVIDER_UNAVAILABLE`: "The identity provider cannot be reached right now. Try again in a moment."
  - `OIDC_TOKEN_INVALID`: "The identity provider sent an answer that could not be trusted. Try again or ask an administrator."
  - `OIDC_UNKNOWN_TENANT`: "Your organization is not set up on this engine. Ask an administrator."
  - `OIDC_USER_DISABLED`: "Your account is disabled. Ask an administrator."
  - `OIDC_INTERNAL`: "Sign-in hit an unexpected problem. Try again or ask an administrator."
  - `OIDC_CSRF_INVALID`: "This page is out of date. Reload it and try again."
  - `OIDC_NOT_CONFIGURED`: "Sign-in is not configured on this engine. Ask an administrator."

### Requirement: The return path survives the sign-in round trip
`loginUrl`, `signInUrl` and `parseSignInSearch` SHALL carry only a same-origin path that is not a sign-in or auth path as `return_to`, and SHALL accept only a known code as `error`.

#### Scenario: Login and sign-in URLs
- **WHEN** `loginUrl` gets `/flows?x=1`, `/runs/5#top`, `//evil.invalid`, `https://evil.invalid/x`, `/\evil.invalid`, `/a` followed by CR LF and `b`, `/sign-in`, `/sign-in/x`, `/auth/oidc/login`, `/` followed by 512 `x`, and `undefined`; and `signInUrl()`, `signInUrl({ returnTo: "/" })`, `signInUrl({ error: "SESSION_ENDED", returnTo: "/flows?tab=2" })` and `signInUrl({ error: "bad code" })` run
- **THEN** the first two `loginUrl` results are `/auth/oidc/login?return_to=%2Fflows%3Fx%3D1` and `/auth/oidc/login?return_to=%2Fruns%2F5%23top`, the other nine are `/auth/oidc/login?return_to=%2F`; the `signInUrl` results are `/sign-in`, `/sign-in`, `/sign-in?error=SESSION_ENDED&return_to=%2Fflows%3Ftab%3D2` and `/sign-in`

#### Scenario: Search parsing
- **WHEN** `parseSignInSearch` gets `?error=OIDC_TOKEN_INVALID&return_to=%2Fruns%2F5`, `?error=%3Cscript%3E`, `?error=__proto__`, `?error=`, the empty string, `?return_to=%2Fsign-in` and `?error=SESSION_ENDED&error=OIDC_INTERNAL`
- **THEN** the results are `{ error: "OIDC_TOKEN_INVALID", returnTo: "/runs/5" }`, `{ error: "UNKNOWN_ERROR", returnTo: "/" }`, `{ error: "UNKNOWN_ERROR", returnTo: "/" }`, `{ error: null, returnTo: "/" }` three times, and `{ error: "SESSION_ENDED", returnTo: "/" }`

### Requirement: The sign-in page offers one Sign in button and shows why a sign-in failed
The page at `/sign-in` SHALL show the heading "Sign in", the catalogue text of the `?error=` code in an alert and one button "Sign in" that goes to `/auth/oidc/login?return_to=<path>`, with a loading state while the session is checked.

#### Scenario: The sign-in page decides its state
- **WHEN** `signInView` gets `("", null)`, `("?error=SESSION_ENDED&return_to=%2Fflows", signed_out)`, `("", failed with code AUTHZ_UNAVAILABLE)`, `("?error=%3Cb%3E", signed_out)`, `("?return_to=https%3A%2F%2Fevil.invalid", signed_out)` and `("?return_to=%2Fruns%2F5", ready for "Alice Example")`
- **THEN** the results are `{ phase: "checking" }`; `ready` with `errorCode` `SESSION_ENDED` and `loginHref` `/auth/oidc/login?return_to=%2Fflows`; `ready` with `errorCode` `null` and `loginHref` `/auth/oidc/login?return_to=%2F`; `ready` with `errorCode` `UNKNOWN_ERROR` and the same `loginHref`; `ready` with `errorCode` `null` and the same `loginHref`; and `{ phase: "signed_in", displayName: "Alice Example", continueHref: "/runs/5" }`

### Requirement: The CSRF header is added only to same-origin state-changing requests
The web session client SHALL send `x-csrf-token`, with the token of the loaded session, on every non-GET request to a root-relative URL, and SHALL send it nowhere else.

#### Scenario: The CSRF header is added only to same-origin state-changing requests
- **WHEN** `withCsrfHeader` wraps a recording fetch and gets `POST /api/v1/x` with a generated 43-character token; `GET /api/v1/x`; `DELETE /api/v1/x` with the caller header `x-csrf-token: mine`; `POST //evil.invalid/x`; `POST` of `new URL("http://evil.invalid/x")`; `POST /x` with a source returning `null`, one returning `a` LF `b`, one that throws; and `isStateChanging` gets `undefined`, `get`, `Post`, `HEAD`, `options`, `DELETE`
- **THEN** the first request carries the token; the GET carries none and the source was not asked; the DELETE keeps `mine`; the two foreign inputs carry none and the source was not asked; the last three are sent without the header; `isStateChanging` gives `false`, `false`, `true`, `false`, `false`, `true`

#### Scenario: The session client sends the token and leaves on a dead session
- **WHEN** `createBrowserSession` gets a fake fetch, a `ready` loader with a generated token and a recording location; then `api.post("/flows", { a: 1 })`, `api.get("/me")`, `api.get("/flows")` answered 401 `UNAUTHENTICATED`, `logout` posting `/auth/oidc/logout` answered 401, and `csrfTokenFrom` over a `ready`, a `signed_out` and a `failed` state
- **THEN** the fake saw `POST /api/v1/flows` with the header and the body `{"a":1}`, `GET /api/v1/me` without it and `POST /auth/oidc/logout` with it; the 401 on `/flows` made one `location.assign` and rejected with an `ApiRequestError` of code `UNAUTHENTICATED`; the 401 on logout made none; `csrfTokenFrom` gave the token, `null`, `null`

### Requirement: A dead session sends the user to sign in
On a 401 answer whose envelope code is `UNAUTHENTICATED`, the web session client SHALL send the user once to `/sign-in?error=SESSION_ENDED&return_to=<current path>`, and never from the sign-in page itself.

#### Scenario: A 401 envelope ends the session once
- **WHEN** `withSessionEnd` wraps a fake that answers 401 `UNAUTHENTICATED` twice; a second wrapper gets a 401 with code `FORBIDDEN`, a 401 with the body `oops`, a 403 and a 200; a third wrapper has an `onEnded` that throws and gets a 401 `UNAUTHENTICATED`
- **THEN** the first `onEnded` ran once and both responses still read `error.code` `UNAUTHENTICATED`; the second ran never and nothing threw; the third still returned its response

#### Scenario: A dead session sends the user to sign in
- **WHEN** `redirectToSignIn` gets `{ pathname: "/flows", search: "?tab=2" }`, `{ pathname: "/", search: "" }`, `{ pathname: "/sign-in", search: "" }` and `{ pathname: "/sign-in/x", search: "" }` with a recording `assign`
- **THEN** it returns `true`, `true`, `false`, `false`; `assign` got `/sign-in?error=SESSION_ENDED&return_to=%2Fflows%3Ftab%3D2` and `/sign-in?error=SESSION_ENDED` and nothing else

### Requirement: Sign out ends the session and follows the provider's redirect
`signOut` SHALL post `/auth/oidc/logout` with the CSRF header, reset the loaded session and return the provider's redirect only when it is safe, otherwise `/sign-in`.

#### Scenario: Sign out follows only a safe redirect
- **WHEN** `safeRedirect` gets `http://127.0.0.1:9/end?x=1`, `/sign-in`, `javascript:alert(1)`, `//evil.invalid`, `https://user:pw@evil.invalid/x`, `""`, `5` and a 2049-character path; and `signOut` gets a `post` that resolves `{ redirect: "javascript:alert(1)" }`
- **THEN** the first two are returned unchanged and the other six give `/sign-in`; `signOut` returns `{ kind: "redirect", to: "/sign-in" }` after exactly one `loader.reset()`

#### Scenario: Sign out refreshes a stale token once
- **WHEN** `post` rejects with 403 `OIDC_CSRF_INVALID` and then resolves `{ redirect: "http://127.0.0.1:9/end" }`; and when it rejects with 403 `CSRF_INVALID` twice
- **THEN** the first run posts twice, calls `reset` before `load`, and returns `{ kind: "redirect", to: "http://127.0.0.1:9/end" }`; the second posts exactly twice and returns `{ kind: "failed", code: "CSRF_INVALID" }`

#### Scenario: Sign out reports what failed
- **WHEN** `post` rejects with 401 `UNAUTHENTICATED`, with 503 `AUTHZ_UNAVAILABLE`, with `ApiRequestError(0, "NETWORK_ERROR", "x")` and with `new Error("secret detail")`
- **THEN** the results are `{ kind: "redirect", to: "/sign-in" }` after one `reset`, then `failed` with `AUTHZ_UNAVAILABLE` and no `reset`, `failed` with `NETWORK_ERROR`, and `failed` with `UNKNOWN_ERROR`; no result contains `secret detail`

### Requirement: The header shows the user and tenant and offers Sign out
Every page header SHALL show "Signed in as <display name>", "Tenant: <tenant name>" and a "Sign out" button for a live session, a "Sign in" link for a signed-out visitor (except on `/sign-in`), and nothing while the session is unknown or could not be loaded.

#### Scenario: The header shows the user and tenant and offers Sign out
- **WHEN** `accountView` gets `null`; a `failed` state; `signed_out` at `/flows?tab=2`, at `/` and at `/sign-in`; and a `ready` state for display name `<b>Alice</b>` and tenant `T <i>`
- **THEN** the results are `hidden`; `hidden`; `signed_out` with `href` `/sign-in?return_to=%2Fflows%3Ftab%3D2`; `signed_out` with `href` `/sign-in`; `hidden`; and `signed_in` with the two names unchanged as data

#### Scenario: The stylesheet follows the kit rules
- **WHEN** `auth.css` and the `.tsx` files of `web/src/auth/` and `15-sign-in.tsx` are scanned
- **THEN** the file exists, `findRawColours` is `[]`, every `--ui-color-*` it uses is a kit token and `findInlineStyleUse` is `[]` for every `.tsx` file

#### Scenario: The earlier journeys still pass
- **WHEN** `e2e/test_m0_skeleton.py` and `e2e/test_m1_web_kit.py` run unchanged with the header in place
- **THEN** every test of both passes

### Requirement: The e2e stack seeds tenant B and the browser users
The stack part `tenant-b` SHALL create tenant "Tenant B" (review profile `solo`) with organisation `org-b` after every reset and SHALL offer the seed users to the test process through `GET /seed` on the control listener only.

#### Scenario: Seed data is merged from the parts that offer it
- **WHEN** `collectSeedData` gets a map with one handle whose `api.seedData()` returns `{ users: {} }`, one with `api: {}` and one without `api`; then a map with two such handles that both return a key `users`; one whose `seedData` returns `[]`; one whose `seedData` throws
- **THEN** the first result equals `{ users: {} }` and is a new object; the others throw `E2eStackError` with `STACK_PART_INVALID` and `details.key` `users`, `STACK_PART_INVALID` with `details.part`, and `STACK_PART_FAILED` with `details.part`

#### Scenario: Tenant B is created and its organisation provisioned
- **WHEN** on `withTestDatabase()` with the default tenant, `oidcPart.seed` and `tenantBPart.seed` run twice (the second `oidcPart.seed` runs while `tenant_b` exists), `ensureDefaultTenant(db.ownerPool, E2E_TENANT_NAME)` runs once more, `resolveTenantForToken` gets the fake's issuer with `["org-b"]` and with `["org-a"]`, and `tenantBPart.start` runs once without the `oidc` handle and once without the `database` handle
- **THEN** no seed rejects, and the last `ensureDefaultTenant` returns the same `tenantId` as the first, without `TENANT_DEFAULT_CONFLICT`; `org-b` resolves to `tenant_b` with `reviewProfile` `solo`, `org-a` to the default tenant; `ursitoare.tenant` read as tenant B holds one row named `Tenant B` and `tenant_idp` one row; both starts reject with `STACK_PART_MISSING`

#### Scenario: Seed users come from the fake
- **WHEN** `seedUsersOf(fake)` runs, and `tenantBPart.start` returns its handle and `handle.api.seedData()` runs
- **THEN** alice, bob, carol and mallory each have `password` equal to `fake.passwordOf(username)` and `displayName` equal to the `name` claim of `fake.mintToken({ user, kind: "id" })`; the tenant is `E2E tenant` for the first three and `Tenant B` for mallory; `handle.env` is `{}`; no password appears in any `env`

#### Scenario: The tenant-b part is discovered after the oidc part
- **WHEN** `discoverParts()` runs and `parts/27-tenant-b.ts` is read
- **THEN** the names include `oidc` before `tenant-b` and the file is `export { tenantBPart as part } from "../tenant-b-part.ts";`

#### Scenario: The control listener serves seed data to the test process only
- **WHEN** `GET /seed` is sent to `startControlServer({ port: 0, faults, reset, seedData })`, with `Host: evil.example:<port>`, with an `Origin` header, as `POST /seed`, to a server without `seedData`, to one whose `seedData` throws `Error("secret")`; and `GET /reset` and `POST /nowhere` are sent
- **THEN** the answers are 200 with `application/json`, `cache-control: no-store` and the JSON of `seedData()`; 403 `CONTROL_FORBIDDEN`; 403 `CONTROL_FORBIDDEN`; 405 `CONTROL_METHOD_NOT_ALLOWED` with `allow: GET`; 404 `CONTROL_NOT_FOUND`; 500 `CONTROL_SEED_FAILED` whose body does not contain `secret`; and 405 with `allow: POST`, 404 for the last two

#### Scenario: Alice and mallory see their own tenant through the real engine
- **WHEN** the real stack runs with its shipped parts, alice and mallory sign in (login route, `completeFakeLogin`, callback) and each calls `GET /api/v1/me` with the session cookie; then `/api/v1/me` with no cookie; then `POST /auth/oidc/logout` with alice's cookie and no header, then with `x-csrf-token` set to the `csrfToken` of her `/me`; then `/api/v1/me` with her cookie
- **THEN** `GET <controlUrl>/seed` lists the four users with the fake's passwords; alice's answer names user `Alice Example`, tenant `E2E tenant` and `read_self`; mallory's names tenant `Tenant B` and neither body holds the other tenant's name; the call without a cookie is 401 `UNAUTHENTICATED`; the first logout is 403 `OIDC_CSRF_INVALID`, the second 200 with a string `redirect`, and the last `/me` is 401

### Requirement: The M1 journey proves sign-in, tenant isolation and sign-out
`e2e/test_m1_sign_in.py` SHALL prove through the offline stack and the fake provider that a person signs in and out, that tenants stay apart, and that the API refuses a request without a session or a CSRF header, using `assert_accessible(page)` and the keyboard.

#### Scenario: The sign-in page shows the error and is accessible
- **WHEN** a signed-out browser opens `/sign-in?error=OIDC_USER_DISABLED`
- **THEN** the heading "Sign in", an alert with "Your account is disabled. Ask an administrator." and exactly one button "Sign in" are visible, and `assert_accessible(page)` passes

#### Scenario: Alice signs in and the header shows user and tenant
- **WHEN** `login(page, users["alice"])` runs inside `page.expect_response` for the 200 answer of `/api/v1/me`
- **THEN** that answer's `capabilities` contain `read_self`; the banner contains "Signed in as Alice Example" and "Tenant: E2E tenant" and a button "Sign out"; `assert_accessible(page)` passes on the landing page

#### Scenario: Two tenants stay apart
- **WHEN** alice signs in on one page and mallory signs in on a page of a second `browser.new_context`
- **THEN** mallory's banner contains `users["mallory"]["displayName"]` and "Tenant B" and neither "E2E tenant" nor "Alice Example"; alice's page still shows "Alice Example" and "E2E tenant"

#### Scenario: A request without a session is unauthenticated
- **WHEN** `playwright.request.new_context` sends `GET /api/v1/me` with no cookie
- **THEN** the answer is 401 with `error.code` `UNAUTHENTICATED`

#### Scenario: Sign out ends the session
- **WHEN** alice clicks "Sign out"
- **THEN** the page ends on the path `/sign-in` with the button "Sign in" visible, and `page.request.get("/api/v1/me")` is 401

#### Scenario: A post without the CSRF header is refused
- **WHEN** alice is signed in and `page.request.post("/auth/oidc/logout")` is sent without the header, then the page is reloaded
- **THEN** the answer is 403 with `error.code` `OIDC_CSRF_INVALID` and the banner still shows "Alice Example"

#### Scenario: The return path is kept
- **WHEN** `login(page, users["alice"], "/sign-in?error=SESSION_ENDED&return_to=%2Fflows")` runs
- **THEN** the page ends on the path `/flows` and the banner shows "Alice Example"

#### Scenario: The sign-in and sign-out buttons are keyboard reachable
- **WHEN** on `/sign-in` signed out, once the button "Sign in" is visible, Tab is pressed up to 15 times until it is focused; then alice signs in and the same is done for "Sign out"
- **THEN** each button becomes focused, its computed `outlineStyle` is not `none` and its `outlineWidth` is at least 2px
