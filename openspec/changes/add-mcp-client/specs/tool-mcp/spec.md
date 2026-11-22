## Purpose

The MCP client of the tool registry: discovery, surfaces and `mcp` calls.

## ADDED Requirements

### Requirement: The wire form of an MCP request and reply is fixed
`mcpBody(id, method, params, version)` SHALL return the UTF-8 of `JSON.stringify` of `{ jsonrpc: "2.0", id?, method, params }` in that key order (`id` absent when null), `params` in the given order with its member `arguments` sorted by UTF-16 code unit at every depth (`__proto__` stays own) and, for `2026-07-28`, a last member `_meta` (protocol version, `MCP_CLIENT_INFO`, empty capabilities). `mcpHeaders` SHALL return lower-case `accept`, `content-type`, `mcp-protocol-version`, for `2026-07-28` `mcp-method` and, for a non-null `name`, `mcp-name` (`mcpNameHeader`: plain for 0x21-0x7e, else `=?base64?<UTF-8 base64>?=`), and `idempotency-key` when given. `readMcpReply(response, id)` SHALL read an SSE body or one JSON object and answer the result of the message with that `id` (or an `error` with id null): `rpc_error`, `not_json` or `no_reply`.

#### Scenario: Body, header and reply vectors
- **WHEN** rows W1 to W12, H1 to H3, N1 to N5, P1 to P11 of `test-plan-wire.md` run
- **THEN** each row gives its value: W1 is 305 bytes, sha256 `884bf0ec...bba28`; W3 (`server/discover`) 249 bytes `76269e46...64c3f`; W2 (legacy) has no `_meta`; W5 no `id`; W9 puts `__proto__` between `B` and `a`; P2 is `rpc_error` -32602, P6 (progress event, then the result) `{ b: 2 }`

### Requirement: mcpCallAdapter builds one tools/call POST and maps each answer
`build(call, args, idemKey)` SHALL answer a `POST` of `call.endpoint` with `mcpHeaders("tools/call", call.name, call.protocolVersion, idemKey)` and `mcpBody(1, "tools/call", { name, arguments }, call.protocolVersion)` (the body never depends on `idemKey`), and `{ ok: false, reason: "args_not_object" }` for non-object arguments. `answer` SHALL check in order: a status outside 200-299 `upstream` `status`; `rpc_error` `upstream`; `not_json`, `no_reply` `response`; `resultType` `input_required` `response` `input_required`, any value but `complete` `result_type`; `isError: true` `upstream` `tool_error`; then `structured` gives `structuredContent` (an object, else `not_object`) and `text` gives `{ text }` of the `text` items joined by `\n`. `status` is null but for `status`. A 2xx with an empty body (a 204 included) is `response` `not_json`, because a `tools/call` request always has one reply message; this differs on purpose from `httpCallAdapter.answer` (`add-http-openapi-tools`), which reads an empty 2xx as `{ ok: true, output: {} }`.

#### Scenario: A call is one POST with fixed bytes and each answer maps
- **WHEN** rows B1 to B5 and A1 to A10 of `test-plan-wire.md` run
- **THEN** B1 is `POST /mcp` with W1's bytes, B2 (key `k_1`) the same plus `idempotency-key`, B4 `args_not_object`; A1 answers `{ vendor_id: "V-ACME", status: "active" }`, A2 `{ text: "noted: hello\nsecond" }`, A3 `upstream` `status` 500, A4 `rpc_error`, A5 (200 `<html>`, 204 empty) `not_json`, A8 `tool_error`, A9 `not_object`; no result contains `boom secret` or `Unknown tool`

### Requirement: A server's hints never decide an effect or retry safety
`mcpSurface(tools, at, overlay)` SHALL give every tool effect `write`, `untrusted_result` true and `unsafe_to_retry` true, whatever its annotations say; only its overlay entry replaces `effect`, `untrusted_result`, `unsafe_to_retry`, `data_class` or the local `name`, each alone. It SHALL record the boolean `readOnlyHint`, `destructiveHint`, `idempotentHint` present as `call.hints` `{ readOnly?, destructive?, idempotent? }` (U47b's member of `McpCallSpec`, digested when present, so a changed hint is drift), and `call` `{ kind: "mcp", endpoint, name, protocolVersion, output[, hints] }` (`structured` with the server's `outputSchema`, else `text` with `MCP_TEXT_OUTPUT_SCHEMA`).

