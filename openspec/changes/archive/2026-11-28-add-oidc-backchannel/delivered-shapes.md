# Delivered shapes taken by add-oidc-backchannel

Declarations from the merged code, main@31968a29, checked line by line (`file:line`; `…` elides unused members). Every name is merged code (U01 `add-engine-skeleton`, U09 `add-fake-oidc`, U12 `add-oidc-login`); nothing comes from an unmerged folder. "edited" marks what this unit changes.

```ts
// src/config
oidc.ts:6-10     interface OidcConfig { readonly issuer: string; readonly clientId: string; readonly clientSecret: Secret }   // edited: gains `readonly backchannelUrl?: string`
oidc.ts:17-19    ISSUER_VARIABLE = "URSITOARE_OIDC_ISSUER"; CLIENT_ID_VARIABLE = "URSITOARE_OIDC_CLIENT_ID"; SECRET_FILE_VARIABLE = "URSITOARE_OIDC_CLIENT_SECRET_FILE"
oidc.ts:22-26    ISSUER_REASON = "must be an https URL, or an http URL for a private host, without credentials, query or fragment"; SECRET_REQUIRED_REASON = "required when URSITOARE_OIDC_ISSUER is set"; STRAY_REASON = "set only together with URSITOARE_OIDC_ISSUER"
oidc.ts:38-58    function isPrivateAddress(hostname: string): boolean   // module-internal: localhost, ::1, fc00::/7, 127/8, 10/8, 172.16/12, 192.168/16, any dotless name (`keycloak`); brackets stripped
oidc.ts:60-76    isIssuer(value) (http(s), no credentials, query or fragment; http only for a private host; any path); isUnset(value) (undefined or "")
oidc.ts:78-106   loadOidcConfig(env: Env, readSecret: SecretReader, base: OidcConfigBase): OidcConfig | undefined   // edited
  :87-91 no issuer: a client id (:88) or secret file (:89) set throws CONFIG_INVALID STRAY_REASON, else undefined; :93 issuer check; :95 secret file required; :97-103 client id, secret, engine key, database; :105 returns { issuer, clientId, clientSecret }
config.ts:32, :230, :245   AppConfig.oidc?: OidcConfig; loadOidcConfig(env, readSecret, { engineKey, database }); `{ ...config, oidc }` only when defined
errors.ts:1-13   class ConfigError extends Error { code: "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY"; variable: string; constructor(code, variable, reason) }   // message `${variable}: ${reason}`
// src/identity
oidc/config-shape.ts:8   type OidcConfigShape = Readonly<{ issuer: string; clientId: string; clientSecret: Secret }>   // edited: gains `backchannelUrl?: string`
oidc/errors.ts:1-11      class OidcError extends Error { readonly code: string; readonly details: Record<string, string | number>; constructor(code: string, message: string, details?) }
oidc/client.ts:7-16      interface OidcClient { discovery(): Promise<{ authorizeUrl: string; tokenUrl: string; jwksUrl: string; logoutUrl: string | null }>; signingKey(kid: string): Promise<JsonWebKey | null>; exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<string> }
oidc/client.ts:31-37     unavailable(reason, extra?) → OidcError("OIDC_PROVIDER_UNAVAILABLE", "The OIDC provider is unavailable", { reason, ...extra })
oidc/client.ts:69-80     endpoint(value: unknown, issuer: URL): string   // non-string, unparsable or not http(s): reason "endpoint" (:70-77); origin differs from the issuer's: "origin" (:78)
oidc/client.ts:82-102    parseDiscovery(value: unknown, issuer: string): Discovery   // edited: `issuer` member must equal the argument (:85, "issuer"); unparsable issuer "issuer" (:87-92); order authorization, token, jwks, end_session (absent or null: logoutUrl null) (:94-99)
oidc/client.ts:141-146   createOidcClient(deps: { config: OidcConfigShape; clock: Clock; fetch?: typeof fetch; timeoutMs?: number }): OidcClient
oidc/client.ts:154-164   a thrown fetch → unavailable("network"); requestInit adds redirect "error" and an AbortSignal
oidc/client.ts:181-200   fetchDiscovery GET `${config.issuer}/.well-known/openid-configuration` (:183) then parseDiscovery(json, config.issuer) (:189); non-2xx → unavailable("status", { status }); discovery() caches 3_600_000 ms (:18)   // edited
oidc/client.ts:202-209   fetchKeys GET document.jwksUrl; :226-263 exchangeCode POST document.tokenUrl (:242) with Basic auth (:238-247); a 4xx → OidcError("OIDC_EXCHANGE_FAILED", …, { reason: "status" }) (:253); other non-2xx → unavailable("status", { status })
oidc/id-token.ts:66-76   verifyIdToken(token: string, opts: { config: OidcConfigShape; nonce: string; clock: Clock; keyFor(kid: string): Promise<JsonWebKey | null> }): Promise<TokenClaims & { organization: unknown }>   // :98 `iss !== config.issuer` → OIDC_TOKEN_INVALID { reason: "issuer" }; not edited
oidc/routes.ts:12-19, :43-83   OidcRoutesDeps { config: OidcConfigShape | null; publicBaseUrl; pool; engineKey; clock: Clock; fetch?: typeof fetch }; registerOidcRoutes(server, deps) hands config and fetch to createOidcClient; not edited
oidc/login.ts:48-50, :64-109   refusalLocation(code) = `/sign-in?error=${encodeURIComponent(code)}`; the handler answers 302 to discovery.authorizeUrl (:85); an OidcError becomes its code (no cookie on failure); not edited
oidc/logout.ts:71-82     redirects to discovery.logoutUrl when not null; not edited
identity/index.ts:40-41  export type { OidcClient } …; export { createOidcClient } from "./oidc/client.ts"   // edited: the value line gains discoveryUrl, serverSideUrl
main.ts:334-341          registerOidcRoutes(scoped, { config: config.oidc ?? null, publicBaseUrl, pool, engineKey, clock }); not edited
// src/core: clock.ts:1-3, :11   interface Clock { now(): Date }; fixedClock(iso: string): Clock
// test/support (U09)
fake-oidc/server.ts:308-385  startFakeOidc(opts?: { port?: number; host?: string; now?: () => Date; redirectUri?: string }): Promise<FakeOidc>   // one loopback port; issuer `${url}/realms/ursitoare`; every endpoint of its document on that origin (:47-63)
fake-oidc/types.ts:43-58      interface FakeOidc { issuer; url; clientSecret(clientId); mintToken(opts: MintOptions); registerRedirect(uri, opts?); requests(): RecordedRequest[]; close(): Promise<void>; … }; MintFlaw includes "wrong_iss" (:12-24; `iss` is `${issuer}/other`)
fake-oidc/jwt.ts:69-82          decodeJwt(token: string): DecodedJwt   // .header, .payload
oidc-login.ts:10-33           completeFakeLogin(fake: FakeOidc, authorizationUrl: string, username: string): Promise<string>   // uses the global fetch, never an injected one
```

Frozen tests that stay green and unedited: `src/config/oidc.test.ts` (seven tests), `src/identity/oidc/client.test.ts` (`C-ad533226`, `C-4bf7d6e6`, `C-5a0077b2`), `login.test.ts`, `id-token.test.ts`, `callback.test.ts`, `logout.test.ts`, `src/main.oidc.test.ts`, `test/support/e2e-stack/oidc-part.test.ts`. None sets the new variable or deep-equals a whole `oidc` object.
