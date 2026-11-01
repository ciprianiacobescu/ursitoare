# Verification: openspec:add-test-catalogue: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `a7df1413125c1ed2922f6be9a5fef019a0ec230e`
- Head: `607f89ff27c93fad89bf86fcc0866f2e211a5c5a`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 3 call(s), judged in 3 parts, prompt sha256 `074bf17e51d5e73168b43141985a0403ddc3b5e22fa4d09d85f01b7da833e55c`
  - part 1: 26 file(s), 111010 characters, profile nemotron-judge, reply valid
  - part 2: 27 file(s), 113037 characters, profile nemotron-judge, reply valid
  - part 3: 8 file(s), 37280 characters, profile nemotron-judge, reply repaired
- Judge replies of nemotron-judge (this unit, all rounds): valid 2, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@a7df141312 as 607f89ff27 (4 commits) |
| 1 | integrity | ok | 101.3 | 11 sub-checks; scope: 63 changed file(s) |
| 2 | build | ok | 28.3 |  |
| 3 | tests | ok | 134.1 |  |
| 4 | traceability | ok | 0.1 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/support/catalogue/document.ts, test/support/catalogue/errors.ts, test/support/catalogue/flows.ts, test/support/catalogue/loader.ts, test/support/catalogue/references.ts and 1 more |
| 8 | s1 judge | ok | 0.6 | 7/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 420.9 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261101T0926Z-5f11/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261101T0926Z-5f11/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261101T0926Z-5f11/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261101T0926Z-5f11/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261101T0926Z-5f11/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261101T0926Z-5f11/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261101T0926Z-5f11/010-e2e.log |

## Files by part

