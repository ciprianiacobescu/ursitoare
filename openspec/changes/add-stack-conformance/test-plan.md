# Test plan: add-stack-conformance

Every value was produced in a scratch copy of main@31968a29 with prototypes of the in-plan names, no Docker, Keycloak or Mintkey: the contract runner on fakes, stub servers and a failing target, `floodCheck`, the entry files' modes, the snapshot and exit functions, `sinkProbe` (a stub engine over `mapMintkeyEvent`, a fake egress with an `auditSink`), `credentialProbe` on `startE2eStack`, the form step behind a rewriting `fetch`, the four steps through the prototype `scriptProblems` of `add-stack-overlay`, and the Python file by `pytest --collect-only` (8 tests with `-m stack`, 8 deselected by default); no test body of it ran.

## Test files and ids

| File (`test/support/stack/` unless named) | Test (name starts with the id and four words) |
|---|---|
| `contracts-target.test.ts` | `C-7c2383bc a target from files and every row` |
| `contracts-failure.test.ts` | `C-1a1ac1b7 a failing check never throws` |
| `test/support/fake-oidc/contract-form.test.ts` | `C-33519c13 the form step reads any attribute order` |
| `contracts-verdict.test.ts` | `C-cbde6ea3 contractProblems and the verdict mode` |
| `exit19.test.ts` | `C-55fe75c6 the exit 19 rows on a stub` |
| `exit12.test.ts` | `C-61cbee8d exit 12 environment and refusal rows` |
| `canary.test.ts` | `C-919bd381 the egress refuses a loopback name` |
| `snapshot.test.ts` | `C-fc6a3269 a snapshot keeps six fields` |
| `exit10.test.ts` | `C-573d23d6 exit 10 counts six containers` |
| `restart.test.ts` | `C-b208781f restarts, OOM kills and the flood` |
| `sink-probe.test.ts` | `C-640a7f33 the sink probe counts three rows` |
| `credential-probe.test.ts` | `C-b5b4cac0 the credential probe writes through` |
| `conformance-steps.test.ts` | `C-538f6b35 the committed steps and the Python file` |

Every test starts with a `typeof` assertion per function it calls and an `existsSync` assertion per file it reads, and wraps each call under test in `attempt` (the value or `{ thrown }`) so a throwing stub fails by assertion. Names hold no `.`, `[` or `::`. Servers listen on `127.0.0.1` port 0 and close in `t.after`; files live in `mkdtemp` directories; no test runs `docker` or a shell; time bounds are tolerances (`checkTimeoutMs`, `pollMs`, `timeoutMs`, `healthWaitMs`), never asserted durations.

## Fixtures

