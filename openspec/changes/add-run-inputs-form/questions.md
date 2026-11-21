# Questions — add-run-inputs-form

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
| Q-001 | answered | 2.2 | technical | Allow writing web/src/runs/mock-rows-sync.test.ts? |
| Q-002 | accepted | 3.3 | technical | e2e/test_m6b_run_inputs.py line 235-236: names are read before the rows exist |
| Q-003 | open | none | verdict | Criterion C-92bb8bdc (web-runs › The panels show the form and the rows in a browser › Form and JSON stay in step and the text is used as written): accept as satisfied? |
| Q-004 | open | none | verdict | Criterion C-e9b281b6 (web-runs › The panels show the form and the rows in a browser › A missing required field holds the start and names the field): accept as satisfied? |
| Q-005 | open | none | verdict | Criterion C-6bc1b603 (web-runs › The panels show the form and the rows in a browser › Answer rows write the mocks and the fakes): accept as satisfied? |
| Q-006 | open | none | verdict | Criterion C-eba3df1e (web-runs › The panels show the form and the rows in a browser › Validate reads the document, and an unsupported schema shows only the JSON): accept as satisfied? |
| Q-007 | open | none | verdict | Criterion C-41245171 (web-runs › The panels show the form and the rows in a browser › The panels fit the screen and the journeys fill the JSON as before): accept as satisfied? |
| Q-008 | open | none | verdict | Hold H-9e3a60bf: UI criterion C-2e06c4e6 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-481e50f9: UI criterion C-3695054c has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-d93a7037: UI criterion C-fe487857 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-58477fd9: UI criterion C-92bb8bdc has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-88dcd857: UI criterion C-e9b281b6 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-66b31620: UI criterion C-6bc1b603 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-5b4b4c98: UI criterion C-eba3df1e has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-4054053e: UI criterion C-41245171 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Allow writing web/src/runs/mock-rows-sync.test.ts?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The question asks for a change to the implementer session's tool permissions (Write/Edit denied) or for a person to create the red test file by hand. The repository confirms web/src/runs/mock-rows-sync.test.ts does not exist yet, but nothing in the repository, specification or steering settles a harness permission problem, and I cannot grant permissions, verify the denial, or create files myself. Only a person or the harness operator can resolve this.
- **Blocking tasks:** 2.2
- **Kind:** technical
- **Asked:** 2026-11-20T20:40Z by claude-sonnet, run r-20261120T1831Z-5dd5, task 2.2

### Context
The Write tool is denied in this session, and Bash is limited to the test gate, so I cannot create the red test file for task 2.2.

### Options
1. Grant Write/Edit permission and re-run the step
2. Create the file by hand

