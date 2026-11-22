# Test plan for add-fake-mcp (part 2: legacy eras, SSE, records, knobs, contract, part)

Builders and constants: `test-plan.md` § Constants. `INIT(v)` is `Bl("initialize", { protocolVersion: v, capabilities: {}, clientInfo: { name: "c", version: "1" } })`; `INIT_R(v)` is `ok({"protocolVersion":<v>,"capabilities":{"tools":{}},"serverInfo":{"name":"fake-mcp","version":"1.0.0"}})` (no `resultType` in a legacy result).

## Wire rows (`wire.test.ts`)

`decodeMcpName`: `find_vendor` gives itself; `=?base64?ZmluZF92ZW5kb3I=?=` gives `find_vendor`; `=?base64?SGVsbG8sIOS4lueVjA==?=` gives `Hello, 世界`; `=?base64??=` gives `""`; `=?base64?literal?=`, `=?base64?%%%?=`, `=?base64?/w==?=` (bytes `ff`) and `=?base64?ZmluZF92ZW5kb3I?=` (no padding) give `null`; `=?base64?abc` gives itself.

## Legacy rows (default fake, era `dual`, `session` false, unless stated)

| # | request | answer |
|---|---|---|
| G1 | `Hl()`, `INIT("2025-11-25")` | 200 `INIT_R("2025-11-25")`, no `mcp-session-id` header |
| G2 | `INIT(v)` for `v` `2025-06-18`, `2025-03-26`, `2024-11-05` | `INIT_R` with `protocolVersion` `2025-06-18`, `2025-03-26`, `2025-11-25` |
| G3 | `Hl("2025-11-25")`, `Bl("notifications/initialized", undefined, null)` | 202, empty body |
| G4 | a fresh fake, no `initialize` first: `Hl("2025-11-25")`, `Bl("tools/list", undefined, 2)` | 200 `ok({"tools":[T_FIND,T_LOG]}, 2)`: no `resultType`, `ttlMs` or `cacheScope` |
| G5 | `Hl("2025-06-18")`, `Bl("tools/call", { name: "find_vendor", arguments: { vendor_name: "Acme GmbH" } }, 3)` | 200 `ok(<C1's result without `resultType`>, 3)` |
| G6 | G4's request with no `mcp-protocol-version`; with `2026-07-28`; with `2024-11-05` | 400 `err(-32600, "Missing or unsupported MCP-Protocol-Version header", 2)` for each |
| G7 | `Hl("2025-11-25")`: `Bl("ping2", undefined, 4)`; `Bl("tools/call", { name: "nope" }, 5)`; `Bl("server/discover", undefined, 6)` | 200 `err(-32601, "Method not found: ping2", 4)`; 200 `err(-32602, "Unknown tool: nope", 5)`; 200 `err(-32601, "Method not found: server/discover", 6)` |

## Session rows (`{ session: true }`, fresh fake)

