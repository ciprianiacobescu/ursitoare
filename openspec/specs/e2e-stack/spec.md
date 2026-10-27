# e2e-stack Specification

## Purpose
The offline stack the browser e2e gate serves: the real engine on embedded Postgres, a loopback control listener, and parts added as one file.

## Requirements

### Requirement: Parts are discovered from the parts directory
The stack SHALL run the parts that `discoverParts` finds in `test/support/e2e-stack/parts/`, in file-name order, and a part SHALL be added to the stack by one file `NN-<name>.ts` there, without editing any shared file.

#### Scenario: Registry order and validation
- **WHEN** a registry from `createPartRegistry()` registers parts `a` then `b`, and then a part named `Bad Name`, a part named `engine`, a part whose `start` is a string, and a second part named `a`
- **THEN** `list()` returns `[a, b]` as a copy, the next three registrations throw `E2eStackError` `STACK_PART_INVALID`, and the last throws `STACK_PART_DUPLICATE`, the list staying unchanged

#### Scenario: Discovery order and test files
- **WHEN** a temp directory holds `20-b.ts`, `10-a.ts`, `10-a.test.ts` (which sets a global marker when imported) and `notes.md`, each part file exporting `part` with the matching name, and `discoverParts(dir)` runs
- **THEN** the result is the parts `a` then `b`, and the marker stays unset

#### Scenario: Misnamed or invalid part files
- **WHEN** `discoverParts(dir)` runs on directories holding, one at a time, `10-a.ts` without an export `part`, `10-a.ts` exporting a part named `b`, `database.ts`, `1-a.ts`, `10-Bad.ts`, and `10-a.ts` exporting a part with `start` not a function; and on a directory that does not exist
- **THEN** each rejects with `E2eStackError` `STACK_PART_INVALID` and `details.file` naming the file (the directory for the missing one)

#### Scenario: Repeated prefix or name
- **WHEN** `discoverParts(dir)` runs on a directory holding `10-a.ts` and `10-b.ts`, and on one holding `10-a.ts` and `20-a.ts`
- **THEN** both reject with `STACK_PART_DUPLICATE` and `details.file` of the later file (`10-b.ts`, `20-a.ts`)

### Requirement: The stack starts the real engine and the parts, and closes them in reverse
`startE2eStack(opts?)` SHALL start every part in order, seed them, run the engine through `main` with the parts' env, and resolve `{ url, controlUrl, handles, close }`; `close()` SHALL stop the control listener, the engine, the parts in reverse order and delete the stack's files.

#### Scenario: Start, seed and serve
- **WHEN** `startE2eStack({ port: 0, controlPort: 0, dataDir, parts: [p1, p2] })` runs with recording fake parts, `p1` returning env `{ E2E_X: "1" }`
- **THEN** the calls are `start:p1`, `start:p2`, `seed:p1`, `seed:p2`; `p2`'s context `env` holds `E2E_X` and the `URSITOARE_*` stack keys; `url` and `controlUrl` are `http://127.0.0.1:<port>` with two different non-zero ports; `GET <url>/health` is 200 with `status` `"ok"` and `checks` `{}`; the context `dataDir` of `p1` exists inside the stack directory

#### Scenario: Close in reverse and repeatable
- **WHEN** `close()` is called twice
- **THEN** the fakes record `close:p2` then `close:p1` once each, both calls resolve, the engine and control ports refuse connections, and `dataDir` no longer contains the stack directory

#### Scenario: Close waits for a reset; a failed close repeats
- **WHEN** `p1.seed` blocks on a gate, `POST /reset` is sent unawaited, `close()` is called and the gate opens; and in another run `p1.close` rejects and `close()` runs twice
- **THEN** the first `close()` resolves after `p1.seed` finished and both ports refuse connections; the second run rejects both calls with the same `STACK_CLOSE_FAILED` (`details.parts` `["p1"]`), `p1.close` having run once

