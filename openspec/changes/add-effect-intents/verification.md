# Verification: openspec:add-effect-intents: PASS (round 1)

traceability: 12/12 criteria covered by a discriminating test

- Base: `39485a55fa40c234654221c3b38fc31693d68665`
- Head: `cf764470819f08aeed4506d73dbfe6a5bfc783f0`
- Implementer profiles: deepseek-free
- Judge: kiro-judge, 1 call(s), prompt sha256 `f82127b0ace7eebf701e2e5de6e3ceb411cbabfba8ada175660a0aafea2ca05f`
- Judge replies of kiro-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): kiro-judge openai (declared), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@39485a55fa contained |
| 1 | integrity | ok | 181.7 | 11 sub-checks; scope: 26 changed file(s) |
| 2 | build | ok | 33.3 |  |
| 3 | tests | ok | 272.9 |  |
| 4 | traceability | ok | 0.2 | 12/12 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/runs/index.ts, src/runs/intents/errors.ts, src/runs/intents/gate.ts, src/runs/intents/index.ts, src/runs/intents/key.ts and 4 more |
| 8 | s1 judge | ok | 0.8 | 7/12 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 90.2 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261105T0323Z-711f/091-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261105T0323Z-711f/092-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261105T0323Z-711f/093-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261105T0323Z-711f/094-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261105T0323Z-711f/095-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261105T0323Z-711f/096-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261105T0323Z-711f/097-e2e.log |

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
| suppressions | skipped | not checked: python only; changed files outside it: src/runs/index.ts, src/runs/intents/crash-once.test.ts, src/runs/intents/crash-steps.test.ts, src/runs/intents/crash-unsafe.test.ts, src/runs/intents/errors.ts (+14 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1526 of 1526 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-2ad12673 | idempotency › The idempotency key follows ADR-08 › Key vectors and refusals | covered | src.runs.intents.key.test.ts::C-2ad12673 idemKey hashes the ADR-08 vector and the five variants differ (passed, red_assertion); src.runs.intents.key.test.ts::C-2ad12673 idemKey refuses the twelve parts outside the key patterns (passed, red_assertion); src.runs.intents.key.test.ts::C-2ad12673 lineage... | - | 0.95 |
| C-6269a4a2 | idempotency › effect_intent is a tenant table with narrow privileges › Objects, isolation and privileges | covered | src.runs.intents.schema.test.ts::C-6269a4a2 effect_intent is a tenant table with narrow privileges (passed, red_assertion) | - | - |
| C-90bddcc2 | idempotency › recordIntent writes one row per key and keeps the first › Recording an intent once | covered | src.runs.intents.repository.test.ts::C-90bddcc2 recordIntent refuses bad input, tenant mismatches and a missing run (passed, red_assertion); src.runs.intents.repository.test.ts::C-90bddcc2 recordIntent stores the first row and getIntent reads it (passed, red_assertion); src.runs.intents.repository.t... | - | - |
| C-18338258 | idempotency › An intent moves only forward › Completing and marking unknown | covered | src.runs.intents.transitions.test.ts::C-18338258 completeIntent and markIntentUnknown refuse absent keys and bad input (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); src.runs.intents.transitions.test.ts::C-18338258 comp... | - | - |
| C-889a90ce | idempotency › The gate decides invoke, reuse or unknown from the stored state › The gate decides from the stored state | covered | src.runs.intents.gate.test.ts::C-889a90ce the gate parks unsafe intents, records modes and answers unknown (passed, red_assertion); src.runs.intents.gate.test.ts::C-889a90ce the gate records an intent, completes it and reuses the stored result (passed, red_assertion) | - | - |
| C-fa38a91a | idempotency › The gate decides invoke, reuse or unknown from the stored state › The key follows the lineage, not the run | covered | src.runs.intents.gate.test.ts::C-fa38a91a the key follows the lineage and the tenant, not the run (passed, red_assertion) | - | 0.93 |
| C-59e4a405 | idempotency › The gate inside the interpreter records the intent around the call › The gate inside executeRun, and a replay | covered | src.runs.intents.gate-run.test.ts::C-59e4a405 the gate inside executeRun records one intent and a replay changes nothing (passed, red_assertion) | - | - |
| C-f1071e75 | idempotency › Bad input and a failing database change nothing › Refusals and a pool that is down | covered | src.runs.intents.gate.test.ts::C-f1071e75 the gate refuses bad input, an absent after and a pool that is down (passed, red_assertion) | - | 0.94 |
| C-d6ae84fb | idempotency › A kill between the intent and the done gives one effect › Kill after the call, restart, one effect | covered | src.runs.intents.crash-once.test.ts::C-d6ae84fb: a kill after the call restarts with one payment effect (passed, red_assertion) | - | 0.93 |
| C-4d5f9934 | idempotency › A kill between the intent and the done gives one effect › Kill after the call of an unsafe tool parks as unknown | covered | src.runs.intents.crash-unsafe.test.ts::C-4d5f9934: a kill after an unsafe tool parks the run as unknown (passed, red_assertion) | - | 0.91 |
| C-8adccf33 | idempotency › Completed steps are not repeated across kills › Two kills, the work already done is not redone | covered | src.runs.intents.crash-steps.test.ts::C-8adccf33: two kills do not repeat the work already done (passed, red_assertion) | - | 0.94 |
| C-cbabec69 | idempotency › The runs module exports the intent API › The module exports | covered | src.runs.intents.index.test.ts::C-cbabec69 IntentError is an exported error carrying its code (passed, red_assertion); src.runs.intents.index.test.ts::C-cbabec69 The runs module exports the intent functions (passed, red_assertion) | - | 0.93 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-effect-intents/.l4/ledger/r-20261105T0203Z-c925.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-effect-intents/.l4/ledger/r-20261105T0323Z-711f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-effect-intents/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-effect-intents/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/db/migrations/0340_effect_intent.sql` | db | relevant | named in the spec |
| `src/runs/index.ts` | runs | relevant | named in the spec |
| `src/runs/intents/crash-once.test.ts` |  | relevant | new test file |
| `src/runs/intents/crash-steps.test.ts` |  | relevant | new test file |
| `src/runs/intents/crash-unsafe.test.ts` |  | relevant | new test file |
| `src/runs/intents/errors.ts` | runs | relevant | named in the spec |
| `src/runs/intents/gate-run.test.ts` |  | relevant | new test file |
| `src/runs/intents/gate.test.ts` |  | relevant | new test file |
| `src/runs/intents/gate.ts` | runs | relevant | named in the spec |
| `src/runs/intents/index.test.ts` |  | relevant | new test file |
| `src/runs/intents/index.ts` | runs | relevant | named in the spec |
| `src/runs/intents/key.test.ts` |  | relevant | new test file |
| `src/runs/intents/key.ts` | runs | relevant | named in the spec |
| `src/runs/intents/repository.test.ts` |  | relevant | new test file |
| `src/runs/intents/repository.ts` | runs | relevant | named in the spec |
| `src/runs/intents/schema.test.ts` |  | relevant | new test file |
| `src/runs/intents/transitions.test.ts` |  | relevant | new test file |
| `src/runs/intents/validate.ts` | runs | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/crash/flows/pay-once.yaml` | test | relevant | named in the spec |
| `test/support/crash/intents-scenario.ts` | test | relevant | named in the spec |
| `test/support/crash/pay-once.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/runs/index.ts, src/runs/intents/errors.ts, src/runs/intents/gate.ts, src/runs/intents/index.ts, src/runs/intents/key.ts and 4 more

### Tests

1602 of 1602 passed, 0 failed, 0 errored, 0 skipped.
20 of 20 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-2ad12673 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6269a4a2 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-90bddcc2 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-18338258 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-889a90ce | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-fa38a91a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-59e4a405 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-f1071e75 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d6ae84fb | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4d5f9934 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8adccf33 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cbabec69 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-2ad12673 | idempotency › The idempotency key follows ADR-08 › Key vectors and refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-6269a4a2 | idempotency › effect_intent is a tenant table with narrow privileges › Objects, isolation and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-90bddcc2 | idempotency › recordIntent writes one row per key and keeps the first › Recording an intent once | pass | pass | the judge passed it and a discriminating test passes |
| C-18338258 | idempotency › An intent moves only forward › Completing and marking unknown | pass | pass | the judge passed it and a discriminating test passes |
| C-889a90ce | idempotency › The gate decides invoke, reuse or unknown from the stored state › The gate decides from the stored state | pass | pass | the judge passed it and a discriminating test passes |
| C-fa38a91a | idempotency › The gate decides invoke, reuse or unknown from the stored state › The key follows the lineage, not the run | pass | pass | the judge passed it and a discriminating test passes |
| C-59e4a405 | idempotency › The gate inside the interpreter records the intent around the call › The gate inside executeRun, and a replay | pass | pass | the judge passed it and a discriminating test passes |
| C-f1071e75 | idempotency › Bad input and a failing database change nothing › Refusals and a pool that is down | pass | pass | the judge passed it and a discriminating test passes |
| C-d6ae84fb | idempotency › A kill between the intent and the done gives one effect › Kill after the call, restart, one effect | pass | pass | the judge passed it and a discriminating test passes |
| C-4d5f9934 | idempotency › A kill between the intent and the done gives one effect › Kill after the call of an unsafe tool parks as unknown | pass | pass | the judge passed it and a discriminating test passes |
| C-8adccf33 | idempotency › Completed steps are not repeated across kills › Two kills, the work already done is not redone | pass | pass | the judge passed it and a discriminating test passes |
| C-cbabec69 | idempotency › The runs module exports the intent API › The module exports | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.runs.intents.crash-once.test.ts::C-d6ae84fb: a kill after the call restarts with one payment effect` (task 6.1): passed
- `src.runs.intents.crash-steps.test.ts::C-8adccf33: two kills do not repeat the work already done` (task 6.1): passed
- `src.runs.intents.crash-unsafe.test.ts::C-4d5f9934: a kill after an unsafe tool parks the run as unknown` (task 6.1): passed
- `src.runs.intents.gate-run.test.ts::C-59e4a405 the gate inside executeRun records one intent and a replay changes nothing` (task 5.1): passed
- `src.runs.intents.gate.test.ts::C-889a90ce the gate parks unsafe intents, records modes and answers unknown` (task 4.1): passed
- `src.runs.intents.gate.test.ts::C-889a90ce the gate records an intent, completes it and reuses the stored result` (task 4.1): passed
- `src.runs.intents.gate.test.ts::C-f1071e75 the gate refuses bad input, an absent after and a pool that is down` (task 4.1): passed
- `src.runs.intents.gate.test.ts::C-fa38a91a the key follows the lineage and the tenant, not the run` (task 4.1): passed
- `src.runs.intents.index.test.ts::C-cbabec69 IntentError is an exported error carrying its code` (task 7.1): passed
- `src.runs.intents.index.test.ts::C-cbabec69 The runs module exports the intent functions` (task 7.1): passed
- `src.runs.intents.key.test.ts::C-2ad12673 idemKey hashes the ADR-08 vector and the five variants differ` (task 1.1): passed
- `src.runs.intents.key.test.ts::C-2ad12673 idemKey refuses the twelve parts outside the key patterns` (task 1.1): passed
- `src.runs.intents.key.test.ts::C-2ad12673 lineageOf returns the lineage of a run` (task 1.1): passed
- `src.runs.intents.repository.test.ts::C-90bddcc2 recordIntent refuses bad input, tenant mismatches and a missing run` (task 3.1): passed
- `src.runs.intents.repository.test.ts::C-90bddcc2 recordIntent stores the first row and getIntent reads it` (task 3.1): passed
- `src.runs.intents.repository.test.ts::C-90bddcc2 two concurrent recordIntent calls create exactly one row` (task 3.1): passed
- `src.runs.intents.schema.test.ts::C-6269a4a2 effect_intent is a tenant table with narrow privileges` (task 2.1): passed
- `src.runs.intents.transitions.test.ts::C-18338258 completeIntent and markIntentUnknown refuse absent keys and bad input` (task 3.2): passed
- `src.runs.intents.transitions.test.ts::C-18338258 completeIntent stores the result once and keeps a done row unchanged` (task 3.2): passed
- `src.runs.intents.transitions.test.ts::C-18338258 markIntentUnknown parks an intent and completeIntent finishes it` (task 3.2): passed
