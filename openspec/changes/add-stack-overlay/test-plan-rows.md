# Test plan (rows): add-stack-overlay

Each row edits a fresh copy: `d` is the merged document, `s` the committed script, `st` the committed `30-proxy-smoke.sh`. Every row ran against prototypes of the rules. A secret is read from a `file` ending in `/.stack-e2e/secrets/<name>` (an absolute path in `config` output, `../.stack-e2e/...` in the merge).

## Overlay rules (`overlay.test.ts`, `overlayProblems`; the list equals the cell)

| Row | Edit | Problem |
|---|---|---|
| O1 | `d.name = "ursitoare"` | `name: project is not ursitoare-e2e` |
| O2 | `d.services.ursitoare.ports = ["127.0.0.1:8080:8080"]` | `ursitoare: publishes a port` |
| O3 | `d.services.runner.environment.E2E_PROFILE = "fake"` | `runner: E2E_PROFILE is not stack` |
| O4 | `delete d.services.runner.profiles` | `runner: profile runner is missing` |
| O5 | `d.services.fakes.networks.egress.aliases.pop()` | `fakes: alias echo.fake.test is missing on egress` |
| O6 | `d.services["mintkey-proxy"].networks = ["mintkey", "egress", "app"]` | `mintkey-proxy: networks are not exactly mintkey and egress` |
| O7 | `delete d.services["mintkey-proxy"].environment.SSL_CERT_DIR` | `mintkey-proxy: SSL_CERT_DIR is not /etc/ursitoare-test-ca` |
| O8 | `delete d.services["mintkey-proxy"].extra_hosts` | `mintkey-proxy: extra_hosts lacks loopback-canary.fake.test` |
| O9 | `d.services.ursitoare.image = "ursitoare/ursitoare:local"` | `ursitoare: image is not ursitoare/ursitoare:e2e` |
| O10 | `d.services["owner-job"].image = "ursitoare/ursitoare:local"` | `owner-job: image is not ursitoare/ursitoare:e2e` |
| O11 | `d.services["owner-job"].environment.OWNER_JOB_TENANT_NAME = "Home"` | `owner-job: OWNER_JOB_TENANT_NAME is not E2E tenant` |
| O12 | `d.secrets.kek.file = "../deploy/secrets/kek"` | `secrets: kek does not read .stack-e2e/secrets/kek` |
| O13 | on the config-shaped fixture, `file` of `kek` `/repo/deploy/secrets/kek` | the O12 text |

Also: `owner-job: OWNER_JOB_ORGANIZATION is not org-a`, and the alias texts for the other two aliases. `null`, `[]` and `"x"` answer, in order, `name: project is not ursitoare-e2e`, `services: missing <name>` for `ursitoare`, `owner-job`, `keycloak`, `mintkey-proxy`, `fakes`, `runner`, then `secrets: <name> does not read .stack-e2e/secrets/<name>` for the 15 `SECRET_FILES` names in order. The planted copy answers exactly `["name: project is not ursitoare-e2e", "mintkey-proxy: SSL_CERT_DIR is not /etc/ursitoare-test-ca", "owner-job: OWNER_JOB_TENANT_NAME is not E2E tenant"]`.

## Script rules (`script.test.ts`, `scriptProblems(s', {"30-proxy-smoke.sh": st})`; the list contains the cell)