#### Scenario: find_vendor with readOnlyHint is write until the overlay says read
- **WHEN** rows M1 to M3 of `test-plan.md` run and each surface goes through `checkAdapterSurface("mcp", ...)`
- **THEN** M1 gives `find_vendor` `write`, `untrusted_result` true, `unsafe_to_retry` true, `call.hints` `{ readOnly: true }`, and `log_note` (`idempotentHint: true`) `write`, `unsafe_to_retry` true; M2 (overlay `read`) gives `find_vendor` `read`, `unsafe_to_retry` still true; M3 sets name `lookup_vendor`, both flags false

### Requirement: A tool that is left out is reported with its reason
`mcpSurface` SHALL normalise `inputSchema` and `outputSchema` as design 2 lists (drops: draft-07 and 2020-12 `$schema`, `pattern`, `$id`, `$anchor`; `schema_invalid`: `patternProperties`, an unresolvable `$ref`, `$dynamicRef`, `$recursiveRef`, an input property `url_host`), then leave a tool out, first match winning, for `skipped` (overlay `skip: true`), `x_mcp_header` (at any depth of `inputSchema`), `name_invalid`, `schema_invalid` or `output_not_object`, reporting `{ name, reason }` in `excluded`. `name` is the listed name with each character outside U+0020 to U+007E replaced by `?`, cut to 128 characters (`""` for a non-string), so every answer is storable as `jsonb`. An overlay entry for an unlisted name is skipped as `not_listed`; a `description` over 2,000 characters or not well-formed is left out of the tool, which stays, and listed as `description`. Every lookup by a server tool name uses `Object.hasOwn`. It SHALL throw `TOOLS_REFUSED` `name_collision` (`details.names`), `no_tools` (`details.excluded`: the JSON text of `excluded`) or `too_many_tools` (over 1,000 listed tools, or over 100 not skipped), and `TOOLS_INVALID` `{ field: "tools/<key>[/<member>]", reason }` for a malformed overlay entry or over 100.

#### Scenario: Left-out tools are listed and overlays checked
- **WHEN** rows M4 to M7, M9, M10, M10b and M14 to M17 of `test-plan.md` run
- **THEN** M4 returns `find_vendor` and `excluded` `[{ name: "route_ticket", reason: "x_mcp_header" }]`; M5 throws `no_tools` with that `details.excluded`; M6 gives `a?b` for `a\u0000b`, `?` for `é`, 128 `x` for a 300,000-character name; M7 `name_collision` (`names` `find_vendor,Find.Vendor`); M10b `gone_tool` `not_listed`; M14 tools `constructor`, `to_string`, `proto`; M15 150 listed, 50 `skipped`: 100 tools; M16 a 2,001-character description: `description`, the tool stays; M17 1,001 tools `too_many_tools`

#### Scenario: Schemas are normalised first
- **WHEN** rows M8 and M11 to M13 of `test-plan.md` run
- **THEN** M8 gives `schema_invalid` and `output_not_object`; M11 (draft-07, 2020-12 `$schema`) gives the undeclared schemas' surface; M12 (tuple `items`, 2019-09, a non-string `$schema`) `schema_invalid`; M13 drops `pattern: "^(a+)+$"` and `$id` (two compiles of the output pass) and gives `schema_invalid` for `patternProperties`, a missing or remote `$ref`, `$dynamicRef` and an input property `url_host`

### Requirement: Registration stores the endpoint once and refuses what the gateway would
Migration `0540_mcp_servers.sql` SHALL create `ursitoare.mcp_server (tenant_id, tool_server_id, endpoint, registered_at)` with primary key `(tenant_id, tool_server_id)`, a foreign key to `tool_server`, forced row level security, `SELECT` and `INSERT` only for the application role, and the check `char_length(endpoint) BETWEEN 1 AND 1024 AND endpoint ~ '^/[\x21-\x7e]*$' AND endpoint !~ '[?#]'`. `registerMcpServerTx` SHALL parse `url` with the WHATWG parser and throw `TOOLS_INVALID` `{ field: "url", reason }` for `not_url`, `scheme` (not `https`, or `http` without `local`), `credentials`, `query` (a `?` in the text), `path` (a `#`, or an endpoint over 1,024 characters) or `validateOrigin`'s reason; else it SHALL call `registerAdapterServerTx` (`mcp`, `surface` null) and insert the endpoint in one transaction. `mcpEndpointOf` SHALL answer the stored endpoint or null.

