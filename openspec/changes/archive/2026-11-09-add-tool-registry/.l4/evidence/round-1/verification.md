# Verification: openspec:add-tool-registry: NEEDS_HUMAN (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `5d7c9671a8ba06a29f650933c402ede0d7735110`
- Head: `b993ce67776f222f2b7f68ac3d358969ae70f786`
- Implementer profiles: deepseek-free, claude-sonnet, glm
- Judge: nemotron-judge, 5 call(s), judged in 1 parts, prompt sha256 `2ef8781e33929d07f14f5cb6adaa24d252190d48f09d931e0b9d158f8921888c`
  - part 1: 15 file(s), 109629 characters, profile nemotron-judge, reply valid
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: -
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool), glm zhipu (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@5d7c9671a8 contained |
| 1 | integrity | ok | 196.8 | 11 sub-checks (+1 unfrozen by human answers); scope: 32 changed file(s) |
| 2 | build | ok | 28.2 |  |
| 3 | tests | ok | 339.6 |  |
| 4 | traceability | ok | 0.2 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/tool-server-routes.ts, src/main.ts, src/tools/directory.ts, src/tools/index.ts and 5 more |
| 8 | s1 judge | ok | 1.5 | 11/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | failed | 2571.2 | timeout: no answer within 600s |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261109T2007Z-2f1c/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261109T2007Z-2f1c/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261109T2007Z-2f1c/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261109T2007Z-2f1c/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261109T2007Z-2f1c/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261109T2007Z-2f1c/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261109T2007Z-2f1c/029-e2e.log |

## Files by part

- part 1: src/db/migrations/0470_tool_registry.sql (2693 characters)
- part 1: src/tools/approve.test.ts (19544 characters)
- part 1: src/tools/directory.test.ts (12920 characters)
- part 1: src/tools/directory.ts (4006 characters)
- part 1: src/api/index.ts (711 characters)
- part 1: src/tools/index.ts (1038 characters)
- part 1: src/main.tools.test.ts (3713 characters)
- part 1: src/main.ts (850 characters)
- part 1: docs/api/openapi.json (32338 characters)
- part 1: src/tools/origin.test.ts (6403 characters)
- part 1: src/tools/origin.ts (7651 characters)
- part 1: src/tools/policy.test.ts (6185 characters)
- part 1: test/support/README.md (777 characters)
- part 1: src/tools/refs.test.ts (3180 characters)
- part 1: src/tools/schema.test.ts (7620 characters)
- part 2: src/tools/store.test.ts (10038 characters)
- part 2: src/tools/store.ts (19665 characters)
- part 2: src/tools/submit.test.ts (8625 characters)
- part 2: src/tools/surface.test.ts (4015 characters)
- part 2: src/tools/surface.ts (7615 characters)
- part 2: openspec/changes/add-tool-registry/tasks.md (9422 characters)
- part 2: src/api/tool-server-routes.test.ts (23294 characters)
- part 2: src/api/tool-server-routes.ts (10883 characters)
- part 2: test/support/tool-surface.test.ts (3241 characters)
- part 2: test/support/tool-surface.ts (2102 characters)
- part 2: src/tools/policy/tools.cedar (435 characters)
- part 2: src/tools/types.ts (956 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/index.ts, src/api/tool-server-routes.test.ts, src/api/tool-server-routes.ts, src/main.tools.test.ts, src/main.ts (+17 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2114 of 2114 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/tools/store.test.ts kept at head for the run (task 3.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/tools/store.test.ts (task 3.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-c3dcd848 | tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow update rights | covered | src.tools.schema.test.ts::C-c3dcd848 migration 0470 stores servers and surfaces with narrow update rights (passed, red_assertion) | - | 0.87 |
| C-f1acd012 | tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason | covered | src.tools.origin.test.ts::C-f1acd012: each of the 55 origin rows is accepted or refused with its reason (passed, red_assertion) | - | 0.94 |
| C-9e03eeea | tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major | covered | src.tools.refs.test.ts::C-9e03eeea: surfaceRefs gives major 1 when nothing is taken or the same content holds it (passed, red_assertion); src.tools.refs.test.ts::C-9e03eeea: surfaceRefs skips a major held with other content (passed, red_assertion); src.tools.refs.test.ts::C-9e03eeea: surfaceRefs tak... | - | - |
| C-d0c13cf0 | tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign | covered | src.tools.store.test.ts::C-d0c13cf0: registerToolServer refuses invalid inputs and surfaces with their field and reason (passed, red_assertion); src.tools.store.test.ts::C-d0c13cf0: registerToolServer stores a pending server with its first surface (passed, red_assertion); src.tools.store.test.ts::C-... | - | 0.74 |
| C-59cbd279 | tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing | covered | src.tools.approve.test.ts::C-59cbd279: a team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing (passed, red_assertion) | - | 0.92 |
| C-6d84e4c8 | tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after a failed second step | covered | src.tools.approve.test.ts::C-6d84e4c8: approval imports bound blocks, and a repeat completes after a failed second step (passed, red_assertion) | - | - |
| C-0955b490 | tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it | covered | src.tools.submit.test.ts::C-0955b490: a submitted surface drifts an approved server and re-approval restores it (passed, red_assertion) | - | 0.92 |
| C-c3474bfc | tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for everything else | covered | src.tools.directory.test.ts::C-c3474bfc: a database failure rejects instead of answering null (passed, red_assertion); src.tools.directory.test.ts::C-c3474bfc: blocks stored by a failed or raced approval stay inert (passed, red_assertion); src.tools.directory.test.ts::C-c3474bfc: the directory answe... | - | 0.90 |
| C-95f2b798 | tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions | covered | src.tools.policy.test.ts::C-95f2b798 only tenant admins of the tenant hold the two actions (passed, red_assertion); src.tools.policy.test.ts::C-95f2b798 the default sources hold exactly the two tool permits (passed, red_assertion) | - | 0.90 |
| C-0ab1d0b5 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing | covered | src.api.tool-server-routes.test.ts::C-0ab1d0b5 carol registers and reads while alice is refused and tenant_b sees nothing (passed, red_assertion); src.api.tool-server-routes.test.ts::C-0ab1d0b5 malformed requests are 400 with the field of the rule (passed, red_assertion); src.api.tool-server-routes.... | - | 0.95 |
| C-29de3844 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound | covered | src.api.tool-server-routes.test.ts::C-29de3844 approval follows the review profile and the approved blocks show as bound (passed, red_assertion) | - | 0.91 |
| C-4114528c | tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do | covered | src.api.tool-server-routes.test.ts::C-4114528c a null PEP pool answers every route 503 before validation (passed, red_assertion); src.api.tool-server-routes.test.ts::C-4114528c a null deps pool is 503 for carol and 403 for alice (passed, red_assertion); src.api.tool-server-routes.test.ts::C-4114528c... | - | 0.93 |
| C-0bfb5dc5 | tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions | covered | src.main.tools.test.ts::C-0bfb5dc5 the committed OpenAPI document holds the five tool server operations with their actions (passed, red_assertion) | - | 0.79 |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-registry/.l4/ledger/r-20261109T1452Z-37e1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-registry/.l4/ledger/r-20261109T1727Z-b0a3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-registry/.l4/ledger/r-20261109T1731Z-f90b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-registry/.l4/ledger/r-20261109T2007Z-2f1c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-registry/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tool-registry/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/tool-server-routes.test.ts` |  | relevant | new test file |
| `src/api/tool-server-routes.ts` | api | relevant | named in the spec |
| `src/db/migrations/0470_tool_registry.sql` | db | relevant | named in the spec |
| `src/main.tools.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/tools/approve.test.ts` |  | relevant | new test file |
| `src/tools/directory.test.ts` |  | relevant | new test file |
| `src/tools/directory.ts` | tools | relevant | named in the spec |
| `src/tools/index.ts` | tools | relevant | named in the spec |
| `src/tools/origin.test.ts` |  | relevant | new test file |
| `src/tools/origin.ts` | tools | relevant | named in the spec |
| `src/tools/policy.test.ts` |  | relevant | new test file |
| `src/tools/policy/tools.cedar` | tools | relevant | named in the spec |
| `src/tools/refs.test.ts` |  | relevant | new test file |
| `src/tools/schema.test.ts` |  | relevant | new test file |
| `src/tools/store.test.ts` |  | relevant | new test file |
| `src/tools/store.ts` | tools | relevant | named in the spec |
| `src/tools/submit.test.ts` |  | relevant | new test file |
| `src/tools/surface.test.ts` |  | relevant | new test file |
| `src/tools/surface.ts` | tools | relevant | named in the spec |
| `src/tools/types.ts` | tools | relevant | named in the spec |
| `test/support/README.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/tool-surface.test.ts` |  | relevant | new test file |
| `test/support/tool-surface.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/tool-server-routes.ts, src/main.ts, src/tools/directory.ts, src/tools/index.ts and 5 more

### Tests

2201 of 2202 passed, 1 failed, 0 errored, 0 skipped.
31 of 31 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-c3dcd848 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f1acd012 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9e03eeea | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-d0c13cf0 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-59cbd279 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6d84e4c8 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-0955b490 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3474bfc | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95f2b798 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0ab1d0b5 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-29de3844 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4114528c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0bfb5dc5 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-c3dcd848 | tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow update rights | - | needs_human | the judge gave no verdict for this criterion |
| C-f1acd012 | tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason | - | needs_human | the judge gave no verdict for this criterion |
| C-9e03eeea | tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major | - | needs_human | the judge gave no verdict for this criterion |
| C-d0c13cf0 | tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign | - | needs_human | the judge gave no verdict for this criterion |
| C-59cbd279 | tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing | - | needs_human | the judge gave no verdict for this criterion |
| C-6d84e4c8 | tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after a failed second step | - | needs_human | the judge gave no verdict for this criterion |
| C-0955b490 | tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it | - | needs_human | the judge gave no verdict for this criterion |
| C-c3474bfc | tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for everything else | - | needs_human | the judge gave no verdict for this criterion |
| C-95f2b798 | tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions | - | needs_human | the judge gave no verdict for this criterion |
| C-0ab1d0b5 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing | - | needs_human | the judge gave no verdict for this criterion |
| C-29de3844 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound | - | needs_human | the judge gave no verdict for this criterion |
| C-4114528c | tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do | - | needs_human | the judge gave no verdict for this criterion |
| C-0bfb5dc5 | tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions | - | needs_human | the judge gave no verdict for this criterion |

## Findings

None.

## Needs a human

- the judge's reply was discarded (part 2 of 2, timeout: no answer within 600s)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.tool-server-routes.test.ts::C-0ab1d0b5 carol registers and reads while alice is refused and tenant_b sees nothing` (task 5.1): passed
- `src.api.tool-server-routes.test.ts::C-0ab1d0b5 malformed requests are 400 with the field of the rule` (task 5.1): passed
- `src.api.tool-server-routes.test.ts::C-0ab1d0b5 the local flag widens the origin check and the audit names carol` (task 5.1): passed
- `src.api.tool-server-routes.test.ts::C-29de3844 approval follows the review profile and the approved blocks show as bound` (task 5.1): passed
- `src.api.tool-server-routes.test.ts::C-4114528c a null PEP pool answers every route 503 before validation` (task 5.1): passed
- `src.api.tool-server-routes.test.ts::C-4114528c a null deps pool is 503 for carol and 403 for alice` (task 5.1): passed
- `src.api.tool-server-routes.test.ts::C-4114528c a null engine key refuses paging only` (task 5.1): passed
- `src.main.tools.test.ts::C-0bfb5dc5 the committed OpenAPI document holds the five tool server operations with their actions` (task 5.2): passed
- `src.tools.approve.test.ts::C-59cbd279: a team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing` (task 3.2): passed
- `src.tools.approve.test.ts::C-6d84e4c8: approval imports bound blocks, and a repeat completes after a failed second step` (task 3.2): passed
- `src.tools.directory.test.ts::C-c3474bfc: a database failure rejects instead of answering null` (task 4.1): passed
- `src.tools.directory.test.ts::C-c3474bfc: blocks stored by a failed or raced approval stay inert` (task 4.1): passed
- `src.tools.directory.test.ts::C-c3474bfc: the directory answers an approved tool, a drifted one with its state, and null for everything else` (task 4.1): passed
- `src.tools.origin.test.ts::C-f1acd012: each of the 55 origin rows is accepted or refused with its reason` (task 2.1): passed
- `src.tools.policy.test.ts::C-95f2b798 only tenant admins of the tenant hold the two actions` (task 4.2): passed
- `src.tools.policy.test.ts::C-95f2b798 the default sources hold exactly the two tool permits` (task 4.2): passed
- `src.tools.refs.test.ts::C-9e03eeea: surfaceRefs gives major 1 when nothing is taken or the same content holds it` (task 2.4): passed
- `src.tools.refs.test.ts::C-9e03eeea: surfaceRefs skips a major held with other content` (task 2.4): passed
- `src.tools.refs.test.ts::C-9e03eeea: surfaceRefs takes the lowest free major and ignores other servers` (task 2.4): passed
- `src.tools.refs.test.ts::C-9e03eeea: surfaceRefs tells a changed tool block from the same one by its hash` (task 2.4): passed
- `src.tools.schema.test.ts::C-c3dcd848 migration 0470 stores servers and surfaces with narrow update rights` (task 1.1): passed
- `src.tools.store.test.ts::C-d0c13cf0: registerToolServer refuses invalid inputs and surfaces with their field and reason` (task 3.1): passed
- `src.tools.store.test.ts::C-d0c13cf0: registerToolServer stores a pending server with its first surface` (task 3.1): passed
- `src.tools.store.test.ts::C-d0c13cf0: registerToolServerTx refuses a transaction of another tenant and writes nothing` (task 3.1): passed
- `src.tools.submit.test.ts::C-0955b490: a submitted surface drifts an approved server and re-approval restores it` (task 3.3): passed
- `src.tools.surface.test.ts::C-9e03eeea: SMALL digest ignores tool order and explicit defaults` (task 2.2): passed
- `src.tools.surface.test.ts::C-9e03eeea: each one-field variant and the one-tool form has a distinct digest` (task 2.2): passed
- `test.support.tool-surface.test.ts::C-9e03eeea: fixtureSurface builds the two erp surfaces as D_A and D_A_DEFAULT` (task 2.3): passed
- `test.support.tool-surface.test.ts::C-9e03eeea: fixtureSurface names the four-ref tools and posts to their catalogue paths` (task 2.3): passed
- `test.support.tool-surface.test.ts::C-9e03eeea: fixtureSurface refuses an unknown ref and a duplicate tool name` (task 2.3): passed
- `test.support.tool-surface.test.ts::C-9e03eeea: the support README names tool-surface.ts exactly once` (task 2.3): passed
