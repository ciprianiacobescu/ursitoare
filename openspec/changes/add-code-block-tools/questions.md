# Questions — add-code-block-tools

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
| Q-001 | accepted | 2.1 | technical | src/tools/code/register.db.test.ts:140 asserts r4 deepEquals r3 after approval |
<!-- l4:index:end -->

---

## Q-001: src/tools/code/register.db.test.ts:140 asserts r4 deepEquals r3 after approval

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-23T23:29Z by beam, run r-20261123T2308Z-9bd2, task 2.1

### Context
After approved2 approves D_WC2, the server is approved (approvedDigest D_WC2, no pending surface). Resubmitting WC2 (digest D_WC2) matches approvedDigest, so submitLockedTx returns the approved record; it cannot equal the earlier drifted r3 (state drifted, approvedDigest D_WC, pending D_WC2). The R4 block therefore tests idempotent resubmission of a still-pending surface and belongs before approved2.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/tools/code/register.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-code-block-tools`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/tools/code/register.db.test.ts: move the block from `// R4 again no new event` through `assert.deepEqual(r4, r3);` (lines 132-140) to immediately before `const approved2 = await approveSurface(...)` (line 131), so the idempotent resubmission is checked while D_WC2 is still pending.
2. Edit src/tools/code/register.db.test.ts:140: replace `assert.deepEqual(r4, r3);` with `assert.equal((r4 as { state: string }).state, "approved");`.

### Clarifier suggestion
Edit `src/tools/code/register.db.test.ts`: move the block from `// R4 again no new event` through `assert.deepEqual(r4, r3);` (lines 132-140) to immediately before `const approved2 = await approveSurface(...)` (line 131), so the idempotent resubmission is checked while D_WC2 is still pending.

### Answer
<!-- write below this line -->
