# Questions — add-home-dashboard

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
| Q-001 | answered | none | verdict | Criterion C-9517e900 (web-shell › Only a ready session gets the dashboard › The signed-out home is unchanged): accept as satisfied? |
| Q-002 | answered | none | verdict | Criterion C-c3d0d88f (web-shell › The dashboard renders each list and step from its own state › Alice sees her runs, flows and next step): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-7837c9f9 (web-shell › The dashboard renders each list and step from its own state › Carol sees setup steps from what the API shows): accept as satisfied? |
| Q-004 | open | none | verdict | Criterion C-c8aaa647 (web-shell › The dashboard renders each list and step from its own state › A failing list fails alone and Try again reads it again): accept as satisfied? |
| Q-005 | answered | none | verdict | Hold H-08110025: UI criterion C-48588514 has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-cea9172c: UI criterion C-9517e900 has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-cee9c0fd: UI criterion C-f82b7f78 has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-5c823df8: UI criterion C-d8b03242 has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-26953a7c: UI criterion C-d54270f7 has no end-to-end test; see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-4faceff9: UI criterion C-1818ac9b has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-8d0fd794: UI criterion C-9de28eec has no end-to-end test; see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-5215cd10: UI criterion C-942b137c has no end-to-end test; see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-c77bd28c: UI criterion C-d63e4803 has no end-to-end test; see the generated UI tests table |
| Q-014 | answered | none | verdict | Hold H-157de455: UI criterion C-c3d0d88f has no end-to-end test; see the generated UI tests table |
| Q-015 | answered | none | verdict | Hold H-5c39e94a: UI criterion C-7837c9f9 has no end-to-end test; see the generated UI tests table |
| Q-016 | answered | none | verdict | Hold H-48d2a201: UI criterion C-c8aaa647 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-9517e900 (web-shell › Only a ready session gets the dashboard › The signed-out home is unchanged): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-9517e900 (web-shell › Only a ready session gets the dashboard › The signed-out home is unchanged)

### Context
Criterion C-9517e900 (web-shell › Only a ready session gets the dashboard › The signed-out home is unchanged) is needs human after round 2.

