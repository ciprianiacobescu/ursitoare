# Test plan: add-keycloak-realm

Every value below was produced by running the six test files of this plan, written from this folder's text, against a prototype of `test/deploy/realm.ts` and the two data files on Node 24.22.2 in a scratch copy of main@31968a29 (all green; with the stubs of the proposal and no data file, every test fails by `AssertionError`). The fake OIDC ran on a loopback port 0 and was closed. U57's `planSecrets` ran from that unit's own scratch prototype, not from main. Nothing was run against Keycloak, Postgres or Docker.

## Test files and ids

| File | Tests (the whole name) | Scenario |
|---|---|---|
| `test/deploy/realm-render.test.ts` | `C-32ad3ca4 the constants, the reader and the substitution` | the first of the first requirement |
| `test/deploy/realm-template.test.ts` | `C-bc176b5f the committed template names the six placeholders and renders with test values`; `C-998a2d20 the committed template is the realm of the test plan`; `C-a1c5860f the bound browser flow has no organization step` | the three on the committed template |
| `test/deploy/realm-claims.test.ts` | `C-cdf2b51e each broken rule gives its own problem`; `C-87ac6333 a non-object, an empty object and a leftover placeholder` | the two of `realmClaimProblems` |
| `test/deploy/realm-fake.test.ts` | `C-a612c0ca the realm's claims have the fake's shapes and the engine reads them` | the fake and engine comparison |
| `test/deploy/realm-secrets.test.ts` | `C-1aae0873 init-secrets files fill the realm` | U57's files |
| `test/deploy/initdb-keycloak.test.ts` | `C-ac7f4766 the init script creates exactly the role and database from the secret file`; `C-e7a41fbe each deviation of the init script gives its own problem` | the two of the script |

Every file starts with `assert.equal(typeof realmPlaceholders, "function")` (the script file with `typeof readFileSync`), wraps every stub call so a throwing stub fails by assertion (`try`/`catch` returning the error), asserts `existsSync` of a data file before reading it (path as a literal relative to `join(import.meta.dirname, "..", "..")`, never `REALM_TEMPLATE_PATH`, which is `""` in the stub), closes the fake in `t.after`, and has no `.`, `[` or `::` in a test name. Temp files are under `mkdtemp(join(tmpdir(), "keycloak-realm-"))` and removed in `finally`. No test starts a process or touches the network beyond the loopback fake.

## Fixtures

**`ENV`** (the six values; none looks like a live secret):

| Name | Value |
|---|---|
| `KC_URSITOARE_CLIENT_SECRET` | `test-client-secret-0001` |
| `KC_URSITOARE_REDIRECT_URI` | `http://127.0.0.1:8080/auth/oidc/callback` |
| `KC_URSITOARE_POST_LOGOUT_URI` | `http://127.0.0.1:8080/sign-in` |
| `KC_URSITOARE_FIRST_USER` | `owner` |
| `KC_URSITOARE_FIRST_PASSWORD` | `test-first-password-0001` |
| `KC_URSITOARE_ORGANIZATION` | `home` |

`rendered(env = ENV)` is `renderRealm(readRealmTemplate(), env)`; the mutation rows use `structuredClone(rendered())`. The template, the script, its checker and its rows are in `test-plan-data.md`.

**Claim shape test** (one function in `realm-fake.test.ts`): `groups` is an array of at least one non-empty string, none starting with `/`; `organization` is an array of exactly one non-empty string.

**`random` for `planSecrets`** (`realm-secrets.test.ts`): `let k = 0; (n) => createHash("sha256").update("keycloak-realm-test:" + k++).digest().subarray(0, n)`; the `.env` text is the UTF-8 of the plan's file whose path ends in `/.env`, parsed line by line at the first `=`; a secret file's text is the UTF-8 of its bytes without the final `\n`.

## Rule texts (`realmClaimProblems`, in this order; `<g>` a name of `REALM_GROUPS` in order)

