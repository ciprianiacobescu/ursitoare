# Questions — add-fake-oidc

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
| Q-001 | accepted | 1.4 | technical | test/support/fake-oidc/tokens.test.ts:182: signature-flaw tokens are compared to a base token carrying a nonce they never receive |
| Q-002 | accepted | 2.1 | technical | test/support/fake-oidc/server.test.ts:154 and :353 request a doubled realm JWKS path |
| Q-003 | accepted | 2.2 | technical | test/support/fake-oidc/authorize.test.ts:45 and :88 double the /realms/ursitoare prefix in the authorization URL |
| Q-004 | open | none | verdict | Criterion C-d4e4e5a6 (test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Protocol errors go back to the client): accept as satisfied? |
| Q-005 | open | none | verdict | Finding F-818a6c14: task 3.1: the jwks keys check inspects only the first key, not 'at least one' RS256 key |
<!-- l4:index:end -->

---

## Q-001: test/support/fake-oidc/tokens.test.ts:182: signature-flaw tokens are compared to a base token carrying a nonce they never receive

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.4
- **Kind:** technical
- **Asked:** 2026-10-27T12:06Z by deepseek, run r-20261027T1141Z-cd31, task 1.4

### Context
The signature-flaw test builds `base` with `mintJwt(ctx, { nonce: "n-2" })`, then mints the `alg_none`, `hs256_public_key`, `unknown_kid` and `foreign_key` tokens as `mintJwt(ctx, { flaw })` with no nonce, and asserts `assert.deepEqual(<flaw payload>, base)` at lines 191, 203, 223 and 229. The spec (C-5a6e5b58) requires the ID token to have no `nonce` when none was supplied, so a correct implementation can never make these payloads equal: the tests fail on the missing `nonce` claim rather than on the signature flaw.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/fake-oidc/tokens.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-fake-oidc`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/fake-oidc/tokens.test.ts`: change line 182 from ` const base = payloadOf(mintJwt(ctx, { nonce: "n-2" }));` to ` const base = payloadOf(mintJwt(ctx, {}));`
2. Edit `test/support/fake-oidc/tokens.test.ts`: at lines 185, 193, 205 and 225 pass a nonce too, e.g. `mintJwt(ctx, { nonce: "n-2", flaw: "alg_none" })` and likewise for the other three flaws.

### Clarifier suggestion
Edit `test/support/fake-oidc/tokens.test.ts`: change line 182 from `    const base = payloadOf(mintJwt(ctx, { nonce: "n-2" }));` to `    const base = payloadOf(mintJwt(ctx, {}));`

### Answer
<!-- write below this line -->

---

## Q-002: test/support/fake-oidc/server.test.ts:154 and :353 request a doubled realm JWKS path

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-10-27T12:28Z by deepseek, run r-20261027T1208Z-1537, task 2.1

### Context
C-0aaa91d6 requires fake.issuer to equal fake.url + "/realms/ursitoare", and C-852e549c requires jwks_uri to be fake.issuer + "/protocol/openid-connect/certs". The test constant PROTOCOL is already "/realms/ursitoare/protocol/openid-connect", so `${fake.issuer}${PROTOCOL}/certs` requests /realms/ursitoare/realms/ursitoare/protocol/openid-connect/certs and gets 404 instead of the JWKS. This makes C-a715e6d5, C-5938a11f, C-271f3bbf and C-7f218491 impossible to satisfy without deviating from design decision 3 (all other paths return 404).

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/fake-oidc/server.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-fake-oidc`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/fake-oidc/server.test.ts`: change `${fake.issuer}${PROTOCOL}/certs` to `${fake.url}${PROTOCOL}/certs` in jwksOf (line 154) and in C-a715e6d5 (line 353).
2. Keep the test unchanged and have the fake also serve JWKS at /realms/ursitoare/realms/ursitoare/protocol/openid-connect/certs, contradicting design decision 3 that other paths are 404.

### Clarifier suggestion
Edit `test/support/fake-oidc/server.test.ts`: change `${fake.issuer}${PROTOCOL}/certs` to `${fake.url}${PROTOCOL}/certs` in jwksOf (line 154) and in C-a715e6d5 (line 353).

### Answer
<!-- write below this line -->

---

## Q-003: test/support/fake-oidc/authorize.test.ts:45 and :88 double the /realms/ursitoare prefix in the authorization URL

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.2
- **Kind:** technical
- **Asked:** 2026-10-27T12:42Z by deepseek, run r-20261027T1230Z-07f9, task 2.2

### Context
Line 45 (authUrl) and line 88 build the request as `${fake.issuer}${AUTH_PATH}` where AUTH_PATH = "/realms/ursitoare/protocol/openid-connect/auth". The provider's issuer is already `${fake.url}/realms/ursitoare` (asserted green in server.test.ts:168 and required by the spec), so the request path becomes /realms/ursitoare/realms/ursitoare/protocol/openid-connect/auth. The task requires the auth route at /realms/ursitoare/protocol/openid-connect/auth, and line 100 asserts the form action is exactly `${AUTH_PATH}?${query}` (single realm), so the same test demands two different paths. No legitimate handler can satisfy both. The request URLs should use fake.url (the server origin) instead of fake.issuer.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/fake-oidc/authorize.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-fake-oidc`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/fake-oidc/authorize.test.ts`: on line 45 change `${fake.issuer}${AUTH_PATH}` to `${fake.url}${AUTH_PATH}` and on line 88 make the same change to `${fake.url}${AUTH_PATH}`; leave the action assertion at line 100 unchanged.

### Clarifier suggestion
Edit `test/support/fake-oidc/authorize.test.ts`: on line 45 change `${fake.issuer}${AUTH_PATH}` to `${fake.url}${AUTH_PATH}` and on line 88 make the same change to `${fake.url}${AUTH_PATH}`; leave the action assertion at line 100 unchanged.

### Answer
<!-- write below this line -->

---

## Q-004: Criterion C-d4e4e5a6 (test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Protocol errors go back to the client): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-d4e4e5a6 (test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Protocol errors go back to the client)

### Context
Criterion C-d4e4e5a6 (test-fake-oidc › The authorization endpoint validates the request and issues a one-use code › Protocol errors go back to the client) is needs human after round 1.

Scenario:
\- **WHEN** the query has `code_challenge_method=plain`, or no `code_challenge`, or `response_type=token`, or `scope=profile`
\- **THEN** each answer is 302 to the registered redirect with `error` `invalid_request`, `invalid_request`, `unsupported_response_type` and `invalid_scope`, `state` unchanged, and no `code` in the `Location`

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: test.support.fake-oidc.authorize.test.ts::C-d4e4e5a6 protocol errors redirect to the client with the unchanged state and no code (passed, red_assertion, inadequate)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-005: Finding F-818a6c14: task 3.1: the jwks keys check inspects only the first key, not 'at least one' RS256 key

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-34b4df4c).

Title: task 3.1: the jwks keys check inspects only the first key, not 'at least one' RS256 key
Detail: Task 3.1 check 2 requires that `keys` holds at least one key with `alg` RS256 and a non-empty kid, n and e. checkJwks asserts these on `keys[0]` only. Real Keycloak JWKS often lists an RSA-OAEP encryption key alongside the signing key, so the contract can fail against Keycloak even though a valid RS256 key is present.
Suggested fix: Find a key with `alg === "RS256"` in `keys` and assert kid, n and e on that key.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-34b4df4c as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
