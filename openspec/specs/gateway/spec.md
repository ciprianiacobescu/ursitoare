# gateway Specification

## Purpose
The engine's only HTTP client for tools: a PDP permit becomes a one-service broker token and exactly the permitted request is forwarded through the proxy, with no redirect followed. The engine refuses to start against a broker that issues without a service token, and a frozen inventory lists the client's callers.

## Requirements

### Requirement: Digests, tenant ids, call headers and permit matches are fixed
`bodyDigest` SHALL be the lowercase hex sha256 of the body (`null` and empty hash the empty string); `mintkeyTenantId(t)` SHALL be the first 16 bytes of sha256 of `ursitoare-tenant:<t>` with byte 6 set to `(b & 0x0f) | 0x80` and byte 8 to `(b & 0x3f) | 0x80`, as `8-4-4-4-12` hex; `callHeader(tag)` SHALL be `<runId>:<nodeId>:<attempt>`; `permitMatches` SHALL be true only when the method and path are equal, `new URL(origin).host` equals `permit.host` (an unparsable origin never matches) and `bodyDigest(body)` equals `permit.bodyDigest`.

#### Scenario: Vectors, call header and permit matching
- **WHEN** the helpers run on the vectors and rows M1 to M16 of test-plan.md § Helpers
- **THEN** the tenant ids are `d7f4eeba-9f57-8892-b4bb-591d220496d4` (`tenant_a`) and `93baa9da-a394-803d-800c-bf45c3375469` (`tenant_b`), the digests `e3b0c442…b855` (`null`) and `0e9900c9…1966` (`{"vendor_name":"ACME"}`), the call headers `r_1:lookup:1` and `r_1:lookup:12`; M1 to M4, M11 and M16 are true, every other row false

### Requirement: isIssuedPermit is true only for a permit this process's PDP returned
`isIssuedPermit(value)` SHALL be true only for the frozen permit object that `check` returned on an allow with `egress` in this process, and false for a copy, a clone, a JSON round trip and any other value.

#### Scenario: Only a permit issued by this process is accepted
- **WHEN** the rows of test-plan.md § Issued permit run on `p = await issuedPermit()`
- **THEN** the issued permit is accepted and deep-equals `BASE_EGRESS`; its copy, clone, JSON round trip, a frozen literal and seven other values are refused; a second engine's permit is accepted; a denied decision and an allow without `egress` carry no permit

### Requirement: requestToken issues a one-use token for an issued permit
`requestToken(permit, tag)` SHALL, without a network call, refuse a foreign permit (`GATEWAY_PERMIT_FOREIGN`), an invalid tag (`GATEWAY_INVALID` `tag`) and a permit whose `serviceId` is not a lower-case UUID `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` (`GATEWAY_INVALID` `service`, refused the same way by `send`), since a `..` service id would leave the proxy's path prefix; otherwise `POST <brokerUrl>/v1/issue` with the service token header and the body of agent id, the permit's service id, `mintkeyTenantId(tag.tenantId)`, scope `call` and `permit.ttlSeconds`; map a 200 with a `token` of 1 to 8192 characters of `[A-Za-z0-9._-]` (a compact JWS, so it can never break the `authorization` header) and a safe-integer `expires_at` no later than the clock's second plus `permit.ttlSeconds` plus 30 to a frozen `{ serviceId, expiresAt }` whose JWT is held privately; map 401 and 403 to `GATEWAY_TOKEN_REFUSED` `{ status }` and anything else (other status, bad or oversized body, timeout, network error) to `GATEWAY_UNAVAILABLE` `{ stage: "token" }`. It SHALL never refresh a token.

#### Scenario: requestToken posts one issue request and holds the token privately
- **WHEN** `requestToken` runs on the success case and rows K1 to K9 of test-plan.md § Token
- **THEN** the one recorded call has the url, `init` keys, headers and body text there; the token is `{ serviceId, expiresAt: 1793959260 }`, frozen, with two keys and no JWT in `JSON.stringify` or `util.inspect`; K8 returns the token at the bounds (8192 characters, `expiresAt` 1793959290); K1 to K7 and K9 give the errors of the table, K6, K7 and K9 without a call

