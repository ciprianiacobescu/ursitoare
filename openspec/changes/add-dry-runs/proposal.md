## Why

An author can test a flow only against mocks (M4), so nobody sees what the policy point would permit before a flow goes live, and no run reads through the broker while its `write`, `send` and `pay` reach nothing.

Observable result: alice (author, `finance`) dry-runs `read-then-pay` with a fake for `pay` and the run completes; the fake tools hold one call, the `lookup` read (token TTL 60), and none for `erp.create_payment@1`; two `allow` decisions are recorded, the `pay` one with the permit `POST tools.fake.test /blocks/erp.create_payment@1`, body digest `9afaf3c64e1b…`, which `GET /api/v1/runs/{runId}/decisions` returns to the run's readers; the same post with no fake for `pay` is 400 `VALIDATION_FAILED` at `body/fakes/pay`; bob, dave and carol get 403, mallory 404; with no grant the run fails at the read with `INTERPRETER_TOOL_DENIED`.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the attended dry-run endpoint, per-node fakes, the stub invoker, the run decisions route and the wiring of all of it in `main`. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

New: `src/interpreter/fakes.ts`, `src/interpreter/policy/dry-runs.cedar`, `src/runtimes/invoke/stub.ts`, `src/api/dry-run-routes.ts`, `src/api/run-decisions.ts`, `test/support/invoke-runs/dry-runs.ts`, tests. Edited in named tasks: `src/interpreter/index.ts`, `src/runtimes/index.ts`, `src/api/index.ts`, `src/api/test-run-routes.ts` (`export` on `mapStartRunError`), `src/api/run-routes.ts` (the steps route's 200 schema description, ruling U51-1), `src/main.ts` (shared, after U46 to U49b), `docs/api/openapi.json` (regenerated), `test/support/invoke-runs/harness.ts` (U50's). Capabilities `flow-testing` and `runs-api`: ADDED requirements only. The `checkFakes` requirement had a narrower scope than design decision 2 (hooks of write, send or pay nodes only); decision 2 is right and the requirement now says the same. No migration, API error code, module edge, part or web change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); the `stubInvoker` stub imports `DryRunFakes` through the `export type` line of `src/interpreter/index.ts`, which is scaffolded; this change implements them. Not scaffolded: the value export `checkFakes` of `src/interpreter/index.ts`, the export lines of `src/runtimes/index.ts` and `src/api/index.ts`, `dry-runs.cedar`, the `export` keyword on `mapStartRunError` (the function and its signature are on main; the dry-run route reuses it unchanged), the description, the `src/main.ts` edit and the document. No dependency.
- **Depends on:** U13 `add-api-pep`, U27 `add-flow-registry`, U33 `add-interpreter-core`, U35 `add-mock-test-runs`, U36 `add-runs-api`, U43 `add-block-hooks`, U45 `add-fake-egress-proxy`, U45b `add-fake-tools`, U46 `add-gateway-client`, U47 `add-tool-registry`, U48 `add-credentials`, U49b `add-policy-deploy`, U50 `add-tool-invocation`. Added, each for names it gives: U11, U11b, U14, U17, U31, U34, U41 `add-hook-checker`, U42b `add-hook-trace` (the description's target), U49 `add-grants-model` (the grants of the proof).
- **Changed:** no M0-M4 test is edited. These hold: `src/interpreter/flow-testing-policy.test.ts::C-4a0822e8` (the new ids start `dry-run-`), `src/main.mockruns.test.ts::C-28603f65` (no `egress`: `invokerFor("stub")` still rejects), `src/api/run-views.test.ts::C-8e399d8e` (key lists only), `test/arch/egress-sites.test.ts` (`main.ts` is inventoried by U46; `stub.ts` imports no gateway value); `src/main.conventions.test.ts::C-d150bfa4` guards the regenerated document. add-hook-trace's `src/api/run-views-hooks.test.ts` (it deep-equals `inputOriginalRef`) is not edited: the description is on the steps response (ruling U51-1).

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/interpreter/fakes.ts (exported from src/interpreter/index.ts)
export type DryRunFakes = TestMocks;   // { [nodeId or hookMockKey]: MockEntry[] }, entries { output } | { error } (lesson s)
export interface FakeProblem { key: string; index: number | null; reason: "missing" | "not_an_effect" | "unknown_node" | "schema" | "shape"; detail: string }
export function checkFakes(flow: Flow, catalogue: Catalogue, fakes: unknown): { fakes: DryRunFakes | null; problems: FakeProblem[] };
// src/runtimes/invoke/stub.ts (exported from src/runtimes/index.ts)
export function stubInvoker(live: ToolInvoker, fakes: DryRunFakes): ToolInvoker;
  // authorize: live's; invoke: ctx.effect "read" → live.invoke; otherwise the fake entry (index ctx.attempt - 1) of
  // call.nodeId, or of `${nodeId}:${phase}:${hookId}` for a hook call; no token, no send
export function dryRunInvokers(path: InvokePath, store: RunStore, fallback: InterpreterDeps["invokerFor"]): InterpreterDeps["invokerFor"];
  // mode "stub": stubInvoker(await path.liveInvoker(run), fakes read from run.mocksRef); any other mode: fallback(mode, run)
// src/api/test-run-routes.ts:64 (module-private on main; task 4.1 adds the keyword `export`; the complete mapping is in delivered-shapes.md)
export function mapStartRunError(error: unknown): never;   // throws the ApiError an InterpreterError or RunDataError from startRun maps to; rethrows any other error
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
// test/support/invoke-runs/dry-runs.ts (task 6.1's test reaches the harness only through it; members: test-plan-runs.md § Harness)
export function dryHarness(h: InvokeHarness): Promise<{ post(body: unknown): Promise<{ status: number; headers: Record<string, string>; body: unknown }>; execute(runId: string): Promise<void>; decisions(runId: string): Promise<PolicyDecisionRecord[]>; steps(runId: string): Promise<StepRecord[]>; close(): Promise<void> }>;
```

**Interfaces taken:** the names of `delivered-shapes.md`: the M6 siblings' invoke path, gateway, directory, resolver and policy runtime, `hookMockKey`, `hookPlacements`, `augmentedSuccessors`, `STEP_VIEW_SCHEMA.hooks`, and the merged mock, run, view, decision, identity and route helpers.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M5 and M6 folders named, checked line by line).

## Out of scope

Human approvals in dry runs and `invokerFor("live")` (M11, D7); the Dry run panel and the run page's permits (U52b); a `wait` that skips in `stub` (it would MODIFY a frozen interpreter requirement; M14); `run_as`, triggers, `llm.*` fakes; a policy point in mock runs (D5).
