# Test plan

"ran" marks facts run on 2026-11-06 on a scratch copy of main@a6b5fb37 with the extraction applied (design.md § What was run); `createWorkerSandbox` (U38) is not on main and was not run.

## Conventions

- `N` is `[]`, `E` is `["extracted"]`, `U` is `["untrusted"]`, `EU` is `["extracted", "untrusted"]`. Taint arrays are compared with `assert.deepEqual` from `node:assert/strict`.
- Test files follow the proposal's conventions (first line `assert.equal(typeof <fn>, "function")`, stub calls wrapped in `assert.doesNotThrow`, `node:assert/strict`, no `.`, `[` or `::` in names).
- Run harness (task 2.3): tenant `T` is `{ tenantId: "tenant_a", reviewProfile: "solo" }`, the principal `{ userId: "u_alice", kind: "human" }`. `deps` is `{ store, durable: null, loadVersion, catalogueFor: async () => loadTestCatalogue(), invokerFor: async () => invoker, effects: NO_EFFECT_GATE, clock: fixedClock("2026-11-02T10:00:00Z"), ids: sequentialIds(0), sandbox }`, `loadVersion` answering `taintRunVersion(name)` (or the edited copy). `invoker` is `{ async invoke(call) { return { output: structuredClone(answers[call.nodeId]) }; } }` with `answers` `{ fetch: { invoice_id: "i1", vendor_name: "V", raw_text, received_at: "2026-11-01T00:00:00Z" } }` or `{ lookup: { vendor_id: "v1", status: "active", payment_terms_days: 30 } }`.
- A run is created with `startRun(deps, T, { flowId, hash: TAINT_RUN_HASH, mode: "mock", input, mocks: null, principal, actorChain: ["u_alice"], runId: "r_1" })` (`input` `{ invoice_id: "i1" }` or `{ vendor: "Acme" }`) and executed with `executeRun(ops, deps, T, "r_1")`. The store is `createMemoryRunStore()` wrapped so that `recordStep(ctx, step)` pushes `[ctx, step]` to a log before delegating (the scenarios assert `step` and that `ctx` deep-equals `T`); rows are `store.listSteps(T, "r_1", { limit: 100 }).steps`.
- `ops` wraps `memoryWorkflowOps("r_1", recorded)` and pushes each `runStep` result to a list (the `taggedOps` pattern of `src/interpreter/execute.test.ts`); a replay passes `recorded.slice(0, 4)` and `ops.executed` lists the steps that ran fresh.
- The pool is `createWorkerSandbox({ size: 1 })` from `src/sandbox/index.ts`, closed in `finally`. The replay scenario wraps it as `{ size, respawns, run(...args) { log.push(args); return real.run(...args); }, close: () => real.close() }`.

## Fixtures (`test/support/taint-runs/flows/`, `ursitoare: "0.1"`)

`untrusted-code.yaml` (ran: `validateFlowText(text, "yaml", loadTestCatalogue())` gives `ok: true`, no warning, `layers_run` `["L1","L2","L3"]`):

```yaml
ursitoare: "0.1"
flow: untrusted-code
version: 1.0.0
inputs:
  type: object
  properties:
    invoice_id: { type: string }
  required: [invoice_id]
start: fetch
nodes:
  fetch:
    kind: block
    uses: invoices.get@1
    with:
      invoice_id: "${{ inputs.invoice_id }}"
    next: count
  count:
    kind: code
    language: js
    input:
      text: "${{ nodes.fetch.output.raw_text }}"
    source: |
      return { size: input.text.length > 20 ? "big" : "small" };
    output_schema:
      type: object
      properties:
        size: { type: string, enum: [small, big] }
      required: [size]
    next: route
  route:
    kind: switch
    on: "${{ nodes.count.output.size }}"
    cases:
      big: done_big
    default: done
  done:
    kind: end
    status: completed
  done_big:
    kind: end
    status: completed
```

