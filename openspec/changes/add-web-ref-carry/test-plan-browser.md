# Browser tests

`e2e/test_m8_ref_carry.py` holds `test_approving_bumped_refs_offers_the_copy`, `test_first_approval_offers_nothing` and `test_a_failed_grants_read_creates_nothing`, all `C-8540a4f8`; `e2e/test_m8_ref_carry_grants.py` holds `test_superseded_and_waiting_refs_are_marked_beside_the_badge` (`C-4b83877f`) and `test_a_failed_server_read_shows_no_marker`, `test_a_failed_server_read_adds_no_alert` and `test_an_unanswered_server_read_does_not_end_the_session`, all `C-b8363cd2`. Each is `@pytest.mark.milestone("M8")` and `@pytest.mark.l4(...)`, takes only `page`, signs nobody in and mocks every answer with `page.route`. Helpers are copied from `e2e/test_m7_tool_registration.py` (`ME`, `IO`, `EMPTY`, `rec`, `answer(page, path, *replies, method="GET")`, `start`, `checked`) and `e2e/test_m6_tool_pages.py` (`INTERNAL`, `FORBIDDEN`, `refused`, `grant_record`); this unit's `answer` also keeps each hit's `url`, and `queries(hits)` parses them with `parse_qs`. `start(page)` calls `watch_csp(page)` before the first `goto`, sets 1366x860, answers `me` and `people` and returns `csp` with `others`, the list a `page.on("request")` handler fills with each `DELETE`, `PUT` or `PATCH` request to an `/api/v1/grants` URL; `checked(page)` is `assert_layout(page)` then `assert_accessible(page)`; each test ends with `assert csp == []`. Locators use role and name with `exact=True`; a hit count follows an `expect` on content only that reply renders (for a reply that renders nothing: `with page.expect_response(re.compile(r"/api/v1/<path>(\?.*)?$")) as r: page.goto(...)`, then `r.value.status`). `ME` is that of `test_m7_tool_registration.py` with `capabilities` `["register_tool_server", "approve_tool_surface", "deploy_policy"]` and `user.id` `user-1`.

## Approve

`DP` is `"sha256:" + "0123456789ab" + "c" * 52`, `DA` the same with `fedcba987654` and `"d" * 52`; `T(name, effect, **over)` is `{"name": name, "effect": effect, "input": IO, "output": IO, "http": {"method": "POST", "path": "/v1/" + name}, **over}`; `OLD` is `{"tools": [T("create_payment", "pay"), T("list_vendors", "read")]}` and `NEW` is the same with `unsafe_to_retry=True` on the first and, on the second, `untrusted_result=False` and effect `write`; `refs(n, lv)` is the two `{"name", "effect", "ref": f"ledger.<name>@{n}"}` records, `list_vendors` with effect `lv`; `LEDGER` is `rec("ledger", "http_openapi", "https://tools.fake.test")`. `DRIFT` is `{**LEDGER, "state": "drifted", "approvedDigest": DA, "pendingDigest": DP, "pendingSubmittedBy": "u_carol", "tools": refs(1, "read"), "approvedSurface": OLD, "pendingSurface": NEW}`, `ACCEPTED` `{**LEDGER, "state": "approved", "approvedDigest": DP, "tools": refs(2, "write")}`, `DONE` `{**ACCEPTED, "approvedSurface": NEW, "pendingSurface": None}`; `FIRST` is `DRIFT` with `state` `pending`, `approvedDigest` `None`, `approvedSurface` `None` and every `ref` `None`, `FIRST_DONE` is `DONE` with `refs(1, "write")` and `ACCEPTED1` its record without surfaces. `ROLE`, `BOB`, `ANY`, `NODE` are the subjects `{"kind": "role", "role": "author"}`, `{"kind": "user", "userId": "u_bob"}` and the scopes `{"kind": "any_step"}`, `{"kind": "node", "flowId": "pay-run", "nodeId": "pay"}`; `item(id, tool, subject, scope, args=[], state="active")` is `{"grant": grant_record(...), "status": state}`; `ITEMS` is `item("grant_1", CP1, ROLE, ANY)`, `item("grant_2", CP1, BOB, ANY, [{"arg": "amount", "op": "lte", "value": 100}])`, `item("grant_3", CP1, ROLE, NODE)`, `item("grant_4", CP1, ROLE, ANY, state="revoked")`, `item("grant_5", "acme.lookup_vendor@1", ROLE, ANY)`, `item("grant_6", LV1, ROLE, ANY)` (`CP1`, `LV1`, `CP2`, `LV2` as in test-plan.md). `NOTICE` is the NT3 text; `region` is `page.get_by_role("region", name="Surface", exact=True)`; `copy` is `region.get_by_role("button", name="Create the same grants for the new refs", exact=True)`; `copied` is `region.get_by_role("list", name="Copied grants", exact=True)`. `approve(page)` clicks "Approve surface" in `region`, then "Approve surface" in `page.get_by_role("dialog")`. Every test answers `tool-servers` (list) and `credentials` with `EMPTY`, `tool-servers/ledger` (GET; `detail_hits`), `tool-servers/ledger/surface/approve` (POST; `approves`, replying `(200, {"server": ACCEPTED, "blocks": [...]})`, with `ACCEPTED1` for `C-8540a4f8`), `grants` (GET; `grants`) and `grants` (POST; `posts`).

