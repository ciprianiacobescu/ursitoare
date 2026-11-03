## Purpose

An author tests a stored flow version without side effects: every block of the run is answered by a mock, a malformed or missing mock is refused before any run exists, and a mock run never calls a tool (`POST /api/v1/flows/{flowId}/versions/{hash}/test`).

## ADDED Requirements

### Requirement: Mocks are checked against the flow before a run exists
`checkMocks` SHALL accept mocks only when each block node reachable from `start` has at least one entry and every entry is well formed and, for an `output`, valid against the block's output schema, and SHALL otherwise answer the sorted list of problems.

#### Scenario: Valid mocks pass and are copied
- **WHEN** `checkMocks(FLOW, payOnceCatalogue(), MOCKS)` runs; then with `FLOW` plus an unreachable block node `orphan` (`uses` `erp.flag_vendor@1`, `with` `{ vendor_id: "v1", reason: "r" }`, `next` `done`) once with `MOCKS` and once with `MOCKS` plus `orphan: [{ output: { flag_id: "f1" } }]`; with `pay: [{ error: { code: "E_DOWN", message: "down" } }, { output: PAID }]`; and with `emptyCatalogue` and `{ lookup: [{ output: 5 }], pay: [{ output: 6 }] }`
- **THEN** every call returns `problems: []` and `mocks` deep-equal to the input but a different object (setting `result.mocks.lookup[0].output.status` to `"x"` leaves the input unchanged); the last passes because a block the catalogue lacks is not schema-checked, and `route`, `done` and `rejected` need no mock

#### Scenario: Each problem reason, ordering and the cap
- **WHEN** `checkMocks(FLOW, payOnceCatalogue(), m)` runs for `m` equal to, each alone: `{}`; `{ lookup: [], pay: [{ output: PAID }] }`; `JSON.parse('{"lookup":[{"output":{"vendor_id":"v1","status":"active"}}],"pay":[{"output":{"payment_id":"pay-1","status":"paid"}}],"ghost":[],"route":[],"__proto__":[]}')`; `{ lookup: [{ output: { status: "active" } }], pay: [{ output: PAID }] }`; `{ lookup: "x", pay: [{ output: PAID, error: { code: "E", message: "m" } }, { error: { code: "bad code", message: "m" } }, 5] }`; `[]`; `null`; and `lookup` holding 51 entries `{ output: {} }` with a valid `pay`
- **THEN** `mocks` is `null` each time and the problems, as `nodeId index reason`, ordered by `nodeId` (UTF-16 order) then `index` (`null` first), are: `lookup null missing`, `pay null missing`; `lookup null missing`; `__proto__ null unknown_node`, `ghost null unknown_node`, `route null not_a_block`; `lookup 0 schema` with `detail` `/ required` (and no `active` in it); `lookup null shape`, `pay 0 shape`, `pay 1 shape`, `pay 2 shape`; one `"" null shape` for `[]` and for `null`; and exactly 50 problems `lookup 0 schema` to `lookup 49 schema`

### Requirement: The mock invoker answers from the mocks and nothing else
`createMockInvoker` SHALL answer the entry at index `ctx.attempt - 1` of the node's list as a fresh copy and fail with `INTERPRETER_TOOL_FAILED` for an error entry, a missing node or an exhausted list; `testRunInvokers` SHALL give an invoker over the mocks stored with the run in mode `mock` and refuse every other mode with `INTERPRETER_NO_INVOKER`.

#### Scenario: Entries by attempt, errors and no egress
- **WHEN** `createMockInvoker({ lookup: [{ output: LOOKUP_OK }], pay: [{ error: { code: "E_DOWN", message: "secret-text" } }, { output: PAID }] })` is invoked with `globalThis.fetch` replaced by a recorder: `lookup` twice (the first result mutated), `pay` with `attempt` 1, 2 and 3, and node `ghost`
- **THEN** both `lookup` calls resolve `{ output: LOOKUP_OK }`; `pay` attempt 1 rejects `InterpreterError` `INTERPRETER_TOOL_FAILED` with `node` `pay`, `details` `{ reason: "mock_error", mockCode: "E_DOWN" }` and a message without `secret-text`; attempt 2 resolves `{ output: PAID }`; attempt 3 rejects with `details.reason` `mock_exhausted`; `ghost` rejects with `details.reason` `mock_missing`; the recorder saw no call

#### Scenario: Mocks come from the stored run, in mock mode only
- **WHEN** on `createMemoryRunStore()` tenant A holds `r_1` (mode `mock`, mocks `MOCKS`) and `r_2` (mocks `null`), and `f = testRunInvokers(store)`: `f("mock", r_1)` is invoked for `lookup` and for `pay` (attempt 1) with tenant A; `f("live", r_1)` and `f("stub", r_1)` are awaited; `f("mock", r_2)` is invoked for `lookup` with tenant A, and `f("mock", r_1)` for `lookup` with tenant B
- **THEN** the first two invocations resolve `{ output: LOOKUP_OK }` and `{ output: PAID }`; the `live` and `stub` calls reject `INTERPRETER_NO_INVOKER`; the last two invocations reject `INTERPRETER_TOOL_FAILED` with `details.reason` `mocks_unavailable`

