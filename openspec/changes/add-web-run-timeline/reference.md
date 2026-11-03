## Fixtures

`D(c)` is `c.repeat(64)`. `RUN` = `{ id: "run_1", flowId: "demo-pay", flowHash: "sha256:" + D("a"), mode: "mock", trigger: "test", state: "completed", ownerTeam: "finance", principal: { userId: "u_alice", kind: "human" }, terminalNode: "done", error: null, inputRef: D("b"), outputRef: D("c"), createdAt: "2026-11-02T10:00:00.000000Z", startedAt: "2026-11-02T10:00:01.000000Z", endedAt: "2026-11-02T10:00:02.000000Z" }`. `RUN_QUEUED` is `RUN` with `state` `queued` and `terminalNode`, `outputRef`, `startedAt`, `endedAt` null.

`STEP(seq, nodeId, kind, over)` = `{ seq, nodeId, kind, effectSeq: 0, attempt: 1, state: "completed", outcome: null, error: null, inputRef: null, outputRef: null, idemKey: null, policyDecisionId: null, taint: [], startedAt: "2026-11-02T10:00:01.000000Z", endedAt: "2026-11-02T10:00:01.500000Z", ...over }`. `STEPS` = `STEP(0, "lookup", "block", { inputRef: D("1"), outputRef: D("2") })`, `STEP(1, "route", "switch", { outcome: "active" })`, `STEP(2, "pay", "block", { inputRef: D("3"), outputRef: D("4"), idemKey: "ik1_" + D("d"), taint: ["untrusted"] })`, `STEP(3, "done", "end", {})`.

`PAY_ROWS` (rows of `STEPS[2]` with `"completed"`, each `{ term, value, href: null }`): Node `pay`, Kind `block`, State `completed`, Outcome `none`, Started `2026-11-02T10:00:01.000000Z`, Ended `2026-11-02T10:00:01.500000Z`, Effect sequence `0`, Attempt `1`, Idempotency key `"ik1_" + D("d")`, Taint `untrusted`.

`PAY_FAILED_TAIL` (end of the rows of the failed `pay` step of the timeline scenario): Idempotency key `none`, Taint `none`, `{ term: "Error", value: "E_X: failed", href: null }` and `{ term: "Decision", value: "dec_1", href: "/api/v1/policy-decisions?decision_id=dec_1" }`.

`BAD_RENDERERS`: `kind` `"Bad Kind"`, `""` and 41 times `"k"`; `label: "x"`; no `details`; `null`; the string `"block"`. `INPUT` = `{ vendor_name: "ACME", amount: 12.5 }`; `MOCKS` = `{ lookup: [{ output: { vendor_id: "V-1", status: "active" } }], pay: [{ output: { payment_id: "P-1", status: "created" } }] }`; `INPUT_TEXT`, `MOCKS_TEXT` are their `JSON.stringify`. `V` is a `VersionRow` of `demo-pay`, `number` 2.

## Journey flow

`DEMO_PAY` (a constant in both journeys) validates with 0 errors and 0 warnings against `test/support/catalogue/blocks.v0.json` (`validateFlowText`, main@e06fdb3).

```yaml
ursitoare: "0.1"
flow: demo-pay
version: 1.0.0
inputs:
  type: object
  properties:
    vendor_name: { type: string }
    amount: { type: number }
  required: [vendor_name, amount]
start: lookup
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: route }
  route: { kind: switch, on: "${{ nodes.lookup.output.status }}", cases: { active: pay }, default: blocked }
  pay:
    kind: block
    uses: erp.create_payment@1
    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }
  blocked: { kind: end, status: failed }
```

## Failures

