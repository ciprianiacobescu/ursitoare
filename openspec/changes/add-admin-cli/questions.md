# Questions — add-admin-cli

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
| Q-001 | open | 7.4 | technical | src/cli/admin/list-users.test.ts:160 |
<!-- l4:index:end -->

---

## Q-001: src/cli/admin/list-users.test.ts:160

- **Status:** open
- **Blocking tasks:** 7.4
- **Kind:** technical
- **Asked:** 2026-10-31T14:14Z by deepseek-free, run r-20261031T1409Z-233f, task 7.4

### Context
The helper bobLine (line 160) expects the line to end in "Bob", but the fixture at line 82 creates bob with `name: "Bob B"` and the JSON scenario at line 270 expects `displayName: "Bob B"`. The requirement says to print the user's display name, so the text expectation is inconsistent with the fixture and with the same file's JSON expectation; the failing assertions are at lines 176 and 213.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/cli/admin/list-users.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-admin-cli`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/cli/admin/list-users.test.ts`: change line 160 to `const bobLine = (bob: User): string => `${bob.userId}\thuman\tactive\t\t\tBob B`;`
2. Edit `src/cli/admin/list-users.test.ts`: change line 82 to `{ issuer: ISS, subject: "bob-sub", name: "Bob" }` and line 270 to `displayName: "Bob"`

### Clarifier suggestion
Edit `src/cli/admin/list-users.test.ts`: change line 160 to `const bobLine = (bob: User): string => `${bob.userId}\thuman\tactive\t\t\tBob B`;`

### Answer
<!-- write below this line -->
