# Verification: openspec:add-e2e-stack: NEEDS_HUMAN (round 5)

traceability: 29/32 criteria covered by a discriminating test

- Base: `a53398fc5130b573609047b209e714758fda5de9`
- Head: `6c96e142034ce7d7c54869921fb1890902ca3b1a`
- Implementer profiles: deepseek, glm, claude-sonnet
- Judge: gemini-judge, 2 call(s), judged in 2 parts, prompt sha256 `cd95fd86fee5b5aa6297d87542bb9fd85d6c168495ec8d3d2203308664233bb1`
  - part 1: 27 file(s), 109402 characters, profile gemini-judge, reply repaired
  - part 2: 10 file(s), 92257 characters, profile gemini-judge, reply valid
- Judge replies of gemini-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): gemini-judge google (declared), deepseek deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.8718

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 1.5 | base main@a53398fc51 contained |
| 1 | integrity | ok | 26.3 | 10 sub-checks (+2 unfrozen by human answers); scope: 62 changed file(s) |
| 2 | build | ok | 16.6 |  |
| 3 | tests | ok | 28.9 |  |
| 4 | traceability | ok | 0.1 | 29/32 criteria covered |
| 4a | audit sampling | ok | 114.0 | 2 not_testable, 7 skipped; support files at the base: 14 |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/main.ts, test/arch/control-routes.ts, test/support/e2e-stack/control.ts, test/support/e2e-stack/database-part.ts, test/support/e2e-stack/discover.ts and 7 more |
| 8 | s1 judge | ok | 2.4 | 32/32 criteria judged by jev |
| 9 | judge | ok | 579.6 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261027T0143Z-5961/034-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261027T0143Z-5961/035-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261027T0143Z-5961/036-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261027T0143Z-5961/037-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261027T0143Z-5961/038-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261027T0143Z-5961/039-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261027T0143Z-5961/040-e2e.log |

## Files by part

