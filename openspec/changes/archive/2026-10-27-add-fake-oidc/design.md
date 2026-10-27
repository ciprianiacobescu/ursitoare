## Context

Nothing exists at the base; `test/support/README.md` lists `fake-oidc/` as owned by this change. The Keycloak 26.8.1 facts it copies are verified in `seed/deploy/keycloak-footprint/REPORT.md` (realm `ursitoare`, `iss` = realm URL, 300 s access tokens, scope `organization` adds `"organization": ["tenant-one"]`).

Per `docs/decisions/0002` the directory is ordinary code under `test/` (green writes it; its `*.test.ts` files are frozen after red; the scaffold provides the stubs below). It uses only `node:http`, `node:crypto`, `node:assert/strict` and `fetch` (no `package.json` change), imports nothing from `src/` or `seed/`, and uses erasable syntax only.

## Decisions

1. **Layout.** The files of the Interfaces plus `seed.ts` (data), `provider.ts` (state) and handlers `authorize.ts`, `token.ts`, `session.ts` (userinfo, logout).
2. **Routing.** `server.ts` owns the `node:http` server, the Host check, body reading, recording and `ROUTES: Record<string, Handler>` keyed `"METHOD path"`. `Handler = (p: Provider, req: ParsedRequest) => Reply | Promise<Reply>`, `Reply = { status, headers, body }`; a handler never touches the socket, and one that throws is answered 500 `{"error":"server_error"}`. Order: Host check, body read, route lookup (404, 405), handler. The body reader enforces one limit for every body of every route: at most 65536 bytes, else it answers 413 `{"error":"invalid_request"}` and destroys the socket after the answer (no route lookup, no handler). Tasks 2.2 to 2.4 each add routes to `ROUTES` and are the only other tasks that change `server.ts`.
3. **Paths** (`R` = `/realms/ursitoare`): `GET R/.well-known/openid-configuration`; under `R/protocol/openid-connect/`: `GET certs`, `GET` and `POST auth`, `POST token`, `GET` and `POST userinfo`, `GET logout`. Other paths: 404 `{"error":"not_found"}`; other methods: 405 `{"error":"method_not_allowed"}` with `Allow`. JSON answers carry `content-type: application/json` and `cache-control: no-store`.
4. **Host.** Served only when `Host` is `127.0.0.1:<port>`, `localhost:<port>` or `[::1]:<port>` for the bound port; else 400 `{"error":"invalid_request"}` (DNS rebinding). Allowed `host` options: `127.0.0.1`, `::1`, `localhost`; `issuer` always uses the bound IP (`127.0.0.1` or `[::1]`).
5. **Keys, JWT, PKCE.** RSA 2048, in memory only; `kid` is the RFC 7638 thumbprint. `createKeyRing()` has a current key and a never-published `foreign()` key; `rotate()` makes a new key current and `jwks()` keeps older keys, newest first. `signJwt` writes header `{ alg, typ: "JWT", kid? }` in unpadded base64url; `none` leaves the signature part empty. `decodeJwt` needs three dot-separated parts of valid base64url (JSON in the first two), else `FAKE_OIDC_BAD_JWT`. `verifyRs256` is true only for header `alg` `RS256` and a `crypto.verify("sha256")` match with the key built from the JWK. `verifyPkce` is false unless the verifier has 43 to 128 characters of `[A-Za-z0-9._~-]` and its S256 challenge matches (`timingSafeEqual`).
6. **Seed** (`seed.ts`). alice: `org-a`, `ursitoare-authors`, `team-finance`, `alice@example.invalid`, `Alice Example`; bob: `org-a`, `ursitoare-approvers`, `team-finance`; carol: `org-a`, `ursitoare-admins`; mallory: `org-b`, `ursitoare-authors`; same address and name pattern. `sub` is a UUID from the first 16 bytes of SHA-256 of `"ursitoare-fake-oidc/" + username` (version 5, variant `10`). Clients: `ursitoare-engine` (confidential), `ursitoare-mcp` (public). Each start draws a password per user and the engine secret with `randomBytes` (base64url); nothing is a literal.
7. **Claims** (`mintJwt`). Defaults: user `alice`, client `ursitoare-engine`, kind `id`, scope `openid profile email organization`. `iat = floor(now/1000)`, `exp = iat + 300`. Common claims: `iss`, `sub`, `azp`, `sid` (when given), `iat`, `exp`, `email`, `email_verified: true`, `name`, `preferred_username`, `groups`, and `organization` only when the scope includes it. ID token adds `typ: "ID"`, `aud` (string), `auth_time`, and `nonce` only when `opts.nonce` is set; access token adds `typ: "Bearer"`, `aud`, `scope`. Both `aud` are the client id. Flaws change one thing after the valid claims are built: `hs256_public_key` signs HS256 with the SPKI PEM text of the current public key (`export({ type: "spki", format: "pem" })`) as secret; `unknown_kid` signs with the current key under another `kid`; `foreign_key` signs with `keys.foreign()` under the current `kid`; the others edit the named claim as the spec says. Unknown user, client or flaw throw `FAKE_OIDC_UNKNOWN_USER`, `FAKE_OIDC_UNKNOWN_CLIENT`, `FAKE_OIDC_BAD_OPTIONS` before signing.
8. **Login page.** A static document with `<html lang="en">`, a `<title>`, inline CSS (dark text on white, visible `:focus`), `<main>`, one `<h1>`, the error as `<p id="input-error" role="alert">`, and exactly the markup quoted in the spec scenario "Labels and structure": `autocomplete="username"` and `autocomplete="current-password"` on the inputs, `<button id="kc-login" type="submit">Sign In</button>`, and ` value="{escaped username}"` as the last attribute of the username input only when `username` is given. No show-password toggle (`Password` names one control). Reflected values are escaped (`& < > " '`). HTML answers carry `cache-control: no-store`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer` and a CSP of `default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'` (no `form-action`: the success redirect leaves the origin).
9. **Authorization endpoint**, in order. (a) unknown `client_id`: 400 HTML `Invalid parameter: client_id`. (b) `redirect_uri` absent or not string-equal to a redirect registered for the client: 400 HTML `Invalid parameter: redirect_uri`. From here errors are a 302 to `redirect_uri` with `error`, `error_description`, `state` (its own query kept). (c) `response_type` not `code`: `unsupported_response_type`. (d) `scope` lacks the token `openid`: `invalid_scope`. (e) `code_challenge` missing or not 43 base64url characters, or (f) `code_challenge_method` missing or not `S256`: `invalid_request`. `GET` renders the form; its `action` is the path plus the raw query. `POST` lower-cases `username` and compares SHA-256 digests of posted and stored password with `timingSafeEqual` (an unknown user against a random digest); failure re-renders the form (200) with `Invalid username or password.` and the username filled in. Success stores `{ code (32 random bytes, base64url), clientId, redirectUri, challenge, scope, nonce, username, sid: randomUUID(), expiresAt: now() + 60000 }` and answers 302 with `code` and `state`. 
10. **Token endpoint**, in order. (a) Content type `application/x-www-form-urlencoded` else 400 `invalid_request` (the body limit is the server's, decision 2); `URLSearchParams`, first value wins. (b) `grant_type` absent: `invalid_request`; not `authorization_code`: `unsupported_grant_type`. (c) Client authentication: with `Authorization: Basic` (base64 of `id:secret`, parts percent-decoded) the client must exist, be confidential, have an equal secret (digest `timingSafeEqual`) and equal a body `client_id` if present; without it the body `client_id` must name a public client and the body must hold no `client_secret`. Failure: 401 `invalid_client`, `WWW-Authenticate: Basic realm="ursitoare"`. (d) `code`, `redirect_uri`, `code_verifier` present, else `invalid_request`. (e) The code record is looked up and deleted in one synchronous step (a failed attempt consumes it; parallel requests cannot both win); absent or `now() >= expiresAt`: `invalid_grant`. (f) Its `clientId` equals the authenticated client, its `redirectUri` the posted one, and `verifyPkce` holds; else `invalid_grant`. (g) Success: `sessions.set(sid, "live")`, 200 `{ access_token, id_token, token_type: "Bearer", expires_in: 300, scope }`, both tokens from `mintJwt` with the record's user, client, scope, nonce and `sid`.
11. **Userinfo and logout** (`session.ts`). Userinfo takes the bearer, finds the JWKS key by header `kid`, requires `verifyRs256`, `iss`, `exp * 1000 > now()` and no ended `sid`, and answers `sub`, `email`, `email_verified`, `name`, `preferred_username` and, when in the token, `organization` and `groups`; failure is 401 `{"error":"invalid_token"}` with `WWW-Authenticate: Bearer error="invalid_token"`. Logout requires a valid `id_token_hint` (signature and `iss`; `exp` ignored; else 400 `invalid_request`), takes the client from `azp`, marks its `sid` `ended`, and answers 302 to `post_logout_redirect_uri` plus `state` when that equals a redirect or post-logout URI of the client, else 400 `invalid_request` with the session left live; with no target, 200 HTML `You are logged out`.
12. **Registration and recording.** `registerRedirect(uri, opts?)` parses with `new URL` (protocol `http:` or `https:`, no userinfo, no fragment, else `FAKE_OIDC_BAD_REDIRECT`) and adds it to the redirect set of `opts.clientId ?? "ursitoare-engine"`, or its post-logout set with `opts.postLogout`; an unknown client is `FAKE_OIDC_UNKNOWN_CLIENT`; no wildcards. The set stores the string exactly as given (`new URL` only validates) and matching is exact string equality with no normalisation, as Keycloak matches a registered redirect URI. `opts.redirectUri` of `startFakeOidc` does it once (bad value: `FAKE_OIDC_START_FAILED`). Every answered request (also 400 to 500) is logged: `at` = `now().toISOString()`, `path` without query, `query` and `form` (first value per key), with the values of `id_token_hint`, `code`, `code_verifier`, `client_secret`, `password`, `access_token`, `id_token`, `refresh_token` replaced by `[redacted]`; `Authorization` is never logged. The newest 5000 are kept; `requests()` returns fresh copies.
13. **Lifecycle.** `startFakeOidc` validates `port` (integer 0 to 65535), `host`, `now` and `redirectUri`, listens, and resolves when listening; a listen error is `FAKE_OIDC_START_FAILED` with the cause. `close()` is memoised (`closeAllConnections()`, then `close()`). `FakeOidc.mintToken(opts)` is `mintJwt({ issuer, now, keys }, opts)`.
14. **Contract suite.** `oidcContract(baseUrl, credentials)` returns the ten `ContractCheck`s named in the spec, in that order; `baseUrl` is the issuer. The request(s) and assertions of each check, the scope (`openid profile email organization`, which holds `organization` for the claim check), the redirect URI sent by each check and the fresh cookie jar per check are listed under task 3.1, "Contract checks". Mechanics: `fetch` with `redirect: "manual"`, a jar fed from `getSetCookie()`, form `action` read from `<form ... action="...">` (unescaping `&amp;`, resolving against `baseUrl`), `node:assert/strict`, and `decodeJwt` from `./jwt.ts` for the ID token. Each assertion rests on OpenID Connect Core or RFC 6749, 6750 or 7636, except the two the proposal names.

## Interfaces

```ts
// types.ts (index.ts re-exports types.ts, startFakeOidc, decodeJwt, verifyRs256, Jwk, oidcContract and its types)
class FakeOidcError extends Error { readonly code: string; constructor(code: string, message: string, options?: { cause?: unknown }) }
type MintFlaw = "none" | "wrong_aud" | "wrong_iss" | "alg_none" | "hs256_public_key" | "expired" | "missing_nonce" | "wrong_nonce" | "two_organizations" | "unknown_kid" | "foreign_key"
type MintOptions = Readonly<{ user?: string; clientId?: string; kind?: "id" | "access"; flaw?: MintFlaw; nonce?: string; scope?: string }>
type RecordedRequest = Readonly<{ at: string; method: string; path: string; query: Readonly<Record<string, string>>; form: Readonly<Record<string, string>>; status: number }>
interface FakeOidc { readonly issuer: string; readonly url: string; clientSecret(clientId: string): string; passwordOf(username: string): string; mintToken(opts: MintOptions): string; rotateSigningKey(): void; registerRedirect(uri: string, opts?: { clientId?: string; postLogout?: boolean }): void; requests(): RecordedRequest[]; close(): Promise<void> }
// server.ts
function startFakeOidc(opts?: { port?: number; host?: string; now?: () => Date; redirectUri?: string }): Promise<FakeOidc>
// jwt.ts
type JwtSigner = { alg: "RS256"; kid: string; privateKey: KeyObject } | { alg: "HS256"; kid?: string; secret: string } | { alg: "none" }
type DecodedJwt = Readonly<{ header: Record<string, unknown>; payload: Record<string, unknown>; signature: Buffer }>
function signJwt(payload: Record<string, unknown>, signer: JwtSigner): string
function decodeJwt(token: string): DecodedJwt  // throws FakeOidcError FAKE_OIDC_BAD_JWT
function verifyRs256(token: string, jwk: Jwk): boolean  // false for another alg or a bad signature
// keys.ts
type Jwk = Readonly<{ kty: "RSA"; use: "sig"; alg: "RS256"; kid: string; n: string; e: string }>
type SigningKey = Readonly<{ kid: string; privateKey: KeyObject; jwk: Jwk }>
interface KeyRing { current(): SigningKey; rotate(): SigningKey; foreign(): SigningKey; jwks(): { keys: Jwk[] } }
function createKeyRing(): KeyRing
// pkce.ts
function pkceChallengeS256(verifier: string): string
function verifyPkce(verifier: string, challenge: string): boolean
// tokens.ts
type TokenContext = Readonly<{ issuer: string; now: () => Date; keys: KeyRing }>
function mintJwt(ctx: TokenContext, opts: MintOptions & { sid?: string }): string
// login-page.ts
function renderLoginPage(view: { action: string; username?: string; error?: string }): string
// contract.ts
type OidcContractCredentials = Readonly<{ clientId: string; clientSecret: string; redirectUri: string; username: string; password: string; organization: string; groups: readonly string[] }>
type ContractCheck = Readonly<{ name: string; run(): Promise<void> }>
function oidcContract(baseUrl: string, credentials: OidcContractCredentials): ContractCheck[]
```

Error codes (all `FakeOidcError`): `FAKE_OIDC_START_FAILED`, `FAKE_OIDC_UNKNOWN_USER`, `FAKE_OIDC_UNKNOWN_CLIENT`, `FAKE_OIDC_PUBLIC_CLIENT`, `FAKE_OIDC_BAD_OPTIONS`, `FAKE_OIDC_BAD_REDIRECT`, `FAKE_OIDC_BAD_JWT`, `FAKE_OIDC_CONTRACT_UNREACHABLE`.

## Data model

None on disk. In memory per fake (`provider.ts`): users and clients with their drawn secrets and redirect and post-logout sets; `codes: Map<string, CodeRecord>` (expired entries pruned at each insert, at most 1000, oldest dropped); `sessions: Map<string, "live" | "ended">`; the key ring; the request log.

## Failure cases

- **Bad input, absence:** every malformed or unknown parameter, path, code, session and `kid` has a defined answer (decisions 9 to 12).
- **Concurrency:** parallel exchanges of one code have one winner; rotation mid-flow breaks nothing.
- **Dependency down:** none; `oidcContract` against a stopped server fails with `FAKE_OIDC_CONTRACT_UNREACHABLE`.
- **Clock:** only the injected `now` is read; at `now() >= expiresAt` a code is expired.

## Security

1. **Authentication, PEP.** Test code, not an engine endpoint: no PEP action. Its endpoints are public as an IdP's are; token authenticates confidential clients, userinfo needs a live bearer.
2. **Tenant isolation.** No table; mallory's tokens carry only `org-b`, alice's only `org-a`, and `two_organizations` lets consumers prove they refuse both.
3. **Input validation.** Host allow-list, body limit, content type, exact redirect matching, PKCE format checks, escaping; received tokens are verified first.
4. **Secrets.** Passwords and the client secret are drawn per start, readable only through `passwordOf` and `clientSecret`, never on disk, in `requests()` or in error bodies. 
5. **Abuse cases, each refused by a spec scenario:** open redirect ("Redirect URI and client are matched exactly"); code replay ("One use, even in parallel"); PKCE downgrade ("Protocol errors go back to the client"); stolen code or body-only secret ("Client authentication"); user enumeration; XSS through the username ("Escaping and no echo"); DNS rebinding and non-loopback binding ("Foreign Host header"); algorithm confusion at userinfo ("Refusals"); secret leakage ("Redaction"). Never imported from `src/` (rule of `add-architecture-fitness`).

## Test plan

One test file per task, named after its source file; `fake-oidc.test.ts` runs the contract, the broken and unreachable providers and the redaction after a full flow. Each starts fakes with an injected `now`, closes them in `after`, and defines its own helpers (`authUrl`, `login`, `exchange`); HTTP is `fetch` with `redirect: "manual"`, or `node:http` to set `Host`; invalid-type inputs are cast with `as never` (red keeps typecheck). `pkce.test.ts` uses the RFC 7636 appendix B vector (`dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk` gives `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`).

## Decisions made while writing

- **`registerRedirect` and `opts.redirectUri`.** The card says the engine redirect comes "from opts or set later by `registerRedirect(uri)`" but its `FakeOidc` list omits the method. It is added, with options for another client and post-logout URIs, because `add-oidc-login` registers the callback once the engine port is known.
- **`ursitoare-mcp` is a public client** (PKCE only); `clientSecret` throws `FAKE_OIDC_PUBLIC_CLIENT` for it. For both clients the access-token `aud` is the client id, where Keycloak's default for the engine client is `account`; consumers must not assert it against Keycloak, and the contract does not.
- **`client_secret_post` is refused and a failed exchange consumes the code**: stricter than Keycloak, so a client bug cannot hide.
- **`organization` is gated on the scope** (as the spike observed); `groups`, `email`, `name`, `preferred_username` always appear. **Left out:** SSO cookie, other grants, refresh tokens, `iss` in the authorization response; logout without `id_token_hint` is 400 (Keycloak asks to confirm). `sid` only makes logout observable on userinfo.
- **Body limit in the server (task 2.1).** The 65536-byte limit and the 413 apply to every body of every route and live in the body reader, because a handler never touches the socket.
- **Login markup.** `autocomplete` is `username` and `current-password` (the standard tokens, so password managers fill the form); the scenario quotes the exact strings so a literal check passes.
- **Redirects are stored as given** and matched by string equality, like Keycloak's registered redirect URIs.
- **Contract assertions.** Listed per check under task 3.1; the scope includes `organization`; `wrong password` posts `"wrong-" + password`; the foreign redirect is `https://evil.example/cb`; every check has its own cookie jar.
- **Contract shape.** Checks are returned, not registered as tests, because the fake's URL exists only after its async start. `plain PKCE is refused` passes on real Keycloak only if the realm pins S256 on the client: a hand-off to `add-keycloak-realm`.
