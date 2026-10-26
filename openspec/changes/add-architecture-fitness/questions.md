# Questions — add-architecture-fitness

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
| Q-001 | accepted | 5.1 | technical | test/arch/repo.test.ts:30 networkViolation prepends the name to the full message |
<!-- l4:index:end -->

---

## Q-001: test/arch/repo.test.ts:30 networkViolation prepends the name to the full message

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the answer would unfreeze test/arch/repo.test.ts of task 5.1 (delegate.unfreeze is false)
- **Blocking tasks:** 5.1
- **Kind:** technical
- **Asked:** 2026-10-26T17:20Z by deepseek, run r-20261026T1619Z-8dc6, task 5.1

### Context
networkViolation builds message: `${name} ${NETWORK_MESSAGE}`, so the assertions at lines 60 and 159 expect `node:https node:https is allowed only in observability, identity and gateway; call through src/gateway`. The require scenario at line 124 asserts the same violation's message equals NETWORK_MESSAGE (`node:https is allowed only ...`), and design.md's message table specifies the single message. No checkAll implementation can return both a doubled and a single message for the same require("node:https") violation, so the red test is internally contradictory.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/arch/repo.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-architecture-fitness`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/arch/repo.test.ts`: in `networkViolation`, rename parameter `name` to `_name` and change `message: `${name} ${NETWORK_MESSAGE}`` to `message: NETWORK_MESSAGE`.

### Clarifier suggestion
Edit `test/arch/repo.test.ts`: in `networkViolation`, rename parameter `name` to `_name` and change `message: `${name} ${NETWORK_MESSAGE}`` to `message: NETWORK_MESSAGE`.

### Answer
<!-- write below this line -->
