# Test plan: add-oidc-backchannel

Every value was run against a reference version of this unit in a scratch copy of main@31968a29 (design § Verification). No test-support file is new and the fake OIDC provider is unchanged: the second origin exists only inside an injected `fetch`. Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps each call to code this unit adds so that a stub's throw or a rejection becomes a value (`settle` async, `sync` sync), closes servers and fakes in `finally`, and has no `.`, `[` or `::` in test names. Run with `pnpm run test <path>`.

## Constants and helpers (local to each test file)

- `ISS` = `http://localhost:8180/realms/ursitoare`; `B` = `http://keycloak:8080`; `P` = `/realms/ursitoare/protocol/openid-connect`; `B_DISCOVERY` = `B` + `/realms/ursitoare/.well-known/openid-configuration`. `keycloak` is never resolved.
- `config(issuer, backchannelUrl?, secret = "client-secret")` = `{ issuer, clientId: "ursitoare-engine", clientSecret: new Secret(secret), ...(backchannelUrl === undefined ? {} : { backchannelUrl }) }`; the clock is `{ now: () => new Date("2026-10-25T12:00:00Z") }`; `REDIRECT_URI` = `http://127.0.0.1:8080/auth/oidc/callback`.
- `recording(handler, calls)` returns a `fetch` that pushes `{ url, method, init }` (method `GET` when absent) and answers `handler(url, init)`; `guarded(calls)` asserts each `init.redirect` is `"error"` and each `init.signal` an `AbortSignal`; `failure(run)` asserts the settled value is an `OidcError` and returns it; `json(body, status = 200)` is a JSON `Response`.
- `D1` = `{ issuer: ISS, authorization_endpoint: ISS + "/protocol/openid-connect/auth", token_endpoint: ISS + "/protocol/openid-connect/token", jwks_uri: ISS + "/protocol/openid-connect/certs", end_session_endpoint: ISS + "/protocol/openid-connect/logout" }`; `K` = D1 with `token_endpoint` = `B + P + "/token"`, `jwks_uri` = `B + P + "/certs"` and `userinfo_endpoint` = `B + P + "/userinfo"`. "D1, `x` = v" spreads the override last.
- `twoOrigins(fake, calls)` (task 4's file) = `recording(forward, calls)`: a request outside `B` goes to the global `fetch` unchanged; one on `B` goes to `fake.url` + its path and search, and when the path ends in `/.well-known/openid-configuration` the fake's JSON is returned with `token_endpoint`, `jwks_uri` and `userinfo_endpoint` set to `B` + their own path.
- `loginCode(fake, verifier)`: `completeFakeLogin(fake, <fake authorization URL with client_id ursitoare-engine, redirect_uri REDIRECT_URI, random state and nonce, S256 challenge of verifier>, "alice")` and the `code` of the callback URL; `fake.registerRedirect(REDIRECT_URI)` runs first. That login uses the global `fetch`, so it is not in `calls`.

## Task 1: `src/config/oidc-backchannel.test.ts`

Base env (every row unless stated): issuer `http://localhost:8180/realms/ursitoare`, `URSITOARE_OIDC_CLIENT_SECRET_FILE` `/run/secrets/oidc_client_secret` (content `test-oidc-client-secret` and a newline), `URSITOARE_ENGINE_KEY_FILE` `/run/secrets/engine_key` (64 hex characters), `URSITOARE_DATABASE_URL` `postgres://ursitoare_app@db.internal:5432/ursitoare`; `loadConfig(env, reader)` as in `src/config/oidc.test.ts`. `BC` = `URSITOARE_OIDC_BACKCHANNEL_URL`.

| # | `BC` | `oidc.backchannelUrl` |
|---|---|---|
| A1 | `http://keycloak:8080` | `http://keycloak:8080` |
| A2 | `http://keycloak:8080/` | `http://keycloak:8080` |
| A3 | `https://idp-internal.example/` | `https://idp-internal.example` |
| A4 | `https://IDP-Internal.example:443` | `https://idp-internal.example` |
| A5 | `http://10.0.0.5:8080` | `http://10.0.0.5:8080` |
| A6 | `http://[::1]:8080` | `http://[::1]:8080` |
| A7 | `http://localhost:8180` | `http://localhost:8180` |
| A8 | absent, then `""` | no member: `Object.hasOwn(oidc, "backchannelUrl")` false and `Object.keys(oidc).sort()` equals `["clientId", "clientSecret", "issuer"]` |
| A9 | `""` and no other OIDC variable | `loadConfig(...).oidc` is `undefined` |

A1 to A7 also assert `issuer` `http://localhost:8180/realms/ursitoare`, `clientId` `ursitoare-engine` and `clientSecret.reveal()` `test-oidc-client-secret`.

Refusals: each row asserts `name` `ConfigError`, `code` `CONFIG_INVALID`, `variable` and `message` = `<variable>: <reason>`. `BAD` = `must be an https origin, or an http origin for a private host`; `STRAY` = `set only together with URSITOARE_OIDC_ISSUER`.

| # | env | variable | reason |
|---|---|---|---|
| B1 to B8 | `BC` = `http://idp.example`; `http://172.32.0.1:8080`; `ftp://keycloak`; `http://u:p@keycloak:8080`; `http://keycloak:8080/realms/ursitoare`; `http://keycloak:8080/?x=1`; `http://keycloak:8080/#f`; `nope` | `URSITOARE_OIDC_BACKCHANNEL_URL` | `BAD` |
| B9 | issuer `http://idp.example/r`, `BC` = `nope` | `URSITOARE_OIDC_ISSUER` | `must be an https URL, or an http URL for a private host, without credentials, query or fragment` |
| B10 | `BC` = `nope`, secret file variable absent | `URSITOARE_OIDC_BACKCHANNEL_URL` | `BAD` |
| B11 | `BC` = `http://keycloak:8080`, secret file variable absent | `URSITOARE_OIDC_CLIENT_SECRET_FILE` | `required when URSITOARE_OIDC_ISSUER is set` |
| B12 | no issuer, no secret file variable, `BC` = `http://keycloak:8080` | `URSITOARE_OIDC_BACKCHANNEL_URL` | `STRAY` |
| B13 | as B12 with `BC` = `nope` | `URSITOARE_OIDC_BACKCHANNEL_URL` | `STRAY` |
| B14 | as B12 plus `URSITOARE_OIDC_CLIENT_ID` = `my-client` | `URSITOARE_OIDC_CLIENT_ID` | `STRAY` |
| B15 | as B12 plus the secret file variable | `URSITOARE_OIDC_CLIENT_SECRET_FILE` | `STRAY` |

Frozen and kept: `src/config/oidc.test.ts` (seven tests) is not edited.

## Task 2: `src/identity/oidc/backchannel-urls.test.ts`

Imports `discoveryUrl`, `serverSideUrl` and `createOidcClient` from `./client.ts`, never from an index. `ISS`, `B` as above.

`discoveryUrl(issuer, backchannelUrl)`; `SUFFIX` = `/.well-known/openid-configuration`:

| # | issuer | backchannelUrl | result |
|---|---|---|---|
| D1 | `https://idp.example/realms/r` | `null` | `https://idp.example/realms/r` + `SUFFIX` |
| D2 | `https://idp.example/r/` | `null` | `https://idp.example/r//.well-known/openid-configuration` (today's string, no normalising) |
| D3 | `nope` | `null` | `nope/.well-known/openid-configuration` |
| D4 | `ISS` | `B` | `http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration` |
| D5 | `ISS` + `/` | `B` | the same string as D4 (the issuer's trailing `/` is dropped) |
| D6 | `https://idp.example` | `B` | `http://keycloak:8080/.well-known/openid-configuration` |
| D7 | `ISS` | `B` + `/` | the same string as D4 |
| D8 | `nope` | `B` | throws `OidcError`, `code` `OIDC_PROVIDER_UNAVAILABLE`, `details` deep-equal `{ reason: "issuer" }` |

`serverSideUrl(endpoint, ISS, backchannelUrl)`, `T` = `/realms/ursitoare/protocol/openid-connect/token`:

| # | endpoint | backchannelUrl | result |
|---|---|---|---|
| S1 | `http://localhost:8180` + `T` | `null` | the endpoint unchanged |
| S2 | `http://localhost:8180/t?x=1#f` | `null` | the endpoint unchanged |
| S3 | `http://keycloak:8080/t` | `null` | `null` |
| S4 | `ftp://localhost:8180/t` | `null` | `null` |
| S5 | `nope` | `null` | `null` |
| S6 | `B` + `T` | `B` | the endpoint unchanged |
| S7 | `http://localhost:8180` + `T` + `?a=1#f` | `B` | `http://keycloak:8080` + `T` + `?a=1#f` |
| S8 | `http://localhost:8180` + `T` | `B` + `/` | `http://keycloak:8080` + `T` |
| S9 | `https://evil.example/token` | `B` | `null` |
| S10 | `http://localhost:8181/t` | `B` | `null` |
| S11 | `http://keycloak:8081/t` | `B` | `null` |
| S12 | `ftp://keycloak:8080/t` | `B` | `null` |
| S13 | `nope` | `B` | `null` |

- **E1** `await import("../index.ts")` has `discoveryUrl` and `serverSideUrl` strictly equal to the functions imported from `./client.ts` (a dynamic import, so a missing export fails by assertion and not at link time).
- **N1** `discoveryUrl(ISS, null)` equals `ISS` + `SUFFIX`; a client with `config(ISS)` and a `fetch` answering `{ issuer: ISS, authorization_endpoint: ISS + "/protocol/openid-connect/auth", token_endpoint: ISS + "/protocol/openid-connect/token", jwks_uri: ISS + "/protocol/openid-connect/certs" }` makes one request, to `ISS` + `SUFFIX`, and `discovery()` deep-equals `{ authorizeUrl: <ISS>/protocol/openid-connect/auth, tokenUrl: <ISS>/protocol/openid-connect/token, jwksUrl: <ISS>/protocol/openid-connect/certs, logoutUrl: null }`.
- **N2** the same client with `token_endpoint` `http://keycloak:8080/t` rejects `OidcError` with `details` `{ reason: "origin" }`.

Frozen and kept: `src/identity/oidc/client.test.ts` (three tests) is not edited.

## Task 3: `src/identity/oidc/backchannel-discovery.test.ts`

Client `config(ISS, B)`, `fetch` = `recording(() => json(<doc>), calls)`. Rows R, F assert only `authorizeUrl` and `logoutUrl` of a result (the token and JWKS URLs are task 4's), `guarded(calls)` and the request list.

| # | document | result |
|---|---|---|
| R1 | D1 | `authorizeUrl` `http://localhost:8180/realms/ursitoare/protocol/openid-connect/auth`, `logoutUrl` `http://localhost:8180/realms/ursitoare/protocol/openid-connect/logout`; `calls` = `[["GET", B_DISCOVERY]]` |
| R2 | D1, `authorization_endpoint` = `B + P + "/auth"` | rejects `OIDC_PROVIDER_UNAVAILABLE`, message `The OIDC provider is unavailable`, `details` `{ reason: "origin" }` |
| R3 | D1, `end_session_endpoint` = `B + P + "/logout"` | the same, `{ reason: "origin" }` |
| R4 | D1, `authorization_endpoint` = `https://evil.example/auth` | `{ reason: "origin" }` |
| R5 | D1, `end_session_endpoint` = `https://evil.example/logout` | `{ reason: "origin" }` |
| R6 | D1, `issuer` = `http://keycloak:8080/realms/ursitoare` | `{ reason: "issuer" }` |
| R7 | D1, `authorization_endpoint` = `5` | `{ reason: "endpoint" }` |

R2 to R7: a new client each; `calls` is `[["GET", B_DISCOVERY]]` after the rejection.

| # | fetch / config | `discovery()` |
|---|---|---|
| F1 | throws `new TypeError("connect refused")` | rejects `{ reason: "network" }`; `calls` urls `[B_DISCOVERY]` |
| F2 | answers `new Response("busy", { status: 503 })` | rejects `{ reason: "status", status: 503 }`; `calls` urls `[B_DISCOVERY]` |
| F3 | `config("nope", B)`, answers `json({})` | rejects `{ reason: "issuer" }`; `calls` is `[]` |

**Login route** (`buildServer` as in `src/identity/oidc/login.test.ts`, `registerOidcRoutes(server, { config: config(ISS, B), publicBaseUrl: "http://127.0.0.1:8080", pool: <connect throws>, engineKey: { reveal: () => "k".repeat(64) }, clock: fixedClock("2026-10-25T12:00:00.000Z"), fetch })`; `GET /auth/oidc/login?return_to=/flows`; the server is closed in `finally`):

| # | `fetch` | answer |
|---|---|---|
| L1 | `recording(() => json(D1), calls)` | status 302; `Location` has origin plus path `http://localhost:8180/realms/ursitoare/protocol/openid-connect/auth` and `client_id` `ursitoare-engine`; a `set-cookie` header is present; `calls` urls `[B_DISCOVERY]` |
| L2 | throws `new TypeError("connect refused")` | status 302; `Location` `/sign-in?error=OIDC_PROVIDER_UNAVAILABLE`; no `set-cookie` header; `calls` urls `[B_DISCOVERY]` |

Frozen and kept: `src/identity/oidc/login.test.ts` is not edited.

## Task 4: `src/identity/oidc/backchannel-exchange.test.ts`

| # | document (client `config(ISS, B)`) | `discovery()` |
|---|---|---|
| K1 | K | deep-equals `{ authorizeUrl: ISS + "/protocol/openid-connect/auth", tokenUrl: B + P + "/token", jwksUrl: B + P + "/certs", logoutUrl: ISS + "/protocol/openid-connect/logout" }` |
| K2 | D1 with `end_session_endpoint` left out | `{ authorizeUrl: ISS + "/protocol/openid-connect/auth", tokenUrl: B + P + "/token", jwksUrl: B + P + "/certs", logoutUrl: null }` (the issuer-origin endpoints rewritten) |
| K3 | K, `token_endpoint` = `https://evil.example/token` | rejects `OIDC_PROVIDER_UNAVAILABLE`, `details` `{ reason: "origin" }` |
| K4 | K, `jwks_uri` = `https://evil.example/certs` | `{ reason: "origin" }` |
| K5 | K, `token_endpoint` = `http://keycloak:8081/t` | `{ reason: "origin" }` |
| K6 | K, `token_endpoint` = `5` | `{ reason: "endpoint" }` |
| K7 | K, `token_endpoint` = `ftp://keycloak:8080/t` | `{ reason: "endpoint" }` |
| K8 | K for the discovery URL, status 500 body `x` for every other URL; one client, calls in this order: `signingKey("k1")`, `exchangeCode("c", "v", REDIRECT_URI)` | `signingKey` rejects `{ reason: "status", status: 500 }`; `exchangeCode` rejects `OIDC_PROVIDER_UNAVAILABLE` with `{ reason: "status", status: 500 }`; `calls` as `[method, url]`: `["GET", B_DISCOVERY]`, `["GET", B + P + "/certs"]`, `["POST", B + P + "/token"]`; `guarded` |

**W1** (a fake from `startFakeOidc({ now: () => NOW })`, `NOW` = `2026-10-25T12:00:00Z`; `fake.registerRedirect(REDIRECT_URI)`; `cfg` = `config(fake.issuer, B, fake.clientSecret("ursitoare-engine"))`; client `createOidcClient({ config: cfg, clock, fetch: twoOrigins(fake, calls) })`):

1. `discovery()` deep-equals `{ authorizeUrl: fake.issuer + "/protocol/openid-connect/auth", tokenUrl: B + P + "/token", jwksUrl: B + P + "/certs", logoutUrl: fake.issuer + "/protocol/openid-connect/logout" }`.
2. `exchangeCode(code, verifier, REDIRECT_URI)` with `verifier` = 32 random bytes in base64url and `code` from `loginCode` resolves to a string; `decodeJwt(token).header.kid` is a string; `signingKey(kid)` is neither `null` nor an error.
3. `calls` as `[method, url]` equal `["GET", B_DISCOVERY]`, `["POST", B + P + "/token"]`, `["GET", B + P + "/certs"]`; `guarded(calls)`; the fake's last request whose path ends `/token` has `form.client_secret` `undefined`.
4. `verifyIdToken(fake.mintToken({ user: "alice", nonce: "wire-nonce" }), { config: cfg, nonce: "wire-nonce", clock, keyFor: (k) => client.signingKey(k) })` resolves with `issuer` equal to `fake.issuer`; the same with `flaw: "wrong_iss"` rejects `OidcError` `OIDC_TOKEN_INVALID` with `{ reason: "issuer" }`; `calls.length` is still 3.

Frozen and kept (unchanged, still green): `src/identity/oidc/id-token.test.ts`, `src/identity/oidc/callback.test.ts`, `src/identity/oidc/logout.test.ts`, `src/main.oidc.test.ts`, `test/support/e2e-stack/oidc-part.test.ts`.

## STACK-ONLY

Gate-decided halves are the Node tests above (the Keycloak-shaped document K, the rewritten document D1, the two-origin exchange W1). One behaviour only the stack proves; it is a row here, not a scenario, so no criterion waits for a stack run:

| Behaviour | Step | What the step asserts |
|---|---|---|
| the engine, given `URSITOARE_OIDC_BACKCHANNEL_URL` `http://keycloak:8080` and the browser-facing issuer, signs a user in through real Keycloak: a browser sign-in at the issuer URL completes while the engine calls `keycloak:8080` | `scripts/stack-e2e.d/50-journeys.sh` (U61b, first sign-in of the stack run; the runner's browser follows the hobbyist URLs) | the pytest journeys' `login()` ends on the app origin with `ursitoare_session` set and no redirect to `/sign-in?error=`; U61b's `seedStack` sign-in as carol (`signInThroughKeycloak`) completes, a failing step naming itself |

No task's `criteria_ids` and no scenario carry this row; the task text says the runtime half is the delegate's.
