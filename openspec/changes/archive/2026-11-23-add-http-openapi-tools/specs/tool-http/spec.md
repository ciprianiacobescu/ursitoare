## Purpose

Uploaded OpenAPI 3.0 and 3.1 JSON documents become `http` call tools: a preview lists the candidates, the admin's overlay chooses the operations and sets each effect, and the `http` adapter builds each request and reads each answer.

## ADDED Requirements

### Requirement: readOpenApi lists the operations of an uploaded document and the first exclusion of each
`readOpenApi(document, origin)` SHALL read only its arguments (no file, no network) and answer `{ version, basePath, operations }`. It SHALL refuse with `TOOLS_INVALID` `{ field, reason }`: a document that is not a plain object (`document`, `not_object`); an `openapi` outside `3.0.x` and `3.1.x` (`openapi`, `openapi_version`); a first `servers` url with `{` (`servers`, `server_variables`), or that is neither a path starting with one `/` nor an absolute url of `origin` without query or fragment, or whose path has a character outside RFC 3986 `pchar` (`servers`, `server_mismatch`); no operation (`paths`, `no_operations`); one `operationId` twice (`paths`, `duplicate_operation_id`). `basePath` is that path without trailing slashes, or `""`. The operations are those of `get`, `post`, `put`, `patch`, `delete`, `head`, `options`, `trace` under each path starting with `/`, in document order, with `method` in capitals, `name` `toolNameOf(operationId)` and `excluded` the first of these, in order:
- `no_operation_id`: the id is missing, not a string or has no name;
- `method_unsupported`: `head`, `options`, `trace`, or a `get` or `delete` with a `requestBody`;
- `param_location`: a parameter not `in` `path` or `query`;
- `param_schema`: a parameter named outside `^[A-Za-z0-9_.-]{1,64}$`, without `schema`, or whose translated `type` is not one string of `string`, `integer` (path) or also `number`, `boolean` (query);
- `path_template`: a `{…}` that is not a whole segment or is repeated, a placeholder without a path parameter or the reverse, a `.` or `..` segment, or a path that with the base path fails `^/[\x21-\x7e]{0,1023}$` or has `?`, `#`, `\`;
- `body_media_type`: no `application/json` content;
- `body_not_object`: a body schema whose `type` is not `object`, that has no `properties`, or whose `required` names a missing property;
- `param_collision`: two parameters, or a parameter and a body property, with one name;
- `response_not_object`: the first of `200`, `201`, `202`, `2XX` has content that is not an `application/json` object schema, or none exists and there is no `204`;
- `reserved_name`: a parameter or body property named `url_host`;
- the reason of a failed translation (`ref_remote`, `ref_cycle`, `schema_invalid`) where that schema is first read.

Path-item parameters merge under the operation's (same name and `in`: replaced); a `$ref` on a parameter, request body or response resolves like a schema `$ref`.

#### Scenario: Versions, base paths and document refusals
- **WHEN** `readOpenApi` runs on `SHOP_DOC` and on rows B1 to B9 of test-plan.md § Read rows, with `fetch` replaced by a throwing stub
- **THEN** `SHOP_DOC` answers version `3.0`, base path `/v1` and five operations (`exportVendors` `method_unsupported`); each B row answers its base path or throws its `field` and `reason`; the stub was never called

#### Scenario: Each exclusion, in order
- **WHEN** rows X1 to X12 and K1 of test-plan.md § Read rows run
- **THEN** each row's operation has the `excluded` of its row (X11 `ref_remote`, `ref_cycle`, `schema_invalid`), X12 shows the order, and every K1 row is `null`

### Requirement: translateSchema turns an OpenAPI schema into a plain JSON Schema or says why not
`translateSchema(schema, version, document)` SHALL answer `{ ok: true, schema }` or `{ ok: false, reason }`. It SHALL inline a local `$ref` `#/…` from `document` (segments percent-decoded, then `~1`, `~0`) at most 32 expansions deep, and SHALL answer `schema_invalid` when the expansion has met more than 20,000 schema objects (counted while it expands, a `$ref` object and its target each counting; the block bound of 262,144 characters holds fewer) or a schema is nested deeper than 64 objects (checked before descending, so no recursion overflows), and drop the annotation siblings of a `$ref` (`description`, `summary`, `title`, `example`, `examples`, `default`, `deprecated`, `readOnly`, `writeOnly`, `xml`, `externalDocs`). It SHALL answer `ref_remote` for a `$ref` not starting `#/` and for a `$dynamicRef`, `ref_cycle` for a pointer met again while it is expanded, and `schema_invalid` for another `$ref` sibling, an unresolved pointer, a deeper chain, a non-object schema, or a result that `normalizeBlockImport` refuses as a block `input`. It SHALL drop `example`, `xml`, `externalDocs`, `$id`, `$schema` and `pattern` at every schema position (a property of that name under `properties` stays; `pattern` is dropped because an engine-side regular expression of a third party can freeze the event loop), answer `schema_invalid` for a `patternProperties` member (dropping it would turn its properties into `additionalProperties` failures), and for 3.0 also `x-*` keywords; for 3.0, `nullable: true` beside a string `type` makes it `[type, "null"]`, `nullable: false` or `nullable` without a `type` is dropped and a non-boolean `nullable` is `schema_invalid`. Nothing else changes and the result holds no `$ref`.