**`C-8540a4f8`**: `detail_hits` replies `(200, DRIFT)`, `(200, DONE)`; `grants` `(200, {"items": ITEMS, "next_cursor": None})`; `posts` `(201, grant_record(id="grant_n1", tool=CP2))`, `(422, refused("arg_unknown"))` (`grant_6`, on `list_vendors`, whose effect changed from `read` to `write`, is not posted).

| step | observable result |
|---|---|
| 1 `goto("/admin/tool-servers?server=ledger")` | `region` contains "ledger · https://tools.fake.test · drifted"; the text `NOTICE` has count 0; `copy` has count 0; `checked(page)` |
| 2 `approve(page)` | `region.get_by_role("status").filter(has_text="Surface approved.")` is visible; `region` contains "ledger · https://tools.fake.test · approved"; `get_by_text(NOTICE, exact=True)` is visible; `copy` is visible and has no `aria-disabled`; `copied` has count 0; then `approves` has 1 hit with body `{"digest": DP, "selfApproval": False}`, `detail_hits` has 2 hits, `grants` and `posts` have 0 hits; `checked(page)` |
| 3 click `copy` | `copied.get_by_role("listitem")` has the texts, in order, "Created ledger.create_payment@2 for role author · any step.", "Not created for user u_bob · any step: arg_unknown.", "Update the flow first: role author · pay-run / pay (ledger.create_payment@2).", "Effect changed: read → write; grant it again on the Grants page: role author · any step (ledger.list_vendors@2)."; `page.get_by_role("link", name="Deploy on Policies", exact=True)` has `href` `/admin/policies`; `copy` has no `aria-disabled`; `page.get_by_role("alert")` has count 0; then `grants` has 1 hit with `queries` `[{"limit": ["100"]}]`; `posts` has 2 hits with the bodies `{"subject": ROLE, "tool": "ledger.create_payment@2", "scope": ANY, "args": []}` and `{"subject": BOB, "tool": "ledger.create_payment@2", "scope": ANY, "args": [{"arg": "amount", "op": "lte", "value": 100}]}`, whose `idempotency-key` headers are two distinct non-empty strings, and none has `tool` `ledger.list_vendors@2`; `others` is `[]`; `checked(page)` |

**`C-8540a4f8`** (a first approval): `detail_hits` replies `(200, FIRST)`, `(200, FIRST_DONE)`; `grants` `(200, {"items": ITEMS, "next_cursor": None})`.

| step | observable result |
|---|---|
| 1 `goto("/admin/tool-servers?server=ledger")`, `approve(page)` | `region.get_by_role("status").filter(has_text="Surface approved.")` is visible; `region` contains "ledger · https://tools.fake.test · approved"; `page.get_by_text(re.compile(r"^Refs changed"))` has count 0; `copy` has count 0; then `approves` has 1 hit, `detail_hits` 2 hits, `grants` 0 hits; `checked(page)` |

**`C-8540a4f8`** (a grants read the admin may not make): as `C-8540a4f8` but `grants` replies `(403, FORBIDDEN)`.

