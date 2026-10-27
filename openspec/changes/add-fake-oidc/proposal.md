## Why

Ursitoare is an OIDC relying party only (architecture ADR-12), and the default identity provider is Keycloak 26. Every identity unit of milestone 1 (token validation, the login routes, the sign-in journey) and later the MCP, membership-sync and Keycloak-realm units needs a provider that runs in-process with the test, without Docker, an external identity provider or a secret: a stand-in that speaks the same protocol on the same paths, shows the same login form and issues the same claim shapes, plus a way to make bad tokens. Without one shared fake, each unit would invent its own and they would drift from Keycloak and from each other.

Observable result: `await startFakeOidc()` returns, with no network beyond loopback, a Keycloak-shaped provider for realm `ursitoare` on a random `127.0.0.1` port. A browser opened on its authorization URL sees a form with the controls `Username or email` and `Password` and a `Sign In` button, so the same `login()` helper works against it and against Keycloak. A relying party that completes the authorization-code flow with PKCE S256 and `client_secret_basic` receives RS256 ID and access tokens whose `iss`, `sub`, `aud`, `azp`, `exp`, `iat`, `nonce`, `email`, `name`, `preferred_username`, `organization` (a list of aliases) and `groups` (names without a leading slash) have the shapes Keycloak 26 produces. `fake.mintToken({ flaw })` returns tokens that are wrong in exactly one way. `oidcContract(baseUrl, credentials)` returns the checks that `fake-oidc.test.ts` runs against the fake in every gate, and that `add-stack-conformance` later runs against real Keycloak.

## What Changes

- `test/support/fake-oidc/server.ts` (with `provider.ts` and one handler file per endpoint group): `startFakeOidc`, a `node:http` server on loopback with discovery, JWKS, the authorization endpoint (login form), the token endpoint, userinfo and end-session, all under `/realms/ursitoare`.
- `jwt.ts` (sign, decode, verify RS256), `keys.ts` (RSA key ring with rotation), `pkce.ts` (S256 only), `tokens.ts` (claims and the flaws), `login-page.ts` (the accessible form), and `types.ts` (`FakeOidc`, `MintOptions`, `RecordedRequest`, `FakeOidcError`).
- Seed data: organisations `org-a` and `org-b`; users alice, bob, carol (org-a) and mallory (org-b) with the groups of the roadmap; clients `ursitoare-engine` (confidential) and `ursitoare-mcp` (public, audience `ursitoare-mcp`). Passwords and client secrets are random per start and reachable only through `passwordOf` and `clientSecret`.
- `contract.ts`: `oidcContract(baseUrl, credentials)`, protocol checks that use only HTTP. `fake-oidc.test.ts` runs them against the fake.
- No `package.json` change (only `node:` built-ins), no `src/` change, no migration.

## Impact

- **Depends on:** none. The fake imports nothing from `src/` (the clock is the injected function `now`) and nothing from another change. `test/support/README.md` already lists `fake-oidc/` as owned by this change.
- **Base code relied on:** Node 24 built-ins `node:http`, `node:crypto`, `node:assert/strict`, global `fetch`. The seed `seed/deploy/keycloak-footprint/` (REPORT.md, `import/ursitoare-realm.json`) supplies the verified facts: realm `ursitoare`, `organization` claim as `["tenant-one"]` under scope `organization`, access-token lifespan 300 s, `iss` equal to the realm URL, and the confidential client `ursitoare-engine`. Nothing is imported from `seed/`.
- **Files implemented** (stubs from the scaffold): `test/support/fake-oidc/{types,server,jwt,keys,pkce,tokens,login-page,contract}.ts`. The scaffold's `index.ts` is already final and no task changes it: `export * from "./types.ts"; export { startFakeOidc } from "./server.ts"; export { decodeJwt, verifyRs256 } from "./jwt.ts"; export type { Jwk } from "./keys.ts"; export { oidcContract } from "./contract.ts"; export type { OidcContractCredentials, ContractCheck } from "./contract.ts";`. **Files created:** `provider.ts`, `authorize.ts`, `token.ts`, `session.ts` and `seed.ts` in the same directory, and the tests `jwt.test.ts`, `keys.test.ts`, `pkce.test.ts`, `tokens.test.ts`, `login-page.test.ts`, `server.test.ts`, `authorize.test.ts`, `token.test.ts`, `session.test.ts`, `fake-oidc.test.ts`. **Files changed:** none.
- **Migrations:** none. **Tables:** none. **Env:** none; the fake reads no variable.
- Consumers that rely on these names (not dependencies of this change): `add-identity-model`, `add-oidc-login` (its e2e part starts the fake, calls `registerRedirect` and writes `clientSecret("ursitoare-engine")` to a file), `add-web-sign-in` (`login(page, user)` fills the form with `passwordOf(user)`), `add-keycloak-realm`, `add-membership-sync` and `add-mcp-server`.
- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them.

**Interfaces given** (files under `test/support/fake-oidc/`)

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

**Interfaces taken:** none. The change uses only Node built-ins.

## Out of scope

Refresh tokens, the `client_credentials`, `password` and `refresh_token` grants, dynamic client registration, an SSO session cookie (the authorization endpoint always shows the form), the RFC 8414 well-known path and RFC 9728 metadata (`add-mcp-server`), a user-groups endpoint and disabling a user (`add-membership-sync` extends the fake), seeding the fake into the e2e stack (`add-oidc-login`'s part), exposing passwords to the browser tests (`add-web-sign-in`), running the contract against real Keycloak (`add-stack-conformance`), the Keycloak realm file (`add-keycloak-realm`), TLS, and any import of the fake from `src/` (forbidden by `add-architecture-fitness`).
