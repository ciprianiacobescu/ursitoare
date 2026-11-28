## Context

In the hobbyist stack the browser reaches Keycloak at `http://localhost:8180` and the engine, in its container, at `http://keycloak:8080`. Today `createOidcClient` requires the discovery document's four endpoints to share the issuer's origin and fetches discovery at the issuer, so the engine cannot work there. This unit adds an optional back-channel origin: discovery, token and JWKS requests go there; the issuer stays the browser URL and is still checked in the document and in `iss`; nothing given to the browser changes. Unset means today's behaviour exactly.

## Decisions

1. **The rule [D2].** The document's `issuer` is always compared with the configured issuer. Only four members are read (`userinfo_endpoint` and the rest are ignored):

| Member | Called by | With a back-channel origin | Without |
|---|---|---|---|
| `authorization_endpoint` | the browser | on the issuer's origin | on the issuer's origin |
| `end_session_endpoint` (optional) | the browser | on the issuer's origin | on the issuer's origin |
| `token_endpoint`, `jwks_uri` | the engine | on the back-channel origin, or on the issuer's origin and then rewritten to it | on the issuer's origin |

Anything else is refused with `OIDC_PROVIDER_UNAVAILABLE`, message `The OIDC provider is unavailable`, `details` `{ reason: "origin" }`: a third origin, and a browser endpoint on the back-channel origin (the browser is never sent an internal host). Each member is first checked for shape (not a string, unparsable, not http(s): reason `endpoint`), then for origin, in the order authorization, token, JWKS, end-session; the first failure wins, as today. Origins compare as `URL.origin`.
2. **The variable.** `URSITOARE_OIDC_BACKCHANNEL_URL` is stored as the URL's origin (`http://keycloak:8080/` gives `http://keycloak:8080`; `https://IDP-Internal.example:443` gives `https://idp-internal.example`). Unset and the empty string mean no member (the engine's rule for every variable; U59's `idp-external` overlay sets it empty). It must be http(s) with no credentials, query, fragment or path other than `/`, and http only for a private host (the `isPrivateAddress` rule of the issuer: `http://keycloak:8080` passes, `http://idp.example` does not). A path is refused, not stripped: pasting the issuer there is the likely mistake. Reason `must be an https origin, or an http origin for a private host`.
3. **Order in `loadOidcConfig`.** No issuer: a stray client id, then secret file variable, then back-channel throw `set only together with URSITOARE_OIDC_ISSUER` (a bad value without an issuer is stray). With an issuer: the issuer check, then the back-channel check, then the secret file, client id, secret, engine key and database checks as today. `backchannelUrl` is in the returned object only when set (lesson z).
4. **Two pure functions.** `discoveryUrl(issuer, null)` is today's string byte for byte (a trailing-slash issuer keeps its double slash); with a back-channel it is that origin, the issuer's path without a trailing `/`, and `/.well-known/openid-configuration`; it throws `OidcError` `{ reason: "issuer" }` only for an unparsable issuer or back-channel when a back-channel is given. `serverSideUrl` returns the endpoint string itself when it is on the allowed origin, the back-channel origin plus path, query and fragment when it is on the issuer's origin and a back-channel exists, and `null` otherwise (unparsable and non-http(s) input included); it never throws.
5. **The client.** `fetchDiscovery` requests `discoveryUrl(config.issuer, config.backchannelUrl ?? null)`; `parseDiscovery` takes the back-channel, gives `tokenUrl` and `jwksUrl` the result of `serverSideUrl` (null is reason `origin`, after the shape check) and checks authorization and end-session with `endpoint`. `fetchKeys` and `exchangeCode` already use `document.jwksUrl` and `document.tokenUrl`, so they change nothing; the caches, the size cap, `redirect: "error"` and the signal are untouched; a failed back-channel call is never retried on the issuer origin.
6. **Not edited.** `id-token.ts` compares `iss` with `config.issuer` (the browser URL). `login.ts` and `logout.ts` redirect to `discovery.authorizeUrl` and `logoutUrl`, which stay on the issuer origin. `routes.ts` hands `config` and `fetch` through, `callback.ts` uses the client, `src/main.ts` passes `config.oidc`; the new member rides along because `OidcConfigShape` gains it (task 1).
7. **Two origins without Docker, DNS or a fake change.** The fake listens on one loopback port and names that origin everywhere. A second origin is made by an injected `fetch` (`twoOrigins`, `test-plan.md`) that forwards `http://keycloak:8080` to the fake's port and rewrites its discovery answer into Keycloak's shape. The helper is local to the test file; no `test/support/` file is new. Refusal rows use recorded `fetch` handlers with fixed documents.
8. **Task order.** Task 3 changes only the URL `fetchDiscovery` requests; `parseDiscovery` keeps checking all four endpoints against the issuer's origin, so its tests assert only `authorizeUrl`, `logoutUrl`, the request list and the refusals. Task 4 gives `parseDiscovery` the back-channel and switches token and JWKS to `serverSideUrl`; its tests (Keycloak-shaped document, exchange, keys, `iss`) fail until then, and no parameter is added before it is used. Every new test wraps its calls in `settle` or `sync`, so a red run fails by assertion.
9. **No document, route or OpenAPI change**; the variable is documented where it is wired (U59).

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Taken: `delivered-shapes.md`.

