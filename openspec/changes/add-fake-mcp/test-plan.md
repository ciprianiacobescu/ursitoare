# Test plan for add-fake-mcp (part 1: modern era and transport)

Every row ran on 2026-11-13 (design.md § Verification). Tests send with `node:http` (own `Host`; `fetch` ignores it).

## Constants and builders

- `K = "Bearer k-mcp-7f3a"`. `M = "io.modelcontextprotocol/protocolVersion"`.
- `Bm(method, params, id = 1)` is the text `JSON.stringify({ jsonrpc: "2.0", id, method, params: { ...params, _meta: { [M]: "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {} } } })`. `Bl(method, params, id = 1)` is `JSON.stringify` of `{ jsonrpc: "2.0", id, method, params }` with `id` left out when it is `null` and `params` left out when it is `undefined`.
- `Hm(method, name?)` are the headers `host: mcp.fake.test`, `content-type: application/json`, `accept: application/json, text/event-stream`, `authorization: K`, `mcp-protocol-version: 2026-07-28`, `mcp-method: <method>` and, when `name` is given, `mcp-name: <name>`. `Hl(version?)` are the first four and, when `version` is given, `mcp-protocol-version: <version>`.
- `ok(r, id = 1)` is the text `{"jsonrpc":"2.0","id":<id>,"result":<r>}`; `err(code, message, id = 1, data?)` is `{"jsonrpc":"2.0","id":<id>,"error":{"code":<code>,"message":<message>[,"data":<data>]}}`. Answers are compared as parsed JSON; `content-type` is `application/json`.
- `T_FIND` is the `tools/list` entry `{"name":"find_vendor","inputSchema":{"type":"object","properties":{"vendor_name":{"type":"string","minLength":1}},"required":["vendor_name"],"additionalProperties":false},"outputSchema":{"type":"object","properties":{"vendor_id":{"type":"string"},"status":{"type":"string"}},"required":["vendor_id","status"],"additionalProperties":false},"annotations":{"readOnlyHint":true}}`; `T_LOG` is `{"name":"log_note","inputSchema":{"type":"object","properties":{"note":{"type":"string"}},"required":["note"]},"annotations":{"readOnlyHint":false,"idempotentHint":true}}`. Neither has a `title` or a `description`.
- `V_ACME = {"vendor_id":"V-ACME","status":"active"}`, `V_UNK = {"vendor_id":"V-UNKNOWN","status":"unknown"}`.
- `HDR_TOOL` is `{ name: "route_ticket", description: "Route a ticket", inputSchema: { type: "object", properties: { region: { type: "string", "x-mcp-header": "Region" }, ticket: { type: "string" } }, required: ["region", "ticket"] }, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true }, result: () => ({ text: "routed" }) }`.

## Discovery rows (default fake unless stated)

| # | request | answer |
|---|---|---|
| D1 | `Hm("server/discover")`, `Bm("server/discover", {})` | 200 `ok({"resultType":"complete","supportedVersions":["2026-07-28","2025-11-25"],"capabilities":{"tools":{}},"_meta":{"io.modelcontextprotocol/serverInfo":{"name":"fake-mcp","version":"1.0.0"}},"ttlMs":60000,"cacheScope":"private"})` |
| D2 | D1 on `{ era: "modern" }` | the same with `supportedVersions` `["2026-07-28"]` |
| L1 | `Hm("tools/list")`, `Bm("tools/list", {})` | 200 `ok({"resultType":"complete","tools":[T_FIND,T_LOG],"ttlMs":60000,"cacheScope":"private"})`, no `nextCursor` |
| L2 | `{ pageSize: 1, tools: [...FAKE_MCP_TOOLS, HDR_TOOL] }`; `tools/list` with no cursor, `page-1`, `page-2`, `page-0` | `[T_FIND]` with `nextCursor` `page-1`; `[T_LOG]` with `page-2`; `[HDR_ENTRY]` with no `nextCursor`; the first page again |
| L3 | the L2 fake; cursors `"bogus"`, `"page-3"`, `"page-01"` and the number `7` | each 200 `err(-32602, "Invalid cursor")` |

