# Verification: openspec:add-web-admin: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `026464a257d46e6d273d9fc0df19587592fb7069`
- Head: `912abb9836c57576e9de46924b56fbff793f44a9`
- Implementer profiles: deepseek-free, glm, claude-sonnet
- Judge: mimo-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base merged: main@026464a257 as 912abb9836 (2 commits) |
| 1 | integrity | ok | 99.3 | 11 sub-checks; scope: 30 changed file(s) |
| 2 | build | ok | 27.1 |  |
| 3 | tests | failed | 189.7 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team[chromium], test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_... |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261031T2026Z-44e1/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261031T2026Z-44e1/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261031T2026Z-44e1/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261031T2026Z-44e1/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261031T2026Z-44e1/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261031T2026Z-44e1/009-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261031T2026Z-44e1/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 9 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/m2-admin.test.ts, test/journeys/session.ts, web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx (+21 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 1092 of 1092 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Evidence

### Needs attention

- blocker: new tests failed: test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team[chromium], test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified[chromium]

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m2_admin.py` |  | relevant | new test file |
| `openspec/changes/add-web-admin/.l4/ledger/r-20261031T1806Z-2dcf.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-admin/tasks.md` |  | none | exempt: harness, spec or documentation path |
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

1198 of 1200 passed, 2 failed, 0 errored, 0 skipped.
57 of 59 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team[chromium], test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified[chromium] Log: `.l4-out/gates/r-20261031T2026Z-44e1/010-e2e.log`.
- [blocker, deterministic] new tests failed: test_m2_admin::test_c_19381fcc_carol_creates_and_deletes_a_team[chromium], test_m2_admin::test_c_f7bbb238_carol_maps_a_group_and_the_log_shows_it_verified[chromium]

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae, F-7e9a81fb e2e gate failed (+1 more)

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
