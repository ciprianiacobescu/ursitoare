# Questions — add-runs-api

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
| Q-001 | accepted | 2.1 | technical | src/runs/policy.test.ts:89: ERIN userId does not match the run initiator |
<!-- l4:index:end -->

---

## Q-001: src/runs/policy.test.ts:89: ERIN userId does not match the run initiator

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-05T05:43Z by deepseek-free, run r-20261105T0521Z-fb85, task 2.1

### Context
The test builds the run with initiator entityRef("User", "tenant_a/u_erin") at line 51 and expects erin to be allowed read_run via the initiator, but ERIN is principalWith("tenant_a", "erin", ["author"], ["ops"]) at line 89, so userEntity yields tenant_a/erin. Design Decision 10 and the requirement use principal == resource.initiator, which therefore denies (observed 'deny' !== 'allow'). The spec scenario names the initiator u_erin and the principal erin, which cannot both hold under UID equality. Which side should the frozen test correct?

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/runs/policy.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-runs-api`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/runs/policy.test.ts`: change line 89 to `const ERIN = principalWith("tenant_a", "u_erin", ["author"], ["ops"]);` and change line 108 to `u_erin: "allow",`.
2. Edit `src/runs/policy.test.ts`: change line 51 to `initiator: entityRef("User", "tenant_a/erin"),`.

### Clarifier suggestion
Edit `src/runs/policy.test.ts`: change line 89 to `const ERIN = principalWith("tenant_a", "u_erin", ["author"], ["ops"]);` and change line 108 to `u_erin: "allow",`.

### Answer
<!-- write below this line -->
