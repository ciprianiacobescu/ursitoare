# identity-authn Specification

## Purpose
The engine as an OIDC relying party: sign-in by authorization code with PKCE, server-side sessions found through a tenant route, CSRF-checked logout, and refusals that are redirects with stable codes, audited once the tenant is known.

## Requirements

### Requirement: OIDC is optional and configured by three variables
The engine SHALL read `URSITOARE_OIDC_ISSUER`, `URSITOARE_OIDC_CLIENT_ID` (default `ursitoare-engine`) and `URSITOARE_OIDC_CLIENT_SECRET_FILE` into `AppConfig.oidc`, and an optional `URSITOARE_OIDC_BACKCHANNEL_URL` (an https origin, or an http origin for a private host) into `oidc.backchannelUrl`; without an issuer it SHALL start and the three routes SHALL answer 503 `OIDC_NOT_CONFIGURED`.

#### Scenario: No issuer
- **WHEN** `loadConfig` gets no OIDC variable, and `registerOidcRoutes(server, { config: null, ... })` runs on a `buildServer` server
- **THEN** `oidc` is absent; `GET /health` answers 200 with `status` `ok`; `GET /auth/oidc/login`, `GET /auth/oidc/callback` and `POST /auth/oidc/logout` answer 503 `{ error: { code: "OIDC_NOT_CONFIGURED", message: "Sign-in is not configured" } }`

#### Scenario: Valid settings
- **WHEN** the issuer is `https://idp.example/realms/ursitoare`, `http://127.0.0.1:8081/r`, `http://10.1.2.3/r`, `http://localhost:8080/r`, `http://[::1]:8080/r` or `http://keycloak:8080/realms/ursitoare`, with a generated secret file, an engine key file and a database URL
- **THEN** `oidc.issuer` equals the text, `oidc.clientId` is `ursitoare-engine` (`my-client` when `URSITOARE_OIDC_CLIENT_ID=my-client`) and `oidc.clientSecret.reveal()` is the file content without its trailing newline

#### Scenario: Bad settings
- **WHEN** the issuer is `http://idp.example/r`, `http://172.32.0.1/r`, `ftp://x/r`, `https://u:p@idp.example/r`, `https://idp.example/r?x=1`, `https://idp.example/r#f` or `nope`
- **THEN** `loadConfig` throws `ConfigError` `CONFIG_INVALID` for `URSITOARE_OIDC_ISSUER` with reason `must be an https URL, or an http URL for a private host, without credentials, query or fragment`

#### Scenario: Missing prerequisites
- **WHEN** an https issuer is set without the secret file variable, with a missing or empty secret file, with client id `bad id`, without the engine key file, without the database URL, or a client id or secret file is set without an issuer
- **THEN** the errors are `CONFIG_INVALID` for `URSITOARE_OIDC_CLIENT_SECRET_FILE` (`required when URSITOARE_OIDC_ISSUER is set`), `CONFIG_SECRET_EMPTY` twice, `CONFIG_INVALID` for `URSITOARE_OIDC_CLIENT_ID`, for `URSITOARE_OIDC_ISSUER` (`requires URSITOARE_ENGINE_KEY_FILE`, `requires URSITOARE_DATABASE_URL`) and for the stray variable (`set only together with URSITOARE_OIDC_ISSUER`); a direct `URSITOARE_OIDC_CLIENT_SECRET` is `CONFIG_INVALID`

#### Scenario: A half-wired engine is refused
- **WHEN** `registerOidcRoutes` gets a `config` with `pool: null`, or with `engineKey: null`, and `main` runs with a config holding `oidc` and an `openDatabase` that returns `null`
- **THEN** the call throws `OidcError` `OIDC_NOT_CONFIGURED`; `main` writes one fatal line with `code` `OIDC_NOT_CONFIGURED`, calls `exit(1)` and resolves `null`

