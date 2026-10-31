# Questions — add-admin-api

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
| Q-001 | accepted | 2.1 | technical | src/identity/admin/accounts.test.ts:224 asserts ADMIN_TENANT_MISMATCH without a foreign transaction, and its signIn helper cannot produce the asserted display names |
| Q-002 | accepted | 3.1 | technical | src/identity/admin/idp-links.test.ts:270 |
| Q-003 | answered | none | verdict | Criterion C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-96e47324 (api-conventions › Every error code is registered › The registry): accept as satisfied? |
| Q-005 | answered | none | verdict | Finding F-cde045de: No discriminating test for cross-tenant admin isolation |
| Q-006 | answered | none | verdict | Finding F-28a40cf9: Uncovered criterion C-598727de (Another tenant and a forged tenant) |
| Q-007 | answered | none | verdict | Finding F-c28b995d: Uncovered criterion C-96e47324 (The registry) at gate level |
| Q-008 | answered | none | verdict | Criterion C-8a23d872 (admin-api › Every admin route is a session route under the right action › The route table): accept as satisfied? |
| Q-009 | answered | none | verdict | Criterion C-a4888ef3 (admin-api › Every admin route is a session route under the right action › Who may call): accept as satisfied? |
| Q-010 | answered | none | verdict | Criterion C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant): accept as satisfied? |
| Q-011 | answered | none | verdict | Criterion C-cc3ddc89 (admin-api › Admin errors are registered codes › The mapping): accept as satisfied? |
| Q-012 | answered | none | verdict | Criterion C-e8ea1428 (admin-api › Admin errors are registered codes › Other errors pass through): accept as satisfied? |
| Q-013 | answered | none | verdict | Criterion C-7a958882 (admin-api › The app role may switch only its own tenant's review profile › Objects and privileges): accept as satisfied? |
| Q-014 | answered | none | verdict | Criterion C-32b7b36c (admin-api › Users are listed, read, disabled and enabled › List, page, filter, read): accept as satisfied? |
| Q-015 | answered | none | verdict | Criterion C-c6c6a2a5 (admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts): accept as satisfied? |
| Q-016 | answered | none | verdict | Criterion C-9733f98e (admin-api › Users are listed, read, disabled and enabled › Disable and enable): accept as satisfied? |
| Q-017 | answered | none | verdict | Criterion C-8087d00f (admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state): accept as satisfied? |
| Q-018 | answered | none | verdict | Criterion C-c102e454 (admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account): accept as satisfied? |
| Q-019 | answered | none | verdict | Criterion C-50b6b834 (admin-api › Service accounts are created, listed, disabled and given roles › No elevation): accept as satisfied? |
| Q-020 | answered | none | verdict | Criterion C-8b40a61c (admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse): accept as satisfied? |
| Q-021 | answered | none | verdict | Criterion C-09ace5ca (admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove): accept as satisfied? |
| Q-022 | answered | none | verdict | Criterion C-11a09b04 (admin-api › Group mappings are set, replaced, listed and removed › Refusals): accept as satisfied? |
| Q-023 | open | none | verdict | Criterion C-802ffb44 (admin-api › IdP links are listed and added › List and add): accept as satisfied? |
| Q-024 | open | none | verdict | Criterion C-a63083c0 (admin-api › IdP links are listed and added › Refusals): accept as satisfied? |
| Q-025 | open | none | verdict | Criterion C-10655032 (admin-api › The review profile is switched, audited, with a solo warning › Switch and warning): accept as satisfied? |
| Q-026 | open | none | verdict | Criterion C-1801fd2c (admin-api › The review profile is switched, audited, with a solo warning › Refusals): accept as satisfied? |
| Q-027 | open | none | verdict | Criterion C-777b5224 (admin-api › A refused change is audited › Each refusal leaves one event): accept as satisfied? |
| Q-028 | open | none | verdict | Criterion C-e4402b02 (admin-api › A refused change is audited › A failing audit changes nothing): accept as satisfied? |
| Q-029 | open | none | verdict | Criterion C-5995b318 (admin-api › Lists page with the cursor contract › pageRows): accept as satisfied? |
| Q-030 | open | none | verdict | Criterion C-4c8964eb (admin-api › Lists page with the cursor contract › Without an engine key): accept as satisfied? |
| Q-031 | open | none | verdict | Criterion C-eec17a85 (admin-api › Lists page with the cursor contract › Through the server): accept as satisfied? |
| Q-032 | open | none | verdict | Criterion C-ddb4acf0 (admin-api › The engine serves the admin routes and documents them › The real engine): accept as satisfied? |
| Q-033 | open | none | verdict | Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan): accept as satisfied? |
| Q-034 | open | none | verdict | Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass): accept as satisfied? |
| Q-035 | open | none | verdict | Criterion C-541ef4f9 (api-conventions › Every error code is registered › Route errors): accept as satisfied? |
| Q-036 | open | none | verdict | Hold H-0b1cd52c: the judge's reply was discarded (part 3 of 4, timeout: no answer within 600s) |
<!-- l4:index:end -->

---

## Q-001: src/identity/admin/accounts.test.ts:224 asserts ADMIN_TENANT_MISMATCH without a foreign transaction, and its signIn helper cannot produce the asserted display names

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-10-31T03:35Z by glm, run r-20261031T0256Z-f813, task 2.1

