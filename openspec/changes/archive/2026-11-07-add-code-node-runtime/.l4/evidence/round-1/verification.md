# Verification: openspec:add-code-node-runtime: PASS (round 1)

traceability: 11/11 criteria covered by a discriminating test

- Base: `3150bddc119527a21649ea7142e6feceaf8a3ffc`
- Head: `18c2223c94c75504a5922f81626de5a73a7c451a`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `05d842fe4be2ab98d83dce10f4b963f3a12e682867dff0ddeb9304657e8e0cf8`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@3150bddc11 as 18c2223c94 (2 commits) |
| 1 | integrity | ok | 511.5 | 11 sub-checks; scope: 28 changed file(s) |
| 2 | build | ok | 27.1 |  |
| 3 | tests | ok | 251.9 |  |
| 4 | traceability | ok | 0.1 | 11/11 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/index.ts, src/interpreter/registry.ts, src/interpreter/runtimes/code.ts and 6 more |
| 8 | s1 judge | ok | 0.7 | 5/11 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 199.5 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261107T0715Z-d197/064-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261107T0715Z-d197/065-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261107T0715Z-d197/066-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261107T0715Z-d197/067-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261107T0715Z-d197/068-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261107T0715Z-d197/069-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261107T0715Z-d197/070-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 3 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 5 task(s): red and green compared |
| test path freeze | ok | 5 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/test-run-refusals.test.ts, src/interpreter/code-run.db.test.ts, src/interpreter/code-run.test.ts, src/interpreter/errors.ts, src/interpreter/execute.ts (+15 more) |
| tdd history | ok | 5 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1692 of 1692 base tests pass on the unit's code with its 9 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src.api.test-run-refusals.test.ts::C-7d9b0050 versions, bodies and mocks are refused before a run exists (named by the task text, plan:m5@3eb9437aa9998b66)
- src.interpreter.registry.test.ts::C-f3de9ac6 built-in kinds are registered and the rest are not (named by the task text, plan:m5@3eb9437aa9998b66)
- src.interpreter.start.test.ts::C-d807f118 startRun refuses missing draft unsupported and unknown block versions (named by the task text, plan:m5@3eb9437aa9998b66)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-de412456 | flow-testing › The test endpoint refuses what it cannot run › Who may test which flow | covered | src.api.test-run-refusals.test.ts::C-de412456 who may test which flow and what is refused before a run (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); src.api.test-run-routes.test.ts::C-de412456 who may test which flow, ... | - | 0.92 |
| C-7d9b0050 | flow-testing › The test endpoint refuses what it cannot run › Versions, bodies, mocks and a runtime that is down | covered | src.api.test-run-refusals.test.ts::C-7d9b0050 kind_unsupported no longer lists code (passed, red_assertion) | src.api.test-run-refusals.test.ts::C-7d9b0050 a failing enqueue and a missing runtime answer 503 (no proof that it discriminates (no red, audit or generated record)); src.api.test-run-refusals.test.ts::C-7d9b0050 versions, bodies and mocks are refused before a run exists (no proof that it discrimina... | - |
| C-f3de9ac6 | interpreter › Node runtimes are registered once per kind › Built-in kinds and registration rules | covered | src.interpreter.registry.test.ts::C-f3de9ac6 code is built in and runs codeRuntime (passed, red_assertion) | src.interpreter.registry.test.ts::C-f3de9ac6 built-in kinds are registered and the rest are not (no proof that it discriminates (no red, audit or generated record)); src.interpreter.registry.test.ts::C-f3de9ac6 registration refuses duplicates and invalid runtimes (no proof that it discriminates (no ... | 0.72 |
| C-d807f118 | interpreter › A run starts only by registry id and hash › Refusals, enqueue and idempotence | covered | src.interpreter.start.test.ts::C-d807f118 startRun admits a validated flow with code nodes (passed, red_assertion) | src.interpreter.start.test.ts::C-d807f118 a rejected enqueue fails the run and reports it as unbound (no proof that it discriminates (no red, audit or generated record)); src.interpreter.start.test.ts::C-d807f118 startRun answers the stored run and keeps tenants apart (no proof that it discriminates... | - |
| C-ccb658c5 | node-code › A code node returns the sandbox object after its schema check › The call, the outcome and the schema checks | covered | src.interpreter.runtimes.code.test.ts::C-ccb658c5 a code node returns the sandbox object and records its call (passed, red_assertion); src.interpreter.runtimes.code.test.ts::C-ccb658c5 a code node without next returns a null next (passed, red_assertion); src.interpreter.runtimes.code.test.ts::C-ccb6... | - | - |
| C-98851868 | node-code › The seed and the limits of a code node are fixed › Seed strings, limits and repeatable output | covered | src.interpreter.runtimes.code.test.ts::C-98851868 CODE_LIMITS is frozen and equals the sandbox defaults (passed, red_assertion); src.interpreter.runtimes.code.test.ts::C-98851868 codeSeed joins run id node id and attempt (passed, red_assertion); src.interpreter.runtimes.code.test.ts::C-98851868 the ... | - | 0.92 |
| C-5ebb76ed | node-code › A code node fault is terminal and typed › Faults, a missing sandbox, unstorable output and no leak | covered | src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed a missing sandbox is a typed terminal refusal (passed, red_assertion); src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed a rejecting sandbox fault is terminal and silent (passed, red_assertion); src.interpreter.runtimes.code-faults.test... | - | - |
| C-66c38d56 | node-code › A run walks code nodes as numbered steps › code-pay, its replay and a run with no sandbox | covered | src.interpreter.code-run.test.ts::C-66c38d56 code-pay runs its code node, replays it and needs a sandbox (passed, red_assertion) | - | - |
| C-81b55afa | node-code › A sandbox fault fails its run once and the pool survives › A memory bomb and a deep recursion on DBOS | covered | src.interpreter.code-run.db.test.ts::C-81b55afa a sandbox fault ends its run once and the pool serves the next flow (passed, red_assertion) | - | 0.93 |
| C-d4cc366e | node-code › The engine owns one sandbox pool › Roles, closing order and failed starts | covered | src.main.sandbox.test.ts::C-d4cc366e a bind failure closes the pool before the database and reports BIND_FAILED (passed, red_assertion); src.main.sandbox.test.ts::C-d4cc366e a createSandbox failure closes only the database and reports SANDBOX_INVALID (passed, red_assertion); src.main.sandbox.test.ts... | - | - |
| C-edf94d83 | node-code › A mock test run executes code nodes for real › code-pay through main, a mock for a code node and shutdown | covered | src.main.codeRuns.test.ts::C-edf94d83 code-pay runs through main, refuses a code-node mock and closes the pool (passed, red_assertion) | - | 0.97 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-code-node-runtime/.l4/ledger/r-20261107T0128Z-1781.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-node-runtime/.l4/ledger/r-20261107T0354Z-61b5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-node-runtime/.l4/ledger/r-20261107T0533Z-d555.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-node-runtime/.l4/ledger/r-20261107T0555Z-d757.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-node-runtime/.l4/ledger/r-20261107T0704Z-32c3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-node-runtime/.l4/ledger/r-20261107T0715Z-d197.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-node-runtime/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-node-runtime/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/test-run-refusals.test.ts` |  | relevant | named in the spec |
| `src/interpreter/code-run.db.test.ts` |  | relevant | new test file |
| `src/interpreter/code-run.test.ts` |  | relevant | new test file |
| `src/interpreter/errors.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/execute.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/registry.test.ts` |  | relevant | named in the spec |
| `src/interpreter/registry.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/runtimes/code-faults.test.ts` |  | relevant | new test file |
| `src/interpreter/runtimes/code.test.ts` |  | relevant | new test file |
| `src/interpreter/runtimes/code.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/start.test.ts` |  | relevant | named in the spec |
| `src/interpreter/types.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/visit.ts` | interpreter | relevant | named in the spec |
| `src/main.codeRuns.test.ts` |  | relevant | new test file |
| `src/main.sandbox.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/support/code-pay-seed.ts` | test | relevant | named in the spec |
| `test/support/code-pay.ts` | test | relevant | named in the spec |
| `test/support/node-conformance.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/index.ts, src/interpreter/registry.ts, src/interpreter/runtimes/code.ts and 6 more

### Tests

1780 of 1780 passed, 0 failed, 0 errored, 0 skipped.
30 of 30 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-de412456 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7d9b0050 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-f3de9ac6 | ok | 0.720 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d807f118 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ccb658c5 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-98851868 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5ebb76ed | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-66c38d56 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-81b55afa | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d4cc366e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-edf94d83 | ok | 0.970 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-de412456 | flow-testing › The test endpoint refuses what it cannot run › Who may test which flow | pass | pass | the judge passed it and a discriminating test passes |
| C-7d9b0050 | flow-testing › The test endpoint refuses what it cannot run › Versions, bodies, mocks and a runtime that is down | pass | pass | the judge passed it and a discriminating test passes |
| C-f3de9ac6 | interpreter › Node runtimes are registered once per kind › Built-in kinds and registration rules | pass | pass | the judge passed it and a discriminating test passes |
| C-d807f118 | interpreter › A run starts only by registry id and hash › Refusals, enqueue and idempotence | pass | pass | the judge passed it and a discriminating test passes |
| C-ccb658c5 | node-code › A code node returns the sandbox object after its schema check › The call, the outcome and the schema checks | pass | pass | the judge passed it and a discriminating test passes |
| C-98851868 | node-code › The seed and the limits of a code node are fixed › Seed strings, limits and repeatable output | pass | pass | the judge passed it and a discriminating test passes |
| C-5ebb76ed | node-code › A code node fault is terminal and typed › Faults, a missing sandbox, unstorable output and no leak | pass | pass | the judge passed it and a discriminating test passes |
| C-66c38d56 | node-code › A run walks code nodes as numbered steps › code-pay, its replay and a run with no sandbox | pass | pass | the judge passed it and a discriminating test passes |
| C-81b55afa | node-code › A sandbox fault fails its run once and the pool survives › A memory bomb and a deep recursion on DBOS | pass | pass | the judge passed it and a discriminating test passes |
| C-d4cc366e | node-code › The engine owns one sandbox pool › Roles, closing order and failed starts | pass | pass | the judge passed it and a discriminating test passes |
| C-edf94d83 | node-code › A mock test run executes code nodes for real › code-pay through main, a mock for a code node and shutdown | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-7d9b0050): src.api.test-run-refusals.test.ts::C-7d9b0050 a failing enqueue and a missing runtime answer 503: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-7d9b0050): src.api.test-run-refusals.test.ts::C-7d9b0050 versions, bodies and mocks are refused before a run exists: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f3de9ac6): src.interpreter.registry.test.ts::C-f3de9ac6 built-in kinds are registered and the rest are not: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f3de9ac6): src.interpreter.registry.test.ts::C-f3de9ac6 registration refuses duplicates and invalid runtimes: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d807f118): src.interpreter.start.test.ts::C-d807f118 a rejected enqueue fails the run and reports it as unbound: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d807f118): src.interpreter.start.test.ts::C-d807f118 startRun answers the stored run and keeps tenants apart: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d807f118): src.interpreter.start.test.ts::C-d807f118 startRun derives an id skips enqueue and names the workflow: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d807f118): src.interpreter.start.test.ts::C-d807f118 startRun propagates loader and catalogue rejections unchanged: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d807f118): src.interpreter.start.test.ts::C-d807f118 startRun refuses ill-typed input and an invalid run id: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d807f118): src.interpreter.start.test.ts::C-d807f118 startRun refuses missing draft unsupported and unknown block versions: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d807f118): src.interpreter.start.test.ts::C-d807f118 startRun stores a queued run and enqueues its workflow: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] code.ts throws 'cannot be stored' before schema error when both fail with a usable path (criterion C-5ebb76ed): When checkSchema fails with a usable path and payloadDigest also refuses the output, code.ts throws INTERPRETER_OUTPUT_INVALID 'cannot be stored' ({ path: '/', keyword: 'payload' }) instead of the schema-miss error. The specification states 'cannot be stored' applies only when the object fits output_schema. No scenario covers this combination, so it is not caught by tests.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.test-run-refusals.test.ts::C-7d9b0050 kind_unsupported no longer lists code` (task 2.1): passed
- `src.api.test-run-refusals.test.ts::C-de412456 who may test which flow and what is refused before a run` (task 2.1): passed
- `src.interpreter.code-run.db.test.ts::C-81b55afa a sandbox fault ends its run once and the pool serves the next flow` (task 2.1): passed
- `src.interpreter.code-run.test.ts::C-66c38d56 code-pay runs its code node, replays it and needs a sandbox` (task 2.1): passed
- `src.interpreter.registry.test.ts::C-f3de9ac6 code is built in and runs codeRuntime` (task 2.1): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed a missing sandbox is a typed terminal refusal` (task 1.2): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed a rejecting sandbox fault is terminal and silent` (task 1.2): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed a revived plain error copy is recognized for each new code` (task 1.2): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed an ill formed schema path is reported at the root` (task 1.2): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed an unstorable code output is refused at the root` (task 1.2): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed every sandbox fault fails the code node once without leaking` (task 1.2): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed the conformance suite reports a code verdict for every case` (task 1.2): passed
- `src.interpreter.runtimes.code-faults.test.ts::C-5ebb76ed the loop fault ends in the cap and the bomb memory growth is capped` (task 1.2): passed
- `src.interpreter.runtimes.code.test.ts::C-98851868 CODE_LIMITS is frozen and equals the sandbox defaults` (task 1.1): passed
- `src.interpreter.runtimes.code.test.ts::C-98851868 codeSeed joins run id node id and attempt` (task 1.1): passed
- `src.interpreter.runtimes.code.test.ts::C-98851868 the same seed and clock give the same code output` (task 1.1): passed
- `src.interpreter.runtimes.code.test.ts::C-ccb658c5 a code node returns the sandbox object and records its call` (task 1.1): passed
- `src.interpreter.runtimes.code.test.ts::C-ccb658c5 a code node without next returns a null next` (task 1.1): passed
- `src.interpreter.runtimes.code.test.ts::C-ccb658c5 a code output that misses its schema is refused` (task 1.1): passed
- `src.interpreter.runtimes.code.test.ts::C-ccb658c5 an unresolved code input is refused before the sandbox` (task 1.1): passed
- `src.interpreter.start.test.ts::C-d807f118 startRun admits a validated flow with code nodes` (task 2.1): passed
- `src.main.codeRuns.test.ts::C-edf94d83 code-pay runs through main, refuses a code-node mock and closes the pool` (task 3.2): passed
- `src.main.sandbox.test.ts::C-d4cc366e a bind failure closes the pool before the database and reports BIND_FAILED` (task 3.1): passed
- `src.main.sandbox.test.ts::C-d4cc366e a createSandbox failure closes only the database and reports SANDBOX_INVALID` (task 3.1): passed
- `src.main.sandbox.test.ts::C-d4cc366e a duplicate run route fails the guarded start after closing the pool` (task 3.1): passed
- `src.main.sandbox.test.ts::C-d4cc366e a launch failure closes the pool before the database and reports STARTUP_FAILED` (task 3.1): passed
- `src.main.sandbox.test.ts::C-d4cc366e a rejecting durable shutdown stays silent and still closes the pool and database` (task 3.1): passed
- `src.main.sandbox.test.ts::C-d4cc366e a rejecting sandbox close warns once without the secret and keeps exit zero` (task 3.1): passed
- `src.main.sandbox.test.ts::C-d4cc366e a start failure wins over a rejecting pool close and reports the original code` (task 3.1): passed
- `src.main.sandbox.test.ts::C-d4cc366e main creates one pool for all and worker and closes it between durable and database` (task 3.1): passed

## Guard events

- guard.violation: src/interpreter/errors.ts
- guard.violation: test/support/node-conformance.ts
- guard.violation: src/interpreter/errors.ts
- guard.violation: test/support/node-conformance.ts
