# Questions — add-web-sign-in

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | accepted | 4.2 | technical | stack.db.test.ts asserts one tenant; the frozen tests at lines 205 and 274/318 now contradict the shipped tenant-b part (stop at line 205) |
| Q-002 | answered | none | verdict | Criterion C-d115a25a (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-a699ddc9 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-c3f18eb0 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated): accept as satisfied? |
| Q-005 | answered | none | verdict | Criterion C-67c1baa1 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session): accept as satisfied? |
| Q-006 | answered | none | verdict | Criterion C-6e84f9b2 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused): accept as satisfied? |
| Q-007 | answered | none | verdict | Criterion C-4faae006 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept): accept as satisfied? |
| Q-008 | open | none | verdict | Criterion C-a76b8eac (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable): accept as satisfied? |
| Q-009 | answered | none | verdict | Hold H-545ec45b: UI criterion C-01e427f8 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-e3f87d2a: UI criterion C-e78811f4 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-2023e80e: UI criterion C-cef4634b has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-d7fe3aa5: UI criterion C-22c98964 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-2135a2da: UI criterion C-023c2efe has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-8928b203: UI criterion C-5368eb23 has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-f279e66d: UI criterion C-3809dcd7 has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-aa40376f: UI criterion C-b4adf358 has no end-to-end test; see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-bede43a4: UI criterion C-eb130cb7 has no end-to-end test; see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-499b792b: UI criterion C-4b09fc8c has no end-to-end test; see the generated UI tests table |
| Q-019 | open | none | verdict | Hold H-9f7f3848: UI criterion C-77971a2d has no end-to-end test; see the generated UI tests table |
| Q-020 | open | none | verdict | Hold H-ad0fc545: UI criterion C-53df20c1 has no end-to-end test; see the generated UI tests table |
| Q-021 | open | none | verdict | Hold H-74d8aa3c: UI criterion C-c79d9365 has no end-to-end test; see the generated UI tests table |
| Q-022 | open | none | verdict | Hold H-a83fac20: UI criterion C-812ae263 has no end-to-end test; see the generated UI tests table |
| Q-023 | open | none | verdict | Hold H-39317e01: UI criterion C-c1ed19d8 has no end-to-end test; see the generated UI tests table |
| Q-024 | open | none | verdict | Hold H-b94b73e6: UI criterion C-39471a6a has no end-to-end test; see the generated UI tests table |
| Q-025 | open | none | verdict | Hold H-10718ca8: UI criterion C-bf32f3ba has no end-to-end test; see the generated UI tests table |
| Q-026 | open | none | verdict | Hold H-82663866: UI criterion C-79192192 has no end-to-end test; see the generated UI tests table |
| Q-027 | open | none | verdict | Hold H-836c11cc: UI criterion C-d115a25a has no end-to-end test; see the generated UI tests table |
| Q-028 | open | none | verdict | Hold H-8f91a4e8: UI criterion C-a699ddc9 has no end-to-end test; see the generated UI tests table |
| Q-029 | open | none | verdict | Hold H-f0134794: UI criterion C-c3f18eb0 has no end-to-end test; see the generated UI tests table |
| Q-030 | open | none | verdict | Hold H-6e0d90dd: UI criterion C-67c1baa1 has no end-to-end test; see the generated UI tests table |
| Q-031 | open | none | verdict | Hold H-37f34a81: UI criterion C-6e84f9b2 has no end-to-end test; see the generated UI tests table |
| Q-032 | open | none | verdict | Hold H-7cb33059: UI criterion C-4faae006 has no end-to-end test; see the generated UI tests table |
| Q-033 | open | none | verdict | Hold H-7c2702b1: UI criterion C-a76b8eac has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: stack.db.test.ts asserts one tenant; the frozen tests at lines 205 and 274/318 now contradict the shipped tenant-b part (stop at line 205)

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The conflict is real: database-part.ts seed drops and recreates the database then ensures only the default tenant, reset.ts re-runs every part's seed, stack.ts discovers the shipped parts, and task 4.2 makes the tenant-b seed insert Tenant B, so the real stack holds two tenants after start and after
- **Blocking tasks:** 4.2
- **Kind:** technical
- **Asked:** 2026-10-30T04:25Z by glm, run r-20261030T0247Z-7d77, task 4.2

