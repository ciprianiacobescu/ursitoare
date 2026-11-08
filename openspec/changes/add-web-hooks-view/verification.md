# Verification: openspec:add-web-hooks-view: NEEDS_HUMAN (round 2)

traceability: 8/10 criteria covered by a discriminating test

- Base: `3dda49526601b2d682a5d003251ed413cd197d7d`
- Head: `e01f529fee4d87ce7c2a97a33a64e2de075960a5`
- Implementer profiles: deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `62114d8b1e69420d9781467eac89bafb12a439c1c3907dae08e77ea2da938d9a`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared)
- Cost: $0.8521

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base main@3dda495266 contained |
| 1 | integrity | ok | 170.9 | 11 sub-checks; scope: 29 changed file(s) |
| 2 | build | ok | 23.3 |  |
| 3 | tests | ok | 251.0 |  |
| 4 | traceability | ok | 0.1 | 8/10 criteria covered |
| 4a | audit sampling | ok | 9.6 | 2 not_testable, 1 skipped; support files at the base: 7 |
| 5 | ui test generation | ok | 164.0 | 9 not_testable, 1 uncollectable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/flow-graph/FlowGraphView.tsx, web/src/flow-graph/hook-overlay.ts, web/src/flows/diagnostics.ts, web/src/runs/RunPage.tsx, web/src/runs/code-renderer.ts and 2 more |
| 8 | s1 judge | ok | 0.6 | 4/10 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 271.7 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261108T1225Z-968b/037-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261108T1225Z-968b/038-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261108T1225Z-968b/039-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261108T1225Z-968b/040-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261108T1225Z-968b/041-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261108T1225Z-968b/042-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261108T1225Z-968b/043-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 4 task(s): red and green compared |
| test path freeze | ok | 5 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/m5-code-hooks.test.ts, test/web-flow-editor/hook-link-parity.test.ts, web/src/flow-graph/FlowGraphView.tsx, web/src/flow-graph/hook-overlay.test.ts, web/src/flow-graph/hook-overlay.ts (+8 more) |
| tdd history | ok | 5 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 1941 of 1941 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-822061e0 | web-flow-editor › Diagnostics accept layer H and link hook codes › Layer H is parsed, shown and linked | covered | web.src.flows.diagnostics-hooks.test.ts::C-822061e0 diagnostic rows and summary show an H issue (passed, red_assertion); web.src.flows.diagnostics-hooks.test.ts::C-822061e0 diagnosticHref links hook codes and refuses other shapes (passed, red_assertion); web.src.flows.diagnostics-hooks.test.ts::C-82... | - | - | - |
| C-8a9b0cea | web-flow-editor › Diagnostics accept layer H and link hook codes › Every hook code has a guide link | covered | test.web-flow-editor.hook-link-parity.test.ts::C-8a9b0cea every hook code has a guide link (passed, red_assertion) | - | 0.96 | - |
| C-740bc49b | web-flow-graph › The graph lists hooks, hook routes and flow rules beside the drawing › Badges, routes, rules and missing targets | covered | web.src.flow-graph.hook-overlay.test.ts::C-740bc49b hookOverlay badges routes rules and missing of HOOKED X3 and RULES (passed, red_assertion); web.src.flow-graph.hook-overlay.test.ts::C-740bc49b hookRoutePaths of X3 and hookSectionView of the fixtures (passed, red_assertion) | - | - | - |
| C-67dea741 | web-flow-graph › The graph lists hooks, hook routes and flow rules beside the drawing › Odd documents, limits, no mutation and an unchanged drawing | covered | web.src.flow-graph.hook-overlay.test.ts::C-67dea741 hookOverlay of odd documents and limits (passed, red_assertion); web.src.flow-graph.hook-overlay.test.ts::C-67dea741 hookRoutePaths skips self routes and routes to unknown nodes (passed, red_assertion); web.src.flow-graph.hook-overlay.test.ts::C-67... | - | - | - |
| C-c595362a | web-runs › A step carries its hook trace, parsed strictly › Absent, valid and malformed hook traces | covered | web.src.runs.hook-rows.test.ts::C-c595362a: parseStepHooks reads absent, valid and malformed traces (passed, red_assertion); web.src.runs.hook-rows.test.ts::C-c595362a: parseStepView keeps the trace as its last member or null (passed, red_assertion) | - | 0.95 | - |
| C-ff5e87af | web-runs › Hook rows read like the trace › Texts and details of the trace | covered | web.src.runs.hook-rows.test.ts::C-ff5e87af: a malformed trace gives no rows and a note (passed, red_assertion); web.src.runs.hook-rows.test.ts::C-ff5e87af: hook rows read the labels, texts and details of a trace (passed, red_assertion); web.src.runs.hook-rows.test.ts::C-ff5e87af: hook rows show redi... | - | - | - |
| C-d630941c | web-runs › Code steps have a renderer that the run page registers once › Registering and rendering a code step | covered | web.src.runs.code-renderer.test.ts::C-d630941c: registering the code renderer makes a code step render (passed, red_assertion) | - | 0.89 | - |
| C-1f095289 | web-runs › The hooks view works against the real engine › Alice and bob run demo-hooks and alice meets the X3 rule | covered | test.journeys.m5-code-hooks.test.ts::C-1f095289 alice and bob run demo-hooks and alice meets the X3 rule (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-002: the check was inconclusive) | - | - | - |
| C-25335f88 | web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice validates, test-runs and reads demo-hooks | uncovered | - | test_m5_code_hooks::test_c_25335f88_alice_validates_test_runs_and_reads_demo_hooks[chromium] (no proof that it discriminates (no red, audit or generated record)) | - | `e2e/test_l4_c_25335f88.py`, `.l4-out/e2e/page.html` |
| C-6d33a627 | web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice meets the X3 rejection on demo-x3 | uncovered | - | test_m5_code_hooks::test_c_6d33a627_alice_meets_the_x3_rejection[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | `e2e/test_l4_c_6d33a627.py`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m5_code_hooks.py` |  | relevant | new test file |
| `openspec/changes/add-web-hooks-view-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/.l4/ledger/r-20261108T1014Z-5062.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/.l4/ledger/r-20261108T1146Z-9221.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/.l4/ledger/r-20261108T1225Z-968b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-hooks-view/verification.md` |  | none | exempt: harness, spec or documentation path |
| `test/journeys/m5-code-hooks.test.ts` |  | relevant | new test file |
| `test/web-flow-editor/hook-link-parity.test.ts` |  | relevant | new test file |
| `web/src/flow-graph/FlowGraphView.tsx` | web | relevant | named in the spec |
| `web/src/flow-graph/hook-overlay.css` | web | relevant | named in the spec |
| `web/src/flow-graph/hook-overlay.test.ts` |  | relevant | new test file |
| `web/src/flow-graph/hook-overlay.ts` | web | relevant | named in the spec |
| `web/src/flows/diagnostics-hooks.test.ts` |  | relevant | new test file |
| `web/src/flows/diagnostics.ts` | web | relevant | named in the spec |
| `web/src/runs/RunPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/code-renderer.test.ts` |  | relevant | new test file |
| `web/src/runs/code-renderer.ts` | web | relevant | named in the spec |
| `web/src/runs/hook-rows.test.ts` |  | relevant | new test file |
| `web/src/runs/hook-rows.ts` | web | relevant | named in the spec |
| `web/src/runs/hooks.css` | web | relevant | named in the spec |
| `web/src/runs/types.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/flow-graph/FlowGraphView.tsx, web/src/flow-graph/hook-overlay.ts, web/src/flows/diagnostics.ts, web/src/runs/RunPage.tsx, web/src/runs/code-renderer.ts and 2 more

### Tests

2017 of 2017 passed, 0 failed, 0 errored, 0 skipped.
18 of 18 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-822061e0 | not_testable | - | - | - | 1 | Criterion specifies pure functions (parseValidation, diagnosticRows, diagnosticHref) with fixture inputs; the page snapshot is an empty SPA shell with no UI route to feed them, so it is a unit-level check, not an e2e one. | - |
| C-8a9b0cea | not_testable | - | - | - | 1 | Criterion is about a Node unit test (hook-link-parity.test.ts) comparing library constants and functions; no browser-observable behavior or UI to drive with Playwright. | - |
| C-740bc49b | not_testable | - | - | - | 1 | Criterion specifies return values of pure functions on test-plan fixtures; no known browser route/flow to reach the graph from the empty SPA shell. | - |
| C-67dea741 | not_testable | - | - | - | 1 | The criterion is about pure module functions (hookOverlay, layoutFlow, hookSectionView with a counting Proxy). A browser user can't observe those, and the page snapshot shows no route or fixture for loading such documents. | - |
| C-c595362a | not_testable | - | - | - | 1 | Criterion is about pure functions parseStepHooks/parseStepView; the browser UI (empty SPA shell) exposes no way to call them or their fixtures, so no end-to-end check exists. | - |
| C-ff5e87af | not_testable | - | - | - | 1 | Criterion specifies pure functions (hookRows, hookTraceNote) on in-memory fixtures; the snapshot shows only an empty SPA shell with no known route or data to drive a run page with these hook traces. | - |
| C-d630941c | not_testable | - | - | - | 1 | Criterion concerns in-process module APIs (stepRenderers, registerCodeRenderer, timelineItems) in a fresh process; not observable through the browser UI. | - |
| C-1f095289 | not_testable | - | - | - | 1 | Criterion is a Node-level test (m5-code-hooks.test.ts) that calls web helper functions (followRun, loadPayload, hookOverlay, testRunFormErrors) against a real engine stack. The page snapshot shows only an empty SPA shell, with no known UI selectors, login flow or seed data, so a browser test can't c... | - |
| C-25335f88 | uncollectable | e2e/test_l4_c_25335f88.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-6d33a627 | not_testable | e2e/test_l4_c_6d33a627.py | - | - | 2 | Needs the suite's login(), seeded users and assert_accessible() helpers plus the DEMO_X3 fixture. None of these are visible here, so a self-contained test would only guess the sign-in UI and fail. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-822061e0 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-8a9b0cea | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-740bc49b | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-67dea741 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c595362a | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ff5e87af | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-d630941c | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1f095289 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-25335f88 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6d33a627 | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-822061e0 | skipped | - | - | cap |
| C-1f095289 | not_testable | - | - | Criterion is a TypeScript web journey (vitest against a real engine stack, browser-side modules); no Python module or public interface exists to exercise from pytest. |
| C-8a9b0cea | not_testable | - | - | The criterion is a TypeScript test (test/web-flow-editor/hook-link-parity.test.ts) over TS modules; no Python public interface is shown to test with pytest. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-822061e0 | web-flow-editor › Diagnostics accept layer H and link hook codes › Layer H is parsed, shown and linked | pass | pass | the judge passed it and a discriminating test passes |
| C-8a9b0cea | web-flow-editor › Diagnostics accept layer H and link hook codes › Every hook code has a guide link | pass | pass | the judge passed it and a discriminating test passes |
| C-740bc49b | web-flow-graph › The graph lists hooks, hook routes and flow rules beside the drawing › Badges, routes, rules and missing targets | pass | pass | the judge passed it and a discriminating test passes |
| C-67dea741 | web-flow-graph › The graph lists hooks, hook routes and flow rules beside the drawing › Odd documents, limits, no mutation and an unchanged drawing | pass | pass | the judge passed it and a discriminating test passes |
| C-c595362a | web-runs › A step carries its hook trace, parsed strictly › Absent, valid and malformed hook traces | pass | pass | the judge passed it and a discriminating test passes |
| C-ff5e87af | web-runs › Hook rows read like the trace › Texts and details of the trace | pass | pass | the judge passed it and a discriminating test passes |
| C-d630941c | web-runs › Code steps have a renderer that the run page registers once › Registering and rendering a code step | pass | pass | the judge passed it and a discriminating test passes |
| C-1f095289 | web-runs › The hooks view works against the real engine › Alice and bob run demo-hooks and alice meets the X3 rule | pass | pass | the judge passed it and a discriminating test passes |
| C-25335f88 | web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice validates, test-runs and reads demo-hooks | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-6d33a627 | web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice meets the X3 rejection on demo-x3 | pass | needs_human | uncovered: no adequate discriminating test traces it |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-25335f88): test_m5_code_hooks::test_c_25335f88_alice_validates_test_runs_and_reads_demo_hooks[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-6d33a627): test_m5_code_hooks::test_c_6d33a627_alice_meets_the_x3_rejection[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-822061e0): No end-to-end test traces criterion C-822061e0 (web-flow-editor › Diagnostics accept layer H and link hook codes › Layer H is parsed, shown and linked); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8a9b0cea): No end-to-end test traces criterion C-8a9b0cea (web-flow-editor › Diagnostics accept layer H and link hook codes › Every hook code has a guide link); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-740bc49b): No end-to-end test traces criterion C-740bc49b (web-flow-graph › The graph lists hooks, hook routes and flow rules beside the drawing › Badges, routes, rules and missing targets); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-67dea741): No end-to-end test traces criterion C-67dea741 (web-flow-graph › The graph lists hooks, hook routes and flow rules beside the drawing › Odd documents, limits, no mutation and an unchanged drawing); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c595362a): No end-to-end test traces criterion C-c595362a (web-runs › A step carries its hook trace, parsed strictly › Absent, valid and malformed hook traces); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ff5e87af): No end-to-end test traces criterion C-ff5e87af (web-runs › Hook rows read like the trace › Texts and details of the trace); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d630941c): No end-to-end test traces criterion C-d630941c (web-runs › Code steps have a renderer that the run page registers once › Registering and rendering a code step); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1f095289): No end-to-end test traces criterion C-1f095289 (web-runs › The hooks view works against the real engine › Alice and bob run demo-hooks and alice meets the X3 rule); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-25335f88): The end-to-end test test_m5_code_hooks::test_c_25335f88_alice_validates_test_runs_and_reads_demo_hooks[chromium] traces criterion C-25335f88 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice validates, test-runs and reads demo-hooks), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6d33a627): The end-to-end test test_m5_code_hooks::test_c_6d33a627_alice_meets_the_x3_rejection[chromium] traces criterion C-6d33a627 (web-runs › The M5 journey proves code nodes, hooks and the X3 rejection in a browser › Alice meets the X3 rejection on demo-x3), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.

