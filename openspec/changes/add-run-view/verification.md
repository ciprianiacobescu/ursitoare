# Verification: openspec:add-run-view: PASS (round 2)

traceability: 6/9 criteria covered by a discriminating test

- Base: `386e6b6d120740c1a544083e1f72ff5eca050035`
- Head: `d61c2b74f1ae9688e965c94630e888c65e4fd165`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 2 call(s), prompt sha256 `a1fd08cfbfd0ad069f71fd9a4f4304090984b0d9349925b0ac406b0bc0d84a86`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | reused | 0.0 | reused (round 1) |
| 5 | ui test generation | reused | 0.0 | reused (round 1) |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261121T0642Z-056f/016-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261121T0642Z-056f/017-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261121T0642Z-056f/018-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261121T0642Z-056f/019-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261121T0642Z-056f/020-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261121T0642Z-056f/021-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261121T0642Z-056f/022-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 6 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/runs/RunPage.tsx, web/src/runs/RunsPage.tsx, web/src/runs/preview-queue.test.ts, web/src/runs/run-view-sources.test.ts, web/src/runs/run-view.test.ts (+1 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2653 of 2653 base tests pass on the unit's code with its 3 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/test_m6b_run_view.py kept at head for the run (task 5.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- e2e/test_m6b_run_view.py (task 5.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-56e16a37 | web-runs › A run header view and a run row view read as fixed texts › Header and row views for completed, running, queued, unended and unknown-user runs | covered | web.src.runs.run-view.test.ts::C-56e16a37 header views for completed running queued unended and unknown-user runs (passed, red_assertion); web.src.runs.run-view.test.ts::C-56e16a37 row views for completed started and running runs (passed, red_assertion) | - | 0.93 | `e2e/test_l4_c_56e16a37.py`, `test-results/test-l4-c-56e16a37-py-test-run-header-and-row-views-chromium/test-failed-1.png`, `test-results/test-l4-c-56e16a37-py-test-run-header-and-row-views-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-39bfdc20 | web-runs › Step rows add a state, a duration and a preview to the timeline text › Rows, interrupted and live steps, and the 51st step | covered | web.src.runs.run-view.test.ts::C-39bfdc20 step rows for ready absent error interrupted and live steps plus fifty limits (passed, red_assertion) | - | 0.93 | - |
| C-6bf9588b | web-runs › Output previews are one bounded line, chosen from the first 50 steps › Preview texts, the cut, and the refs | covered | web.src.runs.run-view.test.ts::C-6bf9588b preview texts the cut and the first fifty refs (passed, red_assertion) | - | 0.86 | - |
| C-aeec17be | web-runs › Previews load through one queue of at most four requests › Four in flight, each ref once, a rejection swallowed | covered | web.src.runs.preview-queue.test.ts::C-aeec17be a limit of one starts the next ref only after the first settles (passed, red_assertion); web.src.runs.preview-queue.test.ts::C-aeec17be a rejected work is swallowed and both refs are called (passed, red_assertion); web.src.runs.preview-queue.test.ts::C-... | - | 0.91 | - |
| C-f21e5186 | web-runs › The run page and the runs list keep their pinned markup and take the new layout › The sources keep the pins and hold the new parts | covered | web.src.runs.run-view-sources.test.ts::C-f21e5186 run page keeps its pins and holds the new parts (passed, red_assertion); web.src.runs.run-view-sources.test.ts::C-f21e5186 run page steps hold one named button and the scanners stay clean (passed, red_assertion); web.src.runs.run-view-sources.test.ts... | - | 0.94 | - |
| C-01ce6552 | web-runs › Step detail times read as instants › Started and Ended read as instants and the pinned rows stay raw | covered | web.src.runs.run-view.test.ts::C-01ce6552 detail cells read Started and Ended as instants and keep the other rows raw (passed, red_assertion) | - | 0.91 | `e2e/test_l4_c_01ce6552.py`, `test-results/test-l4-c-01ce6552-py-test-step-detail-times-read-as-instants-chromium/test-failed-1.png`, `test-results/test-l4-c-01ce6552-py-test-step-detail-times-read-as-instants-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-b43a5bfb | web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860 | uncovered | - | test_m6b_run_view::test_run_page_header_previews_and_columns[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.18 | `e2e/test_l4_c_b43a5bfb.py`, `test-results/test-l4-c-b43a5bfb-py-test-run-page-header-previews-and-columns-chromium/test-failed-1.png`, `test-results/test-l4-c-b43a5bfb-py-test-run-page-header-previews-and-columns-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-2836a3bc | web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once | uncovered | - | test_m6b_run_view::test_previews_stop_at_fifty_and_run_four_at_a_time[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.06 | - |
| C-6bfd6320 | web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request | uncovered | - | test_m6b_run_view::test_runs_list_shows_badges_duration_and_names[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.14 | `e2e/test_l4_c_6bfd6320.py`, `test-results/test-l4-c-6bfd6320-py-test-runs-list-shows-badges-duration-and-names-chromium/test-failed-1.png`, `test-results/test-l4-c-6bfd6320-py-test-runs-list-shows-badges-duration-and-names-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_run_view.py` |  | relevant | new test file |
| `openspec/changes/add-run-view/.l4/ledger/r-20261121T0156Z-a065.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-view/.l4/ledger/r-20261121T0424Z-1491.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-view/.l4/ledger/r-20261121T0642Z-056f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-view/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-run-view/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/runs/RunPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/RunsPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/preview-queue.test.ts` |  | relevant | new test file |
| `web/src/runs/run-view-sources.test.ts` |  | relevant | new test file |
| `web/src/runs/run-view.test.ts` |  | relevant | new test file |
| `web/src/runs/run-view.ts` | web | relevant | named in the spec |
| `web/src/runs/runs.css` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/runs/RunPage.tsx, web/src/runs/RunsPage.tsx, web/src/runs/run-view.ts

### Tests

2779 of 2779 passed, 0 failed, 0 errored, 0 skipped.
17 of 17 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-56e16a37 | fails_at_head | e2e/test_l4_c_56e16a37.py | fail | fail | 2 | the test fails at the head: test_l4_c_56e16a37::test_run_header_and_row_views[chromium] | test-results/test-l4-c-56e16a37-py-test-run-header-and-row-views-chromium/test-failed-1.png, test-results/test-l4-c-56e16a37-py-test-run-header-and-row-views-chromium/trace.zip |
| C-39bfdc20 | not_testable | - | - | - | 1 | stepRowViews is an internal function and the criterion names test-plan.md T2 scenario rows R1–R4; the e2e support files provide no fixture or run URL to reach that public state, so the observable timeline rows cannot be located for assertion.; covered by step 4: web.src.runs.run-view.test.ts::C-39bf... | - |
| C-6bf9588b | not_testable | - | - | - | 1 | The criterion targets internal functions `outputPreview`/`previewRefs`, not a public interface, and depends on test-plan.md T3 fixture data (runs P1–P6, flows F1/F2, specific step outputs and refs) that is neither seeded nor addressable via any public endpoint shown. No stable UI contract exposes th... | - |
| C-aeec17be | not_testable | - | - | - | 1 | The criterion tests internal promise-queue mechanics (settle sequencing, max in-flight, swallowed rejections) of `createPreviewQueue`/`enqueue` that are not exposed or controllable through the run page UI over `L4_E2E_BASE_URL`; no run-creation fixture exists to load step previews.; covered by step ... | - |
| C-f21e5186 | not_testable | - | - | - | 1 | C-f21e5186 is a static source-code scan performed by Node.js run-view-sources.test.ts over RunPage.tsx/RunsPage.tsx/runs.css/tokens.css; its assertions (string presence/absence, scanner outputs, CSS token/media-query/var checks) are not observable through the browser's public interface, so a pytest-... | - |
| C-01ce6552 | fails_at_head | e2e/test_l4_c_01ce6552.py | fail | fail | 2 | the test fails at the head: test_l4_c_01ce6552::test_step_detail_times_read_as_instants[chromium] | test-results/test-l4-c-01ce6552-py-test-step-detail-times-read-as-instants-chromium/test-failed-1.png, test-results/test-l4-c-01ce6552-py-test-step-detail-times-read-as-instants-chromium/trace.zip |
| C-b43a5bfb | fails_at_head | e2e/test_l4_c_b43a5bfb.py | fail | fail | 2 | the test fails at the head: test_l4_c_b43a5bfb::test_run_page_header_previews_and_columns[chromium] | test-results/test-l4-c-b43a5bfb-py-test-run-page-header-previews-and-columns-chromium/test-failed-1.png, test-results/test-l4-c-b43a5bfb-py-test-run-page-header-previews-and-columns-chromium/trace.zip |
| C-2836a3bc | writer_failed | - | - | - | 1 | the stream ended without a final stop (last reason: length); the reply stopped at its output limit: OpenCode 1 asks for at most 32000 output tokens unless options.max_output_tokens is set (up to the model's own maximum) | - |
| C-6bfd6320 | fails_at_head | e2e/test_l4_c_6bfd6320.py | fail | fail | 2 | the test fails at the head: test_l4_c_6bfd6320::test_runs_list_shows_badges_duration_and_names[chromium] | test-results/test-l4-c-6bfd6320-py-test-runs-list-shows-badges-duration-and-names-chromium/test-failed-1.png, test-results/test-l4-c-6bfd6320-py-test-runs-list-shows-badges-duration-and-names-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-56e16a37 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39bfdc20 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6bf9588b | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-aeec17be | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f21e5186 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-01ce6552 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b43a5bfb | ok | 0.180 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2836a3bc | ok | 0.060 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6bfd6320 | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-56e16a37 | rejected | e2e/test_l4_audit_c_56e16a37_r1.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_56e16a37_r1.py |
| C-aeec17be | rejected | e2e/test_l4_audit_c_aeec17be_r1.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_aeec17be_r1.py |

## Rejected audit tests

- C-56e16a37: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_56e16a37_r1.py
- C-aeec17be: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_aeec17be_r1.py

## Answers to verdict questions

- Q-002 accept C-b43a5bfb by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The unit's browser test test_run_page_header_previews_and_columns encodes the scenario line by line: the status text and tone, the two header texts, the four Steps buttons, the three preview texts, the three then four payload digests each once, the Started ti...
- Q-003 accept C-2836a3bc by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The unit's browser test test_previews_stop_at_fifty_and_run_four_at_a_time loads 60 steps with distinct output digests behind a fetch wrapper that delays each payload read and counts requests in flight, then asserts 50 p.runs-preview with the first {"n":100} ...
- Q-004 accept C-6bfd6320 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The unit's browser test test_runs_list_shows_badges_duration_and_names mocks /runs with run_a and run_b and /people answering only user-1, then asserts the seven column headers in order, Alice Example, 2.5 s and a success badge in the run_a row, usr_9, 1 min ...
- Q-005 accept H-51c57b0f by the delegate (claude-fable-5-1 via claude-code): The unit can go on as it stands. Criterion C-56e16a37 is a scenario over the pure functions runHeaderView and runRowView on the rows of test-plan.md T1, not a browser behaviour, and two Node tests named with its id assert every row of the scenario: H1 to H5 for the header and RR1 to RR3 for the row ...
- Q-006 accept H-bcb55e31 by the delegate (claude-fable-5-1 via claude-code): The unit can go on as it stands. Criterion C-01ce6552 is a scenario over the pure function detailCell on rows DC1 to DC4 plus the unchanged frozen timeline tests, and a Node test named with its id asserts all four rows: the Started row gives the formatted instant with the raw iso, and the not ended,...
- Q-007 accept H-e730fe4b by the delegate (claude-fable-5-1 via claude-code): The unit can go on as it stands. Criterion C-b43a5bfb is traced by the unit's own browser test test_run_page_header_previews_and_columns in e2e/test_m6b_run_view.py, which asserts every clause of the scenario: the status text State: completed with data-tone success, Started by Alice Example and Dura...
- Q-008 accept H-eabaff7f by the delegate (claude-fable-5-1 via claude-code): The unit can go on as it stands. Criterion C-2836a3bc is traced by the unit's own browser test test_previews_stop_at_fifty_and_run_four_at_a_time in e2e/test_m6b_run_view.py, which loads 60 steps with 60 distinct output digests behind a fetch wrapper that delays each payload read by 150 ms and count...
- Q-009 accept H-14b82d26 by the delegate (claude-fable-5-1 via claude-code): The unit can go on as it stands. Criterion C-6bfd6320 is traced by the unit's own browser test test_runs_list_shows_badges_duration_and_names in e2e/test_m6b_run_view.py, which mocks /runs with run_a and run_b and /people answering only user-1, then asserts the seven column headers in order, Alice E...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-56e16a37 | web-runs › A run header view and a run row view read as fixed texts › Header and row views for completed, running, queued, unended and unknown-user runs | pass | pass | the judge passed it and a discriminating test passes |
| C-39bfdc20 | web-runs › Step rows add a state, a duration and a preview to the timeline text › Rows, interrupted and live steps, and the 51st step | pass | pass | the judge passed it and a discriminating test passes |
| C-6bf9588b | web-runs › Output previews are one bounded line, chosen from the first 50 steps › Preview texts, the cut, and the refs | pass | pass | the judge passed it and a discriminating test passes |
| C-aeec17be | web-runs › Previews load through one queue of at most four requests › Four in flight, each ref once, a rejection swallowed | pass | pass | the judge passed it and a discriminating test passes |
| C-f21e5186 | web-runs › The run page and the runs list keep their pinned markup and take the new layout › The sources keep the pins and hold the new parts | pass | pass | the judge passed it and a discriminating test passes |
| C-01ce6552 | web-runs › Step detail times read as instants › Started and Ended read as instants and the pinned rows stay raw | pass | pass | the judge passed it and a discriminating test passes |
| C-b43a5bfb | web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860 | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The unit's browser test test_run_page_header_previews_and_columns encodes the scenario line by line: the status text and tone, the two header texts, the four Steps buttons, the three preview texts, ... |
| C-2836a3bc | web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The unit's browser test test_previews_stop_at_fifty_and_run_four_at_a_time loads 60 steps with distinct output digests behind a fetch wrapper that delays each payload read and counts requests in fli... |
| C-6bfd6320 | web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The unit's browser test test_runs_list_shows_badges_duration_and_names mocks /runs with run_a and run_b and /people answering only user-1, then asserts the seven column headers in order, Alice Examp... |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-b43a5bfb): test_m6b_run_view::test_run_page_header_previews_and_columns[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-2836a3bc): test_m6b_run_view::test_previews_stop_at_fifty_and_run_four_at_a_time[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-6bfd6320): test_m6b_run_view::test_runs_list_shows_badges_duration_and_names[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-56e16a37): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_56e16a37_r1.py
- [minor, deterministic] an audit test was rejected (criterion C-aeec17be): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_aeec17be_r1.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-56e16a37): No end-to-end test traces criterion C-56e16a37 (web-runs › A run header view and a run row view read as fixed texts › Header and row views for completed, running, queued, unended and unknown-user runs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-39bfdc20): No end-to-end test traces criterion C-39bfdc20 (web-runs › Step rows add a state, a duration and a preview to the timeline text › Rows, interrupted and live steps, and the 51st step); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6bf9588b): No end-to-end test traces criterion C-6bf9588b (web-runs › Output previews are one bounded line, chosen from the first 50 steps › Preview texts, the cut, and the refs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-aeec17be): No end-to-end test traces criterion C-aeec17be (web-runs › Previews load through one queue of at most four requests › Four in flight, each ref once, a rejection swallowed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f21e5186): No end-to-end test traces criterion C-f21e5186 (web-runs › The run page and the runs list keep their pinned markup and take the new layout › The sources keep the pins and hold the new parts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-01ce6552): No end-to-end test traces criterion C-01ce6552 (web-runs › Step detail times read as instants › Started and Ended read as instants and the pinned rows stay raw); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b43a5bfb): The end-to-end test test_m6b_run_view::test_run_page_header_previews_and_columns[chromium] traces criterion C-b43a5bfb (web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2836a3bc): The end-to-end test test_m6b_run_view::test_previews_stop_at_fifty_and_run_four_at_a_time[chromium] traces criterion C-2836a3bc (web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6bfd6320): The end-to-end test test_m6b_run_view::test_runs_list_shows_badges_duration_and_names[chromium] traces criterion C-6bfd6320 (web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.runs.preview-queue.test.ts::C-aeec17be a limit of one starts the next ref only after the first settles` (task 3.1): passed
- `web.src.runs.preview-queue.test.ts::C-aeec17be a rejected work is swallowed and both refs are called` (task 3.1): passed
- `web.src.runs.preview-queue.test.ts::C-aeec17be four requests stay in flight and each ref runs once in order` (task 3.1): passed
- `web.src.runs.run-view-sources.test.ts::C-f21e5186 run page keeps its pins and holds the new parts` (task 4.2): passed
- `web.src.runs.run-view-sources.test.ts::C-f21e5186 run page steps hold one named button and the scanners stay clean` (task 4.2): passed
- `web.src.runs.run-view-sources.test.ts::C-f21e5186 runs css paints the five state tones and takes the two-column layout` (task 4.1): passed
- `web.src.runs.run-view-sources.test.ts::C-f21e5186 runs css uses only kit tokens and the three mutated copies fail` (task 4.1): passed
- `web.src.runs.run-view-sources.test.ts::C-f21e5186 runs page holds the seven headers and the new calls` (task 5.1): passed
- `web.src.runs.run-view-sources.test.ts::C-f21e5186 runs page scanners stay clean` (task 5.1): passed
- `web.src.runs.run-view.test.ts::C-01ce6552 detail cells read Started and Ended as instants and keep the other rows raw` (task 1.1): passed
- `web.src.runs.run-view.test.ts::C-39bfdc20 step rows for ready absent error interrupted and live steps plus fifty limits` (task 2.1): passed
- `web.src.runs.run-view.test.ts::C-56e16a37 header views for completed running queued unended and unknown-user runs` (task 1.1): passed
- `web.src.runs.run-view.test.ts::C-56e16a37 row views for completed started and running runs` (task 1.1): passed
- `web.src.runs.run-view.test.ts::C-6bf9588b preview texts the cut and the first fifty refs` (task 2.1): passed
