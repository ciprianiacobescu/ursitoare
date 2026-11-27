# Questions — add-web-sign-in-followup-1

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
| Q-001 | open | none | verdict | Hold H-3127c190: UI criterion C-bfbec1c2 has no end-to-end test; see the generated UI tests table |
| Q-002 | open | none | verdict | Hold H-545ec45b: UI criterion C-01e427f8 has no end-to-end test; see the generated UI tests table |
| Q-003 | open | none | verdict | Hold H-e3f87d2a: UI criterion C-e78811f4 has no end-to-end test; see the generated UI tests table |
| Q-004 | open | none | verdict | Hold H-2023e80e: UI criterion C-cef4634b has no end-to-end test; see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-d7fe3aa5: UI criterion C-22c98964 has no end-to-end test; see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-2135a2da: UI criterion C-023c2efe has no end-to-end test; see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-8928b203: UI criterion C-5368eb23 has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-f279e66d: UI criterion C-3809dcd7 has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-aa40376f: UI criterion C-b4adf358 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-bede43a4: UI criterion C-eb130cb7 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-499b792b: UI criterion C-4b09fc8c has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-9f7f3848: UI criterion C-77971a2d has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-ad0fc545: UI criterion C-53df20c1 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-74d8aa3c: UI criterion C-c79d9365 has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-a83fac20: UI criterion C-812ae263 has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-39317e01: UI criterion C-c1ed19d8 has no end-to-end test; see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-b94b73e6: UI criterion C-39471a6a has no end-to-end test; see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-10718ca8: UI criterion C-bf32f3ba has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Hold H-3127c190: UI criterion C-bfbec1c2 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-bfbec1c2 has no end-to-end test; see the generated UI tests table

Step 5 for C-bfbec1c2: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_bfbec1c2::test_write_in_stale_tab_succeeds_after_other_tab_loads[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-002: Hold H-545ec45b: UI criterion C-01e427f8 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-01e427f8 has no end-to-end test; see the generated UI tests table

Step 5 for C-01e427f8: not_testable after 1 attempt(s); Criterion is about module-level functions (registerSignInMessages, messageFor, SIGN_IN_MESSAGES) with no browser-visible surface; it is a unit-level check, not an e2e one..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-003: Hold H-e3f87d2a: UI criterion C-e78811f4 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-e78811f4 has no end-to-end test; see the generated UI tests table

Step 5 for C-e78811f4: not_testable after 1 attempt(s); SIGN_IN_MESSAGES is an internal constant in the web bundle with no browser-visible surface to read it; the page is an SPA shell and the e2e flow cannot trigger all twelve codes..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-004: Hold H-2023e80e: UI criterion C-cef4634b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-cef4634b has no end-to-end test; see the generated UI tests table

Step 5 for C-cef4634b: not_testable after 1 attempt(s); Criterion specifies return values of the pure functions loginUrl and signInUrl, which aren't reachable from the browser UI; it belongs in a unit test, not e2e..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-005: Hold H-d7fe3aa5: UI criterion C-22c98964 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-22c98964 has no end-to-end test; see the generated UI tests table

Step 5 for C-22c98964: not_testable after 1 attempt(s); The criterion specifies the pure function signInView and its return values. A browser test can't call it, and the exact messages and link targets aren't observable through the UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-006: Hold H-2135a2da: UI criterion C-023c2efe has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-023c2efe has no end-to-end test; see the generated UI tests table

Step 5 for C-023c2efe: not_testable after 1 attempt(s); Specifies unit-level behavior of withCsrfHeader and isStateChanging with recording fetches and injected token sources; the built page does not expose these functions, so a browser test cannot check it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-007: Hold H-8928b203: UI criterion C-5368eb23 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-5368eb23 has no end-to-end test; see the generated UI tests table

Step 5 for C-5368eb23: not_testable after 1 attempt(s); Criterion is about the createBrowserSession module with injected fake fetch, loader and location; it has no browser-observable surface, so it is a unit test, not an e2e test..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-008: Hold H-f279e66d: UI criterion C-3809dcd7 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3809dcd7 has no end-to-end test; see the generated UI tests table

Step 5 for C-3809dcd7: not_testable after 1 attempt(s); Criterion targets the withSessionEnd function with fake fetches and throwing callbacks; it is a unit-level behavior with no user-visible browser flow to drive..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-009: Hold H-aa40376f: UI criterion C-b4adf358 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b4adf358 has no end-to-end test; see the generated UI tests table

Step 5 for C-b4adf358: not_testable after 1 attempt(s); The criterion is a unit contract of the redirectToSignIn function (return values and a recording assign for four injected locations); a browser cannot inject those inputs or observe those return values..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-010: Hold H-bede43a4: UI criterion C-eb130cb7 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-eb130cb7 has no end-to-end test; see the generated UI tests table

Step 5 for C-eb130cb7: not_testable after 1 attempt(s); Criterion is about unit-level functions safeRedirect and signOut with mocked post/loader; not reachable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-011: Hold H-499b792b: UI criterion C-4b09fc8c has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-4b09fc8c has no end-to-end test; see the generated UI tests table

Step 5 for C-4b09fc8c: not_testable after 1 attempt(s); Criterion is about the signOut function's injected post/reset/load mocks and return values; it has no browser-observable behaviour (a unit-level test)..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-012: Hold H-9f7f3848: UI criterion C-77971a2d has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-77971a2d has no end-to-end test; see the generated UI tests table

Step 5 for C-77971a2d: not_testable after 1 attempt(s); Criterion specifies results of the signOut function with a mocked `post` and counted `reset` calls; it is a unit-level contract, not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-013: Hold H-ad0fc545: UI criterion C-53df20c1 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-53df20c1 has no end-to-end test; see the generated UI tests table

Step 5 for C-53df20c1: not_testable after 1 attempt(s); Criterion scans source files (auth.css, .tsx) with static helpers; it is not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-74d8aa3c: UI criterion C-c79d9365 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c79d9365 has no end-to-end test; see the generated UI tests table

Step 5 for C-c79d9365: not_testable after 1 attempt(s); Criterion concerns the collectSeedData function of the e2e stack support code (unit-level behaviour), not anything a user sees in the browser..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-a83fac20: UI criterion C-812ae263 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-812ae263 has no end-to-end test; see the generated UI tests table

Step 5 for C-812ae263: not_testable after 1 attempt(s); Criterion concerns server-side test-stack seeding (database, tenant resolution, STACK_PART_MISSING) via TypeScript functions; no browser-observable behaviour..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-39317e01: UI criterion C-c1ed19d8 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c1ed19d8 has no end-to-end test; see the generated UI tests table

Step 5 for C-c1ed19d8: not_testable after 1 attempt(s); Concerns internal e2e-stack seeding functions (seedUsersOf, tenantBPart.start, handle.env); not observable through the browser UI..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-b94b73e6: UI criterion C-39471a6a has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-39471a6a has no end-to-end test; see the generated UI tests table

Step 5 for C-39471a6a: not_testable after 1 attempt(s); Concerns the e2e stack's build-time part discovery and a source file's contents, not browser-observable behaviour..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-018: Hold H-10718ca8: UI criterion C-bf32f3ba has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-bf32f3ba has no end-to-end test; see the generated UI tests table

Step 5 for C-bf32f3ba: not_testable after 1 attempt(s); The criterion constructs startControlServer with port 0 and custom seedData variants (absent, throwing). A browser test against the running stack can't create those servers..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
