# Test plan: add-stack-realm-reset

Every value was produced in a scratch copy of main@31968a29 (Node 24.22.2, embedded Postgres 18) with prototypes of this design and of the in-plan names it takes (`REALM_GROUPS`, `OverlayUser`, `readUsers`, `readClients`, U59a's two commands, U59's compose file): the plan rows, the fake admin, the error rows, `overlayMain`, `prepareTemplate`, `resetEngineDatabase`, the interrupted-reset sequence, `resetMain`, and both steps under `bash` with a stub `$COMPOSE`. Nothing ran in Docker, Keycloak or the real engine; U61's `scriptProblems` was not run.

## Test files and ids

| File (under `test/support/stack/`) | Test (name starts with) | Scenario |
|---|---|---|
| `overlay-plan.test.ts` | `C-9920f974 stackOverlay lists what` | Four users, another group and no users |
| same | `C-5dd23c67 planOverlay answers only what` | The base realm, a full realm and altered copies |
| `overlay-admin.test.ts` | `C-b5f086b2 applyRealmOverlay fresh realm then` | A fresh realm, then the same overlay again |
| same | `C-73d5b45e applyRealmOverlay failures name their` | Each failure names its step and holds no secret |
| `overlay-main.test.ts` | `C-e1275325 overlayMain prints one line` | A state directory, two runs, bad input and the compose file |
| `reset-template.test.ts` | `C-654b40e1 prepareTemplate create repeat behind` | Create, repeat, a template one migration behind, and refusals |
| `reset-engine.test.ts` | `C-e7afc0a8 resetEngineDatabase recreates restarts waits` | Recreate, a restart, a silent engine and refusals |
| `reset-recovery.test.ts` | `C-fe275e04 an interrupted reset recovers` | A reset that fails after the drop, then db-roles, db-prepare and a reset |
| `reset-main.test.ts` | `C-a4af60ed resetMain prepare wait refuse` | Prepare, wait, a dead engine, bad input and the compose file |
| `steps.test.ts` | `C-9a0e988e the two steps and` | The committed steps, two altered copies and the README row |

Tests follow the scenarios' order; no frozen test changes. Every test starts, inside its body, with a `typeof` assertion per function it calls and an `existsSync` assertion per data file it reads, and wraps each call under test in `attempt` (the value, or `{ thrown }`) so a throwing stub fails by assertion. Tests write only to `mkdtemp` directories, use port `0`, close every server and pool in `t.after`, remove each cluster's `dataDir`, never run `docker` or a shell. The reset tests start their own `startCluster()`; the overlay tests need no database. No fixture holds a key-shaped text (`test/arch/secrets.ts:14`).

## Fixtures

| Name | Value |
|---|---|
| users | `OVERLAY_USERS` (U61) with `password`: alice `1f89b6a283320dfa86d95b9e194b9c95`, bob `7360b7bf16e5358e472a76d718f08ed7`, carol `f1eac2cdfa35a8822c7036cb9ac53339`, mallory `ac8842a6ba0f937e51278d4256186b1c` (U61's seeded `random`, calls 1 to 4) |
| caller secrets | `e2e-mcp-caller` `9d0257575b8418cc8fc7cac3e97d1af6`, `e2e-plain-caller` `c1ce7f7d218b059db107436581622393` (calls 5 and 6) |
| `ADMIN` | `3f4f69227d00575f87a0ee5a05e77adc28fbf9bf8a73446ffb19722a54ee2a76` (SHA-256 of the text `stack-realm-reset-test:admin`) |
| `OW`, `wrong` | 64 `o` characters; 64 `w` characters; the failing-`prepareDurable` row has the superuser create schema `dbos` on a template it created first |
| state directory | built by U61's `prepareState(dir, random)` with the seeded `random` above (its `users.json` and `clients.json` carry exactly these passwords and secrets); the `groups`-less case edits `users.json`; `secrets/keycloak_admin_password` holds `ADMIN` and `\n`, `db_superuser_password` `SUPER-fixture\n`, `db_owner_password` `OWNER-fixture\n` |
| health fake | a loopback server counting requests; 200 `{"status":"ok","version":"x","checks":{"db":"ok"}}`, or 503 `{}` for a set number of requests or always; every reset test sets `healthPollMs` 20 |
| `N` | the count of `.sql` files of `DEFAULT_MIGRATIONS_DIR` (22) |

### Chain environment (`reset-recovery.test.ts`)

`<port>` is the cluster's port, `D` a `mkdtemp` directory whose files `admin` (the cluster superuser's password), `owner` (`OW`) and `app` (64 `a`) each end in `\n`.

