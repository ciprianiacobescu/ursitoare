# Test plan (rows): add-stack-conformance

Snapshot records are written `service/MiB` below; the **clean snapshot** is the eight records `fakes/0`, `keycloak/768`, `mintkey-broker/128`, `mintkey-proxy/128`, `mintkey-vault/320`, `owner-job/0` (not running), `postgres/512`, `ursitoare/512`, all running unless noted, `oomKilled` false, `restartCount` 0, `memoryBytes` the MiB times 1048576, `env` as § Inspect fixture says.

## Target (`stackContractTarget(D, users)`)

`D/secrets/oidc_client_secret` `OIDC-SECRET-1`, `mk_issue_token` `ISSUE-TOKEN-1`, `mk_vault_writer_token` `WRITER-TOKEN-1`, `mk_vault_proxy_token` `PROXY-TOKEN-1`, each with one newline; `users` the `OVERLAY_USERS` with password `pw-<username>`. The seven secrets `redactDetail` removes are the client secret, carol's password, `brokerServiceToken`, both vault tokens and both caller secrets. The answer:

```
oidc: { baseUrl: "http://localhost:8180/realms/ursitoare", credentials: { clientId: "ursitoare-engine", clientSecret: "OIDC-SECRET-1", redirectUri: "http://127.0.0.1:8080/auth/oidc/callback", username: "carol", password: "pw-carol", organization: "org-a", groups: ["ursitoare-admins"] } }
egress: { brokerUrl: "http://mintkey-broker:8083", proxyUrl: "http://mintkey-proxy:8086", vaultUrl: "http://mintkey-vault:8084", brokerServiceToken: "ISSUE-TOKEN-1", vaultAdmin: { identity: "svcid_ursitoare", token: "WRITER-TOKEN-1" }, vaultDenied: { identity: "svcid_proxy", token: "PROXY-TOKEN-1" }, tenantId: "4b8a2c1e-0000-8000-8000-0000000000c8", echo: { serviceId: <UUID>, targetUrl: "https://echo.fake.test" } }
```

## Row names (`runStackContracts` without a flood: 24 rows in this order)

The 10 `oidcContract` names (`discovery document` first, `logout ends the session` last), the 9 `egressContract` names (`issue needs the service token` first, `proxy passes a redirect through` last), then the five extra rows with the first run's details: `vault ListVersions without an identity is refused` (`grpc status 16`), `a pre-registered MCP client gets the ursitoare-mcp audience` (`aud ursitoare-mcp,account`), `a client without it gets no such audience` (`aud account`), `anonymous dynamic registration is refused` (`status 403`), `a call to a name that resolves to loopback is refused` (`status 502`). With `flood: true` the row `the vault serves after a wrong-token flood` is the second extra (25 rows, index 20). `STACK_EXTRA_CHECKS`, in order: `vault ListVersions without an identity is refused`, `the vault serves after a wrong-token flood`, `a pre-registered MCP client gets the ursitoare-mcp audience`, `a client without it gets no such audience`, `anonymous dynamic registration is refused`, `a call to a name that resolves to loopback is refused`. In the failing run the `ok` true egress rows are `vault put with the admin identity returns a key version`, `vault put with a denied identity is refused` and `proxy refuses a request without a bearer`.

## redactDetail

`redactDetail("x Bearer abc.def eyJhbGciOiJub25lIn0.eyJhIjoxfQ.sig tok-123 and" + newline + "more tok-123", ["tok-123"])` is `x Bearer [redacted] [redacted] [redacted] and more [redacted]`; 300 times `a` with `[]` is its first 200 characters; `plain` with `[""]` is `plain`; `abcdef` with `["abc", "abcdef"]` is `[redacted]`; `OIDC-SECRET-1 pw-carol ISSUE-TOKEN-1 WRITER-TOKEN-1 PROXY-TOKEN-1 MC-1 PC-1` with those seven is seven `[redacted]`.

## Form rows

With the `action` removed or the `id` `other-form`, `code flow with PKCE`, `claims of the id token`, `userinfo with the access token`, `wrong password shows the error`, `code is single use` and `logout ends the session` reject with `the login page has no form action`; the other four resolve.

## Verdict rows (`contractProblems`)

The oidc rows: `discovery document` twice (first `ok` false `status 500`, then `ok` true `passed`), no `jwks keys`, `code flow with PKCE` `ok` false `status 400`, the other seven `ok` true; the nine egress rows `ok` true.

## Keycloak variants (`extra.callerSecrets` `MCPSECRET` and `PLAINSECRET`; `contractProblems(rows, EXIT_ROWS[19])`)

