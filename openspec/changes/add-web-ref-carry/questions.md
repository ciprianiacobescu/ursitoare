# Questions — add-web-ref-carry

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | accepted | 4.1 | technical | e2e/test_m8_ref_carry.py:86-96 FIRST has no pendingDigest, so Approve is disabled |
| Q-002 | answered | 4.1 | technical | e2e/test_m8_ref_carry.py:302 403 body lacks details.decisionId |
| Q-003 | answered | 4.1 | technical | e2e/test_m8_ref_carry.py:255 two alerts remain after the copy |
| Q-004 | answered | none | verdict | Criterion C-8540a4f8 (web-tools › The server page offers the copy after an approval that changed refs › Approving a bumped surface offers the copy and reports one line per grant): accept as satisfied? |
| Q-005 | answered | none | verdict | Criterion C-4b83877f (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › Superseded and waiting refs are marked beside the one badge): accept as sati |
| Q-006 | answered | none | verdict | Criterion C-b8363cd2 (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › A failed server read leaves the Grants page as it was): accept as satisfied? |
| Q-007 | answered | none | verdict | Hold H-3d26971a: UI criterion C-568a8224 has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-96a6450c: UI criterion C-8540a4f8 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-d011c1bb: UI criterion C-4b83877f has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-cb55efac: UI criterion C-b8363cd2 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: e2e/test_m8_ref_carry.py:86-96 FIRST has no pendingDigest, so Approve is disabled

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-27T13:06Z by claude-sonnet, run r-20261127T1106Z-2a77, task 4.1

### Context
test_first_approval_offers_nothing clicks 'Approve surface', but FIRST (built from rec(), pendingDigest None) makes approvalView return canApprove=false, so the button is aria-disabled and the click times out. The spec says a first approval of a pending server must be approvable.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m8_ref_carry.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ref-carry`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m8_ref_carry.py`: in FIRST add `"pendingDigest": DP, "pendingSubmittedBy": "u_carol",` after `"approvedDigest": None,`
2. Leave as is

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium], test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium], test_m8_ref_carry::test_first_approval_offers_nothing[chromium]
E       AssertionError: Locator expected to contain text 'dec_1'
E       Actual value: Not allowedYou are not allowed to do this. If you think you should be, give the decision id to an administrator.Error code: FORBIDDEN
E       Call log: (same for 2 tests)
E         - Expect "to_contain_text" get_by_role("region", name="Surface", exact=True).get_by_role("alert") with timeout 5000ms
E         - waiting for get_by_role("region", name="Surface", exact=True).get_by_role("alert")
E           14 × locator resolved to <section role="alert" class="ui-error">…</section>
E 
e2e/test_m8_ref_carry.py:281

### Clarifier suggestion
Edit `e2e/test_m8_ref_carry.py`: in FIRST add `"pendingDigest": DP, "pendingSubmittedBy": "u_carol",` after `"approvedDigest": None,`

### Answer
<!-- write below this line -->
---

## Q-002: e2e/test_m8_ref_carry.py:302 403 body lacks details.decisionId

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: accept needs a clarifier suggestion, and Q-002 has none
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-27T13:06Z by claude-sonnet, run r-20261127T1106Z-2a77, task 4.1

### Context
test_a_failed_grants_read_creates_nothing asserts the alert contains 'dec_1', but ErrorPanel only renders details.decisionId for a 403, never the message. The spec says the alert contains 'dec_1'.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m8_ref_carry.py`, write an answer that names its path exactly as written here or run `l4 questions accept Q-NNN --unit add-web-ref-carry`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m8_ref_carry.py` line 302: change the 403 body to `{"error": {"code": "FORBIDDEN", "message": "m", "details": {"decisionId": "dec_1"}}}`
2. Leave as is

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium], test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium], test_m8_ref_carry::test_first_approval_offers_nothing[chromium]
E       AssertionError: Locator expected to contain text 'dec_1'
E       Actual value: Not allowedYou are not allowed to do this. If you think you should be, give the decision id to an administrator.Error code: FORBIDDEN
E       Call log: (same for 2 tests)
E         - Expect "to_contain_text" get_by_role("region", name="Surface", exact=True).get_by_role("alert") with timeout 5000ms
E         - waiting for get_by_role("region", name="Surface", exact=True).get_by_role("alert")
E           14 × locator resolved to <section role="alert" class="ui-error">…</section>
E 
e2e/test_m8_ref_carry.py:281

