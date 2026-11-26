## Purpose

The stack-run harness of the milestone proof: an overlay of the hobbyist compose file for project `ursitoare-e2e`, a runner image, a fakes container behind the real proxy, a run script with a step framework, and the helpers that check them from files.

## ADDED Requirements

### Requirement: The e2e overlay changes only what the stack run needs
`deploy/compose.e2e.yaml`, read by `readOverlay` (a `!reset` or `!override` tag on a scalar or a list reads as `{ "!reset": value }` or `{ "!override": value }`) and merged over `deploy/compose.yaml` by `mergeCompose(base, overlay)` (maps merge by key, lists append, `!reset` removes a key, `!override` replaces a value, `name` becomes `STACK_PROJECT`, as `-p` makes it), SHALL: publish no port; tag `ursitoare` and `owner-job` `ursitoare/ursitoare:e2e`; set `OWNER_JOB_TENANT_NAME` `E2E tenant` and `OWNER_JOB_ORGANIZATION` `org-a` on the owner job; give `mintkey-proxy` `SSL_CERT_DIR=/etc/ursitoare-test-ca`, the read-only mount `../.stack-e2e/ca:/etc/ursitoare-test-ca:ro` and the host `loopback-canary.fake.test` at `127.0.0.1`; add the long-running `fakes` (aliases `tools.fake.test`, `mcp.fake.test`, `echo.fake.test` on `egress` only, a TCP healthcheck on 443) and the profile-gated `runner` (profile `runner`, on `front`, `app`, `mintkey`, `egress`), both of image `ursitoare/stack-runner:local`; and read each `SECRET_FILES` name from `../.stack-e2e/secrets/<name>`. `overlayProblems(config)` SHALL answer one text per broken rule on the merged document or on `docker compose config --profile runner --format json` (lists or maps), naming services and keys and never the value of an environment entry.

#### Scenario: The committed overlay merged over the committed base is clean
- **WHEN** `mergeCompose(readCompose(), readOverlay())` runs on the committed files (`test-plan-data.md`)
- **THEN** `overlayProblems` answers `[]`; `name` is `ursitoare-e2e`; the services are `ursitoare`, `owner-job`, `postgres`, `keycloak`, `mintkey-broker`, `mintkey-proxy`, `mintkey-vault`, `fakes`, `runner`; no service has `ports`; the 15 `secrets` equal `SECRET_FILES.map((f) => f.name)` in order, each `file` `../.stack-e2e/secrets/<name>`

#### Scenario: Each broken rule names its problem and no value
- **WHEN** `overlayProblems` runs on 12 edited copies of the merged document (rows O1 to O12, `test-plan-rows.md`), on the config-shaped fixture (O13 too), and on a copy whose `KC_URSITOARE_CLIENT_SECRET`, `SSL_CERT_DIR` and `OWNER_JOB_TENANT_NAME` hold `planted-9f2c` and whose `name` is `ursitoare`
- **THEN** each row answers exactly its problem (for example `ursitoare: publishes a port`); the fixture answers `[]`; the planted copy answers `name: project is not ursitoare-e2e`, `mintkey-proxy: SSL_CERT_DIR is not /etc/ursitoare-test-ca` and `owner-job: OWNER_JOB_TENANT_NAME is not E2E tenant`, none containing `planted-9f2c`; `null`, `[]` and `"x"` answer 22 texts (`test-plan-rows.md`) and never throw

### Requirement: The runner image carries pytest, Chromium and the Node steps, and its build context holds no state
`deploy/e2e/runner.Dockerfile` SHALL start from the Playwright image `mcr.microsoft.com/playwright/python:v1.63.0-noble` pinned by digest, take Node from `node:24-bookworm-slim` pinned by digest, and install the Node and Python dependencies frozen from the copied repository. `deploy/e2e/runner.Dockerfile.dockerignore` SHALL hold the 20 lines of `test-plan-data.md` and no `!` line.

#### Scenario: The committed Dockerfile and ignore file
- **WHEN** a test reads the two files and runs `buildContext` (U59) on the ignore file and the 29 paths of `test-plan.md`
- **THEN** the Dockerfile has two `FROM` lines, `node:24-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS node` and `mcr.microsoft.com/playwright/python:v1.63.0-noble@sha256:72bd171a9ffc2b4b59532aaa6210e21014d07093120dc25528870c0b840da1f0 AS runner`, no `latest`, and `corepack enable`, `uv==0.13.5`, `COPY . .`, `pnpm install --frozen-lockfile`, `uv sync --project e2e --frozen` in that order; the ignore file's 20 lines equal the data file's; `buildContext` sends the 14 source paths of the table and none of its 15 state paths

