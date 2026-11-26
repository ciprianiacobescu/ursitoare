# Test plan (data): add-stack-realm-reset

The data files, byte for byte, and the request shapes. The tests compare rules, not text: a comment line may change, a value may not.

## scripts/stack-e2e.d/10-overlay.sh

```bash
#!/usr/bin/env bash
# Adds the test realm overlay through Keycloak's admin API: the journey users, groups, organizations and the two caller clients (docs/testing.md).
set -euo pipefail

$COMPOSE run --rm runner node test/support/stack/keycloak-overlay.ts
```

## scripts/stack-e2e.d/20-reset.sh

```bash
#!/usr/bin/env bash
# Refreshes the engine database template, recreates the engine database from it and waits for the engine (docs/testing.md).
set -euo pipefail

status=0
$COMPOSE run --rm runner node test/support/stack/reset.ts --prepare || status=$?
if [ "$status" = 3 ]; then
  echo "the engine did not answer after the reset; restarting ursitoare once"
  $COMPOSE restart ursitoare
  $COMPOSE run --rm runner node test/support/stack/reset.ts --wait
elif [ "$status" != 0 ]; then
  exit "$status"
fi
echo "reset step done"
```

## The README row

One line, after the `invoke-runs/` row:

```
| `stack/keycloak-overlay.ts`, `stack/reset.ts`, `stack/fake-admin.ts` | `add-stack-realm-reset` | The realm overlay through Keycloak's admin API, the engine-database reset from a template, and the in-process fake admin server that tests them |
```

## Request shapes (`planOverlay`, `readAdminState`)

Reads, with `authorization: Bearer <token>`: `GET /admin/realms/ursitoare/groups?first=0&max=1000` (top-level groups `{ id, name, path }`), `.../organizations?first=0&max=1000` (`{ id, alias }`), `.../organizations/<id>/members?first=0&max=1000` (`{ id, username }`), `.../users?first=0&max=1000&briefRepresentation=true` (`{ id, username }`), `.../users/<id>/groups?briefRepresentation=true` (`{ id, name, path }`), `.../clients?first=0&max=1000` (`{ id, clientId }`). A group of the state is the top-level name; a non-array answer is `answered a body that is not a list`.

A user body (alice; bob has `groups` `["/ursitoare-approvers", "/team-finance"]`, carol `["/ursitoare-admins"]`, mallory `["/ursitoare-authors"]`):

```json
{ "username": "alice", "enabled": true, "emailVerified": true, "firstName": "Alice", "lastName": "Example", "email": "alice@example.invalid", "credentials": [{ "type": "password", "value": "1f89b6a283320dfa86d95b9e194b9c95", "temporary": false }], "groups": ["/ursitoare-authors", "/team-finance"] }
```

The client body of `e2e-mcp-caller` (`e2e-plain-caller` differs in `clientId`, `secret` and `"protocolMappers": []`):

```json
{ "clientId": "e2e-mcp-caller", "protocol": "openid-connect", "enabled": true, "publicClient": false, "clientAuthenticatorType": "client-secret", "secret": "9d0257575b8418cc8fc7cac3e97d1af6", "standardFlowEnabled": false, "implicitFlowEnabled": false, "directAccessGrantsEnabled": false, "serviceAccountsEnabled": true, "protocolMappers": [{ "name": "ursitoare-mcp-audience", "protocol": "openid-connect", "protocolMapper": "oidc-audience-mapper", "config": { "included.custom.audience": "ursitoare-mcp", "access.token.claim": "true" } }] }
```

## The fake admin server (`fake-admin.ts`)

Loopback, port 0, one realm `ursitoare` in memory. Without options its realm is U58's import (state F0). Every request is recorded whole. Ids count up from `0001` over groups, users, organizations and clients in that creation order, `grp-`, `usr-`, `org-`, `cli-`.

| Route | Answer |
|---|---|
| `POST /realms/master/protocol/openid-connect/token` | form with `grant_type` `password`, `client_id` `admin-cli`, the fake's user (default `admin`) and `adminPassword`: 200 `{ access_token: "tok-fake-admin-0001", expires_in: 60, token_type: "Bearer" }`; otherwise 401 `{ error: "invalid_grant" }` |
| any `/admin/realms/ursitoare/...` without `Bearer tok-fake-admin-0001` | 401 |
| the six `GET` lists above | 200 with the lists as stored |
| `POST .../groups`, `.../organizations`, `.../clients` | 201 with `location`; a duplicate `name`, `alias` or `clientId` 409 |
| `POST .../users` | 201; a duplicate username 409; a `groups` path that names no group 400; the credential value, `email`, `firstName`, `lastName` are kept |
| `POST .../organizations/<id>/members` | the body is a JSON string user id: 201; a member already in it 409; an unknown organization or user 404 |
| `PUT .../users/<id>/groups/<group id>` | 204, adds the membership; unknown ids 404 |
| options | `missingRealm` answers 404 to every realm path; `failOn` answers its status to one exact method and path; `hang` never answers |
