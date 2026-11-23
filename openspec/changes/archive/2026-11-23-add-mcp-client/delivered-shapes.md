# Delivered shapes taken by add-mcp-client

Merged code at main@3daa5c35 (`file:line`; `...` elides unused members). U47b's and U54b's names are in their folders.

```ts
// src/gateway
types.ts:7-60        CallTag { tenantId; runId; nodeId; attempt }  OutboundRequest { method; origin; path; headers; body: Uint8Array | null }  GatewayResponse { status; headers; body }  class GatewayError(code, message, details) (code "GATEWAY_UNAVAILABLE" | ...)  Gateway { requestToken(permit, tag); send(permit, request, token, tag) }
digest.ts:6          bodyDigest(body): string   // sha256 hex; a value import of src/gateway/index.ts makes a file an egress site
client.ts:17-33,141  tag parts ^[A-Za-z0-9._:-]{1,256}$; lower-case header names; "#", "\" or a "."/".." segment is GATEWAY_INVALID at send; the response is read whole (1 MiB)
// src/pdp
types.ts:22-50       Egress { method; host; path; bodyDigest; serviceId; ttlSeconds }  Permit = Egress  PolicyRequest { principal; action; resource; context; entities; egress? }  Decision { decision; decisionId; decidedAt; reasons; errors; policySetVersion; permit? }
log.ts:104-152       recordDecision(tx, ctx, decision, req, extra?): Promise<boolean>;  recordDecisionOwnTx(pool, ctx, decision, req, extra?): Promise<boolean>  (own transaction)
principal.ts:5-96    PrincipalEntity { tenantId; userId; kind; roles; teams }  userEntity(p)  tenantEntity(tenantId);  policy-engine.ts:14 PolicyEngine { check(req): Promise<Decision> }
// src/tools, registry, credentials
tools/origin.ts:187  validateOrigin(url, { local }): { ok: true; origin } | { ok: false; reason }  // bare origin only; loopback always refused
tools/types.ts:73-90 class ToolsError(code, message, details?: Record<string, string>), code "TOOLS_INVALID" | "TOOLS_NOT_FOUND" | "TOOLS_EXISTS" | "TOOLS_REFUSED" | "TOOLS_TENANT_MISMATCH"
registry/block-input.ts:203  normalizeBlockImport(ref, block) throws RegistryError; Ajv2020 strict (draft-07 `$schema` refused, `x-` keywords accepted)
credentials/types.ts:20-27  ServiceTarget { serviceId; origin }  ServiceResolver { resolve(ctx, toolServerId) };  resolver.ts:16 createServiceResolver(pool)
// api, core
api/idempotency.ts:112  withIdempotency(ctx, principal, key, digest, fn(tx)) claims the key, then runs fn in a transaction; table `ursitoare.idempotency_key (tenant_id, principal_id, key, request_digest, state in_progress|done, response_status, response_body, created_at)`, a row older than 24 h is claimed again; `IdempotentResponse { status; body }`, `assertIdempotencyKey`, `requestDigestOf`;  route.ts:280 defineRoute(server, def);  errors.ts:11 ApiError(status, code, message, details?)
core/ids.ts:6,63  IdSource { next(prefix) }, sequentialIds(seed);  tenancy/tx.ts:6-14 TenantPool, TenantTx, withTenantTx;  main.ts:292-300,359 route registration and createInvokePath({ ... services: createServiceResolver(database.appPool) })
// test support
fake-egress/index.ts:77-81 addUpstream, addCredentialless(serviceId, mintkeyTenantId, targetUrl), issued(), requests();  invoke-runs/harness.ts:95,214 HarnessWrap, invokeHarness(wrap?)
```