| Row | Edit of `s` | Problem |
|---|---|---|
| S1 | remove the line `umask 077` | `S1 set -euo pipefail and umask 077 are not the first two commands` |
| S2 | `PROJECT=ursitoare-e2e` by `PROJECT=ursitoare` | `S2 PROJECT is not ursitoare-e2e` |
| S3 | `$COMPOSE build` by `docker compose build` | `S3 docker compose outside $COMPOSE: docker compose build` |
| S4 | `$COMPOSE stop` by `$COMPOSE down -v` | `S4 down outside the wipe command: $COMPOSE down -v` |
| S5 | add `docker volume rm "$names"` after the `down` line | `S5 docker volume rm is not allowed` |
| S5b | add the line `docker system prune -f` after `mkdir -p "$RUN_OUT"` | `S5 docker system is not allowed` |
| S6 | the `volume ls` line of `wipe_project` loses its `--filter` | `S6 docker volume ls without the project label` |
| S7 | add `-p 8080:8080` to the `RUNNER=` line | `S7 names reserved port 8080` (and an `S7 publishes` text) |
| S8 | add the line `set -x` after `set -euo pipefail` | `S8 prints the environment or traces commands: set -x` |
| S9 | `config --format json \| $RUNNER` by `config --format json \| tee x \| $RUNNER` | `S9 config is not piped straight into the runner` |
| S10 | remove the line `trap finish EXIT` | `S10 trap is not set between the state check and the build` |
| S11 | remove the line `$COMPOSE stop` in `finish` | `S11 finish must run the 9N steps, then stop, when STARTED is 1` |
| S12 | remove the line `STARTED=1` | `S12 STARTED=1 is not set right before up` |
| S13 | `[0-8][0-9]-*.sh` by `*.sh` | `S13 steps below 90 do not run in file-name order` |
| S14 | remove `secrets/ ` from `STATE_FILES` | `S14 STATE_FILES differs from STACK_STATE_FILES` |
| S15 | remove the `mv "$STATE" "$backup"` line | `S15 wipe_project must move the state aside before down` |
| S16 | remove the `if [ "$WIPE" = 1 ]; then` and `fi` lines around `wipe_project` | `S16 wipe_project is not called once under --wipe` |
| S17 | `mv "$STATE" "$backup"` by `rm -rf "$STATE"` | `S17 rm is used: rm -rf "$STATE"` |
| S19 | `$COMPOSE build` by `$COMPOSE -p ursitoare build` | `S19 a flag changes the project or files after $COMPOSE` |
| S20 | remove the `docker run … project.ts steps --script …` command (two lines) | `S20 the steps check is not between the build and the wipe` |
| S21 | remove the `unset …` line | `S21 compose and URL variables are not unset before COMPOSE=` |

S18 refuses an assignment (also with `export`) to exactly `PROJECT`, `COMPOSE`, `RUNNER`, `RUN_OUT`, `STATE`, `STEP_DIR`, `STATE_FILES`, `PATH` and `STACK_RUN`; other variables are allowed.

Step rows (`scriptProblems(s, { name: text })`; the list equals the cell). T1 to T8 are fixed; T9 to T27 add the one line to `st` (name `30-proxy-smoke.sh`) and the cell is the text after `step 30-proxy-smoke.sh: ` .