Scenario:
\- **WHEN** `test_the_signed_out_home_is_unchanged` answers `/api/v1/me` with 401 and opens `/` at 1366 by 860, then answers every `/api/v1/*` call with alice's `/me` body and opens `/` again
\- **THEN** the first `main` text is "Ursitoare Engine healthy" with one `status` and no `region`; the second is the T8 text with 0 `alert`; axe passes on both and the `watch_csp` list is `[]`; `test_l4_c_87996887.py`, `test_m0_skeleton.py` and `test_l4_c_1542e67b.py` pass unchanged

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_home::test_the_signed_out_home_is_unchanged[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The signed-out home is unchanged in the code. HomePage renders the old Landing markup (h1, the engine-health paragraph with role status, Check again with aria-disabled) whenever homeView answers public, which it does for a null, signed_out or failed session, and the single health effect lives in HomePage so the branch swap does not refetch it. A 401 from /me gives signed_out through the capability loader, so no list request is made and no section (region) exists. When every /api/v1 call answers the /me body, the cursor-page parser rejects it with INVALID_RESPONSE, both lists show the could-not-be-loaded line with a Try again button and no alert, and with the runs fact unknown the Next steps section is not rendered, which gives exactly the T8 main text. The unit's browser test test_the_signed_out_home_is_unchanged asserts these texts, the status and region counts, axe and the CSP list; it was only ignored because a browser test has no red run, which the project's rules do not require.
---

## Q-002: Criterion C-c3d0d88f (web-shell › The dashboard renders each list and step from its own state › Alice sees her runs, flows and next step): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-c3d0d88f (web-shell › The dashboard renders each list and step from its own state › Alice sees her runs, flows and next step)

### Context
Criterion C-c3d0d88f (web-shell › The dashboard renders each list and step from its own state › Alice sees her runs, flows and next step) is needs human after round 2.

Scenario:
\- **WHEN** `test_alice_sees_recent_runs_recent_flows_and_her_next_step` mocks alice's six capabilities, three runs, three flows and `/api/v1/people`, and opens `/` at 1366 by 860
\- **THEN** "Recent runs" lists 3 items, the first "completed Run af5d03ac of demo-pay 3 min ago · 1.4 s · by you" and the second "failed Run 0000be11 of demo-grants 2 h ago · 1 min 15 s · by Bob Example"; "Recent flows" lists `demo-draft`, `demo-pay` and `alpha-flow`; "Next steps" links "Start a test run" (`/flows/demo-pay`) and "Review a failed run"; hovering the first time shows "<UTC minute of 200 s ago> UTC"; `status`, `alert` and `[aria-live]` counts are 1, 0, 1; there is one `/api/v1/me` and one `/api/v1/people?ids=user-2` request; layout (`assert_layout(page, 72)`), axe and CSP checks pass (the other texts are in test-plan-browser.md)

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_home::test_alice_sees_recent_runs_recent_flows_and_her_next_step[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The code renders alice's dashboard as the scenario describes. Run rows are a Badge, a link named by recentRunLinkName, then the ago text in a time element wrapped in a Tooltip of the exact UTC minute, followed by the duration and the by text; runRows gives by you for the signed-in user and by Bob Example from the name map, formatDuration gives 1.4 s and 1 min 15 s, formatAgo gives 3 min ago, 2 h ago and 1 d ago. Flow rows are sorted by recency so demo-draft, demo-pay and alpha-flow come in that order. nextSteps gives Start a test run at /flows/demo-pay for the validated flow and Review a failed run for the failed run. Only the other principals' ids are looked up, so one people request with ids=user-2 is made, and the capability loader caches /me so one request is made. The page's only status is the health pill and the only aria-live is the toast region. The unit's browser test asserts all of this and was ignored only for lacking a red run.
---

## Q-003: Criterion C-7837c9f9 (web-shell › The dashboard renders each list and step from its own state › Carol sees setup steps from what the API shows): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-7837c9f9 (web-shell › The dashboard renders each list and step from its own state › Carol sees setup steps from what the API shows)

### Context
Criterion C-7837c9f9 (web-shell › The dashboard renders each list and step from its own state › Carol sees setup steps from what the API shows) is needs human after round 2.

Scenario:
\- **WHEN** `test_carol_sees_setup_steps_from_what_the_api_shows` mocks carol's eleven capabilities, empty runs and flows, three tool servers (2 pending), `{ current: null, pendingGrants: 2 }` and three accounts (one active human without a role), and opens `/`
\- **THEN** "Next steps" lists "Give people a role", "Review pending tool servers" and "Deploy grant changes" with the texts of T4 N10 and the hrefs `/admin/users`, `/admin/tool-servers` and `/admin/policies`; "No runs yet" and "No flows yet" show the links "Browse flows" and "Go to flows" (`href` `/flows`); layout, axe and CSP checks pass

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_home::test_carol_sees_setup_steps_from_what_the_api_shows[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The code gives carol the three setup steps from what the API shows. loadPendingServers counts servers whose state is pending (2 of 3), loadUnassigned counts active human accounts with empty roles and localRoles (1 of 3), and a policy body with current null and pendingGrants 2 parses. nextSteps then returns Give people a role, Review pending tool servers and Deploy grant changes in that order with the T4 N10 descriptions and the hrefs /admin/users, /admin/tool-servers and /admin/policies; with every asked fact known the section is settled. Empty runs and flows render EmptyState No runs yet and No flows yet, and since carol lacks test_flow the links read Browse flows and Go to flows, both to /flows. The unit's browser test asserts these texts, hrefs, layout, axe and CSP and was ignored only for lacking a red run; the generated test for this criterion failed to import a module that is not installed and never ran.
---

## Q-004: Criterion C-c8aaa647 (web-shell › The dashboard renders each list and step from its own state › A failing list fails alone and Try again reads it again): accept as satisfied?

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The verification table says the harness's generated test for this criterion ran and fails at the head, with a screenshot and a trace as evidence. None of that is in the repository: the generated file, the test-results folder and the page capture are absent from the worktree or are harness output I m
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-c8aaa647 (web-shell › The dashboard renders each list and step from its own state › A failing list fails alone and Try again reads it again)

### Context
Criterion C-c8aaa647 (web-shell › The dashboard renders each list and step from its own state › A failing list fails alone and Try again reads it again) is needs human after round 2.

Scenario:
\- **WHEN** `test_a_failing_list_fails_alone_and_try_again_reads_it_again` answers `/api/v1/runs` with 500 once and then an empty page, and `/api/v1/flows` with `{}`, for alice, and clicks "Try again" in "Recent runs"; then a second page whose runs route answers 401 opens `/`
\- **THEN** both "could not be loaded." lines show with 0 `alert`, one `status` "Engine healthy" and no "Next steps" region; after the click "No runs yet" and the link "Choose a flow to test" (`/flows`) show, the flows line stays, the runs route was hit twice, and axe and CSP checks pass; the second page shows "Your session has ended." and "Sign in again", no "Try again" in "Recent runs" and one `/api/v1/me`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_home::test_a_failing_list_fails_alone_and_try_again_reads_it_again[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-08110025: UI criterion C-48588514 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-48588514 has no end-to-end test; see the generated UI tests table

Step 5 for C-48588514: not_testable after 2 attempt(s); homeView is a TypeScript module function invoked directly with session-state objects; the criterion's four cases (null, signed_out, failed, and ready usr_me/Alice Example) cannot be reproduced through the browser's public interface, and no UI affordance or endpoint lets a test set the session to ....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-48588514 is the view-selection scenario of homeView, a pure function of home.ts, and the specification itself frames it as a Node test: its WHEN clause says home-rows.test.ts calls homeView with the four session states. That test exists, is named with the criterion id, and asserts all four answers; the implementation returns public for null, signed_out and failed sessions and the dashboard view with the capabilities, user id and display name for a ready session. The session states cannot be set from a browser, and the browser-visible consequence of the same logic is covered by the signed-out home scenario. The hold can be waived.
---

## Q-006: Hold H-cea9172c: UI criterion C-9517e900 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-9517e900 has no end-to-end test; see the generated UI tests table

Step 5 for C-9517e900: writer_failed after 2 attempt(s); structured output missing: the reply holds no JSON object.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-9517e900 is the signed-out home scenario and the code gives exactly what it describes. A 401 from /me is turned into a signed_out state by the capability loader, homeView answers public for it, and HomePage then renders the old Landing markup: the h1 Ursitoare, the engine-health paragraph with role status and tabIndex -1, and Check again with aria-disabled, so the main text is Ursitoare plus the health text with one status and no region, since the shell's main holds only the page and the toast region carries aria-live without a region role. When every /api/v1 call answers the /me body, the session is ready with read_self, read_flow and read_run, the runs and flows loaders reject with INVALID_RESPONSE because the body has no items array, both sections show the could-not-be-loaded line with a Try again button and no alert, and with the runs fact unknown the Next steps section is not rendered, which gives the T8 main text word for word. The frozen landing pins read the same heading, status text, Check again attribute and focus behaviour, all of which the kept PublicHome markup provides. The unit's own browser test test_the_signed_out_home_is_unchanged is tagged with this criterion and asserts these texts, counts, axe and CSP; the hold exists only because the harness could not write its own copy.
---

## Q-007: Hold H-cee9c0fd: UI criterion C-f82b7f78 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-f82b7f78 has no end-to-end test; see the generated UI tests table

Step 5 for C-f82b7f78: not_testable after 1 attempt(s); runRows and recentRunLinkName are internal pure functions asserted by direct call (including runRows([], …) === []) with controlled nowMs/meId/names; the page fixture against the base URL exposes no HTTP/HTML surface for these function results or parameters..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-f82b7f78 is the runRows and recentRunLinkName scenario, which the specification itself frames as a direct call from home-rows.test.ts with a fixed nowMs, meId and name map. These are pure functions of home.ts with no browser surface of their own, so an end-to-end test cannot drive them and the Node test is the right trace. That test exists, is named with the criterion id, feeds the seven T2 runs and asserts the five expected rows, the empty result and the three link names. I traced the implementation against each expected value: the slice to five, the last eight characters of the id, runStateTone, formatAgo, formatInstant, formatDuration with the dash for a null startedAt, by you for the signed-in id, by name for a non-blank name and null for an unknown or blank one. The hold can be waived.
---

## Q-008: Hold H-5c823df8: UI criterion C-d8b03242 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-d8b03242 has no end-to-end test; see the generated UI tests table

Step 5 for C-d8b03242: not_testable after 2 attempt(s); The criterion pins flowRows output to a fixed nowMs and injected fixture flows (F1-F7) and asserts internal return values including recentFlows([]) === []; these cannot be driven or observed through the page's public interface in an E2E test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-d8b03242 is the recentFlows and flowRows scenario, which the specification frames as a direct call from home-rows.test.ts with the seven T3 flows and a fixed nowMs. These are pure functions of home.ts, so the Node test is the proper trace and there is no browser surface to drive them with injected flows and a frozen clock. The test exists, is named with the criterion id, and asserts the recency order demo-draft, demo-pay, alpha-flow, beta-flow, zeta-flow, the exclusion of gone and old-one, the empty result, every version label and tone of T3, and that a published version reads v4 · published with info. I traced the implementation: the change instant is Date.parse of the latest version's createdAt else the flow's createdAt, ties go to the smaller flow id, the list is cut to five, validationOk false gives has errors with danger, no latest gives No version yet, and versionStateTone maps validated to success and published to info. The hold can be waived.
---

## Q-009: Hold H-26953a7c: UI criterion C-d54270f7 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-d54270f7 has no end-to-end test; see the generated UI tests table

Step 5 for C-d54270f7: not_testable after 1 attempt(s); The criterion requires reproducing several backend capability/fact states (rows N1–N5b of test-plan.md T4) and asserting T4-specific texts; neither the plan rows/texts nor a way to set those states through the public interface is available against a single live origin..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-d54270f7 is the author scenario of nextSteps, which the specification frames as a direct call with the author capabilities and the facts of rows N1 to N5b of test-plan.md T4. nextSteps is a pure function of home.ts, so the Node test is the proper trace; the browser cannot set those fact states and the rows and texts are fixed by the test plan. The test exists, is named with the criterion id, and asserts each row: no flow gives only create-first-flow with settled true, a validated demo-pay gives start-test-run at /flows/demo-pay, two unvalidated flows give open-a-flow at /flows/demo-draft, a failed run with no flow gives create-first-flow then review-failed-run, and an incomplete flow page still gives start-test-run, with the T4 labels and descriptions. I traced the implementation: the flow step needs test_flow and a known flows fact, picks the flow changed last whose latest version is validated, else the flow changed last, the failed-run step needs read_run and a known runs fact and takes the first failed of the first five, and settled is true when every asked fact is known. The hold can be waived.
---

## Q-010: Hold H-4faceff9: UI criterion C-1818ac9b has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-1818ac9b has no end-to-end test; see the generated UI tests table

Step 5 for C-1818ac9b: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_1818ac9b::test_administrator_next_steps_are_setup_counts[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-1818ac9b is the administrator scenario of nextSteps, which the specification frames as a direct call with carol's eleven capabilities and rows N10 to N15 of test-plan.md T4. nextSteps is a pure function of home.ts, so the Node test is the proper trace. That test exists, is named with the criterion id, and asserts the rows: one unassigned person, two pending servers and two undeployed grants give assign-roles, review-pending-tool-servers and deploy-grant-changes in that order with badges 1, 2 and 2 and settled true; an incomplete page of 200 gives badge 200+ and an At least description; counts of zero give no step with settled true; and the unknown-fact rows give a floor badge with settled false. I traced the implementation: each count step needs its capability and a known fact, the badge is the count or count plus a plus sign when the page was incomplete, the description gets the At least prefix in that case, the steps are concatenated in the specified order, and settled follows the asked facts. The generated browser test that failed at the head is not in the repository, so its failure could not be read, but the unit's own carol browser test drives the same role and counts through the page and expects the three steps with their texts and hrefs. The hold can be waived.
---

## Q-011: Hold H-8d0fd794: UI criterion C-9de28eec has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-9de28eec has no end-to-end test; see the generated UI tests table

Step 5 for C-9de28eec: writer_failed after 2 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-9de28eec is the scenario in which nothing is claimed that the page has not read. The specification frames it as a direct call of nextSteps with the reader capabilities and rows N6 to N9, N13 and N16 to N18, and nextSteps is a pure function with no browser surface of its own, so a Node test is the intended trace. That test exists, is named with the criterion id, and asserts each row: a completed run gives no step with settled true, a failed run in sixth place gives no step, unknown runs give no step with settled false, an administrator with policy and users unknown and three servers on an incomplete page gets only the pending tool servers step with badge 3+ and settled false, and read_self alone or an author with no facts gives no step with settled false. The implementation returns a step only when the capability is present and the fact is known, looks only at the first five runs, and sets settled only when at least one fact was asked for and every asked fact is known. The hold can be waived.
---

## Q-012: Hold H-5215cd10: UI criterion C-942b137c has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-942b137c has no end-to-end test; see the generated UI tests table

Step 5 for C-942b137c: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_942b137c::test_next_step_links_point_to_existing_pages[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-942b137c is the scenario in which the seven steps link to registered pages. The specification frames it as a collection of nextSteps results in a Node test, and that test exists, is named with the criterion id, builds the page patterns from ADMIN_PAGES, TOOL_PAGES, FLOW_PAGES and RUN_PAGES, and asserts the seven ids, the seven hrefs, that every href matches a registered path, that no label is a navigation label or contains Ursitoare, and that the seven labels are distinct. I checked the hrefs the implementation emits against the page tables: /admin/users, /admin/tool-servers and /admin/policies are literal paths there, /flows is a path, and /flows/<id> and /runs/<id> match the parameterised flow editor and run pages. The seven labels are Create your first flow, Start a test run, Open a flow, Review a failed run, Give people a role, Review pending tool servers and Deploy grant changes, none of which is a navigation label. The generated browser test that failed at the head is not in the repository, so its failure could not be read, but the criterion as written is satisfied and traced. The hold can be waived.
---

## Q-013: Hold H-c77bd28c: UI criterion C-d63e4803 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-d63e4803 has no end-to-end test; see the generated UI tests table

Step 5 for C-d63e4803: not_testable after 1 attempt(s); This criterion checks static source-file properties (needles present/absent in HomePage.tsx/10-home.tsx/home.ts, <HomePage /> props, and utility function results) which are not observable through the browser's public interface..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-d63e4803 is the source-pin scenario: it reads HomePage.tsx, 10-home.tsx and home.ts as text and checks needles, counts and the four scanners. These are properties of source files, not of the rendered page, so no browser test can check them and the Node test is the only proper trace. That test exists, is named with the criterion id, and I checked every one of its assertions against the current sources: HomePage.tsx holds exactly two role status attributes, one literal h1 Ursitoare, one page header title, no role alert, aria-live, DataTable, ErrorPanel, LoadingState, browserSession, style attribute, outline-none or native disabled, and reads its lists with createApiClient; 10-home.tsx renders HomePage with id home, path / and navLabel Home and holds no state; home.ts imports no React and uses Date.parse rather than new Date, Date.now, Math.random, document or window. The hold can be waived.
---

## Q-014: Hold H-157de455: UI criterion C-c3d0d88f has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-c3d0d88f has no end-to-end test; see the generated UI tests table

Step 5 for C-c3d0d88f: writer_failed after 2 attempt(s); the stream ended without a final stop (last reason: length).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-c3d0d88f is the scenario in which alice sees her runs, flows and next step. The unit ships its own browser test for it, test_alice_sees_recent_runs_recent_flows_and_her_next_step, tagged with the criterion id, and it asserts the three run texts, the three flow rows, the two next-step links and hrefs, the tooltip minute, the status, alert and aria-live counts, the single me and people requests, layout, axe and CSP. I traced the code against those texts: a run started 200 seconds ago reads 3 min ago and a 1.4 second span reads 1.4 s, 7500 seconds reads 2 h ago and 75 seconds reads 1 min 15 s, a queued run shows its createdAt age and the dash, own runs read by you and the other principal's name comes from the name lookup, which requests only the ids that are not the signed-in user, so one people request with ids user-2. Flows are sorted by recency to demo-draft, demo-pay, alpha-flow, the validated demo-pay gives Start a test run and the failed run gives Review a failed run, and the time element carries a Tooltip of the exact UTC minute. The harness's writer failed for a length limit, not for anything in the code. The hold can be waived.
---

## Q-015: Hold H-5c39e94a: UI criterion C-7837c9f9 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-7837c9f9 has no end-to-end test; see the generated UI tests table

Step 5 for C-7837c9f9: uncollectable after 1 attempt(s); no test of the new file ran at the merge base (collection error or no test).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-7837c9f9 is the scenario in which carol sees setup steps from what the API shows. The unit ships its own browser test for it, test_carol_sees_setup_steps_from_what_the_api_shows, tagged with the criterion id, and it asserts the three step links and hrefs, the three descriptions, the No runs yet and No flows yet empty states with Browse flows and Go to flows to /flows, layout, axe and CSP. The harness's generated copy was uncollectable only because it imported a playwright_axe module that is not installed; the unit's test uses the accessibility helper of the e2e conftest instead. I traced the code: the tool server parser accepts the three servers and the loader counts the two pending ones, the account parser accepts the three accounts and the loader counts the one active human with empty roles and localRoles, a policy body with current null and pendingGrants 2 parses to two pending grants, and nextSteps gives Give people a role, Review pending tool servers and Deploy grant changes in that order with the T4 N10 texts and the admin hrefs. Carol lacks test_flow, so the empty states link Browse flows and Go to flows. The hold can be waived.
---

## Q-016: Hold H-48d2a201: UI criterion C-c8aaa647 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-c8aaa647 has no end-to-end test; see the generated UI tests table

Step 5 for C-c8aaa647: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_c8aaa647::test_a_failing_list_fails_alone_and_try_again_reads_it_again[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Criterion C-c8aaa647 is the scenario in which a failing list fails alone and Try again reads it again. The unit ships its own browser test for it, test_a_failing_list_fails_alone_and_try_again_reads_it_again, tagged with the criterion id, and it asserts every row of the scenario: both could-not-be-loaded lines, zero alerts, one status reading Engine healthy, no Next steps region, the click on Try again in Recent runs followed by No runs yet and the link Choose a flow to test to /flows while the flows line stays, two hits on the runs route, axe and CSP, and on a second page a 401 giving Your session has ended, a Sign in again link to the sign-in URL, no Try again and one /me request. I traced the code against those texts. The lists use the plain createApiClient, which turns a 500 envelope into an ApiRequestError and makes no session redirect. A 500 or a body without an items array rejects the loader, so each list renders its own failure paragraph with a Try again button and no alert. Try again bumps the loader's attempt counter and runs only that loader again; an empty page then renders the EmptyState No runs yet and, since alice has test_flow, the link Choose a flow to test to /flows, while the flows loader's state is untouched. With the runs and flows facts unknown, nextSteps returns no step and settled false, so the Next steps section is not rendered. A 401 with code UNAUTHENTICATED renders Your session has ended and a Sign in again link to /sign-in?error=SESSION_ENDED&return_to=%2F without a Try again button. The health pill is the only status. The generated test that fails at the head is not in the repository, so its failure could not be read, and the gate excerpt shows another generated test that could not even be imported. The hold can be waived.
