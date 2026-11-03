# Verification: openspec:add-dbos-runtime: PASS (round 5)

traceability: 15/15 criteria covered by a discriminating test

- Base: `0254914c196d02a111706c4d1adc71f9831bc2ea`
- Head: `653bccacce27316f7973584583d975b924f17570`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: kiro-judge, 2 call(s), judged in 2 parts, prompt sha256 `92796c590360127298238b78d1f2cc68831612507b9159c29e530a5ba14e4d37`
  - part 1: 24 file(s), 108223 characters, profile kiro-judge, reply valid
  - part 2: 6 file(s), 41756 characters, profile kiro-judge, reply valid
- Judge replies of kiro-judge (this unit, all rounds): valid 4, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 4) |
| 1 | integrity | reused | 0.0 | reused (round 4) |
| 2 | build | reused | 0.0 | reused (round 4) |
| 3 | tests | reused | 0.0 | reused (round 4) |
| 4 | traceability | reused | 0.0 | reused (round 4) |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 4) |
| 8 | s1 judge | reused | 0.0 | reused (round 4) |
| 9 | judge | reused | 0.0 | reused (round 4) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261103T1827Z-6d81/026-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261103T1827Z-6d81/027-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261103T1827Z-6d81/028-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261103T1827Z-6d81/029-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261103T1827Z-6d81/030-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261103T1827Z-6d81/031-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261103T1827Z-6d81/032-e2e.log |

## Files by part

