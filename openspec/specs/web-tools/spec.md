# web-tools Specification

## Purpose
A tenant admin reads tool servers and surfaces, approves a surface, manages grants, and validates and deploys the tenant's policy in the browser.

## Requirements

### Requirement: A tool server is parsed strictly, read as a row and explained by its state
`parseToolServer` SHALL return a `ToolServerView` for an object whose members match design.md § Parsing and `null` for anything else. The view's tools SHALL be those of the answer's `pendingSurface` when it holds one, else of its `approvedSurface`, else of the record's own `tools` (a list item and an approve answer hold no surface), with the defaults of design.md § Parsing. It SHALL ignore every other member and not change its input. `serverRowText` SHALL give `${id} · ${origin} · ${state}`, `toolRows` one `{ name, effect, block, result, call }` per tool (`block` the ref or "—", `result` "untrusted" or "trusted", `call` `<method> <path>` or "—"), and `stateNote` a text naming the short digests for `pending` and `drifted` and `null` for `approved`.

#### Scenario: Tool servers are parsed, ignored members stay out and the texts are fixed
- **WHEN** `parseToolServer` gets `RAW`, `APPROVED`, `DRIFT_RAW`, `LISTITEM` and the 23 malformed values of test-plan.md § Tool servers; `serverRowText`, `toolRows` and `stateNote` run on their views
- **THEN** `RAW` gives `VIEW` and stays unchanged; `DRIFT_RAW` gives `DRIFT_VIEW`, the pending surface's tools only (a changed effect, a new tool, no removed tool); `LISTITEM` gives `FLAT`; each malformed value gives `null`; texts and rows are the plan's

### Requirement: Approval compares the approver with the pending surface's submitter under the tenant's review profile
`approvalView(s, me)` SHALL return `{ canApprove: false, selfApproval: false, message: "Nothing to approve." }` when `s.pendingDigest` is null; else, when `s.pendingSubmittedBy` equals `me.userId`, `{ false, false, "Another admin must approve this surface." }` for `team` and `{ true, true, <a note that approving is recorded as a self-approval> }` for `solo`; else `{ true, false, null }`. It SHALL never read `registeredBy`; an unnamed submitter blocks nobody, the engine decides (design decision 2).

#### Scenario: Nothing pending, team, solo, drifted and an unknown submitter
- **WHEN** `approvalView` runs on the rows of test-plan.md § approvalView rows with `me` `u_carol`
- **THEN** each row gives the table's triple: `NONE` nothing to approve; `MINE` blocked in a team and a self-approval in a solo tenant; `OTHER`, `DRIFT` and `UNKNOWN` (no submitter) `true`, `false`, `null`

### Requirement: An approval is requested explicitly and its refusals are explained
`approveRequest(s, me, { ticked, ownSurface })` SHALL refuse with the `approvalView` message when `canApprove` is false, with the Tick message of design.md § Messages when the box is shown (`selfApproval` of the view, or `ownSurface`) and `ticked` is false, and otherwise return `{ ok: true, body: { digest: s.pendingDigest, selfApproval } }`, `selfApproval` being true exactly when the box is shown. `approveDialog` SHALL give the title `Approve surface <12 characters after sha256:>?`, a description and the action "Approve surface" (`null` with nothing pending). `approveFailure` SHALL give the `toolsErrorMessage`, `ownSurface` true exactly for `self_approval_required` and `reload` true exactly for `digest_mismatch` and `nothing_pending`. `toolsErrorMessage` SHALL give the text of design.md § Messages for the reason of a 422 `OPERATION_REFUSED`, else the kit's text for the code, and append " Decision id: <id>" to a 403 that carries one.

#### Scenario: Requests, dialog and failure texts
- **WHEN** `approveRequest`, `approveDialog`, `approveFailure` and `toolsErrorMessage` run on the rows of test-plan.md § Approval requests
- **THEN** `MINE` solo unticked gives the Tick message and ticked `selfApproval: true`; `UNKNOWN` solo gives `selfApproval: false`, and with `ownSurface` true the Tick message unticked; the dialog is `Approve surface 0123456789ab?` (`null` for `NONE`); the failure rows carry `ownSurface` and `reload` as the requirement says; each of the 13 reasons gives its text

