# Questions — add-web-grants

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
| Q-001 | answered | none | verdict | Criterion C-95a4662e (web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved): accept as satisfied? |
| Q-002 | answered | none | verdict | Criterion C-39cb580c (web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-5f4e5a5b (web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-90aeb5ab (web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys): accept as satisfied? |
| Q-005 | answered | none | verdict | Hold H-ca42fb4d: UI criterion C-debfaec1 has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-e57e62e0: UI criterion C-464ddcf9 has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-cb78452d: UI criterion C-4f5443ee has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-966b3c99: UI criterion C-228ef9c6 has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-43d41b0f: UI criterion C-35974302 has no end-to-end test; see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-ec30fde7: UI criterion C-4c2144fe has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-95489d0f: UI criterion C-78ea404d has no end-to-end test; see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-d38f4f7c: UI criterion C-985ca634 has no end-to-end test; see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-3848153d: UI criterion C-ba990588 has no end-to-end test; see the generated UI tests table |
| Q-014 | answered | none | verdict | Hold H-7723363f: UI criterion C-a7f551fc has no end-to-end test; see the generated UI tests table |
| Q-015 | answered | none | verdict | Hold H-161ae55b: UI criterion C-95a4662e has no end-to-end test; see the generated UI tests table |
| Q-016 | answered | none | verdict | Hold H-dc200146: UI criterion C-39cb580c has no end-to-end test; see the generated UI tests table |
| Q-017 | answered | none | verdict | Hold H-364e7bae: UI criterion C-5f4e5a5b has no end-to-end test; see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-fca42b7c: UI criterion C-90aeb5ab has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-95a4662e (web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-95a4662e (web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved)

### Context
Criterion C-95a4662e (web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved) is needs human after round 2.

Scenario:
\- **WHEN** the steps of test-plan-browser.md § Servers 1 run: carol opens `/admin/tool-servers?server=acme` and clicks the `aria-disabled` "Approve surface"; the detail is held, 500, pending, pending with another digest, then approved; the approve route answers 422 `digest_mismatch`, then 200
\- **THEN** "Loading", an alert, then the pending server with its tools; the click opens and posts nothing; the dialog posts `{ digest: DP, selfApproval: false }` and the refusal shows the `digest_mismatch` text and "Pending surface fedcba987654." (4 detail requests); the second approval reads the detail a fifth time and shows "Surface approved." and the approved tools with refs

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6_tool_pages::test_c_95a4662e_server_detail_states_and_approval[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The server detail page implements every step of the scenario. The approve handler returns at once while the detail loads or has failed, so the forced click opens no dialog and posts nothing. The pure models give the loading status, the alert and the pending tools with the plan's texts. A digest_mismatch refusal is shown as an alert and reloads the detail, and a successful approval shows the approved text and reads the detail again. The browser test in the repository follows test-plan-browser.md step by step and asserts the four and five detail requests and both posted bodies.
---

## Q-002: Criterion C-39cb580c (web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-39cb580c (web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter)

### Context
Criterion C-39cb580c (web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter) is needs human after round 2.

Scenario:
\- **WHEN** the steps of § Servers 2 run in a solo tenant: carol follows the link `acme` (she is the submitter), clicks "Approve surface" unticked, ticks the box, reloads, ticks and approves; then opens a detail without a submitter, approves, is refused 422 `self_approval_required`, ticks the box that appears and approves
\- **THEN** the link reads the detail once, with no page load; the unticked click shows the Tick alert and posts nothing; the box is unticked after the reload; the approvals post `selfApproval` `true`, `false`, `true`; the refusal shows its text and the box, with no detail request

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The link named the server id is a router Link to the in-page detail, so following it loads the detail once without a page load. The tick is cleared each time a detail loads, an unticked needed box makes the approve click show the Tick message as an alert without a dialog or request, and a self_approval_required refusal sets ownSurface so the box appears without a detail request. The approve bodies carry selfApproval true, false and true as the plan says, and the browser test asserts all of it.
---

## Q-003: Criterion C-5f4e5a5b (web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-5f4e5a5b (web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads)

### Context
Criterion C-5f4e5a5b (web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads) is needs human after round 2.

Scenario:
\- **WHEN** the steps of § Grants 1 run: the list is 403, then ready and the tool list 500, then ready; the `aria-disabled` "Create grant" is clicked; a create (422 `user_unknown`, then 201), a confirm (422 `revoked`, then 200) and a revoke (500, then 200) are each clicked twice
\- **THEN** the 403 is an alert with the decision id; a failed tool list leaves the select on "Choose a tool" and the click posts nothing, a ready one offers the bound refs only; the refused create shows "That user does not exist." beside "Role or user" and its retry has the same `Idempotency-Key`; a refused confirm or revoke is an alert with no table request; each success shows its `GRANT_DONE` text and is followed by a table request (the create also resets the form); the requests are the plan's, with no dialog

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The grants page implements the scenario. The 403 list error is shown by the table's ErrorPanel with the decision id; the form is busy while the tool list loads or has failed, so the submit handler returns and posts nothing; the select offers only bound refs. A refused create maps user_unknown to the Role or user field with the plan's text, keeps the draft and its Idempotency-Key, and a created grant resets the form and the key; a refused revoke or confirm is an alert with no table reload, and each success shows its GRANT_DONE text and resets the list so the table reloads from page one.
---

## Q-004: Criterion C-90aeb5ab (web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-90aeb5ab (web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys)

### Context
Criterion C-90aeb5ab (web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys) is needs human after round 2.

Scenario:
\- **WHEN** the steps of § Policies run: `GET /policies` is held, 500, then `{ current: null, pendingGrants: 1 }`, then `{ current: REC, pendingGrants: 0 }`; carol clicks the `aria-disabled` "Validate" and "Deploy", validates `permit (` and `SRC`, and deploys twice (422 `policy_invalid` for `t-1`, then 201)
\- **THEN** "Loading", an alert, "No policy deployed." and "1 grant change is not deployed."; the early clicks post nothing; the validations read "Not valid: parse: unexpected end of input" and "Valid."; the deploys read "Not valid: policy t-1" and, under a new `Idempotency-Key`, "Deployed version 599ac6e14025.", then "Current version 599ac6e14025" and "All grant changes are deployed." after a fourth request

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6_tool_pages::test_c_90aeb5ab_policy_loads_validates_and_deploys[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The policies page implements the scenario. Validate and Deploy return at once while the view loads or has failed, so the forced clicks post nothing. The texts come from the pure models: No policy deployed, the one-grant pending text, Not valid with the parse problem, Valid, the policy_invalid refusal rendered through validationText as an alert, and Deployed version with the short digest. Each Deploy click uses a fresh Idempotency-Key and an accepted deploy reloads the view, which then reads Current version and All grant changes are deployed.
---

## Q-005: Hold H-ca42fb4d: UI criterion C-debfaec1 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-debfaec1 has no end-to-end test; see the generated UI tests table

Step 5 for C-debfaec1: not_testable after 1 attempt(s); This criterion targets internal parsing functions (parseToolServer, serverRowText, toolRows, stateNote) and asserts null for 23 malformed inputs plus exact plan-specified texts/rows from test-plan.md. Those malformed values are excluded from rendering and parseToolServer is not exposed through th....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-debfaec1 is about the pure parsing and text functions parseToolServer, serverRowText, toolRows and stateNote, which have no browser surface of their own: malformed answers never render, they make the list fail as a whole. The specification covers it with Node tests, and servers.test.ts traces it with tests named by its id that check the 23 malformed values, the unchanged input, the drifted and list-item views and the fixed texts. The browser plan is reserved for the last requirement's page scenarios. No end-to-end test is needed for this criterion.
---

## Q-006: Hold H-e57e62e0: UI criterion C-464ddcf9 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-464ddcf9 has no end-to-end test; see the generated UI tests table

Step 5 for C-464ddcf9: not_testable after 1 attempt(s); The criterion asserts triples from an internal `approvalView` function over `test-plan.md` fixture rows; no user-observable page or endpoint exposes these triples, so they cannot be asserted through the public UI interface..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-464ddcf9 is about the pure function approvalView, whose triples are consumed by the page through approveControl and never shown as such. The specification assigns page behaviour to the last requirement, whose scenarios are proved by the browser tests of test_m6_tool_pages.py, and the design says the pure models are checked by Node tests. servers.test.ts traces the criterion with tests named by its id that cover every row of the approvalView table: nothing pending in both profiles, the submitter blocked in a team tenant and self-approving in a solo one, and another, drifted or unknown submitter allowed. No end-to-end test is needed for this criterion.
---

## Q-007: Hold H-cb78452d: UI criterion C-4f5443ee has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-4f5443ee has no end-to-end test; see the generated UI tests table

Step 5 for C-4f5443ee: not_testable after 1 attempt(s); This criterion directly calls internal functions (approveRequest, approveDialog, approveFailure, toolsErrorMessage) on test-plan rows and asserts internal return values (selfApproval, ownSurface, reload) plus 13 error-reason texts, which are not observable or controllable through the public UI in....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-4f5443ee is about approveRequest, approveDialog, approveFailure and toolsErrorMessage, pure functions whose return values the page turns into alerts, a dialog and a reload. approve.test.ts traces the criterion with tests named by its id that cover every row of the test-plan: the Tick message and selfApproval bodies for MINE and UNKNOWN, the approvalView refusals, the dialog title with the short digest and null with nothing pending, ownSurface and reload for the four approval reasons, the fallbacks, and the 13 reason texts. The page-level consequences are the last requirement's scenarios, which the browser tests of test_m6_tool_pages.py exercise, including the Tick alert and the self_approval_required refusal. No end-to-end test is needed for this criterion.
---

## Q-008: Hold H-966b3c99: UI criterion C-228ef9c6 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-228ef9c6 has no end-to-end test; see the generated UI tests table

Step 5 for C-228ef9c6: not_testable after 1 attempt(s); The criterion asserts return values of internal functions (parseGrant, grantRowText, grantActions) — including `null` for the flat spread and each malformed value — which are not exposed through any page or HTTP interface observable from the browser..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-228ef9c6 is about parseGrant, grantRowText and grantActions, pure functions with no browser surface of their own: a malformed item makes the whole list fail through cursorPageFetcher rather than render. grants.test.ts traces the criterion with tests named by its id that check each table row's view, row text and actions, the null for all 17 malformed values and the flat record, the unchanged input and the GRANT_DONE texts. The rendered row text and the Revoke and Confirm buttons are checked on the page by the browser test of test_m6_tool_pages.py. No end-to-end test is needed for this criterion.
---

## Q-009: Hold H-43d41b0f: UI criterion C-35974302 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-35974302 has no end-to-end test; see the generated UI tests table

Step 5 for C-35974302: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_35974302::test_grant_body_rows_accepted[chromium-role-ops-role-acme.lookup_vendor@999999999-any_step--], test_l4_c_35974302::test_grant_body_rows_accepted[chromium-role-ops-role-acme.lookup_vendor@999999999-any_step-not-a-flow-], test_l4_c_35974302::test_gran....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-35974302 is about grantBody, a pure function over drafts. grants.test.ts traces it with tests named by its id that cover every row of the test-plan grantBody table: the role, user and node bodies, the ignored flow under any step, the boundary tool acme.lookup_vendor@999999999 accepted and @1000000000 and @01 refused, and each refused field with its text. The generated browser test failed on the rows that select the tool acme.lookup_vendor@999999999, a value the page cannot offer because the specification says the select Tool offers the bound refs only, so that failure reflects the test's choice of input and not a defect of the page. The page's use of grantBody is covered by the browser test of test_m6_tool_pages.py, which posts the body built from a draft and shows a refused field. No end-to-end test is needed for this criterion.
---

## Q-010: Hold H-ec30fde7: UI criterion C-4c2144fe has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-4c2144fe has no end-to-end test; see the generated UI tests table

Step 5 for C-4c2144fe: not_testable after 1 attempt(s); The criterion asserts behavior of pure model functions (regionState, actionState, approveControl), including RangeError throws for unknown phase/empty text; these are not exposed through the browser UI/public interface, so they cannot be verified with a page E2E test against the origin..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-4c2144fe is about regionState, actionState and approveControl, the pure page-state models, including RangeError for an unknown phase or an empty text that no page can trigger. states.test.ts traces the criterion with tests named by its id that cover every row of test-plan Page states: the loading, error, ready and empty regions, the idle, busy, done and failed actions, the approve control disabled for no server, no session, a team submitter, nothing pending and a busy request, and the RangeError rows. The rendered states are the last requirement's scenarios, which the browser tests of test_m6_tool_pages.py exercise through Loading, alerts and aria-disabled controls. No end-to-end test is needed for this criterion.
---

## Q-011: Hold H-95489d0f: UI criterion C-78ea404d has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-78ea404d has no end-to-end test; see the generated UI tests table

Step 5 for C-78ea404d: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_78ea404d::test_calls_use_right_routes_and_headers_and_refuse_unreadable_answers[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-78ea404d is the scenario Calls of the three pages, which runs the nine call functions against a recording fake and checks their paths, bodies, headers, RangeError rejections and INVALID_RESPONSE rejections. Those are module functions with no browser surface of their own: a ten-page cursor loop, a blank key or an unreadable answer cannot be driven from the page, so the criterion is settled by Node tests. calls.test.ts traces it with tests named by its id that record every call and check the eight records of the plan, the two-request and ten-request tool-ref loads and each refusal. The page-level use of these calls is proved by the browser scenarios of the last requirement, which the repository's browser test exercises. No end-to-end test is needed for this criterion.
---

## Q-012: Hold H-d38f4f7c: UI criterion C-985ca634 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-985ca634 has no end-to-end test; see the generated UI tests table

Step 5 for C-985ca634: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_985ca634::test_policy_texts_and_deploy_source_limits[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-985ca634 is the scenario Policy views and texts, which runs parsePolicyView, validationText, deployText, currentText, pendingText, checkPolicySource and policyErrorText on the plan's values. These are pure functions: the 11 malformed answers never render, and a source of 65,536 code points is not a browser input. policies.test.ts traces the criterion with tests named by its id that check the parsed view, each malformed value, the fixed texts, the code-point limit with the accented and emoji inputs and the policy_invalid refusal rendered through validationText. The rendered texts on the Policies page are the last requirement's scenario, which the repository's browser test exercises. No end-to-end test is needed for this criterion.
---

## Q-013: Hold H-3848153d: UI criterion C-ba990588 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-ba990588 has no end-to-end test; see the generated UI tests table

Step 5 for C-ba990588: not_testable after 1 attempt(s); The criterion verifies source files (TSX/CSS) via unit-test helpers that read files directly (dataTableModel, serverLink, findRawColours, findInlineStyleUse, var(--…) token checks), which is not observable through the running app's public interface or a browser against L4_E2E_BASE_URL..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-ba990588 is the scenario Names, tables, links and sources: it builds dataTableModel for the three tables, calls serverLink and serverIdFromSearch, and reads tools.css and the page files for raw colours, inline styles, dangerouslySetInnerHTML, kit tokens, kit components and the page tokens. These are checks on constants, pure functions and source files, which a running browser cannot observe. pages.test.ts traces the criterion with tests named by its id that assert every one of them, and the stylesheet and pages they read use kit tokens and components only. No end-to-end test is needed for this criterion.
---

## Q-014: Hold H-7723363f: UI criterion C-a7f551fc has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-a7f551fc has no end-to-end test; see the generated UI tests table

Step 5 for C-a7f551fc: not_testable after 1 attempt(s); The criterion exercises internal module functions (featureLiterals, TOOL_PAGES registry, visibleNav) with constructed capability states (carol, alice, deploy_policy-only, null) that are not exposed through the running page's public interface; no auth mechanism is available via L4_E2E_BASE_URL to ....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-a7f551fc is the scenario Features and navigation: featureLiterals reads the three feature files, TOOL_PAGES is registered in a fresh registry and visibleNav runs for carol, alice, a deploy_policy-only state and null. These are checks on module constants and the shared capability gate with constructed session states; the generic nav gating is the shell's and the browser cannot build a deploy_policy-only session. pages.test.ts traces the criterion with tests named by its id that assert the literals of each feature file, the registerToolMessages call and the four label sets, and the feature files hold those literals. No end-to-end test is needed for this criterion.
---

## Q-015: Hold H-161ae55b: UI criterion C-95a4662e has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-95a4662e has no end-to-end test; see the generated UI tests table

Step 5 for C-95a4662e: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_95a4662e::test_server_detail_loads_fails_refused_then_approved[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-95a4662e does have an end-to-end test: the repository's browser test for the M6 tool pages is tagged with its id and follows test-plan-browser.md § Servers 1 step by step, asserting the Loading status, the alert, the aria-disabled forced clicks with no dialog and no post, the pending tools, the digest_mismatch alert with the fourth detail request, both posted bodies and the fifth detail request with Surface approved. The page implements each step: the approve handler returns at once while disabled, LoadingState renders a status and ErrorPanel an alert, a refusal with reload reads the detail again and a success shows the approved text and reloads. The criterion was already accepted as satisfied in this unit. The unit can go on.
---

## Q-016: Hold H-dc200146: UI criterion C-39cb580c has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-39cb580c has no end-to-end test; see the generated UI tests table

Step 5 for C-39cb580c: writer_failed after 2 attempt(s); structured output missing: the reply holds no JSON object.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-39cb580c does have an end-to-end test in the repository: the browser test for the M6 tool pages is tagged with its id and follows test-plan-browser.md § Servers 2 step by step. It makes the tenant solo, follows the link acme and asserts one detail request with no page load, the self-approval note and the unticked box, the Tick alert with no dialog and no post on an unticked click, the box unticked again after a reload, the self_approval_required alert with the box appearing and no extra detail request, and the three posted bodies with selfApproval true, false and true. The page implements each step: the tick is cleared whenever a detail loads, the approve handler shows the approveRequest message as an alert without a dialog, and a refusal sets ownSurface from approveFailure so the box appears. The hold only reflects that the harness's own generated test writer failed, not a missing test. The unit can go on.
---

## Q-017: Hold H-364e7bae: UI criterion C-5f4e5a5b has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-5f4e5a5b has no end-to-end test; see the generated UI tests table

Step 5 for C-5f4e5a5b: writer_failed after 1 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-5f4e5a5b does have an end-to-end test in the repository: the browser test for the M6 tool pages is tagged with its id and follows test-plan-browser.md § Grants 1 step by step. It asserts the 403 alert with the decision id, the select left on Choose a tool and the forced click posting nothing while the tool list has failed, the two bound refs only once it is ready, the user_unknown text beside Role or user with the draft kept and the same Idempotency-Key on the retry, the reset form after the created grant, the refused confirm and revoke as alerts with no table request, each GRANT_DONE text followed by a table request, the expected request bodies and no dialog. The page implements it: the submit handler returns while the tool list is not ready or an action is busy, the key is kept until a create succeeds or a field changes, and each success resets the list. The hold only reflects that the harness's generated test writer was refused a tool call, not a missing test. The unit can go on.
---

## Q-018: Hold H-fca42b7c: UI criterion C-90aeb5ab has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-90aeb5ab has no end-to-end test; see the generated UI tests table

Step 5 for C-90aeb5ab: writer_failed after 1 attempt(s); the stream ended without a final stop (last reason: length).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
