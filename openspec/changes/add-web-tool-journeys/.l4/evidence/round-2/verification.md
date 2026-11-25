# Verification: openspec:add-web-tool-journeys: PASS (round 2)

traceability: 2/3 criteria covered by a discriminating test

- Base: `526628d1ad44ab150a54b1bfd12d660b0590a78b`
- Head: `2cc2cb2ae812185d1c6cae8cc4d5a0818f3170e4`
- Implementer profiles: beam, claude-sonnet, deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `1468c494d3d47de88eb361893d9b7438cd1856b384931bac1ac74ceb846a7447`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), beam reflection (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
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
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261125T1209Z-b177/017-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261125T1209Z-b177/018-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261125T1209Z-b177/019-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261125T1209Z-b177/020-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261125T1209Z-b177/021-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261125T1209Z-b177/022-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261125T1209Z-b177/023-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | skipped | no task with a red and a green commit |
| test path freeze | skipped | no green or fix-chore commit of the harness |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | skipped | no production file changed |
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/journey-sources.test.ts, test/journeys/m7-tools.test.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3100 of 3100 base tests pass on the unit's code with its 3 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-ef502704 | web-tools › The tools journey works against the real engine › Carol registers three servers and alice dry-runs through all three adapters | covered | test.journeys.m7-tools.test.ts::C-ef502704 carol registers three servers and alice dry-runs through all three adapters (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive) | - | 0.87 |
| C-eba5ac9e | web-tools › The M7 journey proves tool registration, review and a dry run in a browser › Carol sets up three tool servers and alice's dry run reads, runs and stubs | uncovered | - | test_m7_tools::test_carol_sets_up_three_servers_and_alice_dry_runs[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.14 |
| C-a147034b | web-tools › The journey files carry the milestone marker, the M6b checks and no skip › The journey sources read as the rules say | covered | test.journeys.journey-sources.test.ts::C-a147034b four mutated copies each give one problem (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); test.journeys.journey-sources.test.ts::C-a147034b the Node journey source holds ... | - | 0.93 |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m7_tools.py` |  | relevant | new test file |
| `openspec/changes/add-web-tool-journeys/.l4/ledger/r-20261125T0805Z-29d6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-journeys/.l4/ledger/r-20261125T1205Z-ae40.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-journeys/.l4/ledger/r-20261125T1209Z-b177.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-journeys/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tool-journeys/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/journeys/journey-sources.test.ts` |  | relevant | new test file |
| `test/journeys/m7-tools.test.ts` |  | relevant | new test file |

### Changed functions

100.0% of the changed executable lines ran.

| Function | Status | Lines run | Tests |
|---|---|---|---|

### Tests

3235 of 3236 passed, 1 failed, 0 errored, 0 skipped.
5 of 5 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-ef502704 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eba5ac9e | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a147034b | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-a147034b | not_testable | - | - | The observable outcome is produced by the TypeScript test test/journeys/journey-sources.test.ts reading e2e/test_m7_tools.py and test/journeys/m7-tools.test.ts, with four mutated copies each required to raise a problem; there is no Python module under test to import (the shown sources define no Pyth |
| C-ef502704 | not_testable | - | - | The criterion is verified only by Node/TypeScript e2e journeys (test/journeys/m7-tools.test.ts) and a Python e2e test against the real stack requiring units U47b-U56b; this unit adds no importable Python production module under test, and the journeys are not runnable without those units. |

## Answers to verdict questions

- Q-002 accept C-eba5ac9e by the delegate (claude-fable-5-1 via claude-code): The browser journey traces the criterion and checks every value of its scenario. It runs in two browser contexts (carol's page and alice's new context), and asserts the exact status "Discovered 2 tools over MCP 2026-07-28.", find_vendor read in the Tools row and in the exact Effect cell of Calls, th...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-ef502704 | web-tools › The tools journey works against the real engine › Carol registers three servers and alice dry-runs through all three adapters | pass | pass | the judge passed it and a discriminating test passes |
| C-eba5ac9e | web-tools › The M7 journey proves tool registration, review and a dry run in a browser › Carol sets up three tool servers and alice's dry run reads, runs and stubs | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The browser journey traces the criterion and checks every value of its scenario. It runs in two browser contexts (carol's page and alice's new context), and asserts the exact status "Discovered 2 tools over MCP 2026-07-28.", find_vendor re... |
| C-a147034b | web-tools › The journey files carry the milestone marker, the M6b checks and no skip › The journey sources read as the rules say | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-eba5ac9e): test_m7_tools::test_carol_sets_up_three_servers_and_alice_dry_runs[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] policy-decisions list limit not pinned by the scenario (spec gap) (criterion C-ef502704): C-ef502704's scenario does not pin the /api/v1/policy-decisions limit; the committed Node journey uses limit=100 because limit=200 returns 500 (listPolicyDecisions asks for limit+1=201 rows and decisions-query rejects anything above 200). Two implementations could differ on the limit; this behavior is not covered by any criterion.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.journeys.journey-sources.test.ts::C-a147034b four mutated copies each give one problem` (task 1.1): passed
- `test.journeys.journey-sources.test.ts::C-a147034b the Node journey source holds the rules` (task 1.1): passed
- `test.journeys.journey-sources.test.ts::C-a147034b the browser journey source holds the rules` (task 1.1): passed
- `test.journeys.m7-tools.test.ts::C-ef502704 carol registers three servers and alice dry-runs through all three adapters` (task 1.1): passed
