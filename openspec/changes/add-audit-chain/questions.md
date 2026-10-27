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
| Q-002 | answered | none | verdict | Finding F-0447fea8: task 5.2: a head below the walked tip is reported as a hash failure instead of passing |
| Q-003 | open | none | verdict | Finding F-934c3d86: task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporting hash |
| Q-004 | open | none | verdict | Finding F-1abb4766: task 5.1 is ticked as already satisfied, but its text is not done |
| Q-005 | open | none | verdict | Finding F-2a235267: task 5.2 is ticked as already satisfied, but its text is not done |
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

---

## Q-002: Finding F-0447fea8: task 5.2: a head below the walked tip is reported as a hash failure instead of passing

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-707dcf8b).

Title: task 5.2: a head below the walked tip is reported as a hash failure instead of passing
Detail: Task 5.2 says a head whose seq is below the walked tip (tipSeq = expected - 1n) passes. In verify.ts, when headSeq < expected the code goes on to `if (lastHash === null || !lastHash.equals(head.hash)) return { ..., firstBadSeq: headSeq, reason: "hash" }`. lastHash is the tip's hash, not the head's, so a head below the tip always fails. The head is read in a separate statement before the walk. Unless withTenantTx uses a snapshot isolation level, an append committed between the head read and the walk makes an intact chain report a `hash` failure. That contradicts design.md: 'appends during a verification are not tail loss'.
Suggested fix: Compare head.hash only when headSeq === expected - 1n, and let headSeq < expected - 1n pass.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-707dcf8b as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The finding is correct. Task 5.2 says a head whose seq is below the walked tip passes, and design.md says the head is read before the walk so that appends during a verification are not tail loss. In verify.ts the head check only guards headSeq >= fromSeq and headSeq >= expected; for any head seq between fromSeq and tipSeq - 1 it then compares the tip's hash (lastHash) with the head's hash, which differ for an intact chain, and returns reason hash at the head's seq. withTenantTx opens the transaction with a plain BEGIN, so under read committed an append committed between the head read and the walk makes an intact chain fail. The fix belongs in production code: compare the head hash only when the head seq equals the tip, and let a head below the tip pass. WHEN verifyChain walks an intact chain whose head row holds a seq at or above fromSeq but below the last walked seq THEN it returns ok true with checked equal to the number of walked events, and a head seq equal to the tip with a different hash still returns reason hash at the tip's seq.
---

## Q-003: Finding F-934c3d86: task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporting hash

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-d5bb5978).

Title: task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporting hash
Detail: Task 5.1 says chainHash not matching the stored hash, or canonicalEvent throwing, gives `hash`. verify.ts calls chainHash without a try/catch. An owner edit that canonicalEvent cannot hash makes verifyChain reject with an AuditError instead of returning {ok:false, reason:'hash'}. Two examples: `at` in year 10000, where to_char gives a five-digit year and the six-digit-fraction regex fails; and a payload number beyond the double range, where node-pg parses it as Infinity.
Suggested fix: Wrap the chainHash call in try/catch and return { ok: false, checked, firstBadSeq: seq, reason: "hash" } when it throws.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-d5bb5978 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-004: Finding F-1abb4766: task 5.1 is ticked as already satisfied, but its text is not done

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it.

Title: task 5.1 is ticked as already satisfied, but its text is not done
Detail: src/audit/verify.ts implements the walk, gap and hash checks and option validation. However, the task text says canonicalEvent throwing gives `hash`, and the chainHash call is not caught, so it throws instead. property.test.ts is not in this part.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
This finding cites no criterion: end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals, or no fix can be made from the reject.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-005: Finding F-2a235267: task 5.2 is ticked as already satisfied, but its text is not done

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it.

Title: task 5.2 is ticked as already satisfied, but its text is not done
Detail: src/audit/verify.ts head check: the task says a head seq below tipSeq passes, but the code reports `hash` at headSeq whenever lastHash differs from head.hash, which is always the case when the head is below the tip.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
This finding cites no criterion: end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals, or no fix can be made from the reject.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
