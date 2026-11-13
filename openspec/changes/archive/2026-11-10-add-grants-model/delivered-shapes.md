# Delivered shapes taken by add-grants-model

From main@62b84e23 (`file:line`; `…` elides members this unit does not touch). `augmentedSuccessors` and `hookPlacements` come from plan m5: see the end of this file.

```ts
// src/pdp/types.ts:5 PolicySource { id: string; text: string; layer: "platform" | "tenant" }
// src/pdp/cedar-schema.ts:4 type ToolArgType = "String" | "Long" | "Bool" | "decimal" | "Set<String>"; :8 url, url_host: reserved String members of ToolArgs (buildSchema :63)
// src/pdp/policy-engine.ts:18 PolicyEngineOptions { srcDir; tenantPolicies?; toolArgs?; clock; ids; logger }  :48 createPolicyEngine(opts): Promise<PolicyEngine>
// src/pdp/values.ts:21 entityRef(type, id)  :25 toDecimal(n)   src/pdp/actions.ts:89 deploy_policy (Tenant)  :99 invoke_tool (Block; context has tool, args, taint, …, node_fingerprint: String)
// src/authoring/format/nodes.ts:27 valueFields(node: unknown): { field: string; value: unknown }[]   catalogue.ts:34 Catalogue { block(ref): BlockDef | undefined; role(name): RoleDef | undefined; … }   types.ts:234 Flow { …; start: string; nodes: { [id]: FlowNode } }   canonical.ts:114 canonicalizeFlow(doc)
// src/authoring/format/nodes.ts:67 hookValueFields(hook: unknown): { field: string; value: unknown }[] (input, and with for a block hook)   types.ts:65 CodeHook { …; source: string; routes?; max_retries?; allow_effect_retry? }  :76 BlockHook { …; uses: string; with; on_error? }  :86 HookDef = CodeHook | BlockHook
// src/registry/catalogue.ts:55 loadRegistryCatalogue(pool: TenantPool, ctx: TenantContext): Promise<Catalogue>   flows/flows.ts:203 getFlow(tx, ctx, flowId): FlowRecord | null  :25 VersionSummary { hash; state: "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated"; … }  :38 VersionDetail { …; canonical: unknown }
// src/registry/flows/versions.ts:185 getVersion(tx, ctx, flowId, hash): VersionDetail | null  :212 listVersions(tx, ctx, { flowId, limit, after? }): { versions (newest first); next: number | null }
// src/audit/append.ts:19 appendAudit(tx, ctx, event: AuditEventInput, opts?)  event.ts:5 AuditEventInput (exported by src/audit/index.ts:8) { eventType; actor: { kind: "user" | "service" | "system"; id }; target?; payload? }  canonical.ts:78 canonicalize(value): string 
// src/tenancy/tx.ts:6 TenantPool = Pick<pg.Pool, "connect">  :8 TenantTx = Pick<pg.PoolClient, "query">  :14 withTenantTx(pool, ctx, fn(tx))   context.ts:7 TenantContext { tenantId; reviewProfile }   src/core/ids.ts:6 IdSource { next(prefix): string }   clock.ts:1 Clock { now(): Date }
// src/api/route.ts:280 defineRoute(server, def)  idempotency.ts:221 respondIdempotent({ pool, clock }, req, reply, fn(tx)) (`fn` runs in the transaction that completes the record, :112-118; precedent `src/api/admin-rbac.ts`)  admin-page.ts:65 pageRows(rows, page, binding, keyOf)  cursor.ts:101 deriveCursorKey(engineKey)  :7 KeyMaterial { reveal(): string }  server.ts:43 Ajv without removeAdditional, with type coercion
```

## From plan m5 (add-hook-checker, not yet merged; ruling R4)

Copied from `openspec/changes/add-hook-checker/proposal.md`, block "Interfaces given" (only the names this unit uses; `Flow`, `Catalogue` and `HookDef` are on main above):

```ts
export type HookPhase = "pre" | "post";
export interface HookPlacement { phase: HookPhase; hook: HookDef; ruleId: string | null; label: string }
export function hookPlacements(flow: Flow, nodeId: string, catalogue: Catalogue): { pre: HookPlacement[]; post: HookPlacement[] };
export function augmentedSuccessors(flow: Flow, catalogue: Catalogue): ReadonlyMap<string, readonly string[]>;
```

`src/grants/fingerprint.ts` imports both from `../authoring/index.ts`. On main they are stubs that throw `new Error("not implemented")` (`src/authoring/hooks/model.ts:50-66`) and `src/authoring/index.ts:10` re-exports only the types; add-hook-checker implements them and adds the export line. The behaviour the vectors assume (that unit's design 1 and 2):

- **Placements.** `{ pre: [], post: [] }` for an id that is not an own object node and for the kinds `agent`, `foreach`, `human.form`, `subflow`; an `end` node has no `post`. A rule of `flow.hooks` counts when it has a string `id` and its `match` is absent or matches the node (`kind`, `effect` from `effectClass`, `nodes`, `tags`: present lists are AND-ed; a non-list or empty list matches nothing). `pre` is the `pre` hook of each counting rule in declaration order, then the node's own `pre` entries; `post` is the node's own `post` entries, then the `post` hook of each counting rule in reverse order. `label` is the node hook's string `id` (else `""`) or `rule.<ruleId>`; `hook` is the flow's own object. A hook's `when` is never evaluated and layer `H` is not called, so a flow `checkHooks` would refuse still has a fingerprint.
- **Routes.** `augmentedSuccessors` has one key per own node, its value the ids from `successorFields(node)` that name an own node, then the `routes` of its `post` placements (whatever their `when`) that name an own node, first-seen, without repeats.
