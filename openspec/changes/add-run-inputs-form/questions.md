# Questions — add-run-inputs-form

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
| Q-001 | answered | 2.2 | technical | Allow writing web/src/runs/mock-rows-sync.test.ts? |
| Q-002 | accepted | 3.3 | technical | e2e/test_m6b_run_inputs.py line 235-236: names are read before the rows exist |
<!-- l4:index:end -->

---

## Q-001: Allow writing web/src/runs/mock-rows-sync.test.ts?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The question asks for a change to the implementer session's tool permissions (Write/Edit denied) or for a person to create the red test file by hand. The repository confirms web/src/runs/mock-rows-sync.test.ts does not exist yet, but nothing in the repository, specification or steering settles a harness permission problem, and I cannot grant permissions, verify the denial, or create files myself. Only a person or the harness operator can resolve this.
- **Blocking tasks:** 2.2
- **Kind:** technical
- **Asked:** 2026-11-20T20:40Z by claude-sonnet, run r-20261120T1831Z-5dd5, task 2.2

### Context
The Write tool is denied in this session, and Bash is limited to the test gate, so I cannot create the red test file for task 2.2.

### Options
1. Grant Write/Edit permission and re-run the step
2. Create the file by hand

### Answer
<!-- write below this line -->
No permission change is needed: retry the step. The implementer session already allows Write and Edit for every path inside the worktree (L4 passes the rule Edit(./**), which covers Write, with --tools Read,Edit,Write,Glob,Grep,Bash). In this same run the red steps of 1.2, 1.3, 1.4 and 2.1 created the new files input-form-text.test.ts, input-sync.test.ts, run-document.test.ts and mock-rows.test.ts with Write and no denial. The one denied Write in 2.2 red was therefore a path outside the worktree. Create the file with Write at the repo-relative path web/src/runs/mock-rows-sync.test.ts (no absolute path, nothing under /tmp or a home directory, no other checkout), write test-plan.md T6 rows R1 to R8 as the task says, then run pnpm run test web/src/runs/mock-rows-sync.test.ts. No person writes this file: the red test is the task's own work.

---

## Q-002: e2e/test_m6b_run_inputs.py line 235-236: names are read before the rows exist

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-11-20T22:50Z by claude-sonnet, run r-20261120T2052Z-e527, task 3.3

### Context
`all_inner_texts()` does not auto-wait. The heading `open_flow` waits for is visible while the editor is still loading (`FlowEditorPage.tsx`, `loaded === null`), so the Answers buttons are not rendered yet and the list is `[]`. This is what the previous attempt hit.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m6b_run_inputs.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-run-inputs-form`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m6b_run_inputs.py`: before `names = ...`, insert `expect(test_run.get_by_role("button", name="Answers for lookup", exact=True)).to_be_visible()`
2. Edit `e2e/test_m6b_run_inputs.py`: replace the `all_inner_texts()` assertion with `expect(test_run.get_by_role("button", name=re.compile(r"^Answers for "))).to_have_text(["Answers for lookup", "Answers for pay"])`

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m6b_run_inputs::test_answer_rows_write_the_mocks_and_the_fakes[chromium]
E       AssertionError: assert [] == ['Answers for...wers for pay']
E         Right contains 2 more items, first extra item: 'Answers for lookup'
E         Full diff:
E         + []
E         - [
E         -     'Answers for lookup',
e2e/test_m6b_run_inputs.py:236

### Clarifier suggestion
Edit `e2e/test_m6b_run_inputs.py`: before `names = ...`, insert `expect(test_run.get_by_role("button", name="Answers for lookup", exact=True)).to_be_visible()`

### Answer
<!-- write below this line -->
