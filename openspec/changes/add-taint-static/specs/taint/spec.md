## Purpose

The static taint algebra of Ursitoare: two labels and their join, propagation over the references of a flow with per-node and per-reference results, and the three flow capabilities (`reads_untrusted`, `reads_private`, `has_send_or_pay`) that gate activation.

## ADDED Requirements

### Requirement: Taint labels form a union algebra
`Taint` SHALL be a sorted, duplicate-free array over `TAINT_LABELS` with `NO_TAINT` (`[]`) meaning trusted; `joinTaint` SHALL be the union, `normalizeTaint` SHALL turn an unknown label into `untrusted`, `relabelExtract` SHALL replace `untrusted` by `extracted`, and `taintIncludes(outer, inner)` SHALL hold when every label of `inner` is in `outer`.

#### Scenario: Join is a union in canonical order
- **WHEN** the test calls `joinTaint` on all 16 ordered pairs of `[]`, `["extracted"]`, `["untrusted"]` and `["extracted", "untrusted"]`, on `(["untrusted", "extracted"], ["extracted"])` and on `(["untrusted", "untrusted"], [])`
- **THEN** the 16 results are the union in label order, the join is commutative, idempotent and associative over all 64 triples, the last two results are `["extracted", "untrusted"]` and `["untrusted"]`, `TAINT_LABELS` equals `["extracted", "untrusted"]`, `NO_TAINT` equals `[]`, and both are frozen

#### Scenario: Normalize, relabel and include
- **WHEN** the test calls `normalizeTaint` on `["bogus", "extracted", "extracted"]` and `[]`, `relabelExtract` on `[]`, `["untrusted"]`, `["extracted"]` and `["extracted", "untrusted"]`, and `taintIncludes` on `(["extracted", "untrusted"], ["untrusted"])`, `(["extracted"], ["untrusted"])`, `(["untrusted"], [])`, `([], [])`, `([], ["extracted"])` and `(["untrusted"], ["bogus"])`
- **THEN** the normalize calls give `["extracted", "untrusted"]` and `[]`, the four `relabelExtract` calls all give `["extracted"]`, and the six `taintIncludes` calls give `true`, `false`, `true`, `true`, `false`, `true`

### Requirement: Taint propagates over references by node-kind rules
`analyzeTaint(flow, catalogue)` SHALL compute, for every node, the taint of its `input`, its `output` and its `fields`, and one `TaintEdge` per reference occurrence, by design.md Decisions 2 to 4: a `code` output is the union of its inputs, an `llm.extract` output is `extracted`, `untrusted_fields` taint only the named top-level fields, and an `llm.decide` `outcome` is trusted.

#### Scenario: RF-1 labels and edges
- **WHEN** the test analyzes the RF-1 sample with catalogue C (reference.md § Test samples)
- **THEN** `input` and `output` of each node are: `fetch_invoice` `[]` and `[]` with `fields` `{ raw_text: ["untrusted"], vendor_name: ["untrusted"] }`; `extract` `["untrusted"]` and `["extracted"]`; `lookup_vendor`, `normalize`, `approval`, `pay` and `done` `["extracted"]` and `["extracted"]`; `classify` `["extracted"]` and `["extracted"]` with `fields` `{ outcome: [] }`; `archive` `["extracted"]` and `["extracted", "untrusted"]`; `notify_rejection` and `rejected` `[]` and `[]`; every other `fields` is `{}`
- **THEN** `edges` has 19 entries whose `to` values are `approval` x3, `archive` x2, `classify` x3, `done`, `extract`, `fetch_invoice`, `lookup_vendor`, `normalize` x2, `notify_rejection`, `pay` x4 in that order; the entry at `/nodes/pay/with/amount` equals `{ to: "pay", path: "/nodes/pay/with/amount", ref: "nodes.normalize.output.amount", from: "normalize", taint: ["extracted"], resolved: true, hook: null }`; the one at `/nodes/extract/input/text` has `from` `fetch_invoice` and `taint` `["untrusted"]`; the one at `/nodes/fetch_invoice/with/invoice_id` has `ref` `inputs.invoice_id`, `from` `null`, `taint` `[]`

