## Purpose

The web app is styled by one Tailwind CSS v4 stylesheet entry with cascade layers, colours that come only from checked tokens, a few shared components, and source rules that keep later units inside the engine's CSP and token palette.

## ADDED Requirements

### Requirement: The journey lists every page of every role
`e2e/test_m6b_ui.py` SHALL hold the literal `VISUAL_PAGES: dict[str, list[str]]` with the roles `signed-out`, `alice` and `carol` in that order. The union of its lists SHALL hold `/`, the `path` of every entry of `ADMIN_PAGES`, `TOOL_PAGES`, `FLOW_PAGES` and `RUN_PAGES` whose `navLabel` is not `null`, and `/flows/demo-ui`, `/flows/demo-ui/graph` and `/admin/tool-servers?server=acme`. The file SHALL hold the checks `watch_csp(`, `assert_layout(` and `assert_accessible(`, the viewports 1366 by 860 and 900 by 800, `MAX_BANNER_PX = 72`, `MAX_FLOW_PAGE_PX = 3000`, `E2E_VISUAL_DIR` with the default `.l4-out`, full-page screenshots taken only after the page has loaded and asserted as tall as the page, exactly three `milestone("M6b")` marks, no sleep, no network-idle wait and no skipped test.

#### Scenario: The journey lists every page of every role and keeps its checks
- **WHEN** `web/src/visual-pages.test.ts` reads `e2e/test_m6b_ui.py` and the four page tables, and runs the rows J0 to J3 of test-plan.md T3
- **THEN** J0 gives `[]` problems for the real file, the signed-out list `["/", "/sign-in", "/no-such-page"]` and 13 required paths; J1 (`"/admin/grants"` renamed) gives exactly `["no page for /admin/grants"]`; J2 (`watch_csp(` renamed) gives exactly `["missing watch_csp("]`; J3 (empty text) gives exactly `["VISUAL_PAGES is missing"]`

### Requirement: Every page is photographed only when loaded, with a clean check
For each visit of the journey, `Visual.check(path, ready, suffix)` SHALL first wait, with no sleep, until the banner holds "Signed in as <display name>" (signed out: the navigation "Main" is in the banner), the page's own `ready` element of test-plan-browser.md is visible, and no visible text in `main` starts with "Loading" or "Checking". It SHALL then wait for `.ui-toasts .ui-toast` to reach count 0 (a success toast expires after 6,000 ms) and dismiss only a toast still there, run `assert_layout(page, 72)` and `assert_accessible(page)`, scroll to the top and write `<VISUAL_DIR>/<role>-<slug><suffix>.png` with `full_page=True`, asserting that the file exists, is not empty and is at least `document.documentElement.scrollHeight - 1` pixels tall. `slug` SHALL be the path lower-cased with `?server=` read as `/` and each run of characters outside `[a-z0-9]` as one `-`, trimmed of `-`, or `home` when empty. After the last page of each test the CSP list from `watch_csp(page)` SHALL equal `[]`.

#### Scenario: Every page leaves a loaded screenshot and no CSP message
- **WHEN** the three tests of test-plan-browser.md run against the offline stack with `E2E_VISUAL_DIR` unset
- **THEN** `.l4-out/visual/` holds the 21 files of test-plan.md T1 (3 signed-out, 8 alice, 10 carol), each at least as tall as its page (measured 860 px for the pages that fit the window; 2,706 for `alice-flows-demo-ui.png`, 2,978 for `alice-flows-demo-ui-answers.png`, 1,415 for the graph page, 1,016 for Group mappings, 4,117 for the audit log, 1,417 for `carol-home-narrow.png` at 900 wide); no file shows "Loading" or "Checking" text or a sidebar without the account banner; no toast is in any picture; each test ends with `visual.csp == []`

### Requirement: Signed-out pages are styled in the shell
Signed out at 1366 by 860, `/` SHALL show the status `Engine healthy` and the navigation inside the banner, `/sign-in` the heading "Sign in" in a centred card with one button "Sign in", and `/no-such-page` the heading "Page not found" with the link "Go to the landing page". Each page SHALL pass the checks of `Visual.check`.

#### Scenario: Signed-out pages are checked and photographed
- **WHEN** `test_signed_out_pages_are_styled` opens `/`, `/sign-in` and `/no-such-page`
- **THEN** the first has one `status` with text `Engine healthy`, the second the heading "Sign in", the third the heading "Page not found"; each passes `assert_layout(page, 72)` and axe, and `signed-out-home.png`, `signed-out-sign-in.png` and `signed-out-no-such-page.png` exist

