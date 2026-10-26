# Verification: openspec:add-architecture-fitness: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `2c97ad2f39b299b4ea12786643fe6ef0970ebc31`
- Head: `1e2468cbe5cb7be904b876b79d37b6b27e260135`
- Implementer profiles: deepseek
- Judge: claude-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@2c97ad2f39 as 1e2468cbe5 (2 commits) |
| 1 | integrity | failed | 34.7 | a pre-existing test no longer runs on the unit's code (+1 unfrozen by human answers); scope: 15 changed file(s) |
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
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared (+1 unfrozen by human answers) |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | skipped | not checked: python only; changed files outside it: test/arch/modules.ts |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/arch/hygiene.test.ts, test/arch/imports.test.ts, test/arch/modules.test.ts, test/arch/modules.ts, test/arch/network.test.ts (+6 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | failed | 214 of 214 base tests pass on the unit's code with its 7 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/arch/repo.test.ts kept at head for the run (task 5.1: unfrozen by Q-001)

## Tests unfrozen by human answers (allowed, L4-IMP-002)

- test/arch/repo.test.ts (task 5.1, unfrozen by Q-001 (human))

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-architecture-fitness/.l4/ledger/r-20261026T1619Z-8dc6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/.l4/ledger/r-20261026T1915Z-7f92.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/arch/hygiene.test.ts` |  | relevant | new test file |
| `test/arch/imports.test.ts` |  | relevant | new test file |
| `test/arch/modules.test.ts` |  | relevant | new test file |
| `test/arch/modules.ts` | test | relevant | named in the spec |
| `test/arch/network.test.ts` |  | relevant | new test file |
| `test/arch/repo.test.ts` |  | relevant | new test file |
| `test/arch/rules.ts` | test | relevant | named in the spec |
| `test/arch/secrets.test.ts` |  | relevant | new test file |
| `test/arch/secrets.ts` | test | relevant | named in the spec |
| `test/arch/sources.test.ts` |  | relevant | new test file |
| `test/arch/sources.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not run.

### Tests

Tests-ran check not run.

## Criteria

None judged.

## Findings

- [blocker, deterministic] a pre-existing test no longer runs on the unit's code: test/arch/repo.test.ts: Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/runner/.cache/l4/worktrees/ursitoare-302fad6a21/openspec/add-architecture-fitness/test/arch/modules.ts' imported from /home/runner/.cache/l4/worktrees/ursitoare-302fad6a21/openspec/add-architecture-fitness/test/arch/rules.ts

## Fix unit

Fix unit 1 is created for these tasks:
- F-35492b20 a pre-existing test no longer runs on the unit's code

## New tests (red then green, `task.red_ok` in the ledger)

- `test.arch.hygiene.test.ts::C-5d09e70a: environment reads are refused` (task 3.4): not in the report
- `test.arch.hygiene.test.ts::C-5fe3458c: console uses are refused` (task 3.3): not in the report
- `test.arch.hygiene.test.ts::C-6ae206c9 C-9455d3fd: look-alike and test-file imports pass` (task 3.2): not in the report
- `test.arch.hygiene.test.ts::C-78fc80d1: console look-alikes and test files pass` (task 3.3): not in the report
- `test.arch.hygiene.test.ts::C-9455d3fd: seed, test and alias imports are refused` (task 3.2): not in the report
- `test.arch.hygiene.test.ts::C-d68d430c: environment look-alikes and config files pass` (task 3.4): not in the report
- `test.arch.hygiene.test.ts::C-f9b82661: the bootstrap placeholder fails the environment rule` (task 3.4): not in the report
- `test.arch.hygiene.test.ts::C-fe3edcae: environment reads through require are refused` (task 3.4): not in the report
- `test.arch.imports.test.ts::C-0bc7739e C-df527545: a forbidden edge names both modules` (task 2.2): not in the report
- `test.arch.imports.test.ts::C-36562121: unseeable imports are refused and test files are exempt` (task 2.3): not in the report
- `test.arch.imports.test.ts::C-4d6f98c2: unknown directories are refused` (task 2.2): not in the report
- `test.arch.imports.test.ts::C-6b1f49c4: getBuiltinModule is refused` (task 2.3): not in the report
- `test.arch.imports.test.ts::C-82116acd: a non-literal require is unseeable` (task 2.3): not in the report
- `test.arch.imports.test.ts::C-b49548b8: createRequire is refused` (task 2.3): not in the report
- `test.arch.imports.test.ts::C-cc435a91: root files follow the leaf rule` (task 2.3): not in the report
- `test.arch.imports.test.ts::C-df527545: allowed imports and nothing to do pass` (task 2.2): not in the report
- `test.arch.imports.test.ts::C-f3249f34: deep imports are refused` (task 2.3): not in the report
- `test.arch.modules.test.ts::C-65b86cc0 C-851f3c7c: the shipped graph is consistent` (task 2.1): not in the report
- `test.arch.modules.test.ts::C-6923119c: a new egress capability is refused` (task 2.1): not in the report
- `test.arch.modules.test.ts::C-70858a5b C-851f3c7c: the graph carries the version 3 edges` (task 2.1): not in the report
- `test.arch.modules.test.ts::C-851f3c7c: inconsistent graphs are reported` (task 2.1): not in the report
- `test.arch.modules.test.ts::C-90199ce0 C-851f3c7c: the graph holds the 30 modules in roadmap order` (task 2.1): not in the report
- `test.arch.network.test.ts::C-8e07c9a6: network imports and calls outside egress modules are refused` (task 3.1): not in the report
- `test.arch.network.test.ts::C-8fa501e4: every scanned extension is covered` (task 3.1): not in the report
- `test.arch.network.test.ts::C-a2eef903: egress modules, type-only imports, client methods and test files pass` (task 3.1): not in the report
- `test.arch.network.test.ts::C-bdf0820d: process and worker entry points are refused` (task 3.1): not in the report
- `test.arch.network.test.ts::C-f9b82661: the bootstrap placeholder fails the network rule` (task 3.1): not in the report
- `test.arch.network.test.ts::C-fa65851b: an import-equals declaration is a value import` (task 3.1): not in the report
- `test.arch.repo.test.ts::C-6bb73a15: violations are all listed in one run` (task 5.1): not in the report
- `test.arch.repo.test.ts::C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean` (task 5.1): not in the report
- `test.arch.repo.test.ts::C-dd8c8f9a: require look-alikes and test files pass` (task 5.1): not in the report
- `test.arch.repo.test.ts::C-eae7dab7: a require call is a value import of its specifier` (task 5.1): not in the report
- `test.arch.secrets.test.ts::C-58d38ea1: secret look-alikes pass while a real key is still reported` (task 4.1): not in the report
- `test.arch.secrets.test.ts::C-bb0edd4e: an unavailable git fails the scan loudly` (task 4.2): not in the report
- `test.arch.secrets.test.ts::C-c63269ba: each secret kind is detected at its line without echoing the text` (task 4.1): not in the report
- `test.arch.secrets.test.ts::C-e7ed48e1: the file list covers tracked and untracked files only` (task 4.2): not in the report
- `test.arch.sources.test.ts::C-18aa910d resolveSpecifier resolves relative imports against the importing file` (task 1.1): not in the report
- `test.arch.sources.test.ts::C-2073476a require forms are found as value imports with their flags` (task 1.2): not in the report
- `test.arch.sources.test.ts::C-b5e05684 import forms are found with their lines, type-only and dynamic flags` (task 1.2): not in the report
- `test.arch.sources.test.ts::C-ec6975cf formatViolation names file, line, code and message for any code` (task 1.1): not in the report
- `test.arch.sources.test.ts::C-ec6975cf sortViolations orders by file, then line, then code` (task 1.1): not in the report
- `test.arch.sources.test.ts::C-f0665065 readSnapshot reads the source files of a real directory without symlinks` (task 1.1): not in the report