#### Scenario: Translation vectors
- **WHEN** `translateSchema` runs on rows T1 to T16 of test-plan.md § Translate rows
- **THEN** each row gives its schema or reason (T11: 32 expansions accepted, 33 `schema_invalid`; T14 and T15 `schema_invalid` at the object and nesting bounds, T15 with no throw); T1's result accepts `null` and `"a"` in `checkSchema` and refuses `5`; both T6 results pass `checkSchema`; no accepted result contains `$ref`

### Requirement: importOpenApi builds one http tool per overlay entry
`importOpenApi(document, origin, overlay)` SHALL read the document as `readOpenApi` does and refuse, as `TOOLS_INVALID` `{ field, reason }`: an overlay that is not `{ operations }` (`overlay`, `not_object` or `unknown_property`); `operations` not an object (`overlay/operations`, `not_object`), empty (`size`) or over 100 entries (`too_many_tools`); an entry (`overlay/operations/<id>`) that is not an object (`not_object`) or has a member other than `effect`, `name`, `description`, `untrusted_result`, `unsafe_to_retry`, `data_class` (`unknown_property`), has no `effect` (`…/effect`, `required`) or a bad value (`bad_value`: `effect` outside `read`, `write`, `send`, `pay`; `name` outside `^[a-z][a-z0-9_]{0,63}$`; `description` not 1 to 2000 well-formed characters without U+0000; a flag not boolean; `data_class` outside `public`, `private`); an id no operation has (`unknown_operation`) or whose operations are all excluded (`operation_excluded`), at `overlay/operations/<id>`; a name used twice (`name_collision`, at `overlay/operations/<id>/name` of the later operation). For each non-excluded operation of the overlay, in document order, it SHALL make a tool: `name` the overlay's or the derived one; `description` the overlay's or the `summary` when that is 1 to 2000 well-formed characters without U+0000; `effect`; `untrusted_result` (default true); `unsafe_to_retry` (default `false` for effect `read`, else `true`, so a payment that may have been sent is never re-sent after a crash); `data_class` only when set; `input` `{ type: "object", properties: parameters then body properties, required: path parameters, required query parameters, then the body's, additionalProperties: false }` (`required` left out when empty); `output` the translated first-2xx schema or `HTTP_EMPTY_OUTPUT`; `call` `{ kind: "http", method, path: basePath + path, params: path parameters then query parameters, body: the operation has a body }`. The result SHALL pass `checkAdapterSurface("http_openapi", …)`, whose refusal (`surface`, `size`) passes on. Every lookup by an `operationId` or overlay key SHALL use `Object.hasOwn`. The effect is the overlay's alone: an operation it does not name is not a tool.

