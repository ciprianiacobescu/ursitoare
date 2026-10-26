# Verification: openspec:add-tenancy-foundation: PASS (round 3)

traceability: 37/37 criteria covered by a discriminating test

- Base: `bc9febc9a4fa7627704ad8ed0cb00b6a87afbbeb`
- Head: `ca9412f05d0fecd7ebaa9ad5bb28b71f2a2d19f5`
- Implementer profiles: deepseek, glm
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `c86c4f7c554618950c24dd14063d88d089d7052ad0af268ec070581999622e4e`
  - part 1: 16 file(s), 109123 characters, profile claude-judge, reply valid
  - part 2: 3 file(s), 24461 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 4, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek deepseek (declared), glm zhipu (declared)
- Cost: $0.4702

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 2) |
| 1 | integrity | reused | 0.0 | reused (round 2) |
| 2 | build | reused | 0.0 | reused (round 2) |
| 3 | tests | reused | 0.0 | reused (round 2) |
| 4 | traceability | reused | 0.0 | reused (round 2) |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 2) |
| 8 | s1 judge | reused | 0.0 | reused (round 2) |
| 9 | judge | reused | 0.0 | reused (round 2) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261026T2159Z-7973/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261026T2159Z-7973/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261026T2159Z-7973/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261026T2159Z-7973/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261026T2159Z-7973/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261026T2159Z-7973/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261026T2159Z-7973/010-e2e.log |

## Files by part

