# Verification: openspec:add-home-dashboard: PASS (round 3)

traceability: 9/13 criteria covered by a discriminating test

- Base: `36414c8654556cf4a593734ec69b009f815b415a`
- Head: `586291d48f50eab810f4937b6c31b8c57f6325d1`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `dd107a6068fce0bbcb6938a630f2cac8716c926042caef05a84ba8d450843213`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 2) |
| 1 | integrity | reused | 0.0 | reused (round 2) |
| 2 | build | reused | 0.0 | reused (round 2) |
| 3 | tests | reused | 0.0 | reused (round 2) |
| 4 | traceability | reused | 0.0 | reused (round 2) |
| 4a | audit sampling | reused | 0.0 | reused (round 2) |
| 5 | ui test generation | reused | 0.0 | reused (round 2) |
| 6 | quality | reused | 0.0 | reused (round 2) |
| 8 | s1 judge | reused | 0.0 | reused (round 2) |
| 9 | judge | reused | 0.0 | reused (round 2) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261120T0919Z-8442/035-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261120T0919Z-8442/036-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261120T0919Z-8442/037-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261120T0919Z-8442/038-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261120T0919Z-8442/039-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261120T0919Z-8442/040-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261120T0919Z-8442/041-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/app/HomePage.tsx, web/src/app/home-load.test.ts, web/src/app/home-rows.test.ts, web/src/app/home-sources.test.ts, web/src/app/home-steps.test.ts (+2 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2572 of 2572 base tests pass on the unit's code with its 4 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6b_home.py kept at head for the run (people changed it last (0ae7e61617, 566ade37f8))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-48588514 | web-shell › Only a ready session gets the dashboard › The view follows the session state | covered | web.src.app.home-rows.test.ts::C-48588514 homeView shows the dashboard only for a ready session (passed, red_assertion) | - | 0.93 | - |
| C-9517e900 | web-shell › Only a ready session gets the dashboard › The signed-out home is unchanged | uncovered | - | test_m6b_home::test_the_signed_out_home_is_unchanged[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.11 | `e2e/test_l4_c_9517e900.py`, `.l4-out/e2e/page.html` |
| C-f82b7f78 | web-shell › Recent runs show at most five runs with state, flow, time, duration and name › Seven runs give five rows with distinct link names | covered | web.src.app.home-rows.test.ts::C-f82b7f78 recentRunLinkName names the run by its last eight characters (passed, red_assertion); web.src.app.home-rows.test.ts::C-f82b7f78 runRows keeps five runs with their badge, time, duration and name (passed, red_assertion) | - | 0.93 | - |
| C-d8b03242 | web-shell › Recent flows are the five changed last › Seven flows in name order give five by recency | covered | web.src.app.home-rows.test.ts::C-d8b03242 the recent flows rows are the five most recently changed (passed, red_assertion) | - | 0.80 | `e2e/test_l4_c_d8b03242.py`, `.l4-out/e2e/page.html` |
| C-d54270f7 | web-shell › Next steps follow the role and the state the API shows › An author's steps follow her flows and runs | covered | web.src.app.home-steps.test.ts::C-d54270f7 an author's steps follow the flows and runs the API shows (passed, red_assertion) | - | 0.92 | - |
| C-1818ac9b | web-shell › Next steps follow the role and the state the API shows › An administrator's steps are the three setup counts | covered | web.src.app.home-steps.test.ts::C-1818ac9b an administrator's steps are the three setup counts the API shows (passed, red_assertion) | - | 0.82 | `e2e/test_l4_c_1818ac9b.py`, `test-results/test-l4-c-1818ac9b-py-test-administrator-next-steps-are-setup-counts-chromium/test-failed-1.png`, `test-results/test-l4-c-1818ac9b-py-test-administrator-next-steps-are-setup-counts-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-9de28eec | web-shell › Next steps follow the role and the state the API shows › Nothing is claimed that the page has not read | covered | web.src.app.home-steps.test.ts::C-9de28eec nothing is claimed when no fact is known or the role has no setup (passed, red_assertion) | - | 0.70 | - |
| C-942b137c | web-shell › Every next step links to a page that exists › The seven steps link to registered pages | covered | web.src.app.home-steps.test.ts::C-942b137c every next step links to a page that exists and names no navigation entry (passed, red_assertion) | - | 0.92 | `e2e/test_l4_c_942b137c.py`, `test-results/test-l4-c-942b137c-py-test-next-step-links-point-to-existing-pages-chromium/test-failed-1.png`, `test-results/test-l4-c-942b137c-py-test-next-step-links-point-to-existing-pages-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-4771fd19 | web-shell › The home loaders read one page each and fail loudly › The loaders ask one page, count, and fail loudly | covered | web.src.app.home-load.test.ts::C-4771fd19 each loader lets an abort error pass through (passed, red_assertion); web.src.app.home-load.test.ts::C-4771fd19 each loader passes a client failure through after one call (passed, red_assertion); web.src.app.home-load.test.ts::C-4771fd19 loadFlowSet reads on... | - | - | `e2e/test_l4_c_4771fd19.py`, `.l4-out/e2e/page.html` |
| C-d63e4803 | web-shell › The home page keeps its pins › The sources keep the pinned markup | covered | web.src.app.home-sources.test.ts::C-d63e4803 the home sources keep the pinned markup (passed, red_assertion) | - | 0.90 | - |
| C-c3d0d88f | web-shell › The dashboard renders each list and step from its own state › Alice sees her runs, flows and next step | uncovered | - | test_m6b_home::test_alice_sees_recent_runs_recent_flows_and_her_next_step[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.14 | - |
| C-7837c9f9 | web-shell › The dashboard renders each list and step from its own state › Carol sees setup steps from what the API shows | uncovered | - | test_m6b_home::test_carol_sees_setup_steps_from_what_the_api_shows[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.13 | `e2e/test_l4_c_7837c9f9.py`, `.l4-out/e2e/page.html` |
| C-c8aaa647 | web-shell › The dashboard renders each list and step from its own state › A failing list fails alone and Try again reads it again | uncovered | - | test_m6b_home::test_a_failing_list_fails_alone_and_try_again_reads_it_again[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.17 | `e2e/test_l4_c_c8aaa647.py`, `test-results/test-l4-c-c8aaa647-py-test-a-failing-list-fails-alone-and-try-again-reads-it-again-chromium/test-failed-1.png`, `test-results/test-l4-c-c8aaa647-py-test-a-failing-list-fails-alone-and-try-again-reads-it-again-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_home.py` |  | relevant | new test file |
| `openspec/changes/add-home-dashboard-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard-fix-1/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/ledger/r-20261120T0317Z-19c1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/ledger/r-20261120T0546Z-4db6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/ledger/r-20261120T0807Z-a5b2.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/ledger/r-20261120T0856Z-d6a7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/ledger/r-20261120T0919Z-8442.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/app/HomePage.tsx` | web | relevant | named in the spec |
| `web/src/app/home-load.test.ts` |  | relevant | new test file |
| `web/src/app/home-rows.test.ts` |  | relevant | new test file |
| `web/src/app/home-sources.test.ts` |  | relevant | new test file |
| `web/src/app/home-steps.test.ts` |  | relevant | new test file |
| `web/src/app/home.ts` | web | relevant | named in the spec |
| `web/src/features/10-home.tsx` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/app/HomePage.tsx, web/src/app/home.ts, web/src/features/10-home.tsx

### Tests

2686 of 2686 passed, 0 failed, 0 errored, 0 skipped.
21 of 21 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-48588514 | not_testable | - | - | - | 2 | homeView is a TypeScript module function invoked directly with session-state objects; the criterion's four cases (null, signed_out, failed, and ready usr_me/Alice Example) cannot be reproduced through the browser's public interface, and no UI affordance or endpoint lets a test set the session to tho... | - |
| C-9517e900 | writer_failed | e2e/test_l4_c_9517e900.py | - | - | 2 | structured output missing: the reply holds no JSON object | - |
| C-f82b7f78 | not_testable | - | - | - | 1 | runRows and recentRunLinkName are internal pure functions asserted by direct call (including runRows([], …) === []) with controlled nowMs/meId/names; the page fixture against the base URL exposes no HTTP/HTML surface for these function results or parameters. | - |
| C-d8b03242 | not_testable | e2e/test_l4_c_d8b03242.py | - | - | 2 | The criterion pins flowRows output to a fixed nowMs and injected fixture flows (F1-F7) and asserts internal return values including recentFlows([]) === []; these cannot be driven or observed through the page's public interface in an E2E test. | - |
| C-d54270f7 | not_testable | - | - | - | 1 | The criterion requires reproducing several backend capability/fact states (rows N1–N5b of test-plan.md T4) and asserting T4-specific texts; neither the plan rows/texts nor a way to set those states through the public interface is available against a single live origin. | - |
| C-1818ac9b | fails_at_head | e2e/test_l4_c_1818ac9b.py | fail | fail | 2 | the test fails at the head: test_l4_c_1818ac9b::test_administrator_next_steps_are_setup_counts[chromium] | test-results/test-l4-c-1818ac9b-py-test-administrator-next-steps-are-setup-counts-chromium/test-failed-1.png, test-results/test-l4-c-1818ac9b-py-test-administrator-next-steps-are-setup-counts-chromium/trace.zip |
| C-9de28eec | writer_failed | - | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |
| C-942b137c | fails_at_head | e2e/test_l4_c_942b137c.py | fail | fail | 2 | the test fails at the head: test_l4_c_942b137c::test_next_step_links_point_to_existing_pages[chromium] | test-results/test-l4-c-942b137c-py-test-next-step-links-point-to-existing-pages-chromium/test-failed-1.png, test-results/test-l4-c-942b137c-py-test-next-step-links-point-to-existing-pages-chromium/trace.zip |
| C-4771fd19 | accepted | e2e/test_l4_c_4771fd19.py | fail | pass | 1 | - | - |
| C-d63e4803 | not_testable | - | - | - | 1 | This criterion checks static source-file properties (needles present/absent in HomePage.tsx/10-home.tsx/home.ts, <HomePage /> props, and utility function results) which are not observable through the browser's public interface. | - |
| C-c3d0d88f | writer_failed | - | - | - | 2 | the stream ended without a final stop (last reason: length) | - |
| C-7837c9f9 | uncollectable | e2e/test_l4_c_7837c9f9.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-c8aaa647 | fails_at_head | e2e/test_l4_c_c8aaa647.py | fail | fail | 2 | the test fails at the head: test_l4_c_c8aaa647::test_a_failing_list_fails_alone_and_try_again_reads_it_again[chromium] | test-results/test-l4-c-c8aaa647-py-test-a-failing-list-fails-alone-and-try-again-reads-it-again-chromium/test-failed-1.png, test-results/test-l4-c-c8aaa647-py-test-a-failing-list-fails-alone-and-try-again-reads-it-again-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-48588514 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9517e900 | ok | 0.110 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f82b7f78 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d8b03242 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d54270f7 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1818ac9b | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9de28eec | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-942b137c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4771fd19 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-d63e4803 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3d0d88f | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7837c9f9 | ok | 0.130 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c8aaa647 | ok | 0.170 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-d54270f7 | skipped | - | - | cap |
| C-d63e4803 | not_testable | - | - | The criterion targets TypeScript source files (HomePage.tsx, 10-home.tsx, home.ts) and a TypeScript test (home-sources.test.ts); no Python module under test is provided, and findInlineStyleUse, findPaletteUtilities, findCssImports and findBannedImports are TypeScript functions, so pytest has no publ |
| C-48588514 | not_testable | - | - | homeView is specified only as a TypeScript export (web/src/app/home.ts); no Python module under test is shown to import, and the ready-session input field names are not defined, so a self-contained pytest test would require guessing names. |

## Answers to verdict questions

- Q-001 accept C-9517e900 by the delegate (claude-fable-5-1 via claude-code): The signed-out home is unchanged in the code. HomePage renders the old Landing markup (h1, the engine-health paragraph with role status, Check again with aria-disabled) whenever homeView answers public, which it does for a null, signed_out or failed session, and the single health effect lives in Hom...
- Q-002 accept C-c3d0d88f by the delegate (claude-fable-5-1 via claude-code): The code renders alice's dashboard as the scenario describes. Run rows are a Badge, a link named by recentRunLinkName, then the ago text in a time element wrapped in a Tooltip of the exact UTC minute, followed by the duration and the by text; runRows gives by you for the signed-in user and by Bob Ex...
- Q-003 accept C-7837c9f9 by the delegate (claude-fable-5-1 via claude-code): The code gives carol the three setup steps from what the API shows. loadPendingServers counts servers whose state is pending (2 of 3), loadUnassigned counts active human accounts with empty roles and localRoles (1 of 3), and a policy body with current null and pendingGrants 2 parses. nextSteps then ...
- Q-004 accept C-c8aaa647 by agent (CLAUDECODE): The criterion is met. I proved the unit's own browser test discriminates on a private e2e stack. test_a_failing_list_fails_alone_and_try_again_reads_it_again, tagged C-c8aaa647, passes at the head 586291d4 (with the later answer and ledger commits, whose web code is unchanged). It fails with an Asse...
- Q-005 accept H-08110025 by the delegate (claude-fable-5-1 via claude-code): Criterion C-48588514 is the view-selection scenario of homeView, a pure function of home.ts, and the specification itself frames it as a Node test: its WHEN clause says home-rows.test.ts calls homeView with the four session states. That test exists, is named with the criterion id, and asserts all fo...
- Q-006 accept H-cea9172c by the delegate (claude-fable-5-1 via claude-code): Criterion C-9517e900 is the signed-out home scenario and the code gives exactly what it describes. A 401 from /me is turned into a signed_out state by the capability loader, homeView answers public for it, and HomePage then renders the old Landing markup: the h1 Ursitoare, the engine-health paragrap...
- Q-007 accept H-cee9c0fd by the delegate (claude-fable-5-1 via claude-code): Criterion C-f82b7f78 is the runRows and recentRunLinkName scenario, which the specification itself frames as a direct call from home-rows.test.ts with a fixed nowMs, meId and name map. These are pure functions of home.ts with no browser surface of their own, so an end-to-end test cannot drive them a...
- Q-008 accept H-5c823df8 by the delegate (claude-fable-5-1 via claude-code): Criterion C-d8b03242 is the recentFlows and flowRows scenario, which the specification frames as a direct call from home-rows.test.ts with the seven T3 flows and a fixed nowMs. These are pure functions of home.ts, so the Node test is the proper trace and there is no browser surface to drive them wit...
- Q-009 accept H-26953a7c by the delegate (claude-fable-5-1 via claude-code): Criterion C-d54270f7 is the author scenario of nextSteps, which the specification frames as a direct call with the author capabilities and the facts of rows N1 to N5b of test-plan.md T4. nextSteps is a pure function of home.ts, so the Node test is the proper trace; the browser cannot set those fact ...
- Q-010 accept H-4faceff9 by the delegate (claude-fable-5-1 via claude-code): Criterion C-1818ac9b is the administrator scenario of nextSteps, which the specification frames as a direct call with carol's eleven capabilities and rows N10 to N15 of test-plan.md T4. nextSteps is a pure function of home.ts, so the Node test is the proper trace. That test exists, is named with the...
- Q-011 accept H-8d0fd794 by the delegate (claude-fable-5-1 via claude-code): Criterion C-9de28eec is the scenario in which nothing is claimed that the page has not read. The specification frames it as a direct call of nextSteps with the reader capabilities and rows N6 to N9, N13 and N16 to N18, and nextSteps is a pure function with no browser surface of its own, so a Node te...
- Q-012 accept H-5215cd10 by the delegate (claude-fable-5-1 via claude-code): Criterion C-942b137c is the scenario in which the seven steps link to registered pages. The specification frames it as a collection of nextSteps results in a Node test, and that test exists, is named with the criterion id, builds the page patterns from ADMIN_PAGES, TOOL_PAGES, FLOW_PAGES and RUN_PAG...
- Q-013 accept H-c77bd28c by the delegate (claude-fable-5-1 via claude-code): Criterion C-d63e4803 is the source-pin scenario: it reads HomePage.tsx, 10-home.tsx and home.ts as text and checks needles, counts and the four scanners. These are properties of source files, not of the rendered page, so no browser test can check them and the Node test is the only proper trace. That...
- Q-014 accept H-157de455 by the delegate (claude-fable-5-1 via claude-code): Criterion C-c3d0d88f is the scenario in which alice sees her runs, flows and next step. The unit ships its own browser test for it, test_alice_sees_recent_runs_recent_flows_and_her_next_step, tagged with the criterion id, and it asserts the three run texts, the three flow rows, the two next-step lin...
- Q-015 accept H-5c39e94a by the delegate (claude-fable-5-1 via claude-code): Criterion C-7837c9f9 is the scenario in which carol sees setup steps from what the API shows. The unit ships its own browser test for it, test_carol_sees_setup_steps_from_what_the_api_shows, tagged with the criterion id, and it asserts the three step links and hrefs, the three descriptions, the No r...
- Q-016 accept H-48d2a201 by the delegate (claude-fable-5-1 via claude-code): Criterion C-c8aaa647 is the scenario in which a failing list fails alone and Try again reads it again. The unit ships its own browser test for it, test_a_failing_list_fails_alone_and_try_again_reads_it_again, tagged with the criterion id, and it asserts every row of the scenario: both could-not-be-l...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-48588514 | web-shell › Only a ready session gets the dashboard › The view follows the session state | pass | pass | the judge passed it and a discriminating test passes |
| C-9517e900 | web-shell › Only a ready session gets the dashboard › The signed-out home is unchanged | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The signed-out home is unchanged in the code. HomePage renders the old Landing markup (h1, the engine-health paragraph with role status, Check again with aria-disabled) whenever homeView answers public, which it does for a null, signed_out... |
| C-f82b7f78 | web-shell › Recent runs show at most five runs with state, flow, time, duration and name › Seven runs give five rows with distinct link names | pass | pass | the judge passed it and a discriminating test passes |
| C-d8b03242 | web-shell › Recent flows are the five changed last › Seven flows in name order give five by recency | pass | pass | the judge passed it and a discriminating test passes |
| C-d54270f7 | web-shell › Next steps follow the role and the state the API shows › An author's steps follow her flows and runs | pass | pass | the judge passed it and a discriminating test passes |
| C-1818ac9b | web-shell › Next steps follow the role and the state the API shows › An administrator's steps are the three setup counts | pass | pass | the judge passed it and a discriminating test passes |
| C-9de28eec | web-shell › Next steps follow the role and the state the API shows › Nothing is claimed that the page has not read | pass | pass | the judge passed it and a discriminating test passes |
| C-942b137c | web-shell › Every next step links to a page that exists › The seven steps link to registered pages | pass | pass | the judge passed it and a discriminating test passes |
| C-4771fd19 | web-shell › The home loaders read one page each and fail loudly › The loaders ask one page, count, and fail loudly | pass | pass | the judge passed it and a discriminating test passes |
| C-d63e4803 | web-shell › The home page keeps its pins › The sources keep the pinned markup | pass | pass | the judge passed it and a discriminating test passes |
| C-c3d0d88f | web-shell › The dashboard renders each list and step from its own state › Alice sees her runs, flows and next step | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The code renders alice's dashboard as the scenario describes. Run rows are a Badge, a link named by recentRunLinkName, then the ago text in a time element wrapped in a Tooltip of the exact UTC minute, followed by the duration and the by te... |
| C-7837c9f9 | web-shell › The dashboard renders each list and step from its own state › Carol sees setup steps from what the API shows | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The code gives carol the three setup steps from what the API shows. loadPendingServers counts servers whose state is pending (2 of 3), loadUnassigned counts active human accounts with empty roles and localRoles (1 of 3), and a policy body ... |
| C-c8aaa647 | web-shell › The dashboard renders each list and step from its own state › A failing list fails alone and Try again reads it again | pass | pass | accepted by agent (CLAUDECODE): The criterion is met. I proved the unit's own browser test discriminates on a private e2e stack. test_a_failing_list_fails_alone_and_try_again_reads_it_again, tagged C-c8aaa647, passes at the head 586291d4 (with the later answer and ledger commits, whose web code is u... |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-9517e900): test_m6b_home::test_the_signed_out_home_is_unchanged[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c3d0d88f): test_m6b_home::test_alice_sees_recent_runs_recent_flows_and_her_next_step[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7837c9f9): test_m6b_home::test_carol_sees_setup_steps_from_what_the_api_shows[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c8aaa647): test_m6b_home::test_a_failing_list_fails_alone_and_try_again_reads_it_again[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-48588514): No end-to-end test traces criterion C-48588514 (web-shell › Only a ready session gets the dashboard › The view follows the session state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9517e900): The end-to-end test test_m6b_home::test_the_signed_out_home_is_unchanged[chromium] traces criterion C-9517e900 (web-shell › Only a ready session gets the dashboard › The signed-out home is unchanged), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f82b7f78): No end-to-end test traces criterion C-f82b7f78 (web-shell › Recent runs show at most five runs with state, flow, time, duration and name › Seven runs give five rows with distinct link names); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d8b03242): No end-to-end test traces criterion C-d8b03242 (web-shell › Recent flows are the five changed last › Seven flows in name order give five by recency); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d54270f7): No end-to-end test traces criterion C-d54270f7 (web-shell › Next steps follow the role and the state the API shows › An author's steps follow her flows and runs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1818ac9b): No end-to-end test traces criterion C-1818ac9b (web-shell › Next steps follow the role and the state the API shows › An administrator's steps are the three setup counts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9de28eec): No end-to-end test traces criterion C-9de28eec (web-shell › Next steps follow the role and the state the API shows › Nothing is claimed that the page has not read); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-942b137c): No end-to-end test traces criterion C-942b137c (web-shell › Every next step links to a page that exists › The seven steps link to registered pages); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4771fd19): No end-to-end test traces criterion C-4771fd19 (web-shell › The home loaders read one page each and fail loudly › The loaders ask one page, count, and fail loudly); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d63e4803): No end-to-end test traces criterion C-d63e4803 (web-shell › The home page keeps its pins › The sources keep the pinned markup); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c3d0d88f): The end-to-end test test_m6b_home::test_alice_sees_recent_runs_recent_flows_and_her_next_step[chromium] traces criterion C-c3d0d88f (web-shell › The dashboard renders each list and step from its own state › Alice sees her runs, flows and next step), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7837c9f9): The end-to-end test test_m6b_home::test_carol_sees_setup_steps_from_what_the_api_shows[chromium] traces criterion C-7837c9f9 (web-shell › The dashboard renders each list and step from its own state › Carol sees setup steps from what the API shows), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c8aaa647): The end-to-end test test_m6b_home::test_a_failing_list_fails_alone_and_try_again_reads_it_again[chromium] traces criterion C-c8aaa647 (web-shell › The dashboard renders each list and step from its own state › A failing list fails alone and Try again reads it again), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.app.home-load.test.ts::C-4771fd19 each loader lets an abort error pass through` (task 3.1): passed
- `web.src.app.home-load.test.ts::C-4771fd19 each loader passes a client failure through after one call` (task 3.1): passed
- `web.src.app.home-load.test.ts::C-4771fd19 loadFlowSet reads one page and reports whether it is complete` (task 3.1): passed
- `web.src.app.home-load.test.ts::C-4771fd19 loadPendingServers counts the pending servers on one page` (task 3.1): passed
- `web.src.app.home-load.test.ts::C-4771fd19 loadPolicyFact reads the current policy and pending grants` (task 3.1): passed
- `web.src.app.home-load.test.ts::C-4771fd19 loadRecentRuns asks one page of five runs` (task 3.1): passed
- `web.src.app.home-load.test.ts::C-4771fd19 loadUnassigned counts active humans without any role` (task 3.1): passed
- `web.src.app.home-load.test.ts::C-4771fd19 the loaders reject a malformed body with INVALID_RESPONSE` (task 3.1): passed
- `web.src.app.home-rows.test.ts::C-48588514 homeView shows the dashboard only for a ready session` (task 1.1): passed
- `web.src.app.home-rows.test.ts::C-d8b03242 the recent flows rows are the five most recently changed` (task 1.3): passed
- `web.src.app.home-rows.test.ts::C-f82b7f78 recentRunLinkName names the run by its last eight characters` (task 1.2): passed
- `web.src.app.home-rows.test.ts::C-f82b7f78 runRows keeps five runs with their badge, time, duration and name` (task 1.2): passed
- `web.src.app.home-sources.test.ts::C-d63e4803 the home sources keep the pinned markup` (task 4.1): passed
- `web.src.app.home-steps.test.ts::C-1818ac9b an administrator's steps are the three setup counts the API shows` (task 2.2): passed
- `web.src.app.home-steps.test.ts::C-942b137c every next step links to a page that exists and names no navigation entry` (task 2.2): passed
- `web.src.app.home-steps.test.ts::C-9de28eec nothing is claimed when no fact is known or the role has no setup` (task 2.2): passed
- `web.src.app.home-steps.test.ts::C-d54270f7 an author's steps follow the flows and runs the API shows` (task 2.1): passed

## Guard events

- guard.test_tamper: e2e/test_m6b_home.py
- guard.test_tamper: e2e/test_m6b_home.py
