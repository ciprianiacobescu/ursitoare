## Context

Four admin screens over the M2 REST API, in `web/src/admin/`: logic in `.ts` files that Node tests run, thin `.tsx` components. Routes and shapes are those of the dependencies' folders (merged names: `delivered-shapes.md`); facts relied on:

- `add-admin-api`: `session` routes under `/api/v1`, `manage_users_roles`, non-GET with `X-CSRF-Token`; lists answer `{ items, next_cursor }`; `PATCH /users/{userId}` `{ state }` answers the `Account` or 422 `OPERATION_REFUSED` with `details.reason` (`self_disable`, `wrong_kind`, `owner_invalid`); a disabled person's sessions end at once; `POST /teams` with `Idempotency-Key` answers 201 and replays it for the same key; `DELETE /teams/{teamId}` and `DELETE /idp-group-map?issuer=&group=` answer 204 (409 `IN_USE` for a team in use); `PUT /idp-group-map` takes `{ issuer, group, roleId }` or `{ issuer, group, teamId }`.
- `add-audit-api`: `read_audit`; `GET /audit` pages events newest first (`seq` decimal text, `at` UTC text with microseconds) and filters by `event_type`; `GET /audit/verify` answers `{ ok, checked, firstBadSeq, reason, fromSeq, anchorsChecked, checkedAt }`, a broken chain being a 200 with `ok: false`.
- `add-roles-and-memberships`: each tenant has `tenant_admin`, `author`, `approver`, `auditor`; `parts/30-rbac.ts` seeds team `finance` and the mappings `ursitoare-authors`, `ursitoare-approvers`, `team-finance`, `ursitoare-admins` (carol, `tenant_admin`); alice holds `author` only.
- `add-api-pep`: a refusal is 403 `FORBIDDEN` with `details.decisionId` and an `authz.denied` event whose payload holds `decisionId`. `browserSession.api` (`add-web-sign-in`) adds the CSRF header and sends a dead session to `/sign-in?error=SESSION_ENDED`.

## Decisions

1. **Four pages, literal paths:** `/admin/users`, `/admin/roles-and-teams`, `/admin/group-mappings`, `/admin/audit`, one feature file each (numbers 60 to 63). A nav label needs a static path (`features.ts:135-142`) and add-api-conventions' `checkFeaturePaths` reads the `path` of `feature` as a string literal, so a file cannot compute it; `featureLiterals(source)` lets each page's task assert its file equals its `ADMIN_PAGES` entry.
2. **The UI hides, the API decides:** a page never checks capabilities. The kit filters the nav from `/me`; a page opened by address calls the API, whose 403 the table shows as `ErrorPanel` with the decision id.
3. **One client, safe paths:** `browserSession.api`; logic functions take `Api<"patch">` and the like, so tests pass fakes. A path segment is encoded only after its id matches a pattern (`userId` `^[A-Za-z0-9_-]{1,64}$`, role `^[a-z][a-z0-9_]{0,31}$`, team `^[a-z][a-z0-9_-]{0,63}$`), because `..` would leave `/api/v1`; a bad id is a `RangeError` and nothing is sent.
4. **Strict parsers:** each checks every field it uses and ignores the rest; `null` makes the caller throw `ApiRequestError(200, "INVALID_RESPONSE", "Invalid <thing>")`. Limits: `displayName` 200, `email` 320, `group` 1 to 255, `issuer` 1 to 2048, `reviewedBy` 1 to 200, `seq` `^(0|[1-9][0-9]{0,18})$`, `eventType` `^[a-z][a-z0-9_.]{0,63}$`, `at` `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$`, `actor.kind` `user`, `service` or `system`.
5. **Users:** Disable (with `confirm`) for an active account, Enable (no confirm: it restores access) for a disabled one, a note on the user's own row (the server still refuses `self_disable`). After a change the page resets the list, shows a success toast (`done`) and focuses its `<h1>`; a failure shows an error toast from `adminErrorMessage`.
6. **Teams and mappings:** each team submit sends a fresh `Idempotency-Key` (`crypto.randomUUID()`), so a double submit is a replay; server validation errors map onto fields with `mapEnvelopeErrors`. No endpoint lists issuers, so Issuer is a text field pre-filled with `defaultIssuer` of the first page (the seed guarantees one) and left alone once edited; Grant is a `<select>` over every role and team (`loadAllItems`: at most 5 pages of 200); Group is trimmed, since the server refuses padded names.
7. **Audit log:** one filter, Event type. `auditCells` formats `at` from its text without a `Date`; actor, target and payload (`JSON.stringify`, cut to 240 characters) are untrusted text. Verification runs on opening and on "Verify again" in one `role="status"` paragraph; the button is `aria-disabled` while checking, a request counter drops a stale answer and leaving the page aborts the request. A broken chain is a finding, not an error panel; `anchorsChecked` keeps a stack without an engine key from claiming signed anchors.
8. **Messages:** `add-admin-api` registered six codes with no kit text; this unit registers them (`registerAdminMessages()`, idempotent, called at module level in each feature file) and owns their texts. `adminErrorMessage` is `errorPanelModel(error).message` plus the reason texts and the decision id.
9. **Usability:** one `<h1 tabIndex={-1}>` per page; the kit's `DataTable` gives caption, `scope`, loading, empty and error states, "Load more" and "Try again"; every row button is named after its row; dialogs are the kit's native modal; results reach a screen reader through the toast region and the status paragraph.
10. **Stylesheet:** `admin.css` holds `admin-page`, `admin-section`, `admin-actions`, `admin-form`, `admin-status` and its four tones; colours only from tokens, no `style` attribute (the CSP).

