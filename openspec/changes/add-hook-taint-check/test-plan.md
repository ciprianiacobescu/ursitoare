# Test plan for add-hook-taint-check

"Ran" marks values produced on 2026-11-06 in a scratch copy of main@cf34c628 (Node 24.22.2) with the two code changes of design.md applied; the M5 runtime (U42) is not on main, so the rows of § Hooked runs are derived from `add-hook-runtime` (design.md § Verification). `N` is `[]`, `U` is `["untrusted"]`, `EU` is `["extracted", "untrusted"]`. Taint arrays are compared with `assert.deepEqual` from `node:assert/strict`; test names have no `.`, `[` or `::`; a test file starts with `assert.equal(typeof <function under test>, "function")`. No stub is involved: at red these calls return the old results, so the assertions fail.

## Conventions

- Catalogue `CAT` is `loadTestCatalogue()` (`test/support/catalogue/loader.ts`) unless a scenario says `caseCatalogue()`. Blocks used (effect; untrusted; required `with`): `docs.fetch@1` (read; field `content`; `url`; output `content`, `content_type`, only `content` required), `kb.search@1` (read; `query`), `mail.send@1` (send; `to`, `subject`, `body`), `slack.post_message@1` (send; `channel`, `text`), `erp.lookup_vendor@1` (read), `erp.create_payment@1` (pay), `invoices.get@1` (read; fields `raw_text`, `vendor_name`; `invoice_id`).
- `validateFlow(doc, CAT)` takes the parsed document. `Issue` is `{ layer, code, node, path, message }`. `L3ERR(r)` is `r.errors.filter((e) => e.layer === "L3")`.
- Flows are YAML (`ursitoare: "0.1"`, `version: 1.0.0`), parsed with `parseCatalogueFlow(text, name)` (`test/support/catalogue/flows.ts`) for `analyzeTaint`, and with `parseFlowText` or `validateFlowText(text, "yaml", CAT)` for the validator.

## Hook sample (scenario "Hook references, widening and flow rules"; frozen test `C-be8bdbfa`)

The sample `hookSample` of `src/authoring/taint/hooks.test.ts` (not edited), analyzed with that file's catalogue `C` (`invoices.get@1` read with `untrusted_fields` `["raw_text", "vendor_name"]`; `erp.lookup_vendor@1` read; `erp.create_payment@1` pay; `mail.send@1` send; any other ref unknown). Nodes: `fetch` (block `invoices.get@1`, post block hook `tell` = `mail.send@1` over `hook.output.raw_text`, `hook.output.id`, `hook.node.id`); `ex` (llm.extract over `nodes.fetch.output.raw_text`, post code hook `tidy`); `ex2` (the same input, pre block hook `note` = `mail.send@1` over `hook.input.t`); `lk` (`erp.lookup_vendor@1`); `pay` (`erp.create_payment@1`); `done` (end). Rules: `guard` (`match: { effect: [pay] }`, pre code hook `g` with `input.raw` = `nodes.fetch.output.raw_text`), `audit` (`match: { kind: [end] }`, pre block hook `a` = `mail.send@1` over `nodes.fetch.output.raw_text` and `hook.input.x`), `idle` (`match: { nodes: [nope] }`, post code hook `i`). Ran: every value of the scenario is unchanged by the widening.

## Widening samples (scenario "A code hook widens a block node with every produced label")

`widen.yaml` (flow `widen`, ran):

```yaml
ursitoare: "0.1"
flow: widen
version: 1.0.0
inputs: { type: object, properties: { url: { type: string } }, required: [url] }
start: hooked
nodes:
  hooked: { kind: block, uses: docs.fetch@1, with: { url: "${{ inputs.url }}" }, post: [{ id: tidy, kind: code, source: "return;" }], next: plain }
  plain: { kind: block, uses: docs.fetch@1, with: { url: "${{ inputs.url }}" }, next: blockonly }
  blockonly:
    kind: block
    uses: docs.fetch@1
    with: { url: "${{ inputs.url }}" }
    post: [{ id: ping, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "${{ hook.node.id }}" } }]
    next: use
  use:
    kind: code
    language: js
    input: { a: "${{ nodes.hooked.output.content_type }}", b: "${{ nodes.plain.output.content_type }}", c: "${{ nodes.blockonly.output.content_type }}" }
    source: "return { ok: true };"
    output_schema: { type: object, properties: { ok: { type: boolean } }, required: [ok] }
    next: done
  done: { kind: end, status: completed }
```

