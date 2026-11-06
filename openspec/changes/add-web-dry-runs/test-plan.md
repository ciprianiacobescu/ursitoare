# Test plan: fixtures and expected values

**Ran** (scratch copy of main@cf34c628, Node 24.22.2): prototypes printed every web value below. **Derived**: values read from the sibling folders; the journeys were not run.

Shared: `HASH` = `sha256:` + 64 × `a`. `RUN` is `{ id: "run_1", flowId: "demo-grants", flowHash: HASH, mode: "stub", trigger: "test", state: "completed", ownerTeam: "finance", principal: { userId: "u_alice", kind: "human" }, terminalNode: "done", error: null, inputRef: null, outputRef: null, createdAt: "2026-11-06T10:00:00.000000Z", startedAt: "2026-11-06T10:00:01.000000Z", endedAt: "2026-11-06T10:00:02.000000Z" }`. `step(seq, nodeId, kind, over)` has `effectSeq` 0, `attempt` 1, `state` `completed`, nulls for `outcome`, `error`, `inputRef`, `outputRef`, `idemKey`, `policyDecisionId`, `taint` `[]`, `startedAt` `2026-11-06T10:00:01.000000Z`, `endedAt` `2026-11-06T10:00:01.500000Z`. `P(path)` is `{ method: "POST", host: "tools.fake.test", path, serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01", ttlSeconds: 60 }`; `R(n)` is `Block::"tenant_a/demo-grants/<n>"`.

## dryRunPanelView

Q1 `(new Set(["read_run"]), { state: "validated" })` and `(new Set(), null)`: `{ state: "not_allowed", message: "Only members of the flow's owner team can dry-run it." }`. Q2 `(new Set(["dry_run_flow"]), null)` and `(…, { state: "draft" })`: `{ state: "needs_version", message: "Save and validate a version to dry-run it." }`. Q3 `(new Set(["dry_run_flow", "test_flow"]), { state: "validated" })` and `(…, { state: "tested" })`: `{ state: "ready", message: null }`. The rendered region "Dry run" for Q1 holds that message as a paragraph, never an empty region; for Q3 it holds the paragraph "Read steps call the real tools through the broker. Write, send and pay steps are checked by policy but answered by your fakes, one list per step.", the example `{"pay": [{"output": {"payment_id": "P-1", "status": "created"}}]}` in a `code` element and then the form, for Q1 and Q2 neither the paragraph nor the form.

## parseFakes

F1 `{"pay":[{"output":{"payment_id":"P-1","status":"created"}}]}`; F2 `{}`; F3 two spaces; F4 `{nope`; F5 `[]`; F6 `5`; F7 `null`; F8 `{"pay":{"output":{}}}`; F9 `{"pay":[],"x":"y"}`; F10 `{"a/b":[{"error":{"code":"E","message":"m"}}]}`; F11 `{"__proto__":[1]}`.

## startDryRun

`INPUT` is `{ vendor_name: "Acme GmbH", amount: 12.5 }`, `FAKES` is `{ pay: [{ output: { payment_id: "P-1" } }] }`. The client is a full `ApiClient`; its `post` records `[path, body, opts]` and answers `{ run: RUN }`, the other methods throw.

- S1 `("demo-grants", HASH, INPUT, FAKES, "k-1")`: one record `["/flows/demo-grants/versions/sha256%3A" + "a"×64 + "/dry-run", { input: INPUT, fakes: FAKES }, { headers: { "Idempotency-Key": "k-1" } }]`; returns `RUN`.
- Before any record: S2 flow `Demo`, `RangeError` "flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$"; S3 hash `sha256:abc`, "hash must match ^sha256:[0-9a-f]{64}$"; S4 key `""`, "key must not be empty".
- S5 answer `{ run: { id: 5 } }` and S6 answer `{}`: `ApiRequestError` 200 `INVALID_RESPONSE` "Invalid dry run answer". S7 `post` rejects `ApiRequestError(400, "VALIDATION_FAILED", "m")`: that same object.

## dryRunFormErrors

`V(fields)` is `ApiRequestError(400, "VALIDATION_FAILED", "m", { details: { fields } })`; `registerRunMessages()` ran first.

