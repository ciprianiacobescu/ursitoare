# web-admin Specification

## Purpose
Screens for a tenant administrator to manage users, teams and IdP group mappings and to read the audit log with its chain verification status.

## Requirements

### Requirement: Admin pages are listed by capability and declare literal paths
The web app SHALL offer four admin pages, each at a literal `path` under `/admin`, listed in the navigation only when `/api/v1/me` lists its capability.

#### Scenario: The page table
- **WHEN** `ADMIN_PAGES` is read and `dataTableModel` gets each of the five `ADMIN_TABLES` specs
- **THEN** `ADMIN_PAGES` holds, in order, `admin-users` (`/admin/users`, "Users"), `admin-roles-teams` (`/admin/roles-and-teams`, "Roles and teams") and `admin-group-mappings` (`/admin/group-mappings`, "Group mappings"), all `manage_users_roles`, then `admin-audit` (`/admin/audit`, "Audit log", `read_audit`); `dataTableModel` throws for none, the captions are "Users", "Roles", "Teams", "Group mappings" and "Audit events", every `emptyTitle` and the two `emptyDescription` texts are those of task 1.1, and the users table has "Roles and teams"

#### Scenario: Navigation follows capabilities
- **WHEN** the four entries are registered (element `null`) in a fresh `createFeatureRegistry()` and `nav` is asked with `new Set()`, `new Set(["read_self", "read_audit"])` and `new Set(["manage_users_roles", "read_audit"])`
- **THEN** the labels are `[]`, `["Audit log"]` and `["Users", "Roles and teams", "Group mappings", "Audit log"]`

#### Scenario: A feature file declares the table's literals
- **WHEN** `featureLiterals` gets `export const feature = { id: "admin-users", path: "/admin/users", navLabel: "Users", capability: "manage_users_roles", element: <UsersPage /> };`, the same with `path: adminPath`, and the text of each `ADMIN_PAGES` file in `web/src/features/`
- **THEN** the first result is `{ id: "admin-users", path: "/admin/users", navLabel: "Users", capability: "manage_users_roles" }`, the second `null`, and each file's result equals its entry without `file`

### Requirement: Admin errors show catalogue text and the refusal's decision id
The web app SHALL give the admin API's codes that its pages receive catalogue text, never the server's message, and append a refusal's decision id.

#### Scenario: The codes and their texts
- **WHEN** `registerAdminMessages()` runs twice and `messageFor` is called for each code of `ADMIN_MESSAGES`
- **THEN** nothing throws, the keys are exactly `ALREADY_EXISTS`, `IN_USE`, `ELEVATION_REFUSED`, `UNKNOWN_ISSUER`, `OPERATION_REFUSED` and `ENGINE_KEY_REQUIRED` with the texts of task 2.1, and each `messageFor` answer equals its entry and differs from `FALLBACK_MESSAGE`

#### Scenario: Error text for an action
- **WHEN** `adminErrorMessage` gets `ApiRequestError(409, "IN_USE", "raw SQL")`, `ApiRequestError(422, "OPERATION_REFUSED", "x", { details: { reason } })` for `self_disable` and `other`, and `ApiRequestError(403, "FORBIDDEN", "x", { details: { decisionId: "d-1" } })`
- **THEN** the answers are the `IN_USE` entry without "raw SQL", "You cannot disable your own account.", the `OPERATION_REFUSED` entry and `messageFor("FORBIDDEN")` followed by " Decision id: d-1"

### Requirement: The Users page lists people and disables or enables them
The Users page SHALL list people with state, roles and teams and offer Disable or Enable on every row but the user's own, confirming only a disable.

#### Scenario: Parsing an account
- **WHEN** `parseAccount` gets `{ userId: "u_bob", kind: "human", ownerUserId: null, displayName: "Bob Example", email: "bob@example.test", state: "active", roles: ["author", "auditor"], teams: ["finance"], localRoles: ["auditor"] }`, and bodies with `state: "deleted"`, `userId: "../x"`, `roles: "author"`, `teams: ["Finance"]`, `localRoles: [7]` and `null`
- **THEN** the first result is the same without `ownerUserId` and every other result is `null`

