## Why

A tool server needs its credential in Mintkey. U48 gives an admin a write-only way to put it there, keeps a reference (never the value), tells the invoke path a server's service and origin, adds M6's one API code and seeds the journey's `acme` server.

Result: carol (`tenant_admin`) posts `{ toolServerId: "acme", authScheme: "API_KEY_HEADER", headerName: "x-fake-tools-key", value }` and gets 201 with the record (`keyVersion` 1, no value); a call through the fake proxy carries the value in that header only; rotating gives `keyVersion` 2; alice gets 403; with no vault the answer is 503 `EGRESS_UNAVAILABLE`.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6. This unit's part: the credential references, the vault write, the service resolver and the e2e part that seeds `acme`.

## What Changes

- New `src/credentials/` (with `policy/credentials.cedar`), `src/gateway/vault.ts`, `src/api/credential-routes.ts`, migration `0480_credentials.sql`, `test/support/e2e-stack/tool-servers-part.ts` and the discovered `parts/52-tool-servers.ts` (task 6.2). Capability `credentials` (ADDED); `api-conventions` (MODIFIED: "Every error code is registered", 27 codes).
- Named edits: `src/gateway/index.ts` (2.1), `src/api/error-codes.ts` and `src/api/error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message` (5.1; the name keeps "16"), `src/api/index.ts` (5.2), `test/arch/egress-sites.test.ts` (3.1), `src/main.ts` (6.1, after `registerToolServerRoutes`), `docs/api/openapi.json` (regenerated).
- No action, module edge, dependency or web change. Applied: D16, D20, D22, D28, U49 R2 and R3, U46 ruling 1.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`), importing gateway names type-only; this change implements them. Scaffolded (the stubs import them): the `export type` lines for `VaultAuthScheme`, `PutCredentialInput`, `VaultWriter` in `src/gateway/index.ts` and for `ServiceResolver`, `ServiceTarget` in `src/credentials/index.ts`. Not scaffolded: its other export lines, the value lines of `src/credentials/index.ts` and those of `src/api/index.ts`, the internal `validate.ts` and `vault-call.ts`, the migration, the fragment, the `ERROR_CODES` entry, the inventory literal, the `src/main.ts` lines, the document and `parts/52-tool-servers.ts`.
- **Depends on:** `add-engine-skeleton` (U01: `Secret`, `IdSource`), `add-oidc-login` (`oidcApi`), `add-tenancy-foundation`, `add-audit-chain`, `add-pdp-cedar`, `add-policy-catalogue`, `add-api-pep`, `add-api-conventions`, `add-roles-and-memberships`, `add-e2e-stack`, `add-crash-harness`, `add-fake-egress-proxy`, `add-fake-tools`, `add-gateway-client`, `add-tool-registry` (U03, U06, U08, U11, U11b, U13, U14, U17, U32, U45, U45b, U46, U47); U03, U06, U11, U11b and U17 are added to the card's edges for names the scenarios call.
- Shapes of the delivered names: `delivered-shapes.md` (merged code, main@cf34c628, and the M6 folders named).

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// src/gateway/vault.ts (exported from src/gateway/index.ts)
export type VaultAuthScheme = "API_KEY_HEADER" | "BEARER_TOKEN";
export interface PutCredentialInput {
  tenantId: string;        // a UUID: mintkeyTenantId(ctx.tenantId)
  serviceId: string;       // a UUID
  authScheme: VaultAuthScheme; value: Uint8Array; headerName: string | null;
  callerActorId: string; targetUrl: string;   // the tool server's origin
}
export interface VaultWriter { putCredential(input: PutCredentialInput): Promise<{ keyVersion: number }> }
export function createVaultWriter(vault: NonNullable<EgressConfig["vault"]>, deps: { logger: Logger; timeoutMs?: number }): VaultWriter;
  // refusals and failures: design.md § Codec and writer
export function encodePutCredentialRequest(input: PutCredentialInput): Uint8Array;
export function decodePutCredentialResponse(message: Uint8Array): { keyVersion: number };
// src/credentials/types.ts (exported from src/credentials/index.ts)
export interface CredentialRecord {
  id: string; toolServerId: string; serviceId: string; authScheme: VaultAuthScheme; headerName: string | null;
  targetOrigin: string; keyVersion: number; provisionedBy: string; provisionedAt: string; rotatedAt: string | null;
}
export interface ServiceTarget { serviceId: string; origin: string }
export interface ServiceResolver { resolve(ctx: TenantContext, toolServerId: string): Promise<ServiceTarget | null> }
export type CredentialsErrorCode = "CREDENTIALS_INVALID" | "CREDENTIALS_NOT_FOUND" | "CREDENTIALS_EXISTS" | "CREDENTIALS_VAULT";
export class CredentialsError extends Error { readonly code: CredentialsErrorCode; readonly details: Readonly<Record<string, string>>; }
export interface CredentialDeps { pool: TenantPool; vault: VaultWriter; ids: IdSource; clock: Clock }
// src/credentials/provision.ts (exported from src/credentials/index.ts)
export function provisionCredential(deps: CredentialDeps, ctx: TenantContext, input: { toolServerId: string; authScheme: VaultAuthScheme; headerName: string | null; value: string; serviceId?: string }, actor: AuditEventInput["actor"]): Promise<CredentialRecord>;
export function provisionCredentialTx(tx: TenantTx, deps: CredentialDeps, ctx: TenantContext, input: { toolServerId: string; authScheme: VaultAuthScheme; headerName: string | null; value: string; serviceId?: string }, actor: AuditEventInput["actor"]): Promise<CredentialRecord>;
// src/credentials/rotate.ts (exported from src/credentials/index.ts)
export function rotateCredential(deps: CredentialDeps, ctx: TenantContext, credentialId: string, value: string, actor: AuditEventInput["actor"]): Promise<CredentialRecord>;
// src/credentials/store.ts (exported from src/credentials/index.ts)
export function listCredentials(pool: TenantPool, ctx: TenantContext): Promise<CredentialRecord[]>;
// src/credentials/resolver.ts (exported from src/credentials/index.ts)
export function createServiceResolver(pool: TenantPool): ServiceResolver;
export function seedServiceId(tenantId: string, toolServerId: string): string;   // UUIDv8 of sha256(`ursitoare-service:${tenantId}/${toolServerId}`)
// src/api/credential-routes.ts (exported from src/api/index.ts)
export interface CredentialApiDeps { pool: TenantPool | null; vault: VaultWriter | null; ids: IdSource; clock: Clock; engineKey: KeyMaterial | null }
export function registerCredentialRoutes(server: FastifyInstance, deps: CredentialApiDeps): void;
// test/support/e2e-stack/tool-servers-part.ts (parts/52-tool-servers.ts re-exports it as `part`)
export const toolServersPart: E2eStackPart;   // name "tool-servers"
export const SEED_TOOL_SERVER: Readonly<{ id: string; origin: string; refs: readonly string[] }>;
  // { id: "acme", origin: FAKE_TOOLS_ORIGIN, refs: ["erp.lookup_vendor@1", "erp.create_payment@1"] }
```