### Context
test/support/e2e-stack/stack.db.test.ts:205 asserts 'the seed created exactly one tenant' (tenants.length === 1) and :274/:318 assert the seeded tenant count stays 1, but this unit's criterion C-39471a6a requires test/support/e2e-stack/parts/27-tenant-b.ts to exist and be discovered, and its seed (decision 12, criterion C-812ae263 and later C-79192192) inserts tenant 'Tenant B' into the shipped stack, so the real stack now legitimately holds two tenants (E2E tenant and tenant_b) after start and after every reset. The two stack.db tests are frozen and previously green; I changed nothing in them. Expected edit consistent with the spec: C-d194233f's tenant assertion (line 205) would additionally require tenant_b with review_profile 'solo' to be present, and C-f55456d0's assertions (lines 273-276 and 317-319) would expect the two seeded tenants (default plus tenant_b) both before the probe and after each reset, comparing the tenant id sets instead of a single id.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/stack.db.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-sign-in`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit test/support/e2e-stack/stack.db.test.ts: change the one-tenant assertions at lines 205, 274 and 318 so they accept the default tenant plus tenant B (both with their own review_profile 'solo' check), keep the reset idempotence assertions, and unfreeze exactly these two tests (C-d194233f and C-f55456d0) for this task.

### Clarifier suggestion
Edit `test/support/e2e-stack/stack.db.test.ts`: change the one-tenant assertions at lines 205, 274 and 318 so they accept the default tenant plus tenant B (both with their own review_profile 'solo' check), keep the reset idempotence assertions, and unfreeze exactly these two tests (C-d194233f and C-f55456d0) for this task.

### Answer
<!-- write below this line -->

---

## Q-002: Criterion C-d115a25a (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-d115a25a (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant)

### Context
Criterion C-d115a25a (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Alice signs in and the header shows user and tenant) is needs human after round 3.

Scenario:
\- **WHEN** `login(page, users["alice"])` runs inside `page.expect_response` for the 200 answer of `/api/v1/me`
\- **THEN** that answer's `capabilities` contain `read_self`; the banner contains "Signed in as Alice Example" and "Tenant: E2E tenant" and a button "Sign out"; `assert_accessible(page)` passes on the landing page

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_sign_in::test_c_d115a25a_alice_signs_in_and_the_header_shows_user_and_tenant[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The browser test for C-d115a25a runs login(page, users["alice"]) inside page.expect_response for the 200 answer of /api/v1/me, asserts that the answer's capabilities contain read_self, that the banner contains "Signed in as Alice Example" and "Tenant: E2E tenant", that a "Sign out" button is visible in the banner, and then calls assert_accessible(page) on the landing page: every clause of the scenario, word for word. The production code backs it: Shell.tsx renders AccountMenu inside the header element, which is the banner landmark; accountView maps a ready session to the display name and tenant name from /me; AccountMenu renders "Signed in as", "Tenant:" and a type="button" labelled "Sign out". The Node test stack.seed.test.ts proves through the real stack that alice's /me body names "Alice Example", "E2E tenant" and read_self. The only reason the verifier ignored the browser test is the missing red record, and the generated-test writer timed out; neither is a defect of the code or of the test's assertions. The pending lint failure in stack.seed.test.ts is unrelated to this criterion.
---

## Q-003: Criterion C-a699ddc9 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-a699ddc9 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart)

### Context
Criterion C-a699ddc9 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Two tenants stay apart) is needs human after round 3.

Scenario:
\- **WHEN** alice signs in on one page and mallory signs in on a page of a second `browser.new_context`
\- **THEN** mallory's banner contains `users["mallory"]["displayName"]` and "Tenant B" and neither "E2E tenant" nor "Alice Example"; alice's page still shows "Alice Example" and "E2E tenant"

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_sign_in::test_c_a699ddc9_two_tenants_stay_apart[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The browser test for C-a699ddc9 signs alice in on the fixture page, opens a second browser.new_context with the same base URL, signs mallory in on a page of that context, and asserts that mallory's banner contains users["mallory"]["displayName"] and "Tenant B" and contains neither "E2E tenant" nor "Alice Example"; after closing the second context it asserts that alice's banner still contains "Alice Example" and "E2E tenant". That is every clause of the scenario, word for word. The production code backs it: Shell.tsx renders AccountMenu inside the header element, which is the banner landmark; accountView maps a ready session to me.user.displayName and me.tenant.name from /me; AccountMenu renders "Signed in as" and "Tenant:" with those two values. The tenant-b stack part seeds "Tenant B" with organisation org-b and serves mallory's display name from the fake's minted name claim, and the Node test stack.seed.test.ts proves through the real stack that alice's /me body names "Alice Example" and "E2E tenant" without "Tenant B" while mallory's names "Tenant B" without "E2E tenant". The only reason the verifier ignored the browser test is the missing red record, which is not a defect of the code or of the test's assertions. The pending lint failure is unrelated to this criterion.
---

## Q-004: Criterion C-c3f18eb0 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-c3f18eb0 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated)

### Context
Criterion C-c3f18eb0 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A request without a session is unauthenticated) is needs human after round 3.

