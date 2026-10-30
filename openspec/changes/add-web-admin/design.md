## Context

Four admin screens over the M2 REST API, in `web/src/admin/`: logic in `.ts` files that Node tests run, thin `.tsx` components. Routes and shapes follow the dependencies' folders (merged names: `delivered-shapes.md`):

- `add-admin-api`: `session` routes under `/api/v1`, `manage_users_roles`, non-GET with `X-CSRF-Token`; lists answer `{ items, next_cursor }`, and a request that needs a cursor with no engine key configured answers 503 `ENGINE_KEY_REQUIRED`; an account is `{ userId, kind, ownerUserId, displayName, email, state, roles, teams, localRoles }` (`roles`, `teams` from every source, `localRoles` the direct grants); `PATCH /users/{userId}` `{ state }` answers it or 422 `OPERATION_REFUSED` with `details.reason` (`self_disable`, `wrong_kind`, `owner_invalid`); a disable suspends open sessions (401 until an enable); `POST /teams` with `Idempotency-Key` answers 201 and replays it for the same key; `DELETE /teams/{teamId}` and `DELETE /idp-group-map?issuer=&group=` answer 204 (409 `IN_USE` for a team in use).
- `add-audit-api`: `read_audit`; `GET /audit` pages events newest first (`seq` decimal text, `at` UTC text) and filters by `event_type`; `GET /audit/verify` answers `{ ok, checked, firstBadSeq, reason, fromSeq, anchorsChecked, anchorsVerified, checkedAt }`, a broken chain being a 200 with `ok: false`; `anchorsVerified` counts the signed head anchors from `fromSeq`, and `anchorsChecked` is true only when it is above 0.
- `add-roles-and-memberships` seeds team `finance` and four mappings (`ursitoare-authors`, `ursitoare-approvers`, `team-finance`, `ursitoare-admins` for carol); alice holds `author` and team `finance` once signed in. `add-api-pep`: a refusal is 403 `FORBIDDEN` with `details.decisionId` and an `authz.denied` event holding it.

## Decisions

1. **Four pages, literal paths:** `/admin/users`, `/admin/roles-and-teams`, `/admin/group-mappings`, `/admin/audit`, one feature file each (numbers 60 to 63). A nav label needs a static path (Facts in `delivered-shapes.md`) and `checkFeaturePaths` of add-api-conventions reads `path` as a string literal, so `featureLiterals(source)` lets each task assert its file equals its `ADMIN_PAGES` entry.
2. **The UI hides, the API decides:** a page never checks capabilities; opened by address, it shows the API's 403 as `ErrorPanel`.
3. **One client, safe paths:** `browserSession.api`; logic functions take `Api<"patch">` and the like, so tests pass fakes. A path segment is encoded only after its id matches a pattern (`userId` `^[A-Za-z0-9_-]{1,64}$`, role `^[a-z][a-z0-9_]{0,31}$`, team `^[a-z][a-z0-9_-]{0,63}$`), because `..` would leave `/api/v1`; a bad id is a `RangeError`, nothing sent.
4. **Strict parsers:** each checks every field it uses and ignores the rest; `null` makes the caller throw `ApiRequestError(200, "INVALID_RESPONSE", "Invalid <thing>")`. Limits: `displayName` 200, `email` 320, `group` 1 to 255, `issuer` 1 to 2048, `reviewedBy` 1 to 200, `seq` `^(0|[1-9][0-9]{0,18})$`, `eventType` as in task 6.1, `at` `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$`, `actor.kind` `user`, `service` or `system`. `roles`, `teams` and `localRoles` take any number of entries, each matching its pattern; `clip` shortens the cell.
5. **Users:** Disable (with `confirm`) for an active account, Enable (no confirm) for a disabled one, a note on the user's own row (the server still refuses `self_disable`). A disable suspends, not ends, a session, and the dialog says so.
6. **Teams and mappings:** each team submit sends a fresh `Idempotency-Key` (`crypto.randomUUID()`), so a double submit is a replay; server validation errors map onto fields with `mapEnvelopeErrors`. No endpoint lists issuers, so Issuer is a text field with the hint `ISSUER_HINT`, pre-filled with `defaultIssuer` of the first page (the seed guarantees one) and left alone once edited; Grant is a `<select>` over every role and team (`loadAllItems`); Group is trimmed (the server refuses padded names).
7. **Audit log:** one filter, Event type. `auditCells` formats `at` as `YYYY-MM-DD HH:MM:SS UTC` from the first 19 characters of its text, without a `Date`, else keeps it; actor, target and payload (`JSON.stringify`, cut to 240 characters) are untrusted text. Verification runs on opening and on "Verify again" in one `role="status"` paragraph; the button is `aria-disabled` while checking, a counter drops a stale answer and leaving aborts the request. A broken chain is a finding, not an error. With `anchorsVerified` 0 the status says no signed head anchor exists yet (no M2 unit writes one) and only the hash chain was checked.
8. **Messages:** this unit registers the six admin-API codes its pages can receive (see Codes below) with `registerAdminMessages()` (idempotent, called at module level in each feature file) and owns their texts. `adminErrorMessage` is `errorPanelModel(error).message` plus the reason texts and decision id.
9. **Usability:** every row button is named after its row; results reach a screen reader through the toast region and the status paragraph.
10. **Stylesheet:** `admin.css` holds `admin-page`, `admin-section`, `admin-actions`, `admin-form`, `admin-status` and four tones; colours only from tokens, no `style` attribute (the CSP).

