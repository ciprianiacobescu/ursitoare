# Questions — add-hook-checker

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
| Q-001 | accepted | 3.1 | technical | layer.test.ts:32 and :38: rule hook ids differ from the rule id |
<!-- l4:index:end -->

---

## Q-001: layer.test.ts:32 and :38: rule hook ids differ from the rule id

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-11-07T19:02Z by claude-sonnet, run r-20261107T1637Z-49fc, task 3.1

### Context
withGuard() builds rule `pay_guard` with a pre hook of id `guard`, and withGhost() builds rule `ghost` with a pre hook of id `g`. Design Decision 4 and M18 of test-plan.md make a rule hook id other than the rule's an H_SCHEMA error. Scenario "Gating and ordering" expects B to give ok: true with no error and C to give only W_NO_MATCH plus W_LETHAL_TRIFECTA. The fixtures and the design cannot both hold.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/authoring/hooks/layer.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-hook-checker`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/authoring/hooks/layer.test.ts`: in withGuard() give the pre hook id `pay_guard` (or omit its id), and in withGhost() give the pre hook id `ghost` (or omit its id)

### Clarifier suggestion
Edit `src/authoring/hooks/layer.test.ts`: in withGuard() give the pre hook id `pay_guard` (or omit its id), and in withGhost() give the pre hook id `ghost` (or omit its id)

### Answer
<!-- write below this line -->
