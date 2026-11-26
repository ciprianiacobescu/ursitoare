## Purpose

The closing proof of the hobbyist stack: contract suites against the real services, exit tests 10, 12 and 19, the engine's write through the real vault, the loopback canary and Mintkey events reaching the audit sink. Each scenario is decided twice under one id: by a Node test on fakes and by a `stack` test of `e2e/test_stack_conformance.py` in the delegate's run. A bare § names a section of `test-plan-rows.md`.

## ADDED Requirements

### Requirement: The contract runner reads its target and records one row per check
`stackContractTarget(dir, users)` SHALL answer the target of `test-plan-rows.md` § Target, and throw `stackContractTarget: users has no carol` without `carol`. `runStackContracts(target, extra, opts?)` SHALL run `oidcContract`, `egressContract` and the extra checks of `STACK_EXTRA_CHECKS` (the flood check only with `opts.flood`) and answer one `ContractRow` per check without throwing: a contract check that resolves is `ok` true `passed`; one running after `opts.checkTimeoutMs` (60000) is `ok` false `timed out after <n> ms`; every `detail` passes `redactDetail(message, secrets)` (secrets, JWT-shaped text and `Bearer <x>` become `[redacted]`; one line, at most 200 characters).

#### Scenario: A target from files and every row on the in-process stack
- **WHEN** `stackContractTarget(D, users)` runs twice on a directory `D` of the four secret files of § Target, once without `carol` and once with `secrets/mk_issue_token` missing; then `runStackContracts` runs on the in-process target of that section, and again with `loopback-canary.fake.test` routed to the echo upstream
- **THEN** the target deep-equals § Target, `credentials.clientId` is `REALM_CLIENTS[0]`, the two calls differ only in the UUID `echo.serviceId`, the call without `carol` throws the message above and the missing file an `Error` naming `mk_issue_token` and no secret; the first run answers the 24 rows of § Row names, all `ok` true; the second differs in the last row: `ok` false, `status 200`

#### Scenario: A failing check, a check that hangs and a secret in a detail
- **WHEN** `runStackContracts` runs with `checkTimeoutMs` 150 on the failing target of `test-plan.md` § Fixtures (`brokerServiceToken` `SVC-TOKEN-1f2e3d4c5b6a`); and `redactDetail` runs on § redactDetail
- **THEN** it resolves with 24 rows: the 10 oidc rows `ok` false `timed out after 150 ms`; three egress rows `ok` true and six `ok` false, those that reached the broker holding `{"seen":"[redacted]"}`; the Keycloak rows `ok` false `fetch failed`, the canary row `not run: broker answered 500`; no row holds `SVC-TOKEN-1f2e3d4c5b6a`; `redactDetail` answers § redactDetail

### Requirement: The OIDC suite finds Keycloak's login form in any attribute order
`oidcContract`'s form step SHALL find the `<form>` tag whose `id` is `kc-form-login` and read its `action` whatever the order of the tag's attributes, and keep failing with `the login page has no form action` when no such tag or no `action` exists.

#### Scenario: A Keycloak-shaped form, a form without an action and another id
- **WHEN** `oidcContract(fake.issuer, credentials)` runs on the fake OIDC for `alice`, three times, the global `fetch` rewriting each HTML answer: the form tag becomes `<form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="<A>" method="post">`; its `action` is removed; its `id` is `other-form`
- **THEN** all 10 checks resolve in the first run; in the other two the six checks of § Form rows reject with `the login page has no form action`

### Requirement: The OIDC and egress suites are judged row by row
`contractProblems(rows, wants)` SHALL answer, for each wanted suite and name (all the suite's names when `names` is absent; the extra suite's are `STACK_EXTRA_CHECKS` but the flood and canary rows), `<name>: no row` when no row has it and `<name>: <detail>` when the last row with it is not `ok`. `contractsMain(["verdict", <name>], io, opts)` SHALL judge `contracts.json` of `<STACK_OUT>/<STACK_RUN>`.

#### Scenario: Missing and failing rows, and the real services on the stack
- **WHEN** `contractProblems` runs on § Verdict rows for `{ suite: "oidc" }` and `{ suite: "egress" }`; `contractsMain` runs `verdict oidc`, `egress` and `nope` on a directory holding them and `verdict oidc` on a `contracts.json` holding `{`; on the stack, `test_oidc_contract_against_keycloak` and `test_egress_contract_against_mintkey`
- **THEN** the oidc problems are `["jwks keys: no row", "code flow with PKCE: status 400"]` and the egress problems `[]`; the mains answer as § Modes says; on the stack all 19 are `ok`

