# Questions — restyle-admin-pages-fix-1

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
| Q-001 | open | 1.1 | ambiguous | Cell height limits in two e2e tests are not reachable with the current table layout |
<!-- l4:index:end -->

---

## Q-001: Cell height limits in two e2e tests are not reachable with the current table layout

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The repository confirms the premise: web/src/kit/data/data.css gives every body cell padding var(--ui-space-2) (0.5rem each side) plus a 1 px border, shell.css sets line-height 1.5 at a 1rem font, so a one-line cell is about 41 px, and theme.css gives .ui-button min-height var(--ui-target-min) = 2.5
- **Blocking tasks:** 1.1
- **Kind:** ambiguous
- **Asked:** 2026-11-19T22:34Z by claude-sonnet, run r-20261119T2206Z-463f, task 1.1

### Context
C-effeb70f asserts the Time cell is at most 24 px tall, but a table cell is about 41 px tall (24 px line + 16 px padding + 1 px border). C-5d8c406e asserts two cells in a row with a 40 px 'Remove' button are at most 30 px tall, which is impossible because a cell is as tall as its row. A fix task cannot edit tests. Should the tests and spec measure the inner text span, or should tables become compact with smaller buttons?

### Options
1. Change the tests and spec to measure the inner text span
2. Make admin tables compact (smaller cell padding and a smaller Remove button)

### Answer
<!-- write below this line -->