**Interfaces taken:**

- From `add-gateway-client`: `EgressConfig`, `GatewayError`, `mintkeyTenantId`, `createGateway`, `egressApi`, `checkEgressSites`. From `add-fake-egress-proxy`: `startFakeEgress`, `FakeEgress`, `startEchoUpstream`. From `add-fake-tools`: `FAKE_TOOLS_ORIGIN`, `FAKE_TOOLS_KEY_HEADER`, `toolsApi`. From `add-tool-registry`: `registerToolServer`, `getToolServer`, `ToolServerRecord`, `fixtureSurface`.
- Also used: U45's `putCredential` and the base names of `delivered-shapes.md`.

## Out of scope

The credential web UI (U56); other schemes; U45b's remark that U48 "extends P3" (its P3 asserts only `45-egress.ts` < `50-tools.ts`, which stays true: PT6 asserts the order of `egress`, `tools`, `tool-servers` and no frozen part-order test is edited); revoking or deleting a credential; two credentials per server; changing an origin; the real vault's acceptance of the framing (M8); the credential-less route.
Tests: each file starts with `assert.equal(typeof <function under test>, "function")`, wraps a call that reaches a scaffold stub, closes pools, servers and fakes in `finally`, has no `.`, `[` or `::` in test names and imports from the declaring file. Frozen tests relied on besides the two edited: `src/main.conventions.test.ts::C-d150bfa4`, `src/identity/roles-policy.test.ts::C-a5d01d7a`, `src/main.admin.test.ts`.