#### Scenario: A back-channel origin is read as an origin
- **WHEN** the issuer is `http://localhost:8180/realms/ursitoare` with the secret file, engine key file and database URL of "Valid settings", and `URSITOARE_OIDC_BACKCHANNEL_URL` is `http://keycloak:8080`, `http://keycloak:8080/`, `https://idp-internal.example/`, `https://IDP-Internal.example:443`, `http://10.0.0.5:8080`, `http://[::1]:8080` or `http://localhost:8180`; then it is absent; then it is the empty string, also with no other OIDC variable (rows A1 to A9)
- **THEN** `oidc.backchannelUrl` is `http://keycloak:8080`, `http://keycloak:8080`, `https://idp-internal.example`, `https://idp-internal.example`, `http://10.0.0.5:8080`, `http://[::1]:8080` and `http://localhost:8180`, with `issuer`, `clientId` and `clientSecret` as without it; absent or empty, `oidc` has no `backchannelUrl` member (its keys are exactly `clientId`, `clientSecret`, `issuer`); empty with no other OIDC variable, `oidc` is absent

#### Scenario: A bad or stray back-channel value is refused
- **WHEN** beside a valid issuer the variable is `http://idp.example`, `http://172.32.0.1:8080`, `ftp://keycloak`, `http://u:p@keycloak:8080`, `http://keycloak:8080/realms/ursitoare`, `http://keycloak:8080/?x=1`, `http://keycloak:8080/#f` or `nope`; and the other combinations of rows B9 to B15 (a bad issuer, a missing secret file variable, no issuer)
- **THEN** the first eight throw `ConfigError` `CONFIG_INVALID` for `URSITOARE_OIDC_BACKCHANNEL_URL` with message `URSITOARE_OIDC_BACKCHANNEL_URL: must be an https origin, or an http origin for a private host`; a bad issuer is reported first, a bad back-channel before the missing secret file; without an issuer the back-channel (valid or not) is stray, `set only together with URSITOARE_OIDC_ISSUER`, reported after a stray client id and secret file variable

### Requirement: Login starts an authorization-code flow with PKCE
`GET /auth/oidc/login` SHALL answer 302 to the provider's authorization endpoint with `response_type=code`, the client id, the redirect URI, scope `openid profile email organization`, a fresh `state` and `nonce` and a PKCE S256 challenge, and set the encrypted `ursitoare_login` cookie.

#### Scenario: Authorization request
- **WHEN** `GET /auth/oidc/login?return_to=/flows/1` runs twice with `publicBaseUrl` `http://127.0.0.1:8080`, and once with `https://app.example`
- **THEN** each answer is 302 with `cache-control: no-store`; `Location` is the fake's authorization endpoint with the parameters above, `redirect_uri=http://127.0.0.1:8080/auth/oidc/callback`, `code_challenge_method=S256`, and `state`, `nonce`, `code_challenge` of 43 characters; the two calls differ in `state` and `nonce`; the cookie is `ursitoare_login=<base64url>; Path=/auth/oidc; Max-Age=600; HttpOnly; SameSite=Lax` (plus `Secure` only for https) and holds neither `state` nor `nonce` in clear

#### Scenario: Only a relative return_to survives
- **WHEN** `sanitizeReturnTo` gets `/flows`, `/runs/5?x=1#top`, `//evil.example`, `https://evil.example/x`, `/\evil.example`, `/a\r\nb`, `javascript:alert(1)`, `""`, `undefined`, `5`, `/auth/oidc/login`, `/` followed by 512 `x`
- **THEN** the first two return unchanged and every other call returns `/`

#### Scenario: Provider down at login
- **WHEN** the issuer points at a closed port
- **THEN** the answer is 302 to `/sign-in?error=OIDC_PROVIDER_UNAVAILABLE` and sets no cookie

### Requirement: The provider client is cached, bounded and confined to the issuer
`createOidcClient` SHALL fetch discovery, keys and tokens only from the configured issuer's origin, or from the configured back-channel origin when there is one, cache discovery and keys for 3600 s of the injected clock, refetch keys once on an unknown `kid`, and report a failed, oversize, slow or wrong answer as `OIDC_PROVIDER_UNAVAILABLE`. With a back-channel origin the authorization and end-session endpoints SHALL be on the issuer's origin, and the token and JWKS endpoints on the back-channel origin or, rewritten to it, on the issuer's origin; any other endpoint SHALL be refused with reason `origin`.

#### Scenario: Cached and refetched once
- **WHEN** `discovery()` runs twice, then after 3601 s once more; the fake rotates its key and `signingKey(newKid)` runs; `signingKey("nope")` runs
- **THEN** the fake saw 2 discovery requests; the first `signingKey` made one extra `certs` request and returned a key with `kty` `RSA`; `"nope"` made one extra request and returned `null`

