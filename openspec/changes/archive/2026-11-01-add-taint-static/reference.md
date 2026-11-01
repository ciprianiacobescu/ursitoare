## Taken shapes (restated exactly from `add-flow-format-model`, design.md § Interfaces)

No name below is redefined by this change. The 14 node types in the `FlowNode` union (with `NodeOf`, `NodeBase`, `LlmTuning`) are declared in that section of `add-flow-format-model`; this change reads nodes as untyped records, and uses the fields `kind`, `uses`, `with`, `input`, `items`, `summary`, `tools`, `target`, `workflow`, `flow`, `subflow`, `context`, `tags`, `pre`, `post` exactly as they are named there.

```ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
type JsonSchema = { [key: string]: JsonValue }
type Effect = "read" | "write" | "send" | "pay"
const NODE_KINDS: readonly NodeKind[]
interface Flow { ursitoare: string; flow: string; version: string; description?: string; inputs: JsonSchema; start: string; nodes: { [id: string]: FlowNode }; hooks?: HookRule[]; expose?: "mcp" }
interface Catalogue { block(ref: string): BlockDef | undefined; modelProfile(ref: string): ModelProfileDef | undefined; role(name: string): RoleDef | undefined; delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined; flow(ref: string, major: number): FlowSignature | undefined }
const emptyCatalogue: Catalogue
type Ref = { root: "inputs"; path: string[] } | { root: "node"; id: string; field: "output" | "outcome"; path: string[] } | { root: "item"; path: string[] } | { root: "hook"; scope: HookScope; path: string[] }
type Seg = { type: "text"; text: string } | { type: "ref"; raw: string; ref?: Ref; error?: string }
function scanTemplate(text: string): Seg[]
function refToString(ref: Ref): string
function walkStrings(value: unknown, path: string, visit: (text: string, path: string) => void): void
function escapePointer(segment: string): string
function valueFields(node: unknown): ValueField[]
function hookValueFields(hook: unknown): ValueField[]
type HookScope = "input" | "output" | "node" | "next" | "from"
interface BlockDef { effect: Effect; description?: string; input: JsonSchema; output: JsonSchema; untrusted_fields?: string[]; data_class?: "public" | "private"; untrusted_result?: boolean; unsafe_to_retry?: boolean }
interface ModelProfileDef { ref: string }
interface RoleDef { name: string }
interface DelegateTargetDef { effect: Effect; untrusted_result: boolean }
interface FlowSignature { input: JsonSchema; output: JsonSchema }
interface ValueField { field: string; value: unknown }
type Values = { [name: string]: JsonValue }
type NodeKind = "block" | "code" | "llm.extract" | "llm.generate" | "llm.decide" | "agent" | "switch" | "human.approval" | "human.form" | "foreach" | "subflow" | "delegate" | "wait" | "end"
interface HookSelector { kind?: NodeKind[]; effect?: (Effect | "human" | "none")[]; nodes?: string[]; tags?: string[] }
interface HookWhen { from?: HookSelector; next?: HookSelector; outcome?: string[] }
interface CodeHook { id: string; kind: "code"; when?: HookWhen; input?: Values; source: string; routes?: string[]; max_retries?: number; allow_effect_retry?: boolean }
interface BlockHook { id: string; kind: "block"; when?: HookWhen; input?: Values; uses: string; with: Values; on_error?: "fail" | "continue" }
type HookDef = CodeHook | BlockHook
interface HookRule { id: string; match: HookSelector; pre?: HookDef; post?: HookDef }
interface ContextSource { source: string; tier?: string; scope?: { tenant?: string; role?: string; step?: string }; budget?: { max_tokens?: number; max_age?: string }; on_unanswerable?: string }
type FlowNode = BlockNode | CodeNode | LlmExtractNode | LlmGenerateNode | LlmDecideNode | AgentNode | SwitchNode | HumanApprovalNode | HumanFormNode | ForeachNode | SubflowNode | DelegateNode | WaitNode | EndNode
```

## Test samples

**Catalogue C**: proposal.md § Impact.

**RF-1 sample** (`kind`, then fields; refs are `${{ ... }}`): `fetch_invoice` block `invoices.get@1`, `with: { invoice_id: "${{ inputs.invoice_id }}" }`; `extract` llm.extract, `input: { text: "${{ nodes.fetch_invoice.output.raw_text }}" }`; `lookup_vendor` block `erp.lookup_vendor@1`, `with: { vendor_name: "${{ nodes.extract.output.vendor_name }}" }`; `normalize` code, `input: { amount: "${{ nodes.extract.output.amount }}", currency: "${{ nodes.extract.output.currency }}" }`; `classify` llm.decide, `input: { vendor_status: "${{ nodes.lookup_vendor.output.status }}", amount: "${{ nodes.normalize.output.amount }}", is_large: "${{ nodes.normalize.output.is_large }}" }`; `approval` human.approval, `summary: "Approve ${{ nodes.normalize.output.amount }} ${{ nodes.normalize.output.currency }} to ${{ nodes.extract.output.vendor_name }}?"`; `pay` block `erp.create_payment@1`, `with: { vendor_id: "${{ nodes.lookup_vendor.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: "${{ inputs.invoice_id }}" }`; `archive` delegate `n8n`/`archive-invoice`, `with: { invoice_id: "${{ inputs.invoice_id }}", payment_id: "${{ nodes.pay.output.payment_id }}" }`; `notify_rejection` block `mail.send@1`, `with: { to: "ap@example.com", subject: "Invoice ${{ inputs.invoice_id }} rejected", body: "Rejected." }`; `done` end, `output: { payment_id: "${{ nodes.pay.output.payment_id }}" }`; `rejected` end.