## Interfaces

Same text as proposal.md § Interfaces given. Members of the named types follow.

- `shared.ts`: `ConfirmSpec`; `Check<T>`; `Api<K extends keyof ApiClient>` (a `Pick<ApiClient, K>`)
- `pages.ts`: `AdminPage`; `ADMIN_PAGES: readonly AdminPage[]`; `AdminTables`; `ADMIN_TABLES: AdminTables`; `FeatureLiterals`; `featureLiterals(source: string): FeatureLiterals | null`
- `messages.ts`: `ADMIN_MESSAGES: StringMap`; `registerAdminMessages(): void`; `adminErrorMessage(error: unknown): string`
- `users.ts`: `Account`; `AccountAction`; `AccountCells`; `parseAccount(raw: unknown): Account | null`; `accountCells(account: Account): AccountCells`; `accountAction(account: Account, selfId: string | null): AccountAction`; `setAccountState(client: Api<"patch">, userId: string, state: Account["state"]): Promise<Account>`
- `teams.ts`: `parseNamed(raw: unknown, key: "roleId" | "teamId"): string | null`; `checkTeamId(text: string): Check<string>`; `deleteTeamConfirm(teamId: string): ConfirmSpec`; `createTeam(client: Api<"post">, teamId: string, key: string): Promise<string>`; `deleteTeam(client: Api<"delete">, teamId: string): Promise<void>`
- `mappings.ts`: `GroupMapping`; `GrantOption`; `MappingBody`; `MappingCells`; `parseGroupMapping(raw: unknown): GroupMapping | null`; `mappingCells(m: GroupMapping): MappingCells`; `grantOptions(roles: readonly string[], teams: readonly string[]): GrantOption[]`; `defaultIssuer(rows: readonly GroupMapping[]): string`; `mappingRequest(input: { issuer: string; group: string; grant: string }, options: readonly GrantOption[]): { ok: true; body: MappingBody } | { ok: false; errors: FormErrors }`; `setMapping(client: Api<"put">, body: MappingBody): Promise<GroupMapping>`; `removeMappingConfirm(m: GroupMapping): ConfirmSpec`; `removeMapping(client: Api<"delete">, m: Pick<GroupMapping, "issuer" | "group">): Promise<void>`; `loadAllItems<T>(fetchPage: FetchPage<T>): Promise<T[]>`
- `audit.ts`: `AuditEvent`; `AuditCells`; `Verification`; `VerificationState`; `VerificationView`; `parseAuditEvent(raw: unknown): AuditEvent | null`; `auditCells(e: AuditEvent): AuditCells`; `parseEventTypeFilter(text: string): Check<string | null>`; `auditFetcher(client: Api<"get">, eventType: string | null): FetchPage<AuditEvent>`; `parseVerification(raw: unknown): Verification | null`; `verificationView(state: VerificationState): VerificationView`; `loadVerification(client: Api<"get">, signal?: AbortSignal): Promise<Verification>`
- `UsersPage.tsx`, `TeamsPage.tsx`, `MappingsPage.tsx`, `AuditPage.tsx`: `UsersPage(): ReactNode` and likewise for the others; `admin.css`
- `web/src/features/60-admin-users.tsx`, `61-admin-roles-teams.tsx`, `62-admin-group-mappings.tsx`, `63-admin-audit.tsx`: `feature: FeatureSpec` each (created with its page, never a stub)
- `test/journeys/session.ts`: `TestSession`; `signInAs(stack: Pick<E2eStack, "url" | "handles">, username: string): Promise<TestSession>`; `sessionClient(stack: Pick<E2eStack, "url">, session: TestSession): ApiClient`. `e2e/test_m2_admin.py`: the journey

