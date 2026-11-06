# Test plan for add-gateway-client

Error legend: `PERMIT_FOREIGN`, `PERMIT_MISMATCH <field>`, `TOKEN_REFUSED <status>`, `UNAVAILABLE <stage>`, `TOO_LARGE`, `INSECURE <probe>` and `INVALID <reason>` mean a `GatewayError` with code `GATEWAY_<NAME>` and `details` `{ field }`, `{ status }`, `{ stage }`, `{ limit: "1048576" }`, `{ probe }`, `{ reason }` (`{}` for `PERMIT_FOREIGN`), string values.

## Constants

- `T0 = new Date("2026-11-06T10:00:00.000Z")` (second 1793959200), `clock = { now: () => T0 }`. `S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01"`, `S2` ends `02` (both lower-case UUIDs, as every permit `serviceId` here must be; `BASE_EGRESS.serviceId` is `S1`). `TA = "d7f4eeba-9f57-8892-b4bb-591d220496d4"`, `TB = "93baa9da-a394-803d-800c-bf45c3375469"`. `TAG = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 }`.
- `BODY = utf8('{"vendor_name":"ACME"}')`, `D_BODY = 0e9900c914ed43a1be38e237e918e29501562e302390f970957dd30a83a41966`, `D_EMPTY = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. `BASE_EGRESS = { method: "POST", host: "tools.fake.test", path: "/v1/lookup?id=7", bodyDigest: D_BODY, serviceId: S1, ttlSeconds: 60 }`.
- `issuedPermit(over)`: `createPdp` over schema `entity User;\nentity Doc;\naction send appliesTo { principal: User, resource: Doc, context: {} };\n` and policy `@id("allow-send") permit (principal, action == Action::"send", resource);`; `check` of `User::"alice"`, `send`, `Doc::"d1"`, empty context, bare entities, `egress: { ...BASE_EGRESS, ...over }`; returns `decision.permit`.
- `REQ = { method: "POST", origin: "https://tools.fake.test", path: "/v1/lookup?id=7", headers: { "x-caller": "2" }, body: BODY }`. `BT = "bt-secret-4d2a"`, `JWT = "jwt-secret-8a1c"`, `CFG = { brokerUrl: "http://broker.internal:8081", proxyUrl: "http://kong.internal:8000/v1/call", brokerToken: new Secret(BT), agentId: "ursitoare-engine", vault: null }`.
- `recordingFetch(answers)` gives `{ fetch, calls }`, appending `{ url, init }`; an answer is a `Response` or a thrown `Error`; an empty queue throws. `tokenAnswer(exp = 1793959260, jwt = JWT)` is a 200 `Response` of `{"token": jwt, "expires_at": exp}`. `flush()` is `new Promise((r) => setImmediate(r))`.

## Config (scenarios 1 and 2)

`BASE_ENV`: `URSITOARE_EGRESS_BROKER_URL=http://broker.internal:8081/`, `…PROXY_URL=http://kong.internal:8000/v1/call`, `…BROKER_TOKEN_FILE=/s/broker`; `FULL_ENV` adds `…AGENT_ID=eng:1`, `…VAULT_URL=http://vault.internal:50051`, `…VAULT_IDENTITY=svcid_ursitoare_admin`, `…VAULT_TOKEN_FILE=/s/vault`. The reader serves `/s/broker` = `bt-secret-4d2a\n`, `/s/vault` = `vt-secret-6c3e\n`, `/s/blank` = `\n`, `/s/lf` = `bt-secret-4d2a\nx\n`, `/s/cr` = `bt-secret-4d2a\rx`, `/s/nul` = `bt-secret-4d2a` U+0000 `x`, `/s/space` = `bt secret`, `/s/utf` = `bté`, `/s/long` = 4097 × `a` and a newline, `/s/max` = 4096 × `a` and a newline, throws otherwise and records its calls.

