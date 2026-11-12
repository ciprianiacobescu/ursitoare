# Verification: openspec:add-web-grants: PASS (round 3)

traceability: 10/14 criteria covered by a discriminating test

- Base: `c976ee8eb4ef628fdf07bd86195d0a49363e66fd`
- Head: `e8d5d182c220adbcab23ac5ee9dc81c8f62c0951`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 10 call(s), judged in 2 parts and 1 follow-up, prompt sha256 `4b994f888a9cf6429d01aed2e4f45cbf15e9b55b19229862c47e9a7692eac25e`
  - part 1: 17 file(s), 115411 characters, profile nemotron-judge, reply retried
  - part 2: 7 file(s), 52639 characters, profile nemotron-judge, reply repaired
  - follow-up 1: C-4f5443ee, C-78ea404d; files of parts 1 and 2: 6 file(s), 51013 characters, profile nemotron-judge, reply retried
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 2, retried 2, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 2) |
| 1 | integrity | reused | 0.0 | reused (round 2) |
| 2 | build | reused | 0.0 | reused (round 2) |
| 3 | tests | reused | 0.0 | reused (round 2) |
| 4 | traceability | reused | 0.0 | reused (round 2) |
| 4a | audit sampling | reused | 0.0 | reused (round 2) |
| 5 | ui test generation | reused | 0.0 | reused (round 2) |
| 6 | quality | reused | 0.0 | reused (round 2) |
| 8 | s1 judge | reused | 0.0 | reused (round 2) |
| 9 | judge | reused | 0.0 | reused (round 2) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261112T1731Z-d374/016-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261112T1731Z-d374/017-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261112T1731Z-d374/018-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261112T1731Z-d374/019-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261112T1731Z-d374/020-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261112T1731Z-d374/021-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261112T1731Z-d374/022-e2e.log |

## Files by part