### Answer
<!-- write below this line -->
Take option 1. Edit `e2e/test_m8_ref_carry.py` line 302 so `grants` replies `(403, {"error": {"code": "FORBIDDEN", "message": "m", "details": {"decisionId": "dec_1"}}})`.

Why: test-plan-browser.md § Approve says this test is "as C-8540a4f8 but `grants` replies `(403, FORBIDDEN)`", with `FORBIDDEN` copied from `e2e/test_m6_tool_pages.py` (lines 96-102), which carries the decision id in `details.decisionId` and has `message` "m". The red test inlined it with "dec_1" in `message` instead. `ErrorPanel` shows a decision id only from `details.decisionId` of a 403 (`web/src/kit/error-panel.ts:35-40`, `web/src/kit/ErrorPanel.tsx:25`) and shows the code's own message, never the server's `message`, so the current fixture can never meet the spec's "one alert containing dec_1". The assertions at lines 311-312 stay exactly as written; only the fixture changes to the one the test plan names.
---

## Q-003: e2e/test_m8_ref_carry.py:255 two alerts remain after the copy

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path e2e/test_m8_ref_carry.py of task 4.1; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-27T13:06Z by claude-sonnet, run r-20261127T1106Z-2a77, task 4.1

### Context
After the copy press the test expects 0 alerts on the page, but the previous run saw 2. I could not identify them from the source. Candidates are unmocked requests (CredentialSection, ReviewSections or discovery) answered 401 by the real engine, or an ErrorPanel from the page. Please confirm the origin from a run trace and say whether the test needs more mocks.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m8_ref_carry.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ref-carry`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m8_ref_carry.py`: add `answer(page, ...)` mocks for each unmocked GET the Surface page makes, as the trace shows
2. Leave as is

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium], test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium], test_m8_ref_carry::test_first_approval_offers_nothing[chromium]
E       AssertionError: Locator expected to contain text 'dec_1'
E       Actual value: Not allowedYou are not allowed to do this. If you think you should be, give the decision id to an administrator.Error code: FORBIDDEN
E       Call log: (same for 2 tests)
E         - Expect "to_contain_text" get_by_role("region", name="Surface", exact=True).get_by_role("alert") with timeout 5000ms
E         - waiting for get_by_role("region", name="Surface", exact=True).get_by_role("alert")
E           14 × locator resolved to <section role="alert" class="ui-error">…</section>
E 
e2e/test_m8_ref_carry.py:281

### Clarifier suggestion
Edit `e2e/test_m8_ref_carry.py`: add `answer(page, ...)` mocks for each unmocked GET the Surface page makes, as the trace shows

### Answer
<!-- write below this line -->
Do not add mocks: no request of this page goes unmocked. Edit `e2e/test_m8_ref_carry.py` instead: on lines 214, 215, 273, 274, 298 and 299 replace the reply `(200, EMPTY)` with `EMPTY`, so they read `answer(page, "tool-servers", EMPTY)` and `answer(page, "credentials", EMPTY)`. Nothing else changes.

Origin, reproduced at c7477a9d on a local e2e stack with this test's own mocks plus a catch-all route that logs any request reaching the engine: the catch-all saw none. Every /api/v1 request (me, tool-servers?limit=50, tool-servers/ledger, credentials?limit=200, people, the approve POST) was answered by the test's routes. Both alerts read "Something went wrong. The engine sent an answer this page cannot read. Error code: INVALID_RESPONSE": one is the Credential section's, the other the server list's. They are there from page load, before the approval, so they are still there after the copy.

Cause: `EMPTY` (line 20) is already a whole reply, `(200, {"items": [], "next_cursor": None})`, as in `e2e/test_m7_tool_registration.py:22`, which passes it bare (`answer(page, "tool-servers", EMPTY)`, lines 137 and 148). Wrapping it again as `(200, EMPTY)` makes the body the JSON array `[200, {"items": [], "next_cursor": null}]`, which the cursor-list reader rejects. test-plan-browser.md § Approve says "Every test answers `tool-servers` (list) and `credentials` with `EMPTY`", the reply itself. With the six replies changed to `EMPTY`, the same run shows 0 alerts after load and 0 after the approval, with detail_hits 2, approves 1 and grants 0. No assertion is weakened: line 255's count of 0 stays.