V1: mcp token `aud` `["ursitoare-mcp","account"]`, plain `"account"`, registration 403: `[]`. V2: as V1 with `callerSecrets["e2e-mcp-caller"]` `WRONG` (401): `["a pre-registered MCP client gets the ursitoare-mcp audience: token request answered 401"]`. V3: as V1 with plain `aud` `["account","ursitoare-mcp"]`: `["a client without it gets no such audience: aud account,ursitoare-mcp"]`. V4: as V1 with registration 201: `["anonymous dynamic registration is refused: status 201"]`.

## Exit 12 rows (`exit12EnvProblems`; the base is the clean snapshot's broker, proxy and vault)

| Row | Change | Answer |
|---|---|---|
| X1 | none (`MINTKEY_AUD_ENFORCEMENT` `strict` on the vault) | `[]` |
| X2 | vault `MINTKEY_ENV` `development` | `["mintkey-vault: MINTKEY_ENV is not production"]` |
| X3 | vault without `MINTKEY_VAULT_KEK_FILE` | `["mintkey-vault: MINTKEY_VAULT_KEK_FILE is not set"]` |
| X4 | broker without `MINTKEY_BROKER_SIGNING_KEY_FILE` | `["mintkey-broker: MINTKEY_BROKER_SIGNING_KEY_FILE is not set"]` |
| X5 | proxy `MINTKEY_AUD_ENFORCEMENT` `permissive` | `["mintkey-proxy: MINTKEY_AUD_ENFORCEMENT is permissive"]` |
| X6 | the list is `[]` | `["mintkey-broker: no snapshot", "mintkey-proxy: no snapshot", "mintkey-vault: no snapshot"]` |

`EXIT_ROWS[12]` names `issue needs the service token`, `vault put with a denied identity is refused`, `proxy refuses a request without a bearer` (egress) and `vault ListVersions without an identity is refused` (extra); `EXIT_ROWS[19]` the three Keycloak rows. The stub vault answers `ListVersions` with grpc status 16, 7, 0, 12: the row is `ok` true `grpc status 16`, `ok` true `grpc status 7`, `ok` false `grpc status 0`, `ok` false `grpc status 12`; on a closed port `ok` false and a non-empty `detail`.

## Inspect fixture (`snapshotOf`)

Secret `<name>` of the 15 `SECRET_FILES` (index `i` from 0) has the value `sec-<name>-x7f3`. Each container's `Config.Env` is `PATH=/usr/bin`, the entries below and `S<i>_SECRET=<value>` for each secret whose `i mod 8` is the container's position in the sorted record list; `keycloak` also has `KC_DB_PASSWORD=<db_keycloak_password>` and `Cmd` `["start", "--secret=<secret 0>"]`, `mintkey-broker` a label `note` holding secret 1, `mintkey-vault` `HostConfig.Binds` `["/x:/y:ro#<secret 2>"]`. Kept entries: broker `MINTKEY_ENV=production`, `MINTKEY_BROKER_SIGNING_KEY_FILE=/run/secrets/signing_seed`; proxy `MINTKEY_ENV=production`; vault `MINTKEY_ENV=production`, `MINTKEY_VAULT_KEK_FILE=/run/secrets/kek`, `MINTKEY_AUD_ENFORCEMENT=strict`; `fakes` `MINTKEY_ENV=not production`; `owner-job` (not running) `MINTKEY_AUD_ENFORCEMENT` of 121 `a`.

The records' `env` (the rest `{}`): broker `{ MINTKEY_ENV: "production", MINTKEY_BROKER_SIGNING_KEY_FILE: "/run/secrets/signing_seed" }`, proxy `{ MINTKEY_ENV: "production" }`, vault `{ MINTKEY_ENV: "production", MINTKEY_VAULT_KEK_FILE: "/run/secrets/kek", MINTKEY_AUD_ENFORCEMENT: "strict" }`, `fakes` `{ MINTKEY_ENV: "[redacted]" }`, `owner-job` `{ MINTKEY_AUD_ENFORCEMENT: "[redacted]" }`; with the spec's `keep` the Keycloak `env` is `{ KC_DB_PASSWORD: "[redacted]" }`. `readSnapshot` errors: `<path>: not a readable snapshot` (missing file), `<path>: not a snapshot` (`[{}]`).

## Exit 10 rows (`exit10Problems`, base: the clean snapshot)

