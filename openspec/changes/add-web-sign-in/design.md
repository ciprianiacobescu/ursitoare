## Context

Signatures used from the dependencies are in proposal.md § Interfaces taken. Behaviour relied on, as their changes define it: the web client always passes a root-relative string URL to `fetch`; the kit loads `/me` once (shared, `ready` cached until `reset()`) and every `/me` call rotates the CSRF token; logout answers 200 `{ redirect }`, 401 `UNAUTHENTICATED` or 403 `OIDC_CSRF_INVALID`; a sign-in refusal is a 302 to `/sign-in?error=<one of ten codes>`; the server sanitizes `return_to` to one `/` path of at most 512 characters, no backslash or control character, not under `/auth/`; parts start, then seed, in file-name order (`10-database`, `20-web`, `25-oidc`, `27-tenant-b`) and a reset re-runs every seed; the control listener checks Host, refuses any Origin, then routes; `ensureDefaultTenant(pool, name)` first selects the tenant of that name and returns it when found, so a re-seed with tenant B present succeeds; it throws `TENANT_DEFAULT_CONFLICT` only when no tenant has that name and another tenant exists (for example a fresh database seeded with tenant B first). This unit does not depend on what a reset does to `ursitoare.tenant`: both orders are safe because of the name lookup.

## Decisions