#### Scenario: The endpoint is immutable and a URL becomes an origin and an endpoint
- **WHEN** rows G1 to G4 (database) and U1 to U14 (`registerMcpServerTx`, `mcpEndpointOf`) of `test-plan.md` run
- **THEN** the good endpoints insert, the bad ones fail `23514`, a second row for a server `23505`, an unknown server `23503`, tenant B's row on A's connection `42501`, `UPDATE` and `DELETE` `42501`, ledger `540` `mcp_servers`; `https://mcp.fake.test` gives endpoint `/`, `.../mcp?x=1` is `query`; a taken id is `TOOLS_EXISTS` (one `mcp_server` row), a refused URL leaves no row

### Requirement: Discovery is decided, recorded and sent one request at a time
`discoveryRequest(ctx, principal, egress)` SHALL be `{ principal: userEntity(principal).uid, action: "register_tool_server", resource: tenantEntity(ctx.tenantId).uid, context: {}, entities: [userEntity(principal), tenantEntity(ctx.tenantId)], egress }`. `discoverMcp` SHALL resolve the service target (null: `credential_missing`, no decision), then for each request (`server/discover`; for a legacy server `initialize`, `notifications/initialized`; then `tools/list`, at most 10 pages) check it with `policy.check`, record the decision with `recordDecisionOwnTx` (errors make it a deny) and only for a recorded `allow` with a permit request a token and send (tag `{ tenantId, runId: ids.next("disc"), nodeId: serverId, attempt }`, attempt and JSON-RPC id 1, 2, ...). It SHALL throw `TOOLS_REFUSED` with `details.reason` `discovery_denied` (+ `decisionId`), `discovery_failed` (+ `stage`, `status`), `protocol_unsupported`, `mcp_session_required` (message `the MCP server needs a stateful session, which Ursitoare does not support yet`) or `too_many_tools`; `GATEWAY_UNAVAILABLE` passes.

#### Scenario: discoveryRequest is the API's request and the real engine allows an admin
- **WHEN** `discoveryRequest` is checked by `createPolicyEngine` over the real fragments (`defaultSrcDir()`; `carol`, `alice` of `test-plan.md`; egress `{ POST, mcp.fake.test, /mcp, <W3 digest>, S_ID, 60 }`) in cases Q1 to Q5 below
- **THEN** Q1 (carol) is `allow`, reasons `["tools-register-admin"]`, permit `{ POST, mcp.fake.test, /mcp, 76269e46...64c3f, S_ID, 60 }`, its request deep-equal to `buildPolicyRequest` of `src/api/decision.ts` plus the egress; Q2 (alice) `deny`; Q3 (tenant B) `deny`; Q4 `allow` with no permit; Q5 `deny` with `PDP_REQUEST_INVALID`

#### Scenario: Modern and legacy discovery through the fakes
- **WHEN** rows F1, F2 and F4 of `test-plan.md` run with the real engine, `createGateway`, the fake egress and the fake MCP (`keyHeader: null`)
- **THEN** F1 returns era `modern`, `2026-07-28`; the fake holds `server/discover` (`bodySha256` W3), `tools/list` (W6), `callHeader` `disc_00000000-0000-7000-8000-000000000001:docs:1` and `:2`; 2 `allow` rows, no run, permits `{ POST, mcp.fake.test, /mcp, <that bodySha256>, S_ID, 60 }`; 2 tokens; F2 (legacy) returns `legacy`, `2025-11-25` after `server/discover` (400), `initialize` (W4), `notifications/initialized` (202), `tools/list` (W8); F4 (SSE) returns F1's result

