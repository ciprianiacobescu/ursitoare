# Verification: openspec:add-dbos-runtime-followup-1: PASS (round 2)

traceability: 15/15 criteria covered by a discriminating test

- Base: `a6b5fb379201b1bb1334bc5bf5d4866ad95f1b0e`
- Head: `255101cc397515dac591da12c68e4eda172992da`
- Implementer profiles: deepseek-free
- Judge: kiro-judge, 1 call(s), prompt sha256 `1f8d84e54112ed582d74c8dfe0e68d666c7c7763b28d7d2b436994584cafffd0`
- Judge replies of kiro-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261105T1938Z-4670/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261105T1938Z-4670/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261105T1938Z-4670/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261105T1938Z-4670/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261105T1938Z-4670/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261105T1938Z-4670/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261105T1938Z-4670/029-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/durable/steps.test.ts, src/durable/steps.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1643 of 1643 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-607153ef | durable-runtime › runStep turns a replayed step error into dbos_failed — feedback FB-001 › runStep turns a replayed step error into dbos_failed | covered | src.durable.steps.test.ts::C-607153ef runStep replays recorded step errors without dbos_failed (passed, red_assertion) | - | 0.82 |
| C-25c32649 | durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse | covered | src.durable.prepare.test.ts::C-25c32649 prepareDurable creates the dbos schema and repeats as a no-op (passed, pass_to_pass); src.durable.prepare.test.ts::C-25c32649 prepareDurable refuses bad owner URLs and an unmigrated app role (passed, pass_to_pass) | - | 0.88 |
| C-da1b0c83 | durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database | covered | src.durable.launch.test.ts::C-da1b0c83 prepared database gives the expected config logger sessions and pool warning (passed, pass_to_pass) | - | 0.93 |
| C-cb0c606e | durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again | covered | src.durable.queue.test.ts::C-cb0c606e launch suspend resume and shutdown keep the runs queue (passed, pass_to_pass) | - | 0.92 |
| C-57d8e403 | durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals | covered | src.durable.launch.test.ts::C-57d8e403 launchDurable refuses bad options endpoints and databases (passed, pass_to_pass) | - | 0.81 |
| C-5d9b866b | durable-runtime › Workflows are registered before launch under a checked name › Registration rules | covered | src.durable.workflows.test.ts::C-5d9b866b registerWorkflow checks names and refuses late registration (passed, pass_to_pass) | - | 0.91 |
| C-e0745e1c | durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel | covered | src.durable.workflows.test.ts::C-e0745e1c a workflow id runs once and status and cancel report it (passed, pass_to_pass) | - | 0.85 |
| C-706487fb | durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls | covered | src.durable.steps.test.ts::C-706487fb C-0601de63 an after observer failure fails the step without retrying fn (passed, pass_to_pass); src.durable.steps.test.ts::C-706487fb steps are observed retried only on request and need a workflow (passed, pass_to_pass) | - | 0.80 |
| C-c27b0f1a | durable-runtime › Row-level security holds inside durable steps › Two tenants in steps | covered | src.durable.rls.test.ts::C-c27b0f1a row level security holds inside durable steps (passed, pass_to_pass) | - | 0.90 |
| C-c37d6095 | durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order | covered | src.main.durable.test.ts::C-c37d6095 main launches the runtime only for the all and worker roles and closes it before the database (passed, pass_to_pass) | - | 0.78 |
| C-073558f4 | durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health | covered | src.main.durable.test.ts::C-073558f4 main launches as the app role, keeps health unchanged, fails without the schema and closes after a listen failure (passed, pass_to_pass) | - | 0.84 |
| C-77ae2063 | durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree | covered | test.arch.dbos-access.test.ts::C-77ae2063: SDK imports and schema names outside the allowed modules are violations (passed, pass_to_pass); test.arch.dbos-access.test.ts::C-77ae2063: the allowed forms, the real tree and the pinned SDK version pass (passed, pass_to_pass) | - | 0.88 |
| C-2c0ae21b | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure | covered | test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b beforeReset hooks run in reverse part order before the seeds and a failed hook rejects STACK_RESET_FAILED naming the part (passed, pass_to_pass); test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b registry refuses a part whose beforeReset is... | - | 0.94 |
| C-769418cc | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed | covered | test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady defaults to a 5000 ms timeout and a 20 ms poll (passed, pass_to_pass); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady enqueues the ready workflow and resolves once it succeeds (passed, pass_to_pass);... | - | - |
| C-7732f592 | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close | covered | test.support.e2e-stack.stack.durable.test.ts::C-7732f592 three resets under the live engine then the close (passed, pass_to_pass) | - | 0.82 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/durable/steps.ts