#### Scenario: Hostile answers
- **WHEN** an injected `fetch` answers with another `issuer`, a `token_endpoint` on another origin, status 500, a non-JSON body, a 262145-byte body, never settles with `timeoutMs` 20, or serves a JWKS of a 1024-bit key, an `oct` key and a repeated `kid`
- **THEN** the first six calls reject `OIDC_PROVIDER_UNAVAILABLE` with a message and details holding neither URL nor body; the keys are all ignored (`signingKey` gives `null`); every request carried `redirect: "error"` and a signal

#### Scenario: Code exchange
- **WHEN** `exchangeCode(code, verifier, redirectUri)` runs with a code from `completeFakeLogin`, then again with the same code, then with a wrong verifier
- **THEN** the first returns a three-part token string and the fake logged a token request without a `client_secret` form field; the others reject `OIDC_EXCHANGE_FAILED`

#### Scenario: Discovery is requested at the back-channel origin
- **WHEN** a client with issuer `http://localhost:8180/realms/ursitoare` and back-channel `http://keycloak:8080` runs `discovery()` against document D1 (issuer and every endpoint on `http://localhost:8180`); and on new clients against D1 with `authorization_endpoint` or `end_session_endpoint` on `http://keycloak:8080`, either on `https://evil.example`, `issuer` `http://keycloak:8080/realms/ursitoare`, or `authorization_endpoint` the number 5 (rows R1 to R7)
- **THEN** the first gives `authorizeUrl` `http://localhost:8180/realms/ursitoare/protocol/openid-connect/auth` and `logoutUrl` `http://localhost:8180/realms/ursitoare/protocol/openid-connect/logout`, its only request being `GET http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration` with `redirect: "error"` and a signal; each other document rejects `OIDC_PROVIDER_UNAVAILABLE` (message `The OIDC provider is unavailable`) with `details` `{ reason: "origin" }` (the first four), `{ reason: "issuer" }`, `{ reason: "endpoint" }`, after that same one request

#### Scenario: A discovery failure is not retried on the issuer origin
- **WHEN** with that client the injected `fetch` throws a `TypeError`, or answers status 503; and with issuer `nope` and the same back-channel (rows F1 to F3)
- **THEN** `discovery()` rejects `OIDC_PROVIDER_UNAVAILABLE` with `{ reason: "network" }` and `{ reason: "status", status: 503 }`, each after exactly one request, to `http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration`, and with `{ reason: "issuer" }` after none

#### Scenario: Without a back-channel nothing changes
- **WHEN** a client with no `backchannelUrl` runs `discovery()` against a document with its endpoints on `http://localhost:8180`, then against one whose `token_endpoint` is on `http://keycloak:8080`; `discoveryUrl("http://localhost:8180/realms/ursitoare", null)` runs (rows N1, N2)
- **THEN** `discoveryUrl` returns `http://localhost:8180/realms/ursitoare/.well-known/openid-configuration`; the first `discovery()` gives the endpoint URLs unchanged (`logoutUrl` `null`) after one request, to that URL; the second rejects `OIDC_PROVIDER_UNAVAILABLE` with `{ reason: "origin" }`

#### Scenario: Token and JWKS endpoints follow the back-channel rule
- **WHEN** the client of the first scenario runs `discovery()` against the Keycloak-shaped document K (authorization and end-session on `http://localhost:8180`; token, JWKS and userinfo on `http://keycloak:8080`) and against D1 without `end_session_endpoint`; against K with the token endpoint on `https://evil.example`, the JWKS endpoint on `https://evil.example`, the token endpoint on `http://keycloak:8081`, the number 5, and `ftp://keycloak:8080/t`; then `signingKey("k1")` and `exchangeCode("c", "v", redirectUri)` run against K with every other request answered 500 (rows K1 to K8)
- **THEN** K gives `tokenUrl` `http://keycloak:8080/realms/ursitoare/protocol/openid-connect/token`, `jwksUrl` `http://keycloak:8080/realms/ursitoare/protocol/openid-connect/certs` and the issuer-origin `authorizeUrl` and `logoutUrl`; D1 gives the same two URLs, rewritten, and `logoutUrl` `null`; the first three refusals have `{ reason: "origin" }` and the last two `{ reason: "endpoint" }`; `signingKey` and `exchangeCode` reject with `{ reason: "status", status: 500 }` after requests `GET` discovery, `GET` the `certs` URL and `POST` the token URL, all on `http://keycloak:8080`

