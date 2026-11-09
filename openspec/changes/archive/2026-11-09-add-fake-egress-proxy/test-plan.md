# Test plan for add-fake-egress-proxy

Ran in a scratch implementation on Node 24.22.2 (design.md § Verification). The injected clock is a variable the test assigns.

## Constants

- `T0 = new Date("2026-11-06T10:00:00.000Z")` = epoch second 1793959200; `now: () => clock`.
- `T_A = "4b8a2c1e-0000-8000-8000-000000000001"`, `T_B` ending `2`; `S1`..`S8` = `"0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e0"` + `1`..`8`.
- Target host `tools.fake.test`, routed with `addUpstream` to the echo; `H_KEY = "x-fake-tools-key"`; `VAL1 = "kv-secret-7f3a"`, `VAL2 = "kv-secret-8e2b"`, `VALB = "bt-secret-9c1d"`.
- `D_EMPTY = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, `D_HELLO = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`, `D_ABC = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`; `KID = ^kid_[0-9A-HJKMNP-TV-Z]{26}$`, `JTI = ^jti_[0-9A-HJKMNP-TV-Z]{26}$`.
- `put(fake, who, over)` calls `putCredential` with the inputs of `REQ1` (§ Wire vectors) merged with `over`; `issue(fake, serviceId, tenantId = T_A)` posts the base body of § Issue. The proxy tests first `put` S1 and S2 (as `REQ2`) with `vaultAdmin`.

## Issue (scenarios "Issue succeeds and is recorded" and "Issue refuses bad requests and bounds the TTL")

The broker event: `{ emitter: "broker", event_type: "token.issued", tenant_id: T_A, actor_type: "agent", actor_id: "alice", target_type: "service", target_id: S1, payload: { scope: "call", jti, exp_ts: 1793959260, agent_id: "alice" } }`. The tampered token has `sub` re-encoded as `mallory` and the old signature.

Rows: base body `{ agent_id: "alice", service_id: S1, tenant_id: T_A, scope: "call", ttl_seconds: 60 }`, header the broker token; T1 = "ttl_seconds must be between 1 and 3600", T2 = "Invalid request body"; a 400 body is `{"mintkey:code":"validation_failed","title":<text>}`.

| # | Change | Result |
|---|---|---|
| 1, 2 | no token header; header `nope` | 401 `{"mintkey:code":"unauthenticated","title":"unauthenticated"}` |
| 3, 4, 5 | `ttl_seconds` absent, 0, null | 200, TTL 600 |
| 6, 7 | `ttl_seconds` 1, 3600 | 200, TTL 1, 3600 |
| 8, 9 | `ttl_seconds` 3601, -1 | 400 T1 |
| 10, 11 | `ttl_seconds` 1.5, `"60"` | 400 T2 |
| 12, 14 | `agent_id` `""`, 129 times `a` | 400 "agent_id is invalid" |
| 13 | `agent_id` 128 times `a` | 200, TTL 60 |
| 15, 16 | `service_id` `svc_1`, `S1` upper-cased | 400 "service_id is invalid" |
| 17 | `tenant_id` missing | 400 "tenant_id is invalid" |
| 18, 19 | `scope` `read:atlas`, missing | 400 "scope is invalid" |
| 20 | extra member `extra: 1` | 200, TTL 60 |
| 21, 22 | body `{`; body `[]` | 400 T2 |
| 23 | `GET /v1/issue` with the token | 405 `{"mintkey:code":"method_not_allowed","title":"method not allowed"}`, `Allow: POST` |
| 24 | `POST /v1/nope` | 404 `{"mintkey:code":"not_found","title":"not found"}` |

Accepted rows 3, 4, 5, 6, 7, 13, 20 give `expires_at` `1793959200` plus 600, 600, 600, 1, 3600, 60, 60.

## Wire vectors (scenario "The vault stores a credential and counts key versions")

From `protoc --encode mintkey.vault.v1.PutCredentialRequest` on Mintkey's `vault.proto`; a body is `00`, the 4-byte big-endian length, the message.

- `REQ1` (143 bytes, prefix `000000008f`): tenant `T_A`, service `S1`, scheme 1, value `VAL1`, header `x-fake-tools-key`, caller `carol`, target `http://tools.fake.test`: `0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530311801220e6b762d7365637265742d376633613210782d66616b652d746f6f6c732d6b657942056361726f6c4a16687474703a2f2f746f6f6c732e66616b652e74657374`
- `REQ2` (126 bytes, prefix `000000007e`): service `S2`, scheme 3, value `VALB`, no header name, target `https://tools.fake.test`, otherwise as `REQ1`: `0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530321803220e62742d7365637265742d3963316442056361726f6c4a1768747470733a2f2f746f6f6c732e66616b652e74657374`
- Responses: key version 1 is `000000000408011200`, 2 is `000000000408021200`.

Sequence: `REQ1` with `vaultAdmin` (v1); `REQ1` with `VAL2` for `VAL1` (v2); `REQ2` with `vaultProxy` (v1); `REQ1` with tenant `T_B` (v1); then `GET /S1/x` injects `VAL2`. `credentials()`, in order:
1. `{ tenantId: T_A, serviceId: S1, authScheme: "API_KEY_HEADER", headerName: "x-fake-tools-key", targetUrl: "http://tools.fake.test", keyVersion: 2, callerActorId: "carol", identity: "svcid_ursitoare_admin" }`
2. `{ tenantId: T_A, serviceId: S2, authScheme: "BEARER_TOKEN", headerName: null, targetUrl: "https://tools.fake.test", keyVersion: 1, callerActorId: "carol", identity: "svcid_proxy" }`
3. the first with `tenantId: T_B`, `keyVersion: 1`.

## Vault refusal rows (scenario "The vault refuses bad callers and bad messages")

`REQ1`'s inputs with `vaultAdmin` unless stated. Result is `grpc-status` and `grpc-message`.

| # | Change | Result |
|---|---|---|
| V1-V4 | identity `svcid_nobody` with the admin token; no metadata; admin identity with token `x`; identity `svcid_proxy` with the admin token | 16 `unauthenticated` |
| V5 | `vaultDenied` with its own token | 7 `permission denied` |
| V6, V7 | tenant `tenant_a`; service `S1` upper-cased | 3 `tenant_id must be a UUID`; 3 `service_id must be a UUID` |
| V8, V9, V10 | scheme omitted, 2, 4 | 3 `auth_scheme must be 1 or 3` |
| V11, V12 | value empty; 65537 bytes of `a` | 3 `value must be 1 to 65536 bytes` |
| V13 | value `a\nb` | 3 `value must be printable ASCII` |
| V14, V15 | scheme 1 with header name `""`; `x bad` | 3 `header_name must be an HTTP token for auth_scheme 1` |
| V16-V21 | target `http://tools.fake.test/base`, `ftp://tools.fake.test`, `""`, `...test?x=1`, `http://tools.fake.test/`, `http://u:p@tools.fake.test` | 3 `target_url must be an http or https origin` |
| V22-V24 | body `0000000009` + `0102`; body `0100000000`; empty body | 3 |
| V25, V26 | one frame of `0a02fffe`; one frame of `0a1061` | 3 |
| V27, V28, V29 | path `.../VaultAdapter/GetCredential`; path `/x.Y/PutCredential`; method `GET` on the PutCredential path | 12 `unimplemented` |
| V30 | service `S5`, value 65536 bytes of `a` | 0 |
| V31 | service `S6`, target `https://tools.fake.test:8443` | 0 |
| V32 | service `S7`, scheme 3, no header name | 0 |
| V33 | service `S8`, `REQ1`'s message with `5203616263` (field 10) appended | 0 |

V30-V33 run last; afterwards `credentials()` holds exactly the credentials of `S5`, `S6`, `S7`, `S8`, and `S6`'s `targetUrl` is `https://tools.fake.test:8443`.

## Forward rows (scenario "The proxy forwards through the echo upstream")

S1, S2 stored; `tok1` (S1) and `tok2` (S2) issued first; `node:http`, `agent: false`; the echo's `headers` omit `connection`.

| # | Call | Echo `method`, `path`, `query`, `bodySha256` | Echo `headers` |
|---|---|---|---|
| F1 | `GET /S1/x?q=1`; `authorization: Bearer tok1`, `x-caller: 1`, `x-fake-tools-key: caller-supplied`, `connection: keep-alive, x-drop-me`, `x-drop-me: 1`, `te: trailers` | GET, `/x`, `q=1`, `D_EMPTY` | `{ "x-caller": "1", host: "tools.fake.test", "x-fake-tools-key": VAL1 }` |
| F2 | `POST /S1/pay/run`; `authorization`, `content-type: application/json`, `content-length: 5`, `x-caller: 2`; body `hello` | POST, `/pay/run`, `""`, `D_HELLO` | `{ "content-type": "application/json", "content-length": "5", "x-caller": "2", host, "x-fake-tools-key": VAL1 }` |
| F3 | `GET /S2` with `tok2` | GET, `/`, `""`, `D_EMPTY` | `{ host, authorization: "Bearer bt-secret-9c1d" }` |
| F4 | `GET /S1/a%20b/c?x=%41&y`, `tok1` | GET, `/a%20b/c`, `x=%41&y`, `D_EMPTY` | `{ host, "x-fake-tools-key": VAL1 }` |

Records, in call order: `{ serviceId (S2 for F3, else S1), method, host: "tools.fake.test", path, query, headers, bodySha256, status: 200, outcome: "allowed" }`, `headers` as the echo's with the credential value `[credential]`. After the two `token.issued`: four `proxy.hit`, `actor_id` `alice`, `tenant_id` `T_A`, `target_id` the service.

## Proxy refusal rows (scenario "The proxy refuses on the injected clock")

S1 stored, routed to a counting `node:http` upstream; `tok` for (S1, T_A); text bodies end in `\n`.

| # | Request | Result |
|---|---|---|
| P1 | `GET /S1/x`, no `Authorization` | 401 `unauthorized: missing Bearer token` |
| P2, P3, P16 | `Basic abc`; `Bearer ` ; `bearer <tok>` | 401 same |
| P4 | `tok`, last two signature characters replaced | 401 `unauthorized: signature_invalid` |
| P5, P6 | `tok` with `sub` `mallory`, old signature; header `kid` `kid_X`, old signature | 401 same |
| P7, P8, P9 | header `alg` `none` with an empty signature; a fresh Ed25519 key under the real `kid`; `tok` without its third part | 401 same |
| P10 | `GET /v1/S1/x` with `tok` | 403 `{"error":"service not addressed"}`; record `serviceId` `v1`, `path` `/<S1>/x` |
| P11 | `GET /` | 403 same; `serviceId` `""`, `path` `/` |
| P12 | `GET /<S1 upper-cased>/x` | 403 same; `serviceId` `S1.toUpperCase()` (raw, ruling 3), `path` `/x` |
| P13 | `POST /S2/x`, body `abc`, `tok` | 403 `{"error":"scope mismatch"}`; `serviceId` S2, `path` `/x` |
| P14 | `GET /S1/x`, token for (S1, `T_B`) | 502 `bad gateway: vault error`; `serviceId` S1 |
| P15 | `GET /S3/x`, token for (S3, `T_A`), nothing stored | 502 same; `serviceId` S3 |

Records exist for P10-P15 only (six, in order): `outcome` `rejected`, `host` `""`, `headers` `{}`, `query` `""`, `status` 403 or 502, `method` `GET` (P13: `POST`), `bodySha256` `D_EMPTY` (P13: `D_ABC`). Events for P10-P13 only: `proxy.aud_mismatch_rejected` `{ jti: <tok's>, aud: S1, url_service_id, mode: "strict" }` (`url_service_id` `""` for P10-P12, `S2` for P13), `actor_id` `alice`, `target_id` S1, `tenant_id` `T_A`. Expiry: a TTL-60 token issued at `T0` has `exp` 1793959260; `GET /S1/x` at clock `exp + 29` s and `exp + 30` s is 200, at `exp + 31` s 401 `unauthorized: token_expired`, and a P4-style tampered token at `exp + 31` s is `signature_invalid`. The counting upstream saw 2 requests in all; the expired answer added no event.

## Pass-through rows (scenarios "Streaming, redirects and upstream errors pass through" and "The credential-less route is fake-only")

Upstream `U` (`node:http`, logs every `req.url`): `/stream` writes `first\n`, then after the test's gate promise `second\n` and ends; `/found` answers 302 `location: https://elsewhere.example/x?y=1`, `set-cookie` `a=1` and `b=2`, `x-up: 1`; `/boom` 500 `boom`; `/who` its `Host` header. Services (scheme 1, `H_KEY`, `VAL1`, `T_A`): S1 `http://tools.fake.test` routed to `U`; S4 `http://down.fake.test` routed to a port bound and closed; S5 `https://nowhere.fake.test`, no route; S6 `http://127.0.0.1:<U's port>`.

| Call (`fetch` with `AbortSignal.timeout(5000)`) | Caller sees | Record (`path`, `status`, `outcome`, `host`) and event |
|---|---|---|
| `GET /S1/stream` | first read `first\n` while `requests()` is `[]`; after the gate `second\n` | `/stream`, 200, allowed, `tools.fake.test`; `proxy.hit` |
| `GET /S1/found`, `redirect: "manual"` | 302, `location` as sent, `getSetCookie()` `["a=1","b=2"]`, `x-up` `1`; `U`'s log lacks `/x` | `/found`, 302, allowed; `proxy.hit` `upstream_status` 302 |
| `GET /S1/boom` | 500 `boom` | `/boom`, 500, error; `proxy.error` `{ upstream_status: 500, outcome: "error" }` |
| `GET /S4/x` | 502 `bad gateway: upstream unreachable\n` | `/x`, 502, error, `down.fake.test`; `proxy.error` `upstream_status` 502 |
| `GET /S5/x` | 502 same | `/x`, 502, error, `nowhere.fake.test`; `proxy.error` |
| `GET /S6/who` | 200 `127.0.0.1:<port>` | `/who`, 200, allowed, `127.0.0.1:<port>`; `proxy.hit` |

Credential-less: `addCredentialless(S3, T_A, "http://tools.fake.test")`; `GET /S3/x` with `node:http` and only `authorization`: echo `headers` `{ host: "tools.fake.test" }`, the record's the same, `credentials()` unchanged; after `put(fake, vaultAdmin, { serviceId: S3 })` the call shows `x-fake-tools-key: VAL1` and the record `[credential]`.

## Registration rows (scenarios "The credential-less route is fake-only" and "Start, register, clear and close")

`O = echo.origin`. `TypeError`s: `addUpstream("example.com", O)`, `("fake.test", O)`, `("a.fake.test:8080", O)`: `addUpstream: host must end with ".fake.test"`; `("a.fake.test", X)` for X `https://127.0.0.1:9`, `http://example.com`, `http://127.0.0.1:9/path`, `http://u:p@127.0.0.1:9`: `addUpstream: origin must be an http origin on a loopback host`; `addCredentialless("svc_1", T_A, "http://tools.fake.test")` and `(S3, <T_A upper-cased>, same)`: `addCredentialless: ids must be lowercase UUIDs`; `(S3, T_A, X)` for X `http://tools.fake.test/x`, `ftp://tools.fake.test`: `addCredentialless: targetUrl must be an http or https origin`. `addUpstream("A.Fake.Test", O)` registers `a.fake.test`. After the bad calls `GET /S3/x` still answers 502 `bad gateway: vault error`.

## Audit rows (scenario "Events reach the sink with the emitter's token")

Sink: `node:http` recording `{ method, url, contentType, token, body }`, answering 202 (or 500). Fake A uses it; `U` serves S1 (`/x` 200, `/boom` 500). Calls: `put` S1, issue (S1), `GET /S1/x`, `GET /S2/x` with the S1 token, `GET /S1/boom`: posts 1 `token.issued`, 2 `proxy.hit`, 3 `proxy.aud_mismatch_rejected`, 4 `proxy.error`, each `POST /v1/internal/audit/emit` with a body equal to `events()[i]` without `emitter`; after call i returns the sink's count is i.

## Secrets (scenario "No secret is recorded and nothing is printed")

One fake with a sink: `put` S1 (`VAL1`), re-put `VAL2`, `put` S2 (`VALB`); issue `tok1` (S1), `tok2` (S2); F1-F3; P13 with `tok1`; P4. Exactly 6 posts (two `token.issued`, three `proxy.hit`, one `proxy.aud_mismatch_rejected`). Needles: `VAL1`, `VAL2`, `VALB`, both service tokens, the three vault tokens, `tok1`, `tok2`. Haystacks: `JSON.stringify` of the four lists and every sink body. Sources: each `.ts` file of `test/support/fake-egress/` not ending `.test.ts`, read with `readFileSync`.

## Lifecycle (scenario "Start, register, clear and close")

Fakes `a` and `b`. S1 is forwarded, `clearRecords()` called, S1 forwarded again (1 record). The held forward is a call to `U`'s `/hold`, which writes `x` and never ends; the client has read the `x`; then `Promise.all([a.close(), a.close()])`.

## Contract (scenario "The contract suite passes on the fake and fails on broken targets")

Target: the fake's URLs and tokens, `tenantId: T_A`, `echo: { serviceId: S1, targetUrl: "http://echo.fake.test" }` with `addUpstream("echo.fake.test", echo.origin)`. The checks assert: (1) issue without the token, and with the token plus `x`: 401. (2) A valid issue (agent `contract-agent`, TTL 60): 200, a three-part token with `alg` `EdDSA`, `aud` `[serviceId]`, `iss` `mintkey/broker`, `tenant_id`, `sub`, `exp` = `expires_at`, non-empty `jti`. (3) TTL 0 and 3600: 200; 3601 and -1: 400 `validation_failed`. (4) `PutCredential` (scheme 1, header `x-egress-contract-key`, a random value, `echo.targetUrl`) with `vaultAdmin`: `grpc-status` 0, integer `key_version` of at least 1. (5) The same with `vaultDenied`, a random service id: 7. (6) `GET proxy/<serviceId>/x` without `Authorization`: 401. (7) A token for the echo service on `proxy/<random uuid>/x`: 403. (8) Provision, issue, `GET proxy/<serviceId>/x?q=1`: 200, echo `path` `/x`, `query` `q=1`, the header equal to the value, no `authorization`. (9) Provision, issue, `GET proxy/<serviceId>/redirect`, `redirect: "manual"`: 302, `location` `/landing?from=echo`.

Mutants (`node:http` servers in the test that copy method, path, headers except `host` and body to a base URL with `fetch` and return status, headers and body): A forwards to the fake's broker with `x-mintkey-service-token` set to the real token; B forwards to the fake's proxy with `redirect: "follow"`. Closed port: a `net` server bound to port 0 and closed, its port in all three URLs. Expected: nine passes on the fake; on A only check 1 rejects (`no token answered 200`); on B only check 9 (answered 403: the redirect was followed to `/landing`, not a UUID); on the closed port nine rejections whose messages start `<name>:` and contain `unreachable` or `failed`.
