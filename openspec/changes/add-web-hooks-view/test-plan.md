# Test plan: fixtures and expected values

**Ran**: on 2026-11-06 in a scratch copy of main@a6b5fb37 with the web edits applied (design § Verification). **Derived**: read from a sibling folder (U39 to U43 are not on main).

## Flow texts (D22: the card's `demo-hooks` kept as written; `demo-x3` completes the card's sketch)

`DEMO_HOOKS` (**ran** through `validateFlowText` and `validateFlow(canonicalizeFlow(...))` with `loadTestCatalogue()`: `ok`, L1 to L3, no warnings; `checkMocks` accepts `lookup` and `pay` and refuses `pay:post:notify` as `unknown_node` until U43; layer `H` **derived**: no issue):

```yaml
ursitoare: "0.1"
flow: demo-hooks
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, amount: { type: number } }
  required: [vendor_name, amount]
start: lookup
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: normalize }
  normalize:
    kind: code
    language: js
    input: { amount: "${{ inputs.amount }}", status: "${{ nodes.lookup.output.status }}" }
    source: "return { amount: Math.round(input.amount * 100) / 100, route: input.status === 'active' ? 'pay' : 'blocked' };"
    output_schema:
      type: object
      properties: { amount: { type: number }, route: { type: string, enum: [pay, blocked] } }
      required: [amount, route]
    next: route
  route: { kind: switch, on: "${{ nodes.normalize.output.route }}", cases: { pay: pay }, default: blocked }
  pay:
    kind: block
    uses: erp.create_payment@1
    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: EUR, reference: demo }
    pre:
      - { id: guard, kind: code, source: "if (ctx.input.amount > 10000) return { action: 'fail', reason: 'over limit' };" }
    post:
      - { id: notify, kind: block, uses: slack.post_message@1, with: { channel: ap, text: "paid ${{ hook.output.payment_id }}" }, on_error: continue }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }
  blocked: { kind: end, status: failed }
```

`DEMO_X3` (**ran**: the same calls, `ok`, L1 to L3, no warning; layer `H` **derived** from U41 design 3: exactly one `H_ROUTE_EFFECT`, node `classify`, path `/nodes/classify/post/0/routes/0`, because `pay` uses `erp.create_payment@1`, effect `pay`; the flow rule `audit` adds no issue, see below it):

```yaml
ursitoare: "0.1"
flow: demo-x3
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, amount: { type: number } }
  required: [vendor_name, amount]
start: lookup
hooks:
  - { id: audit, match: { kind: [code] }, post: { kind: code, source: "return;" } }
nodes:
  lookup: { kind: block, uses: erp.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: classify }
  classify:
    kind: code
    language: js
    input: { amount: "${{ inputs.amount }}" }
    source: "return { amount: input.amount };"
    output_schema:
      type: object
      properties: { amount: { type: number } }
      required: [amount]
    post:
      - { id: rush, kind: code, routes: [pay], source: "return { action: 'redirect', to: 'pay' };" }
    next: review
  review:
    kind: code
    language: js
    input: { amount: "${{ nodes.classify.output.amount }}" }
    source: "return { approved: input.amount < 10000 };"
    output_schema:
      type: object
      properties: { approved: { type: boolean } }
      required: [approved]
    next: pay
  pay:
    kind: block
    uses: erp.create_payment@1
    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.classify.output.amount }}", currency: EUR, reference: demo }
    next: done
  done: { kind: end, status: completed, output: { payment_id: "${{ nodes.pay.output.payment_id }}" } }
```

`pay` does not read `review`, so `H_DOMINANCE` stays silent (the seed checker flags a mutant that does: **ran**). The rule `audit` (**derived**) is well formed, selects `classify` and `review` (no `W_NO_MATCH`), has no `routes`, `input`, `with` or `when` (no `H_ROUTE_*`, nothing for `H_DOMINANCE`) and is inside the bounds. **Ran** on main@cf34c628: `validateFlowText` with `loadTestCatalogue()` gives `ok`, no warning, `layers_run` L1 to L3; the layout equals the layout without the rule; the seed `check.ts` gives no issue, and `W_NO_MATCH` (`kind: [wait]`) and `H_SCHEMA` (id `Audit`) for two mutants.

`INPUT` is `{"vendor_name": "ACME", "amount": 12.5}`; `MOCKS_HOOKS` is `{"lookup": [{"output": {"vendor_id": "V-1", "status": "active"}}], "pay": [{"output": {"payment_id": "P-1", "status": "created"}}], "pay:post:notify": [{"output": {"ts": "1"}}]}`; the `ts` output fits `slack.post_message@1` (`required: ["ts"]`, string; **ran**, read from `blocks.v0.json`). `MISSING` is "A block node has no mock. Add a list of mocks for every block node.".

## Overlay fixtures (values **ran** on the prototype)

`HOOKED` and `X3` are `canonicalizeFlow` of the two texts; `L(doc)` is `layoutFlow(doc).layout`. Layout order of `HOOKED`: `lookup`, `normalize`, `route`, `blocked`, `pay`, `done`; of `X3`: `lookup`, `classify`, `review`, `pay`, `done` (`classify` at x 16, y 120; `pay` at x 16, y 328). `graphView(HOOKED, true).message` is "Flow graph: 6 nodes, 5 edges, 5 layers."; `graphView(X3, true).message` is "Flow graph: 5 nodes, 4 edges, 5 layers.". Overlay of `X3` (rules are not badges, so the badge is unchanged): badges `classify` (pre `[]`, post `["rush"]`); routes `classify>pay rush`; rules `[{ id: "audit", match: "kind code", pre: null, post: "rule.audit" }]`; `missing` `[]`; `hookRoutePaths` `[{ key: "classify>pay:rush", d: "M 112 168 L 112 328", className: "hook-route" }]` (`x` 16 + 160 / 2 + 16, `y1` 120 + 48, `y2` 328; **ran**).

