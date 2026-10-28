# Questions — add-oidc-login

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
| Q-001 | accepted | 4.1 | technical | src/identity/oidc/client.test.ts:36 configFor hard-codes the client secret |
| Q-002 | open | 6.1 | technical | src/identity/oidc/login.test.ts:130-131 authorizationParams asserts an impossible URL origin and path |
<!-- l4:index:end -->

---

## Q-001: src/identity/oidc/client.test.ts:36 configFor hard-codes the client secret

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path src/identity/oidc/client.test.ts of task 4.1; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-10-28T21:49Z by deepseek-free, run r-20261028T2116Z-5ed1, task 4.1

### Context
The C-5a0077b2 Code exchange test creates the client with configFor(fake.issuer), which returns new Secret("client-secret") (line 36), while startFakeOidc draws a fresh random secret for client ursitoare-engine. A spec-conforming exchangeCode sends Basic auth using config.clientSecret, so the fake replies 401 invalid_client and the test's assert.doesNotReject fails; the test expects the first exchange to return a three-part id_token. Verified directly: the literal secret gets 401 {"error":"invalid_client"}, while fake.clientSecret("ursitoare-engine") passes authentication.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/identity/oidc/client.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-oidc-login`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/identity/oidc/client.test.ts`: change line 33 to `function configFor(issuer: string, clientSecret = "client-secret"): {`, change line 36 to `return { issuer, clientId: "ursitoare-engine", clientSecret: new Secret(clientSecret) };`, and change line 262 to `const client = createOidcClient({ config: configFor(fake.issuer, fake.clientSecret("ursitoare-engine")), clock });`
2. Edit `src/identity/oidc/client.test.ts`: in the C-5a0077b2 test only, replace `configFor(fake.issuer)` with a config whose clientSecret is `new Secret(fake.clientSecret("ursitoare-engine"))`.

### Clarifier suggestion
Edit `src/identity/oidc/client.test.ts`: change line 33 to `function configFor(issuer: string, clientSecret = "client-secret"): {`, change line 36 to `return { issuer, clientId: "ursitoare-engine", clientSecret: new Secret(clientSecret) };`, and change line 262 to `const client = createOidcClient({ config: configFor(fake.issuer, fake.clientSecret("ursitoare-engine")), clock });`

### Answer
<!-- write below this line -->

---

## Q-002: src/identity/oidc/login.test.ts:130-131 authorizationParams asserts an impossible URL origin and path

- **Status:** open
- **Blocking tasks:** 6.1
- **Kind:** technical
- **Asked:** 2026-10-28T22:33Z by deepseek-free, run r-20261028T2156Z-19b4, task 6.1

### Context
The helper asserts `new URL(Location).origin === fake.issuer` and `Location` pathname === `/protocol/openid-connect/auth`. But `startFakeOidc` returns `fake.issuer === <scheme://host:port>/realms/ursitoare`, and design decision 5 says Location is the discovery authorization endpoint, `<fake.issuer>/protocol/openid-connect/auth`. Its URL origin is only `<scheme://host:port>` (never the issuer with its path) and its pathname is `/realms/ursitoare/protocol/openid-connect/auth`, so both assertions cannot hold. All other tests pass; this is the only failure.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/identity/oidc/login.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-oidc-login`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/identity/oidc/login.test.ts`: replace `assert.equal(location.origin, fake.issuer);` with `assert.equal(location.origin, new URL(fake.issuer).origin);` and replace `assert.equal(location.pathname, "/protocol/openid-connect/auth");` with `assert.equal(location.pathname, new URL(fake.issuer).pathname + "/protocol/openid-connect/auth");`
2. Edit `src/identity/oidc/login.test.ts`: replace the two assertions with `assert.equal(location.href.startsWith(fake.issuer + "/protocol/openid-connect/auth?"), true);`
3. Keep the test and instead change `startFakeOidc` so its `issuer` is only the origin and discovery advertises realm-qualified endpoint paths; this contradicts the existing fake OIDC contract test and the design.

### Clarifier suggestion
Edit `src/identity/oidc/login.test.ts`: replace `assert.equal(location.origin, fake.issuer);` with `assert.equal(location.origin, new URL(fake.issuer).origin);` and replace `assert.equal(location.pathname, "/protocol/openid-connect/auth");` with `assert.equal(location.pathname, new URL(fake.issuer).pathname + "/protocol/openid-connect/auth");`

### Answer
<!-- write below this line -->
