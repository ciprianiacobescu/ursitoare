# Verification: openspec:add-identity-model: PASS (round 1)

traceability: 32/32 criteria covered by a discriminating test

- Base: `3ba285348d1c8f3bd8d7b5294cf9a3f0ff7e69ba`
- Head: `61c7e4077f7ed4617498db7b3338fdc7a852ca85`
- Implementer profiles: claude-sonnet, deepseek, glm
- Judge: claude-judge (claude-opus-5-5), 1 call(s), prompt sha256 `4acdeb01c363f2d5ff1b567c20a80761d4559fc2c9bbdf6fdd0cb1953b337ac5`
- Judge replies of claude-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), claude-sonnet anthropic (tool), deepseek deepseek (declared), glm zhipu (declared)
- Cost: $1.1075

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@3ba285348d contained |
| 1 | integrity | ok | 27.6 | 10 sub-checks (+1 unfrozen by human answers); scope: 17 changed file(s) |
| 2 | build | ok | 11.2 |  |
| 3 | tests | ok | 33.1 |  |
| 4 | traceability | ok | 0.1 | 32/32 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/identity/errors.ts, src/identity/route.ts, src/identity/tenant-idp.ts, src/identity/text.ts, src/identity/users.ts |
| 8 | s1 judge | ok | 3.2 | 32/32 criteria judged by jev |
| 9 | judge | ok | 105.6 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261027T2117Z-4eb4/044-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261027T2117Z-4eb4/045-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261027T2117Z-4eb4/046-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261027T2117Z-4eb4/047-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261027T2117Z-4eb4/048-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261027T2117Z-4eb4/049-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261027T2117Z-4eb4/050-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 7 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/identity/errors.ts, src/identity/provision.test.ts, src/identity/resolve.test.ts, src/identity/route.test.ts, src/identity/route.ts (+7 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 538 of 538 base tests pass on the unit's code with its 6 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/identity/users.test.ts kept at head for the run (task 6.1: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/identity/users.test.ts (task 6.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-ca21e129 | identity › The IdP route key is exact › Known value and refused halves | covered | src.identity.route.test.ts.idpRouteKey::C-ca21e129: known value and refused halves (passed, red_assertion) | - | 0.91 |
| C-1762da65 | identity › A token names exactly one organization › One organization | covered | src.identity.route.test.ts.organizationFromClaim::C-1762da65: one organization (passed, red_assertion) | - | 0.91 |
| C-f3a5ccfc | identity › A token names exactly one organization › None | covered | src.identity.route.test.ts.organizationFromClaim::C-f3a5ccfc: none (passed, red_assertion) | - | 0.86 |
| C-04803d57 | identity › A token names exactly one organization › Ambiguous | covered | src.identity.route.test.ts.organizationFromClaim::C-04803d57: ambiguous (passed, red_assertion) | - | 0.91 |
| C-30864f4c | identity › Identity tables are tenant-leading and narrowly granted › Objects, ledger and catalog | covered | src.identity.schema.test.ts::C-30864f4c Objects, ledger and catalog (passed, red_assertion) | - | 0.95 |
| C-69e05eb7 | identity › Identity tables are tenant-leading and narrowly granted › Tenant A sees only its rows | covered | src.identity.schema.test.ts::C-69e05eb7 Tenant A sees only its rows (passed, red_assertion) | - | 0.92 |
| C-465620b5 | identity › Identity tables are tenant-leading and narrowly granted › Another tenant's rows cannot be written | covered | src.identity.schema.test.ts::C-465620b5 Another tenant's rows cannot be written (passed, red_assertion) | - | 0.94 |
| C-0965869a | identity › Identity tables are tenant-leading and narrowly granted › Privileges are narrow | covered | src.identity.schema.test.ts::C-0965869a Privileges are narrow (passed, red_assertion) | - | 0.82 |
| C-4b056702 | identity › Identity rows cannot hold an impossible shape › Each bad row fails with its code | covered | src.identity.schema.test.ts::C-4b056702 Each bad row fails with its code (passed, red_assertion) | - | 0.92 |
| C-3196b69f | identity › An identity provider is provisioned on the owner pool only › Provision and resolve | covered | src.identity.provision.test.ts::C-3196b69f Provision and resolve (passed, red_assertion) | - | 0.94 |
| C-7d56dd2d | identity › An identity provider is provisioned on the owner pool only › Repeat changes nothing | covered | src.identity.provision.test.ts::C-7d56dd2d Repeat changes nothing (passed, red_assertion) | - | 0.82 |
| C-4001630b | identity › An identity provider is provisioned on the owner pool only › A pair held by another tenant is refused | covered | src.identity.provision.test.ts::C-4001630b A pair held by another tenant is refused (passed, red_assertion) | - | 0.91 |
| C-e7c8a091 | identity › An identity provider is provisioned on the owner pool only › Two tenants race for one pair | covered | src.identity.provision.test.ts::C-e7c8a091 Two tenants race for one pair (passed, red_assertion) | - | 0.91 |
| C-9efb6a14 | identity › An identity provider is provisioned on the owner pool only › Not from the app role, bad input, unknown tenant, database down | covered | src.identity.provision.test.ts::C-9efb6a14 Not from the app role, bad input, unknown tenant, database down (passed, red_assertion) | - | 0.94 |
| C-8a491965 | identity › A token resolves to one tenant by its exact issuer and organization › Each organization finds its own tenant | covered | src.identity.resolve.test.ts::C-8a491965 Each organization finds its own tenant (passed, red_assertion) | - | 0.85 |
| C-3e4e5dfd | identity › A token resolves to one tenant by its exact issuer and organization › Nothing is guessed | covered | src.identity.resolve.test.ts::C-3e4e5dfd Nothing is guessed (passed, red_assertion) | - | 0.82 |
| C-35426a1d | identity › A token resolves to one tenant by its exact issuer and organization › Claim problems are decided before any lookup; database down | covered | src.identity.resolve.test.ts::C-35426a1d Claim problems are decided before any lookup; database down (passed, red_assertion) | - | 0.78 |
| C-c54d1b54 | identity › The first sign-in creates a human user and its IdP link › First sign-in | covered | src.identity.upsert.test.ts::C-c54d1b54 First sign-in (passed, red_assertion) | - | 0.94 |
| C-d87c60d4 | identity › The first sign-in creates a human user and its IdP link › Display name fallbacks | covered | src.identity.upsert.test.ts::C-d87c60d4 Display name fallbacks (passed, red_assertion) | - | 0.91 |
| C-13b4a891 | identity › The first sign-in creates a human user and its IdP link › Display name cut to 200 code points | covered | src.identity.upsert.test.ts::C-13b4a891 Display name cut to 200 code points (passed, red_assertion) | - | 0.92 |
| C-6c525799 | identity › The first sign-in creates a human user and its IdP link › Same subject in two tenants, same email under a new subject | covered | src.identity.upsert.test.ts::C-6c525799 Same subject in two tenants, same email under a new subject (passed, red_assertion) | - | 0.91 |
| C-cb7ab02a | identity › The first sign-in creates a human user and its IdP link › Concurrent first sign-ins | covered | src.identity.upsert.test.ts::C-cb7ab02a Concurrent first sign-ins (passed, red_assertion) | - | 0.88 |
| C-a8fc2be1 | identity › The first sign-in creates a human user and its IdP link › Bad claims | covered | src.identity.upsert.test.ts::C-a8fc2be1 Bad claims (passed, red_assertion) | - | 0.91 |
| C-85a51e03 | identity › Later sign-ins update only what changed and refuse users who cannot sign in › Unchanged | covered | src.identity.upsert.test.ts::C-85a51e03 Unchanged (passed, red_assertion) | - | 0.94 |
| C-e07fdb38 | identity › Later sign-ins update only what changed and refuse users who cannot sign in › Changed name and email | covered | src.identity.upsert.test.ts::C-e07fdb38 Changed name and email (passed, red_assertion) | - | 0.89 |
| C-26f5ccf3 | identity › Later sign-ins update only what changed and refuse users who cannot sign in › Disabled user, and a link to a service account | covered | src.identity.upsert.test.ts::C-26f5ccf3 Disabled user, and a link to a service account (passed, red_assertion) | - | 0.92 |
| C-569586e2 | identity › Users are read within the tenant › Get | covered | src.identity.users.test.ts::C-569586e2 Get (passed, red_assertion) | - | 0.92 |
| C-cffba88c | identity › Users are read within the tenant › Pages | covered | src.identity.users.test.ts::C-cffba88c Pages (passed, red_assertion) | - | 0.90 |
| C-4fa2c2cd | identity › A service account is owned by an active human of the same tenant › Create | covered | src.identity.service.test.ts::C-4fa2c2cd Create (passed, red_assertion) | - | 0.92 |
| C-6244c1b6 | identity › A service account is owned by an active human of the same tenant › Invalid owners | covered | src.identity.service.test.ts::C-6244c1b6 Invalid owners (passed, red_assertion) | - | 0.92 |
| C-4f243a05 | identity › A service account is owned by an active human of the same tenant › Bad input | covered | src.identity.service.test.ts::C-4f243a05 Bad input (passed, red_assertion) | - | 0.82 |
| C-dcd3307a | identity › User functions refuse a transaction of another tenant › Wrong or missing tenant | covered | src.identity.service.test.ts::C-dcd3307a Wrong or missing tenant for createServiceAccount (passed, red_assertion); src.identity.upsert.test.ts::C-dcd3307a Wrong tenant transaction refused by upsertUserFromClaims (passed, red_assertion); src.identity.users.test.ts::C-dcd3307a Wrong or missing tenant ... | - | 0.91 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-identity-model/.l4/ledger/r-20261027T2033Z-992f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-identity-model/.l4/ledger/r-20261027T2117Z-4eb4.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-identity-model/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-identity-model/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/db/migrations/0100_identity.sql` | db | relevant | named in the spec |
| `src/identity/errors.ts` | identity | relevant | named in the spec |
| `src/identity/provision.test.ts` |  | relevant | new test file |
| `src/identity/resolve.test.ts` |  | relevant | new test file |
| `src/identity/route.test.ts` |  | relevant | new test file |
| `src/identity/route.ts` | identity | relevant | named in the spec |
| `src/identity/schema.test.ts` |  | relevant | new test file |
| `src/identity/service.test.ts` |  | relevant | new test file |
| `src/identity/tenant-idp.ts` | identity | relevant | named in the spec |
| `src/identity/text.ts` | identity | relevant | named in the spec |
| `src/identity/upsert.test.ts` |  | relevant | new test file |
| `src/identity/users.test.ts` |  | relevant | new test file |
| `src/identity/users.ts` | identity | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/identity/errors.ts, src/identity/route.ts, src/identity/tenant-idp.ts, src/identity/text.ts, src/identity/users.ts

### Tests

596 of 596 passed, 0 failed, 0 errored, 0 skipped.
35 of 35 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-ca21e129 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1762da65 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f3a5ccfc | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-04803d57 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-30864f4c | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69e05eb7 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-465620b5 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0965869a | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4b056702 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3196b69f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7d56dd2d | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4001630b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e7c8a091 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9efb6a14 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8a491965 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3e4e5dfd | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-35426a1d | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c54d1b54 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d87c60d4 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-13b4a891 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6c525799 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cb7ab02a | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a8fc2be1 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-85a51e03 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e07fdb38 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-26f5ccf3 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-569586e2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cffba88c | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4fa2c2cd | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6244c1b6 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f243a05 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dcd3307a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-ca21e129 | identity › The IdP route key is exact › Known value and refused halves | pass | pass | the judge passed it and a discriminating test passes |
| C-1762da65 | identity › A token names exactly one organization › One organization | pass | pass | the judge passed it and a discriminating test passes |
| C-f3a5ccfc | identity › A token names exactly one organization › None | pass | pass | the judge passed it and a discriminating test passes |
| C-04803d57 | identity › A token names exactly one organization › Ambiguous | pass | pass | the judge passed it and a discriminating test passes |
| C-30864f4c | identity › Identity tables are tenant-leading and narrowly granted › Objects, ledger and catalog | pass | pass | the judge passed it and a discriminating test passes |
| C-69e05eb7 | identity › Identity tables are tenant-leading and narrowly granted › Tenant A sees only its rows | pass | pass | the judge passed it and a discriminating test passes |
| C-465620b5 | identity › Identity tables are tenant-leading and narrowly granted › Another tenant's rows cannot be written | pass | pass | the judge passed it and a discriminating test passes |
| C-0965869a | identity › Identity tables are tenant-leading and narrowly granted › Privileges are narrow | pass | pass | the judge passed it and a discriminating test passes |
| C-4b056702 | identity › Identity rows cannot hold an impossible shape › Each bad row fails with its code | pass | pass | the judge passed it and a discriminating test passes |
| C-3196b69f | identity › An identity provider is provisioned on the owner pool only › Provision and resolve | pass | pass | the judge passed it and a discriminating test passes |
| C-7d56dd2d | identity › An identity provider is provisioned on the owner pool only › Repeat changes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-4001630b | identity › An identity provider is provisioned on the owner pool only › A pair held by another tenant is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-e7c8a091 | identity › An identity provider is provisioned on the owner pool only › Two tenants race for one pair | pass | pass | the judge passed it and a discriminating test passes |
| C-9efb6a14 | identity › An identity provider is provisioned on the owner pool only › Not from the app role, bad input, unknown tenant, database down | pass | pass | the judge passed it and a discriminating test passes |
| C-8a491965 | identity › A token resolves to one tenant by its exact issuer and organization › Each organization finds its own tenant | pass | pass | the judge passed it and a discriminating test passes |
| C-3e4e5dfd | identity › A token resolves to one tenant by its exact issuer and organization › Nothing is guessed | pass | pass | the judge passed it and a discriminating test passes |
| C-35426a1d | identity › A token resolves to one tenant by its exact issuer and organization › Claim problems are decided before any lookup; database down | pass | pass | the judge passed it and a discriminating test passes |
| C-c54d1b54 | identity › The first sign-in creates a human user and its IdP link › First sign-in | pass | pass | the judge passed it and a discriminating test passes |
| C-d87c60d4 | identity › The first sign-in creates a human user and its IdP link › Display name fallbacks | pass | pass | the judge passed it and a discriminating test passes |
| C-13b4a891 | identity › The first sign-in creates a human user and its IdP link › Display name cut to 200 code points | pass | pass | the judge passed it and a discriminating test passes |
| C-6c525799 | identity › The first sign-in creates a human user and its IdP link › Same subject in two tenants, same email under a new subject | pass | pass | the judge passed it and a discriminating test passes |
| C-cb7ab02a | identity › The first sign-in creates a human user and its IdP link › Concurrent first sign-ins | pass | pass | the judge passed it and a discriminating test passes |
| C-a8fc2be1 | identity › The first sign-in creates a human user and its IdP link › Bad claims | pass | pass | the judge passed it and a discriminating test passes |
| C-85a51e03 | identity › Later sign-ins update only what changed and refuse users who cannot sign in › Unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-e07fdb38 | identity › Later sign-ins update only what changed and refuse users who cannot sign in › Changed name and email | pass | pass | the judge passed it and a discriminating test passes |
| C-26f5ccf3 | identity › Later sign-ins update only what changed and refuse users who cannot sign in › Disabled user, and a link to a service account | pass | pass | the judge passed it and a discriminating test passes |
| C-569586e2 | identity › Users are read within the tenant › Get | pass | pass | the judge passed it and a discriminating test passes |
| C-cffba88c | identity › Users are read within the tenant › Pages | pass | pass | the judge passed it and a discriminating test passes |
| C-4fa2c2cd | identity › A service account is owned by an active human of the same tenant › Create | pass | pass | the judge passed it and a discriminating test passes |
| C-6244c1b6 | identity › A service account is owned by an active human of the same tenant › Invalid owners | pass | pass | the judge passed it and a discriminating test passes |
| C-4f243a05 | identity › A service account is owned by an active human of the same tenant › Bad input | pass | pass | the judge passed it and a discriminating test passes |
| C-dcd3307a | identity › User functions refuse a transaction of another tenant › Wrong or missing tenant | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] listUsers validates the page before the tenant check, unlike getUser and the design order (spec gap) (criterion C-dcd3307a): design.md says listUsers does the tenant check first, then validates limit and after. src/identity/users.ts does the opposite: it validates limit and after before calling assertTenantMatches. As a result, a mismatched transaction with a bad page reports IDENTITY_INVALID, not IDENTITY_TENANT_MISMATCH. getUser does the tenant check first.
- [minor, judge] createServiceAccount refuses a padded displayName whose untrimmed length exceeds 200 (spec gap) (criterion C-4f243a05): The design says displayName is trimmed, then checked for 1 to 200 code units. The code checks the untrimmed length first (`input.displayName.length > 200`), so 199 x followed by two spaces is refused although its trimmed form is valid.
- [minor, judge] getUser checks the tenant before validating the id (spec gap) (criterion C-569586e2): getUser runs assertTenantMatches before it validates the id pattern. In a mismatched transaction, an id such as "a/b" therefore gives IDENTITY_TENANT_MISMATCH. No scenario pins this order down.
- [minor, judge] task 1.1: route tests do not use assert.throws (criterion C-ca21e129): Task 1.1 says every rejection is checked with `assert.throws(fn, { name: "IdentityError", code, message })`. route.test.ts instead uses a custom `caught()` helper compared with assert.deepEqual. The checks are equivalent, but the stated form is not used.
- [minor, judge] Stale 'Signature stub' header left in implemented files: errors.ts, route.ts and text.ts dropped the scaffold header comment, but tenant-idp.ts and users.ts still say they are signature stubs the owning change will implement, though they are now implemented.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.identity.provision.test.ts::C-3196b69f Provision and resolve` (task 3.1): passed
- `src.identity.provision.test.ts::C-4001630b A pair held by another tenant is refused` (task 3.1): passed
- `src.identity.provision.test.ts::C-7d56dd2d Repeat changes nothing` (task 3.1): passed
- `src.identity.provision.test.ts::C-9efb6a14 Not from the app role, bad input, unknown tenant, database down` (task 3.1): passed
- `src.identity.provision.test.ts::C-e7c8a091 Two tenants race for one pair` (task 3.1): passed
- `src.identity.resolve.test.ts::C-35426a1d Claim problems are decided before any lookup; database down` (task 4.1): passed
- `src.identity.resolve.test.ts::C-3e4e5dfd Nothing is guessed` (task 4.1): passed
- `src.identity.resolve.test.ts::C-8a491965 Each organization finds its own tenant` (task 4.1): passed
- `src.identity.route.test.ts.IdentityError::is an Error with name code and message` (task 1.1): passed
- `src.identity.route.test.ts.idpRouteKey::C-ca21e129: known value and refused halves` (task 1.1): passed
- `src.identity.route.test.ts.organizationFromClaim::C-04803d57: ambiguous` (task 1.1): passed
- `src.identity.route.test.ts.organizationFromClaim::C-1762da65: one organization` (task 1.1): passed
- `src.identity.route.test.ts.organizationFromClaim::C-f3a5ccfc: none` (task 1.1): passed
- `src.identity.schema.test.ts::C-0965869a Privileges are narrow` (task 2.1): passed
- `src.identity.schema.test.ts::C-30864f4c Objects, ledger and catalog` (task 2.1): passed
- `src.identity.schema.test.ts::C-465620b5 Another tenant's rows cannot be written` (task 2.1): passed
- `src.identity.schema.test.ts::C-4b056702 Each bad row fails with its code` (task 2.1): passed
- `src.identity.schema.test.ts::C-69e05eb7 Tenant A sees only its rows` (task 2.1): passed
- `src.identity.service.test.ts::C-4f243a05 Bad input` (task 7.1): passed
- `src.identity.service.test.ts::C-4fa2c2cd Create` (task 7.1): passed
- `src.identity.service.test.ts::C-6244c1b6 Invalid owners` (task 7.1): passed
- `src.identity.service.test.ts::C-dcd3307a Wrong or missing tenant for createServiceAccount` (task 7.1): passed
- `src.identity.upsert.test.ts::C-13b4a891 Display name cut to 200 code points` (task 5.1): passed
- `src.identity.upsert.test.ts::C-26f5ccf3 Disabled user, and a link to a service account` (task 5.1): passed
- `src.identity.upsert.test.ts::C-6c525799 Same subject in two tenants, same email under a new subject` (task 5.1): passed
- `src.identity.upsert.test.ts::C-85a51e03 Unchanged` (task 5.1): passed
- `src.identity.upsert.test.ts::C-a8fc2be1 Bad claims` (task 5.1): passed
- `src.identity.upsert.test.ts::C-c54d1b54 First sign-in` (task 5.1): passed
- `src.identity.upsert.test.ts::C-cb7ab02a Concurrent first sign-ins` (task 5.1): passed
- `src.identity.upsert.test.ts::C-d87c60d4 Display name fallbacks` (task 5.1): passed
- `src.identity.upsert.test.ts::C-dcd3307a Wrong tenant transaction refused by upsertUserFromClaims` (task 5.1): passed
- `src.identity.upsert.test.ts::C-e07fdb38 Changed name and email` (task 5.1): passed
- `src.identity.users.test.ts::C-569586e2 Get` (task 6.1): passed
- `src.identity.users.test.ts::C-cffba88c Pages` (task 6.1): passed
- `src.identity.users.test.ts::C-dcd3307a Wrong or missing tenant for getUser and listUsers` (task 6.1): passed
