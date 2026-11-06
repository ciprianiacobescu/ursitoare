# Delivered shapes taken by add-hook-checker

Declarations from the merged code, main@a6b5fb37 (`file:line`; `…` elides unused members).

```ts
// src/authoring/format/types.ts (U22)
:17-31  type NodeKind = "block" | "code" | "llm.extract" | "llm.generate" | "llm.decide" | "agent" | "switch" | "human.approval" | "human.form" | "foreach" | "subflow" | "delegate" | "wait" | "end";
:52-63  interface HookSelector { kind?: NodeKind[]; effect?: (Effect | "human" | "none")[]; nodes?: string[]; tags?: string[] }   interface HookWhen { from?: HookSelector; next?: HookSelector; outcome?: string[] }
:65-93  type HookDef = CodeHook | BlockHook   // CodeHook { id; kind: "code"; source: string; routes?: string[]; max_retries?: number; allow_effect_retry?: boolean; … }, BlockHook { id; kind: "block"; uses: string; with: Values; … }
        interface HookRule { id: string; match: HookSelector; pre?: HookDef; post?: HookDef }
:234    interface Flow { …; start: string; nodes: { [id: string]: FlowNode }; hooks?: HookRule[]; … }
// src/authoring/format: catalogue.ts:5,34; nodes.ts:27,67,80; refs.ts:89,159,173
interface BlockDef { effect: Effect; input: JsonSchema; … }   interface Catalogue { block(ref: string): BlockDef | undefined; … }
function valueFields(node: unknown): { field: string; value: unknown }[]   function hookValueFields(hook: unknown): { field: string; value: unknown }[]   function successorFields(node: unknown): { path: string; id: unknown; producesOutput: boolean }[]
function scanTemplate(text: string): Seg[]   // a ref segment is { type: "ref"; raw: string; ref?: Ref; error?: string }
function walkStrings(value: unknown, path: string, visit: (text: string, path: string) => void): void   function escapePointer(segment: string): string
// src/authoring/taint/hooks.ts:10,40 (U23; not exported by taint/index.ts)
type EffectClass = "read" | "write" | "send" | "pay" | "human" | "none";   function effectClass(node: unknown, catalogue: Catalogue): EffectClass | undefined
// src/authoring/validate (U25)
types.ts:3-11  type Layer = "L1" | "L2" | "L3";   interface Issue { layer: Layer; code: string; node: string | null; path: string; message: string }
validate.ts:41,51,72  function guarded(layer: Layer, sink: Sink, run: () => void): void /* a throw becomes one INTERNAL_ERROR issue of that layer */   function validateFlow(doc: unknown, catalogue: Catalogue): ValidationResult   function validateFlowText(text: string, format: FlowFormat, catalogue: Catalogue): ValidationResult
diagnostics.ts:10,17-23,25,415,429  function diagnosticLink(code: string): string | null   interface DiagnosticInfo { code: string; layer: Layer | null; severity: "error" | "warning"; summary: string; fix: string }   function isKnownCode(code: string): boolean   const DIAGNOSTICS: readonly DiagnosticInfo[]   function renderDiagnosticsDoc(): string
codes.ts:1,51,59  const FLOW_ERROR_CODES, FLOW_WARNING_CODES, FLOW_RESERVED_CODES: readonly string[]
// test/support (U24, U25)
catalogue/loader.ts:85 function loadTestCatalogue(path?: string): TestCatalogue   catalogue/flows.ts:60 function loadTestFlow(name: string): Flow   hook-flows/index.ts:29,63 function hookFlowNames(group?: "scenario" | "static"): string[]   function loadHookFlow(name: string): Flow
flow-cases/index.ts:12-21,38 interface FlowCase { …; format: FlowFormat; expect: string[]; expectWarnings: string[] }   function flowCases(group: CaseGroup, namePrefix = ""): FlowCase[]
```

## Facts from the merged code

- `src/authoring/validate/schema.ts:14-16,89`: `pre`, `post`, `hooks` are `objectArray` and `tags` `uniqueStrings`; `:72` `ursitoare: { const: "0.1" }`; so `pre: {}` stops at `L1_TYPE`.
- `src/authoring/validate/validate.ts:19-27`: issues sort by `layer` with `<` on strings, so `"H"` sorts before `"L1"`.
- `src/authoring/validate/taint-checks.ts:33`: `if (edge.hook !== null || !edge.resolved || …) continue;` so hook edges are never L3 errors; `taint.test.ts:130` `C-f97887e5 hook edges are not checked` expects no error and no warning for a valid `mail.send@1` block hook.
- `src/authoring/validate/diagnostics.test.ts:32`: `assert.equal(DIAGNOSTICS.length, 53);`; `:15-17` `allCodes()` lists the three `FLOW_*` lists.
- `test/web-flow-editor/link-parity.test.ts:40` iterates the three `FLOW_*` lists; `web/src/flows/diagnostics.ts:36` `LAYERS = ["L1", "L2", "L3"]`.
- `test/support/hook-flows/flows/*.yaml` line 2 is `ursitoare: 0.2-draft` in all 45 files, so `validateFlow` gives `L1_CONST` for each.
- `test/support/catalogue/blocks.v0.json`: `erp.lookup_vendor@1` (`:38`) read, input `vendor_name`; `erp.create_payment@1` (`:73`) pay; `mail.send@1` (`:85`) send, required `to`, `subject`, `body`; `slack.post_message@1` (`:91`) send, required `channel`, `text`; `docs.create@1` (`:128`) write, required `title`, `content`; roles include `approver`.
