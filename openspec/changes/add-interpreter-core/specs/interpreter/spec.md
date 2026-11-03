## Purpose

The interpreter walks a stored flow version as one durable run: references over recorded outputs, tools only through an invoker and an effect gate, one numbered step row per node visit, on DBOS or in memory.

## ADDED Requirements

### Requirement: Node runtimes are registered once per kind
`registerNodeRuntime` SHALL register one runtime per `NodeKind` and refuse a second one or one without `execute`; `block`, `end`, `switch` and `wait` SHALL be built in.

#### Scenario: Built-in kinds and registration rules
- **WHEN** `nodeRuntimeFor` gets each of the 14 `NODE_KINDS` and `"constructor"`; then, with `RT = { execute: async () => OUTCOME }` (any outcome), `registerNodeRuntime` gets `("block", RT)`, `("human.form", {})`, `("nope", RT)`, `("human.form", RT)` and `("human.form", RT)` again
- **THEN** `SUPPORTED_KINDS` deep-equals `["block", "end", "switch", "wait"]`; the lookups return a runtime with a function `execute` for exactly those four kinds, `undefined` otherwise; the calls throw `InterpreterError` with `code` and `details.kind`: `NODE_RUNTIME_DUPLICATE` `block`, `NODE_RUNTIME_INVALID` `human.form` and `nope`; the fourth returns, then `nodeRuntimeFor("human.form") === RT`; the fifth throws `NODE_RUNTIME_DUPLICATE`

### Requirement: Values resolve over recorded outputs
`resolveValue` SHALL replace each `${{ }}` reference by the value it names in the run inputs and recorded node results (type kept for a string that is one reference, stringified inside a longer string) and refuse an unresolved one with `INTERPRETER_REF_UNRESOLVED`.