#### Scenario: Cells and actions
- **WHEN** `accountCells` and `accountAction` get Bob (active, as above), Bob disabled with `roles: []`, `localRoles: []` and `teams: ["finance"]`, Bob with all three empty, and Bob with `selfId` "u_bob"
- **THEN** Bob's cells are `{ name: "Bob Example", email: "bob@example.test", state: "Active", rolesTeams: "author, auditor (direct) · finance" }`, the disabled one's `rolesTeams` is "finance", the empty one's "—"; his action has `kind: "disable"`, `buttonLabel: "Disable Bob Example"`, `confirm.title` "Disable Bob Example?", `confirm.action` "Disable user", `confirm.description` of task 3.1 for Bob Example and `done: "Disabled Bob Example."`; disabled Bob has state "Disabled", `kind: "enable"`, `buttonLabel: "Enable Bob Example"`, `confirm: null`, `done: "Enabled Bob Example."`; the own row is `{ kind: "none", note: "This is your account" }`

#### Scenario: Setting a state
- **WHEN** `patchAccountState` runs with a recording client for `("u_bob", "disabled")` and with one answering `{}`
- **THEN** the client got `patch("/users/u_bob", { state: "disabled" })` and the result has `state: "disabled"`; the second call rejects with `ApiRequestError` code `INVALID_RESPONSE`

### Requirement: The Roles and teams page lists roles and teams and creates or deletes a team
The Roles and teams page SHALL list roles and teams, create a team with a fresh `Idempotency-Key`, and delete one only after a confirmation naming it.

#### Scenario: Names
- **WHEN** `parseNamed` gets `{ roleId: "tenant_admin" }` and `{ roleId: "Tenant" }` for `roleId` and `{ teamId: "finance" }` for `teamId`; and `checkTeamId` gets " ops ", "" and "Ops"
- **THEN** `parseNamed` gives "tenant_admin", `null` and "finance"; `checkTeamId` gives `{ ok: true, value: "ops" }`, `{ ok: false, message: "Enter a team name." }` and, for "Ops", `{ ok: false, message }` with the message of task 4.1

#### Scenario: Creating and deleting
- **WHEN** `postTeam` runs with a recording client for `("ops", "key-1")` and with one answering `{}`; `removeTeamById` runs for "ops"; and `deleteTeamConfirm("ops")` is read
- **THEN** the client got `post("/teams", { teamId: "ops" }, { headers: { "Idempotency-Key": "key-1" } })` and the result is "ops"; the second call rejects with `INVALID_RESPONSE`; the delete got `delete("/teams/ops")` and resolved to `undefined`; the confirmation has `title` "Delete team ops?" and `action` "Delete team"

### Requirement: The Group mappings page maps a group to one role or team
The Group mappings page SHALL list mappings, map a group to one role or team without sending invalid input, and confirm a removal, warning for `tenant_admin`.

#### Scenario: Parsing, showing and offering mappings
- **WHEN** `parseGroupMapping` gets `{ issuer: "https://idp.example/realms/u", group: "ursitoare-authors", roleId: "author", teamId: null, reviewedBy: "operator:e2e-seed" }`, the same with `roleId: null, teamId: "finance"`, and bodies with both targets set and `group: ""`; `mappingCells` gets the first two; `grantOptions(["author", "auditor"], ["finance"])` is read; `defaultIssuer` gets `[]` and two mappings with issuers "https://a.example/r" then "https://b.example/r"; and `ISSUER_HINT` is read
- **THEN** the first two parse to themselves and the others are `null`; the options are `role:author` "Role: author", `role:auditor` "Role: auditor" and `team:finance` "Team: finance"; the issuers are "" and "https://a.example/r"; the cells hold the same group, issuer and reviewer with `grants` "Role: author" and, for the second, "Team: finance"; `ISSUER_HINT` is the text of task 5.1