### Requirement: send refuses everything the permit does not cover before the network
`send` SHALL, before any network call and without spending the token, throw the first failure of: a foreign permit; `permitMatches` false (`GATEWAY_PERMIT_MISMATCH`, `field` the first of `method`, `host`, `path`, `bodyDigest` that differs); then `GATEWAY_INVALID` with `reason` `tag`, `service` (a permit `serviceId` that is not a lower-case UUID), `path` (`#`, `\` or a `.` or `..` segment), `header` (a name `authorization`, `x-ursitoare-call`, `host`, `cookie`, `proxy-authorization`, `connection`, `content-length`, `transfer-encoding`, `upgrade`, `te` or `trailer` in any case, a name not in lowercase token characters, or a value with a control character), `token_service`, `token_used` (not an unspent token of this gateway) or `token_expired` (`expiresAt` at or below the clock's second).

#### Scenario: send refuses before any network call
- **WHEN** `send` runs on rows S1 to S29 and O1 to O5 of test-plan.md § Send refusals
- **THEN** each throws the error of its row, the O rows showing the order foreign, mismatch, tag, service, path; after every row `fetch` has been called once only (the token)

### Requirement: send forwards through the proxy and returns the answer unchanged
After its checks `send` SHALL mark the token spent, then `fetch` `<proxyUrl>/<serviceId><path>` with the permit's method, the caller's headers plus `authorization: Bearer <JWT>` and `x-ursitoare-call: <callHeader>`, the body and `redirect: "manual"`, and return `{ status, headers, body }` with lowercase header names whatever the status; a 3xx SHALL be returned and never followed, and the destination SHALL never come from `request.origin`.

#### Scenario: send forwards through the proxy and passes redirects through
- **WHEN** rows F1 to F5 and X1 to X5 of test-plan.md § Send forward run, the X rows against the fake egress and an echo upstream
- **THEN** F2 records the url, `init` keys and three headers there; refused calls leave the token usable (F1) and a second use is `token_used` (F3, X3); the echo receives `POST /v1/lookup?id=7`, digest `0e9900c9…1966`, `x-ursitoare-call` `r_1:lookup:1`, no `authorization`; X4 returns 302 with `location` `/landing?from=echo` and the fake records only `/v1/lookup` and `/redirect`; X5 returns the proxy's 502 for tenant id `93baa9da-…`

### Requirement: Size and time are bounded
A response body over `GATEWAY_LIMITS.maxResponseBytes` (1048576) SHALL give `GATEWAY_RESPONSE_TOO_LARGE` `{ limit: "1048576" }`, with or without `content-length`; a call unfinished after `GATEWAY_LIMITS.timeoutMs` (30000), body included, a network error and a body stream error SHALL give `GATEWAY_UNAVAILABLE` with the stage; a send failed after its checks SHALL leave its token spent; a finished call SHALL leave no aborting timer.

#### Scenario: Size and time are bounded and a failed send is final
- **WHEN** rows Z1 to Z5 and Y1 to Y6 of test-plan-edges.md § Limits run
- **THEN** 1048576 bytes pass and 1048577 are `TOO_LARGE`, chunked or not; the signal aborts at 30000 ms and not at 29999 (`UNAVAILABLE` with the row's stage); an oversized token answer is `UNAVAILABLE token`; a finished call's signal stays unaborted; a failed send's token is `token_used`

### Requirement: Logs and errors carry no secret
The gateway SHALL log one `info` line per answered call and one `warn` line per failed call, a call refused before the network (a permit mismatch, a foreign permit, an invalid value) included, with only the fields of test-plan-edges.md § Logs, and no line, error `message`, `details`, `cause` or enumerable token member SHALL hold a broker service token, a JWT, a header value, a body or a query string.

#### Scenario: Logs and errors carry no secret
- **WHEN** the five steps of test-plan-edges.md § Logs run with a trace-level capturing logger and the secrets `bt-secret-4d2a` and `jwt-secret-8a1c`
- **THEN** the seven captured lines deep-equal those there (the `PUT` refused before the network adds the last, a `warn` with `GATEWAY_PERMIT_MISMATCH` and `{ field: "method" }`), and `bt-secret-4d2a`, `jwt-secret-8a1c`, `vendor_name`, `resp-body-5f6e`, `hdr-value-3b7d`, `Bearer` and `id=7` appear in no line, message, details or inspected error

### Requirement: The start-up self-check refuses an open issuer
`checkEgress(config, deps)` SHALL send `POST <brokerUrl>/v1/issue` and `POST <brokerUrl>/v1/api-keys/resolve` without a service token, in that order, with `redirect: "manual"` and a timeout of `GATEWAY_LIMITS.selfCheckTimeoutMs` (5000); throw `GATEWAY_INSECURE_BROKER` `{ probe }` at once for a 2xx answer; and otherwise return `{ broker: "closed" }` when both answered and `{ broker: "unreachable" }` when either failed to connect or timed out.

#### Scenario: checkEgress closes on refusal and refuses an open issuer
- **WHEN** rows C1 to C12 of test-plan-edges.md § Self-check run
- **THEN** each gives the result and call count of its row; C1's calls have the urls, headers and bodies there and no service token; C11's signals abort at 5000 ms, not 4999; the real fake answers `{ broker: "closed" }`

### Requirement: main refuses an open issuer and starts otherwise
When `config.egress` is set `main` SHALL call `(deps.checkEgress ?? checkEgress)(config.egress, { clock, logger })` after the logger exists and before the database opens; `GATEWAY_INSECURE_BROKER` SHALL end the start through the existing fatal path (exit 1); `unreachable` SHALL log a `warn` with code `EGRESS_BROKER_UNREACHABLE`, `brokerUrl` and the message `egress broker unreachable; tool calls fail until it answers` and start, and the self-check's `error` line before a fatal start SHALL carry `brokerUrl`, `probe` and the message `egress broker answered <probe> without a service token; give it its service tokens before starting`; no health check SHALL be registered; without `egress` the check SHALL not run.

#### Scenario: main refuses an open issuer and starts otherwise
- **WHEN** `main` runs on rows N1 to N5 of test-plan-edges.md § Main
- **THEN** N1 resolves `null` with `exit(1)` and the fatal line there; N2 and N3 start, N2 with `/health` `{"status":"ok","version":"0.0.0","checks":{}}` and N3 with the warning; N4 calls the seam once with the config's `egress`; N5 never calls it

### Requirement: Only inventoried files import the gateway
`checkEgressSites(s, allowed)` SHALL return, sorted by file and line, an `ARCH_EGRESS_SITE` violation for each value import, value re-export or literal dynamic import (not an `import type`) of `src/gateway/index.ts` in a non-test `src/` file outside `src/gateway/` that is not in `allowed`, and one at line 1 for each `allowed` path that no such file imports through; the frozen test `test/arch/egress-sites.test.ts` (`C-76ead8ea the engine's egress sites are exactly the inventory`) SHALL hold the inventory, `["src/main.ts"]` as this change leaves it; a later change that adds a value importer of the gateway adds its path there in a named task.

#### Scenario: Only inventoried files import the gateway
- **WHEN** `checkEgressSites` runs on the fixture of test-plan-edges.md § Arch and on `readSnapshot()` with the frozen inventory (`["src/main.ts"]` in this change)
- **THEN** the fixture gives exactly the five violations listed there in order and none for the type-only imports and the real snapshot gives `[]`

### Requirement: The egress part starts in the e2e stack and the crash cluster
`egressPart` (name `egress`, file `parts/45-egress.ts`) SHALL start `startFakeEgress()`, write the broker and vault tokens to 0600 files, return the six `URSITOARE_EGRESS_` variables and `api: { fake }`, clear the fake's records in `beforeReset`, seed nothing and release all three ports on `close()`; `egressApi(handles)` SHALL return the fake or throw `E2eStackError` `STACK_PART_MISSING`.

#### Scenario: The egress part starts in a crash cluster and closes completely
- **WHEN** the part runs as test-plan-edges.md § Part says, alone and inside `withDedicatedCluster`
- **THEN** the env keys, urls, file modes and contents, `egressApi` results, cleared `issued()`, refused ports, discovery order and file text are those stated there; in the cluster `checkEgress` is `{ broker: "closed" }`, and `{ broker: "unreachable" }` after it closes
