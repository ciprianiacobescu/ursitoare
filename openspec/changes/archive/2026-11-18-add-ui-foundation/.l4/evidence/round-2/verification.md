# Verification: openspec:add-ui-foundation: NEEDS_HUMAN (round 2)

traceability: 13/14 criteria covered by a discriminating test

- Base: `3a3a0a143c4af6b78e636c9f86129480f0edefab`
- Head: `8b8b46d5080541a9b9f58466d1de58eadeb9a6e7`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 5 call(s), prompt sha256 `297d5c315dfca0f6e9250595400d3326d5ef38e8a80641fd643a7de03ddf2844`
- Judge replies of nemotron-judge (this unit, all rounds): valid 0, repaired 0, retried 2, discarded 0; this round: retried
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base main@3a3a0a143c contained |
| 1 | integrity | ok | 256.2 | 11 sub-checks (+1 unfrozen by human answers); scope: 64 changed file(s) |
| 2 | build | ok | 28.8 |  |
| 3 | tests | ok | 362.7 |  |
| 4 | traceability | ok | 0.2 | 13/14 criteria covered |
| 4a | audit sampling | ok | 87.7 | 2 not_testable, 2 skipped; support files at the base: 14 |
| 5 | ui test generation | ok | 592.9 | 1 accepted, 1 base_error, 9 not_testable, 2 uncollectable, 1 writer_failed |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/auth/AccountMenu.tsx and 29 more |
| 8 | s1 judge | ok | 1.9 | 14/14 criteria judged by jev |
| 9 | judge | ok | 809.5 | 5 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261118T1956Z-d195/016-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261118T1956Z-d195/017-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261118T1956Z-d195/018-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261118T1956Z-d195/019-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261118T1956Z-d195/020-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261118T1956Z-d195/021-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261118T1956Z-d195/022-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base |
| red-green freeze | ok | 9 task(s): red and green compared (+1 opened by task text) |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/admin/AuditPage.tsx, web/src/admin/MappingsPage.tsx, web/src/admin/TeamsPage.tsx, web/src/admin/UsersPage.tsx, web/src/auth/AccountMenu.tsx (+41 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| python encoding | ok | 2 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2469 of 2469 base tests pass on the unit's code with its 12 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m6b_foundation.py kept at head for the run (people changed it last (dc68e6683a, 3cceda88b1))

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/conftest.py kept at head for the run (task 9.1: unfrozen by plan:m6b@baa8cf0256f61e2f)

## Tests unfrozen by human answers (allowed, L4-IMP-002)

- e2e/conftest.py (task 9.1, opened by its text, plan:m6b@baa8cf0256f61e2f)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-52eda073 | web-design-system › The new tokens are hex colours whose contrast pairs pass › The new tokens are hex and their contrast pairs pass | covered | web.src.kit.extra-contrast.test.ts::C-52eda073 a missing sidebar gives five zero-ratio failures (passed, red_assertion); web.src.kit.extra-contrast.test.ts::C-52eda073 a named accent-surface fails its two pairs with ratio 0 (passed, red_assertion); web.src.kit.extra-contrast.test.ts::C-52eda073 a we... | - | 0.94 | - |
| C-c476cd94 | web-design-system › One stylesheet entry layers the kit under the utilities › app.css keeps its imports, bridge and base layer in order | covered | web.src.styles.app-css.test.ts::C-c476cd94 app css bridges every token and restores the base layer (passed, red_assertion); web.src.styles.app-css.test.ts::C-c476cd94 app css keeps the thirteen imports in order (passed, red_assertion); web.src.styles.app-css.test.ts::C-c476cd94 main and vite config ... | - | 0.95 | - |
| C-595839c2 | web-design-system › The build emits the layers, the kit rules and the token utilities › The build emits layers, kit rules and token utilities | covered | web.src.styles.build.test.ts::C-595839c2 build emits layers kit rules and token utilities (passed, red_assertion); test_l4_c_595839c2::test_build_emits_layers_kit_rules_and_token_utilities[chromium] (passed, generated, base fail, head pass) | - | 0.90 | `e2e/test_l4_c_595839c2.py`, `.l4-out/e2e/page.html` |
| C-546ee64e | web-design-system › Unstyled elements stay readable and the signed-out pages stay clean › Signed-out pages are styled, clean and accessible | uncovered | - | test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/] (no proof that it discriminates (no red, audit or generated record)); test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/sign-in] (no proof that it discriminates (no red, audit or... | 0.21 | `e2e/test_l4_c_546ee64e.py`, `.l4-out/e2e/page.html` |
| C-d77fa65f | web-design-system › Source rules hold over `web/src` and `web/package.json` › Palette utilities, stylesheet imports and banned imports: hits and misses | covered | web.src.ui.rules.test.ts::C-d77fa65f banned imports: hits and misses (passed, red_assertion); web.src.ui.rules.test.ts::C-d77fa65f css imports: hits and misses (passed, red_assertion); web.src.ui.rules.test.ts::C-d77fa65f palette utilities: hits and misses (passed, red_assertion) | - | 0.93 | - |
| C-d3240b20 | web-design-system › Source rules hold over `web/src` and `web/package.json` › The real tree holds the rules, and the scanners scan themselves clean | covered | web.src.ui.rules-tree.test.ts::C-d3240b20 rules.ts scans itself clean and 20 files keep no stylesheet import (passed, red_assertion); web.src.ui.rules-tree.test.ts::C-d3240b20 the real tree has one stylesheet import and no banned or palette hit (passed, red_assertion) | - | 0.92 | - |
| C-3c9f8b7f | web-design-system › Source rules hold over `web/src` and `web/package.json` › The packages: no banned name, nine exact versions | covered | web.src.ui.packages.test.ts::C-3c9f8b7f BANNED_PACKAGES lists the 14 names in order (passed, red_assertion); web.src.ui.packages.test.ts::C-3c9f8b7f M6B_PACKAGES lists the nine exact versions (passed, red_assertion); web.src.ui.packages.test.ts::C-3c9f8b7f the manifest holds no banned name and each ... | - | 0.94 | - |
| C-d69c05cb | web-design-system › cn and buttonClasses merge classes by Tailwind's rules › cn and buttonClasses merge and order their classes | covered | web.src.ui.classes.test.ts::C-d69c05cb buttonClasses has the members of each row (passed, red_assertion); web.src.ui.classes.test.ts::C-d69c05cb cn merges by Tailwind rules (passed, red_assertion); web.src.ui.classes.test.ts::C-d69c05cb every tone and size pair keeps the kit class and no palette uti... | - | 0.92 | - |
| C-a22e8a8b | web-design-system › The components keep the markup, role and class rules › The components' sources keep the markup rules | covered | web.src.ui.components.test.ts::C-a22e8a8b badge source keeps the tone pairs (passed, red_assertion); web.src.ui.components.test.ts::C-a22e8a8b button source keeps the markup and class rules (passed, red_assertion); web.src.ui.components.test.ts::C-a22e8a8b card source keeps the token utilities (pass... | - | 0.92 | - |
| C-48ccaf77 | web-design-system › The tone mappers map known states and fall back to neutral › Tone mappers | covered | web.src.ui.tones.test.ts::C-48ccaf77 every tone mapper falls back to neutral for unknown input (passed, red_assertion); web.src.ui.tones.test.ts::C-48ccaf77 grantStatusTone maps each known status (passed, red_assertion); web.src.ui.tones.test.ts::C-48ccaf77 runStateTone maps each known state (passed... | - | 0.88 | - |
| C-67de6235 | web-design-system › Durations, instants and ages read as fixed texts › Durations, instants and ages | covered | web.src.ui.format.test.ts::C-67de6235 formatAgo answers the A rows (passed, red_assertion); web.src.ui.format.test.ts::C-67de6235 formatDuration answers the D rows (passed, red_assertion); web.src.ui.format.test.ts::C-67de6235 formatInstant answers the I rows (passed, red_assertion) | - | 0.92 | `e2e/test_l4_c_67de6235.py`, `.l4-out/e2e/page.html` |
| C-97e30a51 | web-design-system › Two browser helpers watch the CSP and measure the layout › watch_csp sees a violation and assert_layout reports numbers | covered | web.src.ui.e2e-helpers.test.ts::C-97e30a51 conftest defines watch_csp and assert_layout (passed, red_assertion); web.src.ui.e2e-helpers.test.ts::C-97e30a51 conftest still defines login and assert_accessible (passed, red_assertion) | test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m6b_foundation::test_watch_csp_reports_a_violation[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.73 | `e2e/test_l4_c_97e30a51.py`, `.l4-out/e2e/page.html` |
| C-f665c2d6 | web-runs › The new components follow the run sources' rules › Sources read as the rules say | covered | web.src.runs.dry-run-sources.test.ts::C-f665c2d6: 80-runs.tsx registers the Dry run panel beside the Test run panel (passed, pass_to_pass); web.src.runs.dry-run-sources.test.ts::C-f665c2d6: DryRunPanel.tsx has the form texts, a code element and no inline style (passed, pass_to_pass); web.src.runs.dr... | - | 0.93 | - |
| C-f357664d | web-runs › The new components follow the run sources' rules › The run sources import no stylesheet and the feature files stay | covered | web.src.runs.ui-foundation-sources.test.ts::C-f357664d the run sources import no stylesheet and the feature files stay (passed, red_assertion) | - | 0.96 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/conftest.py` |  | relevant | named in the spec |
| `e2e/test_m6b_foundation.py` |  | relevant | new test file |
| `openspec/changes/add-ui-foundation-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation-fix-1/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/ledger/r-20261118T1340Z-3d2a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/ledger/r-20261118T1604Z-68a7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/ledger/r-20261118T1820Z-992f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/.l4/ledger/r-20261118T1956Z-d195.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-ui-foundation/verification.md` |  | none | exempt: harness, spec or documentation path |
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

2578 of 2578 passed, 0 failed, 0 errored, 0 skipped.
43 of 43 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-52eda073 | not_testable | - | - | - | 1 | This criterion requires reading a local tokens.css file and programmatically evaluating contrast ratios for mutated token sets (F1-F3), which is not observable or driveable through the browser over the base origin; it is a unit-test concern, not user-visible behavior. | - |
| C-c476cd94 | not_testable | - | - | - | 1 | The criterion verifies source-file contents (app.css import order and bridge/base lines, tokens.css colours, main.tsx CSS imports, vite.config.ts plugins) by reading files on disk. None of this is observable through the browser's public interface or reachable by requesting only the base origin, so a... | - |
| C-595839c2 | accepted | e2e/test_l4_c_595839c2.py | fail | pass | 1 | support: base | - |
| C-546ee64e | uncollectable | e2e/test_l4_c_546ee64e.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-d77fa65f | not_testable | - | - | - | 1 | The criterion checks static source-code scanners for hits/misses on test-plan.md rows; it has no browser-observable outcome or named public UI interface to drive via page. | - |
| C-d3240b20 | not_testable | - | - | - | 1 | The criterion requires running three static-analysis scanners over the local source tree (every .ts/.tsx under web/src except *.test.ts, plus ui/rules.ts) and asserting filesystem-level results such as file counts and specific import lines. Nothing about this is observable through the browser page a... | - |
| C-3c9f8b7f | not_testable | - | - | - | 1 | The criterion reads web/package.json from the filesystem and compares package names/versions; nothing in the browser UI or page snapshot exposes the manifest, so it cannot be checked through the page fixture. | - |
| C-d69c05cb | not_testable | - | - | - | 1 | cn and buttonClasses are class-merging utilities with no browser-observable outcome; the page snapshot renders an empty root and no buttons, so the class strings cannot be asserted through the page fixture. | - |
| C-a22e8a8b | not_testable | - | - | - | 1 | The criterion inspects static source-file contents (findInlineStyleUse results, button.tsx and badge.tsx text) via a file reader; nothing rendered at the base URL exposes these sources, so a page-fixture test cannot observe the required outcome. | - |
| C-48ccaf77 | not_testable | - | - | - | 1 | The criterion checks return values of tone-mapper functions (runStateTone, versionStateTone, serverStateTone, grantStatusTone), which are not exposed through any page or user-observable UI element; there is nothing for the page fixture to assert, and test-plan.md T7 contents are unavailable. | - |
| C-67de6235 | uncollectable | e2e/test_l4_c_67de6235.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-97e30a51 | base_error | e2e/test_l4_c_97e30a51.py | error | - | 2 | the test errors at the merge base, which proves nothing: test_l4_c_97e30a51::test_assert_layout_reports_the_numbers[chromium], test_l4_c_97e30a51::test_watch_csp_reports_a_violation[chromium] | - |
| C-f665c2d6 | not_testable | - | - | - | 1 | The criterion verifies static source-file properties (findInlineStyleUse, dangerouslySetInnerHTML, registerEditorPanel/registerRunMessages calls, flowFeatureLiterals return value) that are not exposed through the rendered UI; only a subset of string labels is user-observable, so a pytest-playwright ... | - |
| C-f357664d | writer_failed | - | - | - | 1 | opencode's permission rules rejected a tool call (bash) | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-52eda073 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c476cd94 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-595839c2 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-546ee64e | ok | 0.210 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d77fa65f | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d3240b20 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3c9f8b7f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d69c05cb | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a22e8a8b | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-48ccaf77 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67de6235 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97e30a51 | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f665c2d6 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f357664d | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-d3240b20 | skipped | - | - | cap |
| C-52eda073 | skipped | - | - | cap |
| C-595839c2 | not_testable | - | - | The criterion is exercised by web/src/styles/build.test.ts, a Node/Vite test that runs build() on the real config; it requires the installed Vite/Tailwind toolchain (network) and exposes no Python public interface to import, so pytest cannot run it offline. |
| C-f357664d | not_testable | - | - | The criterion is checked by ui-foundation-sources.test.ts (Node/TypeScript) reading DryRunPanel.tsx, RunPage.tsx and 80-runs.tsx and calling findCssImports; the shown sources define no Python module under test implementing findCssImports, so pytest cannot import it. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-52eda073 | web-design-system › The new tokens are hex colours whose contrast pairs pass › The new tokens are hex and their contrast pairs pass | pass | pass | the judge passed it and a discriminating test passes |
| C-c476cd94 | web-design-system › One stylesheet entry layers the kit under the utilities › app.css keeps its imports, bridge and base layer in order | pass | pass | the judge passed it and a discriminating test passes |
| C-595839c2 | web-design-system › The build emits the layers, the kit rules and the token utilities › The build emits layers, kit rules and token utilities | pass | pass | the judge passed it and a discriminating test passes |
| C-546ee64e | web-design-system › Unstyled elements stay readable and the signed-out pages stay clean › Signed-out pages are styled, clean and accessible | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-d77fa65f | web-design-system › Source rules hold over `web/src` and `web/package.json` › Palette utilities, stylesheet imports and banned imports: hits and misses | pass | pass | the judge passed it and a discriminating test passes |
| C-d3240b20 | web-design-system › Source rules hold over `web/src` and `web/package.json` › The real tree holds the rules, and the scanners scan themselves clean | pass | pass | the judge passed it and a discriminating test passes |
| C-3c9f8b7f | web-design-system › Source rules hold over `web/src` and `web/package.json` › The packages: no banned name, nine exact versions | pass | pass | the judge passed it and a discriminating test passes |
| C-d69c05cb | web-design-system › cn and buttonClasses merge classes by Tailwind's rules › cn and buttonClasses merge and order their classes | pass | pass | the judge passed it and a discriminating test passes |
| C-a22e8a8b | web-design-system › The components keep the markup, role and class rules › The components' sources keep the markup rules | pass | pass | the judge passed it and a discriminating test passes |
| C-48ccaf77 | web-design-system › The tone mappers map known states and fall back to neutral › Tone mappers | pass | pass | the judge passed it and a discriminating test passes |
| C-67de6235 | web-design-system › Durations, instants and ages read as fixed texts › Durations, instants and ages | pass | pass | the judge passed it and a discriminating test passes |
| C-97e30a51 | web-design-system › Two browser helpers watch the CSP and measure the layout › watch_csp sees a violation and assert_layout reports numbers | pass | pass | the judge passed it and a discriminating test passes |
| C-f665c2d6 | web-runs › The new components follow the run sources' rules › Sources read as the rules say | pass | pass | the judge passed it and a discriminating test passes |
| C-f357664d | web-runs › The new components follow the run sources' rules › The run sources import no stylesheet and the feature files stay | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-546ee64e): test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-546ee64e): test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/sign-in]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-97e30a51): test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-97e30a51): test_m6b_foundation::test_watch_csp_reports_a_violation[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-52eda073): No end-to-end test traces criterion C-52eda073 (web-design-system › The new tokens are hex colours whose contrast pairs pass › The new tokens are hex and their contrast pairs pass); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c476cd94): No end-to-end test traces criterion C-c476cd94 (web-design-system › One stylesheet entry layers the kit under the utilities › app.css keeps its imports, bridge and base layer in order); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-595839c2): No end-to-end test traces criterion C-595839c2 (web-design-system › The build emits the layers, the kit rules and the token utilities › The build emits layers, kit rules and token utilities); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-546ee64e): The end-to-end test test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/], test_m6b_foundation::test_signed_out_pages_are_styled_clean_and_accessible[chromium-/sign-in] traces criterion C-546ee64e (web-design-system › Unstyled elements stay readable and the signed-out pages stay clean › Signed-out pages are styled, clean and accessible), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d77fa65f): No end-to-end test traces criterion C-d77fa65f (web-design-system › Source rules hold over `web/src` and `web/package.json` › Palette utilities, stylesheet imports and banned imports: hits and misses); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d3240b20): No end-to-end test traces criterion C-d3240b20 (web-design-system › Source rules hold over `web/src` and `web/package.json` › The real tree holds the rules, and the scanners scan themselves clean); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3c9f8b7f): No end-to-end test traces criterion C-3c9f8b7f (web-design-system › Source rules hold over `web/src` and `web/package.json` › The packages: no banned name, nine exact versions); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d69c05cb): No end-to-end test traces criterion C-d69c05cb (web-design-system › cn and buttonClasses merge classes by Tailwind's rules › cn and buttonClasses merge and order their classes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a22e8a8b): No end-to-end test traces criterion C-a22e8a8b (web-design-system › The components keep the markup, role and class rules › The components' sources keep the markup rules); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-48ccaf77): No end-to-end test traces criterion C-48ccaf77 (web-design-system › The tone mappers map known states and fall back to neutral › Tone mappers); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-67de6235): No end-to-end test traces criterion C-67de6235 (web-design-system › Durations, instants and ages read as fixed texts › Durations, instants and ages); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-97e30a51): The end-to-end test test_m6b_foundation::test_assert_layout_reports_the_numbers[chromium], test_m6b_foundation::test_watch_csp_reports_a_violation[chromium] traces criterion C-97e30a51 (web-design-system › Two browser helpers watch the CSP and measure the layout › watch_csp sees a violation and assert_layout reports numbers), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f665c2d6): No end-to-end test traces criterion C-f665c2d6 (web-runs › The new components follow the run sources' rules › Sources read as the rules say); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f357664d): No end-to-end test traces criterion C-f357664d (web-runs › The new components follow the run sources' rules › The run sources import no stylesheet and the feature files stay); step 5 generates one.

## Needs a human

- UI criterion C-52eda073 has no end-to-end test; see the generated UI tests table
- UI criterion C-c476cd94 has no end-to-end test; see the generated UI tests table
- UI criterion C-546ee64e has no end-to-end test; see the generated UI tests table
- UI criterion C-d77fa65f has no end-to-end test; see the generated UI tests table
- UI criterion C-d3240b20 has no end-to-end test; see the generated UI tests table
- UI criterion C-3c9f8b7f has no end-to-end test; see the generated UI tests table
- UI criterion C-d69c05cb has no end-to-end test; see the generated UI tests table
- UI criterion C-a22e8a8b has no end-to-end test; see the generated UI tests table
- UI criterion C-48ccaf77 has no end-to-end test; see the generated UI tests table
- UI criterion C-67de6235 has no end-to-end test; see the generated UI tests table
- UI criterion C-97e30a51 has no end-to-end test; see the generated UI tests table
- UI criterion C-f665c2d6 has no end-to-end test; see the generated UI tests table
- UI criterion C-f357664d has no end-to-end test; see the generated UI tests table

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
- guard.violation: e2e/conftest.py
