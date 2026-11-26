# Verification: openspec:add-web-grants-followup-1: NEEDS_HUMAN (round 1)

traceability: 15/16 criteria covered by a discriminating test

- Base: `31968a291002a9374237c87d63d37d5ae3886670`
- Head: `9743e2805f21550caa8d95b3e3ecbf5fb613908e`
- Implementer profiles: deepseek-free
- Judge: nemotron-judge, 1 call(s), prompt sha256 `d5fc128cdc0fd2cc80a2aba7479035a36955751f0412692a7c23f24dc58ca774`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared)
- Cost: $0.3860

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@31968a2910 contained |
| 1 | integrity | ok | 1063.3 | 11 sub-checks; scope: 13 changed file(s) |
| 2 | build | ok | 41.8 |  |
| 3 | tests | ok | 572.5 |  |
| 4 | traceability | ok | 0.3 | 15/16 criteria covered |
| 4a | audit sampling | ok | 5.6 | 1 not_testable; support files at the base: 3 |
| 5 | ui test generation | ok | 143.2 | 12 not_testable; 2 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/tools/ServersPage.tsx, web/src/tools/servers.ts |
| 8 | s1 judge | ok | 1.0 | 13/16 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 159.3 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261125T1614Z-b933/047-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261125T1614Z-b933/048-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261125T1614Z-b933/049-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261125T1614Z-b933/050-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261125T1614Z-b933/051-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261125T1614Z-b933/052-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261125T1614Z-b933/053-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 2 task(s): red and green compared |
| test path freeze | ok | 2 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/tools/ServersPage.tsx, web/src/tools/servers-list-reload.test.ts, web/src/tools/servers.test.ts, web/src/tools/servers.ts |
| tdd history | ok | 2 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3103 of 3103 base tests pass on the unit's code with its 3 test and support files at the base (base: base worktree) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-02e9d4e8 | web-tools › Server page says 'Pending surface .' when there is no pending surface — feedback FB-001 › Server page says 'Pending surface .' when there is no pending surface | covered | web.src.tools.servers.test.ts::C-02e9d4e8 pending server with no pending surface note names no digest (passed, red_assertion) | - | 0.93 | - |
| C-44e0e2c0 | web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery | covered | web.src.tools.servers-list-reload.test.ts::C-44e0e2c0 the server list is rebuilt on reload after approve replace and discovery (passed, red_assertion, inadequate) | test_server_list_reload::test_approving_a_drifted_surface_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or generated record)); test_server_list_reload::test_approving_a_surface_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or gene... | 0.93 | `e2e/test_l4_c_44e0e2c0.py`, `.l4-out/e2e/page.html` |
| C-debfaec1 | web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed | covered | web.src.tools.servers.test.ts::C-debfaec1 RAW parses to VIEW and stays unchanged (passed, pass_to_pass); web.src.tools.servers.test.ts::C-debfaec1 a drifted server shows the pending surface's tools only (passed, pass_to_pass); web.src.tools.servers.test.ts::C-debfaec1 a list item and a surface that ... | - | - | - |
| C-464ddcf9 | web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter | covered | web.src.tools.servers.test.ts::C-464ddcf9 another submitter, a drift and an unknown submitter are allowed (passed, pass_to_pass); web.src.tools.servers.test.ts::C-464ddcf9 nothing pending cannot be approved in either profile (passed, pass_to_pass); web.src.tools.servers.test.ts::C-464ddcf9 the submi... | - | 0.91 | - |
| C-4f5443ee | web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts | covered | web.src.tools.approve.test.ts::C-4f5443ee approveDialog names the short digest and is null with nothing pending (passed, pass_to_pass); web.src.tools.approve.test.ts::C-4f5443ee approveFailure carries ownSurface and reload for the four approval reasons (passed, pass_to_pass); web.src.tools.approve.t... | - | - | - |
| C-228ef9c6 | web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items | covered | web.src.tools.grants.test.ts::C-228ef9c6 GRANT_DONE holds the three outcome texts (passed, pass_to_pass); web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the longest role (passed, pass_to_pass); web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read t... | - | - | - |
| C-35974302 | web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields | covered | web.src.tools.grants.test.ts::C-35974302 grantBody builds the role body and ignores flow and step for any step (passed, pass_to_pass); web.src.tools.grants.test.ts::C-35974302 grantBody refuses a blank or malformed subject (passed, pass_to_pass); web.src.tools.grants.test.ts::C-35974302 grantBody re... | - | 0.65 | - |
| C-4c2144fe | web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states | covered | web.src.tools.states.test.ts::C-4c2144fe actionState maps the idle busy done and failed rows (passed, pass_to_pass); web.src.tools.states.test.ts::C-4c2144fe an unknown action phase and an empty text are RangeErrors (passed, pass_to_pass); web.src.tools.states.test.ts::C-4c2144fe an unknown region p... | - | 0.92 | - |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | uncovered | - | web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id (no proof that it discrimi... | 0.10 | - |
| C-985ca634 | web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts | covered | web.src.tools.policies.test.ts::C-985ca634 checkPolicySource counts code points (passed, pass_to_pass); web.src.tools.policies.test.ts::C-985ca634 parsePolicyView reads the current policy and the pending count (passed, pass_to_pass); web.src.tools.policies.test.ts::C-985ca634 parsePolicyView refuses... | - | 0.92 | - |
| C-ba990588 | web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources | covered | web.src.tools.pages.test.ts::C-ba990588 serverLink and serverIdFromSearch follow the id pattern (passed, pass_to_pass); web.src.tools.pages.test.ts::C-ba990588 the pages use the kit components, their names and the page tokens (passed, pass_to_pass); web.src.tools.pages.test.ts::C-ba990588 the tool p... | - | 0.89 | - |
| C-a7f551fc | web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation | covered | web.src.tools.pages.test.ts::C-a7f551fc the feature files declare the tool pages and register the messages (passed, pass_to_pass); web.src.tools.pages.test.ts::C-a7f551fc the navigation is gated by the tool capabilities (passed, pass_to_pass) | - | 0.91 | - |
| C-95a4662e | web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved | covered | test_m6_tool_pages::test_c_95a4662e_server_detail_states_and_approval[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-39cb580c | web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter | covered | test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval[chromium] (passed, pass_to_pass) | - | 0.86 | - |
| C-5f4e5a5b | web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads | covered | test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke[chromium] (passed, pass_to_pass) | - | 0.90 | - |
| C-90aeb5ab | web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys | covered | test_m6_tool_pages::test_c_90aeb5ab_policy_loads_validates_and_deploys[chromium] (passed, pass_to_pass) | - | 0.70 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/tools/ServersPage.tsx, web/src/tools/servers.ts

### Tests

3242 of 3242 passed, 0 failed, 0 errored, 0 skipped.
6 of 6 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-02e9d4e8 | not_testable | - | - | - | 1 | The e2e support files don't show how to get a pending server with no pending surface into the fake stack, and the servers page route and registration form are unknown. The state-note wording is already covered by the unit test.; covered by step 4: web.src.tools.servers.test.ts::C-02e9d4e8 pending se... | - |
| C-44e0e2c0 | not_testable | e2e/test_l4_c_44e0e2c0.py | - | - | 2 | The page route, seeded tool servers and the server row's accessible markup aren't visible from the supplied support files, so a reliable browser test can't be written.; covered by step 4: web.src.tools.servers-list-reload.test.ts::C-44e0e2c0 the server list is rebuilt on reload after approve replace... | - |
| C-debfaec1 | not_testable | - | - | - | 1 | Criterion is about pure functions (parseToolServer, serverRowText, toolRows, stateNote) with fixed fixtures from a test plan; not reachable through the browser UI, so a unit test fits, not e2e. | - |
| C-464ddcf9 | not_testable | - | - | - | 1 | The criterion specifies a pure function (approvalView) over a table of rows in test-plan.md; it exposes no browser-observable behaviour that an e2e test can drive, so it's covered by unit tests. | - |
| C-4f5443ee | not_testable | - | - | - | 1 | Criterion concerns pure functions (approveRequest, approveDialog, approveFailure, toolsErrorMessage) over test-plan rows; not observable through the browser UI. | - |
| C-228ef9c6 | not_testable | - | - | - | 1 | Criterion concerns pure functions (parseGrant, grantRowText, grantActions, GRANT_DONE) tested by unit tests; no browser-observable behavior or public UI path to exercise them. | - |
| C-35974302 | not_testable | - | - | - | 1 | grantBody is a pure function over a test-plan table with no UI the browser can reach; it is covered by unit tests, not an e2e flow. | - |
| C-4c2144fe | not_testable | - | - | - | 1 | Criterion is about pure TypeScript model functions (regionState, actionState, approveControl) checked against a test-plan table; no browser-observable interface, so it belongs in unit tests, not e2e. | - |
| C-78ea404d | not_testable | - | - | - | 1 | Criterion concerns pure client-library calls (routes, headers, recorded requests) run against a recording fake; no user-visible browser behaviour to check. | - |
| C-985ca634 | not_testable | - | - | - | 1 | Pure-function unit behaviour (parsePolicyView, texts, checkPolicySource) on test-plan values; no user-visible browser flow is named, so e2e cannot check it. | - |
| C-ba990588 | not_testable | - | - | - | 1 | Criterion checks source files, CSS and unit-level helpers (dataTableModel, findRawColours) in a node test, not browser-observable behaviour. | - |
| C-a7f551fc | not_testable | - | - | - | 1 | Criterion checks source-file literals, a fresh registry and the visibleNav function directly (unit-level); no distinct browser-observable behavior is specified. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-02e9d4e8 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-44e0e2c0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-debfaec1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-464ddcf9 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f5443ee | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-228ef9c6 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-35974302 | ok | 0.650 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c2144fe | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78ea404d | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-985ca634 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ba990588 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a7f551fc | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95a4662e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39cb580c | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f4e5a5b | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-90aeb5ab | ok | 0.700 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-02e9d4e8 | not_testable | - | - | The behaviour lives in TypeScript/React web code (web/src/tools/servers.ts); no Python module or public interface is shown to import and call from pytest. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-02e9d4e8 | web-tools › Server page says 'Pending surface .' when there is no pending surface — feedback FB-001 › Server page says 'Pending surface .' when there is no pending surface | pass | pass | the judge passed it and a discriminating test passes |
| C-44e0e2c0 | web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-debfaec1 | web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed | pass | pass | the judge passed it and a discriminating test passes |
| C-464ddcf9 | web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter | pass | pass | the judge passed it and a discriminating test passes |
| C-4f5443ee | web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts | pass | pass | the judge passed it and a discriminating test passes |
| C-228ef9c6 | web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items | pass | pass | the judge passed it and a discriminating test passes |
| C-35974302 | web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields | pass | pass | the judge passed it and a discriminating test passes |
| C-4c2144fe | web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states | pass | pass | the judge passed it and a discriminating test passes |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-985ca634 | web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts | pass | pass | the judge passed it and a discriminating test passes |
| C-ba990588 | web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources | pass | pass | the judge passed it and a discriminating test passes |
| C-a7f551fc | web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation | pass | pass | the judge passed it and a discriminating test passes |
| C-95a4662e | web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved | pass | pass | the judge passed it and a discriminating test passes |
| C-39cb580c | web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter | pass | pass | the judge passed it and a discriminating test passes |
| C-5f4e5a5b | web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads | pass | pass | the judge passed it and a discriminating test passes |
| C-90aeb5ab | web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a pre-existing test is flaky on the unit's code: test.support.e2e-stack.stack.durable.test.ts::C-7732f592 three resets under the live engine then the close
- [minor, deterministic] a test is ignored as evidence (criterion C-44e0e2c0): test_server_list_reload::test_approving_a_drifted_surface_reloads_the_server_list[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-44e0e2c0): test_server_list_reload::test_approving_a_surface_reloads_the_server_list[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-44e0e2c0): test_server_list_reload::test_discovering_tools_again_reloads_the_server_list[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-44e0e2c0): test_server_list_reload::test_replacing_a_document_reloads_the_server_list[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d confirmGrantById posts an empty body and resolves with nothing: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d deployPolicy posts the source under the key and returns the version: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadPolicy gets the view and refuses an unreadable answer: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolRefs refuses an unreadable item: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolRefs stops after ten pages without failing: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolServer gets the server and reads the view: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolServer passes the signal and refuses what it cannot read: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d postGrant posts the body under the key and returns the id: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d postGrant refuses a bad draft, a blank key and unreadable answers: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d revokeGrantById deletes the grant and resolves with nothing: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d validatePolicy posts the source and returns ok and problems: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-02e9d4e8): No end-to-end test traces criterion C-02e9d4e8 (web-tools › Server page says 'Pending surface .' when there is no pending surface — feedback FB-001 › Server page says 'Pending surface .' when there is no pending surface); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-44e0e2c0): The end-to-end test test_server_list_reload::test_approving_a_drifted_surface_reloads_the_server_list[chromium], test_server_list_reload::test_approving_a_surface_reloads_the_server_list[chromium], test_server_list_reload::test_discovering_tools_again_reloads_the_server_list[chromium] (+1 more) traces criterion C-44e0e2c0 (web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery), but it was never proved to fail without the change (no red, audit or generated record), so it is not evid...
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
- [minor, judge] pendingDigest empty string not pinned by FB-001 (spec gap) (criterion C-02e9d4e8): The spec pins pendingDigest === null ('No surface has been submitted yet.') but says nothing about pendingDigest being ''; shortDigest('') returns '' so the note would read 'Pending surface .' with nothing after the digest, and two reasonable implementations differ.
- [minor, judge] the judge called a test inadequate (criterion C-44e0e2c0): web.src.tools.servers-list-reload.test.ts::C-44e0e2c0 the server list is rebuilt on reload after approve replace and discovery

## Feedback

- FB-001: judged addressed, pending a PASS round: web/src/tools/servers.ts:239-241 — stateNote returns 'No surface has been submitted yet.' when pendingDigest is null, and the digest branch is unchanged.
- FB-002: judged addressed, pending a PASS round: web/src/tools/ServersPage.tsx:88 — the servers useMemo dependency changed from [] to [reloadKey], so the list rebuilds when approve/replace/discovery bump reloadKey.

## Needs a human

- UI criterion C-debfaec1 has no end-to-end test; see the generated UI tests table
- UI criterion C-464ddcf9 has no end-to-end test; see the generated UI tests table
- UI criterion C-4f5443ee has no end-to-end test; see the generated UI tests table
- UI criterion C-228ef9c6 has no end-to-end test; see the generated UI tests table
- UI criterion C-35974302 has no end-to-end test; see the generated UI tests table
- UI criterion C-4c2144fe has no end-to-end test; see the generated UI tests table
- UI criterion C-78ea404d has no end-to-end test; see the generated UI tests table
- UI criterion C-985ca634 has no end-to-end test; see the generated UI tests table
- UI criterion C-ba990588 has no end-to-end test; see the generated UI tests table
- UI criterion C-a7f551fc has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.servers-list-reload.test.ts::C-44e0e2c0 the server list is rebuilt on reload after approve replace and discovery` (task 1.2): passed
- `web.src.tools.servers.test.ts::C-02e9d4e8 pending server with no pending surface note names no digest` (task 1.1): passed