---

## Q-004: Criterion C-8540a4f8 (web-tools › The server page offers the copy after an approval that changed refs › Approving a bumped surface offers the copy and reports one line per grant): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-8540a4f8 (web-tools › The server page offers the copy after an approval that changed refs › Approving a bumped surface offers the copy and reports one line per grant)

### Context
Criterion C-8540a4f8 (web-tools › The server page offers the copy after an approval that changed refs › Approving a bumped surface offers the copy and reports one line per grant) is needs human after round 2.

Scenario:
\- **WHEN** the steps of test-plan-browser.md § Approve run (the drifted `ledger` whose two tools bump, `list_vendors` from `read` to `write`, an approval, then the button over six grants; a first approval of a pending server; a 403 on `GET /grants`)
\- **THEN** after "Surface approved." the paragraph reads the NT3 text, the button shows, the list "Copied grants" has 0 matches and `GET /grants` 0 hits; after the press the list has four lines in order (created `create_payment@2`, `arg_unknown`, update the flow first, "Effect changed: read → write; grant it again on the Grants page: role author · any step (ledger.list_vendors@2)."), `POST /grants` has 2 hits with the two bodies and two distinct keys, none for `ledger.list_vendors@2`, no `DELETE`, `PUT` or `PATCH` was sent and the link "Deploy on Policies" has `href` `/admin/policies`; a first approval shows no "Refs changed" text or button and no `GET /grants`; the 403 shows one alert containing "dec_1" and no list, link or `POST /grants`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m8_ref_carry::test_first_approval_offers_nothing[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. ServersPage keeps the view before the approval, feeds it and the approve answer to changedRefs with the approved surface's effects, and mounts RefCarryPanel inside the Surface section only after a successful approval. The panel returns nothing when refNoticeText is null, so a first approval (null refs before) shows no text and no button and reads no grants. The notice is a tools-note paragraph, the button carries the fixed name, and carryGrants runs only in the press handler, so nothing is requested before the press. carryGrants reads all grants first and rejects before any post, which the panel renders as ErrorPanel, an alert that shows the 403 decision id. The list is a ul named Copied grants, the Deploy on Policies link goes to /admin/policies only when a grant was created, a grant whose effect changed is listed and never posted, and no code path sends DELETE, PUT or PATCH. The three tests in e2e/test_m8_ref_carry.py assert each of these observable results exactly as test-plan-browser.md § Approve lists them.
---

## Q-005: Criterion C-4b83877f (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › Superseded and waiting refs are marked beside the one badge): accept as sati

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-4b83877f (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › Superseded and waiting refs are marked beside the one badge)

### Context
Criterion C-4b83877f (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › Superseded and waiting refs are marked beside the one badge) is needs human after round 2.

Scenario:
\- **WHEN** the steps of test-plan-browser.md § Grants markers and failed reads, `test_superseded_and_waiting_refs_are_marked_beside_the_badge` (four grants, `/tool-servers` in two pages)
\- **THEN** the row of `ledger.create_payment@1` has one `[data-slot="badge"]` (`data-tone` `success`) and one `[data-slot="ref-marker"]` reading "superseded"; the row of `acme.lookup_vendor@1` one marker reading "waiting for approval"; the rows of `ledger.create_payment@2` and `crm.find_customer@1` no marker; `/tool-servers` has 2 hits, both with `limit` `100`, the second with `cursor` `s2`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m8_ref_carry_grants::test_superseded_and_waiting_refs_are_marked_beside_the_badge[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The Grants page reads GET /tool-servers through loadAllToolServers with a plain API client beside its other reads; the page reader asks for limit 100 and passes each page's cursor, so two pages give two hits, the second with cursor s2. Each row renders RefMarker right after grantTextWithBadge inside the same span, and RefMarker is a span with data-slot ref-marker and data-state that renders nothing for current or null, so the status Badge stays the row's only badge slot. refState gives superseded for ledger.create_payment@1 against the approved ledger listing @2, waiting for acme.lookup_vendor@1 against the drifted acme listing the same ref, current for ledger.create_payment@2 and null for crm.find_customer@1 because crm lists no tool of that name. The e2e test asserts exactly these markers, badges and server queries.
---

## Q-006: Criterion C-b8363cd2 (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › A failed server read leaves the Grants page as it was): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-b8363cd2 (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › A failed server read leaves the Grants page as it was)

### Context
Criterion C-b8363cd2 (web-tools › The Grants list marks superseded and waiting refs without a second badge or a new alert › A failed server read leaves the Grants page as it was) is needs human after round 2.

Scenario:
\- **WHEN** the steps of test-plan-browser.md § Grants markers and failed reads run with `/tool-servers` answering 403 (`test_a_failed_server_read_shows_no_marker`), then 500 with `/blocks` and `/grants` also failing (`test_a_failed_server_read_adds_no_alert`), then 401 with no session (`test_an_unanswered_server_read_does_not_end_the_session`)
\- **THEN** the rows show their text and one badge each, `[data-slot="ref-marker"]` has 0 matches, the page has 0 alerts and the URL still ends `/admin/grants`; in the error state the page has exactly 2 alerts, the options of "Tool" are exactly `["Choose a tool"]` and "Create grant" has `aria-disabled` `true`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m8_ref_carry_grants::test_a_failed_server_read_adds_no_alert[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m8_ref_carry_grants::test_a_failed_server_read_shows_no_marker[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m8_ref_carry_grants::test_an_unanswered_server_read_does_not_end_the_session[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The servers read on the Grants page uses a plain API client whose fetch is the global one, so the 401 session-end handler that only the session client wraps around its fetch never runs and the URL stays on /admin/grants. The read's rejection handler is empty and the servers state starts as an empty list, so a 403, 500 or 401 leaves no marker, adds no alert and changes nothing else on the page: the rows keep their text and one Badge each. In the error state the two pre-existing alerts (the tool list's ErrorPanel and the table's) remain the only ones, the Tool select keeps only Choose a tool, and the busy form keeps Create grant aria-disabled. The three e2e tests assert each of these results.
---

## Q-007: Hold H-3d26971a: UI criterion C-568a8224 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-568a8224 has no end-to-end test; see the generated UI tests table

Step 5 for C-568a8224: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_568a8224::test_grant_ref_state_is_current_superseded_waiting_or_null[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. C-568a8224 is the refState and REF_MARKERS requirement, whose scenario runs rows RS1 and RS2 of the test plan: pure-function rows, not a browser journey. Three Node tests named with the criterion assert every value of those rows and passed from a red that failed by assertion, and refState in ref-carry.ts gives those values. The browser-visible side of the same logic, the markers on the Grants page, is asserted by the e2e test of C-4b83877f. The generated end-to-end test failed at the base and at the head alike, so it shows nothing about the code; the unit can go on.
---

## Q-008: Hold H-96a6450c: UI criterion C-8540a4f8 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-8540a4f8 has no end-to-end test; see the generated UI tests table

Step 5 for C-8540a4f8: writer_failed after 2 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. The repository already holds the end-to-end tests for C-8540a4f8: the three tests of e2e/test_m8_ref_carry.py, tagged with the criterion and following test-plan-browser.md § Approve step by step, cover the bumped approval with the copy, a first approval and a 403 on the grants read. The generator's writer failed on a tool permission, which says nothing about the code. The Servers page, the panel and the carry logic implement every clause of the scenario, as checked for Q-004, so the unit can go on.
---

## Q-009: Hold H-d011c1bb: UI criterion C-4b83877f has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-4b83877f has no end-to-end test; see the generated UI tests table

Step 5 for C-4b83877f: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_4b83877f::test_superseded_and_waiting_refs_are_marked_beside_the_badge[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-cb55efac: UI criterion C-b8363cd2 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-b8363cd2 has no end-to-end test; see the generated UI tests table

Step 5 for C-b8363cd2: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_b8363cd2::test_failed_server_read_leaves_grants_page_as_it_was[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
