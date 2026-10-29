# Questions — add-web-ui-kit

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | accepted | 9.1 | technical | e2e/test_m1_web_kit.py:129 — set_content page without <title>/<html lang> can never pass assert_accessible |
| Q-002 | open | 9.1 | technical | test/support/a11y-setup.test.ts:167 (C-574fc31a) depends on e2e/conftest.py:68, which the frozen-test guard protects |
<!-- l4:index:end -->

---

## Q-001: e2e/test_m1_web_kit.py:129 — set_content page without <title>/<html lang> can never pass assert_accessible

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 9.1
- **Kind:** technical
- **Asked:** 2026-10-29T19:40Z by glm, run r-20261029T1856Z-fd8d, task 9.1

### Context
The frozen test asserts that assert_accessible(page) returns after page.set_content("<button>Save changes</button>"). The task 9.1 text specifies assert_accessible to run axe with AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]. axe 4.14.0 tags document-title and html-has-lang as wcag2a, and runs them with impact serious, so on the bare set_content page (no <title>, no <html lang>) the helper must fail with 'accessibility violations: document-title (serious): html; html-has-lang (serious): html'. This contradicts the THEN of the browser scenario ('the first returns'). I verified the failure live with the given helper; the second test still fails with button-name even when the page is complete, so only the first test is affected. I could make it pass only by excluding document-level rules from the check, which weakens it beyond what the task states.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m1_web_kit.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ui-kit`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit e2e/test_m1_web_kit.py: in test_assert_accessible_accepts_a_named_button replace page.set_content("<button>Save changes</button>") with page.set_content('<html lang="en"><head><title>Kit check</title></head><body><button>Save changes</button></body></html>'); optionally apply the same wrapper around the button in test_assert_accessible_names_the_failing_rule.

### Clarifier suggestion
Edit `e2e/test_m1_web_kit.py`: in test_assert_accessible_accepts_a_named_button replace page.set_content("<button>Save changes</button>") with page.set_content('<html lang="en"><head><title>Kit check</title></head><body><button>Save changes</button></body></html>'); optionally apply the same wrapper around the button in test_assert_accessible_names_the_failing_rule.

### Answer
<!-- write below this line -->

---

## Q-002: test/support/a11y-setup.test.ts:167 (C-574fc31a) depends on e2e/conftest.py:68, which the frozen-test guard protects

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the answer would unfreeze e2e/conftest.py of task 9.1, a test-support file: a person's change (delegate.unfreeze opens test files only)
- **Blocking tasks:** 9.1
- **Kind:** technical
- **Asked:** 2026-10-29T20:02Z by glm, run r-20261029T1943Z-8995, task 9.1

### Context
The frozen red test asserts checkAccessibilitySetup(repoRoot) returns [] for the real repository. The check reads e2e/conftest.py and needs the implemented helper there: the text def assert_accessible(page, both literal impacts 'serious' and 'critical', and no add_script_tag or bypass_csp. The red step left assert_accessible as a stub (raise NotImplementedError, e2e/conftest.py:68), so the check correctly reports ASSERT_ACCESSIBLE_UNSAFE. Task 9.1 says the green step implements the helper in e2e/conftest.py ('the only task that changes it'), but the harness restored green attempt 1's identical edit as a protected path and instructed not to repeat it, so the criterion C-574fc31a and the browser criteria that need the helper (C-c5c7028c, C-5bbabdc1) cannot pass while the file stays frozen.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/conftest.py`, `test/support/a11y-setup.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ui-kit`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit e2e/conftest.py: replace the stub body of assert_accessible (lines 68-70) with the implementation of task 9.1: add 'from pathlib import Path' to the imports, add a module function _axe_source() that reads Path(__file__).resolve().parent.parent / 'node_modules' / 'axe-core' / 'axe.min.js' as utf8 and calls pytest.fail("axe-core is not installed: run pnpm install") on OSError, add the lines AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] and AXE_BLOCKING_IMPACTS = ("serious", "critical"), and give assert_accessible the exact body shown in tasks.md task 9.1 (inject _axe_source() when window.axe is undefined, run window.axe.run with runOnly type tag over AXE_TAGS, and pytest.fail with the joined 'id (impact): targets' list when a violation has impact serious or critical); every other existing statement (module docstring, imports, base_url, e2e_profile, _reset_failure, fresh_state) stays.

### Clarifier suggestion
Edit `e2e/conftest.py`: replace the stub body of assert_accessible (lines 68-70) with the implementation of task 9.1: add 'from pathlib import Path' to the imports, add a module function _axe_source() that reads Path(__file__).resolve().parent.parent / 'node_modules' / 'axe-core' / 'axe.min.js' as utf8 and calls pytest.fail("axe-core is not installed: run pnpm install") on OSError, add the lines AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] and AXE_BLOCKING_IMPACTS = ("serious", "critical"), and give assert_accessible the exact body shown in tasks.md task 9.1 (inject _axe_source() when window.axe is undefined, run window.axe.run with runOnly type tag over AXE_TAGS, and pytest.fail with the joined 'id (impact): targets' list when a violation has impact serious or critical); every other existing statement (module docstring, imports, base_url, e2e_profile, _reset_failure, fresh_state) stays.

### Answer
<!-- write below this line -->
