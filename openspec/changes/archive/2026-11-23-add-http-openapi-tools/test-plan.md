# Test plan: add-http-openapi-tools

Every value was run on 2026-11-17 (Node 24.22.2): scratch versions of the functions against main@3daa5c35's `normalizeBlockImport` and `checkSchema`; digests by the `surfaceDigest` of add-tool-adapters' requirement "The surface digest covers the call and every M6 vector holds" (it reproduces its `D_HTTP`). Rows that need that unit's code: `test-plan-runs.md`.

## Fixtures (`test/support/openapi-kit.ts`)

`SHOP_ORIGIN` `https://shop.fake.test`. `docOf(path, method, op, extra?, version?)` is `{ openapi: version ?? "3.0.3", info: { title: "t", version: "1" }, paths: { [path]: { [method]: { operationId: "op", responses: { "200": OK }, ...op } } }, components: { schemas: { Obj: { type: "object", properties: { id: { type: "string" } } }, ...extra } } }` (`op` is merged over the defaults; `operationId: undefined` removes the id). Local to the tests: `OK` `J({ $ref: "#/components/schemas/Obj" })`, `J(s)` `{ description: "ok", content: { "application/json": { schema: s } } }`, `BODY(s)` `{ content: { "application/json": { schema: s } } }`, `P` `{ name: "id", in: "path", required: true, schema: { type: "string" } }`.

`SHOP_DOC`: `openapi` `3.0.3`, `servers` `[{ url: "/v1" }]`, `components.schemas.Vendor` `{ type: "object", required: ["vendor_id"], properties: { vendor_id: { type: "string" }, status: { type: "string", enum: ["active", "blocked", null], nullable: true } } }`, paths:
- `/vendors/{vendor_id}`: path-item `parameters` `[{ name: "vendor_id", in: "path", required: true, schema: { type: "string" } }]`; `get` `getVendor` (summary `Get a vendor.`, query `expand` boolean, query `limit` integer with `minimum` 1 and `required` true, `200` `J($ref Vendor)`); `delete` `deleteVendor` (`204` `{ description: "gone" }`).
- `/vendors`: `post` `createVendor` (`BODY({ type: "object", required: ["name"], properties: { name: { type: "string", example: "Acme" }, country: { type: "string", nullable: true } } })`, `201` `J($ref Vendor)`).
- `/pages`: `post` `fetchPage` (`BODY({ type: "object", required: ["url"], properties: { url: { type: "string" } } })`, `200` `J({ type: "object", properties: { title: { type: "string" } } })`).
- `/vendors/export`: `head` `exportVendors` (`200` `{ description: "ok" }`).

`SHOP_OVERLAY` `{ operations: { getVendor: { effect: "read" }, createVendor: { effect: "write", name: "add_vendor", unsafe_to_retry: true }, deleteVendor: { effect: "write" }, fetchPage: { effect: "read", description: "Fetch a page." } } }`. `SHOP_B` is `SHOP_DOC` with the `getVendor` summary `Fetch a vendor.`; `OVERLAY_C` is `SHOP_OVERLAY` with `deleteVendor` `{ effect: "pay" }`.