## Needs a human

- UI criterion C-822061e0 has no end-to-end test; see the generated UI tests table
- UI criterion C-8a9b0cea has no end-to-end test; see the generated UI tests table
- UI criterion C-740bc49b has no end-to-end test; see the generated UI tests table
- UI criterion C-67dea741 has no end-to-end test; see the generated UI tests table
- UI criterion C-c595362a has no end-to-end test; see the generated UI tests table
- UI criterion C-ff5e87af has no end-to-end test; see the generated UI tests table
- UI criterion C-d630941c has no end-to-end test; see the generated UI tests table
- UI criterion C-1f095289 has no end-to-end test; see the generated UI tests table
- UI criterion C-25335f88 has no end-to-end test; see the generated UI tests table
- UI criterion C-6d33a627 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `test.journeys.m5-code-hooks.test.ts::C-1f095289 alice and bob run demo-hooks and alice meets the X3 rule` (task 5.1): passed
- `test.web-flow-editor.hook-link-parity.test.ts::C-8a9b0cea every hook code has a guide link` (task 1.1): passed
- `web.src.flow-graph.hook-overlay.test.ts::C-67dea741 hookOverlay of odd documents and limits` (task 4.1): passed
- `web.src.flow-graph.hook-overlay.test.ts::C-67dea741 hookRoutePaths skips self routes and routes to unknown nodes` (task 4.1): passed
- `web.src.flow-graph.hook-overlay.test.ts::C-67dea741 hookSectionView skips a document without a layout` (task 4.1): passed
- `web.src.flow-graph.hook-overlay.test.ts::C-740bc49b hookOverlay badges routes rules and missing of HOOKED X3 and RULES` (task 4.1): passed
- `web.src.flow-graph.hook-overlay.test.ts::C-740bc49b hookRoutePaths of X3 and hookSectionView of the fixtures` (task 4.1): passed
- `web.src.flows.diagnostics-hooks.test.ts::C-822061e0 diagnostic rows and summary show an H issue` (task 1.1): passed
- `web.src.flows.diagnostics-hooks.test.ts::C-822061e0 diagnosticHref links hook codes and refuses other shapes` (task 1.1): passed
- `web.src.flows.diagnostics-hooks.test.ts::C-822061e0 parseValidation accepts layer H and refuses other layers` (task 1.1): passed
- `web.src.runs.code-renderer.test.ts::C-d630941c: registering the code renderer makes a code step render` (task 3.1): passed
- `web.src.runs.hook-rows.test.ts::C-c595362a: parseStepHooks reads absent, valid and malformed traces` (task 2.1): passed
- `web.src.runs.hook-rows.test.ts::C-c595362a: parseStepView keeps the trace as its last member or null` (task 2.1): passed
- `web.src.runs.hook-rows.test.ts::C-ff5e87af: a malformed trace gives no rows and a note` (task 2.1): passed
- `web.src.runs.hook-rows.test.ts::C-ff5e87af: hook rows read the labels, texts and details of a trace` (task 2.1): passed
- `web.src.runs.hook-rows.test.ts::C-ff5e87af: hook rows show redirects, retries and errors` (task 2.1): passed