#### Scenario: Building the request
- **WHEN** `mappingRequest` gets, with those options, issuer " https://idp.example/realms/u ", group " ursitoare-auditors " and grant "role:auditor" (then "team:finance"); an empty issuer, group and grant; and grant "role:root"
- **THEN** the results are `{ ok: true, body: { issuer: "https://idp.example/realms/u", group: "ursitoare-auditors", roleId: "auditor" } }` (`teamId: "finance"`, no `roleId`, for the team); `{ ok: false, errors }` with a message each for `issuer`, `group` and `grant`; errors for only `grant: "Choose a role or a team."`; the messages are those of task 5.1

#### Scenario: Saving a mapping, reading every page
- **WHEN** `setMapping` runs with a recording client for the first body above; `loadAllItems` runs over a fetcher that answers `{ items: [1, 2], next_cursor: "c1" }` then `{ items: [3], next_cursor: null }`, over one with endless pages `c1`, `c2`, and so on, and over one that rejects `ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x")`
- **THEN** the client got `put("/idp-group-map", body)` and the result is the mapping; the first fetcher's requests, compared on `cursor` and `limit`, were `{ cursor: null, limit: 200 }` then `{ cursor: "c1", limit: 200 }` and the result is `[1, 2, 3]`; the endless fetcher was asked five times; the third call rejects with that error

#### Scenario: A removal states the consequence
- **WHEN** `removeMappingConfirm` gets the mapping of "ursitoare-authors" to role `author`, of "team-finance" to team `finance`, and of "ursitoare-admins" to role `tenant_admin`
- **THEN** the first has `title` "Remove the mapping for ursitoare-authors?", `action` "Remove mapping" and `description` "Members of this group lose the role author at once."; the second ends "lose the team finance at once."; the third adds the warning of task 5.2 that nobody can manage users if no other group maps to `tenant_admin`

### Requirement: The Audit log page lists events newest first and filters by event type
The Audit log page SHALL list events newest first in a captioned table, show actor, target and payload as text, and filter by event type.

#### Scenario: Parsing an event and its cells
- **WHEN** `parseAuditEvent` gets `{ seq: "17", at: "2026-10-25T09:00:00.123456Z", eventType: "identity.group_mapped", actor: { kind: "user", id: "u_carol" }, target: null, payload: { group: "ursitoare-auditors" }, origin: "ursitoare" }` and bodies with `seq: "017"` and `payload: []`; and `auditCells` gets the event, the event with `payload: {}` and `target: { kind: "action", id: "manage_users_roles" }`, and one with `at: "not a time"`
- **THEN** the first result is the event without `origin`, the others `null`; the cells are `{ seq: "17", time: "2026-10-25 09:00:00 UTC", type: "identity.group_mapped", actor: "user: u_carol", target: "—", details: "{\"group\":\"ursitoare-auditors\"}" }`, then `details: "—"` with `target: "action: manage_users_roles"`, then `time: "not a time"`

#### Scenario: The event type filter
- **WHEN** `parseEventTypeFilter` gets "  ", " authz.denied " and "Authz"; `auditFetcher(client, "authz.denied")` is called with `{ cursor: null, limit: 25, signal }` and then with `cursor` "c1"; `auditFetcher(client, null)` once; and the client answers an item `{ seq: "x" }`
- **THEN** the filters give `{ ok: true, value: null }`, `{ ok: true, value: "authz.denied" }` and `{ ok: false, message }` (task 6.1); the client got `get("/audit", { query: { event_type: "authz.denied", limit: 25 }, signal })`, then the query with `cursor: "c1"` added, then `{ query: { limit: 25 }, signal }`; the last call rejects with `INVALID_RESPONSE`

### Requirement: The Audit log page shows whether the chain verifies
The Audit log page SHALL call `GET /api/v1/audit/verify` on opening and on request and show one status: checking, verified (saying whether signed head anchors matched), broken at an event number, or unavailable.

#### Scenario: Parsing and loading a verification
- **WHEN** `parseVerification` gets `{ ok: true, checked: 42, firstBadSeq: null, reason: null, fromSeq: "1", anchorsChecked: true, anchorsVerified: 2, checkedAt: "2026-10-25T09:00:00.000000Z" }` and bodies with `ok: true, firstBadSeq: "17"`, `anchorsVerified: -1`, `anchorsChecked: true` with `anchorsVerified: 0`, and no `checkedAt`; `loadVerification` runs with a recording client, with and without a signal, and with a client that answers `{ ok: "yes" }`
- **THEN** the first result is the same without `fromSeq` and the others are `null`; the client got `get("/audit/verify", { signal })` then `get("/audit/verify", {})`; the third call rejects with `INVALID_RESPONSE`

