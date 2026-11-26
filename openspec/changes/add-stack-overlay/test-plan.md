# Test plan: add-stack-overlay

Every value was produced in a scratch copy of main@31968a29 (Node 24.22.2) with prototypes of the in-plan names, no Docker: the merged overlay (clean, O1 to O13, the config-shaped fixture, the planted copy, malformed inputs); the scripts under `bash` with a stub `docker` (first run exit 0; lost state exit 2 and no compose call; `--wipe` moving the state, one `down -v`, a first run; a failing step exits 3, later steps are skipped, the 90s steps and `stop` run; a failing 90s step after passing steps exits 5; a bad step with `--wipe` exits 65 before any `docker volume`, `down` or move; `.stack-out` mode 700); the step rules (T1 to T27, the carded steps); `prepareState`, `readUsers`, `readClients`, `smokeTarget`, `projectMain`; F1 to F6; `proxySmoke`; forwarders and `runnerMain`; the certificates (`X509Certificate`, a handshake, `openssl verify -verify_hostname`); the 48 frozen fake-egress and fake-tools tests with both header pairs. `OVERLAY_USERS` capabilities are read from the fragments, not run.

## Test files and ids

| File | Test (name starts with the id and four words) |
|---|---|
| `test/support/stack/overlay.test.ts` | `C-5e7430ac the committed overlay merged` |
| same | `C-f6f4f3ca overlayProblems names the broken` |
| `test/support/stack/runner-image.test.ts` | `C-355519d4 the runner image files` |
| `test/support/stack/script.test.ts` | `C-5b8e7067 the committed script and` |
| same | `C-b94918a8 scriptProblems names the broken` |
| `test/support/stack/state.test.ts` | `C-5faa0a1f stateProblems and projectMain answer` |
| same | `C-6565e7eb prepareState writes the files` |
| `test/support/stack/tls.test.ts` | `C-12a1d6fa the test certificates verify` |
| `test/support/stack/forward.test.ts` | `C-4a0ba6fa forwarders carry bytes and` |
| `test/support/stack/fakes-main.test.ts` | `C-82c6f077 the fake front routes` |
| `test/support/stack/smoke.test.ts` | `C-a3c06214 proxySmoke against the fake` |
| `test/support/fake-egress/vault-client-pairs.test.ts` | `C-e6174b1e the vault client sends` |
| `test/support/stack/docs.test.ts` | `C-7dc9fe91 the stack documents name` |

Every test starts, inside its body, with a `typeof` assertion per function it calls and an `existsSync` assertion per data file it reads, and wraps each call under test in `attempt` (the value, or `{ thrown }`) so a throwing stub fails by assertion. Names hold no `.`, `[` or `::`. Tests write only to `mkdtemp` directories, close every server in `t.after`, use port `0`, and run no `docker`, `openssl` or shell. A test builds any PEM private-key marker from two string parts (`test/arch/secrets.ts:14`).

## Fixtures

`random` (seeded): call `k` answers the first `n` bytes of the SHA-256 digest of `stack-overlay-test:<k>` and records `n`. For `n` 16 the hex of calls 1 to 6 is `1f89b6a283320dfa86d95b9e194b9c95`, `7360b7bf16e5358e472a76d718f08ed7`, `f1eac2cdfa35a8822c7036cb9ac53339`, `ac8842a6ba0f937e51278d4256186b1c`, `9d0257575b8418cc8fc7cac3e97d1af6`, `c1ce7f7d218b059db107436581622393`: passwords of alice, bob, carol, mallory, then the secrets of `e2e-mcp-caller` and `e2e-plain-caller`.

The merged document is `mergeCompose(readCompose(), readOverlay())` of the committed files; each row works on a `structuredClone`. **Config-shaped fixture** (as `docker compose config --format json` prints, with resolved paths): the merged document with every list-form `networks` turned into a map (`{ "mintkey": null, "egress": null }`), the proxy's `extra_hosts` as `{ "loopback-canary.fake.test": ["127.0.0.1"] }`, the proxy's volumes as `{ type: "volume", source: "proxy-wal", target: "/var/lib/mintkey" }` and `{ type: "bind", source: "/repo/.stack-e2e/ca", target: "/etc/ursitoare-test-ca", read_only: true }`, every secret as `{ name: "ursitoare-e2e_<n>", file: "/repo/.stack-e2e/secrets/<n>" }`, `profiles` `["runner"]` on `runner`, `name` `ursitoare-e2e`; it answers `[]`, and so does the merged form with relative `../.stack-e2e/secrets/<n>` paths. **Planted copy:** `name` `ursitoare`, and `planted-9f2c` as `SSL_CERT_DIR` of the proxy, `OWNER_JOB_TENANT_NAME` and `KC_URSITOARE_CLIENT_SECRET`; `projectMain(["check"])` on it prints the three problem lines of that copy (no `planted-9f2c`), answers 1, and on the input `s3cr3t-val` (not JSON) prints nothing, writes `check: the input is not JSON` to `stderr` and answers 1; on the clean merged document it prints nothing and answers 0. The TLS tests use `now` `2026-11-25T10:00:00.000Z`. The vault-client test records headers on an `http2` server.

## State table (`stateProblems`, `projectMain state`)

