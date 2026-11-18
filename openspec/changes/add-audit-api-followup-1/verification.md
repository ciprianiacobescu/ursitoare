# Verification: openspec:add-audit-api-followup-1: PASS (round 1)

traceability: 30/30 criteria covered by a discriminating test

- Base: `c44282cd8b1f33c49169d9a486b5c288e65b0bcd`
- Head: `4c97a03f3b5d284e82ec411ec0dda16676edb27b`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 2 call(s), prompt sha256 `768776e0c582bd6ee0757ceea0a97dedbf22ebe38328c416706059ee2b40973b`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 1, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base main@c44282cd8b contained |
| 1 | integrity | ok | 252.7 | 11 sub-checks; scope: 10 changed file(s) |
| 2 | build | ok | 27.4 |  |
| 3 | tests | ok | 369.8 |  |
| 4 | traceability | ok | 0.3 | 30/30 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/audit/query.ts |
| 8 | s1 judge | ok | 3.5 | 30/30 criteria judged by jev |
| 9 | judge | ok | 176.2 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261118T0946Z-a00e/035-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261118T0946Z-a00e/036-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261118T0946Z-a00e/037-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261118T0946Z-a00e/038-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261118T0946Z-a00e/039-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261118T0946Z-a00e/040-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261118T0946Z-a00e/041-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/audit-list-seq-order.test.ts, src/audit/query.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 2468 of 2468 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-0ff607fa | audit-api › Audit events are listed in numeric seq order — feedback FB-001 › Audit events are listed in numeric seq order | covered | src.api.audit-list-seq-order.test.ts::C-0ff607fa audit events are listed in numeric seq order across pages (passed, red_assertion) | - | 0.95 |
| C-330a8744 | audit-api › Audit events are listed newest first, a page at a time › Newest first, with the full item | covered | src.api.audit-list.test.ts::C-330a8744 newest first with the full item (passed, pass_to_pass) | - | 0.91 |
| C-ddc14b4a | audit-api › Audit events are listed newest first, a page at a time › A full walk, ascending order and after_seq | covered | src.api.audit-list.test.ts::C-ddc14b4a a full walk in both directions with after_seq (passed, pass_to_pass); src.audit.query.test.ts::C-ddc14b4a ascending order and afterSeq page the chain in both directions (passed, pass_to_pass) | - | 0.95 |
| C-2630a7e0 | audit-api › Audit events are listed newest first, a page at a time › Free-form payload and a Mintkey event survive | covered | src.api.audit-list.test.ts::C-2630a7e0 free-form payload and a Mintkey event survive (passed, pass_to_pass); src.audit.query.test.ts::C-2630a7e0 free-form payloads and a Mintkey event survive the reader (passed, pass_to_pass) | - | 0.95 |
| C-c0d8a403 | audit-api › Audit events are listed newest first, a page at a time › The reader returns records and refuses bad options | covered | src.audit.query.test.ts::C-c0d8a403 the reader returns records and refuses bad options (passed, pass_to_pass) | - | 0.92 |
| C-dfa2a3a0 | audit-api › Audit events can be filtered › Each filter and a combination | covered | src.api.audit-list.test.ts::C-dfa2a3a0 each filter and a combination (passed, pass_to_pass); src.audit.query.test.ts::C-dfa2a3a0 each audit filter and a combination return the matching records (passed, pass_to_pass) | - | 0.92 |
| C-a17dc1c2 | audit-api › Audit events can be filtered › Refused values through the server | covered | src.api.audit-list.test.ts::C-a17dc1c2 refused values through the server (passed, pass_to_pass) | - | 0.92 |
| C-d87feac3 | audit-api › Audit events can be filtered › Parsing is a pure function | covered | src.api.audit-query.test.ts::C-d87feac3 the audit query parser answers defaults and parses filters (passed, pass_to_pass); src.api.audit-query.test.ts::C-d87feac3 the audit query parser refuses bad options (passed, pass_to_pass) | - | 0.91 |
| C-590617af | audit-api › Policy decisions are listed with their filters › Newest first, with the full item | covered | src.api.decisions-route.test.ts::C-590617af newest policy decisions page holds the full item (passed, pass_to_pass); src.pdp.decisions-query.test.ts::C-590617af the policy decision reader returns the full d_4 record (passed, pass_to_pass) | - | 0.88 |
| C-3d923c6a | audit-api › Policy decisions are listed with their filters › Ties, both directions and the call's own row | covered | src.api.decisions-route.test.ts::C-3d923c6a policy decision ties both directions and the call's own row (passed, pass_to_pass); src.pdp.decisions-query.test.ts::C-3d923c6a policy decisions walk in both directions with ties (passed, pass_to_pass) | - | 0.94 |
| C-d6210b1c | audit-api › Policy decisions are listed with their filters › Each filter | covered | src.api.decisions-route.test.ts::C-d6210b1c each policy decision filter answers through the route (passed, pass_to_pass); src.pdp.decisions-query.test.ts::C-d6210b1c each policy decision filter returns the matching records (passed, pass_to_pass) | - | 0.83 |
| C-061beb81 | audit-api › Policy decisions are listed with their filters › The reader and the parser refuse bad input | covered | src.api.audit-query.test.ts::C-061beb81 the policy decision query parser parses its filters (passed, pass_to_pass); src.api.audit-query.test.ts::C-061beb81 the policy decision query parser refuses an empty run id (passed, pass_to_pass); src.pdp.decisions-query.test.ts::C-061beb81 the policy decision... | - | 0.87 |
| C-7141a311 | audit-api › Cursors belong to one list, one order and one tenant › Refused cursors | covered | src.api.audit-list.test.ts::C-7141a311 refused cursors (passed, pass_to_pass); src.api.decisions-route.test.ts::C-7141a311 the policy decision route refuses foreign cursors (passed, pass_to_pass) | - | 0.94 |
| C-26fdf915 | audit-api › Cursors belong to one list, one order and one tenant › No engine key, and a short one | covered | src.api.audit-list.test.ts::C-26fdf915 no engine key serves one page and a short key throws (passed, pass_to_pass); src.api.audit-verify.test.ts::C-26fdf915 the verify route answers without an engine key (passed, pass_to_pass); src.api.decisions-route.test.ts::C-26fdf915 the policy decision list wit... | - | 0.84 |
| C-abef4e43 | audit-api › The routes need a session and read_audit and stay in the tenant › No session, or no read_audit | covered | src.api.audit-list.test.ts::C-abef4e43 the audit route needs a session and read_audit (passed, pass_to_pass); src.api.audit-verify.test.ts::C-abef4e43 the verify route needs a session and read_audit (passed, pass_to_pass); src.api.decisions-route.test.ts::C-abef4e43 the policy decision route needs a... | - | 0.83 |
| C-2b77706e | audit-api › The routes need a session and read_audit and stay in the tenant › Another tenant's caller sees only its own rows | covered | src.api.audit-list.test.ts::C-2b77706e another tenant's caller sees only its own rows (passed, pass_to_pass); src.api.audit-verify.test.ts::C-2b77706e the verify route stays in the tenant (passed, pass_to_pass); src.api.decisions-route.test.ts::C-2b77706e another tenant's caller sees only its own po... | - | 0.91 |
| C-dc4ca375 | audit-api › The routes are part of the engine and its API document › The real engine | covered | src.main.audit.test.ts::C-dc4ca375 the real engine registers the audit routes under read_audit (passed, pass_to_pass) | - | 0.67 |
| C-dfdb3dcc | audit-api › The routes are part of the engine and its API document › The API document lists the routes | covered | src.main.audit.test.ts::C-dfdb3dcc the API document lists the audit routes (passed, pass_to_pass) | - | 0.75 |
| C-9a0ef268 | audit-api › Read indexes support the filtered lists › Objects and catalog | covered | src.audit.read-indexes.test.ts::C-9a0ef268 objects, catalog and ledger of the read indexes (passed, pass_to_pass) | - | 0.91 |
| C-db6399da | audit-api › Read indexes support the filtered lists › Later partitions | covered | src.audit.read-indexes.test.ts::C-db6399da later partitions carry the read indexes (passed, pass_to_pass) | - | 0.83 |
| C-c69a42aa | audit-verification › The chain can be verified on request › Intact, empty and part-way | covered | src.api.audit-verify.test.ts::C-c69a42aa verify answers intact, part-way and empty chains (passed, pass_to_pass) | - | 0.86 |
| C-7b4261a4 | audit-verification › The chain can be verified on request › The anchor count | covered | src.audit.anchor-count.test.ts::C-7b4261a4 the anchor count counts only anchors at or after fromSeq (passed, pass_to_pass) | - | 0.77 |
| C-f001a03d | audit-verification › The chain can be verified on request › Anchors are counted, never assumed | covered | src.api.audit-verify.test.ts::C-f001a03d anchors are counted, never assumed (passed, pass_to_pass) | - | 0.75 |
| C-f4460a58 | audit-verification › The chain can be verified on request › Tampered chains | covered | src.api.audit-verify.test.ts::C-f4460a58 tampered chains answer ok false with the first bad seq (passed, pass_to_pass) | - | 0.90 |
| C-bfe35eee | audit-verification › The chain can be verified on request › Options reach verifyChain, bad input and failures | covered | src.api.audit-query.test.ts::C-bfe35eee the verify query parser defaults and parses from_seq (passed, pass_to_pass); src.api.audit-verify.test.ts::C-bfe35eee a failing verify answers INTERNAL and the next succeeds (passed, pass_to_pass); src.api.audit-verify.test.ts::C-bfe35eee options reach verifyC... | - | 0.93 |
| C-e8203aba | audit-verification › Verification walks run one per tenant and two at a time › Equal requests share a walk | covered | src.api.audit-walks.test.ts::C-e8203aba equal requests share a walk (passed, pass_to_pass) | - | 0.91 |
| C-010f914e | audit-verification › Verification walks run one per tenant and two at a time › Another start of a tenant waits, other tenants do not | covered | src.api.audit-walks.test.ts::C-010f914e another start of a tenant waits while other tenants do not (passed, pass_to_pass) | - | 0.85 |
| C-d85800a6 | audit-verification › Verification walks run one per tenant and two at a time › A failed walk is not kept | covered | src.api.audit-walks.test.ts::C-d85800a6 a failed walk is not kept (passed, pass_to_pass) | - | 0.83 |
| C-d11a92d3 | audit-verification › Verification walks run one per tenant and two at a time › A start that throws, and the size | covered | src.api.audit-walks.test.ts::C-d11a92d3 a start that throws rejects and the size is checked (passed, pass_to_pass) | - | 0.91 |
| C-b71b26a5 | audit-verification › Verification walks run one per tenant and two at a time › The verify route goes through the queue | covered | src.api.audit-verify-queue.test.ts::C-b71b26a5 the verify route goes through the walk queue (passed, pass_to_pass) | - | 0.89 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/audit/query.ts

### Tests

2535 of 2535 passed, 0 failed, 0 errored, 0 skipped.
1 of 1 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-0ff607fa | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-330a8744 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ddc14b4a | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2630a7e0 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0d8a403 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dfa2a3a0 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a17dc1c2 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d87feac3 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-590617af | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3d923c6a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d6210b1c | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-061beb81 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7141a311 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-26fdf915 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-abef4e43 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2b77706e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dc4ca375 | ok | 0.670 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dfdb3dcc | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9a0ef268 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-db6399da | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c69a42aa | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7b4261a4 | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f001a03d | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f4460a58 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bfe35eee | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e8203aba | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-010f914e | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d85800a6 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d11a92d3 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b71b26a5 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-0ff607fa | audit-api › Audit events are listed in numeric seq order — feedback FB-001 › Audit events are listed in numeric seq order | pass | pass | the judge passed it and a discriminating test passes |
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

None.

## Feedback

- FB-001: addressed at 4c97a03f3b: src/audit/query.ts:187 changes ORDER BY seq to ORDER BY audit_event.seq, ordering by the table's bigint column as requested.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.audit-list-seq-order.test.ts::C-0ff607fa audit events are listed in numeric seq order across pages` (task 1.1): passed
