# Verification: openspec:add-architecture-fitness: NEEDS_HUMAN (round 2)

traceability: 42/45 criteria covered by a discriminating test

- Base: `2c97ad2f39b299b4ea12786643fe6ef0970ebc31`
- Head: `9f19c67e64f48bd75ea2aad1619a3a7f94502318`
- Implementer profiles: deepseek
- Judge: claude-judge (claude-opus-5-5), 1 call(s), prompt sha256 `a45234b16e0a29e0272959497075f2a4fce8dd128779fce7adc13e70607ed7b8`
- Judge replies of claude-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek deepseek (declared)
- Cost: $1.1982

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@2c97ad2f39 contained |
| 1 | integrity | ok | 18.2 | 10 sub-checks (+1 unfrozen by human answers); scope: 23 changed file(s) |
| 2 | build | ok | 15.5 |  |
| 3 | tests | ok | 16.5 |  |
| 4 | traceability | ok | 0.1 | 42/45 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/arch/modules.ts, test/arch/rules.ts, test/arch/secrets.ts, test/arch/sources.ts |
| 8 | s1 judge | ok | 4.7 | 44/45 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 154.5 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261026T1915Z-7f92/030-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261026T1915Z-7f92/031-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261026T1915Z-7f92/032-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261026T1915Z-7f92/033-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261026T1915Z-7f92/034-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261026T1915Z-7f92/035-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261026T1915Z-7f92/036-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared (+1 unfrozen by human answers) |
| test path freeze | ok | 13 harness step commit(s) checked |
| content scan | skipped | not checked: python only; changed files outside it: test/arch/modules.ts |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/arch/hygiene.test.ts, test/arch/imports.test.ts, test/arch/modules.test.ts, test/arch/modules.ts, test/arch/network.test.ts (+6 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 218 of 218 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- test/arch/repo.test.ts kept at head for the run (task 5.1: unfrozen by Q-001)

## Tests unfrozen by human answers (allowed, L4-IMP-002)

- test/arch/repo.test.ts (task 5.1, unfrozen by Q-001 (human))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-2073476a | architecture-require-forms › Require calls and import-equals declarations are value imports › Require forms are found | covered | test.arch.sources.test.ts::C-2073476a require forms are found as value imports with their flags (passed, red_assertion) | - | 0.91 |
| C-eae7dab7 | architecture-require-forms › Require calls and import-equals declarations are value imports › A require call is a value import of its specifier | covered | test.arch.repo.test.ts::C-eae7dab7: a require call is a value import of its specifier (passed, red_assertion) | - | 0.65 |
| C-fa65851b | architecture-require-forms › Require calls and import-equals declarations are value imports › An import-equals declaration is a value import | covered | test.arch.network.test.ts::C-fa65851b: an import-equals declaration is a value import (passed, red_assertion) | - | 0.75 |
| C-8fa501e4 | architecture-require-forms › Require calls and import-equals declarations are value imports › Every scanned extension is covered | covered | test.arch.network.test.ts::C-8fa501e4: every scanned extension is covered (passed, red_assertion) | - | 0.88 |
| C-82116acd | architecture-require-forms › Require calls and import-equals declarations are value imports › A non-literal require is unseeable | covered | test.arch.imports.test.ts::C-82116acd: a non-literal require is unseeable (passed, red_assertion) | - | 0.71 |
| C-b49548b8 | architecture-require-forms › Loader functions are refused › createRequire is refused | covered | test.arch.imports.test.ts::C-b49548b8: createRequire is refused (passed, red_assertion) | - | 0.90 |
| C-6b1f49c4 | architecture-require-forms › Loader functions are refused › getBuiltinModule is refused | covered | test.arch.imports.test.ts::C-6b1f49c4: getBuiltinModule is refused (passed, red_assertion) | - | 0.89 |
| C-fe3edcae | architecture-require-forms › Environment reads through require are refused › Environment through require is refused | covered | test.arch.hygiene.test.ts::C-fe3edcae: environment reads through require are refused (passed, red_assertion) | - | 0.89 |
| C-dd8c8f9a | architecture-require-forms › Look-alikes and test files pass the require rules › Require look-alikes and test files pass | covered | test.arch.repo.test.ts::C-dd8c8f9a: require look-alikes and test files pass (passed, red_assertion) | - | 0.91 |
| C-90199ce0 | architecture-rules › Complete module graph as data › The graph holds the 30 modules | covered | test.arch.modules.test.ts::C-90199ce0 C-851f3c7c: the graph holds the 30 modules in roadmap order (passed, red_assertion) | - | 0.82 |
| C-70858a5b | architecture-rules › Complete module graph as data › The graph carries the version 3 edges | covered | test.arch.modules.test.ts::C-70858a5b C-851f3c7c: the graph carries the version 3 edges (passed, red_assertion) | - | 0.76 |
| C-65b86cc0 | architecture-rules › Complete module graph as data › The shipped graph is consistent | covered | test.arch.modules.test.ts::C-65b86cc0 C-851f3c7c: the shipped graph is consistent (passed, red_assertion) | - | 0.91 |
| C-851f3c7c | architecture-rules › Complete module graph as data › Inconsistent graphs are reported | covered | test.arch.modules.test.ts::C-65b86cc0 C-851f3c7c: the shipped graph is consistent (passed, red_assertion); test.arch.modules.test.ts::C-70858a5b C-851f3c7c: the graph carries the version 3 edges (passed, red_assertion); test.arch.modules.test.ts::C-851f3c7c: inconsistent graphs are reported (passed,... | - | 0.92 |
| C-6923119c | architecture-rules › Complete module graph as data › A new egress capability is refused | covered | test.arch.modules.test.ts::C-6923119c: a new egress capability is refused (passed, red_assertion) | - | 0.80 |
| C-b5e05684 | architecture-rules › Static analysis names file and line › Import forms are found | covered | test.arch.sources.test.ts::C-b5e05684 import forms are found with their lines, type-only and dynamic flags (passed, red_assertion) | - | 0.95 |
| C-ec6975cf | architecture-rules › Static analysis names file and line › Violations are formatted and ordered | covered | test.arch.sources.test.ts::C-ec6975cf formatViolation names file, line, code and message for any code (passed, red_assertion); test.arch.sources.test.ts::C-ec6975cf sortViolations orders by file, then line, then code (passed, red_assertion) | - | 0.92 |
| C-18aa910d | architecture-rules › Static analysis names file and line › Specifiers resolve relative to the importing file | covered | test.arch.sources.test.ts::C-18aa910d resolveSpecifier resolves relative imports against the importing file (passed, red_assertion) | - | 0.92 |
| C-f0665065 | architecture-rules › Static analysis names file and line › The snapshot reads a real directory | covered | test.arch.sources.test.ts::C-f0665065 readSnapshot reads the source files of a real directory without symlinks (passed, red_assertion) | - | 0.91 |
| C-df527545 | architecture-rules › Modules and imports follow the graph › Allowed imports and nothing to do pass | covered | test.arch.imports.test.ts::C-0bc7739e C-df527545: a forbidden edge names both modules (passed, red_assertion); test.arch.imports.test.ts::C-df527545: allowed imports and nothing to do pass (passed, red_assertion) | - | 0.82 |
| C-0bc7739e | architecture-rules › Modules and imports follow the graph › A forbidden edge names both modules | covered | test.arch.imports.test.ts::C-0bc7739e C-df527545: a forbidden edge names both modules (passed, red_assertion) | - | 0.86 |
| C-f3249f34 | architecture-rules › Modules and imports follow the graph › Deep imports are refused | covered | test.arch.imports.test.ts::C-f3249f34: deep imports are refused (passed, red_assertion) | - | 0.74 |
| C-4d6f98c2 | architecture-rules › Modules and imports follow the graph › Unknown directories are refused | covered | test.arch.imports.test.ts::C-4d6f98c2: unknown directories are refused (passed, red_assertion) | - | 0.88 |
| C-cc435a91 | architecture-rules › Modules and imports follow the graph › Root files follow the leaf rule | covered | test.arch.imports.test.ts::C-cc435a91: root files follow the leaf rule (passed, red_assertion) | - | 0.88 |
| C-36562121 | architecture-rules › Modules and imports follow the graph › Unseeable and exempt imports | covered | test.arch.imports.test.ts::C-36562121: unseeable imports are refused and test files are exempt (passed, red_assertion) | - | 0.78 |
| C-8e07c9a6 | architecture-rules › Network access only in egress modules › Violations outside egress modules | covered | test.arch.network.test.ts::C-8e07c9a6: network imports and calls outside egress modules are refused (passed, red_assertion) | - | 0.93 |
| C-bdf0820d | architecture-rules › Network access only in egress modules › Process and worker entry points are refused | covered | test.arch.network.test.ts::C-bdf0820d: process and worker entry points are refused (passed, red_assertion) | - | 0.91 |
| C-a2eef903 | architecture-rules › Network access only in egress modules › Allowed uses | covered | test.arch.network.test.ts::C-a2eef903: egress modules, type-only imports, client methods and test files pass (passed, red_assertion) | - | 0.93 |
| C-f9b82661 | architecture-rules › Network access only in egress modules › The bootstrap placeholder fails | covered | test.arch.hygiene.test.ts::C-f9b82661: the bootstrap placeholder fails the environment rule (passed, red_assertion); test.arch.network.test.ts::C-f9b82661: the bootstrap placeholder fails the network rule (passed, red_assertion) | - | 0.81 |
| C-9455d3fd | architecture-rules › No import of seed or test from src › Seed, test and alias imports are refused | covered | test.arch.hygiene.test.ts::C-6ae206c9 C-9455d3fd: look-alike and test-file imports pass (passed, red_assertion); test.arch.hygiene.test.ts::C-9455d3fd: seed, test and alias imports are refused (passed, red_assertion) | - | 0.93 |
| C-6ae206c9 | architecture-rules › No import of seed or test from src › Look-alike and test-file imports pass | covered | test.arch.hygiene.test.ts::C-6ae206c9 C-9455d3fd: look-alike and test-file imports pass (passed, red_assertion) | - | 0.87 |
| C-5fe3458c | architecture-rules › No console in src › Console uses are refused | covered | test.arch.hygiene.test.ts::C-5fe3458c: console uses are refused (passed, red_assertion) | - | 0.91 |
| C-78fc80d1 | architecture-rules › No console in src › Console look-alikes pass | covered | test.arch.hygiene.test.ts::C-78fc80d1: console look-alikes and test files pass (passed, red_assertion) | - | 0.79 |
| C-5d09e70a | architecture-rules › Environment only in config › Environment reads are refused | covered | test.arch.hygiene.test.ts::C-5d09e70a: environment reads are refused (passed, red_assertion) | - | 0.89 |
| C-d68d430c | architecture-rules › Environment only in config › Environment look-alikes pass | covered | test.arch.hygiene.test.ts::C-d68d430c: environment look-alikes and config files pass (passed, red_assertion) | - | 0.92 |
| C-c63269ba | architecture-rules › Secret-pattern scan of repository files › Each kind is detected without echoing it | covered | test.arch.secrets.test.ts::C-c63269ba: each secret kind is detected at its line without echoing the text (passed, red_assertion, inadequate) | - | 0.93 |
| C-58d38ea1 | architecture-rules › Secret-pattern scan of repository files › Look-alikes pass | covered | test.arch.secrets.test.ts::C-58d38ea1: secret look-alikes pass while a real key is still reported (passed, red_assertion) | - | 0.79 |
| C-e7ed48e1 | architecture-rules › Secret-pattern scan of repository files › The file list covers tracked and untracked files only | covered | test.arch.secrets.test.ts::C-e7ed48e1: the file list covers tracked and untracked files only (passed, red_assertion) | - | 0.78 |
| C-bb0edd4e | architecture-rules › Secret-pattern scan of repository files › Git unavailable fails loudly | covered | test.arch.secrets.test.ts::C-bb0edd4e: an unavailable git fails the scan loudly (passed, red_assertion) | - | 0.92 |
| C-c0da3179 | architecture-rules › The current tree passes every rule › The merged tree is clean | covered | test.arch.repo.test.ts::C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean (passed, red_assertion) | - | 0.89 |
| C-6bb73a15 | architecture-rules › The current tree passes every rule › Violations are all listed in one run | covered | test.arch.repo.test.ts::C-6bb73a15: violations are all listed in one run (passed, red_assertion) | - | 0.92 |
| C-eea53b80 | architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task | uncovered | - | - | 0.06 |
| C-8c4b4392 | architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task | uncovered | - | - | 0.05 |
| C-ba84c521 | architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule | uncovered | - | - | 0.04 |
| C-9ded7e99 | architecture-tree-blockers › The merged tree meets the facts this change relies on › Facts verified on the base branch | covered | test.arch.repo.test.ts::C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean (passed, red_assertion) | - | 0.79 |
| C-069f346e | architecture-tree-blockers › The merged tree meets the facts this change relies on › Facts that add-engine-skeleton delivers | covered | test.arch.repo.test.ts::C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean (passed, red_assertion) | - | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-architecture-fitness-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/.l4/ledger/r-20261026T1619Z-8dc6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/.l4/ledger/r-20261026T1915Z-7f92.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-architecture-fitness/verification.md` |  | none | exempt: harness, spec or documentation path |
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

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/arch/modules.ts, test/arch/rules.ts, test/arch/secrets.ts, test/arch/sources.ts

### Tests

257 of 257 passed, 0 failed, 0 errored, 0 skipped.
42 of 42 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-2073476a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eae7dab7 | ok | 0.650 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fa65851b | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8fa501e4 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-82116acd | ok | 0.710 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b49548b8 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6b1f49c4 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fe3edcae | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dd8c8f9a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-90199ce0 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-70858a5b | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-65b86cc0 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-851f3c7c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6923119c | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b5e05684 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ec6975cf | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-18aa910d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f0665065 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df527545 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0bc7739e | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f3249f34 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4d6f98c2 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cc435a91 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-36562121 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8e07c9a6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bdf0820d | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a2eef903 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f9b82661 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9455d3fd | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6ae206c9 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5fe3458c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78fc80d1 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d09e70a | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d68d430c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c63269ba | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-58d38ea1 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e7ed48e1 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bb0edd4e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0da3179 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6bb73a15 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eea53b80 | ok | 0.060 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8c4b4392 | ok | 0.050 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ba84c521 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9ded7e99 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-069f346e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-2073476a | architecture-require-forms › Require calls and import-equals declarations are value imports › Require forms are found | pass | pass | the judge passed it and a discriminating test passes |
| C-eae7dab7 | architecture-require-forms › Require calls and import-equals declarations are value imports › A require call is a value import of its specifier | pass | pass | the judge passed it and a discriminating test passes |
| C-fa65851b | architecture-require-forms › Require calls and import-equals declarations are value imports › An import-equals declaration is a value import | pass | pass | the judge passed it and a discriminating test passes |
| C-8fa501e4 | architecture-require-forms › Require calls and import-equals declarations are value imports › Every scanned extension is covered | pass | pass | the judge passed it and a discriminating test passes |
| C-82116acd | architecture-require-forms › Require calls and import-equals declarations are value imports › A non-literal require is unseeable | pass | pass | the judge passed it and a discriminating test passes |
| C-b49548b8 | architecture-require-forms › Loader functions are refused › createRequire is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-6b1f49c4 | architecture-require-forms › Loader functions are refused › getBuiltinModule is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-fe3edcae | architecture-require-forms › Environment reads through require are refused › Environment through require is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-dd8c8f9a | architecture-require-forms › Look-alikes and test files pass the require rules › Require look-alikes and test files pass | pass | pass | the judge passed it and a discriminating test passes |
| C-90199ce0 | architecture-rules › Complete module graph as data › The graph holds the 30 modules | pass | pass | the judge passed it and a discriminating test passes |
| C-70858a5b | architecture-rules › Complete module graph as data › The graph carries the version 3 edges | pass | pass | the judge passed it and a discriminating test passes |
| C-65b86cc0 | architecture-rules › Complete module graph as data › The shipped graph is consistent | pass | pass | the judge passed it and a discriminating test passes |
| C-851f3c7c | architecture-rules › Complete module graph as data › Inconsistent graphs are reported | fail | needs_human | judge fail counted as insufficient_evidence: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5)) |
| C-6923119c | architecture-rules › Complete module graph as data › A new egress capability is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-b5e05684 | architecture-rules › Static analysis names file and line › Import forms are found | pass | pass | the judge passed it and a discriminating test passes |
| C-ec6975cf | architecture-rules › Static analysis names file and line › Violations are formatted and ordered | pass | pass | the judge passed it and a discriminating test passes |
| C-18aa910d | architecture-rules › Static analysis names file and line › Specifiers resolve relative to the importing file | pass | pass | the judge passed it and a discriminating test passes |
| C-f0665065 | architecture-rules › Static analysis names file and line › The snapshot reads a real directory | pass | pass | the judge passed it and a discriminating test passes |
| C-df527545 | architecture-rules › Modules and imports follow the graph › Allowed imports and nothing to do pass | pass | pass | the judge passed it and a discriminating test passes |
| C-0bc7739e | architecture-rules › Modules and imports follow the graph › A forbidden edge names both modules | pass | pass | the judge passed it and a discriminating test passes |
| C-f3249f34 | architecture-rules › Modules and imports follow the graph › Deep imports are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-4d6f98c2 | architecture-rules › Modules and imports follow the graph › Unknown directories are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-cc435a91 | architecture-rules › Modules and imports follow the graph › Root files follow the leaf rule | pass | pass | the judge passed it and a discriminating test passes |
| C-36562121 | architecture-rules › Modules and imports follow the graph › Unseeable and exempt imports | pass | pass | the judge passed it and a discriminating test passes |
| C-8e07c9a6 | architecture-rules › Network access only in egress modules › Violations outside egress modules | pass | pass | the judge passed it and a discriminating test passes |
| C-bdf0820d | architecture-rules › Network access only in egress modules › Process and worker entry points are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-a2eef903 | architecture-rules › Network access only in egress modules › Allowed uses | pass | pass | the judge passed it and a discriminating test passes |
| C-f9b82661 | architecture-rules › Network access only in egress modules › The bootstrap placeholder fails | pass | pass | the judge passed it and a discriminating test passes |
| C-9455d3fd | architecture-rules › No import of seed or test from src › Seed, test and alias imports are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-6ae206c9 | architecture-rules › No import of seed or test from src › Look-alike and test-file imports pass | pass | pass | the judge passed it and a discriminating test passes |
| C-5fe3458c | architecture-rules › No console in src › Console uses are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-78fc80d1 | architecture-rules › No console in src › Console look-alikes pass | pass | pass | the judge passed it and a discriminating test passes |
| C-5d09e70a | architecture-rules › Environment only in config › Environment reads are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-d68d430c | architecture-rules › Environment only in config › Environment look-alikes pass | pass | pass | the judge passed it and a discriminating test passes |
| C-c63269ba | architecture-rules › Secret-pattern scan of repository files › Each kind is detected without echoing it | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-58d38ea1 | architecture-rules › Secret-pattern scan of repository files › Look-alikes pass | pass | pass | the judge passed it and a discriminating test passes |
| C-e7ed48e1 | architecture-rules › Secret-pattern scan of repository files › The file list covers tracked and untracked files only | pass | pass | the judge passed it and a discriminating test passes |
| C-bb0edd4e | architecture-rules › Secret-pattern scan of repository files › Git unavailable fails loudly | pass | pass | the judge passed it and a discriminating test passes |
| C-c0da3179 | architecture-rules › The current tree passes every rule › The merged tree is clean | pass | pass | the judge passed it and a discriminating test passes |
| C-6bb73a15 | architecture-rules › The current tree passes every rule › Violations are all listed in one run | pass | pass | the judge passed it and a discriminating test passes |
| C-eea53b80 | architecture-tree-blockers › A violation in a file this change may not change is a blocker › A violation in merged code stops the task | not_verifiable | needs_human | uncovered: no adequate discriminating test traces it |
| C-8c4b4392 | architecture-tree-blockers › A violation in a file this change may not change is a blocker › A directory outside the graph stops the task | not_verifiable | needs_human | uncovered: no adequate discriminating test traces it |
| C-ba84c521 | architecture-tree-blockers › A violation in a file this change may not change is a blocker › A false positive is fixed in the rule | not_verifiable | needs_human | uncovered: no adequate discriminating test traces it |
| C-9ded7e99 | architecture-tree-blockers › The merged tree meets the facts this change relies on › Facts verified on the base branch | pass | pass | the judge passed it and a discriminating test passes |
| C-069f346e | architecture-tree-blockers › The merged tree meets the facts this change relies on › Facts that add-engine-skeleton delivers | pass | pass | the judge passed it and a discriminating test passes |
- C-851f3c7c: counterexample unexecuted (not executed in M0: the verifier worktree is M1 (verifier 1.5))

## Findings

- [major, judge] The module graph is duplicated: the rules ignore test/arch/modules.ts (criterion C-65b86cc0): The fix for F-35492b20 stopped rules.ts from importing modules.ts. Instead, rules.ts defines and exports its own literal MODULES, which is the default for checkGraphIntegrity, checkModuleGraph, checkNetwork and checkAll. modules.ts holds a second, independent copy. It is not a re-export, although the implementer's note says it is. A later unit that adds a module or edge in test/arch/modules.ts, as design decision 13 and the proposal say it should, changes nothing the rules read. modules.test.ts checks one copy, while checkGraphIntegrity() and the repo test check the other. rules.ts also export...
- [major, judge] task 2.1: modules.ts is not the graph the rules check (criterion C-65b86cc0): Task 2.1 makes test/arch/modules.ts the complete graph data file and builds checkGraphIntegrity on it. At head, checkGraphIntegrity defaults to a separate copy in rules.ts, so the data file has no effect on any rule.
- [major, judge] The egress pin is not checked when a pinned module row is missing (criterion C-851f3c7c): checkGraphIntegrity checks the pin only for rows that are present. Deleting the `gateway` row, or any fixture without the three egress modules, reports no pin violation. This contradicts the C-851f3c7c THEN, which says each result carries the egress-pin violations, and design decision 6, which says the egress modules are exactly observability, identity and gateway.
- [major, judge] A default import with all-type named specifiers is treated as type-only (criterion C-a2eef903): namedBindingsAreTypeOnly ignores the default binding. `import https, { type Agent } from "node:https";` is therefore marked typeOnly, and checkNetwork skips it, although `https` is a value import. Design decision 3 makes a declaration type-only only when it has nothing but named specifiers, at least one, all `type`-modified. This bypasses the network and worker_threads rules.
- [minor, judge] A template-literal require or import specifier is only a dynamic import (spec gap) (criterion C-82116acd): literalText accepts only StringLiteral. `require(`node:https`)` gets specifier null: checkModuleGraph reports ARCH_DYNAMIC_IMPORT and checkNetwork reports nothing. Another reasonable implementation would read the NoSubstitutionTemplateLiteral as the literal `node:https`.
- [minor, judge] A getBuiltinModule reference without a call is not reported (spec gap) (criterion C-6b1f49c4): Only calls of getBuiltinModule are flagged. `const g = process.getBuiltinModule;` passes. createRequire, by contrast, is flagged as any identifier.
- [minor, judge] Stale scaffold comment kept in rules.ts: rules.ts still starts with the comment `Signature stub (milestone scaffold...)` although it is now implemented. The comment was removed from sources.ts and secrets.ts.
- [minor, judge] the judge called a test inadequate (criterion C-851f3c7c): test.arch.modules.test.ts::C-851f3c7c: inconsistent graphs are reported
- [minor, judge] the judge called a test inadequate (criterion C-c63269ba): test.arch.secrets.test.ts::C-c63269ba: each secret kind is detected at its line without echoing the text

## New tests (red then green, `task.red_ok` in the ledger)

- `test.arch.hygiene.test.ts::C-5d09e70a: environment reads are refused` (task 3.4): passed
- `test.arch.hygiene.test.ts::C-5fe3458c: console uses are refused` (task 3.3): passed
- `test.arch.hygiene.test.ts::C-6ae206c9 C-9455d3fd: look-alike and test-file imports pass` (task 3.2): passed
- `test.arch.hygiene.test.ts::C-78fc80d1: console look-alikes and test files pass` (task 3.3): passed
- `test.arch.hygiene.test.ts::C-9455d3fd: seed, test and alias imports are refused` (task 3.2): passed
- `test.arch.hygiene.test.ts::C-d68d430c: environment look-alikes and config files pass` (task 3.4): passed
- `test.arch.hygiene.test.ts::C-f9b82661: the bootstrap placeholder fails the environment rule` (task 3.4): passed
- `test.arch.hygiene.test.ts::C-fe3edcae: environment reads through require are refused` (task 3.4): passed
- `test.arch.imports.test.ts::C-0bc7739e C-df527545: a forbidden edge names both modules` (task 2.2): passed
- `test.arch.imports.test.ts::C-36562121: unseeable imports are refused and test files are exempt` (task 2.3): passed
- `test.arch.imports.test.ts::C-4d6f98c2: unknown directories are refused` (task 2.2): passed
- `test.arch.imports.test.ts::C-6b1f49c4: getBuiltinModule is refused` (task 2.3): passed
- `test.arch.imports.test.ts::C-82116acd: a non-literal require is unseeable` (task 2.3): passed
- `test.arch.imports.test.ts::C-b49548b8: createRequire is refused` (task 2.3): passed
- `test.arch.imports.test.ts::C-cc435a91: root files follow the leaf rule` (task 2.3): passed
- `test.arch.imports.test.ts::C-df527545: allowed imports and nothing to do pass` (task 2.2): passed
- `test.arch.imports.test.ts::C-f3249f34: deep imports are refused` (task 2.3): passed
- `test.arch.modules.test.ts::C-65b86cc0 C-851f3c7c: the shipped graph is consistent` (task 2.1): passed
- `test.arch.modules.test.ts::C-6923119c: a new egress capability is refused` (task 2.1): passed
- `test.arch.modules.test.ts::C-70858a5b C-851f3c7c: the graph carries the version 3 edges` (task 2.1): passed
- `test.arch.modules.test.ts::C-851f3c7c: inconsistent graphs are reported` (task 2.1): passed
- `test.arch.modules.test.ts::C-90199ce0 C-851f3c7c: the graph holds the 30 modules in roadmap order` (task 2.1): passed
- `test.arch.network.test.ts::C-8e07c9a6: network imports and calls outside egress modules are refused` (task 3.1): passed
- `test.arch.network.test.ts::C-8fa501e4: every scanned extension is covered` (task 3.1): passed
- `test.arch.network.test.ts::C-a2eef903: egress modules, type-only imports, client methods and test files pass` (task 3.1): passed
- `test.arch.network.test.ts::C-bdf0820d: process and worker entry points are refused` (task 3.1): passed
- `test.arch.network.test.ts::C-f9b82661: the bootstrap placeholder fails the network rule` (task 3.1): passed
- `test.arch.network.test.ts::C-fa65851b: an import-equals declaration is a value import` (task 3.1): passed
- `test.arch.repo.test.ts::C-6bb73a15: violations are all listed in one run` (task 5.1): passed
- `test.arch.repo.test.ts::C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean` (task 5.1): passed
- `test.arch.repo.test.ts::C-dd8c8f9a: require look-alikes and test files pass` (task 5.1): passed
- `test.arch.repo.test.ts::C-eae7dab7: a require call is a value import of its specifier` (task 5.1): passed
- `test.arch.secrets.test.ts::C-58d38ea1: secret look-alikes pass while a real key is still reported` (task 4.1): passed
- `test.arch.secrets.test.ts::C-bb0edd4e: an unavailable git fails the scan loudly` (task 4.2): passed
- `test.arch.secrets.test.ts::C-c63269ba: each secret kind is detected at its line without echoing the text` (task 4.1): passed
- `test.arch.secrets.test.ts::C-e7ed48e1: the file list covers tracked and untracked files only` (task 4.2): passed
- `test.arch.sources.test.ts::C-18aa910d resolveSpecifier resolves relative imports against the importing file` (task 1.1): passed
- `test.arch.sources.test.ts::C-2073476a require forms are found as value imports with their flags` (task 1.2): passed
- `test.arch.sources.test.ts::C-b5e05684 import forms are found with their lines, type-only and dynamic flags` (task 1.2): passed
- `test.arch.sources.test.ts::C-ec6975cf formatViolation names file, line, code and message for any code` (task 1.1): passed
- `test.arch.sources.test.ts::C-ec6975cf sortViolations orders by file, then line, then code` (task 1.1): passed
- `test.arch.sources.test.ts::C-f0665065 readSnapshot reads the source files of a real directory without symlinks` (task 1.1): passed

## Guard events

- guard.violation: test/arch/modules.ts
