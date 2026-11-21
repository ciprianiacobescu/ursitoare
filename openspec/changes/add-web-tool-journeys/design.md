## Context

The closing unit of M7, split from `add-web-tool-review` (ruling S1). It adds no production file: it proves the batch outcome with a Node journey on the e2e stack and a browser journey, and a Node source test that holds the rules of both. Rulings: D8, D14, D17, D25, R1, R3, R6. Shapes: `delivered-shapes.md`; fixtures and flows: `test-plan.md`.

## Decisions

1. **Two journeys.** The Node journey drives the web logic against the real engine and asserts wire facts; the browser journey drives the pages. They share the three servers, the flow pattern and the fixtures. Both are green on arrival, so the harness may raise a `pre_satisfied` question (task 1.1); the source test is the criterion that is red first, which gives the unit a Node-runnable criterion (R3). The browser journey's criterion stays out of `criteria_ids`.
2. **`demo-live` in Node, `demo-tools` in the browser.** Node adds a `vendor` node (`ledger.lookup_vendor@1`, an OpenAPI `read`): without it the `http` adapter's live wiring stays unproven, because U53 checks `main.ts` by text only. The MCP read (`find`) is live in both journeys (D25: the overlay marks `find_vendor` `read`), the code block runs locally (`permit` null, no token) and `pay` is stubbed. The browser keeps the card's three-node flow.
3. **Wire facts, not screens, in Node.** Per fake: `mcp.requests()` (methods, `callHeader`, `bodySha256` equal to the permit's `bodyDigest`), `tools.calls()`, `fake.issued()` and `fake.requests()`, and the decision rows with their permits; no record holds a secret. The discovery calls are authorised as `register_tool_server` with a permit (U54), so four such decisions exist after two discoveries.
4. **Probed flows.** `demo-tools` and `demo-live` validate with one warning `W_LETHAL_TRIFECTA`, `pay` has row taint `[]` (its arguments come from the inputs) and `done` has `["untrusted"]`; with `pay`'s `vendor_id` from `nodes.find.output.vendor_id` the validator refuses (`L3_TAINT_TO_CONSEQUENTIAL`). This is what both journeys assert.
5. **Step 5 of the browser journey keeps `test_m6_grants.py`'s locators on merged M6b.** "Flows"; "Flow name"; "Owner team" `fill` (a text input with a datalist, the prefill is overwritten); "Create flow"; "Flow text"; "Save version"; "Validate"; the region "Diagnostics"; `_dry_run` (the region "Dry run", the textareas "Input (JSON)" and "Fakes (JSON)", which stay beside the generated "Inputs" fields and the "Answers for <node>" rows, the one link, the status; `fill` is a text edit kept as typed); `_open_run`; the "Steps" buttons (named by node id only); the singleton regions "Output" and "Step details" with the Taint row; the list "Policy decisions". Each is read from main at `delivered-shapes.md` § Pages. The home links are "Review pending tool servers" and "Deploy grant changes"; every locator uses `exact=True`. A conflict would be reported, not fixed here.
6. **Strict mode.** The journey adds no link or button named like a navigation label or holding "Ursitoare"; every check on the tool pages is scoped to a region or a table, since the page holds several `status` and `alert` elements.

## Interfaces

Given, equal to `proposal.md`.

```ts
// This unit gives no interface: it adds only test files (test/journeys/m7-tools.test.ts, test/journeys/journey-sources.test.ts, e2e/test_m7_tools.py).
```

## Failure cases and security

- No secret may appear in any recorded request, token, decision, step or page text (`e2e-crm-key`, `e2e-ledger-key`): Node asserts it on every record it reads.
- A permit is checked against what the fake received: the discovery permits and the two live permits equal the fakes' `bodySha256`; a stubbed `pay` leaves no call and no token.
- A failing journey step names the step and the value; no step retries or sleeps (the only wait is `followRun`'s deadline in Node and `expect(..., timeout=20000)` in the browser).

## Verification

In a scratch copy of main@3daa5c35 (Node 24.22.2). **Ran:** both flows through `validateVersion` over approved fixture-adapter servers (one warning `W_LETHAL_TRIFECTA`); node taints; W1 and W3 with `sha256`. **Derived:** the sibling routes, answers and fakes, the page markup and the Playwright locators. **Not run:** either journey (they need U47b to U56b) and the source test.
