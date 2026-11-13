# Verification: openspec:add-web-dry-runs: NEEDS_HUMAN (round 1)

traceability: 9/11 criteria covered by a discriminating test

- Base: `94c82265e53aecc7db72db487fdd0d2281522f74`
- Head: `d1e736ba4b93cb5bcb1a88f0453be138891d6dbb`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `9e696daa110f9e0854d11114213db59e3d83fde1889c8da025a8c90879098467`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base main@94c82265e5 contained |
| 1 | integrity | ok | 252.8 | 11 sub-checks; scope: 22 changed file(s) |
| 2 | build | ok | 25.6 |  |
| 3 | tests | ok | 356.0 |  |
| 4 | traceability | ok | 0.2 | 9/11 criteria covered |
| 4a | audit sampling | ok | 74.0 | 2 not_testable, 1 skipped; support files at the base: 9 |
| 5 | ui test generation | ok | 1766.0 | 5 fails_at_head, 6 not_testable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/features/80-runs.tsx, web/src/runs/DryRunPanel.tsx, web/src/runs/RunPage.tsx, web/src/runs/decisions.ts, web/src/runs/dry-run.ts and 1 more |
| 8 | s1 judge | ok | 1.3 | 11/11 criteria judged by jev |
| 9 | judge | ok | 209.6 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261113T0414Z-58b6/015-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261113T0414Z-58b6/016-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261113T0414Z-58b6/017-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261113T0414Z-58b6/018-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261113T0414Z-58b6/019-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261113T0414Z-58b6/020-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261113T0414Z-58b6/021-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base |
| red-green freeze | ok | 6 task(s): red and green compared |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/m6-grants.test.ts, web/src/features/80-runs.tsx, web/src/runs/DryRunPanel.tsx, web/src/runs/RunPage.tsx, web/src/runs/decisions-load.test.ts (+8 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | ok | 2 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2435 of 2435 base tests pass on the unit's code with its 9 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-0ba641d3 | web-runs › The Dry run panel follows the capability and the saved version › Not allowed, needs a version, ready | covered | web.src.runs.dry-run.test.ts::C-0ba641d3 the panel follows the capability and the saved version (passed, red_assertion) | - | 0.94 | - |
| C-b51ecdbd | web-runs › The fakes text becomes a map of lists or a message › Valid texts and each refusal | covered | web.src.runs.dry-run.test.ts::C-b51ecdbd parseFakes accepts maps of lists (passed, red_assertion); web.src.runs.dry-run.test.ts::C-b51ecdbd parseFakes copies the lists (passed, red_assertion); web.src.runs.dry-run.test.ts::C-b51ecdbd parseFakes words each refusal (passed, red_assertion) | - | 0.89 | - |
| C-a0fe5421 | web-runs › A dry run is started with one exact request, and each refusal is worded for the form › The recorded request and the refusals | covered | web.src.runs.dry-run-start.test.ts::C-a0fe5421: dryRunFormErrors keeps the fakes key and index and maps input (passed, red_assertion); web.src.runs.dry-run-start.test.ts::C-a0fe5421: dryRunFormErrors sends other fields and errors to the form text (passed, red_assertion); web.src.runs.dry-run-start.t... | - | 0.88 | `e2e/test_l4_c_a0fe5421.py`, `test-results/test-l4-c-a0fe5421-py-test-starting-a-dry-run-shows-the-started-run-chromium/test-failed-1.png`, `test-results/test-l4-c-a0fe5421-py-test-starting-a-dry-run-shows-the-started-run-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-320b7d94 | web-runs › Policy decisions are parsed strictly and read as permits › A page, an empty page and fourteen malformed values | covered | web.src.runs.decisions.test.ts::C-320b7d94 a page keeps the shown members and an empty page is empty (passed, red_assertion); web.src.runs.decisions.test.ts::C-320b7d94 malformed values make the whole page unreadable (passed, red_assertion) | - | 0.92 | - |
| C-0930141b | web-runs › Each decision is one row that names its node, outcome and permit, and says when the effect was stubbed › Deny, read, stubbed effect, hooks, a node with no step and an odd resource | covered | web.src.runs.decisions.test.ts::C-0930141b each decision is one row with its node, outcome, permit and stub label (passed, red_assertion); web.src.runs.decisions.test.ts::C-0930141b the details name the decision, resource, reasons, service and lifetime (passed, red_assertion); web.src.runs.decisions... | - | 0.92 | `e2e/test_l4_c_0930141b.py`, `test-results/test-l4-c-0930141b-py-test-policy-decisions-show-each-decision-as-one-row-chromium/test-failed-1.png`, `test-results/test-l4-c-0930141b-py-test-policy-decisions-show-each-decision-as-one-row-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-0d1cacce | web-runs › The run page lists the decisions of a finished stub run and confines their failure › Paging, the section states and a hostile page | covered | web.src.runs.decisions-load.test.ts::C-0d1cacce decisionsView gives the section of each state (passed, pre_satisfied); web.src.runs.decisions-load.test.ts::C-0d1cacce decisionsWanted is true for a finished run that is not a mock run (passed, pre_satisfied); web.src.runs.decisions-load.test.ts::C-0d1... | - | 0.92 | `e2e/test_l4_c_0d1cacce.py`, `test-results/test-l4-c-0d1cacce-py-test-run-page-lists-policy-decisions-of-finished-stub-run-chromium/test-failed-1.png`, `test-results/test-l4-c-0d1cacce-py-test-run-page-lists-policy-decisions-of-finished-stub-run-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-f78faba7 | web-runs › The run page lists the decisions of a finished stub run and confines their failure › Try again reads the decisions after a failure, and an empty page says so | uncovered | - | test_m6_run_decisions::test_decisions_try_again_reads_the_page[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.18 | `e2e/test_l4_c_f78faba7.py`, `test-results/test-l4-c-f78faba7-py-test-run-page-decisions-try-again-chromium/test-failed-1.png`, `test-results/test-l4-c-f78faba7-py-test-run-page-decisions-try-again-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-acb416e2 | web-runs › Every step's details carry a Taint row › Switch, wait, end and an unknown kind gain the row; block rows are unchanged | covered | web.src.runs.timeline-taint.test.ts::C-acb416e2: Taint comes before Error and Decision of a failed switch (passed, red_assertion); web.src.runs.timeline-taint.test.ts::C-acb416e2: a block step keeps its ten rows with one Taint (passed, red_assertion); web.src.runs.timeline-taint.test.ts::C-acb416e2:... | - | 0.91 | - |
| C-f665c2d6 | web-runs › The new components follow the run sources' rules › Sources read as the rules say | covered | web.src.runs.dry-run-sources.test.ts::C-f665c2d6: 80-runs.tsx registers the Dry run panel beside the Test run panel (passed, red_assertion); web.src.runs.dry-run-sources.test.ts::C-f665c2d6: DryRunPanel.tsx has the form texts, a code element and no inline style (passed, red_assertion); web.src.runs.... | - | 0.94 | - |
| C-6d6e45b6 | web-runs › The grants flow works against the real engine › Carol approves and grants, alice is denied then reads and stubs | covered | test.journeys.m6-grants.test.ts::C-6d6e45b6 alice and carol take acme from pending to a stubbed payment (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive) | - | 0.93 | - |
| C-02d224b2 | web-runs › The M6 journey proves grants and the dry run in a browser › Carol approves and grants; alice's dry run is denied, then reads and stubs | uncovered | - | test_m6_grants::test_alice_is_denied_then_reads_and_stubs[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.26 | `e2e/test_l4_c_02d224b2.py`, `test-results/test-l4-c-02d224b2-py-test-carol-approves-grants-and-alice-dry-run-chromium/test-failed-1.png`, `test-results/test-l4-c-02d224b2-py-test-carol-approves-grants-and-alice-dry-run-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6_grants.py` |  | relevant | new test file |
| `e2e/test_m6_run_decisions.py` |  | relevant | new test file |
| `openspec/changes/add-web-dry-runs/.l4/ledger/r-20261112T1958Z-2cd3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-dry-runs/.l4/ledger/r-20261112T2235Z-b476.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-dry-runs/.l4/ledger/r-20261113T0049Z-90f5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-dry-runs/.l4/ledger/r-20261113T0322Z-b4b3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-dry-runs/.l4/ledger/r-20261113T0414Z-58b6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-dry-runs/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-dry-runs/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/journeys/m6-grants.test.ts` |  | relevant | new test file |
| `web/src/features/80-runs.tsx` | web | relevant | named in the spec |
| `web/src/runs/DryRunPanel.tsx` | web | relevant | named in the spec |
| `web/src/runs/RunPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/decisions-load.test.ts` |  | relevant | new test file |
| `web/src/runs/decisions.test.ts` |  | relevant | new test file |
| `web/src/runs/decisions.ts` | web | relevant | named in the spec |
| `web/src/runs/dry-run-sources.test.ts` |  | relevant | new test file |
| `web/src/runs/dry-run-start.test.ts` |  | relevant | new test file |
| `web/src/runs/dry-run.test.ts` |  | relevant | new test file |
| `web/src/runs/dry-run.ts` | web | relevant | named in the spec |
| `web/src/runs/timeline-taint.test.ts` |  | relevant | new test file |
| `web/src/runs/timeline.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/features/80-runs.tsx, web/src/runs/DryRunPanel.tsx, web/src/runs/RunPage.tsx, web/src/runs/decisions.ts, web/src/runs/dry-run.ts and 1 more

### Tests

2529 of 2529 passed, 0 failed, 0 errored, 0 skipped.
30 of 30 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-0ba641d3 | not_testable | - | - | - | 1 | The criterion drives the internal dryRunPanelView function with capability Set and version arguments; those inputs are not parameters of any navigable public page, and the snapshot gives no authenticated flow-editor surface or backend setup to place a user in those capability/version states, so the ... | - |
| C-b51ecdbd | not_testable | - | - | - | 1 | parseFakes is an internal frontend function; its return-object shape, keys, and prototype chain are not observable through the web page UI, so this criterion cannot be checked end-to-end via the page fixture. | - |
| C-a0fe5421 | fails_at_head | e2e/test_l4_c_a0fe5421.py | fail | fail | 2 | the test fails at the head: test_l4_c_a0fe5421::test_starting_a_dry_run_shows_the_started_run[chromium] | test-results/test-l4-c-a0fe5421-py-test-starting-a-dry-run-shows-the-started-run-chromium/test-failed-1.png, test-results/test-l4-c-a0fe5421-py-test-starting-a-dry-run-shows-the-started-run-chromium/trace.zip |
| C-320b7d94 | not_testable | - | - | - | 1 | parseDecisions and permitText are internal JavaScript functions; the criterion requires passing specific inputs (empty page and M1–M18 malformed values) and asserting return values/null, which is not observable through a stable public web interface and cannot be driven by browser navigation alone. | - |
| C-0930141b | fails_at_head | e2e/test_l4_c_0930141b.py | fail | fail | 2 | the test fails at the head: test_l4_c_0930141b::test_policy_decisions_show_each_decision_as_one_row[chromium] | test-results/test-l4-c-0930141b-py-test-policy-decisions-show-each-decision-as-one-row-chromium/test-failed-1.png, test-results/test-l4-c-0930141b-py-test-policy-decisions-show-each-decision-as-one-row-chromium/trace.zip |
| C-0d1cacce | fails_at_head | e2e/test_l4_c_0d1cacce.py | fail | fail | 2 | the test fails at the head: test_l4_c_0d1cacce::test_run_page_lists_policy_decisions_of_finished_stub_run[chromium] | test-results/test-l4-c-0d1cacce-py-test-run-page-lists-policy-decisions-of-finished-stub-run-chromium/test-failed-1.png, test-results/test-l4-c-0d1cacce-py-test-run-page-lists-policy-decisions-of-finished-stub-run-chromium/trace.zip |
| C-f78faba7 | fails_at_head | e2e/test_l4_c_f78faba7.py | fail | fail | 2 | the test fails at the head: test_l4_c_f78faba7::test_run_page_decisions_try_again[chromium] | test-results/test-l4-c-f78faba7-py-test-run-page-decisions-try-again-chromium/test-failed-1.png, test-results/test-l4-c-f78faba7-py-test-run-page-decisions-try-again-chromium/trace.zip |
| C-acb416e2 | not_testable | - | - | - | 1 | The criterion asserts exact per-step `stepDetailRows` output for test-plan cases T1–T6 (e.g. `Branch=active`, `Taint=none`). The change and snapshot expose no public page, URL, or step-details UI element for taint rows, so these values cannot be asserted via the `page` fixture without mirroring impl... | - |
| C-f665c2d6 | not_testable | - | - | - | 1 | This criterion verifies source file contents (findInlineStyleUse, dangerouslySetInnerHTML, registerEditorPanel counts, flowFeatureLiterals) by reading .tsx files, which cannot be observed through the browser page fixture at L4_E2E_BASE_URL. | - |
| C-6d6e45b6 | not_testable | - | - | - | 1 | The criterion asserts backend state (issued token, forwarded request, recorded tool calls) and a stack start/sign-in flow that cannot be driven or observed through the public web UI; the page snapshot is an empty SPA shell with no interactive elements or selectors, and no sign-in or navigation targe... | - |
| C-02d224b2 | fails_at_head | e2e/test_l4_c_02d224b2.py | fail | fail | 2 | the test fails at the head: test_l4_c_02d224b2::test_carol_approves_grants_and_alice_dry_run[chromium] | test-results/test-l4-c-02d224b2-py-test-carol-approves-grants-and-alice-dry-run-chromium/test-failed-1.png, test-results/test-l4-c-02d224b2-py-test-carol-approves-grants-and-alice-dry-run-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-0ba641d3 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b51ecdbd | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a0fe5421 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-320b7d94 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0930141b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0d1cacce | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f78faba7 | ok | 0.180 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-acb416e2 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f665c2d6 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6d6e45b6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-02d224b2 | ok | 0.260 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-a0fe5421 | skipped | - | - | cap |
| C-6d6e45b6 | not_testable | - | - | Criterion C-6d6e45b6 drives m6-grants.test.ts, a TypeScript/Playwright browser test against the web stack; no Python module under test or public Python interface is named, so pytest cannot exercise it. |
| C-0d1cacce | not_testable | - | - | The criterion tests TypeScript web functions (loadDecisions, decisionsWanted, decisionsView per test-plan.md); design.md shows no Python module under test to import, so a pytest test cannot be written without guessing names. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-0ba641d3 | web-runs › The Dry run panel follows the capability and the saved version › Not allowed, needs a version, ready | pass | pass | the judge passed it and a discriminating test passes |
| C-b51ecdbd | web-runs › The fakes text becomes a map of lists or a message › Valid texts and each refusal | pass | pass | the judge passed it and a discriminating test passes |
| C-a0fe5421 | web-runs › A dry run is started with one exact request, and each refusal is worded for the form › The recorded request and the refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-320b7d94 | web-runs › Policy decisions are parsed strictly and read as permits › A page, an empty page and fourteen malformed values | pass | pass | the judge passed it and a discriminating test passes |
| C-0930141b | web-runs › Each decision is one row that names its node, outcome and permit, and says when the effect was stubbed › Deny, read, stubbed effect, hooks, a node with no step and an odd resource | pass | pass | the judge passed it and a discriminating test passes |
| C-0d1cacce | web-runs › The run page lists the decisions of a finished stub run and confines their failure › Paging, the section states and a hostile page | pass | pass | the judge passed it and a discriminating test passes |
| C-f78faba7 | web-runs › The run page lists the decisions of a finished stub run and confines their failure › Try again reads the decisions after a failure, and an empty page says so | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-acb416e2 | web-runs › Every step's details carry a Taint row › Switch, wait, end and an unknown kind gain the row; block rows are unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-f665c2d6 | web-runs › The new components follow the run sources' rules › Sources read as the rules say | pass | pass | the judge passed it and a discriminating test passes |
| C-6d6e45b6 | web-runs › The grants flow works against the real engine › Carol approves and grants, alice is denied then reads and stubs | pass | pass | the judge passed it and a discriminating test passes |
| C-02d224b2 | web-runs › The M6 journey proves grants and the dry run in a browser › Carol approves and grants; alice's dry run is denied, then reads and stubs | pass | needs_human | uncovered: no adequate discriminating test traces it |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-f78faba7): test_m6_run_decisions::test_decisions_try_again_reads_the_page[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-02d224b2): test_m6_grants::test_alice_is_denied_then_reads_and_stubs[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0ba641d3): No end-to-end test traces criterion C-0ba641d3 (web-runs › The Dry run panel follows the capability and the saved version › Not allowed, needs a version, ready); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b51ecdbd): No end-to-end test traces criterion C-b51ecdbd (web-runs › The fakes text becomes a map of lists or a message › Valid texts and each refusal); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a0fe5421): No end-to-end test traces criterion C-a0fe5421 (web-runs › A dry run is started with one exact request, and each refusal is worded for the form › The recorded request and the refusals); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-320b7d94): No end-to-end test traces criterion C-320b7d94 (web-runs › Policy decisions are parsed strictly and read as permits › A page, an empty page and fourteen malformed values); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0930141b): No end-to-end test traces criterion C-0930141b (web-runs › Each decision is one row that names its node, outcome and permit, and says when the effect was stubbed › Deny, read, stubbed effect, hooks, a node with no step and an odd resource); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0d1cacce): No end-to-end test traces criterion C-0d1cacce (web-runs › The run page lists the decisions of a finished stub run and confines their failure › Paging, the section states and a hostile page); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f78faba7): The end-to-end test test_m6_run_decisions::test_decisions_try_again_reads_the_page[chromium] traces criterion C-f78faba7 (web-runs › The run page lists the decisions of a finished stub run and confines their failure › Try again reads the decisions after a failure, and an empty page says so), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-acb416e2): No end-to-end test traces criterion C-acb416e2 (web-runs › Every step's details carry a Taint row › Switch, wait, end and an unknown kind gain the row; block rows are unchanged); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f665c2d6): No end-to-end test traces criterion C-f665c2d6 (web-runs › The new components follow the run sources' rules › Sources read as the rules say); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6d6e45b6): No end-to-end test traces criterion C-6d6e45b6 (web-runs › The grants flow works against the real engine › Carol approves and grants, alice is denied then reads and stubs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-02d224b2): The end-to-end test test_m6_grants::test_alice_is_denied_then_reads_and_stubs[chromium] traces criterion C-02d224b2 (web-runs › The M6 journey proves grants and the dry run in a browser › Carol approves and grants; alice's dry run is denied, then reads and stubs), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] startDryRun key validation only rejects an exactly empty key (spec gap) (criterion C-a0fe5421): The spec pins only 'an empty key' as a RangeError. The committed code checks key === '' (dry-run.ts:83), so a whitespace-only key is accepted and sent as the Idempotency-Key; no scenario covers whitespace keys.

## Needs a human

- UI criterion C-0ba641d3 has no end-to-end test; see the generated UI tests table
- UI criterion C-b51ecdbd has no end-to-end test; see the generated UI tests table
- UI criterion C-a0fe5421 has no end-to-end test; see the generated UI tests table
- UI criterion C-320b7d94 has no end-to-end test; see the generated UI tests table
- UI criterion C-0930141b has no end-to-end test; see the generated UI tests table
- UI criterion C-0d1cacce has no end-to-end test; see the generated UI tests table
- UI criterion C-f78faba7 has no end-to-end test; see the generated UI tests table
- UI criterion C-acb416e2 has no end-to-end test; see the generated UI tests table
- UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table
- UI criterion C-6d6e45b6 has no end-to-end test; see the generated UI tests table
- UI criterion C-02d224b2 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `test.journeys.m6-grants.test.ts::C-6d6e45b6 alice and carol take acme from pending to a stubbed payment` (task 5.1): passed
- `web.src.runs.decisions-load.test.ts::C-0d1cacce decisionsView gives the section of each state` (task 2.2): passed
- `web.src.runs.decisions-load.test.ts::C-0d1cacce decisionsWanted is true for a finished run that is not a mock run` (task 2.2): passed
- `web.src.runs.decisions-load.test.ts::C-0d1cacce loadDecisions follows the cursor across two pages` (task 2.2): passed
- `web.src.runs.decisions-load.test.ts::C-0d1cacce loadDecisions refuses an unreadable page and a bad run id` (task 2.2): passed
- `web.src.runs.decisions-load.test.ts::C-0d1cacce loadDecisions stops after five pages and says truncated` (task 2.2): passed
- `web.src.runs.decisions.test.ts::C-0930141b each decision is one row with its node, outcome, permit and stub label` (task 2.1): passed
- `web.src.runs.decisions.test.ts::C-0930141b the details name the decision, resource, reasons, service and lifetime` (task 2.1): passed
- `web.src.runs.decisions.test.ts::C-0930141b the stub label needs a stub run, a block step and a key on the last step` (task 2.1): passed
- `web.src.runs.decisions.test.ts::C-320b7d94 a page keeps the shown members and an empty page is empty` (task 2.1): passed
- `web.src.runs.decisions.test.ts::C-320b7d94 malformed values make the whole page unreadable` (task 2.1): passed
- `web.src.runs.dry-run-sources.test.ts::C-f665c2d6: 80-runs.tsx registers the Dry run panel beside the Test run panel` (task 4.1): passed
- `web.src.runs.dry-run-sources.test.ts::C-f665c2d6: DryRunPanel.tsx has the form texts, a code element and no inline style` (task 4.1): passed
- `web.src.runs.dry-run-sources.test.ts::C-f665c2d6: RunPage reads as the rules say` (task 4.2): passed
- `web.src.runs.dry-run-start.test.ts::C-a0fe5421: dryRunFormErrors keeps the fakes key and index and maps input` (task 1.2): passed
- `web.src.runs.dry-run-start.test.ts::C-a0fe5421: dryRunFormErrors sends other fields and errors to the form text` (task 1.2): passed
- `web.src.runs.dry-run-start.test.ts::C-a0fe5421: startDryRun posts the exact request and returns the run` (task 1.2): passed
- `web.src.runs.dry-run-start.test.ts::C-a0fe5421: startDryRun refuses a bad flow id, hash or key before any request` (task 1.2): passed
- `web.src.runs.dry-run-start.test.ts::C-a0fe5421: startDryRun reports an unreadable answer and rethrows the post's error` (task 1.2): passed
- `web.src.runs.dry-run.test.ts::C-0ba641d3 the panel follows the capability and the saved version` (task 1.1): passed
- `web.src.runs.dry-run.test.ts::C-b51ecdbd parseFakes accepts maps of lists` (task 1.1): passed
- `web.src.runs.dry-run.test.ts::C-b51ecdbd parseFakes copies the lists` (task 1.1): passed
- `web.src.runs.dry-run.test.ts::C-b51ecdbd parseFakes words each refusal` (task 1.1): passed
- `web.src.runs.timeline-taint.test.ts::C-acb416e2: Taint comes before Error and Decision of a failed switch` (task 3.1): passed
- `web.src.runs.timeline-taint.test.ts::C-acb416e2: a block step keeps its ten rows with one Taint` (task 3.1): passed
- `web.src.runs.timeline-taint.test.ts::C-acb416e2: a switch step gains Taint none after its Branch row` (task 3.1): passed
- `web.src.runs.timeline-taint.test.ts::C-acb416e2: a wait step lists its labels and an end step reads none` (task 3.1): passed
- `web.src.runs.timeline-taint.test.ts::C-acb416e2: an unknown kind gains its labels` (task 3.1): passed