| row | error | result |
|---|---|---|
| E1 | `V` of `body/fakes/pay` "missing: no fake entry" | `{ fakes: "pay: missing: no fake entry" }` |
| E2 | `V` of `body/fakes/pay/0` "schema: / required" and `body/fakes/flag` "not_an_effect: reads run live" | `{ fakes: "pay/0: schema: / required; flag: not_an_effect: reads run live" }` |
| E3 | `V` of `body/input/amount` "must be number" | `{ input: "must be number" }` |
| E4 | `V` of `body/run_as` "must NOT have additional properties" | `{ $form: "Some of the information is not valid. Check it and try again. body/run_as: must NOT have additional properties" }` |
| E5 | `V` of `body/fakes/k1` to `k4`, each "missing: no fake entry" | `{ fakes: "k1: missing: no fake entry; k2: missing: no fake entry; k3: missing: no fake entry" }` |
| E6 | 503 `RUNS_UNAVAILABLE` | `{ $form: "Runs are unavailable right now. Try again in a moment." }` |
| E7 | 403 `FORBIDDEN`, `details` `{ decisionId: "dec_9" }` | `{ $form: "You are not allowed to do this. If you think you should be, give the decision id to an administrator. Decision id: dec_9" }` |
| E8 | `new Error("x")` | `{ $form: "Something went wrong. Try again, and tell an administrator if it keeps happening." }` |

## parseDecisions

`LOOK` is `{ decisionId: "dec_2", nodeId: "lookup", resource: R("lookup"), decision: "allow", reasons: ["g-lookup"], permit: P("/blocks/erp.lookup_vendor@1") }`. P1 is `[{ ...LOOK, permit: { ...P("/blocks/a@1"), bodyDigest: 64 × "9" }, decidedAt: "2026-11-06T10:00:02.000000Z", policySetVersion: "v1" }]`; the result is `[{ ...LOOK, permit: P("/blocks/a@1") }]`. Malformed: M1 `null`; M2 `{}`; M3 `[null]`; then `[LOOK]` with M4 `decision: "maybe"`, M5 `decisionId: "a b"`, M6 `permit.ttlSeconds: 0`, M7 `ttlSeconds: 3601`, M8 `permit.method: "post"`, M9 `permit.path: "x"`, M10 `reasons: [5]`, M11 `resource: ""`, M12 `nodeId: ""`, M13 `permit: "x"`, M14 `reasons: "x"`.

## decisionRows

R1 `dec_1` node `lookup`, `R("lookup")`, `deny`, no reasons, permit `null`; R2 `dec_2` `lookup`, `R("lookup")`, `allow`, `["g-lookup"]`, `P("/blocks/erp.lookup_vendor@1")`; R3 `dec_3` `pay`, `R("pay")`, `allow`, `["g-pay"]`, `P("/blocks/erp.create_payment@1")`; R4 `dec_4` node `pay`, `R("pay:post:notify")`, `allow`, `["g-hook"]`, `P("/blocks/slack.post_message@1")`; R5 `dec_5` node `pay`, `R("pay:pre:audit")`, `allow`, no reasons, `P("/blocks/kb.search@1")`; R6 `dec_6` `ghost`, `R("ghost")`, `allow`, no reasons, `P("/blocks/erp.flag_vendor@1")`; R7 `dec_7` node `null`, resource `User::"x"`, `deny`, permit `null`. Steps: `step(0, "lookup", "block")` and `step(1, "pay", "block", { idemKey: "ik1_" + 64 × "d", hooks: { inputOriginalRef: null, entries: [E("pre:audit", null), E("post:notify", "ik1_" + 64 × "e")] } })` with `E(label, idemKey)` = `{ label, kind: "block", fused: false, attempt: 1, state: "completed", action: null, mutated: null, to: null, error: null, tool: "x@1", idemKey }`.

R3's details: `[Decision id dec_3, Resource Block::"tenant_a/demo-grants/pay", Reasons g-pay, Service 0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01, Token lifetime 60 s]`. R1's details are `[Decision id dec_1, Resource Block::"tenant_a/demo-grants/lookup", Reasons No grant or policy allows this call.]` (no permit, so no `Service`), R7's the same with `Resource User::"x"` and `dec_7`; R5 and R6, allows with no reason, read `Reasons none`. Row `nodeId`: R4 `pay:post:notify`, R7 `(unknown)`. Four variants of `[R3]` read `pay · allow · POST tools.fake.test/blocks/erp.create_payment@1`: a `live` run; a `stub` run with no steps; a `stub` run whose `pay` step has kind `switch`; a `stub` run with `pay` steps `seq` 1 (key set) and `seq` 2 (key null). With `seq` 1 key null and `seq` 2 key set it reads `pay · allow · stubbed · POST …` (the last step decides).

