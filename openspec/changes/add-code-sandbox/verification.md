# Verification: openspec:add-code-sandbox: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `199dc450091dc78ea99f1e18b671fed0de051da8`
- Head: `28c6696032929c8a28ea6aa33d341e5d0ff39f2e`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: kiro-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@199dc45009 as 28c6696032 (3 commits) |
| 1 | integrity | ok | 182.1 | 11 sub-checks; scope: 37 changed file(s) |
| 2 | build | ok | 32.4 |  |
| 3 | tests | failed | 285.0 | src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working |
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
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261106T2245Z-71c5/034-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261106T2245Z-71c5/035-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261106T2245Z-71c5/036-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261106T2245Z-71c5/037-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261106T2245Z-71c5/038-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261106T2245Z-71c5/039-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261106T2245Z-71c5/040-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 9 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/sandbox/built.test.ts, src/sandbox/classify.test.ts, src/sandbox/classify.ts, src/sandbox/close.test.ts, src/sandbox/crash.test.ts (+21 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1643 of 1643 base tests pass on the unit's code with its 14 test and support files at the base (base: not needed) |

## Evidence

### Needs attention

- blocker: new tests failed: src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T0627Z-1087.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T0848Z-8e22.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T1122Z-eedc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T1943Z-972a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T1945Z-d26a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T2053Z-6f18.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T2145Z-e456.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/.l4/ledger/r-20261106T2245Z-71c5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-code-sandbox/tasks.md` |  | none | exempt: harness, spec or documentation path |
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

1748 of 1749 passed, 1 failed, 0 errored, 0 skipped.
47 of 48 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] new tests failed: src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working

## Fix unit

Fix unit 1 is created for these tasks:
- F-7e9a81fb new tests failed

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
- `src.sandbox.limits-run.test.ts::C-990d6a3c: stack bodies end in a typed fault and the pool keeps working` (task 3.5): failed
- `src.sandbox.limits-run.test.ts::C-990d6a3c: the stack clamp bounds recursion like its capped option` (task 3.5): passed
- `src.sandbox.limits-run.test.ts::C-a85c03b7: bombs stay inside their memory bucket and buckets are isolated` (task 3.5): passed
- `src.sandbox.limits.test.ts::C-105b574e SandboxError is a named Error carrying a code and read-only details` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e clampStack honours the minimum, the cap and the floor` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e memoryBucket rounds up to a whole 16 MiB bucket and never below one` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e poolSize is one unless the machine has more than two cpus` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e seedOf hashes the empty, ascii, path-like and surrogate-pair seeds` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e the exported defaults and minimum stack size hold the fixed numbers and are frozen` (task 1.1): passed
- `src.sandbox.limits.test.ts::C-105b574e workerEntryUrl swaps the pool entry for the worker entry with the same extension` (task 1.1): passed
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
