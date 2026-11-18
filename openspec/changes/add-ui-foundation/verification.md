# Verification: openspec:add-ui-foundation: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `3a3a0a143c4af6b78e636c9f86129480f0edefab`
- Head: `d0f60170fca40c10719049d85ca89062f943c651`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@3a3a0a143c contained |
| 1 | integrity | ok | 259.7 | 11 sub-checks (+1 unfrozen by human answers); scope: 54 changed file(s) |
| 2 | build | ok | 32.4 |  |
| 3 | tests | failed | 369.6 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium]; test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium] |
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
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261118T1820Z-992f/050-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261118T1820Z-992f/051-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261118T1820Z-992f/052-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261118T1820Z-992f/053-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261118T1820Z-992f/054-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261118T1820Z-992f/055-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261118T1820Z-992f/056-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base |
| red-green freeze | ok | 9 task(s): red and green compared (+1 opened by task text) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/auth/AccountMenu.tsx (+41 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | ok | 2 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2469 of 2469 base tests pass on the unit's code with its 13 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/conftest.py kept at head for the run (task 9.1: unfrozen by plan:m6b@baa8cf0256f61e2f)

## Tests unfrozen by human answers (allowed, L4-IMP-002)

- e2e/conftest.py (task 9.1, opened by its text, plan:m6b@baa8cf0256f61e2f)

## Evidence

### Needs attention

- blocker: new tests failed: test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium]

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/conftest.py` |  | relevant | named in the spec |
| `e2e/test_m6b_foundation.py` |  | relevant | new test file |
| `openspec/changes/add-ui-foundation/.l4/ledger/r-20261118T1340Z-3d2a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/ledger/r-20261118T1604Z-68a7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/ledger/r-20261118T1820Z-992f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/admin/AuditPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/MappingsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/TeamsPage.tsx` | web | relevant | named in the spec |
| `web/src/admin/UsersPage.tsx` | web | relevant | named in the spec |
| `web/src/auth/AccountMenu.tsx` | web | relevant | named in the spec |
| `web/src/auth/SignInPage.tsx` | web | relevant | named in the spec |
| `web/src/flow-graph/FlowGraphView.tsx` | web | relevant | named in the spec |
| `web/src/flows/FlowEditorPage.tsx` | web | relevant | named in the spec |
| `web/src/flows/FlowsPage.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/DataTable.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/Field.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/Form.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/SchemaForm.tsx` | web | relevant | named in the spec |
| `web/src/kit/extra-contrast.test.ts` |  | relevant | new test file |
| `web/src/kit/extra-contrast.ts` | web | relevant | named in the spec |
| `web/src/kit/tokens.css` | web | relevant | named in the spec |
| `web/src/main.tsx` | web | relevant | named in the spec |
| `web/src/runs/DryRunPanel.tsx` | web | relevant | named in the spec |
| `web/src/runs/RunPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/RunsPage.tsx` | web | relevant | named in the spec |
| `web/src/runs/TestRunPanel.tsx` | web | relevant | named in the spec |
| `web/src/runs/ui-foundation-sources.test.ts` |  | relevant | new test file |
| `web/src/styles/app-css.test.ts` |  | relevant | new test file |
| `web/src/styles/app.css` | web | relevant | named in the spec |
| `web/src/styles/build.test.ts` |  | relevant | new test file |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/PoliciesPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/ui/badge.tsx` | web | relevant | named in the spec |
| `web/src/ui/button-classes.ts` | web | relevant | named in the spec |
| `web/src/ui/button.tsx` | web | relevant | named in the spec |
| `web/src/ui/card.tsx` | web | relevant | named in the spec |
| `web/src/ui/classes.test.ts` |  | relevant | new test file |
| `web/src/ui/cn.ts` | web | relevant | named in the spec |
| `web/src/ui/collapsible.tsx` | web | relevant | named in the spec |
| `web/src/ui/components.test.ts` |  | relevant | new test file |
| `web/src/ui/e2e-helpers.test.ts` |  | relevant | new test file |
| `web/src/ui/format.test.ts` |  | relevant | new test file |
| `web/src/ui/format.ts` | web | relevant | named in the spec |
| `web/src/ui/packages.test.ts` |  | relevant | new test file |
| `web/src/ui/rules-tree.test.ts` |  | relevant | new test file |
| `web/src/ui/rules.test.ts` |  | relevant | new test file |
| `web/src/ui/rules.ts` | web | relevant | named in the spec |
| `web/src/ui/skeleton.tsx` | web | relevant | named in the spec |
| `web/src/ui/tones.test.ts` |  | relevant | new test file |
| `web/src/ui/tones.ts` | web | relevant | named in the spec |
| `web/src/ui/tooltip.tsx` | web | relevant | named in the spec |
| `web/vite.config.ts` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/auth/AccountMenu.tsx and 29 more

### Tests