#### Scenario: Status text
- **WHEN** `verificationView` gets `checking`; done with `checked: 42` and `anchorsVerified: 2`; done with `checked: 42` and `anchorsVerified: 0`; done with `checked: 0`; done with `ok: false, firstBadSeq: "17", reason: "hash"`; and `failed` with `ApiRequestError(403, "FORBIDDEN", "x", { details: { decisionId: "d-9" } })` (`checkedAt` "2026-10-25T09:00:00.000000Z")
- **THEN** the tones are `checking`, `ok` (three times), `broken` and `unavailable`; the headlines are "Checking the audit chain", "Audit chain verified" (three times), "Audit chain broken" and "Verification unavailable"; the first two details are the two forms of task 6.2 with `<n>` 42, `<k>` 2 and `<time>` "2026-10-25 09:00:00 UTC", the third is "No events to check yet. Checked at 2026-10-25 09:00:00 UTC.", the broken one names event 17 and its reason, the last is `adminErrorMessage` of that error

### Requirement: Admin styles use the kit's tokens and no inline styles
`web/src/admin/admin.css` SHALL take every colour from the kit's tokens, and no admin page or feature file SHALL use `style`.

#### Scenario: The stylesheet and the sources
- **WHEN** `web/src/admin/admin.css` is read with `web/src/kit/tokens.css`, and the texts of `UsersPage.tsx`, `TeamsPage.tsx`, `MappingsPage.tsx`, `AuditPage.tsx` and `web/src/features/60-...63-*.tsx` are read (each asserted to exist first)
- **THEN** `findRawColours` of the stylesheet reports nothing, `findInlineStyleUse` reports nothing for the stylesheet and each of the eight files, every `var(--ui-…)` names a property `parseTokens` finds in `tokens.css`, and the four `.admin-status--*` rules use the token pairs of task 6.2

### Requirement: The admin logic works against the real engine
The admin logic SHALL work against the e2e stack's engine: an administrator manages mappings, teams and people and reads the log; an author is refused with a decision id the administrator finds.

#### Scenario: Carol manages mappings and teams and reads the log
- **WHEN** carol signs in and, over her session, `loadAllItems` reads `/roles`, `/teams` and `/idp-group-map`, `setMapping` maps "ursitoare-auditors" to role `auditor` with `defaultIssuer`, `postTeam` makes "ops" twice with key "k-1" and once with "k-2", `removeTeamById` runs for "ops" and for "finance", she reads `auditFetcher(client, "identity.group_mapped")` and `loadVerification(client)`, and `removeMapping` removes the new mapping
- **THEN** the roles are `approver`, `auditor`, `author` and `tenant_admin` (server order), the teams are `["finance"]` and the mappings are the four seeded ones; the mapping has `roleId` "auditor"; both "k-1" creates return "ops"; "k-2" rejects `ALREADY_EXISTS`; deleting "ops" and removing the mapping resolve; deleting "finance" rejects `IN_USE`; an audit item has `payload.group` "ursitoare-auditors"; the verification has `ok: true`, `anchorsChecked: false`, `anchorsVerified: 0`, `checked` at least 1, and its `verificationView` says "Audit chain verified" and "only the hash chain was checked"

#### Scenario: Alice is refused, carol finds the id and disables her
- **WHEN** alice and carol sign in and alice reads `/users`; carol reads `auditFetcher(client, "authz.denied")` and `/users` (`loadAllItems`, `parseAccount`), runs `patchAccountState` for alice's id with "disabled", disables her own id, and sets alice "active"; and alice reads `/users` while disabled and again after the re-enable
- **THEN** alice's first call rejects with status 403 `FORBIDDEN`, `errorPanelModel(error).decisionId` is a non-empty text and an item of carol's page has `payload.decisionId` equal to it; carol's list has alice with `roles` `["author"]`, `teams` `["finance"]`, `localRoles` `[]`, and carol with `tenant_admin` among her `roles`; the first state change returns `state: "disabled"`; alice's call while disabled gives 401 `UNAUTHENTICATED`, after the re-enable 403 `FORBIDDEN`; carol's own disable rejects with code `OPERATION_REFUSED` and `adminErrorMessage` answers "You cannot disable your own account."; the last change returns `state: "active"`

