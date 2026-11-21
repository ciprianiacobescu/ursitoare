# Proposal: fix 1 for restyle-admin-pages-followup-1

## Why
Requested by CiprianSpot, 2026-11-21T11:33:40Z in FB-001 (tests): The Section layout of criterion C-3802bfd0 (restyle-admin-pages-fix-2, web-tools spec) is checked only by a Node test that reads theme.css (web/src/tools/grants-section-layout.test.ts C-3802bfd0). No browser test measures it, and assert_layout checks only the banner height and sideways scroll, so a heading beside its body passes every e2e test: before fix-2 the headings were 88 to 638 px tall and the Surface body sat 350 px to the right of its heading, with all e2e tests green. Add a browser test that measures the scenario as written: with the Grants page open at 1366 by 860 with its rows and in its error state, and the Roles and teams, Group mappings, Audit log and Tool servers pages open as their tests in e2e/test_m6b_admin.py open them, in each of the regions "New grant", "Create team", "Map a group", "Chain verification", "Filter the audit log" and "Surface" the heading's height is less than twice its font size, and every other direct child of the region starts at the heading's left edge within 1 px and at or below the heading's bottom edge. Locate each region by role region with its exact name; measure direct children with getBoundingClientRect (no table cells). Reuse the m...

The verifier found problems in `restyle-admin-pages-followup-1` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-6267b553 (major): FB-001 not addressed: e2e/test_m6b_section_layout.py adds six tagged region measurements, but it...

## Impact
The code and the tests of `restyle-admin-pages-followup-1`.
