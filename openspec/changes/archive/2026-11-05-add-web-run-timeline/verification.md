# Verification: openspec:add-web-run-timeline: PASS (round 2)

traceability: 9/11 criteria covered by a discriminating test

- Base: `3e0d7e4c2077280f9a6a6a3a1b12f10b5ee58fd6`
- Head: `b3b54633f3c4e248ca7e14699bbd3863379689b6`
- Implementer profiles: glm, claude-sonnet, deepseek-free
- Judge: kiro-judge, 2 call(s), judged in 2 parts, prompt sha256 `582c0c5ac206ecf51b7a94f2e9059e708c2e657cdc7750c292933c2c39ea6395`
  - part 1: 21 file(s), 111473 characters, profile kiro-judge, reply valid
  - part 2: 4 file(s), 27773 characters, profile kiro-judge, reply valid
- Judge replies of kiro-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), glm zhipu (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
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
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261105T1809Z-9758/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261105T1809Z-9758/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261105T1809Z-9758/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261105T1809Z-9758/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261105T1809Z-9758/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261105T1809Z-9758/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261105T1809Z-9758/010-e2e.log |

## Files by part

- part 1: web/src/features/80-runs.tsx (851 characters)
- part 1: web/src/features/81-run.tsx (392 characters)
- part 1: web/src/runs/failures.ts (1557 characters)
- part 1: test/journeys/m4-runs.test.ts (7294 characters)
- part 1: e2e/test_m4_runs.py (9007 characters)
- part 1: web/src/runs/messages.ts (1288 characters)
- part 1: web/src/runs/pages.test.ts (5709 characters)
- part 1: web/src/runs/pages.ts (1789 characters)
- part 1: web/src/runs/polling.test.ts (10897 characters)
- part 1: web/src/runs/polling.ts (2900 characters)
- part 1: web/src/runs/RunPage.tsx (8186 characters)
- part 1: web/src/runs/runs.css (2390 characters)
- part 1: web/src/runs/runs-source.test.ts (12918 characters)
- part 1: web/src/runs/runs-source.ts (3720 characters)
- part 1: web/src/runs/RunsPage.tsx (1957 characters)
- part 1: web/src/runs/step-renderers.test.ts (3339 characters)
- part 1: web/src/runs/step-renderers.ts (3349 characters)
- part 1: openspec/changes/add-web-run-timeline/tasks.md (7831 characters)
- part 1: web/src/runs/test-run.test.ts (14919 characters)
- part 1: web/src/runs/test-run.ts (7339 characters)
- part 1: web/src/runs/TestRunPanel.tsx (3841 characters)
- part 2: web/src/runs/timeline.test.ts (8114 characters)
- part 2: web/src/runs/timeline.ts (4660 characters)
- part 2: web/src/runs/types.test.ts (5350 characters)
- part 2: web/src/runs/types.ts (9649 characters)

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
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/m4-runs.test.ts, web/src/features/80-runs.tsx, web/src/features/81-run.tsx, web/src/runs/RunPage.tsx, web/src/runs/RunsPage.tsx (+17 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 1607 of 1607 base tests pass on the unit's code with its 8 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- web/src/runs/timeline.test.ts kept at head for the run (task 3.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- web/src/runs/timeline.test.ts (task 3.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-2ceae13f | web-runs › Run views are parsed strictly and read through four loaders › Views are parsed strictly | covered | web.src.runs.types.test.ts::C-2ceae13f parseRunView drops a property it does not know (passed, red_assertion); web.src.runs.types.test.ts::C-2ceae13f the parsers keep the valid views with copies of their nested values (passed, red_assertion, inadequate); web.src.runs.types.test.ts::C-2ceae13f the pa... | - | 0.90 | - |
| C-8a285469 | web-runs › Run views are parsed strictly and read through four loaders › Loaders call exactly the run routes | covered | web.src.runs.runs-source.test.ts::C-8a285469 loadPayload reads the payload path by digest and refuses a short digest (passed, red_assertion); web.src.runs.runs-source.test.ts::C-8a285469 loadRun returns the parsed run and refuses a bad id without a call (passed, red_assertion); web.src.runs.runs-sou... | - | - | - |
| C-44473e25 | web-runs › Step renderers are registered by node kind › Built-ins, a default, registration and refusals | covered | web.src.runs.step-renderers.test.ts::C-44473e25: a repeat and seven bad renderers are refused and the list is unchanged (passed, red_assertion); web.src.runs.step-renderers.test.ts::C-44473e25: an unknown kind and __proto__ give one default renderer (passed, red_assertion); web.src.runs.step-rendere... | - | 0.95 | - |
| C-95befb77 | web-runs › The timeline shows every step with its state, details and payload › Items, states, details and payloads | covered | web.src.runs.timeline.test.ts::C-95befb77: a mocked wait shows its skipped outcome (passed, red_assertion); web.src.runs.timeline.test.ts::C-95befb77: a started step of a terminal run is Interrupted, else the state (passed, red_assertion); web.src.runs.timeline.test.ts::C-95befb77: a started step re... | - | - | `e2e/test_l4_c_95befb77.py`, `.l4-out/e2e/page.html` |
| C-f2512ba4 | web-runs › Polling follows a run until it ends › Delays, a followed run, a deadline and failures | covered | web.src.runs.polling.test.ts::C-f2512ba4 a failed poll rejects, calls onUpdate not, and a restart works (passed, red_assertion); web.src.runs.polling.test.ts::C-f2512ba4 a followed run resolves with the last snapshot (passed, red_assertion); web.src.runs.polling.test.ts::C-f2512ba4 a forbidden poll ... | - | - | `e2e/test_l4_c_f2512ba4.py`, `test-results/test-l4-c-f2512ba4-py-test-polling-follows-run-until-it-ends-chromium/test-failed-1.png`, `test-results/test-l4-c-f2512ba4-py-test-polling-follows-run-until-it-ends-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-b67fc6a7 | web-runs › The run pages are registered with fixed names › Registration, names and sources | covered | web.src.runs.pages.test.ts::C-b67fc6a7: the feature files declare the run pages and register the panel (passed, red_assertion); web.src.runs.pages.test.ts::C-b67fc6a7: the run pages carry their fixed names and navigation (passed, red_assertion); web.src.runs.pages.test.ts::C-b67fc6a7: the run source... | - | - | `e2e/test_l4_c_b67fc6a7.py`, `test-results/test-l4-c-b67fc6a7-py-test-run-pages-are-registered-with-fixed-names-chromium/test-failed-1.png`, `test-results/test-l4-c-b67fc6a7-py-test-run-pages-are-registered-with-fixed-names-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-a8d83d86 | web-runs › The Test run panel starts a mocked run › What the panel shows and what its inputs must be | covered | web.src.runs.test-run.test.ts::C-a8d83d86: parseTestInputs explains empty array invalid and null texts (passed, red_assertion); web.src.runs.test-run.test.ts::C-a8d83d86: parseTestInputs parses both texts as JSON objects (passed, red_assertion); web.src.runs.test-run.test.ts::C-a8d83d86: testPanelVi... | - | - | - |
| C-c7363684 | web-runs › The Test run panel starts a mocked run › Starting a run and explaining a refusal | covered | web.src.runs.test-run.test.ts::C-c7363684: startTestRun posts the test route and returns the run (passed, red_assertion); web.src.runs.test-run.test.ts::C-c7363684: startTestRun refuses a bad flow id and hash without a post (passed, red_assertion); web.src.runs.test-run.test.ts::C-c7363684: startTes... | - | - | - |
| C-e75f18dc | web-runs › The run logic works against the real engine › Alice, bob and mallory use the engine | covered | test.journeys.m4-runs.test.ts::C-e75f18dc alice, bob and mallory use the engine (passed, red_assertion) | - | - | - |
| C-4ef9cb9c | web-runs › The M4 journey proves test runs and the timeline in a browser › Alice test-runs a flow and follows the run | uncovered | - | test_m4_runs::test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run[chromium] (no proof that it discriminates (no red, audit or generated record)) | - | `e2e/test_l4_c_4ef9cb9c.py`, `test-results/test-l4-c-4ef9cb9c-py-test-alice-test-runs-flow-and-follows-run-chromium/test-failed-1.png`, `test-results/test-l4-c-4ef9cb9c-py-test-alice-test-runs-flow-and-follows-run-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-bffa668a | web-runs › The M4 journey proves test runs and the timeline in a browser › Bob reads the run but cannot start one | uncovered | - | test_m4_runs::test_c_bffa668a_bob_reads_the_run_but_cannot_start_one[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.19 | `e2e/test_l4_c_bffa668a.py`, `test-results/test-l4-c-bffa668a-py-test-bob-reads-run-but-cannot-start-one-chromium/test-failed-1.png`, `test-results/test-l4-c-bffa668a-py-test-bob-reads-run-but-cannot-start-one-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m4_runs.py` |  | relevant | new test file |
| `openspec/changes/add-web-run-timeline/.l4/ledger/r-20261105T1340Z-4a10.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-run-timeline/.l4/ledger/r-20261105T1518Z-4aa2.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-run-timeline/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-run-timeline/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/journeys/m4-runs.test.ts` |  | relevant | new test file |
| `web/src/features/80-runs.tsx` | web | relevant | named in the spec |
| `web/src/features/81-run.tsx` | web | relevant | named in the spec |
| `web/src/runs/RunPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/RunsPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/TestRunPanel.tsx` | web | relevant | named in the spec |
| `web/src/runs/failures.ts` | web | relevant | named in the spec |
| `web/src/runs/messages.ts` | web | relevant | named in the spec |
| `web/src/runs/pages.test.ts` |  | relevant | new test file |
| `web/src/runs/pages.ts` | web | relevant | named in the spec |
| `web/src/runs/polling.test.ts` |  | relevant | new test file |
| `web/src/runs/polling.ts` | web | relevant | named in the spec |
| `web/src/runs/runs-source.test.ts` |  | relevant | new test file |
| `web/src/runs/runs-source.ts` | web | relevant | named in the spec |
| `web/src/runs/runs.css` | web | relevant | named in the spec |
| `web/src/runs/step-renderers.test.ts` |  | relevant | new test file |
| `web/src/runs/step-renderers.ts` | web | relevant | named in the spec |
| `web/src/runs/test-run.test.ts` |  | relevant | new test file |
| `web/src/runs/test-run.ts` | web | relevant | named in the spec |
| `web/src/runs/timeline.test.ts` |  | relevant | new test file |
| `web/src/runs/timeline.ts` | web | relevant | named in the spec |
| `web/src/runs/types.test.ts` |  | relevant | new test file |
| `web/src/runs/types.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/features/80-runs.tsx, web/src/features/81-run.tsx, web/src/runs/RunPage.tsx, web/src/runs/RunsPage.tsx, web/src/runs/TestRunPanel.tsx and 9 more

### Tests

1701 of 1701 passed, 0 failed, 0 errored, 0 skipped.
48 of 48 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-2ceae13f | not_testable | - | - | - | 1 | The criterion tests internal TypeScript parser functions and deep-equality/copy behavior, which cannot be observed through the browser UI. | - |
| C-8a285469 | not_testable | - | - | - | 1 | This criterion validates internal TypeScript loader calls and parsed return values, which pytest-playwright cannot mock or inspect through the browser UI. | - |
| C-44473e25 | not_testable | - | - | - | 1 | Tests internal web module APIs and thrown errors, not browser-observable user behavior. | - |
| C-95befb77 | not_testable | e2e/test_l4_c_95befb77.py | - | - | 2 | Criterion tests pure timeline helper functions and fixtures, not an observable browser flow. | - |
| C-f2512ba4 | fails_at_head | e2e/test_l4_c_f2512ba4.py | fail | fail | 2 | the test fails at the head: test_l4_c_f2512ba4::test_polling_follows_run_until_it_ends[chromium] | test-results/test-l4-c-f2512ba4-py-test-polling-follows-run-until-it-ends-chromium/test-failed-1.png, test-results/test-l4-c-f2512ba4-py-test-polling-follows-run-until-it-ends-chromium/trace.zip |
| C-b67fc6a7 | fails_at_head | e2e/test_l4_c_b67fc6a7.py | fail | fail | 2 | the test fails at the head: test_l4_c_b67fc6a7::test_run_pages_are_registered_with_fixed_names[chromium] | test-results/test-l4-c-b67fc6a7-py-test-run-pages-are-registered-with-fixed-names-chromium/test-failed-1.png, test-results/test-l4-c-b67fc6a7-py-test-run-pages-are-registered-with-fixed-names-chromium/trace.zip |
| C-a8d83d86 | not_testable | - | - | - | 1 | The criterion tests internal TypeScript helper return values that are not observable through the browser UI. | - |
| C-c7363684 | not_testable | - | - | - | 1 | Requires direct unit-level checks of recording-client call objects, thrown RangeError/ApiRequestError types, registration idempotency, and message-table equality that are not observable through the browser UI. | - |
| C-e75f18dc | not_testable | - | - | - | 1 | The provided diff and snapshot do not expose the login, flow-editor, or backend routes needed to drive and assert this multi-user engine scenario reliably. | - |
| C-4ef9cb9c | fails_at_head | e2e/test_l4_c_4ef9cb9c.py | fail | fail | 2 | the test fails at the head: test_l4_c_4ef9cb9c::test_alice_test_runs_flow_and_follows_run[chromium] | test-results/test-l4-c-4ef9cb9c-py-test-alice-test-runs-flow-and-follows-run-chromium/test-failed-1.png, test-results/test-l4-c-4ef9cb9c-py-test-alice-test-runs-flow-and-follows-run-chromium/trace.zip |
| C-bffa668a | fails_at_head | e2e/test_l4_c_bffa668a.py | fail | fail | 2 | the test fails at the head: test_l4_c_bffa668a::test_bob_reads_run_but_cannot_start_one[chromium] | test-results/test-l4-c-bffa668a-py-test-bob-reads-run-but-cannot-start-one-chromium/test-failed-1.png, test-results/test-l4-c-bffa668a-py-test-bob-reads-run-but-cannot-start-one-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-2ceae13f | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8a285469 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-44473e25 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95befb77 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-f2512ba4 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b67fc6a7 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-a8d83d86 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c7363684 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e75f18dc | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-4ef9cb9c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-bffa668a | ok | 0.190 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-a8d83d86 | skipped | - | - | cap |
| C-95befb77 | invalid | - | - | `getattr` with a computed name is not allowed: import the public names you test; never locate code by reflection |
| C-44473e25 | rejected | e2e/test_l4_audit_c_44473e25_r1.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_44473e25_r1.py |

## Rejected audit tests

- C-44473e25: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_44473e25_r1.py

## Answers to verdict questions

- Q-002 accept C-2ceae13f by the delegate (claude-fable-5-1 via claude-code): The parsers behave as the scenario asks. parseRunView, parseStepView and parsePayloadView build fresh objects from known fields only, so an unknown property such as extra is dropped; principal, error and taint are rebuilt rather than reused, so they are copies. Every malformed input of the scenario ...
- Q-003 accept C-4ef9cb9c by agent (CLAUDECODE): The journey test e2e/test_m4_runs.py::test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run asserts this scenario step by step: the Test run panel text and no Start test run button before Validate, the two textboxes and the button after "Valid. 0 errors", the status "Started test run <runId>." ...
- Q-004 accept C-bffa668a by agent (CLAUDECODE): The journey test e2e/test_m4_runs.py::test_c_bffa668a_bob_reads_the_run_but_cannot_start_one sets up alice's run in one context and signs bob in in a second, then asserts the scenario: bob opens Runs and the run's link, reads "State: completed" and the four step buttons with no Start test run button...
- Q-005 accept F-81bc478e by the delegate (claude-fable-5-1 via claude-code): The finding is waived. The counterexample, a payload answer whose data property is undefined, cannot reach parsePayloadView: every answer of the runs API goes through the API client, which obtains the body with JSON.parse, and JSON.parse never produces undefined, functions or symbols. Every value JS...
- Q-006 accept H-e62fdc45 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion exercises the pure parser functions parseRunView, parseStepView and parsePayloadView with hand-built inputs and asks for deep equality, copies and null results. Nothing in it is visible in a browser, so an end-to-end test cannot check it. The three Node tests in typ...
- Q-007 accept H-eec0048a by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion's scenario drives runListFetcher, loadRun, loadSteps and loadPayload with an in-process recording client and asserts the exact paths, query options, signals, parsed values, the five-page cap and the RangeError raised before any request; none of that is observable in...
- Q-008 accept H-32069270 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion's scenario reads stepRenderers.list(), looks up kinds, registers a renderer and expects StepRendererError codes for duplicates and seven invalid renderers while the list stays unchanged. These are calls to an in-process registry and thrown errors; a browser shows no...
- Q-009 accept H-07248f6f by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion's scenario calls stepStateLabel, timelineItems, stepDetailRows, decisionHref, runErrorText, payloadShown and setPayloadLoad with hand-built steps and payload loads and asks for exact return values, a new Map and an unchanged input map. These are pure helpers; a brow...
- Q-010 accept H-420abdfd by agent (CLAUDECODE): The hold is waived. The scenario Delays, a followed run, a deadline and failures calls nextPollDelay and followRun with an injected sleep, clock and client and compares delays, calls, snapshots and failure outcomes; a browser can control none of those, so the criterion is not browser-observable as w...
- Q-011 accept H-7a90109b by agent (CLAUDECODE): The hold is waived. The scenario Registration, names and sources reads constants (RUN_PAGES, TEST_RUN_PANEL, RUNS_TITLE, runTitle, runPath, runLinkName), a createFeatureRegistry() navigation and the source text of the feature files, CSS and components; none of that is browser-observable as written. ...
- Q-012 accept H-ed380471 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion's scenario calls testPanelView and parseTestInputs with hand-built sessions, versions and texts and asks for exact return values: the loading, unavailable, denied, no_version and form views, the parsed objects, an own __proto__ property and the three error texts. Th...
- Q-013 accept H-c59c8e20 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion's scenario drives startTestRun with a recording client and asserts the exact POST path, body and Idempotency-Key header, an INVALID_RESPONSE rejection for a run outside the union, RangeError rejections without a request for a bad flow id or hash, that registerRunMes...
- Q-014 accept H-ac6e12a7 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion is not a browser criterion: its scenario is the Node journey m4-runs.test.ts, which starts the e2e stack in-process, signs in alice, bob and mallory through the session helpers and calls the logic functions directly against the engine. The test exists, carries the c...
- Q-015 accept H-36f31dc8 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion does have an end-to-end test: e2e/test_m4_runs.py tags its alice test with this criterion id and asserts every clause of the scenario in order: the panel's initial text and missing button, the two textboxes after Valid. 0 errors, the status Started test run and the ...
- Q-016 accept H-70326357 by the delegate (claude-fable-5-1 via claude-code): The hold is waived. The criterion does have an end-to-end test: e2e/test_m4_runs.py tags its bob test with this criterion id. Alice sets up the run in the first context, bob signs in in a second browser context, opens Runs, follows the link Open run of the Runs table, and the test asserts State: com...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-2ceae13f | web-runs › Run views are parsed strictly and read through four loaders › Views are parsed strictly | fail | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The parsers behave as the scenario asks. parseRunView, parseStepView and parsePayloadView build fresh objects from known fields only, so an unknown property such as extra is dropped; principal, error and taint are rebuilt rather than reuse... |
| C-8a285469 | web-runs › Run views are parsed strictly and read through four loaders › Loaders call exactly the run routes | pass | pass | the judge passed it and a discriminating test passes |
| C-44473e25 | web-runs › Step renderers are registered by node kind › Built-ins, a default, registration and refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-95befb77 | web-runs › The timeline shows every step with its state, details and payload › Items, states, details and payloads | pass | pass | the judge passed it and a discriminating test passes |
| C-f2512ba4 | web-runs › Polling follows a run until it ends › Delays, a followed run, a deadline and failures | pass | pass | the judge passed it and a discriminating test passes |
| C-b67fc6a7 | web-runs › The run pages are registered with fixed names › Registration, names and sources | pass | pass | the judge passed it and a discriminating test passes |
| C-a8d83d86 | web-runs › The Test run panel starts a mocked run › What the panel shows and what its inputs must be | pass | pass | the judge passed it and a discriminating test passes |
| C-c7363684 | web-runs › The Test run panel starts a mocked run › Starting a run and explaining a refusal | pass | pass | the judge passed it and a discriminating test passes |
| C-e75f18dc | web-runs › The run logic works against the real engine › Alice, bob and mallory use the engine | pass | pass | the judge passed it and a discriminating test passes |
| C-4ef9cb9c | web-runs › The M4 journey proves test runs and the timeline in a browser › Alice test-runs a flow and follows the run | pass | pass | accepted by agent (CLAUDECODE): The journey test e2e/test_m4_runs.py::test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run asserts this scenario step by step: the Test run panel text and no Start test run button before Validate, the two textboxes and the button after "Valid. 0 errors", the sta... |
| C-bffa668a | web-runs › The M4 journey proves test runs and the timeline in a browser › Bob reads the run but cannot start one | pass | pass | accepted by agent (CLAUDECODE): The journey test e2e/test_m4_runs.py::test_c_bffa668a_bob_reads_the_run_but_cannot_start_one sets up alice's run in one context and signs bob in in a second, then asserts the scenario: bob opens Runs and the run's link, reads "State: completed" and the four step butto... |
- C-2ceae13f: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-4ef9cb9c): test_m4_runs::test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-bffa668a): test_m4_runs::test_c_bffa668a_bob_reads_the_run_but_cannot_start_one[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test could not be written (criterion C-95befb77): invalid: `getattr` with a computed name is not allowed: import the public names you test; never locate code by reflection
- [minor, deterministic] an audit test was rejected (criterion C-44473e25): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_44473e25_r1.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2ceae13f): No end-to-end test traces criterion C-2ceae13f (web-runs › Run views are parsed strictly and read through four loaders › Views are parsed strictly); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8a285469): No end-to-end test traces criterion C-8a285469 (web-runs › Run views are parsed strictly and read through four loaders › Loaders call exactly the run routes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-44473e25): No end-to-end test traces criterion C-44473e25 (web-runs › Step renderers are registered by node kind › Built-ins, a default, registration and refusals); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-95befb77): No end-to-end test traces criterion C-95befb77 (web-runs › The timeline shows every step with its state, details and payload › Items, states, details and payloads); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f2512ba4): No end-to-end test traces criterion C-f2512ba4 (web-runs › Polling follows a run until it ends › Delays, a followed run, a deadline and failures); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b67fc6a7): No end-to-end test traces criterion C-b67fc6a7 (web-runs › The run pages are registered with fixed names › Registration, names and sources); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a8d83d86): No end-to-end test traces criterion C-a8d83d86 (web-runs › The Test run panel starts a mocked run › What the panel shows and what its inputs must be); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c7363684): No end-to-end test traces criterion C-c7363684 (web-runs › The Test run panel starts a mocked run › Starting a run and explaining a refusal); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e75f18dc): No end-to-end test traces criterion C-e75f18dc (web-runs › The run logic works against the real engine › Alice, bob and mallory use the engine); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4ef9cb9c): The end-to-end test test_m4_runs::test_c_4ef9cb9c_alice_test_runs_a_flow_and_follows_the_run[chromium] traces criterion C-4ef9cb9c (web-runs › The M4 journey proves test runs and the timeline in a browser › Alice test-runs a flow and follows the run), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-bffa668a): The end-to-end test test_m4_runs::test_c_bffa668a_bob_reads_the_run_but_cannot_start_one[chromium] traces criterion C-bffa668a (web-runs › The M4 journey proves test runs and the timeline in a browser › Bob reads the run but cannot start one), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] Duplicate payload digest starts duplicate loads (spec gap) (criterion C-95befb77): RunPage derives `missing` from the two-reference array before either load is written to state. If inputRef and outputRef are the same digest, the loop invokes loadPayload twice for the same cache key.
- [minor, judge] task 6.1: Bob journey omits accessibility checks during Alice setup: The Bob browser test logs Alice in and calls `_start_run(page)`, which opens the Alice flow editor, but performs no `assert_accessible(page)` for Alice's landing page or flow-editor page. Task 6.1 requires accessibility checks after every page, including the landing page.
- [minor, judge] Traceability matrix incorrectly marks both browser criteria uncovered: The gate report's traceability section says C-4ef9cb9c and C-bffa668a have "no discriminating test", while the same report lists passed browser tests with those exact scenario names and the shown tests assert their observable outcomes.
- [minor, judge] Payload parser accepts values outside PayloadValue (criterion C-2ceae13f): parsePayloadView accepts any own data property by casting raw["data"] to PayloadValue. Consequently an invalid API response with data: undefined is accepted instead of rejected. (waived by the delegate (claude-fable-5-1 via claude-code): The finding is waived. The counterexample, a payload answer whose data property is undefined, cannot reach parsePayloadView: every answer of the runs API goes through the API client, which obtains the body with JSON.parse, and JSON.parse never produces undefined, functions or symbols. Every value JSON.parse can produce (null, boolean, number, string, array, ob...
- [minor, judge] Valid-parser test omits the required error-copy assertion (criterion C-2ceae13f): The valid-view test states that nested values are copied but uses error: null and only asserts copies for principal and taint. It therefore does not verify the required copy behavior for a non-null RunError.
- [minor, judge] the judge called a test inadequate (criterion C-2ceae13f): web.src.runs.types.test.ts::C-2ceae13f the parsers keep the valid views with copies of their nested values

## New tests (red then green, `task.red_ok` in the ledger)

- `test.journeys.m4-runs.test.ts::C-e75f18dc alice, bob and mallory use the engine` (task 6.1): passed
- `web.src.runs.pages.test.ts::C-b67fc6a7: the feature files declare the run pages and register the panel` (task 5.1): passed
- `web.src.runs.pages.test.ts::C-b67fc6a7: the run pages carry their fixed names and navigation` (task 5.1): passed
- `web.src.runs.pages.test.ts::C-b67fc6a7: the run sources use kit tokens and accessible controls` (task 5.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 a failed poll rejects, calls onUpdate not, and a restart works` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 a followed run resolves with the last snapshot` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 a forbidden poll is not restarted and has a decision id` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 a malformed run id is a 404 panel without a request` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 a run that never ends hits the deadline` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 an abort during the wait rejects with an AbortError` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 an unreadable answer shows the INVALID_RESPONSE panel` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 delays double from 250 to 2000 and stop at a terminal state` (task 6.1): passed
- `web.src.runs.polling.test.ts::C-f2512ba4 the page view keeps the snapshot and stops polling on a failure` (task 6.1): passed
- `web.src.runs.runs-source.test.ts::C-8a285469 loadPayload reads the payload path by digest and refuses a short digest` (task 1.1): passed
- `web.src.runs.runs-source.test.ts::C-8a285469 loadRun returns the parsed run and refuses a bad id without a call` (task 1.1): passed
- `web.src.runs.runs-source.test.ts::C-8a285469 loadSteps caps five pages and reports the truncation` (task 1.1): passed
- `web.src.runs.runs-source.test.ts::C-8a285469 loadSteps pages the steps path and stops after the last page` (task 1.1): passed
- `web.src.runs.runs-source.test.ts::C-8a285469 runListFetcher asks the runs path with the limit then the cursor` (task 1.1): passed
- `web.src.runs.runs-source.test.ts::C-8a285469 the run list shows its retry message while it fails and drops it once it loads` (task 1.1): passed
- `web.src.runs.step-renderers.test.ts::C-44473e25: a repeat and seven bad renderers are refused and the list is unchanged` (task 2.1): passed
- `web.src.runs.step-renderers.test.ts::C-44473e25: an unknown kind and __proto__ give one default renderer` (task 2.1): passed
- `web.src.runs.step-renderers.test.ts::C-44473e25: the list starts with the four built-ins and lookups return them` (task 2.1): passed
- `web.src.runs.test-run.test.ts::C-a8d83d86: parseTestInputs explains empty array invalid and null texts` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-a8d83d86: parseTestInputs parses both texts as JSON objects` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-a8d83d86: testPanelView denies a reader and asks for a saved validated version` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-a8d83d86: testPanelView shows loading until a session and permissions are known` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-a8d83d86: testPanelView shows the form for every runnable version state` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-c7363684: startTestRun posts the test route and returns the run` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-c7363684: startTestRun refuses a bad flow id and hash without a post` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-c7363684: startTestRun refuses an answer whose run is not valid` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-c7363684: testRunFormErrors explains missing and invalid mocks` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-c7363684: testRunFormErrors explains refusals of the engine` (task 4.1): passed
- `web.src.runs.test-run.test.ts::C-c7363684: testRunFormErrors explains unavailable forbidden and unknown errors` (task 4.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: a mocked wait shows its skipped outcome` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: a started step of a terminal run is Interrupted, else the state` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: a started step reads running only in a live run` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: decisionHref encodes a good id and refuses a bad one` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: detail rows of a completed block step` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: detail rows of an interrupted step and of a failed step` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: payloadShown gives none, the JSON text or the error message` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: runErrorText joins code, message and node` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: setPayloadLoad confines a failure to its own digest` (task 3.1): passed
- `web.src.runs.timeline.test.ts::C-95befb77: timeline items are in seq order with kind, outcome and state` (task 3.1): passed
- `web.src.runs.types.test.ts::C-2ceae13f parseRunView drops a property it does not know` (task 1.1): passed
- `web.src.runs.types.test.ts::C-2ceae13f the parsers keep the valid views with copies of their nested values` (task 1.1): passed
- `web.src.runs.types.test.ts::C-2ceae13f the parsers refuse the malformed views` (task 1.1): passed