## Interfaces

Signatures: exactly those of proposal.md § Interfaces given, repeated here only as types. The `.ts` functions are web functions that call add-admin-api's routes through `ApiClient`, not the identity functions of `add-roles-and-memberships` or `add-admin-api`, and share no name with them.

```ts
interface ConfirmSpec { title: string; description: string; action: string }  type Check<T> = { ok: true; value: T } | { ok: false; message: string }
type Api<K extends keyof ApiClient> = Pick<ApiClient, K>
interface AdminPage { id: string; file: string; path: string; navLabel: string; capability: "manage_users_roles" | "read_audit" }
type AdminTables = Readonly<Record<"users" | "roles" | "teams" | "mappings" | "audit", DataTableSpec>>  interface FeatureLiterals { id: string; path: string; navLabel: string; capability: string }
interface AccountRow { userId: string; kind: "human" | "service"; displayName: string; email: string | null; state: "active" | "disabled"; roles: string[]; teams: string[]; localRoles: string[] }
type AccountAction = { kind: "none"; note: string } | { kind: "disable" | "enable"; buttonLabel: string; confirm: ConfirmSpec | null; done: string }
interface MappingRow { issuer: string; group: string; roleId: string | null; teamId: string | null; reviewedBy: string }
type MappingBody = { issuer: string; group: string; roleId: string } | { issuer: string; group: string; teamId: string }
interface AuditEvent { seq: string; at: string; eventType: string; actor: { kind: string; id: string }; target: { kind: string; id: string } | null; payload: Record<string, unknown> }
interface Verification { ok: boolean; checked: number; firstBadSeq: string | null; reason: "hash" | "gap" | "anchor" | null; anchorsChecked: boolean; anchorsVerified: number; checkedAt: string }
type VerificationState = { status: "checking" } | { status: "done"; result: Verification } | { status: "failed"; error: unknown }
interface VerificationView { tone: "checking" | "ok" | "broken" | "unavailable"; headline: string; detail: string }  interface TestSession { cookie: string; csrfToken: string; userId: string }
interface GrantOption { value: string; label: string }  interface AccountCells { name: string; email: string; state: string; rolesTeams: string }
interface MappingCells { group: string; grants: string; issuer: string; reviewedBy: string }
interface AuditCells { seq: string; time: string; type: string; actor: string; target: string; details: string }
```

Stubs: `ADMIN_PAGES` is `[]`, `ADMIN_TABLES` five specs `{ caption: "", columns: [] }`, `ADMIN_MESSAGES` `{}`, `ISSUER_HINT` `""`; functions and pages throw `new Error("not implemented")`.

## Component wiring

`node --test` has no JSX transform: the typechecker and the browser journey check the `.tsx` files. Each page imports `./admin.css`, sets `document.title` to `<navLabel> · Ursitoare` in an effect, renders `<div className="admin-page"><h1 ref tabIndex={-1}>` and builds each table as `DataTable` over `ADMIN_TABLES.<key>.columns` plus a `cell` each, with a `rowKey` (`userId`, the team id string itself, `${issuer}\n${group}` (a group has no newline), `seq`) and a list from `createCursorList(cursorPageFetcher(browserSession.api, path, { parseItem }))` made once.

