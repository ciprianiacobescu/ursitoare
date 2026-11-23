# Test plan: wire, reply and adapter rows

Ran 2026-11-16 (Node 24.22.2, scratch copy of main@3daa5c35). `META` is `"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"ursitoare","version":"0.1"},"io.modelcontextprotocol/clientCapabilities":{}}`; `FV` `{"vendor_name":"Acme GmbH"}`; `CI` `{"name":"ursitoare","version":"0.1"}`. Text is `{"jsonrpc":"2.0","id":<id>,"method":"<method>","params":<params>}` (no `id` when null); the caller's `params` key order is kept (`{ arguments, name }` stays so) and `"\ud800"` stays escaped.

## mcpBody rows (`mcpBody(id, method, params, version)`; bytes, sha256)

| # | call | params text | bytes, sha256 |
|---|---|---|---|
| W1 | `1, "tools/call", { name: "find_vendor", arguments: FV }, "2026-07-28"` | `{"name":"find_vendor","arguments":FV,META}` | 305, `884bf0ecc3569c8bc3cb7ee6d3fe044f5ae98593478ddbbaa9975e35801bba28` |
| W2 | W1 with `"2025-11-25"` | `{"name":"find_vendor","arguments":FV}` | 118, `096dc27bb3e5bd7d6d0a2c0a6df5ffd657ccf234a3cd9fe717d0a104a2e6b1a3` |
| W3 | `1, "server/discover", {}, "2026-07-28"` | `{META}` | 249, `76269e460a435d1338b204ce7cd4f0be1b20e25e1da8ad458d0a4b8e3e164c3f` |
| W4 | `2, "initialize", { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: CI }, "2025-11-25"` | the same object | 156, `7024e8cbb64460ab1752dbdb0e218cba37841854275e7e21a7227e1144f49ce6` |
| W5 | `null, "notifications/initialized", {}, "2025-11-25"` | `{}` | 66, `c01acc5d43647dfe74d55a6c24e26a748188851204d330e6d1f1d7e64b2ed999` |
| W6 | `2, "tools/list", {}, "2026-07-28"` | `{META}` | 244, `c2e762215efb0d1e2077566a9267636485e3e582db86b133dddb60e338beb8a2` |
| W7 | `3, "tools/list", { cursor: "page-1" }, "2026-07-28"` | `{"cursor":"page-1",META}` | 262, `eebbe51f5dd813a8e1420ab847891635c37d07cd14b81fe6e2c4478bf546d942` |
| W8 | `4, "tools/list", {}, "2025-11-25"` | `{}` | 58, `86d054baa44ee2f470bd2acda333ee42f8ffae1f5764a0c502bc10ae88720d7b` |
| W9 | `1, "tools/call", { name: "log_note", arguments: JSON.parse('{"b":1,"__proto__":{"x":2},"a":[{"z":1,"y":2}],"B":"é"}') }, "2026-07-28"` | arguments `{"B":"é","__proto__":{"x":2},"a":[{"y":2,"z":1}],"b":1}` | 331, `26c6894321480d85caa1f80f6d3b3734a524fd75ed7914bc8e30d660374204d0` |
| W10 | `find_vendor` with arguments `{ b: 1, a: 2 }` and `{ a: 2, b: 1 }`, `"2026-07-28"` | arguments `{"a":2,"b":1}` | 291, `4bd7d8f9640608885f43cadca9fc204d001e775d27c9d1d52d689bc055f4cc4d` |
| W11 | `1, "tools/call", { name: "log_note", arguments: { note: "hello" } }, "2025-06-18"` | no `_meta` | 104, `ffb631dede5f5f1edf9c4527e75cb0e2e0fb40c9cb81da80ab2b20770311e916` |
| W12 | `1, "tools/call", { name: "log_note", arguments: {} }, "2026-07-28"` | `{"name":"log_note","arguments":{},META}` | 277, `e886f9efdca91cfa27a27eb104f82d9f3bb294b32ef50441b47acdb531ffe3a5` |

## Header, name and reply rows