#### Scenario: Code does not launder and fields are precise
- **WHEN** the test analyzes a flow with `fetch` (block `invoices.get@1`, `with: { id: "${{ inputs.id }}" }`), `c` (code, `input: { t: "${{ nodes.fetch.output.raw_text }}" }`), `ids` (code, `input: { i: "${{ nodes.fetch.output.invoice_id }}" }`), `x` (llm.extract, `input: { t: "${{ nodes.fetch.output.raw_text }}" }`), `t` (llm.extract, `input: {}`), `g` (llm.generate, `input: { a: "${{ nodes.x.output.s }}", b: "${{ nodes.fetch.output.vendor_name }}" }`) and `m` (block `mail.send@1`, `with: { body: "${{ nodes.c.output.t }}" }`), with catalogue C
- **THEN** the `output` of `c` is `["untrusted"]`, of `ids` `[]`, of `x` `["extracted"]`, of `t` `["extracted"]` (also over a trusted input), of `g` `["extracted", "untrusted"]`, and the `input` of `m` is `["untrusted"]`; the edge at `/nodes/m/with/body` has `from` `c`, `taint` `["untrusted"]`; the one at `/nodes/ids/input/i` has `[]`

#### Scenario: Sources of untrusted data and the closed outcome
- **WHEN** the test analyzes the `Sources sample` (reference.md § Test samples) with catalogue C
- **THEN** the `output` is `["untrusted"]` for `h`, `ag`, `sf`, `d1`, `d3`, `fe1`, `fe3`, `dec`, `ap`, and `[]` for `w`, `ag2`, `d2`, `fe2`, `after`; `w` has `fields` `{ notes: ["untrusted"] }`; `dec` has `fields` `{ outcome: [] }`; the edges at `/nodes/use/input/o` and `.../p` have `taint` `[]`, the one at `.../r` has `["untrusted"]`; the edge at `/nodes/fe1/with/q` has `ref` `item.name`, `taint` `["untrusted"]`, `resolved` `true` and the one at `/nodes/fe2/with/q` has `taint` `[]`; the `input` of `after` is `[]`

#### Scenario: Context sources are untrusted unless approved
- **WHEN** the test analyzes, with catalogue C, nodes with `input: {}` and `context` entries (with a `source`) of these tiers: `a` (llm.extract) `unreviewed`; `b` (llm.generate) `approved` then `unreviewed`; `c` (llm.generate) `approved`; `d` (llm.generate) one entry without `tier`
- **THEN** `a` has `input` `["untrusted"]` and `output` `["extracted"]`, `b` has `["untrusted"]` and `["untrusted"]`, `c` has `[]` and `[]`, and `d` has `["untrusted"]` and `["untrusted"]`

### Requirement: Hooks add taint and never remove it
`analyzeTaint` SHALL add the references of applying code hooks to a node's input, widen the output of `block`, `code`, `llm.extract`, `llm.generate` and `delegate` nodes with their input when a code hook applies, leave nodes unchanged by block hooks while reporting their references as edges, and resolve `hook.input.*` to the node's input, `hook.output.*` to its output and `hook.node.*`, `hook.next.*`, `hook.from.*` to trusted metadata.

#### Scenario: Hook references, widening and flow rules
- **WHEN** the test analyzes the hook sample with catalogue C (reference.md § Test samples: nodes `fetch`, `ex`, `ex2`, `lk`, `pay`, `done` and the rules `guard`, `audit`, `idle`)
- **THEN** `ex` (post code hook) has `input` `["untrusted"]` and `output` `["extracted", "untrusted"]`; `ex2` (pre block hook only) has `["untrusted"]` and `["extracted"]`; `pay` has `["untrusted"]` and `["untrusted"]`; `fetch`, `lk` and `done` have `[]` and `[]`, so `idle` changed nothing and `guard` did not reach `lk`
- **THEN** `edges` has 12 entries; the seven with a non-null `hook` are, in order, as `to` `path` (`ref`, `from`, `taint`, `hook`): `done` `/hooks/1/pre/with/v` (`nodes.fetch.output.raw_text`, `fetch`, `["untrusted"]`, `a`); `done` `/hooks/1/pre/with/s` (`hook.input.x`, `null`, `[]`, `a`); `ex2` `/nodes/ex2/pre/0/with/z` (`hook.input.t`, `null`, `["untrusted"]`, `note`); `fetch` `/nodes/fetch/post/0/with/text` (`hook.output.raw_text`, `fetch`, `["untrusted"]`, `tell`), `.../with/id` (`hook.output.id`, `fetch`, `[]`, `tell`) and `.../with/who` (`hook.node.id`, `null`, `[]`, `tell`); `pay` `/hooks/0/pre/input/raw` (`nodes.fetch.output.raw_text`, `fetch`, `["untrusted"]`, `g`); all have `resolved` `true`

