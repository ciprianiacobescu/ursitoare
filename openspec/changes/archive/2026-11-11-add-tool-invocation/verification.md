# Verification: openspec:add-tool-invocation: PASS (round 1)

traceability: 18/18 criteria covered by a discriminating test

- Base: `99bc2d7761a93dcaecdefd38529586fba3ce784b`
- Head: `a3a5c7225aa4ced093483c5b10e6e6c80da7149b`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 7 call(s), judged in 2 parts, prompt sha256 `b01f3d51fe6e00fb8d71832765963320405ed0df480f86a8a37af947ca91d11a`
  - part 1: 19 file(s), 117649 characters, profile nemotron-judge, reply repaired
  - part 2: 16 file(s), 73036 characters, profile nemotron-judge, reply valid
- Judge replies of nemotron-judge (this unit, all rounds): valid 3, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@99bc2d7761 contained |
| 1 | integrity | ok | 852.9 | 11 sub-checks (+2 unfrozen by human answers); scope: 47 changed file(s) |
| 2 | build | ok | 28.3 |  |
| 3 | tests | ok | 338.8 |  |
| 4 | traceability | ok | 0.2 | 18/18 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/hooks/block-runner.ts, src/interpreter/hooks/pipeline.ts, src/interpreter/hooks/types.ts and 11 more |
| 8 | s1 judge | ok | 1.5 | 13/18 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 1758.0 | 7 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261111T1130Z-3d7c/019-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261111T1130Z-3d7c/020-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261111T1130Z-3d7c/021-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261111T1130Z-3d7c/022-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261111T1130Z-3d7c/023-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261111T1130Z-3d7c/024-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261111T1130Z-3d7c/025-e2e.log |

## Files by part