```ts
interface ConfirmSpec { title: string; description: string; action: string }  type Check<T> = { ok: true; value: T } | { ok: false; message: string }
type Api<K extends keyof ApiClient> = Pick<ApiClient, K>
interface AdminPage { id: string; file: string; path: string; navLabel: string; capability: "manage_users_roles" | "read_audit" }
type AdminTables = Readonly<Record<"users" | "roles" | "teams" | "mappings" | "audit", DataTableSpec>>  interface FeatureLiterals { id: string; path: string; navLabel: string; capability: string }
interface Account { userId: string; kind: "human" | "service"; displayName: string; email: string | null; state: "active" | "disabled" }  interface AccountCells { name: string; email: string; state: string }
type AccountAction = { kind: "none"; note: string } | { kind: "disable" | "enable"; buttonLabel: string; confirm: ConfirmSpec | null; done: string }
interface GroupMapping { issuer: string; group: string; roleId: string | null; teamId: string | null; reviewedBy: string }  interface GrantOption { value: string; label: string }
type MappingBody = { issuer: string; group: string; roleId: string } | { issuer: string; group: string; teamId: string }  interface MappingCells { group: string; grants: string; issuer: string; reviewedBy: string }
interface AuditEvent { seq: string; at: string; eventType: string; actor: { kind: string; id: string }; target: { kind: string; id: string } | null; payload: Record<string, unknown> }
interface AuditCells { seq: string; time: string; type: string; actor: string; target: string; details: string }
interface Verification { ok: boolean; checked: number; firstBadSeq: string | null; reason: "hash" | "gap" | "anchor" | null; anchorsChecked: boolean; checkedAt: string }
type VerificationState = { status: "checking" } | { status: "done"; result: Verification } | { status: "failed"; error: unknown }
interface VerificationView { tone: "checking" | "ok" | "broken" | "unavailable"; headline: string; detail: string }  interface TestSession { cookie: string; csrfToken: string; userId: string }
```

Stubs: constants hold a value of their type (`ADMIN_PAGES` is `[]`, `ADMIN_TABLES` five specs `{ caption: "", columns: [] }`, `ADMIN_MESSAGES` is `{}`); functions and page components throw `new Error("not implemented")`. `clip` is internal to `shared.ts`.

## Component wiring

