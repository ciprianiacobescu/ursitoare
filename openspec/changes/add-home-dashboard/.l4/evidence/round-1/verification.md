# Verification: openspec:add-home-dashboard: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `36414c8654556cf4a593734ec69b009f815b415a`
- Head: `f2dc86039c7011bcefba25be78e5a291a43477ba`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@36414c8654 contained |
| 1 | integrity | ok | 257.9 | 11 sub-checks; scope: 11 changed file(s) |
| 2 | build | ok | 32.9 |  |
| 3 | tests | failed | 262.9 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 2; e2e/test_m6b_home.py |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261120T0546Z-4db6/077-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261120T0546Z-4db6/078-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261120T0546Z-4db6/079-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261120T0546Z-4db6/080-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261120T0546Z-4db6/081-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261120T0546Z-4db6/082-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261120T0546Z-4db6/083-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/app/HomePage.tsx, web/src/app/home-load.test.ts, web/src/app/home-rows.test.ts, web/src/app/home-sources.test.ts, web/src/app/home-steps.test.ts (+2 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2572 of 2572 base tests pass on the unit's code with its 5 test and support files at the base (base: not needed) |

## Evidence

### Needs attention

- blocker: new test file ran no test: e2e/test_m6b_home.py

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_home.py` |  | relevant | new test file |
| `openspec/changes/add-home-dashboard/.l4/ledger/r-20261120T0317Z-19c1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/.l4/ledger/r-20261120T0546Z-4db6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-home-dashboard/tasks.md` |  | none | exempt: harness, spec or documentation path |
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

2589 of 2589 passed, 0 failed, 0 errored, 0 skipped.
17 of 17 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 2 Log: `.l4-out/gates/r-20261120T0546Z-4db6/083-e2e.log`.
- [blocker, deterministic] new test file ran no test: e2e/test_m6b_home.py

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae e2e gate failed
- F-c17c0f0a new test file ran no test

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
