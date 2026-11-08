# Questions — add-web-hooks-view

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
| Q-001 | open | 5.1 | ambiguous | Block hook entry action contradicts the demo-hooks journey expectation |
<!-- l4:index:end -->

---

## Q-001: Block hook entry action contradicts the demo-hooks journey expectation

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: the reason has 1028 characters: the limit is 1000
- **Blocking tasks:** 5.1
- **Kind:** ambiguous
- **Asked:** 2026-11-08T11:36Z by deepseek-free, run r-20261108T1014Z-5062, task 5.1

### Context
C-1f095289 expects hookRows(pay) to give the texts ["pre:guard · code (fused) · completed · continue", "post:notify · block · completed"]. The merged add-block-hooks code (src/interpreter/hooks/block-runner.ts, entryOf) records every block entry with action "continue", and the add-block-hooks ledger notes say entry.action was deliberately not asserted because its spec wording is ambiguous. Running the real stack therefore yields "post:notify · block · completed · continue". This unit's design decision 5 and test-plan fixture N assume the block entry action is null. The journey cannot be both faithful to the scenario and green on arrival; the browser assertion is a substring so it would pass either way.

### Options
1. Treat the engine as authoritative: the Node journey (and test-plan fixture N) expect "post:notify · block · completed · continue"; keep src/ unchanged.
2. Treat the scenario as authoritative: change src/interpreter/hooks/block-runner.ts so a block entry records action null (outside this unit's declared web-only scope), making hookRows give "post:notify · block · completed".
3. Change web/src/runs/hook-rows.ts to omit the action for block-kind entries (deviates from the hookRows requirement, which appends the action whenever it is not null).

### Answer
<!-- write below this line -->