### Requirement: Exit 19: the caller clients get the right token audiences
The extra rows `a pre-registered MCP client gets the ursitoare-mcp audience`, `a client without it gets no such audience` and `anonymous dynamic registration is refused` SHALL be decided at `<keycloakBackchannel>/realms/ursitoare`: a client-credentials token of `e2e-mcp-caller` with `ursitoare-mcp` in its `aud` is `ok`, one of `e2e-plain-caller` without it is `ok`, an anonymous `POST` to `/clients-registrations/openid-connect` answered 401 or 403 is `ok`; any other answer is `ok` false. `EXIT_ROWS[19]` SHALL name these rows.

#### Scenario: The three rows on a stub Keycloak, and the stack
- **WHEN** `runStackContracts` runs against the stub Keycloak in the variants V1 to V4 of § Keycloak variants and `contractProblems(rows, EXIT_ROWS[19])` runs on each; `stackOverlay` runs on the fixture users and caller secrets; on the stack, `test_exit_19_keycloak_side`
- **THEN** V1 answers no problem, V2 `token request answered 401`, V3 `aud account,ursitoare-mcp`, V4 `status 201`; the clients of `stackOverlay` are `e2e-mcp-caller` (`mcpAudience` true) then `e2e-plain-caller` (false); on the stack all three rows are `ok`

### Requirement: Exit 12: Path B runs in production mode
`exit12EnvProblems(snap)` SHALL answer, over `mintkey-broker`, `mintkey-proxy` and `mintkey-vault`, the texts of § Exit 12 rows. The extra row `vault ListVersions without an identity is refused` SHALL call `/mintkey.vault.v1.VaultAdapter/ListVersions` with no identity headers and be `ok` only for grpc status 7 or 16. `EXIT_ROWS[12]` SHALL name the four rows of § Exit 12 rows.

#### Scenario: The environment table, the refusal row and the stack
- **WHEN** `exit12EnvProblems` runs on § Exit 12 rows; `runStackContracts` runs against a stub vault answering `ListVersions` with grpc status 16, 7, 0 and 12 and against a closed port; `contractProblems(rows, EXIT_ROWS[12])` runs on a fixture whose denied-put row failed with `grpc status 0`; `conformanceMain` runs `exit12` on a clean and a broken `before.json`; on the stack, `test_exit_12_path_b_in_production_mode`
- **THEN** each snapshot answers its row's texts (`[]` for X1); the row is `ok` for 16 and 7, `ok` false `grpc status 0` and `grpc status 12` for the others and `ok` false for the closed port; the fixture answers `["vault put with a denied identity is refused: grpc status 0"]`; the mains answer as § Modes says; on the stack the checks pass

### Requirement: The egress refuses a call to a loopback name, and the run asserts it
The egress SHALL refuse a call to a name that resolves, after DNS, to a loopback address: no upstream is reached and the egress answers the refusal. The extra row `a call to a name that resolves to loopback is refused` SHALL store with `vaultAdmin` a credential for a fresh service id targeting `http://loopback-canary.fake.test:8086`, issue a token for it, call `<proxyUrl>/<serviceId>/healthz` and record `ok` true `status <n>` (refused) for `n` below 200 or from 400, `ok` false `status <n>` (reached) for 200 to 399, and `ok` false `not run: vault put answered grpc status <n>` or `not run: broker answered <n>` when the call could not be made. `contractsMain(["verdict", "c4"], io, opts)` SHALL answer 0 only when the row is `ok`. `summaryLines(rows)` SHALL answer `<ok|not ok> <suite>: <name> (<detail>)` per row.

#### Scenario: Refused and reached on the fake, the verdict and the stack
- **WHEN** `runStackContracts` runs on the in-process target with the canary name unrouted, routed to upstreams answering 200 and 302, with the fake's denied identity as vault admin, and with a broker answering 500; `contractsMain` runs `verdict c4` on reports with the row `ok` true `status 403`, `ok` false `status 200`, and none; `summaryLines` runs on the second; on the stack, `test_c4_egress_refuses_loopback`
- **THEN** the row is `ok` true `status 502`, then `ok` false with `status 200`, `status 302`, `not run: vault put answered grpc status 7` and `not run: broker answered 500`; `verdict c4` prints `c4: ok (status 403)` with 0, `c4: not ok (status 200)` with 1, and answers 1 for the missing row; `summaryLines` answers `["not ok extra: a call to a name that resolves to loopback is refused (status 200)"]`; on the stack the row is `ok`

