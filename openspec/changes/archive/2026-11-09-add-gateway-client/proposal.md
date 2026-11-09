## Why

The engine reaches tools only through Mintkey: a broker that issues a one-service token and a proxy that adds the stored credential. The units that invoke tools (U48, U50) need a client that cannot be aimed beyond the PDP's permit, a start-up check that the broker is not open, and a list of the client's callers.

Observable result: against U45's fake egress, `requestToken(permit, tag)` returns `{ serviceId, expiresAt: 1793959260 }` for TTL 60 at 10:00:00Z; `send` of the permitted `POST /v1/lookup?id=7` reaches the upstream with `x-ursitoare-call: r_1:lookup:1` and no caller `authorization`; the same token again is `GATEWAY_INVALID` `{ reason: "token_used" }`; a 302 returns with its `location`, never followed; a copy of the permit is `GATEWAY_PERMIT_FOREIGN`. `main` probes the broker before it opens the database: one that issues without a service token is a fatal start (exit 1), an unreachable one a warning.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the egress configuration, the gateway client with its permit and token discipline, the start-up self-check and the egress-site inventory. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New `src/gateway/` (six files), `src/config/egress.ts`, `test/arch/egress-sites.ts`, `test/support/e2e-stack/egress-part.ts` with `parts/45-egress.ts`, `test/support/gateway-kit.ts`, and named edits of `src/config/{config,index}.ts`, `src/pdp/{permit,index}.ts` and `src/main.ts`.
- Capabilities `gateway` (ADDED, new) and `engine-config` (one ADDED requirement). No migration, route, error code, fragment, document edit, module edge or dependency; no frozen test is changed.
- Decisions applied: D4 (the C2 scan is a frozen inventory plus the run-time `isIssuedPermit`), D17 (derived Mintkey tenant id, vectors here), D19 (the self-check runs at boot only). D18's 60 s is U50's: `requestToken` sends `permit.ttlSeconds`. Exit tests 12 (part), 13, 6 (scan). Request discipline follows `seed/sandbox-quickjs/src/fetchGateway.ts`; no datum depends on `seed/`.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`), `src/gateway/index.ts` with its re-exports included; this change implements them. Not scaffolded: the value of `GATEWAY_LIMITS`, `AppConfig.egress` (`readonly egress?: EgressConfig`) and its call in `loadConfig`, `MainDeps.checkEgress` (`checkEgress?: typeof checkEgress`) and its call in `main`, the value export lines of `src/config/index.ts` (its type-only `export type { EgressConfig }` line is scaffolded, since every `src/gateway/*.ts` stub imports the type) and the export lines of `src/pdp/index.ts`, and `parts/45-egress.ts` (a scaffolded part file would start a throwing stub in every stack; task 8.1 creates it).
- **Depends on:** `add-engine-skeleton` (U01), `add-architecture-fitness` (U04), `add-e2e-stack` (U06), `add-pdp-cedar` (U11), `add-policy-catalogue` (U11b), `add-crash-harness` (U32), `add-fake-egress-proxy` (U45); tests also use `add-db-foundation`.
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M6 folder `add-fake-egress-proxy`, checked line by line).

**Interfaces given** (the block of `design.md` § Interfaces)

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

**Interfaces taken:** the names of `delivered-shapes.md` (config, `Clock`, `Logger`, `Permit`, `createPdp`, the arch helpers, the part types, `withDedicatedCluster`, `MainDeps`, `main`, and U45's `startFakeEgress`, `FakeEgress`, `startEchoUpstream`).

## Out of scope

The vault write (U48), the invoke path and PEP call (U50), the fake tools (U45b), TLS pinning, retries, streamed bodies, a health check (D19) and the real-stack run (M8).
