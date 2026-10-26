# Questions — add-tenancy-foundation

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
| Q-001 | open | none | verdict | Finding F-9d433ef5: A failed tenant reset after a successful COMMIT rejects although the writes were committed |
<!-- l4:index:end -->

---

## Q-001: Finding F-9d433ef5: A failed tenant reset after a successful COMMIT rejects although the writes were committed

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-c58611eb). It reports behaviour that no scenario pins down.

Title: A failed tenant reset after a successful COMMIT rejects although the writes were committed
Detail: In inTransaction, when COMMIT succeeds but the following `set_config('app.tenant_id', '', false)` throws (for example the connection drops between the two statements), `failure` is set to the reset error. withTenantTx then rejects even though fn's writes are durable. A caller that retries on rejection may duplicate the work. No scenario pins down what the helper should report in this case.
Suggested fix: WHEN the session reset after a successful COMMIT fails THEN withTenantTx destroys the connection and rejects with the reset's error even though fn's writes are committed.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-c58611eb as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