### Requirement: A snapshot keeps six fields and no secret; run files are 0600
`snapshotOf(inspect, opts?)` SHALL turn the `docker inspect` JSON of the project's containers into `ContainerSnapshot` records sorted by `service`, built only from `State.Running`, `State.OOMKilled`, `RestartCount`, `HostConfig.Memory`, the label `com.docker.compose.service` and the `Config.Env` entries named in `opts.keep` (default `SNAPSHOT_ENV_KEEP`); a kept value not matching `^[A-Za-z0-9_./-]{1,120}$` and a kept name containing `PASSWORD`, `SECRET` or `TOKEN` SHALL be `[redacted]`; a non-array input and an entry without the label give no record. `readSnapshot(path)` SHALL answer a file's records or throw `<path>: not a readable snapshot` (`<path>: not a snapshot` for a wrong shape). `writeRunFile(path, text)` SHALL leave mode 0600 even on an existing file. No run file SHALL hold a secret value.

#### Scenario: Six fields, redaction, the secret files and the file mode
- **WHEN** `snapshotOf` runs on § Inspect fixture (the 15 values of a fixture `secrets` directory sit in environments, `Cmd`, `Labels` and `Binds`), by default and with `keep` `[...SNAPSHOT_ENV_KEEP, "KC_DB_PASSWORD", "MINTKEY_VAULT_KEK_FILE"]`, and on `"x"`, `[1, {}]` and `[]`; `readSnapshot` on a missing file and `[{}]`; `conformanceMain` runs `snapshot` on the fixture, `[]` and `nope`; `writeRunFile` on a new file and a 0644 one; on the stack, the run directory is searched for the secret values
- **THEN** the 8 records are those of the table and with `keep` the Keycloak `env` is `{ "KC_DB_PASSWORD": "[redacted]" }`; the odd inputs give `[]`; `readSnapshot` throws `<path>: not a readable snapshot` and `<path>: not a snapshot`; no output holds any of the 15 values; the mains answer as § Modes says; both files end `0o600`; on the stack no file of `.stack-out/<run>/` holds a secret value and each is 0600

### Requirement: Exit 10: six containers run within their limits
`exit10Problems(snap)` SHALL, for each of `STACK_SERVICES`, answer `<service>: <n> running containers, need 1` when its running records are not exactly one, `<service>: memory limit <bytes> bytes, need <bytes>` when `memoryBytes` differs from `STACK_LIMITS` and `<service>: OOM killed`; and `<name>: not one of the six services` for each other running service but `owner-job`, `fakes` and `runner`. `limitSummary(snap)` SHALL answer `limits of the six sum to <n> MiB (limits, not usage)`.

#### Scenario: The clean snapshot, each broken rule and the stack
- **WHEN** `exit10Problems` runs on § Exit 10 rows; `conformanceMain` runs `exit10` with the clean `before.json`, with row T2's, with no run variables and with no file; on the stack, `test_exit_10_six_containers_within_their_limits`
- **THEN** the clean snapshot answers `[]` and `limits of the six sum to 2368 MiB (limits, not usage)`, `fakes`, `runner` and an exited `owner-job` add nothing, each other row its text; the mains answer as § Modes says; on the stack the check passes

### Requirement: No restart or OOM kill, and the vault serves after a flood
`restartProblems(before, after, { exclude })` SHALL answer, per service of `STACK_SERVICES`, `<service>: OOM killed` when its `after` record is `oomKilled` (even if excluded) and, unless excluded, `<service>: missing from the before snapshot`, `<service>: missing from the after snapshot` or `<service>: restarted <n> time(s)`. `contractsMain(["checks"], io, opts)` SHALL leave every regular file of the run directory mode 0600. `floodCheck(vaultUrl, who, opts?)` SHALL send `opts.calls` (200) `PutCredential` calls with a wrong token at `opts.concurrency` (8), then ask `/grpc.health.v1.Health/Check` without identity for up to `opts.healthWaitMs` (5000): `ok` true `serving after <calls> wrong-token calls` on SERVING, else `ok` false `not serving within <n> ms (<reason>)`.

#### Scenario: Restarts, OOM kills, the flood row and the summary
- **WHEN** `restartProblems` runs on § Restart rows; `floodCheck` (`calls` 20, `concurrency` 4, `healthWaitMs` 500) runs on a stub vault answering health SERVING, NOT_SERVING and on a closed port; `runStackContracts` runs with `flood: true`; `contractsMain` runs `run`, `flood` (stub `runChecks`, `flood`), `bracket` and `checks` on the files of that section; on the stack, step 90 runs `checks`
- **THEN** the rows answer their texts; the first stub saw 20 `PutCredential` calls (tokens `wrong-…`) and 1 health call, the row is `serving after 20 wrong-token calls`, the others `not serving within 500 ms (health did not report SERVING)` and `(health unreachable)`; the `flood: true` run has 25 rows; `bracket` makes the flood row `ok` false `restart or OOM kill: mintkey-broker: restarted 1 time(s)`; the recorded `run` and `flood` calls equal § Main wiring; `checks` answers 1, writes `summary.txt` as § Modes says and leaves `conformance-junit.xml` mode 0600; on the stack `checks` answers 0

