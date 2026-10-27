# Questions — add-audit-chain

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
| Q-001 | answered | 3.1 | technical | src/db/prepare.test.ts:100 expects no partitions after migrating |
<!-- l4:index:end -->

---

## Q-001: src/db/prepare.test.ts:100 expects no partitions after migrating

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The repository confirms the conflict: prepareDatabase returns ensurePartitions' created names, every table commented "partition: month" gets five partitions, and the spec requires that comment on audit_event, so prepare.test.ts line 100 cannot stay []. But the fix is an edit to an existing test of a
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-10-27T14:45Z by claude-sonnet, run r-20261027T1359Z-b357, task 3.1

### Context
The test asserts `first.partitions` is `[]` after `prepareDatabase` on a bare database. Migration 0080_audit.sql creates `audit_event` with the comment `partition: month`, as the spec requires. `ensurePartitions` therefore creates 5 audit_event partitions on the first call, and the test fails. The line-100 assertion cannot hold once any month-partitioned table is migrated. The test needs to expect the audit partitions, or to ignore them.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/db/prepare.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-audit-chain`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/db/prepare.test.ts`: at line 100 expect `first.partitions` to equal the five `ursitoare.audit_event_p202609`, `_p202610`, `_p202611`, `_p202612` and `_p202701` names, and make the `second.partitions` expectation at line 118 add the same audit names if `ensurePartitions` is idempotent for them

### Clarifier suggestion
Edit `src/db/prepare.test.ts`: at line 100 expect `first.partitions` to equal the five `ursitoare.audit_event_p202609`, `_p202610`, `_p202611`, `_p202612` and `_p202701` names, and make the `second.partitions` expectation at line 118 add the same audit names if `ensurePartitions` is idempotent for them

### Answer
<!-- write below this line -->
Edit `src/db/prepare.test.ts` (test C-58e0ebf0), and only that existing test: at line 100 replace `assert.deepEqual(first.partitions, [])` with an expectation of exactly these five names, in this order: `ursitoare.audit_event_p202609`, `ursitoare.audit_event_p202610`, `ursitoare.audit_event_p202611`, `ursitoare.audit_event_p202612`, `ursitoare.audit_event_p202701`. Reason: the test's clock is fixed at 2026-10-15T12:00:00Z, `ensurePartitions` makes 1 month back and 3 ahead for every table commented `partition: month` and sorts `created`, and `0080_audit.sql` must give `audit_event` that comment.

Leave the `second.partitions` expectation (lines 118-124) unchanged: `created` lists only the partitions that call made, the audit partitions already exist after the first call, so the second call creates only the five `pt_month` partitions. Change nothing else in the file and no other existing test (the tests of `ensurePartitions` itself build bare databases without migrations and are unaffected).

Why the M0 test changes: its line-100 assertion encoded "no month-partitioned table is migrated yet", which this unit's required migration ends; the proposal's "no existing test changes" missed it.
