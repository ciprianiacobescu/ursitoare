# engine-runtime Specification

## Purpose
The process skeleton of every Ursitoare unit (its configuration is the `engine-config` capability): injected time and ids, a redacting logger, a tracer port, one error envelope, request ids, health checks and graceful shutdown.

## Requirements

### Requirement: Injected clock and time-sortable ids
`src/core` SHALL export `LogLevel`, `Clock`, `systemClock`, `fixedClock(iso)`, `IdSource`, `createIds(clock, randomBytes?)`, `systemIds` and `sequentialIds(seed)`, where `IdSource.next(prefix)` returns `${prefix}_${uuidv7}` and the ids of one source sort in creation order.

#### Scenario: UUIDv7 layout
- **WHEN** `createIds(fixedClock("1970-01-01T00:00:00.000Z"), size => new Uint8Array(size).fill(255)).next("req")` is called twice
- **THEN** the results are `"req_00000000-0000-7000-bfff-ffffffffffff"` and `"req_00000000-0000-7001-bfff-ffffffffffff"`; two `now()` calls of one fixed clock return different `Date` objects of the same instant, and `fixedClock("not a date")` throws `RangeError`

#### Scenario: Ordering, rollover and a clock that goes backwards
- **WHEN** one source is called 4097 times under one fixed clock, and in other tests the clock moves forward 1 ms, or back 1 s, between two calls
- **THEN** the 4097th id has timestamp field `000000000001` and counter `000`, and each later id is greater than the earlier one

#### Scenario: Prefix, system and sequential sources
- **WHEN** `next("")`, `next("Run")`, `next("a_b")` and `systemIds.next("run")` are called, and `sequentialIds(1)` gives `next("run")` then `next("req")`
- **THEN** the first three throw `RangeError`; the fourth matches `^run_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`; the last two are `"run_00000000-0000-7000-8000-000000000001"` and `"req_00000000-0000-7000-8000-000000000002"`; `sequentialIds(-1)` and `sequentialIds(1.5)` throw `RangeError`

### Requirement: Redacting structured logger
`createLogger({ level, destination?, clock? })` SHALL return a pino logger that writes one JSON line per record with an ISO `time` from the clock, drops records below `level`, replaces every value at a `REDACT_PATHS` path with `"[REDACTED]"`, and logs an `err` as `type`, string `code` and stack frames only and a request as method and route pattern, never its URL.

#### Scenario: Line shape and level filter
- **WHEN** a logger with level `"warn"` and `fixedClock("2026-10-25T08:50:00.000Z")` logs `info("a")` and `warn({ user: "alice" }, "b")`
- **THEN** the destination got one line with `time` `"2026-10-25T08:50:00.000Z"`, `msg` `"b"`, `user` `"alice"`, `service` `"ursitoare"`; level `"silent"` writes nothing

#### Scenario: Secrets are redacted at the listed paths
- **WHEN** a record carries `headers.authorization`, `headers.cookie`, `headers["set-cookie"]` and the keys `password`, `secret`, `token`, `apiKey`, `credential` at depth 0 to 3
- **THEN** each such value is `"[REDACTED]"`, no original value appears, a sibling `user` is unchanged

#### Scenario: Errors and requests are logged without their content
- **WHEN** `logger.error({ err: Object.assign(new Error("x\nhunter2"), { detail: "hunter2", code: "23505" }) }, "failed")` and `logger.info({ req: { method: "GET", url: "/t/tok-Q9z?x=1", routeOptions: { url: "/*" } } }, "r")` are logged, and a request whose `routeOptions.url` is undefined
- **THEN** the first line has `msg` `"failed"` and `err` with `type` `"Error"`, `code` `"23505"` and a `stack` string, no `message`, `detail` or `hunter2` (an `err` without a string `code` has no `code` key); the request line has `req` `{ method: "GET", url: "/*" }`, the other `url` `"unmatched"`, and neither holds `tok-Q9z`

### Requirement: Tracer port
`buildServer` SHALL start one `Tracer` span named `http.request` per request and end it when the response is sent, whatever the tracer does; `noopTracer` does nothing.

#### Scenario: One span per request
- **WHEN** a recording tracer is given to `buildServer` and `GET /health` then `GET /nope` are served
- **THEN** it holds two spans named `http.request`, each ended once, with attributes `http.method` `"GET"`, `http.route` `"/health"` and `http.status_code` `200`, then `"GET"`, `"unmatched"` and `404`

#### Scenario: A failing tracer does not break requests
- **WHEN** `startSpan` throws on every call
- **THEN** `GET /health` returns 200 and a warn line `tracer failed` is logged

### Requirement: Uniform error envelope
`buildServer(deps)` SHALL answer every application error with `{ "error": { "code", "message", "details"? } }`: an `ApiError` with its own status, code and details, an unknown route 404 `NOT_FOUND`, a schema failure 400 `VALIDATION_FAILED` with field details, anything else 500 `INTERNAL`, with the fixed messages of design.md decision 4.