Results of `analyzeTaint(flow, CAT)` (ran): before the change `hooked` is `{ input: N, output: N, fields: { content: U } }`, `use` is `{ input: N, output: N }` and the three edges at `/nodes/use/input/a`, `b`, `c` have taint `N`; after it `hooked` is `{ input: N, output: U, fields: { content: U } }`, `plain` and `blockonly` are `{ input: N, output: N, fields: { content: U } }`, `use` has `input` `U` and `output` `U`, the edge at `a` has taint `U` (from `hooked`), those at `b` and `c` have `N`, and the edge of `blockonly`'s hook at `/nodes/blockonly/post/0/with/text` (`hook.node.id`) has `N`.

`widen-mail.yaml` (ran): `start: fetch`; `fetch` is `{ kind: block, uses: docs.fetch@1, with: { url: "${{ inputs.url }}" }, post: [{ id: tidy, kind: code, source: "return;" }], next: send }`; `send` is `{ kind: block, uses: mail.send@1, with: { to: ops@example.com, subject: "${{ nodes.fetch.output.content_type }}", body: digest }, next: done }`; `done` is an `end` with `status: completed`. `widen-mail-nohook` is the same without `post`. Through `validateFlowText(text, "yaml", CAT)` (ran): `widen-mail` has `ok: false`, one error `{ layer: "L3", code: "L3_TAINT_TO_CONSEQUENTIAL", node: "send", path: "/nodes/send/with/subject", message: "untrusted data from fetch reaches send through nodes.fetch.output.content_type, a block with side effects; pass it through an llm.extract node first" }`, the one warning `W_OPTIONAL_REFERENCE` (node `send`, same path), `layers_run` `["L1", "L2", "L3"]`; `widen-mail-nohook` has `ok: true`, no error, the same warning.

## Hook-edge samples (scenarios "Untrusted data in a block hook...", "A rule hook...", "Hook edges that stay allowed")

`HB` (ran: `ok: true`, no error, no warning, `["L1", "L2", "L3"]`), the shape of the frozen case `taint-via-extract-passes`:

```yaml
ursitoare: "0.1"
flow: hook-taint
version: 1.0.0
inputs: { type: object, properties: { url: { type: string } }, required: [url] }
start: fetch
nodes:
  fetch: { kind: block, uses: docs.fetch@1, with: { url: "${{ inputs.url }}" }, next: extract }
  extract:
    kind: llm.extract
    input: { text: "${{ nodes.fetch.output.content }}" }
    instructions: Extract the summary.
    output_schema: { type: object, properties: { summary: { type: string } }, required: [summary] }
    next: send
  send: { kind: block, uses: mail.send@1, with: { to: ops@example.com, subject: Digest, body: "${{ nodes.extract.output.summary }}" }, next: done }
  done: { kind: end, status: completed }
```

`MAIL(b)` is `{ to: "ops@example.com", subject: "s", body: b }`. Each row adds the members to `HB` and gives the `L3ERR` list (ran; `msg(h, n, ref, f)` is `untrusted data from <f> reaches hook <h> on <n> through <ref>, a block with side effects; pass it through an llm.extract node first`):

