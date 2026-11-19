# Verification: openspec:add-people-lookup: NEEDS_HUMAN (round 1)

traceability: 12/12 criteria covered by a discriminating test

- Base: `3c5e366929a5a2b0b477331d586d1ff51e8db458`
- Head: `75d0a0c043367ca319362de55d6fd2121ad2ab04`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `509041e5ab424f5e863d050462d9638dad7b70ed9987426a20319d7220d19362`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@3c5e366929 contained |
| 1 | integrity | ok | 752.5 | 11 sub-checks; scope: 18 changed file(s) |
| 2 | build | ok | 31.3 |  |
| 3 | tests | ok | 367.7 |  |
| 4 | traceability | ok | 0.2 | 12/12 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | ok | 1013.1 | 2 fails_at_head, 8 not_testable, 2 writer_failed |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/people-routes.ts, src/identity/index.ts, src/identity/users.ts, src/main.ts and 2 more |
| 8 | s1 judge | ok | 0.6 | 10/12 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 151.9 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261118T2348Z-6bec/027-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261118T2348Z-6bec/028-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261118T2348Z-6bec/029-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261118T2348Z-6bec/030-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261118T2348Z-6bec/031-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261118T2348Z-6bec/032-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261118T2348Z-6bec/033-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 6 task(s): red and green compared |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/index.ts, src/api/me-teams.test.ts, src/api/people-openapi.test.ts, src/api/people-routes.test.ts, src/api/people-routes.ts (+9 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2508 of 2508 base tests pass on the unit's code with its 7 test and support files at the base (base: base worktree) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-748ce889 | people-directory › Names are read for the context's tenant only, after the input is checked › Names come back in first-appearance order, once, with unknown ids left out | covered | src.identity.person-names.test.ts::C-748ce889 names come back in first-appearance order once with unknown ids left out (passed, red_assertion) | - | 0.90 | - |
| C-55e76eb6 | people-directory › Names are read for the context's tenant only, after the input is checked › Another tenant's users are never named | covered | src.identity.person-names.test.ts::C-55e76eb6 another tenant's users are never named (passed, red_assertion) | - | 0.91 | - |
| C-db4fc15e | people-directory › Names are read for the context's tenant only, after the input is checked › Bad input is refused before any query and a failing database is not hidden | covered | src.identity.person-names.test.ts::C-db4fc15e bad input is refused before any query and a failing database is not hidden (passed, red_assertion) | - | 0.95 | - |
| C-57481c19 | people-directory › GET /api/v1/people answers display names under read_self and nothing else › A member reads the names of the ids it holds | covered | src.api.people-routes.test.ts::C-57481c19 a member reads the names of the ids it holds (passed, red_assertion) | - | 0.87 | - |
| C-59f63ed0 | people-directory › GET /api/v1/people answers display names under read_self and nothing else › A member of tenant B gets nothing for tenant A's ids | covered | src.api.people-routes.test.ts::C-59f63ed0 a member of tenant B gets nothing for tenant A's ids (passed, red_assertion) | - | 0.86 | `e2e/test_l4_c_59f63ed0.py`, `test-results/test-l4-c-59f63ed0-py-test-tenant-b-gets-nothing-for-tenant-a-ids-chromium/test-failed-1.png`, `test-results/test-l4-c-59f63ed0-py-test-tenant-b-gets-nothing-for-tenant-a-ids-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-1c488737 | people-directory › The people route bounds the ids and the size of its answer › Refusals, the limit and the largest answer | covered | src.api.people-routes.test.ts::C-1c488737 the people route refuses bad ids, accepts the limit and bounds the largest answer (passed, red_assertion) | - | 0.95 | `e2e/test_l4_c_1c488737.py`, `.l4-out/e2e/page.html` |
| C-a68cc186 | people-directory › Both routes refuse a caller who is not signed in or not active, and exist without a database › Missing session, disabled caller, HEAD and no database | covered | src.api.me-teams.test.ts::C-a68cc186 missing session, disabled caller, HEAD and no database (passed, red_assertion) | - | 0.92 | - |
| C-64158aad | people-directory › GET /api/v1/me/teams answers the caller's own teams and /me keeps its shape › Teams of alice, bob and mallory and the unchanged /me | covered | src.api.me-teams.test.ts::C-64158aad teams of alice, bob and mallory and the unchanged /me (passed, red_assertion) | - | 0.95 | `e2e/test_l4_c_64158aad.py`, `test-results/test-l4-c-64158aad-py-test-teams-of-alice-bob-mallory-and-unchanged-me-chromium/test-failed-1.png`, `test-results/test-l4-c-64158aad-py-test-teams-of-alice-bob-mallory-and-unchanged-me-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-fb2cd0d1 | people-directory › The committed OpenAPI document describes both routes › The document lists the two routes | covered | src.api.people-openapi.test.ts::C-fb2cd0d1 the committed OpenAPI document describes both people routes (passed, red_assertion) | - | 0.90 | `e2e/test_l4_c_fb2cd0d1.py`, `.l4-out/e2e/page.html` |
| C-20c4fd10 | people-directory › Answers are parsed without being stricter than the engine, and a name falls back to the id › Parsers, labels and the teams loader | covered | web.src.people.people.test.ts::C-20c4fd10 loadMyTeams answers empty for every failure (passed, red_assertion); web.src.people.people.test.ts::C-20c4fd10 loadMyTeams asks me teams and returns their ids (passed, red_assertion); web.src.people.people.test.ts::C-20c4fd10 loadMyTeams rejects an abort wit... | - | - | `e2e/test_l4_c_20c4fd10.py`, `.l4-out/e2e/page.html` |
| C-674bb9f6 | people-directory › The name cache batches, remembers and shares requests, and a failed lookup never ends the session › Batches, memory, invalid ids and shared requests | covered | web.src.people.name-cache.test.ts::C-674bb9f6 concurrent resolves share a request and wait for it (passed, red_assertion); web.src.people.name-cache.test.ts::C-674bb9f6 maxBatch splits the ids and passes the signal along (passed, red_assertion); web.src.people.name-cache.test.ts::C-674bb9f6 the cach... | - | 0.95 | - |
| C-929a4c25 | people-directory › The name cache batches, remembers and shares requests, and a failed lookup never ends the session › Failures are forgotten and aborts reject | covered | web.src.people.name-cache.test.ts::C-929a4c25 a failed batch is forgotten and asked again (passed, red_assertion); web.src.people.name-cache.test.ts::C-929a4c25 aborts reject with AbortError and remember nothing (passed, red_assertion); web.src.people.name-cache.test.ts::C-929a4c25 only a failed bat... | - | - | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-people-lookup/.l4/ledger/r-20261118T2122Z-44a0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-people-lookup/.l4/ledger/r-20261118T2348Z-6bec.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-people-lookup/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/api/me-teams.test.ts` |  | relevant | new test file |
| `src/api/people-openapi.test.ts` |  | relevant | new test file |
| `src/api/people-routes.test.ts` |  | relevant | new test file |
| `src/api/people-routes.ts` | api | relevant | named in the spec |
| `src/identity/index.ts` | identity | relevant | named in the spec |
| `src/identity/person-names.test.ts` |  | relevant | new test file |
| `src/identity/users.ts` | identity | relevant | named in the spec |
| `src/main.conventions.test.ts` |  | relevant | named in the spec |
| `src/main.ts` | main | relevant | named in the spec |
| `web/src/people/name-cache.test.ts` |  | relevant | new test file |
| `web/src/people/people.test.ts` |  | relevant | new test file |
| `web/src/people/people.ts` | web | relevant | named in the spec |
| `web/src/people/use-names.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/index.ts, src/api/people-routes.ts, src/identity/index.ts, src/identity/users.ts, src/main.ts and 2 more

### Tests

2604 of 2604 passed, 0 failed, 0 errored, 0 skipped.
25 of 25 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-748ce889 | not_testable | - | - | - | 1 | getPersonNames is an internal function called with explicit id lists inside a tenant transaction; the page snapshot exposes no people-directory UI, route, or input to trigger or observe that behavior through the page fixture. | - |
| C-55e76eb6 | not_testable | - | - | - | 1 | The criterion covers backend-only behavior (getPersonNames tenant-B transactions, IdentityError IDENTITY_TENANT_MISMATCH, bare SQL row-level security against ursitoare."user") with no UI surface or page fixture to exercise it. | - |
| C-db4fc15e | not_testable | - | - | - | 1 | getPersonNames is a server-side function over recording transactions and database queries; the page snapshot exposes no people-directory UI, so pytest-playwright cannot drive tenant checks, query counts, or IdentityError rejections through the browser. | - |
| C-57481c19 | not_testable | - | - | - | 1 | The criterion requires database assertions (exactly one policy_decision row with read_self/allow and unchanged audit_event count) that are not observable through the page fixture or the GET /api/v1/people public interface. | - |
| C-59f63ed0 | fails_at_head | e2e/test_l4_c_59f63ed0.py | fail | fail | 2 | the test fails at the head: test_l4_c_59f63ed0::test_tenant_b_gets_nothing_for_tenant_a_ids[chromium] | test-results/test-l4-c-59f63ed0-py-test-tenant-b-gets-nothing-for-tenant-a-ids-chromium/test-failed-1.png, test-results/test-l4-c-59f63ed0-py-test-tenant-b-gets-nothing-for-tenant-a-ids-chromium/trace.zip |
| C-1c488737 | writer_failed | e2e/test_l4_c_1c488737.py | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |
| C-a68cc186 | not_testable | - | - | - | 1 | Requires direct backend calls (registerPeopleRoutes with null pool/engine, listDefinedRoutes) and database state (bob disabled) that are not reachable via the page fixture over HTTP. | - |
| C-64158aad | fails_at_head | e2e/test_l4_c_64158aad.py | fail | fail | 2 | the test fails at the head: test_l4_c_64158aad::test_teams_of_alice_bob_mallory_and_unchanged_me[chromium] | test-results/test-l4-c-64158aad-py-test-teams-of-alice-bob-mallory-and-unchanged-me-chromium/test-failed-1.png, test-results/test-l4-c-64158aad-py-test-teams-of-alice-bob-mallory-and-unchanged-me-chromium/trace.zip |
| C-fb2cd0d1 | writer_failed | e2e/test_l4_c_fb2cd0d1.py | - | - | 2 | structured output missing: the reply holds no JSON object | - |
| C-20c4fd10 | not_testable | e2e/test_l4_c_20c4fd10.py | - | - | 2 | The criterion covers module-level functions parsePeople, parseMyTeams, personLabel and loadMyTeams, none of which are exposed through any UI page or HTTP endpoint observable from a browser; the page snapshot shows an empty app shell with no people-directory surface, so an e2e test at L4_E2E_BASE_URL... | - |
| C-674bb9f6 | not_testable | - | - | - | 1 | The criterion covers internal NameCache behavior (batching into 50/10, maxBatch, AbortSignal, peek, dedup, concurrent request sharing) that is not exposed through any people-directory UI or user-observable action; the page shows only an empty app root, so a user cannot trigger or observe name-cache ... | - |
| C-929a4c25 | not_testable | - | - | - | 1 | The criterion checks JavaScript module internals (nameCache.resolve/loadMyTeams results and request counts) and source-file contents of people.ts and use-names.ts, which are not observable through a browser page and cannot be verified by reading the server filesystem from a single-origin page-fixtur... | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-748ce889 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-55e76eb6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-db4fc15e | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-57481c19 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-59f63ed0 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1c488737 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a68cc186 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-64158aad | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb2cd0d1 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-20c4fd10 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-674bb9f6 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-929a4c25 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-748ce889 | people-directory › Names are read for the context's tenant only, after the input is checked › Names come back in first-appearance order, once, with unknown ids left out | pass | pass | the judge passed it and a discriminating test passes |
| C-55e76eb6 | people-directory › Names are read for the context's tenant only, after the input is checked › Another tenant's users are never named | pass | pass | the judge passed it and a discriminating test passes |
| C-db4fc15e | people-directory › Names are read for the context's tenant only, after the input is checked › Bad input is refused before any query and a failing database is not hidden | pass | pass | the judge passed it and a discriminating test passes |
| C-57481c19 | people-directory › GET /api/v1/people answers display names under read_self and nothing else › A member reads the names of the ids it holds | pass | pass | the judge passed it and a discriminating test passes |
| C-59f63ed0 | people-directory › GET /api/v1/people answers display names under read_self and nothing else › A member of tenant B gets nothing for tenant A's ids | pass | pass | the judge passed it and a discriminating test passes |
| C-1c488737 | people-directory › The people route bounds the ids and the size of its answer › Refusals, the limit and the largest answer | pass | pass | the judge passed it and a discriminating test passes |
| C-a68cc186 | people-directory › Both routes refuse a caller who is not signed in or not active, and exist without a database › Missing session, disabled caller, HEAD and no database | pass | pass | the judge passed it and a discriminating test passes |
| C-64158aad | people-directory › GET /api/v1/me/teams answers the caller's own teams and /me keeps its shape › Teams of alice, bob and mallory and the unchanged /me | pass | pass | the judge passed it and a discriminating test passes |
| C-fb2cd0d1 | people-directory › The committed OpenAPI document describes both routes › The document lists the two routes | pass | pass | the judge passed it and a discriminating test passes |
| C-20c4fd10 | people-directory › Answers are parsed without being stricter than the engine, and a name falls back to the id › Parsers, labels and the teams loader | pass | pass | the judge passed it and a discriminating test passes |
| C-674bb9f6 | people-directory › The name cache batches, remembers and shares requests, and a failed lookup never ends the session › Batches, memory, invalid ids and shared requests | pass | pass | the judge passed it and a discriminating test passes |
| C-929a4c25 | people-directory › The name cache batches, remembers and shares requests, and a failed lookup never ends the session › Failures are forgotten and aborts reject | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a pre-existing test is flaky on the unit's code: test.support.e2e-stack.stack.db.test.ts::C-d194233f the stack health reports the migrated database, its tenant and its app sessions
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-748ce889): No end-to-end test traces criterion C-748ce889 (people-directory › Names are read for the context's tenant only, after the input is checked › Names come back in first-appearance order, once, with unknown ids left out); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-55e76eb6): No end-to-end test traces criterion C-55e76eb6 (people-directory › Names are read for the context's tenant only, after the input is checked › Another tenant's users are never named); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-db4fc15e): No end-to-end test traces criterion C-db4fc15e (people-directory › Names are read for the context's tenant only, after the input is checked › Bad input is refused before any query and a failing database is not hidden); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-57481c19): No end-to-end test traces criterion C-57481c19 (people-directory › GET /api/v1/people answers display names under read_self and nothing else › A member reads the names of the ids it holds); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-59f63ed0): No end-to-end test traces criterion C-59f63ed0 (people-directory › GET /api/v1/people answers display names under read_self and nothing else › A member of tenant B gets nothing for tenant A's ids); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1c488737): No end-to-end test traces criterion C-1c488737 (people-directory › The people route bounds the ids and the size of its answer › Refusals, the limit and the largest answer); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a68cc186): No end-to-end test traces criterion C-a68cc186 (people-directory › Both routes refuse a caller who is not signed in or not active, and exist without a database › Missing session, disabled caller, HEAD and no database); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-64158aad): No end-to-end test traces criterion C-64158aad (people-directory › GET /api/v1/me/teams answers the caller's own teams and /me keeps its shape › Teams of alice, bob and mallory and the unchanged /me); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-fb2cd0d1): No end-to-end test traces criterion C-fb2cd0d1 (people-directory › The committed OpenAPI document describes both routes › The document lists the two routes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-20c4fd10): No end-to-end test traces criterion C-20c4fd10 (people-directory › Answers are parsed without being stricter than the engine, and a name falls back to the id › Parsers, labels and the teams loader); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-674bb9f6): No end-to-end test traces criterion C-674bb9f6 (people-directory › The name cache batches, remembers and shares requests, and a failed lookup never ends the session › Batches, memory, invalid ids and shared requests); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-929a4c25): No end-to-end test traces criterion C-929a4c25 (people-directory › The name cache batches, remembers and shares requests, and a failed lookup never ends the session › Failures are forgotten and aborts reject); step 5 generates one.