### Context
The frozen red test of task 2.1 contradicts the task text, the design and existing behaviour in two ways, both verified by running the code. (1) Line 224 rejects with ADMIN_TENANT_MISMATCH for listAccounts(tx, a, { kind: 'human', limit: 50 }), but lines 216-229 wrap it in withTenantTx(db.appPool, a, ...), so the transaction's app.tenant_id is 'tenant_a' and equals the context: a probe against the embedded cluster printed tx setting 'tenant_a', ctx 'tenant_a', equal true. The task text requires 'a foreign transaction as ADMIN_TENANT_MISMATCH' and the sibling pattern is sync.test.ts:324 (withTenantTx(db.appPool, b, (tx) => syncMemberships(tx, a, ...))), so no implementation with the standard tenant check can reject here while every other admin behaviour stays right. (2) signIn (lines 46-63) signs humans in with claims { issuer: ISS, subject, name: subject } (subject 'sub-ann' ... 'sub-carol'); upsertUserFromClaims stores the name claim verbatim as the display name (probed: 'sub-ann'; upsert.test.ts:92-95 pins that a name claim is used as-is and an absent name falls back to the subject), yet the test deepEquals displayName 'ann'/'bob' in C-32b7b36c's first item, C-c6c6a2a5's ann and bob items and C-9733f98e's repeat item. Accepting this question unfreezes exactly this file so the following edits can be applied.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/identity/admin/accounts.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-admin-api`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/identity/admin/accounts.test.ts: move the ADMIN_TENANT_MISMATCH assertion out of the tenant_a block (lines 224-228) and give it its own foreign transaction: `await withTenantTx(db.appPool, b, async (tx) => { await assert.rejects(listAccounts(tx, a, { kind: "human", limit: 50 }), MISMATCH, "a tenant_b transaction with the tenant_a context"); });`
2. Edit src/identity/admin/accounts.test.ts: in the signIn helper (line 55) change the claims to `{ issuer: ISS, subject, name: subject.slice(4) }` (equivalently pass subjects without the `sub-` prefix and name them the same), so a subject `sub-ann` gets the asserted displayName `ann`; alternatively change every expected displayName to the subject with the prefix (`sub-ann`, `sub-bob`, ...).
3. Do not change the test: instead change upsertUserFromClaims to strip a `sub-` prefix from the packed name claim - rejected, because it contradicts the frozen upsert.test.ts:92-95 behaviour of add-identity-model and is not part of task 2.1's files.

### Clarifier suggestion
Edit `src/identity/admin/accounts.test.ts`: move the ADMIN_TENANT_MISMATCH assertion out of the tenant_a block (lines 224-228) and give it its own foreign transaction: `await withTenantTx(db.appPool, b, async (tx) => { await assert.rejects(listAccounts(tx, a, { kind: "human", limit: 50 }), MISMATCH, "a tenant_b transaction with the tenant_a context"); });`

### Answer
<!-- write below this line -->

---

## Q-002: src/identity/admin/idp-links.test.ts:270

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.1
- **Kind:** technical
- **Asked:** 2026-10-31T04:04Z by deepseek-free, run r-20261031T0339Z-c380, task 3.1

### Context
The test signs carol in at line 180 with signIn, which calls upsertUserFromClaims and inserts an idp_link row for subject "sub-carol" (the helper asserts the call resolves). Line 270 then asserts that the whole tenant's idp_link subjects are exactly ["sub-ann", "sub-bob"], so no correct addIdpLink implementation can pass without deleting carol's legitimate sign-in link. The spec/design says addIdpLink only inserts a new link and audits it; it never removes existing sign-in links.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/identity/admin/idp-links.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-admin-api`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/identity/admin/idp-links.test.ts`: change line 270 to `assert.deepEqual(stored, ["sub-ann", "sub-bob", "sub-carol"], "nothing was linked");`
2. Edit `src/identity/admin/idp-links.test.ts`: change the query at lines 263-269 to filter by `user_id = ANY($2::text[])` for ann and bob so carol's sign-in link is excluded.

### Clarifier suggestion
Edit `src/identity/admin/idp-links.test.ts`: change line 270 to `assert.deepEqual(stored, ["sub-ann", "sub-bob", "sub-carol"], "nothing was linked");`

### Answer
<!-- write below this line -->

---

## Q-003: Criterion C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant)

### Context
Criterion C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant) is needs human after round 1.

Scenario:
\- **WHEN** tenant A holds humans ann and bob and a service account, tenant B holds human zed, and B's admin sends `GET /api/v1/users`, `GET` and `PATCH /api/v1/users/<ann>`, `PUT /api/v1/service-accounts/<svc>/roles/author`, `GET /api/v1/users/<ann>/idp-links` and `POST /api/v1/teams` with `{ "teamId": "x", "tenantId": "tenant_a" }`
\- **THEN** the list holds only zed, the next four answer 404 `NOT_FOUND`, the last 400 `VALIDATION_FAILED`, and tenant A's rows are unchanged

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The criterion is not satisfied as it stands because no test exercises its scenario. The only two-tenant check in the admin route tests is the list half of it: in the test of accounts carrying roles and teams, tenant B's admin zed lists users and sees only zed. No test has B's admin read or patch one of A's users, grant a role to A's service account, list A's user's IdP links, or post a team with a forged tenantId, and none asserts afterwards that tenant A's rows are unchanged. The production code looks right (the tenant comes from the session through requireAdminContext, getAccount and listIdpLinks run under the caller's tenant, and the team body schema has additionalProperties false), so the fix is a new Node test over the server that traces the scenario; the project's security checklist requires every tenant-scoped query to be covered by a two-tenant test and the design promises each route a two-tenant scenario. WHEN tenant A holds humans ann and bob and a service account, tenant B holds human zed, and B's tenant admin sends GET /api/v1/users, GET and PATCH /api/v1/users/<ann> with { "state": "disabled" }, PUT /api/v1/service-accounts/<svc>/roles/author, GET /api/v1/users/<ann>/idp-links and POST /api/v1/teams with { "teamId": "x", "tenantId": "tenant_a" } THEN the list holds only zed, the next four answer 404 NOT_FOUND, the last 400 VALIDATION_FAILED, ann stays active, the service account holds no role, and tenant A has no team x.
---

## Q-004: Criterion C-96e47324 (api-conventions › Every error code is registered › The registry): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-96e47324 (api-conventions › Every error code is registered › The registry)

### Context
Criterion C-96e47324 (api-conventions › Every error code is registered › The registry) is needs human after round 1.

Scenario:
\- **WHEN** `ERROR_CODES` is read
\- **THEN** it has exactly these 22 entries, `CODE status "message"`, and `isRegisteredCode` is true for each and false for `cursor_invalid`, `""` and `NOT_A_CODE`: `NOT_FOUND 404 "Route not found"`, `VALIDATION_FAILED 400 "Request validation failed"`, `PAYLOAD_TOO_LARGE 413 "Payload too large"`, `UNSUPPORTED_MEDIA_TYPE 415 "Unsupported media type"`, `BAD_REQUEST 400 "Bad request"`, `INTERNAL 500 "Internal server error"`, `WEB_NOT_BUILT 503 "Web app is not built"`, `UNAUTHENTICATED 401 "Authentication required"`, `FORBIDDEN 403 "Action not permitted"`, `CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_NOT_CONFIGURED 503 "Sign-in is not configured"`, `AUTHZ_UNAVAILABLE 503 "Authorization is unavailable"`, `CURSOR_INVALID 400 "Cursor is invalid"`, `IDEMPOTENCY_KEY_REUSED 422 "Idempotency key was used with a different request"`, `IDEMPOTENCY_IN_PROGRESS 409 "A request with this idempotency key is in progress"`, `ALREADY_EXISTS 409 "Resource already exists"`, `IN_USE 409 "Resource is in use"`, `ELEVATION_REFUSED 403 "Role cannot be granted by this principal"`, `UNKNOWN_ISSUER 422 "Issuer is not routed to this tenant"`, `OPERATION_REFUSED 422 "Operation is refused"`, `ENGINE_KEY_REQUIRED 503 "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)"`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The registry in src/api/error-codes.ts holds exactly the 22 entries of the scenario with the statuses and messages given, and the named test asserts the scenario in full: it compares the sorted key set of ERROR_CODES with its 22 expected keys, deep-compares status and message of every entry, checks isRegisteredCode true for each of the 22 and false for cursor_invalid, the empty string and NOT_A_CODE. The key-set comparison alone would fail against the 16-entry registry of the base, so the test discriminates; the harness has no red record only because the task changed this frozen test in place, as the design records. The stale title (16 codes) is required by the task and does not affect what the test asserts.
---

## Q-005: Finding F-cde045de: No discriminating test for cross-tenant admin isolation

- **Status:** answered
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-598727de).

Title: No discriminating test for cross-tenant admin isolation
Detail: The gate report's traceability matrix marks C-598727de as uncovered with no discriminating test, so the two-tenant/forged-tenant admin scenario has no test evidence on this head.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-598727de as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject: the same gap as Q-003 and Q-006: no test covers C-598727de, so the admin routes have no test of tenant isolation (tenant B requests at tenant A ids, a forged tenantId in a team body, tenant A rows unchanged). The fix is one new test over the server that traces C-598727de.
---

## Q-006: Finding F-28a40cf9: Uncovered criterion C-598727de (Another tenant and a forged tenant)

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-598727de).

Title: Uncovered criterion C-598727de (Another tenant and a forged tenant)
Detail: The gate report marks C-598727de as 'uncovered — no discriminating test'. The criterion requires a test that a tenant B admin's attempts to list/read/patch tenant A's users, grant roles to A's service account, list A's idp-links, and POST a team with a forged tenantId all fail (404/400) and leave A's rows unchanged. No test in the gate report asserts this full scenario end-to-end through the HTTP routes.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-598727de as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The finding stands: the criterion is not covered by any test. The only two-tenant checks in the admin route tests are list calls by tenant B's admin zed, who lists users, teams, roles and group mappings and sees only tenant B's rows. No test has B's admin read or patch one of tenant A's users, grant a role to A's service account, list an A user's IdP links, or post a team whose body carries a forged tenantId, and no test asserts afterwards that tenant A's rows are unchanged. The production code appears correct, since every handler takes the tenant from the session through requireAdminContext and the body schemas refuse additional properties, so the fix is a new Node test over the server that traces the scenario; the project's security checklist requires every tenant-scoped query to be covered by a two-tenant test and the design promises each route a two-tenant scenario. WHEN tenant A holds humans ann and bob and a service account, tenant B holds human zed, and B's tenant admin sends GET /api/v1/users, GET and PATCH /api/v1/users/<ann> with { "state": "disabled" }, PUT /api/v1/service-accounts/<svc>/roles/author, GET /api/v1/users/<ann>/idp-links and POST /api/v1/teams with { "teamId": "x", "tenantId": "tenant_a" } THEN the list holds only zed, the next four answer 404 NOT_FOUND, the last 400 VALIDATION_FAILED, ann stays active, the service account holds no role, and tenant A has no team x.
---

## Q-007: Finding F-c28b995d: Uncovered criterion C-96e47324 (The registry) at gate level

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-96e47324).

Title: Uncovered criterion C-96e47324 (The registry) at gate level
Detail: The gate report marks C-96e47324 as 'uncovered — no discriminating test', even though the named test src.api.error-codes.test.ts::C-96e47324 was changed in place and passed. The traceability matrix did not count it as covering the criterion, suggesting the test may not assert the observable outcome (the exact 22-entry registry with statuses and messages) in a way the harness recognises as discriminating. This needs human review of whether the in-place change still asserts everything required.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-96e47324 as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The finding is waived: the criterion is satisfied and the named test asserts its whole scenario. The registry in src/api/error-codes.ts holds exactly the 22 entries the scenario lists, each with the status and message given. The test compares the sorted key set of ERROR_CODES with its 22 expected keys, deep-compares status and message of every entry, checks isRegisteredCode true for each of the 22 and false for cursor_invalid, the empty string and NOT_A_CODE. The key-set comparison would fail against the base's 16-entry registry, so the test discriminates. The gate reports no discriminating test only because the task changed this frozen test in place rather than adding a new one, which the design records as the chosen approach; the stale title naming 16 codes is required by that in-place change and does not affect the assertions.

---

## Q-008: Criterion C-8a23d872 (admin-api › Every admin route is a session route under the right action › The route table): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-8a23d872 (admin-api › Every admin route is a session route under the right action › The route table)

### Context
Criterion C-8a23d872 (admin-api › Every admin route is a session route under the right action › The route table) is needs human after round 3.

Scenario:
\- **WHEN** `registerAdminRoutes` runs on a server with `installPep` (once with a pool, once with `pool: null`) and `listDefinedRoutes(server)` is read
\- **THEN** both servers list the 19 rows (method, url, action) of the table with `auth` `{ kind: "session" }` and an `errors` list containing the row's codes, and `unregisteredRouteErrors(listDefinedRoutes(server))` is `[]`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-policy.test.ts::C-8a23d872 the admin route table holds 19 session routes with their actions and codes (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The four registrars called by registerAdminRoutes define exactly the 19 routes of the design table through defineRoute, every one with auth { kind: "session" }, action manage_users_roles except PUT /api/v1/tenant/review-profile with manage_tenant, and declared errors equal to the table's codes row by row (P expands to CURSOR_INVALID, ENGINE_KEY_REQUIRED and VALIDATION_FAILED, I to the two idempotency codes). Every declared and implied code is in the 22-entry registry, so unregisteredRouteErrors is empty. The tracing test builds two servers with installPep, one with the app pool and one with pool null, registers the routes inside assert.doesNotThrow, asserts 19 admin routes, and for each of its 19 rows asserts the route exists, its auth deep-equals { kind: "session" }, its action matches and its errors include each code, then asserts unregisteredRouteErrors of all defined routes is [] on both servers. It passed and failed red by assertion. Handlers read tenant and principal only from request.tenant and request.principal set by the PEP's session verifier, and body and query schemas refuse additional properties, so no route takes a tenant or principal from a request.
---

## Q-009: Criterion C-a4888ef3 (admin-api › Every admin route is a session route under the right action › Who may call): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-a4888ef3 (admin-api › Every admin route is a session route under the right action › Who may call)

### Context
Criterion C-a4888ef3 (admin-api › Every admin route is a session route under the right action › Who may call) is needs human after round 3.

Scenario:
\- **WHEN** under `roles.cedar` carol (operator grant `tenant_admin`), alice (operator grant `author`) and a caller with no cookie send `GET /api/v1/roles`, and carol and alice send `PUT /api/v1/tenant/review-profile` with `{ "reviewProfile": "team" }`
\- **THEN** carol gets 200 with `items` `[{ roleId: "approver" }, { roleId: "auditor" }, { roleId: "author" }, { roleId: "tenant_admin" }]` and `next_cursor` `null`, alice gets 403 `FORBIDDEN` with `details.decisionId` (profile unchanged) and the caller with no cookie 401 `UNAUTHENTICATED`; carol's switch is 200

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-policy.test.ts::C-a4888ef3 roles cedar permits only the tenant admin on the admin routes (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The tracing test builds a server with installPep and a policy engine loaded from a copy of roles.cedar, creates sessions for carol and alice in tenant A, grants carol tenant_admin and alice author by operator grants, and then asserts every element of the scenario: carol's GET /api/v1/roles is 200 with items approver, auditor, author, tenant_admin and next_cursor null; alice's GET is 403 FORBIDDEN with a string details.decisionId; the request with no cookie is 401 UNAUTHENTICATED; alice's PUT /api/v1/tenant/review-profile with reviewProfile team is 403 FORBIDDEN with details.decisionId and the owner pool still reads solo for tenant A; carol's PUT is 200 with reviewProfile team, previous solo and changed true. The test passed and failed red by assertion. The production code matches: GET /api/v1/roles and PUT /api/v1/tenant/review-profile are defineRoute session routes under manage_users_roles and manage_tenant, the tenant and principal come only from the session through requireAdminContext, and roles.cedar permits those two actions only to principals in Role tenant_admin, so an author is refused by the PEP and no handler runs.
---

## Q-010: Criterion C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant)

### Context
Criterion C-598727de (admin-api › Every admin route is a session route under the right action › Another tenant and a forged tenant) is needs human after round 3.

Scenario:
\- **WHEN** tenant A holds humans ann and bob and a service account, tenant B holds human zed, and B's admin sends `GET /api/v1/users`, `GET` and `PATCH /api/v1/users/<ann>`, `PUT /api/v1/service-accounts/<svc>/roles/author`, `GET /api/v1/users/<ann>/idp-links` and `POST /api/v1/teams` with `{ "teamId": "x", "tenantId": "tenant_a" }`
\- **THEN** the list holds only zed, the next four answer 404 `NOT_FOUND`, the last 400 `VALIDATION_FAILED`, and tenant A's rows are unchanged

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-isolation.test.ts::C-598727de tenant B admin cannot reach tenant A rows and a forged tenant is refused (passed, pre_satisfied)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The tracing test in src/api/admin-isolation.test.ts builds a server with installPep and registerAdminRoutes over two seeded tenants, creates humans ann and bob and a service account in tenant A and human zed in tenant B, grants zed tenant_admin by an operator grant, snapshots tenant A's user, team, membership and idp_link rows, and then asserts every element of the scenario: zed's GET /api/v1/users is 200 with items exactly [zed]; GET and PATCH /api/v1/users/<ann>, PUT /api/v1/service-accounts/<svc>/roles/author and GET /api/v1/users/<ann>/idp-links each answer 404 with code NOT_FOUND; POST /api/v1/teams with { teamId: "x", tenantId: "tenant_a" } answers 400 VALIDATION_FAILED; and tenant A's rows after the requests deep-equal the snapshot, with no team x. The test passed. It was pre-satisfied only because the production code was already correct: every handler takes the tenant from the session through requireAdminContext and runs under withTenantTx of that tenant, getAccount and listIdpLinks are called with the caller's tenant so another tenant's ids give 404, the role route reads getAccount before grantRole, and the team body schema has additionalProperties false so a tenantId in the body is refused by validation.
---

## Q-011: Criterion C-cc3ddc89 (admin-api › Admin errors are registered codes › The mapping): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-cc3ddc89 (admin-api › Admin errors are registered codes › The mapping)

### Context
Criterion C-cc3ddc89 (admin-api › Admin errors are registered codes › The mapping) is needs human after round 3.

Scenario:
\- **WHEN** `adminApiError` gets `RbacError` and `AdminError` and `IdentityError` instances of `RBAC_INVALID`, `IDENTITY_INVALID`, `ADMIN_INVALID`, `RBAC_NOT_FOUND`, `ADMIN_NOT_FOUND`, `RBAC_EXISTS`, `ADMIN_EXISTS`, `RBAC_IN_USE`, `RBAC_ELEVATION`, `RBAC_UNKNOWN_ISSUER`, `ADMIN_UNKNOWN_ISSUER`, `ADMIN_SELF_DISABLE`, `ADMIN_WRONG_KIND`, `IDENTITY_OWNER_INVALID`
\- **THEN** each result is an `ApiError` with status and code `400 VALIDATION_FAILED` (x3), `404 NOT_FOUND` (x2), `409 ALREADY_EXISTS` (x2), `409 IN_USE`, `403 ELEVATION_REFUSED`, `422 UNKNOWN_ISSUER` (x2), and `422 OPERATION_REFUSED` with `details.reason` `self_disable`, `wrong_kind`, `owner_invalid`; no output message contains `secret-input`, the message given to every input error

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-errors.test.ts::C-cc3ddc89 admin errors map to registered API codes (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The mapping table in src/api/admin-errors.ts holds exactly the fourteen domain codes of the scenario: the three invalid codes map to VALIDATION_FAILED, the two not-found codes to NOT_FOUND, the two exists codes to ALREADY_EXISTS, RBAC_IN_USE to IN_USE, RBAC_ELEVATION to ELEVATION_REFUSED, the two unknown-issuer codes to UNKNOWN_ISSUER, and ADMIN_SELF_DISABLE, ADMIN_WRONG_KIND and IDENTITY_OWNER_INVALID to OPERATION_REFUSED with details reason self_disable, wrong_kind and owner_invalid. The function recognises RbacError, AdminError and IdentityError instances, builds the ApiError from the registry's status and default message, so the input message never reaches the output, and returns anything unmapped unchanged. The registry gives 400, 404, 409, 409, 403, 422 and 422 for those codes, matching the scenario. The tracing test constructs all fourteen errors with the message secret-input, asserts each result is an ApiError with the expected status and code, that the message does not contain secret-input, and that details deep-equals the expected reason for the three refused operations. It passed and failed red by assertion.
---

## Q-012: Criterion C-e8ea1428 (admin-api › Admin errors are registered codes › Other errors pass through): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-e8ea1428 (admin-api › Admin errors are registered codes › Other errors pass through)

### Context
Criterion C-e8ea1428 (admin-api › Admin errors are registered codes › Other errors pass through) is needs human after round 3.

Scenario:
\- **WHEN** `adminApiError` gets `RbacError("RBAC_TENANT_MISMATCH", ...)`, `RbacError("RBAC_DIRECT_GRANT_REFUSED", ...)`, `AdminError("ADMIN_TENANT_MISMATCH", ...)`, `new Error("boom")` and the string `"x"`
\- **THEN** each result is strictly equal (`===`) to its input

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-errors.test.ts::C-e8ea1428 other errors pass through unchanged (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. In src/api/admin-errors.ts the function adminApiError reads a domain code only from RbacError, AdminError and IdentityError instances and returns any other value unchanged, so new Error("boom") and the string "x" come back as themselves. For a domain error it looks the code up in a mapping table that holds exactly the fourteen codes of the mapping scenario; RBAC_TENANT_MISMATCH, RBAC_DIRECT_GRANT_REFUSED and ADMIN_TENANT_MISMATCH are not in it, so the function returns the input error itself. The tracing test constructs those three domain errors, a plain Error and the string "x", calls adminApiError on each inside assert.doesNotThrow and asserts with assert.strictEqual that the result is the same value as the input. It passed and failed red by assertion.
---

## Q-013: Criterion C-7a958882 (admin-api › The app role may switch only its own tenant's review profile › Objects and privileges): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-7a958882 (admin-api › The app role may switch only its own tenant's review profile › Objects and privileges)

### Context
Criterion C-7a958882 (admin-api › The app role may switch only its own tenant's review profile › Objects and privileges) is needs human after round 3.

Scenario:
\- **WHEN** the ledger row `version = 180`, `name = 'admin_api'` is asserted, then as the app role in `tenant_a` a test runs `UPDATE ursitoare.tenant SET review_profile = 'team' WHERE tenant_id = 'tenant_a'`, the same `WHERE tenant_id = 'tenant_b'`, `SET name = 'x'`, `SET review_profile = 'bogus'`, an `INSERT` and a `DELETE`, and `checkTenancyCatalog(db.ownerPool)` runs
\- **THEN** the first changes 1 row, the second 0 rows (tenant B stays `solo`), `name`, `INSERT` and `DELETE` fail with SQLSTATE `42501`, `'bogus'` with `23514`, and the violations are `[]`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.identity.admin.schema.test.ts::C-7a958882 Objects and privileges (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The migration 0180_admin_api.sql holds the single statement of the design's data model, granting the app role UPDATE on the review_profile column of ursitoare.tenant and nothing more; the only other grant on that table is the SELECT of the tenancy migration, which also enables row-level security with the tenant_isolation policy on app.tenant_id and a check constraint limiting review_profile to solo or team. The tracing test first asserts the ledger row version 180 named admin_api, seeds two tenants, and as the app role in tenant A asserts that the own-row update changes 1 row, that the update aimed at tenant_b changes 0 rows and the owner still reads solo for B, that setting name, an INSERT and a DELETE reject with SQLSTATE 42501, that the value bogus rejects with 23514, and that checkTenancyCatalog over the owner pool returns an empty list. The test passed and failed red by assertion.
---

## Q-014: Criterion C-32b7b36c (admin-api › Users are listed, read, disabled and enabled › List, page, filter, read): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-32b7b36c (admin-api › Users are listed, read, disabled and enabled › List, page, filter, read)

### Context
Criterion C-32b7b36c (admin-api › Users are listed, read, disabled and enabled › List, page, filter, read) is needs human after round 3.

Scenario:
\- **WHEN** tenant A holds humans ann, bob, cat and a service account, and carol (a fourth human) calls `GET /api/v1/users?limit=2` and the `next_cursor`, `?state=disabled`, `?limit=0`, `GET` of ann, of the service account, of an unknown valid id and of `bad%20id`
\- **THEN** the pages hold 2 then 2 users ordered by `userId`, with `next_cursor` set then `null`, none a service account; each item has exactly `userId`, `kind` `human`, `ownerUserId` `null`, `displayName`, `email`, `state`, `roles`, `teams`, `localRoles` (arrays); the filter gives `{ items: [], next_cursor: null }`; the rest answer 400, 200 with ann's item, 404, 404, 400

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-users.test.ts::C-32b7b36c users are listed paged filtered and read by id (passed, red_assertion); src.identity.admin.accounts.test.ts::C-32b7b36c Accounts list and read (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The route GET /api/v1/users calls listAccounts with kind human, so service accounts are never listed, and the optional state filter and the page limit and cursor come from the validated query; listAccounts orders by user_id under the C collation, reads limit plus one rows and reports a next position only when more rows remain, and the handler encodes it as next_cursor bound to the tenant and the users scope or returns null. The 200 response schema lists exactly the nine account properties with additionalProperties false, and getAccount builds every item with roles, teams and localRoles as sorted arrays. GET /api/v1/users/{userId} validates the id against the identity pattern, so bad id is 400 VALIDATION_FAILED, reads getAccount with kind human and answers the account or 404 NOT_FOUND, so a service account's id and an unknown id are both 404; a limit of 0 fails the page validation with 400. The server test seeds ann, bob, cat, carol and a service account, and asserts two items with a string cursor, then two items with next_cursor null, the concatenated userIds equal to the sorted four human ids, every item of kind human with exactly the nine keys, ownerUserId null and empty arrays, the disabled filter deep-equal to { items: [], next_cursor: null }, 400 VALIDATION_FAILED for limit 0, 200 with ann's userId for her read, 404 NOT_FOUND for the service account and for an unknown id, and 400 VALIDATION_FAILED for bad%20id. The function-level test deep-equals the first page to ann and bob with next bob, the second to cat and carol with next null, the whole item shape, and getAccount equal to the listed item. Both tests passed and failed red by assertion.
---

## Q-015: Criterion C-c6c6a2a5 (admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-c6c6a2a5 (admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts)

### Context
Criterion C-c6c6a2a5 (admin-api › Users are listed, read, disabled and enabled › Roles and teams of accounts) is needs human after round 3.

Scenario:
\- **WHEN** ann holds `author` by an operator grant and, through `syncMemberships` of groups mapped to `approver` and to team `finance`, those two; bob holds nothing; ann is then patched to `disabled`; and carol sends `GET /api/v1/users` and `GET /api/v1/users/<ann>`
\- **THEN** ann's item (in both) has `state` `disabled`, `roles` `["approver", "author"]`, `teams` `["finance"]` and `localRoles` `["author"]`; bob's arrays are `[]`; tenant B sees none

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-users.test.ts::C-c6c6a2a5 accounts carry roles teams and local roles across states (passed, red_assertion); src.identity.admin.accounts.test.ts::C-c6c6a2a5 Accounts hold roles teams and local roles (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-users.test.ts builds the scenario exactly: it provisions the routed issuer, creates a team finance, maps one group to the role approver and one to the team finance, grants ann author by an operator grant, runs syncMemberships for ann with both groups, and has carol patch ann to disabled over PATCH /api/v1/users/<ann>. It then asserts in carol's GET /api/v1/users that ann's item has state disabled, roles ["approver", "author"], teams ["finance"] and localRoles ["author"], that bob's roles, teams and localRoles are each [], asserts the same four fields on GET /api/v1/users/<ann>, and that tenant B's admin zed listing users sees only zed and neither ann nor bob. The function-level test in src/identity/admin/accounts.test.ts deep-equals the whole AdminAccount of ann (disabled, the same three arrays) and of bob (empty arrays) and asserts that listAccounts under tenant B returns no users. Both tests passed and failed red by assertion. The production code matches: getAccount and listAccounts read every membership row of the users from ursitoare.membership under the caller's tenant, put every role_id in roles, only source local rows in localRoles and every team_id in teams, sorted, whatever the account's state, and the routes list kind human and read one account under the session's tenant. The judge gave no verdict only because its evidence was cut to fit its budget.
---

## Q-016: Criterion C-9733f98e (admin-api › Users are listed, read, disabled and enabled › Disable and enable): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-9733f98e (admin-api › Users are listed, read, disabled and enabled › Disable and enable)

### Context
Criterion C-9733f98e (admin-api › Users are listed, read, disabled and enabled › Disable and enable) is needs human after round 3.

Scenario:
\- **WHEN** bob (with a live session) is patched to `disabled` twice, carol patches herself to `disabled`, `{ "state": "deleted" }` is sent, bob's session calls `GET /api/v1/users`, bob is patched to `active`, bob's same session calls `GET /api/v1/users` again, and the service account's id is patched through `/users`
\- **THEN** the answers are 200 with the item, `state: "disabled"` (x2), 422 `OPERATION_REFUSED` with `details.reason` `self_disable` (carol stays `active`), 400, 401 `UNAUTHENTICATED`, 200 with the item, `state: "active"`, 200 (session works again), 404; the chain holds one `identity.user_state_changed` per real change (two) with target `{ kind: "user", id: <bob> }`, actor `{ kind: "user", id: <carol> }` and payloads `{ from: "active", to: "disabled", kind: "human" }` then `{ from: "disabled", to: "active", kind: "human" }`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-users.test.ts::C-9733f98e users are disabled and enabled with suspended then restored sessions (passed, red_assertion); src.identity.admin.accounts.test.ts::C-9733f98e Account state changes (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-users.test.ts builds the scenario exactly: carol and bob hold live sessions, a service account exists, and carol patches bob to disabled twice (both 200 with state disabled), patches herself to disabled (422 OPERATION_REFUSED with details { reason: "self_disable" }, and a GET of carol then reads state active), sends { state: "deleted" } (400 VALIDATION_FAILED), bob's session calls GET /api/v1/users (401 UNAUTHENTICATED), carol patches bob to active (200 with state active), bob's same session calls GET /api/v1/users again (200), and the service account's id is patched through /users (404 NOT_FOUND). It then reads the audit chain and asserts exactly two identity.user_state_changed events, each with target { kind: "user", id: bob } and actor { kind: "user", id: carol }, with payloads { from: "active", to: "disabled", kind: "human" } then { from: "disabled", to: "active", kind: "human" }. The function-level test in src/identity/admin/accounts.test.ts also asserts changed false for a same-state call, the self-disable and not-found rejections, and the two audit events. Both tests passed and failed red by assertion. The production code matches: setAccountState locks the row FOR UPDATE, throws ADMIN_NOT_FOUND for an absent row or the other kind, throws ADMIN_SELF_DISABLE after the existence check, returns changed false without an audit event when the state is unchanged, and otherwise writes state and updated_at and appends one identity.user_state_changed event with that target, actor and payload; the PATCH route runs it with kind human under the session's tenant and answers getAccount read after the change in the same transaction. Sessions are suspended rather than revoked: resolveSession joins the user row and returns null while the user's state is not active, without touching the session row, so an enable restores every session that has not expired meanwhile.
---

## Q-017: Criterion C-8087d00f (admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-8087d00f (admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state)

### Context
Criterion C-8087d00f (admin-api › Service accounts are created, listed, disabled and given roles › Create, list, owner, state) is needs human after round 3.

Scenario:
\- **WHEN** carol posts `{ "displayName": "Nightly bot" }` with `Idempotency-Key` `k1` twice, then with `ownerUserId` bob, a service account's id, an unknown id, `displayName` `""`, lists `GET /api/v1/service-accounts`, and patches the first account to `disabled`
\- **THEN** the first is 201 `{ userId, kind: "service", ownerUserId: <carol>, displayName: "Nightly bot", email: null, state: "active", roles: [], teams: [], localRoles: [] }` and the repeat the same body with header `idempotent-replayed: true` (one account, one `identity.service_account_created` event, target the account, payload `{ ownerUserId: <carol>, displayName: "Nightly bot" }`); the others 201 with owner bob, 422 `OPERATION_REFUSED` `owner_invalid` (x2), 400; the list holds the 2 service accounts only; the patch is 200 `disabled`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-service-accounts.test.ts::C-8087d00f service accounts are created listed owned and disabled (passed, red_assertion); src.identity.admin.accounts.test.ts::C-8087d00f Service account provisioning and owners (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-service-accounts.test.ts runs the scenario exactly: carol posts { displayName: "Nightly bot" } with Idempotency-Key k1 and the test asserts 201 with exactly the nine account keys, kind service, ownerUserId carol, displayName Nightly bot, email null, state active and empty roles, teams and localRoles; the repeat with k1 is asserted 201 with a body deep-equal to the first and header idempotent-replayed true; the post with ownerUserId bob is 201 with owner bob; the posts with a service account's id and an unknown id as owner are each 422 OPERATION_REFUSED with details { reason: "owner_invalid" }; displayName "" is 400 VALIDATION_FAILED; GET /api/v1/service-accounts lists exactly the two created accounts, every item of kind service, with next_cursor null; the PATCH of the first account to disabled is 200 with state disabled; and the audit chain holds one identity.service_account_created event targeting the first account, with target { kind: "user", id } and payload { ownerUserId: carol, displayName: "Nightly bot" }, so the replay appended none. The function-level test in src/identity/admin/accounts.test.ts also asserts the created shape, owner bob, IDENTITY_OWNER_INVALID for an inactive and for a service owner, that nothing is stored by them, and the events with their targets and payloads. Both tests passed and failed red by assertion. The production code matches: the POST route takes the idempotency header schema and answers through respondIdempotent, which replays the stored body with the Idempotent-Replayed header without running the handler again; the owner defaults to the caller's userId; createServiceAccount refuses an owner that is absent, not human or not active with IDENTITY_OWNER_INVALID, which adminApiError maps to 422 OPERATION_REFUSED with reason owner_invalid; the body schema requires displayName with minLength 1 so an empty name is 400; provisionServiceAccount appends one identity.service_account_created event with that target and payload; the list route reads listAccounts with kind service; and the PATCH route runs setAccountState with kind service and answers getAccount read after the change.
---

## Q-018: Criterion C-c102e454 (admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-c102e454 (admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account)

### Context
Criterion C-c102e454 (admin-api › Service accounts are created, listed, disabled and given roles › Roles of a service account) is needs human after round 3.

Scenario:
\- **WHEN** carol sends `PUT /api/v1/service-accounts/<svc>/roles/author` twice, `GET .../roles`, `PUT .../roles/ghost`, `PUT .../roles/Bad`, `PUT`, `GET` and `DELETE` of `.../roles/author` for human bob's id, patches the service account to `disabled`, repeats `GET .../roles`, patches it back to `active`, and sends `DELETE .../roles/author` twice
\- **THEN** the answers are 200 `{ roleId: "author", result: "granted" }`, 200 `result: "exists"`, 200 `items` `[{ roleId: "author" }]`, 404 `NOT_FOUND`, 400, 404 (x3), 200 `disabled`, 200 `items` `[{ roleId: "author" }]`, 200 `active`, 204, 404; the chain holds one `identity.role_granted` and one `identity.role_revoked`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-service-accounts.test.ts::C-c102e454 service account roles are granted listed and revoked (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-service-accounts.test.ts runs the scenario exactly as written: carol puts author on the service account twice and the test asserts 200 with { roleId: "author", result: "granted" } then 200 with result exists; GET of the roles is 200 with items [{ roleId: "author" }] and next_cursor null; PUT of ghost is 404 NOT_FOUND; PUT of Bad is 400 VALIDATION_FAILED; PUT, GET and DELETE of roles/author for human bob's id are each 404 NOT_FOUND; the PATCH to disabled is 200 with state disabled; the repeated GET of the roles while disabled is again 200 with items [{ roleId: "author" }]; the PATCH back to active is 200 with state active; DELETE of roles/author is 204 and the second DELETE is 404 NOT_FOUND; and the audit chain for that account holds exactly one identity.role_granted and one identity.role_revoked event. The test passed and failed red by assertion. The production code matches: all three roles routes first read getAccount with kind service under the session's tenant and answer 404 when it is null, so a human's id is 404 on every one; the roleId param pattern rejects Bad at validation; grantRole requires the role (RBAC_NOT_FOUND, mapped to 404 NOT_FOUND), inserts with ON CONFLICT DO NOTHING and returns exists without an audit event when the row already exists, and appends one identity.role_granted on a real grant; the GET lists the account's localRoles whatever its state, since getAccount reads the user row by id and kind without a state filter; revokeRole deletes the local membership row, appends one identity.role_revoked on a real revoke and returns false when nothing was deleted, which the DELETE route answers as 404. The judge gave no verdict only because its evidence was cut to fit its budget.
---

## Q-019: Criterion C-50b6b834 (admin-api › Service accounts are created, listed, disabled and given roles › No elevation): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-50b6b834 (admin-api › Service accounts are created, listed, disabled and given roles › No elevation)

### Context
Criterion C-50b6b834 (admin-api › Service accounts are created, listed, disabled and given roles › No elevation) is needs human after round 3.

Scenario:
\- **WHEN** a caller who holds only `author` (policy `PERMIT_ALL`) sends `PUT .../roles/tenant_admin` and `PUT .../roles/author` for the service account
\- **THEN** the first is 403 `ELEVATION_REFUSED` and stores nothing, the second 200 `granted`; one `identity.role_granted` (`author`) is in the chain

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-service-accounts.test.ts::C-50b6b834 service account role grants cannot exceed the caller (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-service-accounts.test.ts runs the scenario as written: the harness grants alice only author by an operator grant under a permit-all tenant policy, alice puts tenant_admin on the service account and the test asserts 403 with code ELEVATION_REFUSED, then carol's GET of the account's roles is asserted 200 with { items: [], next_cursor: null }, so nothing was stored; alice then puts author and the test asserts 200 with { roleId: "author", result: "granted" }; finally the audit chain filtered to identity.role_granted events targeting the account is asserted to hold exactly one event, with payload { roleId: "author", via: "admin" }. The test passed and failed red by assertion. The production code matches: the PUT route builds the actor from the session principal's kind, userId and roles, reads getAccount and calls grantRole inside one withTenantTx; grantRole's assertCanGrant throws RBAC_ELEVATION when the actor holds neither tenant_admin nor the requested role, before the membership INSERT, so the transaction rolls back and no row or audit event is stored; adminApiError maps RBAC_ELEVATION to the registered ELEVATION_REFUSED 403; a grant of a role the actor holds inserts the membership and appends one identity.role_granted event. The judge gave no verdict only because its evidence was cut to fit its budget.
---

## Q-020: Criterion C-8b40a61c (admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-8b40a61c (admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse)

### Context
Criterion C-8b40a61c (admin-api › Roles and teams are listed and teams managed › Create, list, delete, refuse) is needs human after round 3.

Scenario:
\- **WHEN** carol posts `finance` with key `k1`, `finance` with key `k2`, `Finance`, and `ops` with key `k3` twice; lists teams as A and as B; maps a group to `finance`; deletes `finance`; deletes the unused `ops`; deletes `ops` again
\- **THEN** the posts answer 201 `{ teamId: "finance" }`, 409 `ALREADY_EXISTS`, 400, 201, and a replayed 201; A lists `[{ teamId: "finance" }]` and B `[]`; the delete of the mapped team is 409 `IN_USE` and of `ops` 204, then 404; the chain holds `identity.team_created` for `finance` and for `ops` once each and one `identity.team_deleted`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-teams.test.ts::C-8b40a61c teams are created listed isolated mapped and deleted (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-teams.test.ts runs the scenario as written: carol posts finance with Idempotency-Key k1 and the test asserts 201 with body { teamId: "finance" }; the post of finance with k2 is asserted 409 ALREADY_EXISTS; the post of Finance is asserted 400 VALIDATION_FAILED; carol's GET /api/v1/teams is asserted 200 with items [{ teamId: "finance" }] and next_cursor null, and tenant B's admin zed's GET is asserted 200 with items [] and next_cursor null; the post of ops with k3 is asserted 201 { teamId: "ops" } and its repeat 201 with the same body and header idempotent-replayed true; a group of the routed issuer is then mapped to finance through setGroupMapping; DELETE /api/v1/teams/finance is asserted 409 IN_USE, DELETE of ops 204, and the second DELETE of ops 404 NOT_FOUND; finally the audit chain of tenant A is asserted to hold exactly two identity.team_created events whose targets are finance and ops and exactly one identity.team_deleted event with target { kind: "team", id: "ops" }. The harness records it as passed and failing red by assertion. The production code matches: the POST route validates teamId against the lowercase team pattern so Finance is 400, takes the idempotency header schema and answers through respondIdempotent, and createTeam inserts with ON CONFLICT DO NOTHING, throws RBAC_EXISTS when no row was inserted and otherwise appends one identity.team_created event; deleteTeam throws RBAC_NOT_FOUND for an absent team, RBAC_IN_USE when a group mapping or membership references it, and otherwise deletes and appends one identity.team_deleted event; adminApiError maps RBAC_EXISTS to 409 ALREADY_EXISTS, RBAC_IN_USE to 409 IN_USE and RBAC_NOT_FOUND to 404 NOT_FOUND; the GET route lists the session tenant's teams under withTenantTx of that tenant and cuts them with pageRows. The judge gave no verdict only because its evidence was cut to fit its budget.
---

## Q-021: Criterion C-09ace5ca (admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-09ace5ca (admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove)

### Context
Criterion C-09ace5ca (admin-api › Group mappings are set, replaced, listed and removed › Set, replace, list, remove) is needs human after round 3.

Scenario:
\- **WHEN** the issuer `https://idp.example/realms/ursitoare` is routed to tenant A, and carol puts group `ursitoare-authors` with `roleId` `author`, then `teamId` `finance`, lists, deletes it by `?issuer=<urlencoded>&group=ursitoare-authors` twice, and B lists
\- **THEN** the puts answer 200 `{ issuer, group: "ursitoare-authors", roleId: "author", teamId: null, reviewedBy: <carol> }` then the same with `roleId: null`, `teamId: "finance"`; the list holds that one mapping; the deletes are 204 then 404; B's list is `{ items: [], next_cursor: null }`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-group-map.test.ts::C-09ace5ca group mapping is set replaced listed removed and tenant scoped (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-group-map.test.ts runs the scenario as written: the routed issuer is provisioned for tenant A, a team finance exists, and carol puts group ursitoare-authors with roleId author; the test asserts 200 and deep-equals the body to { issuer, group: "ursitoare-authors", roleId: "author", teamId: null, reviewedBy: carol }. The replacing put with teamId finance is asserted 200 with roleId null, teamId "finance" and the same reviewedBy. Carol's GET /api/v1/idp-group-map is asserted 200 with items deep-equal to that one mapping and next_cursor null. The DELETE with the url-encoded issuer and group query is asserted 204, the repeat 404 with code NOT_FOUND, and tenant B's admin zed's GET is deep-equal to { items: [], next_cursor: null }. The harness records it as passed and failing red by assertion. The production code matches: the three idp-group-map routes are session routes under manage_users_roles whose handlers take the tenant and principal only from the session through requireAdminContext and run inside withTenantTx of that tenant; the PUT body schema requires issuer and group and exactly one of roleId or teamId and calls setGroupMapping, which checks the routed issuer and the target, upserts the row with ON CONFLICT DO UPDATE replacing role_id, team_id and reviewed_by, and returns { issuer, group, roleId, teamId, reviewedBy: actor id }; the GET lists the tenant's mappings through listGroupMappings and cuts them with pageRows under the idp_group_map scope; the DELETE validates issuer and group from the query, calls removeGroupMapping, which returns false when no row exists, and answers 404 NOT_FOUND in that case or 204 otherwise. The judge gave no verdict only because its evidence was cut to fit its budget.
---