- `UsersPage`: `selfId` is `useSession()` ready ? `me.user.id` : `null`. The Actions cell shows the `note` or a `<button type="button" className="ui-button">` named `buttonLabel`, ignored while `acting` (`aria-disabled`); it opens the dialog when `confirm` is not `null`, else runs. Running calls `patchAccountState(api, userId, account.state === "active" ? "disabled" : "active")`, then `toast({ kind: "success", message: done })`, `list.reset()` and focus on the `<h1>`; a failure is `toast({ kind: "error", message: adminErrorMessage(error) })`.
- `TeamsPage`: `Form` "Create team" (`submitLabel` "Create team", `fields` `["teamId"]`) with `Field` "Team name" named `teamId`: `checkTeamId`, else `postTeam(api, value, crypto.randomUUID())`, `toast({ kind: "success", message: "Created team <id>." })`, clear, `teams.reset()`; each team row has "Delete team <id>" (`deleteTeamConfirm`; `toast({ kind: "success", message: "Deleted team <id>." })`).
- `MappingsPage`: two `loadAllItems` give the options (`LoadingState` "Loading roles and teams"; a rejection renders `ErrorPanel`); `Form` "Map a group" (submit "Map group") with `Field` "Issuer" (`issuer`, hint `ISSUER_HINT`), "Group" (`group`) and "Grant" (`grant`, a `<select>`, first option "Choose a role or a team"): `mappingRequest`, else `setMapping`, `toast({ kind: "success", message: mappedMessage(group) })`, `mappedMessage` giving `Mapped <group>. Members get it the next time they sign in.` with `<group>` cut by `clip` (a 255-character group would make 306 characters, over the toast limit of 300), clear Group and Grant, `list.reset()`; each row has "Remove <group>" (`removeMappingConfirm`, destructive; `toast({ kind: "success", message: "Removed the mapping for <group>." })`).
- `AuditPage`: a `<section aria-labelledby>` "Chain verification" with `<p role="status" className="admin-status admin-status--<tone>">` (headline in `<strong>`, then detail) and the button "Verify again"; `Form` "Filter the audit log" (submit "Apply filter") with `Field` "Event type"; `DataTable` "Audit events" keyed by the filter.
- Each feature file calls `registerAdminMessages()` at module level and exports `feature: FeatureSpec` as an object literal with the four literals of its `ADMIN_PAGES` entry and `element: <XPage />`.

## Failure cases

| Situation | Behaviour |
|---|---|
| No session, or it ended | 401 `UNAUTHENTICATED`; the first such answer to a `browserSession.api` call goes to `/sign-in?error=SESSION_ENDED&return_to=<encoded path>` (`/me` never redirects) |
| Signed in without the capability | 403 `FORBIDDEN`; the table or options show `ErrorPanel` with the decision id and "Copy decision id" |
| Engine down or slow, or an answer of the wrong shape | the table keeps its rows and offers "Try again"; an action shows an error toast; a parser gives `null`: `INVALID_RESPONSE`, catalogue text |
| Bad form input | nothing is sent; the message is beside the field, focus on the first invalid one |
| Server refusal, or two clicks | error toast with catalogue text, list unchanged; the second click is ignored while `acting` |
| A cursor is rejected, or a page needs one and the engine has no key | `CURSOR_INVALID`: "Start over"; 503 `ENGINE_KEY_REQUIRED`: the table shows its catalogue text |
| Verification fails or the chain is broken | "Verification unavailable" with the catalogue text, or "Audit chain broken" with the first bad event; the log still lists |

## Security

