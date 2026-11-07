## Why

An author can test a flow only against mocks (M4), so nobody sees what the policy point would permit before a flow goes live, and no run reads through the broker while its `write`, `send` and `pay` reach nothing.

Observable result: alice (author, `finance`) dry-runs `read-then-pay` with a fake for `pay` and the run completes; the fake tools hold the `lookup` call only (token TTL 60); two `allow` decisions are recorded, the `pay` one with the permit `POST tools.fake.test /blocks/erp.create_payment@1`, body digest `af25dc0c3f8c…`, which `GET /api/v1/runs/{runId}/decisions` returns; a `pay` hook on a read node is stubbed too; with no fake for `pay` the post is 400 at `body/fakes/pay`; bob, dave and carol get 403, mallory 404; with no grant the run fails at the read with `INTERPRETER_TOOL_DENIED`.

Batch `m6-grants` (closing unit `add-web-dry-runs`) delivers M6; this unit is the attended dry-run endpoint, fakes, stub invoker, decisions route, principal loader and their wiring in `main`. After it merges, L4 runs acceptance profile `all`.

## What Changes

New: `src/interpreter/fakes.ts`, `src/interpreter/policy/dry-runs.cedar`, `src/runtimes/invoke/stub.ts`, `src/api/{dry-run-routes,run-decisions,principal-loader}.ts`, `test/support/invoke-runs/dry-runs.ts`, tests. Edited in named tasks: `src/interpreter/index.ts`, `src/runtimes/index.ts`, `src/api/index.ts`, `src/api/test-run-routes.ts` (`export` on `mapStartRunError`), `src/api/run-routes.ts` (the steps route's 200 schema description, ruling U51-1), `src/main.ts` (shared), `docs/api/openapi.json` (regenerated), `test/support/invoke-runs/harness.ts` (U50's). Capabilities `flow-testing` and `runs-api`: ADDED requirements only. No migration, API error code, module edge, part or web change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); the `stubInvoker` stub imports `DryRunFakes` through the `export type` line of `src/interpreter/index.ts`. Not scaffolded: the value export `checkFakes`, the export lines of `src/runtimes/index.ts` and `src/api/index.ts`, `dry-runs.cedar`, the `export` keyword on `mapStartRunError`, the description, the `src/main.ts` edit, and the four `InvokeHarness` members (task 6.1 adds them; a scaffolded member would fail U50's harness).
- **Depends on:** U13 `add-api-pep`, U27 `add-flow-registry`, U33 `add-interpreter-core`, U35 `add-mock-test-runs`, U36 `add-runs-api`, U43 `add-block-hooks`, U45 `add-fake-egress-proxy`, U45b `add-fake-tools`, U46 `add-gateway-client`, U47 `add-tool-registry`, U48 `add-credentials`, U49b `add-policy-deploy`, U50 `add-tool-invocation`. Added, each for names it gives: U11, U11b, U14, U17, U31, U34, U41 `add-hook-checker`, U42b `add-hook-trace`, U49 `add-grants-model`. Plan m6 activates only after plan m5 completes, so the M5 units are on main when this unit runs; `delivered-shapes.md` restates the M5 names used.
- **Changed:** no M0-M4 test is edited. These hold: `src/interpreter/flow-testing-policy.test.ts::C-4a0822e8` (new ids start `dry-run-`), `src/main.mockruns.test.ts::C-28603f65` (no `egress`: `invokerFor("stub")` rejects), `src/api/run-views.test.ts::C-8e399d8e`, `test/arch/egress-sites.test.ts` (`main.ts` is inventoried by U46; `stub.ts` imports no gateway value); `src/main.conventions.test.ts::C-d150bfa4` guards the regenerated document; add-hook-trace's `run-views-hooks.test.ts` is not edited.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/interpreter/fakes.ts (exported from src/interpreter/index.ts)
export type DryRunFakes = TestMocks;   // { [nodeId or hookMockKey]: MockEntry[] }, entries { output } | { error } (lesson s)
export interface FakeProblem { key: string; index: number | null; reason: "missing" | "not_an_effect" | "unknown_node" | "schema" | "shape"; detail: string }
export function checkFakes(flow: Flow, catalogue: Catalogue, fakes: unknown): { fakes: DryRunFakes | null; problems: FakeProblem[] };
// src/runtimes/invoke/stub.ts (exported from src/runtimes/index.ts)
export function stubInvoker(live: ToolInvoker, fakes: DryRunFakes): ToolInvoker;   // read → live.invoke; else the fake entry ctx.attempt - 1 of nodeId (hook call: `${nodeId}:${phase}:${hookId}`); authorize: live's
export function dryRunInvokers(path: InvokePath, store: RunStore, fallback: InterpreterDeps["invokerFor"]): InterpreterDeps["invokerFor"];   // "stub": stubInvoker over path.liveInvoker(run) and run.mocksRef; else fallback
// src/api/test-run-routes.ts:64 (module-private on main; task 4.1 adds the keyword `export`; the complete mapping is in delivered-shapes.md)
export function mapStartRunError(error: unknown): never;   // the ApiError of an InterpreterError or RunDataError from startRun; rethrows others
// src/api/dry-run-routes.ts
export interface DryRunApiDeps { pool: TenantPool | null; clock: Clock; ids: IdSource; interpreter: InterpreterDeps | null; enabled: boolean }
export function registerDryRunRoutes(server: FastifyInstance, deps: DryRunApiDeps): void;
// src/api/run-decisions.ts
export interface DecisionView {
  decisionId: string; decidedAt: string; nodeId: string | null; resource: string; decision: "allow" | "deny";
  reasons: string[]; policySetVersion: string;
  permit: { method: string; host: string; path: string; bodyDigest: string; serviceId: string; ttlSeconds: number } | null;
}
export function toDecisionView(record: PolicyDecisionRecord): DecisionView;
export interface RunDecisionApiDeps { pool: TenantPool | null; engineKey: KeyMaterial | null }
export function registerRunDecisionRoutes(server: FastifyInstance, deps: RunDecisionApiDeps): void;
// src/api/principal-loader.ts (exported from src/api/index.ts)
export function createPrincipalLoader(pool: TenantPool): (ctx: TenantContext, userId: string) => Promise<PrincipalEntity | null>;   // U50's PrincipalLoader, by structure (api may not import runtimes)
// test/support/invoke-runs/harness.ts (U50's `InvokeHarness`; task 6.1 adds exactly these four members, `hashes: Readonly<Record<FlowKey, string>>` and the rest are U50's)
export interface InvokeHarness { store: RunStore; loadVersion: InterpreterDeps["loadVersion"]; catalogueFor: InterpreterDeps["catalogueFor"]; db: TestDatabase }
// test/support/invoke-runs/dry-runs.ts (task 6.1's test reaches the harness only through it; members: test-plan-runs.md § Harness)
export interface DryAnswer { status: number; headers: Record<string, string>; body: unknown }
export interface DryHarness { post(body: unknown, flow?: string): Promise<DryAnswer>; get(path: string): Promise<DryAnswer>; execute(runId: string): Promise<void>; decisions(runId: string): Promise<PolicyDecisionRecord[]>; steps(runId: string): Promise<StepRecord[]>; save(name: string, flow: Flow): Promise<string>; close(): Promise<void> }
export function dryHarness(h: InvokeHarness): Promise<DryHarness>;
```

**Interfaces taken:** the names of `delivered-shapes.md` (the M6 siblings' invoke path, gateway, directory, resolver and policy runtime, the M5 hook names, merged mock, run, view, decision, identity and route helpers).

## Out of scope

Human approvals in dry runs and `invokerFor("live")` (M11, D7); the Dry run panel and the run page's permits (U52b); a `wait` that skips in `stub` (M14); `run_as`, triggers, `llm.*` fakes; a policy point in mock runs (D5).
