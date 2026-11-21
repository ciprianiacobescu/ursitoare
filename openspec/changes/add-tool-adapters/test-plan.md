# Test plan: add-tool-adapters

Red tests reach `HarnessWrap.calls`, `HarnessWrap.code`, `InvokePathDeps.calls`, `InvokePathDeps.code` and a null `permit` through a cast (AGENTS.md), since the typecheck runs at red. Digests, name vectors and sizes were computed on 2026-11-13 (Node 24.22.2, scratch copy of main@3daa5c35, a scratch `normalizeTool` as in design 2). Digests are `sha256:` plus hex.

## Fixtures (`test/support/adapter-kit.ts`)

`IN_V` `{ type: "object", properties: { vendor_name: { type: "string" } }, required: ["vendor_name"] }`; `OUT_V` the same with `vendor_id`; `MCP_TEXT` is `MCP_TEXT_OUTPUT_SCHEMA`.

- `T_HTTP` `{ name: "find_vendor", description: "Find a vendor by name.", effect: "read", input: IN_V, output: OUT_V, untrusted_result: false, call: { kind: "http", method: "POST", path: "/vendors/find", params: [], body: true } }`.
- `T_GET` `{ name: "get_vendor", effect: "read", input: { type: "object", properties: { vendor_id: { type: "string" }, expand: { type: "boolean" } }, required: ["vendor_id"] }, output: OUT_V, untrusted_result: false, call: { kind: "http", method: "GET", path: "/vendors/{vendor_id}", params: [{ name: "vendor_id", in: "path" }, { name: "expand", in: "query" }], body: false } }`.
- `T_MCP` `{ name: "search_notes", description: "Search the notes.", effect: "write", input: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }, output: MCP_TEXT, untrusted_result: true, unsafe_to_retry: true, call: { kind: "mcp", endpoint: "/mcp", name: "search.notes", protocolVersion: "2026-07-28", output: "text" } }`.
- `T_CODE` `{ name: "word_count", description: "Count the words.", effect: "read", input: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }, output: { type: "object", properties: { words: { type: "integer" } }, required: ["words"] }, untrusted_result: false, call: { kind: "code", source: "return { words: 3 };" } }`. `FIX` is `T_HTTP` with `http: { method: "POST", path: "/vendors/find" }` for `call`.
- `kitSurface(kind, variant)` (fresh copies): `("http")` `{ tools: [T_HTTP] }`, `"b"` with `description` `"Find a vendor."`, `"c"` `"Find vendors by name."`; `("mcp")` and `("code")` likewise; another pair throws `RangeError`.
- `kitBinding(kind, over)` is `{ ...base, ...over }`, base `{ serverId: "acme", origin: "https://tools.fake.test", local: false, state: "approved", ref: "acme.lookup_vendor@1", tool, effect, call, untrustedResult, unsafeToRetry }` from the kind's tool (`code` origin `sandbox`), no `http` member.
- `kitHttpAdapter.build(call, args, idemKey)`: `args.mode` `refuse` gives reason `refused_args`, `text` `Bad Reason!`, `throw` throws `Error("secret_text")`; else the call's `method` and `path`, `content-type: application/json` when `call.body`, `idempotency-key` when `idemKey` is not null, body the UTF-8 of `JSON.stringify(args)` with sorted keys when `call.body`, else null. `answer`: body `{"throw":true}` throws `Error("secret_text")`; status outside 200-299 `{ ok: false, stage: "upstream", reason: "status", status }`; a 2xx JSON object `{ ok: true, output }`; other 2xx `{ ok: false, stage: "response", reason: "not_json", status: null }`. `kitMcpAdapter` is the same with method `POST`, path `call.endpoint`, `content-type: application/json` and always the body.
- `kitCodeRunner().run(call, args, ctx)` appends `{ source: call.source, args, nodeId: ctx.nodeId }` to `calls`; `args.mode` `interp` throws `InterpreterError("INTERPRETER_TOOL_FAILED", "node execution failed", ctx.nodeId, { stage: "code", reason: "timeout" })`, `throw` throws `Error("secret_text")`, else `{ output: { words: 3 } }`.