- part 1: openspec/changes/add-e2e-stack-fix-1/.openspec.yaml (311 characters)
- part 1: openspec/changes/add-e2e-stack-fix-2/.openspec.yaml (293 characters)
- part 1: openspec/changes/add-e2e-stack-fix-3/.openspec.yaml (311 characters)
- part 1: test/support/e2e-stack/parts/10-database.ts (286 characters)
- part 1: e2e/conftest.py (2162 characters)
- part 1: test/support/e2e-stack/control.test.ts (11326 characters)
- part 1: test/support/e2e-stack/control.ts (6975 characters)
- part 1: test/arch/control-routes.test.ts (2099 characters)
- part 1: test/arch/control-routes.ts (1988 characters)
- part 1: test/support/e2e-stack/database-part.test.ts (15353 characters)
- part 1: test/support/e2e-stack/database-part.ts (6111 characters)
- part 1: test/support/e2e-stack/discover.test.ts (4814 characters)
- part 1: test/support/e2e-stack/discover.ts (3332 characters)
- part 1: test/arch/e2e-stack.test.ts (1548 characters)
- part 1: e2e/test_e2e_stack.py (4319 characters)
- part 1: test/support/e2e-stack/faults.test.ts (8261 characters)
- part 1: test/support/e2e-stack/faults.ts (4433 characters)
- part 1: src/main.configure.test.ts (5233 characters)
- part 1: src/main.ts (802 characters)
- part 1: test/support/e2e-stack/main.test.ts (14455 characters)
- part 1: test/support/e2e-stack/main.ts (4333 characters)
- part 1: test/support/e2e-stack/part.test.ts (3407 characters)
- part 1: test/support/e2e-stack/part.ts (2242 characters)
- part 1: test/support/pg.ts (1844 characters)
- part 1: openspec/changes/add-e2e-stack-fix-1/proposal.md (679 characters)
- part 1: openspec/changes/add-e2e-stack-fix-2/proposal.md (1802 characters)
- part 1: openspec/changes/add-e2e-stack-fix-3/proposal.md (683 characters)
- part 2: test/support/e2e-stack/reset.test.ts (8547 characters)
- part 2: test/support/e2e-stack/reset.ts (2188 characters)
- part 2: openspec/changes/add-e2e-stack-fix-2/specs/e2e-stack/spec.md (953 characters)
- part 2: test/support/e2e-stack/stack.db.test.ts (14484 characters)
- part 2: test/support/e2e-stack/stack.test.ts (24201 characters)
- part 2: test/support/e2e-stack/stack.ts (10703 characters)
- part 2: openspec/changes/add-e2e-stack-fix-1/tasks.md (314 characters)
- part 2: openspec/changes/add-e2e-stack-fix-2/tasks.md (365 characters)
- part 2: openspec/changes/add-e2e-stack-fix-3/tasks.md (298 characters)
- part 2: openspec/changes/add-e2e-stack/tasks.md (30204 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base |
| red-green freeze | ok | 12 task(s): red and green compared (+1 unfrozen by a delegate or an agent) (+1 opened by task text) |
| test path freeze | ok | 14 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/main.configure.test.ts, src/main.ts, test/arch/control-routes.test.ts, test/arch/control-routes.ts, test/arch/e2e-stack.test.ts (+19 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 303 of 303 base tests pass on the unit's code with its 12 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/conftest.py kept at head for the run (task 5.3: unfrozen by plan:m0@a1d38222ff9fb862)
- test/support/e2e-stack/stack.db.test.ts kept at head for the run (task 5.2: unfrozen by Q-001)

## Tests unfrozen by human answers (allowed, L4-IMP-002)

- e2e/conftest.py (task 5.3, opened by its text, plan:m0@a1d38222ff9fb862)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- test/support/e2e-stack/stack.db.test.ts (task 5.2, unfrozen by Q-001 (agent))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-89fc2527 | e2e-stack › Parts are discovered from the parts directory › Registry order and validation | covered | test.support.e2e-stack.database-part.test.ts::C-89fc2527 the registry keeps order, returns a copy and rejects invalid or duplicate parts (passed, red_assertion); test.support.e2e-stack.part.test.ts::C-89fc2527 E2eStackError carries its code, details and cause (passed, red_assertion); test.support.e2... | - | 0.95 |
| C-71b5758c | e2e-stack › Parts are discovered from the parts directory › Discovery order and test files | covered | test.support.e2e-stack.database-part.test.ts::C-71b5758c discovery returns parts in file-name order and never imports test files (passed, red_assertion); test.support.e2e-stack.discover.test.ts::C-71b5758c discovery returns parts in file name order and never imports test files (passed, red_assertion... | - | 0.95 |
| C-4c698dd6 | e2e-stack › Parts are discovered from the parts directory › Misnamed or invalid part files | covered | test.support.e2e-stack.database-part.test.ts::C-4c698dd6 discovery rejects misnamed or invalid part files and a missing directory (passed, red_assertion); test.support.e2e-stack.discover.test.ts::C-4c698dd6 discovery rejects a directory that does not exist naming the directory (passed, red_assertion... | - | 0.95 |
| C-907d77a5 | e2e-stack › Parts are discovered from the parts directory › Repeated prefix or name | covered | test.support.e2e-stack.database-part.test.ts::C-907d77a5 discovery rejects a repeated prefix or name naming the later file (passed, red_assertion); test.support.e2e-stack.discover.test.ts::C-907d77a5 discovery rejects a repeated name naming the later file (passed, red_assertion); test.support.e2e-st... | - | 0.94 |
| C-97ff4a40 | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Start, seed and serve | covered | test.support.e2e-stack.stack.test.ts::C-97ff4a40 the stack starts parts in order, seeds them, merges env and serves health (passed, red_assertion) | - | 0.94 |
| C-90ece4c0 | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Close in reverse and repeatable | covered | test.support.e2e-stack.stack.test.ts::C-90ece4c0 close closes the parts in reverse once, is repeatable and removes the stack directory (passed, red_assertion) | - | 0.94 |
| C-a6eea79b | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Close waits for a reset; a failed close repeats | covered | test.support.e2e-stack.stack.test.ts::C-a6eea79b a rejected part close rejects every close with STACK_CLOSE_FAILED and closes once (passed, red_assertion); test.support.e2e-stack.stack.test.ts::C-a6eea79b close waits for a reset whose seed is still blocked (passed, red_assertion) | - | 0.95 |
| C-a4f37787 | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › A part fails or conflicts | covered | test.support.e2e-stack.stack.test.ts::C-a4f37787 a failing part start or first-start seed closes the started parts and opens no port (passed, red_assertion); test.support.e2e-stack.stack.test.ts::C-a4f37787 a part env that collides with a stack key or another part rejects STACK_ENV_CONFLICT (passed,... | - | 0.94 |
| C-66ec4c4e | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Bad options, busy port | covered | test.support.e2e-stack.stack.test.ts::C-66ec4c4e a busy engine port rejects STACK_ENGINE_FAILED with the fatal EADDRINUSE line (passed, red_assertion); test.support.e2e-stack.stack.test.ts::C-66ec4c4e invalid options reject before any part starts (passed, red_assertion) | - | 0.92 |
| C-c3092640 | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › The part alone | covered | test.support.e2e-stack.database-part.test.ts::C-c3092640 C-fe09bf7e the database part seeds the tenant and closes its cluster (passed, red_assertion) | - | 0.81 |
| C-d194233f | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › Health reports the database | covered | test.support.e2e-stack.stack.db.test.ts::C-d194233f the stack health reports the migrated database, its tenant and its app sessions (passed, red_assertion) | - | 0.92 |
| C-dd21514e | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › Secrets are files only | covered | test.support.e2e-stack.stack.db.test.ts::C-dd21514e the engine key and database password are private files that never reach health (passed, red_assertion) | - | 0.90 |
| C-fe09bf7e | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › Close stops Postgres; a failed start leaves nothing | covered | test.support.e2e-stack.database-part.test.ts::C-c3092640 C-fe09bf7e the database part seeds the tenant and closes its cluster (passed, red_assertion); test.support.e2e-stack.database-part.test.ts::C-fe09bf7e a database start with a missing data directory rejects and leaves no cluster (passed, red_as... | - | 0.91 |
| C-f55456d0 | e2e-stack › Reset recreates the database and re-runs every seed › Seeded state is restored | covered | test.support.e2e-stack.stack.db.test.ts::C-f55456d0 reset restores the seeded tenant, drops probe state and clears faults (passed, red_assertion) | - | 0.95 |
| C-20bba381 | e2e-stack › Reset recreates the database and re-runs every seed › Seeds re-run, never overlap, failures reported | covered | test.support.e2e-stack.control.test.ts::C-20bba381 a rejecting reset answers 500 with the engine envelope and the failing part (passed, red_assertion); test.support.e2e-stack.reset.test.ts::C-20bba381 a rejecting seed rejects STACK_RESET_FAILED naming the part and the next reset still runs (passed, ... | - | 0.93 |
| C-c3238bfc | e2e-stack › Reset recreates the database and re-runs every seed › The engine must be healthy | covered | test.support.e2e-stack.reset.test.ts::C-c3238bfc five unhealthy probes reject STACK_RESET_FAILED for the engine after exactly five calls without a timer (passed, red_assertion); test.support.e2e-stack.reset.test.ts::C-c3238bfc reset retries the health probe until it answers true, using three calls (... | - | 0.94 |
| C-346ddf48 | e2e-stack › Faults delay or fail engine routes › A status fault | covered | test.support.e2e-stack.faults.test.ts::C-346ddf48 a status fault answers the injected envelope and clear restores the route (passed, red_assertion); test.support.e2e-stack.stack.test.ts::C-346ddf48 a fault posted to the control listener fails the engine route until it is deleted (passed, red_asserti... | - | 0.95 |
| C-9383903b | e2e-stack › Faults delay or fail engine routes › Delay, prefix match, replacement and order | covered | test.support.e2e-stack.faults.test.ts::C-9383903b a prefix delay sleeps once for the matching request, which continues, and a replacement answers 500 (passed, red_assertion); test.support.e2e-stack.faults.test.ts::C-9383903b an exact fault matches its method and the path before the query only, first... | - | 0.94 |
| C-14cae224 | e2e-stack › Faults delay or fail engine routes › Invalid faults are refused | covered | test.support.e2e-stack.control.test.ts::C-14cae224 malformed fault JSON answers 400 FAULT_INVALID with reason bad_json and leaves the table unchanged (passed, red_assertion); test.support.e2e-stack.faults.test.ts::C-14cae224 FaultInvalidError carries its code, reason and message (passed, red_asserti... | - | 0.87 |
| C-182af5d3 | e2e-stack › The control listener is loopback-only and refuses browsers › Foreign Host or Origin | covered | test.support.e2e-stack.control.test.ts::C-182af5d3 the control server binds loopback and refuses a foreign Host or any Origin without calling reset (passed, red_assertion) | - | 0.94 |
| C-67fb8681 | e2e-stack › The control listener is loopback-only and refuses browsers › Routing and body limits | covered | test.support.e2e-stack.control.test.ts::C-67fb8681 routing and body limits answer method, route, media type and size errors and ignore reset bodies (passed, red_assertion) | - | 0.95 |
| C-2d6b948a | e2e-stack › The control listener is loopback-only and refuses browsers › A chunked body is counted too | covered | test.support.e2e-stack.control.test.ts::C-2d6b948a chunked and declared large bodies are refused with 413 and connection close (passed, red_assertion) | - | 0.94 |
| C-6551b89b | e2e-stack › No control route exists in src › Scanner controls and the real tree | covered | test.arch.control-routes.test.ts::C-6551b89b: control route literals are reported with their file and line, look-alikes and test files are not (passed, red_assertion) | - | 0.89 |
| C-ea25f674 | e2e-stack › The engine composition root accepts a server hook › The hook runs before listen | covered | src.main.configure.test.ts::C-ea25f674 main runs configureServer before listening and serves its hook (passed, red_assertion) | - | 0.92 |
| C-7778e3c9 | e2e-stack › The engine composition root accepts a server hook › A throwing hook stops the start | covered | src.main.configure.test.ts::C-7778e3c9 main treats a throwing configureServer as a startup failure without the message (passed, red_assertion) | - | 0.88 |
| C-23b4de23 | e2e-stack › The stack process starts offline and stops on SIGTERM › Offline start, health, SIGTERM | covered | test.support.e2e-stack.main.test.ts::C-23b4de23 the process prints one ready line, serves the database health and stops on SIGTERM (passed, red_assertion); test.support.e2e-stack.main.test.ts::C-23b4de23 the process starts on the default ports 39080 and 39081 (passed, red_assertion); test.support.e2... | - | 0.93 |
| C-5f32b081 | e2e-stack › The stack process starts offline and stops on SIGTERM › A signal during the start | covered | test.support.e2e-stack.main.test.ts::C-5f32b081 a signal during the start closes the stack without a ready line (passed, red_assertion) | - | 0.87 |
| C-4e750e4e | e2e-stack › The stack process starts offline and stops on SIGTERM › Bad variable or busy port | covered | test.support.e2e-stack.main.test.ts::C-4e750e4e a bad E2E_PORT and a busy engine port exit 1 with the failure line (passed, red_assertion) | - | 0.91 |
| C-67438cd6 | e2e-stack › fresh_state resets the stack on the fake profile › Faults and state cleared before a test | uncovered | - | test_e2e_stack::test_fresh_state_clears_faults[chromium] (no proof that it discriminates (no red, audit or generated record)); test_e2e_stack::test_injected_fault_fails_the_route[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.04 |
| C-ef0357b4 | e2e-stack › fresh_state resets the stack on the fake profile › Stack profile and unreachable control | uncovered | - | test_e2e_stack::test_fresh_state_is_a_noop_on_the_stack_profile (no proof that it discriminates (no red, audit or generated record)); test_e2e_stack::test_fresh_state_reports_an_unreachable_control_url (no proof that it discriminates (no red, audit or generated record)) | 0.04 |
| C-0828b57f | e2e-stack › The browser gate sees the database and not the control routes › Health and control paths in the browser gate | uncovered | - | test_e2e_stack::test_control_paths_are_not_on_the_engine_port (no proof that it discriminates (no red, audit or generated record)); test_e2e_stack::test_health_reports_database_ok[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 |
| C-e23019c4 | e2e-stack › e2e/test_e2e_stack.py calls no pytest.skip — feedback FB-001 › e2e/test_e2e_stack.py calls no pytest.skip | covered | test.arch.e2e-stack.test.ts::C-e23019c4: the e2e stack browser gate has no skip or xfail call, marker or guard (passed, red_assertion) | - | 0.68 |

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
| `openspec/changes/add-e2e-stack-fix-2/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-2/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-2/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-2/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-2/specs/e2e-stack/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-2/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-3/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-3/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-3/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack-fix-3/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-4/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-4/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/evidence/round-4/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261026T2221Z-da09.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261026T2348Z-9953.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261027T0055Z-7c8b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261027T0056Z-a73b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261027T0131Z-a49f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261027T0132Z-6440.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/.l4/ledger/r-20261027T0143Z-5961.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/feedback.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-e2e-stack/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/main.configure.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/arch/control-routes.test.ts` |  | relevant | new test file |
| `test/arch/control-routes.ts` | test | relevant | named in the spec |
| `test/arch/e2e-stack.test.ts` |  | relevant | new test file |
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
| `test/support/pg.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/main.ts, test/arch/control-routes.ts, test/support/e2e-stack/control.ts, test/support/e2e-stack/database-part.ts, test/support/e2e-stack/discover.ts and 7 more

### Tests

361 of 361 passed, 0 failed, 0 errored, 0 skipped.
62 of 62 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-89fc2527 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-71b5758c | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c698dd6 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-907d77a5 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97ff4a40 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-90ece4c0 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a6eea79b | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4f37787 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-66ec4c4e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3092640 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d194233f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dd21514e | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fe09bf7e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f55456d0 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-20bba381 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3238bfc | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-346ddf48 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9383903b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-14cae224 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-182af5d3 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67fb8681 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2d6b948a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6551b89b | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ea25f674 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7778e3c9 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23b4de23 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f32b081 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4e750e4e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67438cd6 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ef0357b4 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0828b57f | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e23019c4 | ok | 0.680 | jev-1.13.0 | jev | - |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-7778e3c9 | skipped | - | - | cap |
| C-4c698dd6 | skipped | - | - | cap |
| C-97ff4a40 | skipped | - | - | cap |
| C-ea25f674 | skipped | - | - | cap |
| C-e23019c4 | skipped | - | - | cap |
| C-d194233f | skipped | - | - | cap |
| C-a4f37787 | skipped | - | - | cap |
| C-c3092640 | not_testable | - | - | The criterion targets TypeScript symbols (databasePart, databaseApi, discoverParts) whose implementation sources are not shown and cannot be imported into a Python pytest test. |
| C-346ddf48 | not_testable | - | - | The project is a TypeScript HTTP service and no Python module or stack startup source is shown to import and test without network. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-89fc2527 | e2e-stack › Parts are discovered from the parts directory › Registry order and validation | pass | pass | the judge passed it and a discriminating test passes |
| C-71b5758c | e2e-stack › Parts are discovered from the parts directory › Discovery order and test files | pass | pass | the judge passed it and a discriminating test passes |
| C-4c698dd6 | e2e-stack › Parts are discovered from the parts directory › Misnamed or invalid part files | pass | pass | the judge passed it and a discriminating test passes |
| C-907d77a5 | e2e-stack › Parts are discovered from the parts directory › Repeated prefix or name | pass | pass | the judge passed it and a discriminating test passes |
| C-97ff4a40 | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Start, seed and serve | pass | pass | the judge passed it and a discriminating test passes |
| C-90ece4c0 | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Close in reverse and repeatable | pass | pass | the judge passed it and a discriminating test passes |
| C-a6eea79b | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Close waits for a reset; a failed close repeats | pass | pass | the judge passed it and a discriminating test passes |
| C-a4f37787 | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › A part fails or conflicts | pass | pass | the judge passed it and a discriminating test passes |
| C-66ec4c4e | e2e-stack › The stack starts the real engine and the parts, and closes them in reverse › Bad options, busy port | pass | pass | the judge passed it and a discriminating test passes |
| C-c3092640 | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › The part alone | pass | pass | the judge passed it and a discriminating test passes |
| C-d194233f | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › Health reports the database | pass | pass | the judge passed it and a discriminating test passes |
| C-dd21514e | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › Secrets are files only | pass | pass | the judge passed it and a discriminating test passes |
| C-fe09bf7e | e2e-stack › The database part provides a migrated, seeded Postgres to the engine › Close stops Postgres; a failed start leaves nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-f55456d0 | e2e-stack › Reset recreates the database and re-runs every seed › Seeded state is restored | pass | pass | the judge passed it and a discriminating test passes |
| C-20bba381 | e2e-stack › Reset recreates the database and re-runs every seed › Seeds re-run, never overlap, failures reported | pass | pass | the judge passed it and a discriminating test passes |
| C-c3238bfc | e2e-stack › Reset recreates the database and re-runs every seed › The engine must be healthy | pass | pass | the judge passed it and a discriminating test passes |
| C-346ddf48 | e2e-stack › Faults delay or fail engine routes › A status fault | pass | pass | the judge passed it and a discriminating test passes |
| C-9383903b | e2e-stack › Faults delay or fail engine routes › Delay, prefix match, replacement and order | pass | pass | the judge passed it and a discriminating test passes |
| C-14cae224 | e2e-stack › Faults delay or fail engine routes › Invalid faults are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-182af5d3 | e2e-stack › The control listener is loopback-only and refuses browsers › Foreign Host or Origin | pass | pass | the judge passed it and a discriminating test passes |
| C-67fb8681 | e2e-stack › The control listener is loopback-only and refuses browsers › Routing and body limits | pass | pass | the judge passed it and a discriminating test passes |
| C-2d6b948a | e2e-stack › The control listener is loopback-only and refuses browsers › A chunked body is counted too | pass | pass | the judge passed it and a discriminating test passes |
| C-6551b89b | e2e-stack › No control route exists in src › Scanner controls and the real tree | pass | pass | the judge passed it and a discriminating test passes |
| C-ea25f674 | e2e-stack › The engine composition root accepts a server hook › The hook runs before listen | pass | pass | the judge passed it and a discriminating test passes |
| C-7778e3c9 | e2e-stack › The engine composition root accepts a server hook › A throwing hook stops the start | pass | pass | the judge passed it and a discriminating test passes |
| C-23b4de23 | e2e-stack › The stack process starts offline and stops on SIGTERM › Offline start, health, SIGTERM | pass | pass | the judge passed it and a discriminating test passes |
| C-5f32b081 | e2e-stack › The stack process starts offline and stops on SIGTERM › A signal during the start | pass | pass | the judge passed it and a discriminating test passes |
| C-4e750e4e | e2e-stack › The stack process starts offline and stops on SIGTERM › Bad variable or busy port | pass | pass | the judge passed it and a discriminating test passes |
| C-67438cd6 | e2e-stack › fresh_state resets the stack on the fake profile › Faults and state cleared before a test | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-ef0357b4 | e2e-stack › fresh_state resets the stack on the fake profile › Stack profile and unreachable control | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-0828b57f | e2e-stack › The browser gate sees the database and not the control routes › Health and control paths in the browser gate | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-e23019c4 | e2e-stack › e2e/test_e2e_stack.py calls no pytest.skip — feedback FB-001 › e2e/test_e2e_stack.py calls no pytest.skip | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-67438cd6): test_e2e_stack::test_fresh_state_clears_faults[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-67438cd6): test_e2e_stack::test_injected_fault_fails_the_route[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-ef0357b4): test_e2e_stack::test_fresh_state_is_a_noop_on_the_stack_profile: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-ef0357b4): test_e2e_stack::test_fresh_state_reports_an_unreachable_control_url: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0828b57f): test_e2e_stack::test_control_paths_are_not_on_the_engine_port: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0828b57f): test_e2e_stack::test_health_reports_database_ok[chromium]: no proof that it discriminates (no red, audit or generated record)

## Feedback

- FB-001: judged addressed, pending a PASS round: e2e/test_e2e_stack.py:34-128, test/arch/e2e-stack.test.ts:11-41

## New tests (red then green, `task.red_ok` in the ledger)

- `src.main.configure.test.ts::C-7778e3c9 main treats a throwing configureServer as a startup failure without the message` (task 2.1): passed
- `src.main.configure.test.ts::C-ea25f674 main runs configureServer before listening and serves its hook` (task 2.1): passed
- `test.arch.control-routes.test.ts::C-6551b89b: control route literals are reported with their file and line, look-alikes and test files are not` (task 6.1): passed
- `test.arch.e2e-stack.test.ts::C-e23019c4: the e2e stack browser gate has no skip or xfail call, marker or guard` (task 1.1): passed
- `test.support.e2e-stack.control.test.ts::C-14cae224 malformed fault JSON answers 400 FAULT_INVALID with reason bad_json and leaves the table unchanged` (task 3.3): passed
- `test.support.e2e-stack.control.test.ts::C-182af5d3 the control server binds loopback and refuses a foreign Host or any Origin without calling reset` (task 3.3): passed
- `test.support.e2e-stack.control.test.ts::C-20bba381 a rejecting reset answers 500 with the engine envelope and the failing part` (task 3.3): passed
- `test.support.e2e-stack.control.test.ts::C-2d6b948a chunked and declared large bodies are refused with 413 and connection close` (task 3.3): passed
- `test.support.e2e-stack.control.test.ts::C-67fb8681 routing and body limits answer method, route, media type and size errors and ignore reset bodies` (task 3.3): passed
- `test.support.e2e-stack.database-part.test.ts::C-4c698dd6 discovery rejects misnamed or invalid part files and a missing directory` (task 4.1): passed
- `test.support.e2e-stack.database-part.test.ts::C-71b5758c discovery returns parts in file-name order and never imports test files` (task 4.1): passed
- `test.support.e2e-stack.database-part.test.ts::C-89fc2527 the registry keeps order, returns a copy and rejects invalid or duplicate parts` (task 4.1): passed
- `test.support.e2e-stack.database-part.test.ts::C-907d77a5 discovery rejects a repeated prefix or name naming the later file` (task 4.1): passed
- `test.support.e2e-stack.database-part.test.ts::C-c3092640 C-fe09bf7e the database part seeds the tenant and closes its cluster` (task 4.1): passed
- `test.support.e2e-stack.database-part.test.ts::C-fe09bf7e a database start with a missing data directory rejects and leaves no cluster` (task 4.1): passed
- `test.support.e2e-stack.discover.test.ts::C-4c698dd6 discovery rejects a directory that does not exist naming the directory` (task 1.2): passed
- `test.support.e2e-stack.discover.test.ts::C-4c698dd6 discovery rejects invalid part files naming the file` (task 1.2): passed
- `test.support.e2e-stack.discover.test.ts::C-71b5758c discovery returns parts in file name order and never imports test files` (task 1.2): passed
- `test.support.e2e-stack.discover.test.ts::C-907d77a5 discovery rejects a repeated name naming the later file` (task 1.2): passed
- `test.support.e2e-stack.discover.test.ts::C-907d77a5 discovery rejects a repeated prefix naming the later file` (task 1.2): passed
- `test.support.e2e-stack.faults.test.ts::C-14cae224 FaultInvalidError carries its code, reason and message` (task 3.1): passed
- `test.support.e2e-stack.faults.test.ts::C-14cae224 parseFault names the first failing field of an invalid fault` (task 3.1): passed
- `test.support.e2e-stack.faults.test.ts::C-14cae224 the 101st distinct fault is refused with too_many and the table is unchanged` (task 3.1): passed
- `test.support.e2e-stack.faults.test.ts::C-346ddf48 a status fault answers the injected envelope and clear restores the route` (task 3.1): passed
- `test.support.e2e-stack.faults.test.ts::C-9383903b a prefix delay sleeps once for the matching request, which continues, and a replacement answers 500` (task 3.1): passed
- `test.support.e2e-stack.faults.test.ts::C-9383903b an exact fault matches its method and the path before the query only, first match wins` (task 3.1): passed
- `test.support.e2e-stack.faults.test.ts::C-9383903b parseFault accepts exact, prefix, delay and status faults` (task 3.1): passed
- `test.support.e2e-stack.main.test.ts::C-23b4de23 the process prints one ready line, serves the database health and stops on SIGTERM` (task 5.3): passed
- `test.support.e2e-stack.main.test.ts::C-23b4de23 the process starts on the default ports 39080 and 39081` (task 5.3): passed
- `test.support.e2e-stack.main.test.ts::C-4e750e4e a bad E2E_PORT and a busy engine port exit 1 with the failure line` (task 5.3): passed
- `test.support.e2e-stack.main.test.ts::C-5f32b081 a signal during the start closes the stack without a ready line` (task 5.3): passed
- `test.support.e2e-stack.part.test.ts::C-89fc2527 E2eStackError carries its code, details and cause` (task 1.1): passed
- `test.support.e2e-stack.part.test.ts::C-89fc2527 registry lists parts in registration order and returns a copy` (task 1.1): passed
- `test.support.e2e-stack.part.test.ts::C-89fc2527 registry rejects a bad name, the engine name and a string start as invalid` (task 1.1): passed
- `test.support.e2e-stack.part.test.ts::C-89fc2527 registry rejects a duplicate name and keeps its list` (task 1.1): passed
- `test.support.e2e-stack.reset.test.ts::C-20bba381 a rejecting seed rejects STACK_RESET_FAILED naming the part and the next reset still runs` (task 3.2): passed
- `test.support.e2e-stack.reset.test.ts::C-20bba381 a reset clears the faults before seeding every part in order and probing the engine` (task 3.2): passed
- `test.support.e2e-stack.reset.test.ts::C-20bba381 seedAll seeds every part in order without clearing faults or probing the engine` (task 3.2): passed
- `test.support.e2e-stack.reset.test.ts::C-20bba381 two resets started together seed serially with a maximum concurrency of one` (task 3.2): passed
- `test.support.e2e-stack.reset.test.ts::C-c3238bfc five unhealthy probes reject STACK_RESET_FAILED for the engine after exactly five calls without a timer` (task 3.2): passed
- `test.support.e2e-stack.reset.test.ts::C-c3238bfc reset retries the health probe until it answers true, using three calls` (task 3.2): passed
- `test.support.e2e-stack.stack.db.test.ts::C-23b4de23 a stack starts, resets and closes without a DNS lookup of a name` (task 5.2): passed
- `test.support.e2e-stack.stack.db.test.ts::C-d194233f the stack health reports the migrated database, its tenant and its app sessions` (task 5.2): passed
- `test.support.e2e-stack.stack.db.test.ts::C-dd21514e the engine key and database password are private files that never reach health` (task 5.2): passed
- `test.support.e2e-stack.stack.db.test.ts::C-f55456d0 reset restores the seeded tenant, drops probe state and clears faults` (task 5.2): passed
- `test.support.e2e-stack.stack.db.test.ts::C-fe09bf7e closing the stack stops Postgres and removes its cluster directory` (task 5.2): passed
- `test.support.e2e-stack.stack.test.ts::C-20bba381 resets re-run seeds serially and answer 500 for a rejecting seed before recovering` (task 5.1): passed
- `test.support.e2e-stack.stack.test.ts::C-346ddf48 a fault posted to the control listener fails the engine route until it is deleted` (task 5.1): passed
- `test.support.e2e-stack.stack.test.ts::C-66ec4c4e a busy engine port rejects STACK_ENGINE_FAILED with the fatal EADDRINUSE line` (task 5.1): passed
- `test.support.e2e-stack.stack.test.ts::C-66ec4c4e invalid options reject before any part starts` (task 5.1): passed

## Guard events

- guard.test_tamper: e2e/test_e2e_stack.py
- guard.test_tamper: e2e/test_e2e_stack.py