`E500` is `ApiRequestError(500, "INTERNAL", "m")`; `E403` is `ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "d-1" } })`, `SNAP` is `{ run: { ...RUN, state: "running" }, steps: STEPS, truncated: false }`. `NOT_FOUND_VIEW` is `{ model: { code: "NOT_FOUND", status: 404, title: "Not found", message: "That item does not exist, or you cannot see it.", decisionId: null }, retryLabel: "Try again" }` (the kit's `errorPanelModel` of a 404 `NOT_FOUND`).

| Case | Outcome |
|---|---|
| `followRun` whose first `/runs/run_1` answer rejects `E500`; then a second `followRun` (restart) on a client answering `completed` | the first rejects with `E500`, `onUpdate` not called; the restart resolves with the `completed` snapshot |
| `followRun` on a client answering `E403` | rejects with `E403`; the client was asked `/runs/run_1` once (no restart by itself); `failureView(E403)` is `{ model: errorPanelModel(E403), retryLabel: "Try again" }` with code `FORBIDDEN`, status 403, title "Not allowed" and `decisionId` "d-1", shown by the `ErrorPanel` as "Decision id: d-1" |
| `followRun` on a working client with a `sleep` that aborts the signal and rejects with its reason | rejects with an `AbortError`; `onUpdate` was called once, for the snapshot before the abort, and not after; with an already aborted signal it rejects with `AbortError` and the client got no request |
| `failureView(ApiRequestError(200, "INVALID_RESPONSE", "m"))` | title "Something went wrong", message "The engine sent an answer this page cannot read.", status 200, `retryLabel` "Try again" |
| `loadRun(client, "bad id!")`; `failureView` of the `RangeError` it rejects with | no request is made; the view equals `NOT_FOUND_VIEW` and equals `failureView(ApiRequestError(404, "NOT_FOUND", "m"))` |
| `runPageView(null, undefined)`, `(SNAP, undefined)`, `(SNAP, E500)`, `(null, RangeError)` | `{ loading: true, polling: true, snapshot: null, failure: null }`; `{ loading: false, polling: true, snapshot: SNAP, failure: null }`; `{ loading: false, polling: false, snapshot: SNAP, failure: failureView(E500) }`; `{ loading: false, polling: false, snapshot: null, failure: NOT_FOUND_VIEW }` |

## Calls

The flow-id grammar is `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` with at most 64 characters, the hash grammar `^sha256:[0-9a-f]{64}$` (`delivered-shapes.md`); `demo-pay` fits, `Bad_Id` and `sha256:xyz` do not.

`loadSteps` makes `{ path: "/runs/run_1/steps", opts: { query: { limit: 200 }, signal } }`, then the same with `cursor: "c1"` in the query; `loadPayload` makes exactly `{ path: "/runs/run_1/payloads/" + D("4"), opts: { signal } }`.

## Pages

`RUN_PAGES` is `[{ id: "runs", file: "80-runs.tsx", path: "/runs", navLabel: "Runs", capability: "read_run" }, { id: "run", file: "81-run.tsx", path: "/runs/:runId", navLabel: null, capability: null }]`; `TEST_RUN_PANEL` is `{ id: "test-run", title: "Test run" }`. The panel views are `{ kind: "message", reason: "unavailable", text: "Your permissions could not be loaded. Reload the page." }`, `{ kind: "message", reason: "denied", text: "Only authors can start a test run." }` and `{ kind: "message", reason: "no_version", text: "Save and validate a version to test-run it." }`; `parseTestInputs` gives, in the order of the scenario, `{ ok: true, input: {}, mocks: {} }`, `ok` true with `INPUT` and `MOCKS`, `errors` `{ input: "Enter a JSON object." }`, `errors` `{ input: "Enter a JSON object, for example {}." }`, `errors` `{ input: "This is not valid JSON.", mocks: "Enter a JSON object, for example {}." }`, and `ok` true.

## Messages

`registerRunMessages()` registers `RUNS_UNAVAILABLE` as `UNAVAILABLE` "Runs are unavailable right now. Try again in a moment.", `TEST_MOCK_MISSING` as `MISSING` "A block node has no mock. Add a list of mocks for every block node." and `TEST_MOCK_INVALID` as `INVALID` "A mock does not fit its node. Check the mocks against the block's output." `FORBIDDEN_TEXT` is `messageFor("FORBIDDEN")`.

| Error given to `testRunFormErrors` | Result |
|---|---|
| 422 `TEST_MOCK_MISSING`, `details.nodes` `["lookup", "pay"]` | `{ mocks: MISSING + " Missing: lookup, pay." }` |
| 422 `TEST_MOCK_INVALID`, `details.problems` `[{ nodeId: "pay", index: 0, reason: "schema", detail: "/status enum" }]` | `{ mocks: INVALID + " First problem: pay (schema /status enum)." }` |
| 503 `RUNS_UNAVAILABLE` | `{ $form: UNAVAILABLE }` |
| 403 `FORBIDDEN`, `details.decisionId` `"d-1"` | `{ $form: FORBIDDEN_TEXT + " Decision id: d-1" }` |
| `new Error("boom")` | `{ $form: FALLBACK_MESSAGE }` |

A problem with an empty `nodeId` reads "mocks". An `OPERATION_REFUSED` with `details.reason` `kind_unsupported` gives `{ $form: "The flow uses a node kind that test runs do not support yet." }`; `version_not_runnable` with `cause` `block_missing` gives `{ $form: "The flow uses blocks the registry does not have: " + blocks.join(", ") + "." }` (`blocks` is `details.blocks`). Any other `ApiRequestError` gives `{ $form: runErrorMessage(error) }` (the kit message, plus the decision id of a 403; a `RangeError` gives its own message).