### Requirement: A grant is parsed, read as a row and offers the actions its status allows
`parseGrant` SHALL read a list item `{ grant, status }` (the flat record with `status` beside it is malformed) into `{ id, subject, tool, scope, status }` (subject `role <name>` or `user <id>`; scope `any step` or `<flow> / <node>`) and return `null` for anything U49's API cannot return: a `status`, id, tool, role, user id, flow id or node id outside design.md § Parsing, a subject or scope of another `kind` or missing a member. It SHALL ignore the record's other members. `grantRowText` SHALL give `${subject} · ${tool} · ${scope} · ${status}`; `grantActions` SHALL allow revoke unless the status is `revoked` and confirm only for `needs_reconfirm`.

#### Scenario: Each subject and scope, the list item and the malformed items
- **WHEN** `parseGrant`, `grantRowText` and `grantActions` run on the rows of test-plan.md § Grants and its 17 malformed values
- **THEN** the item `{ grant: REC(), status }` gives the table's view, the flat `{ ...REC(), status }` gives `null`, the other rows give their views, row texts and actions; `GRANT_DONE` is `{ created: "Grant created.", revoked: "Grant revoked.", confirmed: "Grant confirmed for the newest version." }`; each malformed value gives `null`

### Requirement: A grant draft becomes the API body or names the field to fix
`grantBody` SHALL trim the subject, flow and step, check in order the subject, the tool (U49's stored-tool pattern) and, for the scope `node`, the flow and the step against the patterns of design.md § Parsing (those of `parseGrant`), and return the first failure as `{ ok: false, field, message }` with `field` `subject`, `tool`, `flowId` or `nodeId` (the form's field names). Otherwise it SHALL return `{ ok: true, body }` with `body` `{ subject: { kind: "role", role } | { kind: "user", userId }, tool, scope: { kind: "any_step" } | { kind: "node", flowId, nodeId }, args: [] }`; for `any_step` the flow and step are ignored.

#### Scenario: Role, user and node drafts and the refused fields
- **WHEN** `grantBody` runs on the rows of test-plan.md § grantBody
- **THEN** the bodies are the table's; a bad flow under an any-step scope is ignored; `acme.lookup_vendor@999999999` gives its body, `@1000000000` and `@01` the field `tool`; each refusal names its field and has the text of its row

### Requirement: Loading, failure, empty, busy and approve states are decided by pure models, not by the pages
`regionState(load, isEmpty?)` SHALL give `{ view, actionsDisabled }`: `loading` and `error` with `actionsDisabled` true; `ready`, or `empty` when `isEmpty(value)` (a policy not yet deployed is empty and can still be deployed), with it false; another phase is a `RangeError`. `actionState(a)` SHALL give `disabled` true only while `busy`, and for `done` or `failed` a `status` `{ role: "status" | "alert", text }`; an empty text or another phase is a `RangeError`. `approveControl(s, me, busy)` SHALL be disabled, without message or self-approval, while `s` or `me` is null; else it is `approvalView(s, me)` with `disabled` true when `busy` or not `canApprove`.

#### Scenario: Region, action and approve-control states
- **WHEN** `regionState`, `actionState` and `approveControl` run on the rows of test-plan.md § Page states
- **THEN** each row gives the table's result; the approve control is disabled for no server, no session, a team submitter, nothing pending and a request in flight; an unknown phase and an empty text are `RangeError`