- part 1: src/interpreter/approvals-path.test.ts (5522 characters)
- part 1: src/interpreter/hooks/authorize.test.ts (12747 characters)
- part 1: src/interpreter/runtimes/authorize.test.ts (13452 characters)
- part 1: src/runtimes/invoke/authorize.db.test.ts (18667 characters)
- part 1: src/interpreter/authorize-rows.test.ts (8871 characters)
- part 1: src/interpreter/runtimes/block.ts (6083 characters)
- part 1: src/interpreter/hooks/block-runner.ts (5217 characters)
- part 1: src/credentials/egress-site.test.ts (784 characters)
- part 1: test/arch/egress-sites.test.ts (738 characters)
- part 1: src/interpreter/errors.ts (703 characters)
- part 1: src/interpreter/execute.ts (1511 characters)
- part 1: src/runtimes/invoke/exit13.db.test.ts (5508 characters)
- part 1: test/support/invoke-runs/harness.ts (15834 characters)
- part 1: test/support/invoke-runs/flows/hooked-pay.yaml (1109 characters)
- part 1: src/pdp/index.ts (410 characters)
- part 1: src/runtimes/index.ts (549 characters)
- part 1: test/support/invoke-runs/index.ts (2305 characters)
- part 1: src/runtimes/invoke/invoke.db.test.ts (12772 characters)
- part 1: test/support/invoke-runs/invoke-runs.test.ts (4867 characters)
- part 2: src/pdp/log.ts (987 characters)
- part 2: src/pdp/log-own-tx.db.test.ts (6068 characters)
- part 2: src/runtimes/invoke/path.ts (9103 characters)
- part 2: src/interpreter/hooks/pipeline.ts (715 characters)
- part 2: src/runtimes/invoke/policy-request.test.ts (8621 characters)
- part 2: src/runtimes/invoke/policy-runs.db.test.ts (17234 characters)
- part 2: test/support/invoke-runs/flows/read-then-pay.yaml (939 characters)
- part 2: test/support/README.md (878 characters)
- part 2: src/runtimes/invoke/request.test.ts (8674 characters)
- part 2: src/runtimes/invoke/request.ts (6669 characters)
- part 2: openspec/changes/add-tool-invocation/tasks.md (8215 characters)
- part 2: src/interpreter/hooks/types.ts (425 characters)
- part 2: src/interpreter/types.ts (985 characters)
- part 2: src/runtimes/invoke/types.ts (409 characters)
- part 2: test/support/invoke-runs/flows/untrusted-into-write.yaml (850 characters)
- part 2: src/interpreter/visit.ts (2264 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 2 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 10 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/credentials/egress-site.test.ts, src/interpreter/approvals-path.test.ts, src/interpreter/authorize-rows.test.ts, src/interpreter/errors.ts, src/interpreter/execute.ts (+25 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2259 of 2259 base tests pass on the unit's code with its 10 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/credentials/egress-site.test.ts kept at head for the run (task 1.1: unfrozen by Q-001)
- src/interpreter/hooks/authorize.test.ts kept at head for the run (task 2.2: unfrozen by Q-002)
- src/runtimes/invoke/invoke.db.test.ts kept at head for the run (task 3.3: unfrozen by Q-003)
- test/arch/egress-sites.test.ts kept at head for the run (task 1.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/interpreter/hooks/authorize.test.ts (task 2.2, unfrozen by Q-002 (delegate_override, claude-fable-5-1))
- src/runtimes/invoke/invoke.db.test.ts (task 3.3, unfrozen by Q-004 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-05285483 | interpreter › An invoker that authorizes is asked before the intent › Order, values, denial, replay and the unchanged M5 path | covered | src.interpreter.runtimes.authorize.test.ts::C-05285483 a replayed pay calls decided with its recorded decision id (passed, red_assertion); src.interpreter.runtimes.authorize.test.ts::C-05285483 an authorize denial ends the step before the gate and invoke (passed, red_assertion); src.interpreter.runt... | - | - |
| C-6ebe4f56 | interpreter › A block hook is authorised as a hook call › Taint of a hook's arguments, the default and the denial | covered | src.interpreter.hooks.authorize.test.ts::C-6ebe4f56 a generic authorize failure is tool_failed under fail and continue (passed, red_assertion); src.interpreter.hooks.authorize.test.ts::C-6ebe4f56 a send hook authorizes before the gate and the M5 path is unchanged (passed, red_assertion); src.interpr... | - | - |
| C-f15c9753 | interpreter › Rows carry the decision id › Fresh, replayed, denied and mock rows | covered | src.interpreter.authorize-rows.test.ts::C-f15c9753 a denied call writes the denial's decision id, an unbound tool none (passed, red_assertion); src.interpreter.authorize-rows.test.ts::C-f15c9753 a fresh live run writes the decision ids and a mock run writes null (passed, red_assertion); src.interpre... | - | - |
| C-fa51d2ff | interpreter › executeRun hands the path's approvals to every call › A path through an approval node | covered | src.interpreter.approvals-path.test.ts::C-fa51d2ff a rejected approval node reaches pay as a rejected approval (passed, red_assertion); src.interpreter.approvals-path.test.ts::C-fa51d2ff an approved approval node reaches pay as an approval and an invoker without authorize sees none (passed, red_asse... | - | 0.94 |
| C-6bc36306 | tool-invocation › toolRequest and blockResourceId are pure and fixed › Request and resource vectors | covered | src.runtimes.invoke.request.test.ts::C-6bc36306 INVOKE_LIMITS fix the token ttl and the entity cap (passed, red_assertion); src.runtimes.invoke.request.test.ts::C-6bc36306 blockResourceId is tenant flow node and optional hook (passed, red_assertion); src.runtimes.invoke.request.test.ts::C-6bc36306 t... | - | 0.78 |
| C-2a04f1cb | tool-invocation › The gateway has one more inventoried caller › Only request.ts is an egress site of runtimes | covered | src.runtimes.invoke.request.test.ts::C-2a04f1cb only request ts is an egress site of runtimes (passed, red_assertion) | - | 0.84 |
| C-19be51e3 | tool-invocation › The policy request carries the whole call context › Request vectors and approval vectors | covered | src.runtimes.invoke.policy-request.test.ts::C-19be51e3 invokeToolRequest I1 carries the whole call context (passed, red_assertion); src.runtimes.invoke.policy-request.test.ts::C-19be51e3 invokeToolRequest I2 checks a hook as a hook (passed, red_assertion); src.runtimes.invoke.policy-request.test.ts:... | - | 0.90 |
| C-0834e2d4 | tool-invocation › Authorization is recorded before anything is sent › A decision is recorded in a transaction of its own | covered | src.pdp.log-own-tx.db.test.ts::C-0834e2d4 a decision is recorded in a transaction of its own (passed, red_assertion) | - | 0.92 |
| C-f287b385 | tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised | covered | src.runtimes.invoke.authorize.db.test.ts::C-f287b385 a granted read is authorised (passed, red_assertion) | - | 0.92 |
| C-8b5cbc41 | tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons | covered | src.runtimes.invoke.authorize.db.test.ts::C-8b5cbc41 policy errors and an unrecorded decision deny with fixed reasons (passed, red_assertion) | - | 0.91 |
| C-c28f570f | tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order | covered | src.runtimes.invoke.authorize.db.test.ts::C-c28f570f a dependency that rejects before the check is a failed call, row R11 (passed, red_assertion); src.runtimes.invoke.authorize.db.test.ts::C-c28f570f each refusal reason in order, rows R1 to R10 R13 and R14 (passed, red_assertion); src.runtimes.invok... | - | 0.85 |
| C-17a3e8b7 | tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure | covered | src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a granted read is sent as one brokered request, row C1 (passed, red_assertion); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a missing or copied authorization is unauthorized, row C9 (passed, red_assertion); src.runtimes.invoke.invoke.db.test.ts... | - | - |
| C-5f1d4a7d | tool-invocation › A live run sends exactly what each permit allows › Exit 13, read-then-pay live with a granted layer | covered | src.runtimes.invoke.exit13.db.test.ts::C-5f1d4a7d a live run sends exactly what each permit allows (passed, red_assertion); test.support.invoke-runs.invoke-runs.test.ts::C-5f1d4a7d an unknown invoke run name is refused as unknown flow (passed, red_assertion); test.support.invoke-runs.invoke-runs.tes... | - | - |
| C-9baab7e2 | tool-invocation › A live run stops at a denied call › An ungranted pay is denied in a run with nothing sent | covered | src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent (passed, pre_satisfied, accepted by an agent through Q-007: the check was inconclusive) | - | 0.92 |
| C-9b030af8 | tool-invocation › A live run stops at a denied call › A policy error at pay fails the run | covered | src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run (passed, pre_satisfied, accepted by an agent through Q-007: the check was inconclusive) | - | 0.77 |
| C-068f45cf | tool-invocation › Untrusted data reaches the policy as untrusted › A missing taint, an untrusted read and a rewriting pre-hook | covered | src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook (passed, pre_satisfied, accepted by an agent through Q-007: the check was inconclusive) | - | 0.93 |
| C-6f15197c | tool-invocation › Grants bind to the confirmed node and rules see approvals › Exit 16 and 21, old fingerprint and payment above 1000 | covered | src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c exit 16 and 21, old fingerprint and payment above 1000 (passed, pre_satisfied, accepted by an agent through Q-007: the check was inconclusive) | - | 0.87 |
| C-a6f9dbd3 | tool-invocation › A hook call is checked as a hook › hooked-pay with a node grant and then a hook rule | covered | src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule (passed, pre_satisfied, accepted by an agent through Q-007: the check was inconclusive) | - | 0.92 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261110T1839Z-5522.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261110T1923Z-385d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261110T2145Z-bb63.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261110T2340Z-ed7a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261111T0201Z-212d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261111T0423Z-83d3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261111T0604Z-ccb1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261111T0619Z-85a5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261111T0816Z-8c7f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261111T1000Z-af7b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/.l4/ledger/r-20261111T1130Z-3d7c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-invocation/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/credentials/egress-site.test.ts` |  | none | imports no module of the repository |
| `src/interpreter/approvals-path.test.ts` |  | relevant | new test file |
| `src/interpreter/authorize-rows.test.ts` |  | relevant | new test file |
| `src/interpreter/errors.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/execute.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/authorize.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/block-runner.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/hooks/pipeline.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/types.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/runtimes/authorize.test.ts` |  | relevant | new test file |
| `src/interpreter/runtimes/block.ts` | interpreter | relevant | module `interpreter` is named in the spec |
| `src/interpreter/types.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/visit.ts` | interpreter | relevant | named in the spec |
| `src/pdp/index.ts` | pdp | relevant | named in the spec |
| `src/pdp/log-own-tx.db.test.ts` |  | relevant | new test file |
| `src/pdp/log.ts` | pdp | relevant | named in the spec |
| `src/runtimes/index.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/authorize.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/exit13.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/invoke.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/path.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/policy-request.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/policy-runs.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/request.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/request.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/types.ts` | runtimes | relevant | named in the spec |
| `test/arch/egress-sites.test.ts` |  | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/invoke-runs/flows/hooked-pay.yaml` | test | relevant | module `test` is named in the spec |
| `test/support/invoke-runs/flows/read-then-pay.yaml` | test | relevant | module `test` is named in the spec |
| `test/support/invoke-runs/flows/untrusted-into-write.yaml` | test | relevant | module `test` is named in the spec |
| `test/support/invoke-runs/harness.ts` | test | relevant | named in the spec |
| `test/support/invoke-runs/index.ts` | test | relevant | named in the spec |
| `test/support/invoke-runs/invoke-runs.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/interpreter/errors.ts, src/interpreter/execute.ts, src/interpreter/hooks/block-runner.ts, src/interpreter/hooks/pipeline.ts, src/interpreter/hooks/types.ts and 11 more

### Tests

2369 of 2369 passed, 0 failed, 0 errored, 0 skipped.
49 of 49 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-05285483 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-6ebe4f56 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-f15c9753 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-fa51d2ff | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6bc36306 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2a04f1cb | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-19be51e3 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0834e2d4 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f287b385 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8b5cbc41 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c28f570f | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-17a3e8b7 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-5f1d4a7d | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-9baab7e2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9b030af8 | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-068f45cf | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6f15197c | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a6f9dbd3 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-05285483 | interpreter › An invoker that authorizes is asked before the intent › Order, values, denial, replay and the unchanged M5 path | pass | pass | the judge passed it and a discriminating test passes |
| C-6ebe4f56 | interpreter › A block hook is authorised as a hook call › Taint of a hook's arguments, the default and the denial | pass | pass | the judge passed it and a discriminating test passes |
| C-f15c9753 | interpreter › Rows carry the decision id › Fresh, replayed, denied and mock rows | pass | pass | the judge passed it and a discriminating test passes |
| C-fa51d2ff | interpreter › executeRun hands the path's approvals to every call › A path through an approval node | pass | pass | the judge passed it and a discriminating test passes |
| C-6bc36306 | tool-invocation › toolRequest and blockResourceId are pure and fixed › Request and resource vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-2a04f1cb | tool-invocation › The gateway has one more inventoried caller › Only request.ts is an egress site of runtimes | pass | pass | the judge passed it and a discriminating test passes |
| C-19be51e3 | tool-invocation › The policy request carries the whole call context › Request vectors and approval vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-0834e2d4 | tool-invocation › Authorization is recorded before anything is sent › A decision is recorded in a transaction of its own | pass | pass | the judge passed it and a discriminating test passes |
| C-f287b385 | tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised | pass | pass | the judge passed it and a discriminating test passes |
| C-8b5cbc41 | tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons | pass | pass | the judge passed it and a discriminating test passes |
| C-c28f570f | tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order | pass | pass | the judge passed it and a discriminating test passes |
| C-17a3e8b7 | tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure | pass | pass | the judge passed it and a discriminating test passes |
| C-5f1d4a7d | tool-invocation › A live run sends exactly what each permit allows › Exit 13, read-then-pay live with a granted layer | pass | pass | the judge passed it and a discriminating test passes |
| C-9baab7e2 | tool-invocation › A live run stops at a denied call › An ungranted pay is denied in a run with nothing sent | pass | pass | the judge passed it and a discriminating test passes |
| C-9b030af8 | tool-invocation › A live run stops at a denied call › A policy error at pay fails the run | pass | pass | the judge passed it and a discriminating test passes |
| C-068f45cf | tool-invocation › Untrusted data reaches the policy as untrusted › A missing taint, an untrusted read and a rewriting pre-hook | pass | pass | the judge passed it and a discriminating test passes |
| C-6f15197c | tool-invocation › Grants bind to the confirmed node and rules see approvals › Exit 16 and 21, old fingerprint and payment above 1000 | pass | pass | the judge passed it and a discriminating test passes |
| C-a6f9dbd3 | tool-invocation › A hook call is checked as a hook › hooked-pay with a node grant and then a hook rule | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.interpreter.approvals-path.test.ts::C-fa51d2ff a rejected approval node reaches pay as a rejected approval` (task 2.3): passed
- `src.interpreter.approvals-path.test.ts::C-fa51d2ff an approved approval node reaches pay as an approval and an invoker without authorize sees none` (task 2.3): passed
- `src.interpreter.authorize-rows.test.ts::C-f15c9753 a denied call writes the denial's decision id, an unbound tool none` (task 2.3): passed
- `src.interpreter.authorize-rows.test.ts::C-f15c9753 a fresh live run writes the decision ids and a mock run writes null` (task 2.3): passed
- `src.interpreter.authorize-rows.test.ts::C-f15c9753 replays over recorded values leave the same decision ids` (task 2.3): passed
- `src.interpreter.hooks.authorize.test.ts::C-6ebe4f56 a generic authorize failure is tool_failed under fail and continue` (task 2.2): passed
- `src.interpreter.hooks.authorize.test.ts::C-6ebe4f56 a send hook authorizes before the gate and the M5 path is unchanged` (task 2.2): passed
- `src.interpreter.hooks.authorize.test.ts::C-6ebe4f56 an authorize denial fails the hook whatever on_error says` (task 2.2): passed
- `src.interpreter.hooks.authorize.test.ts::C-6ebe4f56 argsTaint of the raw with value supplies the authorize taint` (task 2.2): passed
- `src.interpreter.runtimes.authorize.test.ts::C-05285483 a replayed pay calls decided with its recorded decision id` (task 2.1): passed
- `src.interpreter.runtimes.authorize.test.ts::C-05285483 an authorize denial ends the step before the gate and invoke` (task 2.1): passed
- `src.interpreter.runtimes.authorize.test.ts::C-05285483 lookup authorizes with an undefined taint and marks its step value` (task 2.1): passed
- `src.interpreter.runtimes.authorize.test.ts::C-05285483 pay authorizes inside its first step before the gate and records the decision id` (task 2.1): passed
- `src.interpreter.runtimes.authorize.test.ts::C-05285483 toInterpreterError accepts the INTERPRETER_TOOL_DENIED code` (task 2.1): passed
- `src.pdp.log-own-tx.db.test.ts::C-0834e2d4 a decision is recorded in a transaction of its own` (task 3.1): passed
- `src.runtimes.invoke.authorize.db.test.ts::C-8b5cbc41 policy errors and an unrecorded decision deny with fixed reasons` (task 3.2): passed
- `src.runtimes.invoke.authorize.db.test.ts::C-c28f570f a dependency that rejects before the check is a failed call, row R11` (task 3.2): passed
- `src.runtimes.invoke.authorize.db.test.ts::C-c28f570f each refusal reason in order, rows R1 to R10 R13 and R14` (task 3.2): passed
- `src.runtimes.invoke.authorize.db.test.ts::C-c28f570f the approver of a rejected or null approval is not loaded, row R15` (task 3.2): passed
- `src.runtimes.invoke.authorize.db.test.ts::C-c28f570f the initiator is loaded on each authorize and the version once, row R12` (task 3.2): passed
- `src.runtimes.invoke.authorize.db.test.ts::C-f287b385 a granted read is authorised` (task 3.2): passed
- `src.runtimes.invoke.exit13.db.test.ts::C-5f1d4a7d a live run sends exactly what each permit allows` (task 4.1): passed
- `src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a granted read is sent as one brokered request, row C1` (task 3.3): passed
- `src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a missing or copied authorization is unauthorized, row C9` (task 3.3): passed
- `src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a redirect is not followed and a non JSON body fails, rows C4 to C6` (task 3.3): passed
- `src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a rejected send fails at the send stage, row C8` (task 3.3): passed
- `src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a rejected token request fails at the token stage, row C7` (task 3.3): passed
- `src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 an authorization is consumed by its invoke, row C10` (task 3.3): passed
- `src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 an upstream status other than 2xx fails the call, rows C2 and C3` (task 3.3): passed
- `src.runtimes.invoke.policy-request.test.ts::C-19be51e3 invokeToolRequest I1 carries the whole call context` (task 1.2): passed
- `src.runtimes.invoke.policy-request.test.ts::C-19be51e3 invokeToolRequest I2 checks a hook as a hook` (task 1.2): passed
- `src.runtimes.invoke.policy-request.test.ts::C-19be51e3 invokeToolRequest I3 defaults an absent taint to untrusted` (task 1.2): passed
- `src.runtimes.invoke.policy-request.test.ts::C-19be51e3 invokeToolRequest I4 cuts the entities at 24` (task 1.2): passed
- `src.runtimes.invoke.policy-request.test.ts::C-19be51e3 pdpApprovals gives nothing for no approval or only a rejection` (task 1.2): passed
- `src.runtimes.invoke.policy-request.test.ts::C-19be51e3 pdpApprovals groups approved approvers per held role` (task 1.2): passed
- `src.runtimes.invoke.policy-runs.db.test.ts::C-068f45cf a missing taint, an untrusted read and a rewriting pre-hook` (task 4.2): passed
- `src.runtimes.invoke.policy-runs.db.test.ts::C-6f15197c exit 16 and 21, old fingerprint and payment above 1000` (task 4.2): passed
- `src.runtimes.invoke.policy-runs.db.test.ts::C-9b030af8 a policy error at pay fails the run` (task 4.2): passed
- `src.runtimes.invoke.policy-runs.db.test.ts::C-9baab7e2 an ungranted pay is denied in a run with nothing sent` (task 4.2): passed
- `src.runtimes.invoke.policy-runs.db.test.ts::C-a6f9dbd3 hooked-pay with a node grant and then a hook rule` (task 4.2): passed
- `src.runtimes.invoke.request.test.ts::C-2a04f1cb only request ts is an egress site of runtimes` (task 1.1): passed
- `src.runtimes.invoke.request.test.ts::C-6bc36306 INVOKE_LIMITS fix the token ttl and the entity cap` (task 1.1): passed
- `src.runtimes.invoke.request.test.ts::C-6bc36306 blockResourceId is tenant flow node and optional hook` (task 1.1): passed
- `src.runtimes.invoke.request.test.ts::C-6bc36306 toolRequest builds the V1 to V6 request and egress vectors` (task 1.1): passed
- `src.runtimes.invoke.request.test.ts::C-6bc36306 toolRequest keeps the loopback host and sorts nested keys without mutating` (task 1.1): passed
- `test.support.invoke-runs.invoke-runs.test.ts::C-5f1d4a7d an unknown invoke run name is refused as unknown flow` (task 1.3): passed
- `test.support.invoke-runs.invoke-runs.test.ts::C-5f1d4a7d invoke run versions are validated and carry the fixed hash` (task 1.3): passed
- `test.support.invoke-runs.invoke-runs.test.ts::C-5f1d4a7d read-then-pay validates and untrusted-into-write is refused over the acme catalogue` (task 1.3): passed
- `test.support.invoke-runs.invoke-runs.test.ts::C-5f1d4a7d the invoke run fixtures list their three flows` (task 1.3): passed