### Answer
<!-- write below this line -->
No permission change is needed: retry the step. The implementer session already allows Write and Edit for every path inside the worktree (L4 passes the rule Edit(./**), which covers Write, with --tools Read,Edit,Write,Glob,Grep,Bash). In this same run the red steps of 1.2, 1.3, 1.4 and 2.1 created the new files input-form-text.test.ts, input-sync.test.ts, run-document.test.ts and mock-rows.test.ts with Write and no denial. The one denied Write in 2.2 red was therefore a path outside the worktree. Create the file with Write at the repo-relative path web/src/runs/mock-rows-sync.test.ts (no absolute path, nothing under /tmp or a home directory, no other checkout), write test-plan.md T6 rows R1 to R8 as the task says, then run pnpm run test web/src/runs/mock-rows-sync.test.ts. No person writes this file: the red test is the task's own work.

---

## Q-002: e2e/test_m6b_run_inputs.py line 235-236: names are read before the rows exist

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-11-20T22:50Z by claude-sonnet, run r-20261120T2052Z-e527, task 3.3

### Context
`all_inner_texts()` does not auto-wait. The heading `open_flow` waits for is visible while the editor is still loading (`FlowEditorPage.tsx`, `loaded === null`), so the Answers buttons are not rendered yet and the list is `[]`. This is what the previous attempt hit.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m6b_run_inputs.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-run-inputs-form`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m6b_run_inputs.py`: before `names = ...`, insert `expect(test_run.get_by_role("button", name="Answers for lookup", exact=True)).to_be_visible()`
2. Edit `e2e/test_m6b_run_inputs.py`: replace the `all_inner_texts()` assertion with `expect(test_run.get_by_role("button", name=re.compile(r"^Answers for "))).to_have_text(["Answers for lookup", "Answers for pay"])`

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m6b_run_inputs::test_answer_rows_write_the_mocks_and_the_fakes[chromium]
E       AssertionError: assert [] == ['Answers for...wers for pay']
E         Right contains 2 more items, first extra item: 'Answers for lookup'
E         Full diff:
E         + []
E         - [
E         -     'Answers for lookup',
e2e/test_m6b_run_inputs.py:236

### Clarifier suggestion
Edit `e2e/test_m6b_run_inputs.py`: before `names = ...`, insert `expect(test_run.get_by_role("button", name="Answers for lookup", exact=True)).to_be_visible()`

### Answer
<!-- write below this line -->

---

## Q-003: Criterion C-92bb8bdc (web-runs › The panels show the form and the rows in a browser › Form and JSON stay in step and the text is used as written): accept as satisfied?

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The criterion is browser behaviour that I cannot run. e2e/test_m6b_run_inputs.py lines 176-203 assert exactly the scenario (two textboxes in the group, the indented text after ACME and 12.5, the compact refill, one BAD_JSON and one MISMATCH text, the one POST {input:{foo:1},mocks:{}}), and TestRunPanel.tsx wires inputSyncStep, the jsonError, the hint and the attempt-then-blocked refusal as the design says. But the verifier reports that a harness-generated browser test for this criterion fails at head, that generated test is not in the repository, and no e2e run result is available to me as evidence; I cannot tell whether the generated test or the panel is wrong. Whether the existing browser test passed at head needs a person who can see the e2e run.
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-92bb8bdc (web-runs › The panels show the form and the rows in a browser › Form and JSON stay in step and the text is used as written)

### Context
Criterion C-92bb8bdc (web-runs › The panels show the form and the rows in a browser › Form and JSON stay in step and the text is used as written) is needs human after round 1.

Scenario:
\- **WHEN** `test_the_form_and_the_input_json_stay_in_step` of test-plan-browser.md runs
\- **THEN** typing `ACME` and `12.5` makes "Input (JSON)" hold `{\n  "vendor_name": "ACME",\n  "amount": 12.5\n}`; a compact fill refills the fields; a broken text and `{"foo":1}` show the error and the mismatch hint once each; the one POST body is `{ input: { foo: 1 }, mocks: {} }`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_inputs::test_the_form_and_the_input_json_stay_in_step[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Criterion C-e9b281b6 (web-runs › The panels show the form and the rows in a browser › A missing required field holds the start and names the field): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-e9b281b6 (web-runs › The panels show the form and the rows in a browser › A missing required field holds the start and names the field)

### Context
Criterion C-e9b281b6 (web-runs › The panels show the form and the rows in a browser › A missing required field holds the start and names the field) is needs human after round 1.

Scenario:
\- **WHEN** `test_a_missing_required_field_blocks_the_start` runs
\- **THEN** no POST follows the first start, "Amount (required)" is focused with the description `Error: Required`, and after `12.5` the one POST has `input` `{ vendor_name: "ACME", amount: 12.5 }`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_inputs::test_a_missing_required_field_blocks_the_start[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-005: Criterion C-6bc1b603 (web-runs › The panels show the form and the rows in a browser › Answer rows write the mocks and the fakes): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-6bc1b603 (web-runs › The panels show the form and the rows in a browser › Answer rows write the mocks and the fakes)

### Context
Criterion C-6bc1b603 (web-runs › The panels show the form and the rows in a browser › Answer rows write the mocks and the fakes) is needs human after round 1.

Scenario:
\- **WHEN** `test_answer_rows_write_the_mocks_and_the_fakes` runs
\- **THEN** the rows read "Answers for lookup" then "Answers for pay"; a typed output writes "Mocks (JSON)"; a bad second answer blocks the start with the one alert of T6 R5; an `{ error }` mock is posted as written; the Dry run panel posts `fakes` `{ pay: [{ output: { payment_id: "P-1" } }] }`; a dry run refused for `lookup` (`not_an_effect`) opens "Answers for lookup" with that text

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_inputs::test_answer_rows_write_the_mocks_and_the_fakes[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-006: Criterion C-eba3df1e (web-runs › The panels show the form and the rows in a browser › Validate reads the document, and an unsupported schema shows only the JSON): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-eba3df1e (web-runs › The panels show the form and the rows in a browser › Validate reads the document, and an unsupported schema shows only the JSON)

### Context
Criterion C-eba3df1e (web-runs › The panels show the form and the rows in a browser › Validate reads the document, and an unsupported schema shows only the JSON) is needs human after round 1.

Scenario:
\- **WHEN** `test_validate_makes_the_panels_read_the_document` runs
\- **THEN** "Amount (required)" appears only after "Validate" (the editor's `canonical` is `null` then); with a `oneOf` property each region shows the "cannot show" note once and no group "Inputs"

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_inputs::test_validate_makes_the_panels_read_the_document[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-007: Criterion C-41245171 (web-runs › The panels show the form and the rows in a browser › The panels fit the screen and the journeys fill the JSON as before): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-41245171 (web-runs › The panels show the form and the rows in a browser › The panels fit the screen and the journeys fill the JSON as before)

### Context
Criterion C-41245171 (web-runs › The panels show the form and the rows in a browser › The panels fit the screen and the journeys fill the JSON as before) is needs human after round 1.

Scenario:
\- **WHEN** `test_the_panels_fit_the_screen` runs at 1366 by 860 (the workspace, panels 531 px wide), 1024 by 860 (one column) and 390 by 800, and the journeys `test_m4_runs.py`, `test_m5_code_hooks.py` and `test_m6_grants.py` run unchanged
\- **THEN** at 1366 and 390 the fields are stacked (left edges equal within 1 px, group at most 260 px tall); at 1024 they share a row (tops equal within 1 px, group at most 160 px tall); `scrollWidth <= innerWidth` and `assert_accessible` pass at each; the journeys pass (green on arrival)

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1024-860] (no proof that it discriminates (no red, audit or generated record)); test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-390-800] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-9e3a60bf: UI criterion C-2e06c4e6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2e06c4e6 has no end-to-end test; see the generated UI tests table

Step 5 for C-2e06c4e6: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_2e06c4e6::test_form_json_sync[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-481e50f9: UI criterion C-3695054c has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3695054c has no end-to-end test; see the generated UI tests table

Step 5 for C-3695054c: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_3695054c::test_form_text_sync[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-d93a7037: UI criterion C-fe487857 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-fe487857 has no end-to-end test; see the generated UI tests table

Step 5 for C-fe487857: writer_failed after 2 attempt(s); structured output missing: the reply holds no JSON object.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-58477fd9: UI criterion C-92bb8bdc has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-92bb8bdc has no end-to-end test; see the generated UI tests table

Step 5 for C-92bb8bdc: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_92bb8bdc::test_the_form_and_the_input_json_stay_in_step[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-88dcd857: UI criterion C-e9b281b6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-e9b281b6 has no end-to-end test; see the generated UI tests table

Step 5 for C-e9b281b6: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_e9b281b6::test_a_missing_required_field_blocks_the_start[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-66b31620: UI criterion C-6bc1b603 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-6bc1b603 has no end-to-end test; see the generated UI tests table

Step 5 for C-6bc1b603: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_6bc1b603::test_answer_rows_write_the_mocks_and_the_fakes[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-5b4b4c98: UI criterion C-eba3df1e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-eba3df1e has no end-to-end test; see the generated UI tests table

Step 5 for C-eba3df1e: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_eba3df1e::test_validate_makes_the_panels_read_the_document[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-4054053e: UI criterion C-41245171 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-41245171 has no end-to-end test; see the generated UI tests table

Step 5 for C-41245171: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_41245171::test_the_panels_fit_the_screen[chromium-1024-860], test_l4_c_41245171::test_the_panels_fit_the_screen[chromium-1366-860], test_l4_c_41245171::test_the_panels_fit_the_screen[chromium-390-800].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