#### Scenario: A tool per overlay entry
- **WHEN** `importOpenApi` runs on rows M1 to M5 of test-plan.md § Import rows
- **THEN** M1 gives the four tools of the row, digest `D_SHOP`, the surface unchanged by `checkAdapterSurface` and no tool for `exportVendors`; M2 to M5 give the values of their rows

#### Scenario: Each overlay and size refusal
- **WHEN** rows O1 to O7 and S1 of test-plan.md § Import rows run
- **THEN** each throws the `field` and `reason` of its row (S1 `surface`, `size` at 1,240,801 characters; 4 tools of 992,643 characters accepted)

### Requirement: build turns arguments into the one request, with path and body independent of the key
`httpCallAdapter.build(call, args, idemKey)` SHALL answer `{ ok: false, reason }`: `args_not_object` for args that are not a plain object; `path_param` for a placeholder value that is missing, null, `""`, `.`, `..`, not a string or finite number, or not encodable; `query_param` for a query value that is not a string, finite number or boolean, or not encodable (a missing or null one is left out); `path_too_long` when path and query pass 2048 characters (the permit's bound). Otherwise it SHALL answer the method, the path with each `{name}` replaced by `encodeURIComponent(String(value))`, then `?` and `encodeURIComponent(name)=encodeURIComponent(String(value))` joined by `&` in `params` order, the headers `accept: application/json`, `content-type: application/json` only with a body and `idempotency-key` only when `idemKey` is not null, and, when `call.body`, the body: the UTF-8 of `JSON.stringify` of the arguments without the `params` names, keys sorted at every depth (else null: a body-less call sends no other argument). Path and body SHALL not depend on `idemKey`; every reason SHALL match `^[a-z][a-z0-9_]{0,63}$`.

#### Scenario: Request vectors, refusals and the length bound
- **WHEN** `build` runs on rows W1 to W7, the refusal rows and the length rows of test-plan.md § Build rows
- **THEN** each success gives the path, headers and body of its row (digests `D_EMPTY`, `fffab119…956d`, `a2146226…1cff`, `0f7b9f75…f22e`; W1, W4 and W6 identical with and without `IK`), each refusal its `reason` (`args_not_object`, `path_param`, `query_param`), 2048 characters are accepted and 2049 are `path_too_long`

### Requirement: answer maps a response to an output or a failure
`httpCallAdapter.answer(call, response)` SHALL answer `{ ok: false, stage: "upstream", reason: "status", status }` for a status outside 200 to 299 (a redirect included), `{ ok: true, output: {} }` for a 2xx with an empty body, `{ ok: true, output }` for a 2xx whose body is UTF-8 JSON holding an object, and `{ ok: false, stage: "response", reason: "not_json", status: null }` for any other 2xx. It SHALL not read headers; the block runtime checks the output schema.

#### Scenario: Answer vectors
- **WHEN** `answer` runs on the rows of test-plan.md § Answer rows
- **THEN** each row gives its result (`{}` for an empty 2xx body, `not_json` for five bodies, `upstream` with the status for 500, 404, 301, 300 and 199)

### Requirement: registerOpenApiServerTx and submitOpenApiTx store the imported surface through the adapter seam
`registerOpenApiServerTx(tx, ctx, input, actor, opts)` SHALL check the origin with `validateOrigin(origin, { local })` (`origin`, its reason), import the document with it, then call `registerAdapterServerTx` with adapter `http_openapi`. `submitOpenApiTx(tx, ctx, serverId, input, actor, opts)` SHALL read the server's adapter and origin in `tx` (`TOOLS_NOT_FOUND`; any adapter but `http_openapi` `TOOLS_REFUSED` `{ reason: "adapter_mismatch" }`), import with the stored origin, then call `submitAdapterSurfaceTx`. A refusal SHALL write nothing, and the document is not stored.

#### Scenario: Registering, replacing and each refusal
- **WHEN** rows G1, F1 to F6 and H1 to H6 of test-plan-runs.md § Store rows run
- **THEN** G1 and H1 to H4 give their records, states and events (H3 `surface_known`, H4 `drifted`); each refusal throws the code, `field` and `reason` of its row and writes no `tool_server`, `tool_surface` or audit row

### Requirement: Three routes preview, register and replace an OpenAPI server
`registerOpenApiToolRoutes` SHALL define, for action `register_tool_server` and the session, `POST /api/v1/tool-registrations/openapi/preview` (body `{ origin, local?, document }`, origin checked by `validateOrigin`, 200 the preview), `POST /api/v1/tool-registrations/openapi` (`respondIdempotent`, body `{ id, origin, local?, document, overlay }`, 201 the server record) and `PUT /api/v1/tool-servers/{id}/openapi` (body `{ document, overlay }`, 200 the record). Bodies SHALL have `additionalProperties` false and `document` and `overlay` objects. `ToolsError` SHALL map as the tool-server routes do: `TOOLS_INVALID` to 400 `VALIDATION_FAILED` with one field (`body/` before the field, `body/document/` before `openapi`, `servers` and `paths`, `body/document` for `document` and for a `tools/…` or `surface` field of the derived surface; message the reason), `TOOLS_EXISTS` to 409 `ALREADY_EXISTS`, `TOOLS_REFUSED` to 422 `OPERATION_REFUSED` `{ reason }`, `TOOLS_NOT_FOUND` to 404. A missing pool SHALL be 503 `AUTHZ_UNAVAILABLE`.

#### Scenario: Preview, register, replay and replace
- **WHEN** rows P1 to P3 of test-plan-runs.md § Route rows run
- **THEN** each answers its status and body (P2: 201, the replay with `idempotent-replayed` `true`, 409 `ALREADY_EXISTS` for a new key, 422 `IDEMPOTENCY_KEY_REUSED` for another body)

#### Scenario: Route refusals
- **WHEN** row P4 of test-plan-runs.md § Route rows runs
- **THEN** each refusal answers its status, code and `fields` and stores nothing

### Requirement: The engine wires the adapter and the routes and the API document lists them
`src/main.ts` SHALL pass a `calls` object with the member `http: httpCallAdapter` to `createInvokePath` and call `registerOpenApiToolRoutes` after `registerToolServerRoutes`; `src/tools/index.ts` and `src/api/index.ts` SHALL export the names of Interfaces given; `docs/api/openapi.json` SHALL hold the three operations.

#### Scenario: The index files export the names
- **WHEN** the namespaces of `src/tools/index.ts` and `src/api/index.ts` are read by the tests of tasks 1.1 to 4.1
- **THEN** `translateSchema`, `readOpenApi`, `importOpenApi`, `registerOpenApiServerTx`, `submitOpenApiTx` and `registerOpenApiToolRoutes` are functions, `httpCallAdapter` has `build` and `answer` functions, and `HTTP_EMPTY_OUTPUT` has `additionalProperties` false

#### Scenario: The document and main
- **WHEN** the rows of test-plan-runs.md § Document and main rows are checked against `docs/api/openapi.json` and `src/main.ts`
- **THEN** the served and the committed document hold the three operation ids with action `register_tool_server`, and `src/main.ts` holds a `calls` object with the member `http: httpCallAdapter`

### Requirement: An OpenAPI tool's request equals its permit
A call of an `http` tool of this adapter SHALL reach the upstream as exactly the method, host, path (query included) and body digest of the permit of its decision: the echo's `method`, `path` plus `?` plus `query` and `bodySha256` equal the stored permit's `method`, `path` and `bodyDigest`; the forwarded headers include `idempotency-key` when the call's key is given and none when it is null; a `url` argument reaches the policy point as `url` and `url_host`; a refused argument list sends nothing.

#### Scenario: A templated GET, a POST with a body, a url argument and a refused path
- **WHEN** rows E1 to E5 of test-plan-runs.md § Exit rows run through the fake egress and the echo upstream
- **THEN** each row's permit, echo output and forward equal its row (E1 `GET /v1/vendors/V%20ACME%2F1?expand=true&limit=5` with `D_EMPTY` and key `IK`, E3 no key header, E4 `url_host` `docs.example.com`), E5 fails `path_param` with no decision, and 4 requests were forwarded
