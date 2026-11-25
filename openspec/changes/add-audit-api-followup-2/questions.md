# Questions — add-audit-api-followup-2

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
| Q-001 | open | 1.1 | technical | src/api/audit-limit-max.test.ts:89 compares decision lists taken at different times |
<!-- l4:index:end -->

---

## Q-001: src/api/audit-limit-max.test.ts:89 compares decision lists taken at different times

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-25T14:24Z by claude-sonnet, run r-20261125T1400Z-3001, task 1.1

### Context
The test calls /api/v1/policy-decisions with limit=200 and then limit=199 and deep-equals the items. Each authorised request appends its own read_audit row to policy_decision on a fixed clock, so the second call sees one more row at the top (decision id …c9) than the first. The audit-event list is unaffected and passes. The criterion says the limit=200 page equals the limit=199 page on the same data, so the test should compare on stable data. For the decision list, fetch limit=199 first and then limit=200, and compare after excluding rows whose decisionId is not in both responses. Or compare a limit=200 call against a limit=199 call after both requests' own rows exist.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/audit-limit-max.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-audit-api-followup-2`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/audit-limit-max.test.ts`: for the decision list, take the limit=199 answer, then the limit=200 answer, and assert that the 200 items equal the 199 items plus the one row recorded by the 199 request itself (the newest decision), or filter both bodies to the same decisionId set before the deepEqual.
2. Edit `src/api/audit-limit-max.test.ts`: seed the decisions before the requests and filter the compared rows by `action` and `principal` so the requests' own read_audit rows are excluded.

### Clarifier suggestion
Edit `src/api/audit-limit-max.test.ts`: for the decision list, take the limit=199 answer, then the limit=200 answer, and assert that the 200 items equal the 199 items plus the one row recorded by the 199 request itself (the newest decision), or filter both bodies to the same decisionId set before the deepEqual.

### Answer
<!-- write below this line -->
