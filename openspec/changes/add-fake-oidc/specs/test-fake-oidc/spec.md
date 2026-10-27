## Purpose

A Keycloak-26-shaped OIDC provider for the test gates, plus the protocol contract suite that also runs against real Keycloak. It lets identity code and browser journeys run with no Docker, network or secret, and gives negative tests a source of precisely broken tokens.

## ADDED Requirements

### Requirement: The provider binds loopback only and stops cleanly
`startFakeOidc(opts?)` SHALL listen only on a loopback host, answer only requests whose `Host` header names that loopback address and port, and stop completely on `close()`.

#### Scenario: Default start
- **WHEN** `startFakeOidc()` resolves and `GET {issuer}/.well-known/openid-configuration` is sent
- **THEN** `url` matches `^http://127\.0\.0\.1:\d+$`, `issuer` equals `url + "/realms/ursitoare"` and the answer is 200

#### Scenario: Bad options
- **WHEN** `startFakeOidc` gets `{ host: "0.0.0.0" }`, `{ host: "192.168.1.5" }`, `{ port: 70000 }`, `{ now: 5 }`, `{ redirectUri: "javascript:x" }`, or the `port` of a running fake
- **THEN** each promise rejects with `FakeOidcError` `FAKE_OIDC_START_FAILED` and no listener is left

#### Scenario: Foreign Host header, unknown path, wrong method
- **WHEN** a raw `node:http` request carries `Host: evil.example:<port>`, then `GET /nope` and `POST` to the discovery path are sent
- **THEN** the answers are 400 `{"error":"invalid_request"}`, 404 `{"error":"not_found"}` and 405 with `Allow: GET`

#### Scenario: Close is idempotent and complete
- **WHEN** a keep-alive connection is open and `close()` is called twice
- **THEN** both calls resolve and a new connection to the port is refused; two fakes started together have different ports and different JWKS `kid` values

### Requirement: Discovery and JWKS mirror the Keycloak realm paths
The provider SHALL serve discovery at `/realms/ursitoare/.well-known/openid-configuration` and a JWKS of RS256 keys at `/realms/ursitoare/protocol/openid-connect/certs`, and `rotateSigningKey()` SHALL add a key without removing the old one.

#### Scenario: Discovery fields
- **WHEN** the discovery document is fetched
- **THEN** `issuer` equals `fake.issuer`; `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `end_session_endpoint` and `jwks_uri` equal the issuer plus `/protocol/openid-connect/` followed by `auth`, `token`, `userinfo`, `logout` and `certs`; `grant_types_supported` equals `["authorization_code"]`, `id_token_signing_alg_values_supported` equals `["RS256"]`, `code_challenge_methods_supported` equals `["S256"]`; `token_endpoint_auth_methods_supported` includes `client_secret_basic`; `scopes_supported` includes `openid` and `organization`

#### Scenario: JWKS shape and verification
- **WHEN** the JWKS is fetched and `fake.mintToken({})` is verified with `verifyRs256`
- **THEN** it holds one key with `kty` `RSA`, `use` `sig`, `alg` `RS256`, a non-empty `kid`, `n` and `e`; the token header `kid` equals that `kid`; both responses carry `cache-control: no-store`

#### Scenario: Rotation keeps old tokens valid
- **WHEN** a token is minted, `rotateSigningKey()` is called and a second token is minted
- **THEN** the JWKS holds two keys, the two `kid` values differ, and each token verifies against its own key

### Requirement: The login page uses Keycloak's labels and is accessible
The authorization endpoint SHALL render, for a valid request, an HTML form with exactly one control labelled `Username or email`, exactly one labelled `Password` and exactly one button named `Sign In`, and SHALL escape every reflected value.

#### Scenario: Labels and structure
- **WHEN** a valid authorization request is sent with `GET`
- **THEN** the answer is 200 `text/html`; `<html lang="en">`, a `<title>` and one `<h1>` exist; `<label for="username">Username or email</label>` matches `<input id="username" name="username">`; `<label for="password">Password</label>` matches `<input id="password" name="password" type="password">`; `<button type="submit">Sign In</button>` exists; the form has `method="post"` and `id="kc-form-login"`

#### Scenario: Escaping and no echo
- **WHEN** `renderLoginPage({ action: "/a?x=1&y=2", username: "\"><script>1</script>", error: "<b>" })` runs
- **THEN** the HTML contains no `<script>` and no `<b>`, `&amp;` stands for the `&` in `action`, and a wrong-password POST answer never contains the submitted password

### Requirement: The authorization endpoint validates the request and issues a one-use code
The endpoint at `/realms/ursitoare/protocol/openid-connect/auth` SHALL check `client_id` and an exact `redirect_uri`, accept only `response_type=code`, scope `openid` and PKCE method `S256`, and on a correct password redirect to the `redirect_uri` with a fresh `code` and the unchanged `state`.

#### Scenario: Sign-in succeeds
- **WHEN** `registerRedirect("http://127.0.0.1:9/cb")` was called and alice's username and `passwordOf("alice")` are posted with a valid query (`state=s1`)
- **THEN** the answer is 302 with `Location` `http://127.0.0.1:9/cb?code=<code>&state=s1`, the code has at least 43 characters, and two sign-ins give two different codes

