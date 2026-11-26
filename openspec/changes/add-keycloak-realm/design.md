## Context

The engine reads from Keycloak's ID token `groups` (plain names, `src/identity/rbac/sync.ts:48`), `organization` (a one-entry array holding the alias, `src/identity/route.ts:12`) and the optional `name`, `email`, `preferred_username` (`src/identity/oidc/id-token.ts:138-142`). It sends `scope=openid profile email organization` (`login.ts:20`), PKCE `S256`, the redirect `${publicBaseUrl}/auth/oidc/callback` and at logout `post_logout_redirect_uri=${publicBaseUrl}/sign-in` with `client_id` and `id_token_hint` (`logout.ts:79-81`). The fake OIDC provider follows the same contract, and the shared `oidcContract` suite (`test/support/fake-oidc/contract.ts:416`) is what U61c runs against real Keycloak. This unit makes the realm that suite and the engine will see, as one template file plus pure checks; Keycloak never runs in a gate.

## Decisions

1. **A template, not a render.** The file holds six `${NAME}` placeholders that Keycloak resolves from its own environment at import; U59's compose file passes the values. `renderRealm` reproduces the substitution so a test can parse the result. Grammar: `${NAME}` or `${NAME:default}`, `NAME` is `[A-Za-z_][A-Za-z0-9_]*`; one pass over the text; the lookup is `Object.hasOwn`, so `${toString:x}` is the default `x`, not a function. A value goes in as text, as in Keycloak, so a value holding `"` makes invalid JSON and `renderRealm` throws `SyntaxError`; U57's values (hex, and the first-user pattern `^[a-z][a-z0-9._-]{0,63}$`) are safe.
2. **No `clientScopes` key** [D8]. A realm file that lists `clientScopes` is expected to make Keycloak skip its built-in scopes (`organization`, `profile`, `email`); the engine client names the built-ins in `defaultClientScopes` and `optionalClientScopes` instead (`organization` optional, because the engine asks for it).
3. **One page [D33].** The default `browser` flow of 26.8.1 with organizations enabled asks for the username on one page and the password on the next (probed by the cards' author on the pinned image, not re-run here), which `login()` and `oidcContract` do not handle. The realm defines `browser-single-page`, a copy without the Organization step, and binds it. The three flows are the ones probed: cookie, identity-provider redirector, and a `forms` sub-flow with the username-password form and a conditional OTP sub-flow. WebAuthn and recovery-code alternatives of the default flow are dropped (off by default; an MFA unit adds them). The values are in `test-plan-data.md`.
4. **Post-logout list holds two URIs (deviation from the card).** The card gives only the sign-in URI. The shared contract's logout check sends the callback URI as `post_logout_redirect_uri` and expects a redirect back to it (`contract.ts:393-410`), and the fake accepts a client's redirect URI there (`session.ts:131-135`). With the attribute set, Keycloak is expected to validate against that attribute only (read in `LogoutEndpoint.java` at tag 26.0.0, not 26.8.1, not run). So the value is `${KC_URSITOARE_POST_LOGOUT_URI}##${KC_URSITOARE_REDIRECT_URI}` (`##` joins the list), the sign-in URI first: no new placeholder, and the engine's own logout and the contract's both work.
5. **Plain group names, ID token.** The groups mapper writes `groups` into the ID token, access token and userinfo with `full.path` `"false"` (literal strings, as Keycloak's configuration map holds them); the engine reads the ID token only, and the contract asserts no group starts with `/` (`contract.ts:290-297`).
6. **First user without a profile [D27].** One user with a one-time password (`temporary: true`), the three group paths (the import form carries the leading `/`, the token does not), and no `firstName`, `lastName` or `email`, so Keycloak is expected to ask for them at the first sign-in. One organization named and aliased `${KC_URSITOARE_ORGANIZATION:home}` with that user as member; the claim is then `["home"]`, which `organizationFromClaim` accepts. Only `ursitoare-admins` has an effect at M8.
7. **`ursitoare-mcp`** is public with PKCE and loopback redirect patterns (an MCP client picks a random port) and an audience mapper; no M8 step signs in through it (U89 does), so its M8 proof is the static check.
8. **Hostname is not the realm's.** The issuer is the browser-facing `http://localhost:8180/realms/ursitoare`; `KC_HOSTNAME` and `KC_HOSTNAME_BACKCHANNEL_DYNAMIC` are server options in U59's compose environment, and `URSITOARE_OIDC_BACKCHANNEL_URL` (U58b) points the engine at `http://keycloak:8080`. The realm holds no `frontendUrl`. (U58b's Out of scope lists "realm and hostname settings" under U58; this unit takes the realm and leaves the hostname to U59, as the cards do.)
9. **`realmClaimProblems`** is a list of texts in rule order (`test-plan.md` § Rule texts). Rules are independent; only a missing client skips its own rules, and a bad user count skips the user and organization rules. It takes the rendered realm, never the template, and never throws.
10. **The init script** has psql read the password file itself (`\set` with a backtick), so the password is on no command line and in no script output. It has no `exit` and no `set`, because the Postgres image sources an `*.sh` file that is not executable (UNVERIFIED). The checker `scriptProblems` is a function in the test file, not an interface of this unit.
11. **Fixtures ran.** The six test files were written from this folder and run green against a prototype and the two data files (Node 24.22.2, scratch copy of main@31968a29); with the stubs of the proposal and no data file every test failed by `AssertionError`. `realm-secrets.test.ts` ran against U57's own scratch prototype of `planSecrets`.

## Interfaces

Given, equal to `proposal.md`. Taken: `delivered-shapes.md`, and from `add-init-secrets` the three names of the proposal.

```ts
// test/deploy/realm.ts
export const REALM_TEMPLATE_PATH: string;   // "deploy/keycloak/import/ursitoare-realm.json", relative to the repository root
export const KC_REALM_ENV: readonly string[];   // in order: KC_URSITOARE_CLIENT_SECRET, KC_URSITOARE_REDIRECT_URI, KC_URSITOARE_POST_LOGOUT_URI, KC_URSITOARE_FIRST_USER, KC_URSITOARE_FIRST_PASSWORD, KC_URSITOARE_ORGANIZATION
export const REALM_GROUPS: readonly string[];   // ["ursitoare-admins", "ursitoare-authors", "team-default"]
export const REALM_CLIENTS: readonly string[];   // ["ursitoare-engine", "ursitoare-mcp"]
export const REALM_BROWSER_FLOW: string;   // "browser-single-page"
export function readRealmTemplate(path?: string): string;   // UTF-8 text of path, default REALM_TEMPLATE_PATH under the repository root; a missing file throws the file system's error
export function realmPlaceholders(template: string): string[];   // each NAME of ${NAME} and ${NAME:default}, once, sorted
export function renderRealm(template: string, env: Readonly<Record<string, string>>): unknown;   // one-pass substitution by own-property lookup, then JSON.parse; a ${NAME} with no value stays as written
export function realmClaimProblems(realm: unknown): string[];   // [] or one text per broken rule (test-plan.md § Rule texts); ["realm: not an object"] for a non-record
// Not scaffolded: the data files deploy/keycloak/import/ursitoare-realm.json and deploy/postgres/initdb/10-keycloak.sh (tasks 2.1 and 4.1)
```

Red tests import these names from `test/deploy/realm.ts`; `startFakeOidc` and `decodeJwt` come from `test/support/fake-oidc/index.ts`, `CLIENTS` from `seed.ts`, `groupsFromIdToken`, `organizationFromClaim` and `bootstrapAdminGroup` from `src/identity/index.ts`, `planSecrets`, `SECRET_FILES` and `ENV_KEYS` from `src/cli/init-secrets.ts`. Every test of a data file asserts `existsSync` first and wraps each read and stub call, so a missing file or a stub fails by assertion.

## Failure cases

| Case | Result |
|---|---|
| template file missing | `readRealmTemplate` throws the file system's error (`code` `ENOENT`); the tests assert `existsSync` first |
| a placeholder with no value and no default | stays as written; `realmClaimProblems` gives `realm: unresolved placeholder at <path>` |
| a value that breaks JSON (`"`, a newline) | `renderRealm` throws `SyntaxError`; nothing is returned |
| an env value that is an empty string | substituted as empty (own property); a default is not used |
| the three `.env` values (client secret, first user, first password) unset or empty at Compose time | Keycloak would get an empty secret or password; U59's compose refuses to start unless the three are set and non-empty (`${NAME:?}`, a `composeProblems` rule of U59; not run) |
| `realmClaimProblems` gets `null`, an array, a string, a number | `["realm: not an object"]` |
| init script absent or changed | the test's `existsSync` assertion fails; a changed script gives the texts of `test-plan-data.md` § Script rows |

## UNVERIFIED (no gate runs Keycloak or Postgres)

Each is a STACK-ONLY check (`test-plan.md` § STACK-ONLY) or a stated limit; none is a fact in a THEN.

- `start --import-realm` of this file on 26.8.1 (the probe created the same representation through the admin API; the same import code is inferred); the `${VAR}` substitution from Keycloak's environment, an unresolved one left literal (source read by the cards' author, not run).
- The one-page form's wrong-password text; `post.logout.redirect.uris` semantics on 26.8.1 (decision 4).
- The profile-less first user at first sign-in and the forced password change: no step signs in as that user (stated limit).
- The organization `home` and its member after a file import (no step reads it; stated limit); `sslRequired` `external` with the engine's calls to `keycloak:8080` from a private bridge address.
- `ursitoare-mcp` at run time (decision 7).
- The Postgres image's handling of `*.sh` in `/docker-entrypoint-initdb.d` (sourced when not executable, run once on an empty data directory) and psql's backtick removing one trailing newline of the secret file, so the role's password equals `KC_DB_PASSWORD`.
