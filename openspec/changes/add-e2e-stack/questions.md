# Questions — add-e2e-stack

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
| Q-001 | open | 5.2 | technical | test/support/e2e-stack/stack.db.test.ts:340 counts nested Postgres PG_VERSION directories |
<!-- l4:index:end -->

---

## Q-001: test/support/e2e-stack/stack.db.test.ts:340 counts nested Postgres PG_VERSION directories

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: checked spec:spec.md#scenario-close-stops-postgres-a-failed-start-leaves-nothing does not resolve
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-10-26T23:43Z by deepseek, run r-20261026T2221Z-da09, task 5.2

### Context
While the stack runs, dirsWithPgVersion(tmpDir) recurses into the cluster and finds PG_VERSION in the cluster root plus every base/<oid>/ directory (initdb creates base/1, base/4 and base/5; seeding adds more), so a single healthy cluster yields 6 matches and the assertion `clusterDirs.length === 1` can never pass. Criterion C-fe09bf7e only requires that the TMPDIR directory holding the cluster's PG_VERSION be gone after close; database-part.test.ts already identifies that directory by the ursitoare-pg- prefix instead of counting every PG_VERSION. No implementation of startE2eStack can make a real Postgres expose exactly one PG_VERSION directory without corrupting the cluster.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/stack.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-e2e-stack`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/e2e-stack/stack.db.test.ts`: at line 339 replace `const clusterDirs = dirsWithPgVersion(tmpDir);` with `const clusterDirs = dirsWithPgVersion(tmpDir).filter((dir) => path.dirname(dir) === tmpDir);`

### Clarifier suggestion
Edit `test/support/e2e-stack/stack.db.test.ts`: at line 339 replace `const clusterDirs = dirsWithPgVersion(tmpDir);` with `const clusterDirs = dirsWithPgVersion(tmpDir).filter((dir) => path.dirname(dir) === tmpDir);`

### Answer
<!-- write below this line -->
