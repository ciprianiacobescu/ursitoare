# Questions — add-architecture-fitness-followup-1-fix-1

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
| Q-001 | open | 1.1 | technical | Clear F-6e5715a0 by restarting the unit branch, or accept it as a harness false positive? |
<!-- l4:index:end -->

---

## Q-001: Clear F-6e5715a0 by restarting the unit branch, or accept it as a harness false positive?

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-10-27T07:25Z by deepseek, run r-20261027T0711Z-360d, task 1.1

### Context
Finding F-6e5715a0 says .serena/memories/harness/ was changed by non-harness commit dced8745e0. That commit is the harness merge 'chore(add-architecture-fitness-followup-1): merge main@17152e67cf into the unit branch' (author l4-bot, L4-Run trailer, L4-Phase: verifying). The verifier's check (l4.verifier.provenance.foreign_memory_commits) accepts only commits with L4-Phase: lessons in base..head that touch .serena/memories/harness/, so this merge is flagged although the file matches the base exactly (git diff f4d77b40e6..HEAD -- .serena is empty). No working-tree change can remove a commit from base..head: editing/deleting the protected path is reverted by the harness and would itself add a non-lessons commit, and pushes are fast-forward only, so the offending merge can only be dropped by restarting the branch from current main (a person's `l4 restart`) or by upgrading the harness so the memory check ignores merge commits. I am not permitted to rewrite history or push.

Harness note: this is a fix task. It cannot unfreeze a test or test-support file (a test, `conftest.py`, a fixture), whatever the answer says: a fix step's change to one is put back. A person must commit the change on the unit branch themselves, then answer this question (`l4 questions answer Q-NNN --unit openspec:add-architecture-fitness-followup-1-fix-1 --text "..."`).

### Options
1. Restart the unit from current main as a person: l4 restart --unit openspec:add-architecture-fitness-followup-1 --reason "drop the merge that trips foreign_memory_commits", then re-run the unit.
2. Upgrade the pinned harness to a release whose protected-path check ignores merge commits (or allows any harness commit touching the memory directory), then re-verify.
3. Confirm the finding is a false positive for this merge and accept it; the fix unit then has nothing to change.

### Answer
<!-- write below this line -->
