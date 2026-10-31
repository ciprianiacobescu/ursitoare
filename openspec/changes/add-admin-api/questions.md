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
| Q-004 | open | none | verdict | Criterion C-96e47324 (api-conventions › Every error code is registered › The registry): accept as satisfied? |
| Q-005 | open | none | verdict | Finding F-cde045de: No discriminating test for cross-tenant admin isolation |
| Q-006 | open | none | verdict | Finding F-28a40cf9: Uncovered criterion C-598727de (Another tenant and a forged tenant) |
| Q-007 | open | none | verdict | Finding F-c28b995d: Uncovered criterion C-96e47324 (The registry) at gate level |
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

- **Status:** open
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
---

## Q-005: Finding F-cde045de: No discriminating test for cross-tenant admin isolation

- **Status:** open
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
---

## Q-006: Finding F-28a40cf9: Uncovered criterion C-598727de (Another tenant and a forged tenant)

- **Status:** open
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
---

## Q-007: Finding F-c28b995d: Uncovered criterion C-96e47324 (The registry) at gate level

- **Status:** open
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