| # | Env | Result |
|---|---|---|
| L1, L2 | `{}`; `{ URSITOARE_EGRESS_FOO: "1", URSITOARE_EGRESS_BROKER_URL: "" }` | no own `egress` key (keys exactly `database, engineKey, host, internalPort, logLevel, port, publicBaseUrl, role, shutdownDrainMs, webDist`); `loadEgressConfig({}, reader)` `undefined`, no read |
| L3 | `BASE_ENV` | `brokerUrl` `http://broker.internal:8081`, `proxyUrl` `http://kong.internal:8000/v1/call`, `agentId` `ursitoare-engine`, `vault` `null`, token `bt-secret-4d2a`; reads `["/s/broker"]` |
| L4 | `FULL_ENV` | `agentId` `eng:1`, `vault.url` `http://vault.internal:50051`, `vault.identity` `svcid_ursitoare_admin`, vault token `vt-secret-6c3e`; reads `["/s/broker", "/s/vault"]`; `JSON.stringify` and `util.inspect` of `config.egress` hold neither secret |
| L5 | `FULL_ENV`, PROXY_URL `https://kong.internal:8443///`, VAULT_URL `http://vault.internal:50051/` | `proxyUrl` `https://kong.internal:8443`, `vault.url` `http://vault.internal:50051` |
| L6 | `BASE_ENV` with BROKER_TOKEN_FILE `/s/max` | loads; the token is 4096 characters |

Refusals run through `loadConfig`: `ConfigError`, the `variable` and message `<variable>: <reason>`; no `u:p` or `bt-secret-4d2a` in a message. `REQ_R` = `required when another URSITOARE_EGRESS_ variable is set`; `URL_R` = `must be an http or https URL without credentials, query or fragment`; `ID_R` = `must be 1 to 128 characters of letters, digits, dot, underscore, colon or hyphen`; `VAULT_R` = `set together with the other URSITOARE_EGRESS_VAULT_ variables or not at all`; `ORIGIN_R` = `must be an http or https origin without path, credentials, query or fragment`; `EMPTY_R` = `file is missing, unreadable or empty`; `TOKEN_R` = `must be 1 to 4096 visible ASCII characters`.

| # | Env | `CONFIG_INVALID`, variable, reason |
|---|---|---|
| E1-E3 | only `…AGENT_ID=x`; `BASE_ENV` without PROXY_URL; without BROKER_TOKEN_FILE | `…BROKER_URL`; `…PROXY_URL`; `…BROKER_TOKEN_FILE`; REQ_R |
| E4 | `BASE_ENV` + `URSITOARE_EGRESS_BROKER_TOKEN=x` | that name; `secrets are read only from files; set <name>_FILE` |
| E5-E7 | BROKER_URL `ftp://b`, `http://u:p@b:1`; PROXY_URL `http://p:1/x?y=1` | that variable; URL_R |
| E8 | AGENT_ID `bad id`, then 129 times `a` | `…AGENT_ID`; ID_R |
| E9, E10 | `BASE_ENV` + VAULT_URL only; `FULL_ENV` without VAULT_TOKEN_FILE | `…VAULT_IDENTITY`; `…VAULT_TOKEN_FILE`; VAULT_R |
| E11, E12 | VAULT_URL `http://v:1/x`; VAULT_IDENTITY `a b` | `…VAULT_URL`, ORIGIN_R; `…VAULT_IDENTITY`, ID_R |
| E13-E15 | BROKER_TOKEN_FILE `/s/blank`, `/s/none`; `FULL_ENV` with VAULT_TOKEN_FILE `/s/blank` | `CONFIG_SECRET_EMPTY`; `…BROKER_TOKEN_FILE` twice, `…VAULT_TOKEN_FILE`; EMPTY_R |
| E16 | `FULL_ENV`, PROXY_URL `ftp://p`, AGENT_ID `bad id` | `…PROXY_URL`; URL_R (the first failing check wins) |
| E17, E18 | BROKER_TOKEN_FILE `/s/lf`, `/s/cr`, `/s/nul`; `/s/space`, `/s/utf`, `/s/long` | `…BROKER_TOKEN_FILE`; TOKEN_R (six refusals) |
| E19 | `FULL_ENV` with VAULT_TOKEN_FILE `/s/lf` | `…VAULT_TOKEN_FILE`; TOKEN_R |

## Helpers (scenario 3)

`mintkeyTenantId("tenant_a")` = TA and `("tenant_b")` = TB, each twice, both matching `^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`. `bodyDigest(null)` and of `new Uint8Array(0)` = D_EMPTY; of `BODY` and `Buffer.from(BODY)` = D_BODY. `callHeader(TAG)` = `r_1:lookup:1`; with `attempt: 12`, `r_1:lookup:12`. `permitMatches(BASE_EGRESS, REQ)` with one change:

| # | Change | Result |
|---|---|---|
| M1 | none | true |
| M2-M4 | origin `https://Tools.Fake.Test`; `https://tools.fake.test:443`; `http://tools.fake.test/ignored` | true |
| M5-M10 | method `post`; origin `https://tools.fake.test:8443`, `https://other.fake.test`, `https://tools.fake.test.evil.test`, `not a url`, `""` | false |
| M11, M12 | permit host `tools.fake.test:8443` with origin `https://tools.fake.test:8443`; with `https://tools.fake.test` | true; false |
| M13-M15 | path `/v1/lookup?id=8`; body `{"vendor_name":"ACMF"}`; body `null` | false |
| M16 | permit digest D_EMPTY with body `null`, then `new Uint8Array(0)` | true |

## Issued permit (scenario 4)

`p = await issuedPermit()`: `isIssuedPermit(p)` true, `p` deep-equals `BASE_EGRESS`, frozen. False for `{ ...p }`, `structuredClone(p)`, a JSON round trip, `Object.freeze({ ...BASE_EGRESS })`, `null`, `undefined`, `0`, `"x"`, `[]`, `{}`, `() => p`. A permit from a second `createPdp` is true; a denied decision and an allow without `egress` have no `permit`. `src/pdp/permit.test.ts::C-44202a58` and `C-344619fe` (value comparisons) still hold.

## Token (scenario 5)

Success: `recordingFetch([tokenAnswer()])`, `token = await requestToken(p, TAG)`. One call: `url` `http://broker.internal:8081/v1/issue`; `init` keys exactly `method, headers, body, redirect, signal`; `POST`; `headers` `{ "content-type": "application/json", "x-mintkey-service-token": "bt-secret-4d2a" }`; `body` the text `{"agent_id":"ursitoare-engine","service_id":"0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01","tenant_id":"d7f4eeba-9f57-8892-b4bb-591d220496d4","scope":"call","ttl_seconds":60}`; `redirect` `manual`; `signal` an unaborted `AbortSignal`. `token` deep-equals `{ serviceId: S1, expiresAt: 1793959260 }`, is frozen, has keys `["serviceId", "expiresAt"]`, and `JSON.stringify` and `util.inspect` of it lack `jwt-secret-8a1c`. With `ttlSeconds: 1` the body ends `"ttl_seconds":1}`.