### Requirement: The calls use the right routes and headers and refuse unreadable answers
The nine calls (`loadToolServer` to `deployPolicy`) SHALL call the client with the paths, bodies and options their frozen tests assert (paths without `/api/v1`); only `postGrant` and `deployPolicy` send an `Idempotency-Key` header, and the confirm sends `{}`, which means the newest version. An id outside its pattern, a blank key and an invalid draft SHALL reject with `RangeError` before a call (the functions are `async`: none throws synchronously); an answer a parser refuses SHALL reject with `ApiRequestError` status 200, code `INVALID_RESPONSE` (`approveToolSurface` reads the `server` of U47's answer, a record without surfaces; the three grant calls a record with a valid `id`). `loadToolRefs` SHALL resolve `{ refs, complete }`: the `ref` of each bound item of `GET /blocks` in the order read, following `next_cursor` for at most 100 pages of 100, with `complete` false exactly when the 100th page still has a non-null `next_cursor`; it SHALL never reject for that reason. `toolListNote(list)` SHALL give "Only the first 10,000 tools are listed." for an incomplete list and `null` for a complete one, and the grant form SHALL show it when it is not `null`.

#### Scenario: Calls of the three pages
- **WHEN** the nine calls run against a recording fake as the frozen `calls.test.ts` runs them, and `loadToolRefs` runs on rows T1 and T2 of test-plan.md § Tool list
- **THEN** the records, results and rejections are those the frozen tests assert; T1 resolves `{ refs: ["acme.lookup_vendor@1", "acme.create_payment@1"], complete: true }` over two requests, and for a cursor that is never null T2 makes 100 requests and resolves `acme.t1@1` to `acme.t100@1` with `complete: false`

#### Scenario: The tool list is read for up to 100 pages and says when it is cut off
- **WHEN** `loadToolRefs` and `toolListNote` run on rows T3 and T4 of test-plan.md § Tool list
- **THEN** T3 (the 100th page ends the list) is `complete: true` after 100 requests; T4 gives `{ refs: [], complete: true }`, the note and `null` of `toolListNote`, `INVALID_RESPONSE` for an unreadable item and the rethrown 500

### Requirement: The policy view, validation and deployment read as fixed texts
`parsePolicyView` SHALL read `{ current, pendingGrants }` into `{ version, source, pendingGrants }` and return `null` for a `pendingGrants` that is not a non-negative safe integer, or a `current` that is neither null nor `{ version, source }` with a 64-hex version and at most 65,536 code points. `validationText`, `deployText`, `currentText` and `pendingText` SHALL give the texts of test-plan.md § Policies (`validationText` writes "Not valid: " and the problems joined by `; `, each `<stage>`, ` <ids joined by ", ">` when there are ids and `: <message>` when the message is not empty; a problem without a string `message` is malformed); `checkPolicySource` SHALL refuse more than 65,536 code points; `policyErrorText` SHALL show a `policy_invalid` refusal through `validationText` (its problems read strictly) and any other error through `toolsErrorMessage`.

#### Scenario: Policy views and texts
- **WHEN** `parsePolicyView`, `validationText`, `deployText`, `currentText`, `pendingText`, `checkPolicySource` and `policyErrorText` run on the values of test-plan.md § Policies
- **THEN** `REC` gives `{ version: V, source: SRC, pendingGrants: 2 }`, each of the 11 malformed values `null`; texts are the plan's ("All grant changes are deployed." for 0); 65,536 `é` and 65,536 U+1F600 pass the source check, 65,537 `a` fail with "The policy must be at most 65,536 characters."

### Requirement: The pages carry fixed names, tables and links and use kit components and tokens only
`TOOL_PAGES`, `TOOL_TITLES`, `TOOL_TABLES` and `TOOL_NAMES` SHALL hold the values of test-plan.md § Pages and design.md § Roles and names. `serverLink(id)` SHALL be `/admin/tool-servers?server=${id}` (`RangeError` outside the id pattern), `serverIdFromSearch` the first `server` parameter that matches it, else `null`. The `.tsx` and `.css` files of `web/src/tools/` SHALL hold no raw colour, inline style or `dangerouslySetInnerHTML`, and the pages SHALL use `DataTable`, `Form` and `ConfirmDialog`. Each page file SHALL also contain the tokens of test-plan.md § Page sources.

#### Scenario: Names, tables, links and sources
- **WHEN** `tools/pages.test.ts` builds `dataTableModel` for the three tables, calls `serverLink` and `serverIdFromSearch` on test-plan.md § Pages, and reads `tools.css` and the page files
- **THEN** the cell tags are `th, td`, `th, td, td, td, td` and `th, td`; links and searches are the plan's; `findRawColours` and `findInlineStyleUse` give `[]` on the css and each page (a colour word is a hit), no page has `dangerouslySetInnerHTML`, every `var(--…)` of the css is a token of `kit/tokens.css`, the pages contain `DataTable`, `Form`, `ConfirmDialog`, their `TOOL_NAMES` keys and the tokens of § Page sources; `TOOL_NAMES` is design § Roles and names

### Requirement: Three feature files register the pages and gate the navigation by capability
`web/src/features/64-admin-tool-servers.tsx`, `65-admin-grants.tsx` and `66-admin-policies.tsx` SHALL each export `feature` with the string literals of the matching `TOOL_PAGES` row and call `registerToolMessages()`.

#### Scenario: Features and navigation
- **WHEN** `featureLiterals` reads the three feature files, `TOOL_PAGES` is registered in a fresh registry, and `visibleNav` runs for carol, alice, a `deploy_policy`-only state and `null`
- **THEN** the literals are `admin-tool-servers` / `/admin/tool-servers` / "Tool servers" / `register_tool_server`, `admin-grants` / `/admin/grants` / "Grants" / `deploy_policy` and `admin-policies` / `/admin/policies` / "Policies" / `deploy_policy`; each file contains `registerToolMessages();`; the labels are all three for carol, none for alice, "Grants" and "Policies" for the `deploy_policy`-only state, none for `null`

### Requirement: The pages show the loading, failure and outcome states of the API's answers
Each page SHALL render what `regionState` and `actionState` return, call the helper its control names and set its tab title to `TOOL_TITLES`. A control with `aria-disabled="true"` SHALL do nothing when clicked, with no request and no dialog: "Approve surface", "Validate" and "Deploy" while the server detail or policy view loads or has failed, "Create grant" while the tool list loads or has failed, "Revoke" and "Confirm for the newest version" while an action is busy. The link named a server id SHALL load that server in the page. An unticked needed box SHALL make "Approve surface" show the `approveRequest` message as an alert and open no dialog; the box SHALL be unticked each time a detail loads; a refusal SHALL be an alert, and the detail SHALL be read again when `approveFailure` says `reload` and after an approval. A refused create SHALL show its `toolsErrorMessage` on the field of design.md § Messages or as the form error and keep the draft and its `Idempotency-Key`; a created grant SHALL reset the form; a failed revoke or confirm SHALL be an alert; a created, confirmed or revoked grant SHALL show its `GRANT_DONE` text and reload the table "Grants" from page one; the select "Tool" SHALL offer the bound refs only; an accepted "Deploy" SHALL reload the policy view. Steps: test-plan-browser.md.

#### Scenario: The server detail loads, fails, is refused and is approved
- **WHEN** the steps of test-plan-browser.md § Servers 1 run: carol opens `/admin/tool-servers?server=acme` and clicks the `aria-disabled` "Approve surface"; the detail is held, 500, pending, pending with another digest, then approved; the approve route answers 422 `digest_mismatch`, then 200
- **THEN** "Loading", an alert, then the pending server with its tools; the click opens and posts nothing; the dialog posts `{ digest: DP, selfApproval: false }` and the refusal shows the `digest_mismatch` text and "Pending surface fedcba987654." (4 detail requests); the second approval reads the detail a fifth time and shows "Surface approved." and the approved tools with refs

#### Scenario: A server opened from its link is approved by its submitter
- **WHEN** the steps of § Servers 2 run in a solo tenant: carol follows the link `acme` (she is the submitter), clicks "Approve surface" unticked, ticks the box, reloads, ticks and approves; then opens a detail without a submitter, approves, is refused 422 `self_approval_required`, ticks the box that appears and approves
- **THEN** the link reads the detail once, with no page load; the unticked click shows the Tick alert and posts nothing; the box is unticked after the reload; the approvals post `selfApproval` `true`, `false`, `true`; the refusal shows its text and the box, with no detail request

#### Scenario: A grant is created, confirmed and revoked, and the table reloads
- **WHEN** the steps of § Grants 1 run: the list is 403, then ready and the tool list 500, then ready; the `aria-disabled` "Create grant" is clicked; a create (422 `user_unknown`, then 201), a confirm (422 `revoked`, then 200) and a revoke (500, then 200) are each clicked twice
- **THEN** the 403 is an alert with the decision id; a failed tool list leaves the select on "Choose a tool" and the click posts nothing, a ready one offers the bound refs only; the refused create shows "That user does not exist." beside "Role or user" and its retry has the same `Idempotency-Key`; a refused confirm or revoke is an alert with no table request; each success shows its `GRANT_DONE` text and is followed by a table request (the create also resets the form); the requests are the plan's, with no dialog

#### Scenario: The policy loads, validates and deploys
- **WHEN** the steps of § Policies run: `GET /policies` is held, 500, then `{ current: null, pendingGrants: 1 }`, then `{ current: REC, pendingGrants: 0 }`; carol clicks the `aria-disabled` "Validate" and "Deploy", validates `permit (` and `SRC`, and deploys twice (422 `policy_invalid` for `t-1`, then 201)
- **THEN** "Loading", an alert, "No policy deployed." and "1 grant change is not deployed."; the early clicks post nothing; the validations read "Not valid: parse: unexpected end of input" and "Valid."; the deploys read "Not valid: policy t-1" and, under a new `Idempotency-Key`, "Deployed version 599ac6e14025.", then "Current version 599ac6e14025" and "All grant changes are deployed." after a fourth request

### Requirement: The three tool pages are built from PageHeader, Section and the page widths
`ServersPage.tsx`, `GrantsPage.tsx` and `PoliciesPage.tsx` SHALL each render `PageHeader` with its current `h1` text, no `<h1`, no `style=`, no `tools.css` import and no colour word or hex (`findRawColours` `[]`), and keep the C-ba990588 substrings. Roots SHALL be `cn("tools-page", PAGE_WIDTHS.list)` for Servers and Grants and `cn("tools-page", PAGE_WIDTHS.form)` for Policies. The surface block SHALL be `<Section title={TOOL_NAMES["surfaceHeading"] ?? "Surface"}>`, the grant form `<Section title={label("grantForm")}>`; Grants SHALL pass `description={label("deployHint")}`. Servers SHALL call `useDisplayNames(` and `personLabel(` once each; Grants and Policies SHALL import nothing from `web/src/people/`. `tools.css` SHALL stay token-only, hold no `max-width`, no `.tools-section` and no `.tools-form` rule, and give `.tools-feedback[role="status"]` the success pair and `.tools-feedback[role="alert"]` the danger pair.

#### Scenario: The tool sources use the layout parts and keep their pins
- **WHEN** `tools/tools-pages-restyle.test.ts` reads the three page sources and `tools.css` with `tokens.css` (test-plan.md T3)
- **THEN** every T3 row holds: `<PageHeader` once per page, `findRawColours` `[]`, `findInlineStyleUse` `[]`, `findCssImports` `[]`, the five C-ba990588 substrings per page, `data-tone="primary"` once in Servers (the approve button) and once in Policies (Deploy) and not in Grants, `<ConfirmDialog` once in Servers without `destructive`, none in Grants (no confirm for "Revoke"), `xl:grid-cols-[20rem_minmax(0,1fr)]` in Grants, `people/` imported by Servers only, `className="tools-feedback"` on the message `<p` of all three; `tools.css` has `findRawColours` `[]`, every `var(--…)` defined in `tokens.css`, `.tools-feedback[role="status"]` with `--ui-color-success-text` on `--ui-color-success-surface`, `.tools-feedback[role="alert"]` with `--ui-color-danger-text` on `--ui-color-danger-surface`, no `max-width`; three mutated texts (`#fff` added, `style="x"` added, `destructive` added to Servers) fail the checker

### Requirement: The tool server detail names who registered the server outside the Surface region
With `?server=<id>` the page SHALL show the line `Registered by <personLabel>` after the servers table and before the region "Surface", never inside it, and SHALL send one `/people` request for `registeredBy`. The list and the Surface line SHALL be `serverRowText` with the state in a `Badge` of tone `serverStateTone(state)`, the composed text unchanged. "Approve surface" SHALL carry `data-tone="primary"`, and its confirm dialog, not being destructive, SHALL keep `data-tone="primary"`.

#### Scenario: Registered by Carol Example sits outside the region and the row text is unchanged
- **WHEN** `test_tool_servers_show_who_registered_outside_the_surface_region` opens `/admin/tool-servers?server=acme` at 1366 by 860 with the server `acme` pending, `registeredBy` `u_carol`, and `/people` answering `u_carol` as "Carol Example" (test-plan-browser.md), then clicks "Approve surface"
- **THEN** the region "Surface" contains "acme · https://tools.fake.test · pending" and has one `[data-slot="badge"]` with text "pending" and `data-tone` `warning`; the text "Registered by Carol Example" (`exact=True`) is visible and the same text inside the region has count 0; the `/people` queries are exactly `ids=u_carol`; the caption of "Tool servers" has the class `ui-table-caption ui-visually-hidden`; the button "Approve surface" has background `rgb(29, 78, 216)`; the dialog's heading is "Approve surface 0123456789ab?" and its confirm has `data-tone` `primary` and `rgb(29, 78, 216)`; `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

### Requirement: The Grants page keeps its errors, options and subject ids and shows status badges
Grants SHALL keep exactly 2 `alert`s when the tools and the grants both fail, the select "Tool" with the single option "Choose a tool" and the disabled "Create grant". With rows it SHALL show `grantRowText` with the status in a `Badge` of tone `grantStatusTone(status)`, the subjects as ids (`user u_bob`, `role author`), the hint "A role, for example author, or a user id from the Users page." under "Role or user", no `/people` request, no dialog, and the "New grant" card left of the table from 1280 px.

#### Scenario: Grants in the error state and with rows
- **WHEN** `test_grants_error_state_has_two_alerts_and_one_option` answers `/blocks` and `/grants` with 403 and a `decisionId`, and `test_grants_rows_keep_subject_ids_and_show_status_badges_beside_the_form` answers one active user grant, one `needs_reconfirm` role grant scoped to `pay-run` / `pay`, one block and `/people` (test-plan-browser.md), both at 1366 by 860
- **THEN** the first test finds 2 `alert`s, the options of "Tool" are exactly `["Choose a tool"]`, "Create grant" has `aria-disabled` `true`; the second finds the rows containing `user u_bob · acme.lookup_vendor@1 · any step · active` (badge `data-tone` `success`) and `role author · acme.lookup_vendor@1 · pay-run / pay · needs_reconfirm` (badge `warning`), the buttons "Revoke" and "Confirm for the newest version" visible, the caption of "Grants" hidden, the right edge of the region "New grant" at most the left edge of the table, and an empty `/people` hit list; both pass `assert_layout`, `assert_accessible` and `watch_csp` (`[]`)

### Requirement: The Policies page keeps one editor, bounded to the form width
Policies SHALL show its two status sentences in the header, the "Hand-written Cedar" editor in a `Card` at most 768 px wide, "Deploy" with `data-tone="primary"`, no `status` once loaded, and no heading other than the `h1`.

#### Scenario: Policies with no deployed policy
- **WHEN** `test_policies_page_has_no_status_once_loaded_and_a_bounded_editor` opens `/admin/policies` at 1366 by 860 with `/policies` answering `{ "current": null, "pendingGrants": 1 }` (test-plan-browser.md)
- **THEN** the texts "No policy deployed." and "1 grant change is not deployed." (both `exact=True`) are visible, the editor "Hand-written Cedar" is at most 768 px wide, "Deploy" has background `rgb(29, 78, 216)`, `status` has count 0, and `assert_layout`, `assert_accessible` and `watch_csp` (`[]`) pass

### Requirement: The Grants page keeps its errors, options and subject ids and shows status badges — regression 2
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: the Grants page is open at 1366 by 860 with the rows and with the error state of its two e2e test...
- **WHEN** the Grants page is open at 1366 by 860 with the rows and with the error state of its two e2e tests, and the Roles and teams, Group mappings, Audit log and Tool servers pages are open as in their tests in e2e/test_m6b_admin.py
- **THEN** in each of the regions "New grant", "Create team", "Map a group", "Chain verification", "Filter the audit log" and "Surface" the heading is on one line (its height is less than twice its font size) and every other child of the region starts at the heading's left edge within 1 px and at or below the heading's bottom edge.

### Requirement: A registration draft becomes the API request or names the field to fix
`mcpRegistration`, `previewRequest`, `openApiRegistration`, `codeRegistration` and the replacement builders `openApiReplacement` and `codeReplacement` (paths `/tool-servers/<id>/openapi` and `/tool-servers/<id>/code`, bodies `{ document, overlay }` and `{ tools }`, a `RangeError` for an id outside the server pattern) SHALL check a draft in the order and with the texts of design.md § Messages (Drafts) and return the first failure as `{ ok: false, field, message }`, else `{ ok: true, path, body }` with the paths and bodies of test-plan.md § Drafts (the overlay: the effects that are not `""`), never changing the draft.

#### Scenario: The three drafts become the registration requests or name the field to fix
- **WHEN** the rows M1 to M3, P1 to P3, O1, O2, C1 to C3, R1 and R2 of test-plan.md § Drafts run
- **THEN** M1 gives its body from a padded draft, P1 the origin `https://tools.fake.test` from `https://Tools.Fake.Test/`, O1 an overlay of two entries from three effects, C1 one tool without `description` and C3 with it; R1 and R2 the bodies of the PUT routes; every other row gives its `field` and text; the first failing field wins (P3, O2); no draft is changed

### Requirement: A preview is read strictly, the calls use their routes and a refusal lands on the form
`parsePreview` SHALL return `{ basePath, operations }` of `{ operationId, name, method, path, excluded }` for a preview answer and `null` for anything else. `previewOperations` and `registerServer` SHALL post the request's body to its path (`registerServer` with the header `Idempotency-Key`) and read the new id from `server.id` for the MCP path, else from `id`; `replaceServer` SHALL `PUT` the body of a replacement request and read `id`; `prefillEffects` SHALL give each non-excluded operation whose `name` is a given tool's name that tool's effect, keyed by `operationId`; `codeDraftOf` SHALL read the one code tool of a surface into a draft whose schemas are `JSON.stringify(x, null, 2)` and give `null` for any other surface, and `loadCodeDraft` SHALL read `GET /tool-servers/<id>` and use its pending surface, else its approved one; a path of another call and a blank key SHALL reject with `RangeError` before a call, an unreadable answer with `ApiRequestError` 200 `INVALID_RESPONSE`. `registrationFormErrors` SHALL return the form errors of design.md § Messages (Answers), reading an engine reason as its `REGISTER_REASONS` sentence and a 413 as its text.

#### Scenario: Previews, calls and refusals
- **WHEN** `parsePreview` gets `PV` and the 8 malformed values, and rows K1 to K6 and E1 to E4 of test-plan.md § Preview, calls and answers run
- **THEN** `PV` gives three rows with their `name`, without `version`, and stays unchanged, each malformed value `null`; K1 to K6 give the plan's records, ids (K2 `{ id: "crm" }` from the MCP answer's `server`), effects, drafts, `RangeError`s and `INVALID_RESPONSE` rejections; E1 to E4 give the plan's form errors (E2 `source` and `name` from `body/tools/<i>/<k>`, E4 the sentence of each of the 14 reasons, an unknown one unchanged, the 413 text)