### Requirement: The M2 journey proves the admin screens in a browser
`e2e/test_m2_admin.py` SHALL show carol mapping a group and reading the log, alice refused with a decision id, carol disabling and enabling alice, and a team created and deleted, with `assert_accessible(page)` on every page.

#### Scenario: Carol maps a group and the log shows it verified
- **WHEN** carol signs in, opens "Group mappings", fills Group with `<i>ursitoare-auditors</i>`, chooses "Role: auditor" in Grant, presses "Map group", opens "Audit log" and filters Event type by "identity.group_mapped"
- **THEN** the navigation lists "Users", "Roles and teams", "Group mappings" and "Audit log"; the table "Group mappings" has a row for "ursitoare-authors" and a row showing the text `<i>ursitoare-auditors</i>` and "Role: auditor", with no `i` element; "Audit chain verified" is shown; the table "Audit events" has a row with "ursitoare-auditors"

#### Scenario: Alice sees a 403 page with the decision id
- **WHEN** alice signs in and opens `/admin/users` by address, and carol, in a second context, filters her Audit log by "authz.denied"
- **THEN** alice's navigation has no "Users" link; her page shows an alert "Not allowed" with "Decision id:" and a "Copy decision id" button; carol's table "Audit events" has a row with the same id

#### Scenario: Carol disables and enables alice
- **WHEN** alice is signed in in a second context, carol opens "Users", presses the button named exactly "Disable Alice Example" and "Disable user" in the dialog, alice opens `/admin/users`, and carol presses exactly "Enable Alice Example"
- **THEN** the dialog shows the `confirm.description` of "Cells and actions" for Alice Example; carol's own row shows "This is your account", no button; alice's row shows "author · finance" and "Disabled" then "Active"; the heading "Users" has focus after each change; alice's URL is `/sign-in?error=SESSION_ENDED&return_to=%2Fadmin%2Fusers`

#### Scenario: Carol creates and deletes a team
- **WHEN** carol opens "Roles and teams", fills "Team name" with "ops", presses "Create team", then "Delete team ops" and "Delete team" in the dialog, then the same for "finance"
- **THEN** the table "Roles" lists `approver`, `auditor`, `author`, `tenant_admin`; the table "Teams" gets the row "ops" and loses it; the text "This team is still the target of a group mapping. Remove that mapping first." is shown and the row "finance" stays

### Requirement: The four admin pages are built from PageHeader, Section and the list width
`UsersPage.tsx`, `TeamsPage.tsx`, `MappingsPage.tsx` and `AuditPage.tsx` SHALL each render `PageHeader` with its current `h1` text and `headingRef={headingRef}`, a root `className={cn("admin-page", PAGE_WIDTHS.list)}`, no `<h1`, no `style=` and no `admin.css` import. Forms and the verification block SHALL be `Section`s titled "Create team", "Map a group", "Chain verification" and "Filter the audit log". `admin.css` SHALL stay token-only with its four `.admin-status--*` tone pairs, hold no `max-width` and no `.admin-section`, `.admin-form` rule. Users, Roles and teams and Audit SHALL import nothing from `web/src/people/`; Group mappings SHALL call `useDisplayNames(` once and `personLabel(` once.

#### Scenario: The admin sources use the layout parts and keep their pins
- **WHEN** `admin/admin-pages-restyle.test.ts` reads the four page sources, `admin.css` and `tokens.css` (test-plan.md T1)
- **THEN** each page has `<PageHeader` once, `headingRef={headingRef}` once, `PAGE_WIDTHS.list` once, no `<h1`, `findInlineStyleUse` and `findCssImports` `[]`; `<ConfirmDialog` and `destructive` occur once each in Users, Teams and Mappings and not in Audit; only Mappings imports `people/`; Audit holds `lg:grid-cols-2`, `whitespace-nowrap`, `[overflow-wrap:anywhere]` and `block min-w-48 max-w-sm break-all`; Mappings holds `<span className="break-all">{cells.issuer}</span>` and `className="ui-button whitespace-nowrap"`; Teams holds `xl:grid-cols-[20rem_minmax(0,1fr)]` and Mappings no `xl:grid-cols`; `admin.css` has `findRawColours` `[]`, the four tone pairs of C-52c26a32 and no `max-width`; three altered texts (`<h1` added, `destructive` removed from Users, `style="x"` added) fail the checker

