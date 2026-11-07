## Context

A dry run is the production interpreter in mode `stub` (D6), started by an attended author: every `read` goes through U50's invoke path; every `write`, `send` and `pay` is authorised and recorded but answered by the author's fake.

## Decisions

1. **Layout.** `fakes.ts` is in `interpreter`; `stub.ts` is in `runtimes` (`api` may not import `runtimes`); the routes and the principal loader are in `api` (which already imports `identity`, `pdp` and `tenancy`, `src/api/me.ts`); `main` composes. No module edge changes (D24).
2. **`checkFakes`** is pure and never throws (a throwing catalogue gives the one problem `"" null shape "fakes cannot be checked"`). The stub decides from the effect of the context and a hook context carries the hook block's own effect (add-block-hooks, `delivered-shapes.md`; rows H1 and H2 prove it end to end), so a read node's pay hook is stubbed and needs a fake: the effect keys are the block nodes of effect `write`, `send` or `pay` and the block hooks of such blocks on any node (key `hookMockKey`). A block the catalogue lacks takes no fake (`startRun` refuses the version with `block_missing`). `__proto__` is an unknown key (`Object.keys` and a `Map`). Required keys are those of nodes reachable from `start` over `augmentedSuccessors`; a fake for an unreachable effect node is accepted. The entry rules of `checkMocks` are restated, not imported (`mocks.ts` is U43's file); row F11 pins both. The result is a deep copy.
3. **`stubInvoker`.** Only `ctx.effect === "read"` goes live; `null` or any other value takes the fake path (fail closed).
4. **`dryRunInvokers` loads lazily.** `RunRecord` has no tenant, so for `stub` it awaits `path.liveInvoker(run)` and reads `run.mocksRef` once, on the first `invoke`, through `ctx.tenant` (as `testRunInvokers`); `authorize` is defined from the start, because `blockRuntime` branches on its presence. Failures are fixed details, nothing of the store's error (it may name the database) (D5, D6; spec).
5. **The route** copies the test endpoint (its `context()` and resource loader are closures, so it writes its own): `context()`, then the resource loader (`flowOwnerTeam`, `reviewed` false), so a disabled route is 503 before authorization; the PEP; the version (404); `checkFakes` (400); `startRun` with `mode: "stub"`; idempotency pattern B. `mapStartRunError` gets the keyword `export` instead of a copy (mapping: `delivered-shapes.md`). A request `startRun` refuses after the run id was drawn consumes that id, as on the test endpoint. Attendedness is `auth: session` and the closed body. Refusals: spec, rows R1 to R15.
6. **The fragment** `dry-runs.cedar` is the card's two policies; ids start `dry-run-`, so the frozen `interpreter-` count holds; `Role::"author"` ids are unscoped and the platform tenant forbid keeps `tenant_b` principals out (ran).
7. **The decisions route** follows `audit-routes.ts` `decisionsListHandler`: `limit + 1` rows, `paginate`, scope `run_decisions`, position `[runId, decidedAt, decisionId]` (cursor errors: spec; `audit-routes.ts:425-426`). Its query schema is its own (`limit` 1 to 100), not `PAGE_QUERY`: `listPolicyDecisions` refuses 201 rows, so `limit=200` would be a 500. `read_run` is already granted to the owner team and the initiator (`runs-read-*`): no policy is added.
8. **`main`** (task 7.2, after U46 to U49b). U49b's `runtime` moves to a `let runtime: PolicyRuntime | null` before the first `try`. In the durable branch, when `config.egress !== undefined` and `runtime !== null` (`null` exactly when there is no database), `main` builds `gateway` = `createGateway(config.egress, { clock: systemClock, logger })`, `tools` = `createToolDirectory(pool)`, `services` = `createServiceResolver(pool)`, `principals` = `createPrincipalLoader(pool)` (task 7.1, a tested function: M2 stops at `tool_unbound`, which U50 orders before `principal_unknown`, so `main`'s rows never run the loader), `path` = `createInvokePath({ pool, policy: runtime, gateway, tools, services, principals, loadVersion, catalogueFor, clock, logger })` and `invokerFor` = `dryRunInvokers(path, store, testRunInvokers(store))`. The no-database case (503 `AUTHZ_UNAVAILABLE` from the authentication hook, `src/api/route.ts:186-188`) and the role `api` case (503 `RUNS_UNAVAILABLE`) are in `specs/flow-testing/spec.md` and rows M3 and M4. `registerDryRunRoutes` (after `registerTestRunRoutes`, `enabled: config.egress !== undefined`) and `registerRunDecisionRoutes` (after `registerRunRoutes`) are always called, so the served OpenAPI document does not depend on config.
9. **Stub semantics are the interpreter's.** Code nodes and hooks run; a `wait` sleeps (M14); the gate keys reuse by mode.

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Taken: `proposal.md`; shapes: `delivered-shapes.md`.

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

## Failure cases and security

- Every `details` is a short ASCII word or id, storable as `jsonb`; the 400 `fields` echo body keys in a response only.
- Fail closed (decisions 3 and 4): a non-read never reaches `live.invoke`. A stubbed effect's permit is recorded and never sent: the stub holds no gateway. Reads are real, under a grant and a one-step token.
- A dependency failure in `authorize` is U50's `INTERPRETER_TOOL_FAILED` `{ stage: "authorize" }`; a refusal before `startRun` creates no run. A crash between `authorize` and the stored step value authorizes again on recovery (a second decision); the stored fakes answer the same entry.

## Verification

**Ran** (2026-11-06, Node 24.22.2, scratch copy of main with a reference version of this unit): `checkFakes` (F1 to F11, F13); `stubInvoker` and `dryRunInvokers` (T1 to T8, D1 to D5); the fragment table with the frozen policy, `me` and `actions` tests; both routes on embedded Postgres (every row then); the OpenAPI `description`. **Derived, not run**: F12, F12b, F14 (M5 code), T9, D6, R15, M3, M4, the decisions row without a key, H1 to H4, P1 to P5, the live proof and `main` (they need U46 to U50).

## Decisions made while writing

- **Seam additions:** none to the card's block (open choices: the reasons `fake_missing`, `fakes_unavailable`, `live_unavailable`, `createPrincipalLoader`, the `hook` and `fakeCode` details, the field suffix, the `limit` bound).
- **Questions with defaults:** (1) ruled (U51-1): the description is on the steps route's 200 schema. (2) Unreadable fakes fail even a `read`: yes.
