# Verification: openspec:add-admin-api: NEEDS_HUMAN (round 3)

traceability: 28/29 criteria covered by a discriminating test

- Base: `fe00a46b4583a28db7cf546e0888a1b890a0bf4b`
- Head: `621c054f18d7874dbd74b360f7a508207cba58e2`
- Implementer profiles: glm, deepseek-free, claude-sonnet
- Judge: mimo-judge, 6 call(s), judged in 2 parts, prompt sha256 `635992a7c2b8fae92b9ae551b07c296440eb5518424a7bf6baf63cb3e77b24d4`
  - part 1: 14 file(s), 110544 characters, profile mimo-judge, reply valid
  - part 2: 11 file(s), 115070 characters, profile mimo-judge, reply repaired
- Judge replies of mimo-judge (this unit, all rounds): valid 4, repaired 1, retried 1, discarded 0; this round: -
- independence: declared (unverified): mimo-judge xiaomi (declared), glm zhipu (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@fe00a46b45 contained |
| 1 | integrity | ok | 228.7 | 11 sub-checks (+2 unfrozen by human answers); scope: 54 changed file(s) |
| 2 | build | ok | 25.2 |  |
| 3 | tests | ok | 109.6 |  |
| 4 | traceability | ok | 0.2 | 28/29 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/admin-errors.ts, src/api/admin-page.ts, src/api/admin-rbac.ts, src/api/admin-routes.ts, src/api/admin-service-accounts.ts and 10 more |
| 8 | s1 judge | ok | 2.2 | 28/29 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | failed | 2813.8 | timeout: no answer within 600s |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261031T0942Z-0b72/020-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261031T0942Z-0b72/021-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261031T0942Z-0b72/022-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261031T0942Z-0b72/023-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261031T0942Z-0b72/024-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261031T0942Z-0b72/025-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261031T0942Z-0b72/026-e2e.log |

## Files by part

- part 1: openspec/changes/add-admin-api-fix-1/.openspec.yaml (311 characters)
- part 1: src/db/migrations/0180_admin_api.sql (279 characters)
- part 1: src/identity/admin/accounts.test.ts (18123 characters)
- part 1: src/identity/admin/accounts.ts (9292 characters)
- part 1: src/api/admin-errors.test.ts (4434 characters)
- part 1: src/api/admin-errors.ts (2167 characters)
- part 1: src/api/admin-group-map.test.ts (11573 characters)
- part 1: src/api/admin-isolation.test.ts (9833 characters)
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
- part 3: openspec/changes/add-admin-api-fix-1/proposal.md (3041 characters)
- part 3: src/identity/admin/review-profile.test.ts (7138 characters)
- part 3: src/identity/admin/review-profile.ts (3347 characters)
- part 3: src/identity/admin/schema.test.ts (4180 characters)
- part 3: openspec/changes/add-admin-api-fix-1/tasks.md (371 characters)
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
| suppressions | skipped | not checked: python only; changed files outside it: src/api/admin-errors.test.ts, src/api/admin-errors.ts, src/api/admin-group-map.test.ts, src/api/admin-isolation.test.ts, src/api/admin-page.test.ts (+26 more) |
| tdd history | ok | 14 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 971 of 971 base tests pass on the unit's code with its 14 test and support files at the base (base: evidence) |

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
| C-a4888ef3 | admin-api › Every admin route is a session route under the right action › Who may call | covered | src.api.admin-policy.test.ts::C-a4888ef3 roles cedar permits only the tenant admin on the admin routes (passed, red_assertion) | - | 0.91 |
| C-598727de | admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant | covered | src.api.admin-isolation.test.ts::C-598727de tenant B admin cannot reach tenant A rows and a forged tenant is refused (passed, pre_satisfied) | - | 0.94 |
| C-cc3ddc89 | admin-api › Admin errors are registered codes › The mapping | covered | src.api.admin-errors.test.ts::C-cc3ddc89 admin errors map to registered API codes (passed, red_assertion) | - | 0.91 |
| C-e8ea1428 | admin-api › Admin errors are registered codes › Other errors pass through | covered | src.api.admin-errors.test.ts::C-e8ea1428 other errors pass through unchanged (passed, red_assertion) | - | 0.93 |
| C-7a958882 | admin-api › The app role may switch only its own tenant's review profile › Objects and privileges | covered | src.identity.admin.schema.test.ts::C-7a958882 Objects and privileges (passed, red_assertion) | - | 0.91 |
| C-32b7b36c | admin-api › Users are listed, read, disabled and enabled › List, page, filter, read | covered | src.api.admin-users.test.ts::C-32b7b36c users are listed paged filtered and read by id (passed, red_assertion); src.identity.admin.accounts.test.ts::C-32b7b36c Accounts list and read (passed, red_assertion) | - | 0.93 |
| C-c6c6a2a5 | admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts | covered | src.api.admin-users.test.ts::C-c6c6a2a5 accounts carry roles teams and local roles across states (passed, red_assertion); src.identity.admin.accounts.test.ts::C-c6c6a2a5 Accounts hold roles teams and local roles (passed, red_assertion) | - | 0.93 |
| C-9733f98e | admin-api › Users are listed, read, disabled and enabled › Disable and enable | covered | src.api.admin-users.test.ts::C-9733f98e users are disabled and enabled with suspended then restored sessions (passed, red_assertion); src.identity.admin.accounts.test.ts::C-9733f98e Account state changes (passed, red_assertion) | - | 0.90 |
| C-8087d00f | admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state | covered | src.api.admin-service-accounts.test.ts::C-8087d00f service accounts are created listed owned and disabled (passed, red_assertion); src.identity.admin.accounts.test.ts::C-8087d00f Service account provisioning and owners (passed, red_assertion) | - | 0.95 |
| C-c102e454 | admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account | covered | src.api.admin-service-accounts.test.ts::C-c102e454 service account roles are granted listed and revoked (passed, red_assertion) | - | 0.92 |
| C-50b6b834 | admin-api › Service accounts are created, listed, disabled and given roles › No elevation | covered | src.api.admin-service-accounts.test.ts::C-50b6b834 service account role grants cannot exceed the caller (passed, red_assertion) | - | 0.89 |
| C-8b40a61c | admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse | covered | src.api.admin-teams.test.ts::C-8b40a61c teams are created listed isolated mapped and deleted (passed, red_assertion) | - | 0.93 |
| C-09ace5ca | admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove | covered | src.api.admin-group-map.test.ts::C-09ace5ca group mapping is set replaced listed removed and tenant scoped (passed, red_assertion) | - | 0.95 |
| C-11a09b04 | admin-api › Group mappings are set, replaced, listed and removed › Refusals | covered | src.api.admin-group-map.test.ts::C-11a09b04 group mapping refusals keep the map empty (passed, red_assertion) | - | 0.92 |
| C-802ffb44 | admin-api › IdP links are listed and added › List and add | covered | src.api.admin-users.test.ts::C-802ffb44 idp links are listed and added idempotently (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-802ffb44 IdP links are listed and added (passed, red_assertion) | - | 0.94 |
| C-a63083c0 | admin-api › IdP links are listed and added › Refusals | covered | src.api.admin-users.test.ts::C-a63083c0 idp link refusals link nothing (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-a63083c0 Concurrent identical IdP links resolve once (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-a63083c0 IdP links refuse held pairs and bad t... | - | 0.92 |
| C-10655032 | admin-api › The review profile is switched, audited, with a solo warning › Switch and warning | covered | src.api.admin-tenant.test.ts::C-10655032 the review profile switches warns and stays audited through the server (passed, red_assertion); src.identity.admin.review-profile.test.ts::C-10655032 The review profile switches, warns and stays audited (passed, red_assertion) | - | 0.93 |
| C-1801fd2c | admin-api › The review profile is switched, audited, with a solo warning › Refusals | covered | src.api.admin-tenant.test.ts::C-1801fd2c the review profile route refuses a bad body and keeps the profile (passed, red_assertion); src.identity.admin.review-profile.test.ts::C-1801fd2c The review profile refuses an unknown profile (passed, red_assertion) | - | 0.93 |
| C-777b5224 | admin-api › A refused change is audited › Each refusal leaves one event | covered | src.api.admin-refusals.test.ts::C-777b5224 each refused admin change appends one change refused event (passed, red_assertion) | - | 0.86 |
| C-e4402b02 | admin-api › A refused change is audited › A failing audit changes nothing | covered | src.api.admin-refusals.test.ts::C-e4402b02 a failing refusal audit keeps the answer and logs the failure (passed, red_assertion) | - | 0.91 |
| C-5995b318 | admin-api › Lists page with the cursor contract › pageRows | covered | src.api.admin-page.test.ts::C-5995b318 pageRows cuts a whole list into ordered pages under cursors (passed, red_assertion); src.api.admin-page.test.ts::C-5995b318 pageRows refuses a cursor position of another length (passed, red_assertion); src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964... | - | 0.91 |
| C-4c8964eb | admin-api › Lists page with the cursor contract › Without an engine key | covered | src.api.admin-page.test.ts::C-4c8964eb pageRows without an engine key serves one page and refuses a cursor (passed, red_assertion); src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging (passed, red_assertion) | - | 0.92 |
| C-eec17a85 | admin-api › Lists page with the cursor contract › Through the server | covered | src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging (passed, red_assertion) | - | 0.92 |
| C-ddb4acf0 | admin-api › The engine serves the admin routes and documents them › The real engine | covered | src.main.admin.test.ts::C-ddb4acf0 the real engine serves the admin routes and the OpenAPI document (passed, red_assertion) | - | 0.93 |
| C-96e47324 | api-conventions › Every error code is registered › The registry | uncovered | - | src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record)) | - |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | covered | test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass) | - | 0.91 |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | covered | test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass) | - | 0.86 |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | covered | src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass) | - | 0.86 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0256Z-f813.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0339Z-c380.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0406Z-70cf.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0525Z-46b0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0527Z-4c9b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0740Z-aae9.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0855Z-e7d0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/.l4/ledger/r-20261031T0942Z-0b72.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-admin-api/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/admin-errors.test.ts` |  | relevant | new test file |
| `src/api/admin-errors.ts` | api | relevant | named in the spec |
| `src/api/admin-group-map.test.ts` |  | relevant | new test file |
| `src/api/admin-isolation.test.ts` |  | relevant | new test file |
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

1057 of 1057 passed, 0 failed, 0 errored, 0 skipped.
36 of 36 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-8a23d872 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4888ef3 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-598727de | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cc3ddc89 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e8ea1428 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7a958882 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-32b7b36c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c6c6a2a5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9733f98e | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8087d00f | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c102e454 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-50b6b834 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8b40a61c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-09ace5ca | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-11a09b04 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-802ffb44 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a63083c0 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-10655032 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1801fd2c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-777b5224 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e4402b02 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5995b318 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c8964eb | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eec17a85 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ddb4acf0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-96e47324 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-601275f9 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05ca73a7 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-541ef4f9 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-004 accept C-96e47324 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. The registry in src/api/error-codes.ts holds exactly the 22 entries of the scenario with the statuses and messages given, and the named test asserts the scenario in full: it compares the sorted key set of ERROR_CODES with its 22 expected keys, deep-compares status and mes...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-8a23d872 | admin-api › Every admin route is a session route under the right action › The route table | - | needs_human | the judge gave no verdict for this criterion |
| C-a4888ef3 | admin-api › Every admin route is a session route under the right action › Who may call | - | needs_human | the judge gave no verdict for this criterion |
| C-598727de | admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant | - | needs_human | the judge gave no verdict for this criterion |
| C-cc3ddc89 | admin-api › Admin errors are registered codes › The mapping | - | needs_human | the judge gave no verdict for this criterion |
| C-e8ea1428 | admin-api › Admin errors are registered codes › Other errors pass through | - | needs_human | the judge gave no verdict for this criterion |
| C-7a958882 | admin-api › The app role may switch only its own tenant's review profile › Objects and privileges | - | needs_human | the judge gave no verdict for this criterion |
| C-32b7b36c | admin-api › Users are listed, read, disabled and enabled › List, page, filter, read | - | needs_human | the judge gave no verdict for this criterion |
| C-c6c6a2a5 | admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts | - | needs_human | the judge gave no verdict for this criterion |
| C-9733f98e | admin-api › Users are listed, read, disabled and enabled › Disable and enable | - | needs_human | the judge gave no verdict for this criterion |
| C-8087d00f | admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state | - | needs_human | the judge gave no verdict for this criterion |
| C-c102e454 | admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account | - | needs_human | the judge gave no verdict for this criterion |
| C-50b6b834 | admin-api › Service accounts are created, listed, disabled and given roles › No elevation | - | needs_human | the judge gave no verdict for this criterion |
| C-8b40a61c | admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse | - | needs_human | the judge gave no verdict for this criterion |
| C-09ace5ca | admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove | - | needs_human | the judge gave no verdict for this criterion |
| C-11a09b04 | admin-api › Group mappings are set, replaced, listed and removed › Refusals | - | needs_human | the judge gave no verdict for this criterion |
| C-802ffb44 | admin-api › IdP links are listed and added › List and add | - | needs_human | the judge gave no verdict for this criterion |
| C-a63083c0 | admin-api › IdP links are listed and added › Refusals | - | needs_human | the judge gave no verdict for this criterion |
| C-10655032 | admin-api › The review profile is switched, audited, with a solo warning › Switch and warning | - | needs_human | the judge gave no verdict for this criterion |
| C-1801fd2c | admin-api › The review profile is switched, audited, with a solo warning › Refusals | - | needs_human | the judge gave no verdict for this criterion |
| C-777b5224 | admin-api › A refused change is audited › Each refusal leaves one event | - | needs_human | the judge gave no verdict for this criterion |
| C-e4402b02 | admin-api › A refused change is audited › A failing audit changes nothing | - | needs_human | the judge gave no verdict for this criterion |
| C-5995b318 | admin-api › Lists page with the cursor contract › pageRows | - | needs_human | the judge gave no verdict for this criterion |
| C-4c8964eb | admin-api › Lists page with the cursor contract › Without an engine key | - | needs_human | the judge gave no verdict for this criterion |
| C-eec17a85 | admin-api › Lists page with the cursor contract › Through the server | - | needs_human | the judge gave no verdict for this criterion |
| C-ddb4acf0 | admin-api › The engine serves the admin routes and documents them › The real engine | - | needs_human | the judge gave no verdict for this criterion |
| C-96e47324 | api-conventions › Every error code is registered › The registry | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied. The registry in src/api/error-codes.ts holds exactly the 22 entries of the scenario with the statuses and messages given, and the named test asserts the scenario in full: it compares the sorted key set of ERROR_... |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | - | needs_human | the judge gave no verdict for this criterion |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | - | needs_human | the judge gave no verdict for this criterion |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | - | needs_human | the judge gave no verdict for this criterion |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-96e47324): src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message: no proof that it discriminates (no red, audit or generated record)

## Needs a human

- the judge's reply was discarded (part 3 of 4, timeout: no answer within 600s)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.admin-errors.test.ts::C-cc3ddc89 admin errors map to registered API codes` (task 5.1): passed
- `src.api.admin-errors.test.ts::C-e8ea1428 other errors pass through unchanged` (task 5.1): passed
- `src.api.admin-group-map.test.ts::C-09ace5ca group mapping is set replaced listed removed and tenant scoped` (task 6.4): passed
- `src.api.admin-group-map.test.ts::C-11a09b04 group mapping refusals keep the map empty` (task 6.4): passed
- `src.api.admin-isolation.test.ts::C-598727de tenant B admin cannot reach tenant A rows and a forged tenant is refused` (task 1.1): passed
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