| # | request | answer |
|---|---|---|
| X1 | `INIT("2025-11-25")` twice | 200 `INIT_R` with `mcp-session-id` `fake-mcp-session-1`, then `fake-mcp-session-2` |
| X2 | then `Hl("2025-11-25")`, `Bl("tools/list", undefined, 2)`: with no session header; with `mcp-session-id: fake-mcp-session-9`; with `fake-mcp-session-1` | 400 `err(-32600, "Missing Mcp-Session-Id header", 2)`; 404 `err(-32600, "Unknown session", 2)`; 200 `ok({"tools":[T_FIND,T_LOG]}, 2)` |
| X3 | `Bl("notifications/initialized", undefined, null)` with `Hl("2025-11-25")`: without a session header; with `fake-mcp-session-2` | 400 `err(-32600, "Missing Mcp-Session-Id header", null)`; 202 empty |
| X4 | D1 on the same fake; D1 with `mcp-session-id: nonsense` | 200 `ok(D1 result)`, no session header, both |
| X5 | after `reset()`: `INIT("2025-11-25")`; `tools/list` with `fake-mcp-session-2` | `fake-mcp-session-1` again; 404 `Unknown session` |
| X6 | `{ era: "legacy", session: true }`: `INIT("2025-11-25")` | 200 `INIT_R` with `mcp-session-id` `fake-mcp-session-1` (U54's R2) |

## Era rows

| # | fake and request | answer |
|---|---|---|
| E1 | `{ era: "modern" }`: `INIT("2025-11-25")`; `Hl("2025-11-25")` with `Bl("tools/list", undefined, 2)`; D1 | 400 `err(-32020, <the message of design.md § Decisions 5>)` for the first two (ids 1, 2); D2's answer |
| E2 | `{ era: "legacy" }`: D1; `INIT("2025-11-25")`; G4's request | 400 with an empty body, no `content-type` header and `content-length` `0`; 200 `INIT_R("2025-11-25")`; 200 as G4 |

## SSE rows (`{ sse: true, session: true }`)

`EV(x)` is `event: message\ndata: <JSON of x>\n\n`; `PROG` is `{"jsonrpc":"2.0","method":"notifications/progress","params":{"progressToken":"fake-progress","progress":1,"total":1}}`.

| # | request | answer |
|---|---|---|
| S1 | D1 | 200, `content-type: text/event-stream`, `cache-control: no-cache`, no `content-length`; body `EV(PROG) + EV(ok(D1 result))` |
| S3 | `INIT("2025-11-25")` | the same shape with `INIT_R`, and `mcp-session-id` `fake-mcp-session-1` |
| S4 | C6 | 200, `EV(PROG) + EV(err(-32602, "Unknown tool: nope"))` |
| S5 | no key (T5); H4; the N1 notification; `failNext("tools/call", 502)` then C3 | JSON bodies as in their rows (`content-type: application/json`), 202 empty; 502 `{"error":"injected_failure","status":502}` as JSON |

## Record rows (`{ keyHeader: "x-api-key" }`, one fake, in order)

`Q1` sends `Hm("tools/call", "find_vendor")`, `Bm("tools/call", { name: "find_vendor", arguments: { vendor_name: "Acme GmbH" } }, 3)` and `x-api-key: k-mcp-7f3a`, `x-ursitoare-call: r_1:find:1`, `cookie: c=secret-cookie`, `proxy-authorization: Basic pp`, `mcp-session-id: sess-abc`. Records have `path` `/mcp`, `callHeader` and `toolName` `null` unless stated.

| # | request | status | `seq`, `method`, `era`, `host`, `bodySha256` |
|---|---|---|---|
| Q1 | as above | 200 | 1, `tools/call`, `modern`, `mcp.fake.test`, `c34cd443a5bab0b6964cf8f8796201bce44640f0914d1f6fcd2da79dd2907ebe`; `callHeader` `r_1:find:1`, `toolName` `find_vendor`; `headers` restricted to these members equal `{ host: "mcp.fake.test", "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "[credential]", "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/call", "mcp-name": "find_vendor", "x-api-key": "[credential]", "x-ursitoare-call": "r_1:find:1", cookie: "[credential]", "proxy-authorization": "[credential]", "mcp-session-id": "[session]", "content-length": "231" }` |
| Q2 | `Hm("server/discover")` with `host: other.fake.test`, `x-api-key: k`, `Bm("server/discover", {})` | 421 | 2, `server/discover`, `modern`, `other.fake.test`, `381b7dc9512987aa8b21987b55c72b760defea2c555290e2c81660553c3afdaa` |
| Q3 | `GET /mcp`, `host: mcp.fake.test` only | 405 | 3, `""`, `null`, `mcp.fake.test`, `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Q4 | `Hm("tools/list")` (`authorization` only), `Bm("tools/list", {})` | 401 | 4, `tools/list`, `modern`, `mcp.fake.test`, `cf6593c6adc60672c004b293075dadd9c15d3ee8f09f6d05f642ec77b51b072e`; `headers.authorization` `[credential]` |
| Q5 | `host`, `x-api-key: k`, body `{` | 400 | 5, `""`, `null`, `mcp.fake.test`, `021fb596db81e6d02bf3d2586ee3981fe519f275c0ac9ca76bbcf2ebb4097d96` |
| Q6 | `Hl()` with `x-api-key: k`, `INIT("2025-11-25")` | 200 | 6, `initialize`, `legacy`, `mcp.fake.test`, `330ac568c28779957a896987b35b90d5951c38d6b2dc24b4b5d9dc27e43f070a` |

After Q6: `requests({ method: "tools/call" })` is Q1's record, `requests({ method: "" })` Q3's and Q5's, `requests()` holds 6 records; changing `requests()[0].headers` leaves the next read unchanged; `JSON.stringify(requests())` contains none of `k-mcp-7f3a`, `secret-cookie`, `Basic pp`, `sess-abc`. On a `{ session: true }` fake X1 then X2's third request: the `tools/list` record has `headers["mcp-session-id"]` `[session]` and no record text contains `fake-mcp-session-1`. After `close()`, `requests()` still returns the records.

## Knob and argument rows (default fake unless stated)

- K1: `failNext("tools/call", 503, 2)`; C3, D1, C3, C3: 503 `{"error":"injected_failure","status":503}`, 200, 503, 200; `requests()` statuses 503, 200, 503, 200, `seq` 1 to 4.
- K2: `failNext("tools/call", 502)`, C3 with no key: 401 (not consumed); C3 with the key: 502; again: 200. Then `failNext("tools/call", 500, 5)` and `failNext("tools/call", 429)`: C3 is 429, then 200 (the later call replaces).
- K3: `failNext("initialize", 400)`, `INIT("2025-11-25")`: 400 `{"error":"injected_failure","status":400}` (not a JSON-RPC error); then 200.
- K4: `setTools([HDR_TOOL])`: L1's request gives `ok({"resultType":"complete","tools":[HDR_ENTRY],"ttlMs":60000,"cacheScope":"private"})`; after `reset()` `requests()` is `[]`, L1 lists `T_FIND`, `T_LOG` and the next record has `seq` 1.
- K5: `close()` twice resolves; a new connection gets `ECONNREFUSED`; `requests()` still works.
- A1 to A7 (`startFakeMcp` rejects with `RangeError`; the `TCPServerWrap` count of `process.getActiveResourcesInfo()` is equal before and after): `{ era: "x" }`: `era must be modern, legacy or dual`; `{ path: "mcp" }`, `{ path: "/a?b" }`: `path must start with / and hold no ? or #`; `{ keyHeader: "Bad Header" }`: `keyHeader must be an HTTP token or null`; `{ pageSize: 0 }`, `{ pageSize: 1.5 }`: `pageSize must be a positive integer`; `{ tools: [FAKE_MCP_TOOLS[0], FAKE_MCP_TOOLS[0]] }`: `duplicate tool name: find_vendor`.
- A8 to A15 (`RangeError`, nothing changes): `failNext("", 500)`: `method must be a non-empty string`; `failNext("tools/call", 399)`, `600`, `500.5`: `status must be an integer from 400 to 599`; `failNext("tools/call", 500, 0)`, `1001`: `times must be an integer from 1 to 1000`; `setTools` with two tools named `log_note`: `duplicate tool name: log_note`; with a tool named `""`: `tool name must be a non-empty string`. After them `tools/list` still lists the start tools.

## Contract rows

`fakeMcpContract(origin, { host: "mcp.fake.test", path: "/mcp", key: { name: "authorization", value: K } })` returns these 8 names in order: `server/discover answers its versions`, `tools/list answers the tools`, `tools/call answers find_vendor`, `a header mismatch is refused with -32020`, `an unsupported version is refused with -32022`, `an unknown method is refused with -32601`, `a missing key is refused`, `a legacy initialize answers its handshake`. Checks 1 to 3 assert the shapes of D1, L1 (following `nextCursor` for at most 20 pages; `ttlMs` a number; `cacheScope` `public` or `private`) and C1; 4 sends `find_vendor` with `mcp-name: log_note` (400, `-32020`); 5 sends `_meta` and header `1999-01-01` (400, `-32022`, `data.requested` `1999-01-01`, `data.supported` holding `2026-07-28`); 6 sends `nope/unknown` (404, `-32601`); 7 sends D1 with no key header (401); 8 sends `INIT("2025-11-25")` with the key and no `_meta` (200, `protocolVersion` `2025-11-25`, a `capabilities` object, a string `serverInfo.name`; a session header is allowed).

| target | result |
|---|---|
| default fake | all 8 resolve |
| `{ era: "modern", pageSize: 1 }` | 1 to 7 resolve (check 2 reads two pages); 8 rejects |
| `{ era: "legacy" }` | 1 to 6 reject; 7 and 8 resolve |
| `{ keyHeader: null, session: true }`, `key: null` | 7 names (no `a missing key is refused`), all resolve |
| M1: a forwarding server setting `authorization: K` on every relayed request | only `a missing key is refused` rejects (`... answered 200`) |
| `http://127.0.0.1:1` | all 8 reject with `<name>: http://127.0.0.1:1 is unreachable (...)` |

## Part rows (`mcp-part.test.ts`, `mcp-part.cluster.test.ts`)

Setup: tenant `4b8a2c1e-0000-8000-8000-000000000001`, services `S1` `0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01`, `S2` (ending `02`); `egressPart.start`; `putCredential(egress.vaultUrl, egress.vaultAdmin, { tenantId, serviceId: S1, authScheme: 3, value: Buffer.from("k-mcp-7f3a"), headerName: "", callerActorId: "carol", targetUrl: FAKE_MCP_ORIGIN })` gives `grpcStatus` 0, `keyVersion` 1; then `mcpPart.start`. A call takes a token from `POST {brokerUrl}/v1/issue` (header `X-Mintkey-Service-Token: egress.brokerServiceToken`, body `{ agent_id: "alice", service_id, tenant_id, scope: "call", ttl_seconds: 60 }`) and posts to `{proxyUrl}/<service id>/mcp` with `Authorization: Bearer <token>` and the `Hm` headers but `host` and `authorization`.

- P1: `mcpPart.start` with an empty `handles` map rejects with `E2eStackError` `STACK_PART_MISSING` `{ part: "egress" }`; the `TCPServerWrap` count is equal before and after.
- P2: `handle.env` is `{}`. C1 (`S1`, D1): 200 as D1; C2 (`S1`, `x-ursitoare-call: r_1:find:1`, call row C1): 200 as C1; C3 (`S2`, no credential, D1): 502, body `bad gateway: vault error\n`. The fake's `requests()` holds `seq` 1 `server/discover` and `seq` 2 `tools/call` (`callHeader` `r_1:find:1`, `toolName` `find_vendor`), both `host` `mcp.fake.test`, `status` 200, `headers.authorization` `[credential]`; `egress.requests()` holds two `allowed` records, then the `rejected` one; the token, `k-mcp-7f3a` and `Bearer` occur in no fake record.
- P3: `mcp.setTools([])`, `mcpPart.beforeReset(ctx)`: `requests()` is `[]`; C1 again is 200 with `seq` 1 (the upstream survived); `tools/list` through the proxy lists the two start tools. `mcpApi(new Map())` throws `STACK_PART_MISSING` `{ part: "mcp" }`; `close()` twice resolves; the origin refuses connections.
- P4: `parts/55-mcp.ts` reads exactly `export { mcpPart as part } from "../mcp-part.ts";`; the discovered names list `egress` and `tool-servers` before `mcp`; `"52-tool-servers.ts" < "55-mcp.ts"`.
- P5: `startCrashCluster` over the discovered parts `database`, `egress`, `mcp` (`mcp` wrapped to capture `handle.api.mcp.origin`): the origin answers D1 (with its own `host`) 200 while started and refuses connections after `close()`.

## README row (`test/support/fake-mcp/readme.test.ts`)

Exactly one line starts with ``| `fake-mcp/` | `add-fake-mcp` |`` and it equals ``| `fake-mcp/` | `add-fake-mcp` | An MCP server (2026-07-28 and the older handshake, with or without a session; recorded requests, failure and surface knobs, JSON or SSE answers), reached through the fake proxy as `mcp.fake.test`; e2e part `55-mcp` |``; no line contains ``| `fake-mcp/` | `add-mcp-client` |``.