### Requirement: The ID token is verified before it is trusted
`verifyIdToken` SHALL accept only an RS256 token signed by a key of the issuer whose `iss`, `aud`, `azp`, `exp`, `iat`, `nonce` and `sub` are valid with 60 s of skew, and SHALL otherwise throw `OidcError` `OIDC_TOKEN_INVALID` with a fixed message and a `details.reason`.

#### Scenario: A valid token
- **WHEN** a token of alice from the fake is verified with its nonce
- **THEN** the result has `issuer` equal to the fake's, alice's `sub` as `subject`, `organization` `["org-a"]`, her `email`, `name` and `preferredUsername`

#### Scenario: Each flaw is refused
- **WHEN** the fake mints flaw `wrong_aud`, `wrong_iss`, `alg_none`, `hs256_public_key`, `foreign_key`, `unknown_kid`, `expired`, `missing_nonce`, `wrong_nonce`, and the inputs `""` and `a.b` are verified
- **THEN** the reasons are `audience`, `issuer`, `alg`, `alg`, `signature`, `kid`, `expired`, `nonce`, `nonce`, `malformed`, `malformed`; a `two_organizations` token verifies with a two-entry `organization`

#### Scenario: Claim edges
- **WHEN** a test key signs tokens whose `exp` is 59 s and 60 s before now, whose `iat` is 60 s and 61 s after now, with `aud` `[client, other]` without and with `azp`, with `azp` of another client, and with `sub` empty and of 513 characters
- **THEN** the results are accepted, `expired`, accepted, `iat`, `azp`, accepted, `azp`, `subject`, `subject`

### Requirement: The callback signs the user in and starts a session
`GET /auth/oidc/callback` SHALL exchange the code, verify the ID token, resolve the tenant, upsert the user, create a session, set `ursitoare_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` under https), clear the login cookie and redirect to the sanitized `return_to`.

#### Scenario: Sign in
- **WHEN** alice (org-a) logs in with `return_to=/flows` and mallory (org-b) logs in
- **THEN** each answer is 302 to `/flows` (mallory: to `/`); `Set-Cookie` holds `ursitoare_session=<43 characters>; Path=/; HttpOnly; SameSite=Lax` without `Max-Age`, and `ursitoare_login=; Path=/auth/oidc; Max-Age=0`; tenant A holds one session row for alice's user (`idle_timeout_s` 1800, `expires_at` 12 h after `created_at`, `revoked_at` null) and tenant B one for mallory; `resolveSession` gives each cookie its tenant and user; no column of any row equals a cookie value

#### Scenario: Repeat sign-in, https
- **WHEN** alice logs in twice, once with `publicBaseUrl` `https://app.example`
- **THEN** there is one `user` row and two sessions; with https both cookies carry `Secure`

#### Scenario: Session fixation
- **WHEN** the callback request carries `Cookie: ursitoare_session=<43 chosen characters>`
- **THEN** the new session cookie differs from it, the chosen value resolves to `null` and no row has its hash

#### Scenario: Replayed code
- **WHEN** the same callback URL and login cookie are sent a second time
- **THEN** the answer is 302 to `/sign-in?error=OIDC_EXCHANGE_FAILED` and the session count is still one

### Requirement: A refusal is a redirect with a stable code, audited once the tenant is known
Every failed callback SHALL answer 302 to `/sign-in?error=<code>`, clear the login cookie, log a warning without token, claim or cookie values and, once `resolveTenantForToken` has named the tenant from a validated token, append `auth.login_refused` with payload `{ code }` to that tenant's audit chain; a failed append is logged and the answer stays the same.

