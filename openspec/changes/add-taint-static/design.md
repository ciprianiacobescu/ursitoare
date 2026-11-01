## Context

Architecture §8.7 requires one taint algebra for the validator, the grants and the runtime: labels `untrusted` (raw external content) and `extracted` (typed values pulled out of untrusted content by a tool-less step); no label means trusted. §9.3 computes `{reads_untrusted, reads_private, has_send_or_pay}` from it at activation. This unit is that module, `src/authoring/taint/`: pure (no clock, ids, I/O, database), importing only U22's `../format/index.ts` (the module `authoring` may import only `core` from other modules).

It ports `seed/policy-cedar/src/extractor.ts` (capabilities, the `static_taint` of each call) and the label code of `seed/format/src/validate.ts`, and drops both seeds' own rules: the validator's three-rank lattice (join = maximum) and the relabelling of `code` output as `extracted` (the roadmap row of U25; §8.7 names it the draft's defect). U25 ports its L3 checks onto `analyzeTaint`; U40 gives the runtime the same rules and checks `taintIncludes(static, runtime)`; U69 and the grants units call `flowCapabilities`. Taken shapes and test samples: `reference.md`.

## Interfaces

Declarations omit `export`; `src/authoring/taint/index.ts` exports all of them and `src/authoring/index.ts` re-exports it. This block is the proposal's "Interfaces given" word for word. `TAINT_LABELS`, `NO_TAINT` and `TAINT_LIMITS` are frozen; `TAINT_LIMITS` is `{ maxNodes: 5000, maxHookPairs: 200000, maxEdges: 100000 }`. Files: `labels.ts`, `analyze.ts` (with internal `tools.ts`: `describeTool`, and `hooks.ts`), `capabilities.ts`, `errors.ts`, `index.ts`; tests import the names below from `src/authoring/taint/index.ts` (`surface.test.ts` from `src/authoring/index.ts`).

```ts
type TaintLabel = "extracted" | "untrusted"
type Taint = readonly TaintLabel[]
const TAINT_LABELS: readonly TaintLabel[]
const NO_TAINT: Taint
function normalizeTaint(labels: readonly string[]): Taint
function joinTaint(a: Taint, b: Taint): Taint
function relabelExtract(input: Taint): Taint
function taintIncludes(outer: Taint, inner: Taint): boolean
interface NodeTaint { input: Taint; output: Taint; fields: { [field: string]: Taint } }
interface TaintEdge { to: string; path: string; ref: string; from: string | null; taint: Taint; resolved: boolean; hook: string | null }
interface TaintAnalysis { nodes: { [id: string]: NodeTaint }; edges: TaintEdge[] }
const TAINT_LIMITS: { readonly maxNodes: number; readonly maxHookPairs: number; readonly maxEdges: number }
type TaintErrorCode = "TAINT_TOO_LARGE"
class TaintError extends Error { readonly code: TaintErrorCode; constructor(code: TaintErrorCode, message: string) }
function analyzeTaint(flow: Flow, catalogue: Catalogue): TaintAnalysis
interface FlowCapabilities { reads_untrusted: boolean; reads_private: boolean; has_send_or_pay: boolean }
interface CapabilitySite { at: string; tool: string }
interface CapabilityEvidence { reads_untrusted: CapabilitySite[]; reads_private: CapabilitySite[]; has_send_or_pay: CapabilitySite[]; unknown: CapabilitySite[] }
function capabilityEvidence(flow: Flow, catalogue: Catalogue): CapabilityEvidence
function flowCapabilities(flow: Flow, catalogue: Catalogue): FlowCapabilities
```

Reading the results (what `from`, `resolved` and `hook` mean): proposal.md § Impact, after Interfaces given.

## Decisions

1. **Labels and join.** `Taint` is a sorted, duplicate-free array over `TAINT_LABELS = ["extracted", "untrusted"]`; trusted is `[]`. Join is union, so a value mixing both labels (an `llm.generate` reading an extracted and a raw untrusted value) is `["extracted", "untrusted"]`; the seed's rank lattice cannot say that, and the PEP receives the whole list (§8.7).

   | a \ b | `[]` | `["extracted"]` | `["untrusted"]` | both |
   |---|---|---|---|---|
   | `[]` | `[]` | `["extracted"]` | `["untrusted"]` | both |
   | `["extracted"]` | `["extracted"]` | `["extracted"]` | both | both |
   | `["untrusted"]` | `["untrusted"]` | both | `["untrusted"]` | both |
   | both | both | both | both | both |

   `normalizeTaint` sorts, dedupes and maps every string that is not a label to `untrusted` (the runtime reads stored labels). `joinTaint(a, b)` is `normalizeTaint([...a, ...b])`. `relabelExtract(t)` removes `untrusted` from `normalizeTaint(t)` and adds `extracted` (so it gives `["extracted"]` today, and carries over a third label if one is added: §8.7). `taintIncludes(outer, inner)`: every label of `normalizeTaint(inner)` is in `normalizeTaint(outer)`.

2. **Output rules.** With `I` the input taint of Decision 3 and `U` = `["untrusted"]`:

   | Kind | `output` | `fields` |
   |---|---|---|
   | `block` | `I`; `I ∪ U` when the tool is unknown or has `untrusted_result: true` | when neither: each `untrusted_fields` entry (a top-level output field name; a dotted entry is read as its first segment) gives that field the value `I ∪ U` |
   | `llm.extract` | `relabelExtract(I)`, also when `I` is empty | `{}` |
   | `llm.decide` | `I` | `{ outcome: [] }` (a closed enum) |
   | `agent` | `I ∪ U` when `tools` is not an array or names a tool that is unknown or untrusted, else `I` | `{}` |
   | `foreach` | `I ∪ U` unless `uses` is a string naming a known tool that is not untrusted, else `I` | `{}` |
   | `subflow` | `I ∪ U` | `{}` |
   | `delegate` | `I ∪ U` unless `catalogue.delegateTarget(target, workflow)` exists with `untrusted_result === false` | `{}` |
   | `code`, `llm.generate`, `human.approval`, `human.form`, `switch`, `wait`, `end` | `I` (the union: `code` never launders) | `{}` |
   | unknown `kind`, or not an object | `U` (`input` `[]`) | `{}` |

   A tool is untrusted when its `BlockDef` has `untrusted_result: true` or a non-empty `untrusted_fields`. `nodes.n.outcome` carries `[]` when `n` is `llm.decide` or `human.approval` (a closed enum; the human's decision) and `n`'s `output` otherwise. `inputs.*` carries `[]` (§8.7 lists no input source); memory reads have no construct in format v0.2 and are not modelled. A `subflow` result is untrusted by §8.7.

3. **Input taint.** `I` of a node is the join of: the taint of every reference found by `walkStrings` and `scanTemplate` in `valueFields(node)`; the taint of every reference outside the `hook` root in every applying code hook (Decision 5); and `U` when the node is `llm.extract`, `llm.generate`, `llm.decide` or `agent` and its `context` has an entry whose `tier` is not exactly `"approved"` (`tier: unreviewed` means tainted; a missing tier fails closed).

4. **References.** `inputs.*`: `[]`. `nodes.n.output.p...`: `fields[p]` if an own key, else `output`, of `n`'s current state. U22's grammar needs at least one path segment after `output` (`parseRef` refuses `nodes.n.output` and `hook.output`), so `${{ nodes.n.output }}` is a segment that does not parse (below); a `Ref` with an empty path that reaches this module anyway carries the join of `output` and every `fields` entry. `nodes.n.outcome`: Decision 2. `item.*`: the join of the taint of the `items` references of the enclosing `foreach`, valid only in that node's `with`. `hook.input.*`: the wrapped node's `input`. `hook.output.*`: its `output` by first path segment as for `nodes` (also in a pre hook, where U41 reports it). `hook.node.*`, `hook.next.*`, `hook.from.*`: `[]` (engine metadata). A missing node, `item.*` elsewhere and a segment that does not parse: `["untrusted"]`, `resolved: false`.

5. **Hooks** never relabel or clear taint (§8.7; ADR-16 item 6).
   - *Which hooks apply.* A node's own `pre` and `post` lists. A flow rule in `flow.hooks` applies to a node its `match` accepts: every present field must match, list members are alternatives, `{}` matches all. `kind` matches `node.kind`, `nodes` the id, `tags` any shared tag; `effect` matches the node's effect class: a `block` or `foreach` with `uses` has its catalogue `effect`, a `delegate` its target's, `llm.*`, `code`, `switch` and `wait` are `read`, `human.*` are `human`, `end` is `none`; an unknown block or target, `agent`, `subflow` and a `foreach` without `uses` match every effect selector. `when` is ignored (the hook may run). A rule's `pre` and `post` apply on their own.
   - *Code hooks* may mutate. The references of all applying code hooks, pre and post, join the node's `input` (a pre hook mutates the input, a retry feeds the node). For `block`, `code`, `llm.extract`, `llm.generate` and `delegate` nodes with an applying code hook, `output` and every `fields` entry are also joined with `I`: the hook sees the raw input and may write it into the output, so a post code hook on an `llm.extract` gives `["extracted", "untrusted"]`. `llm.decide`'s `outcome` stays `[]`.
   - *Block hooks* neither mutate nor can be referenced: they change no node state, but each of their references is an edge (with `hook` set) so U25 and U41 can check a hook that sends untrusted data.
   - *Malformed hook structures fail closed.* A rule that is not an object, or whose `match` is missing or not an object, or has a selector field (`kind`, `effect`, `nodes`, `tags`) that is not an array, matches every node; a rule that is not an object, and `flow.hooks` present but not an array, count as one malformed hook entry on every node. A hook entry that is not an object, or whose `kind` is neither `code` nor `block`, or a node `pre`/`post` or rule `pre`/`post` that is present but not an array (lists) or object (rule slots), is a malformed hook entry: it counts as a code hook whose references are unresolved, so it joins `["untrusted"]` into the node's `input` and widens the output as a code hook does; it adds no edge. Each malformed structure is also a capability `unknown` site (Decision 8).
   - Edge `path`: `/nodes/<id>/pre/<i>/<field>/...` or `.../post/...` for a node's hook; `/hooks/<i>/pre/<field>/...` or `.../post/...` for a rule, with `to` the wrapped node (one edge per wrapped node). `<field>` comes from `hookValueFields`.

6. **Fail-closed, one rule.** Whatever this module cannot resolve is `untrusted`: an unknown block or delegate target, a node of unknown `kind` or that is not an object, a missing node in a reference, `item.*` outside a `foreach` `with`, a segment that does not parse, whole-output references included (the last three are edges with `resolved: false`), a malformed hook structure (Decision 5). For capabilities an unknown site sets all three flags and is listed under `unknown`. The functions are total: no plain-JSON document makes them throw except with `TaintError`; `flow.nodes` that is not a plain object counts as no nodes (capabilities: Decision 8). They never catch the catalogue.  Lookups use `Object.hasOwn` or a `Map` and results `Object.fromEntries`, so a `__proto__` node id stays data.

7. **Fixpoint, order, limits.**
   - *Mechanism.* Sort the node ids (UTF-16), parse every reference once, give each node an empty state `{ input, output, fields }` and record each node's consumers (nodes whose value fields or code hooks reference it). A worklist starts with all ids in order; evaluating a node applies Decisions 2 to 5 to the current states and sets its state to `join(old, evaluation)` (key-wise on `fields`); if the state changed, its consumers are queued in ascending order unless queued. Labels are finite and every rule monotone, so the loop ends with the least fixpoint in any visit order (a cycle saturates; a `code` self-reference without a source stays `[]`). A last pass builds the edges from the final states.
   - *Order.* `nodes`: ascending ids; `fields`: ascending keys; `edges`: ascending by `to`, then per node its value fields (`valueFields` order, strings in `walkStrings` order, references left to right), its `pre` hooks, its `post` hooks, then each applying flow rule by index (its `pre`, then its `post`). Insertion order of `nodes` never matters.
   - *Limits*, all three checked in this order before the first catalogue call: node count over `maxNodes`; rule count (`flow.hooks.length`, or 1 when `flow.hooks` is not an array) times node count over `maxHookPairs`; reference occurrences over `maxEdges`. The edge count applies every rule to every node without evaluating selectors, so it can over-count. Over a limit: `TaintError("TAINT_TOO_LARGE", "taint analysis limit exceeded: <nodes|hook pairs|edges> <n> > <max>")`. U22 allows 1 MiB (about 20,000 small nodes) and rules times nodes is quadratic; real flows are tiny (RF-1: 11 nodes; 200 nodes is about 100 KB), so the limits sit at 25 times that. U25 reports a `TaintError` as a validation error; a caller that gates a decision on this module treats a throw as a denial. `capabilityEvidence` is linear and has no limit.

8. **Capabilities.** The sites (`at` a JSON Pointer, `tool` a string) are listed in `reference.md` § Capability sites; the malformed hook structures of Decision 5 add the sites listed there.

   Per block tool (`describeTool`, shared with Decision 2): unknown (the catalogue answers `undefined`, or `uses` is not a string) counts for all three flags and `unknown`; otherwise `reads_untrusted` when untrusted, `reads_private` when `effect === "read"` and `data_class !== "public"` (absent counts as private; `data_class` on a non-read block has no effect), `has_send_or_pay` when `effect` is not `read` or `write`. An unknown delegate target counts for all three and `unknown`; a known one is untrusted unless `untrusted_result === false` and sends when its `effect` is not `read` or `write`. Each list is sorted by `at` then `tool` (UTF-16) and deduplicated; a flag is "its list is not empty". The flags are flow-level (any site, reachable or not), as in §9.3: they do not prove that data reaches the effect.

## Failure cases

- Bad input (malformed, unknown or dangling reference, block, target, kind or hook structure, non-object node) never throws; it gives `untrusted` (Decision 6). A flow over a limit throws `TaintError`.
- Absence: no nodes gives `{ nodes: {}, edges: [] }` and all-false capabilities (`nodes` not an object: all-true, site `/nodes`); no value fields gives `input` `[]`.
- The catalogue raises: its exception propagates unchanged. No state between calls, no concurrency.

## Security

1. No endpoint or PEP action (a library; callers authenticate first).
2. No table or query, so no two-tenant test.
3. The labels feed `static_taint` and the activation gate; the module is conservative (unknowns are untrusted, hooks never clear). Residual gaps (Decisions 2 and 8): trigger inputs are trusted, a subflow's own capabilities are invisible, memory reads are not modelled. Documents stay untrusted until U25 validates them.
4. No secret is read or logged; a `TaintError` message holds a limit name and two numbers.
5. Abuse and its scenario: laundering through `code` ("Code does not launder and fields are precise"); data behind a hook ("Hook references, widening and flow rules"); an unknown tool or kind and a `__proto__` node id ("Unknown and malformed input fails closed"); a huge flow ("Size limits"); a cycle ("Cycles, self-references and order").

## Test plan

Node tests beside the code (`labels`, `analyze`, `sources`, `hooks`, `closed`, `capabilities`, `surface`, each `<name>.test.ts`), `node:assert/strict`, no database, network or clock. Each file declares its samples inline (no helper exists at red; samples in `reference.md` § Test samples) as plain objects cast with `as unknown as Flow` and a catalogue `{ ...emptyCatalogue, block, delegateTarget }` over `Object.hasOwn`-guarded maps. Every call is wrapped in `assert.doesNotThrow(() => { r = f(x); })` and asserted on `r` (the scaffold stub throws `new Error("not implemented")`, so red fails by assertion); a throw is captured with `let caught; try { f(x) } catch (e) { caught = e }`. Test names contain no `.`, `[` or `::`.

## Decisions made while writing

- **Union labels, not a rank**; the seed validator's lattice and `code` relabelling are dropped (Decision 1, as the roadmap says).
- **`llm.extract` is always `extracted`**, also over trusted input (roadmap row of U23, §8.7); the seed extractor relabelled only tainted input. Conservative.
- **Every other node, `human.*` and `block` included, is the union of its inputs** (the seed gave a block no inherited labels): the literal §8.7 rule and the larger set, so "static includes runtime" holds whichever way U40 reads it; the cost is nil, since a human node's only referenced result is its trusted `outcome`.
- **Unmarked reads are private.** U22 types the catalogue marker as `data_class?: "public" | "private"`, the name §7 gives it. A `read` block counts as reading private data unless its `data_class` is `"public"` (absent is private, fail-closed), not the seed's "no `url` input" heuristic; `data_class` on a non-read block has no effect. Program note for U24, U25 and U26: public fetchers (`http.get`, `docs.fetch` and similar) need `data_class: "public"` in the test catalogue for the seed's trifecta results to hold (`add-test-catalogue` sets it), and U26's `RegistryCatalogue` passes its `data_class` through unchanged.
- **Context tiers:** only `tier: "approved"` is trusted. §7's own example has an untiered `metric://` source, which becomes `untrusted`; the author writes `tier: approved` to trust a source.
- **Effect selectors are evaluated** (spike effect table; unknown matches every selector; `when` ignored): spurious matches only add taint.
- **`TaintError` and its limits are this unit's own**; `edges` carry `resolved` so U25 need not resolve references twice. No `docs/authoring` page: U25 documents diagnostics.