#### Scenario: Redirect URI and client are matched exactly
- **WHEN** `redirect_uri` is the registered value plus `/`, plus `?x=1`, or `https://evil.example/cb`, or `client_id` is `nope`
- **THEN** each answer is 400 `text/html` containing `Invalid parameter: redirect_uri` or `Invalid parameter: client_id`, with no `Location` header and no form

#### Scenario: Protocol errors go back to the client
- **WHEN** the query has `code_challenge_method=plain`, or no `code_challenge`, or `response_type=token`, or `scope=profile`
- **THEN** each answer is 302 to the registered redirect with `error` `invalid_request`, `invalid_request`, `unsupported_response_type` and `invalid_scope`, `state` unchanged, and no `code` in the `Location`

#### Scenario: Wrong password and unknown user look alike
- **WHEN** alice posts a wrong password, and `eve` posts any password
- **THEN** both answers are 200 with the identical message `Invalid username or password.` in an element with `role="alert"`, the username input holds the submitted name, and neither has a `Location` header

### Requirement: The token endpoint exchanges a code once, with PKCE and client authentication
The token endpoint SHALL accept `grant_type=authorization_code` only, verify the PKCE S256 verifier, authenticate the confidential client with `client_secret_basic`, accept a code once within 60 seconds of the injected clock, and require the exact `redirect_uri`.

#### Scenario: Confidential exchange
- **WHEN** a code from the engine client is posted with `Authorization: Basic base64("ursitoare-engine:" + clientSecret("ursitoare-engine"))`, the same `redirect_uri` and the right `code_verifier`
- **THEN** the answer is 200 JSON with `access_token`, `id_token`, `token_type` `Bearer`, `expires_in` `300` and `scope`, and `cache-control: no-store`

#### Scenario: One use, even in parallel
- **WHEN** the same valid code is posted twice in a row, and a second code twice at once with `Promise.all`
- **THEN** the second sequential post is 400 `invalid_grant`; of the parallel pair exactly one is 200 and one 400

#### Scenario: Sixty seconds on the injected clock
- **WHEN** one code is exchanged 59 s after its issue and another 60 s after its issue, by moving the `now` function
- **THEN** the first answer is 200 and the second is 400 `invalid_grant`

#### Scenario: Verifier and redirect mismatch
- **WHEN** the verifier is wrong, then the right verifier is tried on the same code, and a second code is posted with another `redirect_uri`
- **THEN** all three answers are 400 `invalid_grant` (a failed attempt consumes the code)

#### Scenario: Client authentication
- **WHEN** the secret is wrong, the header is absent, the secret is sent only in the form body, or a code issued to `ursitoare-mcp` is posted with engine credentials
- **THEN** the first three answers are 401 `invalid_client` with `WWW-Authenticate: Basic realm="ursitoare"` and the fourth is 400 `invalid_grant`

#### Scenario: Bad requests
- **WHEN** `grant_type=password` is posted, then a JSON body, then a body of 65537 bytes, then a form without `code`
- **THEN** the answers are 400 `unsupported_grant_type`, 400 `invalid_request`, 413 `invalid_request` and 400 `invalid_request`

