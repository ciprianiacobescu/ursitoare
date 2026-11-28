## Why

The hobbyist stack signs people in through a real Keycloak, and Keycloak starts empty. Nothing in the repository defines the realm the engine expects: the issuer path `/realms/ursitoare`, the confidential client `ursitoare-engine` with PKCE and exact redirects, the `groups` and `organization` claims, the first user, and a Postgres role and database for Keycloak itself. Without one fixed file a hobbyist builds the realm by hand, misses a mapper, and the engine signs the first admin in with no roles.

Observable result: `deploy/keycloak/import/ursitoare-realm.json` is a template with six `${VAR}` placeholders. Keycloak (`start --import-realm`, U59) resolves them from its environment and creates realm `ursitoare` with the organization, the groups `ursitoare-admins`, `ursitoare-authors` and `team-default`, the clients `ursitoare-engine` (confidential) and `ursitoare-mcp` (public), and one first user in all three groups and in the organization. The realm binds the browser flow `browser-single-page`, so sign-in is one page (username and password together) and the `organization` claim survives. `deploy/postgres/initdb/10-keycloak.sh` creates the role and database `keycloak` on a first Postgres start. This unit checks all of it as static files: `test/deploy/realm.ts` reads, renders and checks the template (`renderRealm`, `realmClaimProblems`), and the claims the realm's mappers would emit are compared with what `test/support/fake-oidc` emits and the engine reads. No Keycloak runs in any gate.

Batch `m8-stack` (U56d, U56e, U57, U59a, U58b, U58, U60, U59, U61, U61d, U61b, U61c in plan order; closing unit `add-stack-conformance`, test `e2e/test_stack_conformance.py`) delivers M8: `docker compose up` runs the six-container hobbyist stack, and every journey so far passes against real Keycloak and Mintkey. This unit's part: the base realm with its one-page sign-in flow, the Postgres script for Keycloak's database, and the static checks of both. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the milestone's outcome is proved by the delegate's stack runs, not by a gate.

## What Changes

New: `test/deploy/realm.ts` (ordinary code under `test/`), six test files under `test/deploy/` (`test-plan.md` § Test files and ids), and two data files, `deploy/keycloak/import/ursitoare-realm.json` (the text is fixed in `test-plan-data.md`) and `deploy/postgres/initdb/10-keycloak.sh` (the text is fixed in `test-plan-data.md`). Capability `deploy-keycloak` (new, ADDED only). No migration, route, API error code, policy action, dependency, module edge, e2e part, web change, `docs/` edit or edit of a frozen test. `idp-external` is U59's. The test realm overlay (users, groups, the exit-19 caller clients) is U61d's and is applied through the admin API; this realm is never re-imported.

## Impact

- **Scaffold:** signature stubs for the interfaces below are on the base branch (`docs/decisions/0002`) in `test/deploy/realm.ts`: `REALM_TEMPLATE_PATH` and `REALM_BROWSER_FLOW` hold `""`, `KC_REALM_ENV`, `REALM_GROUPS` and `REALM_CLIENTS` hold `[]`, and the four functions throw `Error("not implemented")`. Not scaffolded: the data files `deploy/keycloak/import/ursitoare-realm.json` (task 2.1) and `deploy/postgres/initdb/10-keycloak.sh` (task 4.1); they are created by the task that owns the test reading them, and `deploy/**` outside `deploy/secrets/` is open to the implementer (`.l4/config.yaml`, forbidden paths).
- **Depends on:** U09 `add-fake-oidc` (the fake whose claims are compared), U10 `add-identity-model` (`organizationFromClaim`), U12 `add-oidc-login` (the engine's scope, redirect and logout URLs, ID-token checks) and U17 `add-roles-and-memberships` (`groupsFromIdToken`, the admin group name); all merged, their names restated in `delivered-shapes.md`. In plan: `add-init-secrets` (U57: `.env` keys and secret file names; its `src/cli/init-secrets.ts` exists when this unit runs, `ENV_KEYS` and `SECRET_FILES` are in its Interfaces given) and `add-oidc-backchannel` (U58b: no name is taken; the STACK-ONLY sign-in rows reach Keycloak through the back-channel it adds, so the realm sets no hostname).
- **Changed:** nothing in place. Placeholder names reach this realm from two places: three come from U57's `.env` (`KC_URSITOARE_CLIENT_SECRET`, `KC_URSITOARE_FIRST_USER`, `KC_URSITOARE_FIRST_PASSWORD`), three from the compose environment of U59 (`KC_URSITOARE_REDIRECT_URI`, `KC_URSITOARE_POST_LOGOUT_URI`, `KC_URSITOARE_ORGANIZATION`).

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@31968a29, checked line by line).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

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

**Interfaces taken:** From `add-init-secrets`: `SECRET_FILES`, `ENV_KEYS`, `planSecrets`.
The merged names (`startFakeOidc`, `decodeJwt`, `USERS`, `CLIENTS`, `groupsFromIdToken`, `organizationFromClaim`, `bootstrapAdminGroup`) are in `delivered-shapes.md`.

## Out of scope

The compose file and its Keycloak environment (`KC_HOSTNAME`, the back-channel switch, the six values, the import mount), `idp-external` and the realm sentences of `docs/deploy.md` and `docs/operations.md` (U59); the test overlay and the exit-19 caller clients (U61d, U61); `login()` and the sign-in helper (unchanged); WebAuthn, recovery codes and MFA; mapping `ursitoare-authors` and `team-default` to roles and teams (U81); changing a live realm (`--import-realm` skips an existing one; U59's `docs/operations.md` says how).
