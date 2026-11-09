## Why

The engine reaches tools only through Mintkey: a broker that issues a short-lived token, a proxy that adds the stored credential and forwards, a vault Ursitoare writes credentials to, and audit events posted back. The units that build the gateway client (U46), the fake tools (U45b), the credential store (U48) and the invoke path (U50) need one loopback stand-in with Mintkey's wire, with no Docker, Kong or secret, so a client that passes against it can be pointed at the real stack in M8 unchanged.

Observable result: `await startFakeEgress()` returns three loopback listeners on random ports. `POST {brokerUrl}/v1/issue` answers `{ token, expires_at }` (an EdDSA JWT with `aud` `[S1]`) and `issued()` and `events()` record it. After a credential for `S1` is written by the h2c gRPC call `PutCredential`, `GET {proxyUrl}/S1/x?q=1` with the bearer reaches the upstream of `tools.fake.test` as `GET /x?q=1`, with the stored value in the stored header and without the caller's `Authorization`; `requests()` shows `[credential]`. A token for another service gets 403 and no upstream call. `egressContract(target)` returns nine checks for these URLs and the real stack.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the Mintkey-shaped fake (broker, proxy, vault, audit events) that the gateway, the fake tools and the credential store are tested against. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New directory `test/support/fake-egress/`: `index.ts` (types and `startFakeEgress`), `echo.ts`, `contract.ts` and the internal `state.ts`, `jwt.ts`, `broker.ts`, `proxy.ts`, `vault.ts`, `wire.ts` (protobuf and gRPC frames), `vault-client.ts` (an h2c client for tests and the suite), each with tests.
- Capability `test-fake-egress` (ADDED, new). No `src/` change, migration, API code, e2e part (U46's `45-egress.ts` starts this fake), document edit (`test/support/README.md` has the row) or dependency; no frozen test is changed.
- Follows Mintkey HEAD for a non-UUID first path segment (403, conflict 11), D16 (the vault write is a hand-rolled gRPC unary call over `node:http2` h2c) and D28 (the credential-less route is fake-only). Exit test 13 uses this fake as its fixture.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the two re-export lines of `index.ts` (`export * from "./echo.ts"`, `export * from "./contract.ts"`, added by tasks 1.2 and 6.1) and the internal modules `state.ts`, `jwt.ts`, `broker.ts`, `proxy.ts`, `vault.ts`, which no test imports; each task names its module by path. The `contract.ts` stub imports `type ContractCheck` from `../fake-oidc/index.ts`.
- **Depends on:** `add-fake-oidc` (U09): `ContractCheck` and the convention of a contract suite that takes base URLs. The module imports nothing from `src/` or another fake.
- **Seeds** (`seed/deploy/mintkey-footprint`, the production spike on Mintkey `f98ae74`, Mintkey HEAD `ae05220` read, not run) are restated inline: every datum is in `design.md` and `test-plan.md`.
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M5 folders named, checked line by line).

**Interfaces given** (the block of `design.md` § Interfaces)

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

**Interfaces taken:**

- From `add-fake-oidc`: `ContractCheck`.

## Out of scope

The gateway client, the fake tools and the e2e part that starts this fake (U46, U45b), the real vault writer (U48), Kong and its `/v1/call/<service>/` prefix, TLS, `GetCredential`, rotation, revocation, other auth schemes, the `methods` and `path_prefix` claims of Mintkey HEAD, and running the contract suite against the real stack (M8, which also tells whether the real vault accepts this framing, D16).