| step | observable result |
|---|---|
| 1 `goto`, `approve(page)`, click `copy` | `region.get_by_role("alert")` has count 1 and contains "dec_1"; `copied` has count 0; the link "Deploy on Policies" has count 0; `copy` has no `aria-disabled`; then `grants` has 1 hit and `posts` 0 hits; `checked(page)` |

## Grants markers and failed reads (`e2e/test_m8_ref_carry_grants.py`)

`ME2` is `ME` with `capabilities` `["register_tool_server", "deploy_policy"]`; `server(id, state, name, ref)` is `rec(id, "http_openapi", "https://tools.fake.test", state=state, approvedDigest=DA, tools=[{"name": name, "effect": "read", "ref": ref}])` (a drifted one also has `pendingDigest` `DP`); `S1` is `server("ledger", "approved", "create_payment", "ledger.create_payment@2")`, `S2` `server("acme", "drifted", "lookup_vendor", "acme.lookup_vendor@1")`, `S3` `server("crm", "approved", "find_vendor", "crm.find_vendor@1")`; `ROWS` is `{"items": [item("grant_1", "ledger.create_payment@1", ROLE, ANY), item("grant_2", "ledger.create_payment@2", BOB, ANY), item("grant_3", "acme.lookup_vendor@1", ROLE, ANY), item("grant_4", "crm.find_customer@1", ROLE, ANY)], "next_cursor": None}`; `blocks` answers an empty page. `row(text)` is `page.get_by_role("table", name="Grants", exact=True).get_by_role("row").filter(has_text=text)`; `marker(r)` and `badge(r)` are `r.locator('[data-slot="ref-marker"]')` and `r.locator('[data-slot="badge"]')`.

**`C-4b83877f`**: `servers` (GET `tool-servers`) replies `(200, {"items": [S1], "next_cursor": "s2"})`, `(200, {"items": [S2, S3], "next_cursor": None})`; `grants` `(200, ROWS)`.

| step | observable result |
|---|---|
| 1 `goto("/admin/grants")` | `marker(row("ledger.create_payment@1"))` has the text "superseded" and `data-state` `superseded`; `marker(row("acme.lookup_vendor@1"))` has the text "waiting for approval"; `row("role author · ledger.create_payment@1 · any step · active")` contains that text, `badge` of each of the four rows has count 1 and the first row's has `data-tone` `success`; `marker(row("ledger.create_payment@2"))` and `marker(row("crm.find_customer@1"))` have count 0; then `servers` has 2 hits with `queries` `[{"limit": ["100"]}, {"limit": ["100"], "cursor": ["s2"]}]`; `checked(page)` |

**`C-b8363cd2`**: `servers` replies `(403, FORBIDDEN)`; `grants` `(200, ROWS)`.

| step | observable result |
|---|---|
| 1 `goto("/admin/grants")` inside `expect_response` for `tool-servers` | the response status is 403; `row("role author · ledger.create_payment@1 · any step · active")` and `row("role author · acme.lookup_vendor@1 · any step · active")` are visible, each with `badge` count 1; `page.locator('[data-slot="ref-marker"]')` has count 0; `page.get_by_role("alert")` has count 0; `checked(page)` |

**`C-b8363cd2`**: `servers` replies `(500, INTERNAL)`; `grants` and `blocks` reply `(403, FORBIDDEN)`.

| step | observable result |
|---|---|
| 1 `goto("/admin/grants")` inside `expect_response` for `tool-servers` | the response status is 500; `page.get_by_role("alert")` has count 2 (the frozen error-state value), also after `checked(page)`; the options of the combobox "Tool" are exactly `["Choose a tool"]`; "Create grant" has `aria-disabled` `true` |

**`C-b8363cd2`, `test_an_unanswered_server_read_does_not_end_the_session`** (the frozen no-sign-in tests' case): `me`, `blocks` and `grants` (`(200, ROWS)`) are answered, and `servers` replies `(401, {"error": {"code": "UNAUTHENTICATED", "message": "m"}})`; the real-engine case stays with the frozen tests.

| step | observable result |
|---|---|
| 1 `goto("/admin/grants")` inside `expect_response` for `tool-servers` | the response status is 401; `row("role author · ledger.create_payment@1 · any step · active")` is visible with `badge` count 1; `checked(page)`; then `page.url` ends with `/admin/grants` (the 401 did not redirect to sign-in) and `page.locator('[data-slot="ref-marker"]')` has count 0 |