### Requirement: Mintkey's real events reach the audit sink
`sinkProbe(opts)` SHALL sign `opts.user` in (default `signInThroughKeycloak`), read the tenant id from `GET /api/v1/me`, count `SinkCounts` from `GET /api/v1/audit` (§ Sink rows), store a credential under `mintkeyTenantId(tenant)` with `vaultAdmin`, issue a broker token for it and call the proxy once, issue one for `opts.foreignTenantUuid`, poll every `opts.pollMs` (1000) up to `opts.timeoutMs` (30000) and answer `{ tenantId, before, after, problems }`. `sinkProblems(before, after, timeoutMs)` SHALL answer one text of § Sink rows per count that did not rise.

#### Scenario: Two broker events and one proxy event, a silent sink and the stack
- **WHEN** `sinkProbe` runs with `signIn` returning a session on the stub engine of `test-plan.md`, a fake egress with it as `auditSink`, `pollMs` 20 and `timeoutMs` 500; again on a fake egress without a sink; `countSinkRows` and `sinkProblems` run on § Sink rows; `sinkProbeMain` runs with a recording `probe`; on the stack, `test_mintkey_events_reach_the_sink` after `fresh_state`
- **THEN** the first run answers `tenantId` `tenant_e2e`, `before` `{ broker: 0, proxy: 0, mismatch: 0 }`, `after` `{ broker: 1, proxy: 1, mismatch: 1 }` and no problem; the second run answers the three problems with `within 500 ms`; the recorded call equals § Main wiring; on the stack the three rows appear within 30 s

### Requirement: The engine writes a credential through the real vault
`credentialProbe(opts)` SHALL sign `opts.user` in, `POST /api/v1/tool-servers` the server `d16probe` (adapter `fixture`, origin `https://tools.fake.test`, a `fixtureSurface` of `erp.lookup_vendor@1`) and `POST /api/v1/credentials` for it (`API_KEY_HEADER`, header `x-fake-tools-key`, a random `value`), and answer `{ serverStatus, credentialStatus, keyVersion }` (`keyVersion` null without an integer). `credentialProblems(result)` SHALL answer `tool-servers answered <n>` unless the server status is 201 or 409, `credentials answered <n>` unless the credential status is 201, and `key version <v>, not 1` for another version.

#### Scenario: A credential written through the engine's vault client
- **WHEN** `credentialProbe` runs for `carol`, again for `carol`, and for `bob` on the in-process e2e stack (all parts); `credentialProblems` runs on § D16 rows; `credentialProbeMain` runs with a recording and a failing `probe`; on the stack, `test_d16_engine_writes_through_the_real_vault` after `fresh_state`
- **THEN** the results are `{ serverStatus: 201, credentialStatus: 201, keyVersion: 1 }`, `{ 409, 409, null }`, `{ 403, 403, null }` and the problems those of the table; the recorded call equals § Main wiring; the mains answer as § Modes says, printing no value sent; on the stack the credential is stored with key version 1

### Requirement: The four steps, the Python file and the README row are pinned
The steps `05-snapshot.sh`, `40-contracts.sh`, `60-conformance.sh` and `90-checks.sh` SHALL be the texts of `test-plan-data.md` and pass `scriptProblems`. `e2e/test_stack_conformance.py` SHALL define the eight tests of `test-plan.md` § Python rows, each marked `stack`, `milestone("M8")` and `l4(<id>)` with the id of a Node test of this unit, and follow the file rules of that section. `test/support/README.md` SHALL hold one row for the four helpers. Entry files SHALL answer as § Modes says; `60-conformance.sh` runs pytest with `--tb=short`.

#### Scenario: The committed steps, an altered copy, the Python file and the README row
- **WHEN** a test reads `scripts/stack-e2e.sh`, every step, `e2e/test_stack_conformance.py` and `test/support/README.md`, and runs `scriptProblems` on the committed text and on the altered steps of § Step rows
- **THEN** the committed set answers `[]`; the altered steps answer the three texts of that table; `40-contracts.sh` runs `contracts.ts bracket` after `contracts.ts flood`; the Python file has the eight names, markers and ids of the table and obeys its file rules; the README has one line starting `` | `stack/contracts.ts`, `stack/conformance.ts`, `stack/sink-probe.ts`, `stack/credential-probe.ts` | `add-stack-conformance` | ``