Scenario:
\- **WHEN** `playwright.request.new_context` sends `GET /api/v1/me` with no cookie
\- **THEN** the answer is 401 with `error.code` `UNAUTHENTICATED`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_sign_in::test_c_c3f18eb0_a_request_without_a_session_is_unauthenticated (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The browser test for C-c3f18eb0 opens a playwright.request.new_context on the base URL, sends GET /api/v1/me with no cookie, and asserts that the status is 401 and that the body's error.code is UNAUTHENTICATED: every clause of the scenario, word for word. The production code backs it: /api/v1/me is defined as a session route, the session verifier returns null when the request carries no session cookie that resolves to a session, and the authentication hook turns a null verifier result into a 401 ApiError with code UNAUTHENTICATED. The Node test that starts the real stack with its shipped parts also sends /api/v1/me with no cookie header and asserts 401 and UNAUTHENTICATED, so the behaviour is proved without a browser as well. The only reason the verifier ignored the browser test is the missing red record, and the generated end-to-end test could not be collected because the app does not start without the unit's conftest; neither is a defect of the code or of the test's assertions. The pending lint failure concerns an unused assignment in a different test and does not touch this criterion.
---

## Q-005: Criterion C-67c1baa1 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-67c1baa1 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session)

### Context
Criterion C-67c1baa1 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › Sign out ends the session) is needs human after round 3.

Scenario:
\- **WHEN** alice clicks "Sign out"
\- **THEN** the page ends on the path `/sign-in` with the button "Sign in" visible, and `page.request.get("/api/v1/me")` is 401

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_sign_in::test_c_67c1baa1_sign_out_ends_the_session[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The browser test for C-67c1baa1 signs alice in, clicks the "Sign out" button inside the banner, then asserts that the button "Sign in" (exact name) is visible, that the path of the page URL is /sign-in, and that page.request.get("/api/v1/me") answers 401: every clause of the scenario, word for word. The production code backs each step: AccountMenu renders the "Sign out" button and on a redirect result calls window.location.assign with the returned URL; signOut posts /auth/oidc/logout through the CSRF-adding logout client, resets the loader and returns the provider redirect only when safeRedirect allows it, otherwise /sign-in; the server logout route revokes the session, clears the session cookie and sets post_logout_redirect_uri to <publicBaseUrl>/sign-in, and the fake provider's logout endpoint answers 302 to that URI. The Node test stack.seed.test.ts proves on the real stack that after a logout with the CSRF header the same cookie gets 401 from /api/v1/me. The browser test passed in the latest run; the verifier ignored it only for the missing red record and the failed generated-test writer, neither of which is a defect of the code or of the test's assertions. The pending lint failure concerns an unused assignment in stack.seed.test.ts and does not touch this criterion.
---

## Q-006: Criterion C-6e84f9b2 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-6e84f9b2 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused)

### Context
Criterion C-6e84f9b2 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › A post without the CSRF header is refused) is needs human after round 3.