`node --test` has no JSX transform, so the typechecker and the browser journey check the `.tsx` files. Each page imports `./admin.css`, sets `document.title` to `<navLabel> · Ursitoare` in an effect, renders `<div className="admin-page"><h1 ref tabIndex={-1}>`, and builds each table as `DataTable` over `ADMIN_TABLES.<key>.columns` plus a `cell` each, with a list from `createCursorList(cursorPageFetcher(browserSession.api, path, { parseItem }))` made once with `useState`.

- `UsersPage`: `selfId` is `useSession()` ready ? `me.user.id` : `null`. The Actions cell shows the `note` or a `<button type="button" className="ui-button">` named `buttonLabel`, ignored while `acting` (`aria-disabled`); it opens the dialog when `confirm` is not `null`, else runs. State `dialog: { account; open } | null` keeps the account after the dialog closes so it refocuses its opener. Running calls `setAccountState(api, userId, account.state === "active" ? "disabled" : "active")`, then toast, `list.reset()` and focus.
- `TeamsPage`: tables `roles` and `teams`, then `Form` "Create team" with `Field` "Team name". Submit: `checkTeamId`; if not ok `{ teamId: message }`; else `createTeam(api, value, crypto.randomUUID())`, toast `Created team <id>.`, clear the input, `teams.reset()`; on error `mapEnvelopeErrors(error, ["teamId"])`. Each team row has "Delete team <id>" (`deleteTeamConfirm`, toast `Deleted team <id>.`).
- `MappingsPage`: on mount two `loadAllItems` give the options (`LoadingState` "Loading roles and teams"; a rejection renders `ErrorPanel`). `Form` "Map a group" (submit "Map group") with `Field` "Issuer", "Group" and "Grant" (a `<select>` whose first option is "Choose a role or a team"). Submit: `mappingRequest`; if not ok its `errors`; else `setMapping`, toast `Mapped <group>.`, clear Group and Grant, `list.reset()`; on error `mapEnvelopeErrors(error, ["issuer", "group", "grant"])`. Each row has "Remove <group>" (`removeMappingConfirm`, destructive, toast `Removed the mapping for <group>.`).
- `AuditPage`: a `<section aria-labelledby>` "Chain verification" with `<p role="status" className="admin-status admin-status--<tone>">` (headline in `<strong>`, then detail) and the button "Verify again"; `Form` "Filter the audit log" (submit "Apply filter") with `Field` "Event type"; `DataTable` "Audit events" keyed by the applied filter, its list built from `auditFetcher(browserSession.api, filter)`.
- Each feature file calls `registerAdminMessages()` at module level and exports `feature: FeatureSpec` as an object literal with the four literals of its `ADMIN_PAGES` entry and `element: <XPage />`.

## Failure cases

| Situation | Behaviour |
|---|---|
| No session, or it ended | 401 `UNAUTHENTICATED`; `browserSession.api` goes to `/sign-in?error=SESSION_ENDED` |
| Signed in without the capability | 403 `FORBIDDEN`; the table (or the options) shows `ErrorPanel` with the decision id and "Copy decision id" |
| Engine down or slow | `NETWORK_ERROR` or `AUTHZ_UNAVAILABLE`: the table keeps its rows and offers "Try again"; an action shows an error toast and leaves the list |
| Answer of the wrong shape | the parser gives `null`; `ApiRequestError` `INVALID_RESPONSE`, catalogue text |
| Bad form input | nothing is sent; the message is beside the field and focus moves to the first invalid field |
| Server refusal of an action | error toast with the catalogue text; the list is unchanged |
| Two clicks on one action | the second is ignored while `acting`; a repeated team create with one key is a replay |
| A cursor is rejected | `CURSOR_INVALID`: the table offers "Start over" |
| Verification fails or the chain is broken | "Verification unavailable" with the catalogue text, or "Audit chain broken" with the first bad event; the log still lists |

## Security

