# Test plan for add-gateway-client, part 2: limits, logs, start-up and wiring

Constants, error legend and helpers (`issuedPermit`, `recordingFetch`, `tokenAnswer`, `flush`): `test-plan.md`.

## Limits (scenario 8)

A. A test-local `node:http` upstream behind `big.fake.test` (`addCredentialless(S2, TA, "http://big.fake.test")`) answers `GET /n/<count>` with `count` bytes `a`, chunked when the query is `chunked`; permits `issuedPermit({ serviceId: S2, host: "big.fake.test", method: "GET", path, bodyDigest: D_EMPTY })`.

| # | Path | Result |
|---|---|---|
| Z1, Z2 | `/n/1048576`; `/n/0` | `body.length` 1048576; 0 |
| Z3 | `/n/1048577` | `TOO_LARGE` |
| Z4, Z5 | `/n/1048576?chunked`; `/n/1048577?chunked` | 1048576 bytes; `TOO_LARGE` |

B. `mock.timers.enable({ apis: ["setTimeout"] })`, a stub `fetch` keeping each `signal`:

| # | Stub | Result |
|---|---|---|
| Y1 | `requestToken`, never answers; `flush()`, `tick(29999)`, `tick(1)` | signal unaborted after 29999, aborted after 30000; `UNAVAILABLE token` |
| Y2 | `send`, headers and one chunk, then the body stalls until abort; `tick(30000)` | `UNAVAILABLE send` |
| Y3 | token answers: 1048577 `x`; a JSON token answer of exactly 1048576 bytes (`{"token":"jwt-secret-8a1c","expires_at":1793959260,"pad":"…"}`, the extra member `pad` filled with `x`; the `token` stays short, as it is limited to 8192 characters) | `UNAVAILABLE token`; a token |
| Y4 | a call that answered, then `tick(30000)` | its signal stays unaborted |
| Y5 | `send` whose fetch throws `new TypeError("fetch failed")`; the same token again | `UNAVAILABLE send`; `INVALID token_used` |
| Y6 | no `fetch` passed, `brokerUrl` a closed loopback port | `requestToken`: `UNAVAILABLE token` |

## Logs (scenario 9)

Capturing trace-level logger, `recordingFetch`, `CFG`, clock `T0`, header `x-caller: hdr-value-3b7d`. Steps: (1) `requestToken`; (2) `send REQ` answered `resp-body-5f6e`; (3) `requestToken` answered 401; (4) `requestToken`, then `send` answered by `new TypeError("fetch failed jwt-secret-8a1c")`; (5) `send` with method `PUT`. The lines minus `time` and `service` deep-equal, in order (6; step 5 adds none):

1. `{ level: 30, stage: "token", serviceId: S1, status: 200, ms: 0, runId: "r_1", nodeId: "lookup", msg: "gateway token request" }`
2. `{ level: 30, stage: "send", method: "POST", host: "tools.fake.test", path: "/v1/lookup", status: 200, ms: 0, runId: "r_1", nodeId: "lookup", msg: "gateway send" }`
3. line 1 with `status: 401`, then `{ level: 40, stage: "token", code: "GATEWAY_TOKEN_REFUSED", runId: "r_1", nodeId: "lookup", msg: "gateway call failed" }`
4. line 1, then `{ level: 40, stage: "send", code: "GATEWAY_UNAVAILABLE", runId: "r_1", nodeId: "lookup", msg: "gateway call failed" }`

The joined lines and each error's `message`, `details` and `util.inspect` hold none of `bt-secret-4d2a`, `jwt-secret-8a1c`, `vendor_name`, `resp-body-5f6e`, `hdr-value-3b7d`, `Bearer`, `id=7`; `error.cause` is `undefined`.

## Self-check (scenario 10)

`CFG`, `recordingFetch` of bodiless `Response`s; rows `[issue, resolve]` answers:

| # | Answers | Result, calls |
|---|---|---|
| C1-C4 | 401 and 401; 403 and 404; 500 and 500; 302 and 401 | `{ broker: "closed" }`, 2 |
| C5 | 200 | `INSECURE issue`, 1 |
| C6, C7 | 401 and 200; 401 and 204 | `INSECURE resolve`, 2 |
| C8-C10 | 401 then `TypeError`; `TypeError` then 401; `TypeError` twice | `{ broker: "unreachable" }`, 2 |
| C11 | never answers; `flush()`, `tick(4999)`, `tick(1)`, `flush()`, `tick(4999)`, `tick(1)` | the first signal unaborted after 4999 and aborted at 5000, the second likewise; `{ broker: "unreachable" }`, 2 |
| C12 | the real fake | closed, `issued()` and `events()` `[]` |

