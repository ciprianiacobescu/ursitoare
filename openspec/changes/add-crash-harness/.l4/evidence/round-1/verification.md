# Verification: openspec:add-crash-harness: NEEDS_HUMAN (round 1)

traceability: 14/14 criteria covered by a discriminating test

- Base: `72d0901386910b5c5fd39067d762d0a575ff7da3`
- Head: `a84e338ebecea0468211e56d13b4b22b640b2a6d`
- Implementer profiles: deepseek-free
- Judge: kiro-judge, 1 call(s), prompt sha256 `1d573e2b12b2de4939bee60f4550e0ed8285eb3f3b9334f6f03bafe399275243`
- Judge replies of kiro-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@72d0901386 contained |
| 1 | integrity | ok | 164.7 | 11 sub-checks; scope: 21 changed file(s) |
| 2 | build | ok | 31.9 |  |
| 3 | tests | ok | 258.8 |  |
| 4 | traceability | ok | 0.2 | 14/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/config/faults.ts, src/config/index.ts, test/arch/fault-points.ts, test/support/crash/child.ts, test/support/crash/cluster.ts and 4 more |
| 8 | s1 judge | ok | 1.1 | 12/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 177.1 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261104T1855Z-7394/053-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261104T1855Z-7394/054-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261104T1855Z-7394/055-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261104T1855Z-7394/056-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261104T1855Z-7394/057-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261104T1855Z-7394/058-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261104T1855Z-7394/059-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/config/faults.test.ts, src/config/faults.ts, src/config/index.ts, test/arch/fault-points.test.ts, test/arch/fault-points.ts (+12 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1448 of 1448 base tests pass on the unit's code with its 8 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-72547e12 | test-crash-harness › A fault point fires once, and its marker is written before the kill › Armed point, marker, second hit | covered | src.config.faults.test.ts::C-72547e12: an armed point writes its marker, kills once, and a later hit does nothing (passed, red_assertion) | - | 0.82 |
| C-0cfec0bf | test-crash-harness › A fault point fires once, and its marker is written before the kill › A marker that cannot be written | covered | src.config.faults.test.ts::C-0cfec0bf: a marker that cannot be written throws without killing (passed, red_assertion) | - | 0.92 |
| C-cd6a62d5 | test-crash-harness › A bad spec is refused and the null port does nothing › Refusals and the null port | covered | src.config.faults.test.ts::C-cd6a62d5: a bad spec is refused and the null port does nothing (passed, red_assertion) | - | 0.95 |
| C-a2319613 | test-crash-harness › The step observer names fault points as phase and step › Names, one call each, error passthrough | covered | test.support.crash.observer.test.ts::C-a2319613: the observer names each fault point as phase and step and passes errors through (passed, red_assertion) | - | 0.93 |
| C-72672e22 | test-crash-harness › Production config cannot create or enable fault points › Rule fixtures, the real tree and the config | covered | test.arch.fault-points.test.ts::C-72672e22: fault points are refused in production fixtures and the config carries none (passed, red_assertion) | - | 0.89 |
| C-43ecafdc | test-crash-harness › A dedicated cluster starts every part, seeds them, and cleans up › Real parts, a value and a throw | covered | test.support.crash.cluster.test.ts::C-43ecafdc: a crash cluster close stops the spawned engine and removes its directory (passed, red_assertion); test.support.crash.cluster.test.ts::C-43ecafdc: a dedicated cluster returns a value and cleans up after the fn throws (passed, red_assertion) | - | 0.94 |
| C-5f05917f | test-crash-harness › A dedicated cluster starts every part, seeds them, and cleans up › Order, rollback, conflict, missing database | covered | test.support.crash.cluster.test.ts::C-5f05917f: a crash cluster starts parts in order, seeds, rolls back and refuses conflicts (passed, red_assertion) | - | 0.94 |
| C-dfcb53d2 | test-crash-harness › A scenario child starts with a closed environment and reports ready › Ready, environment, arguments, log | covered | test.support.crash.engine.test.ts::C-dfcb53d2: a spawned child starts closed with its arguments and writes the ready line (passed, pre_satisfied, accepted by an agent through Q-001: the check was inconclusive) | - | 0.90 |
| C-0f1c4174 | test-crash-harness › A scenario child starts with a closed environment and reports ready › Option errors and start failures | covered | test.support.crash.engine.test.ts::C-0f1c4174: a child that cannot become ready rejects with its failure line and no live process (passed, pre_satisfied); test.support.crash.engine.test.ts::C-0f1c4174: unusable spawn options are refused before a child or a log exists (passed, pre_satisfied) | - | - |
| C-59216c23 | test-crash-harness › Kill is hard and idempotent, restart brings the child back, stop ends the engine › Kill, restart, stop, deaths | covered | test.support.crash.engine.control.test.ts::C-59216c23: kill is hard, restart replaces the child, stop ends the engine and deaths counts only unrequested ends (passed, pre_satisfied) | - | 0.95 |
| C-fb4b5ad9 | test-crash-harness › Kill is hard and idempotent, restart brings the child back, stop ends the engine › Restart and stop issued together | covered | test.support.crash.engine.control.test.ts::C-fb4b5ad9: a restart and a stop issued together both settle and leave no child alive (passed, pre_satisfied) | - | 0.93 |
| C-5bff336f | test-crash-harness › A failed restart leaves the engine dead and the next restart can recover it › A restart that fails, then one that works | covered | test.support.crash.engine.control.test.ts::C-5bff336f: a failed restart leaves the engine dead on its old pid and a later restart recovers it (passed, red_assertion) | - | 0.95 |
| C-ffd3df2c | test-crash-harness › A fault point kills the scenario child once and the workflow completes after restart › Counter with after:two, before:two and no fault | covered | test.support.crash.counter.test.ts::C-ffd3df2c: a fault kills the counter child once and the workflow completes after restart (passed, red_assertion) | - | 0.92 |
| C-b965721e | test-crash-harness › Effects are counted by idempotency key › A fixed file, the empty file, the bad inputs | covered | test.support.crash.effects.test.ts::C-b965721e: a bad effect entry is refused before its file is created (passed, red_assertion); test.support.crash.effects.test.ts::C-b965721e: a malformed effect log line is refused with its line number (passed, red_assertion); test.support.crash.effects.test.ts::C... | - | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-crash-harness/.l4/ledger/r-20261103T2229Z-1f61.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-crash-harness/.l4/ledger/r-20261104T1855Z-7394.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-crash-harness/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-crash-harness/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/config/faults.test.ts` |  | relevant | new test file |
| `src/config/faults.ts` | config | relevant | named in the spec |
| `src/config/index.ts` | config | relevant | named in the spec |
| `test/arch/fault-points.test.ts` |  | relevant | new test file |
| `test/arch/fault-points.ts` | test | relevant | named in the spec |
| `test/support/crash/child.ts` | test | relevant | named in the spec |
| `test/support/crash/cluster.test.ts` |  | relevant | new test file |
| `test/support/crash/cluster.ts` | test | relevant | named in the spec |
| `test/support/crash/counter-scenario.ts` | test | relevant | named in the spec |
| `test/support/crash/counter.test.ts` |  | relevant | new test file |
| `test/support/crash/effects.test.ts` |  | relevant | new test file |
| `test/support/crash/effects.ts` | test | relevant | named in the spec |
| `test/support/crash/engine.control.test.ts` |  | relevant | new test file |
| `test/support/crash/engine.test.ts` |  | relevant | new test file |
| `test/support/crash/engine.ts` | test | relevant | named in the spec |
| `test/support/crash/observer.test.ts` |  | relevant | new test file |
| `test/support/crash/observer.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/config/faults.ts, src/config/index.ts, test/arch/fault-points.ts, test/support/crash/child.ts, test/support/crash/cluster.ts and 4 more

### Tests

1522 of 1522 passed, 0 failed, 0 errored, 0 skipped.
18 of 18 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-72547e12 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0cfec0bf | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cd6a62d5 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a2319613 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-72672e22 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-43ecafdc | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f05917f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dfcb53d2 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0f1c4174 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-59216c23 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb4b5ad9 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5bff336f | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ffd3df2c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b965721e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-72547e12 | test-crash-harness › A fault point fires once, and its marker is written before the kill › Armed point, marker, second hit | pass | pass | the judge passed it and a discriminating test passes |
| C-0cfec0bf | test-crash-harness › A fault point fires once, and its marker is written before the kill › A marker that cannot be written | pass | pass | the judge passed it and a discriminating test passes |
| C-cd6a62d5 | test-crash-harness › A bad spec is refused and the null port does nothing › Refusals and the null port | pass | pass | the judge passed it and a discriminating test passes |
| C-a2319613 | test-crash-harness › The step observer names fault points as phase and step › Names, one call each, error passthrough | pass | pass | the judge passed it and a discriminating test passes |
| C-72672e22 | test-crash-harness › Production config cannot create or enable fault points › Rule fixtures, the real tree and the config | pass | pass | the judge passed it and a discriminating test passes |
| C-43ecafdc | test-crash-harness › A dedicated cluster starts every part, seeds them, and cleans up › Real parts, a value and a throw | pass | pass | the judge passed it and a discriminating test passes |
| C-5f05917f | test-crash-harness › A dedicated cluster starts every part, seeds them, and cleans up › Order, rollback, conflict, missing database | pass | pass | the judge passed it and a discriminating test passes |
| C-dfcb53d2 | test-crash-harness › A scenario child starts with a closed environment and reports ready › Ready, environment, arguments, log | pass | pass | the judge passed it and a discriminating test passes |
| C-0f1c4174 | test-crash-harness › A scenario child starts with a closed environment and reports ready › Option errors and start failures | fail | needs_human | judge fail counted as insufficient_evidence: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5)) |
| C-59216c23 | test-crash-harness › Kill is hard and idempotent, restart brings the child back, stop ends the engine › Kill, restart, stop, deaths | pass | pass | the judge passed it and a discriminating test passes |
| C-fb4b5ad9 | test-crash-harness › Kill is hard and idempotent, restart brings the child back, stop ends the engine › Restart and stop issued together | pass | pass | the judge passed it and a discriminating test passes |
| C-5bff336f | test-crash-harness › A failed restart leaves the engine dead and the next restart can recover it › A restart that fails, then one that works | pass | pass | the judge passed it and a discriminating test passes |
| C-ffd3df2c | test-crash-harness › A fault point kills the scenario child once and the workflow completes after restart › Counter with after:two, before:two and no fault | pass | pass | the judge passed it and a discriminating test passes |
| C-b965721e | test-crash-harness › Effects are counted by idempotency key › A fixed file, the empty file, the bad inputs | pass | pass | the judge passed it and a discriminating test passes |
- C-0f1c4174: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))