- part 1: src/db/migrations/0002_tenancy.sql (4102 characters)
- part 1: src/tenancy/bootstrap.test.ts (5043 characters)
- part 1: src/tenancy/bootstrap.ts (3870 characters)
- part 1: src/tenancy/catalog.roles.test.ts (8551 characters)
- part 1: src/tenancy/catalog.test.ts (10865 characters)
- part 1: src/tenancy/catalog.ts (11632 characters)
- part 1: src/tenancy/context.test.ts (1663 characters)
- part 1: src/tenancy/context.ts (1726 characters)
- part 1: src/tenancy/errors.ts (1109 characters)
- part 1: src/tenancy/resolve.test.ts (4323 characters)
- part 1: src/tenancy/routes.test.ts (7460 characters)
- part 1: src/tenancy/routes.ts (5198 characters)
- part 1: src/tenancy/schema.test.ts (15343 characters)
- part 1: openspec/changes/add-tenancy-foundation/tasks.md (24782 characters)
- part 1: test/support/tenants.test.ts (1657 characters)
- part 1: test/support/tenants.ts (1799 characters)
- part 2: src/tenancy/tx.test.ts (16054 characters)
- part 2: src/tenancy/tx.ts (2514 characters)
- part 2: src/tenancy/unregister.test.ts (5893 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 10 task(s): red and green compared |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/tenancy/bootstrap.test.ts, src/tenancy/bootstrap.ts, src/tenancy/catalog.roles.test.ts, src/tenancy/catalog.test.ts, src/tenancy/catalog.ts (+12 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 258 of 258 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-b9c4cf59 | tenancy › Route keys are hashed › Known value | covered | src.tenancy.context.test.ts::C-b9c4cf59 hashRouteKey returns the SHA-256 of the UTF-8 bytes (passed, red_assertion) | - | 0.90 |
| C-298c59fd | tenancy › Route keys are hashed › Refused keys | covered | src.tenancy.context.test.ts::C-298c59fd hashRouteKey refuses empty ill-formed and over-long keys (passed, red_assertion) | - | 0.94 |
| C-f6d2db43 | tenancy › The tenant table shows a session only its own tenant › Own row only | covered | src.tenancy.schema.test.ts::C-f6d2db43 a tenant session sees only its own tenant row (passed, red_assertion, inadequate); src.tenancy.tx.test.ts::C-f6d2db43 a tenant session sees only its own tenant row (passed, red_assertion) | - | 0.86 |
| C-468abad0 | tenancy › The tenant table shows a session only its own tenant › Nothing without a tenant, and no error | covered | src.tenancy.schema.test.ts::C-468abad0 app sessions see no tenant rows without a tenant setting (passed, red_assertion) | - | 0.89 |
| C-96d545df | tenancy › The tenant table shows a session only its own tenant › Read-only for the app role | covered | src.tenancy.schema.test.ts::C-96d545df the app role can only read tenants (passed, red_assertion); src.tenancy.tx.test.ts::C-96d545df the app role can only read tenants through withTenantTx (passed, red_assertion) | - | 0.85 |
| C-91a17beb | tenancy › The tenant table shows a session only its own tenant › Defaults and constraints | covered | src.tenancy.schema.test.ts::C-91a17beb tenant defaults and constraints hold (passed, red_assertion) | - | 0.90 |
| C-c58611eb | tenancy › A tenant transaction sets and always resets the tenant › Set inside, reset after commit | covered | src.tenancy.tx.test.ts::C-c58611eb withTenantTx sets the tenant inside and resets it after commit (passed, red_assertion) | - | 0.91 |
| C-8029b440 | tenancy › A tenant transaction sets and always resets the tenant › A session-level setting does not survive | covered | src.tenancy.tx.test.ts::C-8029b440 a session level tenant set by fn does not survive (passed, red_assertion) | - | 0.92 |
| C-ddcd6c10 | tenancy › A tenant transaction sets and always resets the tenant › Rollback when fn throws | covered | src.tenancy.tx.test.ts::C-ddcd6c10 withTenantTx rolls back when fn throws (passed, red_assertion) | - | 0.91 |
| C-b73f1a2d | tenancy › A tenant transaction sets and always resets the tenant › A caught SQL error fails closed | covered | src.tenancy.tx.test.ts::C-b73f1a2d a caught SQL error fails closed with TENANT_TX_ABORTED (passed, red_assertion) | - | 0.94 |
| C-02d854a3 | tenancy › A tenant transaction sets and always resets the tenant › Tenant A cannot read or write tenant B rows | covered | src.tenancy.tx.test.ts::C-02d854a3 tenant A cannot read or write tenant B rows (passed, red_assertion) | - | 0.95 |
| C-b71c59a4 | tenancy › A tenant transaction sets and always resets the tenant › Invalid context is refused before connecting | covered | src.tenancy.tx.test.ts::C-b71c59a4 withTenantTx refuses an invalid context before connecting (passed, red_assertion) | - | 0.91 |
| C-9311e093 | tenancy › A tenant transaction sets and always resets the tenant › Database down or connection lost | covered | src.tenancy.tx.test.ts::C-9311e093 withTenantTx reports a closed port and recovers after a lost connection (passed, red_assertion) | - | 0.90 |
| C-a9b4dfd2 | tenancy › A tenant transaction sets and always resets the tenant › Concurrent tenants stay apart | covered | src.tenancy.tx.test.ts::C-a9b4dfd2 concurrent tenants stay apart (passed, red_assertion) | - | 0.92 |
| C-9a8a5051 | tenancy › The default tenant is created once › Create, then repeat | covered | src.tenancy.bootstrap.test.ts::C-9a8a5051 ensureDefaultTenant creates one tenant under concurrent calls (passed, red_assertion); src.tenancy.bootstrap.test.ts::C-9a8a5051 ensureDefaultTenant creates the default tenant once (passed, red_assertion) | - | 0.92 |
| C-39972679 | tenancy › The default tenant is created once › Another tenant exists | covered | src.tenancy.bootstrap.test.ts::C-39972679 ensureDefaultTenant refuses a second default tenant (passed, red_assertion) | - | 0.90 |
| C-eef313af | tenancy › The default tenant is created once › Bad name and the app role | covered | src.tenancy.bootstrap.test.ts::C-eef313af ensureDefaultTenant validates the name and needs the owner role (passed, red_assertion) | - | 0.87 |
| C-fe7e2021 | tenancy › The routing table is closed to the app role › Direct access fails | covered | src.tenancy.schema.test.ts::C-fe7e2021 the app role has no direct access to the routing table (passed, red_assertion) | - | 0.89 |
| C-f511db93 | tenancy › The routing table is closed to the app role › Function attributes | covered | src.tenancy.schema.test.ts::C-f511db93 the routing functions are safe definers (passed, red_assertion) | - | 0.87 |
| C-5cb45dfc | tenancy › The routing table is closed to the app role › A shadowing temp table changes nothing | covered | src.tenancy.schema.test.ts::C-5cb45dfc a shadowing temp table changes nothing (passed, red_assertion) | - | 0.88 |
| C-ff9216e2 | tenancy › The routing table is closed to the app role › No way to enumerate | covered | src.tenancy.schema.test.ts::C-ff9216e2 resolve_tenant answers only exact pairs (passed, red_assertion) | - | 0.93 |
| C-4a42bfb1 | tenancy › Routes are registered only for the current tenant › Create, repeat, take over | covered | src.tenancy.routes.test.ts::C-4a42bfb1 register creates repeats and refuses another tenant (passed, red_assertion) | - | 0.93 |
| C-48810221 | tenancy › Routes are registered only for the current tenant › Two tenants race for one key | covered | src.tenancy.routes.test.ts::C-48810221 two tenants race for one key (passed, red_assertion) | - | 0.90 |
| C-da7373cb | tenancy › Routes are registered only for the current tenant › A reserved kind needs the owner connection | covered | src.tenancy.routes.test.ts::C-da7373cb a reserved kind needs the owner connection (passed, red_assertion) | - | 0.91 |
| C-df386321 | tenancy › Routes are registered only for the current tenant › No tenant, unknown tenant, bad input | covered | src.tenancy.routes.test.ts::C-df386321 no tenant unknown tenant and bad input are refused (passed, red_assertion) | - | 0.92 |
| C-d44bc114 | tenancy › Routes are removed only by their tenant › Own route only | covered | src.tenancy.unregister.test.ts::C-d44bc114 unregister removes only the current tenant route (passed, red_assertion) | - | 0.83 |
| C-fd29b241 | tenancy › Routes are removed only by their tenant › No tenant, bad input, reserved kind | covered | src.tenancy.unregister.test.ts::C-fd29b241 unregister refuses no tenant bad input and a reserved kind (passed, red_assertion) | - | 0.93 |
| C-008c1a9f | tenancy › Tenants resolve from exact keys only › Known, unknown and wrong kind | covered | src.tenancy.resolve.test.ts::C-008c1a9f resolveTenantBy answers the exact pair and none otherwise (passed, red_assertion) | - | 0.94 |
| C-2d0572f1 | tenancy › Tenants resolve from exact keys only › Bad kind and database down | covered | src.tenancy.resolve.test.ts::C-2d0572f1 resolveTenantBy refuses a bad kind and propagates a connection failure (passed, red_assertion) | - | 0.95 |
| C-8f310ba8 | tenancy › Two seeded tenants for isolation tests › Seed, repeat, keep stored values | covered | test.support.tenants.test.ts::C-8f310ba8 seedTwoTenants seeds two tenants once and keeps stored values (passed, red_assertion) | - | 0.82 |
| C-7a21b515 | tenancy-catalog › The catalog test guards every table › The migrated database is clean | covered | src.tenancy.catalog.test.ts::C-7a21b515 the migrated database is clean (passed, red_assertion) | - | 0.90 |
| C-be7b9eeb | tenancy-catalog › The catalog test guards every table › Each broken object is reported | covered | src.tenancy.catalog.test.ts::C-be7b9eeb each broken object is reported (passed, red_assertion) | - | - |
| C-5d0424c6 | tenancy-catalog › The catalog test guards every table › A table with no key or no tenant column is reported | covered | src.tenancy.catalog.test.ts::C-5d0424c6 a table with no key or no tenant column is reported (passed, red_assertion) | - | 0.75 |
| C-0c61db8f | tenancy-catalog › The catalog test guards every table › A policy for the app role or its group counts | covered | src.tenancy.catalog.test.ts::C-0c61db8f a policy for the app role or its group counts (passed, red_assertion) | - | 0.84 |
| C-f9e36a0c | tenancy-catalog › The runtime role is unprivileged › Objects that open a hole | covered | src.tenancy.catalog.roles.test.ts::C-f9e36a0c objects that open a hole are reported (passed, red_assertion) | - | 0.90 |
| C-58a3293a | tenancy-catalog › The runtime role is unprivileged › A definer function of another owner | covered | src.tenancy.catalog.roles.test.ts::C-58a3293a a definer function of another owner is unsafe (passed, red_assertion) | - | 0.89 |
| C-ae959f29 | tenancy-catalog › The runtime role is unprivileged › The real role and probe roles | covered | src.tenancy.catalog.roles.test.ts::C-ae959f29 the real role and probe roles are checked (passed, red_assertion) | - | 0.91 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-tenancy-foundation/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenancy-foundation/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenancy-foundation/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenancy-foundation/.l4/ledger/r-20261026T2059Z-f582.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenancy-foundation/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenancy-foundation/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-tenancy-foundation/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/db/migrations/0002_tenancy.sql` | db | relevant | named in the spec |
| `src/tenancy/bootstrap.test.ts` |  | relevant | new test file |
| `src/tenancy/bootstrap.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/catalog.roles.test.ts` |  | relevant | new test file |
| `src/tenancy/catalog.test.ts` |  | relevant | new test file |
| `src/tenancy/catalog.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/context.test.ts` |  | relevant | new test file |
| `src/tenancy/context.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/errors.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/resolve.test.ts` |  | relevant | new test file |
| `src/tenancy/routes.test.ts` |  | relevant | new test file |
| `src/tenancy/routes.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/schema.test.ts` |  | relevant | new test file |
| `src/tenancy/tx.test.ts` |  | relevant | new test file |
| `src/tenancy/tx.ts` | tenancy | relevant | named in the spec |
| `src/tenancy/unregister.test.ts` |  | relevant | new test file |
| `test/support/tenants.test.ts` |  | relevant | new test file |
| `test/support/tenants.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/tenancy/bootstrap.ts, src/tenancy/catalog.ts, src/tenancy/context.ts, src/tenancy/errors.ts, src/tenancy/routes.ts and 2 more

### Tests

299 of 299 passed, 0 failed, 0 errored, 0 skipped.
40 of 40 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-b9c4cf59 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-298c59fd | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f6d2db43 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-468abad0 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-96d545df | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-91a17beb | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c58611eb | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8029b440 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ddcd6c10 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b73f1a2d | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-02d854a3 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b71c59a4 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9311e093 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a9b4dfd2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9a8a5051 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39972679 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eef313af | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fe7e2021 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f511db93 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5cb45dfc | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ff9216e2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4a42bfb1 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-48810221 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-da7373cb | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-df386321 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d44bc114 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fd29b241 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-008c1a9f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2d0572f1 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8f310ba8 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7a21b515 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-be7b9eeb | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-5d0424c6 | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0c61db8f | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f9e36a0c | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-58a3293a | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ae959f29 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-002 accept F-a449516e by the delegate (claude-fable-5-1 via claude-code): The finding is waived. The requirement "The runtime role is unprivileged" names a closed list of role conditions: missing, superuser, BYPASSRLS, owning a relation, or membership in ursitoare_owner or in a superuser or BYPASSRLS role. The checker implements exactly that list, and membership in pg_rea...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-b9c4cf59 | tenancy › Route keys are hashed › Known value | pass | pass | the judge passed it and a discriminating test passes |
| C-298c59fd | tenancy › Route keys are hashed › Refused keys | pass | pass | the judge passed it and a discriminating test passes |
| C-f6d2db43 | tenancy › The tenant table shows a session only its own tenant › Own row only | pass | pass | the judge passed it and a discriminating test passes |
| C-468abad0 | tenancy › The tenant table shows a session only its own tenant › Nothing without a tenant, and no error | pass | pass | the judge passed it and a discriminating test passes |
| C-96d545df | tenancy › The tenant table shows a session only its own tenant › Read-only for the app role | pass | pass | the judge passed it and a discriminating test passes |
| C-91a17beb | tenancy › The tenant table shows a session only its own tenant › Defaults and constraints | pass | pass | the judge passed it and a discriminating test passes |
| C-c58611eb | tenancy › A tenant transaction sets and always resets the tenant › Set inside, reset after commit | pass | pass | the judge passed it and a discriminating test passes |
| C-8029b440 | tenancy › A tenant transaction sets and always resets the tenant › A session-level setting does not survive | pass | pass | the judge passed it and a discriminating test passes |
| C-ddcd6c10 | tenancy › A tenant transaction sets and always resets the tenant › Rollback when fn throws | pass | pass | the judge passed it and a discriminating test passes |
| C-b73f1a2d | tenancy › A tenant transaction sets and always resets the tenant › A caught SQL error fails closed | pass | pass | the judge passed it and a discriminating test passes |
| C-02d854a3 | tenancy › A tenant transaction sets and always resets the tenant › Tenant A cannot read or write tenant B rows | pass | pass | the judge passed it and a discriminating test passes |
| C-b71c59a4 | tenancy › A tenant transaction sets and always resets the tenant › Invalid context is refused before connecting | pass | pass | the judge passed it and a discriminating test passes |
| C-9311e093 | tenancy › A tenant transaction sets and always resets the tenant › Database down or connection lost | pass | pass | the judge passed it and a discriminating test passes |
| C-a9b4dfd2 | tenancy › A tenant transaction sets and always resets the tenant › Concurrent tenants stay apart | pass | pass | the judge passed it and a discriminating test passes |
| C-9a8a5051 | tenancy › The default tenant is created once › Create, then repeat | pass | pass | the judge passed it and a discriminating test passes |
| C-39972679 | tenancy › The default tenant is created once › Another tenant exists | pass | pass | the judge passed it and a discriminating test passes |
| C-eef313af | tenancy › The default tenant is created once › Bad name and the app role | pass | pass | the judge passed it and a discriminating test passes |
| C-fe7e2021 | tenancy › The routing table is closed to the app role › Direct access fails | pass | pass | the judge passed it and a discriminating test passes |
| C-f511db93 | tenancy › The routing table is closed to the app role › Function attributes | pass | pass | the judge passed it and a discriminating test passes |
| C-5cb45dfc | tenancy › The routing table is closed to the app role › A shadowing temp table changes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-ff9216e2 | tenancy › The routing table is closed to the app role › No way to enumerate | pass | pass | the judge passed it and a discriminating test passes |
| C-4a42bfb1 | tenancy › Routes are registered only for the current tenant › Create, repeat, take over | pass | pass | the judge passed it and a discriminating test passes |
| C-48810221 | tenancy › Routes are registered only for the current tenant › Two tenants race for one key | pass | pass | the judge passed it and a discriminating test passes |
| C-da7373cb | tenancy › Routes are registered only for the current tenant › A reserved kind needs the owner connection | pass | pass | the judge passed it and a discriminating test passes |
| C-df386321 | tenancy › Routes are registered only for the current tenant › No tenant, unknown tenant, bad input | pass | pass | the judge passed it and a discriminating test passes |
| C-d44bc114 | tenancy › Routes are removed only by their tenant › Own route only | pass | pass | the judge passed it and a discriminating test passes |
| C-fd29b241 | tenancy › Routes are removed only by their tenant › No tenant, bad input, reserved kind | pass | pass | the judge passed it and a discriminating test passes |
| C-008c1a9f | tenancy › Tenants resolve from exact keys only › Known, unknown and wrong kind | pass | pass | the judge passed it and a discriminating test passes |
| C-2d0572f1 | tenancy › Tenants resolve from exact keys only › Bad kind and database down | pass | pass | the judge passed it and a discriminating test passes |
| C-8f310ba8 | tenancy › Two seeded tenants for isolation tests › Seed, repeat, keep stored values | pass | pass | the judge passed it and a discriminating test passes |
| C-7a21b515 | tenancy-catalog › The catalog test guards every table › The migrated database is clean | pass | pass | the judge passed it and a discriminating test passes |
| C-be7b9eeb | tenancy-catalog › The catalog test guards every table › Each broken object is reported | pass | pass | the judge passed it and a discriminating test passes |
| C-5d0424c6 | tenancy-catalog › The catalog test guards every table › A table with no key or no tenant column is reported | pass | pass | the judge passed it and a discriminating test passes |
| C-0c61db8f | tenancy-catalog › The catalog test guards every table › A policy for the app role or its group counts | pass | pass | the judge passed it and a discriminating test passes |
| C-f9e36a0c | tenancy-catalog › The runtime role is unprivileged › Objects that open a hole | pass | pass | the judge passed it and a discriminating test passes |
| C-58a3293a | tenancy-catalog › The runtime role is unprivileged › A definer function of another owner | pass | pass | the judge passed it and a discriminating test passes |
| C-ae959f29 | tenancy-catalog › The runtime role is unprivileged › The real role and probe roles | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] App-role membership in pg_read_all_data / pg_write_all_data is not reported (spec gap) (criterion C-ae959f29): APP_ROLE_PRIVILEGED flags membership only in ownerRole or in a superuser or BYPASSRLS role. If a later change grants ursitoare_app the predefined pg_read_all_data or pg_write_all_data role, the app role can read or write tenant_route directly. The catalog check stays clean in that case, because has_table_privilege on tenant_route may report the predefined-role grant inconsistently, and no role rule covers it. (waived by the delegate (claude-fable-5-1 via claude-code): The finding is waived. The requirement "The runtime role is unprivileged" names a closed list of role conditions: missing, supe...
- [minor, judge] A unique index that includes tenant_id but does not lead with it is reported (spec gap) (criterion C-be7b9eeb): The spec says a unique index violates when it 'does not lead with or include tenant_id', which can be read either way. The code checks only indkey[0], so an index on (email, tenant_id) is reported.
- [minor, judge] A foreign key with tenant_id at a later position is accepted (spec gap) (criterion C-be7b9eeb): The FK rule only requires tenant_id somewhere in conkey, mapped to the referenced tenant_id. No scenario pins down whether it must lead.
- [minor, judge] security_invoker spellings other than true/on are not exempt (spec gap) (criterion C-f9e36a0c): A view created WITH (security_invoker = 1) or 'yes' is stored with that literal, so a view that is in fact safe is reported as view_open_to_app.
- [minor, judge] The materialized view probe reads bad_view, not ursitoare.tenant (criterion C-f9e36a0c): The scenario says bad_mv is created 'over it', meaning ursitoare.tenant. The test builds it over bad_view instead. The catalog outcome is the same.
- [minor, judge] fn that ends the transaction itself is not detected (spec gap) (criterion C-b73f1a2d): inTransaction treats only a COMMIT tag of ROLLBACK as aborted. If fn runs its own ROLLBACK or COMMIT, the outer COMMIT gets a warning and the tag COMMIT, so the helper resolves, and any statements fn ran afterwards ran autocommitted without the transaction-local tenant. No scenario pins this down.
- [minor, judge] the judge called a test inadequate (criterion C-f6d2db43): src.tenancy.schema.test.ts::C-f6d2db43 a tenant session sees only its own tenant row

## New tests (red then green, `task.red_ok` in the ledger)

- `src.tenancy.bootstrap.test.ts::C-39972679 ensureDefaultTenant refuses a second default tenant` (task 5.1): passed
- `src.tenancy.bootstrap.test.ts::C-9a8a5051 ensureDefaultTenant creates one tenant under concurrent calls` (task 5.1): passed
- `src.tenancy.bootstrap.test.ts::C-9a8a5051 ensureDefaultTenant creates the default tenant once` (task 5.1): passed
- `src.tenancy.bootstrap.test.ts::C-eef313af ensureDefaultTenant validates the name and needs the owner role` (task 5.1): passed
- `src.tenancy.catalog.roles.test.ts::C-58a3293a a definer function of another owner is unsafe` (task 7.2): passed
- `src.tenancy.catalog.roles.test.ts::C-ae959f29 the real role and probe roles are checked` (task 7.2): passed
- `src.tenancy.catalog.roles.test.ts::C-f9e36a0c objects that open a hole are reported` (task 7.2): passed
- `src.tenancy.catalog.test.ts::C-0c61db8f a policy for the app role or its group counts` (task 7.1): passed
- `src.tenancy.catalog.test.ts::C-5d0424c6 a table with no key or no tenant column is reported` (task 7.1): passed
- `src.tenancy.catalog.test.ts::C-7a21b515 the migrated database is clean` (task 7.1): passed
- `src.tenancy.catalog.test.ts::C-be7b9eeb each broken object is reported` (task 7.1): passed
- `src.tenancy.context.test.ts::C-298c59fd hashRouteKey refuses empty ill-formed and over-long keys` (task 1.1): passed
- `src.tenancy.context.test.ts::C-b9c4cf59 hashRouteKey returns the SHA-256 of the UTF-8 bytes` (task 1.1): passed
- `src.tenancy.resolve.test.ts::C-008c1a9f resolveTenantBy answers the exact pair and none otherwise` (task 6.2): passed
- `src.tenancy.resolve.test.ts::C-2d0572f1 resolveTenantBy refuses a bad kind and propagates a connection failure` (task 6.2): passed
- `src.tenancy.routes.test.ts::C-48810221 two tenants race for one key` (task 6.1): passed
- `src.tenancy.routes.test.ts::C-4a42bfb1 register creates repeats and refuses another tenant` (task 6.1): passed
- `src.tenancy.routes.test.ts::C-da7373cb a reserved kind needs the owner connection` (task 6.1): passed
- `src.tenancy.routes.test.ts::C-df386321 no tenant unknown tenant and bad input are refused` (task 6.1): passed
- `src.tenancy.schema.test.ts::C-468abad0 app sessions see no tenant rows without a tenant setting` (task 2.1): passed
- `src.tenancy.schema.test.ts::C-5cb45dfc a shadowing temp table changes nothing` (task 2.1): passed
- `src.tenancy.schema.test.ts::C-91a17beb tenant defaults and constraints hold` (task 2.1): passed
- `src.tenancy.schema.test.ts::C-96d545df the app role can only read tenants` (task 2.1): passed
- `src.tenancy.schema.test.ts::C-f511db93 the routing functions are safe definers` (task 2.1): passed
- `src.tenancy.schema.test.ts::C-f6d2db43 a tenant session sees only its own tenant row` (task 2.1): passed
- `src.tenancy.schema.test.ts::C-fe7e2021 the app role has no direct access to the routing table` (task 2.1): passed
- `src.tenancy.schema.test.ts::C-ff9216e2 resolve_tenant answers only exact pairs` (task 2.1): passed
- `src.tenancy.tx.test.ts::C-02d854a3 tenant A cannot read or write tenant B rows` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-8029b440 a session level tenant set by fn does not survive` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-9311e093 withTenantTx reports a closed port and recovers after a lost connection` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-96d545df the app role can only read tenants through withTenantTx` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-a9b4dfd2 concurrent tenants stay apart` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-b71c59a4 withTenantTx refuses an invalid context before connecting` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-b73f1a2d a caught SQL error fails closed with TENANT_TX_ABORTED` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-c58611eb withTenantTx sets the tenant inside and resets it after commit` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-ddcd6c10 withTenantTx rolls back when fn throws` (task 4.1): passed
- `src.tenancy.tx.test.ts::C-f6d2db43 a tenant session sees only its own tenant row` (task 4.1): passed
- `src.tenancy.unregister.test.ts::C-d44bc114 unregister removes only the current tenant route` (task 6.3): passed
- `src.tenancy.unregister.test.ts::C-fd29b241 unregister refuses no tenant bad input and a reserved kind` (task 6.3): passed
- `test.support.tenants.test.ts::C-8f310ba8 seedTwoTenants seeds two tenants once and keeps stored values` (task 3.1): passed
