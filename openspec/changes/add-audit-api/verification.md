# Verification: openspec:add-audit-api: PASS (round 1)

traceability: 29/29 criteria covered by a discriminating test

- Base: `e95e05a39668464cd3da60e87920a4c5b959b109`
- Head: `6e345f72d792c50fd7cc113688cd59a35e16092f`
- Implementer profiles: deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `b175e1a32ed9c5500e33bd84a4f626308862200e2441036dcc814f2f55155b50`
  - part 1: 11 file(s), 112261 characters, profile claude-judge, reply valid
  - part 2: 11 file(s), 86955 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $2.5847

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@e95e05a396 contained |
| 1 | integrity | ok | 92.0 | 11 sub-checks; scope: 24 changed file(s) |
| 2 | build | ok | 26.0 |  |
| 3 | tests | ok | 121.8 |  |
| 4 | traceability | ok | 0.2 | 29/29 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/audit-query.ts, src/api/audit-routes.ts, src/api/index.ts, src/audit/index.ts, src/audit/query.ts and 3 more |
| 8 | s1 judge | ok | 3.8 | 29/29 criteria judged by jev |
| 9 | judge | ok | 177.5 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261031T1729Z-1ad5/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261031T1729Z-1ad5/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261031T1729Z-1ad5/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261031T1729Z-1ad5/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261031T1729Z-1ad5/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261031T1729Z-1ad5/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261031T1729Z-1ad5/029-e2e.log |

## Files by part

