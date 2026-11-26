## Why

In a container `localhost:8180` is not Keycloak, yet the engine requires discovery, token and JWKS endpoints to share the issuer's origin, and the issuer must stay the URL the browser uses (it is checked in discovery and in `iss`). This unit adds one optional setting, a back-channel origin: the engine reaches the provider at `http://keycloak:8080` while the issuer and every URL given to the browser stay on `http://localhost:8180`.

Observable result: with `URSITOARE_OIDC_ISSUER=http://localhost:8180/realms/ursitoare` and `URSITOARE_OIDC_BACKCHANNEL_URL=http://keycloak:8080`, `oidc.backchannelUrl` is `http://keycloak:8080`; the engine's discovery request is `GET http://keycloak:8080/realms/ursitoare/.well-known/openid-configuration`, the code exchange a `POST` and the key fetch a `GET` on `http://keycloak:8080`; the sign-in redirect still goes to `http://localhost:8180/realms/ursitoare/protocol/openid-connect/auth`; a browser endpoint on any other origin, or a token or JWKS endpoint on a third origin, fails discovery with `OIDC_PROVIDER_UNAVAILABLE` and `{ reason: "origin" }`. With the variable unset every behaviour and every existing test is as before.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the back-channel origin that lets the engine in its container reach Keycloak while the browser keeps the issuer URL. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `src/config/oidc-backchannel.test.ts`, `src/identity/oidc/backchannel-urls.test.ts`, `src/identity/oidc/backchannel-discovery.test.ts`, `src/identity/oidc/backchannel-exchange.test.ts`. Edited in named tasks: `src/config/oidc.ts` (`OidcConfig` member, `loadOidcConfig`), `src/identity/oidc/config-shape.ts`, `src/identity/oidc/client.ts` (the two functions; `fetchDiscovery`, `parseDiscovery`), `src/identity/index.ts` (export line). Capability `identity-authn`: two requirements MODIFIED ("OIDC is optional and configured by three variables", "The provider client is cached, bounded and confined to the issuer"), two ADDED. The rule [D2] for the four endpoints is in `design.md` decision 1. No migration, route, API error code, policy action, dependency, module edge, e2e part, web change or document; the compose wiring of the variable and its docs line are U59's.

## Impact

- **Scaffold:** signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: `OidcConfig.backchannelUrl?` and `OidcConfigShape.backchannelUrl?` (members of existing interfaces), the variable `URSITOARE_OIDC_BACKCHANNEL_URL` and its two `CONFIG_INVALID` messages (existing `ConfigError` code, new reason text), the edits of `loadOidcConfig`, `fetchDiscovery` and `parseDiscovery`, and the value export line of `src/identity/index.ts`.
- **Depends on:** U01 `add-engine-skeleton` (`loadConfig`, `ConfigError`), U09 `add-fake-oidc` (the fake provider the tests use), U12 `add-oidc-login` (the client, the routes; the card names only U01 and U09, but `client.ts` and `config/oidc.ts` are U12's code). All merged; their names are restated in `delivered-shapes.md`. No in-plan prerequisite: no name of another M8 folder is used. U58 and U59 take the variable from this unit.
- **Changed:** no frozen test is edited and no scenario of the two MODIFIED requirements changes a value; both are restated whole. The first keeps its name "three variables": a new name would change the criterion ids that the existing tests carry. The suites listed in `delivered-shapes.md` stay green (none sets the new variable or deep-equals a whole `oidc` object; an unset variable adds no member). `login.ts`, `logout.ts`, `callback.ts`, `id-token.ts`, `routes.ts` and `src/main.ts` are not edited (design decision 6).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:** the names of `delivered-shapes.md` (merged code of M0 to M2: `loadOidcConfig`, `OidcConfig`, `OidcConfigShape`, `createOidcClient`, `OidcClient`, `OidcError`, `verifyIdToken`, `registerOidcRoutes`, `ConfigError`, `startFakeOidc`, `completeFakeLogin`).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

## Out of scope

Putting the variable into `deploy/compose.yaml`, `.env` or `docs/` (U59); the Keycloak realm and hostname settings (U58); a back-channel for anything but discovery, token and JWKS (userinfo is never called); a second issuer; checking at startup that the back-channel host answers; a private CA for an https back-channel; the real-Keycloak proof (a STACK-ONLY step of U61b, `test-plan.md`).
