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
| Q-001 | open | 9.1 | technical | e2e/test_m1_web_kit.py:129 — set_content page without <title>/<html lang> can never pass assert_accessible |
<!-- l4:index:end -->

---

## Q-001: e2e/test_m1_web_kit.py:129 — set_content page without <title>/<html lang> can never pass assert_accessible

- **Status:** open
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