- part 1: openspec/changes/add-dbos-runtime-fix-1/.openspec.yaml (302 characters)
- part 1: test/support/e2e-stack/parts/40-durable.ts (281 characters)
- part 1: test/arch/dbos-access.test.ts (3661 characters)
- part 1: test/arch/dbos-access.ts (3392 characters)
- part 1: test/support/e2e-stack/durable-part.test.ts (13785 characters)
- part 1: test/support/e2e-stack/durable-part.ts (4988 characters)
- part 1: src/durable/errors.ts (851 characters)
- part 1: test/support/global-setup.ts (842 characters)
- part 1: src/durable/json.ts (1432 characters)
- part 1: src/durable/launch.test.ts (12787 characters)
- part 1: src/durable/launch.ts (12976 characters)
- part 1: src/main.durable.test.ts (12220 characters)
- part 1: src/main.ts (2031 characters)
- part 1: test/support/e2e-stack/part.ts (989 characters)
- part 1: src/durable/prepare.test.ts (4459 characters)
- part 1: src/durable/prepare.ts (1890 characters)
- part 1: openspec/changes/add-dbos-runtime-fix-1/proposal.md (1566 characters)
- part 1: src/durable/queue.test.ts (9398 characters)
- part 1: src/durable/registry.ts (1466 characters)
- part 1: test/support/e2e-stack/reset.hooks.test.ts (4410 characters)
- part 1: test/support/e2e-stack/reset.ts (1268 characters)
- part 1: src/durable/rls.test.ts (5034 characters)
- part 1: openspec/changes/add-dbos-runtime-fix-1/specs/durable-runtime/spec.md (1041 characters)
- part 1: test/support/e2e-stack/stack.durable.test.ts (7154 characters)
- part 2: src/durable/steps.test.ts (12425 characters)
- part 2: src/durable/steps.ts (4891 characters)
- part 2: openspec/changes/add-dbos-runtime-fix-1/tasks.md (379 characters)
- part 2: openspec/changes/add-dbos-runtime/tasks.md (13885 characters)
- part 2: docs/testing.md (911 characters)
- part 2: src/durable/workflows.test.ts (9265 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 9 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/durable/errors.ts, src/durable/json.ts, src/durable/launch.test.ts, src/durable/launch.ts, src/durable/prepare.test.ts (+19 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1408 of 1408 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/support/e2e-stack/durable-part.test.ts kept at head for the run (task 5.2: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- test/support/e2e-stack/durable-part.test.ts (task 5.2, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-25c32649 | durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse | covered | src.durable.prepare.test.ts::C-25c32649 prepareDurable creates the dbos schema and repeats as a no-op (passed, red_assertion); src.durable.prepare.test.ts::C-25c32649 prepareDurable refuses bad owner URLs and an unmigrated app role (passed, red_assertion) | - | 0.91 |
| C-da1b0c83 | durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database | covered | src.durable.launch.test.ts::C-da1b0c83 prepared database gives the expected config logger sessions and pool warning (passed, red_assertion, inadequate) | - | 0.93 |
| C-cb0c606e | durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again | covered | src.durable.queue.test.ts::C-cb0c606e launch suspend resume and shutdown keep the runs queue (passed, pre_satisfied) | - | 0.92 |
| C-57d8e403 | durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals | covered | src.durable.launch.test.ts::C-57d8e403 launchDurable refuses bad options endpoints and databases (passed, red_assertion) | - | 0.83 |
| C-5d9b866b | durable-runtime › Workflows are registered before launch under a checked name › Registration rules | covered | src.durable.workflows.test.ts::C-5d9b866b registerWorkflow checks names and refuses late registration (passed, red_assertion) | - | 0.95 |
| C-e0745e1c | durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel | covered | src.durable.workflows.test.ts::C-e0745e1c a workflow id runs once and status and cancel report it (passed, red_assertion) | - | 0.89 |
| C-706487fb | durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls | covered | src.durable.steps.test.ts::C-706487fb C-0601de63 an after observer failure fails the step without retrying fn (passed, red_assertion); src.durable.steps.test.ts::C-706487fb steps are observed retried only on request and need a workflow (passed, red_assertion) | - | 0.82 |
| C-c27b0f1a | durable-runtime › Row-level security holds inside durable steps › Two tenants in steps | covered | src.durable.rls.test.ts::C-c27b0f1a row level security holds inside durable steps (passed, red_assertion) | - | 0.91 |
| C-c37d6095 | durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order | covered | src.main.durable.test.ts::C-c37d6095 main launches the runtime only for the all and worker roles and closes it before the database (passed, red_assertion) | - | 0.78 |
| C-073558f4 | durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health | covered | src.main.durable.test.ts::C-073558f4 main launches as the app role, keeps health unchanged, fails without the schema and closes after a listen failure (passed, red_assertion) | - | 0.92 |
| C-77ae2063 | durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree | covered | test.arch.dbos-access.test.ts::C-77ae2063: SDK imports and schema names outside the allowed modules are violations (passed, red_assertion); test.arch.dbos-access.test.ts::C-77ae2063: the allowed forms, the real tree and the pinned SDK version pass (passed, red_assertion) | - | 0.93 |
| C-2c0ae21b | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure | covered | test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b beforeReset hooks run in reverse part order before the seeds and a failed hook rejects STACK_RESET_FAILED naming the part (passed, red_assertion); test.support.e2e-stack.reset.hooks.test.ts::C-2c0ae21b registry refuses a part whose beforeReset i... | - | 0.94 |
| C-769418cc | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed | covered | test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady defaults to a 5000 ms timeout and a 20 ms poll (passed, red_assertion); test.support.e2e-stack.durable-part.test.ts::C-769418cc checkDurableReady enqueues the ready workflow and resolves once it succeeds (passed, red_assertion... | - | - |
| C-7732f592 | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close | covered | test.support.e2e-stack.stack.durable.test.ts::C-7732f592 three resets under the live engine then the close (passed, red_assertion) | - | 0.85 |
| C-0601de63 | durable-runtime › Steps are observed, retried only on request, and need a workflow — regression 1 › An after-observer failure is retried instead of failing the step | covered | src.durable.steps.test.ts::C-706487fb C-0601de63 an after observer failure fails the step without retrying fn (passed, red_assertion) | - | 0.94 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/testing.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime-fix-1/specs/durable-runtime/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-3/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0422Z-3162.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0739Z-ce44.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0741Z-7374.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0849Z-634b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T0902Z-3db1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T1041Z-ce84.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T1808Z-bab9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/.l4/ledger/r-20261103T1827Z-6d81.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dbos-runtime/verification.md` |  | none | exempt: harness, spec or documentation path |
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

1481 of 1481 passed, 0 failed, 0 errored, 0 skipped.
26 of 26 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-25c32649 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da1b0c83 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cb0c606e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-57d8e403 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d9b866b | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e0745e1c | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-706487fb | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c27b0f1a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c37d6095 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-073558f4 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-77ae2063 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2c0ae21b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-769418cc | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-7732f592 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0601de63 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-003 accept C-25c32649 by the delegate (claude-fable-5-1 via claude-code): The two tracing tests check every clause of the scenario: after the first prepareDurable call the dbos schema exists owned by ursitoare_owner, ursitoare_app has USAGE but not CREATE and its CREATE TABLE dbos.x rejects 42501, the second call resolves with the dbos_migrations ledger unchanged, the fou...
- Q-004 accept C-da1b0c83 by the delegate (claude-fable-5-1 via claude-code): The tracing test asserts every clause: dbosConfig on the test-plan fixtures gives runMigrations false, enableOTLP false, name ursitoare, systemDatabaseSchemaName dbos, applicationVersion ursitoare-1, the given pool and a URL whose parsed password is empty; dbosLogger routes info, debug, warn and err...
- Q-005 accept C-cb0c606e by the delegate (claude-fable-5-1 via claude-code): The tracing test runs the ten steps of the queue sequence and asserts each THEN clause: the runs row with worker_concurrency 3 and polling_interval_sec 0.02 within 1e-9, suspendDurable resolving the same handle, the three calls rejecting DURABLE_NOT_LAUNCHED suspended, the resume on an emptied ledge...
- Q-006 accept C-57d8e403 by the delegate (claude-fable-5-1 via claude-code): The tracing test runs the twelve launchDurable calls of the refusal sequence in order and asserts each rejection: not_prepared, bad_option with details.option concurrency then pollingIntervalMs, bad_endpoint for the mysql scheme and the missing database path, password_in_url, config_failed for the f...
- Q-007 accept C-5d9b866b by the delegate (claude-fable-5-1 via claude-code): The tracing test asserts every clause: registerWorkflow("t.count", f) twice returns undefined, the same name with another function throws DURABLE_INVALID name_taken, "Bad Name" and a 65-character name throw bad_name, registering t.late2 while launchDurable is pending and t.late after it resolved bot...
- Q-008 accept C-e0745e1c by the delegate (claude-fable-5-1 via claude-code): The tracing test runs the eight steps of the once-per-id sequence on a runtime launched with concurrency 1 and asserts every clause: status of w-gate is exactly { workflowId: w-gate, workflow: t.gate, state: PENDING }, w-1 is ENQUEUED then CANCELLED after cancel, cancel of never resolves and its sta...
- Q-009 accept C-706487fb by the delegate (claude-fable-5-1 via claude-code): The tracing test launches with a recording stepObserver, runs t.steps, t.retry, t.once, t.names, t.bad and t.drop in that order and asserts every clause: the observer calls for s-steps are exactly before a, after a, before b, after b with the enqueue id, currentWorkflowId equals the enqueue id, the ...
- Q-010 accept C-c27b0f1a by the delegate (claude-fable-5-1 via claude-code): The tracing test seeds two tenants, has the owner create the ursitoare.rls_probe table with the two rows, forced row-level security, the tenant policy and the SELECT grant to the app role, launches the runtime on db.appEndpoint, enqueues t.read as r-a, r-b and r-none with tenantId tenant_a, tenant_b...
- Q-011 accept C-c37d6095 by the delegate (claude-fable-5-1 via claude-code): The tracing test runs main with the fakes of the test plan for the roles all, worker, api and sandbox with an endpoint E and for all with a null endpoint, then sends SIGTERM. It asserts the fake launch is called exactly once for all and for worker, with options whose keys are exactly endpoint and lo...
- Q-012 accept C-073558f4 by the delegate (claude-fable-5-1 via claude-code): The tracing test runs main with the real launchDurable three times. On a clone whose dbos schema the owner dropped it asserts main resolves null, exit got 1 once and exactly one fatal line holds code DURABLE_UNAVAILABLE, msg startup failed and reason not_prepared, with no URL in any line. On an inta...
- Q-013 accept C-77ae2063 by the delegate (claude-fable-5-1 via claude-code): The two tracing tests check every clause of the scenario. The first runs checkDbosAccess on the ten rule fixtures of test-plan.md and asserts the violations are exactly ARCH_DBOS_ACCESS at line 1 of src/api/a.ts to f.ts in that order, with the SDK message for a to c and the schema message for d to f...
- Q-014 accept C-2c0ae21b by the delegate (claude-fable-5-1 via claude-code): The tracing tests cover the whole scenario. The first builds fake parts p1, p2, p3 that record hook:<name> and seed:<name>, with p2 having no hook, and asserts that seedAll logs seed:p1, seed:p2, seed:p3 with no hook, that one reset adds hook:p3, hook:p1, seed:p1, seed:p2, seed:p3, that a reset whos...
- Q-015 accept C-769418cc by the delegate (claude-fable-5-1 via claude-code): The nine tracing tests cover every clause. With a fake clock advanced by sleep and workflowId ready-1, the success case asserts one enqueue of stack.ready with input ping, 3 status calls and 2 sleeps of 100; the always-ENQUEUED case asserts STACK_DURABLE_NOT_READY with details.state ENQUEUED after 5...
- Q-016 accept C-7732f592 by the delegate (claude-fable-5-1 via claude-code): The tracing test boots the stack with the shipped parts, the database part wrapped so its close records the ursitoare-durable session count polled for up to 5 s, and asserts that dbos.workflow_status is empty before the first reset; that each of three resets answers 204 and leaves exactly one row wi...
- Q-020 accept F-da2b0827 by the delegate (claude-fable-5-1 via claude-code): The finding repeats F-233c28d7, which Q-018 waived for the same unchanged code, and the repository supports that waiver. The adapter does forward String(entry) for every level with { component: "dbos" }, and only replaces a lowercase pg-style "error: ..." tail with "error: [redacted]". The same scen...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-25c32649 | durable-runtime › The owner prepares the DBOS schema and the engine never does › Prepare, repeat, refuse | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The two tracing tests check every clause of the scenario: after the first prepareDurable call the dbos schema exists owned by ursitoare_owner, ursitoare_app has USAGE but not CREATE and its CREATE TABLE dbos.x rejects 42501, the second cal... |
| C-da1b0c83 | durable-runtime › The runtime connects with the endpoint it is given and never migrates › A prepared database | fail | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test asserts every clause: dbosConfig on the test-plan fixtures gives runMigrations false, enableOTLP false, name ursitoare, systemDatabaseSchemaName dbos, applicationVersion ursitoare-1, the given pool and a URL whose parsed p... |
| C-cb0c606e | durable-runtime › The runs queue is registered after every launch › Launch, lose the rows, launch again | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test runs the ten steps of the queue sequence and asserts each THEN clause: the runs row with worker_concurrency 3 and polling_interval_sec 0.02 within 1e-9, suspendDurable resolving the same handle, the three calls rejecting D... |
| C-57d8e403 | durable-runtime › A launch that cannot succeed fails with a stable code and leaves nothing behind › Refusals | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test runs the twelve launchDurable calls of the refusal sequence in order and asserts each rejection: not_prepared, bad_option with details.option concurrency then pollingIntervalMs, bad_endpoint for the mysql scheme and the mi... |
| C-5d9b866b | durable-runtime › Workflows are registered before launch under a checked name › Registration rules | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test asserts every clause: registerWorkflow("t.count", f) twice returns undefined, the same name with another function throws DURABLE_INVALID name_taken, "Bad Name" and a 65-character name throw bad_name, registering t.late2 wh... |
| C-e0745e1c | durable-runtime › A workflow id runs once, and status and cancel report it › Once per id, status, cancel | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test runs the eight steps of the once-per-id sequence on a runtime launched with concurrency 1 and asserts every clause: status of w-gate is exactly { workflowId: w-gate, workflow: t.gate, state: PENDING }, w-1 is ENQUEUED then... |
| C-706487fb | durable-runtime › Steps are observed, retried only on request, and need a workflow › Steps and durable calls | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test launches with a recording stepObserver, runs t.steps, t.retry, t.once, t.names, t.bad and t.drop in that order and asserts every clause: the observer calls for s-steps are exactly before a, after a, before b, after b with ... |
| C-c27b0f1a | durable-runtime › Row-level security holds inside durable steps › Two tenants in steps | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test seeds two tenants, has the owner create the ursitoare.rls_probe table with the two rows, forced row-level security, the tenant policy and the SELECT grant to the app role, launches the runtime on db.appEndpoint, enqueues t... |
| C-c37d6095 | durable-runtime › main launches the runtime after the routes and closes it before the database › When it launches and the close order | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test runs main with the fakes of the test plan for the roles all, worker, api and sandbox with an endpoint E and for all with a null endpoint, then sends SIGTERM. It asserts the fake launch is called exactly once for all and fo... |
| C-073558f4 | durable-runtime › main launches the runtime after the routes and closes it before the database › A failed launch and the unchanged health | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test runs main with the real launchDurable three times. On a clone whose dbos schema the owner dropped it asserts main resolves null, exit got 1 once and exactly one fatal line holds code DURABLE_UNAVAILABLE, msg startup failed... |
| C-77ae2063 | durable-runtime › Only src/durable imports DBOS and only src/durable and src/runs name its schema › Rule fixtures and the real tree | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The two tracing tests check every clause of the scenario. The first runs checkDbosAccess on the ten rule fixtures of test-plan.md and asserts the violations are exactly ARCH_DBOS_ACCESS at line 1 of src/api/a.ts to f.ts in that order, with... |
| C-2c0ae21b | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Hook order and failure | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing tests cover the whole scenario. The first builds fake parts p1, p2, p3 that record hook:<name> and seed:<name>, with p2 having no hook, and asserts that seedAll logs seed:p1, seed:p2, seed:p3 with no hook, that one reset adds h... |
| C-769418cc | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Ready, late, failed | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The nine tracing tests cover every clause. With a fake clock advanced by sleep and workflowId ready-1, the success case asserts one enqueue of stack.ready with input ping, 3 status calls and 2 sleeps of 100; the always-ENQUEUED case assert... |
| C-7732f592 | durable-runtime › The e2e stack shuts the runtime down before a reset and checks it after › Three resets under the live engine, then the close | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The tracing test boots the stack with the shipped parts, the database part wrapped so its close records the ursitoare-durable session count polled for up to 5 s, and asserts that dbos.workflow_status is empty before the first reset; that e... |
| C-0601de63 | durable-runtime › Steps are observed, retried only on request, and need a workflow — regression 1 › An after-observer failure is retried instead of failing the step | pass | pass | the judge passed it and a discriminating test passes |
- C-da1b0c83: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))

## Findings

- [minor, judge] dbosLogger rewrites valid logger messages (criterion C-da1b0c83): The adapter changes messages matching lowercase "error: ", although the requirement says each level forwards String(entry). The traced logger test checks Error: boom but misses this observable input. (waived by the delegate (claude-fable-5-1 via claude-code): The finding repeats F-233c28d7, which Q-018 waived for the same unchanged code, and the repository supports that waiver. The adapter does forward String(entry) for every level with { component: "dbos" }, and only replaces a lowercase pg-style "error: ..." tail with "error: [redacted]". The same scenario in spec.md line 19 requires that af...
- [minor, judge] Invalid step-name precedence outside a workflow is unspecified (spec gap) (criterion C-706487fb): The scenario tests runStep outside a workflow only with a valid name. The committed implementation checks the step name before it checks workflow context, so an invalid-name call outside a workflow reports bad_step_name rather than outside_workflow; either validation order is a reasonable interpretation absent a scenario.
- [minor, judge] the judge called a test inadequate (criterion C-da1b0c83): src.durable.launch.test.ts::C-da1b0c83 prepared database gives the expected config logger sessions and pool warning

## New tests (red then green, `task.red_ok` in the ledger)

- `src.durable.launch.test.ts::C-57d8e403 launchDurable refuses bad options endpoints and databases` (task 2.1): passed
- `src.durable.launch.test.ts::C-da1b0c83 prepared database gives the expected config logger sessions and pool warning` (task 2.1): passed
- `src.durable.prepare.test.ts::C-25c32649 prepareDurable creates the dbos schema and repeats as a no-op` (task 1.1): passed
- `src.durable.prepare.test.ts::C-25c32649 prepareDurable refuses bad owner URLs and an unmigrated app role` (task 1.1): passed
- `src.durable.queue.test.ts::C-cb0c606e launch suspend resume and shutdown keep the runs queue` (task 2.3): passed
- `src.durable.rls.test.ts::C-c27b0f1a row level security holds inside durable steps` (task 3.1): passed
- `src.durable.steps.test.ts::C-706487fb C-0601de63 an after observer failure fails the step without retrying fn` (task 1.1): passed
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