1. **Layout.** Logic is plain `.ts` under `web/src/auth/` with Node tests (each starts with `/// <reference types="node" />` and `assert.equal(typeof <function>, "function")`); `.tsx` is thin. No `style` attribute or `<style>` (the CSP): styles are in `auth.css`, colours only as `var(--ui-color-*)`. The page is a feature file `15-sign-in.tsx` without `navLabel`, so no shared manifest changes.
2. **The CSRF refusal the journey proves is `OIDC_CSRF_INVALID`.** add-api-pep says no non-GET session route exists in M1 except the logout route, which checks the header itself. The journey posts `/auth/oidc/logout` without the header and expects 403 `OIDC_CSRF_INVALID`; `isCsrfFailure` accepts `CSRF_INVALID` too.
3. **The header is added by wrapping `fetch`, not by editing `client.ts`** (add-web-shell's frozen test). `api` is `createApiClient({ fetch: withSessionEnd(withCsrfHeader(fetch, token), onEnded) })`; `logout` is `createApiClient({ baseUrl: "", fetch: withCsrfHeader(fetch, token) })` (the OIDC routes are root paths) with no session-end wrapper, so `signOut` handles its own 401. The wrapper acts only on a root-relative string URL with a method other than GET, HEAD, OPTIONS; any other input passes untouched, so the token never leaves the origin.
4. **The token** is `me.csrfToken` of a `ready` `capabilityLoader.load()`, used only as the header and only if it matches `^[A-Za-z0-9_-]{1,128}$`; never rendered, logged, toasted or stored. This unit calls `/me` again only in the retry of decision 6 (each call rotates the token).
5. **Session end.** `withSessionEnd` reacts only to a 401 whose JSON envelope code is `UNAUTHENTICATED`, once per wrapper, reading a clone; `redirectToSignIn` then goes to `/sign-in?error=SESSION_ENDED&return_to=<path>` unless the page is `/sign-in` or below. The kit's `/me` call does not use this client, so an anonymous visitor on a public page is not redirected.
6. **Sign out** posts through `logout`, resets the loader and returns the validated provider URL. 401: reset, `/sign-in`. 403 with a CSRF code (another tab rotated the token): reset, one `load()` for a fresh token, one retry. Any other error is `failed` with its code (`NETWORK_ERROR`; `UNKNOWN_ERROR` for a non-`ApiRequestError`), shown as an error toast with `messageFor(code)`.
7. **`return_to` is the destination.** `safeReturnTo` mirrors the server's sanitizer and maps `/sign-in` and below to `/` (no loop); the page forwards its own `?return_to=`.
8. **Closed error list.** `SIGN_IN_ERROR_CODES` is `SESSION_ENDED` then `OIDC_LOGIN_EXPIRED`, `OIDC_STATE_MISMATCH`, `OIDC_BAD_REQUEST`, `OIDC_EXCHANGE_FAILED`, `OIDC_PROVIDER_UNAVAILABLE`, `OIDC_TOKEN_INVALID`, `OIDC_UNKNOWN_TENANT`, `OIDC_USER_DISABLED`, `OIDC_INTERNAL`. `parseSignInSearch` returns `error` from that list, or `UNKNOWN_ERROR` for any other non-empty value; the raw value is never shown. `SIGN_IN_MESSAGES` adds `OIDC_CSRF_INVALID` and `OIDC_NOT_CONFIGURED`. `registerSignInMessages` is idempotent and runs when `15-sign-in.tsx` loads.
9. **Header.** `accountView`: no state yet or `failed` is `hidden` (the kit shows the one failure notice); `signed_out` is a link "Sign in" (hidden on `/sign-in`); `ready` is `signed_in`. Markup: `div role="group" aria-label="Account"` with "Signed in as <strong>name</strong>", "Tenant: <strong>tenant</strong>" and `<button type="button" class="ui-button">Sign out</button>`, in the `<header>` after the main `<nav>` (the skip link stays first). A click during a sign-out is ignored (`aria-disabled="true"`).
10. **Sign-in page.** `signInView`: `checking` while the state is `null` (`LoadingState` "Checking your session"); `signed_in` (text "You are signed in as <name>." and a link "Continue", no button); else `ready`: `<h1>Sign in</h1>`, an `ErrorPanel` for `errorCode` (an `ApiRequestError` of status 401), "Use your organization account to open Ursitoare." and the button "Sign in" that assigns `loginHref`. A `failed` state shows `ready`.
11. **Seed data.** The fake's passwords are random per start, so Python cannot know them. `tenantBPart`'s handle has `api: SeedSource`; `collectSeedData` merges every such handle's top-level keys; `stack.ts` passes it as `seedData` to the control listener, which serves `GET /seed` after the Host and Origin checks of `/reset` (tasks 4.3 and 4.4).
12. **Tenant B.** `tenantBPart` (name `tenant-b`) needs the `database` and `oidc` handles. `seed` inserts tenant `TENANT_B_ID` "Tenant B" (`solo`; `created_at` is the table default) through a one-connection owner pool and calls `provisionTenantIdp` for `(fake.issuer, "org-b")`; `ensureDefaultTenant` cannot (for the name "Tenant B" it finds no tenant and, with the default tenant present, throws `TENANT_DEFAULT_CONFLICT`). The owner insert needs no tenant setting: `ursitoare.tenant` has RLS enabled but not forced and is a catalogue-global table (delivered-shapes.md, Facts from the merged code).
13. **Journey rules.** Every test takes `fresh_state` and `users`, is marked `milestone("M1")`, uses role and label locators and no sleeps, and `exact=True` for "Sign in" (engine) versus "Sign In" (provider). Every `/me` call rotates the token, so a test that signs out never calls `/api/v1/me` after login: it reads the page's own response with `page.expect_response`.

## Interfaces

Same text as proposal.md § Interfaces given. Members of the named types follow the block.

- `web/src/auth/return-to.ts`: `SIGN_IN_PATH`, `LOGIN_PATH`, `LOGOUT_PATH: string`; `LocationLike`; `safeReturnTo(raw: unknown): string`; `loginUrl(returnTo: unknown): string`; `signInUrl(opts?: { error?: string; returnTo?: unknown }): string`; `parseSignInSearch(search: string): { error: string | null; returnTo: string }`; `redirectToSignIn(location: LocationLike): boolean`
- `web/src/auth/messages.ts`: `SIGN_IN_ERROR_CODES: readonly string[]`; `SIGN_IN_MESSAGES: Readonly<Record<string, string>>`; `registerSignInMessages(): void`
- `web/src/auth/session-fetch.ts`: `CSRF_HEADER: string`; `isStateChanging(method: string | undefined): boolean`; `withCsrfHeader(inner: typeof fetch, csrfToken: () => Promise<string | null>): typeof fetch`; `withSessionEnd(inner: typeof fetch, onEnded: () => void): typeof fetch`
- `web/src/auth/sign-out.ts`: `SignOutResult`; `isCsrfFailure(error: unknown): boolean`; `safeRedirect(value: unknown): string`; `signOut(deps: { client: Pick<ApiClient, "post">; loader: Pick<CapabilityLoader, "load" | "reset"> }): Promise<SignOutResult>`
- `web/src/auth/session-client.ts`: `SessionEnv`; `BrowserSession`; `csrfTokenFrom(loader: Pick<CapabilityLoader, "load">): () => Promise<string | null>`; `createBrowserSession(env: SessionEnv): BrowserSession`; `browser-session.ts`: `browserSession: BrowserSession`
- `web/src/auth/account.ts`: `AccountView`; `accountView(state: CapabilityState | null, location: Pick<LocationLike, "pathname" | "search">): AccountView`. `sign-in-page.ts`: `SignInView`; `signInView(search: string, state: CapabilityState | null): SignInView`. `use-session.ts`: `useSession(): CapabilityState | null`
- `AccountMenu.tsx`: `AccountMenu(): ReactNode`; `SignInPage.tsx`: `SignInPage(): ReactNode`; `web/src/features/15-sign-in.tsx`: `feature: FeatureSpec` (created in task 3.2, never a stub: a stub feature would break the registry)
- `test/support/e2e-stack/seed-data.ts`: `SEED_PATH: string`; `SeedSource`; `collectSeedData(handles: ReadonlyMap<string, PartHandle>): Record<string, unknown>`
- `test/support/e2e-stack/tenant-b-part.ts`: `TENANT_B_NAME`, `TENANT_B_ORGANIZATION: string`; `SeedUser`; `seedUsersOf(fake: Pick<FakeOidc, "passwordOf" | "mintToken">): Record<string, SeedUser>`; `tenantBPart: E2eStackPart`; `parts/27-tenant-b.ts`: `export { tenantBPart as part } from "../tenant-b-part.ts";`
- `test/support/e2e-stack/control.ts`: `startControlServer(deps: { port: number; faults: FaultTable; reset(): Promise<void>; seedData?(): Readonly<Record<string, unknown>> }): Promise<ControlServer>` (new optional member); route `GET /seed`
- `e2e/conftest.py`: fixture `users` (`dict[str, dict[str, str]]`); `login(page, user, path="/sign-in") -> None`

```ts
interface LocationLike { pathname: string; search: string; assign(url: string): void }
type SignOutResult = { kind: "redirect"; to: string } | { kind: "failed"; code: string }
interface SessionEnv { fetch: typeof fetch; location: LocationLike; loader: Pick<CapabilityLoader, "load" | "reset"> }
interface BrowserSession { api: ApiClient; logout: ApiClient; signOut(): Promise<SignOutResult> }
type AccountView = { kind: "hidden" } | { kind: "signed_in"; displayName: string; tenantName: string } | { kind: "signed_out"; href: string }
type SignInView = { phase: "checking" } | { phase: "signed_in"; displayName: string; continueHref: string } | { phase: "ready"; errorCode: string | null; loginHref: string }
interface SeedSource { seedData(): Readonly<Record<string, unknown>> }
type SeedUser = Readonly<{ username: string; password: string; displayName: string; tenantName: string }>
```

**Values and stubs.** `SIGN_IN_PATH` is `/sign-in`, `LOGIN_PATH` `/auth/oidc/login`, `LOGOUT_PATH` `/auth/oidc/logout`, `CSRF_HEADER` `x-csrf-token`, `SEED_PATH` `/seed`. Constant stubs are `""` or `[]`; function stubs throw `new Error("not implemented")`. `GET /seed` answers `{ "users": { "<username>": SeedUser } }` for alice, bob, carol (tenant "E2E tenant") and mallory ("Tenant B"); `displayName` is the `name` claim the fake mints for that user.

## Failure cases

| Situation | Behaviour |
|---|---|
| `?error=` empty, unknown, markup | empty: no panel; other: the `UNKNOWN_ERROR` panel with the fallback text; the raw value is never shown |
| `/me` pending or failed | header empty (the kit shows its one notice for a failure); the sign-in page shows "Checking your session", then the button |
| `/me` 401 | header link "Sign in" (not on `/sign-in`); no redirect |
| API answers 401 `UNAUTHENTICATED` | one redirect to `/sign-in?error=SESSION_ENDED&return_to=<path>` (none from `/sign-in`); the caller still gets the `ApiRequestError` |
| Another 401 body, 403, 5xx, network error | no redirect; `ApiRequestError` to the caller |
| Non-GET without a ready session | sent without the header; the server answers 401 or 403 |
| Sign-out: stale token, session gone, unusable provider URL, server or network error | one refresh and retry; `/sign-in`; `/sign-in`; error toast, button usable again |
| `GET /seed`: foreign Host or any Origin, other method, no `seedData`, throwing `seedData` | 403 `CONTROL_FORBIDDEN`, 405, 404 `CONTROL_NOT_FOUND`, 500 `CONTROL_SEED_FAILED` |
| Tenant-b part without a handle; second seed; repeated seed key | `STACK_PART_MISSING`; idempotent; `STACK_PART_INVALID` |

## Security

1. **Authentication and PEP.** No engine endpoint is added. `/sign-in` is a static SPA path (`public(static)`). The page uses `GET /api/v1/me` (`session`, `read_self`) and `POST /auth/oidc/logout` (`public(oidc)`; session cookie plus CSRF header). `GET /seed` exists only on the loopback control listener of the test stack (Host allow-list, Origin refused, no CORS), never in `src/`.
2. **Tenant isolation.** No table or query. The tenant comes only from the session; the page shows `tenant.name` from `/me`; the journey signs alice and mallory in from separate contexts. Tenant B is created through the owner pool inside the test stack only.
3. **Input validation, taint.** `?error` is matched against a closed list; `return_to` is cut to a same-origin path; the logout `redirect` must be a root-relative path or an http(s) URL without credentials; the token must match a strict pattern before it enters a header; names are React text. Nothing reaches a prompt, so no taint label.
4. **Secrets.** The CSRF token lives in the loader's memory and in same-origin request headers only; never rendered, logged, toasted or stored. Seed passwords are the fake's per-start throwaway values, served only by the loopback listener, never in env, files, logs or engine responses. Errors show catalogue text, never a server message.
5. **Abuse cases:** open redirect via `return_to` or the logout `redirect` ("Login and sign-in URLs", "Sign out follows only a safe redirect"); markup in `?error` ("Search parsing"); the token in a GET or sent elsewhere ("The CSRF header is added only to same-origin state-changing requests"); a rotated token ("Sign out refreshes a stale token once"); a redirect loop ("A dead session sends the user to sign in"); cross-tenant display ("Two tenants stay apart"); a web page reading the seed route ("The control listener serves seed data to the test process only").

## Test plan

Node test runner, `*.test.ts` beside each file, loopback only, no sleeps. Web tests use a fake `fetch`, a fake loader counting `load` and `reset`, and a recording `LocationLike`. Test-support tests use `withTestDatabase()`, `oidcPart` and a hand-made `PartContext` as add-oidc-login's part test does. `stack.seed.test.ts` starts the real stack (`startE2eStack({ port: 0, controlPort: 0 })`, shipped parts), asserts `stack.handles.has("tenant-b")` first, then signs alice and mallory in with `completeFakeLogin` and `fetch` (cookies by hand) to prove isolation and the 401 facts without a browser. `e2e/test_m1_sign_in.py` proves the `.tsx` files.

## Decisions made while writing

- **`CSRF_INVALID` is `OIDC_CSRF_INVALID` in the journey** (decision 2).
- **Seed data uses a new `GET /seed`** (the card says "the control listener's seed data"; add-e2e-stack has none). It edits `control.ts` (task 4.3) and `stack.ts` (task 4.4), adds no field to `E2eStackPart` or `PartHandle`, and leaves `/reset` and `/faults` alone.
- **`SESSION_ENDED` serves any 401 `UNAUTHENTICATED`** of the session client, as the card says; its text is neutral so a visitor who never signed in is not misled.
- **`return_to` on `/sign-in` is the destination** (decision 7); the card's "current path" is read that way.
- **A header link "Sign in" for the signed-out visitor** (hidden on `/sign-in`) is an addition: otherwise an anonymous visitor on `/` has no way in.
- **Tenant B is inserted by a raw owner statement** (decision 12): the table is not under forced RLS, so `withTenantTx` is not needed. **No change for re-seeding with tenant B present**: `ensureDefaultTenant` finds the default tenant by name, so the database and oidc seeds succeed after any reset.
- **Display names come from the fake's minted token**, not literals. **`login` takes an optional `path`** so the journey can start from `/sign-in?error=SESSION_ENDED&return_to=%2Fflows`.