```ts
// src/identity/oidc/client.ts (exported from src/identity/index.ts)
export function discoveryUrl(issuer: string, backchannelUrl: string | null): string;   // null: `${issuer}/.well-known/openid-configuration`, byte for byte; else that path on the back-channel origin (issuer's trailing "/" dropped); with a back-channel given, an unparsable issuer or back-channel throws OidcError OIDC_PROVIDER_UNAVAILABLE { reason: "issuer" }
export function serverSideUrl(endpoint: string, issuer: string, backchannelUrl: string | null): string | null;   // null back-channel: endpoint when on the issuer's origin, else null; else an endpoint on the back-channel origin unchanged, one on the issuer's origin with its origin replaced (path, query, fragment kept), any other, a non-http(s) or an unparsable input: null
// Not scaffolded:
//   variable URSITOARE_OIDC_BACKCHANNEL_URL, read by loadOidcConfig (src/config/oidc.ts): empty is unset; else an http(s) URL with no credentials, query, fragment or path other than "/", http only for a private host; stored as its origin
//   OidcConfig gains `readonly backchannelUrl?: string` (src/config/oidc.ts) and OidcConfigShape gains `backchannelUrl?: string` (src/identity/oidc/config-shape.ts); each present only when the variable is set
//   CONFIG_INVALID messages: "must be an https origin, or an http origin for a private host"; "set only together with URSITOARE_OIDC_ISSUER" (the existing stray reason)
//   the edits of loadOidcConfig, fetchDiscovery and parseDiscovery (client.ts); the value export line of src/identity/index.ts (createOidcClient, discoveryUrl, serverSideUrl)
```

## Failure cases and security

| Case | Result |
|---|---|
| back-channel unreachable at discovery, token or JWKS | `{ reason: "network" }`, no request to the issuer origin; at login 302 to `/sign-in?error=OIDC_PROVIDER_UNAVAILABLE`, no cookie |
| back-channel answers non-2xx | `{ reason: "status", status }`; a 4xx at the token endpoint is `OIDC_EXCHANGE_FAILED` as today |
| endpoint on a third origin, or a browser endpoint on the back-channel origin | `{ reason: "origin" }` |
| document `issuer` differs from the configured one (also one naming the back-channel) | `{ reason: "issuer" }` |
| issuer unparsable with a back-channel | `{ reason: "issuer" }` before any request |
| variable malformed, or set without an issuer | `CONFIG_INVALID` at start (the existing fatal line), never a fallback |
| back-channel equal to the issuer's origin | accepted; behaves as unset |
| back-channel changed | applies at the next start (discovery is cached 3600 s) |

Security: no endpoint, table or route key is added (PEP and tenant isolation unchanged). The variable is checked at start, every endpoint of a discovery answer for shape and origin before use. The client secret travels only in the Basic header of the token request, which can now go only to the back-channel origin (the issuer's when unset); errors and `details` hold a short reason word, never a URL or body (the rows assert whole `details`). Abuse cases: a hostile document steering the exchange and the client secret to a third origin (rows K3 to K5); one leaking the internal host to the browser as an authorization or logout URL (R2, R3); a pasted or wrong variable (B1 to B8); a forged `iss` (W1).

## Verification

Probes (2026-11-25, scratch copy of main@31968a29, Node 24, loopback only, no Docker): a reference implementation and the four test files of `test-plan.md` (11 tests). On the reference all 11 pass, together with 104 existing tests (`src/identity/oidc/*.test.ts`, `src/config/*.test.ts`, `src/main.oidc.test.ts`, `test/support/e2e-stack/oidc-part.test.ts`), 115 in all, none edited. On the base code plus the two throwing stubs all 11 fail, each by `AssertionError` (no `TypeError`, missing export or link error). After tasks 1 and 2 only the 5 tests of tasks 3 and 4 fail; after task 3 only the 2 of task 4 fail. `tsc` shows no error in the touched files (errors are only for the `web/` imports of `test/journeys`, absent from the copy) and ESLint (`--max-warnings=0`) is clean on the four edited source files. The URL, config and document rows were computed by running them.

**UNVERIFIED (never a fact in a THEN):** with `KC_HOSTNAME` a full URL and `KC_HOSTNAME_BACKCHANNEL_DYNAMIC=true`, Keycloak 26.8.1 answers discovery at its back-channel host with `issuer`, `authorization_endpoint` and `end_session_endpoint` on the browser URL and `token_endpoint` and `jwks_uri` on the request's URL (source-read; K models it); ID tokens carry the browser-URL `iss` (source-read); a code obtained through the browser URL is redeemed at `keycloak:8080` and the keys served there verify the token (not run). All three are proved by the STACK-ONLY row of `test-plan.md` (`scripts/stack-e2e.d/50-journeys.sh`).

## Decisions made while writing

- Depends on U12 as well: the card lists U01 and U09, but the edited code is U12's (`add-oidc-login`).
- The index export line follows the card; task 2 proves it with a dynamic import.
- A back-channel with a path is refused, not stripped; an empty value is unset (decision 2).
- The STACK-ONLY behaviour is a row of `test-plan.md`, not a scenario (ruling D44): all nine new scenarios are gate-decided.
- Task 3 is deliberately partial (decision 8), so no later task's tests already pass at its red.