#### Scenario: ApiError
- **WHEN** a handler throws `new ApiError(409, "FLOW_EXISTS", "Already exists", { id: "f1" })`
- **THEN** the response is 409 with `error` `{ "code": "FLOW_EXISTS", "message": "Already exists", "details": { "id": "f1" } }`; without details the body has no `details` key; `new ApiError(200, "X", "m")` throws `RangeError`

#### Scenario: Schema failure
- **WHEN** a route with a body schema of integers `a` and `b`, both required, `additionalProperties: false`, receives `{"a":"x","b":1}`, `{"a":1}` and `{"a":1,"b":1,"z":1}`
- **THEN** each response is 400 `VALIDATION_FAILED` with one `details.fields` entry `{ field, message }`: `body/a` "must be integer", `body/b` "must have required property 'b'" and `body/z` "must NOT have additional properties"; a bad query or path parameter reports `querystring/n` or `params/id`

#### Scenario: Malformed, oversized and wrongly typed bodies
- **WHEN** a JSON route receives `{bad` as `application/json`, a 1,048,577-byte JSON body, and `application/xml`
- **THEN** the responses are 400 `VALIDATION_FAILED` with `fields` `[{ field: "body", message: "malformed JSON" }]`, 413 `PAYLOAD_TOO_LARGE` and 415 `UNSUPPORTED_MEDIA_TYPE`; `toErrorResponse` of an error with `statusCode` 429 gives status 429 and `BAD_REQUEST`

#### Scenario: Unknown error leaks nothing
- **WHEN** one handler throws `new Error("db password=hunter2")` and another throws an error with `detail: "Failing row contains (hunter2)"` and `code: "23505"`
- **THEN** each response is 500 `INTERNAL` ("Internal server error") without `hunter2`; no log line contains `hunter2`; each error line has the request id as `reqId`, and the second has `err.type` `"Error"` and `err.code` `"23505"`

### Requirement: Request ids
`buildServer` SHALL use the `x-request-id` request header as the request id only when it matches `^[A-Za-z0-9._-]{1,64}$`, otherwise generate `ids.next("req")`, and SHALL echo the id in the `x-request-id` header of every response, errors included.

#### Scenario: Well-formed header is kept
- **WHEN** `GET /probe?token=abc` (a route the test adds) carries `x-request-id: client-1.a_b` on a server with a capturing logger
- **THEN** the response header is `client-1.a_b`, its log lines have `reqId` `"client-1.a_b"`, the `incoming request` line has `req.url` `"/probe"`, and no line contains `abc`

#### Scenario: Paths that carry a token are not logged
- **WHEN** the test adds `GET /*` and requests `GET /t/tok-Q9z?x=1`
- **THEN** the `incoming request` line has `req.url` `"/*"` and no log line contains `tok-Q9z`

#### Scenario: Missing or malformed header is replaced
- **WHEN** ids come from `sequentialIds(1)` and three requests arrive with no header, with `bad id!`, and with a 65-character value
- **THEN** the response ids end in `...000000000001`, `...000000000002` and `...000000000003` with prefix `req_`

#### Scenario: Errors carry the id
- **WHEN** `GET /nope` and a throwing route are requested with `x-request-id: abc-1`
- **THEN** the 404 body is `{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }` and both responses have the header `x-request-id: abc-1`

### Requirement: Health endpoint and check registry
`GET /health` SHALL return 200 `{ status: "ok", version, checks }` when every registered check returns `"ok"`, else 503 `{ status: "fail", version, checks }`; a check that throws, returns another value or times out counts as `"fail"`, and `checks` holds only `"ok"` or `"fail"` per name.

#### Scenario: No checks registered
- **WHEN** the registry is empty and `GET /health` is requested with version `"1.2.3"`
- **THEN** the response is 200 with `{ "status": "ok", "version": "1.2.3", "checks": {} }` and `cache-control: no-store`, and `healthPayload("1.2.3")` still returns exactly `{ status: "ok", version: "1.2.3" }`; with `db` and `cache` both resolving `"ok"` it is 200 with `checks` `{ "db": "ok", "cache": "ok" }`

#### Scenario: The health request log holds the route only
- **WHEN** `GET /health?token=abc` is requested on a capturing logger
- **THEN** the response is 200, the `incoming request` line has `req.url` `"/health"`, and no line contains `abc`

#### Scenario: A check fails, throws, times out or returns junk
- **WHEN** `db` resolves `"fail"`, or throws `new Error("postgres://u:pw@h/db refused")`, or never settles with `healthCheckTimeoutMs` 10, or resolves `"maybe"`, while `cache` resolves `"ok"`
- **THEN** each case returns 503 with `status` `"fail"`, `checks` `{ "db": "fail", "cache": "ok" }` and no `pw`, and a warn line names `db` and the reason (`returned_fail`, `threw`, `timeout`, `invalid_result`), not the error message

