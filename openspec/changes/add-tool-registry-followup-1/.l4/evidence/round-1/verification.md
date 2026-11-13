# Verification: openspec:add-tool-registry-followup-1: PASS (round 1)

traceability: 14/14 criteria covered by a discriminating test

- Base: `4cd403b500107cdca546f81045970f45a0724ab2`
- Head: `595b9104ff53dafd1e83100fb47bd466a7546e3e`
- Implementer profiles: deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `07330cb644119d54d54bdeebec1bc4bb14427bfad9d6f5bf628c97d7398dc23c`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@4cd403b500 as 595b9104ff (15 commits) |
| 1 | integrity | ok | 334.1 | 11 sub-checks; scope: 12 changed file(s) |
| 2 | build | ok | 37.7 |  |
| 3 | tests | ok | 454.5 |  |
| 4 | traceability | ok | 0.2 | 14/14 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/tools/store.ts |
| 8 | s1 judge | ok | 0.8 | 12/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 151.1 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261113T0605Z-ff44/032-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261113T0605Z-ff44/033-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261113T0605Z-ff44/034-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261113T0605Z-ff44/035-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261113T0605Z-ff44/036-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261113T0605Z-ff44/037-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261113T0605Z-ff44/038-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 2 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/tool-server-routes-followup.test.ts, src/tools/store-tenant.test.ts, src/tools/store.ts, src/tools/submit-same-instant.test.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2463 of 2463 base tests pass on the unit's code with its 3 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-70e19ad9 | tool-registry › A new surface submitted in the same millisecond is shadowed by an older one — feedback FB-001 › A new surface submitted in the same millisecond is shadowed by an older one | covered | src.tools.submit-same-instant.test.ts::C-70e19ad9: a lower-digest surface submitted at the same instant drifts an approved server with its new pending digest (passed, red_assertion); src.tools.submit-same-instant.test.ts::C-70e19ad9: a lower-digest surface submitted at the same instant is the newest... | - | 0.93 |
| C-c3dcd848 | tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow update rights | covered | src.tools.schema.test.ts::C-c3dcd848 migration 0470 stores servers and surfaces with narrow update rights (passed, pass_to_pass) | - | 0.85 |
| C-f1acd012 | tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason | covered | src.tools.origin.test.ts::C-f1acd012: each of the 55 origin rows is accepted or refused with its reason (passed, pass_to_pass) | - | 0.91 |
| C-9e03eeea | tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major | covered | src.tools.refs.test.ts::C-9e03eeea: surfaceRefs gives major 1 when nothing is taken or the same content holds it (passed, pass_to_pass); src.tools.refs.test.ts::C-9e03eeea: surfaceRefs skips a major held with other content (passed, pass_to_pass); src.tools.refs.test.ts::C-9e03eeea: surfaceRefs takes... | - | - |
| C-d0c13cf0 | tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign | covered | src.tools.store.test.ts::C-d0c13cf0: registerToolServer refuses invalid inputs and surfaces with their field and reason (passed, pass_to_pass); src.tools.store.test.ts::C-d0c13cf0: registerToolServer stores a pending server with its first surface (passed, pass_to_pass); src.tools.store.test.ts::C-d0... | - | 0.74 |
| C-59cbd279 | tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing | covered | src.tools.approve.test.ts::C-59cbd279: a team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing (passed, pass_to_pass) | - | 0.89 |
| C-6d84e4c8 | tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after a failed second step | covered | src.tools.approve.test.ts::C-6d84e4c8: approval imports bound blocks, and a repeat completes after a failed second step (passed, pass_to_pass) | - | - |
| C-0955b490 | tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it | covered | src.tools.submit.test.ts::C-0955b490: a submitted surface drifts an approved server and re-approval restores it (passed, pass_to_pass) | - | 0.92 |
| C-c3474bfc | tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for everything else | covered | src.tools.directory.test.ts::C-c3474bfc: a database failure rejects instead of answering null (passed, pass_to_pass); src.tools.directory.test.ts::C-c3474bfc: blocks stored by a failed or raced approval stay inert (passed, pass_to_pass); src.tools.directory.test.ts::C-c3474bfc: the directory answers... | - | 0.91 |
| C-95f2b798 | tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions | covered | src.tools.policy.test.ts::C-95f2b798 only tenant admins of the tenant hold the two actions (passed, pass_to_pass); src.tools.policy.test.ts::C-95f2b798 the default sources hold exactly the two tool permits (passed, pass_to_pass) | - | 0.89 |
| C-0ab1d0b5 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing | covered | src.api.tool-server-routes.test.ts::C-0ab1d0b5 carol registers and reads while alice is refused and tenant_b sees nothing (passed, pass_to_pass); src.api.tool-server-routes.test.ts::C-0ab1d0b5 malformed requests are 400 with the field of the rule (passed, pass_to_pass); src.api.tool-server-routes.te... | - | 0.93 |
| C-29de3844 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound | covered | src.api.tool-server-routes.test.ts::C-29de3844 approval follows the review profile and the approved blocks show as bound (passed, pass_to_pass) | - | 0.89 |
| C-4114528c | tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do | covered | src.api.tool-server-routes.test.ts::C-4114528c a null PEP pool answers every route 503 before validation (passed, pass_to_pass); src.api.tool-server-routes.test.ts::C-4114528c a null deps pool is 503 for carol and 403 for alice (passed, pass_to_pass); src.api.tool-server-routes.test.ts::C-4114528c a... | - | 0.87 |
| C-0bfb5dc5 | tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions | covered | src.main.tools.test.ts::C-0bfb5dc5 the committed OpenAPI document holds the five tool server operations with their actions (passed, pass_to_pass) | - | 0.73 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/tools/store.ts

