# Verification: openspec:add-dbos-runtime: NEEDS_HUMAN (round 1)

traceability: 14/14 criteria covered by a discriminating test

- Base: `6b11cd551a1302d164822d6ab724e511ad6eac0c`
- Head: `6102ef595e1bf861db795a55bb3428af89842656`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 6 call(s), prompt sha256 `eafc7456cb2a012e56e21b964b20a6a89867ae07cab9ac4ee1f8136039796381`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 1, discarded 0; this round: -
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@6b11cd551a as 6102ef595e (1 commit) |
| 1 | integrity | ok | 130.4 | 11 sub-checks (+1 unfrozen by human answers); scope: 32 changed file(s) |
| 2 | build | ok | 31.7 |  |
| 3 | tests | ok | 220.7 |  |
| 4 | traceability | ok | 0.2 | 14/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/durable/errors.ts, src/durable/json.ts, src/durable/launch.ts, src/durable/prepare.ts, src/durable/registry.ts and 8 more |
| 8 | s1 judge | ok | 1.6 | 13/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | failed | 2814.0 | timeout: no answer within 600s |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261103T0902Z-3db1/035-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261103T0902Z-3db1/036-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261103T0902Z-3db1/037-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261103T0902Z-3db1/038-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261103T0902Z-3db1/039-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261103T0902Z-3db1/040-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261103T0902Z-3db1/041-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 8 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/durable/errors.ts, src/durable/json.ts, src/durable/launch.test.ts, src/durable/launch.ts, src/durable/prepare.test.ts (+19 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1408 of 1408 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/support/e2e-stack/durable-part.test.ts kept at head for the run (task 5.2: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- test/support/e2e-stack/durable-part.test.ts (task 5.2, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-25c32649 | durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse | covered | src.durable.prepare.test.ts::C-25c32649 prepareDurable creates the dbos schema and repeats as a no-op (passed, red_assertion); src.durable.prepare.test.ts::C-25c32649 prepareDurable refuses bad owner URLs and an unmigrated app role (passed, red_assertion) | - | 0.90 |
| C-da1b0c83 | durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database | covered | src.durable.launch.test.ts::C-da1b0c83 prepared database gives the expected config logger sessions and pool warning (passed, red_assertion) | - | 0.93 |
| C-cb0c606e | durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again | covered | src.durable.queue.test.ts::C-cb0c606e launch suspend resume and shutdown keep the runs queue (passed, pre_satisfied) | - | 0.92 |
| C-57d8e403 | durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals | covered | src.durable.launch.test.ts::C-57d8e403 launchDurable refuses bad options endpoints and databases (passed, red_assertion) | - | 0.84 |
| C-5d9b866b | durable-runtime › Workflows are registered before launch under a checked name › Registration rules | covered | src.durable.workflows.test.ts::C-5d9b866b registerWorkflow checks names and refuses late registration (passed, red_assertion) | - | 0.95 |
| C-e0745e1c | durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel | covered | src.durable.workflows.test.ts::C-e0745e1c a workflow id runs once and status and cancel report it (passed, red_assertion) | - | 0.88 |
| C-706487fb | durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls | covered | src.durable.steps.test.ts::C-706487fb steps are observed retried only on request and need a workflow (passed, red_assertion) | - | 0.85 |
| C-c27b0f1a | durable-runtime › Row-level security holds inside durable steps › Two tenants in steps | covered | src.durable.rls.test.ts::C-c27b0f1a row level security holds inside durable steps (passed, red_assertion) | - | 0.92 |
| C-c37d6095 | durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order | covered | src.main.durable.test.ts::C-c37d6095 main launches the runtime only for the all and worker roles and closes it before the database (passed, red_assertion) | - | 0.78 |
| C-073558f4 | durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health | covered | src.main.durable.test.ts::C-073558f4 main launches as the app role, keeps health unchanged, fails without the schema and closes after a listen failure (passed, red_assertion) | - | 0.90 |
| C-77ae2063 | durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree | covered | test.arch.dbos-access.test.ts::C-77ae2063: SDK imports and schema names outside the allowed modules are violations (passed, red_assertion); test.arch.dbos-access.test.ts::C-77ae2063: the allowed forms, the real tree and the pinned SDK version pass (passed, red_assertion) | - | 0.93 |
| C-2c0ae21b | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure | covered | test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b beforeReset hooks run in reverse part order before the seeds and a failed hook rejects STACK_RESET_FAILED naming the part (passed, red_assertion); test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b registry refuses a part whose beforeReset i... | - | 0.94 |
| C-769418cc | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed | covered | test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady defaults to a 5000 ms timeout and a 20 ms poll (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady enqueues the ready workflow and resolves once it succeeds (passed, red_assertion... | - | - |
| C-7732f592 | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close | covered | test.support.e2e-stack.stack.durable.test.ts::C-7732f592 three resets under the live engine then the close (passed, red_assertion) | - | 0.86 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/testing.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0422Z-3162.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0739Z-ce44.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0741Z-7374.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0849Z-634b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0902Z-3db1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/durable/errors.ts` | durable | relevant | named in the spec |
| `src/durable/json.ts` | durable | relevant | named in the spec |
| `src/durable/launch.test.ts` |  | relevant | new test file |
| `src/durable/launch.ts` | durable | relevant | named in the spec |
| `src/durable/prepare.test.ts` |  | relevant | new test file |
| `src/durable/prepare.ts` | durable | relevant | named in the spec |
| `src/durable/queue.test.ts` |  | relevant | new test file |
| `src/durable/registry.ts` | durable | relevant | named in the spec |
| `src/durable/rls.test.ts` |  | relevant | new test file |
| `src/durable/steps.test.ts` |  | relevant | new test file |
| `src/durable/steps.ts` | durable | relevant | named in the spec |
| `src/durable/workflows.test.ts` |  | relevant | new test file |
| `src/main.durable.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/arch/dbos-access.test.ts` |  | relevant | new test file |
| `test/arch/dbos-access.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/durable-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/durable-part.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/part.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/parts/40-durable.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/reset.hooks.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/reset.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/stack.durable.test.ts` |  | relevant | new test file |
| `test/support/global-setup.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/durable/errors.ts, src/durable/json.ts, src/durable/launch.ts, src/durable/prepare.ts, src/durable/registry.ts and 8 more

### Tests

1480 of 1480 passed, 0 failed, 0 errored, 0 skipped.
25 of 25 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-25c32649 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da1b0c83 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cb0c606e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-57d8e403 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d9b866b | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e0745e1c | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-706487fb | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c27b0f1a | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c37d6095 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-073558f4 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-77ae2063 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2c0ae21b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-769418cc | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-7732f592 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-25c32649 | durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse | - | needs_human | the judge gave no verdict for this criterion |
| C-da1b0c83 | durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database | - | needs_human | the judge gave no verdict for this criterion |
| C-cb0c606e | durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again | - | needs_human | the judge gave no verdict for this criterion |
| C-57d8e403 | durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals | - | needs_human | the judge gave no verdict for this criterion |
| C-5d9b866b | durable-runtime › Workflows are registered before launch under a checked name › Registration rules | - | needs_human | the judge gave no verdict for this criterion |
| C-e0745e1c | durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel | - | needs_human | the judge gave no verdict for this criterion |
| C-706487fb | durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls | - | needs_human | the judge gave no verdict for this criterion |
| C-c27b0f1a | durable-runtime › Row-level security holds inside durable steps › Two tenants in steps | - | needs_human | the judge gave no verdict for this criterion |
| C-c37d6095 | durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order | - | needs_human | the judge gave no verdict for this criterion |
| C-073558f4 | durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health | - | needs_human | the judge gave no verdict for this criterion |
| C-77ae2063 | durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree | - | needs_human | the judge gave no verdict for this criterion |
| C-2c0ae21b | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure | - | needs_human | the judge gave no verdict for this criterion |
| C-769418cc | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed | - | needs_human | the judge gave no verdict for this criterion |
| C-7732f592 | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close | - | needs_human | the judge gave no verdict for this criterion |

## Findings

None.

## Needs a human

- the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.durable.launch.test.ts::C-57d8e403 launchDurable refuses bad options endpoints and databases` (task 2.1): passed
- `src.durable.launch.test.ts::C-da1b0c83 prepared database gives the expected config logger sessions and pool warning` (task 2.1): passed
- `src.durable.prepare.test.ts::C-25c32649 prepareDurable creates the dbos schema and repeats as a no-op` (task 1.1): passed
- `src.durable.prepare.test.ts::C-25c32649 prepareDurable refuses bad owner URLs and an unmigrated app role` (task 1.1): passed
- `src.durable.queue.test.ts::C-cb0c606e launch suspend resume and shutdown keep the runs queue` (task 2.3): passed
- `src.durable.rls.test.ts::C-c27b0f1a row level security holds inside durable steps` (task 3.1): passed
- `src.durable.steps.test.ts::C-706487fb steps are observed retried only on request and need a workflow` (task 3.1): passed
- `src.durable.workflows.test.ts::C-5d9b866b registerWorkflow checks names and refuses late registration` (task 2.2): passed
- `src.durable.workflows.test.ts::C-e0745e1c a workflow id runs once and status and cancel report it` (task 2.2): passed
- `src.main.durable.test.ts::C-073558f4 main launches as the app role, keeps health unchanged, fails without the schema and closes after a listen failure` (task 6.1): passed
- `src.main.durable.test.ts::C-c37d6095 main launches the runtime only for the all and worker roles and closes it before the database` (task 6.1): passed
- `test.arch.dbos-access.test.ts::C-77ae2063: SDK imports and schema names outside the allowed modules are violations` (task 4.1): passed
- `test.arch.dbos-access.test.ts::C-77ae2063: the allowed forms, the real tree and the pinned SDK version pass` (task 4.1): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady defaults to a 5000 ms timeout and a 20 ms poll` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady enqueues the ready workflow and resolves once it succeeds` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady lets an enqueue rejection propagate unchanged` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady lets status, sleep and clock failures propagate unchanged` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady refuses the five bad options before enqueueing` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady rejects STACK_DURABLE_NOT_READY with the state when the deadline passes` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady rejects at once with a failed workflow state` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc discovery lists the durable part after the catalogue` (task 5.2): passed
- `test.support.e2e-stack.durable-part.test.ts::C-769418cc the durable part prepares the template and does nothing without a runtime` (task 5.2): passed
- `test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b beforeReset hooks run in reverse part order before the seeds and a failed hook rejects STACK_RESET_FAILED naming the part` (task 5.1): passed
- `test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b registry refuses a part whose beforeReset is not a function` (task 5.1): passed
- `test.support.e2e-stack.stack.durable.test.ts::C-7732f592 three resets under the live engine then the close` (task 6.1): passed
