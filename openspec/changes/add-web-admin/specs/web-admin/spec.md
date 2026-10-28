## Purpose

The web-admin capability gives a tenant administrator screens to manage users, teams and IdP group mappings and to read the audit log with its chain verification status.

## ADDED Requirements

### Requirement: Admin pages are listed by capability and declare literal paths
The web app SHALL offer four admin pages, each a feature file with a literal `path` under `/admin`, listed in the navigation only when `/api/v1/me` lists its capability.

#### Scenario: The page table
- **WHEN** `ADMIN_PAGES` is read and `dataTableModel` gets each of the five `ADMIN_TABLES` specs
- **THEN** it holds, in order, `admin-users` (`/admin/users`, "Users", `manage_users_roles`, file `60-admin-users.tsx`), `admin-roles-teams` (`/admin/roles-and-teams`, "Roles and teams", `manage_users_roles`, `61-admin-roles-teams.tsx`), `admin-group-mappings` (`/admin/group-mappings`, "Group mappings", `manage_users_roles`, `62-admin-group-mappings.tsx`) and `admin-audit` (`/admin/audit`, "Audit log", `read_audit`, `63-admin-audit.tsx`); `dataTableModel` throws for none and the captions are "Users", "Roles", "Teams", "Group mappings" and "Audit events"

#### Scenario: Navigation follows capabilities
- **WHEN** the four entries are registered (element `null`) in a fresh `createFeatureRegistry()` and `nav` is asked with `[]`, `["read_self", "read_audit"]` and `["manage_users_roles", "read_audit"]`
- **THEN** nothing throws and the labels are `[]`, `["Audit log"]` and `["Users", "Roles and teams", "Group mappings", "Audit log"]`

#### Scenario: A feature file declares the table's literals
- **WHEN** `featureLiterals` gets `export const feature = { id: "admin-users", path: "/admin/users", navLabel: "Users", capability: "manage_users_roles", element: <UsersPage /> };`, the same with `path: adminPath`, and the text of each file named in `ADMIN_PAGES`, read from `web/src/features/`
- **THEN** the first result is `{ id: "admin-users", path: "/admin/users", navLabel: "Users", capability: "manage_users_roles" }`, the second `null`, and each file's result equals its entry without `file`

### Requirement: Admin errors show catalogue text and the refusal's decision id
The web app SHALL give the six codes added by the admin API their own text, never show the server's message, and append the decision id to a refusal that carries one.

#### Scenario: The six codes
- **WHEN** `registerAdminMessages()` runs twice and `messageFor` is called for each code of `ADMIN_MESSAGES`
- **THEN** nothing throws, the keys are exactly `ALREADY_EXISTS`, `IN_USE`, `ELEVATION_REFUSED`, `DIRECT_GRANT_REFUSED`, `UNKNOWN_ISSUER` and `OPERATION_REFUSED` with the texts of task 2.1, and each `messageFor` answer equals its entry and differs from `FALLBACK_MESSAGE`

#### Scenario: Error text for an action
- **WHEN** `adminErrorMessage` gets `ApiRequestError(409, "IN_USE", "raw SQL")`, `ApiRequestError(422, "OPERATION_REFUSED", "x", { details: { reason } })` for `self_disable` and `other`, and `ApiRequestError(403, "FORBIDDEN", "x", { details: { decisionId: "d-1" } })`
- **THEN** the answers are the `IN_USE` entry without "raw SQL", "You cannot disable your own account.", the `OPERATION_REFUSED` entry and `messageFor("FORBIDDEN")` followed by " Decision id: d-1"

### Requirement: The Users page lists people and disables or enables them
The Users page SHALL list people with name, email and state, offer a Disable or Enable button named after the person on every row but the user's own, and confirm only a disable.

#### Scenario: Parsing an account
- **WHEN** `parseAccount` gets `{ userId: "u_bob", kind: "human", ownerUserId: null, displayName: "Bob Example", email: "bob@example.test", state: "active" }`, and bodies with `state: "deleted"`, `userId: "../x"`, a 201-character `displayName` and `null`
- **THEN** the first result is the same without `ownerUserId` and every other result is `null`

#### Scenario: Cells and actions
- **WHEN** `accountCells` and `accountAction` get Bob (active), Bob disabled, and Bob with `selfId` "u_bob"
- **THEN** Bob's cells are `{ name: "Bob Example", email: "bob@example.test", state: "Active" }` and his action has `kind: "disable"`, `buttonLabel: "Disable Bob Example"`, `confirm.title` "Disable Bob Example?", `confirm.action` "Disable user", the description of task 3.1 and `done: "Disabled Bob Example."`; disabled Bob has state "Disabled", `kind: "enable"`, `buttonLabel: "Enable Bob Example"`, `confirm: null` and `done: "Enabled Bob Example."`; the own row is `{ kind: "none", note: "This is your account" }`

