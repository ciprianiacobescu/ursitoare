# Test plan (rows): add-stack-seeding

Each row ran against prototypes of the rules in a scratch copy of main@31968a29 (no Docker, Keycloak or Mintkey). `ISS` is `http://localhost:8180/realms/ursitoare`.

## Seed plan (`seed-plan.test.ts`, `seedPlan(STACK_SEED, ISS)`, in order)

| # | Step |
|---|---|
| 1 | `{ "kind": "cli", "argv": ["tenant-create", "--name", "E2E tenant"] }` |
| 2 | `{ "kind": "cli", "argv": ["tenant-idp", "--tenant-name", "E2E tenant", "--issuer", ISS, "--organization", "org-a"] }` |
| 3 | `{ "kind": "cli", "argv": ["tenant-create", "--name", "Tenant B"] }` |
| 4 | `{ "kind": "cli", "argv": ["tenant-idp", "--tenant-name", "Tenant B", "--issuer", ISS, "--organization", "org-b"] }` |
| 5 | `{ "kind": "cli", "argv": ["tenant-sink", "--tenant-name", "E2E tenant"] }` |
| 6 | `{ "kind": "cli", "argv": ["admin", "bootstrap-admin", "--tenant", { "tenantIdOf": "E2E tenant" }, "--issuer", ISS, "--operator", "stack-seed"] }` |
| 7 | `{ "kind": "catalogue", "tenant": "E2E tenant" }` |
| 8 | `{ "kind": "groupmap", "tenant": "Tenant B", "group": "ursitoare-authors", "roleId": "author" }` |
| 9 | `{ "kind": "api", "as": "carol", "method": "POST", "path": "/api/v1/teams", "body": { "teamId": "finance" } }` |
| 10 to 12 | `PUT /api/v1/idp-group-map`, body `{ "issuer": ISS, "group": G, … }` for `ursitoare-authors` with `"roleId": "author"`, `ursitoare-approvers` with `"roleId": "approver"`, `team-finance` with `"teamId": "finance"` |
| 13 | `POST /api/v1/tool-servers`, body `{ "id": "acme", "adapter": "fixture", "origin": "https://tools.fake.test", "local": false, "surface": … }`; the `surface` has tools `lookup_vendor` (effect `read`, path `/blocks/erp.lookup_vendor@1`) and `create_payment` (effect `pay`, path `/blocks/erp.create_payment@1`), `untrusted_result` false on both |
| 14 | `POST /api/v1/credentials`, body `{ "toolServerId": "acme", "authScheme": "API_KEY_HEADER", "headerName": "x-fake-tools-key", "value": "stack-seed-key" }` |

Steps 9 to 14 are `{ "kind": "api", "as": "carol", … }`. The credential value is a fixed public test value (the fake tools only check that the header is present), so the plan holds no random or secret value.

## Sign-in forms (`keycloak-login.test.ts`, test 2)

The engine server answers `GET /auth/oidc/login` with a 302 to `<provider>/auth?client_id=x` and `ursitoare_login=L1; Path=/auth/oidc`; `GET /auth/oidc/callback` with a 302 to `/` that clears that cookie and sets `ursitoare_session=S1`, or, without the login cookie or with `x=refuse`, a 302 to `/sign-in?error=OIDC_LOGIN_EXPIRED`; `GET /api/v1/me` (needs the session cookie) with `{ "csrfToken": "CSRF1", "capabilities": ["a"] }`; `POST /api/v1/teams` with 201 and `{ "echo": <body text>, "hdr": <content-type> }`. The provider answers `GET /auth` with a 200, the row's form and cookies `AUTH_SESSION_ID=abc`, `KC_RESTART=zzz`; `POST /login-actions/authenticate` with a 400 unless both cookies and `execution=e1`, `tab_id=t1` came, a re-rendered form for a password other than `pw-ok`, else a 302 to `<engine>/auth/oidc/callback?code=c1&state=s`. `<A>` is `http://127.0.0.1:<provider port>/login-actions/authenticate?session_code=s1&amp;execution=e1&amp;tab_id=t1`. The forms follow Keycloak's `login.ftl`, not a capture.

