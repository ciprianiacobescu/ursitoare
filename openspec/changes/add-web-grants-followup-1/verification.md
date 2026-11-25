# Verification: openspec:add-web-grants-followup-1: PASS (round 2)

traceability: 15/16 criteria covered by a discriminating test

- Base: `9ef19bf47eb30eb15074acceffb69eeaef0926e8`
- Head: `a92f1c8e52a41c01377b88b7a9dab58a0c3504a9`
- Implementer profiles: deepseek-free
- Judge: beam-judge, 1 call(s), prompt sha256 `5bb7c5e4509694d19709376438a7154345ab4604675d96e9b2e08941e6d49179`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared)
- Cost: $0.0509

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@9ef19bf47e as a92f1c8e52 (6 commits) |
| 1 | integrity | ok | 288.7 | 11 sub-checks; scope: 18 changed file(s) |
| 2 | build | ok | 35.2 |  |
| 3 | tests | ok | 482.8 |  |
| 4 | traceability | ok | 0.2 | 15/16 criteria covered |
| 4a | audit sampling | ok | 5.3 | 1 not_testable; support files at the base: 3 |
| 5 | ui test generation | ok | 9.7 | 1 not_testable; 1 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/tools/ServersPage.tsx, web/src/tools/servers.ts |
| 8 | s1 judge | ok | 0.9 | 13/16 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 84.6 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261125T1955Z-8d0c/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261125T1955Z-8d0c/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261125T1955Z-8d0c/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261125T1955Z-8d0c/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261125T1955Z-8d0c/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261125T1955Z-8d0c/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261125T1955Z-8d0c/010-e2e.log |

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
| pre-existing tests still pass | ok | 3108 of 3108 base tests pass on the unit's code with its 3 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-02e9d4e8 | web-tools › Server page says 'Pending surface .' when there is no pending surface — feedback FB-001 › Server page says 'Pending surface .' when there is no pending surface | covered | web.src.tools.servers.test.ts::C-02e9d4e8 pending server with no pending surface note names no digest (passed, red_assertion) | - | 0.93 | - |
| C-44e0e2c0 | web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery | covered | web.src.tools.servers-list-reload.test.ts::C-44e0e2c0 the server list is rebuilt on reload after approve replace and discovery (passed, red_assertion) | test_server_list_reload::test_approving_a_drifted_surface_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or generated record)); test_server_list_reload::test_approving_a_surface_reloads_the_server_list[chromium] (no proof that it discriminates (no red, audit or gene... | 0.93 | - |
| C-debfaec1 | web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed | covered | web.src.tools.servers.test.ts::C-debfaec1 RAW parses to VIEW and stays unchanged (passed, pass_to_pass); web.src.tools.servers.test.ts::C-debfaec1 a drifted server shows the pending surface's tools only (passed, pass_to_pass); web.src.tools.servers.test.ts::C-debfaec1 a list item and a surface that ... | - | - | - |
| C-464ddcf9 | web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter | covered | web.src.tools.servers.test.ts::C-464ddcf9 another submitter, a drift and an unknown submitter are allowed (passed, pass_to_pass); web.src.tools.servers.test.ts::C-464ddcf9 nothing pending cannot be approved in either profile (passed, pass_to_pass); web.src.tools.servers.test.ts::C-464ddcf9 the submi... | - | 0.91 | - |
| C-4f5443ee | web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts | covered | web.src.tools.approve.test.ts::C-4f5443ee approveDialog names the short digest and is null with nothing pending (passed, pass_to_pass); web.src.tools.approve.test.ts::C-4f5443ee approveFailure carries ownSurface and reload for the four approval reasons (passed, pass_to_pass); web.src.tools.approve.t... | - | - | - |
| C-228ef9c6 | web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items | covered | web.src.tools.grants.test.ts::C-228ef9c6 GRANT_DONE holds the three outcome texts (passed, pass_to_pass); web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read the longest role (passed, pass_to_pass); web.src.tools.grants.test.ts::C-228ef9c6 grantRowText and grantActions read t... | - | - | - |
| C-35974302 | web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields | covered | web.src.tools.grants.test.ts::C-35974302 grantBody builds the role body and ignores flow and step for any step (passed, pass_to_pass); web.src.tools.grants.test.ts::C-35974302 grantBody refuses a blank or malformed subject (passed, pass_to_pass); web.src.tools.grants.test.ts::C-35974302 grantBody re... | - | 0.68 | - |
| C-4c2144fe | web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states | covered | web.src.tools.states.test.ts::C-4c2144fe actionState maps the idle busy done and failed rows (passed, pass_to_pass); web.src.tools.states.test.ts::C-4c2144fe an unknown action phase and an empty text are RangeErrors (passed, pass_to_pass); web.src.tools.states.test.ts::C-4c2144fe an unknown region p... | - | 0.92 | - |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | uncovered | - | web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id (no proof that it discrimi... | 0.10 | - |
| C-985ca634 | web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts | covered | web.src.tools.policies.test.ts::C-985ca634 checkPolicySource counts code points (passed, pass_to_pass); web.src.tools.policies.test.ts::C-985ca634 parsePolicyView reads the current policy and the pending count (passed, pass_to_pass); web.src.tools.policies.test.ts::C-985ca634 parsePolicyView refuses... | - | 0.91 | - |
| C-ba990588 | web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources | covered | web.src.tools.pages.test.ts::C-ba990588 serverLink and serverIdFromSearch follow the id pattern (passed, pass_to_pass); web.src.tools.pages.test.ts::C-ba990588 the pages use the kit components, their names and the page tokens (passed, pass_to_pass); web.src.tools.pages.test.ts::C-ba990588 the tool p... | - | 0.88 | - |
| C-a7f551fc | web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation | covered | web.src.tools.pages.test.ts::C-a7f551fc the feature files declare the tool pages and register the messages (passed, pass_to_pass); web.src.tools.pages.test.ts::C-a7f551fc the navigation is gated by the tool capabilities (passed, pass_to_pass) | - | 0.90 | - |
| C-95a4662e | web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved | covered | test_m6_tool_pages::test_c_95a4662e_server_detail_states_and_approval[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-39cb580c | web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter | covered | test_m6_tool_pages::test_c_39cb580c_server_link_and_self_approval[chromium] (passed, pass_to_pass) | - | 0.87 | - |
| C-5f4e5a5b | web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads | covered | test_m6_tool_pages::test_c_5f4e5a5b_grant_create_confirm_and_revoke[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-90aeb5ab | web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys | covered | test_m6_tool_pages::test_c_90aeb5ab_policy_loads_validates_and_deploys[chromium] (passed, pass_to_pass) | - | 0.73 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/tools/ServersPage.tsx, web/src/tools/servers.ts

### Tests

3246 of 3246 passed, 0 failed, 0 errored, 0 skipped.
6 of 6 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-44e0e2c0 | waived | - | - | - | 0 | waived by Q-001 | - |
| C-debfaec1 | waived | - | - | - | 0 | waived by Q-003 | - |
| C-464ddcf9 | waived | - | - | - | 0 | waived by Q-004 | - |
| C-4f5443ee | waived | - | - | - | 0 | waived by Q-005 | - |
| C-228ef9c6 | waived | - | - | - | 0 | waived by Q-006 | - |
| C-35974302 | waived | - | - | - | 0 | waived by Q-007 | - |
| C-4c2144fe | waived | - | - | - | 0 | waived by Q-008 | - |
| C-78ea404d | waived | - | - | - | 0 | waived by Q-009 | - |
| C-985ca634 | waived | - | - | - | 0 | waived by Q-010 | - |
| C-ba990588 | waived | - | - | - | 0 | waived by Q-011 | - |
| C-a7f551fc | waived | - | - | - | 0 | waived by Q-012 | - |
| C-02e9d4e8 | not_testable | - | - | - | 1 | The shown e2e support files don't say how to get a pending MCP server with no pending surface, or which route and controls reach its Surface card; a browser test would be guesswork.; covered by step 4: web.src.tools.servers.test.ts::C-02e9d4e8 pending server with no pending surface note names no dig... | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-02e9d4e8 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-44e0e2c0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-debfaec1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-464ddcf9 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f5443ee | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-228ef9c6 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-35974302 | ok | 0.680 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4c2144fe | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78ea404d | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-985ca634 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ba990588 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a7f551fc | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-95a4662e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-39cb580c | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5f4e5a5b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-90aeb5ab | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-02e9d4e8 | not_testable | - | - | The behaviour lives in TypeScript web code (web/src/tools/servers.ts); there is no Python module for a pytest test to import. |

## Answers to verdict questions

- Q-001 accept C-44e0e2c0 by agent (CLAUDECODE): Evidence (delegate, 2026-11-25): e2e/test_server_list_reload.py's four browser tests ran through the CI e2e build and stack in a node:24 container. At this unit's head 5ff290b3 they passed 4/4 in each of three runs. At base 35a0d283, with only the test file added, they failed 4/4, each at its first ...
- Q-002 accept C-78ea404d by agent (CLAUDECODE): This follow-up changes only stateNote's branch for a null pendingDigest (servers.ts, 3 lines, proved by its own Node test and C-02e9d4e8) and the server list's useMemo dependency (ServersPage.tsx, 1 line, proved by the browser evidence for C-44e0e2c0). The calls of the three pages are untouched by i...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-02e9d4e8 | web-tools › Server page says 'Pending surface .' when there is no pending surface — feedback FB-001 › Server page says 'Pending surface .' when there is no pending surface | pass | pass | the judge passed it and a discriminating test passes |
| C-44e0e2c0 | web-tools › Server list keeps the old state after approve, replace or discovery — feedback FB-002 › Server list keeps the old state after approve, replace or discovery | pass | pass | accepted by agent (CLAUDECODE): Evidence (delegate, 2026-11-25): e2e/test_server_list_reload.py's four browser tests ran through the CI e2e build and stack in a node:24 container. At this unit's head 5ff290b3 they passed 4/4 in each of three runs. At base 35a0d283, with only the test file added, the... |
| C-debfaec1 | web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed | pass | pass | the judge passed it and a discriminating test passes |
| C-464ddcf9 | web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter | pass | pass | the judge passed it and a discriminating test passes |
| C-4f5443ee | web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts | pass | pass | the judge passed it and a discriminating test passes |
| C-228ef9c6 | web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items | pass | pass | the judge passed it and a discriminating test passes |
| C-35974302 | web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields | pass | pass | the judge passed it and a discriminating test passes |
| C-4c2144fe | web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states | pass | pass | the judge passed it and a discriminating test passes |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | pass | pass | accepted by agent (CLAUDECODE): This follow-up changes only stateNote's branch for a null pendingDigest (servers.ts, 3 lines, proved by its own Node test and C-02e9d4e8) and the server list's useMemo dependency (ServersPage.tsx, 1 line, proved by the browser evidence for C-44e0e2c0). The calls of th... |
| C-985ca634 | web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts | pass | pass | the judge passed it and a discriminating test passes |
| C-ba990588 | web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources | pass | pass | the judge passed it and a discriminating test passes |
| C-a7f551fc | web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation | pass | pass | the judge passed it and a discriminating test passes |
| C-95a4662e | web-tools › The pages show the loading, failure and outcome states of the API's answers › The server detail loads, fails, is refused and is approved | pass | pass | the judge passed it and a discriminating test passes |
| C-39cb580c | web-tools › The pages show the loading, failure and outcome states of the API's answers › A server opened from its link is approved by its submitter | pass | pass | the judge passed it and a discriminating test passes |
| C-5f4e5a5b | web-tools › The pages show the loading, failure and outcome states of the API's answers › A grant is created, confirmed and revoked, and the table reloads | pass | pass | the judge passed it and a discriminating test passes |
| C-90aeb5ab | web-tools › The pages show the loading, failure and outcome states of the API's answers › The policy loads, validates and deploys | pass | pass | the judge passed it and a discriminating test passes |

## Findings

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
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-debfaec1): No end-to-end test traces criterion C-debfaec1 (web-tools › A tool server is parsed strictly, read as a row and explained by its state › Tool servers are parsed, ignored members stay out and the texts are fixed); waived by Q-003, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-464ddcf9): No end-to-end test traces criterion C-464ddcf9 (web-tools › Approval compares the approver with the pending surface's submitter under the tenant's review profile › Nothing pending, team, solo, drifted and an unknown submitter); waived by Q-004, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4f5443ee): No end-to-end test traces criterion C-4f5443ee (web-tools › An approval is requested explicitly and its refusals are explained › Requests, dialog and failure texts); waived by Q-005, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-228ef9c6): No end-to-end test traces criterion C-228ef9c6 (web-tools › A grant is parsed, read as a row and offers the actions its status allows › Each subject and scope, the list item and the malformed items); waived by Q-006, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-35974302): No end-to-end test traces criterion C-35974302 (web-tools › A grant draft becomes the API body or names the field to fix › Role, user and node drafts and the refused fields); waived by Q-007, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4c2144fe): No end-to-end test traces criterion C-4c2144fe (web-tools › Loading, failure, empty, busy and approve states are decided by pure models, not by the pages › Region, action and approve-control states); waived by Q-008, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-78ea404d): No end-to-end test traces criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages); waived by Q-009, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-985ca634): No end-to-end test traces criterion C-985ca634 (web-tools › The policy view, validation and deployment read as fixed texts › Policy views and texts); waived by Q-010, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ba990588): No end-to-end test traces criterion C-ba990588 (web-tools › The pages carry fixed names, tables and links and use kit components and tokens only › Names, tables, links and sources); waived by Q-011, step 5 generates none.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a7f551fc): No end-to-end test traces criterion C-a7f551fc (web-tools › Three feature files register the pages and gate the navigation by capability › Features and navigation); waived by Q-012, step 5 generates none.
- [minor, judge] Empty pending digest is not treated as absent (spec gap) (criterion C-02e9d4e8): stateNote only special-cases null, so a pending server whose pendingDigest is an empty string still renders 'Pending surface .'

## Feedback

- FB-001: addressed at a92f1c8e52: web/src/tools/servers.ts:239
- FB-002: addressed at a92f1c8e52: web/src/tools/ServersPage.tsx:88

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.servers-list-reload.test.ts::C-44e0e2c0 the server list is rebuilt on reload after approve replace and discovery` (task 1.2): passed
- `web.src.tools.servers.test.ts::C-02e9d4e8 pending server with no pending surface note names no digest` (task 1.1): passed
