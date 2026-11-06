## Context

`main` wires the path only for dry runs (U51); `invokerFor("live")` stays refused until M11 [D7]; mock runs keep no PEP [D5].

## Decisions

1. **Layout and the module graph.** `runtimes` may not import `tenancy`, `db` or `identity` (`test/arch/modules.ts:50-67`), so `TenantContext` and `TenantPool` come from `runs` (types) and `withTenantTx` is out of reach. The card's "recordDecision, each in its own transaction" needs a pool-taking twin in `pdp`: `recordDecisionOwnTx` = `withTenantTx(pool, ctx, (tx) => recordDecision(tx, ctx, decision, req, extra))`. No module edge changes [D24].
2. **The egress site and the key.** Only `request.ts` imports the gateway by value (`bodyDigest`); `types.ts` and `path.ts` use `import type`, so the frozen inventory gains exactly `src/runtimes/invoke/request.ts` (U46 ruling 1). The idempotency key is a header outside the permit: `authorize` builds the request with a null key and `invoke` rebuilds it with `ctx.idemKey` and the same egress.
3. **The PEP request** is the shape the planner's probe ran (`test-plan.md` § I1, I2). A cut approver is not in the entities, so a policy that dereferences it errors, which denies; the initiator is skipped (the guard refuses a duplicate entity). `sod_excluded` is `[initiator]`: every M6 run is attended (ADR-12).
4. **liveInvoker and authorize.** `RunRecord` has no tenant, so `liveInvoker(run)` resolves at once and the first `authorize` loads, once per invoker, the version and the catalogue (as `testRunInvokers` does, `src/interpreter/mocks.ts:298-300`); the initiator's and approvers' `PrincipalEntity` load on every `authorize`. The fingerprint is `nodeFingerprint(flow, call.nodeId, catalogue)`. `recordDecisionOwnTx(pool, ctx.tenant, decision, request, { runId, nodeId })` returning `false` or throwing is `decision_unrecorded`. An allow returns `{ decisionId, permit }` and remembers `{ binding, target, args }` in a `WeakMap` keyed by that object.
5. **invoke.** An authorization not in the `WeakMap` (forged, copied, from another invoker) is `unauthorized`: only an authorised request reaches the gateway, rebuilt and never re-resolved. A hook call's `tag.nodeId` is U42's `hookStepName` (`<node>:<phase>:<label>`), which fits the gateway's tag pattern `^[A-Za-z0-9._:-]{1,256}$` (hook ids `^[a-z][a-z0-9_]{0,63}$` (U41), a rule label adds `rule.`).
6. **Interpreter wiring.** `block.ts` and `block-runner.ts` authorize after `prepare()` or the argument check, before `effects.before` (a `read` hook: before the invoker); a pre-hook `skip` makes no check. `INTERPRETER_TOOL_DENIED` is rethrown as it is, never `HOOK_ERROR` and never swallowed by `on_error: continue`; other `authorize` failures are `tool_failed`. `pipeline.ts` gives each hook `argsTaint` from its `HookTaintScope`; `execute.ts` passes `approvalsOnPath(path)`, always `[]` in M6 (no `human.approval` runs before M11).

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists the members that are not scaffolded. Merged and M5 shapes: `delivered-shapes.md`. `Approval` in `pdpApprovals` is U42b's (`nodeId`, `decision`, `approver`), not the PDP's.

