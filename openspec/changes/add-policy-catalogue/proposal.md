## Why

Every client action and every run-time call is decided by one Cedar check, but `add-pdp-cedar` ships only the engine: it knows no action, no entity type, no rule that keeps one tenant out of another's data, and no way for a module to add policy. Each later unit would invent its own action names, schema and forbids.

Observable result: `createPolicyEngine({ srcDir, clock, ids, logger })` loads a Cedar schema built from `ACTIONS` (25 named Phase-1 actions with typed contexts), the platform layer from code and the `src/*/policy/*.cedar` fragments of every module, and returns a `PolicyEngine`. For every action, a request whose resource belongs to another tenant is denied by `platform-cross-tenant-forbid` even when a tenant policy permits everything (exit test 18, Cedar half). `invoke_tool` with `untrusted` taint and a `write`, `send` or `pay` tool is denied, and an `agent` block cannot use a `send` or `pay` tool. `engine.allowedActions(principal, ACTION_NAMES)` returns `["read_self"]` for a principal with no roles, which is what `GET /api/v1/me` reports as capabilities.

## What Changes

- `src/pdp`: `ACTIONS`, `ACTION_NAMES` and the context types (`contexts.ts`, `actions.ts`); `buildSchema` (`cedar-schema.ts`); `PrincipalEntity`, `userEntity`, `tenantEntity`, `scopedId` (`principal.ts`); `loadPolicyFragments`, `defaultSrcDir` (`fragments.ts`); `PLATFORM_SOURCE` and its four policies (`platform.ts`); `createPolicyEngine` and `PolicyEngine` (`policy-engine.ts`); `probeRequest` and the probe loop (`capabilities.ts`).
- `test/support/policy-samples.ts`: `sampleRequest` and `invokeToolRequest`, schema-valid requests for the generated tests (ordinary code, written in task 3.1).
- The platform layer ports the seed's `policy-cedar/policies/00-org.cedar` rules for untrusted egress (extended to `write`) and agent-consequential tools, and the schema extends `policy-cedar/schema` with tenant-scoped entities.

## Impact

- Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. The scaffold needs no new dependency (`@cedar-policy/cedar-wasm` comes with `add-pdp-cedar`).
- **Depends on:** `add-pdp-cedar` (U11): `createPdp`, `Pdp`, `PolicySource`, `PolicyRequest`, `Entity`, `PdpError`, `entityRef`, `toDecimal`; this change calls them and does not edit their files. `add-engine-skeleton` (U01): `Clock`, `IdSource`, `fixedClock`, `sequentialIds`, `Logger`, `createLogger`. `add-tenancy-foundation` (U03): `TENANT_ID_PATTERN`. `add-db-foundation` (U02): no code is used; it is listed because `add-pdp-cedar` depends on it and the card names it.
- **Files implemented** (stubs from the scaffold, holding the symbols below): `src/pdp/contexts.ts` (the context types), `actions.ts` (`ACTIONS`, `ACTION_NAMES`, `ActionName`, `ResourceType`, `ActionSpec`, `ActionContext`), `cedar-schema.ts` (`buildSchema`, `ToolArgType`), `principal.ts` (`PrincipalEntity`, `isPrincipalEntity`, `scopedId`, `userEntity`, `tenantEntity`), `fragments.ts` (`loadPolicyFragments`, `defaultSrcDir`), `platform.ts` (`PLATFORM_SOURCE`, `PLATFORM_POLICY_IDS`), `capabilities.ts` (`probeRequest`), `policy-engine.ts` (`PolicyEngine`, `PolicyEngineOptions`, `createPolicyEngine`) and `test/support/policy-samples.ts` (`sampleRequest`, `invokeToolRequest`). The scaffold stubs `ACTIONS` with all 25 keys (`cedar: ""`, `resources: []`, `capability: false`, `context: {}` cast to its type), so the mapped type compiles. **Files created:** the tests `src/pdp/{actions,cedar-schema,principal,fragments,cross-tenant,policy-engine,egress,agent,platform,capabilities}.test.ts`, which import from these sibling files. **Files changed:** none (`src/pdp/index.ts`, owned by `add-pdp-cedar`, already re-exports every symbol; no existing test changes). `test/arch/modules.ts` needs no change (`pdp` may import `core`, `tenancy` and `observability`).
- **Migrations:** none (the roadmap's `0115_<topic>.sql` is unused). No table, endpoint, env var, e2e part or web feature. Exit test 18 (the Cedar half) is proved here.

**Interfaces given** (same text as design.md § Interfaces)

```ts
// exported from src/pdp/index.ts
type ActionName = "activate_flow" | "approve_task" | "approve_tool_surface" | "author_flow" | "debug_run" | "deploy_policy" | "dry_run_flow" | "edit_flow" | "edit_profile" | "invoke_llm" | "invoke_tool" | "manage_credentials" | "manage_tenant" | "manage_triggers" | "manage_users_roles" | "read_audit" | "read_context" | "read_flow" | "read_registry" | "read_run" | "read_self" | "register_context_source" | "register_tool_server" | "start_run" | "test_flow"
type ResourceType = "Tenant" | "Flow" | "Run" | "Task" | "Block"
interface ContextsWithFields { activate_flow: ActivateFlowContext; approve_task: ApproveTaskContext; invoke_llm: InvokeLlmContext; invoke_tool: InvokeToolContext; start_run: StartRunContext }
type ActionContext<A extends ActionName> = A extends keyof ContextsWithFields ? ContextsWithFields[A] : Record<string, never>
interface ActionSpec<C> { readonly cedar: string; readonly resources: readonly ResourceType[]; readonly capability: boolean; readonly context: C }
const ACTIONS: { readonly [A in ActionName]: ActionSpec<ActionContext<A>> }; const ACTION_NAMES: readonly ActionName[]
type ToolArgType = "String" | "Long" | "Bool" | "decimal" | "Set<String>"
function buildSchema(opts?: { toolArgs?: Readonly<Record<string, ToolArgType>> }): string
interface PrincipalEntity { readonly tenantId: string; readonly userId: string; readonly kind: "human" | "service"; readonly roles: readonly string[]; readonly teams: readonly string[] }
function isPrincipalEntity(value: unknown): value is PrincipalEntity
function scopedId(tenantId: string, localId: string): string
function userEntity(p: PrincipalEntity): Entity
function tenantEntity(tenantId: string): Entity
function loadPolicyFragments(srcDir: string): Promise<PolicySource[]>
function defaultSrcDir(): string
const PLATFORM_SOURCE: PolicySource; const PLATFORM_POLICY_IDS: readonly string[]
interface PolicyEngine extends Pdp { allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]): Promise<ActionName[]> }
interface PolicyEngineOptions { srcDir: string; tenantPolicies?: readonly PolicySource[]; toolArgs?: Readonly<Record<string, ToolArgType>>; clock: Clock; ids: IdSource; logger: Logger }
function createPolicyEngine(opts: PolicyEngineOptions): Promise<PolicyEngine>
function probeRequest(principal: PrincipalEntity, action: ActionName): PolicyRequest | null
// test/support/policy-samples.ts (not in index.ts)
function sampleRequest(action: ActionName, opts?: { principalTenant?: string; resourceTenant?: string }): PolicyRequest
function invokeToolRequest(opts: { effect: string; taint: readonly string[]; blockKind: string }): PolicyRequest
```

Also given (shapes in design.md): `ActivateFlowContext`, `ApproveTaskContext`, `InvokeLlmContext`, `InvokeToolContext`, `StartRunContext`, `ToolArgs`, `EntityRef`, `CedarDecimal`; `PdpError` reasons `src_dir`, `fragment_name`, `tool_args`.

**Interfaces taken**

- From `add-pdp-cedar`: `createPdp`, `Pdp`, `PolicySource`, `PolicyRequest`, `Entity`, `PdpError`, `entityRef`, `toDecimal` (`src/pdp`).
- From `add-engine-skeleton`: `Clock`, `IdSource` (`src/core`); `Logger`, `createLogger` (`src/observability`); `fixedClock`, `sequentialIds` in tests.
- From `add-tenancy-foundation`: `TENANT_ID_PATTERN` (`src/tenancy`).

Shapes of the delivered names (declarations from the merged code, main@fb48c96):

```ts
// add-engine-skeleton (src/core)
interface Clock { now(): Date }
interface IdSource { next(prefix: string): string }
function fixedClock(iso: string): Clock
function sequentialIds(seed?: number): IdSource
// add-engine-skeleton (src/observability)
type Logger = PinoLogger
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger
// add-tenancy-foundation (src/tenancy)
const TENANT_ID_PATTERN: RegExp
```

## Out of scope

The request builder, the directory and derived context (`url_host`, `approvers_by_role`, `node_fingerprint`, `sod_excluded`) (`add-api-pep` and the run-time units); the `/me` route and `defineRoute` (`add-api-pep`); roles, teams and the permits that use them (`add-roles-and-memberships` adds fragments); grants, the tenant layer and policy deploy (`add-grants-model`); the trifecta activation forbid (`add-trifecta-gate`); the admin group's key context attributes (their builders add them); Phase-2 actions (`import_skill`, `load_skill`, the Director's); recording probes as decisions; any table, endpoint or migration.
