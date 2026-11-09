## Purpose

A Mintkey-shaped broker, proxy and vault on loopback for the test gates, with records of what happened and a contract suite that also runs against the real stack: no Docker, Kong or secret.

## ADDED Requirements

### Requirement: The broker issues a bounded EdDSA token and records it
`POST /v1/issue` on `brokerUrl` SHALL answer 401 unless `X-Mintkey-Service-Token` equals `brokerServiceToken`, 400 `validation_failed` for a malformed body or a field out of bounds, and otherwise 200 `{ token, expires_at }`: an Ed25519 JWT with claims `aud`, `exp`, `iat`, `iss` `mintkey/broker`, `jti`, `scope`, `service_id`, `sub`, `tenant_id`, `tnt`. `ttl_seconds` absent, `null` or 0 SHALL mean 600 and 1 to 3600 SHALL be accepted; `expires_at` SHALL be `floor(now/1000)` plus the TTL. A success SHALL add one `IssuedToken` and the event `token.issued`, a refusal nothing.

#### Scenario: Issue succeeds and is recorded
- **WHEN** with the constants of test-plan.md § Constants and the clock at `T0`, the sequence of § Issue runs: an issue for `{ agent_id: "alice", service_id: S1, tenant_id: T_A, scope: "call", ttl_seconds: 60 }`, `GET /.well-known/jwks.json`, `GET /v1/health` (Mintkey's broker paths) and `POST /v1/api-keys/resolve` without and with the token
- **THEN** the issue answer is 200 with `expires_at` 1793959260; the token header is `{ alg: "EdDSA", typ: "JWT", kid }` and the claims deep-equal `{ aud: [S1], exp: 1793959260, iat: 1793959200, iss: "mintkey/broker", jti, scope: "call", service_id: S1, sub: "alice", tenant_id: T_A, tnt: T_A }` (`jti` matches `JTI`); the JWKS holds one key `{ kty: "OKP", crv: "Ed25519", alg: "EdDSA", use: "sig", kid, x }` and `crypto.verify` over it accepts the token and rejects the token with `sub` changed; `issued()` deep-equals `[{ jti, serviceId: S1, tenantId: T_A, agentId: "alice", ttlSeconds: 60, issuedAt: 1793959200, expiresAt: 1793959260 }]`; `events()` deep-equals the broker event of § Issue; health is 200 `{"status":"ok"}`; resolve is 401 without the header and 404 `{"mintkey:code":"not_found","title":"not found"}` with it

#### Scenario: Issue refuses bad requests and bounds the TTL
- **WHEN** the 24 rows of test-plan.md § Issue are sent in order
- **THEN** each answer has its row's status and body; the accepted rows 3, 4, 5, 6, 7, 13, 20 give `expires_at` `1793959200` plus 600, 600, 600, 1, 3600, 60, 60; afterwards `issued()` holds exactly those seven in order and `events()` seven `token.issued`

### Requirement: The echo upstream shows what it received
`startEchoUpstream()` SHALL listen on `127.0.0.1` port 0, expose `origin` `http://127.0.0.1:<port>`, answer every request but `/redirect` with 200 JSON `{ method, path, query, headers, bodySha256 }` (lowercase header names, `query` without `?`, `bodySha256` the hex SHA-256 of the body), answer `/redirect` with 302 `location: /landing?from=echo`, and release its port on an idempotent `close()`.

#### Scenario: The echo upstream shows what it received
- **WHEN** `POST /a%20b/c?x=%41&y` with `X-Caller: 2` and body `hello` is sent, then `GET /redirect` with `redirect: "manual"`, then `close()` is called twice
- **THEN** the first answer is 200 with `method` `POST`, `path` `/a%20b/c`, `query` `x=%41&y`, `headers["x-caller"]` `2`, `bodySha256` `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`; the second is 302 with `location` `/landing?from=echo` and an empty body; both `close()` calls resolve and a new connection gets `ECONNREFUSED`

### Requirement: The proxy forwards with the stored credential injected
For `/<first>/<rest>?<query>` with a valid bearer whose `aud` is `[first]` and a stored credential or credential-less route for (claim `tenant_id`, `first`), the proxy SHALL send the method, `/<rest>?<query>` byte for byte and the streamed body to the upstream chosen for the target's host; drop `authorization`, `host`, hop-by-hop headers and headers named in `Connection`; set `Host` to the target's host; inject the credential (`API_KEY_HEADER`: raw value in `header_name`; `BEARER_TOKEN`: `Authorization: Bearer <value>`); stream status, headers and body back unchanged, never following a 3xx; and before the last byte append one `ForwardedRequest` (value shown as `[credential]`) and one `proxy.hit` (status below 400) or `proxy.error`. A target with no route and no loopback host, or a connection error, SHALL answer 502 `bad gateway: upstream unreachable`.

#### Scenario: The proxy forwards through the echo upstream
- **WHEN** with S1 and S2 stored and `tools.fake.test` routed to an echo upstream, the calls F1 to F4 of test-plan.md § Forward rows are sent with `node:http`
- **THEN** each answer is 200 and the echo's `path`, `query`, `bodySha256` and `headers` (without `connection`) equal the row, so the caller's `authorization`, `te` and `x-drop-me` are gone, the caller's `x-fake-tools-key` is replaced by `kv-secret-7f3a` and F3 carries `authorization: Bearer bt-secret-9c1d`; `requests()` deep-equals the four records of the rows (`[credential]` for the value, `status` 200, `outcome` `allowed`); after the two `token.issued`, `events()` holds four `proxy.hit` with `{ jti, upstream_status: 200, upstream_latency_ms, outcome: "allowed" }`, the latency an integer of at least 0

#### Scenario: Streaming, redirects and upstream errors pass through
- **WHEN** the six calls of test-plan.md § Pass-through rows are made (gated stream, 302, 500, closed-port upstream, unrouted host, loopback target)
- **THEN** each caller sees, and each record and event equals, the row of the table; in particular the first read of `/stream` returns `first\n` while `requests()` is `[]` and the gate is shut (a buffering proxy fails by the 5000 ms abort signal, as an assertion), the 302 keeps its `location`, both `set-cookie` lines and `x-up` with nothing followed, and the 502 body is `bad gateway: upstream unreachable\n`

#### Scenario: The credential-less route is fake-only
- **WHEN** `addCredentialless(S3, T_A, "http://tools.fake.test")` is called, `GET /S3/x` is sent with a token for (S3, T_A), a credential is then stored for (T_A, S3) and the call repeated, then `addCredentialless` gets the bad arguments of test-plan.md § Registration rows
- **THEN** the first call is 200 with echo headers `{ host: "tools.fake.test" }`, no `[credential]` in the record, and S3 absent from `credentials()`; after the put the echo shows `x-fake-tools-key: kv-secret-7f3a` (the stored credential wins); each bad call throws the `TypeError` of its row and registers nothing

### Requirement: The proxy refuses before it calls an upstream
The proxy SHALL answer in this order: 401 `unauthorized: missing Bearer token` without a `Bearer ` token; 401 `unauthorized: signature_invalid` for a token without three parts, with `alg` not `EdDSA`, an unknown `kid` or a failing signature; 401 `unauthorized: token_expired` when `exp + 30 < floor(now/1000)`; 403 `{"error":"service not addressed"}` when `first` is not a lowercase UUID; 403 `{"error":"scope mismatch"}` when `aud` is not `[first]`; 502 `bad gateway: vault error` when no credential and no route exists for (claim `tenant_id`, `first`). It SHALL call no upstream for any of them, record nothing for a 401, record a `rejected` `ForwardedRequest` for a 403 or 502, and emit `proxy.aud_mismatch_rejected` for a 403.

#### Scenario: The proxy refuses on the injected clock
- **WHEN** the rows P1 to P16 of test-plan.md § Proxy refusal rows are sent against a counting upstream, then a TTL-60 token is used with the clock at `exp + 29`, `exp + 30` and `exp + 31` seconds, and a tampered token at `exp + 31`
- **THEN** each answer has its row's status and exact body; the counting upstream saw only the 2 accepted expiry requests; the 401 rows left `requests()` and `events()` unchanged; P10 to P15 added the six `rejected` records and P10 to P13 the four `proxy.aud_mismatch_rejected` events of the rows; the token is accepted (200) at `exp + 29` and `exp + 30` and refused with `unauthorized: token_expired\n` at `exp + 31`, where the tampered token gets `signature_invalid` (the signature is checked first)

### Requirement: The vault stores a credential and counts key versions
The vault listener SHALL serve h2c `POST /mintkey.vault.v1.VaultAdapter/PutCredential`; for a known identity holding `vault.put` and a valid message it SHALL store or replace the credential for (tenant, service) and answer `grpc-status` 0 and a frame holding `key_version` = the previous version for that pair + 1; `credentials()` SHALL return the metadata without the value. Otherwise it SHALL answer `grpc-status` 16 (unknown identity or token), 7 (identity without `vault.put`), 3 (malformed frame or invalid field) or 12 (any other RPC).

#### Scenario: The vault stores a credential and counts key versions
- **WHEN** the sequence of test-plan.md § Wire vectors runs (`REQ1` with `vaultAdmin`, again with another value, `REQ2` with `vaultProxy`, `REQ1` with tenant B), `encodePutRequest` of the same inputs and `decodePutResponse(unframe(body))` of each answer are computed, and `GET /S1/x` is sent through the proxy
- **THEN** every answer has `:status` 200, `content-type` `application/grpc`, trailer `grpc-status` `0` and body `000000000408011200`, `000000000408021200`, `000000000408011200`, `000000000408011200` in that order; `encodePutRequest` equals both hex vectors byte for byte and `decodePutResponse` gives 1, 2, 1, 1; `credentials()` deep-equals the three rows of § Wire vectors (exactly the eight members of `StoredCredential`); the proxy call injects `kv-secret-8e2b`

#### Scenario: The vault refuses bad callers and bad messages
- **WHEN** the rows V1 to V33 of test-plan.md § Vault refusal rows are sent
- **THEN** each answer has its row's `grpc-status` (16 `unauthenticated`, 7 `permission denied`, 3 with the row's message, 12 `unimplemented`, 0 for V30 to V33); V22 to V26 assert only 3; a refused row stores nothing, so afterwards `credentials()` holds only the four credentials of V30 to V33