- part 1: src/db/migrations/0190_audit_read_indexes.sql (444 characters)
- part 1: src/audit/anchor-count.test.ts (2528 characters)
- part 1: src/api/audit-list.test.ts (24299 characters)
- part 1: src/api/audit-query.test.ts (4393 characters)
- part 1: src/api/audit-query.ts (8077 characters)
- part 1: src/api/audit-routes.ts (17253 characters)
- part 1: src/api/audit-verify.test.ts (24173 characters)
- part 1: src/api/audit-verify-queue.test.ts (6330 characters)
- part 1: src/api/audit-walks.test.ts (6582 characters)
- part 1: src/pdp/decisions-query.test.ts (11539 characters)
- part 1: src/pdp/decisions-query.ts (6643 characters)
- part 2: src/api/decisions-route.test.ts (21103 characters)
- part 2: src/api/index.ts (858 characters)
- part 2: src/audit/index.ts (473 characters)
- part 2: src/pdp/index.ts (435 characters)
- part 2: src/main.audit.test.ts (7887 characters)
- part 2: src/main.ts (729 characters)
- part 2: docs/api/openapi.json (20311 characters)
- part 2: src/audit/query.test.ts (10084 characters)
- part 2: src/audit/query.ts (6674 characters)
- part 2: src/audit/read-indexes.test.ts (5366 characters)
- part 2: openspec/changes/add-audit-api/tasks.md (13035 characters)

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
| suppressions | skipped | not checked: python only; changed files outside it: src/api/audit-list.test.ts, src/api/audit-query.test.ts, src/api/audit-query.ts, src/api/audit-routes.ts, src/api/audit-verify-queue.test.ts (+14 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1043 of 1043 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-330a8744 | audit-api › Audit events are listed newest first, a page at a time › Newest first, with the full item | covered | src.api.audit-list.test.ts::C-330a8744 newest first with the full item (passed, red_assertion) | - | 0.93 |
| C-ddc14b4a | audit-api › Audit events are listed newest first, a page at a time › A full walk, ascending order and after_seq | covered | src.api.audit-list.test.ts::C-ddc14b4a a full walk in both directions with after_seq (passed, red_assertion); src.audit.query.test.ts::C-ddc14b4a ascending order and afterSeq page the chain in both directions (passed, red_assertion) | - | 0.94 |
| C-2630a7e0 | audit-api › Audit events are listed newest first, a page at a time › Free-form payload and a Mintkey event survive | covered | src.api.audit-list.test.ts::C-2630a7e0 free-form payload and a Mintkey event survive (passed, red_assertion); src.audit.query.test.ts::C-2630a7e0 free-form payloads and a Mintkey event survive the reader (passed, red_assertion) | - | 0.95 |
| C-c0d8a403 | audit-api › Audit events are listed newest first, a page at a time › The reader returns records and refuses bad options | covered | src.audit.query.test.ts::C-c0d8a403 the reader returns records and refuses bad options (passed, red_assertion) | - | 0.93 |
| C-dfa2a3a0 | audit-api › Audit events can be filtered › Each filter and a combination | covered | src.api.audit-list.test.ts::C-dfa2a3a0 each filter and a combination (passed, red_assertion); src.audit.query.test.ts::C-dfa2a3a0 each audit filter and a combination return the matching records (passed, red_assertion) | - | 0.92 |
| C-a17dc1c2 | audit-api › Audit events can be filtered › Refused values through the server | covered | src.api.audit-list.test.ts::C-a17dc1c2 refused values through the server (passed, red_assertion) | - | 0.91 |
| C-d87feac3 | audit-api › Audit events can be filtered › Parsing is a pure function | covered | src.api.audit-query.test.ts::C-d87feac3 the audit query parser answers defaults and parses filters (passed, red_assertion); src.api.audit-query.test.ts::C-d87feac3 the audit query parser refuses bad options (passed, red_assertion) | - | 0.94 |
| C-590617af | audit-api › Policy decisions are listed with their filters › Newest first, with the full item | covered | src.api.decisions-route.test.ts::C-590617af newest policy decisions page holds the full item (passed, red_assertion); src.pdp.decisions-query.test.ts::C-590617af the policy decision reader returns the full d_4 record (passed, red_assertion) | - | 0.91 |
| C-3d923c6a | audit-api › Policy decisions are listed with their filters › Ties, both directions and the call's own row | covered | src.api.decisions-route.test.ts::C-3d923c6a policy decision ties both directions and the call's own row (passed, red_assertion); src.pdp.decisions-query.test.ts::C-3d923c6a policy decisions walk in both directions with ties (passed, red_assertion, inadequate) | - | 0.94 |
| C-d6210b1c | audit-api › Policy decisions are listed with their filters › Each filter | covered | src.api.decisions-route.test.ts::C-d6210b1c each policy decision filter answers through the route (passed, red_assertion); src.pdp.decisions-query.test.ts::C-d6210b1c each policy decision filter returns the matching records (passed, red_assertion, inadequate) | - | 0.89 |
| C-061beb81 | audit-api › Policy decisions are listed with their filters › The reader and the parser refuse bad input | covered | src.api.audit-query.test.ts::C-061beb81 the policy decision query parser parses its filters (passed, red_assertion); src.api.audit-query.test.ts::C-061beb81 the policy decision query parser refuses an empty run id (passed, red_assertion); src.pdp.decisions-query.test.ts::C-061beb81 the policy decisi... | - | 0.88 |
| C-7141a311 | audit-api › Cursors belong to one list, one order and one tenant › Refused cursors | covered | src.api.audit-list.test.ts::C-7141a311 refused cursors (passed, red_assertion); src.api.decisions-route.test.ts::C-7141a311 the policy decision route refuses foreign cursors (passed, red_assertion) | - | 0.94 |
| C-26fdf915 | audit-api › Cursors belong to one list, one order and one tenant › No engine key, and a short one | covered | src.api.audit-list.test.ts::C-26fdf915 no engine key serves one page and a short key throws (passed, red_assertion); src.api.audit-verify.test.ts::C-26fdf915 the verify route answers without an engine key (passed, red_assertion); src.api.decisions-route.test.ts::C-26fdf915 the policy decision list w... | - | 0.90 |
| C-abef4e43 | audit-api › The routes need a session and read_audit and stay in the tenant › No session, or no read_audit | covered | src.api.audit-list.test.ts::C-abef4e43 the audit route needs a session and read_audit (passed, red_assertion); src.api.audit-verify.test.ts::C-abef4e43 the verify route needs a session and read_audit (passed, red_assertion); src.api.decisions-route.test.ts::C-abef4e43 the policy decision route needs... | - | 0.91 |
| C-2b77706e | audit-api › The routes need a session and read_audit and stay in the tenant › Another tenant's caller sees only its own rows | covered | src.api.audit-list.test.ts::C-2b77706e another tenant's caller sees only its own rows (passed, red_assertion); src.api.audit-verify.test.ts::C-2b77706e the verify route stays in the tenant (passed, red_assertion); src.api.decisions-route.test.ts::C-2b77706e another tenant's caller sees only its own ... | - | 0.94 |
| C-dc4ca375 | audit-api › The routes are part of the engine and its API document › The real engine | covered | src.main.audit.test.ts::C-dc4ca375 the real engine registers the audit routes under read_audit (passed, red_assertion) | - | 0.78 |
| C-dfdb3dcc | audit-api › The routes are part of the engine and its API document › The API document lists the routes | covered | src.main.audit.test.ts::C-dfdb3dcc the API document lists the audit routes (passed, red_assertion) | - | 0.76 |
| C-9a0ef268 | audit-api › Read indexes support the filtered lists › Objects and catalog | covered | src.audit.read-indexes.test.ts::C-9a0ef268 objects, catalog and ledger of the read indexes (passed, red_assertion) | - | 0.91 |
| C-db6399da | audit-api › Read indexes support the filtered lists › Later partitions | covered | src.audit.read-indexes.test.ts::C-db6399da later partitions carry the read indexes (passed, red_assertion) | - | 0.92 |
| C-c69a42aa | audit-verification › The chain can be verified on request › Intact, empty and part-way | covered | src.api.audit-verify.test.ts::C-c69a42aa verify answers intact, part-way and empty chains (passed, red_assertion) | - | 0.94 |
| C-7b4261a4 | audit-verification › The chain can be verified on request › The anchor count | covered | src.audit.anchor-count.test.ts::C-7b4261a4 the anchor count counts only anchors at or after fromSeq (passed, red_assertion) | - | 0.62 |
| C-f001a03d | audit-verification › The chain can be verified on request › Anchors are counted, never assumed | covered | src.api.audit-verify.test.ts::C-f001a03d anchors are counted, never assumed (passed, red_assertion) | - | 0.94 |
| C-f4460a58 | audit-verification › The chain can be verified on request › Tampered chains | covered | src.api.audit-verify.test.ts::C-f4460a58 tampered chains answer ok false with the first bad seq (passed, red_assertion) | - | 0.90 |
| C-bfe35eee | audit-verification › The chain can be verified on request › Options reach verifyChain, bad input and failures | covered | src.api.audit-query.test.ts::C-bfe35eee the verify query parser defaults and parses from_seq (passed, red_assertion); src.api.audit-verify.test.ts::C-bfe35eee a failing verify answers INTERNAL and the next succeeds (passed, red_assertion); src.api.audit-verify.test.ts::C-bfe35eee options reach verif... | - | 0.92 |
| C-e8203aba | audit-verification › Verification walks run one per tenant and two at a time › Equal requests share a walk | covered | src.api.audit-walks.test.ts::C-e8203aba equal requests share a walk (passed, red_assertion) | - | 0.93 |
| C-010f914e | audit-verification › Verification walks run one per tenant and two at a time › Another start of a tenant waits, other tenants do not | covered | src.api.audit-walks.test.ts::C-010f914e another start of a tenant waits while other tenants do not (passed, red_assertion) | - | 0.77 |
| C-d85800a6 | audit-verification › Verification walks run one per tenant and two at a time › A failed walk is not kept | covered | src.api.audit-walks.test.ts::C-d85800a6 a failed walk is not kept (passed, red_assertion) | - | 0.73 |
| C-d11a92d3 | audit-verification › Verification walks run one per tenant and two at a time › A start that throws, and the size | covered | src.api.audit-walks.test.ts::C-d11a92d3 a start that throws rejects and the size is checked (passed, red_assertion) | - | 0.90 |
| C-b71b26a5 | audit-verification › Verification walks run one per tenant and two at a time › The verify route goes through the queue | covered | src.api.audit-verify-queue.test.ts::C-b71b26a5 the verify route goes through the walk queue (passed, red_assertion) | - | 0.87 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-api/.l4/ledger/r-20261031T1457Z-00fe.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-api/.l4/ledger/r-20261031T1729Z-1ad5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-api/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/audit-list.test.ts` |  | relevant | new test file |
| `src/api/audit-query.test.ts` |  | relevant | new test file |
| `src/api/audit-query.ts` | api | relevant | named in the spec |
| `src/api/audit-routes.ts` | api | relevant | named in the spec |
| `src/api/audit-verify-queue.test.ts` |  | relevant | new test file |
| `src/api/audit-verify.test.ts` |  | relevant | new test file |
| `src/api/audit-walks.test.ts` |  | relevant | new test file |
| `src/api/decisions-route.test.ts` |  | relevant | new test file |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/audit/anchor-count.test.ts` |  | relevant | new test file |
| `src/audit/index.ts` | audit | relevant | named in the spec |
| `src/audit/query.test.ts` |  | relevant | new test file |
| `src/audit/query.ts` | audit | relevant | named in the spec |
| `src/audit/read-indexes.test.ts` |  | relevant | new test file |
| `src/db/migrations/0190_audit_read_indexes.sql` | db | relevant | named in the spec |
| `src/main.audit.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/pdp/decisions-query.test.ts` |  | relevant | new test file |
| `src/pdp/decisions-query.ts` | pdp | relevant | named in the spec |
| `src/pdp/index.ts` | pdp | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/audit-query.ts, src/api/audit-routes.ts, src/api/index.ts, src/audit/index.ts, src/audit/query.ts and 3 more

### Tests

1141 of 1141 passed, 0 failed, 0 errored, 0 skipped.
49 of 49 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-330a8744 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ddc14b4a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2630a7e0 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0d8a403 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dfa2a3a0 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a17dc1c2 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d87feac3 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-590617af | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d923c6a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d6210b1c | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-061beb81 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7141a311 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-26fdf915 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-abef4e43 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2b77706e | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dc4ca375 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dfdb3dcc | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9a0ef268 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-db6399da | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c69a42aa | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7b4261a4 | ok | 0.620 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f001a03d | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f4460a58 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bfe35eee | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e8203aba | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-010f914e | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d85800a6 | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d11a92d3 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b71b26a5 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-330a8744 | audit-api › Audit events are listed newest first, a page at a time › Newest first, with the full item | pass | pass | the judge passed it and a discriminating test passes |
| C-ddc14b4a | audit-api › Audit events are listed newest first, a page at a time › A full walk, ascending order and after_seq | pass | pass | the judge passed it and a discriminating test passes |
| C-2630a7e0 | audit-api › Audit events are listed newest first, a page at a time › Free-form payload and a Mintkey event survive | pass | pass | the judge passed it and a discriminating test passes |
| C-c0d8a403 | audit-api › Audit events are listed newest first, a page at a time › The reader returns records and refuses bad options | pass | pass | the judge passed it and a discriminating test passes |
| C-dfa2a3a0 | audit-api › Audit events can be filtered › Each filter and a combination | pass | pass | the judge passed it and a discriminating test passes |
| C-a17dc1c2 | audit-api › Audit events can be filtered › Refused values through the server | pass | pass | the judge passed it and a discriminating test passes |
| C-d87feac3 | audit-api › Audit events can be filtered › Parsing is a pure function | pass | pass | the judge passed it and a discriminating test passes |
| C-590617af | audit-api › Policy decisions are listed with their filters › Newest first, with the full item | pass | pass | the judge passed it and a discriminating test passes |
| C-3d923c6a | audit-api › Policy decisions are listed with their filters › Ties, both directions and the call's own row | pass | pass | the judge passed it and a discriminating test passes |
| C-d6210b1c | audit-api › Policy decisions are listed with their filters › Each filter | pass | pass | the judge passed it and a discriminating test passes |
| C-061beb81 | audit-api › Policy decisions are listed with their filters › The reader and the parser refuse bad input | pass | pass | the judge passed it and a discriminating test passes |
| C-7141a311 | audit-api › Cursors belong to one list, one order and one tenant › Refused cursors | pass | pass | the judge passed it and a discriminating test passes |
| C-26fdf915 | audit-api › Cursors belong to one list, one order and one tenant › No engine key, and a short one | pass | pass | the judge passed it and a discriminating test passes |
| C-abef4e43 | audit-api › The routes need a session and read_audit and stay in the tenant › No session, or no read_audit | pass | pass | the judge passed it and a discriminating test passes |
| C-2b77706e | audit-api › The routes need a session and read_audit and stay in the tenant › Another tenant's caller sees only its own rows | pass | pass | the judge passed it and a discriminating test passes |
| C-dc4ca375 | audit-api › The routes are part of the engine and its API document › The real engine | pass | pass | the judge passed it and a discriminating test passes |
| C-dfdb3dcc | audit-api › The routes are part of the engine and its API document › The API document lists the routes | pass | pass | the judge passed it and a discriminating test passes |
| C-9a0ef268 | audit-api › Read indexes support the filtered lists › Objects and catalog | pass | pass | the judge passed it and a discriminating test passes |
| C-db6399da | audit-api › Read indexes support the filtered lists › Later partitions | pass | pass | the judge passed it and a discriminating test passes |
| C-c69a42aa | audit-verification › The chain can be verified on request › Intact, empty and part-way | pass | pass | the judge passed it and a discriminating test passes |
| C-7b4261a4 | audit-verification › The chain can be verified on request › The anchor count | pass | pass | the judge passed it and a discriminating test passes |
| C-f001a03d | audit-verification › The chain can be verified on request › Anchors are counted, never assumed | pass | pass | the judge passed it and a discriminating test passes |
| C-f4460a58 | audit-verification › The chain can be verified on request › Tampered chains | pass | pass | the judge passed it and a discriminating test passes |
| C-bfe35eee | audit-verification › The chain can be verified on request › Options reach verifyChain, bad input and failures | pass | pass | the judge passed it and a discriminating test passes |
| C-e8203aba | audit-verification › Verification walks run one per tenant and two at a time › Equal requests share a walk | pass | pass | the judge passed it and a discriminating test passes |
| C-010f914e | audit-verification › Verification walks run one per tenant and two at a time › Another start of a tenant waits, other tenants do not | pass | pass | the judge passed it and a discriminating test passes |
| C-d85800a6 | audit-verification › Verification walks run one per tenant and two at a time › A failed walk is not kept | pass | pass | the judge passed it and a discriminating test passes |
| C-d11a92d3 | audit-verification › Verification walks run one per tenant and two at a time › A start that throws, and the size | pass | pass | the judge passed it and a discriminating test passes |
| C-b71b26a5 | audit-verification › Verification walks run one per tenant and two at a time › The verify route goes through the queue | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] Cursors are not bound to the filters they were issued under (spec gap) (criterion C-7141a311): The cursor binding holds only the tenant and the scope audit.<order> or decisions.<order>. A next_cursor issued under one filter, say event_type=role.granted, is accepted under another filter or none, and the walk continues after the cursor's seq under the new filter. No scenario pins this down, and an implementation that also binds the filter would answer CURSOR_INVALID instead.
- [minor, judge] Requests to the same tenant and from_seq share one walk, checkedAt included (spec gap) (criterion C-b71b26a5): An equal verify request that arrives while a walk is running or waiting gets that walk's body. Its checkedAt is the time the earlier walk ended, not the time of its own request. No scenario says whether a sharer should get its own checkedAt.
- [minor, judge] Reader accepts a from/to pair where to is not after from (spec gap) (criterion C-c0d8a403): listAuditEvents checks from and to separately with isUtcTime but never compares them. A direct caller passing from >= to gets an empty list where the parser would refuse it. No scenario pins down what the reader should do here.
- [minor, judge] actorId/targetId length bound counts UTF-16 code units (spec gap) (criterion C-c0d8a403): The 1 to 200 character bound uses String.length, so non-BMP characters (such as emoji) count twice. An implementation counting code points would accept ids this one refuses.
- [minor, judge] the judge called a test inadequate (criterion C-3d923c6a): src.pdp.decisions-query.test.ts::C-3d923c6a policy decisions walk in both directions with ties
- [minor, judge] the judge called a test inadequate (criterion C-d6210b1c): src.pdp.decisions-query.test.ts::C-d6210b1c each policy decision filter returns the matching records

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.audit-list.test.ts::C-2630a7e0 free-form payload and a Mintkey event survive` (task 5.1): passed
- `src.api.audit-list.test.ts::C-26fdf915 no engine key serves one page and a short key throws` (task 5.1): passed
- `src.api.audit-list.test.ts::C-2b77706e another tenant's caller sees only its own rows` (task 5.1): passed
- `src.api.audit-list.test.ts::C-330a8744 newest first with the full item` (task 5.1): passed
- `src.api.audit-list.test.ts::C-7141a311 refused cursors` (task 5.1): passed
- `src.api.audit-list.test.ts::C-a17dc1c2 refused values through the server` (task 5.1): passed
- `src.api.audit-list.test.ts::C-abef4e43 the audit route needs a session and read_audit` (task 5.1): passed
- `src.api.audit-list.test.ts::C-ddc14b4a a full walk in both directions with after_seq` (task 5.1): passed
- `src.api.audit-list.test.ts::C-dfa2a3a0 each filter and a combination` (task 5.1): passed
- `src.api.audit-query.test.ts::C-061beb81 the policy decision query parser parses its filters` (task 4.1): passed
- `src.api.audit-query.test.ts::C-061beb81 the policy decision query parser refuses an empty run id` (task 4.1): passed
- `src.api.audit-query.test.ts::C-bfe35eee the verify query parser defaults and parses from_seq` (task 4.1): passed
- `src.api.audit-query.test.ts::C-d87feac3 the audit query parser answers defaults and parses filters` (task 4.1): passed
- `src.api.audit-query.test.ts::C-d87feac3 the audit query parser refuses bad options` (task 4.1): passed
- `src.api.audit-verify-queue.test.ts::C-b71b26a5 the verify route goes through the walk queue` (task 8.1): passed
- `src.api.audit-verify.test.ts::C-26fdf915 the verify route answers without an engine key` (task 7.1): passed
- `src.api.audit-verify.test.ts::C-2b77706e the verify route stays in the tenant` (task 7.1): passed
- `src.api.audit-verify.test.ts::C-abef4e43 the verify route needs a session and read_audit` (task 7.1): passed
- `src.api.audit-verify.test.ts::C-bfe35eee a failing verify answers INTERNAL and the next succeeds` (task 7.1): passed
- `src.api.audit-verify.test.ts::C-bfe35eee options reach verifyChain and bad input is refused` (task 7.1): passed
- `src.api.audit-verify.test.ts::C-c69a42aa verify answers intact, part-way and empty chains` (task 7.1): passed
- `src.api.audit-verify.test.ts::C-f001a03d anchors are counted, never assumed` (task 7.1): passed
- `src.api.audit-verify.test.ts::C-f4460a58 tampered chains answer ok false with the first bad seq` (task 7.1): passed
- `src.api.audit-walks.test.ts::C-010f914e another start of a tenant waits while other tenants do not` (task 8.1): passed
- `src.api.audit-walks.test.ts::C-d11a92d3 a start that throws rejects and the size is checked` (task 8.1): passed
- `src.api.audit-walks.test.ts::C-d85800a6 a failed walk is not kept` (task 8.1): passed
- `src.api.audit-walks.test.ts::C-e8203aba equal requests share a walk` (task 8.1): passed
- `src.api.decisions-route.test.ts::C-26fdf915 the policy decision list without an engine key serves one page` (task 6.1): passed
- `src.api.decisions-route.test.ts::C-2b77706e another tenant's caller sees only its own policy decisions` (task 6.1): passed
- `src.api.decisions-route.test.ts::C-3d923c6a policy decision ties both directions and the call's own row` (task 6.1): passed
- `src.api.decisions-route.test.ts::C-590617af newest policy decisions page holds the full item` (task 6.1): passed
- `src.api.decisions-route.test.ts::C-7141a311 the policy decision route refuses foreign cursors` (task 6.1): passed
- `src.api.decisions-route.test.ts::C-abef4e43 the policy decision route needs a session and read_audit` (task 6.1): passed
- `src.api.decisions-route.test.ts::C-d6210b1c each policy decision filter answers through the route` (task 6.1): passed
- `src.audit.anchor-count.test.ts::C-7b4261a4 the anchor count counts only anchors at or after fromSeq` (task 2.2): passed
- `src.audit.query.test.ts::C-2630a7e0 free-form payloads and a Mintkey event survive the reader` (task 2.1): passed
- `src.audit.query.test.ts::C-2b77706e the reader returns only the calling tenant's events` (task 2.1): passed
- `src.audit.query.test.ts::C-c0d8a403 the reader returns records and refuses bad options` (task 2.1): passed
- `src.audit.query.test.ts::C-ddc14b4a ascending order and afterSeq page the chain in both directions` (task 2.1): passed
- `src.audit.query.test.ts::C-dfa2a3a0 each audit filter and a combination return the matching records` (task 2.1): passed
- `src.audit.read-indexes.test.ts::C-9a0ef268 objects, catalog and ledger of the read indexes` (task 1.1): passed
- `src.audit.read-indexes.test.ts::C-db6399da later partitions carry the read indexes` (task 1.1): passed
- `src.main.audit.test.ts::C-dc4ca375 the real engine registers the audit routes under read_audit` (task 9.1): passed
- `src.main.audit.test.ts::C-dfdb3dcc the API document lists the audit routes` (task 9.1): passed
- `src.pdp.decisions-query.test.ts::C-061beb81 the policy decision reader refuses bad options` (task 3.1): passed
- `src.pdp.decisions-query.test.ts::C-2b77706e the policy decision reader returns only the calling tenant's decisions` (task 3.1): passed
- `src.pdp.decisions-query.test.ts::C-3d923c6a policy decisions walk in both directions with ties` (task 3.1): passed
- `src.pdp.decisions-query.test.ts::C-590617af the policy decision reader returns the full d_4 record` (task 3.1): passed
- `src.pdp.decisions-query.test.ts::C-d6210b1c each policy decision filter returns the matching records` (task 3.1): passed

## Guard events

- guard.violation: src/api/index.ts