| Row | `present` | `volumes` | Answer |
|---|---|---|---|
| 1 | none | none | `{ firstRun: true, lost: [] }`, `first-run`, 0 |
| 2 | the 7 files | none | `{ firstRun: false, lost: [] }`, `resume`, 0 |
| 3 | the 7 files | `ursitoare-e2e_pgdata`, `ursitoare-e2e_vault-data` | `{ firstRun: false, lost: [] }`, `resume`, 0 |
| 4 | `.env`, `secrets/`, `users.json` | `ursitoare-e2e_pgdata` | `lost` `["clients.json", "ca/ca.pem", "tls/cert.pem", "tls/key.pem"]`, four `missing` lines, 2 |
| 5 | `.env`, `secrets/` | none | `lost` `["users.json", "clients.json", "ca/ca.pem", "tls/cert.pem", "tls/key.pem"]`, five `missing` lines, 2 |

## Runner context (`buildContext` on the ignore file)

Sent (14): `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `web/package.json`, `src/main.ts`, `src/cli/main.ts`, `test/support/stack/project.ts`, `e2e/conftest.py`, `e2e/pyproject.toml`, `e2e/uv.lock`, `deploy/compose.yaml`, `deploy/e2e/runner.Dockerfile`, `src/db/migrations/0001_base.sql`, `e2e/test_m7_tools.py`. Not sent (15): `.stack-e2e/.env`, `.stack-e2e/secrets/kek`, `.stack-e2e.20261125T180000Z.bak/.env`, `.stack-out/x/y.log`, `deploy/secrets/kek`, `deploy/.env`, `.env`, `.env.local`, `.git/config`, `node_modules/a/b.js`, `web/node_modules/a/b.js`, `e2e/.venv/bin/python`, `web/dist/index.html`, `.l4-out/junit.xml`, `.orchestration/x`.

## fakeRoute

`tools.fake.test` is `tools`; `MCP.fake.test:443` `mcp`; `echo.fake.test:8443` `echo`; `tools.fake.test.evil`, `fake.test`, `127.0.0.1:443`, `tools.fake.test:abc`, `""` and `undefined` are `null`.

## Docs

`docs/testing.md` holds the line `## Stack profile` once and these sentences (each in one line of the section): (1) `` `scripts/stack-e2e.sh` acts only on compose project `ursitoare-e2e` and publishes no host port; pytest and the browser run in the network from the runner. `` (2) `The Node journeys stay fake-only; the stack profile runs the pytest journeys.` (3) `` Each `scripts/stack-e2e.d/NN-*.sh` is one step: steps below 90 run in file-name order and the first failure stops the run; steps from 90 run from the exit trap, then `docker compose stop`. `` (4) `` If `.stack-e2e/` is lost while the project's volumes remain, the run stops with exit code 2 and changes nothing; `--wipe` moves `.stack-e2e/` to `.stack-e2e.<UTC timestamp>.bak` and runs `docker compose -p ursitoare-e2e down -v`. `` (5) `` The proxy trusts the test CA through `SSL_CERT_DIR=/etc/ursitoare-test-ca`; to use a bundle instead, set `SSL_CERT_FILE` to `/etc/ursitoare-test-ca/ca.pem` in `deploy/compose.e2e.yaml`. `` (6) `` Run files that `scripts/stack-e2e.sh` writes under `.stack-out/` are mode 0600 and hold no secret value; `.stack-out/` is mode 0700. `` The README row is `` | `stack/` | `add-stack-overlay` | The helpers of `scripts/stack-e2e.sh` | ``.

## STACK-ONLY

Proved only by the delegate's stack run at this unit's head, in no scenario or task. Rows without a `stack-e2e.d` step name the line of `scripts/stack-e2e.sh`.

| Criterion | Step | Asserts |
|---|---|---|
| TLS to `echo.fake.test` through the real proxy with the test CA; the real vault accepts the client's header pairs | `30-proxy-smoke.sh` | `smoke.ts` exits 0 and prints `ok` |
| No container of the project publishes a host port | `30-proxy-smoke.sh` | `ps --format json` has no `"PublishedPort":[1-9]` |
| The real `config --profile runner --format json` passes `overlayProblems` | the `config … \| check` line of `stack-e2e.sh` | `check` prints nothing, exit 0 |
| `up -d --wait` returns 0 with the overlay | the `up -d --wait` line of `stack-e2e.sh` | exit 0 |
| The runner image builds | the `docker build` line of `stack-e2e.sh` | exit 0 |
| A lost state file stops the next run before any compose call | the state check of `stack-e2e.sh` | delete `.stack-e2e/users.json`, rerun: exit 2, `missing users.json`, no change |
| `--wipe` removes only this project's volumes and keeps a backup | `stack-e2e.sh --wipe` | only `ursitoare-e2e_*` volumes go; `.stack-e2e.<timestamp>.bak` exists |
| The stack stops at the end of a run, after a pass and after a failing step | exit trap of `stack-e2e.sh` | `ps -a` shows the containers exited and the volumes kept |
| Files the script writes are 0600, `.stack-out/` 0700, no secret in a log | `stack-e2e.sh` | `stat`; the `.env` values are absent from the run directory |
