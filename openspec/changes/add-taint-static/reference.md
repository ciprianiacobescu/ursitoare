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