| Id | Added to `HB` | `L3ERR` |
|---|---|---|
| P1 | `extract.pre: [{ id: h, kind: block, uses: mail.send@1, with: MAIL("${{ nodes.fetch.output.content }}") }]` | one: node `extract`, path `/nodes/extract/pre/0/with/body`, `msg(h, extract, nodes.fetch.output.content, fetch)` |
| P2 | `fetch.post: [{ id: tell, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "${{ hook.output.content }}" } }]` | one: node `fetch`, path `/nodes/fetch/post/0/with/text`, `msg(tell, fetch, hook.output.content, fetch)` |
| P3 | `extract.pre: [{ id: note, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "${{ hook.input.text }}" } }]` | one: node `extract`, path `/nodes/extract/pre/0/with/text`, `msg(note, extract, hook.input.text, extract)` (`hook.input` has no `from`, so `<from>` is the hooked node) |
| P4 | P1 with the hook `id` set to the text `"a\u0000b"` (a NUL inside the id; a lone surrogate, `"Bad Id"`, `5` and 65 characters behave the same) | one: node `extract`, path `/nodes/extract/pre/0/with/body`, `msg((unnamed), extract, nodes.fetch.output.content, fetch)`; `JSON.stringify(result)` holds no `\u0000` |
| R1 | `hooks: [{ id: audit, match: { nodes: [send, done] }, pre: { id: ping, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "${{ nodes.fetch.output.content }}" } } }]` | two, in this order (sorted by path, then code, then message): node `done` and node `send`, both path `/hooks/0/pre/with/text`, `msg(ping, done, nodes.fetch.output.content, fetch)` and `msg(ping, send, ..., fetch)` |
| R2 | R1 with `match: { nodes: [send] }` and the hook's `id` removed | one: node `send`, path `/hooks/0/pre/with/text`, `msg(rule.audit, send, nodes.fetch.output.content, fetch)` |
| N1 | `send.pre: [{ id: peek, kind: code, source: "return;", input: { raw: "${{ nodes.fetch.output.content }}" } }]` | `[]` |
| N2 | `extract.pre: [{ id: look, kind: block, uses: kb.search@1, with: { query: "${{ nodes.fetch.output.content }}" } }]` | `[]`; the result also has no warning |
| N3 | `send.pre: [{ id: note, kind: block, uses: mail.send@1, with: MAIL("${{ nodes.extract.output.summary }}") }]` | `[]` |
| N4 | `extract.pre: [{ id: ghost, kind: block, uses: nope.tool@1, with: { x: "${{ nodes.fetch.output.content }}" } }]` | `[]` |
| N5 | `fetch.post: [{ id: tell, kind: block, uses: slack.post_message@1, with: { channel: "#ap", text: "${{ hook.node.id }}" } }]` | `[]` |

Ran: P1 to R2 (P4 with each of its five ids) give `ok: false`, `layers_run` `["L1", "L2", "L3"]` (the repository has no layer `H` yet); N1 to N5 give no `L3_TAINT_TO_CONSEQUENTIAL` (N1, N2, N3 and N5: `ok: true`, no warning; N4: `ok: true` with the one warning `W_LETHAL_TRIFECTA` on main, because an unknown block fails closed; derived for M6, where layer `H` runs: `ok: false` with the one error `H_BLOCK` (node `extract`, path `/nodes/extract/pre/0/uses`), the warning kept). The regular edge of `HB` (`/nodes/extract/input/text`, untrusted, into an `llm.extract` node) is no error in every row.

## Frozen case with a hook (scenario "Trifecta and opaque-call warnings come from U23's results")

`taint-via-extract-passes` (`flowCases("valid", ...)`, `caseCatalogue()`: `fetch` `docs.fetch@1`, `extract` `llm.extract` over `nodes.fetch.output.content`, `send` `mail.send@1` over `nodes.extract.output.summary`) gets on `extract` the hook of the base scenario, `pre: [{ id: h, kind: block, uses: "mail.send@1", with: { to: "a@example.com", subject: "s", body: "${{ nodes.fetch.output.content }}" } }]`, and goes through `validateFlow(doc, caseCatalogue())`. Ran: `ok: false`, `errors` equal to `[{ layer: "L3", code: "L3_TAINT_TO_CONSEQUENTIAL", node: "extract", path: "/nodes/extract/pre/0/with/body", message: "untrusted data from fetch reaches hook h on extract through nodes.fetch.output.content, a block with side effects; pass it through an llm.extract node first" }]`, `warnings` `[]`, `layers_run` `["L1", "L2", "L3"]`. The same document with `kb.search@1` and `with: { query: ... }` in place of the `mail.send@1` hook has no error; its `layers_run` is `["L1", "L2", "L3", "H"]` (derived from `add-hook-checker` design 5: layer `H` runs when L1 to L3 produced no error and a hook is declared).

## Hooked runs (scenario "Hooked runs stay inside the static input")

