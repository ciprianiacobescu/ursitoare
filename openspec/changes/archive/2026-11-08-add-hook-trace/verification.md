# Verification: openspec:add-hook-trace: PASS (round 1)

traceability: 8/8 criteria covered by a discriminating test

- Base: `a1da42715763f4a3492a1496e98d3711506eb1b5`
- Head: `902a06074a1c3318d2c2b68728f18a2c389a4bd8`
- Implementer profiles: glm, claude-sonnet, deepseek-free
- Judge: nemotron-judge, 2 call(s), prompt sha256 `1bc2a6d9cc9976a239263a7dd336bf34ca675ee5f13416b80afde0abfd804e1c`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), glm zhipu (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base merged: main@a1da427157 as 902a06074a (1 commit) |
| 1 | integrity | ok | 705.7 | 11 sub-checks (+1 unfrozen by human answers); scope: 26 changed file(s) |
| 2 | build | ok | 36.9 |  |
| 3 | tests | ok | 326.0 |  |
| 4 | traceability | ok | 0.2 | 8/8 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/run-views.ts, src/interpreter/hooks/approvals.ts, src/interpreter/index.ts, src/interpreter/visit.ts, src/runs/index.ts and 4 more |
| 8 | s1 judge | ok | 0.4 | 2/8 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 196.2 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261108T0534Z-aead/018-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261108T0534Z-aead/019-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261108T0534Z-aead/020-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261108T0534Z-aead/021-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261108T0534Z-aead/022-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261108T0534Z-aead/023-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261108T0534Z-aead/024-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 2 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 5 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 5 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/run-hooks.test.ts, src/api/run-views-hooks.test.ts, src/api/run-views.test.ts, src/api/run-views.ts, src/interpreter/hooks/approvals.test.ts (+14 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1888 of 1888 base tests pass on the unit's code with its 8 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/run-hooks.test.ts kept at head for the run (task 2.1: unfrozen by Q-001)
- src/interpreter/hooks/replay.test.ts kept at head for the run (task 3.2: unfrozen by Q-002)
- src.api.run-views.test.ts::C-8e399d8e the view schemas list exactly the view fields (named by the task text, plan:m5@d845bf45e9635093)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/api/run-hooks.test.ts (task 2.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-1335c3ed | hooks-trace › The final row of a node attempt carries that attempt's hook trace › Onion, mutate, retry and failure rows | covered | src.interpreter.hooks.trace.test.ts::C-1335c3ed F1 and pay-once rows have no hooks while onion rows do (passed, red_assertion); src.interpreter.hooks.trace.test.ts::C-1335c3ed bad-upper keeps the entry of the refused output hook (passed, red_assertion); src.interpreter.hooks.trace.test.ts::C-1335c3e... | - | - |
| C-c28d77df | hooks-trace › A replay rewrites the same trace › Replay of onion-own keeps the trace | covered | src.interpreter.hooks.trace-replay.test.ts::C-c28d77df a replay of onion-own rewrites the same hook trace (passed, red_assertion) | - | 0.93 |
| C-7ac1f21b | hooks-trace › The steps route serves the trace and never the original input › The route carries the trace and the payload route does not | covered | src.api.run-hooks.test.ts::C-7ac1f21b the served OpenAPI step item lists hooks in properties and not in required (passed, red_assertion); src.api.run-hooks.test.ts::C-7ac1f21b the steps route carries the trace and the payload route keeps the original input back (passed, red_assertion) | - | - |
| C-ccd6e529 | hooks-trace › approvalsOnPath lists the approvals on a path › Approvals, timeouts and malformed steps | covered | src.interpreter.hooks.approvals.test.ts::C-ccd6e529 approvalsOnPath ignores malformed steps and a non-array argument without throwing (passed, red_assertion); src.interpreter.hooks.approvals.test.ts::C-ccd6e529 approvalsOnPath keeps only an own non-empty approver string of at most 128 characters (pa... | - | 0.93 |
| C-a8ac9b1d | run-data › A step row has a nullable hooks column › Objects, ledger and privileges | covered | src.runs.store.hooks-schema.test.ts::C-a8ac9b1d the hooks column is jsonb on every partition with narrow app privileges (passed, red_assertion) | - | - |
| C-2cbc7c16 | run-data › A step write carries its hook trace, kept and replaced as a whole › One sequence gives equal traces in both stores | covered | src.runs.store.step-hooks-contract.test.ts::C-2cbc7c16 one sequence gives equal hook traces in both stores (passed, pre_satisfied) | - | - |
| C-15cabb6c | run-data › A malformed hook trace is refused before anything is stored › Malformed traces are refused | covered | src.runs.store.step-hooks-refusals.test.ts::C-15cabb6c both stores refuse the malformed hook traces and keep the limit writes (passed, red_assertion) | - | - |
| C-8e399d8e | runs-api › Run and step views expose the stored rows › Views, schemas and the policy resource | covered | src.api.run-views-hooks.test.ts::C-8e399d8e the step schema describes hooks as a closed envelope of closed entries (passed, red_assertion); src.api.run-views-hooks.test.ts::C-8e399d8e the step view copies hooks last when the record has one and adds no key otherwise (passed, red_assertion) | src.api.run-views.test.ts::C-8e399d8e the policy resource names the run, its tenant, owner team and initiator (no proof that it discriminates (no red, audit or generated record)); src.api.run-views.test.ts::C-8e399d8e the run view copies the stored row and leaves out internal columns (no proof that ... | - |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-trace/.l4/ledger/r-20261108T0223Z-25d1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-trace/.l4/ledger/r-20261108T0414Z-dff2.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-trace/.l4/ledger/r-20261108T0534Z-aead.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-trace/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-hook-trace/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/run-hooks.test.ts` |  | relevant | new test file |
| `src/api/run-views-hooks.test.ts` |  | relevant | new test file |
| `src/api/run-views.test.ts` |  | relevant | named in the spec |
| `src/api/run-views.ts` | api | relevant | named in the spec |
| `src/db/migrations/0425_step_hooks.sql` | db | relevant | named in the spec |
| `src/interpreter/hooks/approvals.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/approvals.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/hooks/replay.test.ts` |  | none | imports no module of the repository |
| `src/interpreter/hooks/trace-replay.test.ts` |  | relevant | new test file |
| `src/interpreter/hooks/trace.test.ts` |  | relevant | new test file |
| `src/interpreter/index.ts` | interpreter | relevant | named in the spec |
| `src/interpreter/visit.ts` | interpreter | relevant | named in the spec |
| `src/runs/index.ts` | runs | relevant | named in the spec |
| `src/runs/store/hooks-schema.test.ts` |  | relevant | new test file |
| `src/runs/store/memory-store.ts` | runs | relevant | named in the spec |
| `src/runs/store/step-hooks-contract.test.ts` |  | relevant | new test file |
| `src/runs/store/step-hooks-refusals.test.ts` |  | relevant | new test file |
| `src/runs/store/step-repository.ts` | runs | relevant | named in the spec |
| `src/runs/store/types.ts` | runs | relevant | named in the spec |
| `src/runs/store/validate.ts` | runs | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/run-views.ts, src/interpreter/hooks/approvals.ts, src/interpreter/index.ts, src/interpreter/visit.ts, src/runs/index.ts and 4 more

### Tests

1961 of 1962 passed, 1 failed, 0 errored, 0 skipped.
16 of 16 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-1335c3ed | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c28d77df | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7ac1f21b | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ccd6e529 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a8ac9b1d | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-2cbc7c16 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-15cabb6c | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-8e399d8e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-1335c3ed | hooks-trace › The final row of a node attempt carries that attempt's hook trace › Onion, mutate, retry and failure rows | pass | pass | the judge passed it and a discriminating test passes |
| C-c28d77df | hooks-trace › A replay rewrites the same trace › Replay of onion-own keeps the trace | pass | pass | the judge passed it and a discriminating test passes |
| C-7ac1f21b | hooks-trace › The steps route serves the trace and never the original input › The route carries the trace and the payload route does not | pass | pass | the judge passed it and a discriminating test passes |
| C-ccd6e529 | hooks-trace › approvalsOnPath lists the approvals on a path › Approvals, timeouts and malformed steps | pass | pass | the judge passed it and a discriminating test passes |
| C-a8ac9b1d | run-data › A step row has a nullable hooks column › Objects, ledger and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-2cbc7c16 | run-data › A step write carries its hook trace, kept and replaced as a whole › One sequence gives equal traces in both stores | pass | pass | the judge passed it and a discriminating test passes |
| C-15cabb6c | run-data › A malformed hook trace is refused before anything is stored › Malformed traces are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-8e399d8e | runs-api › Run and step views expose the stored rows › Views, schemas and the policy resource | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-8e399d8e): src.api.run-views.test.ts::C-8e399d8e the policy resource names the run, its tenant, owner team and initiator: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8e399d8e): src.api.run-views.test.ts::C-8e399d8e the run view copies the stored row and leaves out internal columns: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8e399d8e): src.api.run-views.test.ts::C-8e399d8e the step view copies the stored row and leaves out internal columns: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8e399d8e): src.api.run-views.test.ts::C-8e399d8e the view schemas list exactly the view fields: no proof that it discriminates (no red, audit or generated record)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.run-hooks.test.ts::C-7ac1f21b the served OpenAPI step item lists hooks in properties and not in required` (task 2.1): passed
- `src.api.run-hooks.test.ts::C-7ac1f21b the steps route carries the trace and the payload route keeps the original input back` (task 2.1): passed
- `src.api.run-views-hooks.test.ts::C-8e399d8e the step schema describes hooks as a closed envelope of closed entries` (task 2.1): passed
- `src.api.run-views-hooks.test.ts::C-8e399d8e the step view copies hooks last when the record has one and adds no key otherwise` (task 2.1): passed
- `src.interpreter.hooks.approvals.test.ts::C-ccd6e529 approvalsOnPath ignores malformed steps and a non-array argument without throwing` (task 3.1): passed
- `src.interpreter.hooks.approvals.test.ts::C-ccd6e529 approvalsOnPath keeps only an own non-empty approver string of at most 128 characters` (task 3.1): passed
- `src.interpreter.hooks.approvals.test.ts::C-ccd6e529 approvalsOnPath lists approvals in input order and ignores other steps` (task 3.1): passed
- `src.interpreter.hooks.trace-replay.test.ts::C-c28d77df a replay of onion-own rewrites the same hook trace` (task 3.2): passed
- `src.interpreter.hooks.trace.test.ts::C-1335c3ed F1 and pay-once rows have no hooks while onion rows do` (task 3.2): passed
- `src.interpreter.hooks.trace.test.ts::C-1335c3ed bad-upper keeps the entry of the refused output hook` (task 3.2): passed
- `src.interpreter.hooks.trace.test.ts::C-1335c3ed f-ret rows carry one retry entry of each attempt` (task 3.2): passed
- `src.interpreter.hooks.trace.test.ts::C-1335c3ed mutate rows carry the original input and the output mutation` (task 3.2): passed
- `src.interpreter.hooks.trace.test.ts::C-1335c3ed onion rows carry two and six hook entries` (task 3.2): passed
- `src.runs.store.hooks-schema.test.ts::C-a8ac9b1d the hooks column is jsonb on every partition with narrow app privileges` (task 1.1): passed
- `src.runs.store.step-hooks-contract.test.ts::C-2cbc7c16 one sequence gives equal hook traces in both stores` (task 1.3): passed
- `src.runs.store.step-hooks-refusals.test.ts::C-15cabb6c both stores refuse the malformed hook traces and keep the limit writes` (task 1.2): passed
