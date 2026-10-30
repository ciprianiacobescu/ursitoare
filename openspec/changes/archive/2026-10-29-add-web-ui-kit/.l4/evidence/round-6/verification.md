# Verification: openspec:add-web-ui-kit: PASS (round 6)

traceability: 31/32 criteria covered by a discriminating test

- Base: `f16558c6dca3050ee88f2f0ab5d2f8aeed9dc49e`
- Head: `65e8d7a3bef6b9bc4c8dfedbef29cb374a23f201`
- Implementer profiles: deepseek-free, glm
- Judge: claude-judge (claude-opus-5-5), 2 call(s), judged in 2 parts, prompt sha256 `7410a5b3be688eaffca228cf172dedfc605aed7193ffa5bbb3cdaa7c0c954070`
  - part 1: 36 file(s), 99038 characters, profile claude-judge, reply valid
  - part 2: 11 file(s), 62967 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 6, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared), glm zhipu (declared)
- Cost: $4.3006

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 5) |
| 1 | integrity | reused | 0.0 | reused (round 5) |
| 2 | build | reused | 0.0 | reused (round 5) |
| 3 | tests | reused | 0.0 | reused (round 5) |
| 4 | traceability | reused | 0.0 | reused (round 5) |
| 4a | audit sampling | reused | 0.0 | reused (round 5) |
| 5 | ui test generation | reused | 0.0 | reused (round 5) |
| 6 | quality | reused | 0.0 | reused (round 5) |
| 8 | s1 judge | reused | 0.0 | reused (round 5) |
| 9 | judge | reused | 0.0 | reused (round 5) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261029T2108Z-9abe/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261029T2108Z-9abe/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261029T2108Z-9abe/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261029T2108Z-9abe/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261029T2108Z-9abe/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261029T2108Z-9abe/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261029T2108Z-9abe/029-e2e.log |

## Files by part

