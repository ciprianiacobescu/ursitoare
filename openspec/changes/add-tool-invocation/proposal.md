## Why

M6 lets admins grant tools, but no run can yet call a tool through the policy point: the invoker has no check, the effect intent is written before any decision exists, and nothing builds the one request a permit allows.

Observable result: `read-then-pay` in mode `live` with a granted, deployed tenant layer sends its two tool calls through the fake egress, each as the one request its recorded decision permitted (`POST tools.fake.test /blocks/erp.create_payment@1`, body digest `9afaf3c64e1b…`, token TTL 60); with `amount: 2450` the `pay` call is denied `INTERPRETER_TOOL_DENIED` before any intent, token or send; the write of `untrusted-into-write` is denied by `platform-forbid-untrusted-egress`; a `hooked-pay` notification is checked as a hook, so its node's grant does not cover it.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the invoke path itself, PEP with the full context, then the intent, the token and the send, with the request equal to the permit. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

New: `src/runtimes/` (`invoke/{types,request,path}.ts`, `index.ts`), `test/support/invoke-runs/`, tests. Edited in named tasks: `src/pdp/{log,index}.ts`, `src/interpreter/{types,errors,index,visit,execute}.ts`, `runtimes/block.ts`, `hooks/{types,block-runner,pipeline}.ts`, `test/arch/egress-sites.test.ts`. Capability `tool-invocation` (ADDED); ADDED requirements in `interpreter`; nothing MODIFIED.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`), type-only where they name gateway types; this change implements them. Not scaffolded: the optional members and the error code in the block, the value export lines of `src/interpreter/index.ts`, `src/pdp/index.ts` and `src/runtimes/index.ts` (the scaffold creates `src/runtimes/index.ts` with the one type-only line `export type { InvokePath }`, which `test/support/invoke-runs/harness.ts` imports; `Approval` comes through `src/interpreter/index.ts`, where `add-hook-trace` exports it), the value of `INVOKE_LIMITS`, the inventory literal in `test/arch/egress-sites.test.ts`. No dependency.
- **Depends on:** U31 `add-envelope-store`, U33 `add-interpreter-core`, U34 `add-effect-intents`, U35 `add-mock-test-runs`, U40 `add-taint-runtime`, U42 `add-hook-runtime`, U42b `add-hook-trace`, U43 `add-block-hooks`, U45 `add-fake-egress-proxy`, U45b `add-fake-tools`, U46 `add-gateway-client`, U47 `add-tool-registry`, U48 `add-credentials`, U49 `add-grants-model`, U49b `add-policy-deploy` (the card's edges). Added: U03 `add-tenancy-foundation`, U38 `add-code-sandbox`, U39 `add-code-node-runtime` (the code pre-hook), U41 `add-hook-checker`, U11 `add-pdp-cedar`, U22 `add-flow-format-model`, U24 `add-test-catalogue`.
- **Changed:** no frozen test is edited; these pass with the new members absent: `src/interpreter/runtimes/block.test.ts`, `block-effect.test.ts`, `execute.test.ts`, `mock-invoker.test.ts`, `src/main.mockruns.test.ts::C-28603f65`. The inventory literal of `test/arch/egress-sites.test.ts` (each caller adds itself) changes in task 1.1. No migration, endpoint, API code or e2e part.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/interpreter/types.ts (scaffolded)
export interface CallAuthorization { readonly decisionId: string; readonly permit: Permit }
// Not scaffolded (optional members of existing interfaces; absent = M5 behaviour, lesson v):
//   ToolInvoker gains  authorize?(call: ToolCall, ctx: StepContext): Promise<CallAuthorization>
//   StepContext gains  readonly authorization?: CallAuthorization; readonly taint?: readonly string[];
//                      readonly approvals?: readonly Approval[]          (Approval: add-hook-trace's)
//   NodeServices gains inputTaint?: () => readonly string[]              (the attempt's effective input taint)
//                      decided?: (decisionId: string) => void            (the node call's decision, for the row)
//   HookServices (add-hook-runtime) gains argsTaint?: (value: unknown) => readonly string[]
//   VisitRequest (src/interpreter/visit.ts) gains readonly approvals?: readonly Approval[]
//   errors.ts          InterpreterErrorCode + INTERPRETER_ERROR_CODES gain "INTERPRETER_TOOL_DENIED"
// src/pdp/log.ts (exported from src/pdp/index.ts)
export function recordDecisionOwnTx(pool: TenantPool, ctx: TenantContext, decision: Decision, req: PolicyRequest, extra?: { runId?: string; nodeId?: string }): Promise<boolean>;
// src/runtimes/invoke/types.ts (exported from src/runtimes/index.ts)
export type PrincipalLoader = (ctx: TenantContext, userId: string) => Promise<PrincipalEntity | null>;
export interface InvokePathDeps {
  pool: TenantPool;                 // recordDecisionOwnTx, each decision in its own transaction
  policy: PolicyRuntime;            // U49b
  gateway: Gateway;                 // U46
  tools: ToolDirectory;             // U47
  services: ServiceResolver;        // U48
  principals: PrincipalLoader;
  loadVersion: VersionLoader;
  catalogueFor: (ctx: TenantContext) => Promise<Catalogue>;
  clock: Clock;
  logger: Logger;
}
export interface InvokePath { liveInvoker(run: RunRecord): Promise<ToolInvoker> }
export interface ToolRequest { request: OutboundRequest; egress: Egress }
export const INVOKE_LIMITS: Readonly<{ tokenTtlSeconds: number; maxEntities: number }>;   // { tokenTtlSeconds: 60, maxEntities: 24 } [D18]
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

**Interfaces taken:** the names of `delivered-shapes.md` and the M6 siblings' Interfaces given.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M5 folders named, checked line by line).

## Out of scope

Wiring in `main` and `invokerFor("live")` (U51, M11 [D7]); real approvals (`[]` in M6); step deadlines for the TTL (D18); GET and DELETE parameters (M7); the vault (U48); mock-run policy (D5); stale validation (M7 [D27]).