`D_HTTP` `0a3a2a70a4d1058c9bc26e72c4cd9452402d52c008a0a0fefe393fe698b45b2a`, `D_HTTP_B` `65a4aa9fba24b6b048261ce5785eb66f4b486263cea9ca2d803d6bac6acc5ffa` (above `D_HTTP`), `D_HTTP_C` `37d4a4cc6149428777146c598ed1ec3d6d4fe2e96c23ae6346a7019101cf735e`, `D_MCP` `7e461eb01a248c26d9d458a27e4018dc579071f5f9c70c3e4401b2b4e021e526`, `D_CODE` `ca47766a9e363b72b7a9bdd8c301d900593cd1a63b310c0cb6eeb9a37a1c0513`. `S` `87caf624-f579-8435-9540-24d6eb57aeff`, `IK` `ik1_` plus 64 `c`, `D_LV` `ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad` (`{"vendor_name":"Acme GmbH"}`, 27 bytes), `D_EMPTY` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, `T0` `2026-11-06T10:00:00.000Z`, `ALLOW_ALL` `@id("t-allow-all") permit (principal, action == Action::"invoke_tool", resource);`.

## checkAdapterSurface rows (`TOOLS_INVALID`, `details` `{ field, reason }`; one fault per row)

Accepted (same object returned; every long `source` is `"a".repeat(65536)`): each `kitSurface` with its adapter, (`http_openapi`, `{ tools: [T_GET] }`), `T_MCP` with `call.output` `structured` and `output` `OUT_V`, `T_MCP` with `call.hints` `{ readOnly: true }`, `T_CODE` with a `source` of 65536 characters, `T_HTTP` with an `input` property named `pattern` `{ type: "string" }`, `T_HTTP` with `vendor_name` `{ type: "object", enum: [{ pattern: "x" }], default: { pattern: "x" } }` and with `input["x-ui"]` `{ pattern: "x" }`, `T_CODE` with `input.properties.text.pattern` `"^a"`, (`fixture`, `{ tools: [FIX] }`), 15 `T_CODE` tools `code_00` to `code_14` of 65536-character sources (canonical JSON 987,611 characters).

| # | adapter, change | `field`, `reason` |
|---|---|---|
| K1 | `fixture`, `{ tools: [T_HTTP] }` | `tools/0`, `unknown_property` |
| K2 | `http_openapi`, `FIX` | `tools/0/http`, `unknown_property` |
| K3 | `T_HTTP` without `call` | `tools/0/call`, `not_object` |
| K4 | `T_HTTP` with the `T_MCP` call (`http_openapi`); `T_MCP` with the `T_HTTP` call (`mcp`); `T_CODE` with the `T_HTTP` call (`code_block`) | `tools/0/call/kind`, `kind_mismatch` |
| K5 | `T_HTTP` with `call.extra` 1; with method `TRACE`; with path `/vendors/find?x=1` | `tools/0/call/extra`, `unknown_property`; `tools/0/call/method` and `tools/0/call/path`, `bad_value` |
| K6 | `T_HTTP` path `/vendors/{vendor_id}`; `T_GET` path `/vendors` | `tools/0/call/path`, `placeholder` |
| K7 | `T_GET` with param `ghost` for `expand`; with `expand` `in: "header"` | `tools/0/call/params`, `param_unknown`; `bad_value` |
| K8 | `T_GET` with `vendor_id` `{ type: "number" }` | `tools/0/call/params`, `param_type` |
| K9 | `T_GET` with `body: true`; `T_HTTP` with `body: false` | `tools/0/call/body`, `body_method`; `tools/0/call/body`, `property_unsent` |
| K10 | `T_MCP` endpoint `/mcp?x=1`; name `bad name`; protocolVersion `2024-11-05` | `tools/0/call/<member>`, `bad_value` |
| K11 | `T_MCP` with `output` `OUT_V` and `call.output` `text` | `tools/0/call/output`, `text_output` |
| K12 | `T_CODE` source `""`; 65537 characters; `"a\u0000b"`; `"\ud800"` | `tools/0/call/source`, `bad_value` |
| K13 | `T_CODE` with `effect` `write`; with `untrusted_result` absent or `true` | `tools/0/effect`, `effect_not_read`; `tools/0/untrusted_result`, `untrusted_result` |
| K14 | `{ tools: [] }`; name `Find-Vendor`; two tools `find_vendor`; `T_HTTP` with `input` `{ type: "nope" }` | `tools`, `size`; `tools/0/name`, `bad_value`; `tools/1/name`, `duplicate`; `tools/0/input`, `schema_invalid` |
| K15 | 16 `T_CODE` tools as above (1,053,451 characters) | `surface`, `size` |
| K16 | `T_MCP` with `call.hints` `{ readOnly: "yes" }`; `{ extra: true }`; `1`; `T_HTTP` and `T_CODE` with `call.hints` `{ readOnly: true }` | `tools/0/call/hints`: `bad_value`; `unknown_property`; `not_object`; `unknown_property` |
| K17 | `T_HTTP` with `input.properties.vendor_name.pattern` `"^(a+)+$"` (`http_openapi`); `T_MCP` with `call.output` `structured` and `output` `{ type: "object", patternProperties: { "^a": { type: "string" } } }` | `tools/0/input`, `pattern`; `tools/0/output`, `pattern` (a `pattern` in `items` or `allOf` is refused the same way; the data positions above are accepted) |
| K18 | `null`; `{ tools: [], x: 1 }`; `{ tools: {} }`; 101 copies of `T_HTTP` named `tool_000` to `tool_100` | `tools`, `not_object`; `surface`, `unknown_property`; `tools`, `not_array`; `tools`, `size` |

