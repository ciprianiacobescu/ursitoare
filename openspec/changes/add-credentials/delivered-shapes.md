# Delivered shapes taken by add-credentials

From main@cf34c628 (`file:line`) and, for what the sibling folders keep out of their Interfaces given, from those folders. The names the siblings give (`EgressConfig`, `GatewayError`, `mintkeyTenantId`, `createGateway`, `egressApi`, `checkEgressSites`, `startFakeEgress`, `FakeEgress`, `startEchoUpstream`, the fake-tools constants, `registerToolServer`, `getToolServer`, `fixtureSurface`) are taken as they give them. No M5 name is used.

```ts
// add-fake-egress-proxy (U45) Interfaces given, test/support/fake-egress/vault-client.ts
export function putCredential(vaultUrl: string, who: { identity: string; token: string } | null, input: VaultPutInput): Promise<{ grpcStatus: number; grpcMessage: string; keyVersion: number | null }>;   // wire.ts: interface VaultPutInput { tenantId: string; serviceId: string; authScheme: number; value: Uint8Array; headerName: string; callerActorId: string; targetUrl: string }
// add-gateway-client (U46), test/support/gateway-kit.ts (design decision 12)  issuedPermit(over?): the Permit that createPdp.check issued for egress { ...BASE_EGRESS, ...over }; mintkeyTenantId("tenant_a") = d7f4eeba-9f57-8892-b4bb-591d220496d4
// add-tool-registry (U47)  table tool_server (tenant_id, tool_server_id, origin, …), PK (tenant_id, tool_server_id), as U47's requirement "Tool servers and their surfaces are stored per tenant and only approvals update them" declares; ToolServerRecord { id; origin; pendingDigest; … }
// src/audit  event.ts:5 AuditEventInput { eventType; actor: { kind: "user" | "service" | "system"; id }; target?; payload? }  append.ts:19 appendAudit(tx, ctx, event, opts?: { clock? })  hash.ts:30 formatAt(at: Date): string
// src/tenancy  withTenantTx<T>(pool, ctx, fn: (tx: TenantTx) => Promise<T>): Promise<T>
// src/api  idempotency.ts:112 withIdempotency(ctx: { pool; tenant; clock }, principal: { userId }, key, requestDigest, fn: (tx) => Promise<{ status; body }>): Promise<{ status; body; replayed }>  :72 requestDigestOf({ method; route; params?; query?; body? }): string (sha256, stored in idempotency_key.request_digest)  :43 idempotencyKeyOf(req)
//   admin-page.ts:65 pageRows(rows, page, binding, keyOf)  cursor.ts:101 deriveCursorKey(engineKey)  errors.ts: a validation issue is { field: context + instancePath, message }
// src/config/secret.ts:10 Secret { reveal() }   src/core/ids.ts IdSource.next(prefix) → `${prefix}_<uuid>`   e2e-stack: databaseApi(handles).ownerUrl, oidcApi(handles).fake.issuer, E2eStackError, part.ts:19-39
```