### Requirement: A stored version is loaded for a test run
`registryVersionLoader` SHALL answer the `LoadedVersion` of a flow version in the caller's tenant, with its state, the flow's owner team and its canonical document, and `null` for anything else.

#### Scenario: Validated, draft and absent versions
- **WHEN** after `seedMockRunFlows`, `registryVersionLoader(db.appPool)` is called with tenant A for `pay-once` and the validated hash, the draft hash, `"sha256:" + "0".repeat(64)`, `"sha256:xyz"`, and for flow `ghost`; and with tenant B for the validated hash
- **THEN** the first is `{ flowId: "pay-once", hash: <validated>, state: "validated", ownerTeam: "finance", flow }` with `flow` deep-equal to `version.canonical` of `getVersion` and `flow.start` `lookup`; the second has `state` `draft`; the other four answers are `null`

### Requirement: The test endpoint starts a mock run as the requesting user
`POST /api/v1/flows/{flowId}/versions/{hash}/test` SHALL, for a valid body `{ input, mocks }` from an author of the flow's owner team, store a `queued` run in mode `mock` owned by that team and initiated by the caller, enqueue it, and answer 202 `{ run }`; with an `Idempotency-Key` a repeat SHALL answer the same run.

#### Scenario: A mock run from request to completion
- **WHEN** alice (author, `finance`) posts `{ input: PAY_ONCE_INPUT, mocks: MOCKS }` to the validated `pay-once` version, with a recording `enqueue` and `globalThis.fetch` replaced by a recorder; then `executeRun(memoryWorkflowOps(runId), deps, T_A, runId)` runs
- **THEN** the answer is 202 with exactly the key `run`, equal to `toRunView` of the stored run: `id` `run_00000000-0000-7000-8000-000000000000`, `flowId` `pay-once`, `flowHash` the validated hash, `mode` `mock`, `trigger` `test`, `state` `queued`, `ownerTeam` `finance`, `principal` `{ userId: <alice>, kind: "human" }`, `inputRef` `payloadDigest(PAY_ONCE_INPUT)`; the stored run has `mocksRef` `payloadDigest(MOCKS)` and `actorChain` `[<alice>]`; `enqueue` got `("ursitoare.run", workflowIdOf("tenant_a", <id>), { tenantId: "tenant_a", reviewProfile: T_A.reviewProfile, runId: <id> })`; after `executeRun` the run is `completed` with `terminalNode` `done`, its step `lookup` output payload is `LOOKUP_OK` and `pay` is `PAID`, `getIntent` for `idemKey("tenant_a", <id>, "pay", 0)` is `done` with `mode` `mock` and tool `erp.create_payment@1`, there is none for `lookup`, every step row has `policyDecisionId` `null`, `getVersion` still shows state `validated`, and the fetch recorder saw no call

#### Scenario: Idempotency-Key replays the same run
- **WHEN** alice posts the body of the previous scenario with `Idempotency-Key` `k-1` twice, then with `k-1` and `PAID` replaced by `{ payment_id: "pay-2", status: "paid" }` in `mocks.pay`, then with `k-2`
- **THEN** the first two answer 202 with the same `run.id` (`...000000`), the second with header `idempotent-replayed: true`, and `enqueue` got identical arguments twice, both with workflow id `workflowIdOf("tenant_a", <id>)`; the third answers 422 `IDEMPOTENCY_KEY_REUSED`; the fourth answers 202 with `run.id` `run_00000000-0000-7000-8000-000000000001`; the owner pool counts two `run` rows

### Requirement: The test endpoint refuses what it cannot run
The endpoint SHALL answer 401, 403 `CSRF_INVALID`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 400 `VALIDATION_FAILED`, 422 `OPERATION_REFUSED`, 422 `TEST_MOCK_MISSING`, 422 `TEST_MOCK_INVALID` and 503 `RUNS_UNAVAILABLE` as specified; a refusal made before `startRun` stores no run, and when `startRun` has stored the run and the enqueue then fails, the answer is 503 `RUNS_UNAVAILABLE` and that run is left `failed`.

#### Scenario: Who may test which flow
- **WHEN** after `seedMockRunFlows`, a valid body is posted to the validated version by bob (approver, `finance`), dave (author, `ops`), carol (`tenant_admin`, no team) and mallory (tenant B, author `finance`); and by alice with no cookie, with no `x-csrf-token`, for flow `nope`, for hash `"sha256:" + "0".repeat(64)`, and for hash `sha256:xyz`
- **THEN** bob, dave and carol get 403 `FORBIDDEN` with a string `details.decisionId`; mallory 404 `NOT_FOUND`; alice 401 `UNAUTHENTICATED`, 403 `CSRF_INVALID`, 404 `NOT_FOUND`, 404 `NOT_FOUND`, then 400 `VALIDATION_FAILED`; the owner pool counts no `run` row and `enqueue` was never called

