## Context

A dry run is the production interpreter in mode `stub` (D6), started by an attended author: every `read` goes through U50's invoke path (policy point, token, send); every `write`, `send` and `pay` is authorised and recorded but answered by the author's fake. `invokerFor("live")` stays refused until M11 (D7); mock runs keep no policy point (D5).

## Decisions

1. **Layout.** `fakes.ts` is in `interpreter`; `stub.ts` is in `runtimes` (`api` may not import `runtimes`); the routes are in `api`; `main` composes. No module edge changes (D24). `stub.ts` imports no gateway value and `main.ts` is an inventoried egress site, so the egress-site test is not edited.
2. **`checkFakes`** is pure and never throws (a throwing catalogue gives the one problem `"" null shape "fakes cannot be checked"`). Effect keys: a `block` node whose `catalogue.block(uses)` has effect `write`, `send` or `pay` (key `nodeId`) and every `block` hook of any node, a `read` node included, from `hookPlacements` `pre` and `post`, with such a block (key `hookMockKey`); the stub decides from the effect of the context, and a hook context carries the hook block's own effect, so a read node's pay hook is stubbed and needs a fake. Every other own node or block-hook key exists but is no effect; a block whose ref the catalogue lacks takes no fake (`startRun` refuses the version with `block_missing`). Keys are read with `Object.keys` and a `Map`, so `__proto__` is an unknown key. Required keys are the effect keys of nodes reachable from `start` over `augmentedSuccessors` (successor fields, then hook routes): a reachable node's own key when it is an effect node, and the keys of its effectful block hooks whatever its own effect; a fake for an unreachable effect node is accepted. The entry rules and texts of `checkMocks` are restated, not imported, because `mocks.ts` is U43's file; row F11 pins both to the same verdicts. The result is a deep copy.
3. **`stubInvoker`.** Only `ctx.effect === "read"` goes live; `null` or any other value takes the fake path (fail closed). The entry is `ctx.attempt - 1`, as the mock invoker. A failure is `INTERPRETER_TOOL_FAILED` `dry run <reason>`, node `call.nodeId`, `details` of short ASCII: `reason`; `hook` (the key, only when it matches `^[\x21-\x7e]{1,256}$`) for a hook call; `fakeCode` (only when it matches the entry-code pattern). The entry's message never leaves the function (lesson t). `authorize` exists only when live has one.
4. **`dryRunInvokers` loads lazily.** `RunRecord` has no tenant, so for `stub` it awaits `path.liveInvoker(run)` and reads `run.mocksRef` once, on the first `invoke`, through `ctx.tenant` (as `testRunInvokers`); `authorize` is defined from the start, because `blockRuntime` branches on its presence. A `null` reference or a payload that is no plain object is `fakes_unavailable`, for a read too (fail closed). Other modes return `fallback(mode, run)`.
5. **The route** copies the test endpoint: `context()` then the resource loader (`flowOwnerTeam`, `reviewed` false), so a disabled route is 503 before authorization; the PEP; the version (404); `checkFakes` (400); `startRun` with `mode: "stub"`; idempotency pattern B. `mapStartRunError` gets the keyword `export` instead of a copy. A request `startRun` refuses after the run id was drawn consumes that id, as on the test endpoint. Attendedness is `auth: session` (M6 wires no other auth: `ROUTE_AUTH_UNWIRED`) and the closed body: `run_as`, a trigger and a service token cannot reach the route. A problem with an index is reported at `body/fakes/<key>/<index>`, so two bad entries of one key stay apart.
6. **The fragment** `dry-runs.cedar` is the card's two policies; their ids start `dry-run-`, so the frozen `interpreter-` count holds. `Role::"author"` ids are unscoped; the platform tenant forbid keeps `tenant_b` principals out (ran).
7. **The decisions route** follows `audit-routes.ts` `decisionsListHandler`: `limit + 1` rows, `paginate`, scope `run_decisions`, position `[runId, decidedAt, decisionId]` (a cursor of another run is `CURSOR_INVALID`). Its query schema is its own (`limit` 1 to 100), not `PAGE_QUERY`: `listPolicyDecisions` refuses 201 rows, so `limit=200` would be a 500 (as on the existing `/policy-decisions` route). `read_run` on the `Run` is already granted to the owner team and the initiator (`runs-read-*`): no policy is added. The view shows policy ids, the node, the resource and the permit, never an argument, a taint, a token or a credential.
8. **`main`** (task 7.1, after U46 to U49b). U49b's `runtime` is declared in the first `try`; it moves to a `let runtime: PolicyRuntime | null` before it, assigned there (no behaviour change). In the durable branch, when `config.egress !== undefined` and `runtime !== null`: `gateway` = `createGateway(config.egress, { clock: systemClock, logger })`, `tools` = `createToolDirectory(pool)`, `services` = `createServiceResolver(pool)`, `principals` = an inline closure over `withTenantTx`, `getUser` and `loadMemberships` (`null` for a missing or non-`active` user), `path` = `createInvokePath({ pool, policy: runtime, gateway, tools, services, principals, loadVersion, catalogueFor, clock, logger })`, `invokerFor` = `dryRunInvokers(path, store, testRunInvokers(store))`; otherwise `invokerFor` stays `testRunInvokers(store)`. `registerDryRunRoutes` (after `registerTestRunRoutes`, `enabled: config.egress !== undefined`) and `registerRunDecisionRoutes` (after `registerRunRoutes`) are always called, so the served OpenAPI document does not depend on config.
9. **Stub semantics are the interpreter's.** Code nodes and hooks run; a `wait` sleeps (a long `wait` blocks a dry run for real; M14); the gate keys reuse by mode, so a stub intent never serves a live run; a replayed run authorizes again and records a second decision (add-tool-invocation's rule).

