# Verification: openspec:add-admin-api: NEEDS_HUMAN (round 1)

traceability: 27/29 criteria covered by a discriminating test

- Base: `fe00a46b4583a28db7cf546e0888a1b890a0bf4b`
- Head: `02e99e4425e86dfe7763af0aef0a8bb0a75b8c0a`
- Implementer profiles: glm, deepseek-free, claude-sonnet
- Judge: mimo-judge, 5 call(s), judged in 4 parts, prompt sha256 `b449a1053926c1ddd3b4742be27a2954e0f7e94ed8d980f80231953bdcaa09be`
  - part 1: 12 file(s), 100400 characters, profile mimo-judge, reply valid
  - part 2: 11 file(s), 115070 characters, profile mimo-judge, reply retried
  - part 3: 9 file(s), 112624 characters, profile mimo-judge, reply valid
  - part 4: 1 file(s), 17745 characters, profile mimo-judge, reply valid
- Judge replies of mimo-judge (this unit, all rounds): valid 3, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): mimo-judge xiaomi (declared), glm zhipu (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base main@fe00a46b45 contained |
| 1 | integrity | ok | 309.8 | 11 sub-checks (+2 unfrozen by human answers); scope: 40 changed file(s) |
| 2 | build | ok | 25.5 |  |
| 3 | tests | ok | 186.0 |  |
| 4 | traceability | ok | 0.2 | 27/29 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/admin-errors.ts, src/api/admin-page.ts, src/api/admin-rbac.ts, src/api/admin-routes.ts, src/api/admin-service-accounts.ts and 10 more |
| 8 | s1 judge | ok | 3.7 | 28/29 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 1683.5 | 5 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261031T0855Z-e7d0/008-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261031T0855Z-e7d0/009-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261031T0855Z-e7d0/010-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261031T0855Z-e7d0/011-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261031T0855Z-e7d0/012-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261031T0855Z-e7d0/013-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261031T0855Z-e7d0/014-e2e.log |

## Files by part

- part 1: src/db/migrations/0180_admin_api.sql (279 characters)
- part 1: src/identity/admin/accounts.test.ts (18123 characters)
- part 1: src/identity/admin/accounts.ts (9292 characters)
- part 1: src/api/admin-errors.test.ts (4434 characters)
- part 1: src/api/admin-errors.ts (2167 characters)
- part 1: src/api/admin-group-map.test.ts (11573 characters)
- part 1: src/api/admin-page.test.ts (4816 characters)
- part 1: src/api/admin-page.ts (3856 characters)
- part 1: src/api/admin-policy.test.ts (14610 characters)
- part 1: src/api/admin-rbac.ts (10645 characters)
- part 1: src/api/admin-refusals.test.ts (14548 characters)
- part 1: src/api/admin-routes.ts (6057 characters)
- part 2: src/api/admin-service-accounts.test.ts (17909 characters)
- part 2: src/api/admin-service-accounts.ts (12976 characters)
- part 2: src/api/admin-teams.test.ts (17994 characters)
- part 2: src/api/admin-tenant.test.ts (10744 characters)
- part 2: src/api/admin-tenant.ts (2470 characters)
- part 2: src/api/admin-users.test.ts (24105 characters)
- part 2: src/api/admin-users.ts (10956 characters)
- part 2: src/api/error-codes.test.ts (3941 characters)
- part 2: src/api/error-codes.ts (943 characters)
- part 2: src/identity/admin/errors.ts (1423 characters)
- part 2: src/identity/admin/idp-links.test.ts (11609 characters)
- part 3: src/identity/admin/idp-links.ts (5376 characters)
- part 3: src/api/index.ts (1339 characters)
- part 3: src/identity/index.ts (1235 characters)
- part 3: src/main.admin.test.ts (6608 characters)
- part 3: src/main.ts (748 characters)
- part 3: docs/api/openapi.json (82653 characters)
- part 3: src/identity/admin/review-profile.test.ts (7138 characters)
- part 3: src/identity/admin/review-profile.ts (3347 characters)
- part 3: src/identity/admin/schema.test.ts (4180 characters)
- part 4: openspec/changes/add-admin-api/tasks.md (17745 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 13 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 13 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/admin-errors.test.ts, src/api/admin-errors.ts, src/api/admin-group-map.test.ts, src/api/admin-page.test.ts, src/api/admin-page.ts (+25 more) |
| tdd history | ok | 13 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 971 of 971 base tests pass on the unit's code with its 13 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/identity/admin/accounts.test.ts kept at head for the run (task 2.1: unfrozen by Q-001)
- src/identity/admin/idp-links.test.ts kept at head for the run (task 3.1: unfrozen by Q-002)
- src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (named by the task text, plan:m2@64951c77b9c695ec)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/identity/admin/accounts.test.ts (task 2.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))
- src/identity/admin/idp-links.test.ts (task 3.1, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-8a23d872 | admin-api › Every admin route is a session route under the right action › The route table | covered | src.api.admin-policy.test.ts::C-8a23d872 the admin route table holds 19 session routes with their actions and codes (passed, red_assertion) | - | 0.84 |
| C-a4888ef3 | admin-api › Every admin route is a session route under the right action › Who may call | covered | src.api.admin-policy.test.ts::C-a4888ef3 roles cedar permits only the tenant admin on the admin routes (passed, red_assertion) | - | 0.92 |
| C-598727de | admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant | uncovered | - | - | 0.04 |
| C-cc3ddc89 | admin-api › Admin errors are registered codes › The mapping | covered | src.api.admin-errors.test.ts::C-cc3ddc89 admin errors map to registered API codes (passed, red_assertion) | - | 0.91 |
| C-e8ea1428 | admin-api › Admin errors are registered codes › Other errors pass through | covered | src.api.admin-errors.test.ts::C-e8ea1428 other errors pass through unchanged (passed, red_assertion) | - | 0.93 |
| C-7a958882 | admin-api › The app role may switch only its own tenant's review profile › Objects and privileges | covered | src.identity.admin.schema.test.ts::C-7a958882 Objects and privileges (passed, red_assertion) | - | 0.92 |
| C-32b7b36c | admin-api › Users are listed, read, disabled and enabled › List, page, filter, read | covered | src.api.admin-users.test.ts::C-32b7b36c users are listed paged filtered and read by id (passed, red_assertion); src.identity.admin.accounts.test.ts::C-32b7b36c Accounts list and read (passed, red_assertion) | - | 0.93 |
| C-c6c6a2a5 | admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts | covered | src.api.admin-users.test.ts::C-c6c6a2a5 accounts carry roles teams and local roles across states (passed, red_assertion); src.identity.admin.accounts.test.ts::C-c6c6a2a5 Accounts hold roles teams and local roles (passed, red_assertion) | - | 0.93 |
| C-9733f98e | admin-api › Users are listed, read, disabled and enabled › Disable and enable | covered | src.api.admin-users.test.ts::C-9733f98e users are disabled and enabled with suspended then restored sessions (passed, red_assertion); src.identity.admin.accounts.test.ts::C-9733f98e Account state changes (passed, red_assertion) | - | 0.91 |
| C-8087d00f | admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state | covered | src.api.admin-service-accounts.test.ts::C-8087d00f service accounts are created listed owned and disabled (passed, red_assertion); src.identity.admin.accounts.test.ts::C-8087d00f Service account provisioning and owners (passed, red_assertion) | - | 0.95 |
| C-c102e454 | admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account | covered | src.api.admin-service-accounts.test.ts::C-c102e454 service account roles are granted listed and revoked (passed, red_assertion) | - | 0.92 |
| C-50b6b834 | admin-api › Service accounts are created, listed, disabled and given roles › No elevation | covered | src.api.admin-service-accounts.test.ts::C-50b6b834 service account role grants cannot exceed the caller (passed, red_assertion) | - | 0.89 |
| C-8b40a61c | admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse | covered | src.api.admin-teams.test.ts::C-8b40a61c teams are created listed isolated mapped and deleted (passed, red_assertion) | - | 0.93 |
| C-09ace5ca | admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove | covered | src.api.admin-group-map.test.ts::C-09ace5ca group mapping is set replaced listed removed and tenant scoped (passed, red_assertion) | - | 0.94 |
| C-11a09b04 | admin-api › Group mappings are set, replaced, listed and removed › Refusals | covered | src.api.admin-group-map.test.ts::C-11a09b04 group mapping refusals keep the map empty (passed, red_assertion) | - | 0.92 |
| C-802ffb44 | admin-api › IdP links are listed and added › List and add | covered | src.api.admin-users.test.ts::C-802ffb44 idp links are listed and added idempotently (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-802ffb44 IdP links are listed and added (passed, red_assertion) | - | 0.94 |
| C-a63083c0 | admin-api › IdP links are listed and added › Refusals | covered | src.api.admin-users.test.ts::C-a63083c0 idp link refusals link nothing (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-a63083c0 Concurrent identical IdP links resolve once (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-a63083c0 IdP links refuse held pairs and bad t... | - | 0.92 |
| C-10655032 | admin-api › The review profile is switched, audited, with a solo warning › Switch and warning | covered | src.api.admin-tenant.test.ts::C-10655032 the review profile switches warns and stays audited through the server (passed, red_assertion); src.identity.admin.review-profile.test.ts::C-10655032 The review profile switches, warns and stays audited (passed, red_assertion) | - | 0.93 |
| C-1801fd2c | admin-api › The review profile is switched, audited, with a solo warning › Refusals | covered | src.api.admin-tenant.test.ts::C-1801fd2c the review profile route refuses a bad body and keeps the profile (passed, red_assertion); src.identity.admin.review-profile.test.ts::C-1801fd2c The review profile refuses an unknown profile (passed, red_assertion, inadequate) | - | 0.92 |
| C-777b5224 | admin-api › A refused change is audited › Each refusal leaves one event | covered | src.api.admin-refusals.test.ts::C-777b5224 each refused admin change appends one change refused event (passed, red_assertion) | - | 0.86 |
| C-e4402b02 | admin-api › A refused change is audited › A failing audit changes nothing | covered | src.api.admin-refusals.test.ts::C-e4402b02 a failing refusal audit keeps the answer and logs the failure (passed, red_assertion) | - | 0.91 |
| C-5995b318 | admin-api › Lists page with the cursor contract › pageRows | covered | src.api.admin-page.test.ts::C-5995b318 pageRows cuts a whole list into ordered pages under cursors (passed, red_assertion); src.api.admin-page.test.ts::C-5995b318 pageRows refuses a cursor position of another length (passed, red_assertion); src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964... | - | 0.91 |
| C-4c8964eb | admin-api › Lists page with the cursor contract › Without an engine key | covered | src.api.admin-page.test.ts::C-4c8964eb pageRows without an engine key serves one page and refuses a cursor (passed, red_assertion); src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging (passed, red_assertion) | - | 0.92 |
| C-eec17a85 | admin-api › Lists page with the cursor contract › Through the server | covered | src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging (passed, red_assertion) | - | 0.91 |
| C-ddb4acf0 | admin-api › The engine serves the admin routes and documents them › The real engine | covered | src.main.admin.test.ts::C-ddb4acf0 the real engine serves the admin routes and the OpenAPI document (passed, red_assertion) | - | 0.93 |
| C-96e47324 | api-conventions › Every error code is registered › The registry | uncovered | - | src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record)) | - |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | covered | test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass) | - | 0.91 |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | covered | test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass) | - | 0.87 |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | covered | src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass) | - | 0.88 |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0256Z-f813.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0339Z-c380.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0406Z-70cf.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0525Z-46b0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0527Z-4c9b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0740Z-aae9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/admin-errors.test.ts` |  | relevant | new test file |
| `src/api/admin-errors.ts` | api | relevant | named in the spec |
| `src/api/admin-group-map.test.ts` |  | relevant | new test file |
| `src/api/admin-page.test.ts` |  | relevant | new test file |
| `src/api/admin-page.ts` | api | relevant | named in the spec |
| `src/api/admin-policy.test.ts` |  | relevant | new test file |
| `src/api/admin-rbac.ts` | api | relevant | named in the spec |
| `src/api/admin-refusals.test.ts` |  | relevant | new test file |
| `src/api/admin-routes.ts` | api | relevant | named in the spec |
| `src/api/admin-service-accounts.test.ts` |  | relevant | new test file |
| `src/api/admin-service-accounts.ts` | api | relevant | named in the spec |
| `src/api/admin-teams.test.ts` |  | relevant | new test file |
| `src/api/admin-tenant.test.ts` |  | relevant | new test file |
| `src/api/admin-tenant.ts` | api | relevant | named in the spec |
| `src/api/admin-users.test.ts` |  | relevant | new test file |
| `src/api/admin-users.ts` | api | relevant | named in the spec |
| `src/api/error-codes.test.ts` |  | relevant | named in the spec |
| `src/api/error-codes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/db/migrations/0180_admin_api.sql` | db | relevant | named in the spec |
| `src/identity/admin/accounts.test.ts` |  | relevant | new test file |
| `src/identity/admin/accounts.ts` | identity | relevant | named in the spec |
| `src/identity/admin/errors.ts` | identity | relevant | named in the spec |
| `src/identity/admin/idp-links.test.ts` |  | relevant | new test file |
| `src/identity/admin/idp-links.ts` | identity | relevant | named in the spec |
| `src/identity/admin/review-profile.test.ts` |  | relevant | new test file |
| `src/identity/admin/review-profile.ts` | identity | relevant | named in the spec |
| `src/identity/admin/schema.test.ts` |  | relevant | new test file |
| `src/identity/index.ts` | identity | relevant | named in the spec |
| `src/main.admin.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/admin-errors.ts, src/api/admin-page.ts, src/api/admin-rbac.ts, src/api/admin-routes.ts, src/api/admin-service-accounts.ts and 10 more

