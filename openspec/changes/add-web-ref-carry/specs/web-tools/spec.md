## ADDED Requirements

### Requirement: A changed ref is found by tool name and worded as old to new
`changedRefs(before, after)` SHALL return one `RefChange` `{ tool, from, to }` for each tool name present in both views whose `ref` is non-null in both and differs, sorted by `tool`, with `effect` `{ from, to }` only when the tool's effect changed (`from` the entry of the optional `effectsBefore` map, else the before view's, `to` the after view's); a tool in one view only, a `null` ref and an equal ref SHALL give none, so a first approval gives `[]`. `approvedEffects(surface)` SHALL map each tool name of a readable raw approved surface to its effect, and be empty otherwise. `refNoticeText(changes)` SHALL be `null` for `[]`, else `Refs changed: ` followed by `<from> → <to>` joined by `, ` and `. Grants and flows still name the old refs.`.

#### Scenario: Changed refs are found by tool name and worded as old to new
- **WHEN** rows CH1 to CH8, AE1 and NT1 to NT3 of test-plan.md § Ref rows run
- **THEN** CH1 gives one change, `create_payment` from `ledger.create_payment@1` to `@2`; CH2 gives `create_payment` then `list_vendors` whatever the order of `after`; CH3 and CH4 (a first approval) give `[]`; CH5 (an added and a removed tool) and CH6 (a `null` ref) give the one bumped tool; CH7 adds `effect` `{ from: "read", to: "pay" }` from the approved effects, CH8 none without them; AE1 gives the map and two empty ones; NT1 is `null`, NT2 and NT3 are the two texts of the plan

### Requirement: A grant is read with its arguments and every page of grants and tool servers is read
`parseGrantRecord(raw)` SHALL read one `{ grant, status }` item of `GET /grants` with the bounds of `parseGrant` and at most 8 `args` `{ arg, op, value }` (`arg` `^[a-z][a-z0-9_]{0,63}$`, `op` `eq`, `lte` or `gte`, `value` a string of at most 256 characters, a finite number or a boolean), and give `null` for anything else. `loadAllGrants(api, signal?)` and `loadAllToolServers(api, signal?)` SHALL read `GET /grants` and `GET /tool-servers` with `limit` 100 and each page's cursor, at most 100 pages, and give `{ grants, complete }` and `{ servers, complete }`, `complete` false only when the 100th page still has a cursor; a page or an item they cannot read SHALL reject `ApiRequestError` 200 `INVALID_RESPONSE` with no item returned, and a failed request SHALL reject with its own error.

#### Scenario: A grant record keeps its arguments and malformed ones are refused
- **WHEN** rows GR1 to GR4 of test-plan.md § Read rows run
- **THEN** GR1 gives the role grant with its three args and no `fingerprints` member; GR2 the user grant scoped `pay-run` / `pay` with status `needs_reconfirm`; each of the 23 variants of GR3 is `null`; GR4's five boundary values are not

#### Scenario: Every page is read, a hundred pages are the bound and a bad item rejects
- **WHEN** rows LG1 to LG6 and TS1 to TS4 of test-plan.md § Read rows run
- **THEN** LG1 gives `grant_1`, `grant_2`, `grant_3` and `complete` `true` after two calls (`limit` 100, then with `cursor` `c2`, both with the signal); LG2 and TS3 make 100 calls and give `complete` `false`; LG3, LG5 and TS2 reject `INVALID_RESPONSE`; LG4 rejects with the `ApiRequestError` 500 it was given; LG6 passes an `AbortSignal`; TS1 gives `ledger` and `acme` after two calls; TS4 rejects `ApiRequestError` 401 `UNAUTHENTICATED` after one fetch of `/api/v1/tool-servers?limit=100`

### Requirement: The plan copies any step grants and lists node grants as update the flow first
`copyPlan(grants, changes)` SHALL put each non-revoked grant whose `tool` equals a change's `from` into `copy` when its scope is `any_step` and into `flowFirst` when it is `node`, each with the change's `to`, in the order of `grants`, except that a grant on a change that has an `effect` goes into `effectChanged` with that effect, whatever its scope (D49: it is never copied); no other grant is listed. `copyGrantBody(grant, to)` SHALL return `{ subject, tool: to, scope: { kind: "any_step" }, args }` with fresh copies of the subject and every argument, and throw `RangeError` for a `to` that is not a tool ref.