`trusted-code.yaml` (ran, same result):

```yaml
ursitoare: "0.1"
flow: trusted-code
version: 1.0.0
inputs:
  type: object
  properties:
    vendor: { type: string }
  required: [vendor]
start: lookup
nodes:
  lookup:
    kind: block
    uses: erp.lookup_vendor@1
    with:
      vendor_name: "${{ inputs.vendor }}"
    next: shape
  shape:
    kind: code
    language: js
    input:
      vendor_id: "${{ nodes.lookup.output.vendor_id }}"
    source: |
      return { label: "vendor-" + input.vendor_id };
    output_schema:
      type: object
      properties:
        label: { type: string }
      required: [label]
    next: done
  done:
    kind: end
    status: completed
    output:
      label: "${{ nodes.shape.output.label }}"
```

The files are exactly as shown. `"short"` has 5 characters and `"a much longer invoice text body"` 31, so the bodies answer `small` and `big` (ran in the Phase-0 pool: `{"size":"small"}`, `{"size":"big"}`, and `{"label":"vendor-v1"}` for `vendor_id` `v1`). A node's row `seq` is its position in the visited path (0-based). The loader (`test/support/taint-runs/index.ts`): `readTaintRunText(name)` is the file's text; `loadTaintRun("nope")` and `readTaintRunText("nope")` throw `CatalogueDataError` with code `CATALOGUE_UNKNOWN_FLOW`; `taintRunVersion(name)` is `{ flowId: name, hash: TAINT_RUN_HASH, state: "validated", ownerTeam: "finance", flow }`; `TAINT_RUN_HASH` is `"sha256:" + "b".repeat(64)`.

## Catalogue C40

`base = loadTestCatalogue()`; `block(ref)` answers `ur.block@1` with `{ ...base.block("erp.lookup_vendor@1"), untrusted_result: true }`, `pf.block@1` with `{ ...base.block("erp.lookup_vendor@1"), untrusted_fields: ["__proto__", "constructor.x", "", 5] }` and any other ref as `base`; `delegateTarget("n8n", "calc")` is `{ effect: "read", untrusted_result: false }`, every other call is `base`'s (for `n8n`/`archive-invoice` that is `{ effect: "send", untrusted_result: true }`). For `pf.block@1` the test asserts `Object.keys(fields)` equals `["__proto__", "constructor"]`, `Object.hasOwn(fields, "__proto__")` and `Object.getPrototypeOf(fields) === Object.prototype`. Node arguments are literals of the form `{ kind, …members }` as the scenario names them (ran: all results as the scenario states).

## Inclusion helper (`test/support/taint-runs/inclusion.ts`)

`flowPaths(flow, max)`: depth-first from `flow.start` when it is an own key of `flow.nodes`; the successors of a node are the distinct string `id`s of `successorFields(node)` that are own node keys and not already on the path, in that order; a path ends (and is kept) where none is left; enumeration stops at `max` paths. `inclusionReport(flow, catalogue, produced = producedTaint)` returns `{ paths, checked, cut, violations }`: `paths` the number of paths; for each path, walking its nodes with a fresh map `seen`: a `foreach` node adds its id to `cut` and ends the walk; any other node gets `input = nodeInputTaint(node, id => seen.get(id))` and `out = produced(node, input, catalogue)`, is stored in `seen` and added to `checked`, and is compared with `analyzeTaint(flow, catalogue).nodes[id]` by `taintIncludes`; a failed comparison pushes `"<path ids joined by >> at <id>: input static [<labels>] runtime [<labels>]"` (or `output …`, or `field <name> static absent|[…] runtime […]`, labels joined by `,`). `checked` and `cut` are sorted and without duplicates. (ran: 45 flows, 67 paths, 0 violations, `cut` `["each"]` for the three foreach flows; with the stub 22 violations on `rf-1-core`. These counts are not asserted.)
