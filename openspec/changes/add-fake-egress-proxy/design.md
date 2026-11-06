## Context

This unit is the loopback stand-in for Mintkey that U46, U45b, U48 and U50 talk to. It follows the production spike (Mintkey `f98ae74`, run) for statuses, fields and audit keys and Mintkey HEAD (`ae05220`, read, not run) for response texts and the 403 on a non-UUID first segment (conflict 11). **fake-defined** marks what the real stack is not known to match; no contract check relies on it.

## Decisions

1. **Layout.** `index.ts` holds the types and `startFakeEgress`; `state.ts` the shared `FakeState` (clock, secrets, maps, the four record lists, `emit`); `broker.ts`, `proxy.ts`, `vault.ts` each export a factory over the state returning a server, which `index.ts` binds and tracks for `close()`. The module prints nothing.
2. **Broker.** Checks run in the order of the rows of test-plan.md § Issue: service token (constant-time), a JSON object of at most 65536 bytes, `ttl_seconds` (absent, `null` and 0 give 600), `agent_id` (1-128 characters), `service_id` and `tenant_id` (lowercase `8-4-4-4-12` hex text), `scope` (exactly `call`); unknown members are ignored, as Go's decoder does. The token is an EdDSA JWT from a per-start Ed25519 key; `kid` and `jti` are `kid_` and `jti_` plus 26 random characters of `0-9A-HJKMNP-TV-Z`. `POST /v1/api-keys/resolve` is 401 without the token and 404 with it (**fake-defined**).
3. **Proxy order** is the spec's. The bearer scheme is case-sensitive and the token non-empty (as at HEAD); `first` is the raw text between the leading `/` and the next `/` or `?`, never decoded. The signature is verified in-process with the broker's key (**fake-defined**) and before the expiry, as at HEAD. Text answers are the text plus `\n` (Go's `http.Error`); JSON answers have none. The three 401 answers record nothing (no verified token says whose request it was). The addressing, audience and credential refusals read the body to its end and record a `rejected` `ForwardedRequest` (`host` `""`, `headers` `{}`, the body's digest); the first two emit `proxy.aud_mismatch_rejected` `{ jti, aud: <token's service id>, url_service_id: <first; "" when not addressed>, mode: "strict" }` with `emitter` `proxy`, the claim `tenant_id`, `actor_type` `agent`, `actor_id` the claim `sub`, `target_type` `service`, `target_id` the token's service id.
4. **Forward.** The upstream path is the raw text from the second `/` (or `/`), the query the raw text after `?` (`ForwardedRequest.query` has no `?`). Dropped request headers: `authorization`, `host`, the hop-by-hop set (`connection`, `keep-alive`, `proxy-authenticate`, `proxy-authorization`, `te`, `trailer`, `transfer-encoding`, `upgrade`) and any header named in `Connection`; `host` is the target's `URL.host`; the credential replaces a caller header of its name (`API_KEY_HEADER`: `header_name` lower-cased). Recorded `headers` are those the proxy passed (lowercase names) with the credential's value `[credential]`; Node's client adds only `connection`, so a test compares the upstream's view minus `connection` with the record. The body streams to the upstream while its SHA-256 is computed; the response streams back chunk by chunk from the raw header list (hop-by-hop skipped, `set-cookie` kept as separate lines). Record, event and sink post come when the upstream response has ended, before the last byte is written, so a caller that read the whole body can read `requests()`. `outcome` is `allowed` below 400 and `error` from 400, as at HEAD; the event is `proxy.hit` or `proxy.error` `{ jti, upstream_status, upstream_latency_ms, outcome }` (latency: integer milliseconds of `performance.now()`). An aborted forward leaves no record.
5. **Upstream choice.** The target's hostname is looked up in the `addUpstream` map (lower-case keys, no port); a hit connects to that origin over plain HTTP whatever the target's scheme. A miss with a loopback target host connects to the target's own host and port. Any other miss, or a connection error before response headers, answers 502 `bad gateway: upstream unreachable` (**fake-defined**), recorded with `status` 502, `outcome` `error` and `proxy.error` `upstream_status` 502. After headers an upstream error destroys the caller's connection.
6. **Vault.** `http2.createServer()` (prior-knowledge h2c). Every answer is `:status` 200, `content-type: application/grpc`, with `grpc-status` (and `grpc-message` when not 0) in trailers. Order: identity and token (digest compare), else 16; `vault.put`, else 7; exactly one uncompressed frame, else 3; then the field rules of test-plan.md § Vault refusal rows, each 3. Fields: 1 `tenant_id`, 2 `service_id`, 3 `auth_scheme` (varint), 4 `value`, 6 `header_name`, 8 `caller_actor_id`, 9 `target_url`; the last occurrence wins; other numbers are skipped by wire type; a wrong wire type, non-UTF-8 text, a truncated field or a group is 3. **Stricter than the real vault**: lowercase UUIDs, printable-ASCII `value` (it becomes a header), HTTP-token `header_name`, `target_url` equal to its own `URL.origin` (host-only, spike N4). The response frame holds `key_version` as field 1 and an empty `Timestamp` as field 2. The value lives only as bytes in `state.ts`.
7. **Audit.** With `auditSink` set, each event is `POST`ed to `${auditSink}/v1/internal/audit/emit` as JSON without `emitter`, with the broker's or the proxy's token by `emitter`, awaited before the answer that caused it and capped at 2000 ms (an implementation bound no test waits for); every failure is ignored; the event is recorded either way.
8. **Clock and randomness.** `now` serves `iat`, `exp` and the leeway. The key, `kid`, `jti` and the five secrets (32 characters of base64url) are per start, asserted by shape and distinctness only.
9. **Echo upstream.** Header values are joined `, `. Path `/redirect` answers 302, the only way the contract suite gets a 3xx from a service it provisions; this adds behaviour beyond the card's one line and changes no declaration.
10. **Contract suite.** A failure is an `assert.AssertionError` whose message starts with the check name and a colon (Node may append the compared values); an unreachable URL or unparsable body is one. A check that needs the echo service provisions it first, so none depends on another. `Host`, expiry, the leeway, the credential-less route and `[credential]` records are not in the suite.
11. **Close.** One memoised promise: the servers stop accepting, every socket, HTTP/2 session and outgoing upstream request is destroyed, and it resolves when all three servers have closed.

