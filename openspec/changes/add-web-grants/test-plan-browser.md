# Browser tests with mocked API answers

`e2e/test_m6_tool_pages.py`: four tests, each `@pytest.mark.milestone("M6")` and `@pytest.mark.l4("C-…")` with the id L4 derives for the scenario named at it. Fixtures `fresh_state`, `users`, `base_url`, `login(page, users["carol"])` (`e2e/conftest.py:50,71,24,90`), `assert_accessible(page)` after each view (`:118`), role and name locators with `exact=True`, no sleep; `page.route`, `route.fulfill` as in `e2e/test_m1_web_kit.py:64-96`. Each test checks the tab title (`TOOL_TITLES`).

**Mocking.** `answer(path, *replies, method="GET")` routes `/api/v1/<path>` (query ignored), records each request in `hits` (headers, body) and answers hit n with reply n (the last repeats). A reply is `(status, body)` as JSON, or `HOLD` (never answered; `reload()` drops it and the next hit gets the next reply); an error body is `{"error": {"code": C, "message": "m", "details": D}}`. `/me` and the sign-in are the stack's, except in Servers 2: `solo_me(page)` fetches `/me`, sets `tenant.reviewProfile` to `"solo"`, fulfils with it and keeps `ME["user"]["id"]`. A disabled control is clicked with `click(force=True)` (the page must ignore it, design § Failure cases); counts are read after the next page load.

## Servers 1 (`test_tool_server_detail_states_and_approval`, scenario "The server detail loads, fails, is refused and is approved")

`RAW_D` is `RAW` (test-plan.md § Tool servers) with `pendingSubmittedBy` `"u_dave"`; `RAW_2` is `RAW_D` with `pendingDigest` `DA`. Replies: `tool-servers` `(200, {"items": [], "next_cursor": null})`; `tool-servers/acme` `HOLD`, `(500, INTERNAL)`, `RAW_D`, `RAW_2`, `APPROVED` (each `(200, …)`); `…/acme/surface/approve` `(422, OPERATION_REFUSED, {"reason": "digest_mismatch"})`, then `(200, {"server": ACCEPTED, "blocks": ["acme.lookup_vendor@1", "acme.create_payment@1"]})`. `region` is the region "Surface", `button` its "Approve surface".

| step | observable result |
|---|---|
| 1 `goto("/admin/tool-servers?server=acme")`, `button.click(force=True)`; 2 `reload()`, the same click | `region` holds a `status` "Loading", then an `alert`; `button` is `aria-disabled="true"` both times; no dialog opens and the approve `hits` are 0 |
| 3 `reload()` | the `stateNote` of `VIEW`; table "Tools": the two `toolRows` of `VIEW`; `button` enabled |
| 4 `button`, dialog "Approve surface" | the `approveDialog` description; in `region` the `alert` (`digest_mismatch`) and "Pending surface fedcba987654."; detail `hits` 4 |
| 5 `button`, dialog "Approve surface" | title "Approve surface fedcba987654?"; body `{"digest": DA, "selfApproval": false}`; the detail is read a fifth time (`APPROVED`): `acme · https://tools.fake.test · approved`, the `toolRows` with their refs, a `status` "Surface approved." in `region`; `button` `aria-disabled="true"` |

## Servers 2 (`test_tool_server_link_and_self_approval`, scenario "A server opened from its link is approved by its submitter")

`RAW_ME` is `RAW` with `pendingSubmittedBy` `ME["user"]["id"]`; `RAW_NS` is `RAW` without the member. Replies: `tool-servers` `(200, {"items": [LISTITEM], "next_cursor": null})`; `tool-servers/acme` `RAW_ME`, `RAW_ME`, `APPROVED`, `RAW_NS`, `APPROVED`; `…/approve` `(200, {"server": ACCEPTED, "blocks": […]})`, `(422, OPERATION_REFUSED, {"reason": "self_approval_required"})`, `(200, …)`. `box` is the checkbox "I approve my own surface".

| step | observable result |
|---|---|
| 1 `solo_me`, `goto("/admin/tool-servers")`, link `acme` | the URL ends `?server=acme`, the detail is read once (no page load); `region` shows the self-approval note and `box` unticked |
| 2 `button` with `box` unticked | an `alert` with the Tick message; no dialog; approve `hits` 0 |
| 3 tick `box`, `reload()`; tick, `button`, dialog | `box` unticked after the reload (detail `hits` 2); body `{"digest": DP, "selfApproval": true}`; "Surface approved."; detail `hits` 3 |
| 4 `goto("/admin/tool-servers?server=acme")` (`RAW_NS`: no `box`); `button`, dialog; then tick the `box` that appears, `button`, dialog | bodies `{"digest": DP, "selfApproval": false}` then `true`; between them the `self_approval_required` `alert`, `box` unticked, detail `hits` 4; then "Surface approved.", detail `hits` 5 |