2577 of 2578 passed, 1 failed, 0 errored, 0 skipped.
42 of 43 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium] Log: `.l4-out/gates/r-20261118T1820Z-992f/056-e2e.log`.
- [blocker, deterministic] new tests failed: test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium]

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae, F-7e9a81fb e2e gate failed (+1 more)

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.kit.extra-contrast.test.ts::C-52eda073 a missing sidebar gives five zero-ratio failures` (task 1.1): passed
- `web.src.kit.extra-contrast.test.ts::C-52eda073 a named accent-surface fails its two pairs with ratio 0` (task 1.1): passed
- `web.src.kit.extra-contrast.test.ts::C-52eda073 a weak quiet-text fails only its own pair` (task 1.1): passed
- `web.src.kit.extra-contrast.test.ts::C-52eda073 the new token values are present and all colours are hex` (task 1.1): passed
- `web.src.kit.extra-contrast.test.ts::C-52eda073 the nine extra pairs keep their ids, order and minimums` (task 1.1): passed
- `web.src.kit.extra-contrast.test.ts::C-52eda073 the real tokens pass the nine pairs with the listed ratios` (task 1.1): passed
- `web.src.runs.ui-foundation-sources.test.ts::C-f357664d the run sources import no stylesheet and the feature files stay` (task 8.1): passed
- `web.src.styles.app-css.test.ts::C-c476cd94 app css bridges every token and restores the base layer` (task 7.1): passed
- `web.src.styles.app-css.test.ts::C-c476cd94 app css keeps the thirteen imports in order` (task 7.1): passed
- `web.src.styles.app-css.test.ts::C-c476cd94 main and vite config use one stylesheet and the tailwind plugin` (task 7.1): passed
- `web.src.styles.build.test.ts::C-595839c2 build emits layers kit rules and token utilities` (task 7.1): passed
- `web.src.ui.classes.test.ts::C-d69c05cb buttonClasses has the members of each row` (task 3.1): passed
- `web.src.ui.classes.test.ts::C-d69c05cb cn merges by Tailwind rules` (task 3.1): passed
- `web.src.ui.classes.test.ts::C-d69c05cb every tone and size pair keeps the kit class and no palette utility` (task 3.1): passed
- `web.src.ui.components.test.ts::C-a22e8a8b badge source keeps the tone pairs` (task 6.1): passed
- `web.src.ui.components.test.ts::C-a22e8a8b button source keeps the markup and class rules` (task 6.1): passed
- `web.src.ui.components.test.ts::C-a22e8a8b card source keeps the token utilities` (task 6.1): passed
- `web.src.ui.components.test.ts::C-a22e8a8b collapsible source keeps its three slots` (task 6.1): passed
- `web.src.ui.components.test.ts::C-a22e8a8b skeleton source stays hidden and slot tagged` (task 6.1): passed
- `web.src.ui.components.test.ts::C-a22e8a8b tooltip source keeps the provider delay and portal` (task 6.1): passed
- `web.src.ui.e2e-helpers.test.ts::C-97e30a51 conftest defines watch_csp and assert_layout` (task 9.1): passed
- `web.src.ui.e2e-helpers.test.ts::C-97e30a51 conftest still defines login and assert_accessible` (task 9.1): passed
- `web.src.ui.format.test.ts::C-67de6235 formatAgo answers the A rows` (task 5.1): passed
- `web.src.ui.format.test.ts::C-67de6235 formatDuration answers the D rows` (task 5.1): passed
- `web.src.ui.format.test.ts::C-67de6235 formatInstant answers the I rows` (task 5.1): passed
- `web.src.ui.packages.test.ts::C-3c9f8b7f BANNED_PACKAGES lists the 14 names in order` (task 2.1): passed
- `web.src.ui.packages.test.ts::C-3c9f8b7f M6B_PACKAGES lists the nine exact versions` (task 2.1): passed
- `web.src.ui.packages.test.ts::C-3c9f8b7f the manifest holds no banned name and each M6B package` (task 2.1): passed
- `web.src.ui.rules-tree.test.ts::C-d3240b20 rules.ts scans itself clean and 20 files keep no stylesheet import` (task 8.1): passed
- `web.src.ui.rules-tree.test.ts::C-d3240b20 the real tree has one stylesheet import and no banned or palette hit` (task 8.1): passed
- `web.src.ui.rules.test.ts::C-d77fa65f banned imports: hits and misses` (task 2.1): passed
- `web.src.ui.rules.test.ts::C-d77fa65f css imports: hits and misses` (task 2.1): passed
- `web.src.ui.rules.test.ts::C-d77fa65f palette utilities: hits and misses` (task 2.1): passed
- `web.src.ui.tones.test.ts::C-48ccaf77 every tone mapper falls back to neutral for unknown input` (task 4.1): passed
- `web.src.ui.tones.test.ts::C-48ccaf77 grantStatusTone maps each known status` (task 4.1): passed
- `web.src.ui.tones.test.ts::C-48ccaf77 runStateTone maps each known state` (task 4.1): passed
- `web.src.ui.tones.test.ts::C-48ccaf77 serverStateTone maps each known state` (task 4.1): passed
- `web.src.ui.tones.test.ts::C-48ccaf77 stepStateTone maps each known state` (task 4.1): passed
- `web.src.ui.tones.test.ts::C-48ccaf77 versionStateTone maps each known state` (task 4.1): passed

## Guard events

- guard.test_tamper: web/src/styles/zz-scratch.test.ts
