# Verification: openspec:add-code-sandbox: PASS (round 5)

traceability: 17/17 criteria covered by a discriminating test

- Base: `199dc450091dc78ea99f1e18b671fed0de051da8`
- Head: `b976898c6eb2e6c97c33966e6530fb970bd1f45d`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: kiro-judge, 3 call(s), judged in 2 parts and 1 follow-up, prompt sha256 `a3d8a9c5e44ba18f9d549b7eecced8edd536fa805fd7233bf2a70457da0b885d`
  - part 1: 20 file(s), 115384 characters, profile kiro-judge, reply valid
  - part 2: 16 file(s), 99452 characters, profile kiro-judge, reply valid
  - follow-up 1: C-a85c03b7, C-990d6a3c, C-7d1dc855, C-ed57e3cd; files of parts 1 and 2: 11 file(s), 87302 characters, profile kiro-judge, reply valid
- Judge replies of kiro-judge (this unit, all rounds): valid 6, repaired 0, retried 0, discarded 0; this round: valid
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
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261107T0028Z-c1f6/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261107T0028Z-c1f6/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261107T0028Z-c1f6/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261107T0028Z-c1f6/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261107T0028Z-c1f6/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261107T0028Z-c1f6/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261107T0028Z-c1f6/029-e2e.log |

## Files by part

