## MODIFIED Requirements

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

## ADDED Requirements

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
