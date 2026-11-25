# Questions — add-web-shell-followup-1

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
| Q-001 | answered | 1.1 | ambiguous | Does the new client page gate supersede the existing server-403 page for every capability-gated feature, including /admin/users? |
| Q-002 | answered | none | verdict | Criterion C-0daf92cd (web-shell › The shell is accessible and works for deep links › Deep link): accept as satisfied? |
| Q-003 | answered | none | verdict | Hold H-906ac7b8: UI criterion C-8c08d9f5 has no end-to-end test; see the generated UI tests table |
| Q-004 | answered | none | verdict | Hold H-63c43a31: UI criterion C-ba861867 has no end-to-end test; see the generated UI tests table |
| Q-005 | answered | none | verdict | Hold H-09eadad5: UI criterion C-61225ade has no end-to-end test; see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-1e0bd82b: UI criterion C-383b59d1 has no end-to-end test; see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-0985c18b: UI criterion C-b2a74658 has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-6ef26063: UI criterion C-62803105 has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-2728a6c4: UI criterion C-1dc68043 has no end-to-end test; see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-58e2ae8f: UI criterion C-946ba56d has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-48e0af78: UI criterion C-a91f316f has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-ea0c714e: UI criterion C-31ad3638 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-52fb78e9: UI criterion C-56d1014e has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-b6e7298f: UI criterion C-967db51d has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-47716b03: UI criterion C-1b33755d has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-97cf2238: UI criterion C-2c3a693b has no end-to-end test; see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-779f9167: UI criterion C-12290cf5 has no end-to-end test; see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-d11a2f1a: UI criterion C-76b2dd3e has no end-to-end test; see the generated UI tests table |
| Q-019 | open | none | verdict | Hold H-a9a507d1: UI criterion C-0a8a6d93 has no end-to-end test; see the generated UI tests table |
| Q-020 | open | none | verdict | Hold H-b13fd3f9: UI criterion C-5e6db9ca has no end-to-end test; see the generated UI tests table |
| Q-021 | open | none | verdict | Hold H-588fcaa4: UI criterion C-5752eaaf has no end-to-end test; see the generated UI tests table |
| Q-022 | open | none | verdict | Hold H-0dc1e5e8: UI criterion C-34823202 has no end-to-end test; see the generated UI tests table |
| Q-023 | open | none | verdict | Hold H-4d9dbae6: UI criterion C-abaa85a3 has no end-to-end test; see the generated UI tests table |
| Q-024 | open | none | verdict | Hold H-24df25dc: UI criterion C-0daf92cd has no end-to-end test; see the generated UI tests table |
| Q-025 | open | none | verdict | Hold H-696b9b0b: UI criterion C-b5ce03f4 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Does the new client page gate supersede the existing server-403 page for every capability-gated feature, including /admin/users?

- **Status:** answered
- **Blocking tasks:** 1.1
- **Kind:** ambiguous
- **Asked:** 2026-11-25T18:31Z by deepseek-free, run r-20261125T1822Z-dd0f, task 1.1

### Context
C-8c08d9f5 says that a signed-in user whose /me capabilities lack a feature's capability, opening that feature's path directly, sees only a not-allowed panel and sends none of the feature's API requests. The existing web-admin spec scenario 'Alice sees a 403 page with the decision id' (and e2e/test_m2_admin.py C-652f54b7) has the same WHEN for /admin/users: Alice lacks manage_users_roles, opens /admin/users by address, and the THEN requires the page to send the request and show the server FORBIDDEN alert with 'Decision id:' and the 'Copy decision id' button. Applying the new gate to every capability-gated feature makes that request impossible, so both criteria cannot hold. The follow-up proposal scopes the impact to add-web-shell and does not list the web-admin test as changing in place.

### Options
1. Apply the gate to every capability-gated feature; the web-admin /admin/users scenario and its e2e test are superseded and must change.
2. Apply the gate only where no server decision id is expected (for example /admin/grants), leaving /admin/users and its server-403 page unchanged.
3. Something else (describe the intended scope).

### Answer
<!-- write below this line -->
Option 3. Apply the client page gate to every capability-gated feature EXCEPT where an accepted requirement already specifies the server 403 page with its decision id. Today that is /admin/users: web-admin's scenario 'Alice sees a 403 page with the decision id' and e2e/test_m2_admin.py C-652f54b7. Such features keep today's behaviour and their tests stay unedited: they send the request and show the server FORBIDDEN alert with 'Decision id:' and 'Copy decision id'. For every other capability-gated feature (for example /admin/grants), a signed-in user without the capability sees only the not-allowed panel and none of the feature's API requests are sent. Name the excepted features explicitly in the spec and in the code (a list, not a heuristic), and add a test proving /admin/users still sends its request.

---

## Q-002: Criterion C-0daf92cd (web-shell › The shell is accessible and works for deep links › Deep link): accept as satisfied?

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-0daf92cd (web-shell › The shell is accessible and works for deep links › Deep link)