Scenario:
\- **WHEN** alice is signed in and `page.request.post("/auth/oidc/logout")` is sent without the header, then the page is reloaded
\- **THEN** the answer is 403 with `error.code` `OIDC_CSRF_INVALID` and the banner still shows "Alice Example"

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_sign_in::test_c_6e84f9b2_a_post_without_the_csrf_header_is_refused[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The browser test for C-6e84f9b2 signs alice in, sends page.request.post("/auth/oidc/logout") with no header, asserts that the status is 403 and that the body's error.code is OIDC_CSRF_INVALID, then reloads the page and asserts that the banner still contains "Alice Example": every clause of the scenario, word for word. The production code backs it: the logout route resolves the session from the cookie, reads x-csrf-token, and when verifyCsrfToken returns false it answers 403 with the OIDC_CSRF_INVALID envelope and returns before revokeSession runs, so the session survives the refused post and the header still shows alice after a reload; verifyCsrfToken returns false for a missing or empty token. The Node test stack.seed.test.ts proves on the real stack that a logout without the header is 403 OIDC_CSRF_INVALID and that the same cookie is still accepted by the following logout with the header, so the session was not ended by the refusal. The verifier ignored the browser test only because it has no red record, and the generated test failed at head for reasons that the judge attributed to the generated test rather than the implementation; neither is a defect of the code or of the test's assertions. The pending lint failure concerns an unused assignment in stack.seed.test.ts and does not touch this criterion.
---

## Q-007: Criterion C-4faae006 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-4faae006 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept)

### Context
Criterion C-4faae006 (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The return path is kept) is needs human after round 3.

Scenario:
\- **WHEN** `login(page, users["alice"], "/sign-in?error=SESSION_ENDED&return_to=%2Fflows")` runs
\- **THEN** the page ends on the path `/flows` and the banner shows "Alice Example"

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_sign_in::test_c_4faae006_the_return_path_is_kept[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. The browser test for C-4faae006 calls login(page, users["alice"], "/sign-in?error=SESSION_ENDED&return_to=%2Fflows"), waits until the page URL's path is /flows, and asserts that the banner contains "Alice Example": every clause of the scenario, word for word. The production code backs each step of the round trip. On the sign-in page, signInView parses return_to through safeReturnTo, which keeps /flows, and builds the login href /auth/oidc/login?return_to=%2Fflows, which the Sign in button assigns. The server login route sanitizes return_to with sanitizeReturnTo, which keeps a same-origin path not under /auth/, stores it in the sealed login cookie, and the callback route answers 302 to state.returnTo after creating the session. The static handler serves /flows as the SPA because the path matches no file and has no asset extension, so index.html is returned; the router renders the not-found route inside the Shell, whose header holds AccountMenu, and accountView maps the ready session to "Signed in as Alice Example". The Node tests sign-in-page.test.ts and return-to.test.ts cover the client-side mapping of exactly this search string. The verifier ignored the browser test only because it has no red record, and the generated test it cites is not in the tree; the judge attributed that failure to the generated tests rather than the implementation, and the e2e gate with the M1 journey passes. The pending lint failure concerns an unused assignment in stack.seed.test.ts and does not touch this criterion.
---

## Q-008: Criterion C-a76b8eac (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-a76b8eac (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable)

### Context
Criterion C-a76b8eac (web-auth › The M1 journey proves sign-in, tenant isolation and sign-out › The sign-in and sign-out buttons are keyboard reachable) is needs human after round 3.

Scenario:
\- **WHEN** on `/sign-in` signed out, once the button "Sign in" is visible, Tab is pressed up to 15 times until it is focused; then alice signs in and the same is done for "Sign out"
\- **THEN** each button becomes focused, its computed `outlineStyle` is not `none` and its `outlineWidth` is at least 2px

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m1_sign_in::test_c_a76b8eac_the_sign_in_and_sign_out_buttons_are_keyboard_reachable[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-545ec45b: UI criterion C-01e427f8 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-01e427f8 has no end-to-end test; see the generated UI tests table

Step 5 for C-01e427f8: not_testable after 1 attempt(s); The criterion checks internal module functions (registerSignInMessages, messageFor, catalogue order and lengths) that are not exposed to the browser UI; only partial message text is user-visible on the sign-in page, so the full criterion cannot be asserted through the web interface..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived: criterion C-01e427f8 is not a browser criterion. Its scenario calls registerSignInMessages twice and messageFor for each code of SIGN_IN_ERROR_CODES, checks the order of the ten codes, the pairwise distinct texts of 1 to 200 characters, that each answer equals its SIGN_IN_MESSAGES entry and differs from FALLBACK_MESSAGE, and that UNKNOWN_ERROR gives the fallback. None of those names is reachable from a web page, so the generated end-to-end writer was right to report it as not testable through the browser, and that is not a defect. The Node test in web/src/auth/messages.test.ts asserts every clause of the scenario word for word and passed in the latest report, and the implementation in web/src/auth/messages.ts holds the ten codes in the specified order, the twelve texts, and a registerSignInMessages that delegates to the kit's registerMessages, which is idempotent because re-registering an identical text is allowed. The feature file 15-sign-in.tsx calls registerSignInMessages at load, and the user-visible part of the catalogue is already proved in the browser by the M1 journey, which opens /sign-in?error=OIDC_USER_DISABLED and asserts the alert text "Your account is disabled. Ask an administrator." The pending lint failure concerns an unused assignment in stack.seed.test.ts and does not touch this criterion.
---

## Q-010: Hold H-e3f87d2a: UI criterion C-e78811f4 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-e78811f4 has no end-to-end test; see the generated UI tests table

Step 5 for C-e78811f4: not_testable after 1 attempt(s); The criterion asserts the exact contents of the internal SIGN_IN_MESSAGES export; via the browser only 10 of the 12 texts can surface (OIDC_CSRF_INVALID and OIDC_NOT_CONFIGURED are not accepted by the sign-in page and fall back), so the full twelve-entry catalogue is not observable through the UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-2023e80e: UI criterion C-cef4634b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-cef4634b has no end-to-end test; see the generated UI tests table

Step 5 for C-cef4634b: not_testable after 1 attempt(s); The criterion asserts exact outputs of pure helper functions (loginUrl/signInUrl) for arbitrary hostile inputs; these values are not observable through the browser UI, which only exposes a single sign-in link/href..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-d7fe3aa5: UI criterion C-22c98964 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-22c98964 has no end-to-end test; see the generated UI tests table

Step 5 for C-22c98964: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_22c98964::test_external_return_to_is_refused[chromium], test_l4_c_22c98964::test_failed_session_offers_sign_in_to_root[chromium], test_l4_c_22c98964::test_html_error_code_shows_unknown_error[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-2135a2da: UI criterion C-023c2efe has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-023c2efe has no end-to-end test; see the generated UI tests table

Step 5 for C-023c2efe: not_testable after 1 attempt(s); This criterion tests internal JavaScript function behavior (withCsrfHeader wrapping a recording fetch, isStateChanging) at the unit level; it is not observable through the browser UI that an e2e Playwright test can assert..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-8928b203: UI criterion C-5368eb23 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-5368eb23 has no end-to-end test; see the generated UI tests table

Step 5 for C-5368eb23: not_testable after 1 attempt(s); The scenario checks injected fakes (fake fetch records, recording location.assign counts, csrfTokenFrom returns) of internal session-client functions, none of which are observable through the app UI at L4_E2E_BASE_URL..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-f279e66d: UI criterion C-3809dcd7 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-3809dcd7 has no end-to-end test; see the generated UI tests table

Step 5 for C-3809dcd7: not_testable after 1 attempt(s); The criterion covers internal withSessionEnd wrapper semantics against fakes (onEnded counting, response codes), which is not observable through the browser UI that a Playwright e2e test can drive..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-aa40376f: UI criterion C-b4adf358 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-b4adf358 has no end-to-end test; see the generated UI tests table

Step 5 for C-b4adf358: not_testable after 1 attempt(s); The criterion checks an internal pure function (redirectToSignIn) with a mocked recording location.assign across four synthetic location objects; this behavior is not exposed on window nor observable through the browser UI in an e2e test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-bede43a4: UI criterion C-eb130cb7 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-eb130cb7 has no end-to-end test; see the generated UI tests table

Step 5 for C-eb130cb7: not_testable after 1 attempt(s); The criterion asserts pure-function results for a fixed safeRedirect input list and an exact loader.reset() call count behind a mocked loader; these are internal unit behaviors with no browser-observable surface for a playwright e2e test to drive..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-018: Hold H-499b792b: UI criterion C-4b09fc8c has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-4b09fc8c has no end-to-end test; see the generated UI tests table

Step 5 for C-4b09fc8c: not_testable after 1 attempt(s); The criterion asserts internal call counts and ordering (post twice, reset before load) and the exact return value of signOut, which are unit-level behaviors not observable through the browser UI or network alone..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-019: Hold H-9f7f3848: UI criterion C-77971a2d has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-77971a2d has no end-to-end test; see the generated UI tests table

Step 5 for C-77971a2d: not_testable after 1 attempt(s); The criterion checks the internal return-value shapes of browserSession.signOut() and loader reset call counts, which are not observable through the browser UI; a Playwright e2e test can only see toasts or navigation, not those result objects..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-020: Hold H-ad0fc545: UI criterion C-53df20c1 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-53df20c1 has no end-to-end test; see the generated UI tests table

Step 5 for C-53df20c1: not_testable after 1 attempt(s); The criterion is a static source-scan check (raw colours, kit tokens, inline styles in auth.css and .tsx files) with no user-observable browser outcome to assert via the public interface..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-021: Hold H-74d8aa3c: UI criterion C-c79d9365 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-c79d9365 has no end-to-end test; see the generated UI tests table

Step 5 for C-c79d9365: not_testable after 1 attempt(s); The criterion covers Node-side collectSeedData merging/error behavior, which is not observable through the browser page the e2e test must drive..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-022: Hold H-a83fac20: UI criterion C-812ae263 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-812ae263 has no end-to-end test; see the generated UI tests table

Step 5 for C-812ae263: not_testable after 1 attempt(s); The criterion describes server-side seeding and tenant-resolution functions (oidcPart.seed, tenantBPart.seed, ensureDefaultTenant, resolveTenantForToken) run against withTestDatabase, which are not observable through a browser UI via playwright; it cannot be checked as a browser e2e test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-023: Hold H-39317e01: UI criterion C-c1ed19d8 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-c1ed19d8 has no end-to-end test; see the generated UI tests table

Step 5 for C-c1ed19d8: not_testable after 1 attempt(s); The criterion asserts server-side seed data (stored passwords equal to fake.passwordOf, handle.env == {}, no password in any env) that is not observable through the browser UI; display name and tenant could only surface after a sign-in whose fake-IdP flow is not specified here..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-024: Hold H-b94b73e6: UI criterion C-39471a6a has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-39471a6a has no end-to-end test; see the generated UI tests table

Step 5 for C-39471a6a: not_testable after 1 attempt(s); The criterion concerns discoverParts() ordering and a parts/27-tenant-b.ts file export, which are build/harness file-system details not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-025: Hold H-10718ca8: UI criterion C-bf32f3ba has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-bf32f3ba has no end-to-end test; see the generated UI tests table

Step 5 for C-bf32f3ba: not_testable after 2 attempt(s); The control listener binds its own ephemeral port outside the L4_E2E_BASE_URL origin, and a browser page/request cannot forge the Host header or Origin, so these cases cannot be reached through the public e2e interface..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-026: Hold H-82663866: UI criterion C-79192192 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-79192192 has no end-to-end test; see the generated UI tests table

Step 5 for C-79192192: writer_failed after 1 attempt(s); the stream ended without a final stop (last reason: length).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-027: Hold H-836c11cc: UI criterion C-d115a25a has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-d115a25a has no end-to-end test; see the generated UI tests table

Step 5 for C-d115a25a: writer_failed after 1 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-028: Hold H-8f91a4e8: UI criterion C-a699ddc9 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-a699ddc9 has no end-to-end test; see the generated UI tests table

Step 5 for C-a699ddc9: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_a699ddc9::test_two_tenants_stay_apart[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-029: Hold H-f0134794: UI criterion C-c3f18eb0 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-c3f18eb0 has no end-to-end test; see the generated UI tests table

Step 5 for C-c3f18eb0: uncollectable after 2 attempt(s); the app does not start without the unit's test and support files (reverted: e2e/conftest.py).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-030: Hold H-6e0d90dd: UI criterion C-67c1baa1 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-67c1baa1 has no end-to-end test; see the generated UI tests table

Step 5 for C-67c1baa1: writer_failed after 2 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-031: Hold H-37f34a81: UI criterion C-6e84f9b2 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-6e84f9b2 has no end-to-end test; see the generated UI tests table

Step 5 for C-6e84f9b2: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_6e84f9b2::test_logout_without_csrf_header_is_refused[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-032: Hold H-7cb33059: UI criterion C-4faae006 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-4faae006 has no end-to-end test; see the generated UI tests table

Step 5 for C-4faae006: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_4faae006::test_return_path_is_kept[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-033: Hold H-7c2702b1: UI criterion C-a76b8eac has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.51 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-a76b8eac has no end-to-end test; see the generated UI tests table

Step 5 for C-a76b8eac: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_a76b8eac::test_sign_in_and_sign_out_buttons_are_keyboard_reachable[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
