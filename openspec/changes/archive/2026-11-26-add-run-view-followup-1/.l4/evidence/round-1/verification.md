# Verification: openspec:add-run-view-followup-1: FAIL (round 1)

traceability: 10/10 criteria covered by a discriminating test

- Base: `31968a291002a9374237c87d63d37d5ae3886670`
- Head: `5d7ac25be4fc6502bd50bef3a778d7499710bab0`
- Implementer profiles: claude-sonnet
- Judge: beam-judge, 1 call(s), prompt sha256 `1ab837118637ee76d4a0fed2887551274c91d0c31bcdb7d458cb74d6870843f2`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@31968a2910 contained |
| 1 | integrity | ok | 293.0 | 11 sub-checks; scope: 11 changed file(s) |
| 2 | build | ok | 35.8 |  |
| 3 | tests | ok | 526.0 |  |
| 4 | traceability | ok | 0.2 | 10/10 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | ok | 586.6 | 1 base_unservable, 1 fails_at_head, 5 not_testable; e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/runs/RunPage.tsx |
| 8 | s1 judge | ok | 0.6 | 10/10 criteria judged by jev |
| 9 | judge | ok | 76.6 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261125T1400Z-3001/037-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261125T1400Z-3001/038-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261125T1400Z-3001/039-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261125T1400Z-3001/040-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261125T1400Z-3001/041-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261125T1400Z-3001/042-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261125T1400Z-3001/043-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/runs/RunPage.tsx, web/src/runs/payload-wrap.test.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 3104 of 3104 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-2df1ce97 | web-runs › Run page scrolls sideways when a step's input or output has a long line — feedback FB-001 › Run page scrolls sideways when a step's input or output has a long line | covered | web.src.runs.payload-wrap.test.ts::C-2df1ce97 Input and Output payloads use the class whose rule wraps long lines (passed, red_assertion, inadequate); web.src.runs.payload-wrap.test.ts::C-2df1ce97 the payload rule reaches the pre element inside the Step details column (passed, red_assertion, inadequ... | - | 0.84 | `e2e/test_l4_c_2df1ce97.py`, `test-results/test-l4-c-2df1ce97-py-test-run-page-does-not-scroll-sideways-with-long-payload-chromium/test-failed-1.png`, `test-results/test-l4-c-2df1ce97-py-test-run-page-does-not-scroll-sideways-with-long-payload-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-56e16a37 | web-runs › A run header view and a run row view read as fixed texts › Header and row views for completed, running, queued, unended and unknown-user runs | covered | web.src.runs.run-view.test.ts::C-56e16a37 header views for completed running queued unended and unknown-user runs (passed, pass_to_pass); web.src.runs.run-view.test.ts::C-56e16a37 row views for completed started and running runs (passed, pass_to_pass) | - | 0.92 | `e2e/test_l4_c_56e16a37.py`, `.l4-out/e2e/page.html` |
| C-39bfdc20 | web-runs › Step rows add a state, a duration and a preview to the timeline text › Rows, interrupted and live steps, and the 51st step | covered | web.src.runs.run-view.test.ts::C-39bfdc20 step rows for ready absent error interrupted and live steps plus fifty limits (passed, pass_to_pass) | - | 0.92 | - |
| C-6bf9588b | web-runs › Output previews are one bounded line, chosen from the first 50 steps › Preview texts, the cut, and the refs | covered | web.src.runs.run-view.test.ts::C-6bf9588b preview texts the cut and the first fifty refs (passed, pass_to_pass) | - | 0.84 | - |
| C-aeec17be | web-runs › Previews load through one queue of at most four requests › Four in flight, each ref once, a rejection swallowed | covered | web.src.runs.preview-queue.test.ts::C-aeec17be a limit of one starts the next ref only after the first settles (passed, pass_to_pass); web.src.runs.preview-queue.test.ts::C-aeec17be a rejected work is swallowed and both refs are called (passed, pass_to_pass); web.src.runs.preview-queue.test.ts::C-ae... | - | 0.89 | - |
| C-f21e5186 | web-runs › The run page and the runs list keep their pinned markup and take the new layout › The sources keep the pins and hold the new parts | covered | web.src.runs.run-view-sources.test.ts::C-f21e5186 run page keeps its pins and holds the new parts (passed, pass_to_pass); web.src.runs.run-view-sources.test.ts::C-f21e5186 run page steps hold one named button and the scanners stay clean (passed, pass_to_pass); web.src.runs.run-view-sources.test.ts::... | - | 0.94 | - |
| C-01ce6552 | web-runs › Step detail times read as instants › Started and Ended read as instants and the pinned rows stay raw | covered | web.src.runs.run-view.test.ts::C-01ce6552 detail cells read Started and Ended as instants and keep the other rows raw (passed, pass_to_pass) | - | 0.90 | - |
| C-b43a5bfb | web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860 | covered | test_m6b_run_view::test_run_page_header_previews_and_columns[chromium] (passed, pass_to_pass) | - | 0.92 | - |
| C-2836a3bc | web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once | covered | test_m6b_run_view::test_previews_stop_at_fifty_and_run_four_at_a_time[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-6bfd6320 | web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request | covered | test_m6b_run_view::test_runs_list_shows_badges_duration_and_names[chromium] (passed, pass_to_pass) | - | 0.91 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/runs/RunPage.tsx

### Tests

3238 of 3238 passed, 0 failed, 0 errored, 0 skipped.
2 of 2 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-2df1ce97 | fails_at_head | e2e/test_l4_c_2df1ce97.py | fail | fail | 2 | the test fails at the head: test_l4_c_2df1ce97::test_run_page_does_not_scroll_sideways_with_long_payload[chromium] | test-results/test-l4-c-2df1ce97-py-test-run-page-does-not-scroll-sideways-with-long-payload-chromium/test-failed-1.png, test-results/test-l4-c-2df1ce97-py-test-run-page-does-not-scroll-sideways-with-long-payload-chromium/trace.zip |
| C-56e16a37 | base_unservable | e2e/test_l4_c_56e16a37.py | - | - | 1 | the merge-base app cannot be served (gates.e2e: the server was not ready (see 053-e2e-base.log)) | - |
| C-39bfdc20 | not_testable | - | - | - | 1 | Tests the pure `stepRowViews` helper on fixture rows, which is not exposed through the browser UI. | - |
| C-6bf9588b | not_testable | - | - | - | 1 | outputPreview and previewRefs are internal functions whose exact preview strings and refs are not observable through the browser UI. | - |
| C-aeec17be | not_testable | - | - | - | 1 | Tests internal queue enqueue/work APIs and hand-settled promises that are not exposed through the browser UI | - |
| C-f21e5186 | not_testable | - | - | - | 1 | This criterion checks static source-file assertions, not browser-observable behavior. | - |
| C-01ce6552 | not_testable | - | - | - | 1 | Targets the detailCell helper and frozen TypeScript tests, not browser-observable behavior. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-2df1ce97 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56e16a37 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39bfdc20 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6bf9588b | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-aeec17be | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f21e5186 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-01ce6552 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b43a5bfb | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2836a3bc | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6bfd6320 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-2df1ce97 | web-runs › Run page scrolls sideways when a step's input or output has a long line — feedback FB-001 › Run page scrolls sideways when a step's input or output has a long line | fail | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-56e16a37 | web-runs › A run header view and a run row view read as fixed texts › Header and row views for completed, running, queued, unended and unknown-user runs | pass | pass | the judge passed it and a discriminating test passes |
| C-39bfdc20 | web-runs › Step rows add a state, a duration and a preview to the timeline text › Rows, interrupted and live steps, and the 51st step | pass | pass | the judge passed it and a discriminating test passes |
| C-6bf9588b | web-runs › Output previews are one bounded line, chosen from the first 50 steps › Preview texts, the cut, and the refs | pass | pass | the judge passed it and a discriminating test passes |
| C-aeec17be | web-runs › Previews load through one queue of at most four requests › Four in flight, each ref once, a rejection swallowed | pass | pass | the judge passed it and a discriminating test passes |
| C-f21e5186 | web-runs › The run page and the runs list keep their pinned markup and take the new layout › The sources keep the pins and hold the new parts | pass | pass | the judge passed it and a discriminating test passes |
| C-01ce6552 | web-runs › Step detail times read as instants › Started and Ended read as instants and the pinned rows stay raw | pass | pass | the judge passed it and a discriminating test passes |
| C-b43a5bfb | web-runs › The run page shows a readable header, previews and two columns › A mocked run shows its header, previews and columns at 1366 by 860 | pass | pass | the judge passed it and a discriminating test passes |
| C-2836a3bc | web-runs › The run page shows a readable header, previews and two columns › Sixty steps preview 50, four at a time, each once | pass | pass | the judge passed it and a discriminating test passes |
| C-6bfd6320 | web-runs › The runs list shows badges, durations and names › A mocked list shows tones, durations and one name request | pass | pass | the judge passed it and a discriminating test passes |
- C-2df1ce97: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))

## Findings

- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2df1ce97): No end-to-end test traces criterion C-2df1ce97 (web-runs › Run page scrolls sideways when a step's input or output has a long line — feedback FB-001 › Run page scrolls sideways when a step's input or output has a long line); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-56e16a37): No end-to-end test traces criterion C-56e16a37 (web-runs › A run header view and a run row view read as fixed texts › Header and row views for completed, running, queued, unended and unknown-user runs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-39bfdc20): No end-to-end test traces criterion C-39bfdc20 (web-runs › Step rows add a state, a duration and a preview to the timeline text › Rows, interrupted and live steps, and the 51st step); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6bf9588b): No end-to-end test traces criterion C-6bf9588b (web-runs › Output previews are one bounded line, chosen from the first 50 steps › Preview texts, the cut, and the refs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-aeec17be): No end-to-end test traces criterion C-aeec17be (web-runs › Previews load through one queue of at most four requests › Four in flight, each ref once, a rejection swallowed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f21e5186): No end-to-end test traces criterion C-f21e5186 (web-runs › The run page and the runs list keep their pinned markup and take the new layout › The sources keep the pins and hold the new parts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-01ce6552): No end-to-end test traces criterion C-01ce6552 (web-runs › Step detail times read as instants › Started and Ended read as instants and the pinned rows stay raw); step 5 generates one.
- [major, judge] Run page still scrolls sideways with a long payload (criterion C-2df1ce97): The committed class and CSS selector change does not satisfy the observable browser condition; the verifier-generated check fails at head for a long JSON line in Step details.
- [minor, judge] the judge called a test inadequate (criterion C-2df1ce97): web.src.runs.payload-wrap.test.ts::C-2df1ce97 Input and Output payloads use the class whose rule wraps long lines
- [minor, judge] the judge called a test inadequate (criterion C-2df1ce97): web.src.runs.payload-wrap.test.ts::C-2df1ce97 the payload rule reaches the pre element inside the Step details column
- [major, feedback] FB-001 not addressed: web/src/runs/RunPage.tsx:329-332 and web/src/runs/runs.css:149-158 changed the class and selector,...: Judged not addressed: web/src/runs/RunPage.tsx:329-332 and web/src/runs/runs.css:149-158 changed the class and selector, but e2e/test_l4_c_2df1ce97.py fails_at_head The Input and Output pre elements lost the wrapping rule when the payload section was rewritten: the rule still targets .runs-payload pre, which nothing uses any more, so the pre keeps white-space: pre and widens the page (1978 px at a 1280 px viewport with a judge 'reason' string; crypto smoke through the UI, 2026-11-25).

## Fix unit

Fix unit 1 is created for these tasks:
- F-003479b0 FB-001 not addressed: web/src/runs/RunPage.tsx:329-332 and web/src/runs/runs.css:149-158 changed...

## Feedback

- FB-001: not addressed: web/src/runs/RunPage.tsx:329-332 and web/src/runs/runs.css:149-158 changed the class and selector, but e2e/test_l4_c_2df1ce97.py fails_at_head

## Needs a human

- UI criterion C-2df1ce97 has no end-to-end test; see the generated UI tests table
- UI criterion C-56e16a37 has no end-to-end test; see the generated UI tests table
- UI criterion C-39bfdc20 has no end-to-end test; see the generated UI tests table
- UI criterion C-6bf9588b has no end-to-end test; see the generated UI tests table
- UI criterion C-aeec17be has no end-to-end test; see the generated UI tests table
- UI criterion C-f21e5186 has no end-to-end test; see the generated UI tests table
- UI criterion C-01ce6552 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.runs.payload-wrap.test.ts::C-2df1ce97 Input and Output payloads use the class whose rule wraps long lines` (task 1.1): passed
- `web.src.runs.payload-wrap.test.ts::C-2df1ce97 the payload rule reaches the pre element inside the Step details column` (task 1.1): passed