#### Scenario: A part fails or conflicts
- **WHEN** `p2.start` rejects, or `p2.seed` rejects during the first start, or a part returns env `URSITOARE_PORT`, or two parts return the same key
- **THEN** `startE2eStack` rejects with `STACK_PART_FAILED` (`details.part` `"p2"`) or `STACK_ENV_CONFLICT` (`details.key`), every started part was closed in reverse, and no port is left listening

#### Scenario: Bad options, busy port
- **WHEN** it is called with `port: 70000`, with equal non-zero ports (5000), with a `dataDir` that does not exist, or with a free `controlPort` and an engine `port` held by another listener
- **THEN** the first three reject `STACK_OPTIONS_INVALID` before any part starts; the last rejects `STACK_ENGINE_FAILED` with `details.exitCode` `1` and `details.fatal` containing `EADDRINUSE` after closing the parts

### Requirement: The database part provides a migrated, seeded Postgres to the engine
The `database` part SHALL start one Postgres 18.4 cluster, create the roles, build a template with `prepareDatabase` (migrations, then partitions), give the engine only a password file and the app-role URL, and seed the default tenant on every seed.

#### Scenario: The part alone
- **WHEN** `databasePart.start` and then `databasePart.seed` twice run with a hand-made context in a temp directory, and `discoverParts()` runs over the shipped `parts/` directory
- **THEN** `ursitoare_owner` and `ursitoare_app` exist without superuser or BYPASSRLS; `ursitoare.schema_migration` of `ursitoare_e2e` holds one row per `.sql` file of `DEFAULT_MIGRATIONS_DIR`; `ursitoare.tenant` holds exactly one row, `tenant_id` `ten_00000000-0000-7000-8000-000000000001` after both seeds, `name` `E2E tenant`; `app-password` has mode 0600; `databaseApi` of a map holding the handle returns host `127.0.0.1`, the cluster port, database `ursitoare_e2e` and an `ownerUrl` whose path is `/ursitoare_e2e`, and of an empty map throws `STACK_PART_MISSING`; the discovered parts start with the name `database`

#### Scenario: Health reports the database
- **WHEN** `startE2eStack({ port: 0, controlPort: 0, dataDir })` runs with no `parts` option and `GET <url>/health` is fetched
- **THEN** the answer is 200 with `status` `"ok"` and `checks.db` `"ok"`; as owner, `SHOW server_version` starts `18.4`, `ursitoare.tenant` holds exactly one row with `review_profile` `solo`; and the `pg_stat_activity` rows for `ursitoare_e2e` whose `application_name` is neither `e2e-stack` nor `e2e-test` exist and all use `ursitoare_app`

#### Scenario: Secrets are files only
- **WHEN** the stack runs
- **THEN** `<dataDir>/ursitoare-e2e-*/engine/engine.key` holds exactly 64 hex characters and `.../database/app-password` is non-empty, both with mode 0600, and neither value appears in the `/health` body

#### Scenario: Close stops Postgres; a failed start leaves nothing
- **WHEN** the stack is closed, and separately `databasePart.start` runs with a context whose `dataDir` does not exist, with `TMPDIR` set to a temp directory
- **THEN** after close a connection to `DatabaseApi.port` is refused and the directory under `TMPDIR` that held `PG_VERSION` while the stack ran is gone; the failing start rejects, and no `postmaster.pid` remains under that `TMPDIR`

### Requirement: Reset recreates the database and re-runs every seed
`POST /reset` on the control listener SHALL clear the faults and run each part's `seed` in order, and answer 204 only after they finish and `GET <engineOrigin>/health` has answered 200, tried at most 5 times back to back with no timer.

#### Scenario: Seeded state is restored
- **WHEN** as owner a test creates `ursitoare.e2e_probe`, inserts a second tenant, installs a fault, and then `POST <controlUrl>/reset` runs three times in a row with a `GET <url>/health` after each
- **THEN** each reset answers 204 and each health 200 with `checks.db` `"ok"`; the probe table is gone, `ursitoare.tenant` holds only the seeded row with the same id as before, and the fault no longer applies

