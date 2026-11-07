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
| Q-001 | answered | none | verdict | Finding F-bb483e74: Replay classification depends on errors being extensible |
<!-- l4:index:end -->

---

## Q-001: Finding F-bb483e74: Replay classification depends on errors being extensible

- **Status:** answered
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
accept The finding is waived. The scenario of C-607153ef holds: a replayed DurableError and a plain Error with a code reject with the same name, message, code and details, the DurableError is instanceof DurableError, fn is not called again and neither is dbos_failed; src/durable/steps.test.ts proves it red then green. A non-extensible error does not reach markStepError in this code base: nothing in src freezes, seals or prevents extensions on an error (the Object.freeze calls are on constants and config), DurableError is a plain subclass, and the interpreter's step callbacks throw fresh InterpreterError objects (block.ts maps invoker and effect failures through mapFailure and builds the input and output errors itself), which toInterpreterError rebuilds by shape after replay. Were one to arrive, the outcome is fail-closed: the replay rejects with DURABLE_UNAVAILABLE dbos_failed, the behaviour before this fix, and fn is still not run again, so no effect repeats and no failure turns into a success. Making the classification independent of extensibility (DBOS given a marked copy rather than the caller's error, which also stops the marker from being added to the error the caller sees) goes on the hardening list. Committed by Claude Code as the owner's delegate.