### Requirement: The flow workspace is beside, complete and at most 3,000 px tall
After alice has saved and validated `demo-ui` at 1366 by 860, with every answer row closed and every field empty, the region "Graph" SHALL start within 8 px of the top of the region "Edit the flow", "Test run" and "Dry run" SHALL start within 8 px of each other, and `document.documentElement.scrollHeight` SHALL be at most 3,000.

#### Scenario: The workspace of demo-ui is two columns and at most 3,000 px tall
- **WHEN** alice (team `finance`) opens "Flows", sees "Owner team" prefilled, creates `demo-ui`, saves and validates the text of test-plan-browser.md, and the page is measured before any row opens
- **THEN** "Owner team" has value `finance`; the title is `Flow demo-ui · Ursitoare`; "Diagnostics" contains `Valid. 0 errors`; the tops of "Graph" and "Edit the flow" differ by at most 8 (measured 239 and 239); the tops of "Test run" and "Dry run" differ by at most 8 (measured 1,573 and 1,573); the height is at most 3,000 (measured 2,706); `alice-flows-demo-ui.png` exists

### Requirement: A test run from the form reaches a readable run page
From the Test run panel, alice SHALL start a run from the fields "Vendor name (required)" `ACME` and "Amount (required)" `12.5` and the first answers of the rows "Answers for lookup" and "Answers for pay", and the run page SHALL show the state as `State: completed` with `data-tone` `success`, "Started by Alice Example", one preview per step that has an output, and the exact start time as a tooltip on the `time` element that opens on focus.

#### Scenario: Alice starts a test run from the form and reads the run
- **WHEN** alice fills the two fields, opens both answer rows, fills `{"vendor_id":"V-1","status":"active"}` for `lookup` and `{"payment_id":"P-1","status":"created"}` for `pay`, clicks "Start test run", opens the one link of the panel and focuses the `time` that starts with "Started "
- **THEN** the panel holds one link named `Open run <id>`; the status "Run state" reads `State: completed` with `data-tone` `success` (within 20,000 ms); "Started by Alice Example" is visible; three `p.runs-preview` parse to `{"vendor_id":"V-1","status":"active"}`, `{"payment_id":"P-1","status":"created"}` and `{"payment_id":"P-1"}`; the tooltip text matches `YYYY-MM-DD HH:MM UTC`; axe passes with it open; `alice-flows-demo-ui-answers.png` and `alice-runs-run-id.png` exist

### Requirement: The lists and the home page show the finished run
After the run, the table "Runs" SHALL have a row with `demo-ui`, `completed`, `Alice Example` and a duration, and `/` SHALL list the run under "Recent runs" as `Run <last 8 characters of the id> of demo-ui`, the flow under "Recent flows", and the step "Start a test run" under "Next steps".

#### Scenario: Runs, home and the graph page show alice's work
- **WHEN** alice opens "Runs", then "Home", then `/flows/demo-ui/graph`
- **THEN** the row of `demo-ui` contains `completed`, `Alice Example` and the duration `<1 s`; "Recent runs" contains `Run <last 8> of demo-ui`; the link `demo-ui` is under "Recent flows"; "Next steps" contains "Start a test run"; the heading is "Graph of demo-ui"; `alice-runs.png`, `alice-home.png` and `alice-flows-demo-ui-graph.png` exist

### Requirement: Carol reaches the seven admin pages and the tool server page
For carol, the navigation SHALL show the labels "Build" and "Admin"; `/` SHALL show the step "Review pending tool servers"; and each of `/admin/users`, `/admin/roles-and-teams`, `/admin/group-mappings`, `/admin/audit`, `/admin/tool-servers`, `/admin/tool-servers?server=acme`, `/admin/grants` and `/admin/policies` SHALL show its `h1` and pass the checks of `Visual.check`.

#### Scenario: Carol's pages are checked and photographed
- **WHEN** carol signs in and opens `/` and the eight admin visits at 1366 by 860
- **THEN** "Build" and "Admin" are visible in the navigation; "Next steps" contains "Review pending tool servers"; the `h1` of the eight admin visits are "Users", "Roles and teams", "Group mappings", "Audit log", "Tool servers", "Tool servers", "Grants" and "Policies"; every page passes layout and axe; `carol-home.png` and the eight `carol-admin-*.png` files exist

### Requirement: Below 1024 px the menu opens above the page
At 900 by 800, for carol on `/`, the button "Menu" SHALL have `aria-expanded` `false`, and after a click the link "Audit log" in the navigation SHALL be visible, with layout and axe passing.

#### Scenario: The narrow menu reveals the navigation
- **WHEN** carol, after her admin pages, sets the window to 900 by 800, opens `/`, and clicks "Menu"
- **THEN** `aria-expanded` is `false` before the click, the link "Audit log" is visible after it, `assert_layout(page, 72)` and axe pass, the CSP list is `[]`, and `carol-home-narrow.png` exists
