# Delivered shapes taken by add-stack-overlay

Declarations from main@31968a29 (`file:line`), each read in the file named. U45, U45b and U54b are merged and archived; the in-plan names are in `add-init-secrets` and `add-hobbyist-compose`.

```ts
// test/support/fake-egress (U45)
contract.ts:8-17      interface EgressContractTarget { brokerUrl; proxyUrl; vaultUrl: string; brokerServiceToken: string; vaultAdmin: { identity; token }; vaultDenied: { identity; token }; tenantId: string; echo: { serviceId: string; targetUrl: string } }
contract.ts:19,92     "x-mintkey-service-token" on POST <brokerUrl>/v1/issue { agent_id, service_id, tenant_id, scope: "call", ttl_seconds }
vault-client.ts:7-8   VAULT_IDENTITY_HEADER = "x-mintkey-identity"; VAULT_TOKEN_HEADER = "x-mintkey-token"
vault-client.ts:10,33-34   callVault(vaultUrl, who | null, body, rpc?) sets the two headers only when who is not null; http2.connect (plain http is h2c)
vault-client.ts:58    putCredential(vaultUrl, who, input): Promise<{ grpcStatus; grpcMessage; keyVersion: number | null }>
wire.ts:3-11          VaultPutInput { tenantId; serviceId; authScheme: number; value: Uint8Array; headerName; callerActorId; targetUrl }
index.ts:68,119       FakeEgress { brokerUrl; proxyUrl; vaultUrl; brokerServiceToken; vaultAdmin; vaultDenied; addUpstream(host, origin); close() }; startFakeEgress(opts?)
echo.ts:10            startEchoUpstream(): Promise<{ origin; close() }>; answers { method, path, query, headers, bodySha256 }
// fake-tools (U45b), fake-mcp (U54b)
fake-tools/index.ts:16,157,182-186   FAKE_TOOLS_HOST "tools.fake.test"; startFakeTools(opts?); another Host gets 421
fake-mcp/index.ts:54,133             FAKE_MCP_HOST "mcp.fake.test"; startFakeMcp(opts?: { era?; … })
e2e-stack/database-part.ts:24 E2E_TENANT_NAME = "E2E tenant";  tenant-b-part.ts:12 TENANT_B_NAME = "Tenant B"
fake-oidc/seed.ts:51-55  USERS alice, bob, carol (org-a) and mallory (org-b), with the groups of the spec's table
// src and repository
src/gateway/vault.ts:62-67   the engine's vault client sends x-mintkey-service-token, -service-identity, x-mintkey-token and -identity
src/pdp/capabilities.ts:12-23 probeRequest: resource { type: "Tenant", id }
src/main.ts:519       if (process.argv[1] === fileURLToPath(import.meta.url)) { await main(); }
test/arch/secrets.ts:14-23 a PEM private-key line and other key-shaped text fail ARCH_SECRET
test/support/readme.test.ts   pins the fake-tools row of test/support/README.md
stack.durable.test.ts:110,180  reads docs/testing.md for "A reset discards every durable workflow"
docs/testing.md:63-64 the closing paragraph says "never `down -v`"
```