| Row | Change | Answer |
|---|---|---|
| T1 | none | `[]` (`limitSummary` `limits of the six sum to 2368 MiB (limits, not usage)`) |
| T2 | `keycloak/512` | `["keycloak: memory limit 536870912 bytes, need 805306368"]` |
| T3 | `ursitoare` `oomKilled` true | `["ursitoare: OOM killed"]` |
| T4 | a second running `keycloak/768` | `["keycloak: 2 running containers, need 1"]` |
| T5 | a running `extra/64` | `["extra: not one of the six services"]` |
| T6 | the list is `[]` | six texts `<service>: 0 running containers, need 1` in `STACK_SERVICES` order |

## Restart rows (`restartProblems`; before: the clean snapshot)

| Row | After | exclude | Answer |
|---|---|---|---|
| R1 | the same | `["ursitoare"]` | `[]` |
| R2 | `mintkey-proxy` `restartCount` 2, `ursitoare` 3 | `["ursitoare"]` | `["mintkey-proxy: restarted 2 time(s)"]` |
| R3 | as R2 | `[]` | `["ursitoare: restarted 3 time(s)", "mintkey-proxy: restarted 2 time(s)"]` |
| R4 | `ursitoare` `oomKilled` | `["ursitoare"]` | `["ursitoare: OOM killed"]` |
| R5 | without `postgres` | `[]` | `["postgres: missing from the after snapshot"]` |
| R6 | the clean snapshot, with `before` lacking `keycloak` | `[]` | `["keycloak: missing from the before snapshot"]` |

Files for `contractsMain`: `contracts.json` holds `discovery document` (oidc, `ok` true `passed`), the flood row (`ok` true `serving after 200 wrong-token calls`) and the canary row (`ok` false `status 200`); `before.json` is the clean snapshot; `after.json` has `mintkey-broker` 2 and `ursitoare` 3; `flood-before.json` is clean, `flood-after.json` has `mintkey-broker` 1; `conformance-junit.xml` holds `<x/>` with mode 0644. `bracket` makes the flood row `ok` false, `restart or OOM kill: mintkey-broker: restarted 1 time(s)`. `checks` prints the three rows, `limits of the six sum to 2368 MiB (limits, not usage)` and `restarts: mintkey-broker: restarted 2 time(s)`, answers 1 and writes the same lines to `summary.txt`; with `after.json` equal to `before.json` the last line is `restarts: none; no OOM kill` (0); without `contracts.json` the first line is `contracts: <path>: not a readable contract report`.

## Sink rows

`countSinkRows` (rows are `{ eventType, origin, payload: { emitter, reason? } }`): `issued` = `token.issued` with (`mintkey`, `broker`), (`ursitoare`, `broker`), (`mintkey`, `proxy`); `proxy` = `proxy.hit` (`mintkey`, `proxy`), `proxy.error` (`mintkey`, `proxy`), `proxy.hit` (`mintkey`, `broker`); `refused` = `audit.sink_refused` with reason `tenant_mismatch` and emitter `broker`, reason `event_type` and `broker`, `tenant_mismatch` and `proxy`: the answer is `{ broker: 1, proxy: 2, mismatch: 1 }`. `sinkProblems({0,0,0}, {0,0,0}, 30000)` is `["token.issued: no new row from the broker with origin mintkey within 30000 ms", "proxy.hit or proxy.error: no new row from the proxy with origin mintkey within 30000 ms", "audit.sink_refused: no new tenant_mismatch row from the broker within 30000 ms"]`; `({1,1,1}, {2,1,3}, 500)` only the proxy text with `500`; `({1,1,1}, {2,2,2}, 500)` `[]`.

## D16 rows (`credentialProblems`)

`{ 201, 201, 1 }` is `[]`; `{ 201, 409, null }` `["credentials answered 409"]`; `{ 403, 403, null }` `["tool-servers answered 403", "credentials answered 403"]`; `{ 500, 201, 2 }` `["tool-servers answered 500", "key version 2, not 1"]` (`serverStatus`, `credentialStatus`, `keyVersion`).

## Modes (lines end with a newline; `code` is the exit code)

Errors print `<mode>: ` and `redactDetail(message, [])`. Run variables: `STACK_OUT`, `STACK_RUN` (`^[0-9]{8}T[0-9]{6}Z$`), `STACK_DIR`.