### Tests

1055 of 1056 passed, 1 failed, 0 errored, 0 skipped.
35 of 35 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-8a23d872 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4888ef3 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-598727de | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cc3ddc89 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e8ea1428 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7a958882 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-32b7b36c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c6c6a2a5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9733f98e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8087d00f | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c102e454 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50b6b834 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8b40a61c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-09ace5ca | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-11a09b04 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-802ffb44 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a63083c0 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-10655032 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1801fd2c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-777b5224 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4402b02 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5995b318 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c8964eb | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eec17a85 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ddb4acf0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-96e47324 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-601275f9 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05ca73a7 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-541ef4f9 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-8a23d872 | admin-api › Every admin route is a session route under the right action › The route table | pass | pass | the judge passed it and a discriminating test passes |
| C-a4888ef3 | admin-api › Every admin route is a session route under the right action › Who may call | pass | pass | the judge passed it and a discriminating test passes |
| C-598727de | admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-cc3ddc89 | admin-api › Admin errors are registered codes › The mapping | pass | pass | the judge passed it and a discriminating test passes |
| C-e8ea1428 | admin-api › Admin errors are registered codes › Other errors pass through | pass | pass | the judge passed it and a discriminating test passes |
| C-7a958882 | admin-api › The app role may switch only its own tenant's review profile › Objects and privileges | pass | pass | the judge passed it and a discriminating test passes |
| C-32b7b36c | admin-api › Users are listed, read, disabled and enabled › List, page, filter, read | pass | pass | the judge passed it and a discriminating test passes |
| C-c6c6a2a5 | admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts | pass | pass | the judge passed it and a discriminating test passes |
| C-9733f98e | admin-api › Users are listed, read, disabled and enabled › Disable and enable | pass | pass | the judge passed it and a discriminating test passes |
| C-8087d00f | admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state | pass | pass | the judge passed it and a discriminating test passes |
| C-c102e454 | admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account | pass | pass | the judge passed it and a discriminating test passes |
| C-50b6b834 | admin-api › Service accounts are created, listed, disabled and given roles › No elevation | pass | pass | the judge passed it and a discriminating test passes |
| C-8b40a61c | admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse | pass | pass | the judge passed it and a discriminating test passes |
| C-09ace5ca | admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove | pass | pass | the judge passed it and a discriminating test passes |
| C-11a09b04 | admin-api › Group mappings are set, replaced, listed and removed › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-802ffb44 | admin-api › IdP links are listed and added › List and add | pass | pass | the judge passed it and a discriminating test passes |
| C-a63083c0 | admin-api › IdP links are listed and added › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-10655032 | admin-api › The review profile is switched, audited, with a solo warning › Switch and warning | pass | pass | the judge passed it and a discriminating test passes |
| C-1801fd2c | admin-api › The review profile is switched, audited, with a solo warning › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-777b5224 | admin-api › A refused change is audited › Each refusal leaves one event | pass | pass | the judge passed it and a discriminating test passes |
| C-e4402b02 | admin-api › A refused change is audited › A failing audit changes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-5995b318 | admin-api › Lists page with the cursor contract › pageRows | pass | pass | the judge passed it and a discriminating test passes |
| C-4c8964eb | admin-api › Lists page with the cursor contract › Without an engine key | pass | pass | the judge passed it and a discriminating test passes |
| C-eec17a85 | admin-api › Lists page with the cursor contract › Through the server | pass | pass | the judge passed it and a discriminating test passes |
| C-ddb4acf0 | admin-api › The engine serves the admin routes and documents them › The real engine | pass | pass | the judge passed it and a discriminating test passes |
| C-96e47324 | api-conventions › Every error code is registered › The registry | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | pass | pass | the judge passed it and a discriminating test passes |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | pass | pass | the judge passed it and a discriminating test passes |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message: no proof that it discriminates (no red, audit or generated record)
- [minor, judge] Two-tenant isolation has no discriminating test (spec gap) (criterion C-598727de): The gate report marks C-598727de uncovered ("no discriminating test"). The criterion requires B's admin to get 404 on A's user ids across GET/PATCH, role routes and idp-links, and 400 on a forged tenantId body; no test in this part exercises that combination.
- [major, judge] No discriminating test for cross-tenant admin isolation (criterion C-598727de): The gate report's traceability matrix marks C-598727de as uncovered with no discriminating test, so the two-tenant/forged-tenant admin scenario has no test evidence on this head.
- [minor, judge] openapi.json documents 200 for DELETE routes the spec requires to answer 204 (criterion C-ddb4acf0): The regenerated docs/api/openapi.json in this part records responses.200 for DELETE /api/v1/teams/{teamId}, DELETE /api/v1/service-accounts/{userId}/roles/{roleId} and DELETE /api/v1/idp-group-map, while the admin-api scenarios require 204 on a successful delete (gate tests expecting 204 passed).
- [major, judge] Uncovered criterion C-598727de (Another tenant and a forged tenant) (criterion C-598727de): The gate report marks C-598727de as 'uncovered — no discriminating test'. The criterion requires a test that a tenant B admin's attempts to list/read/patch tenant A's users, grant roles to A's service account, list A's idp-links, and POST a team with a forged tenantId all fail (404/400) and leave A's rows unchanged. No test in the gate report asserts this full scenario end-to-end through the HTTP routes.
- [major, judge] Uncovered criterion C-96e47324 (The registry) at gate level (criterion C-96e47324): The gate report marks C-96e47324 as 'uncovered — no discriminating test', even though the named test src.api.error-codes.test.ts::C-96e47324 was changed in place and passed. The traceability matrix did not count it as covering the criterion, suggesting the test may not assert the observable outcome (the exact 22-entry registry with statuses and messages) in a way the harness recognises as discriminating. This needs human review of whether the in-place change still asserts everything required.
- [minor, judge] Test title says '16 codes' but the test body checks 22 (criterion C-96e47324): The named test src.api.error-codes.test.ts::C-96e47324 keeps the title 'The registry holds exactly the 16 codes of the API with status and message' while its EXPECTED_CODES now contains 22 entries. The title is now factually wrong. The task (5.1) explicitly requires keeping the title ('its title stays as it is — a renamed test fails the attempt'), so this is a consequence of the task, not a defect the implementer introduced on its own. However, the mismatch is a documentation trap for future readers.
- [minor, judge] the judge called a test inadequate (criterion C-1801fd2c): src.identity.admin.review-profile.test.ts::C-1801fd2c The review profile refuses an unknown profile

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.admin-errors.test.ts::C-cc3ddc89 admin errors map to registered API codes` (task 5.1): passed
- `src.api.admin-errors.test.ts::C-e8ea1428 other errors pass through unchanged` (task 5.1): passed
- `src.api.admin-group-map.test.ts::C-09ace5ca group mapping is set replaced listed removed and tenant scoped` (task 6.4): passed
- `src.api.admin-group-map.test.ts::C-11a09b04 group mapping refusals keep the map empty` (task 6.4): passed
- `src.api.admin-page.test.ts::C-4c8964eb pageRows without an engine key serves one page and refuses a cursor` (task 5.2): passed
- `src.api.admin-page.test.ts::C-5995b318 pageRows cuts a whole list into ordered pages under cursors` (task 5.2): passed
- `src.api.admin-page.test.ts::C-5995b318 pageRows refuses a cursor position of another length` (task 5.2): passed
- `src.api.admin-policy.test.ts::C-8a23d872 the admin route table holds 19 session routes with their actions and codes` (task 6.5): passed
- `src.api.admin-policy.test.ts::C-a4888ef3 roles cedar permits only the tenant admin on the admin routes` (task 6.5): passed
- `src.api.admin-refusals.test.ts::C-777b5224 each refused admin change appends one change refused event` (task 6.6): passed
- `src.api.admin-refusals.test.ts::C-e4402b02 a failing refusal audit keeps the answer and logs the failure` (task 6.6): passed
- `src.api.admin-service-accounts.test.ts::C-50b6b834 service account role grants cannot exceed the caller` (task 6.2): passed
- `src.api.admin-service-accounts.test.ts::C-8087d00f service accounts are created listed owned and disabled` (task 6.2): passed
- `src.api.admin-service-accounts.test.ts::C-c102e454 service account roles are granted listed and revoked` (task 6.2): passed
- `src.api.admin-teams.test.ts::C-8b40a61c teams are created listed isolated mapped and deleted` (task 6.3): passed
- `src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging` (task 6.3): passed
- `src.api.admin-teams.test.ts::the roles list of each tenant holds the default roles` (task 6.3): passed
- `src.api.admin-tenant.test.ts::C-10655032 the review profile switches warns and stays audited through the server` (task 6.5): passed
- `src.api.admin-tenant.test.ts::C-1801fd2c the review profile route refuses a bad body and keeps the profile` (task 6.5): passed
- `src.api.admin-users.test.ts::C-32b7b36c users are listed paged filtered and read by id` (task 6.1): passed
- `src.api.admin-users.test.ts::C-802ffb44 idp links are listed and added idempotently` (task 6.1): passed
- `src.api.admin-users.test.ts::C-9733f98e users are disabled and enabled with suspended then restored sessions` (task 6.1): passed
- `src.api.admin-users.test.ts::C-a63083c0 idp link refusals link nothing` (task 6.1): passed
- `src.api.admin-users.test.ts::C-c6c6a2a5 accounts carry roles teams and local roles across states` (task 6.1): passed
- `src.identity.admin.accounts.test.ts::C-32b7b36c Accounts list and read` (task 2.1): passed
- `src.identity.admin.accounts.test.ts::C-8087d00f Service account provisioning and owners` (task 2.1): passed
- `src.identity.admin.accounts.test.ts::C-9733f98e Account state changes` (task 2.1): passed
- `src.identity.admin.accounts.test.ts::C-c6c6a2a5 Accounts hold roles teams and local roles` (task 2.1): passed
- `src.identity.admin.idp-links.test.ts::C-802ffb44 IdP links are listed and added` (task 3.1): passed
- `src.identity.admin.idp-links.test.ts::C-a63083c0 Concurrent identical IdP links resolve once` (task 3.1): passed
- `src.identity.admin.idp-links.test.ts::C-a63083c0 IdP links refuse held pairs and bad targets` (task 3.1): passed
- `src.identity.admin.review-profile.test.ts::C-10655032 The review profile switches, warns and stays audited` (task 4.1): passed
- `src.identity.admin.review-profile.test.ts::C-1801fd2c The review profile refuses an unknown profile` (task 4.1): passed
- `src.identity.admin.schema.test.ts::C-7a958882 Objects and privileges` (task 1.1): passed
- `src.main.admin.test.ts::C-ddb4acf0 the real engine serves the admin routes and the OpenAPI document` (task 7.1): passed