#### Scenario: Seeds re-run, never overlap, failures reported
- **WHEN** fake parts count `seed` calls and track concurrency, two resets are posted together, and later `p2.seed` rejects
- **THEN** after the first two resets each `seed` ran three times in total (start included) with a maximum concurrency of 1; the rejecting reset answers 500 `{ error: { code: "STACK_RESET_FAILED", details: { part: "p2" } } }`, and a following reset with a passing seed answers 204

#### Scenario: The engine must be healthy
- **WHEN** `createResetRunner` runs `reset()` with `engineHealthy` answering `false`, `false`, `true`, and then with `false` every time
- **THEN** the first resolves after 3 calls; the second rejects `E2eStackError` `STACK_RESET_FAILED` with `details.part` `"engine"` after exactly 5 calls

### Requirement: Faults delay or fail engine routes
`POST /faults` SHALL accept `{ method, url, delayMs?, status? }` and a Fastify `onRequest` hook SHALL then delay or answer matching engine requests until `DELETE /faults` or a reset. Fields are checked in the order `not_object`, `unknown_property`, `bad_method`, `bad_url`, `bad_delay`, `bad_status`, `empty_fault`.

#### Scenario: A status fault
- **WHEN** `POST /faults` is sent with `{"method":"GET","url":"/health","status":503}`, then `GET <url>/health`, then `GET <url>/api/v1/nope`, then `DELETE /faults`, then `GET <url>/health` again
- **THEN** the posts and delete answer 204; the first health answers 503 with `error.code` `"FAULT_INJECTED"` and an `x-request-id` header, `/api/v1/nope` 404 `NOT_FOUND`, the last health 200

#### Scenario: Delay, prefix match, replacement and order
- **WHEN** a fault table with a recording `sleep` holds `{ method: "GET", url: "/api/*", delayMs: 250 }` and a request `GET /api/v1/x?y=1`, `GET /apix`, `POST /api/v1/x` pass the hook; then `{ method: "GET", url: "/api/*", status: 500 }` is added
- **THEN** `sleep` was called once, with `250`, for the first request only, which continued; after the add `list()` has one entry (replaced in place) and `GET /api/v1/x` is answered 500

#### Scenario: Invalid faults are refused
- **WHEN** `POST /faults` carries `{}`, `{"method":"GET","url":"/x"}`, `{"method":"get","url":"/x","status":500}`, `url` `"x"`, `url` `"/a?b=1"`, `status` 200, `delayMs` 30001, an extra key, malformed JSON, or the 101st distinct fault
- **THEN** each answers 400 `FAULT_INVALID` with `details.reason` `bad_method`, `empty_fault`, `bad_method`, `bad_url`, `bad_url`, `bad_status`, `bad_delay`, `unknown_property`, `bad_json`, `too_many`, and the table is unchanged

### Requirement: The control listener is loopback-only and refuses browsers
The control listener SHALL bind `127.0.0.1`, refuse a `Host` other than `127.0.0.1:<port>` or `localhost:<port>` and any request with an `Origin` header, count request bytes as they arrive, and use the engine's error envelope.

#### Scenario: Foreign Host or Origin
- **WHEN** `startControlServer` runs with a counting `reset`, and `POST /reset` is sent with `Host: evil.example:<port>`, then with `Origin: http://127.0.0.1:39080`
- **THEN** both answer 403 `CONTROL_FORBIDDEN` and `reset` was never called; the server's bound address is `127.0.0.1`

#### Scenario: Routing and body limits
- **WHEN** requests are `GET /reset`, `POST /nowhere`, `POST /faults` with `text/plain`, `POST /faults` with `application/json` and a body of 5000 bytes, `POST /faults` with `application/json; charset=utf-8` and a valid body, `POST /reset` with no body, `POST /reset` with a 5000-byte `text/plain` body, and `PUT /faults`
- **THEN** they answer 405 `CONTROL_METHOD_NOT_ALLOWED` with `allow: POST`, 404 `CONTROL_NOT_FOUND`, 415 `CONTROL_UNSUPPORTED_MEDIA_TYPE`, 413 `CONTROL_PAYLOAD_TOO_LARGE`, 204 (fault added), 204, 204 (body ignored), and 405 with `allow: POST, DELETE`

