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
| Q-008 | answered | none | verdict | Hold H-9e3a60bf: UI criterion C-2e06c4e6 has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-481e50f9: UI criterion C-3695054c has no end-to-end test; see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-d93a7037: UI criterion C-fe487857 has no end-to-end test; see the generated UI tests table |
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
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): I cannot run the browser. e2e/test_m6b_run_inputs.py lines 206-229 assert the scenario (no POST after the first start, Amount focused with aria-invalid and description Error: Required, Enter a number for abc, the one POST with vendor_name ACME and amount 12.5), and the code path exists: TestRunPanel.tsx submit sends attempt events and returns when blocked, field names precede input and mocks in Form fields, Form.tsx focuses the first erroneous field via attemptFocus, Field.tsx renders the hidden Error: span. But focus and accessible-description behaviour at runtime, and the fact that a harness-generated browser test for this criterion fails at head (not in the repository, so unreadable), cannot be checked by reading. A person with the e2e run output must decide.
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
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The scenario is browser behaviour over Radix Collapsible (aria-expanded, remount with defaultOpen after a refused dry run) and real POST bodies. e2e/test_m6b_run_inputs.py lines 232-314 assert every clause and MockRows.tsx and DryRunPanel.tsx (fakeNotes, openIds, keyed Collapsible) implement the opening of the named row with its note. I cannot run the test, the harness-generated browser test for this criterion fails at head and is not in the repository, and no e2e report is available to me, so I cannot settle whether the existing test passes at head. Escalating to a person who can see the run.
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
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): e2e/test_m6b_run_inputs.py lines 317-331 assert the scenario (Amount appears only after Validate, the cannot-show note once per region and no group Inputs for a oneOf property), and use-run-document.ts re-reads the version when canonical is null while TestRunPanel.tsx and DryRunPanel.tsx render model.reason once. Whether the editor really sets canonical to null after Validate, whether the re-read resolves in the browser and whether the note appears exactly once per region are runtime facts I cannot verify by reading; the harness-generated browser test for this criterion fails at head and is not in the repository. A person with the e2e run must decide.
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
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): This criterion is layout and accessibility measured in a browser (field positions within 1 px, group heights of 160 and 260 px, scrollWidth, axe) plus the unchanged M4, M5 and M6 journeys passing. None of that can be checked by reading; InputForm.tsx uses a @container grid with @xl:grid-cols-2 as designed, and e2e/test_m6b_run_inputs.py lines 334-356 assert the measurements, but I have no e2e run result, and the harness-generated browser test for this criterion fails at head and is not in the repository. A person who can see the browser runs must decide.
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

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept Criterion C-2e06c4e6 is the scenario "The form writes with two-space indent and the text reads field by field" of requirement "A form's values become the input JSON and an input JSON becomes form values, by fixed rules". That scenario is written against the pure functions inputJsonFromForm and formFromInputJson and the rows W1 to W4 and R1 to R14 of test-plan.md T2, not against a browser. The unit's test plan puts T2 in a Node test and the project's conventions reserve browser tests for the criteria of test-plan-browser.md; the browser behaviour of the form is the separate requirement "The panels show the form and the rows in a browser", whose criteria are held on their own. The repository's Node test input-form-text.test.ts asserts every row of T2 (W1 to W4, R1 to R14) against a non-stub implementation in input-form.ts, so the lack of an end-to-end test for this criterion is not a gap the spec asks to be filled, and the hold may be waived.
---

## Q-009: Hold H-481e50f9: UI criterion C-3695054c has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept Criterion C-3695054c is the scenario "A form edit writes, a text edit refills, and a bad text leaves the form alone" of requirement "One text is the truth...". Its WHEN runs the steps S1 to S9, T3b, T3c and the non-form cases of test-plan.md T3 on the pure state functions inputSyncStart, inputSyncStep and inputSyncView; it is not a browser scenario. The test plan assigns T3 to the Node test input-sync.test.ts, and that file asserts each step, the T3b sequence, both T3c arrival cases and the non-form cases against the real implementation in input-form.ts. The browser-visible form behaviour belongs to the separate requirement "The panels show the form and the rows in a browser", whose criteria are held on their own, so the missing end-to-end test for this criterion may be waived.
---

## Q-010: Hold H-d93a7037: UI criterion C-fe487857 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept Criterion C-fe487857 is the scenario "Add, answer, remove, a bad answer and a text edit" of requirement "Answer rows and the mocks or fakes text stay in step by the same rules". Its WHEN runs the steps R1 to R8 and the arrival cases of test-plan.md T6 on the pure functions rowSyncStart, rowSyncStep and rowSyncView; it is not a browser scenario. The test plan assigns T6 to the Node test mock-rows-sync.test.ts, which asserts R1 to R8, the arrival cases and the no-nodes case with the texts, hints, answer errors and form error of T6 against the real implementation in mock-rows.ts. The browser-visible rows belong to the separate requirement "The panels show the form and the rows in a browser", whose criteria are held on their own, so the missing end-to-end test for this criterion may be waived. The step 5 writer failed to produce any test here, so no failing generated test speaks against the criterion.
---

## Q-011: Hold H-58477fd9: UI criterion C-92bb8bdc has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): C-92bb8bdc is a browser criterion of the requirement "The panels show the form and the rows in a browser". The repository holds a tagged browser test, test_the_form_and_the_input_json_stay_in_step in e2e/test_m6b_run_inputs.py, but the verifier says it was never proved to fail without the change and that a generated test of the same name fails at the head. I cannot run the browser suite, so I cannot tell whether that failure is a real defect in the panels or an environment or test-writing problem, and reading the components cannot settle how the page behaves in a browser. The sibling browser criteria of this requirement were already escalated for the same reason, and a wrong accept here would pass unverified UI behaviour.
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
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): C-e9b281b6 is a browser criterion of the requirement "The panels show the form and the rows in a browser". The repository holds a tagged browser test, test_a_missing_required_field_blocks_the_start in e2e/test_m6b_run_inputs.py, but the verifier says it was never proved to fail without the change and that a generated test of the same name fails at the head. I cannot run the browser suite, so I cannot tell whether the focus, aria-invalid, description and refused POST behave as the scenario says, nor whether the head failure is a real defect or an environment problem. The sibling browser criteria were already escalated, and a person must decide this one too.
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
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The repository does hold a browser test for C-6bc1b603: e2e/test_m6b_run_inputs.py tags test_answer_rows_write_the_mocks_and_the_fakes with @pytest.mark.l4("C-6bc1b603") and follows test-plan-browser.md step by step, and TestRunPanel.tsx, DryRunPanel.tsx and MockRows.tsx wire the rows as design.md says. But the verifier reports that a test of exactly that name fails at the head after two attempts, and this scenario is browser-only (Collapsible rows, aria-expanded, the alert, the opened row after a 422). I cannot run pytest-playwright or the composed build, so I cannot tell whether the failure is a real defect in the panels or an environment problem of step 5, and the Node test report says nothing about it. The same criterion was already escalated as Q-005 and is still open. Accepting on code reading alone could waive a real regression, so a person who can run the e2e suite must decide.
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