### Tests

1702 of 1702 passed, 0 failed, 0 errored, 0 skipped.
1 of 1 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-607153ef | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-25c32649 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da1b0c83 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cb0c606e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-57d8e403 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d9b866b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e0745e1c | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-706487fb | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c27b0f1a | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c37d6095 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-073558f4 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-77ae2063 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2c0ae21b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-769418cc | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-7732f592 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-001 accept F-bb483e74 by agent (CLAUDECODE): The finding is waived. The scenario of C-607153ef holds: a replayed DurableError and a plain Error with a code reject with the same name, message, code and details, the DurableError is instanceof DurableError, fn is not called again and neither is dbos_failed; src/durable/steps.test.ts proves it red...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-607153ef | durable-runtime › runStep turns a replayed step error into dbos_failed — feedback FB-001 › runStep turns a replayed step error into dbos_failed | pass | pass | the judge passed it and a discriminating test passes |
| C-25c32649 | durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse | pass | pass | the judge passed it and a discriminating test passes |
| C-da1b0c83 | durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database | pass | pass | the judge passed it and a discriminating test passes |
| C-cb0c606e | durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again | pass | pass | the judge passed it and a discriminating test passes |
| C-57d8e403 | durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-5d9b866b | durable-runtime › Workflows are registered before launch under a checked name › Registration rules | pass | pass | the judge passed it and a discriminating test passes |
| C-e0745e1c | durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel | pass | pass | the judge passed it and a discriminating test passes |
| C-706487fb | durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls | pass | pass | the judge passed it and a discriminating test passes |
| C-c27b0f1a | durable-runtime › Row-level security holds inside durable steps › Two tenants in steps | pass | pass | the judge passed it and a discriminating test passes |
| C-c37d6095 | durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order | pass | pass | the judge passed it and a discriminating test passes |
| C-073558f4 | durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health | pass | pass | the judge passed it and a discriminating test passes |
| C-77ae2063 | durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree | pass | pass | the judge passed it and a discriminating test passes |
| C-2c0ae21b | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure | pass | pass | the judge passed it and a discriminating test passes |
| C-769418cc | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed | pass | pass | the judge passed it and a discriminating test passes |
| C-7732f592 | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] Replay classification depends on errors being extensible (spec gap) (criterion C-607153ef): markStepError silently ignores Object.defineProperty failures. A non-extensible callback error therefore reaches DBOS without STEP_ERROR_MARK, and the replay catch cannot recognize it as a callback outcome, so it falls through to dbosFailed(). The stated scenarios do not define behavior for non-extensible errors. (waived by agent (CLAUDECODE): The finding is waived. The scenario of C-607153ef holds: a replayed DurableError and a plain Error with a code reject with the same name, message, code and details, the DurableError is instanceof DurableError, fn is not called again and neither is dbos_f...

## Feedback

- FB-001: addressed at 255101cc39: src/durable/steps.ts:57-110 and src/durable/steps.ts:179-199 mark callback errors with an enumerable marker and revive marked DurableErrors; src.durable.steps.test.ts::C-607153ef passed.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.durable.steps.test.ts::C-607153ef runStep replays recorded step errors without dbos_failed` (task 1.1): passed