### Requirement: Anything unresolved is untrusted and the analysis is total
`analyzeTaint` SHALL give `untrusted` to an unknown block or delegate target, a node of unknown `kind` or that is not an object, a malformed hook structure (as an unresolved code hook), a reference to a missing node, an `item` reference outside a `foreach` `with` and a `${{ }}` segment that does not parse, including `nodes.n.output` with no path (the last three as edges with `resolved` `false`); it SHALL NOT throw for such a document and SHALL let an exception of the catalogue propagate unchanged.

#### Scenario: Unknown and malformed input fails closed
- **WHEN** the test analyzes, with catalogue C, `u` (block `nope@1`, `with: { a: "${{ inputs.a }}" }`), `d` (code, `input: { a: "${{ nodes.ghost.output.x }}", b: "${{ item.x }}", c: "${{ nope }}", d: "${{ inputs.ok }}" }`), `k` (`kind: "mystery"`), `n` (the number `5`), `c` (code, `input: { a: "${{ nodes.u.output.x }}" }`), `m` (block `mail.send@1`, `with: { a: "plain ${{ inputs.a }}" }`), `x` (delegate `n8n` workflow `zzz`, `with: {}`), `fetch` (block `invoices.get@1`, `with: {}`) and `e` (code, `input: { a: "${{ nodes.fetch.output }}" }`, a whole-output reference that U22's grammar refuses); then analyzes `{ nodes: [] }`; then analyzes a flow parsed by `JSON.parse('{"nodes":{"__proto__":{"kind":"end"},"a":{"kind":"end"}}}')`; then analyzes a flow with one block node using a catalogue whose `block` throws `new Error("boom")`
- **THEN** `u`, `d`, `k`, `n`, `c`, `x` and `e` have `output` `["untrusted"]` (`input` `["untrusted"]` for `d`, `c`, `e`, else `[]`); `m` and `fetch` have `[]` and `[]`, with `fetch` `fields` `{ raw_text: ["untrusted"], vendor_name: ["untrusted"] }`; `e`'s edge is `{ ref: "${{ nodes.fetch.output }}", from: null, taint: ["untrusted"], resolved: false }`; the four edges of `d` are `{ ref: "nodes.ghost.output.x", from: null, taint: ["untrusted"], resolved: false }`, `item.x` with the same, `${{ nope }}` (the raw text) with the same, and `inputs.ok` with `taint` `[]` and `resolved` `true`; `{ nodes: [] }` gives `{ nodes: {}, edges: [] }`; the `JSON.parse` flow gives `Object.keys(result.nodes)` equal to `["__proto__", "a"]` with `Object.hasOwn(result.nodes, "__proto__")` true; the catalogue's own error object is rethrown (`assert.equal(caught, thrown)`)

#### Scenario: Malformed hook structures fail closed
- **WHEN** the test analyzes, with catalogue C, (1) `a` (code, `input: {}`, `pre: "oops"`), `b` (llm.extract, `input: {}`, `post: [5]`), `c` (llm.decide, `input: {}`, `post: [{ id: "h", kind: "mystery" }]`) and `w` (code, `input: {}`); (2) `src` (block `invoices.get@1`, `with: {}`), `z` (code, `input: {}`), `y` (end) with `hooks: [{ id: "r", match: { kind: "code" }, pre: { id: "p", kind: "code", input: { r: "${{ nodes.src.output.raw_text }}" }, source: "x" } }]`, and the same with `kind: ["code"]`; (3) `w` alone with `hooks: "oops"`
- **THEN** (1) gives (`input`, `output`) of (`["untrusted"]`, `["untrusted"]`) for `a`, (`["untrusted"]`, `["extracted", "untrusted"]`) for `b`, (`["untrusted"]`, `["untrusted"]`) with `fields` `{ outcome: [] }` for `c`, (`[]`, `[]`) for `w`, and `edges` `[]`; (2) gives `y` and `z` `input` `["untrusted"]` (a malformed `match` matches every node), but with `kind: ["code"]` only `z` (`y` is `[]`); (3) gives `w` `input` `["untrusted"]` and no throw

### Requirement: Propagation reaches one deterministic fixpoint within bounded size
`analyzeTaint` SHALL terminate on cyclic references with the least fixpoint, return the same result for any insertion order of `nodes` (ids and edges ordered by design.md Decision 7), and throw `TaintError` with code `"TAINT_TOO_LARGE"` above `TAINT_LIMITS.maxNodes` nodes, `maxHookPairs` rule-node pairs or `maxEdges` reference occurrences.

#### Scenario: Cycles, self-references and order
- **WHEN** the test analyzes the `Cycle sample` (reference.md § Test samples) with catalogue C, once with `nodes` inserted in the order listed and once in reverse
- **THEN** both return with equal `JSON.stringify`; (`input`, `output`) is (`["untrusted"]`, `["untrusted"]`) for `a`, `b` and `s2`, (`["extracted", "untrusted"]`, `["extracted"]`) for `p`, (`["extracted", "untrusted"]`, `["extracted", "untrusted"]`) for `q` and (`[]`, `[]`) for `s1`; `Object.keys(result.nodes)` ascends

#### Scenario: Size limits
- **WHEN** the test analyzes flows of `end` nodes, capturing the thrown error: 5001 nodes; 5000 nodes and 41 rules `{ id, match: {}, pre: { id, kind: "block", uses: "mail.send@1", with: {} } }`; 1000 nodes and one such rule whose `with` is `{ r: "${{ inputs.a }}".repeat(101) }`; and, without a throw, 5000 nodes and no rule, 5000 nodes and 40 rules, 1000 nodes with `.repeat(100)`
- **THEN** the first three calls throw a `TaintError` (`instanceof`) with `code` `"TAINT_TOO_LARGE"` and `message` `taint analysis limit exceeded: nodes 5001 > 5000`, `taint analysis limit exceeded: hook pairs 205000 > 200000` and `taint analysis limit exceeded: edges 101000 > 100000`; the last three return, the third with `edges.length` 100000; and `TAINT_LIMITS` equals `{ maxNodes: 5000, maxHookPairs: 200000, maxEdges: 100000 }` and is frozen

### Requirement: Flow capabilities are derived from the catalogue and fail closed
`flowCapabilities(flow, catalogue)` SHALL return the booleans `reads_untrusted`, `reads_private` and `has_send_or_pay`, and `capabilityEvidence` the sites (`at` JSON Pointer, `tool`) behind each, sorted by `at` then `tool`; an unknown tool, a node of unknown kind and a malformed `nodes` SHALL set all three flags and be listed under `unknown`; an exception of the catalogue SHALL propagate unchanged.

#### Scenario: RF-1 and one-block flags
- **WHEN** the test calls `capabilityEvidence` and `flowCapabilities` on the RF-1 sample with catalogue C, and `flowCapabilities` on flows of one node `a` that is a block of `docs.fetch@1`, `kb.search@1`, `crm.update@1`, `mail.send@1`, `erp.create_payment@1` or `http.get@1`, a delegate `n8n`/`calc`, and on `{ nodes: {} }`
- **THEN** the RF-1 evidence, with a site written (`at`, `tool`), is `reads_untrusted` (`/nodes/archive/target`, `n8n:archive-invoice`), (`/nodes/fetch_invoice/uses`, `invoices.get@1`); `reads_private` (`/nodes/fetch_invoice/uses`, `invoices.get@1`), (`/nodes/lookup_vendor/uses`, `erp.lookup_vendor@1`); `has_send_or_pay` (`/nodes/archive/target`, `n8n:archive-invoice`), (`/nodes/notify_rejection/uses`, `mail.send@1`), (`/nodes/pay/uses`, `erp.create_payment@1`); `unknown` `[]`; `flowCapabilities` is all three `true`; the one-node flags (`reads_untrusted`, `reads_private`, `has_send_or_pay`) are `(false, false, false)` for `docs.fetch@1`, `(false, true, false)` for `kb.search@1` (an unmarked read is private), `(true, false, false)` for `crm.update@1` and for `http.get@1`, `(false, false, true)` for `mail.send@1` and `erp.create_payment@1`, `(false, false, false)` for the calc delegate and for the empty flow

#### Scenario: Agents, hooks, subflows, context and order
- **WHEN** the test calls `capabilityEvidence` with catalogue C on a flow whose nodes are declared in the order `s` (subflow `f@1`), `l` (llm.decide with `context: [{ source: "retr://x", tier: "unreviewed" }, { source: "retr://y", tier: "approved" }]`), `fe2` (foreach `uses: "mail.send@1"`), `fe` (foreach `subflow: "g@1"`), `a` (end with `pre: [block hook mail.send@1, code hook]` and `post: [block hook http.get@1]`) and `ag` (agent, `tools: ["kb.search@1", "http.get@1", "mail.send@1"]`), and one flow rule `{ id: "r", match: {}, pre: { id: "rp", kind: "block", uses: "erp.lookup_vendor@1", with: {} } }`
- **THEN** the sites (`at`, `tool`) are, for `reads_untrusted`: (`/nodes/a/post/0/uses`, `http.get@1`), (`/nodes/ag/tools/1`, `http.get@1`), (`/nodes/fe/subflow`, `g@1`), (`/nodes/l/context/0`, `retr://x`), (`/nodes/s/flow`, `f@1`); for `reads_private`: (`/hooks/0/pre/uses`, `erp.lookup_vendor@1`), (`/nodes/ag/tools/0`, `kb.search@1`); for `has_send_or_pay`: (`/nodes/a/pre/0/uses`, `mail.send@1`), (`/nodes/ag/tools/2`, `mail.send@1`), (`/nodes/fe2/uses`, `mail.send@1`); `unknown` is `[]`

#### Scenario: Unknown sites fail closed and catalogue errors propagate
- **WHEN** the test calls `capabilityEvidence` and `flowCapabilities` with catalogue C on `a` (block `nope@1`), `b` (`kind: "mystery"`), `c` (the number `7`) and `d` (delegate `x` workflow `y`); on `{ nodes: [] }`; and on a one-block flow with a catalogue whose `block` throws `new Error("boom")`
- **THEN** `unknown` holds the sites (`at`, `tool`) (`/nodes/a/uses`, `nope@1`), (`/nodes/b/kind`, `mystery`), (`/nodes/c/kind`, `""`), (`/nodes/d/target`, `x:y`) and each of the other three lists holds the same four; the three flags are `true`; `{ nodes: [] }` gives all three flags `true` and the one site (`/nodes`, `""`) in each list; the throwing catalogue's own error object is rethrown by both functions

#### Scenario: Malformed hook structures are unknown sites
- **WHEN** the test calls `capabilityEvidence` and `flowCapabilities` with catalogue C on (1) the flow of part (1) of scenario "Malformed hook structures fail closed"; (2) `w` (code, `input: {}`) with `hooks: [{ id: "r", match: { kind: "code" }, pre: { id: "p", kind: "code", input: {}, source: "x" } }, 5, { id: "t", match: {}, post: { id: "q", kind: "mystery" } }]`; (3) `w` with `hooks: "oops"`
- **THEN** `unknown` holds the sites (`at`, `tool`) (1) (`/nodes/a/pre`, `""`), (`/nodes/b/post/0`, `""`), (`/nodes/c/post/0`, `""`); (2) (`/hooks/0/match/kind`, `""`), (`/hooks/1`, `""`), (`/hooks/2/post`, `""`); (3) (`/hooks`, `""`); each of the other three lists holds the same sites and all three flags are `true`

### Requirement: The authoring surface exports the taint module
`src/authoring/index.ts` SHALL export every name of the Interfaces given, so other modules import the taint algebra only through `src/authoring`.

#### Scenario: Names are exported by the authoring surface
- **WHEN** the test imports `* as authoring` from `src/authoring/index.ts`, takes `typeof` of the names below, then calls `authoring.joinTaint(["untrusted"], ["extracted"])`
- **THEN** `typeof` is `"function"` for `normalizeTaint`, `joinTaint`, `relabelExtract`, `taintIncludes`, `analyzeTaint`, `capabilityEvidence`, `flowCapabilities` and `TaintError`, and `"object"` for `TAINT_LABELS`, `NO_TAINT` and `TAINT_LIMITS`; the call returns `["extracted", "untrusted"]`