#### Scenario: The plan copies any step grants and lists node grants as update the flow first
- **WHEN** rows CP1 to CP4 and CB1 to CB3 of test-plan.md § Copy rows run
- **THEN** CP1 gives `copy` `grant_1`, `grant_2`, `grant_6` and `flowFirst` `grant_3` (not the revoked `grant_4`, the unrelated `grant_5` or the new `grant_7`); CP2 and CP3 give empty lists; CP4 puts `grant_1` and `grant_3` (any step and node) in `effectChanged`, `grant_6` in `copy`; CB1 and CB2 give the two bodies of the plan, CB1's sharing nothing with the grant; CB3 throws `RangeError`

### Requirement: A copy is one request per grant, in order, and every refusal is reported
`copyGrants(api, plan, keyOf)` SHALL send one `POST /grants` for each `plan.copy` entry, in order, with the body of `copyGrantBody` and the header `Idempotency-Key` `keyOf(grantId, to)`, and give one `CopyOutcome` each: `ok: true` with `newId` for an answer holding a grant id, else `ok: false` with `reason` the `details.reason` of a 422 `OPERATION_REFUSED` when it matches `^[a-z][a-z0-9_]{0,63}$`, else the error code when it is upper-case words, else `request_failed`, and `INVALID_RESPONSE` for an answer without a readable id; it SHALL send nothing for an unusable key (`request_failed`) and never reject. `carryKeys(newKey)` SHALL return a `keyOf` that calls `newKey` once for each distinct `(grantId, to)` and repeats that key, and throws `RangeError` for a key that is not 1 to 128 characters of `!` to `~`.

#### Scenario: A copy sends one request per grant and reports a refusal without stopping
- **WHEN** rows CG1 to CG4 and CK1 to CK3 of test-plan.md § Copy rows run against a recording fake
- **THEN** CG1 records three posts in order with the keys `k-grant_1-ledger.create_payment@2`, `k-grant_2-…`, `k-grant_6-…` and gives `ok` (`newId` `grant_n1`), `arg_unknown`, `ok`; CG2 gives `OPERATION_REFUSED` twice, `role_unknown`, `IDEMPOTENCY_KEY_REUSED`, `INTERNAL`, `FORBIDDEN`, `request_failed` and `INVALID_RESPONSE` twice; CG3 sends nothing for three bad keys; CG4 gives `[]`; CK1 gives `n1`, `n1`, `n2`, `n3` after three `newKey` calls, CK2 throws `RangeError` three times, CK3 gives two keys

### Requirement: The carry result lines, notes and run are fixed
`REF_CARRY_NAMES` SHALL hold the ten texts of test-plan.md § Names and `REF_MARKERS` the two markers, both frozen. `fillRefText(template, values)` SHALL replace each `{key}` that is an own key of `values`, once and literally. `carryView(plan, outcomes, complete)` SHALL give `lines`: one `copied` or `refused` line per outcome, then one `flowFirst` line (`{tool}` the new ref) per `flowFirst` entry, then one `effectChanged` line (`Effect changed: {old} → {new}; grant it again on the Grants page: {grant} ({tool}).`) per `effectChanged` entry, `{grant}` being `grantLabel` (`role author · any step`, `user u_bob · pay-run / pay`); `empty` the `none` text when there is no line, else `null`; `incomplete` the `incomplete` text when `complete` is false, else `null`; `deploy` true when an outcome is `ok`; it SHALL throw `RangeError` unless the outcomes follow `plan.copy`. `carryGrants(api, changes, keyOf, signal?)` SHALL read all grants, plan, copy and give that view, rejecting only when the grants cannot be read, before any post.

