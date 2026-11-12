# Verification: openspec:add-dry-runs: PASS (round 2)

traceability: 13/13 criteria covered by a discriminating test

- Base: `6b961af4dc8b53870da6a1ee485b9a9f2bdd3bcb`
- Head: `d35769d8f21f9a1799d024785ef83e769b21c04d`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 2 call(s), judged in 2 parts, prompt sha256 `44912168e266488112dddee793e99d3129fcf9498a576ef127d30ca29d2f3c1f`
  - part 1: 15 file(s), 103115 characters, profile nemotron-judge, reply repaired
  - part 2: 16 file(s), 94624 characters, profile nemotron-judge, reply valid
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 4, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@6b961af4dc as d35769d8f2 (1 commit) |
| 1 | integrity | ok | 374.8 | 11 sub-checks; scope: 47 changed file(s) |
| 2 | build | ok | 42.7 |  |
| 3 | tests | ok | 484.1 |  |
| 4 | traceability | ok | 0.3 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/dry-run-routes.ts, src/api/index.ts, src/api/principal-loader.ts, src/api/run-decisions.ts, src/api/run-routes.ts and 8 more |
| 8 | s1 judge | ok | 0.7 | 11/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 386.9 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261112T0540Z-18c4/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261112T0540Z-18c4/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261112T0540Z-18c4/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261112T0540Z-18c4/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261112T0540Z-18c4/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261112T0540Z-18c4/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261112T0540Z-18c4/010-e2e.log |

## Files by part

