## Context

This change adds to `src/pdp` (`test/arch/modules.ts` needs no change) the action catalogue, the Cedar schema, the platform layer (code, never the database), the fragment loader, `createPolicyEngine` and `allowedActions`; no table, endpoint, env var, e2e part or migration. Dependencies, restated exactly:

- `add-pdp-cedar`: `interface PolicySource { id: string; text: string; layer: PolicyLayer }`, `interface Entity { uid: EntityUid; attrs: Record<string, unknown>; parents: EntityUid[] }`, `interface PolicyRequest { principal: EntityUid; action: string; resource: EntityUid; context: Record<string, unknown>; entities: Entity[]; egress?: Egress }`, `interface Pdp { readonly policySetVersion: string; readonly actions: readonly string[]; readonly policies: readonly { id: string; layer: PolicyLayer }[]; check(req: PolicyRequest): Promise<Decision> }`, `createPdp(opts: { schema: string; policies: PolicySource[]; clock: Clock; ids: IdSource; logger: Logger }): Promise<Pdp>`, `class PdpError extends Error { readonly code: PdpErrorCode; readonly details: Readonly<Record<string, string | readonly string[]>> }`, `entityRef(type: string, id: string): { __entity: { type: string; id: string } }`, `toDecimal(n: number): { __extn: { fn: "decimal"; arg: string } }`. `createPdp` refuses a duplicate `@id` (`PDP_DUPLICATE_ID`, `details.ids`) and any validation warning (`PDP_POLICY_INVALID`, `details.stage`, `details.ids`); `check` returns `Decision { decision: "allow" | "deny"; reasons: string[]; errors: string[]; ... }`, denies a schema-invalid request and any policy error, and rejects only when `IdSource` or `Clock` throws.
- `add-engine-skeleton`: `interface Clock { now(): Date }`, `fixedClock(iso: string): Clock`, `interface IdSource { next(prefix: string): string }`, `sequentialIds(seed?: number): IdSource`, `type Logger = import("pino").Logger`, `interface LogDestination { write(line: string): void }`, `createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger`.
- `add-tenancy-foundation`: `TENANT_ID_PATTERN` is `/^[A-Za-z0-9_-]{1,64}$/`. `add-db-foundation`: no code used (kept in Depends on with `add-pdp-cedar`'s chain).

## Decisions

1. **The catalogue.** `ACTIONS` has 25 entries (architecture §9.2 and the card), each with `cedar` (its schema fragment), `resources` (Cedar resource types, in fragment order), `capability` and `context` (the value is `{}`, written `{} as ActionContext<A>`; the TS type types a PEP's context). The fragment is `action <name> appliesTo { principal: User, resource: <R>, context: <C> };`, `<R>` one type or `[A, B]`. 

| Resources | Context | Actions |
|---|---|---|
| `[Tenant]` | `{}` | approve_tool_surface, author_flow, deploy_policy, edit_profile, manage_credentials, manage_tenant, manage_triggers, manage_users_roles, read_audit, read_context, read_registry, read_self, register_context_source, register_tool_server |
| `[Tenant, Flow]` | `{}` | dry_run_flow, edit_flow, read_flow, test_flow |
| `[Tenant, Run]` | `{}` | debug_run, read_run |
| `[Tenant, Flow]` | `{ trigger_type?: String }` | start_run |
| `[Flow]` | `{ flow_capabilities: FlowCapabilities, review_profile: String }` | activate_flow |
| `[Task]` | `{ run_initiator: User, taint: Set<String> }` | approve_task |
| `[Tenant, Block]` | `{ args: LlmArgs, taint: Set<String>, provider: String, region: String, run_initiator?: User }` | invoke_llm |
| `[Block]` | `{ tool: Tool, args: ToolArgs, taint: Set<String>, run_initiator: User, sod_excluded: Set<User>, approvals: Set<Approval>, approvers_by_role: ApproversByRole, node_fingerprint: String }` | invoke_tool |

2. **Capability** is true when the resources include `Tenant` and the context has no required attribute: 21 actions. `activate_flow`, `approve_task`, `invoke_llm` and `invoke_tool` are false (the interpreter builds their context per call) and never appear in `/me`. API actions have an empty or all-optional context because the API PEP passes none.
3. **Schema** (`buildSchema`, `src/pdp/cedar-schema.ts`): the text below with `<ToolArgs>` and the 25 fragments (sorted by name, one per line) substituted, ending in a newline. `tenant` is on every entity type (ADR-13); `Role` and `Team` are never resources. A fragment reading an attribute of one resource type guards it (`resource is Flow`), else strict validation fails on `Tenant`.

```
entity Role { tenant: String };
entity Team { tenant: String };
entity Tenant { tenant: String };
entity User in [Role, Team] { tenant: String, kind: String, roles: Set<Role>, teams: Set<Team> };
entity Flow { tenant: String, owner_team: Team, reviewed: Bool };
entity Run { tenant: String, owner_team: Team, initiator: User };
entity Task { tenant: String, run: Run };
entity Tool { tenant: String, effect: String };
entity Block { tenant: String, kind: String, flow: Flow };
type Approval = { approver: User, role: Role };
type ApproversByRole = { tenant_admin?: Set<User>, author?: Set<User>, approver?: Set<User>, auditor?: Set<User> };
type ToolArgs = <ToolArgs>;
type LlmArgs = { model_profile?: String, tools?: Set<String> };
type FlowCapabilities = { reads_untrusted: Bool, reads_private: Bool, has_send_or_pay: Bool };

action <name> appliesTo { ... };   (25 lines)
```

`<ToolArgs>` is `{ "url"?: String, "url_host"?: String }` plus the options' `toolArgs`, every attribute quoted and sorted by name, for example `{ "amount"?: decimal, "url"?: String, "url_host"?: String }`. A `toolArgs` name matches `^[a-z][a-z0-9_]{0,63}$` and is not `url` or `url_host` (the PEP derives it); the type is `String`, `Long`, `Bool`, `decimal` or `Set<String>`; at most 256 names; else `PdpError` `PDP_OPTIONS_INVALID`, `details.reason` `tool_args`.
4. **Platform layer** (`src/pdp/platform.ts`): `PLATFORM_SOURCE` is `{ id: "pdp/platform", layer: "platform", text }` with exactly these four policies (probed on cedar-wasm 4.14.0: strict, no warning; ported from the seed's `org-forbid-untrusted-egress`, extended to `write` (§9.3), and `org-forbid-agent-consequential`). `PLATFORM_POLICY_IDS` is their ids sorted.

```
@id("platform-cross-tenant-forbid")
forbid (principal, action, resource)
when { principal.tenant != resource.tenant };

@id("platform-forbid-untrusted-egress")
forbid (principal, action == Action::"invoke_tool", resource)
when { context.taint.contains("untrusted") && ["write", "send", "pay"].contains(context.tool.effect) };

@id("platform-forbid-agent-consequential")
forbid (principal, action == Action::"invoke_tool", resource)
when { resource.kind == "agent" && ["send", "pay"].contains(context.tool.effect) };

@id("platform-read-self")
permit (principal, action == Action::"read_self", resource);
```

5. **Principals.** `scopedId(t, l)` is `` `${t}/${l}` `` (ADR-13; a tenant id has no `/`). `userEntity(p)`: uid `User::scopedId(tenantId, userId)`, attrs `{ tenant, kind, roles: [entityRef("Role", r)], teams: [entityRef("Team", scopedId(tenantId, t))] }`, parents the same roles then teams, de-duplicated and sorted; `Role` ids are plain (`tenant_admin`). `tenantEntity(t)`: uid `Tenant::t`, attrs `{ tenant: t }`. Role and Team entities stay out of the slice (ADR-03). `isPrincipalEntity` holds when `tenantId` matches `TENANT_ID_PATTERN`, `userId` is 1 to 128 characters without NUL, `kind` is `human` or `service`, and `roles` and `teams` are arrays of at most 64 strings of 1 to 128 characters without NUL; it never throws (a throwing getter is `false`).
6. **Fragments** (`src/pdp/fragments.ts`). `loadPolicyFragments(srcDir)` reads `<srcDir>/<module>/policy/*.cedar` into `{ id: "<module>/policy/<file>.cedar", text: <UTF-8>, layer: "platform" }`, sorted by id (UTF-16 code units); other files and directories are ignored. `PdpError` `PDP_OPTIONS_INVALID` for: `srcDir` not a string or not a readable directory (`details.reason` `src_dir`); a `*.cedar` entry in a `policy` directory that is not a regular file or whose id fails `^[A-Za-z0-9][A-Za-z0-9_./-]{0,127}$` (`fragment_name`, `details.ids`), because a forbid must never be skipped silently. A repeated fragment `@id` is `createPdp`'s `PDP_DUPLICATE_ID`. `defaultSrcDir()` is `path.resolve(import.meta.dirname, "..")` (the engine runs from source).
7. **Composition** (`createPolicyEngine`, `src/pdp/policy-engine.ts`), in order: `srcDir` a string (`src_dir`); `tenantPolicies`, when present, an array of objects (`policies`) with `layer` `tenant` (`layer`: no smuggled platform source); `buildSchema({ toolArgs })`; `loadPolicyFragments(srcDir)`; `createPdp({ schema, policies: [PLATFORM_SOURCE, ...fragments, ...tenantPolicies], clock, ids, logger })`, whose `PdpError` passes through. The result is a frozen `PolicyEngine` (the members of `Pdp` plus `allowedActions`). The tenant layer is empty by default. Build it once at boot.
8. **Capability probe** (`src/pdp/capabilities.ts`). `probeRequest(p, a)` is `null` unless `isPrincipalEntity(p)`, `Object.hasOwn(ACTIONS, a)` and `ACTIONS[a].capability`; else principal `userEntity(p).uid`, action `a`, resource `Tenant::p.tenantId`, context `{}`, `entities` `[userEntity(p), tenantEntity(p.tenantId)]`. `allowedActions(p, actions)` returns the actions, de-duplicated in first-appearance order, whose probe is `allow` with `errors` `[]`; it never rejects and records no decision. An invalid principal or non-array `actions` gives `[]` and logs `logger.warn({}, "pdp capability principal invalid")`; an action whose `check` throws is omitted and logs `logger.warn({ action }, "pdp capability probe failed")`.
9. **Test support** (`test/support/policy-samples.ts`, written in green of task 3.1). `sampleRequest(action, opts)` is a schema-valid request: principal `User::"tenant_a/alice"` of tenant `principalTenant` (default `tenant_a`; `human`, no roles or teams); resource of the first type of `ACTIONS[action].resources`, id `Tenant::<resourceTenant>` or `<resourceTenant>/<lower-case type>-1`, `tenant` `resourceTenant` (default `principalTenant`); `invoke_tool` adds `Tool::"<resourceTenant>/tool-1"` (effect `read`); a fixed context (empty taint, `run_initiator` the principal, `provider` `p1`, `region` `eu`). `invokeToolRequest` is the `invoke_tool` request of `tenant_a` with the given effect, taint and `Block.kind`.

## Interfaces

Same text as proposal.md § Interfaces given; the symbols of Context are taken.

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

Context types (`src/pdp/contexts.ts`, also given): `ActivateFlowContext`, `ApproveTaskContext`, `InvokeLlmContext`, `InvokeToolContext`, `StartRunContext` mirror the Cedar contexts of decision 1: attribute names unchanged, `?` stays, `String` is `string`, `Bool` `boolean`, `Set<T>` `T[]`, `User`, `Tool` and `Role` `EntityRef` (`ReturnType<typeof entityRef>`), `Approval` `{ approver: EntityRef; role: EntityRef }`, `ApproversByRole` `{ tenant_admin?: EntityRef[]; author?: EntityRef[]; approver?: EntityRef[]; auditor?: EntityRef[] }`, `LlmArgs` `{ model_profile?: string; tools?: string[] }`, `FlowCapabilities` `{ reads_untrusted: boolean; reads_private: boolean; has_send_or_pay: boolean }`, `ToolArgs` `Readonly<Record<string, string | number | boolean | readonly string[] | CedarDecimal>>` (`CedarDecimal` is `ReturnType<typeof toDecimal>`).

`ACTION_NAMES` is the 25 names sorted; `PLATFORM_POLICY_IDS` is `["platform-cross-tenant-forbid", "platform-forbid-agent-consequential", "platform-forbid-untrusted-egress", "platform-read-self"]`. New `PdpError.details.reason` values on `PDP_OPTIONS_INVALID`: `src_dir`, `fragment_name`, `tool_args`.

## Failure cases

- Bad options, `srcDir`, fragment file or `toolArgs`: `createPolicyEngine` rejects with a `PdpError`, nothing half-loaded; an invalid fragment or duplicate `@id` is `createPdp`'s error (ids, never policy text). No fragments or tenant policies is valid.
- A throwing `IdSource` or `Clock` makes `check` reject, so `allowedActions` omits the action and logs; a policy that errors denies, so the action is omitted. `allowedActions` never rejects; probes run concurrently and agree (immutable engine).

## Security

1. No endpoint, so no authentication or PEP action here (`add-api-pep` calls `allowedActions` for `GET /api/v1/me`).
2. No table. Isolation is the platform forbid: every resource type carries `tenant`, and a `forbid` beats any tenant `permit`. The two-tenant proof is the table of "The platform forbids cross-tenant requests" (exit test 18, Cedar half). A probe uses the principal's own tenant.
3. `PrincipalEntity` is validated before it becomes entities; role and team names are Cedar JSON values, never policy text. `untrusted` is a taint label from `add-taint-static`.
4. No secret: the module reads `.cedar` files and writes nothing; errors and logs hold codes, ids and counts, never policy text or principal data.
5. Abuses (each a scenario): a tenant permit-all across tenants; a source claiming the platform layer; a reused platform id; a misnamed fragment that would drop a forbid; untrusted data into `write`, `send`, `pay`; an agent node picking `send` or `pay`; a hostile principal; the action names `constructor` and `__proto__`; a policy that errors.

## Test plan

No database, network or sleep. Engine tests use `fixedClock("2026-10-25T09:00:00Z")`, `sequentialIds()`, a silent `createLogger` (a capturing `LogDestination` where a line is asserted) and a `srcDir` from `mkdtemp(join(tmpdir(), "pdp-src-"))`, removed in `after`. Most add the tenant source `{ id: "t-src", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' }`. The cross-tenant table first checks that the same-tenant request is `allow`, so a deny cannot come from an invalid sample.

## Decisions made while writing

1. **`PolicyEngine extends Pdp`** carries `allowedActions`: `Pdp` belongs to `add-pdp-cedar`, whose `createPdp` would otherwise have to implement it. The roadmap's `Pdp.allowedActions` means this; consumers type their dependency as `PolicyEngine`.
2. **Resource types** `[Tenant, X]` let one action cover a list and an item; capabilities are probed with an empty context.
3. **Contexts** carry what §9.2 and the seed name for five actions; the admin group's key context (`authority_change`, adapter kind, digest) is not in the schema: its builder adds an optional attribute in `src/pdp/actions.ts`.
4. **Entity ids** are namespaced `<tenant>/<id>` (ADR-13) except `Role` (platform-wide names that fragments cite) and `Tenant`; `Role` and `Team` carry `tenant`; `owner_team` is a `Team` (the seed used `String`); `ApproversByRole` has the four default roles of add-roles-and-memberships, another role name is a request error (deny).
5. **`toolArgs`** opens the closed `ToolArgs` record instead of porting the seed's 20 test blocks; registry units pass the argument names of registered tools.
6. **The untrusted-egress forbid** matches `write`, `send`, `pay` literally (the card); registration must restrict `Tool.effect` to `read`, `write`, `send`, `pay`.
7. **`srcDir` is required** (no cwd dependence); `invoke_llm` also applies to `Tenant` (calls without a block); `platform.ts` grows over tasks 3.1 to 3.3 so each task's tests fail at red.
