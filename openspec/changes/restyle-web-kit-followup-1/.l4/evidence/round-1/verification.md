# Verification: openspec:restyle-web-kit-followup-1: NEEDS_HUMAN (round 1)

traceability: 11/11 criteria covered by a discriminating test

- Base: `f5fc93e50171eed1c16dee5477b840e356b41f11`
- Head: `fcfd99ddce195844108215e68e5893b4758914d4`
- Implementer profiles: deepseek-free
- Judge: beam-judge, 1 call(s), prompt sha256 `4811d33ffb659ed7d3b169dd3f8967ce1d707a88a0c1cacbd4bb57f5689b8ece`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared)
- Cost: $0.2298

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base merged: main@f5fc93e501 as fcfd99ddce (5 commits) |
| 1 | integrity | ok | 250.9 | 11 sub-checks; scope: 11 changed file(s) |
| 2 | build | ok | 29.0 |  |
| 3 | tests | ok | 486.0 |  |
| 4 | traceability | ok | 0.2 | 11/11 criteria covered |
| 4a | audit sampling | ok | 7.5 | 1 not_testable; support files at the base: 2 |
| 5 | ui test generation | ok | 28.4 | 8 not_testable; 1 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | 100.0% of the changed executable lines ran |
| 8 | s1 judge | ok | 1.0 | 11/11 criteria judged by jev |
| 9 | judge | ok | 59.0 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261121T1256Z-d12f/025-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261121T1256Z-d12f/026-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261121T1256Z-d12f/027-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261121T1256Z-d12f/028-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261121T1256Z-d12f/029-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261121T1256Z-d12f/030-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261121T1256Z-d12f/031-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | skipped | no production file changed |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/kit/page-header-meta.test.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2668 of 2668 base tests pass on the unit's code with its 2 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-6027f26f | web-data-kit › Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001 › Page header meta: a wrapping row below the title, with gaps between items | covered | web.src.kit.page-header-meta.test.ts::C-6027f26f the page header meta is a full-width wrapping row with a gap (passed, red_assertion, inadequate) | test_run_header_meta::test_page_header_meta_wraps_below_the_title_with_gaps[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.89 | - |
| C-97684e64 | web-data-kit › A table caption can be hidden and still names the table › captionClass and the DataTable wiring | covered | web.src.kit.data.caption-class.test.ts::C-97684e64 DataTable writes the caption class and keeps both aria labels (passed, pass_to_pass); web.src.kit.data.caption-class.test.ts::C-97684e64 captionClass gives the visible and hidden class strings (passed, pass_to_pass) | - | 0.90 | - |
| C-66cb6cb0 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › data.css keeps every pinned rule and adds the new declarations | covered | web.src.kit.data.data-restyle.test.ts::C-66cb6cb0 data.css keeps every pinned rule and adds the new declarations (passed, pass_to_pass) | - | 0.79 | - |
| C-859c63d2 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row | covered | test_m6b_kit::test_users_table_is_a_card_with_a_header_and_a_hover_row[chromium] (passed, pass_to_pass) | - | 0.80 | - |
| C-23da30c9 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The field order, the hidden prefix and the form tone in the sources | covered | web.src.kit.data.field-order.test.ts::C-23da30c9 the Form submit button carries the primary tone once (passed, pass_to_pass); web.src.kit.data.field-order.test.ts::C-23da30c9 the inline Field order and the Error prefix stay while the stacked order changes (passed, pass_to_pass); web.src.kit.data.fie... | - | 0.78 | - |
| C-40cb2e75 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring | covered | test_m6b_kit::test_flows_form_is_bounded_and_keeps_its_focus_ring[chromium] (passed, pass_to_pass) | - | 0.84 | - |
| C-3192e29f | web-kit › Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css › Tone, dialog, state and toast rules are token-only and the toast is unchanged | covered | web.src.kit.theme-restyle.test.ts::C-3192e29f tone, dialog, state and toast rules are token-only and the toast is unchanged (passed, pass_to_pass) | - | 0.83 | - |
| C-2c488542 | web-kit › The pinned kit markup is unchanged and a tone is only an attribute › Kit sources keep their roles, texts and order | covered | web.src.kit.kit-markup.test.ts::C-2c488542 kit sources keep their roles texts and order and the confirm carries its tone (passed, pass_to_pass) | - | 0.90 | - |
| C-ab3cdbf6 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › sectionHeadingId, captionDisplayFor and PAGE_WIDTHS | covered | web.src.kit.layout.layout.test.ts::C-ab3cdbf6 sectionHeadingId captionDisplayFor and PAGE_WIDTHS are fixed strings (passed, pass_to_pass) | - | 0.80 | - |
| C-dac61932 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › The layout sources hold no landmark, role, link or inline style | covered | web.src.kit.layout.layout-sources.test.ts::C-dac61932 the layout sources hold no landmark role link or inline style (passed, pass_to_pass) | - | 0.87 | - |
| C-5b9e6539 | web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus | covered | test_m6b_kit::test_disable_dialog_is_centred_toned_and_returns_focus[chromium] (passed, pass_to_pass) | - | 0.79 | - |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

100.0% of the changed executable lines ran.

| Function | Status | Lines run | Tests |
|---|---|---|---|

### Tests