## Findings

- [major, judge] spawnEngine accepts non-plain args objects (criterion C-0f1c4174): The spawn boundary must accept a plain object of string values. test/support/crash/engine.ts validates only that args is a non-null non-array object with string Object.values, so Date and class instances are accepted and silently spread into an empty payload object.
- [major, judge] Duplicate part names leak the first part handle (spec gap) (criterion C-5f05917f): startCrashCluster stores handles by name. A later successfully started part with the same name overwrites the first handle; shutdown iterates the duplicate names and closes the final handle twice while leaving the first handle unclosed.
- [minor, judge] Effect logs without a terminal newline are accepted (spec gap) (criterion C-b965721e): The scenarios cover files written by appendEffect and malformed lines, but do not define whether a final valid JSON record without a newline is a valid JSON line. The committed parser accepts it.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.config.faults.test.ts::C-0cfec0bf: a marker that cannot be written throws without killing` (task 1.1): passed
- `src.config.faults.test.ts::C-72547e12: an armed point writes its marker, kills once, and a later hit does nothing` (task 1.1): passed
- `src.config.faults.test.ts::C-cd6a62d5: a bad spec is refused and the null port does nothing` (task 1.1): passed
- `test.arch.fault-points.test.ts::C-72672e22: fault points are refused in production fixtures and the config carries none` (task 1.2): passed
- `test.support.crash.cluster.test.ts::C-43ecafdc: a crash cluster close stops the spawned engine and removes its directory` (task 3.1): passed
- `test.support.crash.cluster.test.ts::C-43ecafdc: a dedicated cluster returns a value and cleans up after the fn throws` (task 3.1): passed
- `test.support.crash.cluster.test.ts::C-5f05917f: a crash cluster starts parts in order, seeds, rolls back and refuses conflicts` (task 3.1): passed
- `test.support.crash.counter.test.ts::C-ffd3df2c: a fault kills the counter child once and the workflow completes after restart` (task 5.1): passed
- `test.support.crash.effects.test.ts::C-b965721e: a bad effect entry is refused before its file is created` (task 2.2): passed
- `test.support.crash.effects.test.ts::C-b965721e: a malformed effect log line is refused with its line number` (task 2.2): passed
- `test.support.crash.effects.test.ts::C-b965721e: effects are counted per tool by idempotency key and duplicates are calls minus effects` (task 2.2): passed
- `test.support.crash.engine.control.test.ts::C-59216c23: kill is hard, restart replaces the child, stop ends the engine and deaths counts only unrequested ends` (task 4.2): passed
- `test.support.crash.engine.control.test.ts::C-5bff336f: a failed restart leaves the engine dead on its old pid and a later restart recovers it` (task 4.2): passed
- `test.support.crash.engine.control.test.ts::C-fb4b5ad9: a restart and a stop issued together both settle and leave no child alive` (task 4.2): passed
- `test.support.crash.engine.test.ts::C-0f1c4174: a child that cannot become ready rejects with its failure line and no live process` (task 4.1): passed
- `test.support.crash.engine.test.ts::C-0f1c4174: unusable spawn options are refused before a child or a log exists` (task 4.1): passed
- `test.support.crash.engine.test.ts::C-dfcb53d2: a spawned child starts closed with its arguments and writes the ready line` (task 4.1): passed
- `test.support.crash.observer.test.ts::C-a2319613: the observer names each fault point as phase and step and passes errors through` (task 2.1): passed