- part 1: src/runtimes/invoke/dry-run.db.test.ts (20662 characters)
- part 1: src/runtimes/invoke/dry-run-invokers.test.ts (12903 characters)
- part 1: src/api/dry-run-me.test.ts (3625 characters)
- part 1: src/api/dry-run-refusals.test.ts (13938 characters)
- part 1: src/api/dry-run-routes.test.ts (10166 characters)
- part 1: src/api/dry-run-routes.ts (6794 characters)
- part 1: src/interpreter/policy/dry-runs.cedar (509 characters)
- part 1: test/support/invoke-runs/dry-runs.ts (6429 characters)
- part 1: src/interpreter/dry-runs-policy.test.ts (4267 characters)
- part 1: src/interpreter/fakes.test.ts (9657 characters)
- part 1: src/interpreter/fakes.ts (8780 characters)
- part 1: test/support/invoke-runs/harness.ts (2955 characters)
- part 1: src/api/index.ts (1251 characters)
- part 1: src/interpreter/index.ts (675 characters)
- part 1: src/runtimes/index.ts (504 characters)
- part 2: src/main.dryruns.test.ts (15653 characters)
- part 2: src/main.flows.test.ts (1190 characters)
- part 2: src/main.runs.test.ts (918 characters)
- part 2: src/main.ts (3782 characters)
- part 2: docs/api/openapi.json (18318 characters)
- part 2: src/api/principal-loader.test.ts (3778 characters)
- part 2: src/api/principal-loader.ts (1193 characters)
- part 2: src/api/run-decisions.test.ts (3990 characters)
- part 2: src/api/run-decisions.ts (7590 characters)
- part 2: src/api/run-decisions-route.test.ts (15391 characters)
- part 2: src/api/run-routes.ts (738 characters)
- part 2: src/api/run-views-description.test.ts (1577 characters)
- part 2: src/runtimes/invoke/stub.test.ts (8534 characters)
- part 2: src/runtimes/invoke/stub.ts (4538 characters)
- part 2: openspec/changes/add-dry-runs/tasks.md (6886 characters)
- part 2: src/api/test-run-routes.ts (548 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 2 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 9 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/dry-run-me.test.ts, src/api/dry-run-refusals.test.ts, src/api/dry-run-routes.test.ts, src/api/dry-run-routes.ts, src/api/index.ts (+23 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2309 of 2309 base tests pass on the unit's code with its 13 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/main.flows.test.ts kept at head for the run (task 7.2: unfrozen by Q-001)
- src/main.runs.test.ts kept at head for the run (task 7.2: unfrozen by Q-002)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-a750a5ed | flow-testing › Fakes are checked against the flow's effect nodes and hooks before a run exists › Missing, read, unknown, schema and shape problems | covered | src.interpreter.fakes.test.ts::C-a750a5ed: F1 a valid row returns a copy of its input (passed, red_assertion); src.interpreter.fakes.test.ts::C-a750a5ed: F10 at most 50 problems (passed, red_assertion); src.interpreter.fakes.test.ts::C-a750a5ed: F11 entry rules equal those of checkMocks (passed, red... | - | - |
| C-0b1e8815 | flow-testing › The stub invoker reads live and answers every effect from its fake › A read goes live, an effect is answered by its fake and every failure has a fixed detail | covered | src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D1 stub mode loads fakes once and answers from them (passed, red_assertion); src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D2 other modes go to the fallback (passed, red_assertion); src.runtimes.invoke.dry-run-invokers.test.ts::C-0b... | - | - |
| C-b5d4959c | flow-testing › The dry-run endpoint starts a stub run as an author of the owner team › alice gets 202 and the fakes are the run's mocks; a replayed key returns the same run | covered | src.api.dry-run-routes.test.ts::C-b5d4959c a dry run answers 202 and stores the fakes as its mocks (passed, red_assertion); src.api.dry-run-routes.test.ts::C-b5d4959c a replayed dry run returns the same run and a reused key is refused (passed, red_assertion) | - | 0.93 |
| C-0478f271 | flow-testing › The dry-run endpoint refuses the caller, the version and the fakes before a run exists › Who may dry-run, and each refusal leaves no run | covered | src.api.dry-run-refusals.test.ts::C-0478f271 R1 to R6 callers and versions are refused before a run (passed, red_assertion); src.api.dry-run-refusals.test.ts::C-0478f271 R14 unavailable dependencies answer 503 without a run (passed, red_assertion); src.api.dry-run-refusals.test.ts::C-0478f271 R15 lo... | - | 0.76 |
| C-e792e555 | flow-testing › dry_run_flow is granted to authors of the owner team › The policy table and the capability list | covered | src.api.dry-run-me.test.ts::C-e792e555 dry_run_flow is a capability of the me route for authors only (passed, red_assertion); src.interpreter.dry-runs-policy.test.ts::C-e792e555 dry_run_flow is granted to authors of the owner team (passed, red_assertion) | - | 0.87 |
| C-716d6625 | flow-testing › A dry run reads live and stubs every effect › read-then-pay makes one live call, no pay call, and records both permits | covered | src.runtimes.invoke.dry-run.db.test.ts::C-716d6625 read-then-pay dry run makes one live call, no pay call, and records both permits (passed, red_assertion) | - | 0.92 |
| C-a924afdf | flow-testing › A dry run reads live and stubs every effect › Without a grant the read is denied, and a fake error fails the node | covered | src.runtimes.invoke.dry-run.db.test.ts::C-a924afdf a fake error fails the node and its message reaches no error or row (passed, red_assertion); src.runtimes.invoke.dry-run.db.test.ts::C-a924afdf without a grant the read is denied and nothing else happens (passed, red_assertion) | - | 0.92 |
| C-906311c3 | flow-testing › A dry run reads live and stubs every effect › A block hook is stubbed by its own effect, and its fake error follows on_error | covered | src.runtimes.invoke.dry-run.db.test.ts::C-906311c3 a block hook is stubbed by its own effect and needs its own fake (passed, red_assertion); src.runtimes.invoke.dry-run.db.test.ts::C-906311c3 a hook fake error follows on_error and reaches no error or row (passed, red_assertion) | - | 0.87 |
| C-70f6fb59 | flow-testing › The principal loader gives an active user's entity and nothing for anyone else › Entity of an active human and a service account, and null for the others | covered | src.api.principal-loader.test.ts::C-70f6fb59 principal loader gives an active user's entity and null for anyone else (passed, red_assertion) | - | 0.86 |
| C-4e5e400f | flow-testing › main wires the stub invoker and enables the route only when egress is configured › Egress wires the stub invoker and the route; its absence leaves both off | covered | src.main.dryruns.test.ts::C-4e5e400f with egress and no database the anonymous dry run is AUTHZ_UNAVAILABLE (passed, red_assertion); src.main.dryruns.test.ts::C-4e5e400f with egress and role api the dry run finds no interpreter (passed, red_assertion); src.main.dryruns.test.ts::C-4e5e400f with egres... | - | 0.88 |
| C-b7eca3f6 | runs-api › A decision view shows the recorded permit and nothing else › Allow, deny, extra and malformed permits | covered | src.api.run-decisions.test.ts::C-b7eca3f6 V1 and V2 a view shows the recorded values in the eight keys (passed, red_assertion); src.api.run-decisions.test.ts::C-b7eca3f6 V3 to V5 an extra permit member is dropped and a malformed permit is null (passed, red_assertion) | - | 0.82 |
| C-0276eeb1 | runs-api › The readers of a run list its policy decisions › The owner team and the initiator read; pages are bound to the run | covered | src.api.run-decisions-route.test.ts::C-0276eeb1 a run decision list without a pool answers RUNS_UNAVAILABLE (passed, red_assertion); src.api.run-decisions-route.test.ts::C-0276eeb1 a run decision list without an engine key serves one page (passed, red_assertion); src.api.run-decisions-route.test.ts:... | - | 0.70 |
| C-de41e7dd | runs-api › The OpenAPI document lists both routes and describes the hooks audit digest › The committed document holds both operations and the description | covered | src.api.run-views-description.test.ts::C-de41e7dd the steps 200 schema carries the hooks audit digest description (passed, red_assertion) | - | 0.81 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261111T1319Z-41cb.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261111T1548Z-e289.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261111T1815Z-a631.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261111T2106Z-07ee.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261111T2128Z-f396.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261111T2258Z-4f7d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261112T0041Z-f045.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261112T0042Z-cf7b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261112T0304Z-c0f4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261112T0305Z-c40d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/.l4/ledger/r-20261112T0529Z-f865.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-dry-runs/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/dry-run-me.test.ts` |  | relevant | new test file |
| `src/api/dry-run-refusals.test.ts` |  | relevant | new test file |
| `src/api/dry-run-routes.test.ts` |  | relevant | new test file |
| `src/api/dry-run-routes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/principal-loader.test.ts` |  | relevant | new test file |
| `src/api/principal-loader.ts` | api | relevant | named in the spec |
| `src/api/run-decisions-route.test.ts` |  | relevant | new test file |
| `src/api/run-decisions.test.ts` |  | relevant | new test file |
| `src/api/run-decisions.ts` | api | relevant | named in the spec |
| `src/api/run-routes.ts` | api | relevant | named in the spec |
| `src/api/run-views-description.test.ts` |  | relevant | new test file |
| `src/api/test-run-routes.ts` | api | relevant | named in the spec |
| `src/interpreter/dry-runs-policy.test.ts` |  | relevant | new test file |
| `src/interpreter/fakes.test.ts` |  | relevant | new test file |
| `src/interpreter/fakes.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/policy/dry-runs.cedar` | interpreter | relevant | named in the spec |
| `src/main.dryruns.test.ts` |  | relevant | new test file |
| `src/main.flows.test.ts` |  | none | imports no module of the repository |
| `src/main.runs.test.ts` |  | none | imports no module of the repository |
| `src/main.ts` | main | relevant | named in the spec |
| `src/runtimes/index.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/dry-run-invokers.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/dry-run.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/stub.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/stub.ts` | runtimes | relevant | named in the spec |
| `test/support/invoke-runs/dry-runs.ts` | test | relevant | named in the spec |
| `test/support/invoke-runs/harness.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/dry-run-routes.ts, src/api/index.ts, src/api/principal-loader.ts, src/api/run-decisions.ts, src/api/run-routes.ts and 8 more

### Tests

2421 of 2421 passed, 0 failed, 0 errored, 0 skipped.
52 of 52 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-a750a5ed | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-0b1e8815 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b5d4959c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0478f271 | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e792e555 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-716d6625 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a924afdf | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-906311c3 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-70f6fb59 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4e5e400f | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b7eca3f6 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0276eeb1 | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-de41e7dd | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-a750a5ed | flow-testing › Fakes are checked against the flow's effect nodes and hooks before a run exists › Missing, read, unknown, schema and shape problems | pass | pass | the judge passed it and a discriminating test passes |
| C-0b1e8815 | flow-testing › The stub invoker reads live and answers every effect from its fake › A read goes live, an effect is answered by its fake and every failure has a fixed detail | pass | pass | the judge passed it and a discriminating test passes |
| C-b5d4959c | flow-testing › The dry-run endpoint starts a stub run as an author of the owner team › alice gets 202 and the fakes are the run's mocks; a replayed key returns the same run | pass | pass | the judge passed it and a discriminating test passes |
| C-0478f271 | flow-testing › The dry-run endpoint refuses the caller, the version and the fakes before a run exists › Who may dry-run, and each refusal leaves no run | pass | pass | the judge passed it and a discriminating test passes |
| C-e792e555 | flow-testing › dry_run_flow is granted to authors of the owner team › The policy table and the capability list | pass | pass | the judge passed it and a discriminating test passes |
| C-716d6625 | flow-testing › A dry run reads live and stubs every effect › read-then-pay makes one live call, no pay call, and records both permits | pass | pass | the judge passed it and a discriminating test passes |
| C-a924afdf | flow-testing › A dry run reads live and stubs every effect › Without a grant the read is denied, and a fake error fails the node | pass | pass | the judge passed it and a discriminating test passes |
| C-906311c3 | flow-testing › A dry run reads live and stubs every effect › A block hook is stubbed by its own effect, and its fake error follows on_error | pass | pass | the judge passed it and a discriminating test passes |
| C-70f6fb59 | flow-testing › The principal loader gives an active user's entity and nothing for anyone else › Entity of an active human and a service account, and null for the others | pass | pass | the judge passed it and a discriminating test passes |
| C-4e5e400f | flow-testing › main wires the stub invoker and enables the route only when egress is configured › Egress wires the stub invoker and the route; its absence leaves both off | pass | pass | the judge passed it and a discriminating test passes |
| C-b7eca3f6 | runs-api › A decision view shows the recorded permit and nothing else › Allow, deny, extra and malformed permits | pass | pass | the judge passed it and a discriminating test passes |
| C-0276eeb1 | runs-api › The readers of a run list its policy decisions › The owner team and the initiator read; pages are bound to the run | pass | pass | the judge passed it and a discriminating test passes |
| C-de41e7dd | runs-api › The OpenAPI document lists both routes and describes the hooks audit digest › The committed document holds both operations and the description | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] checkFakes rows F12 and F14 are not pinned by any test (spec gap) (criterion C-a750a5ed): The spec scenario requires checkFakes on rows F12 (a code-hook key -> unknown_node) and F14 (lookup:post:detour -> unknown_node), but the gate report traceability for C-a750a5ed covers only F1-F11, F12b and F13; F12 and F14 are listed as 'derived, not run'. Those inputs are unpinned, so two reasonable implementations could differ on them without any test catching it.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.dry-run-me.test.ts::C-e792e555 dry_run_flow is a capability of the me route for authors only` (task 3.1): passed
- `src.api.dry-run-refusals.test.ts::C-0478f271 R1 to R6 callers and versions are refused before a run` (task 4.1): passed
- `src.api.dry-run-refusals.test.ts::C-0478f271 R14 unavailable dependencies answer 503 without a run` (task 4.1): passed
- `src.api.dry-run-refusals.test.ts::C-0478f271 R15 load failures answer 500 without the message` (task 4.1): passed
- `src.api.dry-run-refusals.test.ts::C-0478f271 R7 to R13 fakes and bodies are validated before a run` (task 4.1): passed
- `src.api.dry-run-routes.test.ts::C-b5d4959c a dry run answers 202 and stores the fakes as its mocks` (task 4.1): passed
- `src.api.dry-run-routes.test.ts::C-b5d4959c a replayed dry run returns the same run and a reused key is refused` (task 4.1): passed
- `src.api.principal-loader.test.ts::C-70f6fb59 principal loader gives an active user's entity and null for anyone else` (task 7.1): passed
- `src.api.run-decisions-route.test.ts::C-0276eeb1 a run decision list without a pool answers RUNS_UNAVAILABLE` (task 5.1): passed
- `src.api.run-decisions-route.test.ts::C-0276eeb1 a run decision list without an engine key serves one page` (task 5.1): passed
- `src.api.run-decisions-route.test.ts::C-0276eeb1 run decision pages are bound to the run` (task 5.1): passed
- `src.api.run-decisions-route.test.ts::C-0276eeb1 the owner team and the initiator read a run's decisions` (task 5.1): passed
- `src.api.run-decisions.test.ts::C-b7eca3f6 V1 and V2 a view shows the recorded values in the eight keys` (task 5.1): passed
- `src.api.run-decisions.test.ts::C-b7eca3f6 V3 to V5 an extra permit member is dropped and a malformed permit is null` (task 5.1): passed
- `src.api.run-views-description.test.ts::C-de41e7dd the steps 200 schema carries the hooks audit digest description` (task 8.1): passed
- `src.interpreter.dry-runs-policy.test.ts::C-e792e555 dry_run_flow is granted to authors of the owner team` (task 3.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F1 a valid row returns a copy of its input` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F10 at most 50 problems` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F11 entry rules equal those of checkMocks` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F12b a pay hook on a read node needs its own fake when reachable` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F13 a throwing catalogue gives one shape problem and null fakes` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F2 F3 an effect node with no or an empty list is missing` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F4 a read or switch node takes no fake` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F5 unknown keys are sorted and __proto__ is one` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F6 an output that breaks the output schema is a schema problem` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F7 malformed lists, entries and fakes are shape problems` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F8 an unreachable effect node needs no fake` (task 1.1): passed
- `src.interpreter.fakes.test.ts::C-a750a5ed: F9 every reachable effect node is required` (task 1.1): passed
- `src.main.dryruns.test.ts::C-4e5e400f with egress and no database the anonymous dry run is AUTHZ_UNAVAILABLE` (task 7.2): passed
- `src.main.dryruns.test.ts::C-4e5e400f with egress and role api the dry run finds no interpreter` (task 7.2): passed
- `src.main.dryruns.test.ts::C-4e5e400f with egress main wires the stub invoker and starts a stub run` (task 7.2): passed
- `src.main.dryruns.test.ts::C-4e5e400f without egress main defines the dry run route and refuses it` (task 7.2): passed
- `src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D1 stub mode loads fakes once and answers from them` (task 2.1): passed
- `src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D2 other modes go to the fallback` (task 2.1): passed
- `src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D3 null or non-object fakes are unavailable` (task 2.1): passed
- `src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D4 authorize is forwarded to the live invoker` (task 2.1): passed
- `src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D5 a failing payload load is unavailable and not kept` (task 2.1): passed
- `src.runtimes.invoke.dry-run-invokers.test.ts::C-0b1e8815 D6 a failing live invoker is unavailable` (task 2.1): passed
- `src.runtimes.invoke.dry-run.db.test.ts::C-716d6625 read-then-pay dry run makes one live call, no pay call, and records both permits` (task 6.1): passed
- `src.runtimes.invoke.dry-run.db.test.ts::C-906311c3 a block hook is stubbed by its own effect and needs its own fake` (task 6.1): passed
- `src.runtimes.invoke.dry-run.db.test.ts::C-906311c3 a hook fake error follows on_error and reaches no error or row` (task 6.1): passed
- `src.runtimes.invoke.dry-run.db.test.ts::C-a924afdf a fake error fails the node and its message reaches no error or row` (task 6.1): passed
- `src.runtimes.invoke.dry-run.db.test.ts::C-a924afdf without a grant the read is denied and nothing else happens` (task 6.1): passed
- `src.runtimes.invoke.stub.test.ts::C-0b1e8815 T1 a read goes live with the same call and context` (task 2.1): passed
- `src.runtimes.invoke.stub.test.ts::C-0b1e8815 T2 an effect is answered by a copy of its fake` (task 2.1): passed
- `src.runtimes.invoke.stub.test.ts::C-0b1e8815 T3 a fake error has its code and no message` (task 2.1): passed
- `src.runtimes.invoke.stub.test.ts::C-0b1e8815 T4 an exhausted list is fake_exhausted` (task 2.1): passed
- `src.runtimes.invoke.stub.test.ts::C-0b1e8815 T5 a hook call reads its own fake key` (task 2.1): passed
- `src.runtimes.invoke.stub.test.ts::C-0b1e8815 T6 only reads go live` (task 2.1): passed
- `src.runtimes.invoke.stub.test.ts::C-0b1e8815 T7 authorize is forwarded only when the live invoker has one` (task 2.1): passed

## Guard events

- guard.test_tamper: test/zz-scratch-openapi.test.ts