#### Scenario: Setting a state
- **WHEN** `setAccountState` runs with a recording client for `("u_bob", "disabled")`, with a client that answers `{}`, and for `userId` "../x"
- **THEN** the client got `patch("/users/u_bob", { state: "disabled" })` and the result has `state: "disabled"`; the second call rejects with `ApiRequestError` code `INVALID_RESPONSE`; the third rejects with `RangeError` and sends nothing

### Requirement: The Roles and teams page lists roles and teams and creates or deletes a team
The Roles and teams page SHALL list roles read-only and teams, create a team from a validated name with a fresh `Idempotency-Key`, and delete a team only after a confirmation that names it.

#### Scenario: Names
- **WHEN** `parseNamed` gets `{ roleId: "tenant_admin" }` for `roleId`, `{ roleId: "Tenant" }`, and `{ teamId: "finance" }` for `teamId`; and `checkTeamId` gets " ops ", "" and "Ops"
- **THEN** `parseNamed` gives "tenant_admin", `null` and "finance"; `checkTeamId` gives `{ ok: true, value: "ops" }`, `{ ok: false, message: "Enter a team name." }` and, for "Ops", `{ ok: false, message }` with the message of task 4.1

#### Scenario: Creating and deleting
- **WHEN** `createTeam` runs with a recording client for `("ops", "key-1")`, with a client that answers `{}`, and for team "Ops"; `deleteTeam` runs for "ops" and for "../x"; and `deleteTeamConfirm("ops")` is read
- **THEN** the client got `post("/teams", { teamId: "ops" }, { headers: { "Idempotency-Key": "key-1" } })` and the result is "ops"; the second call rejects with `INVALID_RESPONSE`; the third rejects with `RangeError` and sends nothing; the delete got `delete("/teams/ops")` and resolved to `undefined`, "../x" rejects with `RangeError`; the confirmation has `title` "Delete team ops?" and `action` "Delete team"

### Requirement: The Group mappings page maps a group to one role or team
The Group mappings page SHALL list mappings, offer a form (issuer pre-filled from the first mapping, group, one role or team) that sends nothing it cannot validate, and confirm before removing a mapping, warning for `tenant_admin`.

#### Scenario: Parsing, showing and offering mappings
- **WHEN** `parseGroupMapping` gets `{ issuer: "https://idp.example/realms/u", group: "ursitoare-authors", roleId: "author", teamId: null, reviewedBy: "operator:e2e-seed" }`, the same with `roleId: null, teamId: "finance"`, and bodies with both targets set, neither set and `group: ""`; `mappingCells` gets the first two; `grantOptions(["author", "auditor"], ["finance"])` is read; and `defaultIssuer` gets `[]` and two mappings with issuers "https://a.example/r" then "https://b.example/r"
- **THEN** the first two parse to themselves and the others are `null`; the options are `role:author` "Role: author", `role:auditor` "Role: auditor" and `team:finance` "Team: finance" (`value`, `label`); the issuers are "" and "https://a.example/r"; the cells are `{ group: "ursitoare-authors", grants: "Role: author", issuer: "https://idp.example/realms/u", reviewedBy: "operator:e2e-seed" }` and, for the second, `grants: "Team: finance"`

#### Scenario: Building the request
- **WHEN** `mappingRequest` gets, with those options, issuer " https://idp.example/realms/u ", group " ursitoare-auditors " and grant "role:auditor" (then "team:finance"); an empty issuer, empty group and grant ""; group "a\nb"; a 256-character group; and grant "role:root"
- **THEN** the results are `{ ok: true, body: { issuer: "https://idp.example/realms/u", group: "ursitoare-auditors", roleId: "auditor" } }` (with `teamId: "finance"` and no `roleId` for the team); `{ ok: false, errors }` holding a message each for `issuer`, `group` and `grant`; errors for only `group` (line breaks), only `group` (length) and only `grant: "Choose a role or a team."`; the messages are those of task 5.1

#### Scenario: Saving a mapping and reading every page
- **WHEN** `setMapping` runs with a recording client for the first body above; `loadAllItems` runs over a fetcher that answers `{ items: [1, 2], next_cursor: "c1" }` then `{ items: [3], next_cursor: null }`, over a fetcher with endless pages `c1`, `c2`, and so on, and over one that rejects `ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x")`
- **THEN** the client got `put("/idp-group-map", body)` and the result is the parsed mapping; the first fetcher got `{ cursor: null, limit: 200 }` then `{ cursor: "c1", limit: 200 }` and the result is `[1, 2, 3]`; the endless fetcher was asked five times; the third call rejects with that same error

