# Verification: openspec:add-run-inputs-form: NEEDS_HUMAN (round 1)

traceability: 7/12 criteria covered by a discriminating test

- Base: `07b879df56523f338a63584ca8f3e9fbc682dde9`
- Head: `9754a32c58c4c522b2070683afd7ab5a5c018458`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `545d157c5ba49cf433a51010008e875b3dc61ec574294b8b2dec5dba9c80b073`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@07b879df56 contained |
| 1 | integrity | ok | 259.8 | 11 sub-checks (+1 unfrozen by human answers); scope: 22 changed file(s) |
| 2 | build | ok | 32.6 |  |
| 3 | tests | ok | 388.9 |  |
| 4 | traceability | ok | 0.2 | 7/12 criteria covered |
| 4a | audit sampling | ok | 506.7 | 1 not_testable, 1 rejected, 1 skipped; support files at the base: 8 |
| 5 | ui test generation | ok | 2710.2 | 7 fails_at_head, 4 not_testable, 1 writer_failed; 4 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/runs/DryRunPanel.tsx, web/src/runs/InputForm.tsx, web/src/runs/MockRows.tsx, web/src/runs/TestRunPanel.tsx, web/src/runs/input-form.ts and 2 more |
| 8 | s1 judge | ok | 0.5 | 9/12 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 137.5 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261120T2324Z-a10b/030-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261120T2324Z-a10b/031-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261120T2324Z-a10b/032-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261120T2324Z-a10b/033-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261120T2324Z-a10b/034-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261120T2324Z-a10b/035-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261120T2324Z-a10b/036-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 9 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/runs/DryRunPanel.tsx, web/src/runs/InputForm.tsx, web/src/runs/MockRows.tsx, web/src/runs/TestRunPanel.tsx, web/src/runs/input-form-model.test.ts (+9 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2609 of 2609 base tests pass on the unit's code with its 6 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/test_m6b_run_inputs.py kept at head for the run (task 3.3: unfrozen by Q-002)
- web/src/runs/mock-rows-sync.test.ts kept at head for the run (task 2.2: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- e2e/test_m6b_run_inputs.py (task 3.3, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-9a3cba5e | web-runs › The input form is built from the flow's inputs when they fit the kit subset › demo-pay's inputs give a form, and each other shape gives JSON only | covered | web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel answers the cannot show reason for unsupported inputs (passed, red_assertion); web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel answers the no inputs reason for absent and empty inputs (passed, red_assertion); web.src.r... | - | 0.91 | - |
| C-2e06c4e6 | web-runs › A form's values become the input JSON and an input JSON becomes form values, by fixed rules › The form writes with two-space indent and the text reads field by field | covered | web.src.runs.input-form-text.test.ts::C-2e06c4e6 R1 and R2 read an object field by field (passed, red_assertion); web.src.runs.input-form-text.test.ts::C-2e06c4e6 R10 to R13 give null for values of the wrong type (passed, red_assertion); web.src.runs.input-form-text.test.ts::C-2e06c4e6 R3 to R8 give... | - | 0.93 | `e2e/test_l4_c_2e06c4e6.py`, `test-results/test-l4-c-2e06c4e6-py-test-form-json-sync-chromium/test-failed-1.png`, `test-results/test-l4-c-2e06c4e6-py-test-form-json-sync-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-3695054c | web-runs › One text is the truth, so a form edit rewrites it, a text edit refills the form, and the form never blocks a text it cannot show › A form edit writes, a text edit refills, and a bad text leaves the form alone | covered | web.src.runs.input-sync.test.ts::C-3695054c S1 start keeps the text and shows no error (passed, red_assertion); web.src.runs.input-sync.test.ts::C-3695054c S2 to S5 a form edit rewrites the text and blocks while invalid (passed, red_assertion); web.src.runs.input-sync.test.ts::C-3695054c S6 a text e... | - | - | `e2e/test_l4_c_3695054c.py`, `test-results/test-l4-c-3695054c-py-test-form-text-sync-chromium/test-failed-1.png`, `test-results/test-l4-c-3695054c-py-test-form-text-sync-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-6fd95d86 | web-runs › The panels read a version's document when the editor has none › Wanted, loaded and failed | covered | web.src.runs.run-document.test.ts::C-6fd95d86 inputFormModelFor gives the model of each phase (passed, red_assertion); web.src.runs.run-document.test.ts::C-6fd95d86 loadRunDocument reads the version and gives its canonical (passed, red_assertion); web.src.runs.run-document.test.ts::C-6fd95d86 loadRu... | - | 0.89 | - |
| C-c8c4677c | web-runs › Answer rows list the block nodes and read and write the answers › Block nodes, labels and the text of the answers | covered | web.src.runs.mock-rows.test.ts::C-c8c4677c 201 nodes come back sorted (passed, red_assertion); web.src.runs.mock-rows.test.ts::C-c8c4677c an empty map gives an empty row per node (passed, red_assertion); web.src.runs.mock-rows.test.ts::C-c8c4677c an unreachable block comes last (passed, red_assertio... | - | - | - |
| C-fe487857 | web-runs › Answer rows and the mocks or fakes text stay in step by the same rules › Add, answer, remove, a bad answer and a text edit | covered | web.src.runs.mock-rows-sync.test.ts::C-fe487857 R1 the start keeps the text and reads the rows (passed, red_assertion); web.src.runs.mock-rows-sync.test.ts::C-fe487857 R2 an add on an empty row makes two blank answers and keeps the text (passed, red_assertion); web.src.runs.mock-rows-sync.test.ts::C... | - | - | `e2e/test_l4_c_fe487857.py`, `.l4-out/e2e/page.html` |
| C-b538162f | web-runs › The form and row components follow the source rules › The input sources read as the rules say | covered | web.src.runs.input-sources.test.ts::C-b538162f: DryRunPanel.tsx keeps its seven strings and one code element and calls the hook and both sync steps (passed, red_assertion); web.src.runs.input-sources.test.ts::C-b538162f: InputForm.tsx renders a fieldset with the legend Inputs and follows the source ... | - | 0.91 | - |
| C-92bb8bdc | web-runs › The panels show the form and the rows in a browser › Form and JSON stay in step and the text is used as written | uncovered | - | test_m6b_run_inputs::test_the_form_and_the_input_json_stay_in_step[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.22 | `e2e/test_l4_c_92bb8bdc.py`, `test-results/test-l4-c-92bb8bdc-py-test-the-form-and-the-input-json-stay-in-step-chromium/test-failed-1.png`, `test-results/test-l4-c-92bb8bdc-py-test-the-form-and-the-input-json-stay-in-step-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-e9b281b6 | web-runs › The panels show the form and the rows in a browser › A missing required field holds the start and names the field | uncovered | - | test_m6b_run_inputs::test_a_missing_required_field_blocks_the_start[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.08 | `e2e/test_l4_c_e9b281b6.py`, `test-results/test-l4-c-e9b281b6-py-test-a-missing-required-field-blocks-the-start-chromium/test-failed-1.png`, `test-results/test-l4-c-e9b281b6-py-test-a-missing-required-field-blocks-the-start-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-6bc1b603 | web-runs › The panels show the form and the rows in a browser › Answer rows write the mocks and the fakes | uncovered | - | test_m6b_run_inputs::test_answer_rows_write_the_mocks_and_the_fakes[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.17 | `e2e/test_l4_c_6bc1b603.py`, `test-results/test-l4-c-6bc1b603-py-test-answer-rows-write-the-mocks-and-the-fakes-chromium/test-failed-1.png`, `test-results/test-l4-c-6bc1b603-py-test-answer-rows-write-the-mocks-and-the-fakes-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-eba3df1e | web-runs › The panels show the form and the rows in a browser › Validate reads the document, and an unsupported schema shows only the JSON | uncovered | - | test_m6b_run_inputs::test_validate_makes_the_panels_read_the_document[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.07 | `e2e/test_l4_c_eba3df1e.py`, `test-results/test-l4-c-eba3df1e-py-test-validate-makes-the-panels-read-the-document-chromium/test-failed-1.png`, `test-results/test-l4-c-eba3df1e-py-test-validate-makes-the-panels-read-the-document-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-41245171 | web-runs › The panels show the form and the rows in a browser › The panels fit the screen and the journeys fill the JSON as before | uncovered | - | test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1024-860] (no proof that it discriminates (no red, audit or generated record)); test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_m6b_run_input... | 0.04 | `e2e/test_l4_c_41245171.py`, `test-results/test-l4-c-41245171-py-test-the-panels-fit-the-screen-chromium-1024-860/test-failed-1.png`, `test-results/test-l4-c-41245171-py-test-the-panels-fit-the-screen-chromium-1024-860/trace.zip`, `test-results/test-l4-c-41245171-py-test-the-panels-fit-the-screen-ch... |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_run_inputs.py` |  | relevant | new test file |
| `openspec/changes/add-run-inputs-form/.l4/ledger/r-20261120T1831Z-5dd5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-inputs-form/.l4/ledger/r-20261120T2052Z-e527.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-inputs-form/.l4/ledger/r-20261120T2253Z-dedd.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-inputs-form/.l4/ledger/r-20261120T2322Z-37f5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-inputs-form/.l4/ledger/r-20261120T2324Z-a10b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-inputs-form/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-inputs-form/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/runs/DryRunPanel.tsx` | web | relevant | named in the spec |
| `web/src/runs/InputForm.tsx` | web | relevant | named in the spec |
| `web/src/runs/MockRows.tsx` | web | relevant | named in the spec |
| `web/src/runs/TestRunPanel.tsx` | web | relevant | named in the spec |
| `web/src/runs/input-form-model.test.ts` |  | relevant | new test file |
| `web/src/runs/input-form-text.test.ts` |  | relevant | new test file |
| `web/src/runs/input-form.ts` | web | relevant | named in the spec |
| `web/src/runs/input-sources.test.ts` |  | relevant | new test file |
| `web/src/runs/input-sync.test.ts` |  | relevant | new test file |
| `web/src/runs/mock-rows-sync.test.ts` |  | relevant | new test file |
| `web/src/runs/mock-rows.test.ts` |  | relevant | new test file |
| `web/src/runs/mock-rows.ts` | web | relevant | named in the spec |
| `web/src/runs/run-document.test.ts` |  | relevant | new test file |
| `web/src/runs/use-run-document.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/runs/DryRunPanel.tsx, web/src/runs/InputForm.tsx, web/src/runs/MockRows.tsx, web/src/runs/TestRunPanel.tsx, web/src/runs/input-form.ts and 2 more

### Tests

2762 of 2762 passed, 0 failed, 0 errored, 0 skipped.
63 of 63 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-9a3cba5e | not_testable | - | - | - | 1 | inputFormModel is a pure TypeScript function not exposed through the browser UI, and no provided route or fixture exposes rows M1–M10 for observation.; covered by step 4: web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel answers the cannot show reason for unsupported inputs, web.src.r... | - |
| C-2e06c4e6 | fails_at_head | e2e/test_l4_c_2e06c4e6.py | fail | fail | 2 | the test fails at the head: test_l4_c_2e06c4e6::test_form_json_sync[chromium] | test-results/test-l4-c-2e06c4e6-py-test-form-json-sync-chromium/test-failed-1.png, test-results/test-l4-c-2e06c4e6-py-test-form-json-sync-chromium/trace.zip |
| C-3695054c | fails_at_head | e2e/test_l4_c_3695054c.py | fail | fail | 2 | the test fails at the head: test_l4_c_3695054c::test_form_text_sync[chromium] | test-results/test-l4-c-3695054c-py-test-form-text-sync-chromium/test-failed-1.png, test-results/test-l4-c-3695054c-py-test-form-text-sync-chromium/trace.zip |
| C-6fd95d86 | not_testable | - | - | - | 1 | This criterion verifies internal TypeScript helpers and mocked API responses, not behavior observable through the browser UI.; covered by step 4: web.src.runs.run-document.test.ts::C-6fd95d86 inputFormModelFor gives the model of each phase, web.src.runs.run-document.test.ts::C-6fd95d86 loadRunDocume... | - |
| C-c8c4677c | not_testable | - | - | - | 1 | the criterion asserts unit-level mock-row, ordering, and parser helper results that are not exposed through the browser UI; covered by step 4: web.src.runs.mock-rows.test.ts::C-c8c4677c 201 nodes come back sorted, web.src.runs.mock-rows.test.ts::C-c8c4677c an empty map gives an empty row per node, w... | - |
| C-fe487857 | writer_failed | e2e/test_l4_c_fe487857.py | - | - | 2 | structured output missing: the reply holds no JSON object | - |
| C-b538162f | not_testable | - | - | - | 1 | This criterion checks repository source files and static source rules, not browser-observable behavior.; covered by step 4: web.src.runs.input-sources.test.ts::C-b538162f: DryRunPanel.tsx keeps its seven strings and one code element and calls the hook and both sync steps, web.src.runs.input-sources.... | - |
| C-92bb8bdc | fails_at_head | e2e/test_l4_c_92bb8bdc.py | fail | fail | 2 | the test fails at the head: test_l4_c_92bb8bdc::test_the_form_and_the_input_json_stay_in_step[chromium] | test-results/test-l4-c-92bb8bdc-py-test-the-form-and-the-input-json-stay-in-step-chromium/test-failed-1.png, test-results/test-l4-c-92bb8bdc-py-test-the-form-and-the-input-json-stay-in-step-chromium/trace.zip |
| C-e9b281b6 | fails_at_head | e2e/test_l4_c_e9b281b6.py | fail | fail | 2 | the test fails at the head: test_l4_c_e9b281b6::test_a_missing_required_field_blocks_the_start[chromium] | test-results/test-l4-c-e9b281b6-py-test-a-missing-required-field-blocks-the-start-chromium/test-failed-1.png, test-results/test-l4-c-e9b281b6-py-test-a-missing-required-field-blocks-the-start-chromium/trace.zip |
| C-6bc1b603 | fails_at_head | e2e/test_l4_c_6bc1b603.py | fail | fail | 2 | the test fails at the head: test_l4_c_6bc1b603::test_answer_rows_write_the_mocks_and_the_fakes[chromium] | test-results/test-l4-c-6bc1b603-py-test-answer-rows-write-the-mocks-and-the-fakes-chromium/test-failed-1.png, test-results/test-l4-c-6bc1b603-py-test-answer-rows-write-the-mocks-and-the-fakes-chromium/trace.zip |
| C-eba3df1e | fails_at_head | e2e/test_l4_c_eba3df1e.py | fail | fail | 2 | the test fails at the head: test_l4_c_eba3df1e::test_validate_makes_the_panels_read_the_document[chromium] | test-results/test-l4-c-eba3df1e-py-test-validate-makes-the-panels-read-the-document-chromium/test-failed-1.png, test-results/test-l4-c-eba3df1e-py-test-validate-makes-the-panels-read-the-document-chromium/trace.zip |
| C-41245171 | fails_at_head | e2e/test_l4_c_41245171.py | fail | fail | 2 | the test fails at the head: test_l4_c_41245171::test_the_panels_fit_the_screen[chromium-1024-860], test_l4_c_41245171::test_the_panels_fit_the_screen[chromium-1366-860], test_l4_c_41245171::test_the_panels_fit_the_screen[chromium-390-800] | test-results/test-l4-c-41245171-py-test-the-panels-fit-the-screen-chromium-1024-860/test-failed-1.png, test-results/test-l4-c-41245171-py-test-the-panels-fit-the-screen-chromium-1024-860/trace.zip, test-results/test-l4-c-41245171-py-test-the-panels-fit-the-screen-chromium-1366-860/test-failed-1.png,... |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-9a3cba5e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2e06c4e6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3695054c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6fd95d86 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c8c4677c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-fe487857 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b538162f | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92bb8bdc | ok | 0.220 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e9b281b6 | ok | 0.080 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6bc1b603 | ok | 0.170 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eba3df1e | ok | 0.070 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-41245171 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-b538162f | skipped | - | - | cap |
| C-9a3cba5e | not_testable | - | - | No Python module or concrete T1 rows are shown; the criterion tests a TypeScript web function. |
| C-2e06c4e6 | rejected | e2e/test_l4_audit_c_2e06c4e6_r1.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_2e06c4e6_r1.py |

## Rejected audit tests

- C-2e06c4e6: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_2e06c4e6_r1.py

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-9a3cba5e | web-runs › The input form is built from the flow's inputs when they fit the kit subset › demo-pay's inputs give a form, and each other shape gives JSON only | pass | pass | the judge passed it and a discriminating test passes |
| C-2e06c4e6 | web-runs › A form's values become the input JSON and an input JSON becomes form values, by fixed rules › The form writes with two-space indent and the text reads field by field | pass | pass | the judge passed it and a discriminating test passes |
| C-3695054c | web-runs › One text is the truth, so a form edit rewrites it, a text edit refills the form, and the form never blocks a text it cannot show › A form edit writes, a text edit refills, and a bad text leaves the form alone | pass | pass | the judge passed it and a discriminating test passes |
| C-6fd95d86 | web-runs › The panels read a version's document when the editor has none › Wanted, loaded and failed | pass | pass | the judge passed it and a discriminating test passes |
| C-c8c4677c | web-runs › Answer rows list the block nodes and read and write the answers › Block nodes, labels and the text of the answers | pass | pass | the judge passed it and a discriminating test passes |
| C-fe487857 | web-runs › Answer rows and the mocks or fakes text stay in step by the same rules › Add, answer, remove, a bad answer and a text edit | pass | pass | the judge passed it and a discriminating test passes |
| C-b538162f | web-runs › The form and row components follow the source rules › The input sources read as the rules say | pass | pass | the judge passed it and a discriminating test passes |
| C-92bb8bdc | web-runs › The panels show the form and the rows in a browser › Form and JSON stay in step and the text is used as written | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-e9b281b6 | web-runs › The panels show the form and the rows in a browser › A missing required field holds the start and names the field | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-6bc1b603 | web-runs › The panels show the form and the rows in a browser › Answer rows write the mocks and the fakes | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-eba3df1e | web-runs › The panels show the form and the rows in a browser › Validate reads the document, and an unsupported schema shows only the JSON | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-41245171 | web-runs › The panels show the form and the rows in a browser › The panels fit the screen and the journeys fill the JSON as before | pass | needs_human | uncovered: no adequate discriminating test traces it |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-92bb8bdc): test_m6b_run_inputs::test_the_form_and_the_input_json_stay_in_step[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-e9b281b6): test_m6b_run_inputs::test_a_missing_required_field_blocks_the_start[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-6bc1b603): test_m6b_run_inputs::test_answer_rows_write_the_mocks_and_the_fakes[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-eba3df1e): test_m6b_run_inputs::test_validate_makes_the_panels_read_the_document[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-41245171): test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1024-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-41245171): test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1366-860]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-41245171): test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-390-800]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-2e06c4e6): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_2e06c4e6_r1.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9a3cba5e): No end-to-end test traces criterion C-9a3cba5e (web-runs › The input form is built from the flow's inputs when they fit the kit subset › demo-pay's inputs give a form, and each other shape gives JSON only); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2e06c4e6): No end-to-end test traces criterion C-2e06c4e6 (web-runs › A form's values become the input JSON and an input JSON becomes form values, by fixed rules › The form writes with two-space indent and the text reads field by field); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3695054c): No end-to-end test traces criterion C-3695054c (web-runs › One text is the truth, so a form edit rewrites it, a text edit refills the form, and the form never blocks a text it cannot show › A form edit writes, a text edit refills, and a bad text leaves the form alone); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6fd95d86): No end-to-end test traces criterion C-6fd95d86 (web-runs › The panels read a version's document when the editor has none › Wanted, loaded and failed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c8c4677c): No end-to-end test traces criterion C-c8c4677c (web-runs › Answer rows list the block nodes and read and write the answers › Block nodes, labels and the text of the answers); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-fe487857): No end-to-end test traces criterion C-fe487857 (web-runs › Answer rows and the mocks or fakes text stay in step by the same rules › Add, answer, remove, a bad answer and a text edit); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b538162f): No end-to-end test traces criterion C-b538162f (web-runs › The form and row components follow the source rules › The input sources read as the rules say); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-92bb8bdc): The end-to-end test test_m6b_run_inputs::test_the_form_and_the_input_json_stay_in_step[chromium] traces criterion C-92bb8bdc (web-runs › The panels show the form and the rows in a browser › Form and JSON stay in step and the text is used as written), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e9b281b6): The end-to-end test test_m6b_run_inputs::test_a_missing_required_field_blocks_the_start[chromium] traces criterion C-e9b281b6 (web-runs › The panels show the form and the rows in a browser › A missing required field holds the start and names the field), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6bc1b603): The end-to-end test test_m6b_run_inputs::test_answer_rows_write_the_mocks_and_the_fakes[chromium] traces criterion C-6bc1b603 (web-runs › The panels show the form and the rows in a browser › Answer rows write the mocks and the fakes), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-eba3df1e): The end-to-end test test_m6b_run_inputs::test_validate_makes_the_panels_read_the_document[chromium] traces criterion C-eba3df1e (web-runs › The panels show the form and the rows in a browser › Validate reads the document, and an unsupported schema shows only the JSON), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-41245171): The end-to-end test test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1024-860], test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-1366-860], test_m6b_run_inputs::test_the_panels_fit_the_screen[chromium-390-800] traces criterion C-41245171 (web-runs › The panels show the form and the rows in a browser › The panels fit the screen and the journeys fill the JSON as before), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] input sync of a non-object JSON text is not pinned by any scenario (spec gap) (criterion C-3695054c): When inputSyncStart or a text event receives valid JSON that is not an object (e.g. a number or array), the committed code keeps the text byte-for-byte, sets raw to initial blank values, source to json, and shows the mismatch hint with a jsonError from parseTestInputs. No criterion scenario exercises this input, and a reasonable implementation could instead clear the text or reject the event.
- [minor, judge] mock rows of a known node whose value is null is not pinned by any scenario (spec gap) (criterion C-c8c4677c): When mockRowsFromText receives a JSON object where a known node's value is null instead of a list, the committed code returns null. No scenario pins this exact input, and a reasonable implementation could instead treat it as an empty list.

## Needs a human

- UI criterion C-2e06c4e6 has no end-to-end test; see the generated UI tests table
- UI criterion C-3695054c has no end-to-end test; see the generated UI tests table
- UI criterion C-fe487857 has no end-to-end test; see the generated UI tests table
- UI criterion C-92bb8bdc has no end-to-end test; see the generated UI tests table
- UI criterion C-e9b281b6 has no end-to-end test; see the generated UI tests table
- UI criterion C-6bc1b603 has no end-to-end test; see the generated UI tests table
- UI criterion C-eba3df1e has no end-to-end test; see the generated UI tests table
- UI criterion C-41245171 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel answers the cannot show reason for unsupported inputs` (task 1.1): passed
- `web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel answers the no inputs reason for absent and empty inputs` (task 1.1): passed
- `web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel builds demo-pay fields with required names first` (task 1.1): passed
- `web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel keeps twenty fields as a form` (task 1.1): passed
- `web.src.runs.input-form-model.test.ts::C-9a3cba5e inputFormModel lists required names first then the others as given` (task 1.1): passed
- `web.src.runs.input-form-text.test.ts::C-2e06c4e6 R1 and R2 read an object field by field` (task 1.2): passed
- `web.src.runs.input-form-text.test.ts::C-2e06c4e6 R10 to R13 give null for values of the wrong type` (task 1.2): passed
- `web.src.runs.input-form-text.test.ts::C-2e06c4e6 R3 to R8 give null for a text that does not fit D` (task 1.2): passed
- `web.src.runs.input-form-text.test.ts::C-2e06c4e6 R9 and R14 read booleans, numbers, enums and lists` (task 1.2): passed
- `web.src.runs.input-form-text.test.ts::C-2e06c4e6 W1 writes the indented text of the valid values` (task 1.2): passed
- `web.src.runs.input-form-text.test.ts::C-2e06c4e6 W2 and W3 refuse a blank and a bad number` (task 1.2): passed
- `web.src.runs.input-form-text.test.ts::C-2e06c4e6 W4 writes in field order with typed values` (task 1.2): passed
- `web.src.runs.input-sources.test.ts::C-b538162f: DryRunPanel.tsx keeps its seven strings and one code element and calls the hook and both sync steps` (task 3.3): passed
- `web.src.runs.input-sources.test.ts::C-b538162f: InputForm.tsx renders a fieldset with the legend Inputs and follows the source rules` (task 3.1): passed
- `web.src.runs.input-sources.test.ts::C-b538162f: MockRows.tsx uses Collapsible and Button and follows the source rules` (task 3.1): passed
- `web.src.runs.input-sources.test.ts::C-b538162f: TestRunPanel.tsx keeps its link and status and calls the hook and both sync steps` (task 3.2): passed
- `web.src.runs.input-sources.test.ts::C-b538162f: use-run-document.ts reads the version with loadRunDocument and follows the source rules` (task 3.1): passed
- `web.src.runs.input-sync.test.ts::C-3695054c S1 start keeps the text and shows no error` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c S2 to S5 a form edit rewrites the text and blocks while invalid` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c S6 a text edit keeps its bytes and refills the buffer` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c S7 and S8 a bad text leaves the buffer alone and says why` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c S9 a fitting text refills both fields` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c T3b errors show after an attempt and block again when blanked` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c T3c arrival keeps the typed text and fills the fields that fit` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c T3c arrival of a text that does not fit leaves the fields empty` (task 1.3): passed
- `web.src.runs.input-sync.test.ts::C-3695054c a model that is not a form gives an empty view and ignores field events` (task 1.3): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R1 the start keeps the text and reads the rows` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R2 an add on an empty row makes two blank answers and keeps the text` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R3 an answer rewrites the text` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R4 a bad answer keeps the text and blocks` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R5 an attempt adds the form error` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R6 removing the bad answer clears the error and the block` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R7 an error entry text keeps the rows and gives the mismatch hint` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 R8 a broken text gives the json error` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 a text that fits refills the rows and clears the attempt` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 arrival keeps the typed text and fills the rows when it fits` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 arrival with an unknown node leaves the rows empty with the mismatch hint` (task 2.2): passed
- `web.src.runs.mock-rows-sync.test.ts::C-fe487857 with no nodes the view is empty and a remove on no answers keeps the text` (task 2.2): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c 201 nodes come back sorted` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c an empty map gives an empty row per node` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c an unreachable block comes last` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c answers become rows in node order and write back` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c blank answers and rows without answers are left out` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c blocks on one layer are ordered by id` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c empty and odd documents give no nodes and odd nodes keep their uses` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c no answers give an empty map` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c texts that are not answer maps give null` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c the first answer that does not parse is named` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c the labels count from one` (task 2.1): passed
- `web.src.runs.mock-rows.test.ts::C-c8c4677c the nodes of D are lookup then pay` (task 2.1): passed
