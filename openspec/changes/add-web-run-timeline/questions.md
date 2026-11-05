# Questions — add-web-run-timeline

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
| Q-001 | accepted | 3.1 | technical | web/src/runs/timeline.test.ts:61-63: wrong expectation for started step in a live run |
| Q-002 | answered | none | verdict | Criterion C-2ceae13f (web-runs › Run views are parsed strictly and read through four loaders › Views are parsed strictly): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-4ef9cb9c (web-runs › The M4 journey proves test runs and the timeline in a browser › Alice test-runs a flow and follows the run): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-bffa668a (web-runs › The M4 journey proves test runs and the timeline in a browser › Bob reads the run but cannot start one): accept as satisfied? |
| Q-005 | answered | none | verdict | Finding F-81bc478e: Payload parser accepts values outside PayloadValue |
| Q-006 | answered | none | verdict | Hold H-e62fdc45: UI criterion C-2ceae13f has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-eec0048a: UI criterion C-8a285469 has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-32069270: UI criterion C-44473e25 has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-07248f6f: UI criterion C-95befb77 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-420abdfd: UI criterion C-f2512ba4 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-7a90109b: UI criterion C-b67fc6a7 has no end-to-end test; see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-ed380471: UI criterion C-a8d83d86 has no end-to-end test; see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-c59c8e20: UI criterion C-c7363684 has no end-to-end test; see the generated UI tests table |
| Q-014 | answered | none | verdict | Hold H-ac6e12a7: UI criterion C-e75f18dc has no end-to-end test; see the generated UI tests table |
| Q-015 | answered | none | verdict | Hold H-36f31dc8: UI criterion C-4ef9cb9c has no end-to-end test; see the generated UI tests table |
| Q-016 | answered | none | verdict | Hold H-70326357: UI criterion C-bffa668a has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: web/src/runs/timeline.test.ts:61-63: wrong expectation for started step in a live run

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-05T15:15Z by claude-sonnet, run r-20261105T1340Z-4a10, task 3.1

### Context
The test at line 54 expects stepStateLabel('started', 'queued' or 'running') to give { label: 'started', note: null }. The spec (C-95befb77: '{ label: "running", note: null } for started with queued, running'), design decision 5, and the test at line 83 ('block · running' for a running run) all require label 'running'. Both tests cannot pass.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `web/src/runs/timeline.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-run-timeline`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `web/src/runs/timeline.test.ts`: in the loop at lines 61-63, make `want` be `{ label: "running", note: null }` when state is "started" and runState is "queued" or "running".

### Clarifier suggestion
Edit `web/src/runs/timeline.test.ts`: in the loop at lines 61-63, make `want` be `{ label: "running", note: null }` when state is "started" and runState is "queued" or "running".

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-2ceae13f (web-runs › Run views are parsed strictly and read through four loaders › Views are parsed strictly): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-2ceae13f (web-runs › Run views are parsed strictly and read through four loaders › Views are parsed strictly)

### Context
Criterion C-2ceae13f (web-runs › Run views are parsed strictly and read through four loaders › Views are parsed strictly) is needs human after round 1.

Scenario:
\- **WHEN** `parseRunView(RUN)`, `parseStepView(STEPS[2])` and `parsePayloadView({ sha256: D("4"), mediaType: "application/json", size: 38, data: { payment_id: "P-1" } })` run; `parseRunView` gets `RUN` with `state: "paused"`, no `ownerTeam`, `principal.kind: "robot"`, `error: { code: "X" }`, a 63-character `inputRef`; `parseStepView` gets `STEPS[2]` with `seq: -1`, `taint: [1]` and `state: "done"`; `parsePayloadView` gets `size: -1` and no `data`; `parseRunView` gets `RUN` plus `extra: 1`
\- **THEN** the valid inputs give values deep-equal to them, `principal`, `error` and `taint` being copies; every invalid input gives `null`; `extra: 1` is dropped