`HDR_ENTRY` is `HDR_TOOL` as a list entry: its members but `result`, in the order `name`, `description`, `inputSchema`, `annotations`. `x-mcp-header` reaches the client verbatim (U54's R4 fixture); no tool of `FAKE_MCP_TOOLS` carries it.

## Call rows (`Hm("tools/call", <name>)`, `Bm("tools/call", { name, arguments }, id)`; default fake unless stated)

| # | name, arguments | answer (200) |
|---|---|---|
| C1 | `find_vendor`, `{"vendor_name":"Acme GmbH"}` | `ok({"resultType":"complete","content":[{"type":"text","text":<JSON of V_ACME>}],"structuredContent":V_ACME})` |
| C2 | `find_vendor`, `{"vendor_name":"Globex"}` | as C1 with `V_UNK` |
| C3 | `log_note`, `{"note":"hello"}` | `ok({"resultType":"complete","content":[{"type":"text","text":"noted: hello"}]})`, no `structuredContent` |
| C4 | `log_note`, no `arguments` member | text `noted: undefined` |
| C5 | `find_vendor`, as C1, with `mcp-name: =?base64?ZmluZF92ZW5kb3I=?=` | the answer of C1 (`ZmluZF92ZW5kb3I=` is `find_vendor` in base64) |
| C6 | `nope`, `{}` | `err(-32602, "Unknown tool: nope")` |
| C7 | `log_note`, arguments `[]` | `err(-32602, "Invalid params: arguments must be an object")` |
| C8 | fake with tools `boom` (result `{ text: "boom", isError: true, structuredContent: { code: 7 } }`) and `fine` (`{ text: "ok", isError: false }`); `boom`, `{}`; `fine`, `{}` | `ok({"resultType":"complete","content":[{"type":"text","text":"boom"}],"structuredContent":{"code":7},"isError":true})`; `ok({"resultType":"complete","content":[{"type":"text","text":"ok"}],"isError":false})` |

C6 and C7 are HTTP 200 (UNVERIFIED status, design.md § Protocol facts).

## Modern refusal rows (default fake, `Bm`-bodies, 400 unless stated)

| # | request | answer |
|---|---|---|
| H1 | `Hm("server/discover")` without `mcp-protocol-version` | `err(-32020, "Header mismatch: MCP-Protocol-Version header is missing")` (H3, H5: `Mcp-Method`, `Mcp-Name` likewise) |
| H2 | with `mcp-protocol-version: 2025-11-25` (body `_meta` says `2026-07-28`) | `err(-32020, "Header mismatch: MCP-Protocol-Version header value '2025-11-25' does not match body value '2026-07-28'")` (the other mismatch messages follow this pattern) |
| H3 | without `mcp-method` | `err(-32020, "Header mismatch: Mcp-Method header is missing")` |
| H4 | `mcp-method: tools/list` on a `server/discover` body | `err(-32020, "Header mismatch: Mcp-Method header value 'tools/list' does not match body value 'server/discover'")` |
| H5 | `tools/call` `find_vendor` without `mcp-name` | `err(-32020, "Header mismatch: Mcp-Name header is missing")` |
| H6 | the same with `mcp-name: log_note` | `err(-32020, "Header mismatch: Mcp-Name header value 'log_note' does not match body value 'find_vendor'")` |
| H7 | the same with `mcp-name: =?base64?literal?=` (not valid base64) | `err(-32020, "Header mismatch: Mcp-Name header value '=?base64?literal?=' does not match body value 'find_vendor'")` |
| H8 | `server/discover` with `Bm(..., 1, "1900-01-01")` and `mcp-protocol-version: 1900-01-01`; then the same with `2025-11-25` in both | `err(-32022, "Unsupported protocol version", 1, {"supported":["2026-07-28","2025-11-25"],"requested":"1900-01-01"})`; then `requested` `2025-11-25` |
| H9 | H8 with `1900-01-01` on `{ era: "modern" }` | `data.supported` is `["2026-07-28"]` |
| H10 | `nope/unknown` with `mcp-method: nope/unknown` | 404 `err(-32601, "Method not found: nope/unknown")` |
| N1 | body `{"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":1,"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}` (no `id`) with `Hm("notifications/cancelled")` | 202, empty body |
| N2 | N1 without `mcp-method` | 400 `err(-32020, "Header mismatch: Mcp-Method header is missing", null)` |

H1 to H7 precede H8 (a request failing both answers `-32020`); H8 precedes H10.

## Transport rows (default fake unless stated; body `Bm("server/discover", {})` and `Hm("server/discover")` unless stated)

| # | request | answer |
|---|---|---|
| T1 | `host: other.fake.test`; `host: mcp.fake.test:443` | 421 `{"error":"misdirected_request"}` for both |
| T2 | `host: 127.0.0.1:<port>`; `host: MCP.FAKE.TEST`; path `/mcp?x=1` | 200 `ok(D1 result)` for all three |
| T3 | path `/other` | 404 `{"error":"not_found"}` |
| T4 | `GET /mcp`; `DELETE /mcp` (host `mcp.fake.test`, key present) | 405 `{"error":"method_not_allowed"}`, `allow: POST` |
| T5 | no `authorization`; `authorization` with an empty value | 401 `{"error":"unauthorized"}` for both |
| T6 | `{ keyHeader: "X-Api-Key" }`: `authorization` only; then `x-api-key: kk` | 401 `{"error":"unauthorized"}`; 200 `ok(D1 result)` |
| T7 | `{ keyHeader: null }`, no key header | 200 `ok(D1 result)` |
| T8 | `{ path: "/rpc/v1" }`: `/mcp`; `/rpc/v1` | 404 `{"error":"not_found"}`; 200 |
| T9 | bodies `{`, the empty body, `[1]`, `{"jsonrpc":"2.0","id":1}` | 400 `err(-32700, "Parse error", null)` for the first two; `err(-32600, "Invalid Request", null)` for the others |
| T10 | default fake, no key header: `host: other.fake.test`; `GET`; path `/other` | 421; 405; 404 (each refusal precedes the key check) |
