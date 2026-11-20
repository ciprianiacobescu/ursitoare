# Verification: openspec:restyle-admin-pages: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `e62be04a7038d7b7d6c6a7667a30df1a274b829c`
- Head: `1471f6b4734e4955253977b21a0467736a03496d`
- Implementer profiles: claude-sonnet
- Judge: beam-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@e62be04a70 contained |
| 1 | integrity | ok | 387.9 | 11 sub-checks; scope: 15 changed file(s) |
| 2 | build | ok | 45.9 |  |
| 3 | tests | failed | 525.9 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium], test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids... |
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
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261119T2206Z-463f/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261119T2206Z-463f/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261119T2206Z-463f/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261119T2206Z-463f/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261119T2206Z-463f/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261119T2206Z-463f/009-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261119T2206Z-463f/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 3 task(s): red and green compared |
| test path freeze | ok | 3 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/admin/admin-pages-restyle.test.ts (+5 more) |
| tdd history | ok | 3 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2559 of 2559 base tests pass on the unit's code with its 4 test and support files at the base (base: not needed) |

## Evidence

### Needs attention

- blocker: new tests failed: test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium], test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium]

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_admin.py` |  | relevant | new test file |
| `openspec/changes/restyle-admin-pages/.l4/ledger/r-20261119T1941Z-03bc.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-admin-pages/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/admin/AuditPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/MappingsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/TeamsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/UsersPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/admin-pages-restyle.test.ts` |  | relevant | new test file |
| `web/src/admin/admin.css` | web | relevant | named in the spec |
| `web/src/admin/captions-by-page.test.ts` |  | relevant | new test file |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/PoliciesPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/tools-pages-restyle.test.ts` |  | relevant | new test file |
| `web/src/tools/tools.css` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/tools/GrantsPage.tsx and 2 more

### Tests

2660 of 2662 passed, 2 failed, 0 errored, 0 skipped.
16 of 18 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium], test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium] Log: `.l4-out/gates/r-20261119T2206Z-463f/010-e2e.log`.
- [blocker, deterministic] new tests failed: test_m6b_admin::test_audit_page_keeps_actor_ids_and_one_line_times[chromium], test_m6b_admin::test_mappings_show_the_reviewer_name_and_keep_ids_that_are_not_people[chromium]

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae, F-7e9a81fb e2e gate failed (+1 more)

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.admin.admin-pages-restyle.test.ts::C-1baa1083 the Users page shows a toned state badge, the id and a red confirm` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-5d8c406e the Mappings page shows reviewer names through useDisplayNames` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the admin sources use the layout parts and keep their pins` (task 2.1): passed
- `web.src.admin.admin-pages-restyle.test.ts::C-b824c627 the checker fails three altered Users sources` (task 2.1): passed
- `web.src.admin.captions-by-page.test.ts::C-e4e27fab exactly four captions are hidden` (task 1.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-3c7c4fbe the Grants page badges the status and keeps subject ids` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-403c66db the Policies page puts its status in the header and bounds one editor` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-68a6b8c2 the Servers page names who registered the server and badges the state` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the checker fails three altered Servers sources` (task 3.1): passed
- `web.src.tools.tools-pages-restyle.test.ts::C-e553aba2 the tool sources use the layout parts and keep their pins` (task 3.1): passed