#### Scenario: A legacy server that issues a session id is refused
- **WHEN** row F3 of `test-plan.md` runs against `{ era: "legacy", session: true }`
- **THEN** `discoverMcp` throws `TOOLS_REFUSED`, `details` `{ reason: "mcp_session_required" }` and the message above; the fake holds 2 requests (`server/discover` 400, `initialize` 200) and no `tools/list`; 2 `allow` rows, 2 tokens; neither the error JSON nor a fake record contains `fake-mcp-session-1`

#### Scenario: Each refusal sends nothing or stops at the failing request
- **WHEN** rows D1 to D11 of `test-plan.md` run on a scripted gateway and a test database
- **THEN** each row gives its result, sends and decision rows: D1 pages (3 sends, the third W7), D3 and D5 `protocol_unsupported`, D6 includes `{ stage: "discover", status: "401" }` (1 send, not legacy), D7 `too_many_tools` after 11 sends, D8 passes `GATEWAY_UNAVAILABLE`, D9 (a deny; an allow with `PDP_EVALUATION_ERROR:p1`) `discovery_denied` with 0 sends, D10 `credential_missing`

#### Scenario: Rediscovery drifts an approved server, a hint change alone included
- **WHEN** row F5 of `test-plan.md` runs: `docs` discovered (F1), submitted by `u_dave` with `submitAdapterSurfaceTx`, approved by `u_carol`, then discovered again unchanged, with `find_vendor` `readOnlyHint: false`, and with `log_note` described
- **THEN** the first submit leaves `pending` (D1), the approval `approved`, the unchanged rediscovery `approved` (D1, no new surface row), the hint-only change `drifted` (`pendingDigest` D2 ≠ D1, `approvedDigest` D1), the description change `drifted` (D3 ≠ D2)

### Requirement: The routes register a server by URL and discover its tools
`POST /api/v1/tool-registrations/mcp` (action `register_tool_server`, idempotent) SHALL take `{ id, url, local? }` and answer 201 `{ server, endpoint }` from `registerMcpServerTx` in one transaction (`TOOLS_INVALID` 400 with `fields`, `TOOLS_EXISTS` 409). `POST /api/v1/tool-servers/{id}/discover` (same action) SHALL take `{ tools? }` (`McpOverlay.tools`): a null `gateway`, `policy` or `services` is 503 `EGRESS_UNAVAILABLE` `{ reason: "discovery_not_configured" }` first, an unknown server 404, another adapter 422 `OPERATION_REFUSED` `{ reason: "adapter_mismatch" }`; else `discoverMcp` runs with no transaction open, then `submitAdapterSurfaceTx` under `withIdempotency`, answering 200 `{ server, era, protocolVersion, excluded }`. A `TOOLS_REFUSED` is 422 `OPERATION_REFUSED` with `details.reason` (and `decisionId`, `stage`, `status`, `names`, `excluded`; the session refusal its message); `GATEWAY_UNAVAILABLE` (by name and code) is 503 `gateway_unavailable`. With an `Idempotency-Key` the route SHALL first call `storedIdempotentReply`: a hit answers the stored body with `Idempotent-Replayed: true` and sends, submits and records nothing; another digest is 422 `IDEMPOTENCY_KEY_REUSED`. A null `pool` SHALL be 503 `AUTHZ_UNAVAILABLE` on both routes before any check above, as on the tool-server routes.

#### Scenario: Register by URL
- **WHEN** rows T1 to T5 of `test-plan.md` run on the harness of `src/api/tool-server-routes.test.ts`
- **THEN** T1 (carol) answers 201 `{ server: { id: "docs", adapter: "mcp", state: "pending", ... }, endpoint: "/mcp" }`, one `tools.server_registered` event, one `mcp_server` row; T2 replays the key (one row); T3 gives 400 `body/url` (`query`, `path`, `credentials`, `scheme`, `loopback`); T4 409; T5 (alice) 403, tenant B 404