### Requirement: stack-e2e.sh acts on one project, publishes nothing and writes no secret
`scripts/stack-e2e.sh` SHALL begin `set -euo pipefail` then `umask 077`; pin `PROJECT=ursitoare-e2e` and unset the compose and URL variables before it defines `COMPOSE`; run every compose call through `$COMPOSE` (never with `-p`, `-f`, `--project-directory` or `--env-file` after it), except the one `docker compose -p "$PROJECT" down -v` of `wipe_project`, which runs only under `--wipe`, after moving `.stack-e2e/` to `.stack-e2e.<UTC timestamp>.bak`; call `docker` only as `compose`, `build`, `run` or `volume ls` with the project label; name no reserved port; run `config` only piped into `$RUNNER`; never use `rm`, `set -x`, `env`, `printenv` or `tee`; set `STATE_FILES` to `STACK_STATE_FILES`; after the build and before the wipe and the state check, run `project.ts steps` and stop with exit 65 on any problem; install `trap finish EXIT` after the state check; set `STARTED=1` on the line before `up -d --wait`; run the steps `[0-8][0-9]-*.sh` in file-name order; and in `finish`, only when `STARTED` is 1, run the `9[0-9]-*.sh` steps, then `$COMPOSE stop`, keeping the first non-zero exit code. A step SHALL use `docker` only in `docker inspect $( $COMPOSE ps -q ) | <runner>` and `$COMPOSE` only as `run --rm [-T] runner`, `ps`, `restart <service>` or `stop`, and SHALL contain no `-p`, assignment to the script's own variables (`test-plan-rows.md` S18), `eval`, `sh -c`, substitution but `$COMPOSE ps`, Docker-socket or `.stack-e2e` path. `scriptProblems(script, steps)` SHALL answer one text per broken rule of the script (S1 to S17, S19 to S21) and of each step (name `NN-words.sh`, first command `set -euo pipefail`, S3 to S8, S17, S18).

#### Scenario: The committed script and step are clean
- **WHEN** `scriptProblems` runs on `scripts/stack-e2e.sh` and the map of every `scripts/stack-e2e.d/*.sh` file present
- **THEN** it answers `[]`; its `STATE_FILES` equals `STACK_STATE_FILES.join(" ")`; the map holds `30-proxy-smoke.sh`; the script holds none of `8080`, `8180`, `39080`, `39081`, `prune`, `set -x`, `tee`

#### Scenario: Each rule names its problem
- **WHEN** `scriptProblems` runs on 21 edited copies of the script (rows S1 to S21, S5b) and on 27 steps (rows T1 to T27, `test-plan-rows.md`), and `projectMain steps` runs over a temp directory of the committed step, then with T9's line added
- **THEN** each list contains the text of its row (for example `S2 PROJECT is not ursitoare-e2e`); T8, a snapshot step piping `docker inspect` into the runner, and the carded steps listed there answer `[]`; `projectMain steps` answers 0 with no output, then 1 with the T9 text

### Requirement: The state guard stops a run whose state or volumes are missing
`stateProblems(present, volumes)` SHALL answer `firstRun` true only when both lists are empty, and otherwise `lost`, the `STACK_STATE_FILES` entries absent from `present`, in that order. `projectMain` SHALL run `state --present <csv> --volumes <csv>` (prints `first-run` or `resume`, exit 0, or `missing <file>` per lost file, exit 2), `prepare --dir <dir>` (`prepareState`, 0), `check` (JSON from `io.stdin`; prints each `overlayProblems` text, exit 1 when any, else 0; input that is not JSON prints `check: the input is not JSON` to `io.stderr`, exit 1), `steps --script <file> --dir <dir>` (prints each `scriptProblems` text, exit 1 when any, else 0) and, for any other argument, prints `usage: project.ts state|prepare|check|steps` to `io.stderr`, exit 64. `prepareState(dir, random, now)` SHALL create `users.json`, `clients.json`, `ca/ca.pem`, `tls/cert.pem` and `tls/key.pem` under `dir` with mode 0600 (`ca` and `tls` 0700), draw `random(16)` once per password and client secret in the order alice, bob, carol, mallory, `e2e-mcp-caller`, `e2e-plain-caller`, and never overwrite: an existing target file, or a `ca` or `tls` that is not a directory, throws `Error` `refusing to overwrite <path>` before any write. `OVERLAY_USERS` SHALL be:

| username | displayName | tenantName | organization | groups | capabilities |
|---|---|---|---|---|---|
| alice | Alice Example | E2E tenant | org-a | ursitoare-authors, team-finance | test_flow |
| bob | Bob Example | E2E tenant | org-a | ursitoare-approvers, team-finance | read_registry |
| carol | Carol Example | E2E tenant | org-a | ursitoare-admins | manage_users_roles |
| mallory | Mallory Example | Tenant B | org-b | ursitoare-authors | none |

