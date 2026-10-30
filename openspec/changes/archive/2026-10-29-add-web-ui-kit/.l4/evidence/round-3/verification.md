# Verification: openspec:add-web-ui-kit: NEEDS_HUMAN (round 3)

traceability: 30/31 criteria covered by a discriminating test

- Base: `f16558c6dca3050ee88f2f0ab5d2f8aeed9dc49e`
- Head: `f708acc7533b7c49da5d8f676a9ba0dbe91af7f1`
- Implementer profiles: deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `0bb59613b5148965ca1ff2eb9573647417c7809cc88e4e66add5383d5676d4b9`
  - part 1: 32 file(s), 95745 characters, profile claude-judge, reply valid
  - part 2: 9 file(s), 55865 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 4, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $4.1056

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base main@f16558c6dc contained |
| 1 | integrity | ok | 69.9 | 10 sub-checks (+2 unfrozen by human answers); scope: 57 changed file(s) |
| 2 | build | ok | 22.9 |  |
| 3 | tests | ok | 82.7 |  |
| 4 | traceability | ok | 0.1 | 30/31 criteria covered |
| 4a | audit sampling | ok | 14.0 | 2 not_testable, 7 skipped; support files at the base: 16 |
| 5 | ui test generation | ok | 117.3 | 29 not_testable |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx, web/src/kit/ErrorPanel.tsx and 13 more |
| 8 | s1 judge | ok | 3.2 | 31/31 criteria judged by jev |
| 9 | judge | ok | 147.6 | 2 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261029T2044Z-1984/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261029T2044Z-1984/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261029T2044Z-1984/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261029T2044Z-1984/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261029T2044Z-1984/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261029T2044Z-1984/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261029T2044Z-1984/029-e2e.log |

## Files by part

