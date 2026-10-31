# Verification: openspec:add-web-admin: PASS (round 3)

traceability: 21/25 criteria covered by a discriminating test

- Base: `5faa0e73adee6ed703f322d1ad372d3446ac8dab`
- Head: `4cfa77044c8809f414bfd756f95cf8fcad47a4db`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: nemotron-judge, 2 call(s), prompt sha256 `aeaace6dfcd8ab505dbdb9d92d9625e624edea488b86612d308a0eaa8f8dcaa9`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 0, discarded 1; this round: discarded
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
| 9 | judge | failed | 0.0 | schema_invalid: structured output invalid: riskiest_assumptions: more than 3 items |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261031T2122Z-2c12/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261031T2122Z-2c12/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261031T2122Z-2c12/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261031T2122Z-2c12/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261031T2122Z-2c12/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261031T2122Z-2c12/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261031T2122Z-2c12/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 9 task(s): red and green compared |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/m2-admin.test.ts, test/journeys/session.ts, web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx (+21 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 1092 of 1092 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-2c3410e3 | web-admin › Admin pages are listed by capability and declare literal paths › The page table | covered | web.src.admin.pages.test.ts::C-2c3410e3 the admin tables carry their captions columns and empty texts (passed, red_assertion); web.src.admin.pages.test.ts::C-2c3410e3 the page table lists the four admin pages in order (passed, red_assertion) | - | 0.90 | `e2e/test_l4_c_2c3410e3.py`, `test-results/test-l4-c-2c3410e3-py-test-admin-pages-declare-literal-paths-chromium-admin-audit-audit-log-captions3/test-failed-1.png`, `test-results/test-l4-c-2c3410e3-py-test-admin-pages-declare-literal-paths-chromium-admin-audit-audit-log-captions3/trace.zip`, `test-r... |
| C-7c7c77c3 | web-admin › Admin pages are listed by capability and declare literal paths › Navigation follows capabilities | covered | web.src.admin.pages.test.ts::C-7c7c77c3 the navigation follows capabilities (passed, red_assertion) | - | 0.92 | - |
| C-bf07943b | web-admin › Admin pages are listed by capability and declare literal paths › A feature file declares the table's literals | covered | web.src.admin.audit.test.ts::C-bf07943b the admin audit feature file declares its literal page entry (passed, red_assertion); web.src.admin.mappings.test.ts::C-bf07943b the group mappings feature file declares its literal page entry (passed, red_assertion); web.src.admin.pages.test.ts::C-bf07943b fe... | - | 0.85 | - |
| C-195c3385 | web-admin › Admin errors show catalogue text and the refusal's decision id › The codes and their texts | covered | web.src.admin.messages.test.ts::C-195c3385 the admin messages register their catalogue texts (passed, red_assertion) | - | 0.90 | - |
| C-0c949ead | web-admin › Admin errors show catalogue text and the refusal's decision id › Error text for an action | covered | web.src.admin.messages.test.ts::C-0c949ead an action error shows catalogue text and the decision id (passed, red_assertion) | - | 0.90 | `e2e/test_l4_c_0c949ead.py`, `.l4-out/e2e/page.html` |
| C-97244065 | web-admin › The Users page lists people and disables or enables them › Parsing an account | covered | web.src.admin.users.test.ts::C-97244065 parseAccount keeps a valid account and refuses malformed bodies (passed, red_assertion) | - | 0.90 | - |
| C-87e93809 | web-admin › The Users page lists people and disables or enables them › Cells and actions | covered | web.src.admin.users.test.ts::C-87e93809 a blank display name falls back to the user id and a missing email shows a dash (passed, red_assertion); web.src.admin.users.test.ts::C-87e93809 a long display name and many roles are cut by clip (passed, red_assertion); web.src.admin.users.test.ts::C-87e93809... | - | 0.93 | `e2e/test_l4_c_87e93809.py`, `test-results/test-l4-c-87e93809-py-test-users-cells-and-actions-chromium/test-failed-1.png`, `test-results/test-l4-c-87e93809-py-test-users-cells-and-actions-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-0c16ec24 | web-admin › The Users page lists people and disables or enables them › Setting a state | covered | web.src.admin.users.test.ts::C-0c16ec24 patchAccountState refuses a path-like user id before sending (passed, red_assertion); web.src.admin.users.test.ts::C-0c16ec24 patchAccountState sends the state and rejects an unreadable account (passed, red_assertion) | - | 0.90 | `e2e/test_l4_c_0c16ec24.py`, `.l4-out/e2e/page.html` |
| C-4bc159f4 | web-admin › The Roles and teams page lists roles and teams and creates or deletes a team › Names | covered | web.src.admin.teams.test.ts::C-4bc159f4 checkTeamId trims a name and explains what a team id may be (passed, red_assertion); web.src.admin.teams.test.ts::C-4bc159f4 parseNamed reads a role or team id and refuses a malformed one (passed, red_assertion) | - | 0.92 | `e2e/test_l4_c_4bc159f4.py`, `test-results/test-l4-c-4bc159f4-py-test-roles-and-teams-names-chromium/test-failed-1.png`, `test-results/test-l4-c-4bc159f4-py-test-roles-and-teams-names-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-c174064a | web-admin › The Roles and teams page lists roles and teams and creates or deletes a team › Creating and deleting | covered | web.src.admin.teams.test.ts::C-c174064a deleteTeamConfirm names the team and its consequence (passed, red_assertion); web.src.admin.teams.test.ts::C-c174064a postTeam refuses a bad team or key before sending (passed, red_assertion); web.src.admin.teams.test.ts::C-c174064a postTeam sends a keyed crea... | - | 0.89 | `e2e/test_l4_c_c174064a.py`, `test-results/test-l4-c-c174064a-py-test-creating-and-deleting-a-team-chromium/test-failed-1.png`, `test-results/test-l4-c-c174064a-py-test-creating-and-deleting-a-team-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-b8ae0992 | web-admin › The Group mappings page maps a group to one role or team › Parsing, showing and offering mappings | covered | web.src.admin.mappings.test.ts::C-b8ae0992 defaultIssuer picks the first issuer and the hint explains the field (passed, red_assertion); web.src.admin.mappings.test.ts::C-b8ae0992 grantOptions lists every role then every team (passed, red_assertion); web.src.admin.mappings.test.ts::C-b8ae0992 mappin... | - | 0.93 | - |
| C-5e078fd3 | web-admin › The Group mappings page maps a group to one role or team › Building the request | covered | web.src.admin.mappings.test.ts::C-5e078fd3 mappingRequest bounds the issuer and group texts (passed, red_assertion); web.src.admin.mappings.test.ts::C-5e078fd3 mappingRequest refuses a grant that is not offered (passed, red_assertion); web.src.admin.mappings.test.ts::C-5e078fd3 mappingRequest report... | - | 0.88 | `e2e/test_l4_c_5e078fd3.py`, `test-results/test-l4-c-5e078fd3-py-test-group-mapping-request-chromium/test-failed-1.png`, `test-results/test-l4-c-5e078fd3-py-test-group-mapping-request-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-741e5139 | web-admin › The Group mappings page maps a group to one role or team › Saving a mapping, reading every page | covered | web.src.admin.mappings.test.ts::C-741e5139 loadAllItems reads every page with a size of two hundred (passed, red_assertion); web.src.admin.mappings.test.ts::C-741e5139 loadAllItems stops after five pages (passed, red_assertion); web.src.admin.mappings.test.ts::C-741e5139 loadAllItems throws the erro... | - | 0.92 | - |
| C-8a1094e4 | web-admin › The Group mappings page maps a group to one role or team › A removal states the consequence | covered | web.src.admin.removal.test.ts::C-8a1094e4 removeMapping deletes by issuer and group on the group map path (passed, red_assertion); web.src.admin.removal.test.ts::C-8a1094e4 removeMappingConfirm cuts a long group name in the title (passed, red_assertion); web.src.admin.removal.test.ts::C-8a1094e4 rem... | - | 0.91 | `e2e/test_l4_c_8a1094e4.py`, `test-results/test-l4-c-8a1094e4-py-test-remove-mapping-confirm-states-consequence-chromium/test-failed-1.png`, `test-results/test-l4-c-8a1094e4-py-test-remove-mapping-confirm-states-consequence-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-71033976 | web-admin › The Audit log page lists events newest first and filters by event type › Parsing an event and its cells | covered | web.src.admin.audit.test.ts::C-71033976 a 300 character payload leaves 240 details characters ending in an ellipsis (passed, red_assertion); web.src.admin.audit.test.ts::C-71033976 auditCells shows seq time type actor target and details (passed, red_assertion); web.src.admin.audit.test.ts::C-7103397... | - | 0.86 | `e2e/test_l4_c_71033976.py`, `test-results/test-l4-c-71033976-py-test-audit-log-lists-events-newest-first-and-filters-by-event-type-chromium/test-failed-1.png`, `test-results/test-l4-c-71033976-py-test-audit-log-lists-events-newest-first-and-filters-by-event-type-chromium/trace.zip`, `.l4-out/e2e/pa... |
| C-1e5047ed | web-admin › The Audit log page lists events newest first and filters by event type › The event type filter | covered | web.src.admin.audit.test.ts::C-1e5047ed auditFetcher asks the audit path with the event type and the page limit (passed, red_assertion); web.src.admin.audit.test.ts::C-1e5047ed auditFetcher without a type asks only the page limit and refuses an unreadable event (passed, red_assertion); web.src.admin... | - | 0.92 | - |
| C-1d816fd1 | web-admin › The Audit log page shows whether the chain verifies › Parsing and loading a verification | covered | web.src.admin.verification.test.ts::C-1d816fd1 loadVerification asks the verify path and refuses an unreadable answer (passed, red_assertion); web.src.admin.verification.test.ts::C-1d816fd1 parseVerification keeps a valid verification and refuses malformed bodies (passed, red_assertion) | - | 0.93 | - |
| C-d2fc8f38 | web-admin › The Audit log page shows whether the chain verifies › Status text | covered | web.src.admin.verification.test.ts::C-d2fc8f38 verificationView names the broken chain and the unavailable check (passed, red_assertion); web.src.admin.verification.test.ts::C-d2fc8f38 verificationView names the checking and verified statuses (passed, red_assertion) | - | 0.94 | `e2e/test_l4_c_d2fc8f38.py`, `test-results/test-l4-c-d2fc8f38-py-test-audit-chain-verification-status-chromium/test-failed-1.png`, `test-results/test-l4-c-d2fc8f38-py-test-audit-chain-verification-status-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-52c26a32 | web-admin › Admin styles use the kit's tokens and no inline styles › The stylesheet and the sources | covered | web.src.admin.admin-css.test.ts::C-52c26a32 the admin stylesheet and sources follow the kit rules (passed, red_assertion) | - | 0.90 | - |
| C-dd02e61e | web-admin › The admin logic works against the real engine › Carol manages mappings and teams and reads the log | covered | test.journeys.m2-admin.test.ts::C-dd02e61e carol manages mappings and teams and reads the log (passed, red_assertion) | - | 0.93 | `e2e/test_l4_c_dd02e61e.py`, `.l4-out/e2e/page.html` |
| C-06a71640 | web-admin › The admin logic works against the real engine › Alice is refused, carol finds the id and disables her | covered | test.journeys.m2-admin.test.ts::C-06a71640 alice is refused and carol finds the id and disables her (passed, red_assertion) | - | 0.92 | `e2e/test_l4_c_06a71640.py`, `test-results/test-l4-c-06a71640-py-test-alice-refused-carol-disables-her-chromium/test-failed-1.png`, `test-results/test-l4-c-06a71640-py-test-alice-refused-carol-disables-her-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-f7bbb238 | web-admin › The M2 journey proves the admin screens in a browser › Carol maps a group and the log shows it verified | uncovered | - | test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.06 | `e2e/test_l4_c_f7bbb238.py`, `test-results/test-l4-c-f7bbb238-py-test-carol-maps-group-and-log-shows-verified-chromium/test-failed-1.png`, `test-results/test-l4-c-f7bbb238-py-test-carol-maps-group-and-log-shows-verified-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-652f54b7 | web-admin › The M2 journey proves the admin screens in a browser › Alice sees a 403 page with the decision id | uncovered | - | test_m2_admin::test_c_652f54b7_alice_sees_a_403_page_with_the_decision_id[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.04 | `e2e/test_l4_c_652f54b7.py`, `test-results/test-l4-c-652f54b7-py-test-alice-sees-403-with-decision-id-chromium/test-failed-1.png`, `test-results/test-l4-c-652f54b7-py-test-alice-sees-403-with-decision-id-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-d118ea9b | web-admin › The M2 journey proves the admin screens in a browser › Carol disables and enables alice | uncovered | - | test_m2_admin::test_c_d118ea9b_carol_disables_and_enables_alice[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.04 | - |
| C-19381fcc | web-admin › The M2 journey proves the admin screens in a browser › Carol creates and deletes a team | uncovered | - | test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.05 | `e2e/test_l4_c_19381fcc.py`, `test-results/test-l4-c-19381fcc-py-test-carol-creates-and-deletes-a-team-chromium/test-failed-1.png`, `test-results/test-l4-c-19381fcc-py-test-carol-creates-and-deletes-a-team-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m2_admin.py` |  | relevant | new test file |
| `openspec/changes/add-web-admin-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/.l4/ledger/r-20261031T1806Z-2dcf.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/.l4/ledger/r-20261031T2026Z-44e1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/.l4/ledger/r-20261031T2121Z-1d08.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/verification.md` |  | none | exempt: harness, spec or documentation path |
| `test/journeys/m2-admin.test.ts` |  | relevant | new test file |
| `test/journeys/session.ts` | test | relevant | named in the spec |
| `web/src/admin/AuditPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/MappingsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/TeamsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/UsersPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/admin-css.test.ts` |  | relevant | new test file |
| `web/src/admin/admin.css` | web | relevant | named in the spec |
| `web/src/admin/audit.test.ts` |  | relevant | new test file |
| `web/src/admin/audit.ts` | web | relevant | named in the spec |
| `web/src/admin/mappings.test.ts` |  | relevant | new test file |
| `web/src/admin/mappings.ts` | web | relevant | named in the spec |
| `web/src/admin/messages.test.ts` |  | relevant | new test file |
| `web/src/admin/messages.ts` | web | relevant | named in the spec |
| `web/src/admin/pages.test.ts` |  | relevant | new test file |
| `web/src/admin/pages.ts` | web | relevant | named in the spec |
| `web/src/admin/removal.test.ts` |  | relevant | new test file |
| `web/src/admin/shared.ts` | web | relevant | named in the spec |
| `web/src/admin/teams.test.ts` |  | relevant | new test file |
| `web/src/admin/teams.ts` | web | relevant | named in the spec |
| `web/src/admin/users.test.ts` |  | relevant | new test file |
| `web/src/admin/users.ts` | web | relevant | named in the spec |
| `web/src/admin/verification.test.ts` |  | relevant | new test file |
| `web/src/features/60-admin-users.tsx` | web | relevant | named in the spec |
| `web/src/features/61-admin-roles-teams.tsx` | web | relevant | named in the spec |
| `web/src/features/62-admin-group-mappings.tsx` | web | relevant | named in the spec |
| `web/src/features/63-admin-audit.tsx` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/journeys/session.ts, web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx and 11 more

### Tests

1200 of 1200 passed, 0 failed, 0 errored, 0 skipped.
59 of 59 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-2c3410e3 | fails_at_head | e2e/test_l4_c_2c3410e3.py | fail | fail | 2 | the test fails at the head: test_l4_c_2c3410e3::test_admin_pages_declare_literal_paths[chromium-/admin/audit-Audit log-captions3], test_l4_c_2c3410e3::test_admin_pages_declare_literal_paths[chromium-/admin/group-mappings-Group mappings-captions2], test_l4_c_2c3410e3::test_admin_pages_declare_literal... | test-results/test-l4-c-2c3410e3-py-test-admin-pages-declare-literal-paths-chromium-admin-audit-audit-log-captions3/test-failed-1.png, test-results/test-l4-c-2c3410e3-py-test-admin-pages-declare-literal-paths-chromium-admin-audit-audit-log-captions3/trace.zip, test-results/test-l4-c-2c3410e3-py-test-... |
| C-7c7c77c3 | not_testable | - | - | - | 1 | This criterion tests a TypeScript feature-registry `nav` function returning labels for capability sets — a unit-level outcome with no browser-observable UI behavior, URL, or user action to drive through pytest-playwright. | - |
| C-bf07943b | not_testable | - | - | - | 1 | featureLiterals is a TypeScript source-parsing function (returns null for non-literal path) not exposed through the web UI; it has no observable user outcome, so it cannot be verified via pytest-playwright against L4_E2E_BASE_URL — it is a unit-test concern. | - |
| C-195c3385 | not_testable | - | - | - | 1 | The criterion exercises internal message-registry functions (registerAdminMessages, messageFor, ADMIN_MESSAGES, FALLBACK_MESSAGE) that are not exposed through the web UI, so an e2e test using the page fixture cannot invoke them or observe their keys/texts. | - |
| C-0c949ead | not_testable | e2e/test_l4_c_0c949ead.py | - | - | 2 | The criterion asserts the output of the internal adminErrorMessage function for specific ApiRequestError inputs; those errors can only be produced by the backend and cannot be triggered deterministically through the browser's public interface while restricting requests to the base origin. | - |
| C-97244065 | not_testable | - | - | - | 1 | parseAccount is an internal TypeScript parsing function with no HTTP endpoint or user-observable UI outcome; it cannot be invoked or observed through the Users page or page fixture. | - |
| C-87e93809 | fails_at_head | e2e/test_l4_c_87e93809.py | fail | fail | 2 | the test fails at the head: test_l4_c_87e93809::test_users_cells_and_actions[chromium] | test-results/test-l4-c-87e93809-py-test-users-cells-and-actions-chromium/test-failed-1.png, test-results/test-l4-c-87e93809-py-test-users-cells-and-actions-chromium/trace.zip |
| C-0c16ec24 | writer_failed | e2e/test_l4_c_0c16ec24.py | - | - | 2 | structured output missing: the reply holds no JSON object | - |
| C-4bc159f4 | fails_at_head | e2e/test_l4_c_4bc159f4.py | fail | fail | 2 | the test fails at the head: test_l4_c_4bc159f4::test_roles_and_teams_names[chromium] | test-results/test-l4-c-4bc159f4-py-test-roles-and-teams-names-chromium/test-failed-1.png, test-results/test-l4-c-4bc159f4-py-test-roles-and-teams-names-chromium/trace.zip |
| C-c174064a | fails_at_head | e2e/test_l4_c_c174064a.py | fail | fail | 2 | the test fails at the head: test_l4_c_c174064a::test_creating_and_deleting_a_team[chromium] | test-results/test-l4-c-c174064a-py-test-creating-and-deleting-a-team-chromium/test-failed-1.png, test-results/test-l4-c-c174064a-py-test-creating-and-deleting-a-team-chromium/trace.zip |
| C-b8ae0992 | writer_failed | - | - | - | 1 | opencode's permission rules rejected a tool call (bash) | - |
| C-5e078fd3 | fails_at_head | e2e/test_l4_c_5e078fd3.py | fail | fail | 2 | the test fails at the head: test_l4_c_5e078fd3::test_group_mapping_request[chromium] | test-results/test-l4-c-5e078fd3-py-test-group-mapping-request-chromium/test-failed-1.png, test-results/test-l4-c-5e078fd3-py-test-group-mapping-request-chromium/trace.zip |
| C-741e5139 | not_testable | - | - | - | 1 | The criterion asserts internal JavaScript module behavior of setMapping/loadAllItems (PUT call arguments, fetcher cursor/limit requests, call counts), which is not observable through the browser's public interface from a pytest-playwright test against the base URL. | - |
| C-8a1094e4 | fails_at_head | e2e/test_l4_c_8a1094e4.py | fail | fail | 2 | the test fails at the head: test_l4_c_8a1094e4::test_remove_mapping_confirm_states_consequence[chromium] | test-results/test-l4-c-8a1094e4-py-test-remove-mapping-confirm-states-consequence-chromium/test-failed-1.png, test-results/test-l4-c-8a1094e4-py-test-remove-mapping-confirm-states-consequence-chromium/trace.zip |
| C-71033976 | fails_at_head | e2e/test_l4_c_71033976.py | fail | fail | 2 | the test fails at the head: test_l4_c_71033976::test_audit_log_lists_events_newest_first_and_filters_by_event_type[chromium] | test-results/test-l4-c-71033976-py-test-audit-log-lists-events-newest-first-and-filters-by-event-type-chromium/test-failed-1.png, test-results/test-l4-c-71033976-py-test-audit-log-lists-events-newest-first-and-filters-by-event-type-chromium/trace.zip |
| C-1e5047ed | not_testable | - | - | - | 1 | The criterion asserts internal parseEventTypeFilter return objects and exact API call sequences (cursor pagination, INVALID_RESPONSE rejection) rather than user-observable outcomes; the admin route and authentication needed to reach the AuditPage are not provided. | - |
| C-1d816fd1 | not_testable | - | - | - | 1 | The criterion asserts internal unit behavior of `parseVerification` and `loadVerification` (parsed output shape, HTTP call sequence, mock rejection) which is not observable through the Audit page's public UI; only the final verification status is shown to the user. | - |
| C-d2fc8f38 | fails_at_head | e2e/test_l4_c_d2fc8f38.py | fail | fail | 2 | the test fails at the head: test_l4_c_d2fc8f38::test_audit_chain_verification_status[chromium] | test-results/test-l4-c-d2fc8f38-py-test-audit-chain-verification-status-chromium/test-failed-1.png, test-results/test-l4-c-d2fc8f38-py-test-audit-chain-verification-status-chromium/trace.zip |
| C-52c26a32 | not_testable | - | - | - | 1 | This criterion statically analyzes server-side source files (admin.css, tokens.css, .tsx) using internal functions (findRawColours, findInlineStyleUse, parseTokens); nothing about it is observable through the browser's public HTTP interface via the page fixture. | - |
| C-dd02e61e | writer_failed | e2e/test_l4_c_dd02e61e.py | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |
| C-06a71640 | fails_at_head | e2e/test_l4_c_06a71640.py | fail | fail | 2 | the test fails at the head: test_l4_c_06a71640::test_alice_refused_carol_disables_her[chromium] | test-results/test-l4-c-06a71640-py-test-alice-refused-carol-disables-her-chromium/test-failed-1.png, test-results/test-l4-c-06a71640-py-test-alice-refused-carol-disables-her-chromium/trace.zip |
| C-f7bbb238 | fails_at_head | e2e/test_l4_c_f7bbb238.py | fail | fail | 2 | the test fails at the head: test_l4_c_f7bbb238::test_carol_maps_group_and_log_shows_verified[chromium] | test-results/test-l4-c-f7bbb238-py-test-carol-maps-group-and-log-shows-verified-chromium/test-failed-1.png, test-results/test-l4-c-f7bbb238-py-test-carol-maps-group-and-log-shows-verified-chromium/trace.zip |
| C-652f54b7 | fails_at_head | e2e/test_l4_c_652f54b7.py | fail | fail | 2 | the test fails at the head: test_l4_c_652f54b7::test_alice_sees_403_with_decision_id[chromium] | test-results/test-l4-c-652f54b7-py-test-alice-sees-403-with-decision-id-chromium/test-failed-1.png, test-results/test-l4-c-652f54b7-py-test-alice-sees-403-with-decision-id-chromium/trace.zip |
| C-d118ea9b | not_testable | - | - | - | 1 | The criterion requires signing in as two distinct users (carol and alice) in separate browser contexts, but no sign-in mechanism, credentials, or authentication helper is provided in the criterion, UI diff, or page snapshot, so a self-contained e2e test cannot establish those sessions without implem... | - |
| C-19381fcc | fails_at_head | e2e/test_l4_c_19381fcc.py | fail | fail | 2 | the test fails at the head: test_l4_c_19381fcc::test_carol_creates_and_deletes_a_team[chromium] | test-results/test-l4-c-19381fcc-py-test-carol-creates-and-deletes-a-team-chromium/test-failed-1.png, test-results/test-l4-c-19381fcc-py-test-carol-creates-and-deletes-a-team-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-2c3410e3 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7c7c77c3 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bf07943b | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-195c3385 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0c949ead | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97244065 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87e93809 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0c16ec24 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4bc159f4 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c174064a | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b8ae0992 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5e078fd3 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-741e5139 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8a1094e4 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-71033976 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1e5047ed | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1d816fd1 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d2fc8f38 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-52c26a32 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dd02e61e | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-06a71640 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f7bbb238 | ok | 0.060 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-652f54b7 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d118ea9b | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-19381fcc | ok | 0.050 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-741e5139 | skipped | - | - | cap |
| C-97244065 | skipped | - | - | cap |
| C-2c3410e3 | skipped | - | - | cap |
| C-0c949ead | skipped | - | - | cap |
| C-dd02e61e | skipped | - | - | cap |
| C-1d816fd1 | not_testable | - | - | criterion exercises TypeScript parseVerification/loadVerification under node --test; no Python module under test is shown to import for pytest |
| C-52c26a32 | not_testable | - | - | The criterion requires calling findRawColours, findInlineStyleUse and parseTokens, but these functions, the module under test that exports them, and their signatures are not defined in the shown sources, so importing them would require guessing names, which is forbidden. |

## Answers to verdict questions

- Q-001 accept C-2c3410e3 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ADMIN_PAGES in web/src/admin/pages.ts lists, in order, admin-users at /admin/users "Users", admin-roles-teams at /admin/roles-and-teams "Roles and teams" and admin-group-mappings at /admin/group-mappings "Group mappings", all with capability manage_users_role...
- Q-002 accept C-7c7c77c3 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The test "the navigation follows capabilities" in web/src/admin/pages.test.ts registers the four ADMIN_PAGES entries with element null in a fresh createFeatureRegistry() and deep-compares the nav labels for new Set(), new Set(["read_self", "read_audit"]) and ...
- Q-003 accept C-bf07943b by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/. A feature file declares the table's literals: featureLiterals of the literal users entry gives the four-field object (pages.test.ts:168-177...
- Q-004 accept C-195c3385 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ADMIN_MESSAGES in web/src/admin/messages.ts holds exactly the six codes ALREADY_EXISTS, IN_USE, ELEVATION_REFUSED, UNKNOWN_ISSUER, OPERATION_REFUSED and ENGINE_KEY_REQUIRED, each with the text task 2.1 prescribes, and registerAdminMessages calls the kit's reg...
- Q-005 accept C-0c949ead by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/. Error text for an action: IN_USE gives its entry without "raw SQL" (messages.test.ts:54-55); OPERATION_REFUSED with reason self_disable giv...
- Q-006 accept C-97244065 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseAccount in web/src/admin/users.ts refuses a non-object body, checks userId against ^[A-Za-z0-9_-]{1,64}$, kind against human or service, displayName and email lengths, state against active or disabled, and roles, teams and localRoles as arrays whose ever...
- Q-007 accept C-87e93809 by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/. Cells and actions: Bob's cells are one exact compare (users.test.ts:129-134); the disabled Bob's rolesTeams is "finance" (:154) and the emp...
- Q-008 accept C-0c16ec24 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. patchAccountState in web/src/admin/users.ts checks the user id against the pattern of design decision 3, calls the client's patch with the path /users/ followed by the encoded id and the body { state }, parses the answer with parseAccount, and throws ApiReque...
- Q-009 accept C-4bc159f4 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseNamed in web/src/admin/teams.ts needs a plain object with an own property of the asked key whose string value matches the role pattern ^[a-z][a-z0-9_]{0,31}$ or the team pattern ^[a-z][a-z0-9_-]{0,63}$ of design decision 3, so { roleId: "tenant_admin" } ...
- Q-010 accept C-c174064a by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. postTeam in web/src/admin/teams.ts checks the team id and the key against their patterns, calls the client's post with the path /teams, the body { teamId } and the options { headers: { "Idempotency-Key": key } }, parses the answer with parseNamed for teamId a...
- Q-011 accept C-b8ae0992 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseGroupMapping in web/src/admin/mappings.ts needs a plain object whose issuer, group and reviewedBy are non-empty texts within their limits, whose roleId and teamId are null or match the role and team patterns, and exactly one of roleId and teamId null, th...
- Q-012 accept C-5e078fd3 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. mappingRequest in web/src/admin/mappings.ts trims the issuer and group, reports "Enter the issuer URL." for an empty issuer, "Enter the group name exactly as the identity provider sends it." for an empty group, and "Choose a role or a team." when the grant is...
- Q-013 accept C-741e5139 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. setMapping in web/src/admin/mappings.ts calls the client's put with the path /idp-group-map and the body, parses the answer with parseGroupMapping and returns the mapping, so a recording client gets put("/idp-group-map", body) and the result is the mapping. l...
- Q-014 accept C-8a1094e4 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. removeMappingConfirm in web/src/admin/mappings.ts builds the title "Remove the mapping for <group>?" with the group cut by clip (a 17-character group is unchanged), the action "Remove mapping", and the description "Members of this group lose the role <id> at ...
- Q-015 accept C-71033976 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseAuditEvent in web/src/admin/audit.ts needs a plain object whose seq matches ^(0|[1-9][0-9]{0,18})$, whose at matches the UTC timestamp pattern of design decision 4, whose eventType matches the lower-case dotted pattern, whose actor is a kind and id with ...
- Q-016 accept C-1e5047ed by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseEventTypeFilter in web/src/admin/audit.ts trims the text, answers { ok: true, value: null } for an empty trimmed text, { ok: false, message } with the exact task 6.1 text "Event types are lower-case words separated by dots, for example identity.group_map...
- Q-017 accept C-1d816fd1 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseVerification in web/src/admin/audit.ts needs a plain object whose checkedAt is a UTC timestamp text, whose firstBadSeq is null or a decimal seq, whose ok is a boolean equal to firstBadSeq being null, whose checked and anchorsVerified are non-negative saf...
- Q-018 accept C-d2fc8f38 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. verificationView in web/src/admin/audit.ts answers the checking state with tone checking, headline "Checking the audit chain" and the fixed detail; a failed state with tone unavailable, headline "Verification unavailable" and adminErrorMessage of the error, w...
- Q-019 accept C-52c26a32 by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/ unless named. The stylesheet and the sources: admin.css and web/src/kit/tokens.css are asserted to exist (admin-css.test.ts:57-58); findRawC...
- Q-020 accept C-dd02e61e by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The tracing test in test/journeys/m2-admin.test.ts signs carol in through signInAs and sessionClient against a fresh e2e stack, then runs exactly the scenario: loadAllItems over cursorPageFetcher for /roles, /teams and /idp-group-map, asserting the roles deep...
- Q-021 accept C-06a71640 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The tracing test in test/journeys/m2-admin.test.ts signs alice and carol in through signInAs and sessionClient against a fresh e2e stack and runs exactly the scenario: alice's get of /users is caught by a helper that asserts an ApiRequestError and the test as...
- Q-022 accept C-f7bbb238 by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md 7.1. The test is e2e/test_m2_admin.py (lines below); it signs in with conftest's login and the seed users and passed in the e2e gate at 4cfa770, and no code under e2e, ...
- Q-023 accept C-652f54b7 by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for it in e2e/test_m2_admin.py signs alice in, opens /admin/users by address, expects an alert containing "Not allowed" with the text "Decision id:" and a button named exactly "Copy decision id", asserts there is no "Users" link, reads the de...
- Q-024 accept C-d118ea9b by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for it in e2e/test_m2_admin.py signs alice in in a second browser context, signs carol in, opens "Users", asserts that carol's own row contains "This is your account" and has no button, that alice's row contains "author · finance", presses th...
- Q-025 accept C-19381fcc by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for it in e2e/test_m2_admin.py signs carol in, opens "Roles and teams", expects a row of the table "Roles" for each of approver, auditor, author and tenant_admin, fills "Team name" with "ops", presses "Create team", expects the row "ops" in t...
- Q-026 accept H-7687af8e by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-2c3410e3 is the scenario "The page table": it reads ADMIN_PAGES and passes each ADMIN_TABLES spec to dataTableModel, a unit-level check of two constants that no browser can observe directly, and its two tracing Node tests in web...
- Q-027 accept H-2b38782f by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-7c7c77c3 is the scenario "Navigation follows capabilities": it registers the four ADMIN_PAGES entries with element null in a fresh createFeatureRegistry() and asks nav with three capability sets, a unit-level call that no browse...
- Q-028 accept H-7b12a03b by agent (CLAUDECODE): C-bf07943b is a unit-level criterion: its WHEN gives `featureLiterals` source texts, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/pages.test.ts (1.1), users.test.ts (3.1), teams.test.ts (4.1), mappings.test.ts (5.1) and audit.test.ts (6.1). Each failed a...
- Q-029 accept H-7ce02cbb by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-195c3385 is the scenario "The codes and their texts": it runs registerAdminMessages twice and calls messageFor for each code of ADMIN_MESSAGES, comparing keys and texts against the catalogue and FALLBACK_MESSAGE, a unit-level ca...
- Q-030 accept H-ffedae36 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-0c949ead is the scenario "Error text for an action": it calls adminErrorMessage with hand-built ApiRequestError values for 409 IN_USE, 422 OPERATION_REFUSED with the reasons self_disable and other, and 403 FORBIDDEN with a decis...
- Q-031 accept H-30bc4c2c by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-97244065 is the scenario "Parsing an account": it calls parseAccount with a hand-built Bob body and six malformed bodies and compares the results, a unit-level call to a pure parser whose inputs a browser cannot construct, which...
- Q-032 accept H-7c7ec97d by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-87e93809 is the scenario "Cells and actions": it calls accountCells and accountAction with hand-built Bob accounts and a selfId and compares the returned objects, a unit-level call to two pure functions whose inputs a browser ca...
- Q-033 accept H-9a555cbd by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-0c16ec24 is the scenario "Setting a state": it runs patchAccountState with a recording client for ("u_bob", "disabled") and with a client answering {}, then compares the recorded call, the returned state and the INVALID_RESPONSE...
- Q-034 accept H-c36e205c by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-4bc159f4 is the scenario "Names": it calls parseNamed with { roleId: "tenant_admin" }, { roleId: "Tenant" } and { teamId: "finance" } and checkTeamId with " ops ", "" and "Ops", then compares the returned values and messages, a ...
- Q-035 accept H-d0d2c1b0 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-c174064a is the scenario "Creating and deleting": it runs postTeam with a recording client for ("ops", "key-1") and with one answering {}, removeTeamById for "ops" and reads deleteTeamConfirm("ops"), then compares the recorded c...
- Q-036 accept H-cc90d893 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived and the unit can go on as it stands. Criterion C-b8ae0992 is the scenario "Parsing, showing and offering mappings": it calls parseGroupMapping with hand-built mapping bodies, mappingCells, grantOptions, defaultIssuer and reads ISSUER_HINT, then compares the returned values, a ...
- Q-037 accept H-ce62dad6 by agent (CLAUDECODE): C-5e078fd3 is a unit-level criterion: its WHEN gives `mappingRequest` literal fields, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/mappings.test.ts (task 5.1). Each failed at the base by assertion and passes at the head, and Q-012 accepts the criterion o...
- Q-038 accept H-6399c22b by agent (CLAUDECODE): C-741e5139 is a unit-level criterion: its WHEN runs `setMapping` with a recording client and `loadAllItems` over fake fetchers, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/mappings.test.ts (task 5.1). Each failed at the base by assertion and passes at t...
- Q-039 accept H-e3b15649 by agent (CLAUDECODE): C-8a1094e4 is a unit-level criterion: its WHEN gives `removeMappingConfirm` three literal mappings, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/removal.test.ts (task 5.2). Each failed at the base by assertion and passes at the head, and Q-014 accepts th...
- Q-040 accept H-7c19852a by agent (CLAUDECODE): C-71033976 is a unit-level criterion: its WHEN gives `parseAuditEvent` and `auditCells` literal events, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/audit.test.ts (task 6.1). Each failed at the base by assertion and passes at the head, and Q-015 accepts ...
- Q-041 accept H-f48309f9 by agent (CLAUDECODE): C-1e5047ed is a unit-level criterion: its WHEN gives `parseEventTypeFilter` literal texts and calls `auditFetcher` with a recording client, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/audit.test.ts (task 6.1). Each failed at the base by assertion and pa...
- Q-042 accept H-78728d9d by agent (CLAUDECODE): C-1d816fd1 is a unit-level criterion: its WHEN gives `parseVerification` literal bodies and runs `loadVerification` with a recording client, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/verification.test.ts (task 6.2). Each failed at the base by assertio...
- Q-043 accept H-1d919b7f by agent (CLAUDECODE): C-d2fc8f38 is a unit-level criterion: its WHEN gives `verificationView` literal states, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/verification.test.ts (task 6.2). Each failed at the base by assertion and passes at the head, and Q-018 accepts the crite...
- Q-044 accept H-eea2f155 by agent (CLAUDECODE): C-52c26a32 is a unit-level criterion: its WHEN reads source files and runs `findRawColours`, `findInlineStyleUse` and `parseTokens` on them, which is no browser step, so its evidence is the node tests that trace it in web/src/admin/admin-css.test.ts (task 6.2). Each failed at the base by assertion a...
- Q-045 accept H-d04992fb by agent (CLAUDECODE): C-dd02e61e is an engine-level criterion: its WHEN calls the functions of web/src/admin/ over signed-in sessions against the e2e stack's engine, not through the browser. Its evidence is test/journeys/m2-admin.test.ts (task 7.1), which starts the real stack with startE2eStack, failed at the base by as...
- Q-046 accept H-6ea9ed12 by agent (CLAUDECODE): C-06a71640 is an engine-level criterion: its WHEN calls the functions of web/src/admin/ over signed-in sessions against the e2e stack's engine, not through the browser. Its evidence is test/journeys/m2-admin.test.ts (task 7.1), which starts the real stack with startE2eStack, failed at the base by as...
- Q-047 accept H-11d4a924 by agent (CLAUDECODE): C-f7bbb238 has an end-to-end test: e2e/test_m2_admin.py::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified, written by task 7.1 as the requirement says. It signs in with `login` and the seed users and passed in the e2e gate at the head 4cfa770. The harness ignored it only because task...
- Q-048 accept H-4662f538 by agent (CLAUDECODE): C-652f54b7 has an end-to-end test: e2e/test_m2_admin.py::test_c_652f54b7_alice_sees_a_403_page_with_the_decision_id, written by task 7.1 as the requirement says. It signs in with `login` and the seed users and passed in the e2e gate at the head 4cfa770. The harness ignored it only because task 7.1's...
- Q-049 accept H-17337413 by agent (CLAUDECODE): C-d118ea9b has an end-to-end test: e2e/test_m2_admin.py::test_c_d118ea9b_carol_disables_and_enables_alice, written by task 7.1 as the requirement says. It signs in with `login` and the seed users and passed in the e2e gate at the head 4cfa770. The harness ignored it only because task 7.1's e2e file ...
- Q-050 accept H-e41ee87b by agent (CLAUDECODE): C-19381fcc has an end-to-end test: e2e/test_m2_admin.py::test_c_19381fcc_carol_creates_and_deletes_a_team, written by task 7.1 as the requirement says. It signs in with `login` and the seed users and passed in the e2e gate at the head 4cfa770. The harness ignored it only because task 7.1's e2e file ...
- Q-051 accept H-346cd016 by agent (CLAUDECODE): The judge nemotron-judge (opencode/nemotron-3.5-super-vl-free) passed its hello, but its reply to part 1 of 2 listed more than three riskiest assumptions, so the harness discarded it and no criterion got a judge verdict. The owner's delegate reviewed all 25 criteria at the head 4cfa770 instead: Q-00...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-2c3410e3 | web-admin › Admin pages are listed by capability and declare literal paths › The page table | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ADMIN_PAGES in web/src/admin/pages.ts lists, in order, admin-users at /admin/users "Users", admin-roles-teams at /admin/roles-and-teams "Roles and teams" and admin-group-mappings at /admin/group-map... |
| C-7c7c77c3 | web-admin › Admin pages are listed by capability and declare literal paths › Navigation follows capabilities | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The test "the navigation follows capabilities" in web/src/admin/pages.test.ts registers the four ADMIN_PAGES entries with element null in a fresh createFeatureRegistry() and deep-compares the nav la... |
| C-bf07943b | web-admin › Admin pages are listed by capability and declare literal paths › A feature file declares the table's literals | - | pass | accepted by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/. A feature file declares the table's literals: featureLiterals of the literal users entry gives the four-fie... |
| C-195c3385 | web-admin › Admin errors show catalogue text and the refusal's decision id › The codes and their texts | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. ADMIN_MESSAGES in web/src/admin/messages.ts holds exactly the six codes ALREADY_EXISTS, IN_USE, ELEVATION_REFUSED, UNKNOWN_ISSUER, OPERATION_REFUSED and ENGINE_KEY_REQUIRED, each with the text task ... |
| C-0c949ead | web-admin › Admin errors show catalogue text and the refusal's decision id › Error text for an action | - | pass | accepted by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/. Error text for an action: IN_USE gives its entry without "raw SQL" (messages.test.ts:54-55); OPERATION_REFU... |
| C-97244065 | web-admin › The Users page lists people and disables or enables them › Parsing an account | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseAccount in web/src/admin/users.ts refuses a non-object body, checks userId against ^[A-Za-z0-9_-]{1,64}$, kind against human or service, displayName and email lengths, state against active or d... |
| C-87e93809 | web-admin › The Users page lists people and disables or enables them › Cells and actions | - | pass | accepted by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/. Cells and actions: Bob's cells are one exact compare (users.test.ts:129-134); the disabled Bob's rolesTeams... |
| C-0c16ec24 | web-admin › The Users page lists people and disables or enables them › Setting a state | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. patchAccountState in web/src/admin/users.ts checks the user id against the pattern of design decision 3, calls the client's patch with the path /users/ followed by the encoded id and the body { stat... |
| C-4bc159f4 | web-admin › The Roles and teams page lists roles and teams and creates or deletes a team › Names | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseNamed in web/src/admin/teams.ts needs a plain object with an own property of the asked key whose string value matches the role pattern ^[a-z][a-z0-9_]{0,31}$ or the team pattern ^[a-z][a-z0-9_-... |
| C-c174064a | web-admin › The Roles and teams page lists roles and teams and creates or deletes a team › Creating and deleting | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. postTeam in web/src/admin/teams.ts checks the team id and the key against their patterns, calls the client's post with the path /teams, the body { teamId } and the options { headers: { "Idempotency-... |
| C-b8ae0992 | web-admin › The Group mappings page maps a group to one role or team › Parsing, showing and offering mappings | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseGroupMapping in web/src/admin/mappings.ts needs a plain object whose issuer, group and reviewedBy are non-empty texts within their limits, whose roleId and teamId are null or match the role and... |
| C-5e078fd3 | web-admin › The Group mappings page maps a group to one role or team › Building the request | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. mappingRequest in web/src/admin/mappings.ts trims the issuer and group, reports "Enter the issuer URL." for an empty issuer, "Enter the group name exactly as the identity provider sends it." for an ... |
| C-741e5139 | web-admin › The Group mappings page maps a group to one role or team › Saving a mapping, reading every page | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. setMapping in web/src/admin/mappings.ts calls the client's put with the path /idp-group-map and the body, parses the answer with parseGroupMapping and returns the mapping, so a recording client gets... |
| C-8a1094e4 | web-admin › The Group mappings page maps a group to one role or team › A removal states the consequence | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. removeMappingConfirm in web/src/admin/mappings.ts builds the title "Remove the mapping for <group>?" with the group cut by clip (a 17-character group is unchanged), the action "Remove mapping", and ... |
| C-71033976 | web-admin › The Audit log page lists events newest first and filters by event type › Parsing an event and its cells | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseAuditEvent in web/src/admin/audit.ts needs a plain object whose seq matches ^(0\|[1-9][0-9]{0,18})$, whose at matches the UTC timestamp pattern of design decision 4, whose eventType matches the ... |
| C-1e5047ed | web-admin › The Audit log page lists events newest first and filters by event type › The event type filter | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseEventTypeFilter in web/src/admin/audit.ts trims the text, answers { ok: true, value: null } for an empty trimmed text, { ok: false, message } with the exact task 6.1 text "Event types are lower... |
| C-1d816fd1 | web-admin › The Audit log page shows whether the chain verifies › Parsing and loading a verification | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. parseVerification in web/src/admin/audit.ts needs a plain object whose checkedAt is a UTC timestamp text, whose firstBadSeq is null or a decimal seq, whose ok is a boolean equal to firstBadSeq being... |
| C-d2fc8f38 | web-admin › The Audit log page shows whether the chain verifies › Status text | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. verificationView in web/src/admin/audit.ts answers the checking state with tone checking, headline "Checking the audit chain" and the fixed detail; a failed state with tone unavailable, headline "Ve... |
| C-52c26a32 | web-admin › Admin styles use the kit's tokens and no inline styles › The stylesheet and the sources | - | pass | accepted by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md; paths under web/src/admin/ unless named. The stylesheet and the sources: admin.css and web/src/kit/tokens.css are asserted to exist (ad... |
| C-dd02e61e | web-admin › The admin logic works against the real engine › Carol manages mappings and teams and reads the log | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The tracing test in test/journeys/m2-admin.test.ts signs carol in through signInAs and sessionClient against a fresh e2e stack, then runs exactly the scenario: loadAllItems over cursorPageFetcher fo... |
| C-06a71640 | web-admin › The admin logic works against the real engine › Alice is refused, carol finds the id and disables her | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The tracing test in test/journeys/m2-admin.test.ts signs alice and carol in through signInAs and sessionClient against a fresh e2e stack and runs exactly the scenario: alice's get of /users is caugh... |
| C-f7bbb238 | web-admin › The M2 journey proves the admin screens in a browser › Carol maps a group and the log shows it verified | - | pass | accepted by agent (CLAUDECODE): Reviewed by the owner's delegate (the judge's reply was discarded, see Q-051) at the head 4cfa770 against the scenario and tasks.md 7.1. The test is e2e/test_m2_admin.py (lines below); it signs in with conftest's login and the seed users and passed in the e2e gate at ... |
| C-652f54b7 | web-admin › The M2 journey proves the admin screens in a browser › Alice sees a 403 page with the decision id | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for it in e2e/test_m2_admin.py signs alice in, opens /admin/users by address, expects an alert containing "Not allowed" with the text "Decision id:" and a button named exactly "Copy... |
| C-d118ea9b | web-admin › The M2 journey proves the admin screens in a browser › Carol disables and enables alice | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for it in e2e/test_m2_admin.py signs alice in in a second browser context, signs carol in, opens "Users", asserts that carol's own row contains "This is your account" and has no but... |
| C-19381fcc | web-admin › The M2 journey proves the admin screens in a browser › Carol creates and deletes a team | - | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The criterion is satisfied as it stands. The browser test for it in e2e/test_m2_admin.py signs carol in, opens "Roles and teams", expects a row of the table "Roles" for each of approver, auditor, author and tenant_admin, fills "Team name" ... |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-f7bbb238): test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-652f54b7): test_m2_admin::test_c_652f54b7_alice_sees_a_403_page_with_the_decision_id[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-d118ea9b): test_m2_admin::test_c_d118ea9b_carol_disables_and_enables_alice[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-19381fcc): test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2c3410e3): No end-to-end test traces criterion C-2c3410e3 (web-admin › Admin pages are listed by capability and declare literal paths › The page table); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7c7c77c3): No end-to-end test traces criterion C-7c7c77c3 (web-admin › Admin pages are listed by capability and declare literal paths › Navigation follows capabilities); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-bf07943b): No end-to-end test traces criterion C-bf07943b (web-admin › Admin pages are listed by capability and declare literal paths › A feature file declares the table's literals); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-195c3385): No end-to-end test traces criterion C-195c3385 (web-admin › Admin errors show catalogue text and the refusal's decision id › The codes and their texts); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0c949ead): No end-to-end test traces criterion C-0c949ead (web-admin › Admin errors show catalogue text and the refusal's decision id › Error text for an action); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-97244065): No end-to-end test traces criterion C-97244065 (web-admin › The Users page lists people and disables or enables them › Parsing an account); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-87e93809): No end-to-end test traces criterion C-87e93809 (web-admin › The Users page lists people and disables or enables them › Cells and actions); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0c16ec24): No end-to-end test traces criterion C-0c16ec24 (web-admin › The Users page lists people and disables or enables them › Setting a state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4bc159f4): No end-to-end test traces criterion C-4bc159f4 (web-admin › The Roles and teams page lists roles and teams and creates or deletes a team › Names); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c174064a): No end-to-end test traces criterion C-c174064a (web-admin › The Roles and teams page lists roles and teams and creates or deletes a team › Creating and deleting); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b8ae0992): No end-to-end test traces criterion C-b8ae0992 (web-admin › The Group mappings page maps a group to one role or team › Parsing, showing and offering mappings); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5e078fd3): No end-to-end test traces criterion C-5e078fd3 (web-admin › The Group mappings page maps a group to one role or team › Building the request); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-741e5139): No end-to-end test traces criterion C-741e5139 (web-admin › The Group mappings page maps a group to one role or team › Saving a mapping, reading every page); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8a1094e4): No end-to-end test traces criterion C-8a1094e4 (web-admin › The Group mappings page maps a group to one role or team › A removal states the consequence); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-71033976): No end-to-end test traces criterion C-71033976 (web-admin › The Audit log page lists events newest first and filters by event type › Parsing an event and its cells); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1e5047ed): No end-to-end test traces criterion C-1e5047ed (web-admin › The Audit log page lists events newest first and filters by event type › The event type filter); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1d816fd1): No end-to-end test traces criterion C-1d816fd1 (web-admin › The Audit log page shows whether the chain verifies › Parsing and loading a verification); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d2fc8f38): No end-to-end test traces criterion C-d2fc8f38 (web-admin › The Audit log page shows whether the chain verifies › Status text); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-52c26a32): No end-to-end test traces criterion C-52c26a32 (web-admin › Admin styles use the kit's tokens and no inline styles › The stylesheet and the sources); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-dd02e61e): No end-to-end test traces criterion C-dd02e61e (web-admin › The admin logic works against the real engine › Carol manages mappings and teams and reads the log); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-06a71640): No end-to-end test traces criterion C-06a71640 (web-admin › The admin logic works against the real engine › Alice is refused, carol finds the id and disables her); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f7bbb238): The end-to-end test test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified[chromium] traces criterion C-f7bbb238 (web-admin › The M2 journey proves the admin screens in a browser › Carol maps a group and the log shows it verified), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-652f54b7): The end-to-end test test_m2_admin::test_c_652f54b7_alice_sees_a_403_page_with_the_decision_id[chromium] traces criterion C-652f54b7 (web-admin › The M2 journey proves the admin screens in a browser › Alice sees a 403 page with the decision id), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d118ea9b): The end-to-end test test_m2_admin::test_c_d118ea9b_carol_disables_and_enables_alice[chromium] traces criterion C-d118ea9b (web-admin › The M2 journey proves the admin screens in a browser › Carol disables and enables alice), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-19381fcc): The end-to-end test test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team[chromium] traces criterion C-19381fcc (web-admin › The M2 journey proves the admin screens in a browser › Carol creates and deletes a team), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.journeys.m2-admin.test.ts::C-06a71640 alice is refused and carol finds the id and disables her` (task 7.1): passed
- `test.journeys.m2-admin.test.ts::C-dd02e61e carol manages mappings and teams and reads the log` (task 7.1): passed
- `web.src.admin.admin-css.test.ts::C-52c26a32 the admin stylesheet and sources follow the kit rules` (task 6.2): passed
- `web.src.admin.audit.test.ts::C-1e5047ed auditFetcher asks the audit path with the event type and the page limit` (task 6.1): passed
- `web.src.admin.audit.test.ts::C-1e5047ed auditFetcher without a type asks only the page limit and refuses an unreadable event` (task 6.1): passed
- `web.src.admin.audit.test.ts::C-1e5047ed parseEventTypeFilter trims the text and refuses an unknown shape` (task 6.1): passed
- `web.src.admin.audit.test.ts::C-71033976 a 300 character payload leaves 240 details characters ending in an ellipsis` (task 6.1): passed
- `web.src.admin.audit.test.ts::C-71033976 auditCells shows seq time type actor target and details` (task 6.1): passed
- `web.src.admin.audit.test.ts::C-71033976 parseAuditEvent keeps a valid event and refuses malformed bodies` (task 6.1): passed
- `web.src.admin.audit.test.ts::C-bf07943b the admin audit feature file declares its literal page entry` (task 6.1): passed
- `web.src.admin.mappings.test.ts::C-5e078fd3 mappingRequest bounds the issuer and group texts` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-5e078fd3 mappingRequest refuses a grant that is not offered` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-5e078fd3 mappingRequest reports each empty field` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-5e078fd3 mappingRequest trims the issuer and group for a role or team` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-741e5139 loadAllItems reads every page with a size of two hundred` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-741e5139 loadAllItems stops after five pages` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-741e5139 loadAllItems throws the error of a failed page` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-741e5139 mappedMessage names the group within the toast limit` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-741e5139 setMapping puts a team mapping without a role` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-741e5139 setMapping puts the body and reads the returned mapping` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-b8ae0992 defaultIssuer picks the first issuer and the hint explains the field` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-b8ae0992 grantOptions lists every role then every team` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-b8ae0992 mappingCells shows the group grants issuer and reviewer` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-b8ae0992 parseGroupMapping keeps a role or team mapping and refuses the rest` (task 5.1): passed
- `web.src.admin.mappings.test.ts::C-bf07943b the group mappings feature file declares its literal page entry` (task 5.1): passed
- `web.src.admin.messages.test.ts::C-0c949ead an action error shows catalogue text and the decision id` (task 2.1): passed
- `web.src.admin.messages.test.ts::C-195c3385 the admin messages register their catalogue texts` (task 2.1): passed
- `web.src.admin.pages.test.ts::C-2c3410e3 the admin tables carry their captions columns and empty texts` (task 1.1): passed
- `web.src.admin.pages.test.ts::C-2c3410e3 the page table lists the four admin pages in order` (task 1.1): passed
- `web.src.admin.pages.test.ts::C-7c7c77c3 the navigation follows capabilities` (task 1.1): passed
- `web.src.admin.pages.test.ts::C-bf07943b featureLiterals reads the four string literals of a feature file` (task 1.1): passed
- `web.src.admin.removal.test.ts::C-8a1094e4 removeMapping deletes by issuer and group on the group map path` (task 5.2): passed
- `web.src.admin.removal.test.ts::C-8a1094e4 removeMappingConfirm cuts a long group name in the title` (task 5.2): passed
- `web.src.admin.removal.test.ts::C-8a1094e4 removeMappingConfirm states the role a group loses` (task 5.2): passed
- `web.src.admin.removal.test.ts::C-8a1094e4 removeMappingConfirm states the team a group loses` (task 5.2): passed
- `web.src.admin.removal.test.ts::C-8a1094e4 removeMappingConfirm warns for the administrator role` (task 5.2): passed
- `web.src.admin.teams.test.ts::C-4bc159f4 checkTeamId trims a name and explains what a team id may be` (task 4.1): passed
- `web.src.admin.teams.test.ts::C-4bc159f4 parseNamed reads a role or team id and refuses a malformed one` (task 4.1): passed
- `web.src.admin.teams.test.ts::C-bf07943b the roles and teams feature file declares its literal page entry` (task 4.1): passed
- `web.src.admin.teams.test.ts::C-c174064a deleteTeamConfirm names the team and its consequence` (task 4.1): passed
- `web.src.admin.teams.test.ts::C-c174064a postTeam refuses a bad team or key before sending` (task 4.1): passed
- `web.src.admin.teams.test.ts::C-c174064a postTeam sends a keyed create and reads the returned id` (task 4.1): passed
- `web.src.admin.teams.test.ts::C-c174064a removeTeamById deletes the encoded team path` (task 4.1): passed
- `web.src.admin.teams.test.ts::C-c174064a removeTeamById refuses a path-like team before sending` (task 4.1): passed
- `web.src.admin.users.test.ts::C-0c16ec24 patchAccountState refuses a path-like user id before sending` (task 3.1): passed
- `web.src.admin.users.test.ts::C-0c16ec24 patchAccountState sends the state and rejects an unreadable account` (task 3.1): passed
- `web.src.admin.users.test.ts::C-87e93809 a blank display name falls back to the user id and a missing email shows a dash` (task 3.1): passed
- `web.src.admin.users.test.ts::C-87e93809 a long display name and many roles are cut by clip` (task 3.1): passed
- `web.src.admin.users.test.ts::C-87e93809 accountCells and accountAction describe active disabled empty and own rows` (task 3.1): passed
- `web.src.admin.users.test.ts::C-97244065 parseAccount keeps a valid account and refuses malformed bodies` (task 3.1): passed