#### Scenario: Registration rules and shared runs
- **WHEN** a name is registered twice, `"DB!"` is registered, a check is added after `buildServer` returned, or two `registry.run` calls overlap
- **THEN** the first two throw `HealthCheckError` `HEALTH_CHECK_DUPLICATE` and `HEALTH_CHECK_NAME_INVALID`, the late check shows in the next response, and overlapping runs call each check once

### Requirement: Graceful shutdown with a bounded drain
`installGracefulShutdown(options)` SHALL, on the first SIGTERM, SIGINT or `shutdown(reason)`, close the server once, exit 0 if it closes within `drainTimeoutMs`, else force-close the remaining connections and exit 1; a request reaching the closing server still gets the error envelope, and `dispose()` removes the signal listeners.

#### Scenario: Clean drain
- **WHEN** a fake signal source emits `SIGTERM` then `SIGINT` and `close` resolves
- **THEN** `close` and `exit(0)` ran once and one info line `shutting down` with `reason` `"SIGTERM"` was logged

#### Scenario: Direct call, repeats and dispose
- **WHEN** `await shutdown("test")` is followed by `await shutdown("again")` and a `SIGTERM`; on another installation `dispose()` is called twice, then `SIGTERM` is emitted
- **THEN** the first call resolves `undefined` after `exit(0)`, the `shutting down` line has `reason` `"test"`, and `close` and `exit` ran once in all; on the other, `signals.off` ran once per signal with the functions given to `on`, no listener is left, and `close` and `exit` never ran

#### Scenario: Drain deadline or failed close
- **WHEN** `close` never settles with `drainTimeoutMs` 20, or rejects with `new Error("pw=hunter2")`
- **THEN** `forceClose` and `exit(1)` run once each (only `exit(1)` without `forceClose`), `shutdown` resolves, and the log has a warn line `drain deadline exceeded` or an error line `shutdown failed` with `err.type` and no `hunter2`

#### Scenario: Requests during the drain
- **WHEN** a listening `buildServer` server has a route `/slow` held by the test, a `node:net` socket sends `GET /slow`, `shutdown("test")` runs with `close` = `server.close()` and `drainTimeoutMs` 5000, and once a new connection is refused the socket sends `GET /nope`
- **THEN** `/nope` gets 404 `NOT_FOUND` in the envelope with `x-request-id` and `connection: close` (not Fastify's 503 body), `/slow` answers 200 once released, and `exit(0)` runs after both

### Requirement: Composition root keeps the bootstrap contracts
`src/main.ts` SHALL keep exporting `VERSION` and `startServer(port, host)` (no signal handler, no environment read) and export `main(deps?)`, which loads the config, builds the server, listens and installs the graceful shutdown; on a startup failure it writes exactly one fatal line `{ code, msg, variable?, reason?, host?, port? }` at any log level, calls `exit(1)` and resolves `null`. `RunningServer.url` and the `url` of the `ursitoare listening` line are `http://<host>:<bound port>`, never `publicBaseUrl`.

#### Scenario: startServer serves health and closes
- **WHEN** `startServer(0, "127.0.0.1")` is awaited and `GET ${url}/health` is fetched
- **THEN** the `url` is `http://127.0.0.1:<port>`, the response is 200 with `{ "status": "ok", "version": VERSION, "checks": {} }`, `typeof VERSION` is `"string"`, the `SIGTERM` and `SIGINT` listener counts of `process` are unchanged, and after `close()` a new connection is refused

#### Scenario: main starts and stops
- **WHEN** `main` runs with `loadConfig` returning a port-0 config (`publicBaseUrl` `https://ursitoare.example.com`), a capturing log destination, an `EventEmitter` signal source and an `exit` spy, then `SIGTERM`
- **THEN** `main` resolves a running server whose `/health` answers 200 and whose `url` is `http://127.0.0.1:<port>`, the `listening` line has `host` `"127.0.0.1"`, that `port` and that `url`, and `exit` gets `0`; with `host` `"0.0.0.0"` the `url` is `http://0.0.0.0:<port>`

#### Scenario: Startup failures refuse start
- **WHEN** `main` runs with `loadConfig` throwing `ConfigError("CONFIG_SECRET_EMPTY", "URSITOARE_ENGINE_KEY_FILE", "file is empty")`, or throwing `new Error("boom")`, or with the port of a listening server (run at `logLevel` `"info"` and again at `"silent"`)
- **THEN** `main` resolves `null`, `exit` gets `1` and the destination holds exactly one fatal line: for the first `code` `"CONFIG_SECRET_EMPTY"`, `variable` `"URSITOARE_ENGINE_KEY_FILE"`, `msg` `"startup failed: URSITOARE_ENGINE_KEY_FILE: file is empty"` and no port opened; for the second `code` `"STARTUP_FAILED"`, `msg` `"startup failed"` and no `boom`; for the third, at both levels, `code` `"EADDRINUSE"`, `host` `"127.0.0.1"` and `port` the busy port