## Interfaces

Given, equal to `proposal.md`. Not scaffolded: the re-export lines of `index.ts` and the internal modules. Merged shapes: `delivered-shapes.md`.

```ts
// test/support/fake-egress/index.ts
export type FakeAuthScheme = "API_KEY_HEADER" | "BEARER_TOKEN";        // wire enum 1 and 3
export interface FakeVaultIdentity { identity: string; token: string; scopes: readonly ("vault.put" | "vault.read")[] }
export interface FakeEgressOptions {
  now?: () => Date;               // clock for iat, exp and the 30 s leeway (default: system time)
  auditSink?: string | null;      // base URL: events POST to `${auditSink}/v1/internal/audit/emit`; null (default): record only
}
export interface IssuedToken { jti: string; serviceId: string; tenantId: string; agentId: string; ttlSeconds: number; issuedAt: number; expiresAt: number }
export interface ForwardedRequest {
  serviceId: string; method: string; host: string; path: string; query: string;
  headers: Readonly<Record<string, string>>;   // as the upstream received them; the injected value is "[credential]"
  bodySha256: string; status: number; outcome: "allowed" | "error" | "rejected";
}
export interface StoredCredential { tenantId: string; serviceId: string; authScheme: FakeAuthScheme; headerName: string | null; targetUrl: string; keyVersion: number; callerActorId: string; identity: string }
export interface FakeAuditEvent { emitter: "broker" | "proxy"; event_type: string; tenant_id: string; actor_type: string; actor_id?: string; target_type?: string; target_id?: string; payload: Record<string, unknown> }
export interface FakeEgress {
  readonly brokerUrl: string;               // http://127.0.0.1:<p1>  (HTTP/1.1)
  readonly proxyUrl: string;                // http://127.0.0.1:<p2>  (HTTP/1.1)
  readonly vaultUrl: string;                // http://127.0.0.1:<p3>  (gRPC over h2c)
  readonly brokerServiceToken: string;      // per start; /v1/issue requires it
  readonly proxyServiceToken: string;       // per start; differs from the broker's (audit sink, N7)
  readonly vaultAdmin: FakeVaultIdentity;   // "svcid_ursitoare_admin", ["vault.put", "vault.read"]: Ursitoare's write identity
  readonly vaultProxy: FakeVaultIdentity;   // "svcid_proxy", ["vault.read", "vault.put"] (as Mintkey today, P8)
  readonly vaultDenied: FakeVaultIdentity;  // "svcid_email_proxy", []
  addUpstream(host: string, origin: string): void;            // host ends ".fake.test"; origin a loopback http origin
  addCredentialless(serviceId: string, tenantId: string, targetUrl: string): void;   // fake-only; not in the contract
  credentials(): StoredCredential[]; issued(): IssuedToken[]; requests(): ForwardedRequest[]; events(): FakeAuditEvent[];
  clearRecords(): void;                     // empties issued, requests and events; keeps credentials and upstreams
  close(): Promise<void>;                   // idempotent; closes all connections of the three listeners
}
export function startFakeEgress(opts?: FakeEgressOptions): Promise<FakeEgress>;
// test/support/fake-egress/echo.ts (re-exported)
export interface EchoUpstream { readonly origin: string; close(): Promise<void> }   // answers 200 JSON { method, path, query, headers, bodySha256 }
export function startEchoUpstream(): Promise<EchoUpstream>;
// test/support/fake-egress/contract.ts (re-exported)
export interface EgressContractTarget {
  brokerUrl: string; proxyUrl: string; vaultUrl: string; brokerServiceToken: string;
  vaultAdmin: { identity: string; token: string }; vaultDenied: { identity: string; token: string };
  tenantId: string;                                   // a UUID
  echo: { serviceId: string; targetUrl: string };     // a service the suite provisions, routed to an echo upstream
}
export function egressContract(target: EgressContractTarget): ContractCheck[];   // ContractCheck from test/support/fake-oidc
// test/support/fake-egress/wire.ts (not re-exported; task 1.1's test imports it)
export interface VaultPutInput { tenantId: string; serviceId: string; authScheme: number; value: Uint8Array; headerName: string; callerActorId: string; targetUrl: string }
export class WireError extends Error {}
export function encodePutRequest(m: VaultPutInput): Buffer;   // empty or zero members left out
export function decodePutRequest(message: Buffer): Omit<VaultPutInput, "value"> & { value: Buffer };   // throws WireError
export function encodePutResponse(keyVersion: number): Buffer;
export function decodePutResponse(message: Buffer): number;   // throws WireError
export function frame(message: Uint8Array): Buffer;
export function unframe(body: Buffer): Buffer;   // throws WireError unless exactly one uncompressed frame
// test/support/fake-egress/vault-client.ts (not re-exported; U45b and U48 take putCredential)
export function callVault(vaultUrl: string, who: { identity: string; token: string } | null, body: Uint8Array, rpc?: { path?: string; method?: string }): Promise<{ grpcStatus: number; grpcMessage: string; body: Buffer }>;
export function putCredential(vaultUrl: string, who: { identity: string; token: string } | null, input: VaultPutInput): Promise<{ grpcStatus: number; grpcMessage: string; keyVersion: number | null }>;
```