- H1 `mcpHeaders("tools/call", "find_vendor", "2026-07-28", "k_1")` deep-equals `{ accept: "application/json, text/event-stream", "content-type": "application/json", "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/call", "mcp-name": "find_vendor", "idempotency-key": "k_1" }`. H2 `(..., "2025-11-25", null)`: the first three members only. H3 `("server/discover", null, "2026-07-28", null)`: the first three and `mcp-method`.
- `mcpNameHeader`: N1 `find_vendor` itself; N2 `Hello, 世界` `=?base64?SGVsbG8sIOS4lueVjA==?=`; N3 `a b` `=?base64?YSBi?=`; N4 `=?base64?x?=` `=?base64?PT9iYXNlNjQ/eD89?=`; N5 `=?base64?abc` and `""` themselves.
- `readMcpReply(·, 1)`, `J` is `application/json`, `EV(x)` is `event: message\ndata: <JSON>\n\n`: P1 `J` id-1 result `{a:1}`: `{ ok: true, result: { a: 1 } }`. P2 `J` error `-32602`: `{ ok: false, reason: "rpc_error", code: -32602 }`. P3 error `-32700`, id null: `rpc_error`, -32700. P4 result with id 2: `no_reply`. P5 `J` `<html>`, `[1]`, empty: `not_json`. P6 `text/event-stream; charset=utf-8`, `EV` of a progress notification then of the id-1 result `{b:2}`: `{ b: 2 }`. P7 SSE with only a notification, or empty: `no_reply`. P8 `event: message\r\ndata: {"jsonrpc":"2.0",\r\ndata: "id":1,"result":{"c":3}}\r\n\r\n`: `{ c: 3 }`. P9 SSE error `-32602`: `rpc_error`. P10 `J` id-1 result `[1]`: `no_reply`. P11 `J` `error` `{"message":"x"}`: `rpc_error`, code null.

## Adapter rows (`SPEC_S` `{ kind: "mcp", endpoint: "/mcp", name: "find_vendor", protocolVersion: "2026-07-28", output: "structured" }`; `SPEC_T` with `name` `log_note`, `output` `text`; `SPEC_L` `{ ..., endpoint: "/rpc/v1", name: "log_note", protocolVersion: "2025-06-18", output: "text" }`; `V` `{"vendor_id":"V-ACME","status":"active"}`; `ok(r)` `{"jsonrpc":"2.0","id":1,"result":r}`)

- B1 `build(SPEC_S, FV, null)`: `POST`, `/mcp`, H1's headers without `idempotency-key`, W1's bytes. B2 with `"k_1"`: H1's headers, same path and bytes. B3 `build(SPEC_L, { note: "hello" }, null)`: `/rpc/v1`, H2's members with `2025-06-18`, W11's bytes. B4 `build(SPEC_S, [1] | null | "x", null)`: `{ ok: false, reason: "args_not_object" }`. B5 `build(SPEC_T, {}, null)`: W12's bytes.
- `answer` (`J` unless stated): A1 `SPEC_S`, `ok({"resultType":"complete","content":[{"type":"text","text":"<V>"}],"structuredContent":V})`: `{ ok: true, output: V }`. A2 `SPEC_T`, content text `noted: hello`, an image item, text `second`: `{ text: "noted: hello\nsecond" }`; `content: []` or none: `{ text: "" }`. A3 500 `oops`; 400 with error `-32020`; 301 empty: `{ ok: false, stage: "upstream", reason: "status", status: 500 | 400 | 301 }`. A4 200 error `-32602` `Unknown tool: nope`: `{ stage: "upstream", reason: "rpc_error", status: null }`. A5 200 `<html>`; 204 empty: `{ stage: "response", reason: "not_json", status: null }`. A6 SSE with only a notification: `no_reply`. A7 `resultType` `input_required`; `weird`: `input_required`; `result_type`. A8 `isError: true`, text `boom secret`: `{ stage: "upstream", reason: "tool_error", status: null }`. A9 `SPEC_S` with `content: []` only; with `structuredContent` `[1]`: `not_object`. A10 `SPEC_S`, SSE progress then `ok({"structuredContent":V})`: `{ ok: true, output: V }`.