1. `realm: name is not ursitoare` (realm is not `"ursitoare"`); 2. `realm: not enabled`; 3. `realm: sslRequired is not external`; 4. `realm: registrationAllowed is not false`; 5. `realm: organizationsEnabled is not true`; 6. `realm: a clientScopes key is present` (an own key, whatever its value); 7. `realm: browserFlow is not browser-single-page`.
8. `realm: flow browser-single-page is not a defined top-level flow` (no flow with that alias and `topLevel` true), else `realm: flow browser-single-page has an organization step` (an execution with authenticator `organization` is reachable through `flowAlias` links, cycles ignored).
9. `realm: group <g> is missing` (no `groups[].name` equal).
10. Engine client (`clientId` `ursitoare-engine`; absent: `client ursitoare-engine: missing`, then rule 11): `…: not confidential` (`publicClient` is not false); `…: no secret` (not a non-empty string); `…: standard flow is off`; `…: implicit, direct access or service accounts is on` (any of `implicitFlowEnabled`, `directAccessGrantsEnabled`, `serviceAccountsEnabled` is not false); `…: PKCE method is not S256` (`attributes["pkce.code.challenge.method"]`); `…: redirectUris is not one exact URI`; `…: post.logout.redirect.uris is not one exact URI followed by the redirect URI`; `…: default scopes lack profile or email`; `…: optional scope organization is missing`; then the first mapper whose `protocolMapper` is `oidc-group-membership-mapper`: none gives `…: no group membership mapper`, else `…: groups mapper claim.name is not groups`, `…: groups mapper full.path is not false` (not the string `"false"`), `…: groups mapper does not write the ID token` (`id.token.claim` not `"true"`). Each text starts `client ursitoare-engine`. An *exact URI* is a string that `new URL` parses with protocol `http:` or `https:` and that holds none of `*`, `+`, `#` and `${`. The post-logout rule holds when the attribute split at `##` gives exactly two exact URIs and the second equals `redirectUris[0]`.
11. `ursitoare-mcp` (absent: `client ursitoare-mcp: missing`): `…: not public` (`publicClient` is not true); `…: standard flow is off`; `…: PKCE method is not S256`; `…: redirectUris are not the two loopback patterns` (not `["http://127.0.0.1/*", "http://localhost/*"]`); `…: no audience mapper for ursitoare-mcp` (no `oidc-audience-mapper` with `included.custom.audience` `ursitoare-mcp` and `access.token.claim` `"true"`). Each text starts `client ursitoare-mcp`.
12. Users: `realm: users is not exactly one user with a name` (then the user and organization rules are skipped); else, with `<u>` the name: `user <u>: missing from group /<g>` per group; `user <u>: password is not one temporary password` (not exactly one credential, of type `password`, `temporary` true, a non-empty `value`); `user <u>: has a preset name or email` (an own `firstName`, `lastName` or `email`). Organizations: `realm: organizations is not exactly one enabled organization` (not one entry with `enabled` true and a non-empty string `alias`), else `organization <alias>: name and alias differ` and `organization <alias>: first user is not a member`.
13. One `realm: unresolved placeholder at <path>` per string that holds `${`, in document order; `<path>` joins keys with `.` and array positions as `[i]`, a key holding dots kept whole (`clients[0].attributes.post.logout.redirect.uris`).

**The `{}` row** (`realmClaimProblems({})`, 13 texts): `realm: name is not ursitoare`; `realm: not enabled`; `realm: sslRequired is not external`; `realm: registrationAllowed is not false`; `realm: organizationsEnabled is not true`; `realm: browserFlow is not browser-single-page`; `realm: flow browser-single-page is not a defined top-level flow`; `realm: group ursitoare-admins is missing`; `realm: group ursitoare-authors is missing`; `realm: group team-default is missing`; `client ursitoare-engine: missing`; `client ursitoare-mcp: missing`; `realm: users is not exactly one user with a name`.

## Placeholder rows (the template rendered with `{}`, scenario "A non-object, an empty object and a leftover placeholder")

`realm: unresolved placeholder at clients[0].secret`; `…at clients[0].redirectUris[0]`; `…at clients[0].attributes.post.logout.redirect.uris`; `…at users[0].username`; `…at users[0].credentials[0].value`; `…at organizations[0].members[0].username` (each text starts `realm: unresolved placeholder at `), preceded by `client ursitoare-engine: redirectUris is not one exact URI` and `client ursitoare-engine: post.logout.redirect.uris is not one exact URI followed by the redirect URI` (eight texts in all; the organization name and alias take their default `home`).

## Mutation rows (scenario "Each broken rule gives its own problem"; each edits a fresh `structuredClone(rendered())`)