`D_SHOP` `sha256:726b207dffe2a42cb6d04fc724f06997614217038f83f37b9e8fae83614fc7ba` (`SHOP_DOC` with `SHOP_OVERLAY`; canonical JSON 1,950 characters), `D_SHOP_B` `sha256:3e4c03705609cb90a562f6a8b19ff27d83e2e297ff41ffdb9ef39a63030d37aa` (`SHOP_B`), `D_SHOP_C` `sha256:3d78b62fa7020a762eeed39c51e41cbe99b25de1ec3e23441d8b121698620087` (`SHOP_DOC` with `OVERLAY_C`). `D_EMPTY` `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Refs after approval: `shop.get_vendor@1`, `shop.delete_vendor@1`, `shop.add_vendor@1`, `shop.fetch_page@1`.

## Read rows (`readOpenApi(doc, SHOP_ORIGIN)`; `globalThis.fetch` is a throwing stub and is never called)

`SHOP_DOC`: `{ version: "3.0", basePath: "/v1" }` and operations `[operationId, method, path, name, excluded]`: `[getVendor, GET, /vendors/{vendor_id}, get_vendor, null]`, `[deleteVendor, DELETE, /vendors/{vendor_id}, delete_vendor, null]`, `[createVendor, POST, /vendors, create_vendor, null]`, `[fetchPage, POST, /pages, fetch_page, null]`, `[exportVendors, HEAD, /vendors/export, export_vendors, method_unsupported]`.

`D0` is `{ openapi: "3.0.3", paths: { "/a": { get: { operationId: "op", responses: { "200": OK } } } }, components: { schemas: { Obj: { type: "object" } } } }` with the change shown:

| # | change | result |
|---|---|---|
| B1 | `servers` `[{ url: "/v1" }]`; `"/v1/"`; `"/"`; none; `[]` | basePath `/v1`, `/v1`, `""`, `""`, `""` |
| B2 | `openapi` `3.1.0`, `servers` `[{ url: "https://shop.fake.test/v1/" }]` | version `3.1`, basePath `/v1` |
| B3 | url `https://other.fake.test/v1`; `v1`; `//shop.fake.test/v1`; `https://shop.fake.test:8443/v1`; `http://shop.fake.test/v1` | each `servers`, `server_mismatch` |
| B4 | url `https://{host}/v1` | `servers`, `server_variables` |
| B5 | `openapi` `2.0`; `3.2.0`; absent | `openapi`, `openapi_version` |
| B6 | `paths` `{}`; `{ "/a": {} }` | `paths`, `no_operations` |
| B7 | the document is `[]` | `document`, `not_object` |
| B8 | `get` and `post` of `/a` both `operationId` `same` | `paths`, `duplicate_operation_id` |
| B9 | url `https://shop.fake.test/v1?x=1`; `/v 1`; and a path key `a` (no leading `/`) beside `/a` | each url `servers`, `server_mismatch`; one operation (`op`) |

Exclusions (`docOf(path, method, op, extra)`, the first operation; name `op` unless shown):

| # | path, method, `op` | `excluded` |
|---|---|---|
| X1 | `/a` get, no `operationId`; `operationId` `--` | `no_operation_id`, name null |
| X2 | `/a` head; `/a` get with `requestBody` `BODY({ type: "object", properties: {} })` | `method_unsupported` |
| X3 | `/a` get, parameter `{ name: "X-Trace", in: "header", schema: { type: "string" } }`; `in: "cookie"` | `param_location` |
| X4 | `/a` get, query `q` schema `{ type: "array", items: { type: "string" } }`; `q` with `content` and no `schema`; `q` `{ type: "string", nullable: true }`; `/a/{id}` path `id` `{ type: "number" }`; query `filter[status]` | `param_schema` |
| X5 | `/a/{id}` get, no parameter; `/a/v{id}` with `P`; `/a` with `P`; `/a/../{id}` with `P` | `path_template` |
| X6 | `/a` post, `requestBody` content `text/plain` only | `body_media_type` |
| X7 | `/a` post, `BODY({ type: "array", items: { type: "string" } })`; `BODY({ type: "object" })`; `BODY({ type: "object", required: ["z"], properties: { a: { type: "string" } } })` | `body_not_object` |
| X8 | `/a` post, query `id` and body property `id`; `/a/{id}` get, `P` and query `id` | `param_collision` |
| X9 | `/a` get, `200` `application/json` schema an array; only `default`; `200` `text/plain` only | `response_not_object` |
| X10 | `/a` get, query `url_host`; `/a` post, body property `url_host` | `reserved_name` |
| X11 | query schema `{ $ref: "other.json#/Q" }`; query schema `$ref` `Loop` (`extra` `Loop` `{ $ref: "#/components/schemas/Loop" }`); body property `{ type: "number", minimum: 1, exclusiveMinimum: true }` | `ref_remote`; `ref_cycle`; `schema_invalid` |
| X12 | head with a header parameter and a `text/plain` body; get with a header parameter and only `default` | `method_unsupported`; `param_location` |
| K1 | get with responses `201` `OK`; `2XX` `OK`; `204`; `200` without `content`; `default` and `204`; parameter `{ $ref: "#/components/parameters/P" }` at `/a/{id}` (with `components.parameters.P` `P`) | `null` each |

