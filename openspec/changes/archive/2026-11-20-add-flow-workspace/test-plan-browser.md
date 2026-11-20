# Browser tests (mocked answers, no sign-in)

`e2e/test_m6b_workspace.py`, four tests, each with `@pytest.mark.milestone("M6b")` and `@pytest.mark.l4("C-…")`. Fixtures `page` and `base_url` only (no `fresh_state`, no `login`); imports `from conftest import assert_accessible, assert_layout, watch_csp`. Locators by role with `exact=True`, no sleep. Each test sets the viewport to 1366 by 860 and calls `watch_csp(page)` before the first `goto`, and ends with `assert csp == []`. The shell is U07b's (banner 56 px), so `assert_layout` runs with `max_banner_px=72`.

**Mocks** (a `page.route` on the regex `/api/v1<path>(\?.*)?$`, status 200, `application/json`; `HASH` is `"sha256:" + "a" * 64`, its path form replaces `:` with `%3A`):

- `/me`: `{"user": {"id": "user-1", "displayName": "Alice Example", "email": null}, "tenant": {"id": "tenant-1", "name": "E2E tenant", "reviewProfile": "solo"}, "capabilities": ["read_flow", "test_flow", "dry_run_flow", "read_self"], "csrfToken": "csrf_" + "a" * 38}` (exactly the four keys of `me.test.ts:166`).
- `/people`: `{"items": [{"userId": "user-1", "displayName": "Alice Example", "kind": "human"}]}`.
- `V` (a version row, the shape the real engine answered on 2026-11-18): `{"flowId": "demo-pay", "number": 1, "hash": HASH, "state": "validated", "surface": "yaml", "author": "user-1", "requestedBy": null, "createdAt": "2026-11-17T10:00:00.000000Z", "validatedAt": "2026-11-17T10:00:01.000000Z", "validationOk": true}`.
- `/flows/demo-pay`: `{"flowId": "demo-pay", "ownerTeam": "finance", "createdBy": "user-1", "createdAt": "2026-11-17T10:00:00.000000Z", "versionCount": 1, "latest": V}`.
- `/flows/demo-pay/versions`: `{"items": [V], "next_cursor": null}`.
- `/flows/demo-pay/versions/<HASH path form>`: `V` plus `"text": "ursitoare: \"0.1\"\nflow: demo-pay\n"`, `"canonical": C` and `"result": {"ok": true, "errors": [], "warnings": [], "layers_run": ["L1", "L2", "L3"]}`, with `C` = `{"ursitoare": "0.1", "flow": "demo-pay", "version": "1.0.0", "start": "pay", "nodes": {"pay": {"kind": "block", "uses": "erp.create_payment@1", "with": {}, "next": "done"}, "done": {"kind": "end", "status": "completed"}}}`.
- For the Flows page: `/flows` `{"items": [], "next_cursor": null}` and `/me/teams` `{"items": [{"id": "finance"}], "next_cursor": null}`.

**Opening the workspace** (`open_workspace`): the mocks above, `goto("/flows/demo-pay")`, then expect the heading `Flow demo-pay`, the button `Open version 1` and the link `Open the graph on its own page` visible. The last two appear only after the versions and the graph document have loaded, so every measurement follows an `expect` on content that only those replies render.

| test | steps | measured (the scenario's THEN holds the assertions) |
|---|---|---|
| `test_workspace_is_two_columns_with_every_panel_visible` | open; expect the regions "Edit the flow", "Diagnostics", "Graph", "Test run", "Dry run" and `#flow-versions` visible (not the region "Versions": the section and the table's region share the name); read the region tops, `scrollHeight`, the "Diagnostics" `h2` bottom, the drawing top and the "Save version" bottom | tops 239 and 239 (Graph, Edit the flow), 1,392.95 and 1,392.95 (Test run, Dry run); height 2,275; heading bottom 790; drawing top 387; button bottom 697 |
| `test_jump_links_reach_their_panels_and_the_bar_sticks` | open; read the list named "On this page" and its 6 links (text and `href`); count `locator(href)` for each; count `navigation`; click "Dry run panel" | the six pairs of the scenario; counts 1; one `navigation`; URL ends `#flow-panel-dry-run`; the list's box `{x: 264, y: 0, width: 1078, height: 49}`; the target's y 63.95 |
| `test_tab_from_the_editor_names_authors_and_keeps_the_scroller` | open; focus "Flow text" (`focus()`), press Tab; read `.cm-scroller`; find the cells and the `time` element in the table "Versions" | "Save version" focused; `overflow-x` `auto`; cells "Alice Example", "validated" and "2026-11-17 10:00 UTC"; `datetime` `2026-11-17T10:00:00.000000Z` |
| `test_owner_team_is_prefilled_from_my_teams` | mock `/me`, `/flows`, `/me/teams`; `goto("/flows")`; read "Owner team"; `fill("ops")` | value `finance` then `ops`; 1 `datalist option` |

The first two and the fourth call `assert_layout(page, max_banner_px=72)`; the first and fourth call `assert_accessible(page)`. All four passed against the scratch build (1.18 s together), and so did the existing suite beside them (70 tests in one run on a fresh stack).

**Probed by hand, not asserted by a browser test:** the selected line after "Show L2_UNKNOWN_BLOCK in the editor" (top 215, host 132 to 464, index 49 px tall); the 1024 px column; the 1280 by 720 first screen. The Node source test pins the `scrollIntoView` call.
