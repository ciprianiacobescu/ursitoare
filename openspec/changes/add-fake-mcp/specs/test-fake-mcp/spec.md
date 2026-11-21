## Purpose

A loopback MCP server for the tool adapter tests, its contract suite and the e2e part `55-mcp`.

## ADDED Requirements

### Requirement: The fake answers discovery, listing and calls in the modern era
`startFakeMcp` SHALL listen on `127.0.0.1` port 0 and answer a modern message (`params._meta` holds `io.modelcontextprotocol/protocolVersion` `2026-07-28`) posted to its path: `server/discover` (`resultType`, `supportedVersions`, `capabilities`, server info, `ttlMs`, `cacheScope`), `tools/list` in pages of `pageSize`, the tools as given, and `tools/call` (`content`, plus `structuredContent` and `isError` when the result has them). `FAKE_MCP_TOOLS` SHALL be `find_vendor` and `log_note` (design.md § Decisions 12). An unknown tool, a non-object `arguments` and an invalid cursor SHALL be JSON-RPC `-32602` errors with HTTP 200.

#### Scenario: Discovery and paged listing carry the fixtures U54 needs
- **WHEN** rows D1, D2, L1, L2 and L3 of test-plan.md § Discovery rows are sent
- **THEN** D1 is 200 with `supportedVersions` `["2026-07-28","2025-11-25"]`, `ttlMs` 60000, `cacheScope` `private`, D2 lists `["2026-07-28"]`; L1 lists `T_FIND`, `T_LOG`; the L2 pages are `[T_FIND]` + `page-1`, `[T_LOG]` + `page-2`, `[HDR_ENTRY]` (`x-mcp-header` and the hints verbatim) + no cursor; each L3 cursor is 200 `-32602` `Invalid cursor`

#### Scenario: Calls answer both tools, errors and structured content
- **WHEN** rows C1 to C8 of test-plan.md § Call rows are sent
- **THEN** each answer equals its row: `V-ACME` or `V-UNKNOWN`, `noted: hello`, a sentinel `mcp-name` accepted, `-32602` for `nope` and `[]`, `isError` present as `true` and `false` exactly when the result sets it

### Requirement: A modern request is refused with the protocol's own errors
For a modern message the fake SHALL answer, in this order, 400 `-32020` when `mcp-protocol-version` is absent or differs from `_meta`, when `mcp-method` is absent or differs from `method`, and for `tools/call` when `mcp-name` is absent or, once its `=?base64?...?=` sentinel is decoded, differs from `params.name`; then 400 `-32022` with `data` `{ supported, requested }` for a `_meta` version other than `2026-07-28` (`supported` `["2026-07-28"]`, plus `"2025-11-25"` in era `dual`); then 404 `-32601` for an unknown method; a message with no `id` SHALL be 202 and empty once those checks pass. `decodeMcpName` SHALL return a plain value unchanged, a valid sentinel decoded and `null` for an invalid one.

#### Scenario: Header and version mismatches and unknown methods are refused
- **WHEN** rows H1 to H10, N1 and N2 of test-plan.md § Modern refusal rows are sent, and the rows of test-plan-legacy.md § Wire rows are called
- **THEN** H1 to H7 are 400 `-32020` with their messages, H8 400 `-32022` (`requested` `1900-01-01`, `2025-11-25`), H9 `supported` `["2026-07-28"]`, H10 404 `-32601`, N1 202 empty, N2 400 `-32020` with `id` null; `decodeMcpName` gives `find_vendor`, `Hello, 世界`, `""` and `null` for the four invalid rows

### Requirement: Transport refusals come first and the key is required
The fake SHALL answer a `Host` (lower-cased) other than `mcp.fake.test` or `127.0.0.1:<port>` 421 `{"error":"misdirected_request"}`, a path (query removed) other than `path` 404 `{"error":"not_found"}`, a method but POST 405 `{"error":"method_not_allowed"}` with `allow: POST`, and, when `keyHeader` is not null, an absent or empty key header 401 `{"error":"unauthorized"}`, each of the first three before the key check; the key's value SHALL never be checked. A body that is not JSON SHALL be 400 `-32700`, one that is not a message 400 `-32600` (`id` null).

