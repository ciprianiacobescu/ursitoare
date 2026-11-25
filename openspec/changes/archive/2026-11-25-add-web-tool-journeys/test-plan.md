# Test plan: journey fixtures (flows, constants)

**Ran** 2026-11-17 (Node 24.22.2, scratch copy of main@3daa5c35): both flows through `validateVersion` over approved fixture-adapter servers `crm`, `calc`, `ledger` (blocks as the adapters set them); node taints through `nodeInputTaint`; W1 and W3 with `sha256`. **Derived:** § Node journey (test-plan-journey.md) from the sibling folders' values; neither journey has been run (they need U47b to U56b).

## Flows and journey constants

`DEMO_TOOLS` (browser) is the YAML below; `DEMO_LIVE` (Node) is it with `flow: demo-live` and, between `score` and `pay`, `vendor: { kind: block, uses: ledger.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: pay }` (`score` then has `next: vendor`).

```yaml
ursitoare: "0.1"
flow: demo-tools
version: 1.0.0
inputs:
  type: object
  properties: { vendor_name: { type: string }, vendor_id: { type: string }, amount: { type: number } }
  required: [vendor_name, vendor_id, amount]
start: find
nodes:
  find: { kind: block, uses: crm.find_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: score }
  score: { kind: block, uses: calc.risk_score@1, with: { amount: "${{ inputs.amount }}" }, next: pay }
  pay:
    kind: block
    uses: ledger.create_payment@1
    with: { vendor_id: "${{ inputs.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR, reference: demo }
    next: done
  done: { kind: end, status: completed, output: { status: "${{ nodes.find.output.status }}", band: "${{ nodes.score.output.band }}", payment_id: "${{ nodes.pay.output.payment_id }}" } }
```

**Ran:** both flows give `ok: true`, 0 errors and one warning `W_LETHAL_TRIFECTA` ("Valid. 0 errors, 1 warning. Layers run: L1, L2, L3."), over blocks as the adapters set them (`find_vendor` read, untrusted, unsafe to retry; `risk_score` read, trusted; `create_payment` pay, `lookup_vendor` read, untrusted); `pay`'s `vendor_id` from `nodes.find.output.vendor_id` gives `L3_TAINT_TO_CONSEQUENTIAL`. Row taint `[]` for `find`, `score`, `vendor`, `pay`, `["untrusted"]` for `done`. **UNVERIFIED:** the same on the adapters' real blocks.

`INPUT` `{ vendor_name: "Acme GmbH", vendor_id: "V-ACME", amount: 12.5 }`; `FAKES` `{"pay":[{"output":{"payment_id":"P-7","status":"created"}}]}`; secrets `e2e-crm-key`, `e2e-ledger-key`; `CALC_IN` `{"type":"object","properties":{"amount":{"type":"number"}},"required":["amount"],"additionalProperties":false}`, `CALC_OUT` `{"type":"object","properties":{"band":{"type":"string"}},"required":["band"],"additionalProperties":false}`; `SRC` `return { band: input.amount > 1000 ? "high" : "low" };` (as in `add-web-tool-review`): `SRC.length` is 54 (the semicolon included, no trailing newline), so its call reads `code (54 characters)`. `W1` `884bf0ecc3569c8bc3cb7ee6d3fe044f5ae98593478ddbbaa9975e35801bba28` (`tools/call` `find_vendor` for `{"vendor_name":"Acme GmbH"}`) and `W3` `76269e460a435d1338b204ce7cd4f0be1b20e25e1da8ad458d0a4b8e3e164c3f` (`server/discover`) are U54's rows, recomputed. `HDR` is `{ name: "route_ticket", inputSchema: { type: "object", properties: { region: { type: "string", "x-mcp-header": "Region" } }, required: ["region"] }, annotations: { readOnlyHint: true }, result: () => ({ text: "routed" }) }`. `DOC` is the OpenAPI document of test-plan-browser.md § Journey (`createPayment`, `lookupVendor`).

## S1 Journey sources (`test/journeys/journey-sources.test.ts`)

Reads both files with `readFileSync` (each inside `assert.doesNotThrow`, so a missing file fails by assertion at red). `check(file, text)` returns the list of problems: each required token of the scenario absent, each forbidden one present. Both journeys give `[]`. The mutations: the Python text without `watch_csp(`; with a skip call appended; the TypeScript text without `"mcp"`; with `.skip(` appended; each gives exactly one problem.