| File and argv | stdout | stderr | code |
|---|---|---|---|
| `contracts.ts` no or unknown mode | | `usage: contracts.ts run, flood, bracket, summary, checks or verdict <name>` | 64 |
| `contracts.ts <mode>` without run variables | | `<mode>: STACK_OUT and STACK_RUN are not set` | 1 |
| `run` | `contracts: <n> rows, <k> not ok`; `contracts.json` written (0600) | | 0 |
| `run` or `flood`, unreadable state directory | | `<mode>: the state directory is unreadable` | 1 |
| `flood` | `contracts: flood row ok` or `not ok`; the row replaced or added | | 0 |
| `bracket` | `contracts: bracket <n> problems` | no flood row: `bracket: the report has no flood row` | 0, or 1 |
| `summary`, `checks` | `summaryLines`; `checks` adds `limitSummary` and `restarts:` lines and writes `summary.txt`, and sets each regular file of the run directory to 0600 | | 0; `checks` 1 on a restart, an OOM kill or an unreadable snapshot |
| `verdict oidc`, `egress`, `exit12`, `exit19` | `<name>: <problem>` each, else `<name>: ok` | | 1, else 0 |
| `verdict c4` | `c4: ok (<detail>)` (0) or `c4: not ok (<detail>)` (1) | no canary row: `verdict: the report has no canary row` | 0, or 1 |
| `verdict nope` | | `usage: contracts.ts verdict oidc, egress, exit12, exit19 or c4` | 64 |
| any mode, unreadable report or snapshot | | `<mode>: <path>: not a readable contract report` (or `snapshot`) | 1 |
| `conformance.ts snapshot` | the records as JSON | `[]` or `nope` on stdin: `snapshot: no container in the input` or `snapshot: the input is not JSON` | 0, or 1 |
| `conformance.ts exit10`, `exit12` | `<mode>: <problem>` each, else `exit10: ok; <limitSummary>` or `exit12: ok` | no variables or no `before.json`: `<mode>: STACK_OUT and STACK_RUN are not set` or `<mode>: <dir>/before.json: not a readable snapshot` | 0, or 1 |
| `conformance.ts` other | | `usage: conformance.ts snapshot, exit10 or exit12` | 64 |
| `sink-probe.ts`, `credential-probe.ts` | `sink: <problem>` each, else `sink: ok (tenant <id>)`; `d16: <problem>` each, else `d16: ok (key version 1)` | unreadable state directory: `<sink or d16>: the state directory is unreadable` | 0, or 1 |

## Main wiring (constants of the entry files; `STACK_DIR` default `/run/stack-e2e`)

Engine origin `http://127.0.0.1:8080` (the runner's forwarder), Keycloak back-channel `http://keycloak:8080`, foreign tenant `4b8a2c1e-0000-8000-8000-0000000000f1`, flood identity `svcid_ursitoare`; the user is `carol` of `users.json` (`tenant_admin`: `read_audit`, `manage_credentials`). For the Run directory fixture (`STACK_DIR` holds the § Target secrets, `users.json` with `pw-<username>`, `clients.json` `{"e2e-mcp-caller":"MC-1","e2e-plain-caller":"PC-1"}`) each stub records:

| Entry | Recorded call |
|---|---|
| `contracts.ts run` | `runChecks(T, { keycloakBackchannel: "http://keycloak:8080", callerSecrets: { "e2e-mcp-caller": "MC-1", "e2e-plain-caller": "PC-1" } }, { flood: false })`, `T` the § Target object |
| `contracts.ts flood` | `flood("http://mintkey-vault:8084", { identity: "svcid_ursitoare", token: "wrong" })`; `floodCheck` sends `wrong-<hex>` tokens and never `who.token` |
| `sink-probe.ts` | `probe({ engineOrigin: "http://127.0.0.1:8080", user: <carol, password pw-carol>, egress: T.egress, foreignTenantUuid: "4b8a2c1e-0000-8000-8000-0000000000f1" })`, no `signIn` |
| `credential-probe.ts` | `probe({ engineOrigin: "http://127.0.0.1:8080", user: <carol> })`, no `signIn` |

(`echo.serviceId` is any UUID.) Each entry script calls `process.exit(code)` once its main resolves, so no open request keeps it alive.

## Step rows (`scriptProblems(script, steps)`; the list equals the cell)

| Step | Change | Answer |
|---|---|---|
| `40-contracts.sh` | the first `$COMPOSE run` becomes `docker compose run` | `["step 40-contracts.sh: S3 docker compose outside $COMPOSE: docker compose run --rm runner node test/support/stack/contracts.ts run"]` |
| `05-snapshot.sh` | the line `docker inspect $( $COMPOSE ps -q ) > "$RUN_OUT/raw.json"` added | `["step 05-snapshot.sh: S5 docker inspect is not allowed outside a pipe into the runner"]` |
| `90-checks.sh` | `set -x` added after `set -euo pipefail` | `["step 90-checks.sh: S8 prints the environment or traces commands: set -x"]` |