| # | Edit | `realmClaimProblems` answers (in order) |
|---|---|---|
| 1 | `sslRequired` is `none` | `realm: sslRequired is not external` |
| 2 | `registrationAllowed` is `true` | `realm: registrationAllowed is not false` |
| 3 | `organizationsEnabled` is `false` | `realm: organizationsEnabled is not true` |
| 4 | a `clientScopes` key (`[]`) is added | `realm: a clientScopes key is present` |
| 5 | `browserFlow` is `browser` | `realm: browserFlow is not browser-single-page` |
| 6 | the flow `browser-single-page` is removed from `authenticationFlows` | `realm: flow browser-single-page is not a defined top-level flow` |
| 7 | an execution with authenticator `organization` is added to `browser-single-page forms` | `realm: flow browser-single-page has an organization step` |
| 8 | the same execution is added to `browser-single-page otp` (two levels down) | `realm: flow browser-single-page has an organization step` |
| 9 | the group `team-default` is removed from `groups` | `realm: group team-default is missing` |
| 10 | the engine client is public (`publicClient` true) | `client ursitoare-engine: not confidential` |
| 11 | the engine client `secret` is `""` | `client ursitoare-engine: no secret` |
| 12 | the engine client has `standardFlowEnabled` false | `client ursitoare-engine: standard flow is off` |
| 13 | the engine client has `directAccessGrantsEnabled` true | `client ursitoare-engine: implicit, direct access or service accounts is on` |
| 14 | the engine client's PKCE method is `plain` | `client ursitoare-engine: PKCE method is not S256` |
| 15 | the engine `redirectUris` is `["http://127.0.0.1:8080/*"]` | `client ursitoare-engine: redirectUris is not one exact URI`; `client ursitoare-engine: post.logout.redirect.uris is not one exact URI followed by the redirect URI` |
| 16 | `post.logout.redirect.uris` is only the sign-in URI | `client ursitoare-engine: post.logout.redirect.uris is not one exact URI followed by the redirect URI` |
| 17 | `email` is removed from the engine `defaultClientScopes` | `client ursitoare-engine: default scopes lack profile or email` |
| 18 | `organization` is removed from the engine `optionalClientScopes` | `client ursitoare-engine: optional scope organization is missing` |
| 19 | the groups mapper has `full.path` `"true"` | `client ursitoare-engine: groups mapper full.path is not false` |
| 20 | the groups mapper has `id.token.claim` `"false"` | `client ursitoare-engine: groups mapper does not write the ID token` |
| 21 | the groups mapper has `claim.name` `"grp"` | `client ursitoare-engine: groups mapper claim.name is not groups` |
| 22 | the engine client's mappers are `[]` | `client ursitoare-engine: no group membership mapper` |
| 23 | `ursitoare-mcp` has `publicClient` false | `client ursitoare-mcp: not public` |
| 24 | `ursitoare-mcp` `redirectUris` is `["http://127.0.0.1/*"]` | `client ursitoare-mcp: redirectUris are not the two loopback patterns` |
| 25 | `ursitoare-mcp` mappers are `[]` | `client ursitoare-mcp: no audience mapper for ursitoare-mcp` |
| 26 | the user's `groups` lack `/team-default` | `user owner: missing from group /team-default` |
| 27 | the user's password has `temporary` false | `user owner: password is not one temporary password` |
| 28 | the user has `email` `"a@example.invalid"` | `user owner: has a preset name or email` |
| 29 | the organization's `members` is `[]` | `organization home: first user is not a member` |
| 30 | `organizations` is `[]` | `realm: organizations is not exactly one enabled organization` |

## STACK-ONLY

The Node tests prove the files' text and the claims' shape. That real Keycloak and Postgres behave as the files say is proved only by the delegate's stack runs, through steps that other units add under `scripts/stack-e2e.d/` (no gate runs them; they are rows here and no scenario of the spec, and appear in no task's `criteria_ids`):

| Criterion | Step | What the step asserts |
|---|---|---|
| `start --import-realm` of the template creates realm `ursitoare` | `10-overlay.sh` (`add-stack-realm-reset`) | it prints `overlay: applied <n>` after reading and writing realm `ursitoare` through the admin API |
| Keycloak connects to database `keycloak` as role `keycloak` with `KC_DB_PASSWORD` (the init script ran) | `10-overlay.sh` | the same line; the proof is indirect (no admin API without the database) |
| the engine client's secret, exact redirect URI, PKCE `S256`, `groups` and `organization` claims, the one-page form and the post-logout redirect work as the fake's | `40-contracts.sh` (`add-stack-conformance`), asserted by `60-conformance.sh` | in `contracts.json` the `oidc` rows `code flow with PKCE`, `claims of the id token`, `wrong password shows the error`, `plain PKCE is refused`, `redirect uri must match exactly` and `logout ends the session` are `ok`, which `test_oidc_contract_against_keycloak` asserts |
| a real one-page sign-in gives carol and alice their roles (plain group names reach the engine's memberships) | `50-journeys.sh` (`add-stack-seeding`) | `signInThroughKeycloak` does not reject with `STACK_LOGIN_TWO_STEP` and `login()` finds each user's `capabilities` in `GET /api/v1/me` |

Not a step: the first user's one-time-password sign-in with the profile form, and the organization `home` with its member, are proved by the delegate's own first sign-in at U59's head (D45), which is no step and no scenario. The `ursitoare-mcp` client at run time has no M8 check (`design.md` § UNVERIFIED).
