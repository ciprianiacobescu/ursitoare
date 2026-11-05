## Why

An author needs to know a flow works before it touches anything real. U33 walks a stored version and U34 journals its effects, but nothing starts a run whose tools are answered by the author's own mocks, and nothing refuses a test that would reach a real tool.

Observable result: `POST /api/v1/flows/{flowId}/versions/{hash}/test` takes `{ input, mocks }` and, for an author of the flow's owner team, stores a `queued` run in mode `mock`, enqueues it and answers 202 `{ run }`; the run completes with the mocks as its step outputs and its effect intents recorded with mode `mock`, and no tool is called. A block reachable from `start` without a mock answers 422 `TEST_MOCK_MISSING`; a mock that does not fit its node or its block's output schema answers 422 `TEST_MOCK_INVALID`; neither stores a run.

Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit's part: the test-run endpoint starts a mocked run of one exact flow version that never egresses. The plan runs acceptance profile `all` after this unit merges: every configured gate (setup, build, lint, typecheck, test, e2e) on the target; the batch outcome itself is proven by the closing unit's journey `e2e/test_m4_runs.py`.

## What Changes

- `src/interpreter/mocks.ts`, `src/interpreter/policy/flow-testing.cedar`, `src/api/test-run-routes.ts`, test support `test/support/mock-run-seed.ts`.
- Named edits: `src/interpreter/index.ts`, `src/api/index.ts`, `src/api/error-codes.ts`, `src/main.ts`, `docs/api/openapi.json` and two frozen tests. No migration, part or web feature.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the exports of `src/interpreter/index.ts` and `src/api/index.ts`, the two `ERROR_CODES` entries, the `MainDeps` members and calls in `src/main.ts`, `docs/api/openapi.json`, and `src/interpreter/policy/flow-testing.cedar` (loaded at once). No new dependency (`ajv` is a root dependency).
- **Depends on:** `add-api-pep` (U13), `add-api-conventions` (U14), `add-flow-registry` (U27), `add-interpreter-core` (U33) and `add-effect-intents` (U34), as the roadmap says; the card adds `add-test-catalogue` (U24: `loadTestCatalogue`, fixture flows), `add-block-registry` (U26: `loadRegistryCatalogue`, `importCatalogue`), `add-dbos-runtime` (U30: the `launchDurable` call site), `add-envelope-store` (U31: `RunStore`, `createRunStore`) and `add-runs-api` (U36: `RunView`, `toRunView`, `RUNS_UNAVAILABLE`, and the shared files `src/main.ts`, `src/api/index.ts`, `src/api/error-codes.ts`, `docs/api/openapi.json`, which U36 edits first). Also used: `add-engine-skeleton` (U01), `add-db-foundation` (U02), `add-tenancy-foundation` (U03), `add-pdp-cedar` (U11), `add-oidc-login` (U12) and `add-flow-format-model` (U22). `test/arch/modules.ts` needs no change.
- **Rulings:** D6, D7 (every reachable `block` needs a mock), D8, D11 (the run acts as the requester), D12 (every state but `draft` runs, unchanged), D13, D16, D18, D19; U34's bind order; conflict 2's path.
- **Changed:** frozen tests changed in place by named tasks: `src/api/error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message` (26 codes) and `src/main.flows.test.ts::C-f696603a the real engine serves and documents the flow routes` (eight routes). Modified archived requirements: api-conventions "Every error code is registered" (26 codes, from U36's 24) and flow-registry "The routes are session routes under the flow actions" (an eighth route under `/api/v1/flows`).
- **Migrations, tables, env vars, parts, web features:** none.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/interpreter/mocks.ts (exported from src/interpreter/index.ts)
export type MockEntry = { output: JsonValue } | { error: { code: string; message: string } };
export type TestMocks = { [nodeId: string]: MockEntry[] };
export interface MockProblem {
  nodeId: string; index: number | null;
  reason: "missing" | "unknown_node" | "not_a_block" | "schema" | "shape"; detail: string;
}
export function checkMocks(flow: Flow, catalogue: Catalogue, mocks: unknown): { mocks: TestMocks | null; problems: MockProblem[] };
export function createMockInvoker(mocks: TestMocks): ToolInvoker;   // entry index = ctx.attempt - 1; past the end: INTERPRETER_TOOL_FAILED
export function testRunInvokers(store: RunStore): InterpreterDeps["invokerFor"];   // mock: the run's mocks; else INTERPRETER_NO_INVOKER
// src/api/test-run-routes.ts (exported from src/api/index.ts)
export function registryVersionLoader(pool: TenantPool): VersionLoader;
export interface TestRunApiDeps { pool: TenantPool | null; clock: Clock; ids: IdSource; interpreter: InterpreterDeps | null }
export function registerTestRunRoutes(server: FastifyInstance, deps: TestRunApiDeps): void;
// POST /api/v1/flows/{flowId}/versions/{hash}/test: action test_flow on the Flow, body { input: object, mocks: object }, 202 { run: RunView }
// ERROR_CODES gains TEST_MOCK_MISSING 422 "A block node has no mock" and TEST_MOCK_INVALID 422 "A mock does not fit its node" (src/api/error-codes.ts)
// src/interpreter/policy/flow-testing.cedar: @id interpreter-test-flow-author-owner-team, interpreter-test-flow-capability
// src/main.ts: MainDeps gains registerRunWorkflow?: typeof registerRunWorkflow and bindInterpreter?: typeof bindInterpreter
// test/support/mock-run-seed.ts
export interface MockRunSeed { validated: string; draft: string; llm: string }   // content hashes
export function seedMockRunFlows(db: TestDatabase, ctx: TenantContext, clock: Clock): Promise<MockRunSeed>;
```

**Interfaces taken:**

- From `add-interpreter-core`: `startRun`, `executeRun`, `InterpreterDeps`, `ToolInvoker`, `VersionLoader`, `LoadedVersion`, `InterpreterError`, `registerRunWorkflow`, `bindInterpreter`, `memoryWorkflowOps`, `waitForRun`, `workflowIdOf`.
- From `add-effect-intents`: `createEffectIntents`, `getIntent`, `idemKey`, `payOnceVersion`, `payOnceCatalogue`, `PAY_ONCE_INPUT`, `PAY_ONCE_PAID_OUTPUT`.
- From `add-envelope-store`: `RunStore`, `createRunStore`, `createMemoryRunStore`, `NewRun`, `RunRecord`, `TenantPool`, `TenantContext`, `payloadDigest`.
- From `add-dbos-runtime`: `launchDurable`, `DurableRuntime`. From `add-runs-api`: `RunView`, `toRunView`, `RUN_VIEW_SCHEMA`, `RUNS_UNAVAILABLE`.
- From merged code (`delivered-shapes.md`): the `src/api` route, idempotency and PEP names, the registry functions, `Flow`, `Catalogue`, `BlockDef`, `successorFields`, and the test support.

## Out of scope

The offline command (`add-flow-test-cli`), the Test run panel (U37), run routes (U36), live and stub runs and other node kinds (M5 on), a version state change after a test and other principals (M14), `invoke_tool` decisions (M6), retries (D18).