#### Scenario: A chunked body is counted too
- **WHEN** a raw `node:http` request `POST /faults` with `content-type: application/json` and `transfer-encoding: chunked` sends 5000 bytes, and another with that type sends `content-length: 5000`
- **THEN** both answer 413 `CONTROL_PAYLOAD_TOO_LARGE` with `connection: close`, the fault table unchanged

### Requirement: No control route exists in src
No non-test file under `src/` SHALL register `/reset` or `/faults`, and `test/arch/control-routes.test.ts` SHALL fail when one does, through `checkControlRoutes(s: Snapshot): Violation[]` with code `ARCH_CONTROL_ROUTE`.

#### Scenario: Scanner controls and the real tree
- **WHEN** `checkControlRoutes` runs on `snapshotOf` fixtures: `src/api/a.ts` with `app.post("/reset", h)`, `src/api/b.ts` with `` url: `/faults` ``, `src/api/c.ts` with `'/faults/x'`, `src/api/d.ts` with `"/api/v1/reset-password"`, `src/api/e.ts` with `"/resets"`, `src/api/a.test.ts` with the contents of the first, and an empty snapshot; then on `readSnapshot()`
- **THEN** `a`, `b` and `c` are reported with code `ARCH_CONTROL_ROUTE`, file and line, the others are not, the empty snapshot gives `[]`, the repository result is empty, and the snapshot held `src/main.ts`

### Requirement: The engine composition root accepts a server hook
`main` SHALL accept an optional `configureServer(server)` that runs after the server is built and before it listens.

#### Scenario: The hook runs before listen
- **WHEN** `main` runs with a port-0 config, no database, and a `configureServer` that records `server.server.listening` and adds an `onRequest` hook setting header `x-seam: 1`
- **THEN** `typeof main` is `"function"`, the record is `false`, and `GET /health` answers 200 with `x-seam: 1`

#### Scenario: A throwing hook stops the start
- **WHEN** `configureServer` throws an error with `code` `"E_HOOK"`, and in another run a plain `Error`, both with message `hook failed`
- **THEN** `main` resolves `null`, `exit` gets `1`, the fatal log line has `code` `"E_HOOK"` and `"SERVER_HOOK_FAILED"` and `msg` `"startup failed"` both times, and the line contains no `"hook failed"`, no port is open, and an injected `Database` was closed once

### Requirement: The stack process starts offline and stops on SIGTERM
`node test/support/e2e-stack/main.ts` SHALL start the stack on `E2E_PORT` (default 39080) and `E2E_CONTROL_PORT` (default 39081, both 1 to 65535) offline, `E2E_DATA_DIR` as the parent directory and the engine log on stderr unless `E2E_STACK_LOG` is `0`, write only its ready line to stdout (other stdout writes go to stderr), and on SIGTERM or SIGINT, also during the start, close the engine and stop Postgres.

#### Scenario: Offline start, health, SIGTERM
- **WHEN** the file is spawned with free ports, `E2E_DATA_DIR` and `TMPDIR` set to temp directories, `GET /health` is fetched after the first stdout line, and SIGTERM is sent; and `dns.lookup` and `dns.promises.lookup` are mocked with `mock.method` while a stack starts, resets and closes
- **THEN** the whole stdout equals `e2e stack ready on http://127.0.0.1:<E2E_PORT> control http://127.0.0.1:<E2E_CONTROL_PORT>` plus a newline, its first line arriving within 90 s (any other first line fails the test at once), health is 200 with `checks.db` `"ok"`, the process exits with code 0, `E2E_DATA_DIR` is empty, no `postmaster.pid` remains under `TMPDIR`, and every recorded `dns.lookup` call has an IP literal as first argument (`net.isIP(arg) !== 0`), `dns.promises.lookup` none; `DEFAULT_PORT` is `39080`, `DEFAULT_CONTROL_PORT` `39081`

