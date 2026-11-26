# Questions — add-web-shell-followup-1-fix-1

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
| Q-001 | open | 1.1 | technical | Rewrite the unit branch to drop base-merge commit 2440ee533f (or approve a restart) |
<!-- l4:index:end -->

---

## Q-001: Rewrite the unit branch to drop base-merge commit 2440ee533f (or approve a restart)

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-26T00:21Z by deepseek-free, run r-20261126T0000Z-f547, task 1.1

### Context
The protected-path blocker F-6e5715a0 names commit 2440ee533f, a harness base merge from round 1 that carried .serena/memories/harness/lessons.md from main@14ff110. The file at HEAD is identical to the current verification base (main@6ef3fbd), so no working-tree edit can clear the finding: the check rejects any non-`L4-Phase: lessons` commit in base..head that touches .serena/memories/harness/, and .serena/memories/harness/** is a protected path an implementer step may not change or commit. Only history can clear it. The clean option is for a person to rewrite the unit branch so 2440ee533f is no longer an ancestor of HEAD (for example a rebase/rebase-merges that drops just that merge, keeping the unit's other commits, then force-push); the alternative is an owner-approved `l4 restart`, which rebuilds the unit folder from the base and therefore loses the unit's src/web changes (they remain on refs/l4/attempts). Please choose one so the parent can re-verify.

Harness note: this is a fix task. It cannot unfreeze a test or test-support file (a test, `conftest.py`, a fixture), whatever the answer says: a fix step's change to one is put back. A person must commit the change on the unit branch themselves, then answer this question (`l4 questions answer Q-NNN --unit openspec:add-web-shell-followup-1-fix-1 --text "..."`).

### Options
1. Rewrite the unit branch to drop commit 2440ee533f and force-push it (keeps the unit's code).
2. Approve an `l4 restart` of the unit that drops the base merge (loses the unit's code changes, which stay on the attempts ref).
3. Advance main so it contains commit 2440ee533f (for example by merging the unit branch), then re-run verification.

### Answer
<!-- write below this line -->