#### Scenario: Host, path, method, key and body refusals
- **WHEN** rows T1 to T10 of test-plan.md § Transport rows are sent
- **THEN** each answer equals its row: 421, 200, 404, 405 (`allow: POST`), 401 for a missing or empty key, `authorization` alone 401 with `{ keyHeader: "X-Api-Key" }`, 200 with `{ keyHeader: null }`, `-32700` and `-32600` for the four bodies, and 421, 405, 404 when the key is also missing

### Requirement: The legacy eras answer a handshake, with or without a session
In era `legacy` or `dual` the fake SHALL answer a message with no modern `_meta`: `initialize` with the requested version when it is `2025-06-18` or `2025-03-26`, else `2025-11-25`, plus `mcp-session-id` `fake-mcp-session-<n>` when `session` is true; every other message needs `mcp-protocol-version` of a legacy version (else 400 `-32600`) and, with `session`, a known session (400 `-32600` when absent, 404 `-32600` when unknown); `tools/list` and `tools/call` answer with no `resultType`, `ttlMs` or `cacheScope` and with no prior `initialize`. A modern message never needs or gets a session. Era `modern` SHALL answer a legacy message 400 `-32020` naming `2026-07-28`; era `legacy` a modern one 400 with an empty body (no `content-type`).

#### Scenario: A legacy handshake without a session, and the stateless calls
- **WHEN** rows G1 to G7 of test-plan-legacy.md § Legacy rows are sent
- **THEN** `initialize` echoes `2025-11-25`, `2025-06-18`, `2025-03-26` and answers `2025-11-25` to `2024-11-05`, with no session header; the notification is 202; `tools/list` and `tools/call` answer on a fresh fake with no `resultType`; a missing, modern or old version header is 400 `-32600`; unknown method, tool and `server/discover` are 200 `-32601`, `-32602`, `-32601`

#### Scenario: Sessions, and each era answers the other
- **WHEN** rows X1 to X6 of test-plan-legacy.md § Session rows and E1 and E2 of § Era rows are sent
- **THEN** each answer equals its row: `fake-mcp-session-1` then `-2`, 400 `Missing Mcp-Session-Id header`, 404 `Unknown session`, 200, no session header on modern answers, a restart at `-1` after `reset()`, 400 `-32020` for legacy messages on `era: "modern"`, the empty 400 for D1 on `era: "legacy"`

### Requirement: SSE answers carry a progress event first
With `sse` true the fake SHALL answer a message whose answer is a 200 JSON-RPC body (a result, a 200-status error, an `initialize` result) as `text/event-stream` with `cache-control: no-cache`, no `content-length` and two `event: message` events, `PROG` then the response; every other answer (HTTP errors, 202, injected failures) SHALL stay as without `sse`.

#### Scenario: SSE answers and the answers that stay JSON
- **WHEN** rows S1 to S5 of test-plan-legacy.md § SSE rows are sent
- **THEN** S1, S3 and S4 are 200 `text/event-stream` with the two events of their rows; S5 is 401, 400 `-32020`, 202 empty and 502 `{"error":"injected_failure","status":502}`, the bodies `application/json`

### Requirement: Every request is recorded and secrets never are
The fake SHALL record each request that reaches it, refused ones included, before it answers: `seq` from 1, `method` (`""` when the body is not a message), `era` (`modern`, `legacy` or `null`), the lower-cased `host`, `path` without its query, every header by lower-case name, the SHA-256 hex of the body, `status`, `callHeader` (`x-ursitoare-call`) and `toolName` (`params.name` of a `tools/call`). The values of the key header, `authorization`, `cookie` and `proxy-authorization` SHALL be recorded as `[credential]` and that of `mcp-session-id` as `[session]`. `requests()` SHALL return copies, filtered by `method` when given, and work after `close()`.

