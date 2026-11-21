# Questions — add-run-view

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
| Q-001 | accepted | 5.1 | technical | e2e/test_m6b_run_view.py:59-76: step() mock lacks fields that parseStepView requires |
| Q-002 | answered | none | verdict | Criterion C-b43a5bfb (web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-2836a3bc (web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-6bfd6320 (web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request): accept as satisfied? |
| Q-005 | answered | none | verdict | Hold H-51c57b0f: UI criterion C-56e16a37 has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-bcb55e31: UI criterion C-01ce6552 has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-e730fe4b: UI criterion C-b43a5bfb has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-eabaff7f: UI criterion C-2836a3bc has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-14b82d26: UI criterion C-6bfd6320 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: e2e/test_m6b_run_view.py:59-76: step() mock lacks fields that parseStepView requires

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-11-21T06:38Z by claude-sonnet, run r-20261121T0424Z-1491, task 5.1

### Context
The step() helper returns seq, nodeId, kind, state, outcome, inputRef, outputRef, error, hooks, startedAt and endedAt. parseStepView in web/src/runs/types.ts rejects a step without effectSeq (integer >= 0), attempt (integer >= 1), idemKey (null or non-empty string), policyDecisionId (null or non-empty string) and taint (array of strings). The step list therefore fails to parse and the run page shows no status, no previews and no Steps list. That is the exact failure the harness reported: `get_by_role('status', name='Run state')` finds nothing and `p.runs-preview` count is 0. The parser is pinned by existing frozen tests, so green cannot loosen it.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m6b_run_view.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-run-view`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m6b_run_view.py`: in `step()` add the keys `"effectSeq": seq, "attempt": 1, "idemKey": None, "policyDecisionId": None, "taint": []` to the returned dict.
2. Edit `web/src/runs/types.ts` to make those fields optional (breaks the pins of existing frozen tests).

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m6b_run_view::test_previews_stop_at_fifty_and_run_four_at_a_time[chromium], test_m6b_run_view::test_run_page_header_previews_and_columns[chromium]
E       AssertionError: Locator expected to have count '50'
E       Actual value: 0
E       Call log: (same for 2 tests)
E         - Expect "to_have_count" locator("p.runs-preview") with timeout 30000ms
E         - waiting for locator("p.runs-preview")
E           64 × locator resolved to 0 elements
E       AssertionError: Locator expected to have text 'State: completed'
E       Actual value: None
E       Error: element(s) not found
E         - Expect "to_have_text" get_by_role("status", name="Run state") with timeout 5000ms
E         - waiting for get_by_role("sta
e2e/test_m6b_run_view.py:169

### Clarifier suggestion
Edit `e2e/test_m6b_run_view.py`: in `step()` add the keys `"effectSeq": seq, "attempt": 1, "idemKey": None, "policyDecisionId": None, "taint": []` to the returned dict.

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-b43a5bfb (web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-b43a5bfb (web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860)

### Context
Criterion C-b43a5bfb (web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860) is needs human after round 1.

Scenario:
\- **WHEN** `test_run_page_header_previews_and_columns` loads `/runs/run_1` with the mocks of test-plan-browser.md (4 steps, `/people` answering "Alice Example")
\- **THEN** the status has text `State: completed` and `data-tone` `success`; "Started by Alice Example" and "Duration 2.5 s" are visible; the Steps buttons read `lookup`, `route`, `pay`, `done`; the previews are `{"vendor_id":"V-1","status":"active"}`, `{"payment_id":"P-1","status":"created"}` and `{"payment_id":"P-1"}`; exactly the three output digests were read, and after a click on `lookup` (its Input shows `"vendor_name": "ACME"`, its Started `2026-11-17 10:00 UTC` with `datetime` `2026-11-17T10:00:01.000000Z`) four digests, each once; "Step details" top is within 8 px of "Timeline" top and to its right; focusing the `time` shows the tooltip `2026-11-17 10:00 UTC`; the page has 1 `status` and 0 `alert`; layout (`max_banner_px=72`), axe and CSP are clean

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_view::test_run_page_header_previews_and_columns[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The unit's browser test test_run_page_header_previews_and_columns encodes the scenario line by line: the status text and tone, the two header texts, the four Steps buttons, the three preview texts, the three then four payload digests each once, the Started time and datetime of the clicked step, the two region boxes within 8 px and side by side, the tooltip on focus, one status and zero alerts, and the layout, axe and CSP checks. The page source gives each of those: the status p carries data-tone from runHeaderView, each step row renders its preview in p.runs-preview, requestPayload answers a repeated ref without a second request, the Started and Ended cells render through detailCell as a time element, the header time sits in a Tooltip with the formatted instant, and runs.css puts the layout in two equal columns from 80rem. The only gap the verifier found is procedural: the test had no red record because a red step cannot run the e2e gate, as the project's own rules require.
---

## Q-003: Criterion C-2836a3bc (web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-2836a3bc (web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once)

### Context
Criterion C-2836a3bc (web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once) is needs human after round 1.

Scenario:
\- **WHEN** `test_previews_stop_at_fifty_and_run_four_at_a_time` loads 60 steps with 60 distinct output digests, payload reads delayed 150 ms by a script that counts requests in flight
\- **THEN** once the 50th preview `{"n":149}` shows there are 50 `p.runs-preview`, 50 requests for 50 distinct digests and at most 4 in flight (measured 4); the 60 buttons exist; a click on the 51st shows `"n": 150` in "Output" and leaves 50 previews; the CSP list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_view::test_previews_stop_at_fifty_and_run_four_at_a_time[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The unit's browser test test_previews_stop_at_fifty_and_run_four_at_a_time loads 60 steps with distinct output digests behind a fetch wrapper that delays each payload read and counts requests in flight, then asserts 50 p.runs-preview with the first {"n":100} and the last {"n":149}, 50 distinct URLs, a maximum in flight of at most 4, 60 buttons, the Output text "n": 150 after a click on the 51st, still 50 previews and an empty CSP list. The code gives each of those: previewRefs takes the first 50 steps in seq order, stepRowViews previews only the first 50 steps with an output, createPreviewQueue starts at most limit refs with the default PREVIEW_CONCURRENCY of 4, and the queue effect is keyed on the joined refs. The only gap is the missing red record, which the project's rules make unavoidable for a browser test, and the generated test for this criterion never existed because its writer ran out of output.
---

## Q-004: Criterion C-6bfd6320 (web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-6bfd6320 (web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request)

### Context
Criterion C-6bfd6320 (web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request) is needs human after round 1.

Scenario:
\- **WHEN** `test_runs_list_shows_badges_duration_and_names` loads `/runs` with `run_a` (completed, `user-1`) and `run_b` (failed, `usr_9`) and `/people` answering only `user-1`
\- **THEN** the headers are `Run`, `Flow`, `Mode`, `State`, `Started`, `Duration`, `Started by`; the `run_a` row has "Alice Example", "2.5 s" and a badge `success`; the `run_b` row "usr_9", "1 min 5 s" and a badge `failed` with `data-tone` `danger`; the link `Open run run_a` is visible; the caption has class `ui-table-caption ui-visually-hidden`; `/people` was asked once with `ids=user-1%2Cusr_9`; layout, axe and CSP are clean

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_view::test_runs_list_shows_badges_duration_and_names[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The unit's browser test test_runs_list_shows_badges_duration_and_names mocks /runs with run_a and run_b and /people answering only user-1, then asserts the seven column headers in order, Alice Example, 2.5 s and a success badge in the run_a row, usr_9, 1 min 5 s and a failed badge with data-tone danger in the run_b row, the visible link Open run run_a, the caption class ui-table-caption ui-visually-hidden, one heading Runs, one /people request ending in ids=user-1%2Cusr_9, and the layout, axe and CSP checks. The code gives each of those: RunsPage declares the seven columns, renders the state as a Badge with data-tone, the link through runLinkName, the caption hidden through captionDisplayFor, and calls useDisplayNames once over the distinct user ids, which the name cache sends as one comma-joined ids query; personLabel falls back to the id. The only gap is the missing red record, which the project's rules make unavoidable for a browser test.
---

## Q-005: Hold H-51c57b0f: UI criterion C-56e16a37 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-56e16a37 has no end-to-end test; see the generated UI tests table

Step 5 for C-56e16a37: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_56e16a37::test_run_header_and_row_views[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. Criterion C-56e16a37 is a scenario over the pure functions runHeaderView and runRowView on the rows of test-plan.md T1, not a browser behaviour, and two Node tests named with its id assert every row of the scenario: H1 to H5 for the header and RR1 to RR3 for the row view, including the tones, the 2.5 s, 1 min 5 s and 30.0 s durations, the dash for an unended failed run, the id for an unknown user, and the ages 4 min ago, 1 h ago and just now. The implementation in run-view.ts matches, and both pages call these functions, so the browser tests of the unit exercise their output too. A generated browser test is not the right instrument for a function scenario, and its failure at both base and head says nothing about this code.
---

## Q-006: Hold H-bcb55e31: UI criterion C-01ce6552 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-01ce6552 has no end-to-end test; see the generated UI tests table

Step 5 for C-01ce6552: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_01ce6552::test_step_detail_times_read_as_instants[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. Criterion C-01ce6552 is a scenario over the pure function detailCell on rows DC1 to DC4 plus the unchanged frozen timeline tests, and a Node test named with its id asserts all four rows: the Started row gives the formatted instant with the raw iso, and the not ended, Node and junk rows keep their value with a null iso. The implementation in run-view.ts matches, stepDetailRows is unedited and still gives the raw time and not ended, and the run page renders a cell with an iso as a time element with the raw value in datetime and title, which the unit's browser test checks on the clicked step. A generated browser test is not the right instrument for a function scenario, and its failure at both base and head says nothing about this code.
---

## Q-007: Hold H-e730fe4b: UI criterion C-b43a5bfb has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b43a5bfb has no end-to-end test; see the generated UI tests table

Step 5 for C-b43a5bfb: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_b43a5bfb::test_run_page_header_previews_and_columns[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. Criterion C-b43a5bfb is traced by the unit's own browser test test_run_page_header_previews_and_columns in e2e/test_m6b_run_view.py, which asserts every clause of the scenario: the status text State: completed with data-tone success, Started by Alice Example and Duration 2.5 s visible, the Steps buttons lookup, route, pay, done, the three preview texts, exactly the three output digests read and then four each once after the click on lookup, the Started time and datetime of the clicked step, the Step details box within 8 px of the Timeline box and to its right, the tooltip 2026-11-17 10:00 UTC on focus, one status and zero alerts, and the layout, axe and CSP checks. The page source gives each of those: the status p carries data-tone from runHeaderView, a shared requestPayload answers a repeated ref without a second request, each step row renders its preview in p.runs-preview, Started and Ended cells with an iso render as a time element with dateTime and title, and runs.css puts the layout in two equal columns from 80rem. The hold exists only because a browser test has no red record, which the project's rules make unavoidable since a red step runs only the Node gate and leaves browser-only criteria to the verifier. The generated test that failed at head was written against routes and response shapes the app does not use (a single snapshot route, non-digest refs, a payload path without the run id, a people answer without items), so its failure says nothing about this code; the unit's own test mocks the real routes /runs/run_1, /runs/run_1/steps and /runs/run_1/payloads/<sha256> with 64-hex digests.
---

## Q-008: Hold H-eabaff7f: UI criterion C-2836a3bc has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2836a3bc has no end-to-end test; see the generated UI tests table

Step 5 for C-2836a3bc: writer_failed after 1 attempt(s); the stream ended without a final stop (last reason: length); the reply stopped at its output limit: OpenCode 1 asks for at most 32000 output tokens unless options.max_output_tokens is set (up to the model's own maximum).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-14b82d26: UI criterion C-6bfd6320 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-6bfd6320 has no end-to-end test; see the generated UI tests table

Step 5 for C-6bfd6320: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_6bfd6320::test_runs_list_shows_badges_duration_and_names[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