#### Scenario: Removing a mapping needs a confirmation that states the consequence
- **WHEN** `removeMappingConfirm` gets the mapping of "ursitoare-authors" to role `author`, of "team-finance" to team `finance`, and of "ursitoare-admins" to role `tenant_admin`
- **THEN** the first has `title` "Remove the mapping for ursitoare-authors?", `action` "Remove mapping" and `description` "Members of this group lose the role author at once."; the second ends "lose the team finance at once."; the third adds the warning of task 5.2 that nobody can manage users if no other group maps to `tenant_admin`

### Requirement: The Audit log page lists events newest first and filters by event type
The Audit log page SHALL list events from `GET /api/v1/audit` in a captioned table, show actor, target and payload as text, and filter by one valid event type.

#### Scenario: Parsing an event and its cells
- **WHEN** `parseAuditEvent` gets `{ seq: "17", at: "2026-10-25T09:00:00.123456Z", eventType: "identity.group_mapped", actor: { kind: "user", id: "u_carol" }, target: null, payload: { group: "ursitoare-auditors" }, origin: "ursitoare" }`, and bodies with `seq: "017"`, `eventType: "Bad"` and `payload: []`; and `auditCells` gets the event, the event with `payload: {}` and `target: { kind: "action", id: "manage_users_roles" }` and one with `at: "not a time"`
- **THEN** the first result is the event without `origin`, the others `null`; the cells are `{ seq: "17", time: "2026-10-25 09:00:00 UTC", type: "identity.group_mapped", actor: "user: u_carol", target: "—", details: "{\"group\":\"ursitoare-auditors\"}" }`; `details: "—"` with `target: "action: manage_users_roles"`; and `time: "not a time"`

#### Scenario: The event type filter and the request
- **WHEN** `parseEventTypeFilter` gets "  ", " authz.denied " and "Authz"; and `auditFetcher(client, "authz.denied")` is called with `{ cursor: null, limit: 25, signal }` and then with `cursor` "c1", `auditFetcher(client, null)` once, and the client answers an item `{ seq: "x" }`
- **THEN** the filters give `{ ok: true, value: null }`, `{ ok: true, value: "authz.denied" }` and `{ ok: false, message }` (task 6.1); the client got `get("/audit", { query: { event_type: "authz.denied", limit: 25 }, signal })`, then the query with `cursor: "c1"` added, then `{ query: { limit: 25 }, signal }`; the last call rejects with `INVALID_RESPONSE`

### Requirement: The Audit log page shows whether the chain verifies
The Audit log page SHALL call `GET /api/v1/audit/verify` on opening and on request and show one status, in words: checking, verified, broken at an event number, or unavailable.

#### Scenario: Parsing and loading a verification
- **WHEN** `parseVerification` gets `{ ok: true, checked: 42, firstBadSeq: null, reason: null, fromSeq: "1", anchorsChecked: true, checkedAt: "2026-10-25T09:00:00.000Z" }` and bodies with `ok: true, firstBadSeq: "17"`, `checked: -1` and no `checkedAt`; `loadVerification` runs with a recording client, with and without a signal, and with a client that answers `{ ok: "yes" }`
- **THEN** the first result is the same without `fromSeq` and the others are `null`; the client got `get("/audit/verify", { signal })` then `get("/audit/verify", {})`; the third call rejects with `INVALID_RESPONSE`

#### Scenario: Status text
- **WHEN** `verificationView` gets `checking`; done with `checked: 42` and anchors checked; done with `checked: 0`; done with `ok: false, firstBadSeq: "17", reason: "hash"`; and `failed` with `ApiRequestError(403, "FORBIDDEN", "x", { details: { decisionId: "d-9" } })` (`checkedAt` "2026-10-25T09:00:00.000Z")
- **THEN** the tones are `checking`, `ok`, `ok`, `broken` and `unavailable`; the headlines are "Checking the audit chain", "Audit chain verified" (twice), "Audit chain broken" and "Verification unavailable"; the details are those of task 6.2, for example "42 events checked, head anchors included. Checked at 2026-10-25 09:00:00 UTC."; the broken one names event 17 and its reason, and the last is the `adminErrorMessage` of that error

### Requirement: Admin styles use the kit's tokens and no inline styles
`web/src/admin/admin.css` SHALL take every colour from the kit's `--ui-color-*` tokens.