- part 1: test/support/catalogue/blocks.v0.json (10731 characters)
- part 1: test/support/hook-flows/flows/c2-effect-post-hook.yaml (4080 characters)
- part 1: test/support/catalogue/document.test.ts (8230 characters)
- part 1: test/support/catalogue/document.ts (6297 characters)
- part 1: test/support/catalogue/errors.ts (596 characters)
- part 1: test/support/hook-flows/flows/f-eff.yaml (949 characters)
- part 1: test/support/hook-flows/flows/f-ret.yaml (936 characters)
- part 1: test/support/hook-flows/flows/f-ret-exhausted.yaml (906 characters)
- part 1: test/support/catalogue/flows.test.ts (7847 characters)
- part 1: test/support/catalogue/flows.ts (2883 characters)
- part 1: test/support/hook-flows/hook-flows.test.ts (7924 characters)
- part 1: test/support/hook-flows/index.ts (3141 characters)
- part 1: test/support/catalogue/loader.test.ts (4705 characters)
- part 1: test/support/catalogue/loader.ts (3438 characters)
- part 1: test/support/hook-flows/flows/m-h0.yaml (3815 characters)
- part 1: test/support/hook-flows/flows/m-h1.yaml (4023 characters)
- part 1: test/support/hook-flows/flows/m-h2.yaml (4215 characters)
- part 1: test/support/hook-flows/flows/static/n-block.yaml (3999 characters)
- part 1: test/support/hook-flows/flows/static/n-dominance-hook.yaml (4138 characters)
- part 1: test/support/hook-flows/flows/static/n-no-match.yaml (4024 characters)
- part 1: test/support/hook-flows/flows/static/n-retry-scope.yaml (4030 characters)
- part 1: test/support/hook-flows/flows/static/n-retry-scope-human.yaml (4041 characters)
- part 1: test/support/hook-flows/flows/static/n-route-self.yaml (4030 characters)
- part 1: test/support/hook-flows/flows/static/n-route-target.yaml (4031 characters)
- part 1: test/support/hook-flows/flows/static/n-schema.yaml (3967 characters)
- part 1: test/support/hook-flows/flows/static/n-schema-routes-pre.yaml (4034 characters)
- part 2: test/support/catalogue/references.test.ts (5355 characters)
- part 2: test/support/catalogue/references.ts (5222 characters)
- part 2: test/support/catalogue/flows/rf-1-core.yaml (3089 characters)
- part 2: test/support/catalogue/flows/rf-1-core-approval.yaml (3455 characters)
- part 2: test/support/catalogue/flows/rf-1-invoice-intake.yaml (3710 characters)
- part 2: test/support/hook-flows/flows/s02-pre-mutate.yaml (4118 characters)
- part 2: test/support/hook-flows/flows/s03-post-mutate.yaml (4083 characters)
- part 2: test/support/hook-flows/flows/s04-pre-skip.yaml (4089 characters)
- part 2: test/support/hook-flows/flows/s06-next-redirect.yaml (4200 characters)
- part 2: test/support/hook-flows/flows/s07-next-block-hook.yaml (4235 characters)
- part 2: test/support/hook-flows/flows/s08-from-logic.yaml (4164 characters)
- part 2: test/support/hook-flows/flows/s09-onion.yaml (4531 characters)
- part 2: test/support/hook-flows/flows/s10-park-hooks.yaml (4542 characters)
- part 2: test/support/hook-flows/flows/s10b-timeout-post.yaml (4841 characters)
- part 2: test/support/hook-flows/flows/s11-end-pre.yaml (4001 characters)
- part 2: test/support/hook-flows/flows/s12a-fail.yaml (4020 characters)
- part 2: test/support/hook-flows/flows/s12b-block-onerror.yaml (4080 characters)
- part 2: test/support/hook-flows/flows/s13-undeclared-route.yaml (4069 characters)
- part 2: test/support/hook-flows/flows/s14-unsafe-redirect.yaml (4057 characters)
- part 2: test/support/hook-flows/flows/s14c-cycle.yaml (3975 characters)
- part 2: test/support/hook-flows/flows/s15-guard.yaml (4152 characters)
- part 2: test/support/hook-flows/flows/s15-guard-redirect.yaml (4508 characters)
- part 2: test/support/hook-flows/flows/s16a-raise.yaml (4016 characters)
- part 2: test/support/hook-flows/flows/s16b-lower.yaml (4066 characters)
- part 2: test/support/hook-flows/flows/s17-taint.yaml (4259 characters)
- part 2: test/support/hook-flows/flows/s18a-skip-human.yaml (4062 characters)
- part 2: test/support/hook-flows/flows/s18b-rewrite-decision.yaml (4138 characters)
- part 3: test/support/hook-flows/flows/s18c-skip-effect.yaml (4055 characters)
- part 3: test/support/hook-flows/flows/s18d-routes-on-human.yaml (4026 characters)
- part 3: test/support/hook-flows/flows/s19-block-hook-pep.yaml (4115 characters)
- part 3: openspec/changes/add-test-catalogue/tasks.md (8603 characters)
- part 3: test/support/hook-flows/flows/x1a-retry-pay.yaml (4117 characters)
- part 3: test/support/hook-flows/flows/x1b-retry-raise.yaml (4141 characters)
- part 3: test/support/hook-flows/flows/x2-skip-taint.yaml (4108 characters)
- part 3: test/support/hook-flows/flows/x3-gate-bypass.yaml (4115 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 5 task(s): red and green compared |
| test path freeze | ok | 5 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/catalogue/document.test.ts, test/support/catalogue/document.ts, test/support/catalogue/errors.ts, test/support/catalogue/flows.test.ts, test/support/catalogue/flows.ts (+6 more) |
| tdd history | ok | 5 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1187 of 1187 base tests pass on the unit's code with its 5 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-086d4027 | test-catalogue › The test catalogue document holds the 20 mock blocks › Twenty blocks keep their effects and taint sources | covered | test.support.catalogue.document.test.ts::C-086d4027 Twenty blocks keep their effects and taint sources (passed, red_assertion) | - | - |
| C-6aa2b40c | test-catalogue › The test catalogue document holds the 20 mock blocks › A malformed document is refused with a code | covered | test.support.catalogue.document.test.ts::C-6aa2b40c A malformed document is refused with a code (passed, red_assertion) | - | - |
| C-aac9afa1 | test-catalogue › The loader answers the Catalogue interface from the document › Block lookups answer exactly | covered | test.support.catalogue.loader.test.ts::C-aac9afa1 Block lookups answer exactly (passed, red_assertion) | - | - |
| C-6a2eb6e4 | test-catalogue › The loader answers the Catalogue interface from the document › Roles, profiles, delegate targets and flows answer from the document | covered | test.support.catalogue.loader.test.ts::C-6a2eb6e4 Roles profiles delegate targets and flows answer from the document (passed, red_assertion) | - | - |
| C-5c24e56a | test-catalogue › Flow references are checked against a catalogue › Unknown names are listed, known names are not | covered | test.support.catalogue.references.test.ts::C-5c24e56a Unknown names are listed known names are not (passed, red_assertion) | - | 0.94 |
| C-f90d0cf1 | test-catalogue › Flow references are checked against a catalogue › Reachability follows successors and avoids a node | covered | test.support.catalogue.references.test.ts::C-f90d0cf1 Reachability follows successors and avoids a node (passed, red_assertion) | - | 0.92 |
| C-89a07807 | test-catalogue › The RF-1 flows are shipped and loaded by name › The three RF-1 flows have the shipped shape | covered | test.support.catalogue.flows.test.ts::C-89a07807 The three RF-1 flows have the shipped shape (passed, red_assertion) | - | - |
| C-5f9214ef | test-catalogue › The RF-1 flows are shipped and loaded by name › Only the approval variant forces approval before pay | covered | test.support.catalogue.flows.test.ts::C-5f9214ef Only the approval variant forces approval before pay (passed, red_assertion) | - | 0.88 |
| C-93a6f521 | test-catalogue › The RF-1 flows are shipped and loaded by name › Flow text is parsed or refused, and only shipped names are read | covered | test.support.catalogue.flows.test.ts::C-93a6f521 Flow text is parsed or refused and only shipped names are read (passed, red_assertion) | - | 0.95 |
| C-f837a8fc | test-catalogue › The RF-1 flows are shipped and loaded by name › Content hashes are stable and distinct | covered | test.support.catalogue.flows.test.ts::C-f837a8fc Content hashes are stable and distinct (passed, red_assertion) | - | 0.93 |
| C-c44c4520 | test-catalogue › The hook flows are shipped and loaded by name › The hook flows are listed, titled and readable | covered | test.support.hook-flows.hook-flows.test.ts::C-c44c4520 The hook flows are listed titled and readable (passed, red_assertion) | - | - |
| C-ff311e59 | test-catalogue › The hook flows are shipped and loaded by name › Unknown hook-flow names are refused | covered | test.support.hook-flows.hook-flows.test.ts::C-ff311e59 Unknown hook-flow names are refused (passed, red_assertion) | - | 0.93 |
| C-6fca27d8 | test-catalogue › Every shipped flow resolves against the test catalogue › All 48 shipped flows resolve | covered | test.support.hook-flows.hook-flows.test.ts::C-6fca27d8 All 48 shipped flows resolve (passed, red_assertion) | - | 0.90 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-test-catalogue/.l4/ledger/r-20261101T0748Z-de30.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-test-catalogue/.l4/ledger/r-20261101T0925Z-c893.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-test-catalogue/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/catalogue/blocks.v0.json` | test | relevant | named in the spec |
| `test/support/catalogue/document.test.ts` |  | relevant | new test file |
| `test/support/catalogue/document.ts` | test | relevant | named in the spec |
| `test/support/catalogue/errors.ts` | test | relevant | named in the spec |
| `test/support/catalogue/flows.test.ts` |  | relevant | new test file |
| `test/support/catalogue/flows.ts` | test | relevant | named in the spec |
| `test/support/catalogue/flows/rf-1-core-approval.yaml` | test | relevant | named in the spec |
| `test/support/catalogue/flows/rf-1-core.yaml` | test | relevant | named in the spec |
| `test/support/catalogue/flows/rf-1-invoice-intake.yaml` | test | relevant | named in the spec |
| `test/support/catalogue/loader.test.ts` |  | relevant | new test file |
| `test/support/catalogue/loader.ts` | test | relevant | named in the spec |
| `test/support/catalogue/references.test.ts` |  | relevant | new test file |
| `test/support/catalogue/references.ts` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/c2-effect-post-hook.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/f-eff.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/f-ret-exhausted.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/f-ret.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/m-h0.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/m-h1.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/m-h2.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s02-pre-mutate.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s03-post-mutate.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s04-pre-skip.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s06-next-redirect.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s07-next-block-hook.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s08-from-logic.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s09-onion.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s10-park-hooks.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s10b-timeout-post.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s11-end-pre.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s12a-fail.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s12b-block-onerror.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s13-undeclared-route.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s14-unsafe-redirect.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s14c-cycle.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s15-guard-redirect.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s15-guard.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s16a-raise.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s16b-lower.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s17-taint.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s18a-skip-human.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s18b-rewrite-decision.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s18c-skip-effect.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s18d-routes-on-human.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/s19-block-hook-pep.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-block.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-dominance-hook.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-no-match.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-retry-scope-human.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-retry-scope.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-route-self.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-route-target.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-schema-routes-pre.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/static/n-schema.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/x1a-retry-pay.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/x1b-retry-raise.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/x2-skip-taint.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/flows/x3-gate-bypass.yaml` | test | relevant | named in the spec |
| `test/support/hook-flows/hook-flows.test.ts` |  | relevant | new test file |
| `test/support/hook-flows/index.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/catalogue/document.ts, test/support/catalogue/errors.ts, test/support/catalogue/flows.ts, test/support/catalogue/loader.ts, test/support/catalogue/references.ts and 1 more

### Tests

1253 of 1253 passed, 0 failed, 0 errored, 0 skipped.
13 of 13 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-086d4027 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6aa2b40c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-aac9afa1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6a2eb6e4 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-5c24e56a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f90d0cf1 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-89a07807 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-5f9214ef | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-93a6f521 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f837a8fc | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c44c4520 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ff311e59 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6fca27d8 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-086d4027 | test-catalogue › The test catalogue document holds the 20 mock blocks › Twenty blocks keep their effects and taint sources | pass | pass | the judge passed it and a discriminating test passes |
| C-6aa2b40c | test-catalogue › The test catalogue document holds the 20 mock blocks › A malformed document is refused with a code | pass | pass | the judge passed it and a discriminating test passes |
| C-aac9afa1 | test-catalogue › The loader answers the Catalogue interface from the document › Block lookups answer exactly | pass | pass | the judge passed it and a discriminating test passes |
| C-6a2eb6e4 | test-catalogue › The loader answers the Catalogue interface from the document › Roles, profiles, delegate targets and flows answer from the document | pass | pass | the judge passed it and a discriminating test passes |
| C-5c24e56a | test-catalogue › Flow references are checked against a catalogue › Unknown names are listed, known names are not | pass | pass | the judge passed it and a discriminating test passes |
| C-f90d0cf1 | test-catalogue › Flow references are checked against a catalogue › Reachability follows successors and avoids a node | pass | pass | the judge passed it and a discriminating test passes |
| C-89a07807 | test-catalogue › The RF-1 flows are shipped and loaded by name › The three RF-1 flows have the shipped shape | pass | pass | the judge passed it and a discriminating test passes |
| C-5f9214ef | test-catalogue › The RF-1 flows are shipped and loaded by name › Only the approval variant forces approval before pay | pass | pass | the judge passed it and a discriminating test passes |
| C-93a6f521 | test-catalogue › The RF-1 flows are shipped and loaded by name › Flow text is parsed or refused, and only shipped names are read | pass | pass | the judge passed it and a discriminating test passes |
| C-f837a8fc | test-catalogue › The RF-1 flows are shipped and loaded by name › Content hashes are stable and distinct | pass | pass | the judge passed it and a discriminating test passes |
| C-c44c4520 | test-catalogue › The hook flows are shipped and loaded by name › The hook flows are listed, titled and readable | pass | pass | the judge passed it and a discriminating test passes |
| C-ff311e59 | test-catalogue › The hook flows are shipped and loaded by name › Unknown hook-flow names are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-6fca27d8 | test-catalogue › Every shipped flow resolves against the test catalogue › All 48 shipped flows resolve | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.support.catalogue.document.test.ts::C-086d4027 Twenty blocks keep their effects and taint sources` (task 1.1): passed
- `test.support.catalogue.document.test.ts::C-6aa2b40c A malformed document is refused with a code` (task 1.1): passed
- `test.support.catalogue.flows.test.ts::C-5f9214ef Only the approval variant forces approval before pay` (task 4.1): passed
- `test.support.catalogue.flows.test.ts::C-89a07807 The three RF-1 flows have the shipped shape` (task 4.1): passed
- `test.support.catalogue.flows.test.ts::C-93a6f521 Flow text is parsed or refused and only shipped names are read` (task 4.1): passed
- `test.support.catalogue.flows.test.ts::C-f837a8fc Content hashes are stable and distinct` (task 4.1): passed
- `test.support.catalogue.loader.test.ts::C-6a2eb6e4 Roles profiles delegate targets and flows answer from the document` (task 2.1): passed
- `test.support.catalogue.loader.test.ts::C-aac9afa1 Block lookups answer exactly` (task 2.1): passed
- `test.support.catalogue.references.test.ts::C-5c24e56a Unknown names are listed known names are not` (task 3.1): passed
- `test.support.catalogue.references.test.ts::C-f90d0cf1 Reachability follows successors and avoids a node` (task 3.1): passed
- `test.support.hook-flows.hook-flows.test.ts::C-6fca27d8 All 48 shipped flows resolve` (task 5.1): passed
- `test.support.hook-flows.hook-flows.test.ts::C-c44c4520 The hook flows are listed titled and readable` (task 5.1): passed
- `test.support.hook-flows.hook-flows.test.ts::C-ff311e59 Unknown hook-flow names are refused` (task 5.1): passed