## Q-022: Criterion C-11a09b04 (admin-api › Group mappings are set, replaced, listed and removed › Refusals): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-11a09b04 (admin-api › Group mappings are set, replaced, listed and removed › Refusals)

### Context
Criterion C-11a09b04 (admin-api › Group mappings are set, replaced, listed and removed › Refusals) is needs human after round 3.

Scenario:
\- **WHEN** carol puts a mapping with both `roleId` and `teamId`, neither, `roleId` `ghost`, issuer `https://other.example`, a 256-character group, and a caller who holds only `author` (policy `PERMIT_ALL`) maps to `tenant_admin`
\- **THEN** the answers are 400, 400, 404 `NOT_FOUND`, 422 `UNKNOWN_ISSUER`, 400, 403 `ELEVATION_REFUSED`, and no mapping was stored by them

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-group-map.test.ts::C-11a09b04 group mapping refusals keep the map empty (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The server test in src/api/admin-group-map.test.ts runs the scenario as written: the routed issuer is provisioned for tenant A, alice holds only author by an operator grant under a permit-all tenant policy, and carol puts a mapping with both roleId and teamId (asserted 400 VALIDATION_FAILED), with neither (400 VALIDATION_FAILED), with roleId ghost (404 NOT_FOUND), with issuer https://other.example (422 UNKNOWN_ISSUER) and with a 256-character group (400 VALIDATION_FAILED); alice then maps the group to tenant_admin and the test asserts 403 ELEVATION_REFUSED; finally carol's GET /api/v1/idp-group-map is asserted deep-equal to { items: [], next_cursor: null }, so none of the refused puts stored a mapping. The harness records the test as passed and failing red by assertion. The production code matches: the PUT body schema bounds group to 255 characters and requires exactly one of roleId or teamId through oneOf, so both, neither and the overlong group fail validation with 400 before the handler runs; setGroupMapping checks the routed issuer in tenant_idp and throws RBAC_UNKNOWN_ISSUER, checks the role exists and throws RBAC_NOT_FOUND, and assertCanMap throws RBAC_ELEVATION when the actor holds neither tenant_admin nor the requested role, each before the INSERT, so the transaction rolls back; adminApiError maps those codes to 422 UNKNOWN_ISSUER, 404 NOT_FOUND and 403 ELEVATION_REFUSED from the registry, and adminHandler rethrows the mapped error. The judge gave no verdict only because its evidence was cut to fit its budget.
---

## Q-023: Criterion C-802ffb44 (admin-api › IdP links are listed and added › List and add): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-802ffb44 (admin-api › IdP links are listed and added › List and add)

### Context
Criterion C-802ffb44 (admin-api › IdP links are listed and added › List and add) is needs human after round 3.

Scenario:
\- **WHEN** ann signed in once (issuer `https://idp.example/realms/ursitoare`, subject `sub-ann`, clock `2026-10-25T09:00:00Z`) and carol lists her links, posts `{ issuer, subject: "sub-ann-2" }` with `Idempotency-Key` `k1` twice, and lists again
\- **THEN** the first list is `[{ issuer, subject: "sub-ann", linkedAt: "2026-10-25T09:00:00.000000Z" }]`, the post 201 with that shape for `sub-ann-2` and the repeat the same with `idempotent-replayed: true`, the last list holds both in order, and one `identity.idp_linked` event has target `{ kind: "user", id: <ann> }` and payload `{ issuer, subject: "sub-ann-2" }`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-users.test.ts::C-802ffb44 idp links are listed and added idempotently (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-802ffb44 IdP links are listed and added (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-024: Criterion C-a63083c0 (admin-api › IdP links are listed and added › Refusals): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-a63083c0 (admin-api › IdP links are listed and added › Refusals)

### Context
Criterion C-a63083c0 (admin-api › IdP links are listed and added › Refusals) is needs human after round 3.

Scenario:
\- **WHEN** carol posts `sub-ann` again (new key), bob's own pair for ann, an issuer with no `tenant_idp` row, a subject `" x"`, any pair for the service account and for an unknown id, and lists the service account's links
\- **THEN** the answers are 409 `ALREADY_EXISTS` (x2), 422 `UNKNOWN_ISSUER`, 400, 422 `OPERATION_REFUSED` `wrong_kind`, 404, 404, and nothing was linked

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-users.test.ts::C-a63083c0 idp link refusals link nothing (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-a63083c0 Concurrent identical IdP links resolve once (passed, red_assertion); src.identity.admin.idp-links.test.ts::C-a63083c0 IdP links refuse held pairs and bad targets (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-025: Criterion C-10655032 (admin-api › The review profile is switched, audited, with a solo warning › Switch and warning): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-10655032 (admin-api › The review profile is switched, audited, with a solo warning › Switch and warning)

### Context
Criterion C-10655032 (admin-api › The review profile is switched, audited, with a solo warning › Switch and warning) is needs human after round 3.

Scenario:
\- **WHEN** tenant A (`solo`) holds active humans ann, bob and carol, and carol puts `team`, `solo` twice, then ann and bob are disabled and she puts `solo`
\- **THEN** the answers are 200 `{ tenantId: "tenant_a", reviewProfile: "team", previous: "solo", changed: true, humanMembers: 3, warning: null }`; `solo` with `previous: "team"`, `changed: true` and `warning` `{ code: "SOLO_TENANT_HAS_MANY_HUMANS", message: "This solo tenant has 3 active human members; each may review their own flows.", humanMembers: 3 }`; the same with `previous: "solo"`, `changed: false`; and, with `humanMembers: 1`, `previous: "solo"`, `changed: false`, `warning: null`; the chain holds `identity.review_profile_changed` twice (payloads `{ from: "solo", to: "team", humanMembers: 3 }`, `{ from: "team", to: "solo", humanMembers: 3 }`), the owner reads `solo` for A and B

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-tenant.test.ts::C-10655032 the review profile switches warns and stays audited through the server (passed, red_assertion); src.identity.admin.review-profile.test.ts::C-10655032 The review profile switches, warns and stays audited (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-026: Criterion C-1801fd2c (admin-api › The review profile is switched, audited, with a solo warning › Refusals): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-1801fd2c (admin-api › The review profile is switched, audited, with a solo warning › Refusals)

### Context
Criterion C-1801fd2c (admin-api › The review profile is switched, audited, with a solo warning › Refusals) is needs human after round 3.

Scenario:
\- **WHEN** carol puts `{ "reviewProfile": "duo" }`, `{}` and `{ "reviewProfile": "team", "x": 1 }`
\- **THEN** each answer is 400 `VALIDATION_FAILED`, profile unchanged

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-tenant.test.ts::C-1801fd2c the review profile route refuses a bad body and keeps the profile (passed, red_assertion); src.identity.admin.review-profile.test.ts::C-1801fd2c The review profile refuses an unknown profile (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-027: Criterion C-777b5224 (admin-api › A refused change is audited › Each refusal leaves one event): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-777b5224 (admin-api › A refused change is audited › Each refusal leaves one event)

### Context
Criterion C-777b5224 (admin-api › A refused change is audited › Each refusal leaves one event) is needs human after round 3.

Scenario:
\- **WHEN** alice (only `author`, `PERMIT_ALL`) maps a group of the routed issuer to `tenant_admin` and puts that role on a service account; carol patches herself to `disabled`, posts a service account owned by a service account, links an IdP identity to a service account; carol sends a bad body, deletes an unknown team and posts one team twice (no key)
\- **THEN** the first five answers are 403 `ELEVATION_REFUSED` (x2), 422 `OPERATION_REFUSED` (x3); the chain holds five `identity.change_refused` events, payload `code` `RBAC_ELEVATION` (x2), `ADMIN_SELF_DISABLE`, `IDENTITY_OWNER_INVALID`, `ADMIN_WRONG_KIND`, each with actor `{ kind: "user", id: <caller> }`, target `{ kind: "action", id: "manage_users_roles" }` and `payload.route` the route pattern (`/api/v1/users/:userId` for self-disable); the 400, 404, 409 add none

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-refusals.test.ts::C-777b5224 each refused admin change appends one change refused event (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-028: Criterion C-e4402b02 (admin-api › A refused change is audited › A failing audit changes nothing): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-e4402b02 (admin-api › A refused change is audited › A failing audit changes nothing)

### Context
Criterion C-e4402b02 (admin-api › A refused change is audited › A failing audit changes nothing) is needs human after round 3.

Scenario:
\- **WHEN** the first scenario's elevation request is repeated with a pool whose client rejects statements that mention `audit_`
\- **THEN** the answer is the same 403 `ELEVATION_REFUSED`, no role is stored, and the log has a warning `AUDIT_FAILED`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-refusals.test.ts::C-e4402b02 a failing refusal audit keeps the answer and logs the failure (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-029: Criterion C-5995b318 (admin-api › Lists page with the cursor contract › pageRows): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-5995b318 (admin-api › Lists page with the cursor contract › pageRows)

### Context
Criterion C-5995b318 (admin-api › Lists page with the cursor contract › pageRows) is needs human after round 3.

Scenario:
\- **WHEN** `pageRows(["b", "d", "a", "c", "e"], { limit: 2, cursor: null }, binding, (r) => [r])` runs with a key from `deriveCursorKey({ reveal: () => "k".repeat(64) })`, tenant `tenant_a`, scope `teams`, then with each `next_cursor`, with no rows, with a cursor made for `tenant_b` and one made for scope `roles`
\- **THEN** the pages hold `a, b`, `c, d`, `e` with `next_cursor` set, set, `null`; the empty list gives `{ items: [], next_cursor: null }`; the last two throw `ApiError` 400 `CURSOR_INVALID`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-page.test.ts::C-5995b318 pageRows cuts a whole list into ordered pages under cursors (passed, red_assertion); src.api.admin-page.test.ts::C-5995b318 pageRows refuses a cursor position of another length (passed, red_assertion); src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-030: Criterion C-4c8964eb (admin-api › Lists page with the cursor contract › Without an engine key): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-4c8964eb (admin-api › Lists page with the cursor contract › Without an engine key)

### Context
Criterion C-4c8964eb (admin-api › Lists page with the cursor contract › Without an engine key) is needs human after round 3.

Scenario:
\- **WHEN** `pageRows` has `key: null` and gets 2 rows with limit 5, the same with a cursor, and 3 rows with limit 2
\- **THEN** the first gives both rows and `next_cursor: null`; the second and the third throw `ApiError` 503 `ENGINE_KEY_REQUIRED`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-page.test.ts::C-4c8964eb pageRows without an engine key serves one page and refuses a cursor (passed, red_assertion); src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-031: Criterion C-eec17a85 (admin-api › Lists page with the cursor contract › Through the server): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-eec17a85 (admin-api › Lists page with the cursor contract › Through the server)

### Context
Criterion C-eec17a85 (admin-api › Lists page with the cursor contract › Through the server) is needs human after round 3.

Scenario:
\- **WHEN** tenant A has teams `a1` to `a5` and humans ann and bob, and carol walks `GET /api/v1/teams?limit=2`, edits a cursor, sends the cursor of `GET /api/v1/roles?limit=1` to `/teams`; and a server with `engineKey: null` answers `GET /api/v1/teams?limit=50`, `?limit=2`, `?cursor=x` and `GET /api/v1/users?limit=1`
\- **THEN** the walk gives 2, 2, 1 teams once each; the edited and foreign cursors are 400 `CURSOR_INVALID`; the keyless server answers 200, then 503 `ENGINE_KEY_REQUIRED` three times

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.admin-teams.test.ts::C-eec17a85 C-5995b318 C-4c8964eb teams paging walks cursors and a keyless server refuses paging (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-032: Criterion C-ddb4acf0 (admin-api › The engine serves the admin routes and documents them › The real engine): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-ddb4acf0 (admin-api › The engine serves the admin routes and documents them › The real engine)

### Context
Criterion C-ddb4acf0 (admin-api › The engine serves the admin routes and documents them › The real engine) is needs human after round 3.

Scenario:
\- **WHEN** `main` runs (port 0, no database) with `inspectServers`, and `docs/api/openapi.json` is read after an `assert.ok` that it exists
\- **THEN** the public server defines the 19 routes with their actions, `unregisteredRouteErrors` of all defined routes is `[]`, the document holds every one of the 19 paths and equals `servedOpenApiText()`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.main.admin.test.ts::C-ddb4acf0 the real engine serves the admin routes and the OpenAPI document (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-033: Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan)

### Context
Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan) is needs human after round 3.

Scenario:
\- **WHEN** `checkApiErrorCodes` runs on a snapshot whose `src/x/a.ts` has `throw new ApiError(409, "FLOW_EXISTS", "x")` on line 3, with the registered list `["NOT_FOUND"]`
\- **THEN** it returns one violation with code `ARCH_API_ERROR_CODE`, file `src/x/a.ts`, line 3, and a message that names `FLOW_EXISTS` and `src/api/error-codes.ts`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-034: Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass)

### Context
Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass) is needs human after round 3.

Scenario:
\- **WHEN** a snapshot holds `new ApiError(404, "NOT_FOUND", "m")`, `new ApiError(500, code, "m")` and a `src/x/a.test.ts` with the literal `"FLOW_EXISTS"`
\- **THEN** `checkApiErrorCodes` returns `[]`, and also `[]` over `readSnapshot()` with the default registry

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-035: Criterion C-541ef4f9 (api-conventions › Every error code is registered › Route errors): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier
- **Criteria:** C-541ef4f9 (api-conventions › Every error code is registered › Route errors)

### Context
Criterion C-541ef4f9 (api-conventions › Every error code is registered › Route errors) is needs human after round 3.

Scenario:
\- **WHEN** `unregisteredRouteErrors` gets `GET /a` with errors `["NOT_FOUND", "NOPE"]` and `POST /b` with `[]`
\- **THEN** it returns `["GET /a: NOPE"]`, and `[]` for no routes (the real engine's routes are checked in "The real engine" of the OpenAPI requirement)

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-036: Hold H-0b1cd52c: the judge's reply was discarded (part 3 of 4, timeout: no answer within 600s)

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: the judge's reply was discarded (part 3 of 4, timeout: no answer within 600s)

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
