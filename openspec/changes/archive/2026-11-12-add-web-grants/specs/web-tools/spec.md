## Purpose

A tenant admin reads tool servers and surfaces, approves a surface, manages grants, and validates and deploys the tenant's policy in the browser.

## ADDED Requirements

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
The nine calls (`loadToolServer` to `deployPolicy`) SHALL call the client with the paths, bodies and options of test-plan.md § Calls (paths without `/api/v1`); only `postGrant` and `deployPolicy` send an `Idempotency-Key` header, and the confirm sends `{}`, which means the newest version. An id outside its pattern, a blank key and an invalid draft SHALL reject with `RangeError` before a call (the functions are `async`: none throws synchronously); an answer a parser refuses SHALL reject with `ApiRequestError` status 200, code `INVALID_RESPONSE` (`approveToolSurface` reads the `server` of U47's answer, a record without surfaces; the three grant calls a record with a valid `id`). `loadToolRefs` SHALL return the `ref` of each bound item of `GET /blocks` in the order read, following `next_cursor` for at most 10 pages of 100; when the tenth page still has a non-null `next_cursor` it SHALL stop and resolve with the refs read so far, never reject for that reason and give no sign that the list is incomplete.

#### Scenario: Calls of the three pages
- **WHEN** the calls of test-plan.md § Calls (`loadToolServer(get, "acme")`, `postGrant(post, <u_bob draft>, "k-1")`, `deployPolicy(post, SRC, "k-1")` and the others) run against a recording fake
- **THEN** the records are the plan's eight; `loadToolRefs` returns the two bound refs over two requests and, for a cursor that is never null, makes 10 requests and resolves `acme.t1@1` to `acme.t10@1`; results, `RangeError`s and `INVALID_RESPONSE` rejections are the plan's

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
