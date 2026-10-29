# Verification: openspec:add-web-ui-kit: NEEDS_HUMAN (round 1)

traceability: 29/30 criteria covered by a discriminating test

- Base: `f16558c6dca3050ee88f2f0ab5d2f8aeed9dc49e`
- Head: `f4cea31e9a1cfbfb31975436f84208ba34511c26`
- Implementer profiles: deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `1bcf6fdc039e1c1981f5196246f3df23acdebd455e5ec1f11818d5ba6a37a13f`
  - part 1: 27 file(s), 116511 characters, profile claude-judge, reply valid
  - part 2: 6 file(s), 21050 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 2, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $4.3334

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base merged: main@f16558c6dc as f4cea31e9a (2 commits) |
| 1 | integrity | ok | 69.8 | 10 sub-checks (+2 unfrozen by human answers); scope: 38 changed file(s) |
| 2 | build | ok | 22.5 |  |
| 3 | tests | ok | 77.8 |  |
| 4 | traceability | ok | 0.1 | 27/30 criteria covered |
| 4a | audit sampling | ok | 16.1 | 2 not_testable, 7 skipped; support files at the base: 12 |
| 5 | ui test generation | ok | 275.6 | 2 accepted, 1 fails_at_head, 27 not_testable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx, web/src/kit/ErrorPanel.tsx and 13 more |
| 8 | s1 judge | ok | 2.2 | 30/30 criteria judged by jev |
| 9 | judge | ok | 181.3 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261029T2009Z-d59b/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261029T2009Z-d59b/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261029T2009Z-d59b/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261029T2009Z-d59b/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261029T2009Z-d59b/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261029T2009Z-d59b/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261029T2009Z-d59b/020-e2e.log |

## Files by part