#### Scenario: References, templates and unresolved paths
- **WHEN** with `SCOPE` (test-plan.md) `resolveValue` gets `"${{ inputs.invoice.total }}"`, `"${{ nodes.lookup.output.nested }}"` (then mutated), `"Pay ${{ inputs.invoice.id }}: ${{ inputs.invoice.total }} ${{ nodes.lookup.output.nested }}"`, `"${{ nodes.route.outcome }}"`, `{ a: ["${{ inputs.none }}", "plain", 7] }` and `JSON.parse('{"__proto__":"${{ inputs.invoice.id }}","ok":1}')`; each alone: `"${{ inputs.missing }}"`, `"${{ inputs.invoice.tags.0 }}"`, `"${{ inputs.invoice.id.length }}"`, `"${{ inputs.invoice.constructor }}"`, `"${{ nodes.route.output.x }}"`, `"${{ nodes.lookup.outcome }}"`, `"${{ inputs.invoice.id"`
- **THEN** the results are `120`, `{ k: 1 }` (the scope's copy unchanged), `Pay inv-1: 120 {"k":1}`, `active`, `{ a: [null, "plain", 7] }` and an object with own keys `["__proto__", "ok"]`, `__proto__` `"inv-1"` and prototype `Object.prototype`; the seven refusals throw `InterpreterError` `INTERPRETER_REF_UNRESOLVED`; the first has `details.ref` `inputs.missing`; the `id.length` one lacks `inv-1`

### Requirement: Switch and end nodes finish without a tool
The `switch` runtime SHALL answer the successor of the case whose own key equals `on` (a number or boolean through `String`, any other value matches none), else `default`, with outcome the key or `default`; the `end` runtime SHALL answer `end.status` and the resolved `output` (`null` when absent).

#### Scenario: Switch cases and end outputs through the conformance kit
- **WHEN** `runConformance("switch", nodeRuntimeFor("switch"), cases)` gets the node `{ kind: "switch", on: "${{ inputs.k }}", cases: { "2": "two", gold: "g", "true": "yes" }, default: "dflt" }` with `inputs.k` `2`, `"gold"`, `true`, `null`, `{ a: 1 }`, `"constructor"` and with `inputs` `{}`; and `runConformance("end", nodeRuntimeFor("end"), cases)` gets `{ kind: "end", status: "completed", output: { id: "${{ inputs.k }}" } }` with `k` `"gold"`, `{ kind: "end", status: "completed" }` and `{ kind: "end", status: "failed" }`
- **THEN** every result has `ok: true` for these expectations: switch `{ output: null, outcome: "2", next: "two", end: null }`, `outcome: "gold"` with `next: "g"`, `outcome: "true"` with `next: "yes"`, `outcome: "default"` with `next: "dflt"` for the next three, error `INTERPRETER_REF_UNRESOLVED` for empty `inputs`; end `{ output: { id: "gold" }, outcome: null, next: null, end: { status: "completed" } }`, the same with `output: null`, and `end: { status: "failed" }` with `output: null`

### Requirement: A block calls its tool through the invoker
The `block` runtime SHALL check the resolved `with` against the block's `input` schema, call `ToolInvoker.invoke` once with `{ tool, args, nodeId, effectSeq: 0 }` and the `StepContext`, check the result against `output`, and map an invoker rejection to `INTERPRETER_TOOL_FAILED` without its message.

#### Scenario: A read block, with schema and tool failures
- **WHEN** the `block` runtime executes node `lookup` (`uses` `erp.lookup_vendor@1`, `with` `{ vendor_name: "${{ inputs.vendor }}" }`, `next` `route`) with `CTX("lookup")`, `inputs.vendor` `"Acme"`, a recording invoker answering `{ output: LOOKUP_OK }` and a recording gate; then, each alone, `inputs.vendor` `5`, an invoker answering `{ output: { status: "active" } }`, one rejecting `new Error("db password=hunter2")`, and `services.block` answering `undefined`
- **THEN** the first returns `{ output: LOOKUP_OK, outcome: null, next: "route", end: null }`, `executed` is `["lookup"]`, the invoker got one call, `deepEqual` to `{ call: { tool: "erp.lookup_vendor@1", args: { vendor_name: "Acme" }, nodeId: "lookup", effectSeq: 0 }, ctx: CTX("lookup") }`, the gate was not called; the others reject with `node` `lookup` and `INTERPRETER_INPUT_INVALID` (no invoker call), `INTERPRETER_OUTPUT_INVALID`, `INTERPRETER_TOOL_FAILED` with a message lacking `hunter2`, `INTERPRETER_VERSION_NOT_RUNNABLE`

### Requirement: An effectful block runs inside the effect gate in every mode
For a block whose effect is not `read`, the `block` runtime SHALL call `EffectGate.before` in the step named after the node, invoke the tool only on the decision `invoke`, call `EffectGate.after` in the step `<node>#done`, and fail with `INTERPRETER_EFFECT_UNKNOWN` on `unknown`.

#### Scenario: Gate order, decisions and failures
- **WHEN** node `pay` (`uses` `erp.create_payment@1`, `next` `done`, resolved args `PAY_ARGS`) runs with context `CTX` on `ops` that tag each log entry with the running step's name, with a logging gate and invoker: in mode `mock` with the decision `{ action: "invoke", idemKey: "ik_1" }` and output `PAID`; in mode `live` with `{ action: "reuse", idemKey: "ik_1", result: { output: { payment_id: "pay-0", status: "paid" } } }`; with `{ action: "unknown", idemKey: "ik_1" }`; with `NO_EFFECT_GATE`; and, with `invoke`, an invoker answering `{ output: { payment_id: "p" } }` and one rejecting `new Error("boom")`
- **THEN** with `CALL` the `ToolCall` of `pay`: the first logs exactly `pay: before(CALL, CTX)`, `pay: invoke(CALL, CTX + idemKey ik_1)`, `pay#done: after(CALL, CTX + idemKey ik_1, { output: PAID })`, returns `PAID` with `next: "done"`, `executed` `["pay", "pay#done"]`; the second logs `before`, `after` with the reused result, no `invoke`, returns `pay-0`; the third rejects `INTERPRETER_EFFECT_UNKNOWN` (`node` `pay`), logs only `before`, `executed` `["pay"]`; the fourth succeeds with `idemKey: null` in the invoker's context; the invalid output logs `after`, then rejects `INTERPRETER_OUTPUT_INVALID`; the rejecting invoker gives `INTERPRETER_TOOL_FAILED` and no `after`

### Requirement: A wait sleeps in live mode and is skipped in mock mode
The `wait` runtime SHALL sleep through `WorkflowOps.sleep` in chunks of at most 86,400,000 ms in modes `live` and `stub`, and in mode `mock` not sleep and answer outcome `skipped`; `durationMs` SHALL convert weeks, days, hours, minutes and seconds (decimals only on seconds) to milliseconds and refuse other text, a duration over 366 days (31,622,400,000 ms) and any non-finite result with `INTERPRETER_INPUT_INVALID`.

#### Scenario: Sleeping, skipping and parsing durations
- **WHEN** `durationMs` gets `PT0S`, `PT1.5S`, `PT90M`, `P1W`, `P1DT2H3M4S`, `P366D` and, each alone, `P1Y`, `PT1.5H`, `PT1H1`, the empty string, `P`, `pt1h`, `P367D`, `PT31622400.001S`, `P` + 400 `9`s + `D`; the `wait` runtime (node id `w`, `next` `after`) executes `P2DT1H` in mode `live`, `PT90M` in `mock` and in `stub`, `PT0S` in `live`, and `P1Y` in `mock`, each on fresh `memoryWorkflowOps`
- **THEN** the conversions are `0`, `1500`, `5400000`, `604800000`, `93784000`, `31622400000`; the refusals throw `INTERPRETER_INPUT_INVALID` with `details.field` `duration`, and the last three also `details.reason` `duration_too_large`; `live` gives `slept` `[86400000, 86400000, 3600000]` and `{ output: null, outcome: null, next: "after", end: null }`; `mock` gives `slept` `[]` and `outcome: "skipped"`; `stub` gives `slept` `[5400000]` and `outcome: null`; `PT0S` gives `slept` `[]`; each success has `executed` `["w", "w#wake"]`, and `P1Y` in `mock` rejects with `executed` `["w"]`

### Requirement: A run records one numbered row per node visit
`executeRun` SHALL move a `queued` run to `running`, visit nodes from `start` writing one `step_execution` row per visit with `seq` 0, 1, 2 in visit order, and finish the run at an `end` node, in steps `run:load`, `run:start`, the node ids and `run:finish`; a replay SHALL reuse the numbers and call nothing already recorded.

#### Scenario: A run walks block, switch, block and end
- **WHEN** `startRun` (with `durable: null`, mode `mock`, `runId` `r_1`) and then `executeRun` on tagged `memoryWorkflowOps("r_1")` run flow `pay-once` (test-plan.md) with an invoker answering `LOOKUP_OK` then `PAID`, a gate answering `{ action: "invoke", idemKey: "ik_pay_1" }`, `erp.create_payment@1` `unsafe_to_retry: true`
- **THEN** the result is the stored run: `completed`, `terminalNode` `done`, `outputRef` `payloadDigest({ payment_id: "pay-1" })`, `startedAt` and `endedAt` `2026-11-02T10:00:00.000000Z`; `executed` is `["run:load", "run:start", "lookup", "route", "pay", "pay#done", "done", "run:finish"]`; `invokerFor` got `("mock", run)` once; `listSteps` gives the four rows of `PAY_ROWS`; the invoker's contexts are `CTX("lookup")` and `CTX("pay")` with `effect` `pay`, `unsafeToRetry` true, `idemKey` `ik_pay_1`

#### Scenario: Replay reuses the numbers and the recorded results
- **WHEN** the previous run captured every `runStep` result as `V` (eight values); `executeRun` runs again on the same store over `memoryWorkflowOps("r_1", V.slice(0, 4))` with fresh recording fakes, and over `memoryWorkflowOps("r_1", V)`
- **THEN** the four-value replay has `executed` `["pay", "pay#done", "done", "run:finish"]`, one fresh invoker call (`pay`), `listSteps` `deepEqual` to `PAY_ROWS` (`seq` 0 to 3) and returns the completed run; the eight-value replay executes nothing, calls neither invoker nor gate, keeps the rows and returns the recorded final run

### Requirement: A failing run ends failed with a RunError and leaks nothing
`executeRun` SHALL end a run `failed` with `error` `{ code, message, node }` when a node fails, an invoker is missing or a node is visited twice, store a failed visit as a `failed` row, keep raw tool errors out of every stored value, and run nothing for a terminal run.

#### Scenario: Node failures
- **WHEN** `executeRun` runs `pay-po` (`INPUT` lacks `po_number`); `pay-once` with the lookup invoker rejecting `new Error("connect failed password=hunter2")`; `pay-once` with a lookup answering `{ vendor_id: "v2", status: "blocked" }` (ending at the failing end `rejected`); `pay-once` with the gate answering `{ action: "unknown", idemKey: "ik_pay_1" }`
- **THEN** each run is `failed`; `error.code`, `error.node` (also `terminalNode`) are `INTERPRETER_REF_UNRESOLVED` (message containing `inputs.po_number`), `pay`, with rows `lookup` and `route` `completed` and `pay` `failed` with that error and `inputRef` null, one invoker call, no gate call; `INTERPRETER_TOOL_FAILED`, `lookup`, and `JSON.stringify` of the run and its rows lacks `hunter2`; `FLOW_FAILED`, `rejected`, three rows, the last `failed` with that error, `outputRef` null; `INTERPRETER_EFFECT_UNKNOWN`, `pay`, the `pay` row `failed` with `idemKey` `ik_pay_1`, no `pay` invoker call, no `after`, no `pay#done` step

#### Scenario: Run-level failures and nothing to do
- **WHEN** `executeRun` runs: version `spin`; `pay-nonext`; with `invokerFor` rejecting `new Error("no gateway")`; with `loadVersion` answering `null`, rejecting `new Error("db down")`, and `catalogueFor` rejecting `new Error("cat down")`; as `T_B` for `T_A`'s completed run `r_1`; and again as `T_A`
- **THEN** the runs fail with `INTERPRETER_LOOP_LIMIT` at `spin` (one `completed` row), `NODE_RUNTIME_INVALID` at `lookup` (row `failed`), `INTERPRETER_NO_INVOKER` with `node` null and no rows (`executed` `["run:load", "run:start", "run:finish"]`), `INTERPRETER_VERSION_NOT_FOUND` (`executed` `["run:load", "run:finish"]`), and for the rejections that code with a message containing `load_failed` or `catalogue_failed` (not the error text), record `failed`; `T_B`'s call rejects `InterpreterError` `INTERPRETER_VERSION_NOT_FOUND` with `details.reason` `run_missing`, `executed` `["run:load"]`, and `T_A`'s run is unchanged; the completed run is returned `deepEqual` to the stored record with `executed` `["run:load"]` and no invoker call

### Requirement: A run starts only by registry id and hash
`startRun` SHALL load the version through `loadVersion`, refuse a missing, `draft`, unsupported-kind, unknown-block or ill-typed-input start, or a load rejection, without storing a run, store a `queued` run owned by the version's team, enqueue `ursitoare.run` under the run id, and answer the stored run for a known id.

#### Scenario: Refusals, enqueue and idempotence
- **WHEN** `startRun` gets, each alone with a recording `enqueue`: an unknown flow id; `pay-draft`; `rf-1-core`; `pay-missing`; `pay-once` with input `{ vendor: "Acme" }`; `pay-once` with `runId` `_bad`; then `pay-once` with `runId` `r_7` and `mocks: { lookup: {} }`, twice (the second with another valid input), once with no `runId` under `sequentialIds(0)`, once with `durable: null`, and once with `enqueue` rejecting `new Error("down")`, and with `loadVersion` and `catalogueFor` each rejecting
- **THEN** the refusals throw `InterpreterError` `INTERPRETER_VERSION_NOT_FOUND`; `INTERPRETER_VERSION_NOT_RUNNABLE` with `details.reason` `draft`; `INTERPRETER_KIND_UNSUPPORTED` with `details.kinds` `["code", "llm.decide", "llm.extract"]`; `INTERPRETER_VERSION_NOT_RUNNABLE` with `details.reason` `block_missing`, `details.blocks` `["erp.unknown@1"]`; `INTERPRETER_INPUT_INVALID` with `details.path` `/`; `INTERPRETER_INPUT_INVALID` with `details.field` `runId`; none stores a run or calls `enqueue`, and the two rejections reject with the same error object; the `r_7` call returns the run `queued` with `lineageId` `r_7`, `ownerTeam` `finance`, `trigger` `test`, `inputRef` and `mocksRef` the digests of input and mocks, and `enqueue` got `("ursitoare.run", "r_7", { tenantId: "tenant_a", reviewProfile: "solo", runId: "r_7" })`; the second returns a `deepEqual` record and `enqueue` got the same arguments again; no-id returns `runId` `run_00000000-0000-7000-8000-000000000000`; `durable: null` enqueues nothing; the rejecting enqueue makes `startRun` throw `INTERPRETER_UNBOUND`, leaving the run `failed` with that code and a message without `down`

### Requirement: The run workflow is durable
`registerRunWorkflow` SHALL register `ursitoare.run` once, `bindInterpreter` SHALL give it its dependencies, and `dbosWorkflowOps` SHALL run `executeRun` on U30's `runStep`, `durableSleep` and `currentWorkflowId`, so that a started run completes on a database; input whose `tenantId`, `runId` or `reviewProfile` is malformed (a tenant id, U31's run id grammar, `solo` or `team`) SHALL end the workflow `ERROR` with `INTERPRETER_INPUT_INVALID` and `details.reason` `workflow_input`, without reading or changing run data.

