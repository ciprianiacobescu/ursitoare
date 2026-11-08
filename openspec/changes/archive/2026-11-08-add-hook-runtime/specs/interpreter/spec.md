## MODIFIED Requirements

### Requirement: A run records one numbered row per node visit
`executeRun` SHALL move a `queued` run to `running`, visit nodes from `start` writing one `step_execution` row per node visit attempt (one attempt unless a post-hook retries) with `seq` 0, 1, 2 in row order, and finish the run at an `end` node, in steps `run:load`, `run:start`, the steps of each node (its id, `<id>#done`, `<id>#wake`, a hook step `<node>:<phase>:<label>` and, for an effectful block hook, `<node>:<phase>:<label>#done`, and `:r<attempt>` appended for a retried attempt) and `run:finish`; a replay SHALL reuse the numbers and call nothing already recorded.

#### Scenario: A run walks block, switch, block and end
- **WHEN** `startRun` (with `durable: null`, mode `mock`, `runId` `r_1`) and then `executeRun` on tagged `memoryWorkflowOps("r_1")` run flow `pay-once` (test-plan.md) with an invoker answering `LOOKUP_OK` then `PAID`, a gate answering `{ action: "invoke", idemKey: "ik_pay_1" }`, `erp.create_payment@1` `unsafe_to_retry: true`
- **THEN** the result is the stored run: `completed`, `terminalNode` `done`, `outputRef` `payloadDigest({ payment_id: "pay-1" })`, `startedAt` and `endedAt` `2026-11-02T10:00:00.000000Z`; `executed` is `["run:load", "run:start", "lookup", "route", "pay", "pay#done", "done", "run:finish"]`; `invokerFor` got `("mock", run)` once; `listSteps` gives the four rows of `PAY_ROWS`; the invoker's contexts are `CTX("lookup")` and `CTX("pay")` with `effect` `pay`, `unsafeToRetry` true, `idemKey` `ik_pay_1`

#### Scenario: Replay reuses the numbers and the recorded results
- **WHEN** the previous run captured every `runStep` result as `V` (eight values); `executeRun` runs again on the same store over `memoryWorkflowOps("r_1", V.slice(0, 4))` with fresh recording fakes, and over `memoryWorkflowOps("r_1", V)`
- **THEN** the four-value replay has `executed` `["pay", "pay#done", "done", "run:finish"]`, one fresh invoker call (`pay`), `listSteps` `deepEqual` to `PAY_ROWS` (`seq` 0 to 3) and returns the completed run; the eight-value replay executes nothing, calls neither invoker nor gate, keeps the rows and returns the recorded final run
