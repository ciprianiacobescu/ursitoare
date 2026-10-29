# Verification: openspec:add-api-conventions: PASS (round 1)

traceability: 35/35 criteria covered by a discriminating test

- Base: `3133746b66faca2d9a7109a40791b750dc8d47bb`
- Head: `9dc0ac554de0436e381fd20894db0bc84fb8ef0e`
- Implementer profiles: glm, claude-sonnet, deepseek-free
- Judge: mimo-judge, 2 call(s), judged in 2 parts, prompt sha256 `f1c8725b5b5c3bf670a0ffaaa5383f4721882dd86c0ae8ef43ea20e0a909230b`
  - part 1: 20 file(s), 112187 characters, profile mimo-judge, reply valid
  - part 2: 6 file(s), 56090 characters, profile mimo-judge, reply repaired
- Judge replies of mimo-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): mimo-judge xiaomi (declared), glm zhipu (declared), claude-sonnet anthropic (tool), deepseek-free deepseek (declared)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base merged: main@3133746b66 as 9dc0ac554d (1 commit) |
| 1 | integrity | ok | 67.1 | 10 sub-checks (+2 unfrozen by human answers); scope: 30 changed file(s) |
| 2 | build | ok | 22.2 |  |
| 3 | tests | ok | 74.2 |  |
| 4 | traceability | ok | 0.1 | 35/35 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/cursor.ts, src/api/error-codes.ts, src/api/idempotency.ts, src/api/index.ts, src/api/openapi.ts and 5 more |
| 8 | s1 judge | ok | 3.5 | 35/35 criteria judged by jev |
| 9 | judge | ok | 857.0 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261029T1500Z-34ea/071-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261029T1500Z-34ea/072-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261029T1500Z-34ea/073-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261029T1500Z-34ea/074-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261029T1500Z-34ea/075-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261029T1500Z-34ea/076-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261029T1500Z-34ea/077-e2e.log |

## Files by part

