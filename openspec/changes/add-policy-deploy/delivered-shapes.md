# Delivered shapes taken by add-policy-deploy

From main@cf34c628 (`file:line`) and the folder `add-grants-model` (U49, in plan).

```ts
// src/pdp/types.ts:5 PolicySource { id: string; text: string; layer: "platform" | "tenant" }  :33 PolicyRequest  :42 Decision { decision: "allow" | "deny"; decisionId; decidedAt; reasons: string[]; errors: string[]; policySetVersion; permit? }  :52 Pdp { policySetVersion; actions; policies: { id; layer }[]; check(req): Promise<Decision> }
// src/pdp/policy-engine.ts:14 PolicyEngine extends Pdp { allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]): Promise<ActionName[]> }  :18 PolicyEngineOptions { srcDir; tenantPolicies?: readonly PolicySource[]; toolArgs?: Readonly<Record<string, ToolArgType>>; clock; ids; logger }  :48 createPolicyEngine(opts): Promise<PolicyEngine>
// src/pdp/engine.ts:8 createPdp(opts: { schema; policies: PolicySource[]; clock; ids; logger }): Promise<Pdp> (preparsed names `pdp-pset-<counter>`, `pdp-schema-<counter>`, :19-22)
// src/pdp/errors.ts:9 PdpError { code: "PDP_POLICY_INVALID" | "PDP_DUPLICATE_ID" | …; details: { stage: "parse" | "template" | "id" | "validate" | "policy", ids } }
// src/pdp/cedar-schema.ts:4 ToolArgType = "String" | "Long" | "Bool" | "decimal" | "Set<String>"; :63 buildSchema (a name outside ^[a-z][a-z0-9_]{0,63}$, url, url_host, or more than 256 names throws PDP_OPTIONS_INVALID)
// src/pdp/contexts.ts:9 ToolArgs = Readonly<Record<string, string | number | boolean | readonly string[] | CedarDecimal>>  values.ts:25 toDecimal(n) (RangeError beyond 4 decimals)  :32 hostOf(url) (throws on a bad URL)  :21 entityRef(type, id)  fragments.ts:72 defaultSrcDir()  principal.ts:5 PrincipalEntity  :70 userEntity(p)
// src/authoring/format/catalogue.ts:5 BlockDef { effect; input: JsonSchema; output; … }   types.ts:3 JsonValue
// src/registry/block-store.ts:13 BlockVersion { ref; def: BlockDef; … }  :209 listBlockVersions(tx, ctx, { limit: 1..201; after? }): Promise<BlockVersion[]> (by ref)  :82 importCatalogue(pool, ctx, blocks, actor, opts?)
// src/audit/event.ts:5 AuditEventInput { eventType; actor: { kind: "user" | "service" | "system"; id }; target?; payload? } (payload at most 32,768 bytes)  append.ts:19 appendAudit(tx, ctx, event, opts?: { clock? })  hash.ts:30 formatAt(at): "…SS.000000Z"
// src/tenancy/tx.ts:6 TenantPool = Pick<pg.Pool, "connect">  :14 withTenantTx(pool, ctx, fn(tx))  context.ts:7 TenantContext { tenantId; reviewProfile: "solo" | "team" }  :12 TENANT_ID_PATTERN  core/clock.ts:1 Clock { now(): Date }  ids.ts:6 IdSource { next(prefix) }
// src/api/route.ts:280 defineRoute(server, def)  idempotency.ts:221 respondIdempotent({ pool, clock }, req, reply, fn(tx))  errors.ts:11 ApiError(status, code, message, details?)  pep.ts:12 PepDeps { pool; engine: PolicyEngine | null; clock; publicBaseUrl }
// add-grants-model: compileGrants(tenantId, grants: readonly GrantRecord[], argTypes): PolicySource[] (active grants in id order; id "grants/<grantId>", layer "tenant", policy @id the grant id; throws GrantsError GRANTS_INVALID)  compileGrant(tenantId, grant, argTypes): PolicySource | null  listGrants(pool, ctx, { limit: 1..201; after: string | null }): Promise<{ grant: GrantRecord; status }[]> (grant id order, revoked included)  GrantRecord { id; …; state: "active" | "revoked" }  fragment grants-deploy-admin permits deploy_policy to tenant_admin
```

Table `ursitoare."grant"` (add-grants-model `0490_grants.sql`), the columns the tests seed: `tenant_id, grant_id, subject_kind ('role'|'user'), subject_id, tool, scope_kind ('any_step'|'node'), flow_id, node_id, args jsonb, fingerprints text[] (a node grant needs one), state ('active'|'revoked'), created_by, created_at, revoked_by, revoked_at` (a revoked row needs the last two).