#### Scenario: The stylesheet
- **WHEN** `web/src/admin/admin.css` is read with `web/src/kit/tokens.css`
- **THEN** `findRawColours` and `findInlineStyleUse` report nothing, every `var(--ui-…)` names a property `parseTokens` finds in `tokens.css`, and the rules `.admin-status--ok`, `--broken`, `--unavailable` and `--checking` use the `success`, `danger`, `danger` and `info` text and surface pairs of the kit's contrast check

### Requirement: The admin logic works against the real engine
The admin logic SHALL work against the e2e stack's engine: an administrator manages mappings, teams and people and reads a verified log, and an author is refused with a decision id the administrator finds in it.

#### Scenario: Carol manages mappings and teams and reads the log
- **WHEN** carol signs in and, over her session, `loadAllItems` reads `/roles`, `/teams` and `/idp-group-map`, `setMapping` maps "ursitoare-auditors" to role `auditor` with `defaultIssuer`, `createTeam` makes "ops" twice with key "k-1" and once with "k-2", `deleteTeam` runs for "ops", she reads `auditFetcher(client, "identity.group_mapped")` and `loadVerification(client)`, and `removeMapping` removes the new mapping
- **THEN** the roles include `tenant_admin`, `author`, `approver`, `auditor`, the teams are `["finance"]` and the mappings are the four seeded ones; the mapping has `roleId` "auditor"; both creates with "k-1" return "ops"; "k-2" rejects with code `ALREADY_EXISTS`; deleting "ops" and removing the mapping resolve; an audit item has `payload.group` "ursitoare-auditors"; the verification has `ok: true`, `anchorsChecked: true`, `checked` at least 1

#### Scenario: Alice is refused and carol finds the id and disables her
- **WHEN** alice signs in and reads `/users`; carol reads `auditFetcher(client, "authz.denied")`, runs `setAccountState` for alice's id with "disabled", disables her own id, and sets alice "active"; and alice reads `/users` while disabled
- **THEN** alice's first call rejects with `ApiRequestError` status 403 and code `FORBIDDEN`, `errorPanelModel(error).decisionId` is a non-empty text and an item of carol's page has `payload.decisionId` equal to it; the first state change returns `state: "disabled"`; alice's call while disabled rejects with status 401 and code `UNAUTHENTICATED`; carol's own disable rejects with code `OPERATION_REFUSED` and `adminErrorMessage` answers "You cannot disable your own account."; the last change returns `state: "active"`

### Requirement: The M2 journey proves the admin screens in a browser
The journey `e2e/test_m2_admin.py` SHALL show carol mapping a group and reading a verified log, alice refused with a decision id, carol disabling and enabling alice, and a team created and deleted, with `assert_accessible(page)` on every page.

#### Scenario: Carol maps a group and the audit log shows it verified
- **WHEN** carol signs in, opens "Group mappings", fills Group with `<i>ursitoare-auditors</i>`, chooses "Role: auditor" in Grant, presses "Map group", then opens "Audit log" and filters by Event type "identity.group_mapped"
- **THEN** the navigation lists "Users", "Roles and teams", "Group mappings" and "Audit log"; the table "Group mappings" has a row for "ursitoare-authors" and a row showing the text `<i>ursitoare-auditors</i>` and "Role: auditor", with no `i` element; "Audit chain verified" is shown; the table "Audit events" has a row showing "ursitoare-auditors"

#### Scenario: Alice sees a 403 page with the decision id
- **WHEN** alice signs in and opens `/admin/users` by address, and carol, in a second context, filters her Audit log by "authz.denied"
- **THEN** alice's navigation has no "Users" link; her page shows an alert "Not allowed" with "Decision id:" and a "Copy decision id" button; carol's table "Audit events" has a row showing the same id

#### Scenario: Carol disables and enables alice
- **WHEN** alice is signed in in a second context, carol opens "Users", presses "Disable Alice" and "Disable user" in the dialog, alice opens `/admin/users`, and carol presses "Enable Alice"
- **THEN** carol's own row shows "This is your account" and no button; alice's row shows "Disabled" then "Active"; the heading "Users" has focus after each change; alice's URL begins with `/sign-in?error=SESSION_ENDED`

#### Scenario: Carol creates and deletes a team
- **WHEN** carol opens "Roles and teams", fills "Team name" with "ops", presses "Create team", then "Delete team ops" and "Delete team" in the dialog, then the same for "finance"
- **THEN** the table "Roles" lists `tenant_admin`, `author`, `approver`, `auditor`; the table "Teams" gets the row "ops" and loses it; "still in use" is shown and the row "finance" stays