- part 1: src/db/migrations/0140_idempotency.sql (1537 characters)
- part 1: src/api/cursor.test.ts (7883 characters)
- part 1: src/api/cursor.ts (6904 characters)
- part 1: src/api/error-codes.test.ts (3640 characters)
- part 1: src/api/error-codes.ts (2436 characters)
- part 1: test/arch/error-codes.test.ts (2949 characters)
- part 1: test/arch/error-codes.ts (2389 characters)
- part 1: src/api/idempotency.test.ts (21001 characters)
- part 1: src/api/idempotency.ts (9558 characters)
- part 1: src/api/idempotency-key.test.ts (5531 characters)
- part 1: src/api/idempotency-schema.test.ts (6221 characters)
- part 1: src/api/idempotent-response.test.ts (9818 characters)
- part 1: src/api/index.ts (1217 characters)
- part 1: src/main.conventions.test.ts (4242 characters)
- part 1: src/main.ts (674 characters)
- part 1: docs/api/openapi.json (6081 characters)
- part 1: src/api/openapi.test.ts (7679 characters)
- part 1: src/api/openapi.ts (7791 characters)
- part 1: test/support/openapi-docs.ts (2049 characters)
- part 1: src/api/openapi-route.test.ts (2587 characters)
- part 2: src/api/paginate.test.ts (6499 characters)
- part 2: src/api/pagination.test.ts (5101 characters)
- part 2: src/api/pagination.ts (4515 characters)
- part 2: openspec/changes/add-api-conventions/tasks.md (29302 characters)
- part 2: test/arch/web-routes.test.ts (5826 characters)
- part 2: test/arch/web-routes.ts (4847 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 12 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 12 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/cursor.test.ts, src/api/cursor.ts, src/api/error-codes.test.ts, src/api/error-codes.ts, src/api/idempotency-key.test.ts (+18 more) |
| tdd history | ok | 12 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 801 of 801 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/api/idempotency.test.ts kept at head for the run (task 3.3: unfrozen by Q-001, Q-002, Q-003)
- src/api/idempotent-response.test.ts kept at head for the run (task 3.4: unfrozen by Q-004)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/api/idempotency.test.ts (task 3.3, unfrozen by Q-001, Q-002, Q-003 (agent))
- src/api/idempotent-response.test.ts (task 3.4, unfrozen by Q-004 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | covered | src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (passed, red_assertion) | - | 0.90 |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | covered | test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, red_assertion) | - | 0.92 |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | covered | test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, red_assertion) | - | 0.88 |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | covered | src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, red_assertion) | - | 0.90 |
| C-84761431 | api-conventions › List queries accept limit and cursor › Defaults and bounds | covered | src.api.pagination.test.ts::C-84761431 readPage answers defaults and bounds of limit and cursor (passed, red_assertion) | - | 0.92 |
| C-63d6bb95 | api-conventions › List queries accept limit and cursor › Out-of-range values are refused | covered | src.api.pagination.test.ts::C-63d6bb95 readPage refuses out of range limit and cursor values (passed, red_assertion) | - | 0.93 |
| C-76c81a8c | api-conventions › List queries accept limit and cursor › Through the server | covered | src.api.pagination.test.ts::C-76c81a8c a route with the page query schema validates limit through the server (passed, red_assertion) | - | 0.88 |
| C-24ebf7a5 | api-conventions › Cursors are signed and bound to a tenant and a scope › Round trip and key derivation | covered | src.api.cursor.test.ts::C-24ebf7a5 Round trip and key derivation (passed, red_assertion) | - | 0.93 |
| C-d9720128 | api-conventions › Cursors are signed and bound to a tenant and a scope › Refused cursors | covered | src.api.cursor.test.ts::C-d9720128 Refused cursors (passed, red_assertion) | - | 0.90 |
| C-d8989560 | api-conventions › Cursors are signed and bound to a tenant and a scope › Key material and claims are checked | covered | src.api.cursor.test.ts::C-d8989560 Key material and claims are checked (passed, red_assertion) | - | 0.88 |
| C-d23cc66e | api-conventions › Lists answer items and next_cursor › More rows than the limit | covered | src.api.paginate.test.ts::C-d23cc66e paginate answers items and next_cursor when rows exceed the limit (passed, red_assertion) | - | 0.91 |
| C-8d062a2a | api-conventions › Lists answer items and next_cursor › A full walk, the last page and an empty list | covered | src.api.paginate.test.ts::C-8d062a2a a full walk of seven rows, a full page and an empty list (passed, red_assertion) | - | 0.93 |
| C-65f1b9ae | api-conventions › Lists answer items and next_cursor › Bad limit and foreign cursor | covered | src.api.paginate.test.ts::C-65f1b9ae a bad limit and a foreign cursor are refused (passed, red_assertion) | - | 0.91 |
| C-4c925b2a | api-conventions › The Idempotency-Key header has one format › Valid, absent and invalid keys | covered | src.api.idempotency-key.test.ts::C-4c925b2a idempotencyKeyOf returns valid keys, null when absent and refuses the rest (passed, red_assertion) | - | 0.94 |
| C-71f81f3b | api-conventions › The Idempotency-Key header has one format › The header schema | covered | src.api.idempotency-key.test.ts::C-71f81f3b a route with the header schema refuses an invalid key (passed, red_assertion) | - | 0.84 |
| C-40ba5812 | api-conventions › The Idempotency-Key header has one format › The request digest | covered | src.api.idempotency-key.test.ts::C-40ba5812 requestDigestOf is stable over key order and differs per part (passed, red_assertion) | - | 0.91 |
| C-7dead04d | api-conventions › The idempotency table is tenant-isolated › Shape | covered | src.api.idempotency-schema.test.ts::C-7dead04d Shape of the idempotency key table (passed, red_assertion) | - | 0.87 |
| C-0740c1df | api-conventions › The idempotency table is tenant-isolated › Two tenants | covered | src.api.idempotency-schema.test.ts::C-0740c1df Tenant B cannot see or change the keys of tenant A (passed, red_assertion) | - | 0.94 |
| C-6c605e1b | api-conventions › The idempotency table is tenant-isolated › Bad rows | covered | src.api.idempotency-schema.test.ts::C-6c605e1b Each bad row fails with 23514 (passed, red_assertion) | - | 0.91 |
| C-dfb7543e | api-conventions › A repeated request replays its stored response › First call and repeat | covered | src.api.idempotency.test.ts::C-dfb7543e withIdempotency stores the response once and replays it (passed, red_assertion) | - | 0.95 |
| C-ea12d606 | api-conventions › A repeated request replays its stored response › Atomic with the handler's writes | covered | src.api.idempotency.test.ts::C-ea12d606 a failing handler leaves no key row and no probe write (passed, red_assertion) | - | 0.73 |
| C-427cffa0 | api-conventions › A repeated request replays its stored response › Another digest, principal or tenant | covered | src.api.idempotency.test.ts::C-427cffa0 another digest principal or tenant does not replay (passed, red_assertion) | - | 0.90 |
| C-11109967 | api-conventions › A repeated request replays its stored response › Bad arguments | covered | src.api.idempotency.test.ts::C-11109967 bad arguments reject before any query (passed, red_assertion) | - | 0.92 |
| C-8b888cf1 | api-conventions › An unfinished, failed or expired key does not replay › In progress | covered | src.api.idempotency.test.ts::C-8b888cf1 a repeated call while the first is in progress refuses (passed, red_assertion) | - | 0.74 |
| C-92caebe6 | api-conventions › An unfinished, failed or expired key does not replay › A failed attempt releases the key | covered | src.api.idempotency.test.ts::C-92caebe6 a failed attempt releases the key (passed, red_assertion) | - | 0.81 |
| C-be1f9144 | api-conventions › An unfinished, failed or expired key does not replay › Keys expire after 24 hours | covered | src.api.idempotency.test.ts::C-be1f9144 a key that has expired does not replay (passed, red_assertion) | - | 0.81 |
| C-e03cac86 | api-conventions › An idempotent response marks a replay › Create twice | covered | src.api.idempotent-response.test.ts::C-e03cac86 a repeated create through the route replays and a changed body is refused (passed, red_assertion) | - | 0.93 |
| C-5d258a1a | api-conventions › An idempotent response marks a replay › Invalid key, in progress and no principal | covered | src.api.idempotent-response.test.ts::C-5d258a1a an invalid key a blocked key and a missing principal each refuse (passed, red_assertion) | - | 0.89 |
| C-3d3fc761 | api-conventions › An OpenAPI document is generated from the route definitions › Document from definitions | covered | src.api.openapi.test.ts::C-3d3fc761 buildOpenApiDocument describes a public route from its definition (passed, red_assertion) | - | 0.88 |
| C-ed1b0009 | api-conventions › An OpenAPI document is generated from the route definitions › Canonical text | covered | src.api.openapi.test.ts::C-ed1b0009 renderOpenApi is canonical text independent of key order (passed, red_assertion) | - | 0.91 |
| C-dea08a52 | api-conventions › An OpenAPI document is generated from the route definitions › Served by the engine | covered | src.api.openapi-route.test.ts::C-dea08a52 the served OpenAPI document is built from the engine's defined routes (passed, red_assertion) | - | 0.94 |
| C-d150bfa4 | api-conventions › An OpenAPI document is generated from the route definitions › The real engine | covered | src.main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves (passed, red_assertion); src.main.conventions.test.ts::C-d150bfa4 the real engine serves the OpenAPI document of its defined routes (passed, red_assertion) | - | 0.94 |
| C-c2ccaff5 | api-conventions › Web pages never shadow API paths › Reserved paths | covered | test.arch.web-routes.test.ts::C-c2ccaff5 isReservedPath refuses every API and service root (passed, red_assertion) | - | 0.80 |
| C-b5956c2d | api-conventions › Web pages never shadow API paths › Feature paths | covered | test.arch.web-routes.test.ts::C-b5956c2d checkFeaturePaths reads feature paths and reserves the service roots (passed, red_assertion) | - | 0.91 |
| C-79dbbb47 | api-conventions › Web pages never shadow API paths › API routes | covered | test.arch.web-routes.test.ts::C-79dbbb47 routesOutsideReservedRoots lists only public routes outside the roots (passed, red_assertion) | - | 0.90 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-conventions/.l4/ledger/r-20261029T1219Z-7db8.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-conventions/.l4/ledger/r-20261029T1412Z-bf29.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-conventions/.l4/ledger/r-20261029T1500Z-34ea.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-conventions/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-api-conventions/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/cursor.test.ts` |  | relevant | new test file |
| `src/api/cursor.ts` | api | relevant | named in the spec |
| `src/api/error-codes.test.ts` |  | relevant | new test file |
| `src/api/error-codes.ts` | api | relevant | named in the spec |
| `src/api/idempotency-key.test.ts` |  | relevant | new test file |
| `src/api/idempotency-schema.test.ts` |  | relevant | new test file |
| `src/api/idempotency.test.ts` |  | relevant | new test file |
| `src/api/idempotency.ts` | api | relevant | named in the spec |
| `src/api/idempotent-response.test.ts` |  | relevant | new test file |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/openapi-route.test.ts` |  | relevant | new test file |
| `src/api/openapi.test.ts` |  | relevant | new test file |
| `src/api/openapi.ts` | api | relevant | named in the spec |
| `src/api/paginate.test.ts` |  | relevant | new test file |
| `src/api/pagination.test.ts` |  | relevant | new test file |
| `src/api/pagination.ts` | api | relevant | named in the spec |
| `src/db/migrations/0140_idempotency.sql` | db | relevant | named in the spec |
| `src/main.conventions.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `test/arch/error-codes.test.ts` |  | relevant | new test file |
| `test/arch/error-codes.ts` | test | relevant | named in the spec |
| `test/arch/web-routes.test.ts` |  | relevant | new test file |
| `test/arch/web-routes.ts` | test | relevant | named in the spec |
| `test/support/openapi-docs.ts` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/cursor.ts, src/api/error-codes.ts, src/api/idempotency.ts, src/api/index.ts, src/api/openapi.ts and 5 more

### Tests

854 of 854 passed, 0 failed, 0 errored, 0 skipped.
36 of 36 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-96e47324 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-601275f9 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05ca73a7 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-541ef4f9 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-84761431 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63d6bb95 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76c81a8c | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-24ebf7a5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9720128 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d8989560 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d23cc66e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8d062a2a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-65f1b9ae | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c925b2a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-71f81f3b | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-40ba5812 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7dead04d | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0740c1df | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6c605e1b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dfb7543e | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ea12d606 | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-427cffa0 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-11109967 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8b888cf1 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92caebe6 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-be1f9144 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e03cac86 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d258a1a | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d3fc761 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ed1b0009 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dea08a52 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d150bfa4 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c2ccaff5 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b5956c2d | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79dbbb47 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-96e47324 | api-conventions › Every error code is registered › The registry | pass | pass | the judge passed it and a discriminating test passes |
| C-601275f9 | api-conventions › Every error code is registered › An unregistered literal code fails the scan | pass | pass | the judge passed it and a discriminating test passes |
| C-05ca73a7 | api-conventions › Every error code is registered › Registered, dynamic and test uses pass | pass | pass | the judge passed it and a discriminating test passes |
| C-541ef4f9 | api-conventions › Every error code is registered › Route errors | pass | pass | the judge passed it and a discriminating test passes |
| C-84761431 | api-conventions › List queries accept limit and cursor › Defaults and bounds | pass | pass | the judge passed it and a discriminating test passes |
| C-63d6bb95 | api-conventions › List queries accept limit and cursor › Out-of-range values are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-76c81a8c | api-conventions › List queries accept limit and cursor › Through the server | pass | pass | the judge passed it and a discriminating test passes |
| C-24ebf7a5 | api-conventions › Cursors are signed and bound to a tenant and a scope › Round trip and key derivation | pass | pass | the judge passed it and a discriminating test passes |
| C-d9720128 | api-conventions › Cursors are signed and bound to a tenant and a scope › Refused cursors | pass | pass | the judge passed it and a discriminating test passes |
| C-d8989560 | api-conventions › Cursors are signed and bound to a tenant and a scope › Key material and claims are checked | pass | pass | the judge passed it and a discriminating test passes |
| C-d23cc66e | api-conventions › Lists answer items and next_cursor › More rows than the limit | pass | pass | the judge passed it and a discriminating test passes |
| C-8d062a2a | api-conventions › Lists answer items and next_cursor › A full walk, the last page and an empty list | pass | pass | the judge passed it and a discriminating test passes |
| C-65f1b9ae | api-conventions › Lists answer items and next_cursor › Bad limit and foreign cursor | pass | pass | the judge passed it and a discriminating test passes |
| C-4c925b2a | api-conventions › The Idempotency-Key header has one format › Valid, absent and invalid keys | pass | pass | the judge passed it and a discriminating test passes |
| C-71f81f3b | api-conventions › The Idempotency-Key header has one format › The header schema | pass | pass | the judge passed it and a discriminating test passes |
| C-40ba5812 | api-conventions › The Idempotency-Key header has one format › The request digest | pass | pass | the judge passed it and a discriminating test passes |
| C-7dead04d | api-conventions › The idempotency table is tenant-isolated › Shape | pass | pass | the judge passed it and a discriminating test passes |
| C-0740c1df | api-conventions › The idempotency table is tenant-isolated › Two tenants | pass | pass | the judge passed it and a discriminating test passes |
| C-6c605e1b | api-conventions › The idempotency table is tenant-isolated › Bad rows | pass | pass | the judge passed it and a discriminating test passes |
| C-dfb7543e | api-conventions › A repeated request replays its stored response › First call and repeat | pass | pass | the judge passed it and a discriminating test passes |
| C-ea12d606 | api-conventions › A repeated request replays its stored response › Atomic with the handler's writes | pass | pass | the judge passed it and a discriminating test passes |
| C-427cffa0 | api-conventions › A repeated request replays its stored response › Another digest, principal or tenant | pass | pass | the judge passed it and a discriminating test passes |
| C-11109967 | api-conventions › A repeated request replays its stored response › Bad arguments | pass | pass | the judge passed it and a discriminating test passes |
| C-8b888cf1 | api-conventions › An unfinished, failed or expired key does not replay › In progress | pass | pass | the judge passed it and a discriminating test passes |
| C-92caebe6 | api-conventions › An unfinished, failed or expired key does not replay › A failed attempt releases the key | pass | pass | the judge passed it and a discriminating test passes |
| C-be1f9144 | api-conventions › An unfinished, failed or expired key does not replay › Keys expire after 24 hours | pass | pass | the judge passed it and a discriminating test passes |
| C-e03cac86 | api-conventions › An idempotent response marks a replay › Create twice | pass | pass | the judge passed it and a discriminating test passes |
| C-5d258a1a | api-conventions › An idempotent response marks a replay › Invalid key, in progress and no principal | pass | pass | the judge passed it and a discriminating test passes |
| C-3d3fc761 | api-conventions › An OpenAPI document is generated from the route definitions › Document from definitions | pass | pass | the judge passed it and a discriminating test passes |
| C-ed1b0009 | api-conventions › An OpenAPI document is generated from the route definitions › Canonical text | pass | pass | the judge passed it and a discriminating test passes |
| C-dea08a52 | api-conventions › An OpenAPI document is generated from the route definitions › Served by the engine | pass | pass | the judge passed it and a discriminating test passes |
| C-d150bfa4 | api-conventions › An OpenAPI document is generated from the route definitions › The real engine | pass | pass | the judge passed it and a discriminating test passes |
| C-c2ccaff5 | api-conventions › Web pages never shadow API paths › Reserved paths | pass | pass | the judge passed it and a discriminating test passes |
| C-b5956c2d | api-conventions › Web pages never shadow API paths › Feature paths | pass | pass | the judge passed it and a discriminating test passes |
| C-79dbbb47 | api-conventions › Web pages never shadow API paths › API routes | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] operationId is not unique across routes whose urls differ only in separators (spec gap) (criterion C-3d3fc761): operationIdOf collapses every run of non-alphanumerics into a single underscore, so two public routes such as GET /api/v1/a-b and GET /api/v1/a/b both get operationId get_api_v1_a_b. No criterion pins the behaviour for colliding urls and OpenAPI expects unique operationIds.
- [minor, judge] Same-digest call on an expired done key reruns fn instead of replaying (spec gap) (criterion C-be1f9144): The claim replaces any row whose created_at is at or before the cutoff regardless of digest, so calling again after 24 hours with the same digest runs fn again (replayed false) rather than replaying the stored response. The expiry scenario only pins the different-digest case.
- [minor, judge] Undefined body behaves differently with and without Idempotency-Key (spec gap) (criterion C-e03cac86): respondIdempotent's no-key path passes fn's body straight to reply.send, so a body of undefined produces an empty-bodied answer with fn's status, while the same fn under a key makes JSON.stringify return a non-string and rejects with TypeError (500). No scenario covers an undefined body without a key.
- [minor, judge] Implemented files keep the scaffold's "not implemented" banner: src/api/idempotency.ts and src/api/index.ts still open with the milestone scaffold comment saying the owning change implements the file, while src/api/cursor.ts, src/api/error-codes.ts and src/api/openapi.ts had theirs removed. The banner is now false and inconsistent across the unit.
- [minor, judge] readPage accepts leading-zero limit strings (spec gap) (criterion C-84761431): No scenario pins down a limit string with leading zeros such as "001" or "01". Two reasonable implementations differ: accept any digit string that parses into 1..200 (what the committed code does) or refuse non-canonical decimal forms. The committed LIMIT_STRING_PATTERN /^[0-9]{1,3}$/ accepts them and Number() parses "001" to 1.
- [minor, judge] readPage treats a non-object query as empty (spec gap) (criterion C-84761431): No scenario pins down readPage(null) or a non-object query. Two reasonable implementations differ: return the defaults (what the committed asRecord + undefined path does) or throw VALIDATION_FAILED.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.cursor.test.ts::C-24ebf7a5 Round trip and key derivation` (task 2.1): passed
- `src.api.cursor.test.ts::C-d8989560 Key material and claims are checked` (task 2.1): passed
- `src.api.cursor.test.ts::C-d9720128 Refused cursors` (task 2.1): passed
- `src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered` (task 1.1): passed
- `src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message` (task 1.1): passed
- `src.api.idempotency-key.test.ts::C-40ba5812 requestDigestOf is stable over key order and differs per part` (task 3.2): passed
- `src.api.idempotency-key.test.ts::C-4c925b2a idempotencyKeyOf returns valid keys, null when absent and refuses the rest` (task 3.2): passed
- `src.api.idempotency-key.test.ts::C-71f81f3b a route with the header schema refuses an invalid key` (task 3.2): passed
- `src.api.idempotency-schema.test.ts::C-0740c1df Tenant B cannot see or change the keys of tenant A` (task 3.1): passed
- `src.api.idempotency-schema.test.ts::C-6c605e1b Each bad row fails with 23514` (task 3.1): passed
- `src.api.idempotency-schema.test.ts::C-7dead04d Shape of the idempotency key table` (task 3.1): passed
- `src.api.idempotency.test.ts::C-11109967 bad arguments reject before any query` (task 3.3): passed
- `src.api.idempotency.test.ts::C-427cffa0 another digest principal or tenant does not replay` (task 3.3): passed
- `src.api.idempotency.test.ts::C-8b888cf1 a repeated call while the first is in progress refuses` (task 3.3): passed
- `src.api.idempotency.test.ts::C-92caebe6 a failed attempt releases the key` (task 3.3): passed
- `src.api.idempotency.test.ts::C-be1f9144 a key that has expired does not replay` (task 3.3): passed
- `src.api.idempotency.test.ts::C-dfb7543e withIdempotency stores the response once and replays it` (task 3.3): passed
- `src.api.idempotency.test.ts::C-ea12d606 a failing handler leaves no key row and no probe write` (task 3.3): passed
- `src.api.idempotent-response.test.ts::C-5d258a1a an invalid key a blocked key and a missing principal each refuse` (task 3.4): passed
- `src.api.idempotent-response.test.ts::C-e03cac86 a repeated create through the route replays and a changed body is refused` (task 3.4): passed
- `src.api.openapi-route.test.ts::C-dea08a52 the served OpenAPI document is built from the engine's defined routes` (task 5.2): passed
- `src.api.openapi.test.ts::C-3d3fc761 buildOpenApiDocument describes a public route from its definition` (task 5.1): passed
- `src.api.openapi.test.ts::C-ed1b0009 renderOpenApi is canonical text independent of key order` (task 5.1): passed
- `src.api.paginate.test.ts::C-65f1b9ae a bad limit and a foreign cursor are refused` (task 2.3): passed
- `src.api.paginate.test.ts::C-8d062a2a a full walk of seven rows, a full page and an empty list` (task 2.3): passed
- `src.api.paginate.test.ts::C-d23cc66e paginate answers items and next_cursor when rows exceed the limit` (task 2.3): passed
- `src.api.pagination.test.ts::C-63d6bb95 readPage refuses out of range limit and cursor values` (task 2.2): passed
- `src.api.pagination.test.ts::C-76c81a8c a route with the page query schema validates limit through the server` (task 2.2): passed
- `src.api.pagination.test.ts::C-84761431 readPage answers defaults and bounds of limit and cursor` (task 2.2): passed
- `src.main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves` (task 5.2): passed
- `src.main.conventions.test.ts::C-d150bfa4 the real engine serves the OpenAPI document of its defined routes` (task 5.2): passed
- `test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan` (task 1.2): passed
- `test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan` (task 1.2): passed
- `test.arch.web-routes.test.ts::C-79dbbb47 routesOutsideReservedRoots lists only public routes outside the roots` (task 4.1): passed
- `test.arch.web-routes.test.ts::C-b5956c2d checkFeaturePaths reads feature paths and reserves the service roots` (task 4.1): passed
- `test.arch.web-routes.test.ts::C-c2ccaff5 isReservedPath refuses every API and service root` (task 4.1): passed