| Row | Provider form | Change | Answer |
|---|---|---|---|
| F1 | `<form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="<A>" method="post">` with inputs `username`, `password` and a hidden `credentialId` | none | session `ursitoare_session=S1`, `CSRF1` |
| F2 | `<form id="kc-form-login" method="post" action="<A>">` with `username` and `password` (the fake's order) | none | the same session |
| F3 | the F1 form with only the `username` input | none | `STACK_LOGIN_TWO_STEP`, `the login form has no password field` |
| F4 | `<p>maintenance</p>` | none | `STACK_LOGIN_FAILED`, `the provider page has no login form` |
| F5 | F1 | the post answers a 302 to `http://127.0.0.1:<provider port>/elsewhere` | `STACK_LOGIN_FAILED`, `the provider redirected outside the engine` |
| F6 | F1 | the post's redirect adds `&x=refuse` | `STACK_LOGIN_FAILED`, `the engine refused the sign-in` |
| F7 | F1 | password `bad` | `STACK_LOGIN_FAILED`, `the provider refused the credentials` |

## Seed result (`seed-stack.test.ts`, test 1, after each of the two runs)

Tenants by name: `E2E tenant`, `Other X`, `Other Y`, `Tenant B`, each `solo`. Rows per tenant, read through `withTenantTx(ownerPool, ctx, …)` (row-level security hides them from a bare owner query):

| Tenant | Blocks | Group maps (group to target) | Teams | Tool servers | Credentials |
|---|---|---|---|---|---|
| `E2E tenant` | 20 | `team-finance` to team `finance`; `ursitoare-admins` to `tenant_admin`; `ursitoare-approvers` to `approver`; `ursitoare-authors` to `author` | `finance` | `acme` (adapter `fixture`, origin `https://tools.fake.test`) | `acme` |
| `Tenant B` | 0 | `ursitoare-authors` to `author` | none | none | none |
| `Other X`, `Other Y` | 0 | none | none | none | none |

Routes (`SELECT kind, encode(key_hash, 'hex') FROM ursitoare.tenant_route`): one `mintkey_sink_broker` and one `mintkey_sink_proxy`, both of `E2E tenant`, `key_hash` the `hashRouteKey` of BT and PT without the newline. Then each user signs in and `/api/v1/me` names the tenant `E2E tenant` (`alice`, `bob`, `carol`) or `Tenant B` (`mallory`) and grants every capability of that user in `OVERLAY_USERS`.

## Seed failures (`seed-stack.test.ts`, test 2; one change to the fixtures per row, on the seeded stack)

| Row | Change | Message |
|---|---|---|
| E1 | `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` is `D/nope` (missing) | `seed failed at step owner password (unreadable)` |
| E2 | `URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE` is `D/broker` | `seed failed at step tenant-sink (CLI_SINK_TOKENS_EQUAL)` |
| E3 | `URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE` is `D/nope` | `seed failed at step tenant-sink (CLI_CONFIG_INVALID)` |
| E4 | `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` is `D/broker` (a wrong password) | `seed failed at step tenant-create (CLI_DATABASE_UNAVAILABLE)` |
| E5 | `users.carol.password` is `wrong` | `seed failed at step sign-in carol (STACK_LOGIN_FAILED)` |
| E6 | `users` is `{ alice }` | `seed failed at step sign-in carol (no_user)` |
| E7 | `users.carol` is `bob`'s record with `capabilities` `["manage_users_roles"]` | `seed failed at step roles carol (missing_manage_users_roles)` |
| E8 | `engineOrigin` is `http://127.0.0.1:1` | `seed failed at step sign-in carol (STACK_LOGIN_FAILED)` |
| E9 | `fetch` answers `new Response("{}", { status: 500 })` to `POST /api/v1/tool-servers`, else the global `fetch` | `seed failed at step POST /api/v1/tool-servers (http_500)` |
| E10 | the same for `POST /api/v1/teams` with status 403 | `seed failed at step POST /api/v1/teams (http_403)` |

No message holds the owner password, BT, PT, a `pw-` password or `D`.

## Settings (`seed-settings.test.ts`)

`ownerEnv` of `stackSeedDeps(dir)`, each equal to the `owner-job` value of `deploy/compose.yaml` (files with `/run/secrets/` replaced by `<dir>/secrets/`): `URSITOARE_DATABASE_OWNER_URL` `postgres://ursitoare_owner@postgres:5432/ursitoare?sslmode=disable`; `URSITOARE_DATABASE_OWNER_PASSWORD_FILE` `<dir>/secrets/db_owner_password`; `URSITOARE_DATABASE_URL` `postgres://ursitoare_app@postgres:5432/ursitoare?sslmode=disable`; `URSITOARE_DATABASE_PASSWORD_FILE` `<dir>/secrets/db_app_password`; `URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE` `<dir>/secrets/mk_broker_token`; `URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE` `<dir>/secrets/mk_proxy_token`. Also `engineOrigin` `http://127.0.0.1:8080`, `issuer` `http://localhost:8180/realms/ursitoare`.

## conftest lines (`journeys-step.test.ts`)

`e2e/conftest.py` holds the guard `if "E2E_BASE_URL" in os.environ and "L4_E2E_BASE_URL" not in os.environ:` above the line `os.environ["L4_E2E_BASE_URL"] = os.environ["E2E_BASE_URL"]` (bare, it raises `KeyError` where only `L4_E2E_BASE_URL` is set), `def reset_state() -> None:`, `def seed_users(`, `def is_fake_only(`, `def is_me_response(`, `def check_capabilities(`, `STACK_RESET_TIMEOUT_S = 300`, `config.addinivalue_line(` and the marker text `"fake_only: needs the fake stack's control listener; deselected on the stack profile"`.

## Python rows (`e2e/test_stack_seeding.py`)

| Test | Rows |
|---|---|
| `test_fresh_state_on_the_stack_profile` | the spec's rows; `timeout` is recorded by wrapping `urllib.request.build_opener` |
| `test_users_on_the_stack_profile` | the server answers `{"users": {"carol": {"username": "carol", "password": "pw-c", "displayName": "Carol Example", "tenantName": "E2E tenant", "capabilities": ["manage_users_roles"]}}}`, `E2E_CONTROL_URL` is `http://127.0.0.1:1` |
| `test_the_login_capability_check` | the spec's rows; `is_me_response` gets stand-ins with `url`, `status` and `request.method` |
| `test_fake_only_list_and_hook` | stub items have `path`, `name`, `originalname`, `add_marker`; the drift check finds each listed name with `ast` |
| `test_pytest_collects_...` | the child's environment is the parent's without `L4_E2E_BASE_URL` and with `E2E_BASE_URL` `http://127.0.0.1:1`, and it exits 0; the names `-m fake_only` collects (without `[param]`) equal each `test_` function of `test_e2e_stack.py` plus the Alice test; the other expression's names share none |

## The step and the README row

`scripts/stack-e2e.d/50-journeys.sh`, byte for byte (rules are compared, not text: a comment may change, a value may not):

```bash
#!/usr/bin/env bash
# Runs the pytest journeys on the stack profile inside the compose network (docs/testing.md).
set -euo pipefail

$COMPOSE run --rm runner uv run --project e2e --frozen pytest e2e -m "not fake_only and not stack" --tb=short --junitxml="/run/stack-out/$STACK_RUN/e2e-junit.xml"
echo "journeys done"
```

The README row, one line after the `add-stack-realm-reset` row: `` | `stack/control.ts`, `stack/keycloak-login.ts`, `stack/seed.ts` | `add-stack-seeding` | The stack control server of the pytest journeys, the sign-in through the provider's one-page form, and the seed of a freshly reset database | ``.
