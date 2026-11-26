# Test plan: add-stack-seeding

Every value was produced in a scratch copy of main@31968a29 (Node 24.22.2, the L4 checkout's Python 3.13 and pytest 9.1.1, Chromium for one sign-in probe) with prototypes of the in-plan names, no Docker, Keycloak or Mintkey: the control rows, the sign-in (in-process stack and two loopback servers), `seedPlan`, `seedStack` (two runs, E1 to E10, four sign-ins), the Python tests (5 pass, also with `E2E_PROFILE=stack`), pytest's collection, `50-journeys.sh` through `add-stack-overlay`'s prototype `scriptProblems` (`[]`) and the owner-job variables of `add-hobbyist-compose`'s data file.

## Test files and ids

| File | Test (name starts with the id and four words) | Scenario |
|---|---|---|
| `test/support/stack/control.test.ts` | `C-2da4ce8c the control server resets` | Reset, a serialised pair and a failing reset |
| same | `C-4660e7aa the control server seeds` | Seed users, other routes and close |
| `test/support/stack/runner-control.test.ts` | `C-991f47b8 runnerMain starts the control` | Control on, off and on a busy port |
| `test/support/stack/keycloak-login.test.ts` | `C-2acfa75f a session from the fake` | A session from the fake OIDC on the in-process stack |
| same | `C-1ed4fe46 the sign-in forms and refusals` | A Keycloak-shaped form, a two-page form and the refusals |
| `test/support/stack/seed-plan.test.ts` | `C-b5c2cb89 seedPlan lists fourteen steps` | The seed plan in order |
| `test/support/stack/seed-stack.test.ts` | `C-dac2edea seedStack seeds and repeats` | A fresh seed, a repeat and two other tenants |
| same | `C-5f0e0f91 seedStack failures name steps` | Each failing step names itself |
| `test/support/stack/seed-settings.test.ts` | `C-d91866cf the seed settings match` | Settings from files and the control composition |
| `test/support/stack/journeys-step.test.ts` | `C-41ff6de3 the journeys step and conftest` | The committed step, an altered copy and the README row |
| `e2e/test_stack_seeding.py` | `l4("C-9f2ca313")`: `test_fresh_state_on_the_stack_profile` | Stack profile with a stack control URL |
| same | `l4("C-96935fd5")`: `test_users_on_the_stack_profile`, `test_the_login_capability_check` | users on the stack profile and the login check |
| same | `l4("C-78c649be")`: `test_fake_only_list_and_hook`, `test_pytest_collects_the_fake_only_tests_and_deselects_them` | fake_only marks the fake-only tests and the stack profile deselects them |

The Python file has `@pytest.mark.milestone("M8")` on each test, no `page` fixture, and a loopback server of its own per test, so it passes on both profiles (it is not marked `stack` or `fake_only`). No frozen test changes.

**The three conftest criteria** (`C-9f2ca313`, `C-96935fd5`, `C-78c649be`) live in the e2e gate: no red run can cite them, so they stay out of every `criteria_ids` and reach verify as `needs_human`. Evidence: `e2e/test_stack_seeding.py` passes in the e2e report at head and fails by assertion at base (the conftest names are missing there); `journeys-step.test.ts` pins its file, markers and ids. `C-ef0357b4` is restated with its base wording; the frozen tests trace it wherever `E2E_STACK_CONTROL_URL` is unset (every gate).

**No password in a run file:** `--tb=short` keeps the `users` fixture and `login`'s `user` argument out of the junit file and the step's log (a long traceback prints them). Frozen tests relied on: `test/arch/e2e-stack.test.ts::C-e23019c4 the e2e stack browser gate has no skip or xfail call, marker or guard` (`test_e2e_stack.py` stays byte-equal), `web/src/ui/e2e-helpers.test.ts::C-97e30a51 conftest defines watch_csp and assert_layout` and `... still defines login and assert_accessible`, and from `add-stack-overlay` `test/support/stack/forward.test.ts::C-4a0ba6fa` and `test/support/stack/script.test.ts::C-5b8e7067` (it reads every step file, so a dirty `50-journeys.sh` fails it too).

Node tests follow the convention of `tasks.md`; names hold no `.`, `[` or `::`; servers listen on `127.0.0.1` port 0 and close in `t.after` (a shared stack: top-level `after`); no test runs `docker`, a shell or the network.

## Fixtures

- **Stack** (`seed-stack.test.ts`, `keycloak-login.test.ts`): `startE2eStack({ port: 0, controlPort: 0, dataDir })` with `discoverParts()` minus `tenant-b`, `rbac`, `catalogue`, `tool-servers` for seeding (all parts for the sign-in test); `fake` is `oidcApi(stack.handles).fake`; one stack per file, started in the first test.
- **Owner files** in a `mkdtemp` directory `D`: `D/owner` the owner password of `databaseApi(stack.handles).ownerUrl` and a newline; `D/broker` 64 `b` and a newline (BT); `D/proxy` 64 `c` and a newline (PT). `ownerEnv` holds the six names of the rows file § Settings: the owner URL without its password, `D/owner`, the `database` handle's `URSITOARE_DATABASE_URL` and `URSITOARE_DATABASE_PASSWORD_FILE` values, `D/broker`, `D/proxy`.
- **Users:** each of `OVERLAY_USERS` with `password` `fake.passwordOf(username)`; `issuer` `fake.issuer`; `engineOrigin` `stack.url`. Other tenants: owner-pool `INSERT INTO ursitoare.tenant (tenant_id, name, review_profile) VALUES ('tenant_x', 'Other X', 'solo'), ('tenant_y', 'Other Y', 'solo')`. The `fetch` recorder wraps the global `fetch` and records `<METHOD> <path> <status>` for paths starting `/api/`.
- **Settings:** `dir` from `mkdtemp`; `users.json` holds `OVERLAY_USERS` with passwords `pw-alice`, `pw-bob`, `pw-carol`, `pw-mallory`; hooks record their argument and the order; `readCompose()` and `readOverlay()` read the compose files, `${VAR:-default}` resolved by its default.
- **Control and runner:** the `close()` gate is a promise resolved after `close()` is called unawaited; the runner's children are `node -e` programs with the port interpolated, the busy port is held by a `net` server.
- **Python:** a loopback `ThreadingHTTPServer` per test recording `{ method, path, body, content_type }`; `monkeypatch` sets `E2E_PROFILE`, `E2E_CONTROL_URL`, `E2E_STACK_CONTROL_URL`; tests call `seed_users` and `reset_state` because `e2e_profile` is session-scoped and a fixture runs once per test; `test_pytest_collects_...` runs `sys.executable -m pytest e2e --collect-only -q -m <expression>` in the repository root and reads the `file::name` lines without `[param]`.

## STACK-ONLY

Proved only by the delegate's stack run at this unit's head, in no scenario and no task's `criteria_ids`; the delegate records each result in the run directory.

| Criterion | Step | Asserts |
|---|---|---|
| `signInThroughKeycloak` signs `carol` in through the real one-page Keycloak form (form, cookies, redirect) and Node `fetch` in the runner reaches `http://localhost:8180` through the IPv4 forwarder | `50-journeys.sh` | the first `fresh_state` reset answers 204, so `seedStack` signed in and passed its roles check |
| After a real sign-in the group mapper gives each user the capabilities of `OVERLAY_USERS` | `50-journeys.sh` | no `login: <user> lacks capabilities` in `e2e-junit.xml`; a search of the run directory for the passwords of `users.json` finds none |
| Every pytest journey except `fake_only` and `stack` passes on `E2E_PROFILE=stack` | `50-journeys.sh` | pytest exits 0; no failure or error in `e2e-junit.xml`; the summary shows the `fake_only` tests deselected |
| The browser reaches `http://127.0.0.1:8080` and `http://localhost:8180` (the row `add-stack-overlay` points at this step) | `50-journeys.sh` | `test_m1_sign_in.py` passes |
| The M6 and M7 journeys read live through the real proxy to the fakes over TLS, and `test_m7_tools.py` stores two credentials through the real vault (`Credential stored (key version 1).` after each reset; per-service numbering is not read from source) | `50-journeys.sh` | `test_m6_*.py` and `test_m7_tools.py` pass |
| A reset (drop, create, health wait, 14 seed steps, one real sign-in) ends inside 300 s without an engine restart | `50-journeys.sh` | no `reset failed at` in the junit file |
| The fakes keep their recorded state across resets without failing a journey; the generated `test_l4_c_*.py` files pass on the stack | `50-journeys.sh` | pytest exits 0 |
| The database the journeys leave behind is a valid owner-job input | step 6 of the next `stack-e2e.sh` run (`up -d --wait`) | the owner job exits 0 with `tenant … "E2E tenant" unchanged` |