**Hook sample**: `fetch` block `invoices.get@1`, `with: { id: "${{ inputs.id }}" }`, `post: [{ id: "tell", kind: "block", uses: "mail.send@1", with: { text: "${{ hook.output.raw_text }}", id: "${{ hook.output.id }}", who: "${{ hook.node.id }}" } }]`; `ex` llm.extract, `input: { t: "${{ nodes.fetch.output.raw_text }}" }`, `post: [{ id: "tidy", kind: "code", source: "return" }]`; `ex2` llm.extract with the same `input` and `pre: [{ id: "note", kind: "block", uses: "mail.send@1", with: { z: "${{ hook.input.t }}" } }]`; `lk` block `erp.lookup_vendor@1`, `with: { v: "${{ inputs.v }}" }`; `pay` block `erp.create_payment@1`, `with: { a: "${{ inputs.a }}" }`; `done` end; flow `hooks`: `{ id: "guard", match: { effect: ["pay"] }, pre: { id: "g", kind: "code", input: { raw: "${{ nodes.fetch.output.raw_text }}" }, source: "return" } }`, `{ id: "audit", match: { kind: ["end"] }, pre: { id: "a", kind: "block", uses: "mail.send@1", with: { v: "${{ nodes.fetch.output.raw_text }}", s: "${{ hook.input.x }}" } } }`, `{ id: "idle", match: { nodes: ["nope"] }, post: { id: "i", kind: "code", input: { raw: "${{ nodes.fetch.output.raw_text }}" }, source: "return" } }`.

**Sources sample** (with catalogue C): `h` (block `http.get@1`, `with: {}`), `w` (block `crm.update@1`, `with: { id: "${{ inputs.id }}" }`), `ag` and `ag2` (agent, `input: {}`, `tools` `["kb.search@1", "http.get@1"]` and `["kb.search@1"]`), `sf` (subflow `f@1`, `with: {}`), `d1`, `d2`, `d3` (delegate `n8n`, `with: {}`, workflow `archive-invoice`, `calc`, `zzz`), `fe1` and `fe2` (foreach, `uses: "kb.search@1"`, `with: { q: "${{ item.name }}" }`, `items` `"${{ nodes.h.output.rows }}"` and `"${{ inputs.rows }}"`), `fe3` (foreach, `items: "${{ inputs.rows }}"`, `subflow: "f@1"`, `with: {}`), `dec` (llm.decide, `input: { a: "${{ nodes.h.output.body }}" }`), `use` (code, `input: { o: "${{ nodes.dec.outcome }}", r: "${{ nodes.dec.output.rationale }}", p: "${{ nodes.dec.output.outcome }}" }`), `ap` (human.approval, `summary: "${{ nodes.h.output.body }}"`) and `after` (code, `input: { o: "${{ nodes.ap.outcome }}" }`)

**Cycle sample** (with catalogue C): `a` (code, `input: { x: "${{ nodes.b.output.y }}" }`), `b` (code, `input: { y: "${{ nodes.a.output.x }}", z: "${{ nodes.src.output.raw_text }}" }`), `src` (block `invoices.get@1`, `with: {}`), `p` (llm.extract, `input: { x: "${{ nodes.q.output.y }}" }`), `q` (code, `input: { y: "${{ nodes.p.output.x }}", z: "${{ nodes.src.output.raw_text }}" }`), `s1` (code, `input: { x: "${{ nodes.s1.output.x }}" }`) and `s2` (code, `input: { x: "${{ nodes.s2.output.x }}", y: "${{ nodes.src.output.raw_text }}" }`); flow rule `{ id: "r", match: {}, post: { id: "h", kind: "block", uses: "mail.send@1", with: {} } }`.

## Capability sites

Sites (`at` a JSON Pointer, `tool` a string):
- `block`: `/nodes/<id>/uses`. `foreach`: `uses` at `/nodes/<id>/uses`, else `subflow` at `/nodes/<id>/subflow` (untrusted only), else an unknown site at `/nodes/<id>/uses`, tool `""`.
- `agent`: each `tools` entry at `/nodes/<id>/tools/<i>` (a non-string entry is an unknown tool, tool `""`; `tools` not an array is one unknown site at `/nodes/<id>/tools`).
- `delegate`: `/nodes/<id>/target`, tool `<target>:<workflow>`. `subflow`: `/nodes/<id>/flow` (untrusted only).
- `llm.*` and `agent` nodes: each `context` entry whose `tier` is not `"approved"`, at `/nodes/<id>/context/<i>`, tool its `source` (untrusted only).
- Block hooks, matched or not: `/nodes/<id>/pre/<i>/uses`, `/nodes/<id>/post/<i>/uses`, `/hooks/<i>/pre/uses`, `/hooks/<i>/post/uses`.
- A node of unknown kind or not an object: `/nodes/<id>/kind`, tool its `kind` as a string or `""`. `flow.nodes` not a plain object: `/nodes`, tool `""`.
- Malformed hook structures (design.md Decision 5), each with tool `""`: `flow.hooks` present but not an array at `/hooks`; a rule that is not an object at `/hooks/<i>`; a `match` missing or not an object at `/hooks/<i>/match`; a selector field that is not an array at `/hooks/<i>/match/<field>`; a rule `pre` or `post` that is not an object or has an unknown `kind` at `/hooks/<i>/pre` or `/hooks/<i>/post`; a node `pre` or `post` that is not an array at `/nodes/<id>/pre` or `.../post`; a list entry that is not an object or has an unknown `kind` at `/nodes/<id>/pre/<i>` or `.../post/<i>`.
