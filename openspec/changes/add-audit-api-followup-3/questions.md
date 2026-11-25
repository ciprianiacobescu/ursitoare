# Questions — add-audit-api-followup-3

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
| Q-001 | open | 1.1 | technical | src/audit/query.test.ts:114 and src/pdp/decisions-query.test.ts (bad_limit 201 case) contradict the new FB-003 tests |
<!-- l4:index:end -->

---

## Q-001: src/audit/query.test.ts:114 and src/pdp/decisions-query.test.ts (bad_limit 201 case) contradict the new FB-003 tests

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-25T19:49Z by claude-sonnet, run r-20261125T1925Z-2e55, task 1.1

### Context
src/audit/query.test.ts:114 asserts listAuditEvents with limit 201 rejects with bad_limit. The decisions-query test (the 'refuses bad options' test, C-061beb81) asserts the same for listPolicyDecisions. The new tests in src/api/audit-limit-next-page.test.ts (C-893f2503) assert that both stores accept limit 201, as FB-003 requires. Both cannot hold. The frozen assertions have to move the refused boundary from 201 to 202.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/audit-limit-next-page.test.ts`, `src/audit/query.test.ts`, `src/pdp/decisions-query.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-audit-api-followup-3`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/audit/query.test.ts`: change the `limit: 201` bad_limit case on line 114 to `limit: 202`. Edit `src/pdp/decisions-query.test.ts`: change the `limit: 201` bad_limit case in the 'refuses bad options' test to `limit: 202`.

### Clarifier suggestion
Edit `src/audit/query.test.ts`: change the `limit: 201` bad_limit case on line 114 to `limit: 202`. Edit `src/pdp/decisions-query.test.ts`: change the `limit: 201` bad_limit case in the 'refuses bad options' test to `limit: 202`.

### Answer
<!-- write below this line -->
