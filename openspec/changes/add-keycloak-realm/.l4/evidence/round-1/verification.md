# Verification: openspec:add-keycloak-realm: PASS (round 1)

traceability: 10/10 criteria covered by a discriminating test

- Base: `c2be8f4ae30f5f6cecc91d1964b4c5712ed645cb`
- Head: `150ad8f06a5d358fb95b38b5e00a55b4e07f714b`
- Implementer profiles: beam, deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `6ac2074ff6fb6e1b963f72dc6b9a3ccd3ca9fcd0bc7334a516575ac726f053d7`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), beam reflection (declared), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@c2be8f4ae3 contained |
| 1 | integrity | ok | 398.5 | 11 sub-checks; scope: 12 changed file(s) |
| 2 | build | ok | 47.1 |  |
| 3 | tests | ok | 646.0 |  |
| 4 | traceability | ok | 0.2 | 10/10 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: deploy/postgres/initdb/10-keycloak.sh, test/deploy/realm.ts |
| 8 | s1 judge | ok | 1.0 | 9/10 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 139.1 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261128T0857Z-f6a9/041-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261128T0857Z-f6a9/042-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261128T0857Z-f6a9/043-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261128T0857Z-f6a9/044-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261128T0857Z-f6a9/045-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261128T0857Z-f6a9/046-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261128T0857Z-f6a9/047-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 4 task(s): red and green compared |
| test path freeze | ok | 4 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: deploy/postgres/initdb/10-keycloak.sh, test/deploy/initdb-keycloak.test.ts, test/deploy/realm-claims.test.ts, test/deploy/realm-fake.test.ts, test/deploy/realm-render.test.ts (+3 more) |
| tdd history | ok | 4 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 3236 of 3236 base tests pass on the unit's code with its 6 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-32ad3ca4 | deploy-keycloak › The realm template takes its values from six placeholders › The constants, the reader and the substitution | covered | test.deploy.realm-render.test.ts::C-32ad3ca4 the constants, the reader and the substitution (passed, red_assertion) | - | 0.95 |
| C-bc176b5f | deploy-keycloak › The realm template takes its values from six placeholders › The committed template names the six placeholders and renders with test values | covered | test.deploy.realm-template.test.ts::C-bc176b5f the committed template names the six placeholders and renders with test values (passed, red_assertion) | - | 0.94 |
| C-998a2d20 | deploy-keycloak › The realm holds the organization, the groups, two clients and the first user › The committed template is the realm of the test plan | covered | test.deploy.realm-template.test.ts::C-998a2d20 the committed template is the realm of the test plan (passed, red_assertion) | - | 0.94 |
| C-a1c5860f | deploy-keycloak › The realm binds a one-page browser flow › The bound browser flow has no organization step | covered | test.deploy.realm-template.test.ts::C-a1c5860f the bound browser flow has no organization step (passed, red_assertion) | - | 0.74 |
| C-cdf2b51e | deploy-keycloak › realmClaimProblems lists each way the realm could stop emitting what the engine reads › Each broken rule gives its own problem | covered | test.deploy.realm-claims.test.ts::C-cdf2b51e each broken rule gives its own problem (passed, red_assertion) | - | 0.92 |
| C-87ac6333 | deploy-keycloak › realmClaimProblems lists each way the realm could stop emitting what the engine reads › A non-object, an empty object and a leftover placeholder | covered | test.deploy.realm-claims.test.ts::C-87ac6333 a non-object, an empty object and a leftover placeholder (passed, red_assertion) | - | 0.78 |
| C-a612c0ca | deploy-keycloak › The realm's claims have the shape the fake OIDC contract and the engine expect › The realm's claims have the fake's shapes and the engine reads them | covered | test.deploy.realm-fake.test.ts::C-a612c0ca the realm's claims have the fake's shapes and the engine reads them (passed, red_assertion) | - | - |
| C-1aae0873 | deploy-keycloak › The realm values come from the first-run files › init-secrets files fill the realm | covered | test.deploy.realm-secrets.test.ts::C-1aae0873 init-secrets files fill the realm (passed, red_assertion) | - | 0.92 |
| C-ac7f4766 | deploy-keycloak › Keycloak's role and database are created from the secret file › The init script creates exactly the role and database from the secret file | covered | test.deploy.initdb-keycloak.test.ts::C-ac7f4766 the init script creates exactly the role and database from the secret file (passed, red_assertion) | - | 0.93 |
| C-e7a41fbe | deploy-keycloak › Keycloak's role and database are created from the secret file › Each deviation of the init script gives its own problem | covered | test.deploy.initdb-keycloak.test.ts::C-e7a41fbe each deviation of the init script gives its own problem (passed, red_assertion) | - | 0.88 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `deploy/keycloak/import/ursitoare-realm.json` | deploy | relevant | named in the spec |
| `deploy/postgres/initdb/10-keycloak.sh` | deploy | relevant | named in the spec |
| `openspec/changes/add-keycloak-realm/.l4/ledger/r-20261128T0619Z-fc2e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-keycloak-realm/.l4/ledger/r-20261128T0857Z-f6a9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-keycloak-realm/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/deploy/initdb-keycloak.test.ts` |  | relevant | new test file |
| `test/deploy/realm-claims.test.ts` |  | relevant | new test file |
| `test/deploy/realm-fake.test.ts` |  | relevant | new test file |
| `test/deploy/realm-render.test.ts` |  | relevant | new test file |
| `test/deploy/realm-secrets.test.ts` |  | relevant | new test file |
| `test/deploy/realm-template.test.ts` |  | relevant | new test file |
| `test/deploy/realm.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: deploy/postgres/initdb/10-keycloak.sh, test/deploy/realm.ts

### Tests

3397 of 3397 passed, 0 failed, 0 errored, 0 skipped.
10 of 10 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-32ad3ca4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bc176b5f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-998a2d20 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a1c5860f | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cdf2b51e | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87ac6333 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a612c0ca | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-1aae0873 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ac7f4766 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e7a41fbe | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-32ad3ca4 | deploy-keycloak › The realm template takes its values from six placeholders › The constants, the reader and the substitution | pass | pass | the judge passed it and a discriminating test passes |
| C-bc176b5f | deploy-keycloak › The realm template takes its values from six placeholders › The committed template names the six placeholders and renders with test values | pass | pass | the judge passed it and a discriminating test passes |
| C-998a2d20 | deploy-keycloak › The realm holds the organization, the groups, two clients and the first user › The committed template is the realm of the test plan | pass | pass | the judge passed it and a discriminating test passes |
| C-a1c5860f | deploy-keycloak › The realm binds a one-page browser flow › The bound browser flow has no organization step | pass | pass | the judge passed it and a discriminating test passes |
| C-cdf2b51e | deploy-keycloak › realmClaimProblems lists each way the realm could stop emitting what the engine reads › Each broken rule gives its own problem | pass | pass | the judge passed it and a discriminating test passes |
| C-87ac6333 | deploy-keycloak › realmClaimProblems lists each way the realm could stop emitting what the engine reads › A non-object, an empty object and a leftover placeholder | pass | pass | the judge passed it and a discriminating test passes |
| C-a612c0ca | deploy-keycloak › The realm's claims have the shape the fake OIDC contract and the engine expect › The realm's claims have the fake's shapes and the engine reads them | pass | pass | the judge passed it and a discriminating test passes |
| C-1aae0873 | deploy-keycloak › The realm values come from the first-run files › init-secrets files fill the realm | pass | pass | the judge passed it and a discriminating test passes |
| C-ac7f4766 | deploy-keycloak › Keycloak's role and database are created from the secret file › The init script creates exactly the role and database from the secret file | pass | pass | the judge passed it and a discriminating test passes |
| C-e7a41fbe | deploy-keycloak › Keycloak's role and database are created from the secret file › Each deviation of the init script gives its own problem | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] realmClaimProblems treats Date and other exotic objects as records (spec gap) (criterion C-87ac6333): isRecord (test/deploy/realm.ts) returns true for any non-null non-array object, including Date, so realmClaimProblems(new Date()) returns rule texts rather than ["realm: not an object"]; no scenario pins down non-plain-object input, so two reasonable implementations differ.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.deploy.initdb-keycloak.test.ts::C-ac7f4766 the init script creates exactly the role and database from the secret file` (task 4.1): passed
- `test.deploy.initdb-keycloak.test.ts::C-e7a41fbe each deviation of the init script gives its own problem` (task 4.1): passed
- `test.deploy.realm-claims.test.ts::C-87ac6333 a non-object, an empty object and a leftover placeholder` (task 3.1): passed
- `test.deploy.realm-claims.test.ts::C-cdf2b51e each broken rule gives its own problem` (task 3.1): passed
- `test.deploy.realm-fake.test.ts::C-a612c0ca the realm's claims have the fake's shapes and the engine reads them` (task 3.1): passed
- `test.deploy.realm-render.test.ts::C-32ad3ca4 the constants, the reader and the substitution` (task 1.1): passed
- `test.deploy.realm-secrets.test.ts::C-1aae0873 init-secrets files fill the realm` (task 3.1): passed
- `test.deploy.realm-template.test.ts::C-998a2d20 the committed template is the realm of the test plan` (task 2.1): passed
- `test.deploy.realm-template.test.ts::C-a1c5860f the bound browser flow has no organization step` (task 2.1): passed
- `test.deploy.realm-template.test.ts::C-bc176b5f the committed template names the six placeholders and renders with test values` (task 2.1): passed
