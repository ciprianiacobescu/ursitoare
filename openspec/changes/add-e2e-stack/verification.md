# Verification: openspec:add-e2e-stack: FAIL (round 2)

traceability: not checked (an earlier step failed)

- Base: `a53398fc5130b573609047b209e714758fda5de9`
- Head: `9965067738a082f3ffff753832ec64cc9c59ed7d`
- Implementer profiles: deepseek, glm, claude-sonnet
- Judge: gemini-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.6 | base main@a53398fc51 contained |
| 1 | integrity | failed | 0.5 | a skip or xfail marker was added (+2 unfrozen by human answers); scope: 38 changed file(s) |
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
| pre-existing tests | failed | 2 test file(s) compared with the base |
| red-green freeze | ok | 11 task(s): red and green compared (+1 unfrozen by a delegate or an agent) (+1 opened by task text) |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/main.configure.test.ts, src/main.ts, test/arch/control-routes.test.ts, test/arch/control-routes.ts, test/support/e2e-stack/control.test.ts (+17 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | skipped | step 1 already failed |

## Tests unfrozen by human answers (allowed, L4-IMP-002)

- e2e/conftest.py (task 5.3, opened by its text, plan:m0@a1d38222ff9fb862)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- test/support/e2e-stack/stack.db.test.ts (task 5.2, unfrozen by Q-001 (agent))

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/conftest.py` |  | relevant | named in the spec |
| `e2e/test_e2e_stack.py` |  | relevant | new test file |
| `openspec/changes/add-e2e-stack-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261026T2221Z-da09.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261026T2348Z-9953.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261027T0055Z-7c8b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261027T0056Z-a73b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/main.configure.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/arch/control-routes.test.ts` |  | relevant | new test file |
| `test/arch/control-routes.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/control.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/control.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/database-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/database-part.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/discover.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/discover.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/faults.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/faults.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/main.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/main.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/part.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/parts/10-database.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/reset.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/reset.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/stack.db.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/stack.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/stack.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not run.

### Tests

Tests-ran check not run.

## Criteria

None judged.

## Findings

- [blocker, deterministic] a skip or xfail marker was added: e2e/test_e2e_stack.py::_require_fake_profile, e2e/test_e2e_stack.py::injected_fault

## Fix unit

Escalated: round 2 failed the same way as round 1: finding F-5758ac1b

## New tests (red then green, `task.red_ok` in the ledger)

- `src.main.configure.test.ts::C-7778e3c9 main treats a throwing configureServer as a startup failure without the message` (task 2.1): not in the report
- `src.main.configure.test.ts::C-ea25f674 main runs configureServer before listening and serves its hook` (task 2.1): not in the report
- `test.arch.control-routes.test.ts::C-6551b89b: control route literals are reported with their file and line, look-alikes and test files are not` (task 6.1): not in the report
- `test.support.e2e-stack.control.test.ts::C-14cae224 malformed fault JSON answers 400 FAULT_INVALID with reason bad_json and leaves the table unchanged` (task 3.3): not in the report
- `test.support.e2e-stack.control.test.ts::C-182af5d3 the control server binds loopback and refuses a foreign Host or any Origin without calling reset` (task 3.3): not in the report
- `test.support.e2e-stack.control.test.ts::C-20bba381 a rejecting reset answers 500 with the engine envelope and the failing part` (task 3.3): not in the report
- `test.support.e2e-stack.control.test.ts::C-2d6b948a chunked and declared large bodies are refused with 413 and connection close` (task 3.3): not in the report
- `test.support.e2e-stack.control.test.ts::C-67fb8681 routing and body limits answer method, route, media type and size errors and ignore reset bodies` (task 3.3): not in the report
- `test.support.e2e-stack.database-part.test.ts::C-4c698dd6 discovery rejects misnamed or invalid part files and a missing directory` (task 4.1): not in the report
- `test.support.e2e-stack.database-part.test.ts::C-71b5758c discovery returns parts in file-name order and never imports test files` (task 4.1): not in the report
- `test.support.e2e-stack.database-part.test.ts::C-89fc2527 the registry keeps order, returns a copy and rejects invalid or duplicate parts` (task 4.1): not in the report
- `test.support.e2e-stack.database-part.test.ts::C-907d77a5 discovery rejects a repeated prefix or name naming the later file` (task 4.1): not in the report
- `test.support.e2e-stack.database-part.test.ts::C-c3092640 C-fe09bf7e the database part seeds the tenant and closes its cluster` (task 4.1): not in the report
- `test.support.e2e-stack.database-part.test.ts::C-fe09bf7e a database start with a missing data directory rejects and leaves no cluster` (task 4.1): not in the report
- `test.support.e2e-stack.discover.test.ts::C-4c698dd6 discovery rejects a directory that does not exist naming the directory` (task 1.2): not in the report
- `test.support.e2e-stack.discover.test.ts::C-4c698dd6 discovery rejects invalid part files naming the file` (task 1.2): not in the report
- `test.support.e2e-stack.discover.test.ts::C-71b5758c discovery returns parts in file name order and never imports test files` (task 1.2): not in the report
- `test.support.e2e-stack.discover.test.ts::C-907d77a5 discovery rejects a repeated name naming the later file` (task 1.2): not in the report
- `test.support.e2e-stack.discover.test.ts::C-907d77a5 discovery rejects a repeated prefix naming the later file` (task 1.2): not in the report
- `test.support.e2e-stack.faults.test.ts::C-14cae224 FaultInvalidError carries its code, reason and message` (task 3.1): not in the report
- `test.support.e2e-stack.faults.test.ts::C-14cae224 parseFault names the first failing field of an invalid fault` (task 3.1): not in the report
- `test.support.e2e-stack.faults.test.ts::C-14cae224 the 101st distinct fault is refused with too_many and the table is unchanged` (task 3.1): not in the report
- `test.support.e2e-stack.faults.test.ts::C-346ddf48 a status fault answers the injected envelope and clear restores the route` (task 3.1): not in the report
- `test.support.e2e-stack.faults.test.ts::C-9383903b a prefix delay sleeps once for the matching request, which continues, and a replacement answers 500` (task 3.1): not in the report
- `test.support.e2e-stack.faults.test.ts::C-9383903b an exact fault matches its method and the path before the query only, first match wins` (task 3.1): not in the report
- `test.support.e2e-stack.faults.test.ts::C-9383903b parseFault accepts exact, prefix, delay and status faults` (task 3.1): not in the report
- `test.support.e2e-stack.main.test.ts::C-23b4de23 the process prints one ready line, serves the database health and stops on SIGTERM` (task 5.3): not in the report
- `test.support.e2e-stack.main.test.ts::C-23b4de23 the process starts on the default ports 39080 and 39081` (task 5.3): not in the report
- `test.support.e2e-stack.main.test.ts::C-4e750e4e a bad E2E_PORT and a busy engine port exit 1 with the failure line` (task 5.3): not in the report
- `test.support.e2e-stack.main.test.ts::C-5f32b081 a signal during the start closes the stack without a ready line` (task 5.3): not in the report
- `test.support.e2e-stack.part.test.ts::C-89fc2527 E2eStackError carries its code, details and cause` (task 1.1): not in the report
- `test.support.e2e-stack.part.test.ts::C-89fc2527 registry lists parts in registration order and returns a copy` (task 1.1): not in the report
- `test.support.e2e-stack.part.test.ts::C-89fc2527 registry rejects a bad name, the engine name and a string start as invalid` (task 1.1): not in the report
- `test.support.e2e-stack.part.test.ts::C-89fc2527 registry rejects a duplicate name and keeps its list` (task 1.1): not in the report
- `test.support.e2e-stack.reset.test.ts::C-20bba381 a rejecting seed rejects STACK_RESET_FAILED naming the part and the next reset still runs` (task 3.2): not in the report
- `test.support.e2e-stack.reset.test.ts::C-20bba381 a reset clears the faults before seeding every part in order and probing the engine` (task 3.2): not in the report
- `test.support.e2e-stack.reset.test.ts::C-20bba381 seedAll seeds every part in order without clearing faults or probing the engine` (task 3.2): not in the report
- `test.support.e2e-stack.reset.test.ts::C-20bba381 two resets started together seed serially with a maximum concurrency of one` (task 3.2): not in the report
- `test.support.e2e-stack.reset.test.ts::C-c3238bfc five unhealthy probes reject STACK_RESET_FAILED for the engine after exactly five calls without a timer` (task 3.2): not in the report
- `test.support.e2e-stack.reset.test.ts::C-c3238bfc reset retries the health probe until it answers true, using three calls` (task 3.2): not in the report
- `test.support.e2e-stack.stack.db.test.ts::C-23b4de23 a stack starts, resets and closes without a DNS lookup of a name` (task 5.2): not in the report
- `test.support.e2e-stack.stack.db.test.ts::C-d194233f the stack health reports the migrated database, its tenant and its app sessions` (task 5.2): not in the report
- `test.support.e2e-stack.stack.db.test.ts::C-dd21514e the engine key and database password are private files that never reach health` (task 5.2): not in the report
- `test.support.e2e-stack.stack.db.test.ts::C-f55456d0 reset restores the seeded tenant, drops probe state and clears faults` (task 5.2): not in the report
- `test.support.e2e-stack.stack.db.test.ts::C-fe09bf7e closing the stack stops Postgres and removes its cluster directory` (task 5.2): not in the report
- `test.support.e2e-stack.stack.test.ts::C-20bba381 resets re-run seeds serially and answer 500 for a rejecting seed before recovering` (task 5.1): not in the report
- `test.support.e2e-stack.stack.test.ts::C-346ddf48 a fault posted to the control listener fails the engine route until it is deleted` (task 5.1): not in the report
- `test.support.e2e-stack.stack.test.ts::C-66ec4c4e a busy engine port rejects STACK_ENGINE_FAILED with the fatal EADDRINUSE line` (task 5.1): not in the report
- `test.support.e2e-stack.stack.test.ts::C-66ec4c4e invalid options reject before any part starts` (task 5.1): not in the report
- `test.support.e2e-stack.stack.test.ts::C-90ece4c0 close closes the parts in reverse once, is repeatable and removes the stack directory` (task 5.1): not in the report

## Guard events

- guard.test_tamper: e2e/test_e2e_stack.py
