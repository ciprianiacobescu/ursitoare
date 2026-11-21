## Context

M6b rebuilds the web app's look on Tailwind and Radix under the engine's CSP. This unit is its last: one browser journey over the finished pages, with numeric checks on every page and a full-page screenshot of each, so the orchestrator can look at the result before closing M6b (R2, D17). Rulings D16 (no Node journey) and D17 (visual gate) apply. Nothing in the journey is mocked; the nine folders' own tests mock one page each.

## Decisions

1. **Three tests, one per role.** Signed out, alice, carol: each takes the `page` fixture and `fresh_state`, sets its viewport with `page.set_viewport_size` and calls `watch_csp(page)` before the first `goto` (`open_visual`). One flow (`demo-ui`) and one run, so the suite stays at about 22 page visits, each with axe. Measured: about 15 s for the three tests, against the 8-minute suite budget.
2. **One `Visual.check` per visit, after a wait.** `loaded` (the shell has its session, the page's own element is visible, no visible "Loading" or "Checking" text in `main`), then `settle` (toasts gone, `assert_layout(page, 72)`, axe), then the screenshot. The banner bound is 72 px at both viewports (56 px measured by U07b). There is no sleep: every wait is an `expect`. Reason: a first version photographed Grants, Group mappings, `?server=acme` and the audit log while they still read "Loading ...", with the sidebar showing only "Home", because a full-page `goto` is captured as soon as the numeric checks pass and `/me` and the page's lists answer later. The `ready` element of each page is in test-plan-browser.md.
3. **Screenshots.** Full page, from the top of the page (`window.scrollTo(0, 0)` first: probed, a capture taken after scrolling draws the sticky sidebar and the section index in the middle of the picture), into `E2E_VISUAL_DIR`, default `<repo root>/.l4-out/visual`. The default is anchored to the repository root through `__file__`. The file name is `<role>-<slug><suffix>.png`. `main` is not a scroll container in the shell, so `full_page` is enough; the journey asserts each image is at least `scrollHeight - 1` pixels tall, so a shell change that makes `main` scroll fails the assertion instead of producing 860 px pictures. Pages that fit the window are 860 px tall, which is the viewport, not a cut.
4. **Toasts.** The kit's toasts (`ToastRegion.tsx`, `toast.ts`) are `position: fixed` at the bottom right; a success toast expires after 6,000 ms and an error toast stays. Two success toasts, "Created flow demo-ui." and "Saved version 1.", are on the flow page when "Validate" has finished. `settle` waits for them to expire (`expect(...).to_have_count(0, timeout=8000)`, no sleep) and dismisses only what is left. Probed: clicking "Dismiss" focuses `main` (`ToastRegion.tsx`), and `main:focus` then draws a 3 px blue frame around the whole page in the picture; waiting for expiry does not. An earlier version of this design and its report said no toast appeared; that was wrong. A toast hardening change is not this unit's.
5. **The tooltip.** U37c's `time` is focusable and its `Tooltip` opens on focus; hover is UNVERIFIED in that folder. The journey focuses the `time`, checks the text, runs axe with the tooltip open, then presses `Escape` so the picture does not show the tooltip over the run id (probed: it covers the `h1`). It then takes the screenshot.
6. **The page-height check is made in one named state.** After "Validate", with every answer row closed and every field empty (test-plan-browser.md, Test 2). Measured 2,706 px at 1366 by 860 (the card's limit is 3,000). The panels are 531 px wide, so U37b's fields stack: the "Inputs" group is 241 px, "Test run" is 922 px and "Dry run" 1,076 px, so the page height is set by "Dry run", whose own explanatory text makes it the taller panel, not by U37b's rows. Open and filled the page is 2,978 px (Test run 1,348 px): photographed, not asserted, because 22 px of margin would fail on another font. U37b's design.md "Measured" gives the same 2,706 and 2,978; U28b's own 2,275 was before the run panels grew.
7. **Previews are compared as values.** The stored payloads are `jsonb`, which orders keys by length then bytes, so the preview of the M4 mock `{"payment_id":"P-1","status":"created"}` reads `{"status":"created","payment_id":"P-1"}`. The journey parses each preview with `json.loads` and compares it with the mock.
8. **Answer rows are found by name.** U37b's rows follow flow order ("Answers for lookup" first; its design.md decision 3); the journey opens each by exact name, so the order does not matter.
9. **The flow text is the M4 text with `flow: demo-ui`.** The flow is created as `demo-ui` and the document's `flow:` line names it, so no mismatch is in play (UNVERIFIED whether the engine would accept `flow: demo-pay` in a flow named `demo-ui`; the probe used the matching name and read "Valid. 0 errors").
10. **The Node test is a text test** over the journey and the four page tables; its mutated copies make it fail by assertion (test-plan.md T3).

## Test paths and the red step

Both files match `tdd.test_globs` (`e2e/**`, `**/test_*.*`, `**/*.test.*`), so L4's red step writes both and there is no production code for a green step. The Node test is green on arrival: tasks.md says `pre_satisfied` (R3). It still begins with `assert.ok(existsSync(journey))`, which fails by assertion on a tree without the journey, and its mutated copies fail by assertion on a journey that drops a page or a check. The three browser tests stay out of `criteria_ids`; the verifier runs them. It cannot generate a UI test that fails on this unit's merge base, since the unit changes no production file: expect one "has no end-to-end test" hold per criterion, answered `accept` with this journey's passing run.

## Seam deviations (card versus folder; the folder wins)

| Card (`m6b-cards.md` § U52c) | Folder | Used |
|---|---|---|
| fill the fields "vendor_name" and "amount" | `add-run-inputs-form`: labels "Vendor name (required)" and "Amount (required)" in the group "Inputs" | the folder's labels |
| expand "Answers for lookup" and "Answers for pay"; "fill their first outputs" | rows named exactly "Answers for <nodeId>", outputs "Output 1 for <nodeId>", in flow order | the folder's names; found by name |
| on `/`, "Next steps" holds "Create a flow" | `add-home-dashboard` decision 2: `author_flow` is granted to nobody; "Create your first flow" is the step (`test_flow` is the author signal); "Create a flow" is the link in the empty "Recent flows" | both texts are asserted, each where the folder puts it |
| hovering the start time shows the tooltip | `add-run-view` decision 3: `time` with `tabIndex={0}`; the tooltip opens on focus | `focus()` |
| `State: completed` and "the meta line holds Alice Example" | "Started by Alice Example" in the meta line; status text `State: completed` | the folder's text |
| the previews show their outputs | key order is the database's | compared as parsed values |
| page at most 3,000 px "after U37b's panels" | 2,706 px closed, 2,978 px open and filled | asserted in the closed state only |
| the Flow text is the text of `test_m4_runs.py` | the flow is `demo-ui` | its `flow:` line reads `demo-ui` |
| `assert_layout` | created by U15c in `e2e/conftest.py`; no other folder creates it | cited, not created |
| the seven admin pages, `?server=acme` | `ADMIN_PAGES` has four entries and `TOOL_PAGES` three; with `?server=acme` that is eight admin visits | eight visits |
| screenshot per page and role | alice's `/` is visited twice (empty and after the run) and the flow page twice | 21 files, suffixes `-empty`, `-answers`, `-narrow` |

## Frozen pins checked

The journey adds no markup, so no pin changes. It relies on: the `login` banner check, the single `navigation` "Main", the singleton `status` "Run state", the heading `Run <id>`, one link per run panel (m4:90), `Open run <id>` names (m4:46), the singletons "Save version" and "Validate", and the heading `Graph of <id>`. Page-wide locators are used only where the probe showed one match.

## Interfaces

Given, equal to `proposal.md`:

```ts
// None. This unit gives no production, test-support or scaffolded name: its two files are tests, and nothing imports them.
// It takes watch_csp and assert_layout (e2e/conftest.py, U15c) and login and assert_accessible (e2e/conftest.py, merged).
// The literal the Node test reads from the journey as text is fixed in test-plan.md T0.
```

## What the probe showed (composite build, final run, all 21 files read again)

The build merged the nine prototypes of the earlier authors (three-way, in plan order; ten files conflicted and took the later prototype's whole file: the seven admin and tool pages from U21b, `FlowsPage.tsx` from U28b, the two run panels from U37b); `tsc` clean, `vite build` ok, the three tests pass three times in a row with the same image sizes, the Node test passes. What each file shows (1366 by 860 unless stated; each file's height in brackets):

- **signed-out-home, -sign-in, -no-such-page** (860 each): "Ursitoare" banner with "Home"; home adds a "Sign in" button, the heading and a green "Engine healthy" over an empty window; sign-in is a 384 px card with a full-width blue button; not-found is a dashed grey card with a blue "Go to the landing page" button (and the banner "Sign in"). Loaded.
- **alice-home-empty** (860): account banner, sidebar (Home, Build: Flows, Runs), two cards with dashed "No runs yet" and "No flows yet" states and blue buttons, "Next steps" with one card "Create your first flow" (a plain bordered box with no link look). Loaded.
- **alice-flows** (860): the "Create flow" card with `demo-ui` in a focused field and `finance` in "Owner team"; a dashed "No flows yet" box. Loaded.
- **alice-flows-demo-ui** (2,706): two columns. Left: the editor scrolled to its last lines (the YAML's first lines are not visible), "Save version", "Validate", "Diagnostics" ("Valid. 0 errors"), then blank space down to "Versions". Right: "Graph" with the drawing and node list. Then "Versions" (one `validated` row, "Alice Example") and "Test run" and "Dry run" side by side, fields stacked, rows closed. No frame around `main`; the section index is plain blue links under the header.
- **alice-flows-demo-ui-answers** (2,978): `ACME`, `12.5`, the indented "Input (JSON)", both Test run rows open with their outputs, "Mocks (JSON)" with the answers (its last line cut by the box), a thick blue ring on "Output 1 for pay".
- **alice-runs-run-id** (860): `Run run_01a1ee08-...`, a green "State: completed" badge and the meta line; "Started just now" has a 3 px blue frame because the journey focused it to open the tooltip (closed in the picture); "Timeline" (four steps, badges, `<1 s`, previews under `lookup`, `pay`, `done`) beside "Step details" ("Choose a step..."). Loaded.
- **alice-runs** (860): one row: monospace `Open run ...` link, `demo-ui`, `mock`, green badge, "just now", `<1 s`, "Alice Example". **alice-home** (860): "Run 90f9420a of demo-ui ... by you", `v1 · validated`, "Next steps: Start a test run". Loaded.
- **alice-flows-demo-ui-graph** (1,415): the `h1` has a 3 px blue frame (`activeElement` is the `H1`, focused after the load); "Back to the editor"; one "Graph" card with a centred drawing, the node list and "Node details". Loaded.
- **carol-home** (860): sidebar with Build and Admin (seven links); "Browse flows" and "Go to flows" empty states; "Next steps: Review pending tool servers" with badge `1`. **carol-admin-users** (860): one row, `Carol Example`, green "Active", `tenant_admin`, "This is your account". **carol-admin-roles-and-teams** (860): "Create team" card left of the tables "Roles" (4 rows) and "Teams" (`finance`, "Delete team finance"). Loaded.
- **carol-admin-group-mappings** (1,016): "Map a group" card above four mappings; "operator:e2e-seed" wraps mid-id on every row; the "Remove ..." buttons differ in height ("Remove ursitoare-approvers" wraps). Loaded.
- **carol-admin-audit** (4,117): "Chain verification" reads "Audit chain verified 28 events checked", beside "Filter the audit log"; "Audit events" has 28 rows; the "Details" column is cut at the table's right edge (JSON stops mid-token, no visible scrollbar), and "Actor" and "Target" wrap. Loaded; `assert_layout` passes because the wrapper scrolls inside.
- **carol-admin-tool-servers** (860): `acme` link and "acme · https://tools.fake.test · pending" with an orange badge. **-acme**: adds "Registered by e2e-seed", the "Surface" card, the "Tools" table and "Approve surface". Loaded.
- **carol-admin-grants** (860): "New grant" card (radios, "Tool" select with one option "Choose a tool" because `acme` is not approved) beside a dashed "No grants" box. **carol-admin-policies** (860): "No policy deployed. All grant changes are deployed."; the label "Hand-written Cedar" is plain text above an empty textarea; "Validate", "Deploy". Loaded.
- **carol-home-narrow** (900 wide, 1,417): "Menu" button beside the brand; the open navigation is a full-width grey block with all ten links above the page body. Loaded.

Visual findings (none fails a numeric check): the focus frames on the run page's "Started" time (made by the journey) and on the graph page's `h1`; the cut "Details" column of the audit log; wrapped ids and uneven buttons on Group mappings; blank space under "Diagnostics"; the plain "Hand-written Cedar" label; the editor scrolled to its end. The `main` frame on the flow page in the first run came from clicking "Dismiss" and is gone.

## UNVERIFIED

- The composite is built from prototypes, not from merged code: the seven admin and tool pages, `FlowsPage.tsx` and the two run panels were taken whole from one prototype each. The final merged main may differ in details; the journey's locators come from the folders' texts, and the probe passed with them.
- Firefox and WebKit; any font other than macOS Chromium 1.63.0's (heights depend on the font: 2,706 px has 294 px of margin, 2,978 px has 22); the full e2e suite with the nine units merged (the folders ran theirs beside their drafts); the suite budget on L4's runner; hover on the tooltip.

## Failure cases

A toast that neither expires nor can be dismissed fails the count 0. A page whose `ready` element never shows fails that `expect` with the locator's name. A screenshot directory that is missing is created; one that cannot be written raises and fails the test; an empty file fails the size assertion. A page that raises a CSP message fails the final `visual.csp == []`, and the list names the directive and the blocked URI. A banner taller than 72 px or a horizontal scroll fails `assert_layout` with the numbers; an axe result of impact serious or critical fails with its ids. A flow page above 3,000 px fails with the measured height.