#### Scenario: A signal during the start
- **WHEN** the file is spawned with free ports and temp `E2E_DATA_DIR` and `TMPDIR`, and SIGTERM is sent once a `ursitoare-e2e-*` directory appears in `E2E_DATA_DIR` (up to 90 s)
- **THEN** the exit code is 0, stdout is empty, `E2E_DATA_DIR` is empty and no `postmaster.pid` remains under `TMPDIR`

#### Scenario: Bad variable or busy port
- **WHEN** the file is spawned with `E2E_PORT=abc`, and with `E2E_PORT` set to a port another listener holds
- **THEN** each exits with code 1 and prints `e2e stack failed: <code> <message> <JSON of details>` to stderr, which names `E2E_PORT` for the first and holds `STACK_ENGINE_FAILED` and `EADDRINUSE` for the second, and nothing is left listening or under `TMPDIR`

### Requirement: fresh_state resets the stack on the fake profile
`e2e/conftest.py` SHALL provide a function-scoped `fresh_state` fixture that, when it runs, reads `E2E_PROFILE` (default `fake`) and `E2E_CONTROL_URL` (default `DEFAULT_CONTROL_URL`, `http://127.0.0.1:39081`), posts `/reset` to it, with no body and no `Content-Type`, unless the profile is `stack`, and raises `RuntimeError` naming the URL, with `error.code` and `error.details` when the body is the engine envelope, unless the answer is 2xx.

#### Scenario: Faults and state cleared before a test
- **WHEN** a test installs a fault `GET /health` 503 through a fixture and then requests `fresh_state` before loading `/health`
- **THEN** the page load answers 200; without `fresh_state` it answers 503 with `error.code` `"FAULT_INJECTED"`; the fault is deleted again in the fixture teardown

#### Scenario: Stack profile and unreachable control
- **WHEN** with `E2E_PROFILE=stack` and `E2E_CONTROL_URL=http://127.0.0.1:1` the fixture is requested, and in another test with profile `fake` and the same URL
- **THEN** the first returns without any request; the second raises `RuntimeError` whose message contains the URL

### Requirement: The browser gate sees the database and not the control routes
The served engine SHALL report `checks.db` `"ok"` on `GET /health` and SHALL answer 404 `NOT_FOUND` to the control paths on its own port; each test of `e2e/test_e2e_stack.py` SHALL take the `e2e_profile` fixture and run on the fake profile (unset means `fake`), with no `pytest.skip` (requirement FB-001 below; a test that needs the real stack is marked `stack`, which the default `-m "not stack"` deselects).

#### Scenario: Health and control paths in the browser gate
- **WHEN** `e2e/test_e2e_stack.py` loads `<base_url>/health` and sends `POST /reset`, `POST /faults` and `DELETE /faults` to `<base_url>`, each as a bodyless `urllib.request.Request(url, method=...)` (no `data`, no `Content-Type`), reading status and body from the caught `urllib.error.HTTPError`
- **THEN** health is 200 with `checks.db` `"ok"` and the three others answer 404 with `error.code` `NOT_FOUND`; a refused connection (`urllib.error.URLError`) or any other status fails the test; `e2e/test_health.py::test_health_reports_ok` still passes unchanged

### Requirement: e2e/test_e2e_stack.py calls no pytest.skip — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: e2e/test_e2e_stack.py calls no pytest.skip
- **WHEN** e2e/test_e2e_stack.py is read, and its tests run on the fake profile (E2E_PROFILE unset)
- **THEN** the file holds no pytest.skip or pytest.xfail call and no skip, skipif or xfail marker, every one of its tests runs and passes, and nothing else in the file changes
