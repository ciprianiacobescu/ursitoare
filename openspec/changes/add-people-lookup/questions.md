# Questions — add-people-lookup

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
| Q-001 | answered | none | verdict | Hold H-f8921f64: UI criterion C-748ce889 has no end-to-end test; see the generated UI tests table |
| Q-002 | answered | none | verdict | Hold H-4ed1905b: UI criterion C-55e76eb6 has no end-to-end test; see the generated UI tests table |
| Q-003 | open | none | verdict | Hold H-f666a58b: UI criterion C-db4fc15e has no end-to-end test; see the generated UI tests table |
| Q-004 | open | none | verdict | Hold H-30c70910: UI criterion C-57481c19 has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-d44a38f6: UI criterion C-59f63ed0 has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-a783bd38: UI criterion C-1c488737 has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-baa4dc41: UI criterion C-a68cc186 has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-96121bdf: UI criterion C-64158aad has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-10bbd12e: UI criterion C-fb2cd0d1 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-94d8b7e3: UI criterion C-20c4fd10 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-dc3d7c1e: UI criterion C-674bb9f6 has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-3d48684d: UI criterion C-929a4c25 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Hold H-f8921f64: UI criterion C-748ce889 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-748ce889 has no end-to-end test; see the generated UI tests table

Step 5 for C-748ce889: not_testable after 1 attempt(s); getPersonNames is an internal function called with explicit id lists inside a tenant transaction; the page snapshot exposes no people-directory UI, route, or input to trigger or observe that behavior through the page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept C-748ce889 is the behaviour of getPersonNames, a server-side function with no page, route or control of its own in this unit, so no browser test can drive it; the design states that nothing renders until later units take the hooks. The Node test for the criterion seeds the six users of the test plan in embedded Postgres, runs both id lists in a tenant-A transaction and deep-equals the full expected answers, the key set of each item and the absence of the e-mails. The hold on a missing end-to-end test is therefore waived.
---

## Q-002: Hold H-4ed1905b: UI criterion C-55e76eb6 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-55e76eb6 has no end-to-end test; see the generated UI tests table

Step 5 for C-55e76eb6: not_testable after 1 attempt(s); The criterion covers backend-only behavior (getPersonNames tenant-B transactions, IdentityError IDENTITY_TENANT_MISMATCH, bare SQL row-level security against ursitoare."user") with no UI surface or page fixture to exercise it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept C-55e76eb6 checks getPersonNames in a tenant-B transaction, the IDENTITY_TENANT_MISMATCH rejection for a foreign context and a bare row-level-security SELECT; none of these has a page or route to drive from a browser. The Node test for the criterion runs all three against embedded Postgres and asserts the exact answer, the rejection code and the zero-row result, and the implementation filters on the context's tenant after assertTenantMatches. The hold on a missing end-to-end test is therefore waived.
---

## Q-003: Hold H-f666a58b: UI criterion C-db4fc15e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-db4fc15e has no end-to-end test; see the generated UI tests table

Step 5 for C-db4fc15e: not_testable after 1 attempt(s); getPersonNames is a server-side function over recording transactions and database queries; the page snapshot exposes no people-directory UI, so pytest-playwright cannot drive tenant checks, query counts, or IdentityError rejections through the browser..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-30c70910: UI criterion C-57481c19 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-57481c19 has no end-to-end test; see the generated UI tests table

Step 5 for C-57481c19: not_testable after 1 attempt(s); The criterion requires database assertions (exactly one policy_decision row with read_self/allow and unchanged audit_event count) that are not observable through the page fixture or the GET /api/v1/people public interface..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-d44a38f6: UI criterion C-59f63ed0 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-59f63ed0 has no end-to-end test; see the generated UI tests table

Step 5 for C-59f63ed0: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_59f63ed0::test_tenant_b_gets_nothing_for_tenant_a_ids[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-a783bd38: UI criterion C-1c488737 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-1c488737 has no end-to-end test; see the generated UI tests table

Step 5 for C-1c488737: writer_failed after 2 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-baa4dc41: UI criterion C-a68cc186 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a68cc186 has no end-to-end test; see the generated UI tests table

Step 5 for C-a68cc186: not_testable after 1 attempt(s); Requires direct backend calls (registerPeopleRoutes with null pool/engine, listDefinedRoutes) and database state (bob disabled) that are not reachable via the page fixture over HTTP..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-96121bdf: UI criterion C-64158aad has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-64158aad has no end-to-end test; see the generated UI tests table

Step 5 for C-64158aad: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_64158aad::test_teams_of_alice_bob_mallory_and_unchanged_me[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-10bbd12e: UI criterion C-fb2cd0d1 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-fb2cd0d1 has no end-to-end test; see the generated UI tests table

Step 5 for C-fb2cd0d1: writer_failed after 2 attempt(s); structured output missing: the reply holds no JSON object.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-94d8b7e3: UI criterion C-20c4fd10 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-20c4fd10 has no end-to-end test; see the generated UI tests table

Step 5 for C-20c4fd10: not_testable after 2 attempt(s); The criterion covers module-level functions parsePeople, parseMyTeams, personLabel and loadMyTeams, none of which are exposed through any UI page or HTTP endpoint observable from a browser; the page snapshot shows an empty app shell with no people-directory surface, so an e2e test at L4_E2E_BASE_....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-dc3d7c1e: UI criterion C-674bb9f6 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-674bb9f6 has no end-to-end test; see the generated UI tests table

Step 5 for C-674bb9f6: not_testable after 1 attempt(s); The criterion covers internal NameCache behavior (batching into 50/10, maxBatch, AbortSignal, peek, dedup, concurrent request sharing) that is not exposed through any people-directory UI or user-observable action; the page shows only an empty app root, so a user cannot trigger or observe name-cac....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-3d48684d: UI criterion C-929a4c25 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-929a4c25 has no end-to-end test; see the generated UI tests table

Step 5 for C-929a4c25: not_testable after 1 attempt(s); The criterion checks JavaScript module internals (nameCache.resolve/loadMyTeams results and request counts) and source-file contents of people.ts and use-names.ts, which are not observable through a browser page and cannot be verified by reading the server filesystem from a single-origin page-fix....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