1. **Authentication, PEP, tenant.** No endpoint, table or query is added; the pages use existing `session` routes under `manage_users_roles` and `read_audit`, and non-GET calls carry the CSRF header of `browserSession.api`. `/admin/*` is a static single-page-app path (`public(static)`) serving `index.html` to everyone, so hiding a nav entry is convenience and the API enforces every action. The tenant comes only from the session; no page sends a tenant id, and lists live in memory only. Cross-tenant isolation is proven by `add-admin-api` and `add-audit-api`.
2. **Input and taint.** Every answer is parsed field by field and every form value checked before it is sent; the server stays authoritative. Names, emails, issuers, actor ids and audit payloads are untrusted text, rendered as React text (no `dangerouslySetInnerHTML`); the journey maps a group named `<i>ursitoare-auditors</i>` and checks it appears literally.
3. **Secrets.** The CSRF token stays inside `browserSession.api` and is never read, rendered or logged here. Errors show catalogue text, never a server message; the Node journey's cookie and token are throwaway test values.
4. **Abuse cases.** A non-admin opening `/admin/users` (403 page, no data); markup in a name (shown as text); a path-like id from a corrupted answer (refused by the pattern); a double click (ignored while busy); a forged success (parsers reject it); removing the `tenant_admin` group (the confirmation warns); disabling oneself (no button, server refusal); a verified-looking status with no anchor behind it (the status says so).

## Test plan

Node test runner, `*.test.ts` beside each file, each starting with `/// <reference types="node" />` and `assert.equal(typeof <function it tests>, "function")`; a call that reaches a stub is wrapped in `assert.doesNotThrow` or `await assert.doesNotReject` (or `.then((v) => v, (e: unknown) => e)`) and its value asserted. Fake clients have the one method under test and record `(path, body, opts)`. A test that reads a repository file calls `existsSync` and `assert.ok` first.

`signInAs` in `test/journeys/session.ts` does `GET <url>/auth/oidc/login?return_to=%2F` with `redirect: "manual"` (`Location` is the provider's authorization URL, `Set-Cookie` holds `ursitoare_login`), `completeFakeLogin(oidcApi(stack.handles).fake, authorizationUrl, username)` (answers the callback URL), the callback `GET` with `cookie: ursitoare_login=<value>` and `redirect: "manual"` (`Set-Cookie` holds the `SESSION_COOKIE`), then `GET /api/v1/me` with that cookie for `csrfToken` and `user.id`. `sessionClient` is `createApiClient({ fetch })` whose `fetch` resolves the root-relative URL against `stack.url` and adds the `cookie` header and, for a method other than GET, `x-csrf-token`. `m2-admin.test.ts` starts `startE2eStack({ port: 0, controlPort: 0 })`; scenarios use fresh names and restore what they change. `e2e/test_m2_admin.py` changes no fixture; a second user signs in through `browser.new_context(base_url=base_url)`; no sleeps.

## Decisions made while writing

- **Four pages, not one tabbed page:** four paths let the capability filter hide Audit from a user with only `manage_users_roles`. **Idempotency key:** none is kept, so a retry after a lost success gets 409 `ALREADY_EXISTS`, which the page shows. **Feature numbers 60 to 63:** no written spec uses them. Verification runs on opening (one chain walk per visit) and on request.
- **Journey pairing:** as `add-web-sign-in` task 4.4 does, the browser-only requirement "The M2 journey proves the admin screens in a browser" sits in task 7.1, which also adds the Node journey for "The admin logic works against the real engine" (a red step cannot run `e2e/`); the browser scenarios have no Node twin and red traces them through that pairing.
- **Roadmap scope additions:** a "Roles and teams" column in the users table (roles, " (direct)" for a local grant, joined with ", ", then " · " and the teams; one part alone has no separator); the verification text follows `anchorsVerified`; web text for `ENGINE_KEY_REQUIRED`.
- **Codes:** the six that add-admin-api registers (`ALREADY_EXISTS`, `IN_USE`, `ELEVATION_REFUSED`, `UNKNOWN_ISSUER`, `OPERATION_REFUSED`, `ENGINE_KEY_REQUIRED`). `IN_USE` names the group mapping: a team is all these pages can find in use.
- **Status details:** 0 events gives "No events to check yet." whatever the anchors; "1 event" and "1 signed head anchor" are singular.
- **Root typecheck:** `test/journeys/m2-admin.test.ts` imports `web/src/admin/*.ts`, so the root `tsc` (types node, no DOM; Facts in `delivered-shapes.md`) now also checks those files and the kit modules they import, in red. Risk: a kit module needing DOM types fails it. Checked on main@bda30d2: root `tsc` accepts every non-JSX kit module; the logic files under `web/src/admin/` import only `.ts` kit modules, since a `.tsx` import fails with TS6142 ('--jsx' is not set).
