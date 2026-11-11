## Decisions

1. **Layout and the module graph.** `runtimes` may not import `tenancy`, `db` or `identity` (`test/arch/modules.ts:50-67`), so `TenantContext` and `TenantPool` come from `runs` (types) and `withTenantTx` is out of reach. The card's "each decision in its own transaction" needs a pool-taking twin in `pdp`: `recordDecisionOwnTx` = `withTenantTx(pool, ctx, (tx) => recordDecision(tx, ctx, decision, req, extra))`. No module edge changes [D24].
2. **The egress site, the key and the body.** Only `request.ts` imports the gateway by value (`bodyDigest`), so the frozen inventory gains exactly it (U46 ruling 1). The idempotency key is a header outside the permit: `authorize` builds the request with a null key and `invoke` rebuilds it with `ctx.idemKey` and the same egress. The body is the key-sorted JSON of the arguments: a flow's `with` comes back from `jsonb` (`canonical.ts:2-6`), not in YAML order, and the digest must depend on the arguments alone.
3. **The PEP request** is the shape the planner's probe ran (`test-plan.md` § I1, I2). A cut approver is not in the entities, so a policy that dereferences it errors, which denies; the initiator is skipped (the guard refuses a duplicate entity). `sod_excluded` is `[initiator]`: every M6 run is attended (ADR-12).
4. **liveInvoker and authorize.** `RunRecord` has no tenant, so `liveInvoker(run)` resolves at once and the first `authorize` loads, once per invoker, the version and the catalogue (as `testRunInvokers` does, `mocks.ts:311`, except that a rejected load is not kept). The initiator and the approvers of `approved` approvals load on every `authorize`, so `pdpApprovals` never sees an unknown approver. The fingerprint is `nodeFingerprint(flow, call.nodeId, catalogue)`. An allow returns `{ decisionId, permit }` and remembers `{ binding, target, args }` in a `WeakMap` keyed by that object.
5. **invoke.** An authorization not in the `WeakMap` (forged, copied, from another invoker) or already used is `unauthorized`: the entry is deleted when `invoke` starts, since each `invoke` requests a new token and the gateway's one-use token would not stop a second send. Every `requestToken` rejection is stage `token`, every `send` rejection stage `send`, whatever its `GatewayError` code. A hook call's `tag.nodeId` is U42's `hookStepName` (`<node>:<phase>:<label>`), which fits the gateway's tag pattern `^[A-Za-z0-9._:-]{1,256}$` (hook ids `^[a-z][a-z0-9_]{0,63}$` (U41), a rule label adds `rule.`).
6. **Interpreter wiring.** A pre-hook `skip` makes no check; `INTERPRETER_TOOL_DENIED` is never `HOOK_ERROR`. `pipeline.ts` gives each hook `argsTaint` from its `HookTaintScope`; `visitNode` puts `request.approvals` on `ctx.approvals` only for an invoker with `authorize` (hook contexts spread it: inferred from add-hook-runtime, whose `step` is the node's context); `execute.ts` passes `approvalsOnPath(path)`, always `[]` in M6 (no `human.approval` runs before M11).

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet declares the optional members (`authorize?`, `authorization?`, `taint?`, `approvals?`, `inputTaint?`, `decided?`, `argsTaint?`) that the scaffold lacks. Merged and M5 shapes: `delivered-shapes.md`. `Approval` in `pdpApprovals` is U42b's (`nodeId`, `decision`, `approver`), not the PDP's. `FlowKey` names a saved version: `H1` `read-then-pay`, `H2` its `reference: inv-2` twin, `HP` `hooked-pay`, `HU` `untrusted-into-write`, `HV` `pre-taint-pay`.

```ts
// src/interpreter/types.ts
export interface CallAuthorization { readonly decisionId: string; readonly permit: Permit }
// src/pdp/log.ts (exported from src/pdp/index.ts)
export function recordDecisionOwnTx(pool: TenantPool, ctx: TenantContext, decision: Decision, req: PolicyRequest, extra?: { runId?: string; nodeId?: string }): Promise<boolean>;
// src/runtimes/invoke/types.ts (exported from src/runtimes/index.ts)
export type PrincipalLoader = (ctx: TenantContext, userId: string) => Promise<PrincipalEntity | null>;
export interface InvokePathDeps {
  pool: TenantPool;
  policy: PolicyRuntime;
  gateway: Gateway;
  tools: ToolDirectory;
  services: ServiceResolver;
  principals: PrincipalLoader;
  loadVersion: VersionLoader;
  catalogueFor: (ctx: TenantContext) => Promise<Catalogue>;
  clock: Clock;
  logger: Logger;
}
export interface InvokePath { liveInvoker(run: RunRecord): Promise<ToolInvoker> }
export interface ToolRequest { request: OutboundRequest; egress: Egress }
export const INVOKE_LIMITS: Readonly<{ tokenTtlSeconds: number; maxEntities: number }>; // { tokenTtlSeconds: 60, maxEntities: 24 } [D18]
// src/runtimes/invoke/request.ts (exported from src/runtimes/index.ts)
export function toolRequest(binding: ToolBinding, target: ServiceTarget, args: JsonValue, idemKey: string | null): ToolRequest;
export function blockResourceId(ctx: Pick<StepContext, "tenant" | "flowId" | "nodeId" | "hook">): string;
export function pdpApprovals(approvals: readonly Approval[], rolesOf: ReadonlyMap<string, readonly string[]>, tenantId: string):
  { approvals: { approver: EntityRef; role: EntityRef }[]; approvers_by_role: ApproversByRole };
export function invokeToolRequest(input: {
  ctx: StepContext; principal: PrincipalEntity; binding: ToolBinding; flow: { ownerTeam: string };
  args: ToolArgs; fingerprint: string; approvals: ReturnType<typeof pdpApprovals>; egress: Egress;
}): PolicyRequest;
// src/runtimes/invoke/path.ts (exported from src/runtimes/index.ts)
export function createInvokePath(deps: InvokePathDeps): InvokePath;
// test/support/invoke-runs/index.ts
export function invokeRunNames(): string[]; export function loadInvokeRun(name: string): Flow; export function invokeRunVersion(name: string): LoadedVersion;
// test/support/invoke-runs/harness.ts (members: test-plan-runs.md § Harness)
export function acmeCatalogue(): Catalogue;
export type FlowKey = "H1" | "H2" | "HP" | "HU" | "HV";
export type HarnessWrap = { [K in "policy" | "tools" | "services" | "principals" | "loadVersion" | "catalogueFor"]?: (real: InvokePathDeps[K]) => InvokePathDeps[K] } & { gateway?: (real: Gateway, egress: FakeEgress) => Gateway };
export interface InvokeHarness { ctx: TenantContext; pool: TenantPool; tools: FakeTools; egress: FakeEgress; gateway: Gateway & { calls: unknown[] }; runtime: PolicyRuntime; path: InvokePath; hashes: Readonly<Record<FlowKey, string>>; start(key: FlowKey, input: JsonValue, runId: string): Promise<RunRecord>; run(key: FlowKey, input: JsonValue, runId: string): Promise<RunRecord>; deploy(source: string): Promise<PolicySetRecord>; grant(spec: Record<string, unknown>): Promise<GrantRecord>; decisions(runId: string): Promise<PolicyDecisionRecord[]>; intents(runId: string): Promise<number>; logs(): Record<string, unknown>[]; close(): Promise<void> }
export function invokeHarness(wrap?: HarnessWrap): Promise<InvokeHarness>;
```

## Failure cases and security

- Every error `details` is a short ASCII word or id (lesson t: storable as `jsonb`).
- Fail closed: absent taint is `["untrusted"]`; every refusal of the spec is a denial, including an unrecordable decision (a node id over 128 characters, `policy_decision.node_id`); a dependency failure before the check is `INTERPRETER_TOOL_FAILED`. Request equals permit: the egress is built once from the authorised inputs and the gateway re-checks it. No endpoint, table or part is added (exit 1: the proxy is the only egress).
- **Policy failures.** `src/pdp/check.ts` answers a `deny` with `errors` and does not throw (ran: `PDP_ENTITY_MISSING`); so does U49b's runtime for a failed tenant load (`add-policy-deploy` design 3). That load also rejects `toolArgs`, which runs first, so it is normally R11 (inferred). Details hold no error string: a tenant's diagnostic can echo its literals.
- A step that crashes between `authorize` and DBOS storing its value authorizes again on recovery (a second decision).

## Verification

**Ran** (2026-11-06, Node 24.22.2, scratch copy of main@cf34c628): the flows through `validateFlowText` over the `acme.*` catalogue (`untrusted-into-write`: `L3_TAINT_TO_CONSEQUENTIAL`); the Cedar texts, the I1 and I2 requests and a malformed request through `createPolicyEngine`; the digests and `idemKey`; on 2026-11-07 `D_PAY` and `D_N` (sorted body, `node:crypto`). **Derived**: the loader's key order, the visit wiring, replay rows, `toCedarArgs`, `nodeFingerprint`, the fakes, rows E1-E7, R12-R15, C10. **UNVERIFIED**: `hooked-pay` and `pre-taint-pay` (`"0.1"`, D3) follow U41's folder.