### Tests

2534 of 2534 passed, 0 failed, 0 errored, 0 skipped.
2 of 2 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-70e19ad9 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3dcd848 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f1acd012 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9e03eeea | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-d0c13cf0 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-59cbd279 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6d84e4c8 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-0955b490 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3474bfc | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95f2b798 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0ab1d0b5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-29de3844 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4114528c | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0bfb5dc5 | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-70e19ad9 | tool-registry › A new surface submitted in the same millisecond is shadowed by an older one — feedback FB-001 › A new surface submitted in the same millisecond is shadowed by an older one | pass | pass | the judge passed it and a discriminating test passes |
| C-c3dcd848 | tool-registry › Tool servers and surfaces are stored per tenant, and only `approveSurface` sets the approval columns › Migration 0470 stores servers and surfaces with narrow update rights | pass | pass | the judge passed it and a discriminating test passes |
| C-f1acd012 | tool-registry › validateOrigin accepts public https origins and refuses unsafe ones › Each of 55 inputs is accepted or refused with its reason | pass | pass | the judge passed it and a discriminating test passes |
| C-9e03eeea | tool-registry › The surface digest is canonical, fixtureSurface builds fixture surfaces, and block refs are chosen by content › The digest ignores order and fills defaults, fixtureSurface matches the catalogue, and refs take the lowest fitting major | pass | pass | the judge passed it and a discriminating test passes |
| C-d0c13cf0 | tool-registry › Registering a server stores it pending with its first surface › Register stores a pending server and refuses what is invalid, taken or foreign | pass | pass | the judge passed it and a discriminating test passes |
| C-59cbd279 | tool-registry › Approval needs another admin in a team and an explicit, audited self-approval when solo › A team refuses the submitter, a solo tenant needs the flag, and every refusal writes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-6d84e4c8 | tool-registry › Approval writes immutable bound block versions and a failure between its two steps leaves them inert › Approval imports bound blocks, and a repeat completes after a failed second step | pass | pass | the judge passed it and a discriminating test passes |
| C-0955b490 | tool-registry › A changed surface disables the server until its new digest is approved › A submitted surface drifts an approved server and re-approval restores it | pass | pass | the judge passed it and a discriminating test passes |
| C-c3474bfc | tool-registry › The directory resolves a ref only to the approved definition of a bound tool › The directory answers an approved tool, a drifted one with its state, and null for everything else | pass | pass | the judge passed it and a discriminating test passes |
| C-95f2b798 | tool-registry › Tenant admins may register tool servers and approve surfaces › Only tenant admins of the tenant hold the two actions | pass | pass | the judge passed it and a discriminating test passes |
| C-0ab1d0b5 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Carol registers and reads, alice is refused and tenant_b sees nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-29de3844 | tool-registry › The routes register, list, read, submit and approve for tenant admins only › Approval over HTTP follows the tenant's profile and the approved blocks show as bound | pass | pass | the judge passed it and a discriminating test passes |
| C-4114528c | tool-registry › The routes register, list, read, submit and approve for tenant admins only › A null pool or engine key answers as the block routes do | pass | pass | the judge passed it and a discriminating test passes |
| C-0bfb5dc5 | tool-registry › The committed OpenAPI document lists the tool-server routes › The committed document holds the five operations with their actions | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## Feedback

- FB-001: addressed at 595b9104ff: src/tools/store.ts:353-362 stores submitted_at as GREATEST(now, newest submitted_at + 1 microsecond); C-70e19ad9 tests pass.
- FB-002: addressed at 595b9104ff: New tests in src/api/tool-server-routes-followup.test.ts and src/tools/store-tenant.test.ts all pass; they cover the register refusals, malformed PUT/approve rows, and the tenant-b writes-nothing check.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.tools.submit-same-instant.test.ts::C-70e19ad9: a lower-digest surface submitted at the same instant drifts an approved server with its new pending digest` (task 1.1): passed
- `src.tools.submit-same-instant.test.ts::C-70e19ad9: a lower-digest surface submitted at the same instant is the newest pending surface and can be approved` (task 1.1): passed