1. **Authentication and PEP.** No endpoint is added; the pages use existing `session` routes under `manage_users_roles` and `read_audit`. `/admin/*` is a static single-page-app path (`public(static)`) that serves the same `index.html` to everyone, so hiding a nav entry is convenience and the API enforces every action; non-GET calls carry the CSRF header of `browserSession.api`.
2. **Tenant isolation.** No table or query. The tenant comes only from the session; no page sends a tenant id and every body is built from a fixed field list. Lists live in memory, never in web storage. Cross-tenant isolation is proven by `add-admin-api` and `add-audit-api`.
3. **Input and taint.** Every answer is parsed field by field and every form value checked before it is sent; the server stays authoritative. Names, emails, issuers, actor ids and audit payloads are untrusted text, rendered as React text and never as markup (no `dangerouslySetInnerHTML`, no `innerHTML`); the journey maps a group named `<i>ursitoare-auditors</i>` and checks it appears literally.
4. **Secrets.** The CSRF token stays inside `browserSession.api`; this unit never reads, renders or logs it. Errors show catalogue text, never a server message. The Node journey's cookie and token are throwaway values of the test stack and appear in no error.
5. **Abuse cases.** A non-admin opening `/admin/users` (403 page, no data); markup in a name (shown as text); a path-like id from a corrupted answer (refused by the pattern); a double click (ignored while busy); a forged success (parsers reject wrong shapes); removing the group that holds `tenant_admin` (the confirmation says so); disabling oneself (no button, server refusal).

## Test plan

Node test runner, `*.test.ts` beside each file; each starts with `/// <reference types="node" />` and `assert.equal(typeof <function it tests>, "function")`; a call that reaches a stub is wrapped in `assert.doesNotThrow` or `await assert.doesNotReject` (or `.then((v) => v, (e: unknown) => e)`) and its value asserted. Fake clients are objects with the one method under test that record `(path, body, opts)`. A test that reads a repository file calls `existsSync` and `assert.ok` before `readFileSync`, so a missing file fails by assertion.

`test/journeys/m2-admin.test.ts` starts `startE2eStack({ port: 0, controlPort: 0 })` and signs users in with `signInAs`: `GET <url>/auth/oidc/login?return_to=%2F` with `redirect: "manual"` (its `Location` is the provider's authorization URL, `Set-Cookie` holds `ursitoare_login`), `completeFakeLogin(oidcApi(stack.handles).fake, authorizationUrl, username)` (answers the callback URL), the callback `GET` with `cookie: ursitoare_login=<value>` and `redirect: "manual"` (its `Set-Cookie` holds the `SESSION_COOKIE`), then `GET /api/v1/me` with that cookie for `csrfToken` and `user.id`. `sessionClient` is `createApiClient({ fetch })` whose `fetch` resolves the root-relative URL against `stack.url` and adds the `cookie` header and, for a method other than GET, `x-csrf-token`. Scenarios use fresh names and restore the states they change. `e2e/test_m2_admin.py` changes no fixture; a second user signs in through `browser.new_context(base_url=base_url)`; no sleeps, no skip; the title is asserted with `expect(page).to_have_title(...)`.

## Decisions made while writing

- **Four pages, not one tabbed page:** a nav entry needs a static path, and four paths let the capability filter hide Audit from a user who has only `manage_users_roles`. Roles share a page with teams: they are a read-only list of four.
- **Out of scope though the API exists:** service accounts and their roles, IdP links, the review-profile switch, `/policy-decisions`; the card names users, roles, teams, group mappings and the audit log.
- **No idempotency-key holder:** each submit sends a fresh key; a retry after a network error that had succeeded gets 409 `ALREADY_EXISTS`, which the page shows.
- **Verification runs on opening** (one walk of the chain per visit) and on request; the API shares concurrent runs.
- **The six admin codes get their text here,** not in the kit, which registers only the base codes.
- **A Node journey against the real stack** pairs the browser journey (a red step cannot run `e2e/`) and proves the web logic on real answers.
- **Feature numbers 60 to 63:** 10 and 15 are taken and no written spec uses these.
