Everything the journey drives or reads, in two parts: merged code (main@3daa5c35, checked line by line) and the texts, names and numbers the nine M6b folders deliver.

## Merged code

```python
# e2e/conftest.py:24, :50, :71, :90, :114-115, :118
def base_url() -> str        # fixture; E2E_BASE_URL or http://127.0.0.1:39080
def fresh_state() -> None    # fixture; POST /reset on the control URL (default :39081)
def users(e2e_profile) -> dict[str, dict[str, str]]   # fixture; alice, bob, carol, mallory: username, password, displayName, tenantName
def login(page, user, path="/sign-in") -> None        # ends with expect(banner).to_contain_text(user["displayName"])
AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]; AXE_BLOCKING_IMPACTS = ("serious", "critical")
def assert_accessible(page) -> None                   # axe-core from node_modules; fails on serious or critical only
```

```ts
// web/src/admin/pages.ts:13, web/src/tools/pages.ts:5, web/src/flows/pages.ts:11, web/src/runs/pages.ts:11
const ADMIN_PAGES  // paths /admin/users "Users", /admin/roles-and-teams "Roles and teams", /admin/group-mappings "Group mappings", /admin/audit "Audit log"
const TOOL_PAGES   // /admin/tool-servers "Tool servers", /admin/grants "Grants", /admin/policies "Policies"
const FLOW_PAGES   // id "flows" path /flows navLabel "Flows"; id "flow-editor" path /flows/:flowId navLabel null
const RUN_PAGES    // id "runs" path /runs navLabel "Runs"; id "run" path /runs/:runId navLabel null
// web/src/features/10-home.tsx:69-71  { id: "home", path: "/", navLabel: "Home" }   web/src/features/15-sign-in.tsx:8-9  { id: "sign-in", path: "/sign-in" } (no navLabel)
```

| file:line | fact the journey relies on |
|---|---|
| `e2e/test_m4_runs.py:13-38`, `:39-42`, `:46` | `DEMO_PAY` (inputs `vendor_name` string and `amount` number, both required; nodes `lookup`, `route`, `pay`, `done`, `blocked`), the M4 mocks `lookup` `{"vendor_id": "V-1", "status": "active"}` and `pay` `{"payment_id": "P-1", "status": "created"}`, the link name pattern `^Open run [A-Za-z0-9_-]+$`; each run panel holds exactly one link after a start |
| `e2e/pyproject.toml:21-26` | `--strict-markers`; the markers `l4`, `stack` and `milestone` exist, so `@pytest.mark.milestone("M6b")` is valid |
| `.gitignore:1`, `.l4/config.yaml:27` | `.l4-out/` is ignored; the e2e gate runs `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml ...` from the repository root |
| `docs/testing.md:42-44` | alice is an author in team `finance`; carol is the tenant admin; `fresh_state` resets the stack |
| `e2e/test_m6_grants.py:79-83` | on a fresh stack carol sees the seeded server row `acme · https://tools.fake.test · pending` |
| `web/src/kit/ToastRegion.tsx:35`, `web/src/kit/theme.css:121-129`, `web/src/kit/toast.ts:29,45` | the toast container is `div.ui-toasts[aria-live=polite]` holding `div.ui-toast` with a button "Dismiss"; it is `position: fixed` at the bottom right; a success toast lives 6,000 ms and an error toast stays; `onClick` of "Dismiss" focuses `#main` (`ToastRegion.tsx:22-30`). `LoadingState` is `div[role=status]` with the label "Loading ..." (`LoadingState.tsx:9`); the audit page's "Checking the audit chain" (`web/src/admin/audit.ts:189`) |
| `web/src/admin/UsersPage.tsx:56`, `TeamsPage.tsx:79`, `MappingsPage.tsx:134`, `web/src/auth/AccountMenu.tsx:26` | the only toast callers; the journey triggers none of them |

## Delivered by the in-plan folders (each cell: folder, file)