#### Scenario: Public client
- **WHEN** a code for `ursitoare-mcp` is posted with `client_id` in the body, no secret and the right verifier, and `clientSecret("ursitoare-mcp")` is called
- **THEN** the exchange is 200 and its access token has `aud` `ursitoare-mcp`; the call throws `FakeOidcError` `FAKE_OIDC_PUBLIC_CLIENT`

### Requirement: Tokens carry the Keycloak claim shapes for the seed users
ID and access tokens SHALL be RS256 JWTs with `iss` equal to the issuer, a stable `sub`, `aud`, `azp`, `iat` from the injected clock, `exp` 300 s later, `email`, `name`, `preferred_username`, `groups` without a leading slash, and `organization` as a list of aliases only when the scope includes `organization`.

#### Scenario: Alice's ID token
- **WHEN** alice signs in with scope `openid profile email organization` and `nonce=n-1` at the fixed time `2026-10-25T12:00:00Z`, and the code is exchanged
- **THEN** the claims are `iss` the issuer, `aud` and `azp` `ursitoare-engine`, `typ` `ID`, `iat` 1792929600, `exp` 1792929900, `nonce` `n-1`, `email` `alice@example.invalid`, `name` `Alice Example`, `preferred_username` `alice`, `organization` `["org-a"]`, `groups` `["ursitoare-authors","team-finance"]`; the header has `alg` `RS256`, `typ` `JWT` and a `kid` of the JWKS

#### Scenario: The four seed users and stable subjects
- **WHEN** tokens are minted for bob, carol and mallory, and for alice by a second fake
- **THEN** their groups are `["ursitoare-approvers","team-finance"]`, `["ursitoare-admins"]` and `["ursitoare-authors"]`; `organization` is `["org-a"]`, `["org-a"]` and `["org-b"]`; every `sub` is a UUID, alice's `sub` is the same in both fakes and differs from bob's

#### Scenario: Scope and nonce gating, access token
- **WHEN** the scope is `openid profile email` with no `nonce`
- **THEN** the ID token has neither `organization` nor `nonce`; the access token has `typ` `Bearer`, `azp` and `aud` equal to the client id, a `scope` claim, and the same `sid` as the ID token

### Requirement: Userinfo answers only for a live access token
The userinfo endpoint SHALL return the profile claims for a valid, unexpired access token signed by a key of the JWKS whose session has not ended, and 401 `invalid_token` otherwise.

#### Scenario: Valid token
- **WHEN** `GET` and `POST` carry alice's access token as a bearer
- **THEN** both answers are 200 JSON with `sub` equal to the token's, `email`, `name`, `preferred_username`, `organization` `["org-a"]` and `groups`

#### Scenario: Refusals
- **WHEN** the header is absent, is `Bearer garbage`, or carries a token minted with `kind: "access"` and flaw `expired`, `foreign_key` or `alg_none`
- **THEN** each answer is 401 `{"error":"invalid_token"}` with `WWW-Authenticate` starting `Bearer`

### Requirement: End-session ends the session and redirects only to registered URIs
The logout endpoint SHALL require a valid `id_token_hint`, end that token's session, and redirect to `post_logout_redirect_uri` only when it equals a registered redirect or post-logout URI of the client.

#### Scenario: Logout with redirect
- **WHEN** logout is called with alice's `id_token_hint`, `post_logout_redirect_uri` equal to her registered redirect and `state=s2`, then userinfo is called with her access token
- **THEN** the logout answer is 302 to that URI with `state=s2` and userinfo is 401; a second identical logout is 302 again

#### Scenario: Unregistered target or bad hint
- **WHEN** the target is `https://evil.example/x`, or `id_token_hint` is garbage, absent, or a token with flaw `alg_none` or `foreign_key`
- **THEN** each answer is 400 `invalid_request` with no `Location` header and alice's userinfo still answers 200

#### Scenario: Post-logout URI and no target
- **WHEN** `registerRedirect("http://127.0.0.1:9/bye", { postLogout: true })` was called and logout is called once with that target and once with none
- **THEN** the first is 302 to `/bye`; the second is 200 `text/html` containing `You are logged out`

### Requirement: mintToken builds tokens that are wrong in exactly one way
`fake.mintToken(opts)` SHALL return a JWT for the given user, client and kind that is valid when `flaw` is `none` or absent, and wrong in exactly the named way otherwise.

