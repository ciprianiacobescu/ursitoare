## Context

U33 writes one `step_execution` row per node visit (`seq` 0, 1, 2 in visit order; `end` has a row; a replay reuses them), U31 stores runs, steps and payloads per tenant, and U30 cancels a workflow by id (U33 enqueues a run under `workflowIdOf(tenantId, runId)`, `<tenantId>:<runId>`). This change reads and cancels; the views expose the rows as stored. Rulings: D13 (policies), D16 (`RUNS_UNAVAILABLE` is the only new code; other refusals are `OPERATION_REFUSED` with `details.reason`), D8 (`policyDecisionId` may be null, passed through).

## Decisions

1. **Files.** `src/api/run-views.ts`, `src/api/run-routes.ts`, `src/runs/policy/runs.cedar`; both `.ts` files are exported from `src/api/index.ts`. The routes call `runRepository`, `stepRepository`, `envelopeStore` and `appendEvent` inside `withTenantTx(pool, tenant, ...)`; nothing here writes SQL.
2. **Context.** `context(request)` throws `RUNS_UNAVAILABLE` (503, "Runs are unavailable") when `deps.pool` is `null`, and `unavailable()` of `flow-common.ts` (`AUTHZ_UNAVAILABLE`) when the request has no tenant or principal. The resource loader below calls it first, so a missing pool answers `RUNS_UNAVAILABLE` on every route. Absent optional keys of a repository query are omitted (`exactOptionalPropertyTypes`).
3. **Schemas.** Params (`additionalProperties: false`): `runId` `^[A-Za-z0-9_-]{1,128}$`, `sha256` `^[0-9a-f]{64}$`. List query: `PAGE_QUERY`'s `limit` and `cursor`, `flowId` (`FLOW_ID_PATTERN`, at most 64) and `state` (enum of the five states), `additionalProperties: false`; steps query: `PAGE_QUERY`. Responses: `pageSchema(RUN_VIEW_SCHEMA)`, `RUN_VIEW_SCHEMA` (200 and 202), `pageSchema(STEP_VIEW_SCHEMA)`, and the payload schema (`sha256`, `mediaType`, `size`, `data: {}`); all allow-lists (`additionalProperties: false`, every field required).
4. **Resource.** `loadRun(request)`: `context`, then `runRepository.get(tx, tenant, runId)`; `null` (absent, or another tenant's under RLS) is the PEP's 404; else `runResource(tenant.tenantId, run)`. The four `:runId` routes use it, so Cedar decides for a same-tenant stranger (403).
5. **List.** `listFilter: { kind: "sql", predicate: (p, first) => ({ sql: "owner_team = ANY($" + first + ") OR principal_user_id = $" + (first + 1), values: [p.teams, p.userId] }) }`; the handler passes `listPredicate(request, RUN_LIST_FILTER_FIRST)` as `filter` (U31 wraps it as `AND (...)`). Paging follows `flow-routes.ts` (key and `engineKeyRequired()` rules included); cursor scope `runs`, position `[createdAt, runId]` (two strings, else `cursorInvalid()`). Filters are not in the cursor; they are re-applied on every request, so a cursor never widens what a caller sees.
6. **Steps.** Cursor scope `run_steps` (a fixed scope: the scope pattern is lowercase, run ids are not), position `[runId, seq]`: `position[0]` must equal the path `runId` and `position[1]` be an integer of 0 or more, else `cursorInvalid()`; `stepRepository.list(tx, tenant, runId, { limit, afterSeq })`; `next` becomes `[runId, next]`.
7. **Payload.** In one transaction: `envelopeStore.referencedBy(tx, tenant, runId, sha256)` false is `notFound()`; then `envelopeStore.get`; `null` (expired) is `notFound()`; else `{ sha256, mediaType, size, data }` (no `pinned`). A payload only the run's `mocks_ref` points to is served too.
8. **Cancel.** Order: `context`, then `deps.durable === null` (`RUNS_UNAVAILABLE`); `runRepository.get` (state not `queued` or `running`: `ApiError(422, "OPERATION_REFUSED", ..., { reason: "run_not_active" })`); `await deps.durable.cancel(workflowIdOf(tenant.tenantId, runId))` outside any transaction (a rejection is `RUNS_UNAVAILABLE`, the error dropped); then one `withTenantTx`: `at = deps.clock.now()`, `runRepository.transition(tx, tenant, runId, { state: "cancelled", from: ["queued", "running"], at })` (`null`: the run ended meanwhile, `run_not_active`, nothing written), then `appendEvent(tx, tenant, { eventId: deps.ids.next("evt"), runId, correlationId: null, type: "run.cancelled", data: { by: principal.userId, from: <state read earlier> }, time: at })`. Answer 202 `toRunView(transitioned)`. The transition is conditional (U31 locks the row and checks `from`), so of two concurrent authorized cancels exactly one transitions the run and appends the one event (202); the other gets `null` or finds the state already `cancelled` and answers 422 `run_not_active`, as a later sequential cancel does. Both may call `durable.cancel`, which is idempotent. A crash after `durable.cancel` leaves the run `running`; repeating the cancel is safe. The stop itself is U30's: per `add-dbos-runtime`, requirement "A workflow id runs once, and status and cancel report it" (cancel stops a queued or running workflow), `cancel` cancels a queued workflow and marks a running (`PENDING`) one `CANCELLED`, which stops at its next step boundary (DBOS `cancelWorkflow`). That workflow then never reaches U33's `run:finish`, so it cannot overwrite `cancelled`; this change's fake records the call and does not prove the stop.
9. **Views.** Field copies; `principal`, `error` and `taint` are fresh objects; times are the store's strings. The schemas' `properties` keys are the view's keys in the order of § Interfaces.
10. **Policy.** `src/runs/policy/runs.cedar`: `@id("runs-read-owner-team") permit (principal, action == Action::"read_run", resource is Run) when { principal in resource.owner_team };` `@id("runs-read-initiator") permit (principal, action == Action::"read_run", resource is Run) when { principal == resource.initiator };` `@id("runs-list") permit (principal, action == Action::"read_run", resource is Tenant);` `@id("runs-debug-author-owner-team") permit (principal in Role::"author", action == Action::"debug_run", resource is Run) when { principal in resource.owner_team };`.
11. **`main`.** Per `add-dbos-runtime`, `main` calls `launchDurable` once, after the routes that need no runtime and before the listener binds; the routes that take the launched runtime (this change's run routes, and U35's test-run routes after them) register after it and before the listener. So directly after U30's `launchDurable` statement `main` calls `registerRunRoutes(server, { pool, clock: systemClock, ids: systemIds, engineKey: config.engineKey, durable })`: `pool` is `database?.appPool ?? null`, `durable` the launched runtime or `null` when the launch was skipped. The registration also runs with no database; the OpenAPI handler is lazy, so the document lists the routes.

## Interfaces

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

Routes (all `session`; `errors` is `DefinedRoute.errors`, implied codes included, sorted):

| Route | Action (resource) | Success | `errors` |
|---|---|---|---|
| `GET /api/v1/runs?limit&cursor&flowId&state` | `read_run` (Tenant) | 200 `{ items: RunView[], next_cursor }` | `AUTHZ_UNAVAILABLE`, `CURSOR_INVALID`, `ENGINE_KEY_REQUIRED`, `FORBIDDEN`, `RUNS_UNAVAILABLE`, `UNAUTHENTICATED`, `VALIDATION_FAILED` |
| `GET /api/v1/runs/:runId` | `read_run` (Run) | 200 `RunView` | `AUTHZ_UNAVAILABLE`, `FORBIDDEN`, `NOT_FOUND`, `RUNS_UNAVAILABLE`, `UNAUTHENTICATED`, `VALIDATION_FAILED` |
| `GET /api/v1/runs/:runId/steps?limit&cursor` | `read_run` (Run) | 200 `{ items: StepView[], next_cursor }` | the list's plus `NOT_FOUND` |
| `GET /api/v1/runs/:runId/payloads/:sha256` | `read_run` (Run) | 200 `PayloadView` | the `:runId` route's |
| `POST /api/v1/runs/:runId/cancel` | `debug_run` (Run) | 202 `RunView` | `AUTHZ_UNAVAILABLE`, `CSRF_INVALID`, `FORBIDDEN`, `NOT_FOUND`, `OPERATION_REFUSED`, `RUNS_UNAVAILABLE`, `UNAUTHENTICATED`, `VALIDATION_FAILED` |

## Failure cases

No pool or runtime: 503 `RUNS_UNAVAILABLE`. `durable.cancel` rejects: 503, no change. The run ends during a cancel, or is cancelled twice: 422 `run_not_active`, nothing written. A payload row gone (expiry): 404. A `RunDataError` or database error is not mapped: 500 `INTERNAL` with the fixed message and no driver text (scenario "Filters and paging"; inputs are pattern-checked first, so only a fault reaches it).

## Security

1. All five routes are `session` routes: the PEP authenticates, checks the CSRF token on the `POST` and decides `read_run` or `debug_run` on the loaded `Run` (the list on the `Tenant`, then row-filtered). None is public; responses carry `cache-control: no-store`.
2. No new table. Every query runs in `withTenantTx` of the session's tenant under forced RLS; the tenant never comes from a parameter. Two-tenant scenarios: "Who sees which runs", "Filters and paging", "Tenant B reaches nothing of tenant A".
3. Path and query values are pattern-checked before any query. Payload `data` and `taint` are customer data: returned as JSON, never logged or put in an error; errors carry fixed messages and details (`reason`, `decisionId`).
4. No secret is read. A `durable.cancel` error can hold a connection URL, so it is dropped.
5. Abuse, each a scenario: another team's or tenant's run, an initiator or approver cancelling, a forged, foreign or other-run cursor, an unreferenced payload digest, a malformed digest or id, cancel without a CSRF token, cancelling a finished run.

## Test plan

`withTestDatabase()`, `seedTwoTenants(db)`, `fixedClock("2026-11-02T10:00:00Z")`, `sequentialIds(100)`, `engineKey` `{ reveal: () => "k".repeat(64) }`, the PEP as `src/api/flow-policy.test.ts` builds it. `seedFlowActors` in A: alice (author, `finance`), bob (approver, `finance`), dave (author, `ops`), erin (author, `ops`), carol (`tenant_admin`, no team); in B: mallory (author, `finance`); a session each from `createTestSession`. Rows are written through `withTenantTx(db.appPool, ctx, ...)` with `runRepository.create(tx, ctx, NEW_RUN, at)` and `transition`; the owner reads `event` and deletes payloads through `withTenantTx(db.ownerPool, ctx, ...)`. `durable` is a fake whose `cancel(id)` records `id` and then runs a switchable behaviour.

Tenant A runs (`flowHash` `"sha256:" + "a".repeat(64)`, `mode` `mock`, `trigger` `test`, `actorChain` `[initiator]`, input `INPUT` = `{ invoice: { id: "inv-1", total: 120 } }` unless noted; `at` is the creation time, all `2026-11-02T09:00:0NZ`): `run-1` (`at` N=1) `rf-1-core`, `finance`, alice, `running`, `startedAt` `09:00:02`; `run-2` (2) `rf-1-core`, `finance`, bob, `completed`, output `PAID`; `run-3` (3) `ops-flow`, `ops`, dave, `queued`, input `{ note: "ops" }`; `run-4` (4) `rf-2-ap`, `finance`, erin, `failed`, error `{ code: "FLOW_FAILED", message: "flow ended failed", node: "rejected" }`, terminal node `rejected`; `run-5` (5) `rf-1-core`, `finance`, alice, `running`. Tenant B: `run-1` `rf-1-core`, `finance`, mallory, `queued`, input `INPUT`. `PAID` = `{ payment_id: "pay-1", status: "paid" }`, `PAY_ARGS` = `{ vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" }`. Every run has `parentRunId` null, `lineageId` its id, `mocks` null and a `human` principal.

`run-1` steps (`runId` `run-1`, `effectSeq` 0, `turn` 0, `generation` 0, `attempt` 1, `error` null, `startedAt` `2026-11-02T09:30:00Z`, `endedAt` `09:30:01Z`, `input` and `output` null, `outcome` null unless noted), upserted in the order `seq` 2, 0, 3, 1: 0 `lookup` `block` `completed`; 1 `route` `switch` `completed`, outcome `active`; 2 `pay` `block` `completed`, input `PAY_ARGS`, output `PAID`, `idemKey` `ik_pay_1`, `policyDecisionId` `dec_1`, `taint` `["untrusted"]`; 3 `done` `end` `started`, `endedAt` null.

Each scenario is its own `test()` over a fresh `withTestDatabase()` clone and server. A test file starts with `assert.equal(typeof <the function it tests>, "function")`; a call that reaches a scaffold stub is wrapped (`assert.doesNotThrow` if synchronous, `p.then((v) => v, (e: unknown) => e)` if async) and asserted; HTTP tests use `server.inject`.

## Decisions made while writing

- **A same-tenant stranger gets 403, not 404** (the card's budget line said 404): the PEP loads the run and Cedar decides, as for flows; only an absent run or another tenant's is 404.
- **Cancel:** a `null` runtime answers before the state check; a rejecting `durable.cancel` is 503 with no transition; only the run event is written, no audit-chain entry.
- **Tests seed through the U31 repositories** (U35 comes later); no new test-support file.