Why: judge fail counted as insufficient_evidence: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))
Judge: fail
Tracing tests: web.src.runs.types.test.ts::C-2ceae13f parseRunView drops a property it does not know (passed, red_assertion); web.src.runs.types.test.ts::C-2ceae13f the parsers keep the valid views with copies of their nested values (passed, red_assertion, inadequate); web.src.runs.types.test.ts::C-2ceae13f the parsers refuse the malformed views (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The parsers behave as the scenario asks. parseRunView, parseStepView and parsePayloadView build fresh objects from known fields only, so an unknown property such as extra is dropped; principal, error and taint are rebuilt rather than reused, so they are copies. Every malformed input of the scenario is refused with null: a state outside the union, a missing ownerTeam, a principal kind robot, an error missing fields, a 63-character inputRef (the digest pattern requires exactly 64 hex characters), a negative seq, a numeric taint entry, a step state outside the union, a negative size and a payload without a data property. The three tracing tests pass. The judge's counterexample (data: undefined) is outside the scenario and cannot come from the runs API, whose answers are produced by JSON.parse.
---

## Q-003: Criterion C-4ef9cb9c (web-runs › The M4 journey proves test runs and the timeline in a browser › Alice test-runs a flow and follows the run): accept as satisfied?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The criterion is proven only in a browser. I read e2e/test_m4_runs.py and the three components; the locators (h1 Run <runId>, status Run state, list Steps, regions Step details, Input, Output, ErrorPanel plus Try again, table Runs) match the markup. But I cannot run the journey, cannot verify assert
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-4ef9cb9c (web-runs › The M4 journey proves test runs and the timeline in a browser › Alice test-runs a flow and follows the run)

### Context
Criterion C-4ef9cb9c (web-runs › The M4 journey proves test runs and the timeline in a browser › Alice test-runs a flow and follows the run) is needs human after round 1.

Scenario:
\- **WHEN** alice signs in with `login(page, users["alice"])`, opens "Flows", creates `demo-pay` for `finance`, reads the region "Test run", fills "Flow text" with `DEMO_PAY`, presses "Save version" and "Validate", fills "Input (JSON)" and "Mocks (JSON)" with `INPUT_TEXT` and `MOCKS_TEXT`, presses "Start test run", follows the one link of the region, presses `pay` then `route` in the list "Steps", with the run completed injects the fault of reference.md § Failures, reopens the run page, removes the fault and presses "Try again", opens "Runs" in the navigation, then opens `/runs/ghost`
\- **THEN** the region "Test run" first shows "Save and validate a version to test-run it." and no button "Start test run"; after "Valid. 0 errors" it has the two textboxes and the button, and after the press the status "Started test run <runId>." and one link named `Open run <runId>`; the link leads to `/runs/<runId>`, title `Run <runId> · Ursitoare`, heading `Run <runId>`; the status "Run state" reads "State: completed" within 20 seconds; the list "Steps" has the buttons `lookup`, `route`, `pay`, `done` in order; after `pay` that button has `aria-expanded` "true" and the region "Step details" shows `block`, `completed`, "Idempotency key"; its region "Input" shows the lines `"vendor_id": "V-1"`, `"amount": 12.5`, `"currency": "EUR"` and `"reference": "demo"` and its region "Output" shows `"payment_id": "P-1"`; after `route` it shows `active`; with the fault the page shows an alert (`Something went wrong`, `FAULT_INJECTED`) and a button "Try again", then the list "Steps" is back after the fault is removed and the button pressed; "Runs" opens the title `Runs · Ursitoare`, the heading "Runs" and the table "Runs", whose row for the run shows `demo-pay`, `mock`, `completed` and the link `Open run <runId>`; `/runs/ghost` shows an alert containing `NOT_FOUND`; `assert_accessible(page)` passes on every page it opened, the landing page included

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m4_runs::test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The journey test e2e/test_m4_runs.py::test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run asserts this scenario step by step: the Test run panel text and no Start test run button before Validate, the two textboxes and the button after "Valid. 0 errors", the status "Started test run <runId>." and the one Open run link, the URL, title and heading of /runs/<runId>, "State: completed", the step buttons lookup, route, pay, done in order, aria-expanded and the Step details, Input and Output lines after pay, active after route, the fault alert with Try again, the Runs row, and the NOT_FOUND alert of /runs/ghost, with assert_accessible on each page. It passed in this round's e2e gate (run 42081317007, 18:19Z: 58 tests, 58 passed, 0 failed). It cannot pass at base: TestRunPanel.tsx, RunPage.tsx, RunsPage.tsx and features/80-runs.tsx do not exist on main, so its first panel assertion fails there. L4 lacks only a recorded red run for it, because the journey is not part of the red/green test command. Committed by Claude Code as the owner's delegate.
---

## Q-004: Criterion C-bffa668a (web-runs › The M4 journey proves test runs and the timeline in a browser › Bob reads the run but cannot start one): accept as satisfied?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): Same situation as Q-003: the criterion is browser-only. The journey test in e2e/test_m4_runs.py asserts the scenario (State: completed, the four step buttons, no Start test run button, the text Only authors can start a test run.) and TestRunPanel.tsx renders the denied message as a paragraph without
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-bffa668a (web-runs › The M4 journey proves test runs and the timeline in a browser › Bob reads the run but cannot start one)

### Context
Criterion C-bffa668a (web-runs › The M4 journey proves test runs and the timeline in a browser › Bob reads the run but cannot start one) is needs human after round 1.

Scenario:
\- **WHEN** alice sets up the run of the previous scenario in one context, and bob signs in in a second context, opens "Runs", follows the link `Open run <runId>` of the table "Runs", then opens "Flows" and the link `demo-pay`
\- **THEN** bob's run page shows "State: completed", the buttons `lookup`, `route`, `pay`, `done` and no button "Start test run"; his editor page shows in the region "Test run" the text "Only authors can start a test run." and no button "Start test run"; `assert_accessible(page)` passes on both

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m4_runs::test_c_bffa668a_bob_reads_the_run_but_cannot_start_one[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The journey test e2e/test_m4_runs.py::test_c_bffa668a_bob_reads_the_run_but_cannot_start_one sets up alice's run in one context and signs bob in in a second, then asserts the scenario: bob opens Runs and the run's link, reads "State: completed" and the four step buttons with no Start test run button, and on demo-pay sees "Only authors can start a test run." with no Start test run button, with assert_accessible on his pages. It passed in this round's e2e gate (run 42081317007, 18:19Z: 58 tests, 58 passed, 0 failed), and it cannot pass at base because the Runs pages and the Test run panel are new in this unit (absent on main). L4 lacks only a recorded red run, as the journey is not part of the red/green test command. Committed by Claude Code as the owner's delegate.
---

## Q-005: Finding F-81bc478e: Payload parser accepts values outside PayloadValue

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-2ceae13f).

Title: Payload parser accepts values outside PayloadValue
Detail: parsePayloadView accepts any own data property by casting raw["data"] to PayloadValue. Consequently an invalid API response with data: undefined is accepted instead of rejected.
Suggested fix: Validate data recursively as null, boolean, finite number, string, an array of PayloadValue values, or an object whose values are PayloadValue values before constructing the PayloadView.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-2ceae13f as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding is waived. The counterexample, a payload answer whose data property is undefined, cannot reach parsePayloadView: every answer of the runs API goes through the API client, which obtains the body with JSON.parse, and JSON.parse never produces undefined, functions or symbols. Every value JSON.parse can produce (null, boolean, number, string, array, object of such values) is a PayloadValue, so the cast is sound for API answers, which is what the requirement is about. The parser still refuses a payload with no data property, a bad digest, an empty media type or a bad size, as the scenario demands.
---

## Q-006: Hold H-e62fdc45: UI criterion C-2ceae13f has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2ceae13f has no end-to-end test; see the generated UI tests table

Step 5 for C-2ceae13f: not_testable after 1 attempt(s); The criterion tests internal TypeScript parser functions and deep-equality/copy behavior, which cannot be observed through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion exercises the pure parser functions parseRunView, parseStepView and parsePayloadView with hand-built inputs and asks for deep equality, copies and null results. Nothing in it is visible in a browser, so an end-to-end test cannot check it. The three Node tests in types.test.ts cover its inputs and pass.
---

## Q-007: Hold H-eec0048a: UI criterion C-8a285469 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-8a285469 has no end-to-end test; see the generated UI tests table

Step 5 for C-8a285469: not_testable after 1 attempt(s); This criterion validates internal TypeScript loader calls and parsed return values, which pytest-playwright cannot mock or inspect through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion's scenario drives runListFetcher, loadRun, loadSteps and loadPayload with an in-process recording client and asserts the exact paths, query options, signals, parsed values, the five-page cap and the RangeError raised before any request; none of that is observable in a browser, so an end-to-end test cannot check it. The Node tests in runs-source.test.ts assert every clause of the scenario against the implementation in runs-source.ts and the kit's cursorPageFetcher, and the run list and run page that use these loaders are exercised in the browser by the M4 journey.
---

## Q-008: Hold H-32069270: UI criterion C-44473e25 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-44473e25 has no end-to-end test; see the generated UI tests table

Step 5 for C-44473e25: not_testable after 1 attempt(s); Tests internal web module APIs and thrown errors, not browser-observable user behavior..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion's scenario reads stepRenderers.list(), looks up kinds, registers a renderer and expects StepRendererError codes for duplicates and seven invalid renderers while the list stays unchanged. These are calls to an in-process registry and thrown errors; a browser shows none of them, so an end-to-end test cannot check the criterion. The Node tests in step-renderers.test.ts assert every clause of the scenario, and step-renderers.ts implements the kind pattern, the Map-backed lookup, the default renderer and the two error codes.
---

## Q-009: Hold H-07248f6f: UI criterion C-95befb77 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-95befb77 has no end-to-end test; see the generated UI tests table

Step 5 for C-95befb77: not_testable after 2 attempt(s); Criterion tests pure timeline helper functions and fixtures, not an observable browser flow..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion's scenario calls stepStateLabel, timelineItems, stepDetailRows, decisionHref, runErrorText, payloadShown and setPayloadLoad with hand-built steps and payload loads and asks for exact return values, a new Map and an unchanged input map. These are pure helpers; a browser cannot call them or inspect their results. The Node tests in timeline.test.ts assert every clause of the scenario, including PAY_ROWS and PAY_FAILED_TAIL of reference.md, and timeline.ts implements them. The visible side of the timeline, the step buttons, details and payload text, is proven in the browser by the M4 journey.
---

## Q-010: Hold H-420abdfd: UI criterion C-f2512ba4 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The hold rests on a generated browser test, test_l4_c_f2512ba4.py, that fails at the head after two attempts. That file is not in the repository (e2e/ holds no test_l4_c_f2512ba4.py) and its screenshot and trace are not either, so I cannot read what it asserted or why it failed, and I cannot rule ou
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-f2512ba4 has no end-to-end test; see the generated UI tests table

Step 5 for C-f2512ba4: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_f2512ba4::test_polling_follows_run_until_it_ends[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-7a90109b: UI criterion C-b67fc6a7 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The hold rests on a generated browser test, test_l4_c_b67fc6a7.py, that fails at the head after two attempts. The file is not in the repository (e2e/ holds no such file) and neither are its screenshot or trace, so I cannot read what it asserted or why it failed, and I cannot rule out a browser-visib
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b67fc6a7 has no end-to-end test; see the generated UI tests table

Step 5 for C-b67fc6a7: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_b67fc6a7::test_run_pages_are_registered_with_fixed_names[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-ed380471: UI criterion C-a8d83d86 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a8d83d86 has no end-to-end test; see the generated UI tests table

Step 5 for C-a8d83d86: not_testable after 1 attempt(s); The criterion tests internal TypeScript helper return values that are not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion's scenario calls testPanelView and parseTestInputs with hand-built sessions, versions and texts and asks for exact return values: the loading, unavailable, denied, no_version and form views, the parsed objects, an own __proto__ property and the three error texts. These are return values of pure helpers that a browser cannot call or inspect, so an end-to-end test cannot check the criterion as written. The five Node tests in test-run.test.ts assert every clause against test-run.ts, which implements the capability check, the draft rule and the trimmed JSON object parsing. The visible side of the panel, its no_version and denied texts and the absence of the button, is exercised in the browser by the M4 journey for alice and bob.
---

## Q-013: Hold H-c59c8e20: UI criterion C-c7363684 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c7363684 has no end-to-end test; see the generated UI tests table

Step 5 for C-c7363684: not_testable after 1 attempt(s); Requires direct unit-level checks of recording-client call objects, thrown RangeError/ApiRequestError types, registration idempotency, and message-table equality that are not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion's scenario drives startTestRun with a recording client and asserts the exact POST path, body and Idempotency-Key header, an INVALID_RESPONSE rejection for a run outside the union, RangeError rejections without a request for a bad flow id or hash, that registerRunMessages can run twice, and the exact FormErrors value of testRunFormErrors for each error of reference.md § Messages. These are call records, thrown error types and returned objects that a browser cannot observe, so an end-to-end test cannot check the criterion as written. The six Node tests in test-run.test.ts assert every clause, and test-run.ts implements the flow-id and hash patterns, the encoded path, the parseRunView check and the message mapping. The engine-side refusal path is also proven on the real stack by the Node journey, where a missing mock gives the TEST_MOCK_MISSING form error.
---

## Q-014: Hold H-ac6e12a7: UI criterion C-e75f18dc has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-e75f18dc has no end-to-end test; see the generated UI tests table

Step 5 for C-e75f18dc: not_testable after 1 attempt(s); The provided diff and snapshot do not expose the login, flow-editor, or backend routes needed to drive and assert this multi-user engine scenario reliably..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion is not a browser criterion: its scenario is the Node journey m4-runs.test.ts, which starts the e2e stack in-process, signs in alice, bob and mallory through the session helpers and calls the logic functions directly against the engine. The test exists, carries the criterion id, and asserts every clause of the scenario: the start answer's flow, mode, owner team and principal, the completed run with terminal node done, the four steps with their kinds, states and the route outcome, the pay input and output payloads, both lists holding the run id, bob reading the run, bob's 403, mallory's 404 and empty list, the 422 TEST_MOCK_MISSING with its form error text, and the two capability sets. The judge passed it and its tracing test passed from a red assertion. A pytest-playwright test cannot call followRun or loadPayload or read ApiRequestError statuses, so the lack of a generated browser test is expected; the browser side of the same story is the M4 journey's job.
---

## Q-015: Hold H-36f31dc8: UI criterion C-4ef9cb9c has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-4ef9cb9c has no end-to-end test; see the generated UI tests table

Step 5 for C-4ef9cb9c: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_4ef9cb9c::test_alice_test_runs_flow_and_follows_run[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion does have an end-to-end test: e2e/test_m4_runs.py tags its alice test with this criterion id and asserts every clause of the scenario in order: the panel's initial text and missing button, the two textboxes after Valid. 0 errors, the status Started test run and the single link, the run page address, title and heading, State: completed within 20 seconds, the four step buttons in order, aria-expanded on pay with the details, Input lines and Output P-1, active after route, the injected 503 fault giving the alert with Something went wrong and FAULT_INJECTED and the Try again button, the Steps list back after the fault is removed, the Runs page title, heading and table row, the NOT_FOUND alert for /runs/ghost, and assert_accessible on every page from the landing page on. The production code carries the matching roles and names. The project's rules say a red step runs only the Node gate and a browser-only criterion is tagged for the verifier rather than listed in criteria_ids, so the lack of a red record is the project's own convention, not a gap. The generated test of step 5 fails at the base as well as the head, so it does not discriminate and says nothing about the head.
---

## Q-016: Hold H-70326357: UI criterion C-bffa668a has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-bffa668a has no end-to-end test; see the generated UI tests table

Step 5 for C-bffa668a: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_bffa668a::test_bob_reads_run_but_cannot_start_one[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold is waived. The criterion does have an end-to-end test: e2e/test_m4_runs.py tags its bob test with this criterion id. Alice sets up the run in the first context, bob signs in in a second browser context, opens Runs, follows the link Open run of the Runs table, and the test asserts State: completed, the buttons lookup, route, pay, done in order, no button Start test run, then opens Flows and demo-pay and asserts the region Test run shows Only authors can start a test run. with no Start test run button, with assert_accessible on both of bob's pages. That is every clause of the scenario. The denied text comes from testPanelView when the session lacks test_flow, and the Node engine journey proves bob really lacks that capability. The project's rules say browser-only criteria are tagged for the verifier and that a red step cannot run e2e tests, so the lack of a red record is by design. The generated test of step 5 fails at the base as well as the head, so it does not discriminate and says nothing about the head.
