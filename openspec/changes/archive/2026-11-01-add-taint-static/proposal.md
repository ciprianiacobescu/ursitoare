## Why

Every M3 unit that reasons about untrusted data (the validator's L3 checks, the grants, the runtime's step labels, the activation gate) must use one algebra, or a flow can pass validation and then be denied at run time for taint alone (architecture §8.7). The spike had two: the validator relabelled `code` output as `extracted`, the runtime took the union. This unit is the single static algebra, plus the three flow capabilities that decide whether a flow is a lethal-trifecta flow and needs review before it activates (§9.3).

Observable result: `analyzeTaint(flow, catalogue)` returns, for every node, the labels of its input, its output and its output fields, and one result per `${{ }}` reference with the producer and the labels it carries; on RF-1, `fetch_invoice.raw_text` is `untrusted`, `extract` makes it `extracted`, `normalize` (a `code` node) keeps `extracted`, and `pay` sees `["extracted"]`. `flowCapabilities(flow, catalogue)` returns `{ reads_untrusted, reads_private, has_send_or_pay }`, all `true` for RF-1, and `capabilityEvidence` names the sites behind each flag. Whatever cannot be resolved (an unknown block, kind or reference) is `untrusted` and sets the flags, so the check fails closed.

## What Changes

- New code in `src/authoring/taint/`: `labels.ts` (the two labels and `joinTaint`), `analyze.ts` (propagation over references with a fixpoint, hooks, per-node and per-reference results), `tools.ts` and `hooks.ts` (internal), `capabilities.ts`, `errors.ts` (`TaintError` and the size limits), `index.ts`, and a re-export line in `src/authoring/index.ts`.
- Ported from the read-only seed `policy-cedar/src/extractor.ts` (capabilities and per-call static taint) and the label code of `format/src/validate.ts`, without the seed's own three-rank lattice and its `code` relabelling (roadmap row of U25). The seed's `private-blocks.json` name patterns are replaced by the catalogue's `data_class` marker.
- The rules are fixed in `design.md` Decisions 1 to 8: union labels, per-kind output rules, how hooks add taint without clearing it, fail-closed treatment of unknown input, determinism and the fixpoint on cycles.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded, because they change existing files: the line `export * from "./taint/index.ts";` in `src/authoring/index.ts` (created by `add-flow-format-model`; `add-flow-validator` and `add-hook-checker` also edit it and depend on this change or on a unit that does). Not scaffolded: the internal `tools.ts` and `hooks.ts` and the tests. No new dependency.
- **Depends on:** `add-flow-format-model` (U22), for `Flow`, `Catalogue`, `BlockDef`, the hook and node types, `NODE_KINDS`, the reference parser and the value-field helpers (restated in `reference.md`; its folder is not merged yet, so no `delivered-shapes.md` exists: nothing is taken from merged code). Nothing from `src/core`; `test/arch/modules.ts` needs no change (`authoring` allows `core` and the code imports only `../format/index.ts`).
- **Files:** the stubs of § What Changes; created: a `*.test.ts` per task, `tools.ts`, `hooks.ts`; changed: `src/authoring/index.ts`.
- **Migrations, tables, endpoints, env, audit events:** none. **Error code:** `TAINT_TOO_LARGE` (a library code on `TaintError`, not an API code; `ERROR_CODES` is untouched).
- **Exit test 4 (foundation):** this unit gives the static half: the RF-1 labels (`pay` sees `extracted`), RF-1's trifecta capabilities, and `taintIncludes` for U40's property test "static includes runtime"; U40, U68 and U69 add the runtime and policy halves.

**Interfaces given** (declarations omit `export`; the same text as the block in design.md § Interfaces)

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

`TAINT_LABELS`, `NO_TAINT` and `TAINT_LIMITS` are frozen; `TAINT_LIMITS` is `{ maxNodes: 5000, maxHookPairs: 200000, maxEdges: 100000 }`. A `Taint` is a sorted array (`[]` trusted, `["extracted"]`, `["untrusted"]`, `["extracted", "untrusted"]`). Result shapes and the rules behind them are in design.md; sites in `CapabilitySite` are `at` (a JSON Pointer into the flow) and `tool` (a block ref, `<target>:<workflow>`, a flow ref or a context source).

Reading the results. `NodeTaint.input` is the taint of everything the node reads (what a policy request for it carries); `output` that of its output; `fields` overrides `output` for named top-level output fields. One `TaintEdge` exists per reference occurrence: `to` is the node whose context holds it (for a flow rule, the wrapped node), `path` the JSON Pointer of its string in the flow document, `ref` the printed reference (`refToString`, or the raw `${{ ... }}` text when it does not parse), `from` the producing node (for `nodes.*` of an existing node and `hook.output.*`), else `null` (also for a missing node), `taint` the labels it carries, `resolved` false when it could not be resolved (`taint` is then `["untrusted"]`), `hook` the id of the hook holding it else `null`. U25 reports L3 diagnostics from `edges` and `nodes`, and skips `resolved: false` edges that its own reference checks report.

**Interfaces taken**

- From `add-flow-format-model`: `Flow`, `FlowNode`, `NodeKind`, `NODE_KINDS`, `Effect`, `Catalogue`, `emptyCatalogue` (tests only), `BlockDef`, `DelegateTargetDef`, `HookRule`, `HookDef`, `HookSelector`, `ContextSource`, `Ref`, `Seg`, `ValueField`, `scanTemplate`, `refToString`, `walkStrings`, `escapePointer`, `valueFields`, `hookValueFields`. Their exact declarations are in `reference.md`.

Test samples use this unit's own catalogue C, not `add-test-catalogue`'s; names they share (`docs.fetch@1`, `http.get@1`, `kb.search@1`) carry other markers here.

**Catalogue C** (blocks, then delegate targets `target/workflow`): `invoices.get@1` read, `untrusted_fields` `["raw_text", "vendor_name"]`; `erp.lookup_vendor@1` read, `data_class: "private"`; `erp.create_payment@1` pay; `mail.send@1` send; `http.get@1` read, `untrusted_result: true`, `data_class: "public"`; `docs.fetch@1` read, `data_class: "public"`; `kb.search@1` read; `crm.update@1` write, `untrusted_fields` `["notes"]`; `n8n/archive-invoice` effect send, `untrusted_result: true`; `n8n/calc` effect read, `untrusted_result: false`. Every other ref is unknown.

## Out of scope

Validation and its diagnostics (the L3 sink checks, `W_LETHAL_TRIFECTA`, `L3_TAINT_*`, mapping a `TaintError`): `add-flow-validator`, which calls `analyzeTaint` and `flowCapabilities`. Runtime labels on step records and the property test that static includes runtime: `add-taint-runtime`. The Cedar forbid and the activation gate: `add-trifecta-gate`. The test catalogue with its `data_class` markers: `add-test-catalogue`; `data_class` in the registry: `add-block-registry`. The hooks checker (`H_*` codes): `add-hook-checker`. Capabilities of a subflow's own blocks, memory reads and tainted trigger inputs.
