# Questions — add-dbos-runtime-followup-1

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
| Q-001 | open | none | verdict | Finding F-bb483e74: Replay classification depends on errors being extensible |
<!-- l4:index:end -->

---

## Q-001: Finding F-bb483e74: Replay classification depends on errors being extensible

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-607153ef). It reports behaviour that no scenario pins down.

Title: Replay classification depends on errors being extensible
Detail: markStepError silently ignores Object.defineProperty failures. A non-extensible callback error therefore reaches DBOS without STEP_ERROR_MARK, and the replay catch cannot recognize it as a callback outcome, so it falls through to dbosFailed(). The stated scenarios do not define behavior for non-extensible errors.
Suggested fix: WHEN a step callback throws a non-extensible error THEN a replayed recorded error is treated as DURABLE_UNAVAILABLE dbos_failed
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-607153ef as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
