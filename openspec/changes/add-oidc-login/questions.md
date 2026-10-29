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
| Q-002 | accepted | 6.1 | technical | src/identity/oidc/login.test.ts:130-131 authorizationParams asserts an impossible URL origin and path |
| Q-003 | answered | 7.1 | technical | src/main.oidc.test.ts:55-63 writeSecretFiles seeds a client secret the fake provider never issued |
| Q-004 | accepted | 7.1 | technical | src/main.oidc.test.ts:55-63 writeSecretFiles seeds a client secret the fake provider never issued |
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

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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

---

## Q-003: src/main.oidc.test.ts:55-63 writeSecretFiles seeds a client secret the fake provider never issued

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path src/main.oidc.test.ts of task 7.1; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 7.1
- **Kind:** technical
- **Asked:** 2026-10-28T23:53Z by glm, run r-20261028T2235Z-216c, task 7.1

### Context
The frozen red test C-6370f2de (src/main.oidc.test.ts:149) must sign alice in over real HTTP and reach /flows. writeSecretFiles (src/main.oidc.test.ts:55-63) writes a random value (`randomBytes(24).toString("base64url")`) into `files.clientSecretFile`, and bootEnv hands that file to loadConfig, so the engine exchanges the code with `client_secret_basic` using a secret the fake never issued: startFakeOidc draws a fresh 32-byte secret for the confidential client `ursitoare-engine` (test/support/fake-oidc/provider.ts:114-118, seed.ts:58-61), and the fake's token endpoint authenticates by `secretMatches(secret, client.secret)` (test/support/fake-oidc/token.ts:36-38, 60-87), answering 401 invalid_client. I verified this by reproduction: the callback therefore always refuses with `OIDC_EXCHANGE_FAILED` and redirects to /sign-in, so the assertions at lines 220-235 (Location `/flows`, `ursitoare_session` cookie) can never hold; 752 of 753 tests pass, this one fails. This is the same contradiction already accepted for task 4.1 (Q-001). The half-wired test C-3e029f2d never exchanges a code, so it passes either way.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/main.oidc.test.ts`, write an answer that names its path exactly as written here or run `l4 questions accept Q-NNN --unit add-oidc-login`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/main.oidc.test.ts: change line 55 to `async function writeSecretFiles(dbPassword: string, clientSecret = randomBytes(24).toString("base64url")): Promise<SecretFiles> {`, change line 63 to `await writeFile(files.clientSecretFile, clientSecret);`, and change line 155 in the C-6370f2de test from `const files = await writeSecretFiles(password.reveal());` to `const files = await writeSecretFiles(password.reveal(), fake.clientSecret("ursitoare-engine"));`
2. Alternative: edit src/main.oidc.test.ts, in the C-6370f2de test only, after `const files = await writeSecretFiles(password.reveal());` add `await writeFile(files.clientSecretFile, fake.clientSecret("ursitoare-engine"));`

### Answer
<!-- write below this line -->
Option 1 is right: the fixture is wrong, not the engine. It is the same defect and fix as Q-001 on task 4.1. The fake provider draws its own secret for the confidential client ursitoare-engine and its token endpoint checks it, so for the sign-in test C-6370f2de writeSecretFiles must write fake.clientSecret("ursitoare-engine"), not a random value. Do not change the engine or the fake provider to make the test pass. This answer comes from an agent, and an agent's answer may not name the frozen test file, so the file stays frozen under this answer. Raise this question again on task 7.1 with option 1 first, written exactly in this form: the word Edit, a space, the test file's path (as in this question's title) inside backticks with no spaces, a colon, a space, then the whole change on the same line. Keep the change of option 1: writeSecretFiles takes a second parameter clientSecret that defaults to randomBytes(24).toString("base64url") (line 55) and writes that value to files.clientSecretFile (line 63), and the C-6370f2de test passes fake.clientSecret("ursitoare-engine") as the second argument (line 155). The harness carries an option in that form as the suggested answer, which can then be accepted.

---

## Q-004: src/main.oidc.test.ts:55-63 writeSecretFiles seeds a client secret the fake provider never issued

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 7.1
- **Kind:** technical
- **Asked:** 2026-10-29T06:02Z by deepseek-free, run r-20261029T0559Z-a74f, task 7.1

### Context
The frozen test C-6370f2de must sign alice in over real HTTP and reach /flows. writeSecretFiles (lines 55-63) writes randomBytes(24).toString("base64url") into files.clientSecretFile, and bootEnv hands that file to loadConfig, so the engine authenticates the token request with client_secret_basic using a secret the fake never issued. startFakeOidc draws its own random secret for the confidential client ursitoare-engine and its token endpoint authenticates with secretMatches(secret, client.secret), answering 401 invalid_client. The callback therefore always redirects to /sign-in?error=OIDC_EXCHANGE_FAILED, so the assertions for Location /flows and the ursitoare_session cookie at lines 220-235 can never hold. Q-003 already accepted option 1 but the agent answer did not name the frozen path, so it stays frozen; the answer asks to raise it again here with option 1 first in the exact Edit form. The half-wired test C-3e029f2d does not exchange a code and is unaffected.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/main.oidc.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-oidc-login`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/main.oidc.test.ts`: change line 55 to `async function writeSecretFiles(dbPassword: string, clientSecret = randomBytes(24).toString("base64url")): Promise<SecretFiles> {`, change line 63 to `await writeFile(files.clientSecretFile, clientSecret);`, and change line 155 in the C-6370f2de test from `const files = await writeSecretFiles(password.reveal());` to `const files = await writeSecretFiles(password.reveal(), fake.clientSecret("ursitoare-engine"));`
2. Edit `src/main.oidc.test.ts`: in the C-6370f2de test only, after `const files = await writeSecretFiles(password.reveal());` add `await writeFile(files.clientSecretFile, fake.clientSecret("ursitoare-engine"));`

### Clarifier suggestion
Edit `src/main.oidc.test.ts`: change line 55 to `async function writeSecretFiles(dbPassword: string, clientSecret = randomBytes(24).toString("base64url")): Promise<SecretFiles> {`, change line 63 to `await writeFile(files.clientSecretFile, clientSecret);`, and change line 155 in the C-6370f2de test from `const files = await writeSecretFiles(password.reveal());` to `const files = await writeSecretFiles(password.reveal(), fake.clientSecret("ursitoare-engine"));`

### Answer
<!-- write below this line -->