- part 1: openspec/changes/add-code-sandbox-fix-1/.openspec.yaml (320 characters)
- part 1: openspec/changes/add-code-sandbox-fix-2/.openspec.yaml (302 characters)
- part 1: src/sandbox/built.test.ts (4209 characters)
- part 1: src/sandbox/classify.test.ts (7046 characters)
- part 1: src/sandbox/classify.ts (4662 characters)
- part 1: src/sandbox/close.test.ts (7667 characters)
- part 1: src/sandbox/crash.test.ts (6102 characters)
- part 1: src/sandbox/deadline.test.ts (7159 characters)
- part 1: src/sandbox/determinism.test.ts (11348 characters)
- part 1: src/sandbox/escape.test.ts (11628 characters)
- part 1: src/sandbox/limits.test.ts (4024 characters)
- part 1: src/sandbox/limits.ts (2662 characters)
- part 1: src/sandbox/limits-run.test.ts (10577 characters)
- part 1: src/sandbox/pool.test.ts (11581 characters)
- part 1: src/sandbox/pool.ts (12177 characters)
- part 1: src/sandbox/pool-proxy-options.test.ts (1262 characters)
- part 1: src/sandbox/prelude.ts (9446 characters)
- part 1: openspec/changes/add-code-sandbox-fix-1/proposal.md (702 characters)
- part 1: openspec/changes/add-code-sandbox-fix-2/proposal.md (1701 characters)
- part 1: test/support/README.md (809 characters)
- part 2: src/sandbox/run.test.ts (20316 characters)
- part 2: src/sandbox/run-code.ts (10490 characters)
- part 2: test/support/sandbox-escape.test.ts (7696 characters)
- part 2: test/support/sandbox-escape.ts (17559 characters)
- part 2: test/support/sandbox-exit-worker.ts (309 characters)
- part 2: test/arch/sandbox-io.test.ts (3431 characters)
- part 2: test/arch/sandbox-io.ts (3108 characters)
- part 2: openspec/changes/add-code-sandbox-fix-2/specs/sandbox/spec.md (1082 characters)
- part 2: openspec/changes/add-code-sandbox-fix-1/tasks.md (307 characters)
- part 2: openspec/changes/add-code-sandbox-fix-2/tasks.md (366 characters)
- part 2: openspec/changes/add-code-sandbox/tasks.md (9212 characters)
- part 2: src/sandbox/types.ts (658 characters)
- part 2: src/sandbox/validate.test.ts (11886 characters)
- part 2: src/sandbox/validate.ts (9821 characters)
- part 2: src/sandbox/wasm.ts (1875 characters)
- part 2: src/sandbox/worker-entry.ts (1336 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 10 task(s): red and green compared |
| test path freeze | ok | 11 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/sandbox/built.test.ts, src/sandbox/classify.test.ts, src/sandbox/classify.ts, src/sandbox/close.test.ts, src/sandbox/crash.test.ts (+22 more) |
| tdd history | ok | 13 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1643 of 1643 base tests pass on the unit's code with its 15 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-105b574e | sandbox › Pure helpers and default objects fix the sandbox's numbers › Helper vectors, defaults and the error class | covered | src.sandbox.limits.test.ts::C-105b574e SandboxError is a named Error carrying a code and read-only details (passed, red_assertion); src.sandbox.limits.test.ts::C-105b574e clampStack honours the minimum, the cap and the floor (passed, red_assertion); src.sandbox.limits.test.ts::C-105b574e memoryBucke... | - | - |
| C-0656ec39 | sandbox › The sandbox imports no host I/O › Allowed, refused and ignored files | covered | test.arch.sandbox-io.test.ts::C-0656ec39: allowed, ignored and real files have no sandbox I/O violation (passed, red_assertion); test.arch.sandbox-io.test.ts::C-0656ec39: sandbox host imports and process identifiers are refused in order (passed, red_assertion) | - | 0.86 |
| C-3999c476 | sandbox › A run refuses invalid arguments as input_invalid faults › Each invalid argument is refused with no worker started | covered | src.sandbox.validate.test.ts::C-3999c476: bad arguments are refused before a worker starts (passed, red_assertion); src.sandbox.validate.test.ts::C-3999c476: invalid inputs X01 to X26 are refused before a worker starts (passed, red_assertion); src.sandbox.validate.test.ts::C-3999c476: multiple bad a... | - | 0.91 |
| C-d45afadb | sandbox › A body runs in a fresh context and every failure is a typed fault › Bindings, result modes and accepted boundaries | covered | src.sandbox.run.test.ts::C-d45afadb: ECHO returns every accepted input as its value (passed, red_assertion); src.sandbox.run.test.ts::C-d45afadb: a NUL byte in string input travels through the run (passed, red_assertion); src.sandbox.run.test.ts::C-d45afadb: a normalize body returns its value with s... | - | - |
| C-096cfc59 | sandbox › A body runs in a fresh context and every failure is a typed fault › Faults of the body and no retry | covered | src.sandbox.run.test.ts::C-096cfc59: faults of the body keep their rows and the workers answer every run once (passed, red_assertion) | - | 0.89 |
| C-9712a346 | sandbox › A body runs in a fresh context and every failure is a typed fault › Every classification row on synthetic facts | covered | src.sandbox.classify.test.ts::C-9712a346 classifyFault matches each classification vector twice on frozen facts (passed, red_assertion); src.sandbox.run.test.ts::C-9712a346: classifyFault agrees with itself twice on each frozen classification vector (passed, pre_satisfied) | - | 0.94 |
| C-061daa6c | sandbox › The pool spawns workers lazily, one job each, and refuses bad options › Spawn record, concurrency and options | covered | src.sandbox.pool-proxy-options.test.ts::C-c1be5467 C-061daa6c: a Proxy whose getPrototypeOf trap throws is refused as unreadable opts (passed, red_assertion); src.sandbox.pool.test.ts::C-061daa6c: the pool spawns lazily, runs up to size jobs, queues in order and validates options (passed, red_assert... | - | - |
| C-e1cc2727 | sandbox › Runs are deterministic › Same arguments, same output | covered | src.sandbox.determinism.test.ts::C-e1cc2727: child processes in three timezones print the same line and JSON (passed, red_assertion); src.sandbox.determinism.test.ts::C-e1cc2727: distinct seeds give distinct digests and never the base digest (passed, red_assertion); src.sandbox.determinism.test.ts::... | - | - |
| C-8bb9cb9b | sandbox › A run past its deadline is a timeout, and a stuck worker is killed › Interrupt, late finish and watchdog | covered | src.sandbox.deadline.test.ts::C-8bb9cb9b: a late finish is a timeout without a respawn (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-002: the check was inconclusive); src.sandbox.deadline.test.ts::C-8bb9cb9b: a loop is interrupted at its deadline and t... | - | 0.95 |
| C-a85c03b7 | sandbox › Guest memory is capped per memory bucket › Bombs are contained and buckets are isolated | covered | src.sandbox.limits-run.test.ts::C-a85c03b7: bombs stay inside their memory bucket and buckets are isolated (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive) | - | 0.90 |
| C-990d6a3c | sandbox › Stack depth, output size and nesting are capped › Recursion, clamp, byte limits and walker | covered | src.sandbox.limits-run.test.ts::C-990d6a3c: output bytes and nesting are refused at their boundaries (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed... | - | 0.93 |
| C-57ff720c | sandbox › A failed worker is replaced and the run reports sandbox_crash › Exit during a job, idle exit and a factory that throws | covered | src.sandbox.crash.test.ts::C-57ff720c: a factory that throws reports sandbox_crash and the next run succeeds (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-002: the check was inconclusive); src.sandbox.crash.test.ts::C-57ff720c: a worker that exits duri... | - | 0.95 |
| C-abbea154 | sandbox › A closed sandbox rejects pending and later runs › Close mid-run, after close and process lifetime | covered | src.sandbox.close.test.ts::C-abbea154: close rejects pending and later runs and idle workers do not keep the process alive (passed, red_assertion) | - | 0.96 |
| C-4c8287af | sandbox › The escape suite is shared data and the guest stays contained › Case data and verdicts | covered | test.support.sandbox-escape.test.ts::C-4c8287af: checkEscapeCase returns the verdict text of each listed call (passed, red_assertion); test.support.sandbox-escape.test.ts::C-4c8287af: escape case data carries the ids titles and named fields (passed, red_assertion) | - | 0.92 |
| C-7d1dc855 | sandbox › The escape suite is shared data and the guest stays contained › Every case on a real pool, variants and the host | covered | src.sandbox.escape.test.ts::C-7d1dc855: every escape case passes on a real pool in both modes and leaves the host unchanged (passed, red_assertion); src.sandbox.escape.test.ts::C-7d1dc855: the escape case and variant data hash to the published digests (passed, red_assertion) | - | 0.93 |
| C-ed57e3cd | sandbox-build › The built worker entry answers a run without a factory › The built worker answers without a factory | covered | src.sandbox.built.test.ts::C-ed57e3cd: the built worker answers a run without a factory (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-003: the check was inconclusive) | - | 0.90 |
| C-c1be5467 | sandbox › The pool spawns workers lazily, one job each, and refuses bad options — regression 2 › Proxy getPrototypeOf traps escape option validation | covered | src.sandbox.pool-proxy-options.test.ts::C-c1be5467 C-061daa6c: a Proxy whose getPrototypeOf trap throws is refused as unreadable opts (passed, red_assertion) | - | 0.93 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-code-sandbox-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-2/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-2/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-2/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-2/specs/sandbox/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox-fix-2/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-3/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T0627Z-1087.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T0848Z-8e22.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T1122Z-eedc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T1943Z-972a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T1945Z-d26a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T2053Z-6f18.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T2145Z-e456.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T2245Z-71c5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261107T0028Z-c1f6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/sandbox/built.test.ts` |  | relevant | new test file |
| `src/sandbox/classify.test.ts` |  | relevant | new test file |
| `src/sandbox/classify.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/close.test.ts` |  | relevant | new test file |
| `src/sandbox/crash.test.ts` |  | relevant | new test file |
| `src/sandbox/deadline.test.ts` |  | relevant | new test file |
| `src/sandbox/determinism.test.ts` |  | relevant | new test file |
| `src/sandbox/escape.test.ts` |  | relevant | new test file |
| `src/sandbox/limits-run.test.ts` |  | relevant | new test file |
| `src/sandbox/limits.test.ts` |  | relevant | new test file |
| `src/sandbox/limits.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/pool-proxy-options.test.ts` |  | relevant | new test file |
| `src/sandbox/pool.test.ts` |  | relevant | new test file |
| `src/sandbox/pool.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/prelude.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/run-code.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/run.test.ts` |  | relevant | new test file |
| `src/sandbox/types.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/validate.test.ts` |  | relevant | new test file |
| `src/sandbox/validate.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/wasm.ts` | sandbox | relevant | named in the spec |
| `src/sandbox/worker-entry.ts` | sandbox | relevant | named in the spec |
| `test/arch/sandbox-io.test.ts` |  | relevant | new test file |
| `test/arch/sandbox-io.ts` | test | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/sandbox-escape.test.ts` |  | relevant | new test file |
| `test/support/sandbox-escape.ts` | test | relevant | named in the spec |
| `test/support/sandbox-exit-worker.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/sandbox/classify.ts, src/sandbox/limits.ts, src/sandbox/pool.ts, src/sandbox/prelude.ts, src/sandbox/run-code.ts and 7 more

### Tests

1750 of 1750 passed, 0 failed, 0 errored, 0 skipped.
49 of 49 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-105b574e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-0656ec39 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3999c476 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d45afadb | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-096cfc59 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9712a346 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-061daa6c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-e1cc2727 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-8bb9cb9b | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a85c03b7 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-990d6a3c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-57ff720c | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-abbea154 | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c8287af | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7d1dc855 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ed57e3cd | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c1be5467 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-004 accept C-061daa6c by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as its scenario is written. The tracing test passed and asserts every clause of the scenario: an empty factory log before the first run, one call after five sequential runs with the worker-entry href and the default env and resourceLimits, size 2 and respawns 0; twelve con...
- Q-006 accept C-ed57e3cd by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. The tracing test passed in the latest report and asserts every clause of the scenario: tsc exits 0 on tsconfig.build.json into a fresh mkdtemp directory under node_modules/.cache holding a type module package.json, the built index.js is imported, the built workerEntryUrl ...
- Q-007 accept F-81bb3a33 by the delegate (claude-fable-5-1 via claude-code): The finding is waived. It rests on the judge not seeing run-code.ts and wasm.ts, which were in another part of the diff, not on anything missing from the code. Both files are in the unit head and do what task 3.5 names: wasm.ts caches one QuickJS module per memory bucket with a Wasm memory maximum o...
- Q-008 accept F-6f5b85ff by the delegate (claude-fable-5-1 via claude-code): The finding is waived. It rests on the judge not seeing run-code.ts and test/support/sandbox-exit-worker.ts, which were in another part of the diff. Both are in the unit head and do what task 3.6 names: the exit worker exits the process with status 1 on its first message, exactly as test-plan.md des...
- Q-009 accept F-74714d28 by the delegate (claude-fable-5-1 via claude-code): The finding is waived. It rests on the judge not seeing src/sandbox/worker-entry.ts, which was in another part of the diff. The file is in the unit head: it reads parentPort, answers each job message with the result of runCode and turns a thrown host error into a sandbox_crash reply. Task 3.8 only a...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-105b574e | sandbox › Pure helpers and default objects fix the sandbox's numbers › Helper vectors, defaults and the error class | pass | pass | the judge passed it and a discriminating test passes |
| C-0656ec39 | sandbox › The sandbox imports no host I/O › Allowed, refused and ignored files | pass | pass | the judge passed it and a discriminating test passes |
| C-3999c476 | sandbox › A run refuses invalid arguments as input_invalid faults › Each invalid argument is refused with no worker started | pass | pass | the judge passed it and a discriminating test passes |
| C-d45afadb | sandbox › A body runs in a fresh context and every failure is a typed fault › Bindings, result modes and accepted boundaries | pass | pass | the judge passed it and a discriminating test passes |
| C-096cfc59 | sandbox › A body runs in a fresh context and every failure is a typed fault › Faults of the body and no retry | pass | pass | the judge passed it and a discriminating test passes |
| C-9712a346 | sandbox › A body runs in a fresh context and every failure is a typed fault › Every classification row on synthetic facts | pass | pass | the judge passed it and a discriminating test passes |
| C-061daa6c | sandbox › The pool spawns workers lazily, one job each, and refuses bad options › Spawn record, concurrency and options | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as its scenario is written. The tracing test passed and asserts every clause of the scenario: an empty factory log before the first run, one call after five sequential runs with the worker-entry href and the defa... |
| C-e1cc2727 | sandbox › Runs are deterministic › Same arguments, same output | pass | pass | the judge passed it and a discriminating test passes |
| C-8bb9cb9b | sandbox › A run past its deadline is a timeout, and a stuck worker is killed › Interrupt, late finish and watchdog | pass | pass | the judge passed it and a discriminating test passes |
| C-a85c03b7 | sandbox › Guest memory is capped per memory bucket › Bombs are contained and buckets are isolated | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 4 files of those parts together and answered pass |
| C-990d6a3c | sandbox › Stack depth, output size and nesting are capped › Recursion, clamp, byte limits and walker | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 3 files of those parts together and answered pass |
| C-57ff720c | sandbox › A failed worker is replaced and the run reports sandbox_crash › Exit during a job, idle exit and a factory that throws | pass | pass | the judge passed it and a discriminating test passes |
| C-abbea154 | sandbox › A closed sandbox rejects pending and later runs › Close mid-run, after close and process lifetime | pass | pass | the judge passed it and a discriminating test passes |
| C-4c8287af | sandbox › The escape suite is shared data and the guest stays contained › Case data and verdicts | pass | pass | the judge passed it and a discriminating test passes |
| C-7d1dc855 | sandbox › The escape suite is shared data and the guest stays contained › Every case on a real pool, variants and the host | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 4 files of those parts together and answered pass |
| C-ed57e3cd | sandbox-build › The built worker entry answers a run without a factory › The built worker answers without a factory | insufficient_evidence | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. The tracing test passed in the latest report and asserts every clause of the scenario: tsc exits 0 on tsconfig.build.json into a fresh mkdtemp directory under node_modules/.cache holding a type module package.js... |
| C-c1be5467 | sandbox › The pool spawns workers lazily, one job each, and refuses bad options — regression 2 › Proxy getPrototypeOf traps escape option validation | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] workerEntryUrl query-string behavior is unspecified (spec gap) (criterion C-105b574e): The only URL vectors have extension-bearing pathnames without a query. The implementation selects the worker extension with moduleUrl.endsWith(".ts"), so a TypeScript module URL with a query selects the JavaScript worker entry.
- [minor, judge] Extra readable limit properties have unspecified behavior (spec gap) (criterion C-3999c476): readLimits copies every own property but validates and returns only the four declared limit members, so additional readable own limit properties are accepted and discarded; the scenarios do not state whether such properties are valid.
- [minor, judge] Extra readable option properties have unspecified behavior (spec gap) (criterion C-3999c476): readOptions accepts a copied object and returns only seed, nowIso, binding, and result, silently discarding any other readable own property; the scenarios do not define whether those properties must be refused or ignored.
- [minor, judge] task 3.5 is ticked as already satisfied, but its text is not done: not in this part: run-code.ts and wasm.ts, which task 3.5 requires for memory buckets and stack configuration, are in part 2. (waived by the delegate (claude-fable-5-1 via claude-code): The finding is waived. It rests on the judge not seeing run-code.ts and wasm.ts, which were in another part of the diff, not on anything missing from the code. Both files are in the unit head and do what task 3.5 names: wasm.ts caches one QuickJS module per memory bucket with a Wasm memory maximum of the base pages plus the bucket, run-code.ts picks the bucket with memoryBucket, calls setMemoryLimit with memory...
- [minor, judge] task 3.6 is ticked as already satisfied, but its text is not done: not in this part: run-code.ts and test/support/sandbox-exit-worker.ts, which task 3.6 requires, are in part 2. (waived by the delegate (claude-fable-5-1 via claude-code): The finding is waived. It rests on the judge not seeing run-code.ts and test/support/sandbox-exit-worker.ts, which were in another part of the diff. Both are in the unit head and do what task 3.6 names: the exit worker exits the process with status 1 on its first message, exactly as test-plan.md describes; run-code.ts sets an interrupt handler that flags the deadline and reports a run that settled or is still pending after th...
- [minor, judge] task 3.8 is ticked as already satisfied, but its text is not done: not in this part: src/sandbox/worker-entry.ts, which the built-worker task requires, is in part 2. (waived by the delegate (claude-fable-5-1 via claude-code): The finding is waived. It rests on the judge not seeing src/sandbox/worker-entry.ts, which was in another part of the diff. The file is in the unit head: it reads parentPort, answers each job message with the result of runCode and turns a thrown host error into a sandbox_crash reply. Task 3.8 only asks for the built-worker test, which exists, builds with tsconfig.build.json, resolves the built pool's worker entry to the existing worker-e...

## New tests (red then green, `task.red_ok` in the ledger)

- `src.sandbox.built.test.ts::C-ed57e3cd: the built worker answers a run without a factory` (task 3.8): passed
- `src.sandbox.classify.test.ts::C-9712a346 classifyFault matches each classification vector twice on frozen facts` (task 1.2): passed
- `src.sandbox.close.test.ts::C-abbea154: close rejects pending and later runs and idle workers do not keep the process alive` (task 3.7): passed
- `src.sandbox.crash.test.ts::C-57ff720c: a factory that throws reports sandbox_crash and the next run succeeds` (task 3.6): passed
- `src.sandbox.crash.test.ts::C-57ff720c: a worker that exits during a job is replaced and the run reports sandbox_crash` (task 3.6): passed
- `src.sandbox.crash.test.ts::C-57ff720c: an idle worker exit is replaced lazily on the next run` (task 3.6): passed
- `src.sandbox.deadline.test.ts::C-8bb9cb9b: a late finish is a timeout without a respawn` (task 3.6): passed
- `src.sandbox.deadline.test.ts::C-8bb9cb9b: a loop is interrupted at its deadline and the pool keeps working` (task 3.6): passed
- `src.sandbox.deadline.test.ts::C-8bb9cb9b: the watchdog kills a stuck worker and a replacement answers` (task 3.6): passed
- `src.sandbox.deadline.test.ts::C-8bb9cb9b: the watchdog message names a custom grace` (task 3.6): passed
- `src.sandbox.determinism.test.ts::C-e1cc2727: child processes in three timezones print the same line and JSON` (task 3.4): passed
- `src.sandbox.determinism.test.ts::C-e1cc2727: distinct seeds give distinct digests and never the base digest` (task 3.4): passed
- `src.sandbox.determinism.test.ts::C-e1cc2727: local time reads as UTC and matches the local JSON` (task 3.4): passed
- `src.sandbox.determinism.test.ts::C-e1cc2727: one seed and one clock give one digest and a later clock changes it` (task 3.4): passed
- `src.sandbox.determinism.test.ts::C-e1cc2727: random values follow the seeded mulberry32 reference` (task 3.4): passed
- `src.sandbox.determinism.test.ts::C-e1cc2727: the clock body gives its expected object for both zone spellings` (task 3.4): passed
- `src.sandbox.escape.test.ts::C-7d1dc855: every escape case passes on a real pool in both modes and leaves the host unchanged` (task 4.1): passed
- `src.sandbox.escape.test.ts::C-7d1dc855: the escape case and variant data hash to the published digests` (task 4.1): passed
- `src.sandbox.limits-run.test.ts::C-990d6a3c: output bytes and nesting are refused at their boundaries` (task 3.5): passed
- `src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working` (task 3.5): passed
- `src.sandbox.limits-run.test.ts::C-990d6a3c: the stack clamp bounds recursion like its capped option` (task 3.5): passed
- `src.sandbox.limits-run.test.ts::C-a85c03b7: bombs stay inside their memory bucket and buckets are isolated` (task 3.5): passed
- `src.sandbox.limits.test.ts::C-105b574e SandboxError is a named Error carrying a code and read-only details` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e clampStack honours the minimum, the cap and the floor` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e memoryBucket rounds up to a whole 16 MiB bucket and never below one` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e poolSize is one unless the machine has more than two cpus` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e seedOf hashes the empty, ascii, path-like and surrogate-pair seeds` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e the exported defaults and minimum stack size hold the fixed numbers and are frozen` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e workerEntryUrl swaps the pool entry for the worker entry with the same extension` (task 1.1): passed
- `src.sandbox.pool-proxy-options.test.ts::C-c1be5467 C-061daa6c: a Proxy whose getPrototypeOf trap throws is refused as unreadable opts` (task 1.1): passed
- `src.sandbox.pool.test.ts::C-061daa6c: the pool spawns lazily, runs up to size jobs, queues in order and validates options` (task 3.3): passed
- `src.sandbox.run.test.ts::C-096cfc59: faults of the body keep their rows and the workers answer every run once` (task 3.2): passed
- `src.sandbox.run.test.ts::C-9712a346: classifyFault agrees with itself twice on each frozen classification vector` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: ECHO returns every accepted input as its value` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: a NUL byte in string input travels through the run` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: a normalize body returns its value with stats` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: accepted boundaries around inputs and arguments are ok` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: an async body awaits its promise inside the sandbox` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: limits and options are read once through counting getters` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: non object outputs under both result modes are refused` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: object_or_null maps nullish bodies to a null value` (task 3.2): passed
- `src.sandbox.run.test.ts::C-d45afadb: the ctx binding leaves input undefined` (task 3.2): passed
- `src.sandbox.validate.test.ts::C-3999c476: bad arguments are refused before a worker starts` (task 3.1): passed
- `src.sandbox.validate.test.ts::C-3999c476: invalid inputs X01 to X26 are refused before a worker starts` (task 3.1): passed
- `src.sandbox.validate.test.ts::C-3999c476: multiple bad arguments report the first in the fixed order` (task 3.1): passed
- `test.arch.sandbox-io.test.ts::C-0656ec39: allowed, ignored and real files have no sandbox I/O violation` (task 2.1): passed
- `test.arch.sandbox-io.test.ts::C-0656ec39: sandbox host imports and process identifiers are refused in order` (task 2.1): passed
- `test.support.sandbox-escape.test.ts::C-4c8287af: checkEscapeCase returns the verdict text of each listed call` (task 4.1): passed
- `test.support.sandbox-escape.test.ts::C-4c8287af: escape case data carries the ids titles and named fields` (task 4.1): passed

## Guard events

- guard.violation: test/support/sandbox-exit-worker.ts