#### Scenario: The lines, notes and the whole carry read as fixed texts
- **WHEN** rows FT1 to FT3, GL1, CV1 to CV5 and CR1 to CR4 of test-plan.md § View rows run
- **THEN** FT2 keeps `$& {to} $1` literal; CV1 gives four lines ("Created ledger.create_payment@2 for role author · any step.", "Not created for user u_bob · any step: arg_unknown.", a second "Created …", "Update the flow first: role author · pay-run / pay (ledger.create_payment@2).") and `deploy` `true`; CV2 gives no line and `empty` "No grant names the old refs."; CV3 gives `incomplete` "Only the first 10,000 grants were read." and `deploy` `false`; CV4 throws `RangeError` twice; CV5 gives two lines "Effect changed: read → pay; grant it again on the Grants page: <grant> (ledger.create_payment@2).", no copy line and `deploy` `false`; CR1 gives CV1 after two reads and three posts, CR2 rejects with the 403 and makes no post, CR3 gives CV2 with no post, CR4 posts once, for `list_vendors`, and lists the two grants on `create_payment` as effect changed

### Requirement: A grant's ref is current, superseded or waiting by the server that lists its tool
`refState(tool, servers)` SHALL read the server id as the text before the first `.` and the tool name as the text between it and the last `@`, and give `null` unless a listed server whose state is not `pending` lists a tool of that name with a non-null ref; then, for an `approved` server, `current` for an equal ref and `superseded` otherwise, and for a `drifted` server `waiting` for an equal ref and `superseded` otherwise. `REF_MARKERS` SHALL give "superseded" and "waiting for approval".

#### Scenario: A ref is current, superseded or waiting by the server that lists it
- **WHEN** rows RS1 and RS2 of test-plan.md § Ref rows run
- **THEN** `ledger.create_payment@2` is `current` and `@1` `superseded` on the approved `ledger`; `acme.lookup_vendor@1` is `waiting` and `@2` `superseded` on the drifted `acme`; `crm.find_customer@1`, a pending, an unlisted and a null-ref server's tool, `plain@1`, `ledger.create_payment`, `.x@1`, `ledger.@1`, `ledger.create.payment@2`, `__proto__.x@1` and any ref against `[]` are `null`

### Requirement: The carry panel is thin and the Servers page keeps its pins
`RefCarryPanel.tsx` SHALL call `carryGrants(`, `carryKeys(` and `refNoticeText(`, use `tools-note` paragraphs, `aria-disabled` on its button, a `ul` named by `aria-label` `REF_CARRY_NAMES["listName"]`, `ErrorPanel` and a `Link`, and hold no `tools-feedback`, `data-tone`, `useId` or `surface`. `ServersPage.tsx` SHALL hold `<RefCarryPanel`, one `className="tools-feedback"`, one `data-tone="primary"`, one `<ConfirmDialog`, `surface={` once, no `useId` and no `loadToolServer(`; `ref-carry.ts` SHALL import neither `react` nor `./grants.ts`; the sources SHALL pass the five scanners (`[]`).

#### Scenario: The panel and the Servers page source keep every pin
- **WHEN** `ref-carry-pages.test.ts` reads the sources of test-plan.md § Source rows SP1, SP2, SP5 and SP6
- **THEN** SP1, SP2 and SP5 hold, the scanners give `[]` on `RefCarryPanel.tsx` and `ServersPage.tsx`, and a `ServersPage.tsx` copy with a second `className="tools-feedback"` is found

### Requirement: The ref marker is thin and the Grants page keeps its pins
`RefMarker.tsx` SHALL be a `span` with `data-slot="ref-marker"`, `data-state` and `REF_MARKERS[`, never a `data-slot="badge"` element, `Badge` or `data-tone`. `GrantsPage.tsx` SHALL hold `<RefMarker`, `refState(` and `loadAllToolServers(createApiClient()` (never `browserSession.api`, so a 401 does not end the session), keep `grantTextWithBadge(`, `<div className="min-w-0">` and one `className="tools-feedback"`, and hold no `data-tone="primary"`, `people/` or `ConfirmDialog`; both files SHALL pass the five scanners.