#### Scenario: A run on DBOS
- **WHEN** on `withTestDatabase()` and tenant A of `seedTwoTenants(db)`, `registerRunWorkflow()` runs twice, `bindInterpreter` gets deps over `createRunStore(db.appPool)`, `durable: null`, the test-plan.md fixtures, `NO_EFFECT_GATE`, `launchDurable({ endpoint: db.appEndpoint, logger, stepObserver })` resolves; `startRun` with it as `durable` starts `r_dbos_1` (`INPUT`, mode `mock`); `waitForRun` resolves; then `rt.enqueue(RUN_WORKFLOW, "w_bad", { tenantId: "x", runId: "../r", reviewProfile: "other" })`; `rt.status` is polled for both
- **THEN** `r_dbos_1` is `completed`, its observer `after` calls for `r_dbos_1` are `run:load`, `run:start`, `lookup`, `route`, `pay`, `pay#done`, `done`, `run:finish`, and its rows have `seq` 0 to 3; it ends `SUCCESS`; `w_bad` ends `ERROR` and the `run` and `step_execution` rows of tenant A are unchanged; the second `registerRunWorkflow()` threw nothing

### Requirement: The conformance kit and waitForRun support the tests
`runConformance` SHALL run each case with memory ops and report `{ name, ok, detail }` in case order, `ok` false with a `detail` on a wrong outcome, a wrong or missing error or an unexpected error; `waitForRun` SHALL resolve once the run's state is listed and reject at the timeout.

#### Scenario: Kit verdicts and a bounded wait
- **WHEN** `runConformance("switch", R, cases)` runs a local `R` that resolves `node.on` through `services.resolve` and answers `{ output: null, outcome: "a", next: "x", end: null }` on five cases expecting: that outcome; `next` `d`; error `INTERPRETER_REF_UNRESOLVED` on a resolving scope; that error on an empty scope; `INTERPRETER_INPUT_INVALID` on an empty scope; then a runtime throwing `new Error("boom")` expecting an outcome; `waitForRun` on a `queued` run with `["completed"]` and timeout 100, and on another run which the test transitions to `completed`
- **THEN** the verdicts are `ok` true, false (`detail` containing `x` and `d`), false (containing `INTERPRETER_REF_UNRESOLVED`), true, false (containing both codes), false (starting `unexpected error`); the first wait rejects with a message containing the run id and `queued`; the second resolves a record with `state` `completed`