## Interfaces

Given, equal to `proposal.md`, whose Scaffold bullet lists what is not scaffolded. Taken: `proposal.md`; shapes: `delivered-shapes.md`.

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

## Failure cases and security

- Every `details` is a short ASCII word or id (`reason`, `hook`, `fakeCode`, `decisionId`), storable as `jsonb`: `fakeCode` and `hook` pass a character-class test or are left out. The 400 `fields` echo body keys in a response, never in a stored row.
- Fail closed: a non-read never reaches `live.invoke`; unreadable fakes fail the first call; a missing or exhausted fake fails the node. A stubbed effect's permit is recorded and never sent: the stub holds no gateway, so it cannot request a token.
- Reads are real: with real egress a dry run calls the read tool with the author's inputs, under a grant and a one-step token (F3 rung 3).
- A dependency failure in `authorize` is U50's `INTERPRETER_TOOL_FAILED` `{ stage: "authorize" }`; a refusal before `startRun` creates no run; a pool of `null` is 503. A crash between `authorize` and the stored step value authorizes again on recovery (a second decision); the stored fakes answer the same entry.

## Verification

**Ran** (2026-11-06, Node 24.22.2, scratch copy of main with a reference version of this unit): `checkFakes` over `pay-once` and variants (F1 to F11, F13); `stubInvoker` and `dryRunInvokers` (T1 to T8, D1 to D4); the fragment table and the frozen `flow-testing-policy`, `roles-policy`, `registry/policy`, `run-cancel`, `me`, `session-auth.rbac`, `actions` and `platform` tests with the new file; both routes on embedded Postgres with the `test-run-routes.test.ts` harness (every row); that `buildOpenApiDocument` carries a `description`. **Derived, not run**: F12 and F12b (M5 code, not yet implemented when computed; on main when this unit runs), the live proof, the fake error run and `main` (they need U46 to U50).

## Decisions made while writing

- **Seam additions:** none to the card's block. Chosen where the card is open: `mapStartRunError` exported, the reasons `fake_missing` and `fakes_unavailable`, the `hook` and `fakeCode` details, the `/<index>` field suffix, the decisions `limit` bound, the permit narrowing.
- **Questions with defaults:** (1) ruled (U51-1): the description is on the steps route's 200 schema in `run-routes.ts`; `STEP_VIEW_SCHEMA` is untouched. (2) Unreadable fakes fail even a `read`; default: yes.