## Translate rows (`translateSchema(s, version, D)`; `D` holds `components.schemas.Vendor` `{ type: "object", properties: { id: { type: "string", nullable: true } } }`, `A` and `B` referring to each other under `properties`, and `c` `{ X: { type: "string" }, "a/b c": { type: "string" } }`)

| # | schema, version | result |
|---|---|---|
| T1 | `{ type: "string", nullable: true }`, 3.0 | `{ type: ["string", "null"] }`; `checkSchema` accepts `null` and `"a"`, refuses `5` |
| T2 | `{ type: "string", nullable: false }`; `{ nullable: true, enum: ["a"] }`; 3.0 | `{ type: "string" }`; `{ enum: ["a"] }` |
| T3 | `{ type: "string", nullable: "yes" }`, 3.0 | `schema_invalid` |
| T4 | `{ type: "object", properties: { example: { type: "string", example: "e" }, nullable: { type: "boolean" }, "x-k": { type: "string", "x-n": 1 } }, xml: { name: "q" }, externalDocs: { url: "http://x" }, "x-top": 1 }`, 3.0 | `{ type: "object", properties: { example: { type: "string" }, nullable: { type: "boolean" }, "x-k": { type: "string" } } }` |
| T5 | `{ type: "string", nullable: true, example: "s", "x-a": 1 }`, 3.1 | `{ type: "string", nullable: true, "x-a": 1 }` |
| T6 | `{ $id: "x", $schema: "http://json-schema.org/draft-07/schema#", type: "string" }`, 3.1, run twice | `{ type: "string" }` twice; `checkSchema` accepts `"q"` on both |
| T7 | `{ type: "array", items: { $ref: "#/components/schemas/Vendor" } }`, 3.0 | `{ type: "array", items: { type: "object", properties: { id: { type: ["string", "null"] } } } }`, no `$ref` |
| T8 | `{ $ref: "#/c/X", description: "d", example: "e" }`; `{ $ref: "#/c/a~1b%20c" }`; `{ $ref: "#/c/X", maxLength: 3 }` | `{ type: "string" }`; `{ type: "string" }`; `schema_invalid` |
| T9 | `{ $ref: "other.json#/X" }`; `{ $dynamicRef: "#meta" }` (3.1) | `ref_remote` |
| T10 | `{ $ref: "#/components/schemas/A" }`; `{ $ref: "#/components/schemas/Missing" }` | `ref_cycle`; `schema_invalid` |
| T11 | `$ref` chain `S0` to `S31` ending in `{ type: "string" }` (32 expansions); the same with 33 | `{ type: "string" }`; `schema_invalid` |
| T12 | `{ type: "number", minimum: 1, exclusiveMinimum: true }`; `{ type: "nope" }`; `"x"`; 6000 properties `p0` to `p5999` of `{ type: "string", description: 40 times x }` (496,922 characters) | `schema_invalid` each |
| T13 | `{ type: "string", pattern: "^(a+)+$", maxLength: 40 }`, 3.0; `{ type: "object", properties: { pattern: { type: "string", pattern: "^a$" } } }`, 3.1 | `{ type: "string", maxLength: 40 }`; `{ type: "object", properties: { pattern: { type: "string" } } }` |
| T14 | `D.c` holds `L0` to `L30` `{ type: "object", properties: { a: { $ref: "#/c/L<i+1>" }, b: { $ref: "#/c/L<i+1>" } } }` and `L31` `{ type: "string" }`; `{ $ref: "#/c/L0" }` with 31 levels; with 12 levels (`L0` to `L11`, `L12` the string) | `schema_invalid` at once (the count stops at 20,000 objects; 2^31 leaves unbounded); `ok` true |
| T15 | a schema nested 65 objects deep (`{ type: "object", properties: { p: … } }`, innermost `{ type: "string" }`); one nested 100,000 deep, built by a loop | `schema_invalid` each; the second does not throw |
| T16 | `{ type: "object", patternProperties: { "^a": { type: "string" } } }`, 3.1 | `schema_invalid` |