- part 1: openspec/changes/add-web-ui-kit-fix-1/.openspec.yaml (296 characters)
- part 1: test/support/a11y-setup.test.ts (6886 characters)
- part 1: test/support/a11y-setup.ts (3959 characters)
- part 1: web/src/kit/capabilities.test.ts (9542 characters)
- part 1: web/src/kit/capabilities.ts (5879 characters)
- part 1: web/src/kit/confirm.test.ts (3004 characters)
- part 1: web/src/kit/confirm.ts (2681 characters)
- part 1: web/src/kit/ConfirmDialog.tsx (3157 characters)
- part 1: e2e/conftest.py (1964 characters)
- part 1: e2e/test_l4_c_5bbabdc1.py (1355 characters)
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
- part 1: e2e/test_l4_c_f6d2569a.py (2877 characters)
- part 1: web/src/kit/LoadingState.tsx (808 characters)
- part 1: web/src/main.tsx (379 characters)
- part 1: web/src/kit/messages.test.ts (4212 characters)
- part 1: web/src/kit/messages.ts (3121 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-1/proposal.md (1730 characters)
- part 1: web/src/app/Shell.tsx (1063 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-1/specs/web-kit/spec.md (1015 characters)
- part 1: web/src/kit/states.test.ts (2844 characters)
- part 1: web/src/kit/states.ts (2071 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-1/tasks.md (359 characters)
- part 2: openspec/changes/add-web-ui-kit/tasks.md (28398 characters)
- part 2: web/src/kit/theme.css (3760 characters)
- part 2: web/src/kit/toast.test.ts (6470 characters)
- part 2: web/src/kit/toast.ts (6328 characters)
- part 2: web/src/kit/toast-hover.test.ts (3029 characters)
- part 2: e2e/test_toast_hover.py (3262 characters)
- part 2: web/src/kit/ToastRegion.tsx (1998 characters)
- part 2: web/src/kit/tokens.css (1030 characters)
- part 2: web/src/kit/use-visible-nav.ts (1590 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 6 test file(s) compared with the base; changed in place, named by the task text: e2e.test_m0_skeleton::test_deep_link_returns_the_app (named by the task text, plan:m1@f21891c52e3d0b9e), e2e.test_m0_skeleton::test_landing_page_health_states (named by the task text, plan:m1@f21891c52e3d0b9e), e2e.test... |
| red-green freeze | ok | 10 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/a11y-setup.test.ts, test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx (+23 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 828 of 828 base tests pass on the unit's code with its 15 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/conftest.py kept at head for the run (task 9.1: unfrozen by Q-002)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- e2e/conftest.py (task 9.1, unfrozen by Q-002 (agent))
- e2e/test_m1_web_kit.py (task 9.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-cb608bfb | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › Contrast maths and colour parsing | covered | web.src.kit.contrast.test.ts::C-cb608bfb contrast maths and colour parsing (passed, red_assertion) | - | 0.95 | - |
| C-16a71639 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The real tokens meet WCAG AA | covered | web.src.kit.contrast.test.ts::C-16a71639 the real tokens meet WCAG AA (passed, red_assertion) | - | 0.81 | - |
| C-4f003820 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › A weak, missing or malformed token is reported | covered | web.src.kit.contrast.test.ts::C-4f003820 a weak, missing or malformed token is reported (passed, red_assertion) | - | 0.80 | - |
| C-92d9ac35 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The theme uses only tokens | covered | web.src.kit.contrast.test.ts::C-92d9ac35 the theme uses only tokens (passed, red_assertion); web.src.kit.toast-hover.test.ts::C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover (passed, red_assertion) | - | 0.84 | - |
| C-d365d748 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The web sources have no inline styles | covered | web.src.kit.contrast.test.ts::C-d365d748 the web sources have no inline styles (passed, red_assertion) | - | 0.80 | - |
| C-e2ce7344 | web-kit › One catalogue maps API error codes to text › Known codes | covered | web.src.kit.messages.test.ts::C-e2ce7344 known codes (passed, red_assertion) | - | 0.88 | - |
| C-2f2f685e | web-kit › One catalogue maps API error codes to text › Unknown codes use the fallback | covered | web.src.kit.messages.test.ts::C-2f2f685e unknown codes use the fallback (passed, red_assertion) | - | 0.88 | - |
| C-c175f655 | web-kit › One catalogue maps API error codes to text › Later units register codes | covered | web.src.kit.messages.test.ts::C-c175f655 later units register codes (passed, red_assertion) | - | 0.83 | - |
| C-1688efa8 | web-kit › The nav shows only the entries the user's capabilities allow › Parsing the answer | covered | web.src.kit.capabilities.test.ts::C-1688efa8 parsing the answer (passed, red_assertion) | - | 0.90 | - |
| C-30ed04fb | web-kit › The nav shows only the entries the user's capabilities allow › The loader outcomes | covered | web.src.kit.capabilities.test.ts::C-30ed04fb the loader outcomes (passed, red_assertion) | - | 0.91 | - |
| C-0dae9ed5 | web-kit › The nav shows only the entries the user's capabilities allow › Concurrent callers and abort | covered | web.src.kit.capabilities.test.ts::C-0dae9ed5 concurrent callers and abort (passed, red_assertion) | - | 0.92 | - |
| C-63a759ac | web-kit › The nav shows only the entries the user's capabilities allow › Filtering and the notice | covered | web.src.kit.capabilities.test.ts::C-63a759ac filtering and the notice (passed, red_assertion) | - | 0.92 | - |
| C-f6d2569a | web-kit › The nav shows only the entries the user's capabilities allow › The nav in the browser | covered | test_l4_c_f6d2569a::test_nav_in_browser_signed_out_unavailable_and_ready[chromium] (passed, generated) | test_m1_web_kit::test_c_f6d2569a_me_failure_shows_one_notice[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test_c_f6d2569a_me_success_keeps_the_nav[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test... | 0.88 | - |
| C-af45d5fe | web-kit › Empty and loading states are announced and validated › The models | covered | web.src.kit.states.test.ts::C-af45d5fe the models (passed, red_assertion) | - | 0.91 | - |
| C-844ec099 | web-kit › Empty and loading states are announced and validated › Invalid properties | covered | web.src.kit.states.test.ts::C-844ec099 invalid properties (passed, red_assertion) | - | 0.92 | - |
| C-c0db9325 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › The model by status | covered | web.src.kit.error-panel.test.ts::C-c0db9325 the model by status (passed, red_assertion) | - | 0.92 | - |
| C-38740f97 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › A decision id is shown only when it is well formed | covered | web.src.kit.error-panel.test.ts::C-38740f97 a decision id is shown only when it is well formed (passed, red_assertion) | - | 0.78 | - |
| C-b735b791 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › Copying | covered | web.src.kit.error-panel.test.ts::C-b735b791 copying (passed, red_assertion) | - | 0.90 | - |
| C-c149362f | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The model | covered | web.src.kit.confirm.test.ts::C-c149362f the model (passed, red_assertion) | - | 0.92 | - |
| C-51e7abfc | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The confirm button must name the action | covered | web.src.kit.confirm.test.ts::C-51e7abfc the confirm button must name the action (passed, red_assertion) | - | 0.75 | - |
| C-ab614782 | web-kit › ConfirmDialog names its action and cancels unless told otherwise › Only the exact value confirms | covered | web.src.kit.confirm.test.ts::C-ab614782 only the exact value confirms (passed, red_assertion) | - | 0.86 | - |
| C-0b8be44d | web-kit › toast() uses one polite live region and a testable queue › Expiry by the clock | covered | web.src.kit.toast.test.ts::C-0b8be44d expiry by the clock (passed, red_assertion) | - | 0.95 | - |
| C-278586d8 | web-kit › toast() uses one polite live region and a testable queue › Duplicates, limits and invalid specs | covered | web.src.kit.toast.test.ts::C-278586d8 duplicates, limits and invalid specs (passed, red_assertion) | - | 0.92 | - |
| C-c3a242d6 | web-kit › toast() uses one polite live region and a testable queue › Subscribers and stable snapshots | covered | web.src.kit.toast.test.ts::C-c3a242d6 subscribers and stable snapshots (passed, red_assertion) | - | 0.91 | - |
| C-16e957dd | web-kit › toast() uses one polite live region and a testable queue › Focus after a dismissal and the default queue | covered | web.src.kit.toast.test.ts::C-16e957dd focus after a dismissal and the default queue (passed, red_assertion) | - | 0.92 | - |
| C-d9604877 | web-kit › Every component documents its keyboard behaviour › Documentation matches the component files | covered | web.src.kit.keyboard.test.ts::C-d9604877 keyboard documentation matches the component files (passed, red_assertion) | - | 0.92 | - |
| C-a1ea941d | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The setup check | covered | test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup accepts a complete throwaway root (passed, red_assertion); test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup reports a conftest without the assert_accessible helper (passed, red_assertion); test.support.a11y-setup.... | - | 0.90 | - |
| C-574fc31a | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The repository is set up and axe-core's licence is allowed | covered | test.support.a11y-setup.test.ts::C-574fc31a the repository is set up and the installed axe-core licence is allowed (passed, red_assertion) | - | 0.89 | - |
| C-c5c7028c | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser | uncovered | - | test_m1_web_kit::test_assert_accessible_accepts_a_named_button[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test_assert_accessible_names_the_failing_rule[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 | - |
| C-5bbabdc1 | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The M0 pages pass | covered | test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/] (passed, generated, inadequate); test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/no-such-page-deep-link] (passed, generated) | test_m0_skeleton::test_deep_link_returns_the_app[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_she... | 0.78 | - |
| C-817bfc8a | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast — regression 1 › Toast Dismiss button turns white-on-white on hover | covered | web.src.kit.toast-hover.test.ts::C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover (passed, red_assertion) | test_toast_hover::test_c_817bfc8a_toast_dismiss_keeps_background_on_hover[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.93 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/conftest.py` |  | relevant | named in the spec |
| `e2e/test_l4_c_5bbabdc1.py` |  | relevant | new test file |
| `e2e/test_l4_c_f6d2569a.py` |  | relevant | new test file |
| `e2e/test_m0_skeleton.py` |  | relevant | named in the spec |
| `e2e/test_m1_web_kit.py` |  | relevant | new test file |
| `e2e/test_toast_hover.py` |  | relevant | new test file |
| `openspec/changes/add-web-ui-kit-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/specs/web-kit/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1619Z-5d8b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1856Z-fd8d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1943Z-8995.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2009Z-d59b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2033Z-5460.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2037Z-4e1c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2044Z-1984.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/verification.md` |  | none | exempt: harness, spec or documentation path |
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
| `web/src/kit/toast-hover.test.ts` |  | relevant | new test file |
| `web/src/kit/toast.test.ts` |  | relevant | new test file |
| `web/src/kit/toast.ts` | web | relevant | named in the spec |
| `web/src/kit/tokens.css` | web | relevant | named in the spec |
| `web/src/kit/use-visible-nav.ts` | web | relevant | named in the spec |
| `web/src/main.tsx` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx, web/src/kit/ErrorPanel.tsx and 13 more

### Tests

895 of 895 passed, 0 failed, 0 errored, 0 skipped.
41 of 41 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-cb608bfb | not_testable | - | - | - | 1 | contrastRatio/parseHexColour are internal module functions with no UI surface in the served page; they can't be exercised through the browser, only by unit tests. | - |
| C-16a71639 | not_testable | - | - | - | 1 | Criterion concerns parseTokens/CONTRAST_PAIRS/checkTokenContrast on tokens.css, a build-time module API with no user-visible browser behaviour; it is a unit-level check, not an e2e one. | - |
| C-4f003820 | not_testable | - | - | - | 1 | checkTokenContrast is a build-time function over CSS files with no UI route; a browser e2e test cannot call it. | - |
| C-92d9ac35 | not_testable | - | - | - | 1 | Criterion concerns reading theme.css source and calling a findRawColours scanner function; it is not observable through the browser UI, so a Playwright e2e test cannot check it. | - |
| C-d365d748 | not_testable | - | - | - | 1 | Static source scan (findInlineStyleUse over sample strings and web source files); a browser page cannot call it or read those files, so no e2e test can check it. | - |
| C-e2ce7344 | not_testable | - | - | - | 1 | Criterion concerns the pure module function messageFor and BASE_MESSAGES, which are not exposed through the browser UI; no user-visible path reaches them without bundler internals. | - |
| C-2f2f685e | not_testable | - | - | - | 1 | messageFor is a pure internal function in the web bundle with no UI route exposing it; the page snapshot shows only an empty app root, so a browser test cannot call it or observe its output. | - |
| C-c175f655 | not_testable | - | - | - | 1 | Criterion concerns registerMessages/messageFor module functions with no UI surface in the built app; it is a unit-level behavior not reachable through the browser. | - |
| C-1688efa8 | not_testable | - | - | - | 1 | parseMe is an internal function not exposed in the built page or any user-visible UI; the criterion is checked by a unit test, not a browser e2e. | - |
| C-30ed04fb | not_testable | - | - | - | 1 | Internal capability loader contract checked with a fake client (call counts, reset(), state values); not observable by a browser user, and covered by the node unit test. | - |
| C-0dae9ed5 | not_testable | - | - | - | 1 | The criterion is about the capability loader's internal call-sharing and AbortError behavior with a fake client, which a browser user cannot observe or trigger from the UI. | - |
| C-63a759ac | not_testable | - | - | - | 1 | Concerns pure functions visibleNav/capabilityNotice with a custom registry (a,b,c) and hand-built states; the browser app's fixed registry can't be injected, so e2e can't check it. | - |
| C-af45d5fe | not_testable | - | - | - | 1 | The criterion concerns pure model functions (emptyStateModel, loadingStateModel) not reachable from the browser UI; the page snapshot shows no route that renders these states with the given inputs. | - |
| C-844ec099 | not_testable | - | - | - | 1 | Criterion concerns pure model functions (emptyStateModel, loadingStateModel) throwing KitError; they are not reachable through the browser UI, so an e2e test cannot check it. | - |
| C-c0db9325 | not_testable | - | - | - | 1 | The criterion is about the pure function errorPanelModel with constructed ApiRequestError inputs. The built app exposes no page where a user can supply these errors, so a browser test can't check it. | - |
| C-38740f97 | not_testable | - | - | - | 1 | The criterion targets the pure function errorPanelModel, which has no route or UI entry point in the served app. A browser test cannot supply it these inputs, so it can only be checked by a unit test. | - |
| C-b735b791 | not_testable | - | - | - | 1 | Criterion specifies unit-level results of pure functions copyText/copyNotice; no known route in the page renders an ErrorPanel with a 403 decision id, so a browser test cannot reach them. | - |
| C-c149362f | not_testable | - | - | - | 1 | confirmDialogModel is a pure function with no route or UI reachable in the page snapshot (empty SPA shell); it is covered by the unit test, not a browser flow. | - |
| C-51e7abfc | not_testable | - | - | - | 1 | confirmDialogModel is a pure internal function with no route or UI in the app that renders a ConfirmDialog; the page snapshot is only an empty root, so a browser test cannot exercise it. | - |
| C-ab614782 | not_testable | - | - | - | 1 | dialogOutcome is an internal pure function; the page snapshot shows only an empty app root with no route rendering ConfirmDialog, so no user-visible flow exercises it. | - |
| C-0b8be44d | not_testable | - | - | - | 1 | Criterion specifies a unit-level queue API (KitClock, push, list, nextExpiry, expire) with an injected clock; the browser UI exposes no way to drive it, so an e2e test can't check it. | - |
| C-278586d8 | not_testable | - | - | - | 1 | Criterion concerns the toast queue's programmatic API (push/createToastQueue throwing KitError); the UI exposes no browser-reachable entry point to call it, so an e2e test cannot check it. | - |
| C-c3a242d6 | not_testable | - | - | - | 1 | Criterion is about the toast queue's internal API (subscribe, list identity, dismiss return values), which the browser UI doesn't expose; it can't be checked through what a user sees or does. | - |
| C-16e957dd | not_testable | - | - | - | 1 | Criterion checks pure functions and a module-level queue (focusAfterDismiss, toast, dismissToast); the built app exposes no way to call them from a browser, so unit tests cover it. | - |
| C-d9604877 | not_testable | - | - | - | 1 | Compares a source-level KEYBOARD constant with files on disk; no browser-observable behaviour, so it can't be checked through the page. | - |
| C-a1ea941d | not_testable | - | - | - | 1 | Criterion concerns a build-time setup checker (checkAccessibilitySetup) run on throwaway filesystem roots; it has no user-visible browser behavior in the web app. | - |
| C-574fc31a | not_testable | - | - | - | 1 | Criterion concerns repository setup checks and npm licence scanning (checkAccessibilitySetup, scanNpmStore, checkLicences), not browser-observable UI behaviour. | - |
| C-c5c7028c | not_testable | - | - | - | 1 | The criterion tests the Python helper assert_accessible, but the diff and page snapshot never show its module path or signature. A test would have to guess the import. | - |
| C-817bfc8a | not_testable | - | - | - | 1 | No public UI path is known that shows a toast (toast() is an internal module call, and the diff shows no route that triggers one). A browser test can't reliably show the Dismiss button to hover. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-cb608bfb | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-16a71639 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f003820 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92d9ac35 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d365d748 | ok | 0.800 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e2ce7344 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2f2f685e | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c175f655 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1688efa8 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-30ed04fb | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0dae9ed5 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63a759ac | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f6d2569a | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-af45d5fe | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-844ec099 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0db9325 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-38740f97 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b735b791 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c149362f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-51e7abfc | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ab614782 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0b8be44d | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-278586d8 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3a242d6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-16e957dd | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9604877 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a1ea941d | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-574fc31a | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c5c7028c | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5bbabdc1 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-817bfc8a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-c175f655 | skipped | - | - | cap |
| C-92d9ac35 | skipped | - | - | cap |
| C-30ed04fb | skipped | - | - | cap |
| C-5bbabdc1 | skipped | - | - | cap |
| C-cb608bfb | skipped | - | - | cap |
| C-d9604877 | skipped | - | - | cap |
| C-38740f97 | skipped | - | - | cap |
| C-af45d5fe | not_testable | - | - | emptyStateModel and loadingStateModel are TypeScript functions in web/src/kit/states.ts with no Python interface; they are covered by Node tests. |
| C-a1ea941d | not_testable | - | - | checkAccessibilitySetup is a TypeScript function; the shown sources give no module path or signature, and it can't be imported from pytest. |

## Answers to verdict questions

- Q-003 accept C-c5c7028c by agent (CLAUDECODE): The criterion is satisfied as it stands; I checked it in a browser, not from the files alone. With axe-core 4.14.0 in Chromium and the assert_accessible body of task 9.1, a page with lang and a title holding a labelled button returns, and the same page holding a button without a name fails with "acc...
- Q-005 accept H-4c6c7bb5 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-cb608bfb is the scenario "Contrast maths and colour parsing": it exercises the pure functions contrastRatio and parseHexColour and the KitError thrown for a non-hex argument. None of that is rendered or reachable from the browser; the spec scenario names only func...
- Q-006 accept H-2b729d71 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-16a71639 is the scenario "The real tokens meet WCAG AA": it reads tokens.css, parses it with parseTokens, and checks CONTRAST_PAIRS, checkTokenContrast and the six-digit hex form of every colour token. Every step of the scenario is a function call on a file and it...
- Q-007 accept H-01c51033 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-4f003820 is the scenario "A weak, missing or malformed token is reported": it calls checkTokenContrast on the real tokens with --ui-color-text weakened to #777777, then without --ui-color-focus, then with --ui-color-border set to red, and checks the failure ids, r...
- Q-008 accept H-f79f2bc2 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-92d9ac35 is the scenario "The theme uses only tokens": it reads the source file theme.css, asserts that findRawColours reports nothing on it and that it holds :focus-visible, prefers-reduced-motion and the six kit classes, and then runs findRawColours on a five-li...
- Q-009 accept H-6dadab51 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-d365d748 is the scenario "The web sources have no inline styles": it calls findInlineStyleUse on a four-line sample and expects lines 1, 2 and 3 reported, then runs it over every .tsx file under web/src and over web/index.html and expects nothing. Every step is a ...
- Q-010 accept H-df7e1bc7 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-e2ce7344 is the scenario "Known codes" of the requirement "One catalogue maps API error codes to text": it checks that typeof messageFor is a function and that messageFor, called with each key of BASE_MESSAGES, answers the ten codes of task 2.1 with their catalogu...
- Q-011 accept H-fb25c506 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-2f2f685e is the scenario "Unknown codes use the fallback" of the requirement "One catalogue maps API error codes to text": messageFor, called with "NO_SUCH_CODE", "", "forbidden", "constructor" and "__proto__", must answer FALLBACK_MESSAGE every time. Every step i...
- Q-012 accept H-9e414469 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-c175f655 is the scenario "Later units register codes" of the requirement "One catalogue maps API error codes to text": registerMessages is called twice with the same TEST_ONLY_FLOW_LOCKED entry, then with a duplicate FORBIDDEN text, a changed text for the register...
- Q-013 accept H-c4c6e005 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-1688efa8 is the scenario "Parsing the answer" of the requirement "The nav shows only the entries the user's capabilities allow": parseMe gets a valid body with capabilities ["read_flow", "Bad Cap", 5, "read_flow"], then bodies with capabilities as a string, withou...
- Q-014 accept H-560ac014 by agent (CLAUDECODE): The hold may be waived. Criterion C-30ed04fb is the scenario "The loader outcomes": every step is the capability loader's load() and reset() on a fake client, a pure call and its return value, which no page shows. Its inputs (a fake API client) cannot be given to the running app, so a browser test c...
- Q-015 accept H-ae010e47 by agent (CLAUDECODE): The hold may be waived. Criterion C-0dae9ed5 is the scenario "Concurrent callers and abort": every step is the capability loader's load() on a fake client and an aborted signal, a pure call and its return value, which no page shows. Its inputs (a fake API client and an aborted signal) cannot be give...
- Q-016 accept H-5049f1f6 by agent (CLAUDECODE): The hold may be waived. Criterion C-63a759ac is the scenario "Filtering and the notice": every step is visibleNav and capabilityNotice on hand-made states and a registry, a pure call and its return value, which no page shows. Its inputs (a hand-made registry with entries a, b and c) cannot be given ...
- Q-017 accept H-b1fcc4d1 by agent (CLAUDECODE): The hold may be waived. Criterion C-af45d5fe is the scenario "The models": every step is emptyStateModel and loadingStateModel, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in that function, says no route renders ErrorP...
- Q-018 accept H-fc3f4be7 by agent (CLAUDECODE): The hold may be waived. Criterion C-844ec099 is the scenario "Invalid properties": every step is emptyStateModel and loadingStateModel with invalid properties, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in that functi...
- Q-019 accept H-05b93ca5 by agent (CLAUDECODE): The hold may be waived. Criterion C-c0db9325 is the scenario "The model by status": every step is errorPanelModel on ApiRequestError values, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in that function, says no route r...
- Q-020 accept H-59ec0374 by agent (CLAUDECODE): The hold may be waived. Criterion C-38740f97 is the scenario "A decision id is shown only when it is well formed": every step is errorPanelModel on ApiRequestError values, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in...
- Q-021 accept H-ca25c180 by agent (CLAUDECODE): The hold may be waived. Criterion C-b735b791 is the scenario "Copying": every step is copyText on fake clipboards and copyNotice, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in that function, says no route renders Erro...
- Q-022 accept H-223efcbe by agent (CLAUDECODE): The hold may be waived. Criterion C-c149362f is the scenario "The model": every step is confirmDialogModel, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in that function, says no route renders ErrorPanel, ConfirmDialog,...
- Q-023 accept H-b19cf330 by agent (CLAUDECODE): The hold may be waived. Criterion C-51e7abfc is the scenario "The confirm button must name the action": every step is confirmDialogModel, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in that function, says no route rend...
- Q-024 accept H-c9b87e6e by agent (CLAUDECODE): The hold may be waived. Criterion C-ab614782 is the scenario "Only the exact value confirms": every step is dialogOutcome, a pure call and its return value, which no page shows. The design's paragraph "DOM behaviour and its check" places this check in that function, says no route renders ErrorPanel,...
- Q-025 accept H-da07a80f by agent (CLAUDECODE): The hold may be waived. Criterion C-0b8be44d is the scenario "Expiry by the clock": every step is a toast queue on a KitClock, a pure call and its return value, which no page shows. Its inputs (a fake KitClock) cannot be given to the running app, so a browser test cannot express the scenario. Its No...
- Q-026 accept H-2d42146d by agent (CLAUDECODE): The hold may be waived. Criterion C-278586d8 is the scenario "Duplicates, limits and invalid specs": every step is push and createToastQueue on a toast queue, a pure call and its return value, which no page shows. Its inputs (queues with chosen limits) cannot be given to the running app, so a browse...
- Q-027 accept H-af0cdc46 by agent (CLAUDECODE): The hold may be waived. Criterion C-c3a242d6 is the scenario "Subscribers and stable snapshots": every step is subscribe, push, dismiss and list on a toast queue, a pure call and its return value, which no page shows. Its inputs (throwing and unsubscribing subscribers) cannot be given to the running...
- Q-028 accept H-d560b43e by agent (CLAUDECODE): The hold may be waived. Criterion C-16e957dd is the scenario "Focus after a dismissal and the default queue": every step is focusAfterDismiss, toast and dismissToast on the default queue, a pure call and its return value, which no page shows. Its inputs (chosen toast id lists) cannot be given to the...
- Q-029 accept H-72502a0f by agent (CLAUDECODE): The hold may be waived. Criterion C-d9604877 is the scenario "Documentation matches the component files": every step is a comparison of KEYBOARD with the kit's file names, a comparison of source files, which no page shows. Its inputs (the kit's source file names) cannot be given to the running app, ...
- Q-030 accept H-0e29e529 by agent (CLAUDECODE): The hold may be waived. Criterion C-a1ea941d is the scenario "The setup check": every step is checkAccessibilitySetup on throwaway roots, a Node check of the repository's files, which no page shows. Its inputs (throwaway repository roots) cannot be given to the running app, so a browser test cannot ...
- Q-031 accept H-d7bde6af by agent (CLAUDECODE): The hold may be waived. Criterion C-574fc31a is the scenario "The repository is set up and axe-core's licence is allowed": every step is checkAccessibilitySetup, scanNpmStore and checkLicences on the repository, a Node check of the repository's files and installed packages, which no page shows. Its ...

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
| C-c5c7028c | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser | pass | pass | accepted by agent (CLAUDECODE): The criterion is satisfied as it stands; I checked it in a browser, not from the files alone. With axe-core 4.14.0 in Chromium and the assert_accessible body of task 9.1, a page with lang and a title holding a labelled button returns, and the same page holding a butto... |
| C-5bbabdc1 | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The M0 pages pass | pass | pass | the judge passed it and a discriminating test passes |
| C-817bfc8a | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast — regression 1 › Toast Dismiss button turns white-on-white on hover | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-f6d2569a): test_m1_web_kit::test_c_f6d2569a_me_failure_shows_one_notice[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f6d2569a): test_m1_web_kit::test_c_f6d2569a_me_success_keeps_the_nav[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-f6d2569a): test_m1_web_kit::test_c_f6d2569a_signed_out_nav_lists_home[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c5c7028c): test_m1_web_kit::test_assert_accessible_accepts_a_named_button[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c5c7028c): test_m1_web_kit::test_assert_accessible_names_the_failing_rule[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5bbabdc1): test_m0_skeleton::test_deep_link_returns_the_app[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5bbabdc1): test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-5bbabdc1): test_m0_skeleton::test_shell_landmarks_and_skip_link[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-817bfc8a): test_toast_hover::test_c_817bfc8a_toast_dismiss_keeps_background_on_hover[chromium]: no proof that it discriminates (no red, audit or generated record)
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
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-817bfc8a): The end-to-end test test_toast_hover::test_c_817bfc8a_toast_dismiss_keeps_background_on_hover[chromium] traces criterion C-817bfc8a (web-kit › The tokens and theme are CSS files that meet WCAG AA contrast — regression 1 › Toast Dismiss button turns white-on-white on hover), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] C-c5c7028c test does not check the rule id in the failure message (criterion C-c5c7028c): test_assert_accessible_names_the_failing_rule only uses pytest.raises(pytest.fail.Exception) and never asserts that the message holds 'button-name', which the scenario requires. This is why traceability lists the criterion as uncovered.
- [minor, judge] task 7.1: e2e test names differ from the task text (criterion C-f6d2569a): Task 7.1 names test_signed_out_nav_lists_home, test_me_failure_shows_one_notice and test_me_success_keeps_the_nav, and design.md cites test_me_failure_shows_one_notice by name. The diff names them test_c_f6d2569a_signed_out_nav_lists_home and so on.
- [minor, judge] findRawColours flags hex-like id selectors and colour-word class names (spec gap) (criterion C-92d9ac35): RAW_HEX /#[0-9a-fA-F]{3,8}\b/ matches selectors such as `#add` or `#face`. RAW_NAME matches `red` inside `.ui-red`, because the hyphen counts as a word boundary. Neither is pinned by a scenario, and a token-only theme with such a selector would be reported.
- [major, judge] Focus outline on the toast Dismiss button is below 3:1 against the toast background (spec gap) (criterion C-16a71639): The global :focus-visible rule draws a var(--ui-color-focus) outline (#1d4ed8) with a 2px offset. Inside a toast that outline sits on --ui-color-toast-bg (#1b1f27), and the ratio is about 2.5:1, below the 3:1 the requirement asks for focus indicators. CONTRAST_PAIRS only checks focus against bg and surface, so no gate catches it.
- [minor, judge] A repeated toast keeps its old place in the queue (spec gap) (criterion C-278586d8): A duplicate push refreshes the expiry but leaves the item in place. When the queue is full, a refreshed old item is still the oldest and is the first dropped, even though it was just re-shown. No scenario pins this down.
- [minor, judge] toast-hover.test.ts reads theme.css without an existsSync assertion first (criterion C-817bfc8a): design.md's test plan asks that a test reading a file created in green first assert with assert.ok that the file exists. This test calls readFileSync at module level, so a missing file fails with ENOENT instead of an assertion.
- [minor, judge] the judge called a test inadequate (criterion C-5bbabdc1): test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/]

## Needs a human

- UI criterion C-c5c7028c has no end-to-end test (not_testable); see the generated UI tests table
- UI criterion C-817bfc8a has no end-to-end test (not_testable); see the generated UI tests table

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
- `web.src.kit.toast-hover.test.ts::C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover` (task 1.1): passed
- `web.src.kit.toast.test.ts::C-0b8be44d expiry by the clock` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-16e957dd focus after a dismissal and the default queue` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-278586d8 duplicates, limits and invalid specs` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-c3a242d6 subscribers and stable snapshots` (task 6.1): passed

## Guard events

- guard.violation: e2e/conftest.py
