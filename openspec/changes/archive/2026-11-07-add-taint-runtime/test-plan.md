# Test plan

"ran" marks facts run on 2026-11-06 on a scratch copy of main@a6b5fb37 with the extraction applied (design.md § What was run); `createWorkerSandbox` (U38) is not on main and was not run.

## Conventions

- `N` is `[]`, `E` is `["extracted"]`, `U` is `["untrusted"]`, `EU` is `["extracted", "untrusted"]`. Taint arrays are compared with `assert.deepEqual` from `node:assert/strict`.
- Test files follow the proposal's conventions (first line `assert.equal(typeof <fn>, "function")`, stub calls wrapped in `assert.doesNotThrow`, `node:assert/strict`, no `.`, `[` or `::` in names).
- Run harness (task 2.3): tenant `T` is `{ tenantId: "tenant_a", reviewProfile: "solo" }`, the principal `{ userId: "u_alice", kind: "human" }`. `deps` is `{ store, durable: null, loadVersion, catalogueFor: async () => loadTestCatalogue(), invokerFor: async () => invoker, effects: NO_EFFECT_GATE, clock: fixedClock("2026-11-02T10:00:00Z"), ids: sequentialIds(0), sandbox }`, `loadVersion` answering `taintRunVersion(name)` (or the edited copy). `invoker` is `{ async invoke(call) { return { output: structuredClone(answers[call.nodeId]) }; } }` with `answers` `{ fetch: { invoice_id: "i1", vendor_name: "V", raw_text, received_at: "2026-11-01T00:00:00Z" } }` or `{ lookup: { vendor_id: "v1", status: "active", payment_terms_days: 30 } }`.
- A run is created with `startRun(deps, T, { flowId, hash: TAINT_RUN_HASH, mode: "mock", input, mocks: null, principal, actorChain: ["u_alice"], runId: "r_1" })` (`input` `{ invoice_id: "i1" }` or `{ vendor: "Acme" }`) and executed with `executeRun(ops, deps, T, "r_1")`. The store is `createMemoryRunStore()` wrapped so that `recordStep(ctx, step)` pushes `[ctx, step]` to a log before delegating (the scenarios assert `step` and that `ctx` deep-equals `T`); rows are `store.listSteps(T, "r_1", { limit: 100 }).steps`.
- `ops` wraps `memoryWorkflowOps("r_1", recorded)` and pushes each `runStep` result to a list (the `taggedOps` pattern of `src/interpreter/execute.test.ts`); a replay passes `recorded.slice(0, 4)` and `ops.executed` lists the steps that ran fresh.
- The pool is `createWorkerSandbox({ size: 1 })` from `src/sandbox/index.ts`, closed in `finally`. The replay scenario wraps it as `{ size, respawns, run(...args) { log.push(args); return real.run(...args); }, close: () => real.close() }`.

## Static agreement corpus (scenario "Static results equal the shared rule over the corpus", in `src/authoring/taint/runtime.test.ts`)

- Sources, with `caseCatalogue()` for all of them: `flowCases("invalid")`, `flowCases("valid")` and `flowCases("warnings")` (`test/support/flow-cases/index.ts`), each case parsed with `parseCatalogueFlow(c.text, c.name)` (`test/support/catalogue/flows.ts`), and `loadTestFlow(name)` for the three `TEST_FLOW_NAMES`. Hook flows (`test/support/hook-flows/`) are not in it: the code-hook widening is static-only (design Decision 1), so a hook-widened `llm.extract` node (static `relabelExtract(input)` joined with its input) differs from `producedTaint(node, input)` by design (ran: 6 of the 45 hook flows have such a node, 6 mismatches in 468 nodes).
- Counts at main@e440ff2e (ran): 115 `invalid`, 29 `valid` and 13 `warnings` cases, of which 3 do not parse (the `invalid/l1-parse-*` ones named in the scenario) and are counted, not skipped silently; 154 + 3 RF-1 = 157 documents; `analyzeTaint` throws for none; 631 nodes (601 + 30). The kinds seen: `block` 246, `end` 166, `llm.extract` 118, `llm.decide` 22, `foreach` 17, `code` 13, `switch` 10, `agent` 9, `delegate` 9, `human.approval` 8, `subflow` 4, `llm.generate` 3, `wait` 3, `human.form` 1, `http` 1 and one node with no `kind`, so the unknown-kind rule is exercised.
- What is read: the static input is `analysis.nodes[id].input` and the static output and fields are `analysis.nodes[id].output` and `.fields`, all returned by `analyzeTaint`. The static outcome is not returned; the test derives it with the rule `resolveReference` in `analyze.ts` applies to a `.outcome` reference (`N` for `llm.decide` and `human.approval`, else the output). That is sound because the agreement scenario already checks every RF-1 edge against it, and a wrong derivation can only fail the test, never hide a difference.
- Red: the stub `producedTaint` throws, so the `assert.doesNotThrow` around it fails at red (ran: the stub gives a thrown `not implemented` on the first node). Green: 0 mismatches over 631 nodes with the reference below (ran). The comparison alone cannot show the rules did not change, because after the extraction `analyzeTaint` calls `producedTaint` itself (ran: a changed `producedTaint` keeps the comparison at 0 mismatches); the guard that earlier static results are preserved is the frozen set below (ran: with `llm.extract` returning its input, 6 frozen tests fail; with `subflow` trusted, 1; with `code` trusted, 4). Against the old private `outputFor` (before the extraction) the comparison does catch changed rules (ran: 118 mismatches with `llm.extract` returning its input, 149 with block `untrusted_fields` dropped, 21 with the `llm.decide` outcome not `N`, 3 with `subflow` trusted, 6 with `code` trusted).
- Reference used (scratch copy of main@e440ff2e, `runtime.ts` written to the design: `producedTaint` as `outputFor` plus `outcome`, `fields` by `Object.fromEntries`, `analyze.ts` calling it, `contextTainted` imported): all counts above.

## Frozen taint tests (file::title; the 16 tests of the M3/M4 taint module, run unedited)

- `src/authoring/taint/analyze.test.ts`: `C-feb77bd3 RF-1 labels and edges`; `C-7e5f540a Code does not launder and fields are precise`; `C-382d778d Cycles self-references and order`.
- `src/authoring/taint/capabilities.test.ts`: `C-6792eb26 RF-1 and one-block flags`; `C-5e5ffb19 agents hooks subflows context and order`; `C-238ff645 unknown sites fail closed and catalogue errors propagate`; `C-9c5fbf5b malformed hook structures are unknown sites`.
- `src/authoring/taint/closed.test.ts`: `C-96450187 unknown and malformed input fails closed`; `C-0309b412 size limits`.
- `src/authoring/taint/hooks.test.ts`: `C-be8bdbfa Hook references widening and flow rules`; `C-218f2fa6 Malformed hook structures fail closed`.
- `src/authoring/taint/labels.test.ts`: `C-375163e0 join is a union in canonical order`; `C-9dbb1d4e normalize relabel and include`.
- `src/authoring/taint/sources.test.ts`: `C-9543ab61 sources of untrusted data and the closed outcome`; `C-6b3829ee context sources are untrusted unless approved`.
- `src/authoring/taint/surface.test.ts`: `C-a609be4d names are exported by the authoring surface`.

Ran on the scratch copy with the extraction applied: 16 of 16 pass (`node --test` on the seven files, Node 24.22.2).

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