Constants: `MCP_TEXT_OUTPUT_SCHEMA` deep-equals the object in its interface comment; `CODE_BLOCK_ORIGIN` `"sandbox"`; `ADAPTER_CALL_KINDS` `{ http_openapi: "http", mcp: "mcp", code_block: "code" }`; `MAX_SURFACE_CHARS` 1048576; `MAX_CODE_SOURCE_CHARS` 65536.

## Digest rows (`surfaceDigest` of `{ tools: [tool] }`)

D1 `T_HTTP` (also with its `call` keys reordered) `D_HTTP`; D2 method `PUT`; D3 `T_GET` `d35c5b23de3bcae18f23e25a77c5c1685add5c8e019bb8da93b9d5e9fa9fa156`; D4 `T_GET` params swapped; D5 `T_MCP` `D_MCP`; D6 endpoint `/rpc`; D7 `call.output` `structured`; D8 `T_CODE` `D_CODE`; D9 source `return { words: 4 };`; D10 `FIX` `ddb45e2247602bfe59863275a523a86a4e98e1ffaec288a1216949391b5e492a`; D11 `T_MCP` with `call.hints` `{ readOnly: true }` `b22045aa41bb8dc09c3dd402f83ffa20610a9f640c33cf6ad35d440fcb082d9c`; D12 the same with `{ readOnly: false }` `c97dd1c57a2fb394718cf51316d263847ba03f0507c8427972feca37bd1dac68`. The 12 digests are pairwise distinct; M6's `SMALL` stays `244a8eeaac0eaa92b0f9f37583383b828cfd1f4aaa3028ab7052e0d013ef2c0c`.

## toolNameOf rows

`createPayment` `create_payment`; `admin.tools.list` `admin_tools_list`; `getHTTPStatus` `get_httpstatus`; `9lives` `t_9lives`; `naïve.tool` `na_ve_tool`; 70 times `a` 64 times `a`; 70 times `9` `t_` plus 62 times `9`; `--` and `""` null.

## Store rows (`withTestDatabase`, `seedTwoTenants`, tenant `a` in profile `team`, `fixedClock("2026-11-06T10:00:00Z")`; `u_alice` registers, `u_dave` submits, `u_carol` approves)

