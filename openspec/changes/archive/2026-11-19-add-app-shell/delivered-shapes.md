Declarations this change takes or edits (`export` omitted), copied from main@3daa5c35 and checked line by line.

```ts
// web/src/app/features.ts:24-28 (the registry's nav entry; nav() builds it at :187)
interface NavItem { id: string; path: string; label: string }
// web/src/kit/capabilities.ts:14-17
type CapabilityState = { status: "signed_out" } | { status: "failed"; code: string } | { status: "ready"; me: Me }
// web/src/auth/use-session.ts:14
function useSession(): CapabilityState | null   // null while loading; shares the capability loader's one in-flight /api/v1/me (capabilities.ts:75-)
// web/src/kit/use-visible-nav.ts:8
function useVisibleNav(): NavItem[]   // the entries the signed-in capabilities allow, in registration order; the one /api/v1/me read of the shell
// web/src/auth/account.ts:5-8, :14-17
type AccountView = { kind: "hidden" } | { kind: "signed_in"; displayName: string; tenantName: string } | { kind: "signed_out"; href: string }
function accountView(state: CapabilityState | null, location: Pick<LocationLike, "pathname" | "search">): AccountView
// web/src/auth/browser-session.ts:4-8 (the interface BrowserSession is at web/src/auth/session-client.ts:18, the factory at :35)
const browserSession = createBrowserSession({ fetch, location, loader })   // AccountMenu calls browserSession.signOut()
// web/src/kit/ToastRegion.tsx:5
function ToastRegion(): ReactNode   // div.ui-toasts[aria-live="polite"]; the only live region the shell holds
// web/src/kit/contrast.ts:97, :146, :166 (SourceHit at :18-21)
function parseTokens(css: string): StringMap
function findRawColours(css: string): SourceHit[]
function findInlineStyleUse(source: string): SourceHit[]
```

Page tables whose ids `NAV_GROUP_OF` covers (each row `id`, `navLabel`; a row with `navLabel: null` is not a nav entry):

| file:line | table | rows |
|---|---|---|
| `web/src/features/10-home.tsx:68-73` | `feature` | `home`, "Home" (no table; the id is a literal) |
| `web/src/admin/pages.ts:13-42` | `ADMIN_PAGES` | `admin-users` "Users", `admin-roles-teams` "Roles and teams", `admin-group-mappings` "Group mappings", `admin-audit` "Audit log" |
| `web/src/tools/pages.ts:5-33` | `TOOL_PAGES` | `admin-tool-servers` "Tool servers", `admin-grants` "Grants", `admin-policies` "Policies" |
| `web/src/flows/pages.ts:11-26` | `FLOW_PAGES` | `flows` "Flows"; `flow-editor` `null` |
| `web/src/runs/pages.ts:11-26` | `RUN_PAGES` | `runs` "Runs"; `run` `null` |

Registration order is the file-name order: `home`, the four admin rows, the three tool rows, `flows`, `runs`. A feature without `navLabel` (`sign-in`, `flow-editor`, `flow-graph`, `run`) is not a nav entry.

Files this change edits, as they are on main:

- `web/src/app/Shell.tsx:7-36`: `Shell()` renders `div.app-shell` > `a.skip-link[href="#main"]` "Skip to content", `header.app-banner` (`Link.app-brand` "Ursitoare" to `/`, `nav[aria-label="Main"]` > `ul.app-nav` > one `li` > `NavLink` per entry, `<AccountMenu />`), `main#main[tabIndex=-1]` > `<Outlet />`, `footer.app-footer` "Ursitoare workflow engine", `<ToastRegion />`. `.app-nav ul` in `shell.css` never matched `ul.app-nav`, so the browser's bullets show.
- `web/src/app/App.tsx:15-26`: `NotFoundPage()` renders `<DocumentTitle routeId="not-found" />`, `<h1>Page not found</h1>` and `<p><Link to="/">Go to the landing page</Link></p>`; the title is `Page not found · Ursitoare` (`routes.ts:4`).
- `web/src/auth/AccountMenu.tsx:12-58`: `div.auth-account` holds `<Link to={view.href}>Sign in</Link>` (:35) when signed out; signed in, `div.auth-account[role=group][aria-label=Account]` (:41) holds two `p` ("Signed in as <strong>name</strong>", "Tenant: <strong>name</strong>") and `<button type="button" className="ui-button" aria-disabled={signingOut ? true : undefined}>Sign out</button>` (:48-55); `hidden` renders nothing.
- `web/src/auth/SignInPage.tsx:14-62`: `div.auth-page` holds `<LoadingState label="Checking your session" />`, or `h1` "Sign in", "You are signed in as <name>." and a `Continue` link, or `h1` "Sign in", an `ErrorPanel` when `errorCode` is set, `p` "Use your organization account to open Ursitoare." and `<button type="button" className="ui-button">Sign in</button>` (:51-59).
- `web/src/app/shell.css:1-76`: `:root { color-scheme: light dark; … }` (:1-5), `.skip-link`, `.skip-link:focus`, `.app-banner`, `.app-brand`, `.app-nav ul`, `main`, `main:focus`, `.app-footer`.
- `web/src/auth/auth.css:1-20`: `.auth-account`, `.auth-account p`, `.auth-page` (`max-width: 32rem`); token-only (C-53df20c1, `auth-css.test.ts:40`).
- By the time this change runs, `add-ui-foundation` has deleted the `import "./auth.css";` lines of `AccountMenu.tsx` and `SignInPage.tsx` and the `shell.css` import of `main.tsx`; `styles/app.css` imports `shell.css` and `auth.css` in `layer(components)`. This change does not touch those lines.