## Grants 1 (`test_grant_create_confirm_and_revoke`, scenario "A grant is created, confirmed and revoked, and the table reloads")

`ITEM1` is `{"grant": REC(), "status": "needs_reconfirm"}`, `ITEM2` the `active` item of `REC` `grant_2` (user `u_bob`, `acme.lookup_vendor@1`, any step; test-plan.md § Grants). Replies: `blocks` `(500, INTERNAL)`, then `(200, {"items": [BLK("acme.lookup_vendor@1", true), BLK("acme.create_payment@1", true), BLK("erp.lookup_vendor@1", false)], "next_cursor": null})`; `grants` GET (items as `{"items": …, "next_cursor": null}`): `(403, FORBIDDEN, {"decisionId": "dec_1"})`, `[ITEM1]`, `[ITEM1, ITEM2]`, `[ITEM1 active, ITEM2]`, `[ITEM1 active, ITEM2 revoked]`; `grants` POST `(422, OPERATION_REFUSED, {"reason": "user_unknown"})`, `(201, REC(grant_2))`; `grants/grant_1/confirm` `(422, OPERATION_REFUSED, {"reason": "revoked"})`, `(200, REC())`; `grants/grant_2` DELETE `(500, INTERNAL)`, `(200, REC(grant_2 revoked))`.

| step | observable result |
|---|---|
| 1 `goto("/admin/grants")`, fill "Role or user", `click(force=True)` "Create grant"; 2 `reload()` | step 1: an `alert` with "dec_1" and `FORBIDDEN` (the table) and one for the tool list; select "Tool" holds only "Choose a tool"; "Create grant" is `aria-disabled="true"`, the POST `hits` are 0. Step 2 (list `hits` 2): row `role author · acme.create_payment@1 · pay-run / pay · needs_reconfirm` with "Revoke" and "Confirm for the newest version"; select "Tool" holds "Choose a tool" and the two bound refs (not `erp.lookup_vendor@1`) |
| 3 radio "User", "Role or user" `u_bob`, "Tool" `acme.lookup_vendor@1`, "Create grant" twice | first POST: "That user does not exist." beside "Role or user", the form as filled, `hits` 2; the second POST has the same `Idempotency-Key`; `status` "Grant created."; `hits` 3; the form is reset ("Role or user" empty, radio "Role") |
| 4 "Confirm for the newest version" (first row) twice | an `alert` "That grant is revoked.", `hits` 3; then `status` "Grant confirmed for the newest version.", `hits` 4; the row ends `active`, without that button |
| 5 "Revoke" (`u_bob` row) twice | an `alert`, `hits` 4; then `status` "Grant revoked.", `hits` 5; the row ends `revoked`, without buttons |

## Policies (`test_policy_loads_validates_and_deploys`, scenario "The policy loads, validates and deploys")

`REC`, `SRC`, `V`: test-plan.md § Policies. Replies: `policies` GET `HOLD`, `(500, INTERNAL)`, `(200, {"current": null, "pendingGrants": 1})`, `(200, {"current": REC, "pendingGrants": 0})`; `policies/validate` `(200, {"ok": false, "policySetVersion": null, "problems": [{"stage": "parse", "ids": [], "message": "unexpected end of input"}]})`, then `(200, {"ok": true, "policySetVersion": V, "problems": []})`; `policies/deploy` `(422, OPERATION_REFUSED, {"reason": "policy_invalid", "problems": [{"stage": "policy", "ids": ["t-1"], "message": ""}]})`, then `(201, REC)`.

| step | observable result |
|---|---|
| 1 `goto("/admin/policies")`; 2 `reload()`; each time `click(force=True)` "Validate" and "Deploy" | `main` holds a `status` "Loading", then an `alert`; both buttons are `aria-disabled="true"`; the validate and deploy `hits` are 0 after step 3 loads |
| 3 `reload()` | textarea "Hand-written Cedar" empty; buttons enabled |
| 4 fill `permit (`, "Validate"; fill `SRC`, "Validate" | the first body is `{"source": "permit ("}`; the `status` texts |
| 5 "Deploy" twice | body `{"source": SRC}` both times; the `alert`, then the `status`, a new `Idempotency-Key` and GET `hits` 4 |