```ts
// src/interpreter/types.ts (scaffolded)
export interface CallAuthorization { readonly decisionId: string; readonly permit: Permit }
// Not scaffolded (optional members of existing interfaces; absent = M5 behaviour, lesson v):
// ToolInvoker gains authorize?(call: ToolCall, ctx: StepContext): Promise<CallAuthorization>
// StepContext gains readonly authorization?: CallAuthorization; readonly taint?: readonly string[];
// readonly approvals?: readonly Approval[] (Approval: add-hook-trace's)
// NodeServices gains inputTaint?: () => readonly string[] (the attempt's effective input taint)
// decided?: (decisionId: string) => void (the node call's decision, for the row)
// HookServices (add-hook-runtime) gains argsTaint?: (value: unknown) => readonly string[]
// VisitRequest (src/interpreter/visit.ts) gains readonly approvals?: readonly Approval[]
// errors.ts InterpreterErrorCode + INTERPRETER_ERROR_CODES gain "INTERPRETER_TOOL_DENIED"
// src/pdp/log.ts (exported from src/pdp/index.ts)
export function recordDecisionOwnTx(pool: TenantPool, ctx: TenantContext, decision: Decision, req: PolicyRequest, extra?: { runId?: string; nodeId?: string }): Promise<boolean>;
// src/runtimes/invoke/types.ts (exported from src/runtimes/index.ts)
export type PrincipalLoader = (ctx: TenantContext, userId: string) => Promise<PrincipalEntity | null>;
export interface InvokePathDeps {
  pool: TenantPool; // recordDecisionOwnTx, each decision in its own transaction
  policy: PolicyRuntime; // U49b
  gateway: Gateway; // U46
  tools: ToolDirectory; // U47
  services: ServiceResolver; // U48
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
export interface InvokeHarness { ctx: TenantContext; pool: TenantPool; tools: FakeTools; egress: FakeEgress; gateway: Gateway & { calls: unknown[] }; runtime: PolicyRuntime; path: InvokePath; run(name: string, input: JsonValue, runId: string): Promise<RunRecord>; deploy(source: string): Promise<PolicySetRecord>; grant(spec: Record<string, unknown>): Promise<GrantRecord>; decisions(runId: string): Promise<PolicyDecisionRecord[]>; intents(runId: string): Promise<number>; close(): Promise<void> }
export function invokeHarness(): Promise<InvokeHarness>;
```

## Failure cases and security

- Every error `details` is a short ASCII word or id (lesson t: storable as `jsonb`); no tool text, header, token or Cedar error reaches a message or detail, and the broker token and credentials never enter a log.
- Fail closed: absent taint is `["untrusted"]`; an unknown tool, credential, principal or fingerprint, an unconvertible argument, an unissued authorization, an unrecordable decision (a node id over 128 characters, `policy_decision.node_id`), a `Decision` with `errors` and a rejected `check` are denials; a dependency failure before the check is `INTERPRETER_TOOL_FAILED` `{ stage: "authorize" }`. Request equals permit: the egress is built once from the authorised inputs and the gateway re-checks it. No endpoint, table or part is added (exit 1: the proxy is the only egress).
- **Policy failures.** `src/pdp/check.ts` answers a `deny` with `errors` and does not throw (ran: `PDP_ENTITY_MISSING`); U49b's runtime does the same for a failed tenant load, `errors: ["POLICY_SET_UNAVAILABLE"]` (`add-policy-deploy` design 3, requirement "A tenant's set loads lazily and a failed load denies with an error without being cached"): `policy_error`. That load also rejects `toolArgs`, which runs first, so it is normally R11 and reaches `check` only if it fails after `toolArgs` answered (a `reload` between; inferred). A rejected `check` is `policy_unavailable`. Details hold no error string: a tenant's diagnostic can echo its literals.
- A step that crashes between `authorize` and DBOS storing its value authorizes again on recovery (a second decision). A replayed failed step becomes `dbos_failed` until PR #84 merges (M5 D21); no scenario replays one.

## Verification

**Ran** (2026-11-06, Node 24.22.2, scratch copy of main@cf34c628): the flows through `validateFlowText` over the `acme.*` catalogue (`untrusted-into-write` fails with `L3_TAINT_TO_CONSEQUENTIAL`); the Cedar texts, requests and a malformed request through `createPolicyEngine`; the digests and `idemKey`. **Derived**: the visit wiring, replay rows, `toCedarArgs`, `nodeFingerprint`, the fakes, rows E1 to E6. **UNVERIFIED**: `hooked-pay` and `pre-taint-pay` (`"0.1"`, D3) follow U41's folder.

## Decisions made while writing

- **Seam additions:** `recordDecisionOwnTx` (the alternative, a transaction closure in `InvokePathDeps`, needs no `pdp` edit); the reasons `fingerprint_unavailable`, `policy_error`, `policy_unavailable`; `details.hook`; `VisitRequest.approvals?`; the card's header split into three files. **Seam change:** `liveInvoker(run)` loads on the first `authorize`.