#### Scenario: Versions, bodies, mocks and a runtime that is down
- **WHEN** alice posts: the draft version with `MOCKS`; the `llm` version of `rf-1-core` with its four mocks and input `{ invoice_id: "inv-1" }`; the validated version with input `{ vendor: "Acme" }`, with no `mocks`, with `mocks: []`, with an extra property `x`, with `PAY_ONCE_INPUT` whose `vendor` is `"a\u0000b"`, with `mocks: {}`, and with `lookup: [{ output: { status: "active" } }]`; then with `enqueue` rejecting `new Error("down")`; then on a server whose `interpreter` is `null`, and on one whose interpreter deps have `durable: null`
- **THEN** the answers are 422 `OPERATION_REFUSED` with `details` `{ reason: "version_not_runnable", cause: "draft" }`; 422 `OPERATION_REFUSED` with `details` `{ reason: "kind_unsupported", kinds: ["code", "llm.decide", "llm.extract"] }`; 400 `VALIDATION_FAILED` five times, the first with `details.fields` `[{ field: "body/input", message: "must satisfy the flow inputs (/ required)" }]`, the last with `details.fields` `[{ field: "body", message: "must be plain JSON of at most 1 MiB" }]`; 422 `TEST_MOCK_MISSING` with message `A block node has no mock` and `details.nodes` `["lookup", "pay"]`; 422 `TEST_MOCK_INVALID` with message `A mock does not fit its node` and `details.problems` `[{ nodeId: "lookup", index: 0, reason: "schema", detail: "/ required" }]`; 503 `RUNS_UNAVAILABLE` with a body lacking `down` and one stored run `failed` with `error.code` `INTERPRETER_UNBOUND`; 503 `RUNS_UNAVAILABLE` for each of the last two servers; no refusal before the `enqueue` case stored a run

### Requirement: test_flow is granted to authors of the owner team
`src/interpreter/policy/flow-testing.cedar` SHALL hold exactly two policies: `test_flow` on a `Flow` for a principal with the role `author` who is a member of its owner team (`interpreter-test-flow-author-owner-team`), and `test_flow` on the `Tenant` for any `author` (`interpreter-test-flow-capability`).

#### Scenario: The policy table
- **WHEN** the engine loads `defaultSrcDir()` and decides `test_flow` on a `Flow` of `tenant_a` owned by `finance` (`reviewed` false) and on the `Tenant` `tenant_a` for alice (author, `finance`), bob (approver, `finance`), dave (author, `ops`), carol (`tenant_admin`, no team) and a `tenant_b` principal (author, `finance`)
- **THEN** every decision has `errors` `[]`; on the `Flow` only alice is allowed; on the `Tenant` alice and dave are allowed and bob, carol and the `tenant_b` principal denied; the loaded ids starting with `interpreter-` are exactly the two above, sorted

### Requirement: The engine binds the interpreter before it launches the runtime
`main` SHALL call `registerRunWorkflow` and then `bindInterpreter` with `durable: null` before `launchDurable`, which U30 calls after the routes that need no runtime and before the listener binds, and SHALL register the endpoint after the launch and before the listener binds, with the launched runtime, or with `interpreter: null` when none was launched.

#### Scenario: Bind order, the route table and a run on DBOS
- **WHEN** `main` starts with no database and `inspectServers`, and `docs/api/openapi.json` is parsed; then starts with `openDatabase` returning `{ appPool: db.appPool, close }`, `database.app` `db.appEndpoint`, role `all`, wrappers around `registerRunWorkflow`, `bindInterpreter` and the real `launchDurable` that append their names to `order` (the last also keeps the runtime it returns), and alice posts the validated version with `MOCKS` and `PAY_ONCE_INPUT` and `waitForRun` resolves
- **THEN** the first server defines `POST /api/v1/flows/:flowId/versions/:hash/test` with action `test_flow`, auth `session` and `errors` containing `RUNS_UNAVAILABLE`, `TEST_MOCK_INVALID`, `TEST_MOCK_MISSING`, `OPERATION_REFUSED`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS`, `NOT_FOUND` and `VALIDATION_FAILED`; `unregisteredRouteErrors` over its routes is `[]`; the document holds the path `/api/v1/flows/{flowId}/versions/{hash}/test`; in the second run `order` is exactly `["registerRunWorkflow", "bindInterpreter", "launchDurable"]`, the deps given to `bindInterpreter` have `durable` `null`, the answer is 202, the run becomes `completed` with `terminalNode` `done` and its `pay` intent is `done` with mode `mock`, the kept runtime's `status(workflowIdOf("tenant_a", <id>))` is `SUCCESS` (the endpoint answered at once after `main` resolved, with the launched runtime); `invokerFor("live", run)` and `invokerFor("stub", run)` of the deps given to `bindInterpreter` reject `INTERPRETER_NO_INVOKER`
