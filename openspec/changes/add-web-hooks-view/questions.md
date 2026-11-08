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
| Q-001 | answered | 5.1 | ambiguous | Block hook entry action contradicts the demo-hooks journey expectation |
<!-- l4:index:end -->

---

## Q-001: Block hook entry action contradicts the demo-hooks journey expectation

- **Status:** answered
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
Option 1: the merged engine is authoritative; keep src/ unchanged (this unit is web-only).

Why: add-block-hooks' blockHookRunner (src/interpreter/hooks/block-runner.ts, entryOf) records every block entry with action "continue", completed and failed under on_error: continue alike, and neither the hooks-block nor the hooks-runtime spec pins a block entry's action. So this unit's design decision 5 ("a block hook's entry has action null (U43)") misdescribes U43. "continue" is also the truthful text: the node went on.

What to do in task 5.1:
- In test/journeys/m5-code-hooks.test.ts only, expect the engine's second entry of pay as `{ ...N, action: "continue", idemKey: <the run's key> }` (G and the other members of N as written; the key still matches ^ik1_[0-9a-f]{64}$) and the hookRows texts of pay `pre:guard · code (fused) · completed · continue` and `post:notify · block · completed · continue`.
- Do not change G, N or the hookRows/parseStepHooks unit tests: an entry with action null stays valid input and gives no action part, as the hookRows requirement says.
- Leave the browser test's substring assertion as it is.

The spec text (design decision 5, the journey's expected hookRows text, test-plan § Journey expectations) is corrected on main after this unit merges.