## Needs a human

- UI criterion C-748ce889 has no end-to-end test; see the generated UI tests table
- UI criterion C-55e76eb6 has no end-to-end test; see the generated UI tests table
- UI criterion C-db4fc15e has no end-to-end test; see the generated UI tests table
- UI criterion C-57481c19 has no end-to-end test; see the generated UI tests table
- UI criterion C-59f63ed0 has no end-to-end test; see the generated UI tests table
- UI criterion C-1c488737 has no end-to-end test; see the generated UI tests table
- UI criterion C-a68cc186 has no end-to-end test; see the generated UI tests table
- UI criterion C-64158aad has no end-to-end test; see the generated UI tests table
- UI criterion C-fb2cd0d1 has no end-to-end test; see the generated UI tests table
- UI criterion C-20c4fd10 has no end-to-end test; see the generated UI tests table
- UI criterion C-674bb9f6 has no end-to-end test; see the generated UI tests table
- UI criterion C-929a4c25 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.me-teams.test.ts::C-64158aad teams of alice, bob and mallory and the unchanged /me` (task 3.1): passed
- `src.api.me-teams.test.ts::C-a68cc186 missing session, disabled caller, HEAD and no database` (task 3.1): passed
- `src.api.people-openapi.test.ts::C-fb2cd0d1 the committed OpenAPI document describes both people routes` (task 4.1): passed
- `src.api.people-routes.test.ts::C-1c488737 the people route refuses bad ids, accepts the limit and bounds the largest answer` (task 2.1): passed
- `src.api.people-routes.test.ts::C-57481c19 a member reads the names of the ids it holds` (task 2.1): passed
- `src.api.people-routes.test.ts::C-59f63ed0 a member of tenant B gets nothing for tenant A's ids` (task 2.1): passed
- `src.identity.person-names.test.ts::C-55e76eb6 another tenant's users are never named` (task 1.1): passed
- `src.identity.person-names.test.ts::C-748ce889 names come back in first-appearance order once with unknown ids left out` (task 1.1): passed
- `src.identity.person-names.test.ts::C-db4fc15e bad input is refused before any query and a failing database is not hidden` (task 1.1): passed
- `web.src.people.name-cache.test.ts::C-674bb9f6 concurrent resolves share a request and wait for it` (task 6.1): passed
- `web.src.people.name-cache.test.ts::C-674bb9f6 maxBatch splits the ids and passes the signal along` (task 6.1): passed
- `web.src.people.name-cache.test.ts::C-674bb9f6 the cache asks 60 ids in two batches and remembers them` (task 6.1): passed
- `web.src.people.name-cache.test.ts::C-674bb9f6 the cache drops invalid ids, dedupes and ignores unasked items` (task 6.1): passed
- `web.src.people.name-cache.test.ts::C-929a4c25 a failed batch is forgotten and asked again` (task 6.1): passed
- `web.src.people.name-cache.test.ts::C-929a4c25 aborts reject with AbortError and remember nothing` (task 6.1): passed
- `web.src.people.name-cache.test.ts::C-929a4c25 only a failed batch is asked again` (task 6.1): passed
- `web.src.people.name-cache.test.ts::C-929a4c25 the plain client never ends the session and the sources use it` (task 6.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 loadMyTeams answers empty for every failure` (task 5.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 loadMyTeams asks me teams and returns their ids` (task 5.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 loadMyTeams rejects an abort with AbortError` (task 5.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 parseMyTeams keeps valid bodies and deduplicates ids` (task 5.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 parseMyTeams refuses malformed team bodies` (task 5.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 parsePeople keeps valid bodies and drops extra members` (task 5.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 parsePeople refuses malformed people bodies` (task 5.1): passed
- `web.src.people.people.test.ts::C-20c4fd10 personLabel trims a name and falls back to the id` (task 5.1): passed
