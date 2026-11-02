## Why

Batch `m4-runs-timeline` (U30-U37 and U35b; closing unit `add-web-run-timeline`, journey `e2e/test_m4_runs.py`) delivers M4: an author test-runs a validated flow with mocked tools and follows each step on the run timeline; runs survive a kill. This unit's part: the routes that list, read and cancel runs under `read_run` and `debug_run`.

U35 starts test runs and U37 draws the timeline, but no endpoint reads a run. This change gives the web a read model over U31's run data and one operator action, cancel.

Observable result: a signed-in user lists `/api/v1/runs` and sees the runs of their teams and the runs they started, newest first, filterable by `flowId` and `state`; a run's owner team and its initiator read the run, its steps in `seq` order (the rows U33 wrote) and any payload it references; a stranger gets 403 and another tenant 404. An author of the owner team cancels a `queued` or `running` run: the workflow is cancelled, the run becomes `cancelled`, a `run.cancelled` event is stored, and a second cancel is refused with 422 `run_not_active`. Without a pool or a durable runtime the routes answer 503 `RUNS_UNAVAILABLE`.

## What Changes

- `src/api/run-views.ts`, `src/api/run-routes.ts` (five routes), `src/runs/policy/runs.cedar` (four policies for `read_run` and `debug_run`).
- Named edits: `src/api/index.ts`, `src/api/error-codes.ts`, `src/main.ts` (one call), `docs/api/openapi.json` and one frozen test (below). No migration, part or web feature.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the exports of `src/api/index.ts` (each task adds its own), the `ERROR_CODES` entry, the call in `src/main.ts`, `docs/api/openapi.json` and `runs.cedar`. No new dependency.
- **Depends on:** `add-policy-catalogue` (U11b), `add-api-pep` (U13), `add-api-conventions` (U14), `add-dbos-runtime` (U30), `add-envelope-store` (U31) and `add-interpreter-core` (U33), as the card says; beyond the roadmap row `add-engine-skeleton` (U01), `add-db-foundation` (U02), `add-tenancy-foundation` (U03), `add-pdp-cedar` (U11), `add-oidc-login` (U12) and `add-flow-registry` (U27; it gives `seedFlowActors` and the route pattern copied here). `test/arch/modules.ts` needs no change (`api` may import `runs` and `durable`).
- **Changed:** `src/api/index.ts`, `src/api/error-codes.ts`, `src/main.ts` (after U30's single `launchDurable` call and before the listener binds, as that change says), `docs/api/openapi.json`, and the frozen test `src/api/error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message`: its `EXPECTED_CODES` gains `RUNS_UNAVAILABLE` (24 entries; requirement "Every error code is registered" is modified in `specs/api-conventions/spec.md`). U35 edits these files after this change.
- **Migrations, tables, events:** none new; the event type `run.cancelled` goes to U31's `event` table. **Endpoints** 5. **Error code** `RUNS_UNAVAILABLE` 503; refusals use `OPERATION_REFUSED` with `details.reason` `run_not_active`.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/api/run-views.ts (exported from src/api/index.ts)
export interface RunView {
  id: string; flowId: string; flowHash: string; mode: RunMode; trigger: "test"; state: RunState; ownerTeam: string;
  principal: { userId: string; kind: "human" | "service" }; terminalNode: string | null; error: RunError | null;
  inputRef: string | null; outputRef: string | null; createdAt: string; startedAt: string | null; endedAt: string | null;
}
export interface StepView {
  seq: number; nodeId: string; kind: string; effectSeq: number; attempt: number; state: StepState;
  outcome: string | null; error: RunError | null; inputRef: string | null; outputRef: string | null;
  idemKey: string | null; policyDecisionId: string | null; taint: string[]; startedAt: string; endedAt: string | null;
}
export interface PayloadView { sha256: string; mediaType: string; size: number; data: PayloadValue }
export function toRunView(run: RunRecord): RunView;
export function toStepView(step: StepRecord): StepView;
export const RUN_VIEW_SCHEMA: Readonly<Record<string, unknown>>;
export const STEP_VIEW_SCHEMA: Readonly<Record<string, unknown>>;
export function runResource(tenantId: string, run: RunRecord): ResourceRef;
  // { type: "Run", id, tenantId, attrs: { owner_team: Team entity, initiator: User entity } }
// src/api/run-routes.ts (exported from src/api/index.ts)
export interface RunApiDeps {
  pool: TenantPool | null; clock: Clock; ids: IdSource; engineKey: KeyMaterial | null;
  durable: Pick<DurableRuntime, "cancel"> | null;
}
export function registerRunRoutes(server: FastifyInstance, deps: RunApiDeps): void;
// ERROR_CODES gains RUNS_UNAVAILABLE 503 "Runs are unavailable" (src/api/error-codes.ts)
// src/runs/policy/runs.cedar: @id runs-read-owner-team, runs-read-initiator, runs-list, runs-debug-author-owner-team
```

Endpoints under `/api/v1`, all `session`; lists answer `{ items, next_cursor }`: `GET /runs` (`read_run` on the Tenant, rows filtered to the caller's teams and own runs), `GET /runs/{runId}`, `GET /runs/{runId}/steps` and `GET /runs/{runId}/payloads/{sha256}` (`read_run` on the Run), `POST /runs/{runId}/cancel` (`debug_run` on the Run, 202). Declared errors per route: `design.md` § Interfaces.

**Interfaces taken:**

- From `add-envelope-store`: `runRepository`, `stepRepository`, `envelopeStore`, `appendEvent`, `RUN_LIST_FILTER_FIRST` (7: the list filter's first two placeholders), `payloadDigest` (tests), `RunRecord`, `StepRecord`, `RunState`, `StepState`, `RunMode`, `RunError`, `PayloadValue`, `TenantContext`.
- From `add-dbos-runtime`: `DurableRuntime` (its `cancel(workflowId: string): Promise<void>`, which per that change's requirement "A workflow id runs once, and status and cancel report it" cancels a queued workflow and marks a running one `CANCELLED`, stopping at its next step boundary).
- From `add-interpreter-core`: the step layout (its design Decisions 5-8: one row per visit, numbered in visit order, `end` included) and `RUN_WORKFLOW` (the workflow id of a run is its `runId`).
- From merged code (`delivered-shapes.md`): the `src/api` route, PEP, cursor and error names, the policy engine and `entityRef`, `withTenantTx`, `createTestSession`, `seedFlowActors`, `Clock` and `IdSource`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@e06fdb3, checked line by line).

## Out of scope

`POST /api/v1/runs` and any run start (U35's test endpoint; live starts are M10), reading the `event` table, a live stream, retry or resume, audit-chain entries for cancel, other filters, DBOS status in the view, the web pages (U37), mock runs and the CLI (U35).