## Import rows (`importOpenApi(doc, SHOP_ORIGIN, overlay)`)

M1: `SHOP_DOC` with `SHOP_OVERLAY` gives four tools in document order, each `untrusted_result` true with no `untrusted_fields` (`unsafe_to_retry` as shown), digest `D_SHOP`, and `checkAdapterSurface("http_openapi", it)` returns it:
- `get_vendor`: description `Get a vendor.`, `read`, `unsafe_to_retry` false, input `{ type: "object", properties: { vendor_id: { type: "string" }, expand: { type: "boolean" }, limit: { type: "integer", minimum: 1 } }, required: ["vendor_id", "limit"], additionalProperties: false }`, output `V_OUT` `{ type: "object", required: ["vendor_id"], properties: { vendor_id: { type: "string" }, status: { type: ["string", "null"], enum: ["active", "blocked", null] } } }`, call `{ kind: "http", method: "GET", path: "/v1/vendors/{vendor_id}", params: [{ name: "vendor_id", in: "path" }, { name: "expand", in: "query" }, { name: "limit", in: "query" }], body: false }`.
- `delete_vendor`: no `description`, `write`, `unsafe_to_retry` true (the default for every effect but `read`), input `{ type: "object", properties: { vendor_id: { type: "string" } }, required: ["vendor_id"], additionalProperties: false }`, output `HTTP_EMPTY_OUTPUT`, call DELETE `/v1/vendors/{vendor_id}`, params `[{ vendor_id, path }]`, `body` false.
- `add_vendor`: `write`, `unsafe_to_retry` true, input `{ type: "object", properties: { name: { type: "string" }, country: { type: ["string", "null"] } }, required: ["name"], additionalProperties: false }`, output `V_OUT`, call POST `/v1/vendors`, `params` `[]`, `body` true.
- `fetch_page`: description `Fetch a page.`, `read`, input `{ type: "object", properties: { url: { type: "string" } }, required: ["url"], additionalProperties: false }`, output `{ type: "object", properties: { title: { type: "string" } } }`, call POST `/v1/pages`, `body` true.

M2: `getVendor` `{ effect: "send", untrusted_result: false, unsafe_to_retry: true, data_class: "private", description: "Override." }` gives those values. M3: `/a/{id}` with a path-item `P` (string) and an operation parameter `id` `{ type: "integer" }` gives input properties `{ id: { type: "integer" } }`, `required` `["id"]`. M4: a `post` with `200` and no `content` gives output `{ type: "object", additionalProperties: false }`. M5: a `summary` of 2001 characters gives no `description`.

Refusals (`TOOLS_INVALID`, `field`, `reason`; `SHOP_DOC` unless shown):

| # | overlay | field, reason |
|---|---|---|
| O1 | `[]`; `SHOP_OVERLAY` plus `x: 1` | `overlay`, `not_object`; `overlay`, `unknown_property` |
| O2 | `{ operations: [] }`; `{ operations: {} }`; 101 entries `op0` to `op100` | `overlay/operations`: `not_object`; `size`; `too_many_tools` |
| O3 | `getVendor` `{}`; `{ effect: "delete" }`; `{ effect: "read", x: 1 }` | `overlay/operations/getVendor/effect`: `required`; `bad_value`; then `overlay/operations/getVendor`: `unknown_property` |
| O4 | `getVendor` `name` `Get-Vendor`; `untrusted_result` `"no"`; `description` of 2001 characters; `data_class` `secret` | `overlay/operations/getVendor/<member>`, `bad_value` |
| O5 | `ghost`; `exportVendors` | `overlay/operations/ghost`, `unknown_operation`; `overlay/operations/exportVendors`, `operation_excluded` |
| O6 | `getVendor` and `deleteVendor` with `name` `get_vendor`; operations `createPayment` and `create_payment` | `overlay/operations/deleteVendor/name`, `name_collision`; `overlay/operations/create_payment/name`, `name_collision` |
| O7 | a document with `get` operations `constructor` (`/a`) and `getVendor` (`/b`) and overlay `{ getVendor }`; the same document with overlay `toString` | one tool `get_vendor` (none for `constructor`); `overlay/operations/toString`, `unknown_operation` |
| S1 | 5 `get` operations `op0` to `op4`, each answering `$ref` `Big` (3000 properties `p0` to `p2999` of 40 times x, 247,922 characters), each in the overlay (paths `/a0` to `/a4`, entries `{ effect: "read" }`); and 4 | `surface`, `size` (1,240,801 characters); 4 tools accepted (992,643 characters) |