## loadDecisions and decisionsView

`get` records `[path, opts]`. C1: no cursor answers `{ items: [R2], next_cursor: "c1" }`, cursor `c1` answers `{ items: [R3], next_cursor: null }`: records `["/runs/run_1/decisions", { query: { limit: 100 } }]` and `[…, { query: { limit: 100, cursor: "c1" } }]`; result `{ decisions: [R2, R3] (as views), truncated: false }`. C2: always `{ items: [], next_cursor: "c" }`: 5 records, `{ decisions: [], truncated: true }`. C3: `{ items: [{ nope: 1 }], next_cursor: null }`: `ApiRequestError` 200 `INVALID_RESPONSE` "Invalid decisions". C4: run id `bad id!`: `RangeError` "runId must match ^[A-Za-z0-9_-]{1,128}$", no record. `decisionsWanted` of `RUN`, `RUN` failed, `RUN` cancelled, `RUN` running, `RUN` queued, `RUN` mock, `null`: `true, true, true, false, false, false, false`.

| row | `decisionsView(run, steps, load)` | result |
|---|---|---|
| V1 | `(null, [], undefined)` | `{ kind: "hidden" }` |
| V2 | mock run, ready `[R2]` | `hidden` |
| V3 | `RUN` running, `undefined` | `hidden` |
| V4, V5 | `RUN`, `undefined`; `RUN`, `{ phase: "loading" }` | `{ kind: "loading" }` |
| V6 | `RUN`, error `ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "dec_9" } })` | `error`: E7's text |
| V7, V8 | error `ApiRequestError(200, "INVALID_RESPONSE", "Invalid decisions")`; `new Error("x")` | `error`: "Policy decisions could not be read." |
| V9 | ready `[]` | `{ kind: "empty", text: "No policy decisions were recorded." }` |
| V10 | ready `[R2, R3]`, `truncated: true`, no steps | `rows` with the texts `lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1`, `pay · allow · POST tools.fake.test/blocks/erp.create_payment@1` and `note` "Showing the first 500 decisions." |

## Taint rows

Base rows of every step: `Node=<nodeId>`, `Kind=<kind>`, `State=completed` (unless given), `Outcome=<outcome or none>`, `Started=2026-11-06T10:00:01.000000Z`, `Ended=2026-11-06T10:00:01.500000Z`. T1 `step(1, "route", "switch", { outcome: "active" })`: base, `Branch=active`, `Taint=none`. T2 `step(2, "nap", "wait", { outcome: "skipped", taint: ["untrusted", "private"] })`: base, `Wait=skipped`, `Taint=untrusted, private`. T3 `step(3, "done", "end")`: base (Outcome `none`), `Taint=none`. T4 `step(3, "weird", "mystery", { taint: ["untrusted"] })`: base, `Taint=untrusted`. T5 `step(3, "route", "switch", { outcome: "active", state: "failed", error: { code: "E_X", message: "failed", node: "route" }, policyDecisionId: "dec_1" })`: base (State `failed`), `Branch=active`, `Taint=none`, `Error=E_X: failed`, `Decision=dec_1` (`href` `/api/v1/policy-decisions?decision_id=dec_1`). T6 `step(0, "lookup", "block", { idemKey: "ik1_" + 64 × "d", taint: ["untrusted"] })`: base, `Effect sequence=0`, `Attempt=1`, `Idempotency key=ik1_ddd…`, `Taint=untrusted` (ten rows, one Taint). Every other `href` is `null`.

## Fixture flow and journey constants

`DEMO_GRANTS`:

```yaml
ursitoare: "0.1"
flow: demo-grants
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, amount: { type: number } }
  required: [vendor_name, amount]
start: lookup
nodes:
  lookup: { kind: block, uses: acme.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: pay }
  pay:
    kind: block
    uses: acme.create_payment@1
    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }
```