- **In-process target** (`contracts-target.test.ts`, `canary.test.ts`, `exit19.test.ts`, `exit12.test.ts`): `startFakeOidc()` with `registerRedirect("http://127.0.0.1:9/cb")`; `startFakeEgress()`; `startEchoUpstream()` routed with `addUpstream("echo.fake.test", origin)`. `oidc`: the fake's issuer, client `ursitoare-engine` with the fake's secret, redirect `http://127.0.0.1:9/cb`, `alice` with `fake.passwordOf("alice")`, `org-a`, groups `["ursitoare-authors", "team-finance"]`. `egress`: the fake's URLs, tokens and `vaultAdmin` and `vaultDenied`, the tenant of § Target, `echo` `{ serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01", targetUrl: "http://echo.fake.test" }`. `extra`: `keycloakBackchannel` the stub Keycloak's origin, `callerSecrets` `MCPSECRET` and `PLAINSECRET`.
- **Stub Keycloak:** a loopback HTTP server. `POST /realms/ursitoare/protocol/openid-connect/token`: `e2e-mcp-caller` with `MCPSECRET` and `e2e-plain-caller` with `PLAINSECRET` answer 200 `{"access_token":"eyJhbGciOiJub25lIn0.<base64url of {"aud":<the variant's aud>}>.sig"}`, any other pair 401 `{}`; `POST /realms/ursitoare/clients-registrations/openid-connect` answers the variant's status.
- **Failing target** (`contracts-failure.test.ts`): the in-process target with `oidc.baseUrl` a server that never answers, `egress.brokerUrl` a server answering every request 500 `{"seen":<its x-mintkey-service-token header>}`, `brokerServiceToken` `SVC-TOKEN-1f2e3d4c5b6a`, `keycloakBackchannel` `http://127.0.0.1:1`. The test bounds itself: `{ timeout: 50000 }`, `checkTimeoutMs` 150, `runStackContracts` raced against a 10 s rejection that fails by assertion, and the silent server closed by `closeAllConnections()` then `close()` in `t.after`.
- **Stub vault** (`exit12.test.ts`, `restart.test.ts`): an `http2` h2c server recording `{ path, x-mintkey-token }`: `ListVersions` answers the grpc status of the row, `PutCredential` status 16, `/grpc.health.v1.Health/Check` status 0 with a framed `0x08 0x01` (SERVING) or `0x08 0x02` (NOT_SERVING). A target for it has every other URL `http://127.0.0.1:1`.
- **Stub engine** (`sink-probe.test.ts`): a loopback HTTP server with `POST /v1/internal/audit/emit` (emitter `broker` or `proxy` by the fake's token in `x-mintkey-service-token`; `mapMintkeyEvent(body, emitter, mintkeyTenantId("tenant_e2e"))`; an accepted event is stored as `{ eventType, origin: "mintkey", payload }`, a refusal as `{ eventType: SINK_REFUSAL_EVENT, origin: "ursitoare", payload }` from `refusalEvent`; answer 202), `GET /api/v1/me` `{ tenant: { id: "tenant_e2e" } }` and `GET /api/v1/audit?event_type=<t>` `{ items: <stored rows of that type>, next_cursor: null }`. `signIn` returns `{ cookie: "", csrfToken: "", capabilities: [], request }` whose `request` is `fetch` on that server. The fake egress takes `auditSink` the engine's origin (`echo.fake.test` routed as above); the foreign tenant is `4b8a2c1e-0000-8000-8000-0000000000f1`.
- **e2e stack** (`credential-probe.test.ts`): `startE2eStack({ port: 0, controlPort: 0, dataDir })` with `discoverParts()`; passwords from `oidcApi(stack.handles).fake.passwordOf`; `engineOrigin` `stack.url`; the users are the `OVERLAY_USERS` shape with `tenantName` `E2E tenant`.
- **Run directory** (the mains): `O/20261126T100000Z/` in a `mkdtemp` directory `O` holding the files of `test-plan-rows.md`; `STACK_OUT` `O`, `STACK_RUN` `20261126T100000Z`, `STACK_DIR` a directory with the four secrets, `users.json` and `clients.json`.

## Python rows (`e2e/test_stack_conformance.py`)

File rules: only the imports `os`, `subprocess`, `sys`, `pathlib`, `pytest`; at module level only imports, decorators and `def`; no environment read at import. A helper `node(*args, check=True)` runs `subprocess.run(["node", *args], cwd=<repository root>, capture_output=True, text=True, timeout=300)` and, unless `check` is false, asserts exit code 0 with stdout and stderr in the message (the C4 test passes `check=False`, records, then asserts); the child inherits `STACK_OUT`, `STACK_RUN` and `STACK_DIR`. Each test has `@pytest.mark.stack`, `@pytest.mark.milestone("M8")` and `@pytest.mark.l4("<id>")`.

| Test | Id | `node` arguments |
|---|---|---|
| `test_exit_10_six_containers_within_their_limits` | `C-573d23d6` | `test/support/stack/conformance.ts exit10` |
| `test_exit_12_path_b_in_production_mode` | `C-61cbee8d` | `conformance.ts exit12`, then `contracts.ts verdict exit12` |
| `test_exit_19_keycloak_side` | `C-55fe75c6` | `contracts.ts verdict exit19` |
| `test_oidc_contract_against_keycloak` | `C-cbde6ea3` | `contracts.ts verdict oidc` |
| `test_egress_contract_against_mintkey` | `C-cbde6ea3` | `contracts.ts verdict egress` |
| `test_d16_engine_writes_through_the_real_vault` (takes `fresh_state`) | `C-b5b4cac0` | `test/support/stack/credential-probe.ts` |
| `test_c4_egress_refuses_loopback` (takes `record_property`) | `C-919bd381` | `contracts.ts verdict c4` with `record_property("c4", <stdout>)` before the exit-code assertion |
| `test_mintkey_events_reach_the_sink` (takes `fresh_state`) | `C-640a7f33` | `test/support/stack/sink-probe.ts` |

`conformance-steps.test.ts` pins the file by text: the eight names with their marker lines and ids, the file rules above, no `os.environ`.

## STACK-ONLY

Proved only by the delegate's run at this unit's head; each is a scenario's stack half (the id is its Node scenario's), in no task's `criteria_ids`.

| Criterion | Step | Asserts |
|---|---|---|
| Six containers within their limits (`C-573d23d6`) | `05-snapshot.sh`, `60-conformance.sh` | `before.json` has the six running once with memory 536870912, 536870912, 805306368, 134217728, 134217728, 335544320 and no OOM kill; `exit10` answers 0 |
| Path B in production mode (`C-61cbee8d`) | `05`, `40`, `60` | `exit12` and `verdict exit12` answer 0: `MINTKEY_ENV` `production` on the three, the vault refuses a put by `svcid_proxy`, `ListVersions` without identity, a token request without the service token, a proxy call without a bearer |
| The caller audiences (`C-55fe75c6`) | `40`, `60` | `verdict exit19` answers 0 |
| The OIDC suite against real Keycloak through the one-page flow, and the egress suite against the real broker, proxy and vault (`C-cbde6ea3`) | `40`, `60` | `verdict oidc` and `verdict egress` answer 0 (all 19 rows `ok`) |
| The engine's own `PutCredential` framing is accepted (`C-b5b4cac0`) | `60` | `credential-probe.ts` prints `d16: ok (key version 1)` |
| The egress refuses a loopback name (`C-919bd381`) | `40`, `60`, `90` | `verdict c4` answers 0 (`c4: ok (status <n>)`, no 2xx or 3xx); the line is in the junit file and in `summary.txt` |
| Real broker and proxy events reach the sink (`C-640a7f33`) | `60` | `sink-probe.ts` prints `sink: ok (tenant <id>)` within 30 s |
| The vault serves after the flood; nothing restarts (`C-b208781f`) | `40`, `90` | the flood row is `ok` after `bracket`; `checks` prints `restarts: none; no OOM kill`, 0 |
| Run files are 0600 and hold no secret; `docker inspect` has the fields `snapshotOf` reads (`C-fc6a3269`) | `05`, `40`, `90` | `stat` of every file of `.stack-out/<run>/` after step 90 (the junit file included, which `--tb=short` keeps free of the `users` fixture values); a search of it for the values of `.stack-e2e/.env`, `secrets/*`, the passwords of `users.json` and the secrets of `clients.json` finds none; `before.json` has six running records |
