# Questions — add-identity-model

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
| Q-001 | accepted | 6.1 | technical | src/identity/users.test.ts:50 gives mallory the same userId as alice |
<!-- l4:index:end -->

---

## Q-001: src/identity/users.test.ts:50 gives mallory the same userId as alice

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 6.1
- **Kind:** technical
- **Asked:** 2026-10-27T21:15Z by claude-sonnet, run r-20261027T2033Z-992f, task 6.1

### Context
`signIn` defaults `ids` to a fresh `sequentialIds()` per call, so alice (tenant a) and mallory (tenant b) both get `usr_00000000-0000-7000-8000-000000000000`. `getUser(tx, a, mallory.userId)` at line 61 therefore finds alice's row and returns it, while the test expects null. The spec scenario "Get" expects mallory's id to be invisible in a, which needs a distinct id.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/identity/users.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-identity-model`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/identity/users.test.ts`: on line 50 change `signIn(db, b, "sub-mallory")` to `signIn(db, b, "sub-mallory", sequentialIds(7))` so mallory's id differs from alice's

### Clarifier suggestion
Edit `src/identity/users.test.ts`: on line 50 change `signIn(db, b, "sub-mallory")` to `signIn(db, b, "sub-mallory", sequentialIds(7))` so mallory's id differs from alice's

### Answer
<!-- write below this line -->