- part 1: openspec/changes/add-web-grants-fix-1/.openspec.yaml (314 characters)
- part 1: web/src/features/64-admin-tool-servers.tsx (630 characters)
- part 1: web/src/features/65-admin-grants.tsx (584 characters)
- part 1: web/src/features/66-admin-policies.tsx (602 characters)
- part 1: web/src/tools/approve.test.ts (7848 characters)
- part 1: web/src/tools/calls.test.ts (12053 characters)
- part 1: web/src/tools/grants.test.ts (10465 characters)
- part 1: web/src/tools/grants.ts (7931 characters)
- part 1: web/src/tools/GrantsPage.tsx (13361 characters)
- part 1: e2e/test_m6_tool_pages.py (23838 characters)
- part 1: web/src/tools/messages.ts (2420 characters)
- part 1: web/src/tools/pages.test.ts (12223 characters)
- part 1: web/src/tools/pages.ts (4636 characters)
- part 1: web/src/tools/policies.test.ts (6185 characters)
- part 1: web/src/tools/policies.ts (6537 characters)
- part 1: web/src/tools/PoliciesPage.tsx (4691 characters)
- part 1: openspec/changes/add-web-grants-fix-1/proposal.md (1093 characters)
- part 2: web/src/tools/servers.test.ts (13951 characters)
- part 2: web/src/tools/servers.ts (14224 characters)
- part 2: web/src/tools/ServersPage.tsx (9264 characters)
- part 2: web/src/tools/states.test.ts (5796 characters)
- part 2: openspec/changes/add-web-grants-fix-1/tasks.md (322 characters)
- part 2: openspec/changes/add-web-grants/tasks.md (7445 characters)
- part 2: web/src/tools/tools.css (1637 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/features/64-admin-tool-servers.tsx, web/src/features/65-admin-grants.tsx, web/src/features/66-admin-policies.tsx, web/src/tools/GrantsPage.tsx, web/src/tools/PoliciesPage.tsx (+13 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2361 of 2361 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6_tool_pages.py kept at head for the run (people changed it last (bd4fe3ffee, 921e00fd95))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-debfaec1 | web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed | covered | web.src.tools.servers.test.ts::C-debfaec1 RAW parses to VIEW and stays unchanged (passed, red_assertion); web.src.tools.servers.test.ts::C-debfaec1 a drifted server shows the pending surface's tools only (passed, red_assertion); web.src.tools.servers.test.ts::C-debfaec1 a list item and a surface tha... | - | - | - |
| C-464ddcf9 | web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter | covered | web.src.tools.servers.test.ts::C-464ddcf9 another submitter, a drift and an unknown submitter are allowed (passed, red_assertion); web.src.tools.servers.test.ts::C-464ddcf9 nothing pending cannot be approved in either profile (passed, red_assertion); web.src.tools.servers.test.ts::C-464ddcf9 the sub... | - | 0.90 | - |
| C-4f5443ee | web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts | covered | web.src.tools.approve.test.ts::C-4f5443ee approveDialog names the short digest and is null with nothing pending (passed, red_assertion); web.src.tools.approve.test.ts::C-4f5443ee approveFailure carries ownSurface and reload for the four approval reasons (passed, red_assertion); web.src.tools.approve... | - | - | - |
| C-228ef9c6 | web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items | covered | web.src.tools.grants.test.ts::C-228ef9c6 GRANT_DONE holds the three outcome texts (passed, red_assertion); web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the longest role (passed, red_assertion); web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read... | - | - | - |
| C-35974302 | web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields | covered | web.src.tools.grants.test.ts::C-35974302 grantBody builds the role body and ignores flow and step for any step (passed, red_assertion); web.src.tools.grants.test.ts::C-35974302 grantBody refuses a blank or malformed subject (passed, red_assertion); web.src.tools.grants.test.ts::C-35974302 grantBody ... | - | 0.89 | `e2e/test_l4_c_35974302.py`, `test-results/test-l4-c-35974302-py-test-grant-body-rows-accepted-chromium-role-ops-role-acme-lookup-vendor-999999999-any-step/test-failed-1.png`, `test-results/test-l4-c-35974302-py-test-grant-body-rows-accepted-chromium-role-ops-role-acme-lookup-vendor-999999999-any-st... |
| C-4c2144fe | web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states | covered | web.src.tools.states.test.ts::C-4c2144fe actionState maps the idle busy done and failed rows (passed, red_assertion); web.src.tools.states.test.ts::C-4c2144fe an unknown action phase and an empty text are RangeErrors (passed, red_assertion); web.src.tools.states.test.ts::C-4c2144fe an unknown region... | - | 0.92 | - |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | covered | web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server (passed, red_assertion); web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id (passed, red_assertion); web.src.tools.calls.test.ts::C-78ea404d confir... | - | - | `e2e/test_l4_c_78ea404d.py`, `test-results/test-l4-c-78ea404d-py-test-calls-use-right-routes-and-headers-and-refuse-unreadable-answers-chromium/test-failed-1.png`, `test-results/test-l4-c-78ea404d-py-test-calls-use-right-routes-and-headers-and-refuse-unreadable-answers-chromium/trace.zip`, `.l4-out/... |
| C-985ca634 | web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts | covered | web.src.tools.policies.test.ts::C-985ca634 checkPolicySource counts code points (passed, red_assertion); web.src.tools.policies.test.ts::C-985ca634 parsePolicyView reads the current policy and the pending count (passed, red_assertion); web.src.tools.policies.test.ts::C-985ca634 parsePolicyView refus... | - | 0.92 | `e2e/test_l4_c_985ca634.py`, `test-results/test-l4-c-985ca634-py-test-policy-texts-and-deploy-source-limits-chromium/test-failed-1.png`, `test-results/test-l4-c-985ca634-py-test-policy-texts-and-deploy-source-limits-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-ba990588 | web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources | covered | web.src.tools.pages.test.ts::C-ba990588 serverLink and serverIdFromSearch follow the id pattern (passed, red_assertion); web.src.tools.pages.test.ts::C-ba990588 the pages use the kit components, their names and the page tokens (passed, red_assertion); web.src.tools.pages.test.ts::C-ba990588 the tool... | - | 0.90 | - |
| C-a7f551fc | web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation | covered | web.src.tools.pages.test.ts::C-a7f551fc the feature files declare the tool pages and register the messages (passed, red_assertion); web.src.tools.pages.test.ts::C-a7f551fc the navigation is gated by the tool capabilities (passed, red_assertion) | - | 0.93 | - |
| C-95a4662e | web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved | uncovered | - | test_m6_tool_pages::test_c_95a4662e_server_detail_states_and_approval[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.20 | `e2e/test_l4_c_95a4662e.py`, `test-results/test-l4-c-95a4662e-py-test-server-detail-loads-fails-refused-then-approved-chromium/test-failed-1.png`, `test-results/test-l4-c-95a4662e-py-test-server-detail-loads-fails-refused-then-approved-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-39cb580c | web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter | uncovered | - | test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.12 | `e2e/test_l4_c_39cb580c.py`, `.l4-out/e2e/page.html` |
| C-5f4e5a5b | web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads | uncovered | - | test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.09 | - |
| C-90aeb5ab | web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys | uncovered | - | test_m6_tool_pages::test_c_90aeb5ab_policy_loads_validates_and_deploys[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.13 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6_tool_pages.py` |  | relevant | new test file |
| `openspec/changes/add-web-grants-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/ledger/r-20261112T0622Z-be37.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/ledger/r-20261112T0837Z-065a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/ledger/r-20261112T1109Z-48ea.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/ledger/r-20261112T1334Z-f2e1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/ledger/r-20261112T1551Z-b1f1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/ledger/r-20261112T1731Z-c880.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/.l4/ledger/r-20261112T1731Z-d374.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-grants/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/features/64-admin-tool-servers.tsx` | web | relevant | module `web` is named in the spec |
| `web/src/features/65-admin-grants.tsx` | web | relevant | module `web` is named in the spec |
| `web/src/features/66-admin-policies.tsx` | web | relevant | module `web` is named in the spec |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/PoliciesPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/approve.test.ts` |  | relevant | new test file |
| `web/src/tools/calls.test.ts` |  | relevant | new test file |
| `web/src/tools/grants.test.ts` |  | relevant | new test file |
| `web/src/tools/grants.ts` | web | relevant | named in the spec |
| `web/src/tools/messages.ts` | web | relevant | named in the spec |
| `web/src/tools/pages.test.ts` |  | relevant | new test file |
| `web/src/tools/pages.ts` | web | relevant | named in the spec |
| `web/src/tools/policies.test.ts` |  | relevant | new test file |
| `web/src/tools/policies.ts` | web | relevant | named in the spec |
| `web/src/tools/servers.test.ts` |  | relevant | new test file |
| `web/src/tools/servers.ts` | web | relevant | named in the spec |
| `web/src/tools/states.test.ts` |  | relevant | new test file |
| `web/src/tools/tools.css` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/features/64-admin-tool-servers.tsx, web/src/features/65-admin-grants.tsx, web/src/features/66-admin-policies.tsx, web/src/tools/GrantsPage.tsx, web/src/tools/PoliciesPage.tsx and 6 more

### Tests

2499 of 2499 passed, 0 failed, 0 errored, 0 skipped.
78 of 78 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-debfaec1 | not_testable | - | - | - | 1 | This criterion targets internal parsing functions (parseToolServer, serverRowText, toolRows, stateNote) and asserts null for 23 malformed inputs plus exact plan-specified texts/rows from test-plan.md. Those malformed values are excluded from rendering and parseToolServer is not exposed through the p... | - |
| C-464ddcf9 | not_testable | - | - | - | 1 | The criterion asserts triples from an internal `approvalView` function over `test-plan.md` fixture rows; no user-observable page or endpoint exposes these triples, so they cannot be asserted through the public UI interface. | - |
| C-4f5443ee | not_testable | - | - | - | 1 | This criterion directly calls internal functions (approveRequest, approveDialog, approveFailure, toolsErrorMessage) on test-plan rows and asserts internal return values (selfApproval, ownSurface, reload) plus 13 error-reason texts, which are not observable or controllable through the public UI in an... | - |
| C-228ef9c6 | not_testable | - | - | - | 1 | The criterion asserts return values of internal functions (parseGrant, grantRowText, grantActions) — including `null` for the flat spread and each malformed value — which are not exposed through any page or HTTP interface observable from the browser. | - |
| C-35974302 | fails_at_head | e2e/test_l4_c_35974302.py | fail | fail | 2 | the test fails at the head: test_l4_c_35974302::test_grant_body_rows_accepted[chromium-role-ops-role-acme.lookup_vendor@999999999-any_step--], test_l4_c_35974302::test_grant_body_rows_accepted[chromium-role-ops-role-acme.lookup_vendor@999999999-any_step-not-a-flow-], test_l4_c_35974302::test_grant_b... | test-results/test-l4-c-35974302-py-test-grant-body-rows-accepted-chromium-role-ops-role-acme-lookup-vendor-999999999-any-step/test-failed-1.png, test-results/test-l4-c-35974302-py-test-grant-body-rows-accepted-chromium-role-ops-role-acme-lookup-vendor-999999999-any-step/trace.zip, test-results/test-... |
| C-4c2144fe | not_testable | - | - | - | 1 | The criterion asserts behavior of pure model functions (regionState, actionState, approveControl), including RangeError throws for unknown phase/empty text; these are not exposed through the browser UI/public interface, so they cannot be verified with a page E2E test against the origin. | - |
| C-78ea404d | fails_at_head | e2e/test_l4_c_78ea404d.py | fail | fail | 2 | the test fails at the head: test_l4_c_78ea404d::test_calls_use_right_routes_and_headers_and_refuse_unreadable_answers[chromium] | test-results/test-l4-c-78ea404d-py-test-calls-use-right-routes-and-headers-and-refuse-unreadable-answers-chromium/test-failed-1.png, test-results/test-l4-c-78ea404d-py-test-calls-use-right-routes-and-headers-and-refuse-unreadable-answers-chromium/trace.zip |
| C-985ca634 | fails_at_head | e2e/test_l4_c_985ca634.py | fail | fail | 2 | the test fails at the head: test_l4_c_985ca634::test_policy_texts_and_deploy_source_limits[chromium] | test-results/test-l4-c-985ca634-py-test-policy-texts-and-deploy-source-limits-chromium/test-failed-1.png, test-results/test-l4-c-985ca634-py-test-policy-texts-and-deploy-source-limits-chromium/trace.zip |
| C-ba990588 | not_testable | - | - | - | 1 | The criterion verifies source files (TSX/CSS) via unit-test helpers that read files directly (dataTableModel, serverLink, findRawColours, findInlineStyleUse, var(--…) token checks), which is not observable through the running app's public interface or a browser against L4_E2E_BASE_URL. | - |
| C-a7f551fc | not_testable | - | - | - | 1 | The criterion exercises internal module functions (featureLiterals, TOOL_PAGES registry, visibleNav) with constructed capability states (carol, alice, deploy_policy-only, null) that are not exposed through the running page's public interface; no auth mechanism is available via L4_E2E_BASE_URL to est... | - |
| C-95a4662e | fails_at_head | e2e/test_l4_c_95a4662e.py | fail | fail | 2 | the test fails at the head: test_l4_c_95a4662e::test_server_detail_loads_fails_refused_then_approved[chromium] | test-results/test-l4-c-95a4662e-py-test-server-detail-loads-fails-refused-then-approved-chromium/test-failed-1.png, test-results/test-l4-c-95a4662e-py-test-server-detail-loads-fails-refused-then-approved-chromium/trace.zip |
| C-39cb580c | writer_failed | e2e/test_l4_c_39cb580c.py | - | - | 2 | structured output missing: the reply holds no JSON object | - |
| C-5f4e5a5b | writer_failed | - | - | - | 1 | opencode's permission rules rejected a tool call (bash) | - |
| C-90aeb5ab | writer_failed | - | - | - | 1 | the stream ended without a final stop (last reason: length) | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-debfaec1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-464ddcf9 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f5443ee | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-228ef9c6 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-35974302 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c2144fe | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78ea404d | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-985ca634 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ba990588 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a7f551fc | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95a4662e | ok | 0.200 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39cb580c | ok | 0.120 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f4e5a5b | ok | 0.090 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-90aeb5ab | ok | 0.130 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-a7f551fc | skipped | - | - | cap |
| C-4f5443ee | not_testable | - | - | The only shown source is design.md, a design document for TypeScript frontend code; it defines no Python module path, importable function, or signature for approveRequest/approveDialog/approveFailure/toolsErrorMessage, and test-plan.md § Approval requests rows are not provided. A self-contained pyte |
| C-228ef9c6 | rejected | e2e/test_l4_audit_c_228ef9c6_r2.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_228ef9c6_r2.py |

## Rejected audit tests

- C-228ef9c6: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_228ef9c6_r2.py

## Answers to verdict questions

- Q-001 accept C-95a4662e by the delegate (claude-fable-5-1 via claude-code): The server detail page implements every step of the scenario. The approve handler returns at once while the detail loads or has failed, so the forced click opens no dialog and posts nothing. The pure models give the loading status, the alert and the pending tools with the plan's texts. A digest_mism...
- Q-002 accept C-39cb580c by the delegate (claude-fable-5-1 via claude-code): The link named the server id is a router Link to the in-page detail, so following it loads the detail once without a page load. The tick is cleared each time a detail loads, an unticked needed box makes the approve click show the Tick message as an alert without a dialog or request, and a self_appro...
- Q-003 accept C-5f4e5a5b by the delegate (claude-fable-5-1 via claude-code): The grants page implements the scenario. The 403 list error is shown by the table's ErrorPanel with the decision id; the form is busy while the tool list loads or has failed, so the submit handler returns and posts nothing; the select offers only bound refs. A refused create maps user_unknown to the...
- Q-004 accept C-90aeb5ab by the delegate (claude-fable-5-1 via claude-code): The policies page implements the scenario. Validate and Deploy return at once while the view loads or has failed, so the forced clicks post nothing. The texts come from the pure models: No policy deployed, the one-grant pending text, Not valid with the parse problem, Valid, the policy_invalid refusa...
- Q-005 accept H-ca42fb4d by the delegate (claude-fable-5-1 via claude-code): Criterion C-debfaec1 is about the pure parsing and text functions parseToolServer, serverRowText, toolRows and stateNote, which have no browser surface of their own: malformed answers never render, they make the list fail as a whole. The specification covers it with Node tests, and servers.test.ts t...
- Q-006 accept H-e57e62e0 by the delegate (claude-fable-5-1 via claude-code): Criterion C-464ddcf9 is about the pure function approvalView, whose triples are consumed by the page through approveControl and never shown as such. The specification assigns page behaviour to the last requirement, whose scenarios are proved by the browser tests of test_m6_tool_pages.py, and the des...
- Q-007 accept H-cb78452d by the delegate (claude-fable-5-1 via claude-code): Criterion C-4f5443ee is about approveRequest, approveDialog, approveFailure and toolsErrorMessage, pure functions whose return values the page turns into alerts, a dialog and a reload. approve.test.ts traces the criterion with tests named by its id that cover every row of the test-plan: the Tick mes...
- Q-008 accept H-966b3c99 by the delegate (claude-fable-5-1 via claude-code): Criterion C-228ef9c6 is about parseGrant, grantRowText and grantActions, pure functions with no browser surface of their own: a malformed item makes the whole list fail through cursorPageFetcher rather than render. grants.test.ts traces the criterion with tests named by its id that check each table ...
- Q-009 accept H-43d41b0f by the delegate (claude-fable-5-1 via claude-code): Criterion C-35974302 is about grantBody, a pure function over drafts. grants.test.ts traces it with tests named by its id that cover every row of the test-plan grantBody table: the role, user and node bodies, the ignored flow under any step, the boundary tool acme.lookup_vendor@999999999 accepted an...
- Q-010 accept H-ec30fde7 by the delegate (claude-fable-5-1 via claude-code): Criterion C-4c2144fe is about regionState, actionState and approveControl, the pure page-state models, including RangeError for an unknown phase or an empty text that no page can trigger. states.test.ts traces the criterion with tests named by its id that cover every row of test-plan Page states: th...
- Q-011 accept H-95489d0f by the delegate (claude-fable-5-1 via claude-code): Criterion C-78ea404d is the scenario Calls of the three pages, which runs the nine call functions against a recording fake and checks their paths, bodies, headers, RangeError rejections and INVALID_RESPONSE rejections. Those are module functions with no browser surface of their own: a ten-page curso...
- Q-012 accept H-d38f4f7c by the delegate (claude-fable-5-1 via claude-code): Criterion C-985ca634 is the scenario Policy views and texts, which runs parsePolicyView, validationText, deployText, currentText, pendingText, checkPolicySource and policyErrorText on the plan's values. These are pure functions: the 11 malformed answers never render, and a source of 65,536 code poin...
- Q-013 accept H-3848153d by the delegate (claude-fable-5-1 via claude-code): Criterion C-ba990588 is the scenario Names, tables, links and sources: it builds dataTableModel for the three tables, calls serverLink and serverIdFromSearch, and reads tools.css and the page files for raw colours, inline styles, dangerouslySetInnerHTML, kit tokens, kit components and the page token...
- Q-014 accept H-7723363f by the delegate (claude-fable-5-1 via claude-code): Criterion C-a7f551fc is the scenario Features and navigation: featureLiterals reads the three feature files, TOOL_PAGES is registered in a fresh registry and visibleNav runs for carol, alice, a deploy_policy-only state and null. These are checks on module constants and the shared capability gate wit...
- Q-015 accept H-161ae55b by the delegate (claude-fable-5-1 via claude-code): Criterion C-95a4662e does have an end-to-end test: the repository's browser test for the M6 tool pages is tagged with its id and follows test-plan-browser.md § Servers 1 step by step, asserting the Loading status, the alert, the aria-disabled forced clicks with no dialog and no post, the pending too...
- Q-016 accept H-dc200146 by the delegate (claude-fable-5-1 via claude-code): Criterion C-39cb580c does have an end-to-end test in the repository: the browser test for the M6 tool pages is tagged with its id and follows test-plan-browser.md § Servers 2 step by step. It makes the tenant solo, follows the link acme and asserts one detail request with no page load, the self-appr...
- Q-017 accept H-364e7bae by the delegate (claude-fable-5-1 via claude-code): Criterion C-5f4e5a5b does have an end-to-end test in the repository: the browser test for the M6 tool pages is tagged with its id and follows test-plan-browser.md § Grants 1 step by step. It asserts the 403 alert with the decision id, the select left on Choose a tool and the forced click posting not...
- Q-018 accept H-fca42b7c by the delegate (claude-fable-5-1 via claude-code): Criterion C-90aeb5ab does have an end-to-end test in the repository: the browser test for the M6 tool pages is tagged with its id and follows test-plan-browser.md § Policies step by step. It asserts the Loading status and then the alert with both buttons aria-disabled and the forced clicks posting n...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-debfaec1 | web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed | pass | pass | the judge passed it and a discriminating test passes |
| C-464ddcf9 | web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter | pass | pass | the judge passed it and a discriminating test passes |
| C-4f5443ee | web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 3 files of those parts together and answered pass |
| C-228ef9c6 | web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items | pass | pass | the judge passed it and a discriminating test passes |
| C-35974302 | web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields | pass | pass | the judge passed it and a discriminating test passes |
| C-4c2144fe | web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states | pass | pass | the judge passed it and a discriminating test passes |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 4 files of those parts together and answered pass |
| C-985ca634 | web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts | pass | pass | the judge passed it and a discriminating test passes |
| C-ba990588 | web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources | pass | pass | the judge passed it and a discriminating test passes |
| C-a7f551fc | web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation | pass | pass | the judge passed it and a discriminating test passes |
| C-95a4662e | web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The server detail page implements every step of the scenario. The approve handler returns at once while the detail loads or has failed, so the forced click opens no dialog and posts nothing. The pure models give the loading status, the ale... |
| C-39cb580c | web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The link named the server id is a router Link to the in-page detail, so following it loads the detail once without a page load. The tick is cleared each time a detail loads, an unticked needed box makes the approve click show the Tick mess... |
| C-5f4e5a5b | web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The grants page implements the scenario. The 403 list error is shown by the table's ErrorPanel with the decision id; the form is busy while the tool list loads or has failed, so the submit handler returns and posts nothing; the select offe... |
| C-90aeb5ab | web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The policies page implements the scenario. Validate and Deploy return at once while the view loads or has failed, so the forced clicks post nothing. The texts come from the pure models: No policy deployed, the one-grant pending text, Not v... |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-95a4662e): test_m6_tool_pages::test_c_95a4662e_server_detail_states_and_approval[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-39cb580c): test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5f4e5a5b): test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-90aeb5ab): test_m6_tool_pages::test_c_90aeb5ab_policy_loads_validates_and_deploys[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-228ef9c6): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_228ef9c6_r2.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-debfaec1): No end-to-end test traces criterion C-debfaec1 (web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-464ddcf9): No end-to-end test traces criterion C-464ddcf9 (web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4f5443ee): No end-to-end test traces criterion C-4f5443ee (web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-228ef9c6): No end-to-end test traces criterion C-228ef9c6 (web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-35974302): No end-to-end test traces criterion C-35974302 (web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4c2144fe): No end-to-end test traces criterion C-4c2144fe (web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-78ea404d): No end-to-end test traces criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-985ca634): No end-to-end test traces criterion C-985ca634 (web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ba990588): No end-to-end test traces criterion C-ba990588 (web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a7f551fc): No end-to-end test traces criterion C-a7f551fc (web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-95a4662e): The end-to-end test test_m6_tool_pages::test_c_95a4662e_server_detail_states_and_approval[chromium] traces criterion C-95a4662e (web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-39cb580c): The end-to-end test test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval[chromium] traces criterion C-39cb580c (web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5f4e5a5b): The end-to-end test test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke[chromium] traces criterion C-5f4e5a5b (web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-90aeb5ab): The end-to-end test test_m6_tool_pages::test_c_90aeb5ab_policy_loads_validates_and_deploys[chromium] traces criterion C-90aeb5ab (web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] parseGrant node id length cap is not pinned by the spec (spec gap) (criterion C-228ef9c6): design.md § Parsing gives nodeId as `^[a-z][a-z0-9_]*$` with no maximum length, but grants.ts validates nodeId with matches(..., NODE, 1024), capping it at 1024 characters. test-plan.md § Grants malformed values do not pin a node-id length, so two reasonable implementations differ for over-long node ids.
- [minor, judge] parseGrant caps nodeId at 1024 characters though the spec sets no limit (spec gap) (criterion C-5f4e5a5b): design.md § Parsing gives nodeId the pattern ^[a-z][a-z0-9_]*$ with no maximum length, but web/src/tools/grants.ts validates nodeId with matches(scope["nodeId"], NODE, 1024); a valid node id longer than 1024 characters is unpinned and two reasonable implementations differ.
- [minor, judge] record tool with absent ref member is treated as malformed (spec gap) (criterion C-debfaec1): In parseRecordTools, when a record tool omits the `ref` member, member(item, "ref") returns undefined and the check `ref !== null && (...)` treats undefined as malformed, returning null for the whole server. The spec describes record tools as `{ name, effect, ref }` with `ref` null or a pattern-matched string, but does not state whether an absent `ref` defaults to null or makes the item malformed; two reasonable implementations differ.

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.approve.test.ts::C-4f5443ee approveDialog names the short digest and is null with nothing pending` (task 1.2): passed
- `web.src.tools.approve.test.ts::C-4f5443ee approveFailure carries ownSurface and reload for the four approval reasons` (task 1.2): passed
- `web.src.tools.approve.test.ts::C-4f5443ee approveFailure falls back to the kit text for other errors` (task 1.2): passed
- `web.src.tools.approve.test.ts::C-4f5443ee approveRequest asks for the tick of a surface the approver submitted` (task 1.2): passed
- `web.src.tools.approve.test.ts::C-4f5443ee approveRequest refuses with the approvalView message` (task 1.2): passed
- `web.src.tools.approve.test.ts::C-4f5443ee approveRequest with an unknown submitter shows the box only for an own surface` (task 1.2): passed
- `web.src.tools.approve.test.ts::C-4f5443ee ownBoxShown is selfApproval or ownSurface` (task 1.2): passed
- `web.src.tools.approve.test.ts::C-4f5443ee toolsErrorMessage gives each of the 13 reasons its text` (task 1.2): passed
- `web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d confirmGrantById posts an empty body and resolves with nothing` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d deployPolicy posts the source under the key and returns the version` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d loadPolicy gets the view and refuses an unreadable answer` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d loadToolRefs refuses an unreadable item` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d loadToolRefs stops after ten pages without failing` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d loadToolServer gets the server and reads the view` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d loadToolServer passes the signal and refuses what it cannot read` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d postGrant posts the body under the key and returns the id` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d postGrant refuses a bad draft, a blank key and unreadable answers` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d revokeGrantById deletes the grant and resolves with nothing` (task 4.1): passed
- `web.src.tools.calls.test.ts::C-78ea404d validatePolicy posts the source and returns ok and problems` (task 4.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 GRANT_DONE holds the three outcome texts` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the longest role` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the longest user id` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the needs_reconfirm node grant` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the revoked grant` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the user any-step grant` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 parseGrant gives null for each of the malformed items and the flat record` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 parseGrant ignores other members and leaves its input unchanged` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 parseGrant reads the longest role into its view` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 parseGrant reads the longest user id into its view` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 parseGrant reads the needs_reconfirm node grant into its view` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 parseGrant reads the revoked grant into its view` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-228ef9c6 parseGrant reads the user any-step grant into its view` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-35974302 grantBody builds the role body and ignores flow and step for any step` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-35974302 grantBody refuses a blank or malformed subject` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-35974302 grantBody refuses a malformed flow or step for one step` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-35974302 grantBody refuses a missing or malformed tool and keeps the stored-tool bound` (task 2.1): passed
- `web.src.tools.grants.test.ts::C-35974302 grantBody trims a user and builds a node scope` (task 2.1): passed
- `web.src.tools.pages.test.ts::C-a7f551fc the feature files declare the tool pages and register the messages` (task 5.1): passed
- `web.src.tools.pages.test.ts::C-a7f551fc the navigation is gated by the tool capabilities` (task 5.1): passed
- `web.src.tools.pages.test.ts::C-ba990588 serverLink and serverIdFromSearch follow the id pattern` (task 5.1): passed
- `web.src.tools.pages.test.ts::C-ba990588 the pages use the kit components, their names and the page tokens` (task 5.1): passed
- `web.src.tools.pages.test.ts::C-ba990588 the tool pages, titles, tables and names are fixed` (task 5.1): passed
- `web.src.tools.pages.test.ts::C-ba990588 the tools stylesheet uses kit tokens and no raw colour or inline style` (task 5.1): passed
- `web.src.tools.policies.test.ts::C-985ca634 checkPolicySource counts code points` (task 3.1): passed
- `web.src.tools.policies.test.ts::C-985ca634 parsePolicyView reads the current policy and the pending count` (task 3.1): passed
- `web.src.tools.policies.test.ts::C-985ca634 parsePolicyView refuses the 11 malformed values` (task 3.1): passed
- `web.src.tools.policies.test.ts::C-985ca634 policyErrorText gives the kit text for any other error` (task 3.1): passed

## Guard events

- guard.test_tamper: e2e/test_m6_tool_pages.py
- guard.test_tamper: e2e/test_m6_tool_pages.py