### Requirement: A credential is read without its secret, and its body, texts and refusals are fixed
`parseCredential` SHALL return the five members of `CredentialView` for a credential record and `null` for anything else, reading no other member. `credentialBody` SHALL check the header (API key only), then the value, as design.md § Messages (Credentials) says, omit `headerName` for a bearer token and throw `RangeError` for an id outside the server pattern; no message SHALL hold the value. `credentialText` and `credentialErrors` SHALL give the texts of that section.

#### Scenario: A credential view never carries a secret and its body, texts and refusals are fixed
- **WHEN** `parseCredential` gets `CREC()`, the hostile record with `value` and `secret` and the 8 malformed values, and rows B1, B2, T1 and T2 of test-plan.md § Credentials run
- **THEN** the views are `CV()`, `CV()` (its `JSON.stringify` has no `s3cr3t`) and `null`; B1 and B2 give the plan's bodies, refusals (`VAL_T` never holding `s3`) and `RangeError`; T1 and T2 give the plan's texts, among them "Code blocks need no credential." for a code-block server whatever is stored

### Requirement: The credential calls page the list and send the secret only in the body
`loadServerCredential` SHALL read `GET /credentials` (`limit` 200, the cursor, at most 50 pages) and resolve the first credential of the server or `null`; `storeCredential` SHALL post the body to `/credentials` with `Idempotency-Key`, `rotateServerCredential` `{ value, authScheme }` and, for an API key, `headerName` to `/credentials/<id>/rotate` with no header, checking its draft as `credentialBody` does. A bad id, a blank key, a body that is not an object and a bad value SHALL reject with `RangeError` before a call, its message without the value; an unreadable page or answer, and a 50th page that still has a cursor, with `ApiRequestError` 200 `INVALID_RESPONSE`.