2787 of 2788 passed, 1 failed, 0 errored, 0 skipped.
2 of 2 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-6027f26f | not_testable | - | - | - | 1 | The run-page mock in e2e/test_m6b_run_view.py (routes and payloads for completed run_1) is not among the supplied support files, so the page cannot be rendered reliably.; covered by step 4: web.src.kit.page-header-meta.test.ts::C-6027f26f the page header meta is a full-width wrapping row with a gap;... | - |
| C-97684e64 | not_testable | - | - | - | 1 | Criterion checks a unit function's return values and source-file contents (DataTable.tsx, theme.css text), not browser-observable behaviour; no e2e page exercises it. | - |
| C-66cb6cb0 | not_testable | - | - | - | 1 | The criterion checks CSS source files (data.css, tokens.css) through a node unit test; it is not observable through the browser UI. | - |
| C-23da30c9 | not_testable | - | - | - | 1 | Criterion asserts the order of JSX in Field.tsx/Form.tsx source files read by a node test; it is not observable through the served browser UI. | - |
| C-3192e29f | not_testable | - | - | - | 1 | Criterion is about a node:test source-file check of theme.css/tokens.css text, not browser-observable behaviour. | - |
| C-2c488542 | not_testable | - | - | - | 1 | Criterion checks kit .tsx source text via readFileSync in a node test; it has no browser-observable outcome. | - |
| C-ab3cdbf6 | not_testable | - | - | - | 1 | Criterion is about unit-test results of pure TypeScript helpers in layout.test.ts, not observable browser behavior. | - |
| C-dac61932 | not_testable | - | - | - | 1 | Criterion asserts on source files and directory listings of the repo (a node:test unit test), not on anything observable in the browser. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-6027f26f | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97684e64 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-66cb6cb0 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-859c63d2 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23da30c9 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-40cb2e75 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3192e29f | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2c488542 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ab3cdbf6 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dac61932 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5b9e6539 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-6027f26f | not_testable | - | - | Browser layout check at two viewport sizes on a mocked page; no importable Python module or shown e2e mock helper to build a self-contained test. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-6027f26f | web-data-kit › Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001 › Page header meta: a wrapping row below the title, with gaps between items | pass | needs_human | uncovered: the tests that trace it are inadequate or did not pass |
| C-97684e64 | web-data-kit › A table caption can be hidden and still names the table › captionClass and the DataTable wiring | pass | pass | the judge passed it and a discriminating test passes |
| C-66cb6cb0 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › data.css keeps every pinned rule and adds the new declarations | pass | pass | the judge passed it and a discriminating test passes |
| C-859c63d2 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row | pass | pass | the judge passed it and a discriminating test passes |
| C-23da30c9 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The field order, the hidden prefix and the form tone in the sources | pass | pass | the judge passed it and a discriminating test passes |
| C-40cb2e75 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring | pass | pass | the judge passed it and a discriminating test passes |
| C-3192e29f | web-kit › Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css › Tone, dialog, state and toast rules are token-only and the toast is unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-2c488542 | web-kit › The pinned kit markup is unchanged and a tone is only an attribute › Kit sources keep their roles, texts and order | pass | pass | the judge passed it and a discriminating test passes |
| C-ab3cdbf6 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › sectionHeadingId, captionDisplayFor and PAGE_WIDTHS | pass | pass | the judge passed it and a discriminating test passes |
| C-dac61932 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › The layout sources hold no landmark, role, link or inline style | pass | pass | the judge passed it and a discriminating test passes |
| C-5b9e6539 | web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-6027f26f): test_run_header_meta::test_page_header_meta_wraps_below_the_title_with_gaps[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-6027f26f): The end-to-end test test_run_header_meta::test_page_header_meta_wraps_below_the_title_with_gaps[chromium] traces criterion C-6027f26f (web-data-kit › Page header meta: a wrapping row below the title, with gaps between items — feedback FB-001 › Page header meta: a wrapping row below the title, with gaps between items), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-97684e64): No end-to-end test traces criterion C-97684e64 (web-data-kit › A table caption can be hidden and still names the table › captionClass and the DataTable wiring); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-66cb6cb0): No end-to-end test traces criterion C-66cb6cb0 (web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › data.css keeps every pinned rule and adds the new declarations); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-23da30c9): No end-to-end test traces criterion C-23da30c9 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The field order, the hidden prefix and the form tone in the sources); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3192e29f): No end-to-end test traces criterion C-3192e29f (web-kit › Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css › Tone, dialog, state and toast rules are token-only and the toast is unchanged); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2c488542): No end-to-end test traces criterion C-2c488542 (web-kit › The pinned kit markup is unchanged and a tone is only an attribute › Kit sources keep their roles, texts and order); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ab3cdbf6): No end-to-end test traces criterion C-ab3cdbf6 (web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › sectionHeadingId, captionDisplayFor and PAGE_WIDTHS); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-dac61932): No end-to-end test traces criterion C-dac61932 (web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › The layout sources hold no landmark, role, link or inline style); step 5 generates one.
- [minor, judge] the judge called a test inadequate (criterion C-6027f26f): web.src.kit.page-header-meta.test.ts::C-6027f26f the page header meta is a full-width wrapping row with a gap

## Feedback

- FB-001: judged addressed, pending a PASS round: web/src/kit/theme.css (added .ui-page-header-meta, .ui-page-header-meta > *, and .ui-page-header-actions rules)

## Needs a human

- UI criterion C-97684e64 has no end-to-end test; see the generated UI tests table
- UI criterion C-66cb6cb0 has no end-to-end test; see the generated UI tests table
- UI criterion C-23da30c9 has no end-to-end test; see the generated UI tests table
- UI criterion C-3192e29f has no end-to-end test; see the generated UI tests table
- UI criterion C-2c488542 has no end-to-end test; see the generated UI tests table
- UI criterion C-ab3cdbf6 has no end-to-end test; see the generated UI tests table
- UI criterion C-dac61932 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.kit.page-header-meta.test.ts::C-6027f26f the page header meta is a full-width wrapping row with a gap` (task 1.1): passed