## Build rows (`httpCallAdapter.build(call, args, key)`; `GET`, `POST`, `DEL` are the `get_vendor`, `add_vendor`, `delete_vendor` calls of M1; every success has header `accept: application/json`; `IK` is `ik1_` plus 64 times `c`)

| # | call, args, key | path; other headers; body |
|---|---|---|
| W1 | GET `{ vendor_id: "V-ACME", expand: true, limit: 5 }`, no key and `IK` | `/v1/vendors/V-ACME?expand=true&limit=5`; none, or `idempotency-key: IK`; null (`D_EMPTY`) |
| W2 | GET `{ vendor_id: "V ACME/1", limit: 5 }`; `{ vendor_id: "V-ACME", expand: null, limit: 0 }`; `{ vendor_id: 7, limit: 1, junk: "x" }`; `{ vendor_id: "%2e%2e", limit: 1 }` | `/v1/vendors/V%20ACME%2F1?limit=5`; `/v1/vendors/V-ACME?limit=0`; `/v1/vendors/7?limit=1`; `/v1/vendors/%252e%252e?limit=1`; no body |
| W3 | a GET with query params `q` and `n`, `{ vendor_id: "a", q: "a&b=c d?é", n: 1.5 }` | `/v1/vendors/a?q=a%26b%3Dc%20d%3F%C3%A9&n=1.5` |
| W4 | POST `{ name: "Acme GmbH", country: null }`, no key and `IK` | `/v1/vendors`; `content-type: application/json` (and the key); 35 bytes `{"country":null,"name":"Acme GmbH"}`, digest `fffab11972d205c21f38a33909fa8a0e9c09faf74cf90a2434d94ccaf60b956d` both times |
| W5 | POST `{ name: "Acme GmbH", country: null, meta: { b: 1, a: [{ z: 1, y: 2 }] } }` | 70 bytes `{"country":null,"meta":{"a":[{"y":2,"z":1}],"b":1},"name":"Acme GmbH"}`, digest `a214622608d0193891b35608fc40f3ec0e0ccc2a2c567869c2c1f09bf3841cff` |
| W6 | DEL `{ vendor_id: "V-1", junk: 1 }`, `IK` | `/v1/vendors/V-1`; `idempotency-key: IK`; no body, no `content-type` |
| W7 | a POST on `/v1/pages` with `{ url: "https://Docs.Example.com/a?x=1" }` | 40 bytes `{"url":"https://Docs.Example.com/a?x=1"}`, digest `0f7b9f750d893a3d5f6c0b3db19905c4460e0299bd3343306d95d8c4e669f22e` |

Refusals (`{ ok: false, reason }`): args `[]`, `null`, `"x"` `args_not_object`; GET with `{ limit: 5 }`, or `vendor_id` `""`, `null`, `".."`, `"."`, `"\ud800"`, `{ a: 1 }` or `true`, `path_param`; `limit` `{}` or `"\ud800"`, `expand` `[1]`, `query_param`. Length (`src/pdp/permit.ts:6`): DEL with `vendor_id` of 2036 times `a` (path 2048 characters) is accepted, 2037 is `path_too_long`; a GET with path plus query of 2048 is accepted, 2049 is `path_too_long`.

## Answer rows (`answer(GET, { status, headers: {}, body })`)

200 `{"vendor_id":"V-1"}` and 299 `{"a":1}` give `{ ok: true, output }` with that object; 201 and 204 with an empty body `{ ok: true, output: {} }`; 200 with `[1]`, `null`, `not json`, `   ` or the bytes `7b ff 7d` `{ ok: false, stage: "response", reason: "not_json", status: null }`; 500 (object body), 404, 301, 300 and 199 `{ ok: false, stage: "upstream", reason: "status", status }` with that number.