`readUsers(dir)` and `readClients(dir)` SHALL read `users.json` and `clients.json`; a bad file throws an `Error` naming the file, never a secret.

#### Scenario: stateProblems and projectMain on the table
- **WHEN** `stateProblems` and `projectMain(["state", ...])` run on the five rows of `test-plan.md` § State table, and `projectMain(["bogus"])` runs
- **THEN** each row answers its row (`first-run` 0; `resume` 0; `resume` 0; four `missing` lines 2; five `missing` lines 2), with `lost` as the table says; `["bogus"]` answers 64, the usage line on `stderr` and nothing on `stdout`

#### Scenario: prepareState writes the files, and the users are the table
- **WHEN** `prepareState(dir, random, now)` runs in a temp directory with the seeded `random` of `test-plan.md` § Fixtures, then again there, then where `ca` is a file; then `readUsers`, `readClients`, a `users.json` missing `groups`, and `projectMain(["check"])` on a fixture holding `planted-9f2c`
- **THEN** the five files have mode `0o600` and `ca`, `tls` `0o700`; `readUsers(dir)` has the four usernames with the table's fields and a `password` of 32 lowercase hex characters, pairwise different, equal to the hex of `random` call 1 to 4; `readClients(dir)` has two secrets (calls 5 and 6); `random` ran 6 times with `16`; the second run throws `refusing to overwrite <dir>/users.json` and changes nothing; the third throws `refusing to overwrite <dir>/ca` and writes nothing; `ca/` holds only `ca.pem`; `readUsers` on the broken file throws naming `users.json`; `check` prints three lines, never the planted text, and exits 1 (`test-plan.md`); `OVERLAY_USERS` deep-equals the table without `password`

### Requirement: The test certificates verify as a chain for the fake hosts
`createTestCa(now)` SHALL answer a self-signed ECDSA P-256 CA certificate (subject `Ursitoare e2e test CA`, `CA:TRUE`, key usage `keyCertSign`, valid from one hour before `now` until 3650 days after it, a positive random serial) and its key as PEM; `issueServerCertificate(ca, hosts, now)` a leaf signed by it (`CA:FALSE`, extended key usage `serverAuth`, one `dNSName` per host, the same validity) and its key. Both use `node:crypto` only.

#### Scenario: Chain, host names and a real handshake
- **WHEN** a test creates a CA and a leaf for `FAKE_HOSTS` at `2026-11-25T10:00:00.000Z`, parses both with `X509Certificate`, serves `https` on loopback with the leaf, and connects with `ca` the CA PEM and `servername` `tools.fake.test`, then without `ca`, then with `ca` and `servername` `evil.fake.test`
- **THEN** the CA has `ca` true and the leaf false; `leaf.verify(ca.publicKey)` is true; `checkHost` answers `echo.fake.test` for that host and `undefined` for `other.fake.test`; `subjectAltName` is `DNS:tools.fake.test, DNS:mcp.fake.test, DNS:echo.fake.test`; `validFrom` is `Nov 25 09:00:00 2026 GMT`, `validTo` `Nov 22 10:00:00 2036 GMT`; the connections answer `200`, then fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, then `ERR_TLS_CERT_ALTNAME_INVALID`

### Requirement: Forwarders carry the hobbyist URLs and the runner closes them after its command
`stackForwards()` SHALL answer the rules `127.0.0.1:8080` to `ursitoare:8080` and `127.0.0.1:8180` to `keycloak:8080`. `startForwarders(rules)` SHALL listen on each rule (port 0 allowed), pipe raw bytes both ways and answer the bound `ports` in rule order; a listen failure closes every listener already open and rejects with that error; `close()` ends the listeners and every open socket. `runnerMain(argv, opts)` SHALL start `opts.forwards` (default `stackForwards()`), run `argv` as a child with inherited stdio, close the forwarders in every case, and answer its exit code, `127` when it cannot start, `64` for an empty `argv`.

#### Scenario: Pass-through, a closed target, a busy port and the exit code
- **WHEN** a loopback server uppercases its input and `startForwarders` listens on port 0 toward it; a second forwarder targets closed port 1; a third rule listens on the first port; and `runnerMain` runs `["node", "-e", "process.exit(7)"]`, `["node", "-e", "0"]`, `["nope-cmd"]` and `[]` with `forwards: []`
- **THEN** `ping` through the first returns `PING`; a connection through the second closes without data; the third rejects with `EADDRINUSE`, leaving no listener open; `stackForwards()` deep-equals the two rules; `runnerMain` answers `7`, `0`, `127`, `64`; after `close()` a connection is refused