#### Scenario: Records hold the facts and none of the secrets
- **WHEN** rows Q1 to Q6 of test-plan-legacy.md § Record rows are sent to one fake and `requests()` and its filters are read, a returned header is mutated and `requests()` is read again; a `{ session: true }` fake handles X1 and X2
- **THEN** the six records equal their rows (statuses 200, 421, 405, 401, 400, 200; `era` `modern`, `modern`, `null`, `modern`, `null`, `legacy`); the filters give `seq` 1, and 3 and 5; the mutation changes nothing; `requests()` as text holds none of `k-mcp-7f3a`, `secret-cookie`, `Basic pp`, `sess-abc`, `fake-mcp-session-1`

### Requirement: Knobs, reset and close are checked and behave as one lifecycle
`failNext(method, status, times)` SHALL make the next `times` (default 1) messages with that method, once the first four checks have passed, answer `status` with `{"error":"injected_failure","status":<status>}` (recorded); a later call for the method replaces it. `setTools` SHALL replace the served tools. `reset()` SHALL empty records and failures, forget sessions, restart `seq` and the session counter and restore the start tools. `close()` SHALL be idempotent and release the port. A bad option or argument SHALL throw `RangeError` and change nothing (`startFakeMcp`: before any listener exists).

#### Scenario: Failure and surface knobs, reset, close and argument checks
- **WHEN** rows K1 to K5 and A1 to A15 of test-plan-legacy.md § Knob and argument rows run
- **THEN** each answer equals its row: K1 503, 200, 503, 200; K2 401 (not consumed), 502, 200, 429, 200; K3 400 injected; K4 the replaced tools, then no records, the start tools and `seq` 1; K5 `ECONNREFUSED`; A1 to A7 reject with their messages and the `TCPServerWrap` count is unchanged; A8 to A15 throw theirs and change nothing

### Requirement: The contract suite runs against a base URL
`fakeMcpContract(baseUrl, { host, path, key })` SHALL return the 8 checks of test-plan-legacy.md § Contract rows (7 when `key` is null: no `a missing key is refused`), sent to `baseUrl` with `Host: <host>` and the key header; a failing check, an unreachable URL included, SHALL reject with an `assert.AssertionError` whose message starts with the check's name and a colon.

#### Scenario: The suite passes on the fake and fails on the broken targets
- **WHEN** the checks are built for the targets of the table in test-plan-legacy.md § Contract rows and each `run()` is awaited
- **THEN** the 8 names equal the list in order; all resolve on the dual fake; only `a legacy initialize answers its handshake` rejects on the modern-only fake; the six modern checks reject on the legacy-only fake; 7 names resolve with `key: null`; only `a missing key is refused` rejects on M1; all 8 reject on `http://127.0.0.1:1`

### Requirement: The mcp part registers its upstream, resets with the stack and closes
The part `mcp` (file `parts/55-mcp.ts`, after `52-tool-servers`) SHALL, on `start`, resolve `egressApi(ctx.handles)` before opening any listener, start the fake (era `dual`), register `FAKE_MCP_HOST` to its origin on the fake egress and return `env` `{}` and `api` `{ mcp }`; on `beforeReset` call `mcp.reset()` (records, failures, `setTools` changes and sessions go; the listener, the upstream registration and the vault credential stay) and seed nothing; close the fake on `close`; and work in a crash cluster with no engine. `mcpApi` SHALL throw `E2eStackError` `STACK_PART_MISSING` when the part has not started. `test/support/README.md` SHALL describe the `fake-mcp/` row with owner `add-fake-mcp` and the part `55-mcp`.

#### Scenario: A credentialed service reaches the fake, reset, crash cluster and README
- **WHEN** rows P1 to P5 of test-plan-legacy.md § Part rows run and `test/support/README.md` is read
- **THEN** each row holds: P1 `STACK_PART_MISSING` `{ part: "egress" }` with no listener; P2 two calls reach the fake with `authorization` recorded `[credential]` and the service with no credential is 502 `bad gateway: vault error`; P3 `beforeReset` empties the records and restores the tools while the proxy still routes, and `mcpApi(new Map())` throws `{ part: "mcp" }`; P4 the file text and order; P5 the crash cluster serves D1 and refuses after `close()`; exactly one README line starts with ``| `fake-mcp/` | `add-fake-mcp` |`` and equals the row, none holds `add-mcp-client`
