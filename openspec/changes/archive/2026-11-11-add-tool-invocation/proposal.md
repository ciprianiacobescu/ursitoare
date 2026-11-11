## Why

M6 lets admins grant tools, but no run can yet call a tool through the policy point: the invoker has no check, the effect intent is written before any decision exists, and nothing builds the one request a permit allows.

Observable result: `read-then-pay` in mode `live` with a granted, deployed tenant layer sends its two tool calls through the fake egress, each as the one request its recorded decision permitted (`POST tools.fake.test /blocks/erp.create_payment@1`, TTL 60); with `amount: 2450` the `pay` call is denied `INTERPRETER_TOOL_DENIED` before any intent, token or send.

Batch `m6-grants` (closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6 (tool servers, grants, attended dry runs). This unit: the invoke path, the PEP with the full context, then the intent, the token and the send, the request equal to the permit.

## What Changes

New: `src/runtimes/` (`invoke/{types,request,path}.ts`, `index.ts`), `test/support/invoke-runs/`, tests. Edited in named tasks: `src/pdp/{log,index}.ts`, `src/runtimes/index.ts` (value export lines, 1.1, 1.2, 3.2), `src/interpreter/{types,errors,index,visit,execute}.ts`, `runtimes/block.ts`, `hooks/{types,block-runner,pipeline}.ts`, `test/arch/egress-sites.test.ts` (1.1), `test/support/README.md` (1.3). Capability `tool-invocation` (ADDED); ADDED requirements in `interpreter`; nothing MODIFIED.

## Impact

- **Scaffold:** Signature stubs for the interfaces below are on the base branch (scaffold, `docs/decisions/0002`), type-only where they name gateway types. Not scaffolded (optional members, so absent = M5 behaviour, lesson v; `Approval` is add-hook-trace's): `ToolInvoker.authorize?(call: ToolCall, ctx: StepContext): Promise<CallAuthorization>`; `StepContext.authorization?: CallAuthorization`, `.taint?: readonly string[]`, `.approvals?: readonly Approval[]`; `NodeServices.inputTaint?: () => readonly string[]` (the attempt's effective input taint) and `.decided?: (decisionId: string) => void` (the node call's decision, for the row); `HookServices.argsTaint?: (value: unknown) => readonly string[]`; `VisitRequest.approvals?: readonly Approval[]`; `INTERPRETER_TOOL_DENIED` in `InterpreterErrorCode` and `INTERPRETER_ERROR_CODES`; also the value export lines of `src/interpreter/index.ts`, `src/pdp/index.ts` and `src/runtimes/index.ts` (the last is created with `export type { InvokePath, InvokePathDeps }`, the type `HarnessWrap` needs), the value of `INVOKE_LIMITS`, the inventory literal in `test/arch/egress-sites.test.ts`.
- **Depends on:** `add-envelope-store`, `add-interpreter-core`, `add-effect-intents`, `add-mock-test-runs`, `add-taint-runtime`, `add-hook-runtime`, `add-hook-trace`, `add-block-hooks`, `add-fake-egress-proxy`, `add-fake-tools`, `add-gateway-client`, `add-tool-registry`, `add-credentials`, `add-grants-model`, `add-policy-deploy` (card edges); added: `add-tenancy-foundation`, `add-code-sandbox`, `add-code-node-runtime` (the code pre-hook), `add-hook-checker`, `add-pdp-cedar`, `add-flow-format-model`, `add-test-catalogue`.
- **Changed:** no frozen test is edited except the inventory literal of `test/arch/egress-sites.test.ts::C-76ead8ea` (task 1.1, the edit add-gateway-client assigns to a later caller); these pass with the new members absent: `src/interpreter/runtimes/block.test.ts`, `block-effect.test.ts`, `execute.test.ts`, `mock-invoker.test.ts`, `src/main.mockruns.test.ts::C-28603f65`. No migration, endpoint, API code or e2e part.

**Interfaces given** (`design.md` § Interfaces)

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

**Interfaces taken:** `delivered-shapes.md` and the M6 siblings' Interfaces given.

## Out of scope

Wiring in `main` and `invokerFor("live")` (U51, M11 [D7]); real approvals (`[]` in M6); step deadlines for the TTL (D18); GET and DELETE parameters (M7); the vault (U48); mock-run policy (D5); stale validation (M7 [D27]).
