# Delivered shapes taken by add-stack-conformance

Declarations from main@31968a29 (`file:line`; `…` elides unused members), each read in the file named. The in-plan names are in those units' Interfaces given.

```ts
// test/support
fake-oidc/index.ts:4-8          startFakeOidc; oidcContract; types OidcContractCredentials, ContractCheck
fake-oidc/contract.ts:8-18      OidcContractCredentials = { clientId; clientSecret; redirectUri; username; password; organization: string; groups: readonly string[] }; ContractCheck = { name: string; run(): Promise<void> }
fake-oidc/contract.ts:110-119   loadForm: matches /<form id="kc-form-login" method="post" action="([^"]*)"/; a miss asserts "the login page has no form action"
fake-oidc/contract.ts:416-455   oidcContract(baseUrl, credentials): ContractCheck[]   // 10 checks, discovery document … logout ends the session
fake-egress/contract.ts:8-17,88 EgressContractTarget { brokerUrl; proxyUrl; vaultUrl; brokerServiceToken; vaultAdmin: { identity; token }; vaultDenied: { identity; token }; tenantId; echo: { serviceId; targetUrl } }; egressContract(target): ContractCheck[]   // 9 checks; a failure asserts with the check name first
fake-egress/vault-client.ts:6-10,58  callVault(vaultUrl, who: { identity; token } | null, body: Uint8Array, rpc?: { path?; method? }): Promise<{ grpcStatus; grpcMessage; body: Buffer }>; putCredential(vaultUrl, who | null, input: VaultPutInput): Promise<{ grpcStatus; grpcMessage; keyVersion: number | null }>
fake-egress/wire.ts:3-11,149    VaultPutInput { tenantId; serviceId; authScheme: number; value: Uint8Array; headerName; callerActorId; targetUrl }; frame(message): Buffer
fake-egress/index.ts:19-22,68-85,119  FakeEgressOptions { now?; auditSink?: string | null }; FakeEgress { brokerUrl; proxyUrl; vaultUrl; brokerServiceToken; proxyServiceToken; vaultAdmin; vaultDenied; addUpstream(host, origin); events(); close() … }; startFakeEgress(opts?); fake-egress/echo.ts:10 startEchoUpstream(): Promise<{ origin; close() }>
tool-surface.ts:5-8             fixtureSurface(refs: readonly string[], opts?: { untrustedResult? }): ToolSurface
e2e-stack/stack.ts:33,101       startE2eStack(opts?: { port?; controlPort?; dataDir? … }): Promise<{ url; handles; close() … }>;  e2e-stack/oidc-part.ts:102  oidcApi(handles): { fake }   // fake.passwordOf(username)
// src
gateway/tenant.ts:3             mintkeyTenantId(tenantId: string): string   // exported by gateway/index.ts:15
api/me.ts:20-46,91-97           GET /api/v1/me → { user, tenant: { id, name, reviewProfile }, capabilities, csrfToken }; each call stores a new CSRF token
api/audit-routes.ts:147-176,250-262,503-512   GET /api/v1/audit?event_type&limit(≤200)&order → { items: [{ seq, at, eventType, actor, target, payload, origin: "ursitoare" | "mintkey", mk, … }], next_cursor }; read_audit, which tenant_admin holds (identity/policy/roles.cedar:8)
api/tool-server-routes.ts:41-52,177   POST /api/v1/tool-servers { id, adapter: "fixture" | …, origin, local?, surface } → 201, 409 ALREADY_EXISTS
api/credential-routes.ts:50-62,71-81,214   POST /api/v1/credentials { toolServerId, authScheme: "API_KEY_HEADER" | "BEARER_TOKEN", headerName?, value } → 201 { …, keyVersion: integer }, 409 ALREADY_EXISTS
test/arch/egress-sites.ts:21     scans only non-test files under src/, so test/support may import src/gateway
credentials/provision.ts:99     the service id of a credential is fresh per provision, so a first write has a first key version
```
