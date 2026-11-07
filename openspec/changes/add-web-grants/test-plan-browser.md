# Browser tests with mocked API answers

`e2e/test_m6_tool_pages.py`: three tests, each `@pytest.mark.milestone("M6")` and `@pytest.mark.l4("C-…")` with the id L4 derives for the scenario it proves: Servers "The server detail loads, fails, is refused and is approved", Grants "A grant is created, confirmed and revoked, and the table reloads", Policies "The policy loads, validates and deploys". Fixtures `fresh_state`, `users`, `base_url` and `login(page, users["carol"])` (`e2e/conftest.py:50,71,24,90`), `assert_accessible(page)` after each view (`:118`), role and name locators with `exact=True`, no sleep; `page.route` and `route.fulfill` as in `e2e/test_m1_web_kit.py:64-96`.

**Mocking.** `answer(path, *replies, method="GET")` routes the method and URL path `/api/v1/<path>` (query ignored), appends each request to `hits` and answers hit n with reply n (the last repeats). A reply is `(status, body)` as JSON, or `HOLD` (never answered; `page.reload()` drops it and the next hit gets the next reply). An error body is `{"error": {"code": C, "message": "m", "details": D}}`. `/me` and the sign-in are the stack's.

## Servers (`test_tool_server_detail_states_and_approval`)

`RAW_D` is `RAW` (test-plan.md § Tool servers) with `pendingSubmittedBy` `"u_dave"`; `RAW_2` is `RAW_D` with `pendingDigest` `DP2` = `"sha256:" + "fedcba987654" + "d" × 52`. Replies: `tool-servers` `(200, {"items": [], "next_cursor": null})`; `tool-servers/acme` `HOLD`, `(500, INTERNAL)`, `(200, RAW_D)`, `(200, RAW_2)`; `…/acme/surface/approve` `(422, OPERATION_REFUSED, {"reason": "digest_mismatch"})`, then `(200, {"server": APPROVED, "blocks": ["acme.lookup_vendor@1", "acme.create_payment@1"]})`. `region` is the region "Surface", `button` the page's "Approve surface".

| step | observable result (the strings of the scenario, and) |
|---|---|
| 1 `goto("/admin/tool-servers?server=acme")`; 2 `reload()` | `region` holds a `status` "Loading", then an `alert`; `button` is `aria-disabled="true"` both times |
| 3 `reload()` | the `stateNote` of `VIEW`; table "Tools": row `lookup_vendor` has `read`, `trusted`, `POST /blocks/erp.lookup_vendor@1`, row `create_payment` has `pay`, `untrusted`, `POST /blocks/erp.create_payment@1`; `button` enabled |
| 4 `button`, dialog "Approve surface" | the `approveDialog` description of `VIEW`; the `alert` and "Pending surface fedcba987654." in `region`; detail `hits` 4 |
| 5 `button`, dialog "Approve surface" | title "Approve surface fedcba987654?"; body `{"digest": DP2, "selfApproval": false}`; a `status` in `region`; `button` `aria-disabled="true"`; `hits` stay 4 |

## Grants (`test_grant_create_confirm_and_revoke`)

`ITEM1` is `{"grant": REC(), "status": "needs_reconfirm"}`, `ITEM2` the `active` item of `REC` `grant_2` (user `u_bob`, `acme.lookup_vendor@1`, any step; test-plan.md § Grants). Replies: `blocks` `(200, {"items": [{"ref": "acme.lookup_vendor@1", "bound": true}, {"ref": "acme.create_payment@1", "bound": true}], "next_cursor": null})`; `grants` GET, as `{"items": …, "next_cursor": null}`: `[ITEM1]`, `[ITEM1, ITEM2]`, `[ITEM1 active, ITEM2]`, `[ITEM1 active, ITEM2 revoked]`; `grants` POST `(201, REC(grant_2))`; `grants/grant_1/confirm` `(200, REC())`; `grants/grant_2` DELETE `(200, REC(grant_2 revoked))`.

| step | observable result (the strings of the scenario, and) |
|---|---|
| 1 `goto("/admin/grants")` | row `role author · acme.create_payment@1 · pay-run / pay · needs_reconfirm` with buttons "Revoke" and "Confirm for the newest version"; select "Tool" lists both refs |
| 2 radio "User", "Role or user" `u_bob`, "Tool" `acme.lookup_vendor@1`, "Create grant" | the POST; `status` "Grant created."; list `hits` 2 |
| 3 "Confirm for the newest version" (first row) | `status` "Grant confirmed for the newest version."; `hits` 3; the row ends `active`, without that button |
| 4 "Revoke" (`u_bob` row) | `status` "Grant revoked."; `hits` 4; the row ends `revoked`, without buttons |

## Policies (`test_policy_loads_validates_and_deploys`)

`REC`, `SRC`, `V`: test-plan.md § Policies. Replies: `policies` GET `HOLD`, `(500, INTERNAL)`, `(200, {"current": null, "pendingGrants": 1})`, `(200, {"current": REC, "pendingGrants": 0})`; `policies/validate` `(200, {"ok": false, "policySetVersion": null, "problems": [PARSE]})` with `PARSE` `{"stage": "parse", "ids": [], "message": "unexpected end of input"}`, then `(200, {"ok": true, "policySetVersion": V, "problems": []})`; `policies/deploy` `(422, OPERATION_REFUSED, {"reason": "policy_invalid", "problems": [{"stage": "policy", "ids": ["t-1"], "message": ""}]})`, then `(201, REC)`.

| step | observable result (the strings of the scenario, and) |
|---|---|
| 1 `goto("/admin/policies")`; 2 `reload()` | `main` holds a `status` "Loading", then an `alert`; "Validate" and "Deploy" are `aria-disabled="true"` both times |
| 3 `reload()` | textarea "Hand-written Cedar" empty; buttons enabled |
| 4 fill `permit (`, "Validate"; fill `SRC`, "Validate" | the first body is `{"source": "permit ("}`; the `status` texts |
| 5 "Deploy" twice | body `{"source": SRC}` both times; the `alert`, then the `status`, a new `Idempotency-Key` and GET `hits` 4 |
