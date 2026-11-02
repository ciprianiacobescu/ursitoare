## Purpose

The runs API lets a signed-in user list, read and cancel the runs of their tenant: run, step and payload views over the stored run data, scoped by the policy actions `read_run` and `debug_run` to a run's owner team and initiator.

## ADDED Requirements

### Requirement: Run and step views expose the stored rows
`toRunView` and `toStepView` SHALL map a `RunRecord` and a `StepRecord` field by field into `RunView` and `StepView`, leaving out the internal columns, and `RUN_VIEW_SCHEMA` and `STEP_VIEW_SCHEMA` SHALL list exactly the view fields.

#### Scenario: Views, schemas and the policy resource
- **WHEN** `toRunView` gets the record `{ runId: "run-4", lineageId: "run-4", parentRunId: null, flowId: "rf-2-ap", flowHash: "sha256:" + "a".repeat(64), ownerTeam: "finance", mode: "mock", trigger: "test", state: "failed", principal: { userId: "u_erin", kind: "human" }, actorChain: ["u_erin"], inputRef: "b".repeat(64), mocksRef: "c".repeat(64), outputRef: null, error: { code: "FLOW_FAILED", message: "flow ended failed", node: "rejected" }, terminalNode: "rejected", runDay: "2026-11-02", createdAt: "2026-11-02T09:00:04.000000Z", startedAt: "2026-11-02T09:00:05.000000Z", endedAt: "2026-11-02T09:00:06.000000Z" }`; `toStepView` gets `{ runId: "run-4", nodeId: "pay", effectSeq: 1, turn: 2, attempt: 3, generation: 4, seq: 7, kind: "block", state: "completed", inputRef: "a".repeat(64), outputRef: null, outcome: "ok", error: null, taint: ["untrusted", "private"], policyDecisionId: "dec_1", idemKey: "ik1_x", startedAt: "2026-11-02T09:00:05.000000Z", endedAt: null }`; the two schemas are read; `runResource("tenant_a", record)` is called
- **THEN** the run view equals `{ id: "run-4", flowId: "rf-2-ap", flowHash: <the hash>, mode: "mock", trigger: "test", state: "failed", ownerTeam: "finance", principal: { userId: "u_erin", kind: "human" }, terminalNode: "rejected", error: { code: "FLOW_FAILED", message: "flow ended failed", node: "rejected" }, inputRef: "b".repeat(64), outputRef: null, createdAt: "2026-11-02T09:00:04.000000Z", startedAt: "2026-11-02T09:00:05.000000Z", endedAt: "2026-11-02T09:00:06.000000Z" }` (its keys, in order, are the 15 of `RunView`; it holds no `lineageId`, `parentRunId`, `actorChain`, `mocksRef` or `runDay`; `principal` and `error` are copies, not the record's objects); the step view holds the record's `seq`, `nodeId`, `kind`, `effectSeq`, `attempt`, `state`, `outcome`, `error`, `inputRef`, `outputRef`, `idemKey`, `policyDecisionId`, `taint` (a copy), `startedAt` and `endedAt` with the same values and no `runId`, `turn` or `generation`; each schema has `additionalProperties: false`, and `required` equal to `Object.keys(properties)` equal to the keys of its view; `runResource` returns `{ type: "Run", id: "run-4", tenantId: "tenant_a", attrs: { owner_team: entityRef("Team", "tenant_a/finance"), initiator: entityRef("User", "tenant_a/u_erin") } }`

### Requirement: The run list shows the owner team's runs and the caller's own
`GET /api/v1/runs` SHALL answer `{ items, next_cursor }` of the `RunView`s whose `owner_team` is one of the caller's teams or whose principal is the caller, newest first, filterable by `flowId` and `state`, with the cursor contract of `api-conventions`.

#### Scenario: Who sees which runs
- **WHEN** the fixture of design.md § Test plan is seeded and alice, bob, dave, erin, carol and mallory (tenant B) each `GET /api/v1/runs`
- **THEN** the `id`s in order are alice `["run-5", "run-4", "run-2", "run-1"]`, bob the same, dave `["run-3"]`, erin `["run-4", "run-3"]`, carol `[]`, mallory `["run-1"]` (her tenant's run, with `principal.userId` her own id); alice's items equal `toRunView` of the stored records, so `run-4` carries its `error`, `terminalNode` `rejected` and `endedAt`; without a cookie the list is 401 `UNAUTHENTICATED`

#### Scenario: Filters and paging
- **WHEN** alice lists with `flowId=rf-1-core`, with `state=failed`, with both, with `limit=2` then the returned `next_cursor`, with that cursor changed in its last character, with the `next_cursor` of `GET /api/v1/runs/run-1/steps?limit=1`, with `state=bogus`, `limit=0`, `limit=201` and `flowId=Bad_Id`; mallory sends alice's `next_cursor`; and a server whose `engineKey` is `null` gets `limit=5`, `limit=2` and `cursor=abc`
- **THEN** the ids are `["run-5", "run-2", "run-1"]`, `["run-4"]` and `[]`; the first `limit=2` page is `["run-5", "run-4"]` with a `next_cursor`, the second `["run-2", "run-1"]` with `next_cursor` null; the changed cursor, the steps cursor and mallory's use of alice's cursor are 400 `CURSOR_INVALID`; the four bad values are 400 `VALIDATION_FAILED`; the keyless server answers 200 for `limit=5` and 503 `ENGINE_KEY_REQUIRED` for `limit=2` and for the cursor

### Requirement: A run is read by its owner team and its initiator
`GET /api/v1/runs/{runId}` SHALL answer the `RunView` to members of the run's owner team and to the run's initiator under `read_run`, 403 `FORBIDDEN` to any other user of the tenant and 404 `NOT_FOUND` when the run does not exist in the tenant.

#### Scenario: Reading one run
- **WHEN** alice, bob, erin, dave, carol and mallory read `/api/v1/runs/run-1`; erin reads `run-4` and `run-3`; dave reads `run-3`; alice reads `run-9` and `bad%20id`
- **THEN** alice and bob get 200 with `toRunView` of `run-1` (state `running`, `startedAt` `2026-11-02T09:00:02.000000Z`); erin gets 200 for `run-4` (initiator) and `run-3` (`ops` member) and 403 for `run-1`; dave 200 for `run-3` and 403 for `run-1`; carol 403; mallory 200 with tenant B's own `run-1` (`principal.userId` hers); `run-9` is 404 `NOT_FOUND` and `bad%20id` 400 `VALIDATION_FAILED`; each 403 is `FORBIDDEN` with `details.decisionId`

### Requirement: Steps are listed in seq order
`GET /api/v1/runs/{runId}/steps` SHALL answer the `StepView`s of a readable run ordered by `seq`, as stored by the interpreter, paged with a cursor bound to that run.

#### Scenario: Steps in order and paged
- **WHEN** `run-1` has the step rows of design.md § Test plan, inserted with `seq` 2, 0, 3, 1; alice gets `/api/v1/runs/run-1/steps?limit=3`, then the returned `next_cursor`, then that first cursor on `/api/v1/runs/run-2/steps`; alice gets the steps of `run-2` (no rows), of `run-3` and of `run-9`
- **THEN** the first page holds the `seq` values `[0, 1, 2]` with a `next_cursor` and the second `[3]` with null; the items equal `toStepView` of the stored rows, and the `seq` 2 item is `{ seq: 2, nodeId: "pay", kind: "block", effectSeq: 0, attempt: 1, state: "completed", outcome: null, error: null, inputRef: payloadDigest(PAY_ARGS), outputRef: payloadDigest(PAID), idemKey: "ik_pay_1", policyDecisionId: "dec_1", taint: ["untrusted"], startedAt: "2026-11-02T09:30:00.000000Z", endedAt: "2026-11-02T09:30:01.000000Z" }`, the `seq` 3 item has `state` `started` and `endedAt` null; the `run-2` cursor use is 400 `CURSOR_INVALID`; `run-2` answers `{ items: [], next_cursor: null }`, `run-3` 403 `FORBIDDEN`, `run-9` 404 `NOT_FOUND`

### Requirement: A payload is served only through a run that references it
`GET /api/v1/runs/{runId}/payloads/{sha256}` SHALL answer `{ sha256, mediaType, size, data }` when the payload exists in the tenant and `envelopeStore.referencedBy` is true for the readable run, and 404 `NOT_FOUND` otherwise.

#### Scenario: Referenced, unreferenced, malformed and expired
- **WHEN** alice gets, for `run-1`, the payload of its input (`INPUT`), of the output of its `seq` 2 step (`PAID`), of the input of `run-3` (`{ note: "ops" }`, stored once for tenant A, referenced only by `run-3`), and the digest `"0".repeat(64)`; the owner then deletes the `PAID` row from `envelope_payload` and alice gets it again; alice also gets `.../payloads/` + 63 hex characters, + a 64-character string with an uppercase `A`, + `zz`; dave gets the `{ note: "ops" }` payload through `run-3`; dave gets the `INPUT` payload through `run-1`
- **THEN** the `INPUT` answer is 200 `{ sha256: payloadDigest(INPUT), mediaType: "application/json", size: 38, data: INPUT }` with header `cache-control: no-store`, the `PAID` answer 200 with `data` `PAID`; the `run-3` digest through `run-1`, the zero digest and the deleted payload are 404 `NOT_FOUND`; the three malformed values are 400 `VALIDATION_FAILED`; dave's `run-3` answer is 200 with `data` `{ note: "ops" }`; his `run-1` one is 403 `FORBIDDEN`

### Requirement: Cancel stops an active run once
`POST /api/v1/runs/{runId}/cancel` SHALL, for a `queued` or `running` run and an author of its owner team under `debug_run`, call `durable.cancel(runId)`, move the run to `cancelled`, append the event `run.cancelled` in the same transaction and answer 202 with the `RunView`; any other state SHALL answer 422 `OPERATION_REFUSED` with `details.reason` `run_not_active` and call nothing.

#### Scenario: Cancelling an active run
- **WHEN** with the clock fixed at `2026-11-02T10:00:00Z` and a recording `durable`, alice posts `/api/v1/runs/run-1/cancel` (state `running`) with her cookie and `x-csrf-token`, then dave posts `/api/v1/runs/run-3/cancel` (state `queued`, team `ops`), then alice reads `/api/v1/runs/run-1`
- **THEN** each answer is 202 with `toRunView` of the stored record: `run-1` has `state` `cancelled`, `startedAt` `2026-11-02T09:00:02.000000Z`, `endedAt` `2026-11-02T10:00:00.000000Z`; `run-3` has `startedAt` null and the same `endedAt`; the recorded `cancel` calls are exactly `["run-1", "run-3"]`; tenant A holds exactly two `event` rows, `run.cancelled` with `run_id` `run-1` and `data` `{ by: <alice's id>, from: "running" }` and `run.cancelled` for `run-3` with `{ by: <dave's id>, from: "queued" }`; the read shows `cancelled`

#### Scenario: Cancel refusals leave the run alone
- **WHEN** with a `durable.cancel` that records its argument and whose behaviour the test switches, alice posts a cancel for `run-2` (completed), twice for `run-1` (running), and for `run-5` without `x-csrf-token`; bob (approver, finance) posts for `run-5`; erin (initiator of `run-4`, author, team `ops`) posts for `run-4`; then the behaviour is set to reject `new Error("postgres://app:pw@db/x")` and alice posts for `run-5`, and then to first move `run-5` to `completed` through `runRepository.transition` and alice posts for `run-5` again
- **THEN** `run-2` is 422 `OPERATION_REFUSED` with `details` `{ reason: "run_not_active" }`; `run-1` is 202 then 422 `run_not_active`; the missing token is 403 `CSRF_INVALID`; bob's and erin's calls are 403 `FORBIDDEN` with `details.decisionId`; the rejection is 503 `RUNS_UNAVAILABLE` with message `Runs are unavailable`, its body does not contain `postgres`, and `run-5` is still `running` with no event; the racing call is 422 `run_not_active`, `run-5` stays `completed` and has no `run.cancelled` event; over the whole scenario `cancel` was called with `"run-1"` once, `"run-5"` twice and never with `"run-2"` or `"run-4"`

### Requirement: A missing store or runtime answers RUNS_UNAVAILABLE
The five routes SHALL answer 503 `RUNS_UNAVAILABLE` ("Runs are unavailable") when `RunApiDeps.pool` is `null`, and the cancel route SHALL do so before any other check of its handler when `RunApiDeps.durable` is `null`.

#### Scenario: No pool and no runtime
- **WHEN** on a server whose PEP has the pool but whose `registerRunRoutes` got `pool: null`, alice asks for the list, `run-1`, its steps, `.../payloads/` + the `INPUT` digest and a cancel of `run-1`; on a second server with the pool and `durable: null` she cancels `run-5` (running) and `run-2` (completed) and lists
- **THEN** the five answers of the first server are 503 `RUNS_UNAVAILABLE`; on the second, both cancels are 503 `RUNS_UNAVAILABLE` and `run-5` is still `running`, and the list is 200 with `["run-5", "run-4", "run-2", "run-1"]`

### Requirement: One policy fragment permits the read and debug actions
`src/runs/policy/runs.cedar` SHALL hold exactly four policies: `read_run` on a `Run` for members of its owner team (`runs-read-owner-team`) and for its initiator (`runs-read-initiator`), `read_run` on the `Tenant` (`runs-list`), and `debug_run` on a `Run` for a principal with the role `author` who is a member of its owner team (`runs-debug-author-owner-team`).

#### Scenario: The policy table
- **WHEN** the engine loads `defaultSrcDir()` and decides, for a run of tenant `tenant_a` owned by `finance` with initiator `u_erin`, the principals alice (author, `finance`), bob (approver, `finance`), erin (author, `ops`), dave (author, `ops`), carol (`tenant_admin`, no team) and a principal of `tenant_b` (author, `finance`), each for `read_run` and `debug_run` on the `Run`, and for `read_run` and `debug_run` on the `Tenant` `tenant_a`
- **THEN** every decision has `errors` `[]`; `read_run` on the `Run` is allow for alice, bob and erin and deny for dave, carol and the `tenant_b` principal; `debug_run` on the `Run` is allow for alice only; `read_run` on the `Tenant` is allow for alice, dave and carol and deny for the `tenant_b` principal; `debug_run` on the `Tenant` is deny for all six; the loaded policy ids starting with `runs-` are exactly the four above, sorted

### Requirement: Tenants never see each other's runs
Every run route SHALL read and write through `withTenantTx` of the session's tenant, so a run, step, payload or cancel of another tenant is 404 `NOT_FOUND`, and a cursor of one tenant is refused by another.

#### Scenario: Tenant B reaches nothing of tenant A
- **WHEN** mallory (tenant B) gets `/api/v1/runs/run-3`, `/api/v1/runs/run-1/steps`, `.../run-1/payloads/` + the digest of `PAID`, posts a cancel of `run-5` with her token; alice gets `/api/v1/runs/run-1` and its steps, then posts the cancel of `run-5`; `durable` records its calls
- **THEN** mallory's four answers are 404 `NOT_FOUND`, 200 `{ items: [], next_cursor: null }` (tenant B's own `run-1` has no steps), 404 `NOT_FOUND` and 404 `NOT_FOUND`; before alice's cancel, `cancel` had not been called, `run-5` of tenant A was still `running` and no `event` row existed in either tenant; alice's reads are tenant A's `run-1` and its four steps, and her cancel is 202 with `cancel` called exactly with `["run-5"]`

### Requirement: The routes are session routes under the run actions and are wired into the engine
The five routes SHALL be `session` routes with the actions `read_run` and `debug_run`, documented in `docs/api/openapi.json`, and `main` SHALL register them with the runtime it launched (`null` when none).

#### Scenario: The route table, the document and the wiring
- **WHEN** `main` starts with no database and `inspectServers`, and `docs/api/openapi.json` is parsed; then `main` starts again with `openDatabase` returning `{ appPool: db.appPool, close }` of a seeded test database, `database.app` set to `db.appEndpoint`, `launchDurable` a fake recording its calls and returning a runtime with a recording `cancel`, and alice (a `systemClock` session) posts a cancel of `run-1` to the public server with `inject`
- **THEN** the public server of the first run defines exactly `GET /api/v1/runs read_run`, `GET /api/v1/runs/:runId read_run`, `GET /api/v1/runs/:runId/steps read_run`, `GET /api/v1/runs/:runId/payloads/:sha256 read_run`, `POST /api/v1/runs/:runId/cancel debug_run`, each with auth `session` and the `errors` of design.md § Interfaces, and no `POST /api/v1/runs`; `unregisteredRouteErrors` over the routes is `[]`; the document holds the five paths with `{runId}` and `{sha256}`; in the second run the answer is 202, the fake runtime's `cancel` got exactly `["run-1"]`, and the stored run is `cancelled`