**Ran** (`validateFlowText` over the test catalogue plus `acme.lookup_vendor@1` and `acme.create_payment@1` copied from `erp.*` with `untrusted_result: false`, as U48's part seeds): `{ ok: true, errors: [], warnings: [], layers_run: ["L1","L2","L3"] }`; with `true` on `lookup`: `L3_TAINT_TO_CONSEQUENTIAL` at `/nodes/pay/with/vendor_id` and `W_LETHAL_TRIFECTA`. `INPUT_TEXT` is `{"vendor_name":"Acme GmbH","amount":12.5}`, `FAKES_TEXT` is F1. The fake tools answer `erp.lookup_vendor@1` for `Acme GmbH` with `{ vendor_id: "V-ACME", status: "active", payment_terms_days: 30 }`. `SVC` is `seedServiceId(me.tenant.id, "acme")`; `fake` is `egressApi(stack.handles).fake`, `tools` is `toolsApi(stack.handles).tools`.

## Node journey (`alice and carol take acme from pending to a stubbed payment`)

1. carol `loadToolServer(client, "acme")`: `state` `pending`, `origin` `https://tools.fake.test`, `pendingDigest` matching `^sha256:[0-9a-f]{64}$`, tools `lookup_vendor` (`read`) and `create_payment` (`pay`), `ref` null, `untrusted_result` false (U48's seed), `unsafe_to_retry` false and `http` `{ method: "POST", path: "/blocks/erp.lookup_vendor@1" }` and `.../erp.create_payment@1`; `toolRows` of the view give `trusted` and `POST /blocks/erp.lookup_vendor@1`, `trusted` and `POST /blocks/erp.create_payment@1` (U52's columns "Result" and "Call"). `approveToolSurface(client, "acme", { digest, selfApproval: false })`: `approved`, refs `acme.lookup_vendor@1`, `acme.create_payment@1`.
2. alice `postFlow` (`demo-grants`, `finance`), `saveVersion`, `validateVersion`: `validationOk` true, `result` `{ ok: true, errors: [], warnings: [], layers_run: ["L1","L2","L3"] }`.
3. carol `startDryRun` (key `k-c`): `ApiRequestError` 403 `FORBIDDEN`.
4. `fake.clearRecords()` and `tools.reset()`; alice `startDryRun` (`k-1`): mode `stub`, `ownerTeam` `finance`; `followRun`: `failed`, `error` `{ code: "INTERPRETER_TOOL_DENIED", message: 'tool call of "lookup" is not permitted (policy)', node: "lookup" }`; `loadDecisions`: one decision, `nodeId` `lookup`, `resource` `Block::"<tenantId>/demo-grants/lookup"`, `deny`, `reasons` `[]`, `permit` null (row `lookup · deny`, its `Reasons` detail "No grant or policy allows this call."); `fake.issued()`, `fake.requests()`, `tools.calls()` are `[]`.
5. carol `postGrant` for role `author` on `acme.lookup_vendor@1`, any step (`k-g1`), and on `acme.create_payment@1`, step `demo-grants` / `pay` (`k-g2`); `loadPolicy`: `version` null, `pendingGrants` 2; `deployPolicy(client, "", "k-d")`: a 64-hex version; `loadPolicy`: that `version`, `pendingGrants` 0.
6. alice `startDryRun` (`k-2`), `followRun`: `completed`, `terminalNode` `done`, `error` null; `loadSteps`: `lookup` (`block`), `pay` (`block`), `done` (`end`), all `completed`; `lookup.idemKey` null, `pay.idemKey` matching `^ik1_[0-9a-f]{64}$`; `policyDecisionId` of `lookup` and `pay` equal the ids of decisions 1 and 2, of `done` null. `loadPayload`: `lookup` output `{ vendor_id: "V-ACME", status: "active", payment_terms_days: 30 }`, `pay` output `{ payment_id: "P-1", status: "created" }`. `stepDetailRows(done, "completed")` ends with `{ term: "Taint", value: "none", href: null }`.
7. `decisionRows` of run 2 reads `lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1` and `pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1`. `tools.calls()` has one call: `ref` `erp.lookup_vendor@1`, `method` `POST`, `host` `tools.fake.test`, `path` `/blocks/erp.lookup_vendor@1`, `callHeader` `<run id>:lookup:1`, `keyHeaderSeen` true, `input` `{ vendor_name: "Acme GmbH" }`, `status` 200; `tools.calls({ ref: "erp.create_payment@1" })` is `[]`. `fake.issued()` has one token (`serviceId` `SVC`, `ttlSeconds` 60); `fake.requests()` one request (`serviceId` `SVC`, `method` `POST`, `host` `tools.fake.test`, `path` `/blocks/erp.lookup_vendor@1`, `outcome` `allowed`). In the raw `GET /runs/<id>/decisions` items `lookup`'s `permit` is `{ method, host, path, serviceId }` of that request plus `bodyDigest` equal to the tool call's `bodySha256` and `ttlSeconds` 60; `pay`'s has the path `/blocks/erp.create_payment@1` and no second request exists.

## Browser journey (`test_alice_is_denied_then_reads_and_stubs`; fixtures `fresh_state`, `users`, `browser`, `base_url`)

`page` is carol's; alice uses `browser.new_context(base_url=base_url)`, closed in `finally`.

1. carol: `login`; link "Tool servers"; the table "Tool servers" has a row containing `acme · https://tools.fake.test · pending`; link `acme`; in the region "Surface" "Approve surface"; in the dialog (name matching `^Approve surface [0-9a-f]{12}\?$`) "Approve surface"; status "Surface approved."; the table "Tools" contains `acme.lookup_vendor@1` and `acme.create_payment@1`, and before the approval its rows already read `trusted` and `POST /blocks/erp.lookup_vendor@1` (the second row `trusted` and `POST /blocks/erp.create_payment@1`) under "Result" and "Call".
2. alice: `login`; "Flows"; create `demo-grants` (owner team `finance`); "Flow text" `DEMO_GRANTS`; "Save version"; "Validate"; the region "Diagnostics" contains "Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3."; the region "Dry run" shows the paragraph and `code` example of § dryRunPanelView; in it fill "Input (JSON)" with `INPUT_TEXT`, "Fakes (JSON)" with `FAKES_TEXT`, "Start dry run": status `Started dry run <id>.` and one link "Open run <id>".
3. alice opens the link: "State: failed" (20 s); the text `INTERPRETER_TOOL_DENIED: tool call of "lookup" is not permitted (policy) (at lookup)`; the list "Policy decisions" has one item containing `lookup · deny` and, in its details, "Reasons" with "No grant or policy allows this call.".
4. carol: link "Grants"; "Grant changes take effect when you deploy the policy."; in "New grant": "Role or user" `author`, "Tool" `acme.lookup_vendor@1`, "Create grant", status "Grant created."; then fill "Role or user" `author` again, "Tool" `acme.create_payment@1`, radio "One step", "Flow" `demo-grants`, "Step" `pay`, "Create grant"; the table "Grants" has rows containing `role author · acme.lookup_vendor@1 · any step · active` and `role author · acme.create_payment@1 · demo-grants / pay · active`.
5. carol: link "Policies"; "2 grant changes are not deployed."; "Deploy": a status matching `^Deployed version [0-9a-f]{12}\.$`, then "All grant changes are deployed."
6. alice: "Flows", link `demo-grants`, fill both fields of the region "Dry run" again, "Start dry run", open the run: "State: completed" (20 s); the buttons of "Steps" read `lookup`, `pay`, `done`; after `lookup` the region "Output" contains `"vendor_id": "V-ACME"`; after `pay` `"payment_id": "P-1"`; after `done` the row of "Step details" containing `Taint` has the definition `none`.
7. the list "Policy decisions" has two items: the first contains `lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1` and not `stubbed`, the second `pay · allow · stubbed · POST tools.fake.test/blocks/erp.create_payment@1`.
8. last: `page.route` (regex `/api/v1/runs/<run id>/decisions(\?|$)`) fulfils 200 `{"items":[{"decisionId":5}],"next_cursor":null}`; `page.reload()`: "State: completed" and the three buttons stay, the paragraph "Policy decisions could not be read." shows, no list is named "Policy decisions", nothing has role `alert`.

`assert_accessible(page)` runs after steps 1, 2, 3, 4, 5, 7 and 8.
