# Verification: openspec:add-web-shell-followup-1: FAIL (round 2)

traceability: not checked (an earlier step failed)

- Base: `6ef3fbd2d9d2be69beb92c42540ef46b62a3e53b`
- Head: `1f92551f9ff7a27ebe4221c89a398c0d50819850`
- Implementer profiles: deepseek-free, beam
- Judge: nemotron-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@6ef3fbd2d9 as 1f92551f9f (1 commit) |
| 1 | integrity | failed | 0.2 | a protected path was changed; scope: 18 changed file(s) |
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
| protected paths | failed | 1 protected path(s) changed |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/app/App.tsx, web/src/app/feature-page-gate.test.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | skipped | step 1 already failed |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not run.

### Tests

Tests-ran check not run.

## Criteria

None judged.

## Findings

- [blocker, deterministic] a protected path was changed: .serena/memories/harness/ (touched by non-harness commit 2440ee533f)

## Fix unit

Fix unit 1 is created for these tasks:
- F-6e5715a0 a protected path was changed

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.app.feature-page-gate.test.ts::C-8c08d9f5 App gates a capability feature's page on the client except admin-users` (task 1.1): not in the report

## Guard events

- guard.violation: web/src/app/page-gate.ts
- guard.violation: web/src/app/App.tsx