`RULES` is `{"start":"a","nodes":{"a":{"kind":"block","next":"b","post":[{"id":"tidy","kind":"code","source":"x","routes":["b","ghost","ghost","a"]},{"id":"tidy2","kind":"code","source":"x","routes":["b"]}]},"b":{"kind":"end","pre":[{"id":"w"},{"kind":"code"},5,{"id":""}]}},"hooks":[{"id":"audit","match":{"kind":["block"],"effect":["pay","send"]},"pre":{"kind":"code","source":"x"}},{"id":"all","post":{"kind":"block","uses":"x@1","with":{}}},{"id":"","pre":{}},5,{"id":"named","match":{"nodes":["a","b"],"tags":["t1"]},"pre":{"kind":"code"},"post":{"kind":"code","routes":["b","a"]}}]}`. Its overlay: badges `a` (pre `[]`, post `["tidy","tidy2"]`) and `b` (pre `["w"]`, post `[]`); routes `a>b tidy`, `a>a tidy`, `a>b tidy2`; `missing` `["ghost"]`; rules `audit` (match "kind block and effect pay, send", pre "rule.audit", post null), `all` ("all nodes", null, "rule.all"), `named` ("nodes a, b and tags t1", "rule.named", "rule.named routes b, a"; derived).

## Step fixtures

`D(c)` is `c` repeated 64 times; `K` is `"ik1_" + "e".repeat(64)`. `G` is `{ label: "pre:guard", kind: "code", fused: true, attempt: 1, state: "completed", action: "continue", mutated: null, to: null, error: null, tool: null, idemKey: null }` and `N` is `{ label: "post:notify", kind: "block", fused: false, attempt: 1, state: "completed", action: null, mutated: null, to: null, error: null, tool: "slack.post_message@1", idemKey: K }`: the entries U42 and U43 produce for `pay` of `DEMO_HOOKS` (U42 design 1.7, U42b test-plan, U43 spec; **derived**). `STEP` is the `pay` step `{ seq: 3, nodeId: "pay", kind: "block", effectSeq: 0, attempt: 1, state: "completed", outcome: null, error: null, inputRef: D("1"), outputRef: D("2"), idemKey: K, policyDecisionId: null, taint: [], startedAt: "2026-11-06T09:00:00.000000Z", endedAt: "2026-11-06T09:00:01.000000Z" }`.

`BAD` is `STEP` with `hooks: { entries: 5 }` (a malformed trace) and `NOTE` is "This step's hook trace could not be read.": `parseStepView(BAD).hooks` is `null`, `hookRows(...)` is `[]`, `hookTraceNote(...)` is `NOTE`, and for `STEP` with or without valid `hooks` it is `null` (**ran** on the prototype, Node 24; the frozen `web/src/runs/*.test.ts` pass with the edit).

## Diagnostics fixture

`V` is `{ ok: false, errors: [{ layer: "H", code: "H_ROUTE_EFFECT", node: "classify", path: "/nodes/classify/post/0/routes/0", message: "hook rush may route to pay" }], warnings: [{ layer: "H", code: "W_NO_MATCH", node: null, path: "/hooks/0", message: "rule matches no node" }], layers_run: ["L1", "L2", "L3", "H"] }`.

## Journey expectations (derived from the sibling folders unless marked)

| Item | Value |
|---|---|
| `DEMO_HOOKS` validation | `Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3, H.` (L1 to L3 ran; `H` derived) |
| run steps | `lookup`, `normalize`, `route`, `pay`, `done`; kinds `block`, `code`, `switch`, `block`, `end`; all `completed`; `pay` alone has `hooks`, entries `G` then `N` |
| `normalize` | input `{ "amount": 12.5, "status": "active" }`, output `{ "amount": 12.5, "route": "pay" }` (`Math.round(12.5 * 100) / 100` is 12.5) |
| `route`, `pay` | outcome `pay`; `pay` input `{ vendor_id: "V-1", amount: 12.5, currency: "EUR", reference: "demo" }`, output `{ payment_id: "P-1", status: "created" }` |
| missing hook mock | 422 `TEST_MOCK_MISSING`, `details.nodes` `["pay:post:notify"]` (U43); `testRunFormErrors` gives `{ mocks: MISSING + " Missing: pay:post:notify." }` (`test-run.ts:133-139`) |
| `DEMO_X3` | `Not valid. 1 error, 0 warnings. Layers run: L1, L2, L3, H.`; `where` "Node classify · /nodes/classify/post/0/routes/0"; the editor marker lands on the text `pay` (`pointerRange`, ran); a test run of the draft: 422 `OPERATION_REFUSED`, `details` `{ reason: "version_not_runnable", cause: "draft" }` (`test-run-routes.ts:71`) |
| graphs | `DEMO_HOOKS`: "Hooks" item `pay: pre guard; post notify`, no "Hook routes" or "Flow rules"; `DEMO_X3`: "Hooks" item `classify: pre none; post rush`, "Hook routes" item `hook rush: classify may route to pay`, "Flow rules" one item `audit: match kind code; pre none; post rule.audit` then the paragraph "Flow rules are listed, not drawn: the graph cannot tell which nodes they match.", and in the graph's `svg` exactly one `path.hook-route` with `d` `M 112 168 L 112 328`, whose computed `stroke-dasharray` is not `none`; the overlay values ran on the prototype, the rendering did not |
| malformed trace (browser) | steps request `/api/v1/runs/<run id>/steps?limit=200`, rewritten with `hooks: null` on `normalize`: its region "Hooks" holds the note paragraph and no list; `pay` still lists its two items |