#### Scenario: Causes and codes
- **WHEN** the callback gets: no login cookie, an altered cookie, a cookie older than 601 s, a wrong `state`, no `state`, no `code`, `error=access_denied` with the right state and with a wrong one, a closed provider, flawed ID tokens (`wrong_aud`, `alg_none`, `wrong_nonce`, `expired`), `two_organizations`, an organization with no tenant, a disabled alice, a token whose `sub` is ` s` (a space, then `s`; signed by a test 2048-bit RSA key that the test's `deps.fetch` adds to the JWKS answer, every other claim valid for `org-a`), a pool whose first `connect` fails
- **THEN** the codes are `OIDC_LOGIN_EXPIRED` (x3), `OIDC_STATE_MISMATCH`, `OIDC_BAD_REQUEST` (x2), `OIDC_EXCHANGE_FAILED`, `OIDC_STATE_MISMATCH`, `OIDC_PROVIDER_UNAVAILABLE`, `OIDC_TOKEN_INVALID` (x4), `OIDC_UNKNOWN_TENANT` (x2), `OIDC_USER_DISABLED`, `OIDC_TOKEN_INVALID` (the `IDENTITY_INVALID` of the padded `sub`), `OIDC_INTERNAL`; every answer clears `ursitoare_login` and creates no session

#### Scenario: Audited when the tenant is known
- **WHEN** alice is disabled by the owner and logs in; the padded-`sub` token is refused for `org-a`; mallory (org-b) logs in on a pool wrapper whose second `connect` rejects `Error("boom")` and passes every other call to `db.appPool`; an unknown organization, a `wrong_aud` token and a login on a pool whose first `connect` rejects are refused
- **THEN** tenant A's chain holds two `auth.login_refused` events, in order with payloads `{ code: "OIDC_USER_DISABLED" }` and `{ code: "OIDC_TOKEN_INVALID" }`; tenant B's chain holds one with payload `{ code: "OIDC_INTERNAL" }`; every event has actor `{ kind: "system", id: "oidc" }` and `verifyChain` is ok for both; those last three appended nothing

#### Scenario: No values in logs, a failing audit
- **WHEN** the refusals above run with a capturing logger, and for a disabled alice the third `connect` of the pool wrapper fails (the first is `resolveTenantForToken`, the second the transaction of the upsert, the third `appendAuditCommitted`)
- **THEN** the log lines hold `code` and `reason` but not the code, `state`, cookie, ID token or email; the failing-audit case answers 302 to `/sign-in?error=OIDC_USER_DISABLED`, logs one `error` line with message `sign-in audit failed` and appends no event

### Requirement: The session table is tenant-leading and narrowly granted
Migration `0120_sessions.sql` SHALL create `ursitoare.session` with `tenant_id` leading its primary key, forced row-level security on `app.tenant_id`, a tenant-scoped foreign key to the user, and grant the app role only `SELECT`, `INSERT` and `UPDATE (last_seen_at, csrf_token_hash, revoked_at)`.

#### Scenario: Objects, catalog and privileges
- **WHEN** on `withTestDatabase()` the test checks `to_regclass('ursitoare.session')`, the ledger and `checkTenancyCatalog(db.ownerPool)`, then as the app role in tenant A runs `UPDATE ... SET user_id`, `DELETE`, an insert for `tenant_b` and a select
- **THEN** the table exists, the ledger holds version 120 named `sessions`, the violations are `[]`, the first three fail with SQLSTATE `42501` and the select returns only tenant A's rows

### Requirement: Sessions are server-side, hashed and found through a route
`createSession` SHALL store only the SHA-256 of a random 32-byte id and register it under route kind `session`; `resolveSession` SHALL return the tenant and user for a live session and `null` for an unknown, revoked, idle, expired or disabled-user one, and `revokeSession` SHALL revoke it and remove its route.

#### Scenario: Create and resolve
- **WHEN** `createSession` runs in `withTenantTx(db.appPool, a, ...)` for alice's user with a fixed clock and `randomBytes`, then `resolveSession(pool, sessionId)`
- **THEN** `sessionId` has 43 characters; the row has `session_id_hash` equal to `hashRouteKey(sessionId)`, `created_at` and `last_seen_at` at the clock, `expires_at` 43200 s later; `resolveTenantBy(pool, "session", sessionId)` is tenant A; the result has that tenant, the user id, `sessionRef` equal to the hash in hex and `endSessionHint` `null`; `principalOf` gives `{ tenantId, userId, kind: "human", sessionId: sessionRef, roles: [], teams: [], actorChain: [] }`

#### Scenario: Nothing to look up
- **WHEN** `resolveSession` gets `undefined`, `""`, 42 and 44 characters, 43 characters with `!`, and an unknown valid-looking id, on a spy pool
- **THEN** the first five return `null` with zero connections and the last returns `null`

#### Scenario: Idle, absolute, revoked, disabled
- **WHEN** time advances 1799 s and 1801 s after the last use, a session is used every 29 minutes until 43200 s after creation, `revokeSession` runs twice, and the owner disables the user and re-enables him
- **THEN** the first use resolves and the second gives `null` and removes the route; the long-lived one gives `null` at 43200 s; `revokeSession` returns `true` then `false` and the session is `null`; the disabled user gives `null` and the re-enabled one resolves again

#### Scenario: last_seen_at slides at most once a minute
- **WHEN** a session is resolved 30 s and then 60 s after its last sliding
- **THEN** `last_seen_at` is unchanged after the first and equal to the clock after the second

#### Scenario: Reaping and tenants
- **WHEN** 25 expired live sessions of tenant A exist and `createSession` runs for A; sessions exist for A and B; `createSession(txOfB, ctxOfA, ...)` runs
- **THEN** 20 expired sessions are revoked with their routes removed (`resolveTenantBy` gives `null`) and the new one is live; each cookie resolves to its own tenant and A's transaction sees one row; the mixed call rejects `SESSION_TENANT_MISMATCH`

### Requirement: A CSRF token is issued, stored hashed and checked
`issueCsrfToken` SHALL return a new 32-byte token and store only its SHA-256, replacing the previous one; `verifyCsrfToken` SHALL be true only for the current token of a live session.

#### Scenario: Issue and verify
- **WHEN** a token is issued twice, then checked: the first, the second, `undefined`, `""`, a wrong value; then the session is revoked
- **THEN** each token has 43 characters, the stored `csrf_token_hash` equals the SHA-256 of the second and no column holds a token; the results are `false`, `true`, `false`, `false`, `false`; afterwards `verifyCsrfToken` is `false` and `issueCsrfToken` rejects `SESSION_NOT_FOUND`

### Requirement: Logout revokes the session and needs the CSRF token
`POST /auth/oidc/logout` SHALL require the session cookie and the `x-csrf-token` header, revoke the session, remove its route, clear the cookie and answer 200 `{ redirect }` to the provider's end-session URL.

#### Scenario: Logout
- **WHEN** alice signs in, gets a token from `issueCsrfToken`, posts logout with it, and then fetches the returned `redirect` from the fake with `redirect: "manual"`
- **THEN** the answer is 200 with `redirect` holding `id_token_hint`, `post_logout_redirect_uri=http%3A%2F%2F127.0.0.1%3A8080%2Fsign-in` and `client_id=ursitoare-engine`; `Set-Cookie` clears `ursitoare_session`; `resolveSession` is `null` and the route is gone; the fake answers 302 to `http://127.0.0.1:8080/sign-in`

#### Scenario: Logout CSRF and no session
- **WHEN** logout is posted with the cookie and no header, with a wrong header, with a header but no cookie, and with an unknown cookie
- **THEN** the first two answer 403 `OIDC_CSRF_INVALID` and the session still resolves; the others answer 401 `UNAUTHENTICATED` (message `Authentication required`) with the session cookie cleared

#### Scenario: Provider down at logout
- **WHEN** the provider is unreachable when a valid logout is posted
- **THEN** the answer is 200 with `redirect` `http://127.0.0.1:8080/sign-in` and the session is revoked

### Requirement: The e2e stack part signs the default tenant's organization in
`oidcPart` (file `parts/25-oidc.ts`) SHALL start the fake OIDC provider, register the engine's callback and post-logout URLs, write the client secret file, return the OIDC environment, and in `seed` provision `org-a` for the default tenant.

#### Scenario: Start, seed and close
- **WHEN** the part runs `start` and `seed` twice with `engineOrigin` `http://127.0.0.1:39080` against a `withTestDatabase()` database, `loadConfig` reads its `env` with an engine key file and a database URL, a login is completed at the fake with redirect `http://127.0.0.1:39080/auth/oidc/callback`, and the part closes
- **THEN** `env` holds `URSITOARE_OIDC_ISSUER` equal to the fake's issuer and a secret file of mode 0600 holding the engine client secret; `loadConfig` yields `oidc`; `resolveTenantForToken` maps that issuer and `["org-a"]` to the default tenant and `tenant_idp` holds one row; the login completes; the fake no longer answers; `oidcApi` without the handle throws `STACK_PART_MISSING`

#### Scenario: Discovered after the database part
- **WHEN** `discoverParts()` runs and `parts/25-oidc.ts` is read
- **THEN** the names include `database` before `oidc` and the file is `export { oidcPart as part } from "../oidc-part.ts";`

### Requirement: OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500 — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500
- **WHEN** an OIDC login, callback, logout or not-configured route answers on a server with the real hook stack (the x-request-id onSend hook and the security-headers onSend hook)
- **THEN** exactly one response is written, no line at error level and no 'Reply was already sent' or FST_ERR_REP_ALREADY_SENT line is logged, and the 'request completed' log line carries the status the client received (302, 200, 401, 403 or 503), not 500

### Requirement: A back-channel origin splits the engine's calls from the browser's
With a back-channel origin the engine SHALL send discovery, key and token requests only to that origin, SHALL still require the configured issuer in the discovery document and in the ID token's `iss`, and SHALL send the browser only endpoints on the issuer's origin.

#### Scenario: Keys and the code exchange use the back-channel origin and iss stays the issuer
- **WHEN** a fake OIDC provider listens on `http://127.0.0.1:<port>` and a client has its issuer and back-channel `http://keycloak:8080`, with an injected `fetch` that forwards `http://keycloak:8080/<path>` to the fake and answers discovery with the token, JWKS and userinfo endpoints on `http://keycloak:8080`; `discovery()`, `exchangeCode` (a code from `completeFakeLogin` for alice), `signingKey` of the token's `kid`, then `verifyIdToken` of a token the fake mints for alice and of one with flaw `wrong_iss` run (row W1)
- **THEN** `authorizeUrl` and `logoutUrl` are on the fake's issuer origin and `tokenUrl` and `jwksUrl` on `http://keycloak:8080`; the exchange returns a three-part token and the key is found; the injected `fetch` saw exactly `GET` discovery, `POST` the token URL and `GET` the `certs` URL, all on `http://keycloak:8080`, each with `redirect: "error"` and a signal; the fake's token request has no `client_secret` field; the plain token verifies with `issuer` equal to the fake's, the `wrong_iss` one rejects `OIDC_TOKEN_INVALID` with `{ reason: "issuer" }`, and no further request is made

#### Scenario: The sign-in redirect stays on the issuer origin
- **WHEN** `registerOidcRoutes` gets issuer `http://localhost:8180/realms/ursitoare`, back-channel `http://keycloak:8080` and a `fetch` answering D1, and `GET /auth/oidc/login?return_to=/flows` runs; then again with a `fetch` that throws a `TypeError` (rows L1, L2)
- **THEN** the first answer is 302 with `Location` `http://localhost:8180/realms/ursitoare/protocol/openid-connect/auth?...` (`client_id` `ursitoare-engine`) and sets one `ursitoare_login` cookie; the second is 302 to `/sign-in?error=OIDC_PROVIDER_UNAVAILABLE` with no `Set-Cookie`; each made one request, `GET http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration`

### Requirement: Two functions derive the back-channel URLs
`discoveryUrl` SHALL give the discovery document's URL and `serverSideUrl` the URL the engine calls for an endpoint, both returning today's values when no back-channel origin is given.

#### Scenario: discoveryUrl and serverSideUrl follow the rule
- **WHEN** both functions run on rows D1 to D8 and S1 to S13 of the test plan, among them `discoveryUrl("http://localhost:8180/realms/ursitoare", "http://keycloak:8080")`, `serverSideUrl` of `http://localhost:8180/realms/ursitoare/protocol/openid-connect/token?a=1#f` with that issuer and back-channel, the same endpoint with `null`, an endpoint on `https://evil.example`, and `nope`; and `src/identity/index.ts` is imported (row E1)
- **THEN** the first returns `http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration`; the second `http://keycloak:8080/realms/ursitoare/protocol/openid-connect/token?a=1#f`; the third the endpoint unchanged; the last two `null`; with `null` `discoveryUrl` returns the issuer plus `/.well-known/openid-configuration` byte for byte, also for a trailing-`/` issuer and for `nope`; `discoveryUrl("nope", "http://keycloak:8080")` throws `OidcError` `OIDC_PROVIDER_UNAVAILABLE` with `{ reason: "issuer" }`; the index exports both functions