### Requirement: A table caption that repeats its page heading is hidden, and only four are
Each page SHALL pass `captionDisplay={captionDisplayFor(<spec>.caption, <its h1 text>)}` for every table whose caption equals its `h1` text. Over the caption of every table of `ADMIN_TABLES` and `TOOL_TABLES` with its page's `h1` text, `captionDisplayFor` SHALL give `"hidden"` for exactly "Users", "Group mappings", "Tool servers" and "Grants".

#### Scenario: Exactly four captions are hidden
- **WHEN** `admin/captions-by-page.test.ts` calls `captionDisplayFor` with the eight pairs of test-plan.md T2 and reads the page sources
- **THEN** the hidden set, in table order, is `["Users", "Group mappings", "Tool servers", "Grants"]` and the visible set `["Roles", "Teams", "Audit events", "Tools"]`; the pairs `("Roles", "Roles and teams")`, `("Audit events", "Audit log")` and `("Tools", "Tool servers")` give `"visible"`; exactly `UsersPage.tsx`, `MappingsPage.tsx`, `ServersPage.tsx` and `GrantsPage.tsx` contain `captionDisplay={captionDisplayFor(`; the function half is green on arrival, the source half red

### Requirement: A destructive confirm is red and a state is a badge
The Users page SHALL pass `destructive` to its `ConfirmDialog`, so "Disable user" has `data-tone="danger"`, the background `rgb(180, 35, 24)` and the first focus on "Cancel"; the dialog's name, texts and the `h1` focus after it SHALL be unchanged. The Name cell SHALL show the user id under the name in `font-mono` (the id a user grant needs). The state cell SHALL be a `Badge` with `data-tone` `success` for "Active" and `neutral` for "Disabled", and the Users table SHALL have a hidden caption and still be named "Users".

#### Scenario: Disable user opens red and the table keeps its name
- **WHEN** `test_users_page_hides_its_caption_toned_badge_and_red_disable_confirm` opens `/admin/users` at 1366 by 860 with `/users` answering "Alice Example" (the signed-in user) and "Bob Example" (test-plan-browser.md), then clicks "Disable Bob Example"
- **THEN** one `heading` "Users" exists; the caption has the class `ui-table-caption ui-visually-hidden`, `position` `absolute` and `clip` `rect(0px, 0px, 0px, 0px)`, and the table's first header cell is at most 2 px below the table's top; Bob's row has one `[data-slot="badge"]` with text "Active" and `data-tone` `success` and contains `user-2`; the dialog has one heading, "Disable user" has `data-tone` `danger` and background `rgb(180, 35, 24)`, "Cancel" is focused; after `Escape` no dialog remains and "Disable Bob Example" is focused; `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

### Requirement: A form sits beside the tables from 1280 px and above them below
On Roles and teams the "Create team" `Section` SHALL be left of the Roles and Teams tables from a 1280 px viewport and above them below it; the "Team name" field SHALL be at most 640 px wide. The "Roles" and "Teams" captions SHALL stay visible. On Group mappings the "Map a group" `Section` SHALL be above the table at every width, and the table SHALL fit its card: the group and reviewer cells and the "Remove <group>" buttons SHALL not wrap, the Issuer MAY, every "Remove" button SHALL be as tall as the others within 1 px, and the `.ui-table-wrap` SHALL have `scrollWidth` at most `clientWidth`.

