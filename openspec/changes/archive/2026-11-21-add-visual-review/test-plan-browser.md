# Browser journey: every page, per role, checked and photographed

`e2e/test_m6b_ui.py`: three test functions, each `@pytest.mark.milestone("M6b")` with the `page` fixture and `fresh_state`; the alice and carol tests also take `users`. Each test carries `@pytest.mark.l4(...)` with the ids of its own scenarios, at most three (`verifier.max_criteria_per_test`): signed out, its scenario and "Every page leaves a loaded screenshot and no CSP message"; alice, her three; carol, her two. They stay out of `criteria_ids` (AGENTS.md; a red step cannot run `e2e/`). Imports: `from conftest import assert_accessible, assert_layout, login, watch_csp` (`conftest.py`: `login` and `assert_accessible` are merged, `watch_csp` and `assert_layout` are U15c's). Locators are by role and name with `exact=True`; no sleep, no `wait_for_timeout`, no network-idle wait. Every wait is an `expect` on text only the awaited reply renders. The stack is the offline e2e stack; nothing is mocked.

## Constants and helpers (the names the Node test reads as text)

- `WIDE = {"width": 1366, "height": 860}`, `NARROW = {"width": 900, "height": 800}`, `MAX_BANNER_PX = 72`, `MAX_FLOW_PAGE_PX = 3000`.
- `VISUAL_DIR = Path(os.environ.get("E2E_VISUAL_DIR") or <repo root> / ".l4-out" / "visual")`; `<repo root>` is `Path(__file__).resolve().parent.parent`. `.gitignore` line 1 ignores `.l4-out/`, so nothing is committed.
- `DEMO_UI`: the lines of `DEMO_PAY` in `e2e/test_m4_runs.py` (inputs `vendor_name` string and `amount` number, both required; nodes `lookup`, `route` switch, `pay`, `done`, `blocked`) with the line `flow: demo-pay` changed to `flow: demo-ui`. `LOOKUP_OUTPUT = '{"vendor_id":"V-1","status":"active"}'`, `PAY_OUTPUT = '{"payment_id":"P-1","status":"created"}'` (the M4 mocks). `PREVIEWS = [json.loads(LOOKUP_OUTPUT), json.loads(PAY_OUTPUT), {"payment_id": "P-1"}]`.
- `VISUAL_PAGES: dict[str, list[str]]`, the literal of test-plan.md T0. `{run_id}` stands for the id of alice's run.
- `shot_name(role, path, suffix="")` gives `<role>-<slug><suffix>.png`, where `slug` is `re.sub(r"[^a-z0-9]+", "-", path.replace("?server=", "/").lower()).strip("-")`, or `home` when that is empty.
- `png_height(path)` reads the pixel height from bytes 16 to 24 of a PNG file (`struct.unpack(">II", ...)[1]`). `LOADING = re.compile(r"^\s*(Loading|Checking)")`. `see(locator)` returns a function that runs `expect(locator).to_be_visible()`.
- `class Visual`: `Visual(page, role, display_name=None)` calls `watch_csp(page)` once and keeps the live list `csp` and the written files `shots`.
  - `loaded(ready)` waits, with no sleep, for the page's own loaded content: (1) signed in, `expect(banner).to_contain_text("Signed in as <display name>")`; signed out, the banner holds the navigation "Main" (it moves into the banner when `/api/v1/me` answers 401); (2) `ready(page)`, the one element per page of the table below; (3) `expect(main.get_by_text(LOADING).locator("visible=true")).to_have_count(0)`, so no visible text in `main` starts with "Loading" or "Checking".
  - `settle()` waits for `.ui-toasts .ui-toast` to reach count 0 (`timeout=8000`: a success toast expires by itself after 6,000 ms), clicks `Dismiss` (role button, `exact=True`, inside `.ui-toasts`) on what is left (an error toast stays), then `assert_layout(page, MAX_BANNER_PX)` and `assert_accessible(page)`. Dismissing a toast focuses `main` (`ToastRegion.tsx`), which draws a frame in the picture, so expiry is preferred.
  - `shoot(path, suffix)` creates `VISUAL_DIR`, runs `window.scrollTo(0, 0)`, reads `document.documentElement.scrollHeight`, takes `page.screenshot(path=..., full_page=True)`, and asserts the file `is_file()`, `st_size > 0` and `png_height(file) >= scrollHeight - 1`. `check(path, ready, suffix)` is `loaded`, `settle`, `shoot`.
  - `open_visual(page, role, viewport, display_name=None)` calls `page.set_viewport_size(viewport)` and then builds the `Visual`, so both come before the first `goto`.
- Toasts: probed, two success toasts, "Created flow demo-ui." and "Saved version 1.", are on the flow page when "Validate" has finished and none on any other page. Clicking their "Dismiss" focused `main` and drew a 3 px frame round the whole page in `alice-flows-demo-ui.png`; waiting for expiry does not. The container is `position: fixed` at the bottom right and would cover a capture.
- A first run photographed Grants, Group mappings, `?server=acme` and the audit log while they read "Loading Grants", "Loading roles and teams", "Loading Tool servers" and "Checking the audit chain", with the sidebar showing only "Home" because `/me` had not answered. `loaded` closes that.

## The element each page waits for (`ready`)

| path | the element that only the loaded reply renders |
|---|---|
| signed out `/` | the `status` with text `Engine healthy` |
| signed out `/sign-in` | the button "Sign in" |
| signed out `/no-such-page` | the heading "Page not found" |
| alice `/` (empty) | `status` `Engine healthy`; the regions "Recent runs" and "Recent flows" contain "No runs yet" and "No flows yet"; the link "Create your first flow" in "Next steps" |
| alice `/flows` | the text "No flows yet" |
| alice `/flows/demo-ui` | the button "Answers for pay" (the first of the two panels') |
| alice `/flows/demo-ui` (answers) | the textbox "Output 1 for pay" in "Test run" |
| alice run page | the list "Steps" (and the three previews, tooltip and status waited for before) |
| alice `/runs` | the row of the table "Runs" with text `demo-ui` |
| alice `/` (after the run) | `status` `Engine healthy`; "Recent runs" contains `Run <last 8> of demo-ui`; the link `demo-ui` in "Recent flows"; "Next steps" contains "Start a test run" |
| alice `/flows/demo-ui/graph` | the text `Flow graph: 5 nodes, 4 edges, 4 layers.` in the region "Graph" |
| carol `/` | "No runs yet" in "Recent runs"; "Next steps" contains "Review pending tool servers" |
| carol `/admin/users` | the row of the table "Users" with text `Carol Example` |
| carol `/admin/roles-and-teams` | the row `tenant_admin` of "Roles" and the row `finance` of "Teams" |
| carol `/admin/group-mappings` | the row `ursitoare-authors` of "Group mappings" |
| carol `/admin/audit` | the `status` of the region "Chain verification" contains "Audit chain verified"; the row `identity.team_created` of "Audit events" |
| carol `/admin/tool-servers` | the row `acme` of "Tool servers" |
| carol `/admin/tool-servers?server=acme` | the row `lookup_vendor` of "Tools"; the button "Approve surface" |
| carol `/admin/grants` | the text "No grants"; the select "Tool" |
| carol `/admin/policies` | the textbox "Hand-written Cedar" |
| carol narrow `/` | the link "Audit log" in the open navigation |

In the tests below `ready` is the entry of this table for the page; `visual.check(path, ready, suffix)` is written as in the helper list.

## Test 1: `test_signed_out_pages_are_styled`

`visual = open_visual(page, "signed-out", WIDE)` (no display name: nobody signs in); the stack answers `/api/v1/me` with 401.

| step | observable result |
|---|---|
| `goto("/")`; `visual.check("/", ready)` | one `status`, text `Engine healthy`; the `banner` holds the navigation with the single link "Home" and a button "Sign in"; `main` text is `Ursitoare Engine healthy`; layout, axe and screenshot `signed-out-home.png` pass |
| `goto("/sign-in")`; `visual.check("/sign-in", ready)`; the heading "Sign in" is in the card | a centred card with one button "Sign in"; `signed-out-sign-in.png` |
| `goto("/no-such-page")`; `visual.check("/no-such-page", ready)` | a centred card with the link "Go to the landing page"; `signed-out-no-such-page.png` |
| end | `visual.csp == []` and `len(visual.shots) == 3` |

## Test 2: `test_alice_builds_tests_and_reads_a_flow`

`visual = open_visual(page, "alice", WIDE, users["alice"]["displayName"])`; `login(page, users["alice"])`; `nav = page.get_by_role("navigation", name="Main", exact=True)`.

| step | observable result |
|---|---|
| Home before any work: the region "Next steps" holds the link "Create your first flow"; the link "Create a flow" is visible; the region "Recent runs" contains "No runs yet"; `visual.check("/", ready, "-empty")` | `alice-home-empty.png`. "Create a flow" is the empty-state link of "Recent flows"; "Create your first flow" is the step (add-home-dashboard test-plan.md T4 row N1) |
| `nav.get_by_role("link", name="Flows", exact=True).click()`; `expect(get_by_label("Owner team", exact=True)).to_have_value("finance")`; fill "Flow name" with `demo-ui`; `visual.check("/flows", ready)`; click "Create flow"; `expect(page).to_have_title("Flow demo-ui · Ursitoare")` | the owner team is prefilled from alice's one team; `alice-flows.png` |
| fill the textbox "Flow text" with `DEMO_UI`; click "Save version", then "Validate"; the region "Diagnostics" contains "Valid. 0 errors"; the link "Open the graph on its own page" visible in the region "Graph"; the button "Start test run" visible and the group "Inputs" visible, both inside the region "Test run" | the workspace is loaded and validated |
| measure before any answer row opens or any field is filled: `top(graph)`, `top(editor)` for the regions "Graph" and "Edit the flow"; `top(test_run)`, `top(dry_run)`; `document.documentElement.scrollHeight`; `visual.check("/flows/demo-ui", ready)` | tops of "Graph" and "Edit the flow" within 8 px (measured 239 and 239); tops of "Test run" and "Dry run" within 8 px (1,573 and 1,573); height at most 3,000 (measured **2,706**, state: saved and validated, rows closed, fields empty); `alice-flows-demo-ui.png` |
| in the region "Test run": fill "Vendor name (required)" `ACME` and "Amount (required)" `12.5`; click the button "Answers for lookup"; fill "Output 1 for lookup" with `LOOKUP_OUTPUT`; click "Answers for pay"; fill "Output 1 for pay" with `PAY_OUTPUT`; `visual.check("/flows/demo-ui", ready, "-answers")` | `alice-flows-demo-ui-answers.png`; the page is 2,978 px tall in this state (not asserted). The names do not depend on the row order |
| click "Start test run"; `link = test_run.get_by_role("link")` has count 1; its name `aria-label` or text matches `^Open run [A-Za-z0-9_-]+$`; `run_id` is the part after `Open run `; click it | one link in the panel (the m4 pin) |
| run page: `expect(page).to_have_url(re.compile(rf"/runs/{re.escape(run_id)}$"))`; the status named "Run state" has text `State: completed` (timeout 20,000 ms) and `data-tone` `success`; `get_by_text("Started by Alice Example", exact=True)` visible; `p.runs-preview` has the texts matching `^\{.+\}$` three times, and `json.loads` of the three inner texts equals `PREVIEWS` | the previews are the outputs of `lookup`, `pay` and `done`; their key order is the database's (probed: `{"status":"active","vendor_id":"V-1"}`, `{"status":"created","payment_id":"P-1"}`, `{"payment_id":"P-1"}`), so the parsed values are compared |
| `page.locator("time").filter(has_text=re.compile(r"^Started "))` gets `focus()`; `expect(get_by_role("tooltip")).to_have_text(re.compile(r"^\d{4}-\d\d-\d\d \d\d:\d\d UTC$"))`; `visual.loaded(ready)`; `visual.settle()`; press `Escape`; the `tooltip` has count 0; `visual.shoot("/runs/{run_id}")` | the tooltip (focus, add-run-view design decision 3) is open during axe and closed in the picture, so it does not cover the heading; `alice-runs-run-id.png` |
| `nav` link "Runs"; the row of the table "Runs" with text "demo-ui" contains "completed", "Alice Example" and a duration matching `DURATION`; `visual.check("/runs", ready)` | the duration reads `<1 s` on a mock run (add-ui-foundation `formatDuration`); `alice-runs.png` |
| `nav` link "Home"; "Recent runs" contains `Run <last 8 characters of run_id> of demo-ui`; the link `demo-ui` visible in "Recent flows"; "Next steps" contains "Start a test run"; `visual.check("/", ready)` | the run reads "by you"; the flow reads `v1 · validated`; `alice-home.png` |
| `goto("/flows/demo-ui/graph")`; the heading "Graph of demo-ui" visible; `visual.check("/flows/demo-ui/graph", ready)` | `alice-flows-demo-ui-graph.png` |
| end | `visual.csp == []` |

## Test 3: `test_carol_reads_every_admin_page_and_the_narrow_menu`

`visual = open_visual(page, "carol", WIDE, users["carol"]["displayName"])`; `login(page, users["carol"])`.

| step | observable result |
|---|---|
| `nav.get_by_text("Build", exact=True)` and `("Admin", exact=True)` visible; "Next steps" contains "Review pending tool servers" (the seeded `acme` server is pending); `visual.check("/", ready)` | `carol-home.png` |
| for each `(path, heading)` in `/admin/users` "Users", `/admin/roles-and-teams` "Roles and teams", `/admin/group-mappings` "Group mappings", `/admin/audit` "Audit log", `/admin/tool-servers` "Tool servers", `/admin/tool-servers?server=acme` "Tool servers", `/admin/grants` "Grants", `/admin/policies` "Policies": `goto(path)`; `get_by_role("heading", name=heading, level=1, exact=True)` visible; `visual.check(path, ready)` | eight visits, eight screenshots `carol-admin-users.png` to `carol-admin-policies.png` (names in test-plan.md T1) |
| `page.set_viewport_size(NARROW)`; `goto("/")`; the button "Menu" has `aria-expanded` `false`; click it; `nav.get_by_role("link", name="Audit log", exact=True)` visible; `visual.check("/", ready, "-narrow")` | `carol-home-narrow.png`: the navigation opens above the page body |
| end | `visual.csp == []` |

All three tests passed together against the composite scratch build in about 15 s (9 s before `settle()` learned to wait for the toasts to expire); three runs in a row gave the same result and the same 21 image sizes. About 22 page visits carry axe, in line with the 8-minute suite budget.
