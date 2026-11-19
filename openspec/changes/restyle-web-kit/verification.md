# Verification: openspec:restyle-web-kit: PASS (round 2)

traceability: 7/10 criteria covered by a discriminating test

- Base: `1ff8361a9b146f38f37370bc176ab6ec81000cff`
- Head: `2f9a9e17df6e145db52bcd56a6edacd395efa4e7`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `40ce5d03253bdcc5e6d0d04f1dc3000bec7c8318e069c98017068ee82847c8c7`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | reused | 0.0 | reused (round 1) |
| 5 | ui test generation | reused | 0.0 | reused (round 1) |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261119T0644Z-06af/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261119T0644Z-06af/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261119T0644Z-06af/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261119T0644Z-06af/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261119T0644Z-06af/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261119T0644Z-06af/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261119T0644Z-06af/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 6 task(s): red and green compared |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/kit/ConfirmDialog.tsx, web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/caption-class.test.ts (+10 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2533 of 2533 base tests pass on the unit's code with its 8 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-97684e64 | web-data-kit › A table caption can be hidden and still names the table › captionClass and the DataTable wiring | covered | web.src.kit.data.caption-class.test.ts::C-97684e64 DataTable writes the caption class and keeps both aria labels (passed, red_assertion); web.src.kit.data.caption-class.test.ts::C-97684e64 captionClass gives the visible and hidden class strings (passed, red_assertion) | - | 0.94 | - |
| C-66cb6cb0 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › data.css keeps every pinned rule and adds the new declarations | covered | web.src.kit.data.data-restyle.test.ts::C-66cb6cb0 data.css keeps every pinned rule and adds the new declarations (passed, red_assertion) | - | 0.83 | - |
| C-859c63d2 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row | uncovered | - | test_m6b_kit::test_users_table_is_a_card_with_a_header_and_a_hover_row[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.16 | `e2e/test_l4_c_859c63d2.py`, `test-results/test-l4-c-859c63d2-py-test-users-table-is-a-card-with-a-header-and-a-hover-row-chromium/test-failed-1.png`, `test-results/test-l4-c-859c63d2-py-test-users-table-is-a-card-with-a-header-and-a-hover-row-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-23da30c9 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The field order, the hidden prefix and the form tone in the sources | covered | web.src.kit.data.field-order.test.ts::C-23da30c9 the Form submit button carries the primary tone once (passed, red_assertion); web.src.kit.data.field-order.test.ts::C-23da30c9 the inline Field order and the Error prefix stay while the stacked order changes (passed, red_assertion); web.src.kit.data.f... | - | 0.94 | - |
| C-40cb2e75 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring | uncovered | - | test_m6b_kit::test_flows_form_is_bounded_and_keeps_its_focus_ring[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.13 | `e2e/test_l4_c_40cb2e75.py`, `.l4-out/e2e/page.html` |
| C-3192e29f | web-kit › Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css › Tone, dialog, state and toast rules are token-only and the toast is unchanged | covered | web.src.kit.theme-restyle.test.ts::C-3192e29f tone, dialog, state and toast rules are token-only and the toast is unchanged (passed, red_assertion) | - | 0.87 | - |
| C-2c488542 | web-kit › The pinned kit markup is unchanged and a tone is only an attribute › Kit sources keep their roles, texts and order | covered | web.src.kit.kit-markup.test.ts::C-2c488542 kit sources keep their roles texts and order and the confirm carries its tone (passed, red_assertion) | - | 0.92 | - |
| C-ab3cdbf6 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › sectionHeadingId, captionDisplayFor and PAGE_WIDTHS | covered | web.src.kit.layout.layout.test.ts::C-ab3cdbf6 sectionHeadingId captionDisplayFor and PAGE_WIDTHS are fixed strings (passed, red_assertion) | - | 0.89 | - |
| C-dac61932 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › The layout sources hold no landmark, role, link or inline style | covered | web.src.kit.layout.layout-sources.test.ts::C-dac61932 the layout sources hold no landmark role link or inline style (passed, red_assertion) | - | 0.92 | - |
| C-5b9e6539 | web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus | uncovered | - | test_m6b_kit::test_disable_dialog_is_centred_toned_and_returns_focus[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.14 | `e2e/test_l4_c_5b9e6539.py`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_kit.py` |  | relevant | new test file |
| `openspec/changes/restyle-web-kit/.l4/ledger/r-20261119T0127Z-db24.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-web-kit/.l4/ledger/r-20261119T0403Z-bfe7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/restyle-web-kit/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/kit/ConfirmDialog.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/DataTable.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/Field.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/Form.tsx` | web | relevant | named in the spec |
| `web/src/kit/data/caption-class.test.ts` |  | relevant | new test file |
| `web/src/kit/data/data-restyle.test.ts` |  | relevant | new test file |
| `web/src/kit/data/data-table.ts` | web | relevant | named in the spec |
| `web/src/kit/data/data.css` | web | relevant | named in the spec |
| `web/src/kit/data/field-order.test.ts` |  | relevant | new test file |
| `web/src/kit/kit-markup.test.ts` |  | relevant | new test file |
| `web/src/kit/layout/PageHeader.tsx` | web | relevant | named in the spec |
| `web/src/kit/layout/Section.tsx` | web | relevant | named in the spec |
| `web/src/kit/layout/layout-sources.test.ts` |  | relevant | new test file |
| `web/src/kit/layout/layout.test.ts` |  | relevant | new test file |
| `web/src/kit/layout/layout.ts` | web | relevant | named in the spec |
| `web/src/kit/theme-restyle.test.ts` |  | relevant | new test file |
| `web/src/kit/theme.css` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/kit/ConfirmDialog.tsx, web/src/kit/data/DataTable.tsx, web/src/kit/data/Field.tsx, web/src/kit/data/Form.tsx, web/src/kit/data/data-table.ts and 3 more

### Tests

2617 of 2617 passed, 0 failed, 0 errored, 0 skipped.
13 of 13 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-97684e64 | writer_failed | - | - | - | 1 | no answer within 600s | - |
| C-66cb6cb0 | not_testable | - | - | - | 1 | This criterion is a static audit of CSS source files (one rule per pinned selector, exact declarations, findRawColours === [], defined CSS vars, no @media) with no user-observable outcome through the page's public interface, so it cannot be verified by an E2E browser test. | - |
| C-859c63d2 | fails_at_head | e2e/test_l4_c_859c63d2.py | fail | fail | 2 | the test fails at the head: test_l4_c_859c63d2::test_users_table_is_a_card_with_a_header_and_a_hover_row[chromium] | test-results/test-l4-c-859c63d2-py-test-users-table-is-a-card-with-a-header-and-a-hover-row-chromium/test-failed-1.png, test-results/test-l4-c-859c63d2-py-test-users-table-is-a-card-with-a-header-and-a-hover-row-chromium/trace.zip |
| C-23da30c9 | not_testable | - | - | - | 1 | The criterion verifies static TSX source structure (JSX child order in Field/Form and a data-tone occurrence count in source), which is not user-observable through the page fixture, and no route is given to mount a Field/Form. | - |
| C-40cb2e75 | uncollectable | e2e/test_l4_c_40cb2e75.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-3192e29f | not_testable | - | - | - | 1 | The criterion asserts internal CSS file structure (theme.css/tokens.css rules read by a Node unit test); the page renders no kit buttons, dialogs, states or toasts, so nothing is observable through the page fixture. | - |
| C-2c488542 | not_testable | - | - | - | 1 | Criterion verifies static source-file string contents via readFileSync; nothing user-observable is exposed at the base URL (snapshot shows only an empty #root), so it cannot be checked through the pytest-playwright page fixture. | - |
| C-ab3cdbf6 | not_testable | - | - | - | 1 | sectionHeadingId, captionDisplayFor and PAGE_WIDTHS are pure layout helpers not exposed through any browser-observable interface on the base origin page (empty root), so a pytest-playwright e2e test limited to that origin cannot observe them. | - |
| C-dac61932 | not_testable | - | - | - | 1 | The criterion asserts static source-file contents (banned strings, exact markup, directory listings of kit/ and kit/layout/) rather than anything observable through the page; the snapshot renders only an empty #root, so there is no public UI interface to assert against. | - |
| C-5b9e6539 | writer_failed | e2e/test_l4_c_5b9e6539.py | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-97684e64 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-66cb6cb0 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-859c63d2 | ok | 0.160 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23da30c9 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-40cb2e75 | ok | 0.130 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3192e29f | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2c488542 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ab3cdbf6 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dac61932 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5b9e6539 | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-dac61932 | skipped | - | - | cap |
| C-2c488542 | not_testable | - | - | The criterion is a Node source-reading test (readFileSync over eleven kit .tsx files listed in test-plan.md T2). No Python module under test is shown, and neither the eleven file paths nor test-plan.md are provided, so a self-contained pytest test would have to guess file paths and the full file lis |
| C-97684e64 | rejected | e2e/test_l4_audit_c_97684e64_r1.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_97684e64_r1.py |

## Rejected audit tests

- C-97684e64: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_97684e64_r1.py

## Answers to verdict questions

- Q-001 accept C-859c63d2 by the delegate (claude-fable-5-1 via claude-code): The repository's own browser test pins this scenario exactly and the kit sources produce every value it asserts. The card wrapper rule gives the divider border, the large radius and horizontal scrolling, and the tokens resolve to the asserted colours: the divider token is #d0d5dd, which is rgb(208, ...
- Q-002 accept C-40cb2e75 by the delegate (claude-fable-5-1 via claude-code): The repository's own browser test pins this scenario exactly and the sources produce every value it asserts. The stacked Field renders label, control, then hint and error, so the children of the Flow name field are the label, the input, the hint paragraph and the error paragraph in that order; the F...
- Q-003 accept C-5b9e6539 by the delegate (claude-fable-5-1 via claude-code): The repository's own browser test pins this scenario exactly and the sources produce every value it asserts. The dialog is the native dialog element with one h2 and two buttons; its rule sets width 32rem, which is 512px, and the app stylesheet gives dialog margin auto, so a modal dialog is centred a...
- Q-004 accept H-09735f2a by the delegate (claude-fable-5-1 via claude-code): The hold can be waived. The criterion's scenario is a Node source test, not a browser journey: it runs captionClass on three inputs and reads DataTable.tsx and theme.css. That test exists, is named with the criterion id, and its assertions hold against the current sources: captionClass returns the v...
- Q-005 accept H-b35898ab by the delegate (claude-fable-5-1 via claude-code): The hold can be waived. The criterion's scenario is a Node audit of data.css and tokens.css: one rule per pinned selector, the listed declarations, no raw colour, only defined tokens and no media query. That test exists, is named with the criterion id, and its rows hold against the current data.css:...
- Q-006 accept H-5c5d8c36 by the delegate (claude-fable-5-1 via claude-code): The hold can be waived. The repository's own browser test for this scenario opens the Users page with the mocked answers, reads the card wrapper, the Name header, the caption and the Bob Example row before and after the hover, and it ran green in the unit's end-to-end gate at the head. The sources g...
- Q-007 accept H-7415271d by the delegate (claude-fable-5-1 via claude-code): The hold can be waived. The criterion's scenario is a Node source test, not a browser journey: it reads the Field and Form sources and checks the order of the label, control and described blocks, the hidden Error prefix pattern and one primary tone on the submit button. That test exists, is named wi...
- Q-008 accept H-f260119c by agent (CLAUDECODE): the judge passed it and test_flows_form_is_bounded_and_keeps_its_focus_ring, which asserts every THEN value of the scenario, passed in the round-1 e2e gate (all tests pass at head). It discriminates although no red record exists for a browser test: at the unit base 1ff8361a the Form submit had no da...
- Q-009 accept H-1db9756c by the delegate (claude-fable-5-1 via claude-code): The hold can be waived. The criterion's scenario is a Node audit of the theme and tokens stylesheets: one rule per listed selector with its declarations, the primary tone rule after the disabled rule, no raw colour, only defined tokens, 25 colour tokens with the toast background unchanged, and three...
- Q-010 accept H-2dab7e00 by the delegate (claude-fable-5-1 via claude-code): The hold can be waived. The criterion's scenario is a Node source test that reads the eleven kit component files and checks their pinned strings and counts: the native dialog with its form, showModal, cancel before confirm and one data-tone computed from destructive; one primary tone and one alert r...
- Q-011 accept H-6bc82384 by agent (CLAUDECODE): the criterion is about the fixed strings returned by the pure helpers sectionHeadingId, captionDisplayFor and PAGE_WIDTHS, which no page shows by itself, so step 5 rightly found no browser test to write. Its Node test failed red then passed green (task 6.1), and the judge passed it. The judge's mino...
- Q-012 accept H-a317ca0a by agent (CLAUDECODE): the criterion checks the source text of the layout files (no landmark, role, link or inline style) and the kit directory listing, which no page shows, so step 5 rightly found no browser test to write. Its Node test failed red then passed green (task 6.1), and the judge passed it.
- Q-013 accept H-95a10e9a by the delegate (claude-fable-5-1 via claude-code): The hold can be waived. The criterion is covered by the unit's own browser test in the end-to-end suite, tagged with the criterion id, which opens the Users page with the mocked me and users answers at 1366 by 860 after watching for Content Security Policy messages, clicks Disable Bob Example, check...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-97684e64 | web-data-kit › A table caption can be hidden and still names the table › captionClass and the DataTable wiring | pass | pass | the judge passed it and a discriminating test passes |
| C-66cb6cb0 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › data.css keeps every pinned rule and adds the new declarations | pass | pass | the judge passed it and a discriminating test passes |
| C-859c63d2 | web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The repository's own browser test pins this scenario exactly and the kit sources produce every value it asserts. The card wrapper rule gives the divider border, the large radius and horizontal scrolling, and the tokens resolve to the asser... |
| C-23da30c9 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The field order, the hidden prefix and the form tone in the sources | pass | pass | the judge passed it and a discriminating test passes |
| C-40cb2e75 | web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The repository's own browser test pins this scenario exactly and the sources produce every value it asserts. The stacked Field renders label, control, then hint and error, so the children of the Flow name field are the label, the input, th... |
| C-3192e29f | web-kit › Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css › Tone, dialog, state and toast rules are token-only and the toast is unchanged | pass | pass | the judge passed it and a discriminating test passes |
| C-2c488542 | web-kit › The pinned kit markup is unchanged and a tone is only an attribute › Kit sources keep their roles, texts and order | pass | pass | the judge passed it and a discriminating test passes |
| C-ab3cdbf6 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › sectionHeadingId, captionDisplayFor and PAGE_WIDTHS | pass | pass | the judge passed it and a discriminating test passes |
| C-dac61932 | web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › The layout sources hold no landmark, role, link or inline style | pass | pass | the judge passed it and a discriminating test passes |
| C-5b9e6539 | web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus | pass | pass | accepted by the delegate (claude-fable-5-1 via claude-code): The repository's own browser test pins this scenario exactly and the sources produce every value it asserts. The dialog is the native dialog element with one h2 and two buttons; its rule sets width 32rem, which is 512px, and the app styles... |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-859c63d2): test_m6b_kit::test_users_table_is_a_card_with_a_header_and_a_hover_row[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-40cb2e75): test_m6b_kit::test_flows_form_is_bounded_and_keeps_its_focus_ring[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5b9e6539): test_m6b_kit::test_disable_dialog_is_centred_toned_and_returns_focus[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-97684e64): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_97684e64_r1.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-97684e64): No end-to-end test traces criterion C-97684e64 (web-data-kit › A table caption can be hidden and still names the table › captionClass and the DataTable wiring); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-66cb6cb0): No end-to-end test traces criterion C-66cb6cb0 (web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › data.css keeps every pinned rule and adds the new declarations); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-859c63d2): The end-to-end test test_m6b_kit::test_users_table_is_a_card_with_a_header_and_a_hover_row[chromium] traces criterion C-859c63d2 (web-data-kit › data.css makes tables cards and bounds fields without breaking a pinned rule › A table is a card with a header row and a hover row), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-23da30c9): No end-to-end test traces criterion C-23da30c9 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The field order, the hidden prefix and the form tone in the sources); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-40cb2e75): The end-to-end test test_m6b_kit::test_flows_form_is_bounded_and_keeps_its_focus_ring[chromium] traces criterion C-40cb2e75 (web-data-kit › Field puts the control before its hint and error, and Form's submit is the accent tone › The Flows form is bounded, toned and keeps its prefix and focus ring), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3192e29f): No end-to-end test traces criterion C-3192e29f (web-kit › Kit buttons, dialogs, states and toasts are styled by token-only rules in theme.css › Tone, dialog, state and toast rules are token-only and the toast is unchanged); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2c488542): No end-to-end test traces criterion C-2c488542 (web-kit › The pinned kit markup is unchanged and a tone is only an attribute › Kit sources keep their roles, texts and order); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ab3cdbf6): No end-to-end test traces criterion C-ab3cdbf6 (web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › sectionHeadingId, captionDisplayFor and PAGE_WIDTHS); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-dac61932): No end-to-end test traces criterion C-dac61932 (web-kit › Layout helpers are fixed strings and PageHeader and Section are plain wrappers › The layout sources hold no landmark, role, link or inline style); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5b9e6539): The end-to-end test test_m6b_kit::test_disable_dialog_is_centred_toned_and_returns_focus[chromium] traces criterion C-5b9e6539 (web-kit › A confirm dialog opens centred with its tone and returns focus › The Disable dialog is centred, toned and returns focus), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] sectionHeadingId leaves the prefix unslugified (spec gap) (criterion C-ab3cdbf6): test-plan.md T3 pins only lowercase prefixes (flow, runs, a, x, p). The implementation returns `${prefix}-${slug}`, copying the prefix verbatim, so a prefix with uppercase letters or characters outside [a-z0-9] (e.g. "Flow", "A-B") is unpinned and two reasonable implementations could differ (slugify the prefix too, or keep it raw as the code does).

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.kit.data.caption-class.test.ts::C-97684e64 DataTable writes the caption class and keeps both aria labels` (task 3.1): passed
- `web.src.kit.data.caption-class.test.ts::C-97684e64 captionClass gives the visible and hidden class strings` (task 3.1): passed
- `web.src.kit.data.data-restyle.test.ts::C-66cb6cb0 data.css keeps every pinned rule and adds the new declarations` (task 2.1): passed
- `web.src.kit.data.field-order.test.ts::C-23da30c9 the Form submit button carries the primary tone once` (task 4.1): passed
- `web.src.kit.data.field-order.test.ts::C-23da30c9 the inline Field order and the Error prefix stay while the stacked order changes` (task 4.1): passed
- `web.src.kit.data.field-order.test.ts::C-23da30c9 the stacked Field renders label then control then described` (task 4.1): passed
- `web.src.kit.kit-markup.test.ts::C-2c488542 kit sources keep their roles texts and order and the confirm carries its tone` (task 5.1): passed
- `web.src.kit.layout.layout-sources.test.ts::C-dac61932 the layout sources hold no landmark role link or inline style` (task 6.1): passed
- `web.src.kit.layout.layout.test.ts::C-ab3cdbf6 sectionHeadingId captionDisplayFor and PAGE_WIDTHS are fixed strings` (task 6.1): passed
- `web.src.kit.theme-restyle.test.ts::C-3192e29f tone, dialog, state and toast rules are token-only and the toast is unchanged` (task 1.1): passed