#### Scenario: The team form is beside the tables at 1366 and above them at 1100
- **WHEN** `test_teams_form_sits_beside_the_tables_at_1366_and_above_them_at_1100` opens `/admin/roles-and-teams` with `/roles` answering `author` and `tenant_admin` and `/teams` answering `finance` (test-plan-browser.md), measures at 1366 by 860, then sets the viewport to 1100 by 860
- **THEN** at 1366 the right edge of the region "Create team" is at most the left edge of the table "Teams", the "Team name" width is at most 640 and the caption of "Roles" has the class `ui-table-caption`; at 1100 the bottom edge of the region is at most the top edge of the table; `assert_layout` passes at both widths, `assert_accessible` passes and `watch_csp` is `[]`

### Requirement: Reviewer names replace ids only when a person is found
The "Reviewed by" cell of Group mappings SHALL show `clip(personLabel(names, mapping.reviewedBy))` where `names` is `useDisplayNames` of the distinct `reviewedBy` values. A value that is not a user id SHALL be shown as it is and never requested; a failed lookup SHALL leave every id; the table caption SHALL be hidden.

#### Scenario: Group mappings show Carol Example, keep operator:e2e-seed and fall back on a failure
- **WHEN** `test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people` opens `/admin/group-mappings` with two mappings, `reviewedBy` `u_carol` and `operator:e2e-seed`, and `/people` answering `u_carol` as "Carol Example"; then a second page opens it with `/people` answering 500 (test-plan-browser.md)
- **THEN** the "ursitoare-authors" row contains "Carol Example" and not "u_carol"; the "ursitoare-admins" row contains "operator:e2e-seed"; the `/people` requests of the first page are exactly one, with the query `ids=u_carol`; the caption has the class `ui-table-caption ui-visually-hidden`; the bottom edge of the region "Map a group" is at most the top edge of the table; the right edge of "Remove ursitoare-authors" is at most the right edge of its `.ui-table-wrap`; with four rows (the two above, `ursitoare-approvers` and `team-finance`, the last two with issuer `http://127.0.0.1:53086/realms/ursitoare`) the four "Remove" buttons differ in height by at most 1 px, the wrapper's `scrollWidth <= clientWidth`, and the cells "operator:e2e-seed" and "ursitoare-approvers" are each at most 30 px tall; on the second page, after the response to its one `/people` request (500), the same row contains "u_carol" and the hit list has one entry; `assert_layout`, `assert_accessible` and both `watch_csp` lists (`[]`) pass

### Requirement: The Audit log keeps actor ids and reads its times on one line
The Audit log page SHALL show "Chain verification" and "Filter the audit log" side by side from 1024 px, the table below them, the Time cell on one line and the Details cell bounded so that the `.ui-table-wrap` has `scrollWidth` at most `clientWidth` at 1366 with long event types and 64-hex hashes; actors and targets SHALL stay `<kind>: <id>` and the page SHALL send no `/people` request.

#### Scenario: One audit row keeps its ids and its time on one line
- **WHEN** `test_audit_page_keeps_actor_ids_and_one_line_times` opens `/admin/audit` at 1366 by 860 with `/audit/verify` answering ok, `/people` answering `u_carol`, and one `identity.group_mapped` event by `{ "kind": "user", "id": "u_carol" }` at `2026-11-18T09:15:00.123456Z` whose details hold a 200-character issuer, an `identity.memberships_synced` event whose target is `usr_01a1ed71-e612-7000-849d-10aa1e127a47`, and a `registry.block_imported` event whose details hold a 64-hex `contentHash` (test-plan-browser.md)
- **THEN** the region "Chain verification" has a `status` containing "Audit chain verified"; the row contains "user: u_carol" and not "Carol Example"; the `/people` hit list is empty; the cell "2026-11-18 09:15:00 UTC" is at most 24 px tall and the `.ui-table-wrap` has `scrollWidth <= clientWidth`; the two regions have tops within 1 px and the first ends at or before the second's left edge; `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

### Requirement: Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table — finding H-5a571db9
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Rejected hold: UI criterion C-3c7c4fbe has no end-to-end test; see the generated UI tests table
- **WHEN** the Grants page renders the Role or user field
- **THEN** the hint A role, for example author, or a user id from the Users page. is shown under that field, with the rows, badges, alerts, options, subject ids and layout of the scenario unchanged.