| # | Answer or input | Result |
|---|---|---|
| K1, K2 | 401; 403 | `TOKEN_REFUSED 401`; `TOKEN_REFUSED 403` |
| K3 | 400; 500; 302 with `location: /x` | `UNAVAILABLE token` |
| K4 | 200 with body `nope`, `{"expires_at":1793959260}`, `{"token":"","expires_at":1793959260}`, `{"token":"j","expires_at":1.5}`, `[]`, `{"token":"a\r\nb","expires_at":1793959260}` (a CR and an LF in the token), `{"token":"j","expires_at":1793959291}` (the clock's second 1793959200 + 60 + 30, plus one), a token of 8193 × `a` | `UNAVAILABLE token` each |
| K5 | `new TypeError("fetch failed")`; `new TypeError("fetch failed bt-secret-4d2a")` | `UNAVAILABLE token`; the second error's `message`, `details`, `cause` and `util.inspect` lack `bt-secret-4d2a` |
| K6 | permit `{ ...p }`, nothing queued | `PERMIT_FOREIGN`; `calls` `[]` |
| K7 | tag `runId` `r 1`; `attempt` 0; `tenantId` `""` | `INVALID tag`; `calls` `[]` |
| K8 | 200 with a token of 8192 × `a` and `expires_at` 1793959290 | `{ serviceId: S1, expiresAt: 1793959290 }` (the bounds pass) |
| K9 | permit `issuedPermit({ serviceId: ".." })`; `issuedPermit({ serviceId: S1.toUpperCase() })`, nothing queued | `INVALID service`; `calls` `[]` |

## Send refusals (scenario 6)

One gateway over `recordingFetch([tokenAnswer()])`, `p = issuedPermit()`, `token = requestToken(p, TAG)`. Each row calls `send(permit, request, token, TAG)` with `REQ` changed as stated; after every row `calls` has length 1.

| # | Change | Result |
|---|---|---|
| S1 | permit `{ ...p }` | `PERMIT_FOREIGN` |
| S2-S7 | method `PUT`; origin `https://tools.fake.test:8443`; path `/v1/lookup?id=8`; body `null`; method `GET` with path `/z`; origin `not a url` | `PERMIT_MISMATCH` `method`, `host`, `path`, `bodyDigest`, `method`, `host` |
| S8-S10 | tag `runId` `r 1`; `attempt` 0; `nodeId` `a\nb` | `INVALID tag` |
| S11-S16 | permit and request path `/a/../b`; `/a/%2e%2E/b`; `/..`; `/a#x`; `/a\b`; `/a/..?x` | `INVALID path` |
| S17-S24 | one header: `Authorization: Bearer x`; `x-ursitoare-call: r:n:1`; `host: e`; `cookie: a=b`; `proxy-authorization: x`; `content-length: 3`; `X-Caller: 2`; `x-a: 1\r\nx-b: 2` | `INVALID header` |
| S25-S27 | permit `issuedPermit({ serviceId: S2 })`; token literal `{ serviceId: S1, expiresAt: 1793959260 }`; clock `2026-11-06T10:01:00Z` | `INVALID token_service`; `token_used`; `token_expired` |
| S28, S29 | permit `issuedPermit({ serviceId: ".." })`; `issuedPermit({ serviceId: S1.toUpperCase() })`, with `REQ` | `INVALID service` each |
| O1-O5 | foreign permit with method `PUT`; method `PUT` with tag `attempt` 0; bad tag with path `/..`; path `/..` with header `cookie`; permit `issuedPermit({ serviceId: "..", path: "/.." })` with path `/..` | `PERMIT_FOREIGN`; `PERMIT_MISMATCH method`; `INVALID tag`; `INVALID path`; `INVALID service` |

## Send forward (scenario 7)

A. `CFG`, `recordingFetch([tokenAnswer(), new Response("ok", { status: 200, headers: { "x-up": "1" } })])`, a mutable `now` behind the clock.

| # | Step | Result |
|---|---|---|
| F1 | `send` with method `PUT`; with header `cookie`; then `send(p, REQ, token, TAG)` | the first two refused (`PERMIT_MISMATCH method`, `INVALID header`), token unspent; the third: `status` 200, `headers["x-up"]` `1`, body text `ok` |
| F2 | that call's record | `url` `http://kong.internal:8000/v1/call/0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01/v1/lookup?id=7`; `init` keys exactly `method, headers, body, redirect, signal`; `POST`; `headers` `{ "x-caller": "2", authorization: "Bearer jwt-secret-8a1c", "x-ursitoare-call": "r_1:lookup:1" }`; `body` is `BODY`; `redirect` `manual`; `REQ.headers` still `{ "x-caller": "2" }` |
| F3 | the same token again | `INVALID token_used`; `calls` length 2 |
| F4 | token expiring 1793959260, `now` 10:00:59Z | `send` answers 200 |
| F5 | permit `issuedPermit({ method: "GET", path: "/a?x=../y", bodyDigest: D_EMPTY })`, `body: null` | 200; `url` ends `/a?x=../y`; `init.body` `null` |

B. The fake: `startFakeEgress({ now: () => T0 })`, `startEchoUpstream()`, `fake.addUpstream("tools.fake.test", echo.origin)`, `fake.addCredentialless(S1, TA, "http://tools.fake.test")` (storage and injection of a credential are U45's and U48's), `CFG` from the fake's urls and `brokerServiceToken`.

| # | Step | Result |
|---|---|---|
| X1 | `requestToken(p, TAG)` | `{ serviceId: S1, expiresAt: 1793959260 }`; `fake.issued()` one entry: `jti` matching `^jti_`, `serviceId` S1, `tenantId` TA, `agentId` `ursitoare-engine`, `ttlSeconds` 60, `issuedAt` 1793959200, `expiresAt` 1793959260 |
| X2 | `send` with headers `{ "content-type": "application/json", "x-caller": "2" }` | 200; the echo's JSON: `method` `POST`, `path` `/v1/lookup`, `query` `id=7`, `bodySha256` D_BODY, `headers["x-caller"]` `2`, `["x-ursitoare-call"]` `r_1:lookup:1`, `.host` `tools.fake.test`, no `authorization`; `fake.requests()` one record: `serviceId` S1, `path` `/v1/lookup`, `query` `id=7`, `status` 200, `outcome` `allowed` |
| X3 | the same token again | `INVALID token_used`; `requests()` still one |
| X4 | GET `/redirect` (digest D_EMPTY, attempt 2) | 302, `headers.location` `/landing?from=echo`, empty body; `requests().map(r => r.path)` `["/v1/lookup", "/redirect"]` |
| X5 | tag `tenantId` `tenant_b`, new token, POST as X2 | 502, body `bad gateway: vault error\n`; last `issued()` entry `tenantId` TB; last record `outcome` `rejected`, `status` 502 |
