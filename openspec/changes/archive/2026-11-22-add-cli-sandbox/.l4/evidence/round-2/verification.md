# Verification: openspec:add-cli-sandbox: FAIL (round 2)

traceability: not checked (an earlier step failed)

- Base: `51d5e14ef4c47a6324e3a0573a16d616f39fbe35`
- Head: `1dee772dd3ceecdf2acdb450ff7ea5bb9f25918a`
- Implementer profiles: claude-sonnet
- Judge: nemotron-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.7 | base main@51d5e14ef4 contained |
| 1 | integrity | failed | 618.7 | a pre-existing test fails on the unit's code; scope: 16 changed file(s) |
| 2 | build | not_run | 0.0 | an earlier step failed |
| 3 | tests | not_run | 0.0 | an earlier step failed |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 2 task(s): red and green compared |
| test path freeze | ok | 3 harness step commit(s) checked |
| content scan | skipped | not checked: python only; changed files outside it: test/arch/modules.ts |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/cli/flow/test-pool.test.ts, src/cli/flow/test-sandbox.test.ts, src/cli/flow/test.ts, test/arch/cli-sandbox.test.ts, test/arch/modules.test.ts (+1 more) |
| tdd history | ok | 2 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | failed | 2698 of 2699 base tests pass on the unit's code with its 5 test and support files at the base (base: evidence) |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-cli-sandbox-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox/.l4/ledger/r-20261122T0003Z-5c64.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-cli-sandbox/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/cli/flow/test-pool.test.ts` |  | relevant | new test file |
| `src/cli/flow/test-sandbox.test.ts` |  | relevant | new test file |
| `src/cli/flow/test.ts` | cli | relevant | named in the spec |
| `test/arch/cli-sandbox.test.ts` |  | relevant | new test file |
| `test/arch/modules.test.ts` |  | relevant | named in the spec |
| `test/arch/modules.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not run.

### Tests

Tests-ran check not run.

## Criteria

None judged.

## Findings

- [blocker, deterministic] a pre-existing test fails on the unit's code: test.arch.repo.test.ts::C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean (AssertionError: Expected values to be strictly deep-equal:)

## Fix unit

Escalated: round 2 failed the same way as round 1: finding F-2813828d

## New tests (red then green, `task.red_ok` in the ledger)

- `src.cli.flow.test-pool.test.ts::C-00e31a66 a failing close changes nothing` (task 2.1): not in the report
- `src.cli.flow.test-pool.test.ts::C-4012f2ad the pool is created after validation and closed once on every exit path` (task 2.1): not in the report
- `src.cli.flow.test-sandbox.test.ts::C-8191a905 a code hook runs in the pool` (task 1.1): not in the report
- `src.cli.flow.test-sandbox.test.ts::C-8726b0c4 a sandbox fault fails the node and prints only its code` (task 1.1): not in the report
- `src.cli.flow.test-sandbox.test.ts::C-f20e390d a code node completes in the pool` (task 1.1): not in the report
- `test.arch.cli-sandbox.test.ts::C-90199ce0 the graph gives cli the sandbox edge and the CLI file uses it` (task 1.1): not in the report
- `test.arch.cli-sandbox.test.ts::C-d6eaf34e the CLI may import the sandbox and the API may not` (task 1.1): not in the report