#### Scenario: The credential calls page the list and send the secret only in the body
- **WHEN** rows L1, L2, S1 and S2 of test-plan.md § Credentials run against a recording fake (S2 rotates with the scheme)
- **THEN** L1 resolves `CV()` over two requests; L2, S1 and S2 give the plan's results, records and rejections (`INVALID_RESPONSE` also after exactly 50 requests); no record or message holds a secret except the bodies of S1 and S2

### Requirement: A step id of the grant form is at most 128 characters
`parseGrant` SHALL refuse a node scope whose `nodeId` is over 128 characters, and `grantBody` a step over 128 characters after trimming, with the field `nodeId` and the step-id text it already has; 128 characters SHALL pass both.

#### Scenario: A step id of 128 characters is accepted and one of 129 is refused
- **WHEN** `parseGrant` and `grantBody` run on the rows of test-plan.md § Step ids
- **THEN** `ID128` gives its scope and body (also with spaces around it); `ID129` and `ID1024` give `null` and `{ ok: false, field: "nodeId", … }`

### Requirement: A server whose tools carry a call is parsed and listed
`parseToolServer` SHALL read a surface tool with a `call` and no `http` (U47b's MCP, code-block and HTTP/OpenAPI tools) as `http` null with its other members, ignoring the `call`; a present `http` that is not `{ method, path }` of strings SHALL still make the answer malformed. `cursorPageFetcher` with it SHALL list servers of every adapter.

#### Scenario: Servers of every adapter parse and list
- **WHEN** `parseToolServer` runs on `S_MCP`, `S_CODE` and the malformed `S_MCP` of test-plan.md § Servers, and `cursorPageFetcher` reads the page `[S_FIX, S_MCP, S_CODE]`
- **THEN** the tools of `S_MCP` and `S_CODE` have `http: null`, their own flags and a "—" Call, the malformed one is `null`, and the page holds `acme`, `crm`, `snips` with `next_cursor` null

### Requirement: The registration page carries fixed names, one feature file and kit components only
`REGISTER_PAGE`, `REGISTER_NAMES` and `CREDENTIAL_NAMES` SHALL hold the values of design.md § Messages (Names). The feature file `web/src/features/67-admin-tool-register.tsx` SHALL export `feature` with the literals of `REGISTER_PAGE` and no `navLabel`, call `registerToolMessages()` and add no navigation item. `RegisterPage.tsx` SHALL render `PageHeader` ("Register a tool server") over its form in a `Card` at `PAGE_WIDTHS.form`; the link of that name SHALL sit in `ServersPage.tsx`'s `PageHeader` `actions`; "Credential" and "Change registration" SHALL be kit `Section`s after "Surface" and the grant-form note a plain `<p>` in "New grant" (no `alert`). The new pages SHALL import no CSS, hold no palette utility, colour or inline style (`findCssImports`, `findPaletteUtilities` and `findInlineStyleUse` `[]`), the pages no `console.`, `localStorage`, `sessionStorage` or `dangerouslySetInnerHTML`, and the secret field `type="password"`; `GrantsPage.tsx` SHALL call `toolListNote(`.

#### Scenario: The registration page carries fixed names and its own feature file
- **WHEN** `tools/register-pages.test.ts` reads the constants, the feature file, a registry holding `TOOL_PAGES` and `REGISTER_PAGE`, and the sources of § Names
- **THEN** the constants are those of design § Messages (29 and 11 values), `featureLiterals` of the feature file is `null`, `visibleNav` for carol lists "Tool servers", "Grants", "Policies", every required token is present and no banned one

### Requirement: The registration and credential pages show the states of the API's answers
The registration page SHALL check the draft before any request, show a refusal on the field it names and any other failure as the form's alert, keep one `Idempotency-Key` per draft until a field changes and navigate to `serverLink(id)` after a registration. The Credential section SHALL show `credentialText`, keep its button `aria-disabled` while the list is pending or failed, offer no credential entry and make no credential request for a code-block server, empty the secret field after any answer, never show the secret and read the list again after a store or rotation that succeeds (not after a refusal). Rotation SHALL show the scheme controls, pre-filled from the stored credential, and send them. For an OpenAPI or code-block server the detail SHALL offer "Replace document" or "Edit code": the form pre-filled (the effects by tool name, the code from the surface), saved by the `PUT` route, then the detail read again. Steps: test-plan-browser.md.

#### Scenario: An MCP server is registered and a code-block server shows no credential form
- **WHEN** the steps of test-plan-browser.md § Register 1 run (an `http:` URL refused locally, the engine's 400 and 409 on the MCP form, a 201 for a changed URL, the detail of a code-block server)
- **THEN** the local refusal posts nothing; the 400 and 409 are field errors under one `Idempotency-Key` and the changed URL has another; the success lands on `?server=crm` ("No credential stored."); a code-block server's detail reads "Code blocks need no credential." with no form and no credential request

#### Scenario: An OpenAPI document is previewed, given effects and registered
- **WHEN** the steps of § Register 2 run (a 500 and then a preview of five operations, no effect, two effects and a 400 on the origin, then a 201)
- **THEN** the table "Operations" holds three rows with a combobox and two with "Excluded: …"; no effect posts nothing; the 400 shows under "Origin" with the overlay of two entries; the retry's 201 lands on `?server=ledger`

#### Scenario: A credential is stored and rotated and its secret never shows
- **WHEN** the steps of § Credential run on `crm` (the list 500, then two pages; a store refused 409 and accepted 201 echoing a `value`; a rotation 200)
- **THEN** nothing posts while the list failed; the 409 is an alert; the stored credential reads "Credential stored (key version 1)." with "Rotate credential" and the scheme controls pre-filled, then "(key version 2)" after a rotation that sends the scheme; after every answer the field is empty, page text and console never hold a secret, the store requests carry different keys and the rotation none

#### Scenario: A document and a code block are replaced from the server detail
- **WHEN** the steps of § Replace run (an approved OpenAPI server: "Replace document", a pasted document and a preview, "Save changes"; an approved code-block server: "Edit code", a changed source, "Save changes")
- **THEN** `createPayment` is `pay` after the preview; the PUT bodies are the plan's; each save reads "Document replaced." or "Code saved." and the detail then reads "drifted"