| Name, text or value the journey uses | Source |
|---|---|
| `watch_csp(page) -> list[str]` (before the first `goto`; the live list) and `assert_layout(page, max_banner_px=72)`; both in `e2e/conftest.py`, appended by U15c | `add-ui-foundation`, specs/web-design-system "Two browser helpers watch the CSP and measure the layout"; Interfaces given. No other unit creates them |
| `formatDuration` reads `<1 s` for a span under a second; `formatInstant` reads `YYYY-MM-DD HH:mm UTC`; `formatAgo` reads `just now`, `5 min ago` | `add-ui-foundation`, design.md Interfaces; `add-run-view`, design.md decision 3 |
| Navigation: one `navigation` named "Main"; groups "Build" (Flows, Runs) and "Admin" (7 links); button "Menu" below 1024 px with `aria-expanded` and `aria-controls` `main-nav`; signed out, the one flat list sits in the banner; banner 56 px | `add-app-shell`, specs/web-shell "Carol's navigation is grouped...", "Alice and a signed-out visitor...", "The menu folds below 1024 px"; test-plan-browser.md |
| Sign-in: heading "Sign in", one button "Sign in" (334 px wide); not found: heading "Page not found", link "Go to the landing page" `href` `/`; both centred cards, `main` at x 0 signed out | `add-app-shell`, "Sign-in and not-found render as centred cards" |
| Home: signed out `main` text `Ursitoare Engine healthy`, one `status`; signed in, regions "Recent runs", "Recent flows", "Next steps" | `add-home-dashboard`, specs/web-shell "The signed-out home is unchanged", "Alice sees her runs, flows and next step" |
| Next steps: "Create your first flow" (`/flows`) when an author has no flow; "Start a test run" (`/flows/<id>`) for a flow whose latest version validated; "Review pending tool servers" (`/admin/tool-servers`, badge `1`) for carol; the author signal is `test_flow` because `author_flow` is granted to nobody | `add-home-dashboard`, specs/web-shell "Next steps follow the role and the state the API shows"; test-plan.md T4 rows N1, N2, N10; design.md decision 2 |
| Empty states of the home lists: "No runs yet" with a link "Choose a flow to test" (author) or "Browse flows"; "No flows yet" with the link "Create a flow" (author) or "Go to flows" | `add-home-dashboard`, design.md decision 6; test-plan-browser.md tests 2 and 3 |
| Run row on home: `Run <last 8 characters of the id> of <flowId>`, then `<ago> · <duration> · by you` | `add-home-dashboard`, specs/web-shell "Recent runs show at most five runs..." (`recentRunLinkName`) |
| Flows page: "Owner team" is a text input with a datalist, prefilled from `/me/teams` when exactly one team; header "Flows"; section "Create flow" | `add-flow-workspace`, specs/web-flow-editor "The Flows page offers the person's teams as owner-team suggestions"; test-plan-browser.md test 4 |
| Workspace: regions "Edit the flow" (`#flow-editor`), "Diagnostics", "Graph" (`#flow-panel-graph`), "Test run", "Dry run"; "Graph" top within 8 px of "Edit the flow" (239 and 239 measured), "Test run" and "Dry run" within 8 px (1,393 in its folder) | `add-flow-workspace`, "The workspace is two columns, short and fully visible at 1366 by 860". Its own bound is 2,600 px (2,275 measured, before the run panels grew) |
| Test run panel at 1366 by 860: 531 px wide; group "Inputs" with "Vendor name (required)" above "Amount (required)" (stacked, 241 px); rows "Answers for lookup" then "Answers for pay" (flow order), each trigger a button with `aria-expanded`; first output "Output 1 for <nodeId>"; Test run 922 px and Dry run 1,076 px closed (1,348 open and filled); page 2,706 px closed and 2,978 px open and filled | `add-run-inputs-form`, proposal.md Observable result; design.md decisions 3 and 8 (Measured); specs/web-runs; test-plan-browser.md |
| Run page: `h1` `Run <id>`; status "Run state" `State: <state>` with `data-tone`; meta line "Flow <link>", "Mode <mode>", "Started by <name>", `<time tabIndex=0>Started <ago></time>` inside a `Tooltip` of the exact time, "Duration <d>"; `p.runs-preview` one line per step with an output, 120 characters at most, the first 50 steps; the tooltip opens on focus (hover UNVERIFIED in that folder) | `add-run-view`, design.md decisions 3 and "UNVERIFIED"; specs/web-runs "The run page shows a readable header, previews and two columns"; test-plan-browser.md test 1 |
| Runs list: table "Runs", caption hidden, columns Run, Flow, Mode, State, Started, Duration, Started by; the starter's name; link `Open run <id>` | `add-run-view`, "The runs list shows badges, durations and names" |
| Names: `GET /api/v1/people?ids=` answers a person's `displayName` (alice reads "Alice Example"); `personLabel` falls back to the id | `add-people-lookup`, specs/people-directory; delivered through `useDisplayNames` |
| Admin pages: Users table with "This is your account" for carol; Roles and teams with "Create team" beside the tables from 1366 px; Group mappings with the form above the table and "Reviewed by" names; Audit log with "Chain verification" and "Audit events"; Tool servers with `?server=acme` showing the region "Surface", the line "Registered by <name>" and the button "Approve surface"; Grants with "New grant" beside the table; Policies with "Hand-written Cedar" at most 768 px wide | `restyle-admin-pages`, test-plan-browser.md tests 1 to 8; specs/web-admin, specs/web-tools |
| Kit: `PageHeader` `h1` and `Section` regions; hidden table captions | `restyle-web-kit`, specs/web-kit "Layout helpers are fixed strings..." |