### Requirement: The fakes sit behind one TLS front that routes by Host or server name
`fakeRoute(host)` SHALL answer `tools`, `mcp` or `echo` for `<name>.fake.test` with an optional all-digit `:port`, case-insensitively, and `null` otherwise. `startStackFakes(opts)` SHALL start `startFakeTools()`, `startFakeMcp({ era: "dual" })` and `startEchoUpstream()` on loopback (an `opts.upstreams` origin replaces that fake), serve HTTPS on `opts.port` (default 443), route a request by its `Host`, else by its TLS server name, forward it with `Host` set to `<name>.fake.test`, stream both ways unbuffered, answer an unroutable request 421 `{"error":"misdirected_request"}` and an unreachable upstream 502 `{"error":"bad_gateway"}`, and on `close()` close the front and the fakes it started.

#### Scenario: Routing, streaming, a dead upstream and close
- **WHEN** `fakeRoute` runs on the 9 rows of `test-plan.md` § fakeRoute, and `startStackFakes({ certFile, keyFile, port: 0 })` with a leaf for `FAKE_HOSTS` receives the calls of rows F1 to F6 (`test-plan-rows.md`), then `close()` runs
- **THEN** each row answers as its cell says (F1 200 with `headers.host` `echo.fake.test`; F2 404 `{"error":"not_found"}`; F3 421 `{"error":"misdirected_request"}`; F4 `bodySha256` `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`; F5 `one` before `two`; F6 502 `{"error":"bad_gateway"}`); after `close()` a connection to the port is refused

### Requirement: The proxy smoke proves the injected header, and the vault client sends both header pairs
`proxySmoke(target)` SHALL put a fresh credential for a random service id with `vaultAdmin` (header `x-stack-smoke-key`, a random value, target `target.echo.targetUrl`), issue a 60-second broker token, call `GET <proxyUrl>/<serviceId>/x` with that bearer, and answer `ok` true only when the echo reports the random value among the request headers it saw; every other outcome answers `ok` false and a `detail` holding no token, credential or header value. `smokeTarget(dir)` SHALL build the target from `<dir>/secrets` (`mk_issue_token` the broker token, `svcid_ursitoare` with `mk_vault_writer_token` `vaultAdmin`, `svcid_proxy` with `mk_vault_proxy_token` `vaultDenied`), the URLs `http://mintkey-broker:8083`, `http://mintkey-proxy:8086`, `http://mintkey-vault:8084`, a random tenant id and the echo `https://echo.fake.test`. `callVault` of `test/support/fake-egress/vault-client.ts` SHALL send `x-mintkey-identity`, `x-mintkey-token`, `x-mintkey-service-identity` and `x-mintkey-service-token`.

#### Scenario: proxySmoke against the fake egress
- **WHEN** `proxySmoke` runs on a target over `startFakeEgress()` with `echo.fake.test` registered to `startEchoUpstream()` (`targetUrl` `http://echo.fake.test`); then with the host registered to a server answering 200 `{"headers":{}}`; then with `vaultUrl` `http://127.0.0.1:1`; then with `vaultAdmin` the fake's denied identity; and `smokeTarget` runs on 15 secret files
- **THEN** the results are `{ ok: true, detail: "the echo saw the injected header" }`; `{ ok: false, detail: "the echo did not see the injected header" }`; `ok` false with `detail` starting `unreachable or failed`; `{ ok: false, detail: "vault put answered grpc status 7" }`; no `detail` contains a token or the credential value; `smokeTarget` answers the three URLs, the `mk_issue_token` text as `brokerServiceToken`, the two identities, `https://echo.fake.test` and a UUID `tenantId`

#### Scenario: The vault client sends both pairs and the fake still accepts
- **WHEN** `callVault` runs against a recording `http2` server with identity `svcid_ursitoare` and token `t-0123`, then with `who` null, and `putCredential` runs against `startFakeEgress()` with its admin identity
- **THEN** the first request records the four headers, `x-mintkey-identity` and `x-mintkey-service-identity` `svcid_ursitoare`, `x-mintkey-token` and `x-mintkey-service-token` `t-0123`; the second records none of them; `putCredential` answers `grpcStatus` 0 and `keyVersion` 1

### Requirement: docs/testing.md and the README describe the stack run
`docs/testing.md` SHALL hold a section `## Stack profile` with the sentences of `test-plan.md` § Docs, the closing paragraph's "never `down -v`" SHALL be replaced by a pointer to that section (the phrase no longer appears), and `A reset discards every durable workflow` SHALL stay. `test/support/README.md` SHALL hold one row starting `` | `stack/` | `add-stack-overlay` | `` and keep its pinned text.

#### Scenario: The documents
- **WHEN** a test reads `docs/testing.md` and `test/support/README.md`
- **THEN** `docs/testing.md` has one `## Stack profile` line, the six sentences, no `never \`down -v\``, and `A reset discards every durable workflow` once; the README has one line starting `` | `stack/` | `` and its text pinned by `test/support/readme.test.ts` unchanged