## Internal modules

`state.ts`, `jwt.ts`, `broker.ts`, `proxy.ts` and `vault.ts`: no test imports them, green creates each; they compile under the repo's `tsconfig` (erasable syntax only). `callVault` (one unary h2c call) and `putCredential` of `vault-client.ts` are in the Interfaces above.

## Failure cases

- `addUpstream` and `addCredentialless` throw `TypeError` (messages in test-plan.md § Registration rows) unless the lower-cased host ends `.fake.test` with at least one label before it, the origin is `http:` on a loopback host without path, query, fragment or userinfo, both ids are lowercase UUIDs and the target obeys the vault's rule. A throwing call registers nothing; a repeat replaces; a stored credential beats a credential-less route.
- Another tenant's token for the same service id finds no credential (502): the key is (claim `tenant_id`, `first`).
- An `auditSink` that is not an http base URL behaves as an unreachable sink. A malformed request never throws out of a server (broker 400, proxy 401 or 502, vault `grpc-status` 3).

## Security

Loopback only; the five secrets differ per start and are compared in constant time. A credential value lives only in `state.ts`'s buffers and the forwarded request; every list returns copies without it, and only the upstream (the echo, in its body) sees the injected header.

## Verification

Run on 2026-11-06 on Node 24.22.2 in a scratch implementation (it passes `tsc --noEmit` under the repo's options) against the tables of `test-plan.md`: the issue rows, F1-F3 and F4's echo path, P1-P16 and the expiry, the gated stream, the 302, the 500, the three kinds of upstream, V1-V33, the credential-less and registration rows, both sink failures, `close()` with a held stream, and the contract suite on the fake, two mutants and a closed port. Both request vectors come from `protoc --encode mintkey.vault.v1.PutCredentialRequest` on Mintkey's `vault.proto` and equal the scratch encoder's bytes. **Derived, not run:** the repo's own tests, every HEAD text, the real vault-adapter's acceptance of this framing (D16, M8), Node 26.

## Risks

- Conflict 11: 403 for a non-UUID first segment as at HEAD; the M8 stack run tells which is pinned.
- The card's texts are used where HEAD differs: the broker's 401 title is `unauthenticated` (HEAD: "Service token missing or invalid"); HEAD's proxy 401 bodies append `: <message>` and use `unknown_kid` and `invalid_format` too. The suite checks status and code only.
- Expiry and the leeway are fake-only (lesson 9). The h2c framing is checked against `protoc`, not the real vault-adapter (D16). The stricter vault checks reject nothing U46 or U48 send.
- Fake-defined: the 400 titles other than the TTL one, the probe's 404, the 502 text, `rejected`. Beyond the card: `state.ts`, `vault-client.ts`, the echo's `/redirect`, a gate for the 300 ms streaming wait.