C1's calls: `http://broker.internal:8081/v1/issue` and `…/v1/api-keys/resolve`, `POST`, `headers` `{ "content-type": "application/json" }` (no service token), `redirect` `manual`; bodies `{"agent_id":"ursitoare-engine","service_id":"00000000-0000-4000-8000-000000000000","tenant_id":"00000000-0000-4000-8000-000000000000","scope":"call","ttl_seconds":1}` and `{"key_fingerprint":"probe","presented_key":"probe","service_id":"00000000-0000-4000-8000-000000000000","tenant_id":"00000000-0000-4000-8000-000000000000"}`. C5 writes one `error` line `{ level: 50, code: "GATEWAY_INSECURE_BROKER", probe: "issue", brokerUrl: "http://broker.internal:8081", msg: "egress broker answered issue without a service token; give it its service tokens before starting" }`, C6 and C7 the same with `probe: "resolve"` and `answered resolve` in the message; the closed and unreachable rows write none (the warning of an unreachable broker is `main`'s, N3).

## Main (scenario 11)

`main({ loadConfig, destination, signals: new EventEmitter(), exit })`, the `appConfig` of `src/main.test.ts` (no database) plus `egress`.

| # | Broker | Result |
|---|---|---|
| N1 | a loopback stub answering every request 200 `{"token":"x","expires_at":1}` | resolves `null`; `exit` calls `[1]`; first a level-50 line with `code` `GATEWAY_INSECURE_BROKER`, `probe` `issue`, `brokerUrl` the stub's url and the C5 message, then a level-60 line with `code` `GATEWAY_INSECURE_BROKER`, `msg` `startup failed`; the stub saw one `POST /v1/issue` without `x-mintkey-service-token`; no `ursitoare listening` line |
| N2 | the fake | a server; `exit` uncalled; `GET /health` 200 `{"status":"ok","version":"0.0.0","checks":{}}`; no `EGRESS_BROKER_UNREACHABLE` line |
| N3 | a closed loopback port | a server; a level-40 line with `code` `EGRESS_BROKER_UNREACHABLE`, `brokerUrl` the closed port's url and `msg` `egress broker unreachable; tool calls fail until it answers`; `exit` uncalled |
| N4 | `deps.checkEgress` a recording stub returning `{ broker: "closed" }` | called once, with the same `config.egress` object and deps whose `clock` is `systemClock` and whose `logger` has `warn` |
| N5 | config without `egress`, a `deps.checkEgress` that throws | a server; the stub uncalled |

## Arch (scenario 12)

`snapshotOf` files, `allowed = ["src/main.ts", "src/credentials/gone.ts", "src/missing.ts"]`: `src/main.ts` imports `./gateway/index.ts`; `src/tools/rogue.ts` has three lines (a value import, `import type { Gateway }`, `export { bodyDigest } from`) from `../gateway/index.ts`; `src/api/typed.ts` has `import type { Gateway } from "../gateway/index.ts";`, `export type { GatewayError } from` it and `import { type CallTag } from` it (no site); `src/api/late.ts` is `const m = await import("../gateway/index.ts");`; `src/tools/rogue.test.ts` (a test) and `src/gateway/client.ts` (inside the gateway) import the index and are ignored; `src/api/other.ts` imports `../gateway/types.ts` (not the index); `src/credentials/gone.ts` imports only `../pdp/index.ts`. Expected, in order, code `ARCH_EGRESS_SITE`: `src/api/late.ts` line 1 with message `src/api/late.ts imports the gateway; add it to the egress-site inventory in test/arch/egress-sites.test.ts with the policy check it follows`; `src/credentials/gone.ts` line 1 with message `src/credentials/gone.ts is in the egress-site inventory but imports no gateway; remove it`; `src/missing.ts` line 1, same wording; `src/tools/rogue.ts` lines 1 and 3 (not the type import on line 2), the first wording; nothing for `src/api/typed.ts`. `checkEgressSites(readSnapshot(), ["src/main.ts"])` is `[]`.

## Part (scenario 13)

`egressPart.start(ctx)` in a temporary `dataDir`: `handle.env` has exactly `URSITOARE_EGRESS_BROKER_URL`, `…PROXY_URL`, `…BROKER_TOKEN_FILE`, `…VAULT_URL`, `…VAULT_IDENTITY` (`svcid_ursitoare_admin`) and `…VAULT_TOKEN_FILE`; the urls match `^http://127\.0\.0\.1:[0-9]+$`; the two files have mode 0600 and contents `fake.brokerServiceToken` and `fake.vaultAdmin.token`; `loadEgressConfig(env, (p) => readFileSync(p, "utf8"))` gives the same urls; `egressPart.seed` is `undefined`; `handle.api` is `{ fake }`. `egressApi(handles)` returns that fake once the handle is in `handles`, else throws `E2eStackError` `STACK_PART_MISSING`, `details` `{ part: "egress" }`. After one `POST ${brokerUrl}/v1/issue` (service token, valid body) `fake.issued()` has one entry; `beforeReset(ctx)` empties it. `close()` twice resolves and the three ports refuse. `discoverParts()` lists `egress` after `durable`; `parts/45-egress.ts` reads exactly `export { egressPart as part } from "../egress-part.ts";`. In `withDedicatedCluster`, `cluster.env` has the six keys and `checkEgress` on its config is `{ broker: "closed" }`; after the callback it is `{ broker: "unreachable" }`.