- part 1: openspec/changes/add-web-ui-kit-fix-1/.openspec.yaml (296 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-2/.openspec.yaml (296 characters)
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
- part 1: openspec/changes/add-web-ui-kit-fix-2/proposal.md (1527 characters)
- part 1: web/src/app/Shell.tsx (1063 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-1/specs/web-kit/spec.md (1015 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-2/specs/web-kit/spec.md (1078 characters)
- part 1: web/src/kit/states.test.ts (2844 characters)
- part 1: web/src/kit/states.ts (2071 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-1/tasks.md (359 characters)
- part 1: openspec/changes/add-web-ui-kit-fix-2/tasks.md (392 characters)
- part 2: openspec/changes/add-web-ui-kit/tasks.md (28398 characters)
- part 2: web/src/kit/theme.css (3882 characters)
- part 2: web/src/kit/toast.test.ts (6470 characters)
- part 2: web/src/kit/toast.ts (6328 characters)
- part 2: web/src/kit/toast-focus.test.ts (3432 characters)
- part 2: web/src/kit/toast-hover.test.ts (3029 characters)
- part 2: e2e/test_toast_focus.py (3548 characters)
- part 2: e2e/test_toast_hover.py (3262 characters)
- part 2: web/src/kit/ToastRegion.tsx (1998 characters)
- part 2: web/src/kit/tokens.css (1030 characters)
- part 2: web/src/kit/use-visible-nav.ts (1590 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 7 test file(s) compared with the base; changed in place, named by the task text: e2e.test_m0_skeleton::test_deep_link_returns_the_app (named by the task text, plan:m1@f21891c52e3d0b9e), e2e.test_m0_skeleton::test_landing_page_health_states (named by the task text, plan:m1@f21891c52e3d0b9e), e2e.test... |
| red-green freeze | ok | 11 task(s): red and green compared (+2 unfrozen by a delegate or an agent) |
| test path freeze | ok | 11 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/support/a11y-setup.test.ts, test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx (+24 more) |
| tdd history | ok | 11 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 828 of 828 base tests pass on the unit's code with its 17 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/conftest.py kept at head for the run (task 9.1: unfrozen by Q-002)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- e2e/conftest.py (task 9.1, unfrozen by Q-002 (agent))
- e2e/test_m1_web_kit.py (task 9.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-cb608bfb | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › Contrast maths and colour parsing | covered | web.src.kit.contrast.test.ts::C-cb608bfb contrast maths and colour parsing (passed, red_assertion) | - | 0.95 | - |
| C-16a71639 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The real tokens meet WCAG AA | covered | web.src.kit.contrast.test.ts::C-16a71639 the real tokens meet WCAG AA (passed, red_assertion); web.src.kit.toast-focus.test.ts::C-461674d2 C-16a71639 toast Dismiss focus outline contrasts with the toast background (passed, red_assertion, inadequate) | - | 0.82 | - |
| C-4f003820 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › A weak, missing or malformed token is reported | covered | web.src.kit.contrast.test.ts::C-4f003820 a weak, missing or malformed token is reported (passed, red_assertion) | - | 0.79 | - |
| C-92d9ac35 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The theme uses only tokens | covered | web.src.kit.contrast.test.ts::C-92d9ac35 the theme uses only tokens (passed, red_assertion); web.src.kit.toast-hover.test.ts::C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover (passed, red_assertion, inadequate) | - | 0.83 | - |
| C-d365d748 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast › The web sources have no inline styles | covered | web.src.kit.contrast.test.ts::C-d365d748 the web sources have no inline styles (passed, red_assertion) | - | 0.81 | - |
| C-e2ce7344 | web-kit › One catalogue maps API error codes to text › Known codes | covered | web.src.kit.messages.test.ts::C-e2ce7344 known codes (passed, red_assertion) | - | 0.87 | - |
| C-2f2f685e | web-kit › One catalogue maps API error codes to text › Unknown codes use the fallback | covered | web.src.kit.messages.test.ts::C-2f2f685e unknown codes use the fallback (passed, red_assertion) | - | 0.86 | - |
| C-c175f655 | web-kit › One catalogue maps API error codes to text › Later units register codes | covered | web.src.kit.messages.test.ts::C-c175f655 later units register codes (passed, red_assertion) | - | 0.84 | - |
| C-1688efa8 | web-kit › The nav shows only the entries the user's capabilities allow › Parsing the answer | covered | web.src.kit.capabilities.test.ts::C-1688efa8 parsing the answer (passed, red_assertion) | - | 0.90 | - |
| C-30ed04fb | web-kit › The nav shows only the entries the user's capabilities allow › The loader outcomes | covered | web.src.kit.capabilities.test.ts::C-30ed04fb the loader outcomes (passed, red_assertion) | - | 0.92 | - |
| C-0dae9ed5 | web-kit › The nav shows only the entries the user's capabilities allow › Concurrent callers and abort | covered | web.src.kit.capabilities.test.ts::C-0dae9ed5 concurrent callers and abort (passed, red_assertion) | - | 0.91 | - |
| C-63a759ac | web-kit › The nav shows only the entries the user's capabilities allow › Filtering and the notice | covered | web.src.kit.capabilities.test.ts::C-63a759ac filtering and the notice (passed, red_assertion) | - | 0.93 | - |
| C-f6d2569a | web-kit › The nav shows only the entries the user's capabilities allow › The nav in the browser | covered | test_l4_c_f6d2569a::test_nav_in_browser_signed_out_unavailable_and_ready[chromium] (passed, generated) | test_m1_web_kit::test_c_f6d2569a_me_failure_shows_one_notice[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test_c_f6d2569a_me_success_keeps_the_nav[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test... | 0.87 | - |
| C-af45d5fe | web-kit › Empty and loading states are announced and validated › The models | covered | web.src.kit.states.test.ts::C-af45d5fe the models (passed, red_assertion) | - | 0.91 | - |
| C-844ec099 | web-kit › Empty and loading states are announced and validated › Invalid properties | covered | web.src.kit.states.test.ts::C-844ec099 invalid properties (passed, red_assertion) | - | 0.92 | - |
| C-c0db9325 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › The model by status | covered | web.src.kit.error-panel.test.ts::C-c0db9325 the model by status (passed, red_assertion) | - | 0.92 | - |
| C-38740f97 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › A decision id is shown only when it is well formed | covered | web.src.kit.error-panel.test.ts::C-38740f97 a decision id is shown only when it is well formed (passed, red_assertion) | - | 0.77 | - |
| C-b735b791 | web-kit › ErrorPanel shows the message for the code and, on 403, the decision id with a copy button › Copying | covered | web.src.kit.error-panel.test.ts::C-b735b791 copying (passed, red_assertion) | - | 0.89 | - |
| C-c149362f | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The model | covered | web.src.kit.confirm.test.ts::C-c149362f the model (passed, red_assertion) | - | 0.92 | - |
| C-51e7abfc | web-kit › ConfirmDialog names its action and cancels unless told otherwise › The confirm button must name the action | covered | web.src.kit.confirm.test.ts::C-51e7abfc the confirm button must name the action (passed, red_assertion) | - | 0.74 | - |
| C-ab614782 | web-kit › ConfirmDialog names its action and cancels unless told otherwise › Only the exact value confirms | covered | web.src.kit.confirm.test.ts::C-ab614782 only the exact value confirms (passed, red_assertion) | - | 0.87 | - |
| C-0b8be44d | web-kit › toast() uses one polite live region and a testable queue › Expiry by the clock | covered | web.src.kit.toast.test.ts::C-0b8be44d expiry by the clock (passed, red_assertion) | - | 0.95 | - |
| C-278586d8 | web-kit › toast() uses one polite live region and a testable queue › Duplicates, limits and invalid specs | covered | web.src.kit.toast.test.ts::C-278586d8 duplicates, limits and invalid specs (passed, red_assertion) | - | 0.92 | - |
| C-c3a242d6 | web-kit › toast() uses one polite live region and a testable queue › Subscribers and stable snapshots | covered | web.src.kit.toast.test.ts::C-c3a242d6 subscribers and stable snapshots (passed, red_assertion) | - | 0.91 | - |
| C-16e957dd | web-kit › toast() uses one polite live region and a testable queue › Focus after a dismissal and the default queue | covered | web.src.kit.toast.test.ts::C-16e957dd focus after a dismissal and the default queue (passed, red_assertion) | - | 0.93 | - |
| C-d9604877 | web-kit › Every component documents its keyboard behaviour › Documentation matches the component files | covered | web.src.kit.keyboard.test.ts::C-d9604877 keyboard documentation matches the component files (passed, red_assertion) | - | 0.93 | - |
| C-a1ea941d | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The setup check | covered | test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup accepts a complete throwaway root (passed, red_assertion); test.support.a11y-setup.test.ts::C-a1ea941d checkAccessibilitySetup reports a conftest without the assert_accessible helper (passed, red_assertion); test.support.a11y-setup.... | - | 0.90 | - |
| C-574fc31a | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The repository is set up and axe-core's licence is allowed | covered | test.support.a11y-setup.test.ts::C-574fc31a the repository is set up and the installed axe-core licence is allowed (passed, red_assertion) | - | 0.88 | - |
| C-c5c7028c | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The helper in a browser | uncovered | - | test_m1_web_kit::test_assert_accessible_accepts_a_named_button[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m1_web_kit::test_assert_accessible_names_the_failing_rule[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 | `e2e/test_l4_c_c5c7028c.py`, `.l4-out/e2e/page.html` |
| C-5bbabdc1 | web-kit › assert_accessible fails a journey on serious or critical axe violations, offline › The M0 pages pass | covered | test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/] (passed, generated, inadequate); test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/no-such-page-deep-link] (passed, generated) | test_m0_skeleton::test_deep_link_returns_the_app[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_she... | 0.75 | - |
| C-817bfc8a | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast — regression 1 › Toast Dismiss button turns white-on-white on hover | covered | web.src.kit.toast-hover.test.ts::C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover (passed, red_assertion) | test_toast_hover::test_c_817bfc8a_toast_dismiss_keeps_background_on_hover[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.93 | - |
| C-461674d2 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast — regression 2 › Focus outline on the toast Dismiss button is below 3:1 against the toast background | covered | web.src.kit.toast-focus.test.ts::C-461674d2 C-16a71639 toast Dismiss focus outline contrasts with the toast background (passed, red_assertion); test_l4_c_461674d2::test_toast_dismiss_focus_outline_contrast[chromium] (passed, generated, base fail, head pass) | test_toast_focus::test_c_461674d2_toast_dismiss_focus_outline_contrasts[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.93 | `e2e/test_l4_c_461674d2.py`, `.l4-out/e2e/page.html` |

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
| `e2e/test_toast_focus.py` |  | relevant | new test file |
| `e2e/test_toast_hover.py` |  | relevant | new test file |
| `openspec/changes/add-web-ui-kit-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/specs/web-kit/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-2/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-2/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-2/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-2/specs/web-kit/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit-fix-2/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-3/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-3/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-3/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-4/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-4/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/evidence/round-4/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1619Z-5d8b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1856Z-fd8d.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T1943Z-8995.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2009Z-d59b.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2033Z-5460.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2037Z-4e1c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2044Z-1984.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ui-kit/.l4/ledger/r-20261029T2108Z-9abe.jsonl` |  | none | exempt: harness, spec or documentation path |
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
| `web/src/kit/toast-focus.test.ts` |  | relevant | new test file |
| `web/src/kit/toast-hover.test.ts` |  | relevant | new test file |
| `web/src/kit/toast.test.ts` |  | relevant | new test file |
| `web/src/kit/toast.ts` | web | relevant | named in the spec |
| `web/src/kit/tokens.css` | web | relevant | named in the spec |
| `web/src/kit/use-visible-nav.ts` | web | relevant | named in the spec |
| `web/src/main.tsx` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/support/a11y-setup.ts, web/src/app/Shell.tsx, web/src/kit/ConfirmDialog.tsx, web/src/kit/EmptyState.tsx, web/src/kit/ErrorPanel.tsx and 13 more

### Tests

897 of 897 passed, 0 failed, 0 errored, 0 skipped.
43 of 43 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-cb608bfb | not_testable | - | - | - | 1 | contrastRatio and parseHexColour are internal kit functions bundled into the app. The page exposes no UI or global that calls them, so a browser test can't check their results or the KitError. | - |
| C-16a71639 | not_testable | - | - | - | 1 | Checks parseTokens, CONTRAST_PAIRS and checkTokenContrast on tokens.css, which are build-time module functions with no user-visible browser behaviour. | - |
| C-4f003820 | not_testable | - | - | - | 1 | checkTokenContrast is a build-time function over CSS files, not exposed in the web UI; a browser test cannot call it or set tokens. | - |
| C-92d9ac35 | not_testable | - | - | - | 1 | Criterion concerns reading theme.css and calling findRawColours scanner functions (unit-level file/function checks), not browser-observable behaviour. | - |
| C-d365d748 | not_testable | - | - | - | 1 | Criterion is about a source-scanning helper (findInlineStyleUse) over repository files, not browser-observable behavior; it belongs in a unit test, not an e2e test. | - |
| C-e2ce7344 | not_testable | - | - | - | 1 | Criterion concerns the messageFor function and BASE_MESSAGES module exports, which are not reachable from the browser UI; no page behavior exposes them. | - |
| C-2f2f685e | not_testable | - | - | - | 1 | messageFor is a pure internal function not exposed in the UI; the page snapshot shows no route that renders it, so a browser test cannot call it with these inputs. | - |
| C-c175f655 | not_testable | - | - | - | 1 | Criterion concerns registerMessages/messageFor module functions and thrown KitError codes; not exposed in the UI, so a browser e2e test cannot check it. | - |
| C-1688efa8 | not_testable | - | - | - | 1 | The criterion tests the return value of the pure function parseMe. The built app doesn't expose it in the browser, so an e2e test can't call it. Any check through the nav UI would depend on unspecified markup. | - |
| C-30ed04fb | not_testable | - | - | - | 1 | The criterion covers the capability loader's internal outcomes, checked with a fake client. The loader is a module-level unit with no browser-observable surface, so an e2e test cannot inject a fake client or inspect its calls. | - |
| C-0dae9ed5 | not_testable | - | - | - | 1 | Criterion concerns the capability loader's load() API (client call count, AbortError on aborted signal), a module-level unit behavior with no user-visible UI outcome; covered by a node unit test. | - |
| C-63a759ac | not_testable | - | - | - | 1 | This criterion covers the pure functions visibleNav and capabilityNotice with a custom a/b/c registry. The browser app can't be given that registry, and the Shell diff doesn't render the notice. | - |
| C-af45d5fe | not_testable | - | - | - | 1 | The criterion is about pure model functions (emptyStateModel, loadingStateModel) with no page route that exposes them in the app; the page snapshot is an empty SPA shell, so a browser test can't reach them. | - |
| C-844ec099 | not_testable | - | - | - | 1 | Criterion concerns pure model functions (emptyStateModel/loadingStateModel throwing KitError); no user-visible browser behavior or exposed route to drive via Playwright. | - |
| C-c0db9325 | not_testable | - | - | - | 1 | The criterion is about the pure function errorPanelModel with constructed ApiRequestError inputs. The page snapshot shows only an empty SPA shell with no route that renders ErrorPanel for these inputs, so a browser test cannot check it. | - |
| C-38740f97 | not_testable | - | - | - | 1 | errorPanelModel is a pure function in the web-kit with no page or route exposing it; the built app snapshot shows only an empty root, so a browser test can't feed it these inputs. | - |
| C-b735b791 | not_testable | - | - | - | 1 | The criterion is about the pure functions copyText and copyNotice. The snapshot shows no page or route that renders ErrorPanel with a 403 decision id, so a browser test can't reach those functions. | - |
| C-c149362f | not_testable | - | - | - | 1 | The criterion specifies a pure function (confirmDialogModel) with no route or page in the app that renders ConfirmDialog; the page snapshot is an empty SPA shell, so a browser test cannot reach it. | - |
| C-51e7abfc | not_testable | - | - | - | 1 | The criterion concerns confirmDialogModel, a pure function throwing KitError. The app's served page doesn't expose it and no route renders ConfirmDialog, so a browser test can't check it. | - |
| C-ab614782 | not_testable | - | - | - | 1 | dialogOutcome is a pure function; no known route renders ConfirmDialog and the browser can't call it directly. A unit test covers it. | - |
| C-0b8be44d | not_testable | - | - | - | 1 | Criterion specifies a queue API (push/list/nextExpiry/expire) on an injected KitClock; the browser UI exposes no way to inject the clock or call the queue, so it can't be checked end-to-end. | - |
| C-278586d8 | not_testable | - | - | - | 1 | Criterion concerns pure queue API behavior (push/createToastQueue throwing KitError, ids, expiry); the page snapshot exposes no module access or UI path to trigger these, so a browser test cannot check it. | - |
| C-c3a242d6 | not_testable | - | - | - | 1 | Criterion targets the in-memory toast queue's subscribe/list/dismiss API (identity of arrays, throwing subscribers), which is not reachable from the browser UI; the page exposes no handle to the queue. | - |
| C-16e957dd | not_testable | - | - | - | 1 | Targets pure functions (focusAfterDismiss, toastQueue, toast, dismissToast) that are not exposed in the browser UI; the page has no way to trigger toasts or call them from an e2e test. | - |
| C-d9604877 | not_testable | - | - | - | 1 | Compares a source-level KEYBOARD constant with files on disk (readdirSync); not observable through the browser UI, so a Playwright e2e test cannot check it. | - |
| C-a1ea941d | not_testable | - | - | - | 1 | Criterion concerns a build-time setup-check function (checkAccessibilitySetup) run on throwaway filesystem roots; it has no browser-visible behavior, so an e2e page test cannot exercise it. | - |
| C-574fc31a | not_testable | - | - | - | 1 | Criterion concerns repository setup checks and npm licence scanning functions, not browser-observable behaviour; no UI path to verify. | - |
| C-c5c7028c | uncollectable | e2e/test_l4_c_c5c7028c.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-817bfc8a | not_testable | - | - | - | 1 | No reachable user flow in the built app shows a toast. Toasts only come from the internal toast() call, which the bundle doesn't expose. The only caller is the ErrorPanel copy button, which needs a server error that has a decision id. | - |
| C-461674d2 | accepted | e2e/test_l4_c_461674d2.py | fail | pass | 1 | support: base | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-cb608bfb | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-16a71639 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4f003820 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92d9ac35 | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d365d748 | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e2ce7344 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2f2f685e | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c175f655 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1688efa8 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-30ed04fb | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0dae9ed5 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-63a759ac | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f6d2569a | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-af45d5fe | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-844ec099 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c0db9325 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-38740f97 | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b735b791 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c149362f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-51e7abfc | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ab614782 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0b8be44d | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-278586d8 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3a242d6 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-16e957dd | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d9604877 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a1ea941d | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-574fc31a | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c5c7028c | ok | 0.030 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5bbabdc1 | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-817bfc8a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-461674d2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-92d9ac35 | skipped | - | - | cap |
| C-574fc31a | skipped | - | - | cap |
| C-f6d2569a | skipped | - | - | cap |
| C-461674d2 | skipped | - | - | cap |
| C-cb608bfb | skipped | - | - | cap |
| C-d9604877 | skipped | - | - | cap |
| C-4f003820 | skipped | - | - | cap |
| C-844ec099 | skipped | - | - | cap |
| C-5bbabdc1 | not_testable | - | - | Needs a live browser and running web app (Playwright e2e journeys with axe-core injected); no shown Python source to import, and no network or running allowed. |
| C-51e7abfc | not_testable | - | - | confirmDialogModel is a TypeScript module in web/src/kit/confirm.ts, checked by Node tests. Pytest can't import it, and no runner or file layout is shown. |

## Answers to verdict questions

- Q-003 accept C-c5c7028c by agent (CLAUDECODE): The criterion is satisfied as it stands; I checked it in a browser, not from the files alone. With axe-core 4.14.0 in Chromium and the assert_accessible body of task 9.1, a page with lang and a title holding a labelled button returns, and the same page holding a button without a name fails with "acc...
- Q-036 accept H-1208e5d8 by agent (CLAUDECODE): The unit can go on as it stands. Criterion C-c5c7028c was answered in Q-003 and is judged pass: I ran the assert_accessible body of task 9.1 with axe-core 4.14.0 in Chromium, and on a page with lang and a title a labelled button returns while a button without a name fails with a message holding butt...

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
| C-461674d2 | web-kit › The tokens and theme are CSS files that meet WCAG AA contrast — regression 2 › Focus outline on the toast Dismiss button is below 3:1 against the toast background | pass | pass | the judge passed it and a discriminating test passes |

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
- [minor, deterministic] a test is ignored as evidence (criterion C-461674d2): test_toast_focus::test_c_461674d2_toast_dismiss_focus_outline_contrasts[chromium]: no proof that it discriminates (no red, audit or generated record)
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
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-461674d2): The end-to-end test test_toast_focus::test_c_461674d2_toast_dismiss_focus_outline_contrasts[chromium] traces criterion C-461674d2 (web-kit › The tokens and theme are CSS files that meet WCAG AA contrast — regression 2 › Focus outline on the toast Dismiss button is below 3:1 against the toast background), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] The browser test does not check that the failure message names button-name (criterion C-c5c7028c): test_assert_accessible_names_the_failing_rule only uses pytest.raises(pytest.fail.Exception) and never matches the message, so C-c5c7028c has no discriminating test (the traceability reports it uncovered).
- [minor, judge] task 7.1: the journey test names differ from the task (criterion C-f6d2569a): Task 7.1 names test_signed_out_nav_lists_home, test_me_failure_shows_one_notice and test_me_success_keeps_the_nav, and design.md cites test_me_failure_shows_one_notice. The diff names them test_c_f6d2569a_*. Task 7.1 also says every test in test_m1_web_kit.py takes fresh_state, but the two assert_accessible tests do not.
- [minor, judge] task 2.1: the lookup uses a Map instead of Object.hasOwn (criterion C-2f2f685e): Task 2.1 says the lookup uses own properties only (Object.hasOwn). The code uses a Map, which behaves the same for prototype keys but differs from the task text.
- [minor, judge] The inline-style scan flags any text containing style= (spec gap) (criterion C-d365d748): INLINE_STYLE matches the substring 'style=' anywhere on a line, so an attribute such as data-style= or borderStyle= is reported too. No scenario pins this.
- [minor, judge] A /me answer of 403 gives failed with its code (spec gap) (criterion C-30ed04fb): The loader maps any non-401 ApiRequestError, such as a 403 FORBIDDEN or a 403 CSRF_INVALID, to failed with that code, which shows the notice. No scenario pins a 403.
- [minor, judge] copyText of whitespace-only text is unavailable (spec gap) (criterion C-b735b791): copyText trims the text before its empty check, so " " gives unavailable and writes nothing. The scenario pins only "".
- [minor, judge] A repeated toast keeps its old position in the queue (spec gap) (criterion C-278586d8): push() refreshes expiresAt of an existing duplicate in place and does not move it to the end. So a repeated message stays the oldest item and the next distinct push beyond maxVisible drops it first. No scenario pins whether a repeat counts as the newest item.
- [minor, judge] A repeat push can change a toast's expiry kind (spec gap) (criterion C-278586d8): The duplicate check matches on kind and message only, so pushing the same info message with durationMs: null makes a visible expiring toast persistent, and the reverse makes it expire. No scenario pins this.
- [minor, judge] the judge called a test inadequate (criterion C-16a71639): web.src.kit.toast-focus.test.ts::C-461674d2 C-16a71639 toast Dismiss focus outline contrasts with the toast background
- [minor, judge] the judge called a test inadequate (criterion C-92d9ac35): web.src.kit.toast-hover.test.ts::C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover
- [minor, judge] the judge called a test inadequate (criterion C-5bbabdc1): test_l4_c_5bbabdc1::test_m0_pages_have_no_serious_violations_or_csp_messages[chromium-/]

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
- `web.src.kit.toast-focus.test.ts::C-461674d2 C-16a71639 toast Dismiss focus outline contrasts with the toast background` (task 1.1): passed
- `web.src.kit.toast-hover.test.ts::C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover` (task 1.1): passed
- `web.src.kit.toast.test.ts::C-0b8be44d expiry by the clock` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-16e957dd focus after a dismissal and the default queue` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-278586d8 duplicates, limits and invalid specs` (task 6.1): passed
- `web.src.kit.toast.test.ts::C-c3a242d6 subscribers and stable snapshots` (task 6.1): passed

## Guard events

- guard.violation: e2e/conftest.py
