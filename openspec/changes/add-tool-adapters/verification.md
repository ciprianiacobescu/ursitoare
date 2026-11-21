# Verification: openspec:add-tool-adapters: PASS (round 2)

traceability: 12/16 criteria covered by a discriminating test

- Base: `a8d10fdad04a39f328aa7a42014f7e5a576404ed`
- Head: `8ad135c7acdc24e036d5ececebef39d0e997bf5b`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 2 call(s), judged in 2 parts, prompt sha256 `4f3e5311e6c1578ea49abc4b9292c643c4a83b90f7983a0842721b8bf86a5277`
  - part 1: 19 file(s), 113354 characters, profile beam-judge, reply valid
  - part 2: 9 file(s), 33717 characters, profile beam-judge, reply valid
- Judge replies of beam-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261121T2109Z-0d73/090-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261121T2109Z-0d73/091-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261121T2109Z-0d73/092-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261121T2109Z-0d73/093-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261121T2109Z-0d73/094-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261121T2109Z-0d73/095-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261121T2109Z-0d73/096-e2e.log |

## Files by part

- part 1: src/runtimes/invoke/adapter-authorize.db.test.ts (9288 characters)
- part 1: src/runtimes/invoke/adapter-authorize.test.ts (8461 characters)
- part 1: src/tools/adapter-digest.test.ts (9004 characters)
- part 1: src/tools/adapter-directory.db.test.ts (6993 characters)
- part 1: src/runtimes/invoke/adapter-invoke.db.test.ts (9478 characters)
- part 1: test/support/adapter-kit.ts (7728 characters)
- part 1: src/tools/adapter-register.db.test.ts (7396 characters)
- part 1: src/tools/adapter-store.ts (2998 characters)
- part 1: src/tools/adapter-submit.db.test.ts (8759 characters)
- part 1: src/tools/adapter-surface.test.ts (16731 characters)
- part 1: src/tools/adapter-surface.ts (15634 characters)
- part 1: src/runtimes/invoke/call-request.test.ts (2951 characters)
- part 1: src/tools/calls.ts (570 characters)
- part 1: src/tools/directory.ts (2500 characters)
- part 1: test/support/invoke-runs/harness.ts (1191 characters)
- part 1: src/runtimes/index.ts (690 characters)
- part 1: src/tools/index.ts (1013 characters)
- part 1: src/tools/names.test.ts (1169 characters)
- part 1: src/tools/names.ts (800 characters)
- part 2: src/runtimes/invoke/path.ts (8381 characters)
- part 2: test/support/README.md (1017 characters)
- part 2: src/runtimes/invoke/request.ts (2357 characters)
- part 2: src/tools/store.ts (8420 characters)
- part 2: src/tools/surface.ts (1850 characters)
- part 2: openspec/changes/add-tool-adapters/tasks.md (9265 characters)
- part 2: src/interpreter/types.ts (378 characters)
- part 2: src/runtimes/invoke/types.ts (1051 characters)
- part 2: src/tools/types.ts (998 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 9 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/interpreter/types.ts, src/runtimes/index.ts, src/runtimes/invoke/adapter-authorize.db.test.ts, src/runtimes/invoke/adapter-authorize.test.ts, src/runtimes/invoke/adapter-invoke.db.test.ts (+21 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2672 of 2672 base tests pass on the unit's code with its 9 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/tools/adapter-submit.db.test.ts kept at head for the run (task 2.2: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/tools/adapter-submit.db.test.ts (task 2.2, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-0834e2d4 | tool-invocation › Authorization is recorded before anything is sent › A decision is recorded in a transaction of its own | covered | src.pdp.log-own-tx.db.test.ts::C-0834e2d4 a decision is recorded in a transaction of its own (passed, pass_to_pass) | - | 0.88 |
| C-f287b385 | tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised | uncovered | - | src.runtimes.invoke.authorize.db.test.ts::C-f287b385 a granted read is authorised (no proof that it discriminates (no red, audit or generated record)) | 0.20 |
| C-8b5cbc41 | tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons | uncovered | - | src.runtimes.invoke.authorize.db.test.ts::C-8b5cbc41 policy errors and an unrecorded decision deny with fixed reasons (no proof that it discriminates (no red, audit or generated record)) | 0.15 |
| C-a5498805 | tool-invocation › Authorization is recorded before anything is sent › A code call is authorised without a permit and no other call may be | covered | src.runtimes.invoke.adapter-authorize.db.test.ts::C-a5498805 a code call is authorised without a permit and runs in the runner, row P1 (passed, red_assertion); src.runtimes.invoke.adapter-authorize.db.test.ts::C-a5498805 a fixture call with no permit is refused permit_missing, row P4 (passed, red_as... | - | 0.89 |
| C-c28f570f | tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order | uncovered | - | src.runtimes.invoke.authorize.db.test.ts::C-c28f570f a dependency that rejects before the check is a failed call, row R11 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.authorize.db.test.ts::C-c28f570f each refusal reason in order, rows R1 to R10 R13 and R1... | 0.13 |
| C-40162b00 | tool-invocation › A refusal before the policy point records and sends nothing › A call binding without its adapter is refused and a build failure sends nothing | covered | src.runtimes.invoke.adapter-authorize.test.ts::C-40162b00 a call binding without its adapter is refused before the check, rows Q1 to Q3 (passed, red_assertion); src.runtimes.invoke.adapter-authorize.test.ts::C-40162b00 a code call skips the service lookup and reaches the check, row Q4 (passed, red_a... | - | 0.92 |
| C-17a3e8b7 | tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure | uncovered | - | src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a granted read is sent as one brokered request, row C1 (no proof that it discriminates (no red, audit or generated record)); src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a missing or copied authorization is unauthorized, row C9 (no proof that it... | 0.12 |
| C-bac67254 | tool-invocation › invoke sends only what was authorised › An adapter answer maps to a result or a failure and a code call runs with no token | covered | src.runtimes.invoke.adapter-invoke.db.test.ts::C-bac67254 C-a5498805 an http answer is the output, and a null permit is refused, rows A1 and P5 (passed, red_assertion); src.runtimes.invoke.adapter-invoke.db.test.ts::C-bac67254 a 500 answer fails at the upstream stage with its status, row A4 (passed,... | - | 0.86 |
| C-bbe52fdc | tool-invocation › callRequest builds the one request of an adapter call and its egress › Request vectors and a binding without http | covered | src.runtimes.invoke.call-request.test.ts::C-bbe52fdc callRequest builds W1 to W3 and toolRequest refuses a binding without http (passed, red_assertion) | - | 0.95 |
| C-fcf2be72 | tool-registry › An adapter surface carries one call per tool and is checked per adapter › Each adapter's surface is accepted or refused with a field and a reason | covered | src.tools.adapter-surface.test.ts::C-fcf2be72: a pattern in a schema position is refused but pattern data is accepted (passed, red_assertion); src.tools.adapter-surface.test.ts::C-fcf2be72: a surface over the size limit is refused and the one below it is accepted (passed, red_assertion); src.tools.a... | - | - |
| C-1a56fd0a | tool-registry › The surface digest covers the call and every M6 vector holds › Each call member changes the digest and the M6 vector is kept | covered | src.tools.adapter-digest.test.ts::C-1a56fd0a: each call member changes the digest and the twelve are pairwise distinct (passed, red_assertion); src.tools.adapter-digest.test.ts::C-1a56fd0a: each call vector hashes to its expected digest and SMALL is kept (passed, red_assertion) | - | 0.94 |
| C-8d392fff | tool-registry › toolNameOf maps an external tool name to a tool name › Name vectors | covered | src.tools.names.test.ts::C-8d392fff toolNameOf maps an external tool name to a tool name (passed, red_assertion) | - | 0.77 |
| C-b12d4caf | tool-registry › registerAdapterServerTx registers an adapter server pending › Registering each adapter, and each refusal | covered | src.tools.adapter-register.db.test.ts::C-b12d4caf: registerAdapterServerTx refuses each bad input and writes nothing (passed, red_assertion); src.tools.adapter-register.db.test.ts::C-b12d4caf: registerAdapterServerTx registers http_openapi, mcp and code_block servers pending (passed, red_assertion) | - | 0.86 |
| C-900c62ad | tool-registry › submitAdapterSurfaceTx follows the submit rules, and the newest surface wins a tie › An adapter surface follows the submit rules and the newest wins a tie | covered | src.tools.adapter-submit.db.test.ts::C-900c62ad: an adapter surface follows the submit rules and the newest wins a tie (passed, red_assertion) | - | 0.87 |
| C-39c2ae60 | tool-registry › submitAdapterSurfaceTx follows the submit rules, and the newest surface wins a tie › The two submit paths refuse the other kind of server and write nothing | covered | src.tools.adapter-submit.db.test.ts::C-39c2ae60: the two submit paths refuse the other kind of server and write nothing (passed, red_assertion) | - | 0.92 |
| C-06d6192c | tool-registry › The directory binds a call tool with its call and no http › A call binding, a fixture binding and an unapproved server | covered | src.tools.adapter-directory.db.test.ts::C-06d6192c: the directory binds a call tool with its call and no http (passed, red_assertion) | - | 0.78 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-tool-adapters/.l4/ledger/r-20261121T1820Z-9ba9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-adapters/.l4/ledger/r-20261121T2043Z-ef00.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-adapters/.l4/ledger/r-20261121T2109Z-0d73.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-adapters/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-adapters/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/interpreter/types.ts` | interpreter | relevant | named in the spec |
| `src/runtimes/index.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/adapter-authorize.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/adapter-authorize.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/adapter-invoke.db.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/call-request.test.ts` |  | relevant | new test file |
| `src/runtimes/invoke/path.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/request.ts` | runtimes | relevant | named in the spec |
| `src/runtimes/invoke/types.ts` | runtimes | relevant | named in the spec |
| `src/tools/adapter-digest.test.ts` |  | relevant | new test file |
| `src/tools/adapter-directory.db.test.ts` |  | relevant | new test file |
| `src/tools/adapter-register.db.test.ts` |  | relevant | new test file |
| `src/tools/adapter-store.ts` | tools | relevant | named in the spec |
| `src/tools/adapter-submit.db.test.ts` |  | relevant | new test file |
| `src/tools/adapter-surface.test.ts` |  | relevant | new test file |
| `src/tools/adapter-surface.ts` | tools | relevant | named in the spec |
| `src/tools/calls.ts` | tools | relevant | named in the spec |
| `src/tools/directory.ts` | tools | relevant | named in the spec |
| `src/tools/index.ts` | tools | relevant | named in the spec |
| `src/tools/names.test.ts` |  | relevant | new test file |
| `src/tools/names.ts` | tools | relevant | named in the spec |
| `src/tools/store.ts` | tools | relevant | named in the spec |
| `src/tools/surface.ts` | tools | relevant | named in the spec |
| `src/tools/types.ts` | tools | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/adapter-kit.ts` | test | relevant | named in the spec |
| `test/support/invoke-runs/harness.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/interpreter/types.ts, src/runtimes/index.ts, src/runtimes/invoke/path.ts, src/runtimes/invoke/request.ts, src/runtimes/invoke/types.ts and 11 more

### Tests

2824 of 2824 passed, 0 failed, 0 errored, 0 skipped.
29 of 29 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-0834e2d4 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f287b385 | ok | 0.200 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8b5cbc41 | ok | 0.150 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a5498805 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c28f570f | ok | 0.130 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-40162b00 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-17a3e8b7 | ok | 0.120 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bac67254 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bbe52fdc | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fcf2be72 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-1a56fd0a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8d392fff | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b12d4caf | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-900c62ad | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39c2ae60 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-06d6192c | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-002 accept C-f287b385 by the delegate (claude-fable-5-1 via claude-code): The frozen test of the base unit runs the exact scenario: it grants G_LOOKUP, deploys, starts live run r_1, calls authorize for LOOKUP on the live invoker and asserts the V1 permit, isIssuedPermit true, one decision row with action invoke_tool, principal User tenant_a/alice, resource Block tenant_a/...
- Q-003 accept C-8b5cbc41 by the delegate (claude-fable-5-1 via claude-code): The frozen test runs rows E1 to E5 and E7 on one harness whose policy wrapper takes the check answer from the row: E1 to E3 throw policy_error with decisionId and errorCount and leave deny rows with their errors and no permit, E4 and E5 throw policy_unavailable with code ECONNREFUSED and UNKNOWN and...
- Q-004 accept C-c28f570f by the delegate (claude-fable-5-1 via claude-code): The four frozen tests cover rows R1 to R15: the rig test checks each refusal reason and details in order with node and no decisionId, the hook row adding hook pay:post:notify, and asserts check and connect counts 1 only for R9 and gateway 0 in every row; the R11 test asserts INTERPRETER_TOOL_FAILED ...
- Q-005 accept C-17a3e8b7 by the delegate (claude-fable-5-1 via claude-code): The seven frozen tests cover rows C1 to C10: C1 asserts the output, one issued token with serviceId S, agent ursitoare-engine and TTL 60 and one fake tools call with callHeader r_1:lookup:1, host, path and body digest D_LV; C2 and C3 assert upstream with status and that logs hold neither brokerServi...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-0834e2d4 | tool-invocation › Authorization is recorded before anything is sent › A decision is recorded in a transaction of its own | pass | pass | the judge passed it and a discriminating test passes |
| C-f287b385 | tool-invocation › Authorization is recorded before anything is sent › A granted read is authorised | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The frozen test of the base unit runs the exact scenario: it grants G_LOOKUP, deploys, starts live run r_1, calls authorize for LOOKUP on the live invoker and asserts the V1 permit, isIssuedPermit true, one decision row with action invoke_... |
| C-8b5cbc41 | tool-invocation › Authorization is recorded before anything is sent › Policy errors and an unrecorded decision deny with fixed reasons | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The frozen test runs rows E1 to E5 and E7 on one harness whose policy wrapper takes the check answer from the row: E1 to E3 throw policy_error with decisionId and errorCount and leave deny rows with their errors and no permit, E4 and E5 th... |
| C-a5498805 | tool-invocation › Authorization is recorded before anything is sent › A code call is authorised without a permit and no other call may be | pass | pass | the judge passed it and a discriminating test passes |
| C-c28f570f | tool-invocation › A refusal before the policy point records and sends nothing › Each refusal reason, in order | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The four frozen tests cover rows R1 to R15: the rig test checks each refusal reason and details in order with node and no decisionId, the hook row adding hook pay:post:notify, and asserts check and connect counts 1 only for R9 and gateway ... |
| C-40162b00 | tool-invocation › A refusal before the policy point records and sends nothing › A call binding without its adapter is refused and a build failure sends nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-17a3e8b7 | tool-invocation › invoke sends only what was authorised › A call through the fakes, and each failure | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The seven frozen tests cover rows C1 to C10: C1 asserts the output, one issued token with serviceId S, agent ursitoare-engine and TTL 60 and one fake tools call with callHeader r_1:lookup:1, host, path and body digest D_LV; C2 and C3 asser... |
| C-bac67254 | tool-invocation › invoke sends only what was authorised › An adapter answer maps to a result or a failure and a code call runs with no token | pass | pass | the judge passed it and a discriminating test passes |
| C-bbe52fdc | tool-invocation › callRequest builds the one request of an adapter call and its egress › Request vectors and a binding without http | pass | pass | the judge passed it and a discriminating test passes |
| C-fcf2be72 | tool-registry › An adapter surface carries one call per tool and is checked per adapter › Each adapter's surface is accepted or refused with a field and a reason | pass | pass | the judge passed it and a discriminating test passes |
| C-1a56fd0a | tool-registry › The surface digest covers the call and every M6 vector holds › Each call member changes the digest and the M6 vector is kept | pass | pass | the judge passed it and a discriminating test passes |
| C-8d392fff | tool-registry › toolNameOf maps an external tool name to a tool name › Name vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-b12d4caf | tool-registry › registerAdapterServerTx registers an adapter server pending › Registering each adapter, and each refusal | pass | pass | the judge passed it and a discriminating test passes |
| C-900c62ad | tool-registry › submitAdapterSurfaceTx follows the submit rules, and the newest surface wins a tie › An adapter surface follows the submit rules and the newest wins a tie | pass | pass | the judge passed it and a discriminating test passes |
| C-39c2ae60 | tool-registry › submitAdapterSurfaceTx follows the submit rules, and the newest surface wins a tie › The two submit paths refuse the other kind of server and write nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-06d6192c | tool-registry › The directory binds a call tool with its call and no http › A call binding, a fixture binding and an unapproved server | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-f287b385): src.runtimes.invoke.authorize.db.test.ts::C-f287b385 a granted read is authorised: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8b5cbc41): src.runtimes.invoke.authorize.db.test.ts::C-8b5cbc41 policy errors and an unrecorded decision deny with fixed reasons: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c28f570f): src.runtimes.invoke.authorize.db.test.ts::C-c28f570f a dependency that rejects before the check is a failed call, row R11: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c28f570f): src.runtimes.invoke.authorize.db.test.ts::C-c28f570f each refusal reason in order, rows R1 to R10 R13 and R14: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c28f570f): src.runtimes.invoke.authorize.db.test.ts::C-c28f570f the approver of a rejected or null approval is not loaded, row R15: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c28f570f): src.runtimes.invoke.authorize.db.test.ts::C-c28f570f the initiator is loaded on each authorize and the version once, row R12: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-17a3e8b7): src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a granted read is sent as one brokered request, row C1: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-17a3e8b7): src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a missing or copied authorization is unauthorized, row C9: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-17a3e8b7): src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a redirect is not followed and a non JSON body fails, rows C4 to C6: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-17a3e8b7): src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a rejected send fails at the send stage, row C8: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-17a3e8b7): src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 a rejected token request fails at the token stage, row C7: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-17a3e8b7): src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 an authorization is consumed by its invoke, row C10: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-17a3e8b7): src.runtimes.invoke.invoke.db.test.ts::C-17a3e8b7 an upstream status other than 2xx fails the call, rows C2 and C3: no proof that it discriminates (no red, audit or generated record)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.runtimes.invoke.adapter-authorize.db.test.ts::C-a5498805 a code call is authorised without a permit and runs in the runner, row P1` (task 3.2): passed
- `src.runtimes.invoke.adapter-authorize.db.test.ts::C-a5498805 a fixture call with no permit is refused permit_missing, row P4` (task 3.2): passed
- `src.runtimes.invoke.adapter-authorize.db.test.ts::C-a5498805 an authorization whose permit is set to null is refused by invoke, row P5` (task 3.2): passed
- `src.runtimes.invoke.adapter-authorize.db.test.ts::C-a5498805 an http call with no permit is refused permit_missing, row P2` (task 3.2): passed
- `src.runtimes.invoke.adapter-authorize.db.test.ts::C-a5498805 an mcp call with no permit is refused permit_missing, row P3` (task 3.2): passed
- `src.runtimes.invoke.adapter-authorize.test.ts::C-40162b00 a call binding without its adapter is refused before the check, rows Q1 to Q3` (task 3.2): passed
- `src.runtimes.invoke.adapter-authorize.test.ts::C-40162b00 a code call skips the service lookup and reaches the check, row Q4` (task 3.2): passed
- `src.runtimes.invoke.adapter-authorize.test.ts::C-40162b00 a refused build is a request failure that sends nothing, rows Q5 and Q6` (task 3.2): passed
- `src.runtimes.invoke.adapter-invoke.db.test.ts::C-bac67254 C-a5498805 an http answer is the output, and a null permit is refused, rows A1 and P5` (task 3.3): passed
- `src.runtimes.invoke.adapter-invoke.db.test.ts::C-bac67254 a 500 answer fails at the upstream stage with its status, row A4` (task 3.3): passed
- `src.runtimes.invoke.adapter-invoke.db.test.ts::C-bac67254 a body that is not an object, then a throwing answer, fail at the response stage, row A3` (task 3.3): passed
- `src.runtimes.invoke.adapter-invoke.db.test.ts::C-bac67254 a code call runs with no token and a runner failure maps to runner, rows A5 and A6` (task 3.3): passed
- `src.runtimes.invoke.adapter-invoke.db.test.ts::C-bac67254 an mcp answer is the output, row A2` (task 3.3): passed
- `src.runtimes.invoke.call-request.test.ts::C-bbe52fdc callRequest builds W1 to W3 and toolRequest refuses a binding without http` (task 3.1): passed
- `src.tools.adapter-digest.test.ts::C-1a56fd0a: each call member changes the digest and the twelve are pairwise distinct` (task 1.3): passed
- `src.tools.adapter-digest.test.ts::C-1a56fd0a: each call vector hashes to its expected digest and SMALL is kept` (task 1.3): passed
- `src.tools.adapter-directory.db.test.ts::C-06d6192c: the directory binds a call tool with its call and no http` (task 2.3): passed
- `src.tools.adapter-register.db.test.ts::C-b12d4caf: registerAdapterServerTx refuses each bad input and writes nothing` (task 2.1): passed
- `src.tools.adapter-register.db.test.ts::C-b12d4caf: registerAdapterServerTx registers http_openapi, mcp and code_block servers pending` (task 2.1): passed
- `src.tools.adapter-submit.db.test.ts::C-39c2ae60: the two submit paths refuse the other kind of server and write nothing` (task 2.2): passed
- `src.tools.adapter-submit.db.test.ts::C-900c62ad: an adapter surface follows the submit rules and the newest wins a tie` (task 2.2): passed
- `src.tools.adapter-surface.test.ts::C-fcf2be72: a pattern in a schema position is refused but pattern data is accepted` (task 1.2): passed
- `src.tools.adapter-surface.test.ts::C-fcf2be72: a surface over the size limit is refused and the one below it is accepted` (task 1.2): passed
- `src.tools.adapter-surface.test.ts::C-fcf2be72: accepted surfaces come back as the same object` (task 1.2): passed
- `src.tools.adapter-surface.test.ts::C-fcf2be72: each refused tool names its field and reason` (task 1.2): passed
- `src.tools.adapter-surface.test.ts::C-fcf2be72: hints are an object of booleans and only on mcp calls` (task 1.2): passed
- `src.tools.adapter-surface.test.ts::C-fcf2be72: the five constants carry their fixed values` (task 1.2): passed
- `src.tools.adapter-surface.test.ts::C-fcf2be72: the surface itself is an object with a bounded tools array` (task 1.2): passed
- `src.tools.names.test.ts::C-8d392fff toolNameOf maps an external tool name to a tool name` (task 1.1): passed