- G1 `{ id: "shop", adapter: "http_openapi", origin: "https://shop.fake.test", local: false, surface: kitSurface("http") }`: `state` `pending`, `pendingDigest` `D_HTTP`, `tools` `[{ name: "find_vendor", effect: "read", ref: null }]`, one event `tools.server_registered` `{ adapter: "http_openapi", origin: "https://shop.fake.test" }`. G2 `notes` (`mcp`, `https://mcp.fake.test`, surface null): `pendingDigest` null, `tools` `[]`, 0 `tool_surface` rows. G3 `snips` (`code_block`, origin `sandbox`, `kitSurface("code")`): origin `sandbox`, `pendingDigest` `D_CODE`, event `{ adapter: "code_block", origin: "sandbox" }`.
- Refusals, each writing no `tool_server`, `tool_surface` or audit row: F1 adapter `fixture`, `nope`: `adapter`, `bad_value`; F2 `code_block` with origin `https://x.fake.test`, with `sandbox` and `local: true`: `origin`, `code_block`; F3 `http_openapi` and `code_block` with surface null: `surface`, `required`; F4 `http_openapi` with `kitSurface("mcp")`: `tools/0/call/kind`, `kind_mismatch`; F5 `shop` again: `TOOLS_EXISTS`.
- Submit, on `shop` registered with `kitSurface("http","b")` (`D_HTTP_B`), every submit at the same instant: H1 dave submits `kitSurface("http")`: `pending`, `pendingDigest` `D_HTTP`, `pendingSubmittedBy` `u_dave`; carol's `approveSurface` for `D_HTTP` gives `approvedDigest` `D_HTTP`, `pendingDigest` null, tools `[{ name: "find_vendor", effect: "read", ref: "shop.find_vendor@1" }]`. H2 `kitSurface("http")` again: the same record, no event; `kitSurface("http","b")`: `TOOLS_REFUSED` `{ reason: "surface_known" }`. H3 `kitSurface("http","c")`: `drifted`, `approvedDigest` `D_HTTP`, `pendingDigest` `D_HTTP_C`, event `tools.surface_submitted` `{ digest: D_HTTP_C, drift: true }`. H4 on `notes` `kitSurface("mcp")`: `pending`, `pendingDigest` `D_MCP`, event `{ digest: D_MCP, drift: false }`; again: unchanged, no event. H5 (writes nothing) `ghost`: `TOOLS_NOT_FOUND`; fixture server `acme` (`registerToolServer`, `https://tools.fake.test`, `{ tools: [FIX] }`): `TOOLS_REFUSED` `{ reason: "adapter_mismatch" }`; `shop` with `kitSurface("mcp")`: `TOOLS_INVALID` `tools/0/call/kind`, `kind_mismatch`. H6 (writes nothing) `submitSurface` on `shop` with `{ tools: [FIX] }`: `TOOLS_REFUSED` `adapter_mismatch`; with `kitSurface("http")`: `TOOLS_INVALID` `tools/0`, `unknown_property`.
- Directory (after carol approves): `resolve(ctx, "shop.find_vendor@1")` (H1's server) deep-equals `{ serverId: "shop", origin: "https://shop.fake.test", local: false, state: "approved", ref: "shop.find_vendor@1", tool: "find_vendor", effect: "read", call: <the `T_HTTP` call>, untrustedResult: false, unsafeToRetry: false }` with no own `http`; `snips.word_count@1` likewise with `serverId` `snips`, origin `sandbox`, the `T_CODE` call; a fixture `acme` approved with `{ tools: [FIX] }` gives `acme.find_vendor@1` with `http: { method: "POST", path: "/vendors/find" }` and no own `call`; an unapproved server gives null.

## callRequest rows (`TARGET` `{ serviceId: S, origin: "https://tools.fake.test" }`)

W1 POST `/vendors/find`, `{ "content-type": "application/json" }`, the 27 bytes of `{"vendor_name":"Acme GmbH"}`: `request` `{ method: "POST", origin: "https://tools.fake.test", path: "/vendors/find", headers, body }`, `egress` `{ POST, tools.fake.test, /vendors/find, D_LV, S, 60 }`. W2 GET `/vendors/V-ACME?expand=true`, `{}`, null: that path, `D_EMPTY`. W3 W1 plus `idempotency-key` `IK`: W1's egress. W4 `toolRequest(kitBinding("http"), TARGET, {}, null)` throws `RangeError`, `toolRequest: binding has no http` (same test as W1).

## Dispatch rows (the `rig` doubles of `authorize.db.test.ts` (a local function there: copied into the new test, as is `policyFrom`): `pool.connect` rejects `db down`, `check` allows with a permit, calls are counted; `LOOKUP` is `{ tool: "acme.lookup_vendor@1", args: { vendor_name: "Acme GmbH" }, nodeId: "lookup", effectSeq: 0 }`)

Q1 `kitBinding("http")`, no `calls`; Q2 `kitBinding("mcp")`, `calls: { http: kitHttpAdapter }`; Q3 `kitBinding("code")`, no `code`: each `INTERPRETER_TOOL_DENIED`, message `tool call of "lookup" is not permitted (adapter_unavailable)`, `details` `{ reason: "adapter_unavailable" }`, `check` 0, `connect` 0, gateway 0. Q4 `kitBinding("code")` with `code`, `services` answering null: `decision_unrecorded`, `check` 1, `principals` 1, `services` 0. Q5 `kitBinding("http")`, `calls: { http: kitHttpAdapter }`, args `{ vendor_name: "x", mode: "refuse" }`: `INTERPRETER_TOOL_FAILED`, `node execution failed`, `{ stage: "request", reason: "refused_args" }`, `check` 0, gateway 0. Q6 as Q5 with `mode` `text` and `throw`: `adapter_reason` and `adapter_error`, no `secret_text` or `Bad Reason` in the error JSON.

## Permit rows (`invokeHarness({ tools, calls, code, policy })`: `tools` answers `kitBinding(kind)` for `acme.lookup_vendor@1`, `policy` is `policyFrom` of `authorize.db.test.ts`, `h.deploy("")`, call `LOOKUP` (for `code` args `{ text: "a b c" }`), run `r_1`)

The stub `check` answers `{ decision: "allow", decidedAt: T0, reasons: ["g"], errors: [], policySetVersion: <the engine's> }` with the id shown, no permit, and records its request.

- P1 `code`, `dec_p1`: `authorize` resolves `{ decisionId: "dec_p1", permit: null }` from a request with no own `egress` member; one `allow` row, permit null; `invoke` resolves `{ output: { words: 3 } }`; the runner's `calls` is `[{ source: "return { words: 3 };", args: { text: "a b c" }, nodeId: "lookup" }]`; gateway 0 calls, `h.egress.issued()` `[]`.
- P2 `http` `dec_p2`, P3 `mcp` `dec_p3`, P4 the real directory's fixture binding (no `tools` wrap) `dec_p4`: each `authorize` throws `INTERPRETER_TOOL_DENIED`, message `tool call of "lookup" is not permitted (permit_missing)`, `details` `{ reason: "permit_missing", decisionId }`; one `allow` row, permit null; gateway 0 calls, `issued()` `[]`. P2's request has `egress` W1's.
- P5 (same test as A1) `http`, `check` delegating to the real engine, `h.deploy(ALLOW_ALL)`: `authorize` resolves with P2's egress as permit; the test sets `permit` of that object to `null`; `invoke` throws `{ reason: "permit_missing", decisionId }`; gateway 0 calls, `issued()` `[]`.

## Answer rows (harness as above with `calls: { http: kitHttpAdapter, mcp: kitMcpAdapter }`, `code: kitCodeRunner().run`, `h.deploy(ALLOW_ALL)`; `wrap.gateway` counts, answers `requestToken` `{ serviceId: S, expiresAt: 4102444800 }` and `send` with the row's response; ctx `idemKey` `IK`; authorize, then invoke)

| # | binding, args, `send` answers | result of `invoke` |
|---|---|---|
| A1 | `http`, `{ vendor_name: "Acme GmbH" }`, 200 `{"vendor_id":"V-1"}` | `{ output: { vendor_id: "V-1" } }`; 1 `requestToken` (permit `{ POST, tools.fake.test, /vendors/find, D_LV, S, 60 }`), 1 `send` whose request is W3's |
| A2 | `mcp`, `{ query: "q" }`, 200 `{"text":"hit"}` | `{ output: { text: "hit" } }`; `send` method `POST`, path `/mcp` |
| A3 | `http`, 200 `[1]`; 200 `{"throw":true}` | `INTERPRETER_TOOL_FAILED`, `node execution failed`, `{ stage: "response", reason: "not_json" }` (no `status`); `{ stage: "response", reason: "adapter_error" }` |
| A4 | `http`, 500 | `{ stage: "upstream", reason: "status", status: "500" }` |
| A5 | `code`, `{ text: "a b c" }` | `{ output: { words: 3 } }`; gateway 0 calls, 0 tokens issued, one `allow` row, permit null |
| A6 | `code`, `{ text: "a", mode: "interp" }`; `mode` `throw` | the runner's own `{ stage: "code", reason: "timeout" }`; `{ stage: "code", reason: "runner" }` |

No error JSON in A3 and A6 contains `secret_text`.