### Requirement: Audit events reach the sink with the emitter's token
With `auditSink` set the fake SHALL `POST {auditSink}/v1/internal/audit/emit` for each event as JSON without `emitter`, with `X-Mintkey-Service-Token` equal to `brokerServiceToken` for broker events and `proxyServiceToken` for proxy events, before the answer that caused it ends; a failing sink SHALL be ignored, and with `auditSink` `null` nothing SHALL be posted.

#### Scenario: Events reach the sink with the emitter's token
- **WHEN** the calls of test-plan.md § Audit rows run against fake A, then fakes B (sink answers 500), C (closed sink port) and D (`null`) each issue once
- **THEN** the sink received exactly four posts, in order `token.issued` (token `brokerServiceToken`), `proxy.hit`, `proxy.aud_mismatch_rejected`, `proxy.error` (token `proxyServiceToken`), each `application/json` and deep-equal to the matching `events()` entry without `emitter`, the count being 1, 2, 3, 4 when the caller returned; B and C answer 200 with one more event, B's sink saw 1 post and C's none; D posted nothing

### Requirement: No secret is recorded and nothing is printed
A credential value, vault token, service token or JWT SHALL NOT appear in `credentials()`, `issued()`, `requests()`, `events()` or a posted event body (a service token appears only in the post's header), and the module SHALL NOT write to the console or a standard stream.

#### Scenario: No secret is recorded and nothing is printed
- **WHEN** after the flows of test-plan.md § Secrets, the JSON of the four lists and each sink body are searched for the needles listed there, and the module's non-test `.ts` files are read
- **THEN** no needle occurs in any searched text; the sink received exactly 6 posts, whose `X-Mintkey-Service-Token` is the broker token for `token.issued` and the proxy token otherwise; every recorded `authorization` value is `[credential]`; no source file matches `/\bconsole\.|process\.(stdout|stderr)/`

### Requirement: The fake starts on loopback, clears its records and closes completely
`startFakeEgress` SHALL listen only on `127.0.0.1` port 0, give each start its own ports and secrets, validate `addUpstream` and `addCredentialless`, empty `issued`, `requests` and `events` (not `credentials` or routes) on `clearRecords()`, and on an idempotent `close()` release all three ports and every connection and in-flight forward.

#### Scenario: Start, register, clear and close
- **WHEN** two fakes are started, the bad calls of test-plan.md § Registration rows are made, S1 is forwarded, `clearRecords()` is called and S1 forwarded again, then with a keep-alive socket to the proxy, an h2 session to the vault and a held forward open, `close()` is called twice at once
- **THEN** the URLs match `^http://127\.0\.0\.1:\d+$` with three distinct ports and differ between the fakes; the five tokens are 32 characters of `[A-Za-z0-9_-]` and distinct; the identities are `{ identity: "svcid_ursitoare_admin", scopes: ["vault.put", "vault.read"] }`, `{ "svcid_proxy", ["vault.read", "vault.put"] }` and `{ "svcid_email_proxy", [] }`; the bad calls throw the messages of their rows; after `clearRecords()` the three lists are `[]`, `credentials()` is unchanged and the second forward leaves one record; both `close()` calls resolve, the socket and session close, the held request rejects, its upstream socket closes and each port gives `ECONNREFUSED`

### Requirement: The contract suite runs against base URLs
`egressContract(target)` SHALL return, in this order, the nine checks `issue needs the service token`, `issue returns a JWT for the service and tenant`, `issue enforces the TTL bounds`, `vault put with the admin identity returns a key version`, `vault put with a denied identity is refused`, `proxy refuses a request without a bearer`, `proxy refuses a token for another service`, `proxy forwards to the echo service with the injected header` and `proxy passes a redirect through`; each uses only `fetch` or `node:http2` against the target's URLs, and each failure SHALL be an `assert.AssertionError` whose message starts with the check name and a colon.

#### Scenario: The contract suite passes on the fake and fails on broken targets
- **WHEN** the suite runs against a fake with `echo.fake.test` routed to an echo upstream; against a target whose `brokerUrl` is a forwarder that adds the real service token (mutant A); against one whose `proxyUrl` is a forwarder that follows redirects (mutant B); and against a closed port for all three URLs (test-plan.md § Contract)
- **THEN** the names array deep-equals the nine names; all nine pass on the fake; on mutant A only `issue needs the service token` rejects, on mutant B only `proxy passes a redirect through`; on the closed port all nine reject, each with an `AssertionError` whose message starts with `<name>:` and contains `unreachable` or `failed`
