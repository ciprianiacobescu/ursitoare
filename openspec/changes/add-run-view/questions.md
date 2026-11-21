# Questions — add-run-view

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
| Q-001 | open | 5.1 | technical | e2e/test_m6b_run_view.py:59-76: step() mock lacks fields that parseStepView requires |
<!-- l4:index:end -->

---

## Q-001: e2e/test_m6b_run_view.py:59-76: step() mock lacks fields that parseStepView requires

- **Status:** open
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-11-21T06:38Z by claude-sonnet, run r-20261121T0424Z-1491, task 5.1

### Context
The step() helper returns seq, nodeId, kind, state, outcome, inputRef, outputRef, error, hooks, startedAt and endedAt. parseStepView in web/src/runs/types.ts rejects a step without effectSeq (integer >= 0), attempt (integer >= 1), idemKey (null or non-empty string), policyDecisionId (null or non-empty string) and taint (array of strings). The step list therefore fails to parse and the run page shows no status, no previews and no Steps list. That is the exact failure the harness reported: `get_by_role('status', name='Run state')` finds nothing and `p.runs-preview` count is 0. The parser is pinned by existing frozen tests, so green cannot loosen it.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m6b_run_view.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-run-view`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m6b_run_view.py`: in `step()` add the keys `"effectSeq": seq, "attempt": 1, "idemKey": None, "policyDecisionId": None, "taint": []` to the returned dict.
2. Edit `web/src/runs/types.ts` to make those fields optional (breaks the pins of existing frozen tests).

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m6b_run_view::test_previews_stop_at_fifty_and_run_four_at_a_time[chromium], test_m6b_run_view::test_run_page_header_previews_and_columns[chromium]
E       AssertionError: Locator expected to have count '50'
E       Actual value: 0
E       Call log: (same for 2 tests)
E         - Expect "to_have_count" locator("p.runs-preview") with timeout 30000ms
E         - waiting for locator("p.runs-preview")
E           64 × locator resolved to 0 elements
E       AssertionError: Locator expected to have text 'State: completed'
E       Actual value: None
E       Error: element(s) not found
E         - Expect "to_have_text" get_by_role("status", name="Run state") with timeout 5000ms
E         - waiting for get_by_role("sta
e2e/test_m6b_run_view.py:169

### Clarifier suggestion
Edit `e2e/test_m6b_run_view.py`: in `step()` add the keys `"effectSeq": seq, "attempt": 1, "idemKey": None, "policyDecisionId": None, "taint": []` to the returned dict.

### Answer
<!-- write below this line -->