#### Scenario: The marker and the Grants page source keep every pin
- **WHEN** `ref-marker-pages.test.ts` reads the sources of test-plan.md § Source rows SP3, SP4 and SP6
- **THEN** SP3 and SP4 hold, the scanners give `[]` on `RefMarker.tsx` and `GrantsPage.tsx`, and a `RefMarker.tsx` copy with `data-slot="badge"` is found

### Requirement: The server page offers the copy after an approval that changed refs
After a successful approval, when `refNoticeText(changedRefs(view, answer))` is not `null`, the region "Surface" SHALL show that text as a paragraph (class `tools-note`, never a second `tools-feedback`), the button "Create the same grants for the new refs" and, after a press, the list "Copied grants" of the `carryView` lines, its `empty` and `incomplete` notes and, when `deploy` is true, the link "Deploy on Policies" to `/admin/policies`; a failed grants read SHALL show the `ErrorPanel` alert and create nothing. Nothing SHALL be requested before the press and no grant SHALL be revoked or edited; an approval that changed no ref (a first approval is one) SHALL show none of this. Steps: test-plan-browser.md.

#### Scenario: Approving a bumped surface offers the copy and reports one line per grant
- **WHEN** the steps of test-plan-browser.md § Approve run (the drifted `ledger` whose two tools bump, `list_vendors` from `read` to `write`, an approval, then the button over six grants; a first approval of a pending server; a 403 on `GET /grants`)
- **THEN** after "Surface approved." the paragraph reads the NT3 text, the button shows, the list "Copied grants" has 0 matches and `GET /grants` 0 hits; after the press the list has four lines in order (created `create_payment@2`, `arg_unknown`, update the flow first, "Effect changed: read → write; grant it again on the Grants page: role author · any step (ledger.list_vendors@2)."), `POST /grants` has 2 hits with the two bodies and two distinct keys, none for `ledger.list_vendors@2`, no `DELETE`, `PUT` or `PATCH` was sent and the link "Deploy on Policies" has `href` `/admin/policies`; a first approval shows no "Refs changed" text or button and no `GET /grants`; the 403 shows one alert containing "dec_1" and no list, link or `POST /grants`

### Requirement: The Grants list marks superseded and waiting refs without a second badge or a new alert
The Grants page SHALL read `GET /tool-servers` (all pages) beside its other reads and, after the status `Badge` of a row, show `RefMarker` for `refState(grant.tool, servers)` `superseded` or `waiting` with the text of `REF_MARKERS`; when that read fails (a 401 included, which SHALL NOT end the session) it SHALL show no marker and no `alert` and leave every other part of the page as it is. The status `Badge` SHALL stay a row's only `[data-slot="badge"]`.

#### Scenario: Superseded and waiting refs are marked beside the one badge
- **WHEN** the steps of test-plan-browser.md § Grants markers and failed reads, `test_superseded_and_waiting_refs_are_marked_beside_the_badge` (four grants, `/tool-servers` in two pages)
- **THEN** the row of `ledger.create_payment@1` has one `[data-slot="badge"]` (`data-tone` `success`) and one `[data-slot="ref-marker"]` reading "superseded"; the row of `acme.lookup_vendor@1` one marker reading "waiting for approval"; the rows of `ledger.create_payment@2` and `crm.find_customer@1` no marker; `/tool-servers` has 2 hits, both with `limit` `100`, the second with `cursor` `s2`

#### Scenario: A failed server read leaves the Grants page as it was
- **WHEN** the steps of test-plan-browser.md § Grants markers and failed reads run with `/tool-servers` answering 403 (`test_a_failed_server_read_shows_no_marker`), then 500 with `/blocks` and `/grants` also failing (`test_a_failed_server_read_adds_no_alert`), then 401 with no session (`test_an_unanswered_server_read_does_not_end_the_session`)
- **THEN** the rows show their text and one badge each, `[data-slot="ref-marker"]` has 0 matches, the page has 0 alerts and the URL still ends `/admin/grants`; in the error state the page has exactly 2 alerts, the options of "Tool" are exactly `["Choose a tool"]` and "Create grant" has `aria-disabled` `true`
