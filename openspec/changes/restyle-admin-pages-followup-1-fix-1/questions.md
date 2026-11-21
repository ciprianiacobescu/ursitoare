# Questions — restyle-admin-pages-followup-1-fix-1

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
| Q-001 | open | 1.1 | technical | Person must add watch_csp to e2e/test_m6b_section_layout.py |
<!-- l4:index:end -->

---

## Q-001: Person must add watch_csp to e2e/test_m6b_section_layout.py

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-21T15:32Z by claude-sonnet, run r-20261121T1349Z-a93b, task 1.1

### Context
F-6267b553: the six region tests do not import or call watch_csp as FB-001 asked. A fix task may not change test files, so a person must commit this on the unit branch.

Harness note: this is a fix task. It cannot unfreeze a test or test-support file (a test, `conftest.py`, a fixture), whatever the answer says: a fix step's change to one is put back. A person must commit the change on the unit branch themselves, then answer this question (`l4 questions answer Q-NNN --unit openspec:restyle-admin-pages-followup-1-fix-1 --text "..."`).

### Harness notes
Harness note: the previous attempt of this task was rejected: green broke existing tests: src.sandbox.deadline.test.ts::C-8bb9cb9b: the watchdog kills a stuck worker and a replacement answers
AssertionError [ERR_ASSERTION]: the watchdog message names the limit and the default grace

### Answer
<!-- write below this line -->
