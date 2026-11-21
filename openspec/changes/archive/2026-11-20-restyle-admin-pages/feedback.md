# Feedback — restyle-admin-pages

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | taken | tests |  | A browser test for the Section layout of the six admin regions (C-3802bfd0) |
<!-- l4:feedback-index:end -->

---

## FB-001: A browser test for the Section layout of the six admin regions (C-3802bfd0)

- **Status:** taken
- **Kind:** tests
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-21T11:33:40Z

### Feedback
The Section layout of criterion C-3802bfd0 (restyle-admin-pages-fix-2, web-tools spec) is checked only by a Node test that reads theme.css (web/src/tools/grants-section-layout.test.ts C-3802bfd0). No browser test measures it, and assert_layout checks only the banner height and sideways scroll, so a heading beside its body passes every e2e test: before fix-2 the headings were 88 to 638 px tall and the Surface body sat 350 px to the right of its heading, with all e2e tests green. Add a browser test that measures the scenario as written: with the Grants page open at 1366 by 860 with its rows and in its error state, and the Roles and teams, Group mappings, Audit log and Tool servers pages open as their tests in e2e/test_m6b_admin.py open them, in each of the regions "New grant", "Create team", "Map a group", "Chain verification", "Filter the audit log" and "Surface" the heading's height is less than twice its font size, and every other direct child of the region starts at the heading's left edge within 1 px and at or below the heading's bottom edge. Locate each region by role region with its exact name; measure direct children with getBoundingClientRect (no table cells). Reuse the mocks of e2e/test_m6b_admin.py; call watch_csp before the first goto and assert it empty at the end. Checked by hand on 2026-11-20: this check passes 6 of 6 at 13f109d9 and fails 6 of 6 at 80f78a59. Production code stays as it is.

### Outcome
<!-- written by the harness -->
Taken in round 1 into restyle-admin-pages-followup-1-fix-1
