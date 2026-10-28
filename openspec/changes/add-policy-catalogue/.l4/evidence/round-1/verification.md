# Verification: openspec:add-policy-catalogue: NEEDS_HUMAN (round 1)

traceability: 42/42 criteria covered by a discriminating test

- Base: `e226f8c73ee98d168e58b80ba6bffe4d321ca16a`
- Head: `8c675675e845121fad92ecc0fd6b84e7fc400e05`
- Implementer profiles: deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 1 call(s), prompt sha256 `0d214a37a287bb0fe9599fbb1ddbd00b34c0fea0f15c84f2519505a926ded147`
- Judge replies of claude-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $1.1352

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@e226f8c73e contained |
| 1 | integrity | ok | 34.0 | 10 sub-checks; scope: 21 changed file(s) |
| 2 | build | ok | 12.1 |  |
| 3 | tests | ok | 41.0 |  |
| 4 | traceability | ok | 0.1 | 42/42 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/pdp/actions.ts, src/pdp/capabilities.ts, src/pdp/cedar-schema.ts, src/pdp/fragments.ts, src/pdp/platform.ts and 3 more |
| 8 | s1 judge | ok | 4.4 | 41/42 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 86.1 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261028T1931Z-6a5c/143-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261028T1931Z-6a5c/144-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261028T1931Z-6a5c/145-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261028T1931Z-6a5c/146-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261028T1931Z-6a5c/147-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261028T1931Z-6a5c/148-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261028T1931Z-6a5c/149-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 8 task(s): red and green compared |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/pdp/actions.test.ts, src/pdp/actions.ts, src/pdp/agent.test.ts, src/pdp/capabilities.test.ts, src/pdp/capabilities.ts (+13 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 629 of 629 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-6cc6bc38 | policy-catalogue › The action catalogue lists the Phase-1 actions › The 25 actions | covered | src.pdp.actions.test.ts::C-6cc6bc38 C-f057eba6 the 25 actions and no Phase-2 actions (passed, red_assertion) | - | 0.95 |
| C-f057eba6 | policy-catalogue › The action catalogue lists the Phase-1 actions › Phase-2 actions are absent | covered | src.pdp.actions.test.ts::C-6cc6bc38 C-f057eba6 the 25 actions and no Phase-2 actions (passed, red_assertion) | - | 0.92 |
| C-f6a4aaaf | policy-catalogue › The action catalogue lists the Phase-1 actions › Entries | covered | src.pdp.actions.test.ts::C-f6a4aaaf entries (passed, red_assertion) | - | 0.93 |
| C-6b24d8a6 | policy-catalogue › The action catalogue lists the Phase-1 actions › Capability flags | covered | src.pdp.actions.test.ts::C-6b24d8a6 capability flags (passed, red_assertion) | - | 0.87 |
| C-b5a77550 | policy-catalogue › The Cedar schema is built from the catalogue › The default schema loads | covered | src.pdp.cedar-schema.test.ts::C-b5a77550 the default schema loads (passed, red_assertion) | - | 0.70 |
| C-7e0c5960 | policy-catalogue › The Cedar schema is built from the catalogue › One fragment per action, in order | covered | src.pdp.cedar-schema.test.ts::C-7e0c5960 one fragment per action in order (passed, red_assertion) | - | 0.90 |
| C-faeed384 | policy-catalogue › The Cedar schema is built from the catalogue › Extra tool arguments | covered | src.pdp.cedar-schema.test.ts::C-faeed384 extra tool arguments (passed, red_assertion) | - | 0.90 |
| C-fb092529 | policy-catalogue › The Cedar schema is built from the catalogue › Bad tool arguments | covered | src.pdp.cedar-schema.test.ts::C-fb092529 bad tool arguments are refused (passed, red_assertion) | - | 0.87 |
| C-c6e0af1b | policy-catalogue › Principals and tenants become Cedar entities › A user entity | covered | src.pdp.principal.test.ts::C-c6e0af1b a user entity (passed, red_assertion) | - | 0.92 |
| C-7406a453 | policy-catalogue › Principals and tenants become Cedar entities › A tenant entity and a scoped id | covered | src.pdp.principal.test.ts::C-7406a453 a scoped id keeps tenant first (passed, red_assertion); src.pdp.principal.test.ts::C-7406a453 a tenant entity and a scoped id (passed, red_assertion) | - | 0.91 |
| C-44bafaf9 | policy-catalogue › Principals and tenants become Cedar entities › Principal validation | covered | src.pdp.principal.test.ts::C-44bafaf9 principal validation (passed, red_assertion) | - | 0.92 |
| C-e624ba01 | policy-catalogue › Policy fragments are loaded from module directories › Sorted order and scope | covered | src.pdp.fragments.test.ts::C-e624ba01 fragments load sorted by id from module policy directories only (passed, red_assertion) | - | 0.94 |
| C-03775862 | policy-catalogue › Policy fragments are loaded from module directories › Nothing to load | covered | src.pdp.fragments.test.ts::C-03775862 fragments of a tree without cedar policies load as an empty list (passed, red_assertion) | - | 0.72 |
| C-4986de81 | policy-catalogue › Policy fragments are loaded from module directories › A missing or wrong srcDir | covered | src.pdp.fragments.test.ts::C-4986de81 fragments refuse a missing path a file and a non string srcDir (passed, red_assertion) | - | 0.88 |
| C-510115a3 | policy-catalogue › Policy fragments are loaded from module directories › A file that cannot be a source is refused | covered | src.pdp.fragments.test.ts::C-510115a3 fragments refuse a cedar entry that cannot be a source (passed, red_assertion) | - | 0.87 |
| C-d44171dd | policy-catalogue › Policy fragments are loaded from module directories › The default source directory | covered | src.pdp.fragments.test.ts::C-d44171dd the default source directory is src and loads platform sources (passed, red_assertion) | - | 0.93 |
| C-36178217 | policy-catalogue › The policy engine composes the layers › Layers | covered | src.pdp.policy-engine.test.ts::C-36178217 the engine composes the platform fragment and tenant layers (passed, red_assertion) | - | 0.90 |
| C-6cd26bce | policy-catalogue › The policy engine composes the layers › The tenant layer is empty by default | covered | src.pdp.policy-engine.test.ts::C-6cd26bce the tenant layer is empty by default (passed, red_assertion) | - | 0.90 |
| C-1073bcc2 | policy-catalogue › The policy engine composes the layers › A fragment or tenant source cannot reuse an id | covered | src.pdp.policy-engine.test.ts::C-1073bcc2 a fragment cannot reuse another policy id (passed, red_assertion) | - | 0.89 |
| C-22bfe218 | policy-catalogue › The policy engine composes the layers › A tenant source cannot claim another layer | covered | src.pdp.policy-engine.test.ts::C-22bfe218 a tenant policy cannot claim another layer or be anything else (passed, red_assertion) | - | 0.91 |
| C-9b0d61e0 | policy-catalogue › The policy engine composes the layers › An invalid fragment is named, not quoted | covered | src.pdp.policy-engine.test.ts::C-9b0d61e0 an invalid fragment is named not quoted (passed, red_assertion) | - | 0.82 |
| C-013146c2 | policy-catalogue › The policy engine composes the layers › A fragment guards a resource type | covered | src.pdp.policy-engine.test.ts::C-013146c2 a fragment guards the resource type it reads (passed, red_assertion) | - | 0.94 |
| C-1b1cc447 | policy-catalogue › The policy engine composes the layers › Tool arguments reach policies | covered | src.pdp.policy-engine.test.ts::C-1b1cc447 tool arguments reach the policies and the policy set version (passed, red_assertion) | - | 0.92 |
| C-11f08103 | policy-catalogue › The platform forbids cross-tenant requests › Every action, both tenants | covered | src.pdp.cross-tenant.test.ts::C-11f08103 activate_flow is allowed on the same tenant and denied across tenants on a permit-all engine (passed, red_assertion); src.pdp.cross-tenant.test.ts::C-11f08103 approve_task is allowed on the same tenant and denied across tenants on a permit-all engine (passed,... | - | - |
| C-b66e39a6 | policy-catalogue › The platform forbids cross-tenant requests › The other direction | covered | src.pdp.cross-tenant.test.ts::C-b66e39a6 a cross-tenant read_self is denied by the platform without tenant policies (passed, red_assertion) | - | 0.95 |
| C-b820255a | policy-catalogue › The platform forbids untrusted data reaching write, send and pay › Write, send and pay are denied | covered | src.pdp.egress.test.ts::C-b820255a C-2fd6be49 untrusted taint denies write send and pay and read stays allowed (passed, red_assertion) | - | 0.91 |
| C-2fd6be49 | policy-catalogue › The platform forbids untrusted data reaching write, send and pay › Read stays allowed | covered | src.pdp.egress.test.ts::C-b820255a C-2fd6be49 untrusted taint denies write send and pay and read stays allowed (passed, red_assertion) | - | 0.71 |
| C-212b8288 | policy-catalogue › The platform forbids untrusted data reaching write, send and pay › Other taint labels | covered | src.pdp.egress.test.ts::C-212b8288 a write is allowed without untrusted taint and denied with it (passed, red_assertion) | - | 0.94 |
| C-72275fc6 | policy-catalogue › The platform forbids agent blocks from consequential tools › An agent picks send or pay | covered | src.pdp.agent.test.ts::C-72275fc6 C-88e72ab4 an agent block is denied on send and pay and allowed on the other combinations (passed, red_assertion) | - | 0.92 |
| C-88e72ab4 | policy-catalogue › The platform forbids agent blocks from consequential tools › Other combinations | covered | src.pdp.agent.test.ts::C-72275fc6 C-88e72ab4 an agent block is denied on send and pay and allowed on the other combinations (passed, red_assertion) | - | 0.75 |
| C-64407374 | policy-catalogue › The platform forbids agent blocks from consequential tools › Both forbids | covered | src.pdp.agent.test.ts::C-64407374 an agent block with untrusted taint and effect send is denied by both forbids (passed, red_assertion) | - | 0.93 |
| C-28aa9a7d | policy-catalogue › Any principal may read itself › read_self without any role | covered | src.pdp.platform.test.ts::C-370a5607 C-28aa9a7d an empty engine lists the platform policies and read_self is allowed without any role (passed, red_assertion) | - | 0.79 |
| C-370a5607 | policy-catalogue › Any principal may read itself › The platform source | covered | src.pdp.platform.test.ts::C-370a5607 C-28aa9a7d an empty engine lists the platform policies and read_self is allowed without any role (passed, red_assertion); src.pdp.platform.test.ts::C-370a5607 the platform source holds the four sorted policy ids (passed, red_assertion) | - | 0.91 |
| C-010fae49 | policy-catalogue › allowedActions lists the capabilities of a principal › No roles | covered | src.pdp.capabilities.test.ts::C-010fae49 allowedActions returns read_self for a principal without roles (passed, red_assertion) | - | 0.92 |
| C-f08a88ad | policy-catalogue › allowedActions lists the capabilities of a principal › Policies and roles | covered | src.pdp.capabilities.test.ts::C-f08a88ad allowedActions follows the tenant policies and the roles (passed, red_assertion) | - | 0.95 |
| C-24b9b8eb | policy-catalogue › allowedActions lists the capabilities of a principal › A permit-all engine | covered | src.pdp.capabilities.test.ts::C-24b9b8eb allowedActions on a permit-all engine lists the 21 capabilities (passed, red_assertion) | - | 0.92 |
| C-56c0c377 | policy-catalogue › allowedActions lists the capabilities of a principal › Order, repeats and unknown names | covered | src.pdp.capabilities.test.ts::C-56c0c377 allowedActions dedupes and ignores unknown and non-capability names (passed, red_assertion) | - | 0.91 |
| C-c19eaf0b | policy-catalogue › allowedActions lists the capabilities of a principal › A hostile principal | covered | src.pdp.capabilities.test.ts::C-c19eaf0b allowedActions rejects hostile principals with an empty list and a log line (passed, red_assertion) | - | 0.86 |
| C-3e28778a | policy-catalogue › allowedActions lists the capabilities of a principal › The probe request | covered | src.pdp.capabilities.test.ts::C-3e28778a probeRequest builds the probe request and skips non-capabilities (passed, red_assertion) | - | 0.91 |
| C-f82e338e | policy-catalogue › allowedActions lists the capabilities of a principal › A policy that errors | covered | src.pdp.capabilities.test.ts::C-f82e338e a policy that errors keeps the action out of allowedActions (passed, red_assertion) | - | 0.92 |
| C-80ff48ba | policy-catalogue › allowedActions lists the capabilities of a principal › A failing dependency | covered | src.pdp.capabilities.test.ts::C-80ff48ba a failing dependency keeps every action out and logs one line per action (passed, red_assertion) | - | 0.92 |
| C-bf86a21c | policy-catalogue › allowedActions lists the capabilities of a principal › Concurrent calls | covered | src.pdp.capabilities.test.ts::C-bf86a21c concurrent allowedActions calls agree (passed, red_assertion) | - | 0.94 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-policy-catalogue/.l4/ledger/r-20261028T1917Z-b418.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-catalogue/.l4/ledger/r-20261028T1931Z-6a5c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-policy-catalogue/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/pdp/actions.test.ts` |  | relevant | new test file |
| `src/pdp/actions.ts` | pdp | relevant | named in the spec |
| `src/pdp/agent.test.ts` |  | relevant | new test file |
| `src/pdp/capabilities.test.ts` |  | relevant | new test file |
| `src/pdp/capabilities.ts` | pdp | relevant | named in the spec |
| `src/pdp/cedar-schema.test.ts` |  | relevant | new test file |
| `src/pdp/cedar-schema.ts` | pdp | relevant | named in the spec |
| `src/pdp/cross-tenant.test.ts` |  | relevant | new test file |
| `src/pdp/egress.test.ts` |  | relevant | new test file |
| `src/pdp/fragments.test.ts` |  | relevant | new test file |
| `src/pdp/fragments.ts` | pdp | relevant | named in the spec |
| `src/pdp/platform.test.ts` |  | relevant | new test file |
| `src/pdp/platform.ts` | pdp | relevant | named in the spec |
| `src/pdp/policy-engine.test.ts` |  | relevant | new test file |
| `src/pdp/policy-engine.ts` | pdp | relevant | named in the spec |
| `src/pdp/principal.test.ts` |  | relevant | new test file |
| `src/pdp/principal.ts` | pdp | relevant | named in the spec |
| `test/support/policy-samples.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/pdp/actions.ts, src/pdp/capabilities.ts, src/pdp/cedar-schema.ts, src/pdp/fragments.ts, src/pdp/platform.ts and 3 more

### Tests

719 of 719 passed, 0 failed, 0 errored, 0 skipped.
64 of 64 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-6cc6bc38 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f057eba6 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f6a4aaaf | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6b24d8a6 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b5a77550 | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7e0c5960 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-faeed384 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb092529 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c6e0af1b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7406a453 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-44bafaf9 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e624ba01 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-03775862 | ok | 0.720 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4986de81 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-510115a3 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d44171dd | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-36178217 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6cd26bce | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1073bcc2 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-22bfe218 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9b0d61e0 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-013146c2 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1b1cc447 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-11f08103 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b66e39a6 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b820255a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2fd6be49 | ok | 0.710 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-212b8288 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-72275fc6 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-88e72ab4 | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-64407374 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-28aa9a7d | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-370a5607 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-010fae49 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f08a88ad | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-24b9b8eb | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56c0c377 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c19eaf0b | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3e28778a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f82e338e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-80ff48ba | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bf86a21c | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-6cc6bc38 | policy-catalogue › The action catalogue lists the Phase-1 actions › The 25 actions | pass | pass | the judge passed it and a discriminating test passes |
| C-f057eba6 | policy-catalogue › The action catalogue lists the Phase-1 actions › Phase-2 actions are absent | pass | pass | the judge passed it and a discriminating test passes |
| C-f6a4aaaf | policy-catalogue › The action catalogue lists the Phase-1 actions › Entries | pass | pass | the judge passed it and a discriminating test passes |
| C-6b24d8a6 | policy-catalogue › The action catalogue lists the Phase-1 actions › Capability flags | pass | pass | the judge passed it and a discriminating test passes |
| C-b5a77550 | policy-catalogue › The Cedar schema is built from the catalogue › The default schema loads | pass | pass | the judge passed it and a discriminating test passes |
| C-7e0c5960 | policy-catalogue › The Cedar schema is built from the catalogue › One fragment per action, in order | pass | pass | the judge passed it and a discriminating test passes |
| C-faeed384 | policy-catalogue › The Cedar schema is built from the catalogue › Extra tool arguments | pass | pass | the judge passed it and a discriminating test passes |
| C-fb092529 | policy-catalogue › The Cedar schema is built from the catalogue › Bad tool arguments | pass | pass | the judge passed it and a discriminating test passes |
| C-c6e0af1b | policy-catalogue › Principals and tenants become Cedar entities › A user entity | pass | pass | the judge passed it and a discriminating test passes |
| C-7406a453 | policy-catalogue › Principals and tenants become Cedar entities › A tenant entity and a scoped id | pass | pass | the judge passed it and a discriminating test passes |
| C-44bafaf9 | policy-catalogue › Principals and tenants become Cedar entities › Principal validation | pass | pass | the judge passed it and a discriminating test passes |
| C-e624ba01 | policy-catalogue › Policy fragments are loaded from module directories › Sorted order and scope | pass | pass | the judge passed it and a discriminating test passes |
| C-03775862 | policy-catalogue › Policy fragments are loaded from module directories › Nothing to load | pass | pass | the judge passed it and a discriminating test passes |
| C-4986de81 | policy-catalogue › Policy fragments are loaded from module directories › A missing or wrong srcDir | pass | pass | the judge passed it and a discriminating test passes |
| C-510115a3 | policy-catalogue › Policy fragments are loaded from module directories › A file that cannot be a source is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-d44171dd | policy-catalogue › Policy fragments are loaded from module directories › The default source directory | pass | pass | the judge passed it and a discriminating test passes |
| C-36178217 | policy-catalogue › The policy engine composes the layers › Layers | pass | pass | the judge passed it and a discriminating test passes |
| C-6cd26bce | policy-catalogue › The policy engine composes the layers › The tenant layer is empty by default | pass | pass | the judge passed it and a discriminating test passes |
| C-1073bcc2 | policy-catalogue › The policy engine composes the layers › A fragment or tenant source cannot reuse an id | pass | pass | the judge passed it and a discriminating test passes |
| C-22bfe218 | policy-catalogue › The policy engine composes the layers › A tenant source cannot claim another layer | pass | pass | the judge passed it and a discriminating test passes |
| C-9b0d61e0 | policy-catalogue › The policy engine composes the layers › An invalid fragment is named, not quoted | pass | pass | the judge passed it and a discriminating test passes |
| C-013146c2 | policy-catalogue › The policy engine composes the layers › A fragment guards a resource type | pass | pass | the judge passed it and a discriminating test passes |
| C-1b1cc447 | policy-catalogue › The policy engine composes the layers › Tool arguments reach policies | pass | pass | the judge passed it and a discriminating test passes |
| C-11f08103 | policy-catalogue › The platform forbids cross-tenant requests › Every action, both tenants | pass | pass | the judge passed it and a discriminating test passes |
| C-b66e39a6 | policy-catalogue › The platform forbids cross-tenant requests › The other direction | pass | pass | the judge passed it and a discriminating test passes |
| C-b820255a | policy-catalogue › The platform forbids untrusted data reaching write, send and pay › Write, send and pay are denied | pass | pass | the judge passed it and a discriminating test passes |
| C-2fd6be49 | policy-catalogue › The platform forbids untrusted data reaching write, send and pay › Read stays allowed | pass | pass | the judge passed it and a discriminating test passes |
| C-212b8288 | policy-catalogue › The platform forbids untrusted data reaching write, send and pay › Other taint labels | pass | pass | the judge passed it and a discriminating test passes |
| C-72275fc6 | policy-catalogue › The platform forbids agent blocks from consequential tools › An agent picks send or pay | pass | pass | the judge passed it and a discriminating test passes |
| C-88e72ab4 | policy-catalogue › The platform forbids agent blocks from consequential tools › Other combinations | pass | pass | the judge passed it and a discriminating test passes |
| C-64407374 | policy-catalogue › The platform forbids agent blocks from consequential tools › Both forbids | pass | pass | the judge passed it and a discriminating test passes |
| C-28aa9a7d | policy-catalogue › Any principal may read itself › read_self without any role | pass | pass | the judge passed it and a discriminating test passes |
| C-370a5607 | policy-catalogue › Any principal may read itself › The platform source | pass | pass | the judge passed it and a discriminating test passes |
| C-010fae49 | policy-catalogue › allowedActions lists the capabilities of a principal › No roles | pass | pass | the judge passed it and a discriminating test passes |
| C-f08a88ad | policy-catalogue › allowedActions lists the capabilities of a principal › Policies and roles | pass | pass | the judge passed it and a discriminating test passes |
| C-24b9b8eb | policy-catalogue › allowedActions lists the capabilities of a principal › A permit-all engine | pass | pass | the judge passed it and a discriminating test passes |
| C-56c0c377 | policy-catalogue › allowedActions lists the capabilities of a principal › Order, repeats and unknown names | pass | pass | the judge passed it and a discriminating test passes |
| C-c19eaf0b | policy-catalogue › allowedActions lists the capabilities of a principal › A hostile principal | pass | pass | the judge passed it and a discriminating test passes |
| C-3e28778a | policy-catalogue › allowedActions lists the capabilities of a principal › The probe request | pass | pass | the judge passed it and a discriminating test passes |
| C-f82e338e | policy-catalogue › allowedActions lists the capabilities of a principal › A policy that errors | pass | pass | the judge passed it and a discriminating test passes |
| C-80ff48ba | policy-catalogue › allowedActions lists the capabilities of a principal › A failing dependency | pass | pass | the judge passed it and a discriminating test passes |
| C-bf86a21c | policy-catalogue › allowedActions lists the capabilities of a principal › Concurrent calls | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [major, judge] An unreadable or non-directory policy directory is skipped silently (spec gap) (criterion C-510115a3): loadPolicyFragments wraps readdir of <module>/policy in try/catch and does `continue` on any error, so a policy directory that exists but cannot be read (EACCES), or a `policy` that is a regular file, drops every fragment in it without an error. Design decision 6 refuses unusable entries 'because a forbid must never be skipped silently'; no scenario covers an unreadable policy directory.
- [minor, judge] allowedActions can reject for a principal whose getters change between reads (spec gap) (criterion C-c19eaf0b): allowedActions validates the principal, then probeRequest validates it again and userEntity reads `roles`/`teams` a third time. A roles getter that returns a valid array on the first two reads and a non-iterable afterwards makes `new Set(p.roles)` throw inside the async function, so allowedActions rejects. The requirement says it never rejects; no scenario covers a getter whose value changes.
- [minor, judge] sampleRequest leaves out run_initiator in the invoke_llm context (criterion C-11f08103): Design decision 9 says the fixed context has `run_initiator` set to the principal. contextFor for invoke_llm does not include it. It is optional in the schema, so the request is still valid.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.pdp.actions.test.ts::C-6b24d8a6 capability flags` (task 1.1): passed
- `src.pdp.actions.test.ts::C-6cc6bc38 C-f057eba6 the 25 actions and no Phase-2 actions` (task 1.1): passed
- `src.pdp.actions.test.ts::C-f6a4aaaf entries` (task 1.1): passed
- `src.pdp.agent.test.ts::C-64407374 an agent block with untrusted taint and effect send is denied by both forbids` (task 3.3): passed
- `src.pdp.agent.test.ts::C-72275fc6 C-88e72ab4 an agent block is denied on send and pay and allowed on the other combinations` (task 3.3): passed
- `src.pdp.capabilities.test.ts::C-010fae49 allowedActions returns read_self for a principal without roles` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-24b9b8eb allowedActions on a permit-all engine lists the 21 capabilities` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-3e28778a probeRequest builds the probe request and skips non-capabilities` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-56c0c377 allowedActions dedupes and ignores unknown and non-capability names` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-80ff48ba a failing dependency keeps every action out and logs one line per action` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-bf86a21c concurrent allowedActions calls agree` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-c19eaf0b allowedActions rejects hostile principals with an empty list and a log line` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-f08a88ad allowedActions follows the tenant policies and the roles` (task 4.1): passed
- `src.pdp.capabilities.test.ts::C-f82e338e a policy that errors keeps the action out of allowedActions` (task 4.1): passed
- `src.pdp.cedar-schema.test.ts::C-7e0c5960 one fragment per action in order` (task 1.2): passed
- `src.pdp.cedar-schema.test.ts::C-b5a77550 the default schema loads` (task 1.2): passed
- `src.pdp.cedar-schema.test.ts::C-faeed384 extra tool arguments` (task 1.2): passed
- `src.pdp.cedar-schema.test.ts::C-fb092529 bad tool arguments are refused` (task 1.2): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 activate_flow is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 approve_task is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 approve_tool_surface is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 author_flow is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 debug_run is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 deploy_policy is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 dry_run_flow is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 edit_flow is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 edit_profile is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 invoke_llm is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 invoke_tool is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 manage_credentials is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 manage_tenant is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 manage_triggers is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 manage_users_roles is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 read_audit is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 read_context is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 read_flow is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 read_registry is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 read_run is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 read_self is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 register_context_source is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 register_tool_server is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 start_run is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-11f08103 test_flow is allowed on the same tenant and denied across tenants on a permit-all engine` (task 3.1): passed
- `src.pdp.cross-tenant.test.ts::C-b66e39a6 a cross-tenant read_self is denied by the platform without tenant policies` (task 3.1): passed
- `src.pdp.egress.test.ts::C-212b8288 a write is allowed without untrusted taint and denied with it` (task 3.2): passed
- `src.pdp.egress.test.ts::C-b820255a C-2fd6be49 untrusted taint denies write send and pay and read stays allowed` (task 3.2): passed
- `src.pdp.fragments.test.ts::C-03775862 fragments of a tree without cedar policies load as an empty list` (task 2.2): passed
- `src.pdp.fragments.test.ts::C-4986de81 fragments refuse a missing path a file and a non string srcDir` (task 2.2): passed
- `src.pdp.fragments.test.ts::C-510115a3 fragments refuse a cedar entry that cannot be a source` (task 2.2): passed
- `src.pdp.fragments.test.ts::C-d44171dd the default source directory is src and loads platform sources` (task 2.2): passed