| Variable | Value |
|---|---|
| `URSITOARE_DATABASE_ADMIN_URL` | `postgres://postgres@127.0.0.1:<port>/ursitoare` |
| `URSITOARE_DATABASE_ADMIN_PASSWORD_FILE`, `..._OWNER_PASSWORD_FILE`, `URSITOARE_DATABASE_PASSWORD_FILE` | `D/admin`, `D/owner`, `D/app` |
| `URSITOARE_DATABASE_OWNER_URL`, `URSITOARE_DATABASE_URL` | `postgres://ursitoare_owner@127.0.0.1:<port>/ursitoare`, `postgres://ursitoare_app@127.0.0.1:<port>/ursitoare` |

## How the tests drive their rows

- **Plan and apply.** The apply tests read `fake.requests` and `fake.snapshot()`, never the client's internals; E4 starts a fake with `hang`, E5 uses no server, E6 to E8 pass a `fetch` wrapper over the global one.
- **Reset.** The third `resetEngineDatabase` row also checks that `ursitoare` exists after the timeout; the `keycloak` row opens a `pg.Client` on `keycloak` before the first reset and runs `SELECT 1` on it after. A superuser `pg.Client` on the cluster's `adminUrl` creates `ursitoare` (and `keycloak` with its role); `ensureRoles` sets the passwords `OW` and 64 `a`; `prepareDatabase` migrates `ursitoare`; the owner pool creates `ursitoare.reset_marker`. The reset URLs are `postgres://postgres@127.0.0.1:<port>/postgres?sslmode=disable` and `postgres://ursitoare_owner@127.0.0.1:<port>/ursitoare?sslmode=disable`. The DBOS output is captured by wrapping `process.stdout.write` and `process.stderr.write` in `try`/`finally`.
- **Compose.** `readCompose()` (U59) gives the owner job's `URSITOARE_DATABASE_OWNER_URL` (`postgres://ursitoare_owner@postgres:5432/ursitoare?sslmode=disable`), the engine's `URSITOARE_PORT` (`8080`) and `URSITOARE_OIDC_BACKCHANNEL_URL` (`http://keycloak:8080`).
- **Recovery.** The default registry runs `db-roles` and `db-prepare` through `runCli` with the chain environment; the later `migrations:` line must equal the first.

## STACK-ONLY

Proved only by the delegate's stack run, in no scenario and no task's criteria. The run directory holds each step's output; the delegate records the times.

| Criterion | Step | Asserts |
|---|---|---|
| Keycloak's admin API accepts the bootstrap admin (`keycloak_admin_password` equals `KC_BOOTSTRAP_ADMIN_PASSWORD`) at `http://keycloak:8080`, realm `ursitoare` exists after the import, and it accepts the overlay's requests (organization with no domain, member by user id, user with group paths and a credential, caller clients) | `10-overlay.sh` | exit 0 and stdout exactly one line `overlay: applied <n>` with `n` at least 1 (14 on U58's import alone); the function's own final read found no gap |
| The four users, their groups and organizations sign in on one page | `50-journeys.sh` (U61b) | `login()` finds each user's `capabilities` |
| `e2e-mcp-caller`'s client-credentials token has `aud` `ursitoare-mcp`, `e2e-plain-caller`'s does not | `40-contracts.sh` (U61c) | the exit-19 row is `ok` |
| The official Postgres 18 image accepts the forced drop and the template copy; the template follows the code | `20-reset.sh` | exit 0 and stdout exactly `template: created; migrations applied: 22` then `reset: engine database recreated; the engine stayed up` (or `restarted`) |
| The real engine answers `/health` again after the drop, with or without a restart; the step's one restart branch recovers a silent one | `20-reset.sh` | exit 0; the delegate records which line printed, and the seconds of the template step, the reset and the wait |
| The engine's durable runtime works after a reset | `50-journeys.sh` (U61b) | the first test-run journey after a `fresh_state` passes |
| Keycloak's database survives a reset (the realm keeps the overlay) | `10-overlay.sh` in the next `stack-e2e.sh` run | stdout `overlay: applied 0` |
| The next run recovers after a reset | step 6 of `stack-e2e.sh` | `up -d --wait` exits 0 and the owner job's log holds `"E2E tenant" created` |
| No secret reaches a log | both steps | a search of the run's output for each value under `.stack-e2e/secrets` finds none |

## Step rules

The last scenario's texts come from U61's rows T1 and T2 (`add-stack-overlay/test-plan-rows.md`): T1 turns `$COMPOSE run` into `docker compose run` and expects `step <name>: S3 docker compose outside $COMPOSE: <that line>`; T2 adds `$COMPOSE down -v` and expects `step <name>: S4 down outside the wipe command: $COMPOSE down -v`. Both steps use only `$COMPOSE run --rm runner ...` and `$COMPOSE restart ursitoare`: no `docker`, `-p`, `eval`, `sh -c`, unpiped `config`, `.stack-e2e` path or assignment to `COMPOSE`, `PROJECT`, `RUNNER` or `RUN_OUT` (only their own `status`), so a stricter allow-list of those forms accepts them.

## Docs

The README row is in `test-plan-data.md`; `docs/testing.md` is U61's.
