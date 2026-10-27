## Why

Nobody can sign in yet: `add-identity-model` maps a verified token to a tenant and a user and `add-fake-oidc` stands in for Keycloak, but nothing speaks OIDC, issues a session or tells the engine who is calling. Ursitoare is a relying party only (ADR-12); every later unit (PEP, web app, roles, MCP) starts from the session created here.

Observable result: with `URSITOARE_OIDC_ISSUER` set, `GET /auth/oidc/login?return_to=/flows` redirects to the provider with PKCE and keeps its state in an encrypted `HttpOnly` cookie; `GET /auth/oidc/callback` exchanges the code, verifies the RS256 ID token (issuer, audience, `azp`, expiry, nonce, key), resolves the tenant from issuer plus `organization`, upserts the user, creates a server-side session (30 min idle, 12 h absolute, id stored only as a hash, found through route kind `session`) and redirects to `/flows` with the `ursitoare_session` cookie. Every refusal (bad state, bad token, unknown tenant, disabled user, provider down) is a redirect to `/sign-in?error=<code>`, audited in the tenant's chain once a validated token named it, otherwise logged. `POST /auth/oidc/logout` with the session and `X-CSRF-Token` revokes the session, removes its route and returns the provider's end-session URL. Without an issuer the engine still starts and the three routes answer 503 `OIDC_NOT_CONFIGURED`. The e2e stack gains the part `parts/25-oidc.ts`, which starts the fake provider and provisions `org-a` for the default tenant.

## What Changes

- `src/config/oidc.ts` and `loadConfig`: `URSITOARE_OIDC_ISSUER`, `URSITOARE_OIDC_CLIENT_ID`, `URSITOARE_OIDC_CLIENT_SECRET_FILE` into the optional `AppConfig.oidc`.
- `src/identity/oidc/`: the provider client (discovery, JWKS, code exchange, cached, bounded), ID-token verification, cookie helpers, `return_to` sanitizing, the sealed login cookie, sessions and CSRF tokens, `Principal`, and the three raw Fastify routes with `registerOidcRoutes`.
- `src/db/migrations/0120_sessions.sql`: table `ursitoare.session` (tenant-leading, forced RLS).
- `src/main.ts`: calls `registerOidcRoutes` before listening.
- `test/support/oidc-login.ts` (`completeFakeLogin`) and the e2e part `test/support/e2e-stack/oidc-part.ts` with `parts/25-oidc.ts`.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the `AppConfig.oidc` member and the `src/config/index.ts` export (task 1.1), and the migration (task 2.1).
- **Depends on** (evidence is the list under Interfaces taken): `add-engine-skeleton` (config loader, `main`, `Clock`), `add-db-foundation` (runner for `0120_sessions.sql`, `openDatabase`, test database), `add-tenancy-foundation` (`session` routes, `withTenantTx`), `add-audit-chain` (`appendAuditCommitted`), `add-fake-oidc` (the provider), `add-identity-model` (tenant and user resolution), `add-e2e-stack` (part contract), `add-architecture-fitness`: the `identity` row of `test/arch/modules.ts` (edges `core`, `config`, `db`, `tenancy`, `audit`, `observability`; egress `oidc`) already allows every import and the `fetch` calls here; no module or edge is added.
- **Files implemented** (stubs from the scaffold): `src/config/oidc.ts`, `src/identity/oidc/{errors,cookies,return-to,seal,client,id-token,sessions,principal,login,callback,logout,routes}.ts`, `src/identity/index.ts` (exports), `test/support/oidc-login.ts`, `test/support/e2e-stack/oidc-part.ts`. **Files created:** `src/db/migrations/0120_sessions.sql`, `test/support/e2e-stack/parts/25-oidc.ts` and a `*.test.ts` for each task of tasks.md. **Files changed:** `src/main.ts`, `src/config/config.ts`, `src/config/index.ts`; no existing test changes, no `package.json` change (only `node:crypto` and global `fetch`).
- **Migrations:** `0120_sessions.sql`. **Tables:** `ursitoare.session` (not partitioned, so the partition-ready rule does not apply). **Env:** `URSITOARE_OIDC_ISSUER`, `URSITOARE_OIDC_CLIENT_ID`, `URSITOARE_OIDC_CLIENT_SECRET_FILE`. **Endpoints:** `GET /auth/oidc/login`, `GET /auth/oidc/callback`, `POST /auth/oidc/logout` (public until `add-api-pep` classifies them `public(oidc)`). **Cookies:** `ursitoare_session`, `ursitoare_login`. **Header:** `X-CSRF-Token`. **Audit event:** `auth.login_refused`. **Error codes:** see design.md § Interfaces.

**Interfaces given** (exact shapes in `design.md` § Interfaces; the declarations omit `export`)

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

**Interfaces taken:**

- From `add-engine-skeleton`: `Clock`, `systemClock`; `loadConfig`, `AppConfig`, `Secret`, `ConfigError`, `readSecretValue`; `main`, `MainDeps`; `buildServer`; in tests `sequentialIds`, `noopTracer` and `createLogger` (task 6.1).
- From `add-db-foundation`: `Database`, `openDatabase`; `withTestDatabase`, `TestDatabase`, `freePort`; the runner that applies `0120_sessions.sql`.
- From `add-tenancy-foundation`: `TenantContext`, `TenantPool`, `TenantTx`, `withTenantTx`, `registerTenantRoute`, `resolveTenantBy`, `hashRouteKey`, `ensureDefaultTenant`, `checkTenancyCatalog`, `seedTwoTenants`; SQL `ursitoare.unregister_tenant_route(p_kind text, p_key_hash bytea)`; table `ursitoare.tenant`.
- From `add-audit-chain`: `appendAuditCommitted`, `AuditEventInput`, `verifyChain`.
- From `add-identity-model`: `resolveTenantForToken`, `upsertUserFromClaims`, `provisionTenantIdp`, `TokenClaims`, `IdentityError`; table `ursitoare."user"`.
- From `add-fake-oidc`: `startFakeOidc`, `FakeOidc`.
- From `add-e2e-stack`: `E2eStackPart`, `PartContext`, `PartHandle`, `E2eStackError`, `databaseApi`, `E2E_TENANT_NAME`, `discoverParts`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@fb48c96, checked line by line), and its section `Facts from the merged code` (main@bd7f38e).

## Out of scope

Classifying the routes, the 401/403 envelopes, CSRF and Origin enforcement on other routes and `GET /api/v1/me` (`add-api-pep`); the sign-in page, its messages and the CSRF header in the web client (`add-web-sign-in`); roles, teams and group mappings (`add-roles-and-memberships`); refresh tokens, userinfo, bearer authentication and the MCP audience (`add-mcp-server`); a session sweeper job (stale sessions are reaped at sign-in); rate limiting; session listing or admin revocation; the Keycloak realm (`add-keycloak-realm`); a browser journey (no sign-in page exists yet).
