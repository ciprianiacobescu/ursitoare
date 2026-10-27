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
| Q-002 | open | 2.1 | technical | test/support/fake-oidc/server.test.ts:154 and :353 request a doubled realm JWKS path |
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

- **Status:** open
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
