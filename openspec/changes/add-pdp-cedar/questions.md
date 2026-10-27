# Questions — add-pdp-cedar

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
| Q-001 | accepted | 4.1 | technical | src/db/prepare.test.ts:100 first.partitions expects only the audit_event window, so adding migration 0110 breaks it |
| Q-002 | open | none | verdict | Finding F-5a5184d6: check rejects when a getter inside principal, resource, an entity or egress throws |
<!-- l4:index:end -->

---

## Q-001: src/db/prepare.test.ts:100 first.partitions expects only the audit_event window, so adding migration 0110 breaks it

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-10-27T23:16Z by deepseek, run r-20261027T2207Z-8356, task 4.1

### Context
Task 4.1 requires adding src/db/migrations/0110_policy_decision.sql verbatim, which creates ursitoare.policy_decision as a RANGE-partitioned monthly table with comment 'partition: month'. prepareDatabase runs migrate then ensurePartitions, and ensurePartitions creates monthly partitions for every such table. With the test clock 2026-10-15, its first run will therefore return the five audit_event partitions plus policy_decision_p202609, p202610, p202611, p202612 and p202701, but the frozen assertion at src/db/prepare.test.ts:100 lists exactly the five audit_event names. The previous green attempt edited this expectation and was rejected because test files are frozen; the red step did not include the necessary update. The exact fix is to extend the expected first-run partition list.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/db/prepare.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-pdp-cedar`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/db/prepare.test.ts`: at the `assert.deepEqual(first.partitions, [...])` starting on line 100, append these five strings after `"ursitoare.audit_event_p202701"`: `"ursitoare.policy_decision_p202609"`, `"ursitoare.policy_decision_p202610"`, `"ursitoare.policy_decision_p202611"`, `"ursitoare.policy_decision_p202612"`, `"ursitoare.policy_decision_p202701"`.
2. Keep src/db/prepare.test.ts frozen and have this unit create no monthly-partitioned policy_decision table (this contradicts task 4.1, the policy-engine spec and the schema tests, so it cannot pass).

### Clarifier suggestion
Edit `src/db/prepare.test.ts`: at the `assert.deepEqual(first.partitions, [...])` starting on line 100, append these five strings after `"ursitoare.audit_event_p202701"`: `"ursitoare.policy_decision_p202609"`, `"ursitoare.policy_decision_p202610"`, `"ursitoare.policy_decision_p202611"`, `"ursitoare.policy_decision_p202612"`, `"ursitoare.policy_decision_p202701"`.

### Answer
<!-- write below this line -->

---

## Q-002: Finding F-5a5184d6: check rejects when a getter inside principal, resource, an entity or egress throws

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-8e384c2c).

Title: check rejects when a getter inside principal, resource, an entity or egress throws
Detail: In guardRequest, only the top-level property reads of req sit inside a try. isUid(principal) reads principal["type"], isEntity reads uid/attrs/parents, and validateEgress reads egress["method"] etc., all outside any try. guardRequest is also called outside runCheck's try. So a request whose principal.type, an entity's attrs, or egress.method getter throws makes check reject with that error. The requirement says check SHALL reject only when IdSource or Clock throws. Separately, runCheck reads req.principal/req.context/req.entities a second time for Cedar, so a getter that returns different values on each read can bypass the guard's checks (for example the principal-in-slice check).
Suggested fix: Wrap guardRequest's whole body in a try that returns PDP_REQUEST_INVALID, and pass the values the guard read (not fresh reads of req) to Cedar and buildPermit.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-8e384c2c as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
