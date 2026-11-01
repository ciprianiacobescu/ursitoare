# Questions — add-flow-registry

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
| Q-001 | answered | none | verdict | Criterion C-96e47324 (api-conventions › Every error code is registered › The registry): accept as satisfied? |
<!-- l4:index:end -->

---

## Q-001: Criterion C-96e47324 (api-conventions › Every error code is registered › The registry): accept as satisfied?

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
\- **THEN** it has exactly these 23 entries, `CODE status "message"`, and `isRegisteredCode` is true for each and false for `cursor_invalid`, `""` and `NOT_A_CODE`: `NOT_FOUND 404 "Route not found"`, `VALIDATION_FAILED 400 "Request validation failed"`, `PAYLOAD_TOO_LARGE 413 "Payload too large"`, `UNSUPPORTED_MEDIA_TYPE 415 "Unsupported media type"`, `BAD_REQUEST 400 "Bad request"`, `INTERNAL 500 "Internal server error"`, `WEB_NOT_BUILT 503 "Web app is not built"`, `UNAUTHENTICATED 401 "Authentication required"`, `FORBIDDEN 403 "Action not permitted"`, `CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_NOT_CONFIGURED 503 "Sign-in is not configured"`, `AUTHZ_UNAVAILABLE 503 "Authorization is unavailable"`, `CURSOR_INVALID 400 "Cursor is invalid"`, `IDEMPOTENCY_KEY_REUSED 422 "Idempotency key was used with a different request"`, `IDEMPOTENCY_IN_PROGRESS 409 "A request with this idempotency key is in progress"`, `ALREADY_EXISTS 409 "Resource already exists"`, `IN_USE 409 "Resource is in use"`, `ELEVATION_REFUSED 403 "Role cannot be granted by this principal"`, `UNKNOWN_ISSUER 422 "Issuer is not routed to this tenant"`, `OPERATION_REFUSED 422 "Operation is refused"`, `ENGINE_KEY_REQUIRED 503 "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)"`, `FLOW_TEXT_INVALID 422 "Flow text is not a readable flow document"`

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422 (passed, red_assertion, inadequate)
Ignored tests: src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied as it stands. ERROR_CODES in src/api/error-codes.ts holds exactly the 23 entries the scenario lists, each with the exact status and message, FLOW_TEXT_INVALID 422 "Flow text is not a readable flow document" included, and isRegisteredCode is an own-property check, so it is true for each of the 23 and false for cursor_invalid, the empty string and NOT_A_CODE. The frozen test in src/api/error-codes.test.ts asserts the whole scenario: the sorted key set equals the 23 expected keys, each entry deep-equals its expected status and message, isRegisteredCode is true for every expected code and false for the three unregistered strings. It was ignored only because, as a frozen test modified by this unit, it has no red record, not because it fails or is weak. The flow-errors test was called inadequate only because it checks the FLOW_TEXT_INVALID entry alone, which is correct but partial. The judge passed the criterion, and the gate failure shown is a type error in src/registry/flows/versions.test.ts, unrelated to the registry.
