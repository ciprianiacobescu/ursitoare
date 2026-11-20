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
| Q-008 | open | none | verdict | Hold H-5c823df8: UI criterion C-d8b03242 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-26953a7c: UI criterion C-d54270f7 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-4faceff9: UI criterion C-1818ac9b has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-8d0fd794: UI criterion C-9de28eec has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-5215cd10: UI criterion C-942b137c has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-c77bd28c: UI criterion C-d63e4803 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-157de455: UI criterion C-c3d0d88f has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-5c39e94a: UI criterion C-7837c9f9 has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-48d2a201: UI criterion C-c8aaa647 has no end-to-end test; see the generated UI tests table |
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

- **Status:** open
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
---

## Q-009: Hold H-26953a7c: UI criterion C-d54270f7 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-010: Hold H-4faceff9: UI criterion C-1818ac9b has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-011: Hold H-8d0fd794: UI criterion C-9de28eec has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-012: Hold H-5215cd10: UI criterion C-942b137c has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-013: Hold H-c77bd28c: UI criterion C-d63e4803 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-014: Hold H-157de455: UI criterion C-c3d0d88f has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-015: Hold H-5c39e94a: UI criterion C-7837c9f9 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-016: Hold H-48d2a201: UI criterion C-c8aaa647 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