### Context
Criterion C-0daf92cd (web-shell › The shell is accessible and works for deep links › Deep link) is needs human after round 1.

Scenario:
\- **WHEN** the journey opens `/flows`
\- **THEN** the link "Ursitoare" in the banner and the heading "Page not found" are visible, the page title is `Page not found · Ursitoare`, and the response status is 200

Why: uncovered: no adequate discriminating test traces it
Judge: insufficient_evidence
Tracing tests: none
Ignored tests: test_l4_c_0daf92cd::test_deep_link_not_found_shell[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_deep_link_returns_the_app[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The scenario text is stale: it names /flows, which became a real page in later milestones, while the frozen test test_m0_skeleton::test_deep_link_returns_the_app opens /no-such-page-deep-link and passes at head in the full e2e gate. The generated test followed the stale text, so its failure says nothing about this diff. This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. The stale scenario text is on the delegate's hardening list.
---

## Q-003: Hold H-906ac7b8: UI criterion C-8c08d9f5 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-8c08d9f5 has no end-to-end test; see the generated UI tests table

Step 5 for C-8c08d9f5: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_8c08d9f5::test_author_opening_admin_grants_sees_only_not_allowed_panel[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept Evidence (delegate, 2026-11-26): the unit's browser tests in e2e/test_m2_admin.py ran through the CI e2e build and stack in a node:24 container. At head cce8d752 all 7 passed in two runs. At base 6ef3fbd2, with head's test file, test_c_8c08d9f5_alice_sees_only_the_not_allowed_panel_on_grants FAILED: the Grants heading and the New grant form rendered behind the alert. The two guard tests (carol still opens Grants; alice still sends the /admin/users request) pass on both, as guards should. The head screenshots, looked at by the delegate, show alice on /admin/grants seeing only the Not allowed panel and sending no grants request, while /admin/users still shows the server's FORBIDDEN alert with a decision id and Copy decision id. The generated test for this criterion fails at head for a generator reason; the hand-written test above traces the criterion and discriminates.
---

## Q-004: Hold H-63c43a31: UI criterion C-ba861867 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-ba861867 has no end-to-end test; see the generated UI tests table

Step 5 for C-ba861867: not_testable after 1 attempt(s); Needs a buildServer instance with a throwing route, ApiError route and invalid-JSON POST; those routes don't exist in the served e2e stack, so this is a server unit test, not a browser check..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-005: Hold H-09eadad5: UI criterion C-61225ade has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-61225ade has no end-to-end test; see the generated UI tests table

Step 5 for C-61225ade: not_testable after 1 attempt(s); Criterion concerns a server-side registerSecurityHeaders call and a route setting its own CSP, plus a SECURITY_HEADERS constant; none are observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-006: Hold H-1e0bd82b: UI criterion C-383b59d1 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-383b59d1 has no end-to-end test; see the generated UI tests table

Step 5 for C-383b59d1: not_testable after 1 attempt(s); The criterion fixes the contents of distDir (index-Ab3dEf9Z.js, favicon.svg), which an e2e test against the served stack cannot set. It also needs raw HEAD and header checks that a browser page does not expose..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-007: Hold H-0985c18b: UI criterion C-b2a74658 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b2a74658 has no end-to-end test; see the generated UI tests table

Step 5 for C-b2a74658: not_testable after 1 attempt(s); Criterion is about pure engine functions (isAssetName, contentTypeFor, cacheControlFor) with specific inputs; not reachable via the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-008: Hold H-6ef26063: UI criterion C-62803105 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-62803105 has no end-to-end test; see the generated UI tests table

Step 5 for C-62803105: not_testable after 1 attempt(s); The scenario needs a data.bin file placed in the engine's distDir. The browser e2e suite serves a fixed web build, so it cannot create that file or point the engine at a different directory..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-009: Hold H-2728a6c4: UI criterion C-1dc68043 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-1dc68043 has no end-to-end test; see the generated UI tests table

Step 5 for C-1dc68043: not_testable after 1 attempt(s); classifyWebPath is an internal server-side function with no browser-observable surface; the criterion is about its return values on raw strings, which a unit test covers, not an e2e page test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-010: Hold H-58e2ae8f: UI criterion C-946ba56d has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-946ba56d has no end-to-end test; see the generated UI tests table

Step 5 for C-946ba56d: not_testable after 2 attempt(s); Depends on an exact 404 body defined elsewhere and not shown; concerns server routing the UI-only diff does not touch..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-011: Hold H-48e0af78: UI criterion C-a91f316f has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a91f316f has no end-to-end test; see the generated UI tests table

Step 5 for C-a91f316f: not_testable after 1 attempt(s); The criterion needs a route registered in server code after registerWebApp. The e2e stack serves a fixed app and a browser test cannot register that route, so it can't be checked from outside..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept This follow-up changes only App.tsx, which wraps each feature element in FeaturePage: an explicit SERVER_GATED_FEATURES list holds admin-users; the session loading state is shown; a ready session without the feature's capability gets the Not allowed panel. useSession reads the shared capabilityLoader, so no extra /me request is made. The full e2e gate passed at head, so every page's browser tests still pass behind the gate. This criterion is a shell property the generator found not testable in a browser. It is covered by its passing Node tests and by the full e2e gate at head, and the gate does not change it for a user who holds the capability.
---

## Q-012: Hold H-ea0c714e: UI criterion C-31ad3638 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-31ad3638 has no end-to-end test; see the generated UI tests table

Step 5 for C-31ad3638: not_testable after 1 attempt(s); Needs the engine's distDir removed and index.html created at runtime and the isWebBuilt function called; a browser test against the already-built served origin cannot do this..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-52fb78e9: UI criterion C-56d1014e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-56d1014e has no end-to-end test; see the generated UI tests table

Step 5 for C-56d1014e: not_testable after 1 attempt(s); Needs the server started with a distDir holding only secret.txt; the e2e stack serves a real build and a browser test cannot reconfigure it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-b6e7298f: UI criterion C-967db51d has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-967db51d has no end-to-end test; see the generated UI tests table

Step 5 for C-967db51d: not_testable after 1 attempt(s); Concerns server-side registerWebApp API errors (WebAppError codes); not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-47716b03: UI criterion C-1b33755d has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-1b33755d has no end-to-end test; see the generated UI tests table

Step 5 for C-1b33755d: not_testable after 1 attempt(s); Requires running main() with an empty temp webDist and capturing server log lines; the e2e stack serves a built app, so this is not observable through the browser..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-97cf2238: UI criterion C-2c3a693b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2c3a693b has no end-to-end test; see the generated UI tests table

Step 5 for C-2c3a693b: not_testable after 1 attempt(s); Criterion concerns the server composition root's `main` with injected loadConfig/openDatabase, exit codes and fatal logs; not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-779f9167: UI criterion C-12290cf5 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-12290cf5 has no end-to-end test; see the generated UI tests table

Step 5 for C-12290cf5: not_testable after 1 attempt(s); Criterion concerns the ApiClient module with an injected fake fetch; it is not reachable through the built web page's public UI, so a browser e2e test cannot check it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-018: Hold H-d11a2f1a: UI criterion C-76b2dd3e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-76b2dd3e has no end-to-end test; see the generated UI tests table

Step 5 for C-76b2dd3e: not_testable after 1 attempt(s); Criterion is about the ApiClient module's unit-level behavior (injected fake fetch, RangeError before fetch, AbortError rethrow); not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-019: Hold H-a9a507d1: UI criterion C-0a8a6d93 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0a8a6d93 has no end-to-end test; see the generated UI tests table

Step 5 for C-0a8a6d93: not_testable after 1 attempt(s); Describes the in-memory feature registry's list()/nav() API on a fresh instance; not observable through the browser UI, so it is a unit-level check..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-020: Hold H-b13fd3f9: UI criterion C-5e6db9ca has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-5e6db9ca has no end-to-end test; see the generated UI tests table

Step 5 for C-5e6db9ca: not_testable after 1 attempt(s); Feature registry refusals are an in-memory TypeScript API (FeatureError, list()) with no browser-visible behavior; a Playwright e2e test cannot exercise it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-021: Hold H-588fcaa4: UI criterion C-5752eaaf has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-5752eaaf has no end-to-end test; see the generated UI tests table

Step 5 for C-5752eaaf: not_testable after 1 attempt(s); Feature registry list() and register() are internal module APIs, not reachable from the browser; no user-visible outcome in the UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-022: Hold H-0dc1e5e8: UI criterion C-34823202 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-34823202 has no end-to-end test; see the generated UI tests table

Step 5 for C-34823202: not_testable after 1 attempt(s); Compares two source-level constants (RESERVED_ROOTS in web/src/app/features.ts and src/api/web-paths.ts); no browser-observable behavior, so it is a unit test, not e2e..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-023: Hold H-4d9dbae6: UI criterion C-abaa85a3 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-abaa85a3 has no end-to-end test; see the generated UI tests table

Step 5 for C-abaa85a3: not_testable after 1 attempt(s); The criterion specifies a pure function's (healthView) input/output mapping, which is not observable through the browser UI; the diff shows no page behavior for it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-024: Hold H-24df25dc: UI criterion C-0daf92cd has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0daf92cd has no end-to-end test; see the generated UI tests table

Step 5 for C-0daf92cd: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_0daf92cd::test_deep_link_flows_shows_not_found_in_shell[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-025: Hold H-696b9b0b: UI criterion C-b5ce03f4 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b5ce03f4 has no end-to-end test; see the generated UI tests table

Step 5 for C-b5ce03f4: not_testable after 1 attempt(s); Checks Node-side stack part wiring (discoverParts, webPart.start with a hand-made context), not anything a user sees or does in the browser..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