Harness (derived from `add-taint-runtime` test-plan § Conventions; `src/interpreter/hook-taint-inclusion.test.ts`): tenant `T` is `{ tenantId: "tenant_a", reviewProfile: "solo" }`, principal `{ userId: "u_alice", kind: "human" }`; `deps` is `{ store: createMemoryRunStore(), durable: null, loadVersion, catalogueFor: async () => CAT, invokerFor: async () => invoker, effects: NO_EFFECT_GATE, clock: fixedClock("2026-11-02T10:00:00Z"), ids: sequentialIds(0), sandbox: SB }` with a fresh store per flow; `SB` is `createWorkerSandbox({ size: 1 })`, closed in `finally`; `loadVersion` answers `hookRunVersion(name)` (`taint-hook-bare`: that version with `flowId` `taint-hook-bare` and the flow below); `invoker` is `{ async invoke(call) { return { output: structuredClone(ANSWERS[call.tool]) }; } }` with `ANSWERS` `erp.lookup_vendor@1` `{ vendor_id: "v1", status: "active" }`, `erp.create_payment@1` `{ payment_id: "pay-1", status: "paid" }`, `invoices.get@1` `{ invoice_id: "inv-1", raw_text: "<b>hi</b>" }`. A run is `startRun(deps, T, { flowId: name, hash: HOOK_RUN_HASH, mode: "mock", input, mocks: null, principal, actorChain: ["u_alice"], runId: "r_1" })` then `executeRun(memoryWorkflowOps("r_1"), deps, T, "r_1")`; the rows are `store.listSteps(T, "r_1", { limit: 100 }).steps`. `taint-hook-bare` is `structuredClone(loadHookRun("taint-hook"))` with `flow` set to `taint-hook-bare` and the member `input` deleted from the hook `sanitise` of `nodes.fetch.post`. `violations` is the list, over the rows, of `"<flow> <nodeId>: static [<labels>] runtime [<labels>]"` for each row whose `normalizeTaint(row.taint)` is not included (`taintIncludes(static, runtime)`) in `analyzeTaint(flow, CAT).nodes[row.nodeId].input`.

`INPUT` is `{ vendor: "  Acme ", amount: 120, currency: "eur" }`. Each row of the table gives the run, its final state, the visited rows in `seq` order (state `completed` unless noted), `row.taint` and the static `input` of the same node after the change (ran for the static column, on flows rebuilt from `add-hook-runtime` test-plan § Fixtures, and for `taint-hook`, `taint-hook-bare`; the first four columns are derived from `add-hook-runtime` spec lines "Mutate, skip and end", "Context, when, redirect, undeclared route and fail", "Taint rows through hooks").

| Flow | Input | Final state | Rows | Row taints | Static inputs |
|---|---|---|---|---|---|
| `onion`, `mutate`, `fail`, `end-pre` | `INPUT` | completed | `lookup`, `normalize`, `pay`, `done` | all `N` | all `N` |
| `skip-read` | `INPUT` | completed | `lookup` (skipped), `normalize`, `pay`, `done` | all `N` | all `N` |
| `skip-pay` | `INPUT` | failed `HOOK_ACTION_FORBIDDEN` | `lookup`, `normalize`, `pay` (failed) | all `N` | all `N` |
| `redirect` | `{ vendor: "Acme", amount: 2000, mode: "auto" }` | completed | `gate`, `classify`, `review`, `done` | all `N` | all `N` |
| `undeclared` | `{ vendor: "Acme", amount: 20, mode: "auto" }` | failed `HOOK_ROUTE_UNDECLARED` | `gate`, `classify` (failed) | all `N` | all `N` |
| `taint-hook` | `{ invoice: "inv-1" }` | completed | `fetch`, `use_id`, `done` | `N`, `U`, `U` | `U`, `U`, `U` |
| `taint-hook-bare` | `{ invoice: "inv-1" }` | completed | `fetch`, `use_id`, `done` | `N`, `U`, `U` | `N`, `U`, `U` |

Before the widening the static inputs of `taint-hook-bare` are `N`, `N`, `U` (ran with the flow rebuilt from `add-hook-runtime` test-plan § Fixtures): `use_id` is the one violation, `"taint-hook-bare use_id: static [] runtime [untrusted]"`. The nine flows alone pass before the widening, because the hook `sanitise` of `taint-hook` reads `nodes.fetch.output.raw_text` and so already joins `fetch`'s input; the copy is what makes the property fail at red (ran).

## Frozen test changed (task 2.1)

`taint.test.ts::C-f97887e5 hook edges are not checked` keeps its name; after its validation it asserts `r.ok` false, `r.errors` equal to the one issue above, `r.warnings` `[]` and `r.layers_run` `["L1", "L2", "L3"]` (ran: 8 of 8 pass). No other test of `src/authoring/taint/` or `src/authoring/validate/` changes (ran: 61 of 61 pass).