- part 1: test/support/a11y-setup.test.ts (6886 characters)
- part 1: test/support/a11y-setup.ts (3959 characters)
- part 1: web/src/kit/capabilities.test.ts (9542 characters)
- part 1: web/src/kit/capabilities.ts (5879 characters)
- part 1: web/src/kit/confirm.test.ts (3004 characters)
- part 1: web/src/kit/confirm.ts (2681 characters)
- part 1: web/src/kit/ConfirmDialog.tsx (3157 characters)
- part 1: e2e/conftest.py (1964 characters)
- part 1: e2e/test_m0_skeleton.py (2237 characters)
- part 1: e2e/test_m1_web_kit.py (4823 characters)
- part 1: web/src/kit/contrast.test.ts (7303 characters)
- part 1: web/src/kit/contrast.ts (6275 characters)
- part 1: web/src/kit/EmptyState.tsx (1002 characters)
- part 1: web/src/kit/error-panel.test.ts (6435 characters)
- part 1: web/src/kit/error-panel.ts (3109 characters)
- part 1: web/src/kit/ErrorPanel.tsx (1602 characters)
- part 1: web/src/kit/errors.ts (704 characters)
- part 1: web/src/kit/keyboard.test.ts (1550 characters)
- part 1: web/src/kit/keyboard.ts (1503 characters)
- part 1: web/src/kit/LoadingState.tsx (808 characters)
- part 1: web/src/main.tsx (379 characters)
- part 1: web/src/kit/messages.test.ts (4212 characters)
- part 1: web/src/kit/messages.ts (3121 characters)
- part 1: web/src/app/Shell.tsx (1063 characters)
- part 1: web/src/kit/states.test.ts (2844 characters)
- part 1: web/src/kit/states.ts (2071 characters)
- part 1: openspec/changes/add-web-ui-kit/tasks.md (28398 characters)
- part 2: web/src/kit/theme.css (3634 characters)
- part 2: web/src/kit/toast.test.ts (6470 characters)
- part 2: web/src/kit/toast.ts (6328 characters)
- part 2: web/src/kit/ToastRegion.tsx (1998 characters)
- part 2: web/src/kit/tokens.css (1030 characters)
- part 2: web/src/kit/use-visible-nav.ts (1590 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 3 test file(s) compared with the base; changed in place, named by the task text: e2e.test_m0_skeleton::test_deep_link_returns_the_app (named by the task text, plan:m1@f21891c52e3d0b9e), e2e.test_m0_skeleton::test_landing_page_health_states (named by the task text, plan:m1@f21891c52e3d0b9e), e2e.test... |
| red-green freeze | ok | 9 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/a11y-setup.test.ts, test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx (+22 more) |
| tdd history | ok | 9 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 828 of 828 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/conftest.py kept at head for the run (task 9.1: unfrozen by Q-002)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- e2e/conftest.py (task 9.1, unfrozen by Q-002 (agent))
- e2e/test_m1_web_kit.py (task 9.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-cb608bfb | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › Contrast maths and colour parsing | covered | web.src.kit.contrast.test.ts::C-cb608bfb contrast maths and colour parsing (passed, red_assertion) | - | 0.94 | - |
| C-16a71639 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The real tokens meet WCAG AA | covered | web.src.kit.contrast.test.ts::C-16a71639 the real tokens meet WCAG AA (passed, red_assertion) | - | 0.83 | - |
| C-4f003820 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › A weak, missing or malformed token is reported | covered | web.src.kit.contrast.test.ts::C-4f003820 a weak, missing or malformed token is reported (passed, red_assertion) | - | 0.80 | - |
| C-92d9ac35 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The theme uses only tokens | covered | web.src.kit.contrast.test.ts::C-92d9ac35 the theme uses only tokens (passed, red_assertion) | - | 0.78 | - |
| C-d365d748 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The web sources have no inline styles | covered | web.src.kit.contrast.test.ts::C-d365d748 the web sources have no inline styles (passed, red_assertion) | - | 0.83 | - |
| C-e2ce7344 | web-kit › One catalogue maps API error codes to text › Known codes | covered | web.src.kit.messages.test.ts::C-e2ce7344 known codes (passed, red_assertion) | - | 0.87 | - |
| C-2f2f685e | web-kit › One catalogue maps API error codes to text › Unknown codes use the fallback | covered | web.src.kit.messages.test.ts::C-2f2f685e unknown codes use the fallback (passed, red_assertion) | - | 0.85 | - |
| C-c175f655 | web-kit › One catalogue maps API error codes to text › Later units register codes | covered | web.src.kit.messages.test.ts::C-c175f655 later units register codes (passed, red_assertion) | - | 0.84 | - |
| C-1688efa8 | web-kit › The nav shows only the entries the user's capabilities allow › Parsing the answer | covered | web.src.kit.capabilities.test.ts::C-1688efa8 parsing the answer (passed, red_assertion) | - | 0.89 | - |
| C-30ed04fb | web-kit › The nav shows only the entries the user's capabilities allow › The loader outcomes | covered | web.src.kit.capabilities.test.ts::C-30ed04fb the loader outcomes (passed, red_assertion) | - | 0.91 | - |
| C-0dae9ed5 | web-kit › The nav shows only the entries the user's capabilities allow › Concurrent callers and abort | covered | web.src.kit.capabilities.test.ts::C-0dae9ed5 concurrent callers and abort (passed, red_assertion) | - | 0.90 | - |
| C-63a759ac | web-kit › The nav shows only the entries the user's capabilities allow › Filtering and the notice | covered | web.src.kit.capabilities.test.ts::C-63a759ac filtering and the notice (passed, red_assertion) | - | 0.93 | - |
| C-f6d2569a | web-kit › The nav shows only the entries the user's capabilities allow › The nav in the browser | covered | test_l4_c_f6d2569a::test_nav_in_browser_signed_out_unavailable_and_ready[chromium] (passed, generated, base fail, head pass) | test_m1_web_kit::test_c_f6d2569a_me_failure_shows_one_notice[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test_c_f6d2569a_me_success_keeps_the_nav[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test... | 0.87 | `e2e/test_l4_c_f6d2569a.py`, `.l4-out/e2e/page.html` |
| C-af45d5fe | web-kit › Empty and loading states are announced and validated › The models | covered | web.src.kit.states.test.ts::C-af45d5fe the models (passed, red_assertion) | - | 0.90 | - |
| C-844ec099 | web-kit › Empty and loading states are announced and validated › Invalid properties | covered | web.src.kit.states.test.ts::C-844ec099 invalid properties (passed, red_assertion) | - | 0.92 | - |
| C-c0db9325 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › The model by status | covered | web.src.kit.error-panel.test.ts::C-c0db9325 the model by status (passed, red_assertion) | - | 0.92 | - |
| C-38740f97 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › A decision id is shown only when it is well formed | covered | web.src.kit.error-panel.test.ts::C-38740f97 a decision id is shown only when it is well formed (passed, red_assertion) | - | 0.76 | - |
| C-b735b791 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › Copying | covered | web.src.kit.error-panel.test.ts::C-b735b791 copying (passed, red_assertion) | - | 0.90 | - |
| C-c149362f | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The model | covered | web.src.kit.confirm.test.ts::C-c149362f the model (passed, red_assertion) | - | 0.92 | - |
| C-51e7abfc | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The confirm button must name the action | covered | web.src.kit.confirm.test.ts::C-51e7abfc the confirm button must name the action (passed, red_assertion) | - | 0.77 | - |
| C-ab614782 | web-kit › ConfirmDialog names its action and cancels unless told otherwise › Only the exact value confirms | covered | web.src.kit.confirm.test.ts::C-ab614782 only the exact value confirms (passed, red_assertion) | - | 0.83 | - |
| C-0b8be44d | web-kit › toast() uses one polite live region and a testable queue › Expiry by the clock | covered | web.src.kit.toast.test.ts::C-0b8be44d expiry by the clock (passed, red_assertion) | - | 0.95 | - |
| C-278586d8 | web-kit › toast() uses one polite live region and a testable queue › Duplicates, limits and invalid specs | covered | web.src.kit.toast.test.ts::C-278586d8 duplicates, limits and invalid specs (passed, red_assertion) | - | 0.93 | - |
| C-c3a242d6 | web-kit › toast() uses one polite live region and a testable queue › Subscribers and stable snapshots | covered | web.src.kit.toast.test.ts::C-c3a242d6 subscribers and stable snapshots (passed, red_assertion) | - | 0.91 | - |
| C-16e957dd | web-kit › toast() uses one polite live region and a testable queue › Focus after a dismissal and the default queue | covered | web.src.kit.toast.test.ts::C-16e957dd focus after a dismissal and the default queue (passed, red_assertion) | - | 0.92 | - |
| C-d9604877 | web-kit › Every component documents its keyboard behaviour › Documentation matches the component files | covered | web.src.kit.keyboard.test.ts::C-d9604877 keyboard documentation matches the component files (passed, red_assertion) | - | 0.92 | - |
| C-a1ea941d | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The setup check | covered | test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup accepts a complete throwaway root (passed, red_assertion); test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup reports a conftest without the assert_accessible helper (passed, red_assertion); test.support.a11y-setup.... | - | 0.90 | - |
| C-574fc31a | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The repository is set up and axe-core's licence is allowed | covered | test.support.a11y-setup.test.ts::C-574fc31a the repository is set up and the installed axe-core licence is allowed (passed, red_assertion) | - | 0.89 | - |
| C-c5c7028c | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser | uncovered | - | test_m1_web_kit::test_assert_accessible_accepts_a_named_button[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test_assert_accessible_names_the_failing_rule[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 | `e2e/test_l4_c_c5c7028c.py`, `test-results/test-l4-c-c5c7028c-py-test-assert-accessible-passes-labelled-button-and-fails-unnamed-button-chromium/test-failed-1.png`, `test-results/test-l4-c-c5c7028c-py-test-assert-accessible-passes-labelled-button-and-fails-unnamed-button-chromium/trace.zip`, `.l4-ou... |
| C-5bbabdc1 | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The M0 pages pass | covered | test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/] (passed, generated, base fail, head pass); test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/no-such-page-deep-link] (passed, generated, base fail, head pass) | test_m0_skeleton::test_deep_link_returns_the_app[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_she... | 0.78 | `e2e/test_l4_c_5bbabdc1.py`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/conftest.py` |  | relevant | named in the spec |
| `e2e/test_m0_skeleton.py` |  | relevant | named in the spec |
| `e2e/test_m1_web_kit.py` |  | relevant | new test file |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1619Z-5d8b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1856Z-fd8d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1943Z-8995.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2009Z-d59b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/support/a11y-setup.test.ts` |  | relevant | new test file |
| `test/support/a11y-setup.ts` | test | relevant | named in the spec |
| `web/src/app/Shell.tsx` | web | relevant | named in the spec |
| `web/src/kit/ConfirmDialog.tsx` | web | relevant | named in the spec |
| `web/src/kit/EmptyState.tsx` | web | relevant | named in the spec |
| `web/src/kit/ErrorPanel.tsx` | web | relevant | named in the spec |
| `web/src/kit/LoadingState.tsx` | web | relevant | named in the spec |
| `web/src/kit/ToastRegion.tsx` | web | relevant | named in the spec |
| `web/src/kit/capabilities.test.ts` |  | relevant | new test file |
| `web/src/kit/capabilities.ts` | web | relevant | named in the spec |
| `web/src/kit/confirm.test.ts` |  | relevant | new test file |
| `web/src/kit/confirm.ts` | web | relevant | named in the spec |
| `web/src/kit/contrast.test.ts` |  | relevant | new test file |
| `web/src/kit/contrast.ts` | web | relevant | named in the spec |
| `web/src/kit/error-panel.test.ts` |  | relevant | new test file |
| `web/src/kit/error-panel.ts` | web | relevant | named in the spec |
| `web/src/kit/errors.ts` | web | relevant | named in the spec |
| `web/src/kit/keyboard.test.ts` |  | relevant | new test file |
| `web/src/kit/keyboard.ts` | web | relevant | named in the spec |
| `web/src/kit/messages.test.ts` |  | relevant | new test file |
| `web/src/kit/messages.ts` | web | relevant | named in the spec |
| `web/src/kit/states.test.ts` |  | relevant | new test file |
| `web/src/kit/states.ts` | web | relevant | named in the spec |
| `web/src/kit/theme.css` | web | relevant | named in the spec |
| `web/src/kit/toast.test.ts` |  | relevant | new test file |
| `web/src/kit/toast.ts` | web | relevant | named in the spec |
| `web/src/kit/tokens.css` | web | relevant | named in the spec |
| `web/src/kit/use-visible-nav.ts` | web | relevant | named in the spec |
| `web/src/main.tsx` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx, web/src/kit/ErrorPanel.tsx and 13 more

### Tests

890 of 890 passed, 0 failed, 0 errored, 0 skipped.
36 of 36 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-cb608bfb | not_testable | - | - | - | 1 | Pure-function contrast maths (contrastRatio, parseHexColour, KitError) are not exposed in the browser UI; the built page only has an empty root, so there is no user-visible behaviour to check end to end. | - |
| C-16a71639 | not_testable | - | - | - | 1 | Checks parseTokens/CONTRAST_PAIRS/checkTokenContrast on tokens.css, which is a build-time unit-level function; it has no user-visible browser behaviour for an e2e test. | - |
| C-4f003820 | not_testable | - | - | - | 1 | checkTokenContrast is an internal function over CSS token files with no UI surface; the browser app doesn't expose it, so an e2e test can't observe it. | - |
| C-92d9ac35 | not_testable | - | - | - | 1 | Checks the source theme.css file and the findRawColours scanner function; neither is observable through the browser UI (the bundled CSS merges tokens and theme). | - |
| C-d365d748 | not_testable | - | - | - | 1 | Criterion checks a source-scanning function (findInlineStyleUse) over repo files, not browser-visible behavior; no e2e UI outcome to assert. | - |
| C-e2ce7344 | not_testable | - | - | - | 1 | Criterion is about the messageFor function and BASE_MESSAGES module exports, which are not reachable from the browser UI; the built page exposes no such public interface. | - |
| C-2f2f685e | not_testable | - | - | - | 1 | messageFor is a pure internal function not exposed in the UI; the served page offers no way to call it or observe its results end-to-end. | - |
| C-c175f655 | not_testable | - | - | - | 1 | Criterion concerns pure module functions registerMessages/messageFor throwing KitError; no user-visible browser surface exposes them, so it is a unit-level check, not e2e. | - |
| C-1688efa8 | not_testable | - | - | - | 1 | parseMe is a pure internal function in a bundled module and is not exposed in the browser UI; the criterion has no user-visible outcome for an e2e test, and it is already covered by the unit test. | - |
| C-30ed04fb | not_testable | - | - | - | 1 | The criterion concerns the capability loader's internal module API with injected fake clients; it has no browser-visible behaviour, so it is covered by the node unit test, not an e2e test. | - |
| C-0dae9ed5 | not_testable | - | - | - | 1 | The criterion is about the capability loader's internal load() API (client call count, AbortError); it has no browser-observable behaviour, and the unit test already covers it. | - |
| C-63a759ac | not_testable | - | - | - | 1 | Criterion specifies pure functions (visibleNav, capabilityNotice) with injected states and registry; not reachable from the browser UI, so it is a unit-level check, not an e2e one. | - |
| C-f6d2569a | accepted | e2e/test_l4_c_f6d2569a.py | fail | pass | 1 | support: base | - |
| C-af45d5fe | not_testable | - | - | - | 1 | Criterion concerns pure model functions (emptyStateModel, loadingStateModel) not reachable from the browser; the page snapshot is an empty SPA shell with no route exposing these states. | - |
| C-844ec099 | not_testable | - | - | - | 1 | Criterion concerns pure model functions (emptyStateModel, loadingStateModel) throwing KitError; they are not reachable through the browser UI, so it is a unit-level check. | - |
| C-c0db9325 | not_testable | - | - | - | 1 | The criterion is about the pure function errorPanelModel with synthetic error inputs. The app has no known page that renders ErrorPanel with those errors, so a browser test can't reach it. | - |
| C-38740f97 | not_testable | - | - | - | 1 | errorPanelModel is a pure internal function with no exposed route or UI hook in the built app; the page snapshot is an empty SPA shell, so this cannot be driven from a browser. | - |
| C-b735b791 | not_testable | - | - | - | 1 | The criterion is about the pure functions copyText and copyNotice, called with fake clipboards. No known page or route shows a 403 ErrorPanel with a decision id, so a browser test cannot reach these cases. | - |
| C-c149362f | not_testable | - | - | - | 1 | confirmDialogModel is a pure function with no route or page in the served app that exposes it; the page snapshot is an empty SPA shell, so a browser test cannot reach it. | - |
| C-51e7abfc | not_testable | - | - | - | 1 | The criterion concerns the pure function confirmDialogModel throwing KitError; the app page has no UI route that exposes it, so a browser test can't check it. | - |
| C-ab614782 | not_testable | - | - | - | 1 | dialogOutcome is a pure internal function with no route or UI in the app that renders ConfirmDialog; the page snapshot is an empty shell, so it can't be exercised through the browser. | - |
| C-0b8be44d | not_testable | - | - | - | 1 | Criterion specifies queue API behaviour (push/list/nextExpiry/expire on an injected KitClock); the browser UI exposes no handle to inject a clock or call the queue, so it is a unit-level check, not an e2e one. | - |
| C-278586d8 | not_testable | - | - | - | 1 | The criterion covers pure queue logic (createToastQueue, push, KitError codes) that the page doesn't expose to a browser user. Nothing in the UI snapshot or diff gives a way to push these specs and observe the thrown errors, so a Playwright test can't check it. | - |
| C-c3a242d6 | not_testable | - | - | - | 1 | Criterion is about the toast queue's programmatic API (subscribe, dismiss return values, array identity); none of this is observable through the browser UI, and the page exposes no queue handle. | - |
| C-16e957dd | not_testable | - | - | - | 1 | Criterion targets pure functions (focusAfterDismiss, toast, dismissToast, toastQueue) that aren't exposed in the browser; the built page offers no UI to trigger toasts, so it can't be checked end-to-end. | - |
| C-d9604877 | not_testable | - | - | - | 1 | Compares a source-level KEYBOARD export with files on disk; not observable through the browser UI, so a Playwright e2e test cannot check it. | - |
| C-a1ea941d | not_testable | - | - | - | 1 | Criterion concerns a build-time setup-check function (checkAccessibilitySetup) run on throwaway file roots; it has no browser-visible UI behaviour, so an e2e page test cannot check it. | - |
| C-574fc31a | not_testable | - | - | - | 1 | Criterion concerns repository setup checks, npm store scan and licence-check functions, not browser-visible behaviour; no UI to drive. | - |
| C-c5c7028c | fails_at_head | e2e/test_l4_c_c5c7028c.py | fail | fail | 2 | the test fails at the head: test_l4_c_c5c7028c::test_assert_accessible_passes_labelled_button_and_fails_unnamed_button[chromium]; support: base | test-results/test-l4-c-c5c7028c-py-test-assert-accessible-passes-labelled-button-and-fails-unnamed-button-chromium/test-failed-1.png, test-results/test-l4-c-c5c7028c-py-test-assert-accessible-passes-labelled-button-and-fails-unnamed-button-chromium/trace.zip |
| C-5bbabdc1 | accepted | e2e/test_l4_c_5bbabdc1.py | fail | pass | 2 | support: base | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-cb608bfb | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-16a71639 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f003820 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92d9ac35 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d365d748 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e2ce7344 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2f2f685e | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c175f655 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1688efa8 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-30ed04fb | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0dae9ed5 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63a759ac | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f6d2569a | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-af45d5fe | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-844ec099 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0db9325 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-38740f97 | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b735b791 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c149362f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-51e7abfc | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ab614782 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0b8be44d | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-278586d8 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3a242d6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-16e957dd | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9604877 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a1ea941d | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-574fc31a | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c5c7028c | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5bbabdc1 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-0dae9ed5 | skipped | - | - | cap |
| C-574fc31a | skipped | - | - | cap |
| C-2f2f685e | skipped | - | - | cap |
| C-0b8be44d | skipped | - | - | cap |
| C-e2ce7344 | skipped | - | - | cap |
| C-16e957dd | skipped | - | - | cap |
| C-cb608bfb | skipped | - | - | cap |
| C-63a759ac | not_testable | - | - | The code under test is TypeScript (visibleNav, capabilityNotice) tested with Node; a pytest test cannot import or call it, and no Python interface is shown. |
| C-ab614782 | not_testable | - | - | dialogOutcome is a TypeScript function in web/src/kit/confirm.ts with no Python interface for pytest to import; repo layout and Node test setup are not shown. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-cb608bfb | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › Contrast maths and colour parsing | pass | pass | the judge passed it and a discriminating test passes |
| C-16a71639 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The real tokens meet WCAG AA | pass | pass | the judge passed it and a discriminating test passes |
| C-4f003820 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › A weak, missing or malformed token is reported | pass | pass | the judge passed it and a discriminating test passes |
| C-92d9ac35 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The theme uses only tokens | pass | pass | the judge passed it and a discriminating test passes |
| C-d365d748 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The web sources have no inline styles | pass | pass | the judge passed it and a discriminating test passes |
| C-e2ce7344 | web-kit › One catalogue maps API error codes to text › Known codes | pass | pass | the judge passed it and a discriminating test passes |
| C-2f2f685e | web-kit › One catalogue maps API error codes to text › Unknown codes use the fallback | pass | pass | the judge passed it and a discriminating test passes |
| C-c175f655 | web-kit › One catalogue maps API error codes to text › Later units register codes | pass | pass | the judge passed it and a discriminating test passes |
| C-1688efa8 | web-kit › The nav shows only the entries the user's capabilities allow › Parsing the answer | pass | pass | the judge passed it and a discriminating test passes |
| C-30ed04fb | web-kit › The nav shows only the entries the user's capabilities allow › The loader outcomes | pass | pass | the judge passed it and a discriminating test passes |
| C-0dae9ed5 | web-kit › The nav shows only the entries the user's capabilities allow › Concurrent callers and abort | pass | pass | the judge passed it and a discriminating test passes |
| C-63a759ac | web-kit › The nav shows only the entries the user's capabilities allow › Filtering and the notice | pass | pass | the judge passed it and a discriminating test passes |
| C-f6d2569a | web-kit › The nav shows only the entries the user's capabilities allow › The nav in the browser | pass | pass | the judge passed it and a discriminating test passes |
| C-af45d5fe | web-kit › Empty and loading states are announced and validated › The models | pass | pass | the judge passed it and a discriminating test passes |
| C-844ec099 | web-kit › Empty and loading states are announced and validated › Invalid properties | pass | pass | the judge passed it and a discriminating test passes |
| C-c0db9325 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › The model by status | pass | pass | the judge passed it and a discriminating test passes |
| C-38740f97 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › A decision id is shown only when it is well formed | pass | pass | the judge passed it and a discriminating test passes |
| C-b735b791 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › Copying | pass | pass | the judge passed it and a discriminating test passes |
| C-c149362f | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The model | pass | pass | the judge passed it and a discriminating test passes |
| C-51e7abfc | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The confirm button must name the action | pass | pass | the judge passed it and a discriminating test passes |
| C-ab614782 | web-kit › ConfirmDialog names its action and cancels unless told otherwise › Only the exact value confirms | pass | pass | the judge passed it and a discriminating test passes |
| C-0b8be44d | web-kit › toast() uses one polite live region and a testable queue › Expiry by the clock | pass | pass | the judge passed it and a discriminating test passes |
| C-278586d8 | web-kit › toast() uses one polite live region and a testable queue › Duplicates, limits and invalid specs | pass | pass | the judge passed it and a discriminating test passes |
| C-c3a242d6 | web-kit › toast() uses one polite live region and a testable queue › Subscribers and stable snapshots | pass | pass | the judge passed it and a discriminating test passes |
| C-16e957dd | web-kit › toast() uses one polite live region and a testable queue › Focus after a dismissal and the default queue | pass | pass | the judge passed it and a discriminating test passes |
| C-d9604877 | web-kit › Every component documents its keyboard behaviour › Documentation matches the component files | pass | pass | the judge passed it and a discriminating test passes |
| C-a1ea941d | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The setup check | pass | pass | the judge passed it and a discriminating test passes |
| C-574fc31a | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The repository is set up and axe-core's licence is allowed | pass | pass | the judge passed it and a discriminating test passes |
| C-c5c7028c | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-5bbabdc1 | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The M0 pages pass | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-f6d2569a): test_m1_web_kit::test_c_f6d2569a_me_failure_shows_one_notice[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f6d2569a): test_m1_web_kit::test_c_f6d2569a_me_success_keeps_the_nav[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f6d2569a): test_m1_web_kit::test_c_f6d2569a_signed_out_nav_lists_home[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c5c7028c): test_m1_web_kit::test_assert_accessible_accepts_a_named_button[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c5c7028c): test_m1_web_kit::test_assert_accessible_names_the_failing_rule[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5bbabdc1): test_m0_skeleton::test_deep_link_returns_the_app[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5bbabdc1): test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5bbabdc1): test_m0_skeleton::test_shell_landmarks_and_skip_link[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-cb608bfb): No end-to-end test traces criterion C-cb608bfb (web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › Contrast maths and colour parsing); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-16a71639): No end-to-end test traces criterion C-16a71639 (web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The real tokens meet WCAG AA); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4f003820): No end-to-end test traces criterion C-4f003820 (web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › A weak, missing or malformed token is reported); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-92d9ac35): No end-to-end test traces criterion C-92d9ac35 (web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The theme uses only tokens); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d365d748): No end-to-end test traces criterion C-d365d748 (web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The web sources have no inline styles); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e2ce7344): No end-to-end test traces criterion C-e2ce7344 (web-kit › One catalogue maps API error codes to text › Known codes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2f2f685e): No end-to-end test traces criterion C-2f2f685e (web-kit › One catalogue maps API error codes to text › Unknown codes use the fallback); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c175f655): No end-to-end test traces criterion C-c175f655 (web-kit › One catalogue maps API error codes to text › Later units register codes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1688efa8): No end-to-end test traces criterion C-1688efa8 (web-kit › The nav shows only the entries the user's capabilities allow › Parsing the answer); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-30ed04fb): No end-to-end test traces criterion C-30ed04fb (web-kit › The nav shows only the entries the user's capabilities allow › The loader outcomes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0dae9ed5): No end-to-end test traces criterion C-0dae9ed5 (web-kit › The nav shows only the entries the user's capabilities allow › Concurrent callers and abort); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-63a759ac): No end-to-end test traces criterion C-63a759ac (web-kit › The nav shows only the entries the user's capabilities allow › Filtering and the notice); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-f6d2569a): The end-to-end test test_m1_web_kit::test_c_f6d2569a_me_failure_shows_one_notice[chromium], test_m1_web_kit::test_c_f6d2569a_me_success_keeps_the_nav[chromium], test_m1_web_kit::test_c_f6d2569a_signed_out_nav_lists_home[chromium] traces criterion C-f6d2569a (web-kit › The nav shows only the entries the user's capabilities allow › The nav in the browser), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-af45d5fe): No end-to-end test traces criterion C-af45d5fe (web-kit › Empty and loading states are announced and validated › The models); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-844ec099): No end-to-end test traces criterion C-844ec099 (web-kit › Empty and loading states are announced and validated › Invalid properties); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c0db9325): No end-to-end test traces criterion C-c0db9325 (web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › The model by status); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-38740f97): No end-to-end test traces criterion C-38740f97 (web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › A decision id is shown only when it is well formed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b735b791): No end-to-end test traces criterion C-b735b791 (web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › Copying); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c149362f): No end-to-end test traces criterion C-c149362f (web-kit › ConfirmDialog names its action and cancels unless told otherwise › The model); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-51e7abfc): No end-to-end test traces criterion C-51e7abfc (web-kit › ConfirmDialog names its action and cancels unless told otherwise › The confirm button must name the action); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ab614782): No end-to-end test traces criterion C-ab614782 (web-kit › ConfirmDialog names its action and cancels unless told otherwise › Only the exact value confirms); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0b8be44d): No end-to-end test traces criterion C-0b8be44d (web-kit › toast() uses one polite live region and a testable queue › Expiry by the clock); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-278586d8): No end-to-end test traces criterion C-278586d8 (web-kit › toast() uses one polite live region and a testable queue › Duplicates, limits and invalid specs); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c3a242d6): No end-to-end test traces criterion C-c3a242d6 (web-kit › toast() uses one polite live region and a testable queue › Subscribers and stable snapshots); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-16e957dd): No end-to-end test traces criterion C-16e957dd (web-kit › toast() uses one polite live region and a testable queue › Focus after a dismissal and the default queue); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-d9604877): No end-to-end test traces criterion C-d9604877 (web-kit › Every component documents its keyboard behaviour › Documentation matches the component files); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a1ea941d): No end-to-end test traces criterion C-a1ea941d (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The setup check); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-574fc31a): No end-to-end test traces criterion C-574fc31a (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The repository is set up and axe-core's licence is allowed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c5c7028c): The end-to-end test test_m1_web_kit::test_assert_accessible_accepts_a_named_button[chromium], test_m1_web_kit::test_assert_accessible_names_the_failing_rule[chromium] traces criterion C-c5c7028c (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5bbabdc1): The end-to-end test test_m0_skeleton::test_deep_link_returns_the_app[chromium], test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium], test_m0_skeleton::test_shell_landmarks_and_skip_link[chromium] traces criterion C-5bbabdc1 (web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The M0 pages pass), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] The button-name failure message is never asserted (criterion C-c5c7028c): test_assert_accessible_names_the_failing_rule only uses pytest.raises(pytest.fail.Exception); it does not check that the message holds 'button-name', which is the observable outcome of C-c5c7028c. The harness's generated test for C-c5c7028c also fails at head, probably because its page lacks a title or lang (see Q-001).
- [minor, judge] task 7.1: e2e test names differ from the task text (criterion C-f6d2569a): Task 7.1 names test_signed_out_nav_lists_home, test_me_failure_shows_one_notice and test_me_success_keeps_the_nav; the diff names them test_c_f6d2569a_signed_out_nav_lists_home and so on. The two 9.1 tests in the same file also take no fresh_state, while 7.1 says every test in the file does.
- [minor, judge] The ASSERT_ACCESSIBLE_UNSAFE checks are substring tests over the whole conftest.py (spec gap) (criterion C-a1ea941d): checkAccessibilitySetup flags add_script_tag or bypass_csp anywhere in the file, including comments and other fixtures, and it accepts the words serious and critical appearing anywhere, even if the helper does not use them as blocking impacts.
- [minor, judge] A blank text for an already registered code is reported as invalid, not as a duplicate (spec gap) (criterion C-c175f655): registerMessages validates every entry before it checks for duplicates, so { FORBIDDEN: " " } throws KIT_MESSAGE_INVALID. An implementation that checks duplicates first would throw KIT_MESSAGE_DUPLICATE.
- [major, judge] Toast Dismiss button turns white-on-white on hover (criterion C-92d9ac35): The Dismiss button in ToastRegion carries class ui-button. On hover, `.ui-button:hover` (specificity 0,2,0) beats `.ui-toast button` (0,1,1) and sets the background to var(--ui-color-bg) (#ffffff), while `.ui-toast button` keeps color var(--ui-color-toast-text) (#ffffff). The label becomes invisible on hover, which breaks the WCAG AA contrast that the toast-text-on-toast-bg pair is meant to give. axe does not see hover states, so no gate catches it.
- [minor, judge] A toast can get stuck if its timer fires before Date.now() reaches expiresAt (criterion C-0b8be44d): ToastRegion schedules expire() once for nextExpiry. If expire() then removes nothing, for example because a browser with reduced timer precision rounds Date.now() down, there is no commit and no re-render. nextExpiry stays the same, the effect does not re-run, and the info or success toast never expires.
- [minor, judge] A repeated push takes the new spec's duration, even null (spec gap) (criterion C-278586d8): A duplicate push recomputes expiresAt from the new spec. A repeat with durationMs null makes a previously expiring toast permanent, and a repeat of an error with durationMs 1000 makes a persistent error expire. The item keeps its position in the list.
- [minor, judge] maxVisible overflow also drops persistent error toasts (spec gap) (criterion C-278586d8): A push beyond maxVisible drops the oldest item whatever its kind, so an error toast, which should persist until dismissed (WCAG 2.2.1, design.md), can vanish without being dismissed. An implementation that drops the oldest non-error item would behave differently.

## Needs a human

- UI criterion C-cb608bfb has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-16a71639 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-4f003820 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-92d9ac35 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-d365d748 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-e2ce7344 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-2f2f685e has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-c175f655 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-1688efa8 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-30ed04fb has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-0dae9ed5 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-63a759ac has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-af45d5fe has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-844ec099 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-c0db9325 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-38740f97 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-b735b791 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-c149362f has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-51e7abfc has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-ab614782 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-0b8be44d has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-278586d8 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-c3a242d6 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-16e957dd has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-d9604877 has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-a1ea941d has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-574fc31a has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-c5c7028c has no end-to-end test (fails_at_head); see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `test.support.a11y-setup.test.ts::C-574fc31a the repository is set up and the installed axe-core licence is allowed` (task 9.1): passed
- `test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup accepts a complete throwaway root` (task 9.1): passed
- `test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup reports a conftest without the assert_accessible helper` (task 9.1): passed
- `test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup reports a helper that loads a script or drops a blocking impact` (task 9.1): passed
- `test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup reports an axe-core that is not declared as an exact devDependency` (task 9.1): passed
- `test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup reports axe-core not installed in the store` (task 9.1): passed
- `web.src.kit.capabilities.test.ts::C-0dae9ed5 concurrent callers and abort` (task 7.1): passed
- `web.src.kit.capabilities.test.ts::C-1688efa8 parsing the answer` (task 7.1): passed
- `web.src.kit.capabilities.test.ts::C-30ed04fb the loader outcomes` (task 7.1): passed
- `web.src.kit.capabilities.test.ts::C-63a759ac filtering and the notice` (task 7.1): passed
- `web.src.kit.confirm.test.ts::C-51e7abfc the confirm button must name the action` (task 5.1): passed
- `web.src.kit.confirm.test.ts::C-ab614782 only the exact value confirms` (task 5.1): passed
- `web.src.kit.confirm.test.ts::C-c149362f the model` (task 5.1): passed
- `web.src.kit.contrast.test.ts::C-16a71639 the real tokens meet WCAG AA` (task 1.1): passed
- `web.src.kit.contrast.test.ts::C-4f003820 a weak, missing or malformed token is reported` (task 1.1): passed
- `web.src.kit.contrast.test.ts::C-92d9ac35 the theme uses only tokens` (task 1.1): passed
- `web.src.kit.contrast.test.ts::C-cb608bfb contrast maths and colour parsing` (task 1.1): passed
- `web.src.kit.contrast.test.ts::C-d365d748 the web sources have no inline styles` (task 1.1): passed
- `web.src.kit.error-panel.test.ts::C-38740f97 a decision id is shown only when it is well formed` (task 4.1): passed
- `web.src.kit.error-panel.test.ts::C-b735b791 copying` (task 4.1): passed
- `web.src.kit.error-panel.test.ts::C-c0db9325 the model by status` (task 4.1): passed
- `web.src.kit.keyboard.test.ts::C-d9604877 keyboard documentation matches the component files` (task 8.1): passed
- `web.src.kit.messages.test.ts::C-2f2f685e unknown codes use the fallback` (task 2.1): passed
- `web.src.kit.messages.test.ts::C-c175f655 later units register codes` (task 2.1): passed
- `web.src.kit.messages.test.ts::C-e2ce7344 known codes` (task 2.1): passed
- `web.src.kit.states.test.ts::C-844ec099 invalid properties` (task 3.1): passed
- `web.src.kit.states.test.ts::C-af45d5fe the models` (task 3.1): passed
- `web.src.kit.toast.test.ts::C-0b8be44d expiry by the clock` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-16e957dd focus after a dismissal and the default queue` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-278586d8 duplicates, limits and invalid specs` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-c3a242d6 subscribers and stable snapshots` (task 6.1): passed

## Guard events

- guard.violation: e2e/conftest.py
