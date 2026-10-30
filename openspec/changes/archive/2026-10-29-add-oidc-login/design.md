## Context

Dependencies, restated as their folders define them (only what is used).

- `add-engine-skeleton`: `Clock { now(): Date }`, `systemClock`; `loadConfig(env: Env, readSecret?: SecretReader): AppConfig` (`publicBaseUrl: string`, `engineKey: Secret | null`, `database.app: DatabaseEndpoint | null`), `Secret.reveal(): string`, `ConfigError(code, variable, reason)` (`CONFIG_INVALID`, `CONFIG_SECRET_EMPTY`), `readSecretValue(variable, path, readSecret): Secret` (`src/config/secret.ts`); direct secret variables (no `_FILE`) are already refused. `main(deps?: Partial<MainDeps>)` exits 1 with one fatal line (`code` from the error's string `code`) on a startup error.
- `add-db-foundation`: `main` awaits `openDatabase(config, deps): Promise<Database | null>`, `Database { appPool: pg.Pool }`; `withTestDatabase()` gives `TestDatabase { ownerPool; appPool; appEndpoint; name; ownerUrl }`; `freePort()`.
- `add-tenancy-foundation`: `TenantContext { tenantId; reviewProfile }`, `TenantPool = Pick<pg.Pool, "connect">`, `TenantTx = Pick<pg.PoolClient, "query">`, `withTenantTx(pool, ctx, fn)`, `registerTenantRoute(tx, kind, key): Promise<"created" | "exists">`, `resolveTenantBy(pool, kind, key): Promise<TenantContext | null>`, `hashRouteKey(key): Buffer`, `ensureDefaultTenant(pool, name, opts?)`, SQL `ursitoare.unregister_tenant_route(p_kind text, p_key_hash bytea): boolean` (current tenant only), `seedTwoTenants(db)`, `checkTenancyCatalog(pool)`. Kind `session` is free.
- `add-audit-chain`: `appendAuditCommitted(pool, ctx, event, opts?: { clock?: Clock }): Promise<{ seq: bigint; hash: string }>`, `AuditEventInput { eventType: string; actor: { kind: "user" | "service" | "system"; id: string }; payload?: Record<string, unknown> }` (`eventType` `^[a-z][a-z0-9_.]{0,63}$`); payload keys containing `token`, `secret`, `password`, `apikey` or `credential` fail.
- `add-identity-model`: `resolveTenantForToken(pool, { issuer: string; organization: unknown }): Promise<TenantContext>` (`IdentityError` `IDENTITY_NO_ORGANIZATION`, `IDENTITY_AMBIGUOUS_ORGANIZATION`, `IDENTITY_UNKNOWN_TENANT`); `upsertUserFromClaims(tx, ctx, claims: TokenClaims, opts?): Promise<User>`, `TokenClaims { issuer: string; subject: string; email?: string | undefined; name?: string | undefined; preferredUsername?: string | undefined }` (`IDENTITY_USER_DISABLED`, `IDENTITY_INVALID`); `provisionTenantIdp(ownerPool, ctx, { issuer, organization }, opts?)`; table `ursitoare."user"`.
- `add-fake-oidc`: `startFakeOidc(opts?: { now?: () => Date; redirectUri?: string }): Promise<FakeOidc>`, `FakeOidc { issuer; clientSecret(id); passwordOf(user); mintToken(opts); rotateSigningKey(); registerRedirect(uri, opts?: { postLogout? }); close() }`, `mintToken({ user?, kind?, flaw?, nonce? })`; a code works once; logout needs `id_token_hint`; alice is in `org-a`, mallory in `org-b`.
- `add-e2e-stack`: `E2eStackPart { name; start(ctx): Promise<PartHandle>; seed?(ctx) }`, `PartContext { dataDir; engineOrigin; handles; ... }`, `PartHandle { env; api?; close() }`, `databaseApi(handles): { ownerUrl; ... }`, `E2E_TENANT_NAME`, `E2eStackError` (`STACK_PART_MISSING`), `discoverParts()`.
- `add-architecture-fitness`: `identity` may import `core`, `config`, `db`, `tenancy`, `audit`, `observability` and has egress `oidc`; no edge is added. `identity` cannot import `src/api`: its handlers write `{ error: { code, message } }` themselves.

## Decisions

1. **Files:** `src/identity/oidc/*.ts` (list: the proposal), `src/config/oidc.ts` (called by `loadConfig` in `src/config/config.ts`), exports in the two `index.ts`. Browser routes answer redirects (`cache-control: no-store` on all three routes) and check values by hand; only 503, 401 and 403 use the envelope.
2. **Config:** private host means `localhost`, `*.localhost`, an IPv4 literal in 127/8, 10/8, 172.16/12 or 192.168/16, `::1`, `fc00::/7`, or a name without a dot. The issuer is kept as written. Redirect URI `${publicBaseUrl}/auth/oidc/callback`; cookies are `Secure` when `publicBaseUrl` starts with `https:`.
3. **Wiring:** `main` calls `registerOidcRoutes(server, { config: config.oidc ?? null, publicBaseUrl, pool: database?.appPool ?? null, engineKey: config.engineKey, clock: systemClock })` after `configureServer` and before `listen`. A `config` lacking `pool` or `engineKey` throws `OidcError` `OIDC_NOT_CONFIGURED`.
4. **Algorithms** are in the tasks that build them: cookies and `return_to` (3.1), the provider client (4.1), the ID token (4.2), sealing (6.1). The spec holds their observable rules and reasons.
5. **Login:** draws `state`, `nonce` and a PKCE verifier (32 random bytes each, base64url), seals `{"v":1,"state","nonce","verifier","returnTo","exp"}` (`exp` = now + 600000 ms) into the login cookie and answers 302 to the discovery `authorizeUrl` with `response_type=code`, `client_id`, `redirect_uri`, `scope=openid profile email organization`, `state`, `nonce`, `code_challenge` (base64url SHA-256 of the verifier), `code_challenge_method=S256`. A second login overwrites the cookie, so the earlier tab ends in `OIDC_STATE_MISMATCH`.
6. **Callback order:** clear the login cookie on every outcome and ignore any incoming session cookie; open the login cookie (`v`, `exp > now`); `state` (string of at most 128 characters; `timingSafeEqual` of SHA-256 digests); an `error` parameter; `code` (string of 1 to 2048 characters); `client.exchangeCode`; `verifyIdToken` with the sealed nonce; `resolveTenantForToken` (connect 1); one `withTenantTx` with `upsertUserFromClaims` and `createSession` (hint: the ID token sealed with `ursitoare/session-hint`, extra `tenantId + "\n" + userId`); (connect 2); set `ursitoare_session`; 302 to `returnTo`. A refusal audit is connect 3.
7. **Refusals:** a 302 to `/sign-in?error=<code>` (causes: the spec), logged by `request.log.warn({ code, reason? }, "sign-in refused")` (`OIDC_INTERNAL`: `error`, `{ err }`), never with a token, claim or cookie. Audited for every refusal after `resolveTenantForToken` returned the tenant (`OIDC_USER_DISABLED`, the `OIDC_TOKEN_INVALID` of `IDENTITY_INVALID`, `OIDC_INTERNAL` from the transaction or `createSession`): `appendAuditCommitted(pool, tenant, { eventType: "auth.login_refused", actor: { kind: "system", id: "oidc" }, payload: { code } }, { clock })`, after the failed transaction ended; an audit failure is logged by `request.log.error({ err }, "sign-in audit failed")` and the redirect is unchanged.
8. **Sessions:** id = 32 random bytes base64url (43 characters), never stored; `session_id_hash = hashRouteKey(id)`, also the route's key hash. `createSession`: tenant check (`current_setting('app.tenant_id', true)`, else `SESSION_TENANT_MISMATCH`), reap, insert (`expires_at` = now + 43200 s, `idle_timeout_s` 1800, `csrf_token_hash` of a token nobody holds), `registerTenantRoute(tx, "session", id)`. Reaping revokes up to 20 expired or idle live sessions of the tenant and removes their routes. `resolveSession`: a cookie not matching `^[A-Za-z0-9_-]{43}$` gives `null` without a query; then `resolveTenantBy(pool, "session", cookie)`; one `withTenantTx` reads the row joined to its user and gives `null` when absent, revoked, past `expires_at` or `last_seen_at + idle_timeout_s` (a live one is then revoked and unrouted) or when the user is not `active`; else it sets `last_seen_at = now` after 60 s or more. Routes go by `SELECT ursitoare.unregister_tenant_route('session', $1)` with the stored hash.
9. **CSRF:** `issueCsrfToken` stores the SHA-256 of 32 fresh random bytes (base64url) and returns them, replacing the previous token; `verifyCsrfToken` compares in constant time on a non-revoked session. `add-api-pep` issues it from `GET /api/v1/me`.
10. **Logout:** 503; no session cookie or session: 401 `UNAUTHENTICATED` and the cookie is cleared; header `x-csrf-token` wrong: 403 `OIDC_CSRF_INVALID`; else `revokeSession`, clear the cookie, 200 `{ redirect }` = `logoutUrl` with `id_token_hint` (opened hint), `post_logout_redirect_uri=${publicBaseUrl}/sign-in`, `client_id`; without discovery or hint, `${publicBaseUrl}/sign-in`.
11. **Principal:** `principalOf(s)` = `{ tenantId: s.tenant.tenantId, userId: s.userId, kind: "human", sessionId: s.sessionRef, roles: [], teams: [], actorChain: [] }`; `sessionRef` is the stored hash in hex, never the cookie.
12. **e2e part** `oidcPart` (name `oidc`; `parts/25-oidc.ts`, created in green). `start`: `startFakeOidc` registering `engineOrigin + "/auth/oidc/callback"` and post-logout `engineOrigin + "/sign-in"`, the client secret to `<dataDir>/client-secret` (0600), env `URSITOARE_OIDC_ISSUER` and `URSITOARE_OIDC_CLIENT_SECRET_FILE`, `api` `{ fake }`; it adds only the issuer and the client secret file because the stack already supplies the engine key file, the database URL and `URSITOARE_PUBLIC_BASE_URL` = `engineOrigin` (`stack.ts`, `database-part.ts`), so the redirect it registers equals the engine's callback URL. `seed` (after every reset): on a one-connection owner pool from `databaseApi(ctx.handles).ownerUrl`, `ensureDefaultTenant(pool, E2E_TENANT_NAME)` then `provisionTenantIdp(pool, tenant, { issuer: fake.issuer, organization: "org-a" })`.

## Interfaces

`SESSION_COOKIE` is `"ursitoare_session"` (scaffold stub `""`); `OidcOptions` defaults are `systemClock` and `node:crypto` `randomBytes`. Internal, imported by no test: `createSealer`. `JsonWebKey` is the `node:crypto` type. `OidcError.code` is one of the sign-in codes `OIDC_LOGIN_EXPIRED`, `OIDC_STATE_MISMATCH`, `OIDC_BAD_REQUEST`, `OIDC_EXCHANGE_FAILED`, `OIDC_PROVIDER_UNAVAILABLE`, `OIDC_TOKEN_INVALID`, `OIDC_UNKNOWN_TENANT`, `OIDC_USER_DISABLED`, `OIDC_INTERNAL` (the only values of `/sign-in?error=`), or `OIDC_NOT_CONFIGURED`, `OIDC_CSRF_INVALID`, `OIDC_SEAL_INVALID`, `UNAUTHENTICATED`, `SESSION_INVALID`, `SESSION_TENANT_MISMATCH`, `SESSION_NOT_FOUND`.

```ts
// src/config/oidc.ts (task 1.1 re-exports it from index.ts and adds AppConfig.oidc?: OidcConfig)
interface OidcConfig { readonly issuer: string; readonly clientId: string; readonly clientSecret: Secret }
// src/identity/index.ts (types of src/tenancy, src/core, add-identity-model)
class OidcError extends Error { code: string; details: Record<string, string | number>; constructor(code: string, message: string, details?: Record<string, string | number>) }
interface OidcOptions { clock?: Clock; randomBytes?: (size: number) => Uint8Array }
const SESSION_COOKIE: string
function sanitizeReturnTo(raw: unknown): string
function parseCookies(header: string | undefined): Record<string, string>
function serializeCookie(name: string, value: string, opts: { path: string; secure: boolean; maxAgeS?: number }): string
interface OidcClient { discovery(): Promise<{ authorizeUrl: string; tokenUrl: string; jwksUrl: string; logoutUrl: string | null }>; signingKey(kid: string): Promise<JsonWebKey | null>; exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<string> }
function createOidcClient(deps: { config: OidcConfig; clock: Clock; fetch?: typeof fetch; timeoutMs?: number }): OidcClient
function verifyIdToken(token: string, opts: { config: OidcConfig; nonce: string; clock: Clock; keyFor(kid: string): Promise<JsonWebKey | null> }): Promise<TokenClaims & { organization: unknown }>
interface SessionContext { tenant: TenantContext; userId: string; sessionRef: string; endSessionHint: string | null }
function createSession(tx: TenantTx, ctx: TenantContext, input: { userId: string; endSessionHint?: string }, opts?: OidcOptions): Promise<{ sessionId: string }>
function resolveSession(pool: TenantPool, cookieValue: string | undefined, opts?: OidcOptions): Promise<SessionContext | null>
function revokeSession(pool: TenantPool, session: SessionContext, opts?: OidcOptions): Promise<boolean>
function issueCsrfToken(pool: TenantPool, session: SessionContext, opts?: OidcOptions): Promise<string>
function verifyCsrfToken(pool: TenantPool, session: SessionContext, token: string | undefined): Promise<boolean>
interface Principal { tenantId: string; userId: string; kind: "human" | "service"; sessionId?: string; roles: string[]; teams: string[]; actorChain: string[] }
function principalOf(session: SessionContext): Principal
interface OidcRoutesDeps { config: OidcConfig | null; publicBaseUrl: string; pool: TenantPool | null; engineKey: { reveal(): string } | null; clock: Clock; fetch?: typeof fetch }
function registerOidcRoutes(server: FastifyInstance, deps: OidcRoutesDeps): void
// test/support/oidc-login.ts
function completeFakeLogin(fake: FakeOidc, authorizationUrl: string, username: string): Promise<string>
// test/support/e2e-stack/oidc-part.ts (parts/25-oidc.ts re-exports oidcPart as part)
const oidcPart: E2eStackPart; function oidcApi(handles: ReadonlyMap<string, PartHandle>): { fake: FakeOidc }
// SQL: table ursitoare.session
```

## Data model

`src/db/migrations/0120_sessions.sql`, verbatim (not partitioned: architecture section 6 partitions only time series).

```sql
CREATE TABLE ursitoare.session (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  session_id_hash bytea NOT NULL CHECK (octet_length(session_id_hash) = 32),
  user_id text NOT NULL,
  created_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  idle_timeout_s integer NOT NULL CHECK (idle_timeout_s BETWEEN 60 AND 86400),
  csrf_token_hash bytea NOT NULL CHECK (octet_length(csrf_token_hash) = 32),
  end_session_hint text,
  revoked_at timestamptz,
  PRIMARY KEY (tenant_id, session_id_hash),
  CONSTRAINT session_user_fkey FOREIGN KEY (tenant_id, user_id) REFERENCES ursitoare."user" (tenant_id, user_id),
  CONSTRAINT session_times CHECK (expires_at > created_at));
CREATE INDEX session_live_idx ON ursitoare.session (tenant_id, expires_at) WHERE revoked_at IS NULL;
ALTER TABLE ursitoare.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.session FORCE ROW LEVEL SECURITY;
CREATE POLICY session_isolation ON ursitoare.session
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.session TO ursitoare_app;
GRANT UPDATE (last_seen_at, csrf_token_hash, revoked_at) ON TABLE ursitoare.session TO ursitoare_app;
```

## Failure cases

Config errors stop the start (fatal line, exit 1). A bad provider makes login and callback redirect; logout still succeeds locally. A replayed code is refused by the provider: no second session. Simultaneous callbacks of one user are serialised by `upsertUserFromClaims` and give two sessions. A database error during sign-in is `OIDC_INTERNAL`; in `resolveSession` it propagates, never `null`.

## Security

1. The routes are public by design (`add-api-pep` classifies them `public(oidc)`); logout authenticates by session cookie plus CSRF header and acts on the caller's own session, so it has no policy action. The tenant comes only from a validated token.
2. `session` is tenant-leading with forced RLS; a cookie finds its tenant only through route kind `session`; the two-tenant test uses `appPool` only.
3. Query values, cookies and claims are untrusted and checked with fixed limits; claims never authorise, and `organization` reaches only `resolveTenantForToken`. `return_to` is cut to a same-origin path.
4. The client secret (a file-backed `Secret`) appears only in the Basic header, the engine key only in HKDF, the session id only in the cookie, the CSRF token only in the response, the ID token only sealed. No log, error, URL or audit payload holds a token, claim, cookie or code.
5. Abuse cases, each a spec scenario: replayed code, state mismatch, forged login cookie, bad token (algorithm, key, audience, issuer, nonce), open redirect, session fixation, logout CSRF, a hostile provider, a disabled user, another tenant's organization.

## Test plan

Node test runner, `*.test.ts` beside each file (tests under `src/identity/oidc/` import from `../index.ts`), no sleeps, loopback only. DB tests use `withTestDatabase()` and `seedTwoTenants(db)`; the migration test first asserts with `assert.ok` that `to_regclass('ursitoare.session')` exists and the ledger holds version 120 named `sessions`; SQL failures are `await assert.rejects(p, { code })`. A mutable `Clock` moves time; the fake gets `now: () => clock.now()`. **Callback without a browser:** `server.inject` `GET /auth/oidc/login` gives `Location` and the login cookie; `completeFakeLogin` submits the fake's form and returns the `Location` back to the engine; `server.inject` `GET` of its path and query with the cookie. The engine is `buildServer` plus `registerOidcRoutes` (`publicBaseUrl` `http://127.0.0.1:8080`, its callback and post-logout `/sign-in` registered at the fake; org-a and org-b provisioned with `provisionTenantIdp(db.ownerPool, ...)`). Bad tokens: a `deps.fetch` wrapper that swaps `id_token` for `fake.mintToken({ kind: "id", flaw, nonce })`, or for a token signed by a test RSA key whose public JWK it adds to the JWKS answer. A pool wrapper delegates to `db.appPool` and rejects the Nth `connect` of a request. Provider down: a closed `freePort()`. `src/main.oidc.test.ts` boots `main` on a free port. The part test passes `handles` with a `database` handle whose `api` is `{ host, port, database: db.name, ownerUrl: db.ownerUrl }`.

## Decisions made while writing

- **`opts?: OidcOptions`** (injected time and randomness) is added to the card's session signatures.
- **`AppConfig.oidc` is optional** and added by task 1.1 (the scaffold cannot edit `config.ts`); red tests read it through a cast to `AppConfig & { oidc?: OidcConfig }`.
- **Private hosts include dotless names**, so the M8 compose issuer `http://keycloak:8080/realms/ursitoare` works.
- **`end_session_hint` column** (beyond the card): the fake's end-session answers 400 without `id_token_hint`, which would break sign-out in the M1 journey; it holds the ID token sealed with the engine key.
- **The CSRF token rotates on issue**: a second tab calling `/me` invalidates the first tab's token; `add-api-pep` and `add-web-sign-in` should issue it once per page load and treat `OIDC_CSRF_INVALID` as "reload".
- **Every refusal after the tenant is named is audited** (follows the requirement's SHALL): `OIDC_USER_DISABLED`, the `OIDC_TOKEN_INVALID` of `IDENTITY_INVALID` and `OIDC_INTERNAL` from the transaction. Earlier ones are only logged: claims of a token that failed validation never choose a tenant. A failed append is logged as `sign-in audit failed`.
- **A disabled user loses live sessions too**; reaping at sign-in replaces a sweeper job.
- **For `add-api-conventions`:** register the envelope codes `OIDC_NOT_CONFIGURED`, `UNAUTHENTICATED`, `OIDC_CSRF_INVALID`.
- **`oidcApi` exposes the fake** so `add-web-sign-in` can read `passwordOf`; there is no browser test (no sign-in page).