#### Scenario: Valid by default
- **WHEN** `mintToken({ nonce: "n-2" })` is decoded and verified
- **THEN** it is an ID token of alice for `ursitoare-engine` with `nonce` `n-2`, and `verifyRs256` against the JWKS key is `true`

#### Scenario: Claim flaws
- **WHEN** the flaw is `wrong_aud`, `wrong_iss`, `expired`, `missing_nonce`, `wrong_nonce` or `two_organizations` (with `nonce: "n-2"`, user alice, time fixed)
- **THEN** respectively `aud` is `wrong-audience`; `iss` is the issuer plus `/other`; `exp` is 300 s before the clock and `iat` 600 s before; `nonce` is absent; `nonce` is `n-2-mismatch`; `organization` is `["org-a","org-b"]`; every other claim equals the valid token's and the signature verifies

#### Scenario: Signature flaws
- **WHEN** the flaw is `alg_none`, `hs256_public_key`, `unknown_kid` or `foreign_key`
- **THEN** respectively the header `alg` is `none` with an empty signature part; `alg` is `HS256` and the signature equals HMAC-SHA256 keyed with the JWKS key's PEM text, while `verifyRs256` is `false`; `kid` is `unknown-kid`, absent from the JWKS, and the current key's signature checks; `kid` equals the current `kid` yet `verifyRs256` is `false`

#### Scenario: Unknown user, client or flaw
- **WHEN** `mintToken` gets `user: "eve"`, `clientId: "nope"` or `flaw: "sideways"`
- **THEN** it throws `FakeOidcError` `FAKE_OIDC_UNKNOWN_USER`, `FAKE_OIDC_UNKNOWN_CLIENT` and `FAKE_OIDC_BAD_OPTIONS`

### Requirement: Secrets are per start and never recorded
Passwords and client secrets SHALL be random per start, readable only through `passwordOf` and `clientSecret`, and `requests()` SHALL hold method, path, query, form fields and status with every secret value replaced by `[redacted]`.

#### Scenario: Per-start values
- **WHEN** two fakes are started
- **THEN** `passwordOf("alice")` and `clientSecret("ursitoare-engine")` differ between them, each has at least 24 characters, and `passwordOf("eve")` throws `FAKE_OIDC_UNKNOWN_USER`

#### Scenario: Redaction
- **WHEN** a full sign-in, token exchange, userinfo call and logout have run and `JSON.stringify(fake.requests())` is searched
- **THEN** it contains none of alice's password, the client secret, the code, the verifier, either token, or `Basic`; the sign-in entry has `form.password` `[redacted]`, the logout entry has `query.id_token_hint` `[redacted]`, and `state`, `nonce`, `code_challenge`, `path` and `status` are present; changing the returned array does not change the next call

#### Scenario: Empty log
- **WHEN** a fake has just started and `requests()` is called
- **THEN** it returns `[]`

#### Scenario: Cap
- **WHEN** `GET /first` (404) and then 5000 discovery requests are sent
- **THEN** `requests()` holds 5000 entries and none has the path `/first`

### Requirement: The contract suite runs against any base URL
`oidcContract(baseUrl, credentials)` SHALL return named checks that use only HTTP against `baseUrl` (the issuer), so that the same checks pass on the fake and on real Keycloak.

#### Scenario: All checks pass on the fake
- **WHEN** the fake is started, `registerRedirect` is called and `oidcContract(fake.issuer, credentials)` is run check by check
- **THEN** the names are `discovery document`, `jwks keys`, `code flow with PKCE`, `claims of the id token`, `userinfo with the access token`, `wrong password shows the error`, `plain PKCE is refused`, `code is single use`, `redirect uri must match exactly`, `logout ends the session`, and every `run()` resolves

#### Scenario: A broken provider fails
- **WHEN** a `node:http` stub answers discovery with `{"issuer":"<base>"}` and 404 elsewhere
- **THEN** `discovery document` and `jwks keys` reject with an `AssertionError`

#### Scenario: Unreachable provider
- **WHEN** `baseUrl` points at a closed port
- **THEN** every check rejects with `FakeOidcError` `FAKE_OIDC_CONTRACT_UNREACHABLE`
