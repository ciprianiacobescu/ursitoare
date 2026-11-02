# Delivered shapes taken by add-interpreter-core

Declarations from main@e06fdb3 (`file:line`; unused members elided with `…`). U30 and U31 are siblings: see `add-dbos-runtime/` and `add-envelope-store/delivered-shapes.md` (also `withTestDatabase`, `seedTwoTenants`).

```ts
// src/authoring/format/types.ts (U22)
:3-11  type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
:13    type Effect = "read" | "write" | "send" | "pay";    :17-33  type NodeKind = "block" | "code" | … | "wait" | "end";   const NODE_KINDS: readonly NodeKind[]
:122,162,214,216  type BlockNode = NodeOf<"block", { uses: string; with: Values; next?: string }>;  type SwitchNode = NodeOf<"switch", { on: string; cases: { [key: string]: string }; default: string }>;
       type WaitNode = NodeOf<"wait", { duration: string; next?: string }>;  type EndNode = NodeOf<"end", { status: "completed" | "failed"; output?: Values }>;
:234   interface Flow { ursitoare: string; flow: string; version: string; inputs: JsonSchema; start: string; nodes: { [id: string]: FlowNode }; … }
// src/authoring/format/catalogue.ts:5,34
interface BlockDef { effect: Effect; input: JsonSchema; output: JsonSchema; unsafe_to_retry?: boolean; … }   interface Catalogue { block(ref: string): BlockDef | undefined; … }
// src/authoring/format/refs.ts:20,89,121
type Seg = { type: "text"; text: string } | { type: "ref"; raw: string; ref?: Ref; error?: string };
function scanTemplate(text: string): Seg[]   function isSingleRef(segs: Seg[]): boolean
// src/registry/flows/flows.ts:17-23 (U27; exported at src/registry/index.ts:18)
type VersionState = "draft" | "validated" | "tested" | "reviewed" | "published" | "deprecated";
// src/core/clock.ts:1-3,11; src/core/ids.ts:5-7,63 (U01)
interface Clock { now(): Date; }   function fixedClock(iso: string): Clock   interface IdSource { next(prefix: string): string; }   function sequentialIds(seed = 0): IdSource
// test/support/catalogue/loader.ts:85, flows.ts:60 (U24)
function loadTestCatalogue(path?: string): TestCatalogue   // extends Catalogue
function loadTestFlow(name: string): Flow
```

## Facts from the merged code

- `src/authoring/format/refs.ts:24`: `const SEG = /^[A-Za-z0-9_]+$/;` so `inputs.invoice.tags.0` parses; `:101`: `error: "unterminated ${{ (missing }})"` is a segment with `error`.
- `src/authoring/validate/jsonschema.ts:122`: ``reason: `${here} is an array; paths cannot index into arrays ...` ``; `l2.ts:211`: `` `cycle ${...}; v0 flows must be acyclic` `` (`L2_CYCLE`): a validated version never visits a node twice.
- `src/tenancy/context.ts:12`: `export const TENANT_ID_PATTERN: RegExp = /^[A-Za-z0-9_-]{1,64}$/;`.
- `src/authoring/validate/jsonschema.ts:6`: `import { Ajv2020 } from "ajv/dist/2020.js";`; `package.json:34`: `"ajv": "8.20.0"`.
- `src/core/ids.ts:76`: ``const id = `${prefix}_00000000-0000-7000-8000-${hex(counter, 12)}`;`` so `sequentialIds(0).next("run")` is `run_00000000-0000-7000-8000-000000000000`.
- `test/support/catalogue/blocks.v0.json:38-43,73`: `erp.lookup_vendor@1` (effect `read`; output `status` enum `["active", "blocked"]`, required `vendor_id`, `status`); `erp.create_payment@1` (effect `pay`; output requires `payment_id`, `status`).
- `test/support/catalogue/flows/rf-1-core.yaml:19,39,59`: nodes of kind `llm.extract`, `code`, `llm.decide`.