| Row | Name and text | Problem |
|---|---|---|
| T1 | `30-proxy-smoke.sh`, `$COMPOSE run` by `docker compose run` | `step 30-proxy-smoke.sh: S3 docker compose outside $COMPOSE: docker compose run --rm runner node test/support/stack/smoke.ts` |
| T2 | `30-proxy-smoke.sh`, plus the line `$COMPOSE down -v` | `step 30-proxy-smoke.sh: S4 down outside the wipe command: $COMPOSE down -v` |
| T3 | `30-proxy-smoke.sh`, `set -euo pipefail` by `set -eu` | `step 30-proxy-smoke.sh: first command is not set -euo pipefail` |
| T4 | `proxy.sh`, the committed text | `step proxy.sh: name is not NN-words.sh` |
| T5 | `30-proxy-smoke.sh`, plus the line `docker volume prune -f` | `step 30-proxy-smoke.sh: S5 docker volume prune is not allowed` |
| T6 | `30-proxy-smoke.sh`, plus the line `env` | `step 30-proxy-smoke.sh: S8 prints the environment or traces commands: env` |
| T7 | `30-proxy-smoke.sh`, plus the line `docker inspect $( $COMPOSE ps -q ) > "$RUN_OUT/raw.json"` | `step 30-proxy-smoke.sh: S5 docker inspect is not allowed outside a pipe into the runner` |
| T8 | `05-snapshot.sh`: `set -euo pipefail` then `docker inspect $( $COMPOSE ps -q ) \| $COMPOSE run --rm -T runner node test/support/stack/conformance.ts snapshot > "$RUN_OUT/before.json"` | `[]` |
| T9 | `$COMPOSE -p ursitoare stop` | `S18 names a compose project` |
| T10 | `COMPOSE=${COMPOSE/ursitoare-e2e/ursitoare}` | `S18 assigns a script variable` |
| T11 | `docker run --rm -v "$HOME":/h alpine true` | `S18 docker outside the inspect pipe into the runner` |
| T12 | `$COMPOSE config` | `S18 $COMPOSE subcommand is not run --rm runner, ps, restart or stop` |
| T13 | `x=$(docker volume prune -f)` | `S5 docker volume prune is not allowed` |
| T14 | `eval "$COMPOSE stop"` | `S18 shell escape (eval, source, exec, xargs, unset, trap)` |
| T15 | `cat .stack-e2e/secrets/kek` | `S18 reads a state or secret path` |
| T16 | `$COMPOSE run --rm -v /:/h runner true` | the T12 text |
| T17 | `bash -c '$COMPOSE stop'` | `S18 sh -c or bash -c` |
| T18 | `true && docker system prune -af` | `S5 docker system is not allowed` |
| T19 | `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock alpine true` | `S18 names the Docker socket` |
| T20 | `echo x \| xargs true` | the T14 text |
| T21 | `$COMPOSE --project-name ursitoare stop` | the T9 text |
| T22 | ``x=`$COMPOSE ps -q` `` | `S18 backtick substitution` |
| T23 | `cat $STATE/.env` | the T15 text |
| T24 | `$(echo docker) volume prune -f` | `S18 substitution other than $COMPOSE ps` |
| T25 | `( $COMPOSE -p ursitoare stop )` | the T9 text |
| T26 | `NAME=x` for each of the nine names (and `export STACK_RUN=x`) | the T10 text |
| T27 | `status=0`; `$COMPOSE run --rm runner true \|\| status=$?`; `containers=$($COMPOSE ps --format json)` | `[]` |

Steps that stay `[]` (final lines after `set -euo pipefail`; `RUN` is `$COMPOSE run --rm runner`): `10-overlay.sh` `RUN node test/support/stack/keycloak-overlay.ts`; `20-reset.sh` `RUN node …/reset.ts --prepare || status=$?`, on 3 `$COMPOSE restart ursitoare` and `RUN node …/reset.ts --wait`, `exit "$status"`; `50-journeys.sh` `RUN uv run --project e2e --frozen pytest e2e -m "not fake_only and not stack" --tb=short --junitxml="/run/stack-out/$STACK_RUN/e2e-junit.xml"`; `60-conformance.sh` that with `-m stack --tb=short`; `05-snapshot.sh` as T8; `40-contracts.sh` `RUN node …/contracts.ts run`, `flood`, `bracket` between T8 pipes; `90-checks.sh` a T8 pipe with `|| true`, `RUN node …/contracts.ts checks`; the T8 pipe into `$RUNNER`. `projectMain(["steps", "--script", s, "--dir", d])` on a temp directory with the committed step prints nothing, answers 0; with `40-x.sh` (T9's line) added it prints `step 40-x.sh: S18 names a compose project`, answers 1.

## Fakes front rows (`fakes-main.test.ts`)

Each call is an `https.request` to `127.0.0.1:<port>` with `ca` the CA PEM, unless noted.

| Row | `servername`, `Host`, request | Answer |
|---|---|---|
| F1 | `echo.fake.test`, `mintkey-proxy:8086`, `GET /x?q=1` | 200, JSON `path` `/x`, `query` `q=1`, `headers.host` `echo.fake.test` |
| F2 | `echo.fake.test`, `tools.fake.test`, `GET /health` | 404 `{"error":"not_found"}` |
| F3 | `other.example`, `other.test`, `rejectUnauthorized` false | 421 `{"error":"misdirected_request"}` |
| F4 | `echo.fake.test`, `echo.fake.test`, `POST /x` with body `abc` | 200, JSON `bodySha256` `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad` |
| F5 | `upstreams.echo` writes `one`, waits for the client's receipt, writes `two` | the client reads `one`, then `two` |
| F6 | `upstreams.echo` a closed port | 502 `{"error":"bad_gateway"}` |
