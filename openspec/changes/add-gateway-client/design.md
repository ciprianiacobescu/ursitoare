## Context

The gateway is the one place the engine speaks HTTP to tools (ADR-06 Path B): a PDP `Permit`, a one-service broker token, one forwarded request. This unit holds the last two steps and the proof of the first; U48 adds the vault writer to the module and U50 calls it. Tests use U45's fake egress; M8 checks the wire against Mintkey.

## Decisions

1. **Layout.** `src/gateway/` imports `core`, `config` (types), `observability` (type) and `pdp`, the edges `test/arch/modules.ts` already gives it [D24]; `fetch` is called only there (the network rule).
2. **Configuration.** A variable is set when non-empty; other `URSITOARE_EGRESS_*` names are ignored. The check order and reasons are test-plan.md § Config. `loadConfig` calls `loadEgressConfig` after `loadOidcConfig` and adds `egress` only when defined (the oidc form), so a config without these variables is unchanged. `http:` is accepted for any host (Risks); a `…_TOKEN` name without `_FILE` is refused by `refuseSecretShapedVariables` first. `readSecretValue` runs first, so a blank file stays `CONFIG_SECRET_EMPTY` (E13 to E15) and the character check sees only a non-empty value. A token file is, after `readSecretValue` dropped one trailing newline, 1 to 4096 characters of `\x21-\x7e`, else `CONFIG_INVALID` for the variable (`TOKEN_R`): the token becomes a header value, and Node's `fetch` and `http2` echo a refused value in their `TypeError`.
3. **`isIssuedPermit`.** `permit.ts` keeps a module-level `WeakSet<object>` that `buildPermit` fills. Its only caller is `check` (`check.ts:76`) and `src/pdp/index.ts` does not export it, so no other module can mint a permit; a copy, or a permit read back from the decision log, is foreign.
4. **The token.** `requestToken` returns a frozen `{ serviceId, expiresAt }` and keeps `{ jwt, used }` in a module-level `WeakMap` keyed by that object, so the JWT is no own property and an object with equal fields is no token. `used` becomes true once `send` passed every check, before the network call, so a failed send consumes the token. The answer is accepted only with a `token` of 1 to 8192 characters of `[A-Za-z0-9._-]` (a compact JWS cannot break the header) and an `expires_at` no later than the clock's second plus `permit.ttlSeconds` plus 30 (a broker that ignored the TTL is refused as `UNAVAILABLE token`). No refresh, no retry. D18: `permit.ttlSeconds` is sent as is.
5. **`send` checks**, in the spec's order. A permit `serviceId` must be a lower-case UUID (`GATEWAY_INVALID` `service`, in `requestToken` and in `send` after the tag), because the URL is `<proxyUrl>/<serviceId><path>` and the PDP's pattern admits `.` and `..` (ran: `createPdp` issues a permit for `..` and for an upper-case UUID). A tag is valid when `tenantId` has 1 to 128 characters, `runId` and `nodeId` match `^[A-Za-z0-9._:-]{1,256}$` and `attempt` is a safe integer of at least 1 (so the call header holds no line break). A path is unsafe when it holds `#` or `\`, or a segment before `?` is `.` or `..` once `%2e` is decoded (`fetch` resolves such segments and would leave the service prefix). A header is refused when its lower-cased name is in the spec's list (the card's five plus the seed's, `fetchGateway.ts:3`), its name is not `^[a-z0-9!#$%&'*+.^_\`|~-]+$` or its value has a character outside `\x20-\x7e\x80-\xff`. Expiry is `expiresAt <= floor(clock.now() / 1000)`.
6. **The call and its bounds.** `init` is exactly `{ method, headers: { ...request.headers, authorization, "x-ursitoare-call" }, body: request.body, redirect: "manual", signal }`; repeated response headers are joined `, `. One `AbortController` per call: `setTimeout(abort, GATEWAY_LIMITS.timeoutMs)`, read from the global at call time and cleared in `finally`, covers connect, headers and body. A `content-length` above the cap, or more than the cap in the stream, cancels the read; exactly 1048576 bytes pass. A token answer over the cap is `UNAVAILABLE token`. Tests drive the timer with `mock.timers`. The destination is always the configured proxy: `request.origin` is only compared. Verified (probe) that Node 24's `fetch` with `redirect: "manual"` returns the real 302 and its `location`.
7. **Logs.** `path` is logged without its query and `ms` comes from `deps.clock`.
8. **`checkEgress`.** Probes and bodies: test-plan-edges.md § Self-check; the resolve body is the one ADR-0018 §4 names (UNVERIFIED against Mintkey's code). Any non-2xx answer, a 3xx included, counts as refused; a connection error or timeout marks the broker unreachable and the next probe still runs; a 2xx logs an `error` line `{ code, probe, brokerUrl }` with the message `egress broker answered <probe> without a service token; give it its service tokens before starting` and throws at once (`main`'s fatal line keeps only `code` and `details.reason`, so this line is the one that names the broker and the remedy). `main` logs the `unreachable` warning with `code`, `brokerUrl` and the message `egress broker unreachable; tool calls fail until it answers`.
9. **`main` (this unit's named edit of the shared `src/main.ts`, task 7.1; U47 and U49b edit it after).** Right after `logger` is created and before `openDatabase`, so a fatal start has nothing to tear down: when `config.egress` is set, `await (deps.checkEgress ?? checkEgress)(config.egress, { clock: systemClock, logger })`; a throw takes the existing path (`bootstrap.fatal(fatalFields(error), fatalMessage(error))`, `exit(1)`, `return null`).
10. **The rule (D4).** An importer is a file whose `collectImports` entry resolves (`resolveSpecifier`) to `src/gateway/index.ts` and whose `typeOnly` is false (value import, export-from, literal `import()`); an `import type` of the gateway is no egress site (later units' scaffold stubs use it for gateway types). The frozen literal is exactly `["src/main.ts"]`; U48 and U50 each add their files in a task that names `test/arch/egress-sites.test.ts::C-76ead8ea the engine's egress sites are exactly the inventory`. The run-time half is `isIssuedPermit` in `requestToken` and `send`.
11. **The part.** `egressApi` finds the fake through a `WeakMap` keyed by the handle (the `oidcApi` form). `beforeReset` clears records, not credentials or upstreams; the crash cluster never calls it.
12. **Helper** `test/support/gateway-kit.ts`: `BASE_EGRESS`, `issuedPermit`, `recordingFetch`, `captureLogger`.

## Interfaces

Given, equal to `proposal.md` (not scaffolded: its Scaffold bullet). Merged shapes: `delivered-shapes.md`.

```ts
// src/config/egress.ts (re-exported from src/config/index.ts)
export interface EgressConfig {
  readonly brokerUrl: string;      // URSITOARE_EGRESS_BROKER_URL
  readonly proxyUrl: string;       // URSITOARE_EGRESS_PROXY_URL
  readonly brokerToken: Secret;    // URSITOARE_EGRESS_BROKER_TOKEN_FILE
  readonly agentId: string;        // URSITOARE_EGRESS_AGENT_ID, default "ursitoare-engine", ^[A-Za-z0-9._:-]{1,128}$
  readonly vault: { readonly url: string; readonly identity: string; readonly token: Secret } | null;
    // URSITOARE_EGRESS_VAULT_URL, URSITOARE_EGRESS_VAULT_IDENTITY, URSITOARE_EGRESS_VAULT_TOKEN_FILE: all three or none
}
export function loadEgressConfig(env: Env, readSecret: SecretReader): EgressConfig | undefined;
  // undefined when no URSITOARE_EGRESS_* variable is set; ConfigError (variable, reason) otherwise
// src/gateway/types.ts (every src/gateway name is exported from src/gateway/index.ts)
export interface CallTag { tenantId: string; runId: string; nodeId: string; attempt: number }
export interface OutboundRequest {
  method: string;                                 // as the permit, e.g. "POST"
  origin: string;                                 // "https://tools.fake.test"; the permit's host is new URL(origin).host
  path: string;                                   // the permit's path, query included
  headers: Readonly<Record<string, string>>;
  body: Uint8Array | null;
}
export interface BrokerToken { readonly serviceId: string; readonly expiresAt: number }   // the JWT is held privately, never enumerable
export interface GatewayResponse { status: number; headers: Readonly<Record<string, string>>; body: Uint8Array }
export type GatewayErrorCode =
  | "GATEWAY_PERMIT_FOREIGN" | "GATEWAY_PERMIT_MISMATCH" | "GATEWAY_TOKEN_REFUSED" | "GATEWAY_UNAVAILABLE"
  | "GATEWAY_RESPONSE_TOO_LARGE" | "GATEWAY_INSECURE_BROKER" | "GATEWAY_INVALID";
export class GatewayError extends Error {
  readonly code: GatewayErrorCode; readonly details: Readonly<Record<string, string>>;
  constructor(code: GatewayErrorCode, message: string, details?: Record<string, string>);
}
export interface Gateway {
  requestToken(permit: Permit, tag: CallTag): Promise<BrokerToken>;
  send(permit: Permit, request: OutboundRequest, token: BrokerToken, tag: CallTag): Promise<GatewayResponse>;
}
export interface GatewayDeps { clock: Clock; logger: Logger; fetch?: typeof fetch }
export const GATEWAY_LIMITS: Readonly<{ maxResponseBytes: number; timeoutMs: number; selfCheckTimeoutMs: number }>;   // { maxResponseBytes: 1048576, timeoutMs: 30000, selfCheckTimeoutMs: 5000 }
// src/gateway/client.ts
export function createGateway(config: EgressConfig, deps: GatewayDeps): Gateway;
export function callHeader(tag: CallTag): string;                    // `${runId}:${nodeId}:${attempt}`
// src/gateway/digest.ts
export function bodyDigest(body: Uint8Array | null): string;        // lowercase hex sha256; null is empty
export function permitMatches(permit: Permit, request: OutboundRequest): boolean;
// src/gateway/tenant.ts
export function mintkeyTenantId(tenantId: string): string;           // UUIDv8 from sha256(`ursitoare-tenant:${tenantId}`)
// src/gateway/self-check.ts
export function checkEgress(config: EgressConfig, deps: GatewayDeps): Promise<{ broker: "closed" | "unreachable" }>;
// src/pdp/permit.ts (exported from src/pdp/index.ts)
export function isIssuedPermit(value: unknown): boolean;   // true only for a Permit that check() returned on allow in this process
// test/arch/egress-sites.ts
export function checkEgressSites(s: Snapshot, allowed: readonly string[]): Violation[];   // code ARCH_EGRESS_SITE
// test/support/e2e-stack/egress-part.ts (parts/45-egress.ts re-exports egressPart as `part`)
export const egressPart: E2eStackPart;   // name "egress"
export function egressApi(handles: ReadonlyMap<string, PartHandle>): { fake: FakeEgress };   // E2eStackError when absent
// test/support/gateway-kit.ts (helpers of U46's, U48's and U50's tests; values in test-plan.md § Constants)
export const BASE_EGRESS: Readonly<Egress>;
export function issuedPermit(over?: Partial<Egress>): Promise<Permit>;   // the frozen permit createPdp.check issued for { ...BASE_EGRESS, ...over }
export function recordingFetch(answers: (Response | Error)[]): { fetch: typeof fetch; calls: { url: string; init: RequestInit }[] };
export function captureLogger(): { logger: Logger; lines(): Record<string, unknown>[] };   // trace level
```

## Failure cases

- A pre-network refusal leaves the token unspent; once the call began (timeout, error, oversize, any answer) it is spent.
- A throwing fetch, an erroring body stream and an abort become `GATEWAY_UNAVAILABLE` with the stage; no raw `TypeError` escapes. A 4xx or 5xx from the proxy is a normal answer; only the broker's 401 and 403 are `GATEWAY_TOKEN_REFUSED`.
- Absent `egress` changes nothing. Frozen tests relied on: `src/config/config.test.ts`, `src/main.test.ts`, `src/main.db.test.ts::C-fb007fe9` (`/health` stays `{ db: "ok" }`), `src/main.mockruns.test.ts::C-28603f65`, `test/arch/fault-points.test.ts::C-72672e22`, `src/pdp/permit.test.ts::C-44202a58`.

## Verification

Run on 2026-11-06 on Node 24.22.2 in a scratch copy of main@cf34c628 with this change and U45's scratch fake: the vectors (also in Python), the table rows of both test plans, `main` against an open stub, the fake and a closed port, and the part in `withDedicatedCluster`. With the change `src/config`, `src/pdp`, `src/main*.test.ts`, `test/arch`, `test/support/e2e-stack` and `test/support/crash/cluster.test.ts` passed 393 of 399; the five failures read `e2e/`, `web/` or git, absent from the copy. Rows added after review C (token and service-id bounds K4, K8, K9, S28, S29, O5, token files E17 to E19 and L6, the self-check lines C5 to C7, N1, N3) were checked by regex and by a `createPdp` probe for the `..` and upper-case permits (both issue), not by the tests. **Derived, not run:** this unit's tests as written, the Mintkey wire (the fake stands in), the resolve probe body, Node 26.

## Risks

- `http:` is allowed for any host (M8's compose network uses plain http to Mintkey), so a misconfigured public URL sends tokens in clear.
- The scan is file-level; the run-time permit check closes the gap. Each adapter of M7 and M9 adds its file in a named task. A file that only injects a `Gateway` by type is outside the scan; its value-importing composition root is inside it.
- An open broker that rejects the probe body for another reason would pass as closed (UNVERIFIED; M8 checks it). A silent broker holds boot at most 5 s per probe (`selfCheckTimeoutMs`, not the 30 s send timeout). `http:` for non-loopback hosts goes on the release-hardening list (https or an explicit opt-in).