#### Scenario: Discover, refuse and replay
- **WHEN** rows T6 to T15 of `test-plan.md` run
- **THEN** T6 answers 200 `pending`, 2 tools `write`, `modern` (T6b, a tool named `a\u0000b` under a key: 200, `a?b`); T7 to T13 give `adapter_mismatch`, `credential_missing`, the session refusal with its message, `no_tools` with `excluded` `[{ name: "route_ticket", reason: "x_mcp_header" }]`, `name_collision`, 200 with `excluded` `[{ name: "nope", reason: "not_listed" }]`, 503 `gateway_unavailable`; T14 503 `discovery_not_configured`, 0 fake requests; T14b a null `pool`: both routes 503 `AUTHZ_UNAVAILABLE`, 0 fake requests; T15 replays a key: the stored body, `Idempotent-Replayed: true`, the fake still at 2 requests, no new decision, token or `tool_surface` row; another body 422 `IDEMPOTENCY_KEY_REUSED`

### Requirement: A stored idempotent reply can be read without running the handler
`storedIdempotentReply(ctx, principal, key, requestDigest)` SHALL answer the stored `{ status, body }` of the `done` row of that tenant, principal and key from the last 24 hours with the same digest, `null` for no row, a row in progress or an older row, 422 `IDEMPOTENCY_KEY_REUSED` for another digest and 400 `VALIDATION_FAILED` for an invalid key; it writes nothing.

#### Scenario: The stored reply is read, not run
- **WHEN** rows S1 to S7 of `test-plan.md` run on a test database
- **THEN** S1 (no row) is `null`; S2 the stored `{ status: 200, body: { x: 1 } }`; S3 (another digest) 422 `IDEMPOTENCY_KEY_REUSED`; S4 `null`; S5 `null` or 422; S6 (two days later) `null`; S7 400 `VALIDATION_FAILED`

### Requirement: A live MCP call equals its permit
`createInvokePath` with `calls.mcp` SHALL send exactly what its permit allows: `path` the call's `endpoint`, `bodyDigest` that of the `tools/call` body.

#### Scenario: Exit 13 for MCP
- **WHEN** row L1 of `test-plan.md` runs on `invokeHarness` with the fakes: `find_vendor` bound as `kitBinding("mcp", ...)`, `ALLOW_ALL` deployed, `authorize` then `invoke` for `{ vendor_name: "Acme GmbH" }`
- **THEN** the permit is `{ POST, mcp.fake.test, /mcp, 884bf0ec...bba28, <service>, 60 }`, `invoke` answers `{ output: { vendor_id: "V-ACME", status: "active" } }`, the fake holds one `tools/call` (`callHeader` `r_1:lookup:1`, `bodySha256` the permit's `bodyDigest`)

### Requirement: discover.ts is the one MCP egress site
`src/tools/mcp/discover.ts` SHALL be the only file M7 adds that imports the gateway by value, so the frozen inventory in `test/arch/egress-sites.test.ts::C-76ead8ea`, `src/credentials/egress-site.test.ts::C-0c230dcb` and `src/runtimes/invoke/request.test.ts::C-2a04f1cb` SHALL be `["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts", "src/tools/mcp/discover.ts"]`; other `src/tools/mcp/` files and `src/api/mcp-tool-routes.ts` import it as types only.

#### Scenario: discover.ts is an inventoried site and no other file is added
- **WHEN** `checkEgressSites` runs on `readSnapshot()` with the three-path and the four-path inventory
- **THEN** the first gives exactly one `ARCH_EGRESS_SITE`, for `discover.ts`, the second `[]`, and the three frozen tests pass on the four-path literal

### Requirement: main wires the routes and the document lists them
`main` SHALL call `registerMcpToolRoutes` after U53's routes (`policy` `runtime?.engine ?? null`, `gateway` from `createGateway(config.egress, ...)` if set, `services` `createServiceResolver(pool)`) and add `mcp: mcpCallAdapter` to `calls` of `createInvokePath`; `docs/api/openapi.json` SHALL be the served document and list `post_api_v1_tool_registrations_mcp` and `post_api_v1_tool_servers_id_discover`.

#### Scenario: Main serves the routes and discovery works through it
- **WHEN** `main` starts without a database, then with a test database and the fake egress; carol registers `docs`, stores a `BEARER_TOKEN` credential `k-mcp-7f3a` and discovers
- **THEN** the first server defines both routes with action `register_tool_server`, the document holds both operations, `C-d150bfa4` stays green; the second answers 200 `modern`, the fake holds 2 requests with `headers.authorization` `[credential]`, no response or record contains `k-mcp-7f3a`
