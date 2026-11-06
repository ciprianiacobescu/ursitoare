## Context

Architecture §8.7 wants one taint module for the validator and the run. Today `analyze.ts` holds the per-kind output rule (`outputFor`) and the per-reference rule (`resolveReference`) privately, and `visit.ts` writes `taint: []` on every step row. This unit moves the two rules into `src/authoring/taint/runtime.ts`, makes the analysis and the interpreter call them, and writes the labels on the rows, which the M6 policy check (U50) will read. Taint depends on the flow and the path, never on values, so a replay recomputes the same labels and no recorded step value changes.

## Decisions

1. **Extraction.** Moves to `runtime.ts`: `outputFor` (becomes `producedTaint`, which adds `outcome`), the `inputs`, `node` and `hook` branches of `resolveReference` (become `referenceTaint`), `isUntrustedTool`, and `contextTainted` (exported from `runtime.ts`, not from `taint/index.ts`, as `effectClass` is in `hooks.ts`; `analyze.ts` imports it so the context rule exists once). Stays in `analyze.ts`: `UNTRUSTED` for its own fail-closed cases, `WIDEN_KINDS` and `evaluate` (the code-hook widening is static-only; runtime hook taint is U42's), `itemTaintOf` and the `item` branch (static-only: an `item` in a `foreach` `with` has the taint of its `items`), hooks, the fixpoint, the limits and the edges.
   `evaluate` calls `producedTaint` and turns `fields` into a `Map` with `new Map(Object.entries(fields))`. `resolveReference` keeps the `undefined` and `item` cases, builds `taintOf(id)` over `states` as `{ output: state.output, fields: Object.fromEntries(state.fields), outcome }` (`outcome` `[]` for `llm.decide` and `human.approval`, else `state.output`) and, for a `hook` ref, the scope `{ input: state.input, output: that produced taint of the wrapped node }`, then calls `referenceTaint`. `resolved` is `false` exactly where `UNRESOLVED` is returned today (ref `undefined`; `item` outside a `foreach` `with`; a `node` or `hook` ref whose node has no state), else `true`. No test file under `src/authoring/taint/` is edited; the agreement scenario is the added proof.
2. **`producedTaint`** (`U` is `["untrusted"]` below) is `outputFor` plus `outcome` (`[]` for `llm.decide` and `human.approval`, else `output`). `fields` is built with `Object.fromEntries` (never `fields[name] = …`, so `__proto__` is an own key and the prototype stays `Object.prototype`); every read is `Object.hasOwn`. A node that is not an object, or of unknown kind, gives `["untrusted"]` for `output` and `outcome` whatever the input. A throwing catalogue propagates.
3. **`referenceTaint(ref, taintOf, hook?)`**: `undefined` `U`; `inputs` `[]`; `item` `U` (no `foreach` runs in M5); `node` `U` when `taintOf(id)` is `undefined`, else `outcome` gives `produced.outcome` and `output` the own field named by `path[0]` or `produced.output`; `hook` gives `U` with no `hook` argument, else `input` `hook.input`, `output` the same field-or-output rule over `hook.output` (`U` when null), `node`/`next`/`from` `[]`. `valueTaint` joins it over every `${{ }}` segment of every string value (`walkStrings`, `scanTemplate`; keys are never read; a segment with no `ref` is `U`). `nodeInputTaint` is `U` when `contextTainted`, joined with `valueTaint` of each of `valueFields(node)`; hook members are not read. Joins use `joinTaint` (label order).
4. **Run taints.** After `run:start`, `executeRun` creates `createRunTaints()` and `blocksCatalogue(loaded.blocks)` once and passes the first as `VisitRequest.taints`. `visitNode` computes `rowTaint = nodeInputTaint(node, taints.taintOf)` once and writes it on the `started` row and on the final row, completed or failed (the two `taint: []` lines). After a visit returns, `executeRun` records `producedTaint(node, nodeInputTaint(node, taints.taintOf), catalogue)` before choosing the next node; a visit that throws records nothing. `end` rows take the taint of their `output` references although the row `input` is `null`; `wait` rows are `[]`. `loaded.blocks` is recorded by `run:load`, so a catalogue change between a crash and its recovery changes no label. The row taint is what reached the node (D9); the M4 fixtures keep `[]` (`erp.lookup_vendor@1` has no untrusted fields, `inputs` are trusted).
5. **Exit 4 property** covers paths that stop before a `foreach` node: the runtime `item` rule is `U` (fail closed) while the static one is the taint of `items`, and without the cut `valid/foreach-bare-item-primitive-array` and `valid/foreach-subflow` report violations (ran). The unit that runs `foreach` replaces the `item` rule and removes the cut.

## Interfaces

```ts
// src/authoring/taint/runtime.ts (exported from src/authoring/index.ts through taint/index.ts)
export interface ProducedTaint { output: Taint; fields: Readonly<Record<string, Taint>>; outcome: Taint }
export type TaintOf = (nodeId: string) => ProducedTaint | undefined;
export interface HookTaintScope { input: Taint; output: ProducedTaint | null }
export function producedTaint(node: unknown, input: Taint, catalogue: Catalogue): ProducedTaint;
export function referenceTaint(ref: Ref | undefined, taintOf: TaintOf, hook?: HookTaintScope): Taint;
export function valueTaint(value: unknown, taintOf: TaintOf, hook?: HookTaintScope): Taint;
export function nodeInputTaint(node: unknown, taintOf: TaintOf): Taint;
// src/interpreter/taint.ts (exported from src/interpreter/index.ts)
export function blocksCatalogue(blocks: Readonly<Record<string, BlockDef>>): Catalogue;   // block(ref) from the map; other lookups undefined
export interface RunTaints { readonly taintOf: TaintOf; record(nodeId: string, produced: ProducedTaint): void }
export function createRunTaints(): RunTaints;
// test/support/taint-runs/index.ts
export type TaintRunName = "untrusted-code" | "trusted-code";
export const TAINT_RUN_NAMES: readonly TaintRunName[];
export const TAINT_RUN_HASH: string;                       // "sha256:" + "b".repeat(64)
export function loadTaintRun(name: string): Flow;          // CatalogueDataError CATALOGUE_UNKNOWN_FLOW for another name
export function readTaintRunText(name: string): string;     // the YAML text; same error for another name
export function taintRunVersion(name: string): LoadedVersion;
// test/support/taint-runs/inclusion.ts
export interface InclusionReport { paths: number; checked: string[]; cut: string[]; violations: string[] }
export function flowPaths(flow: Flow, max: number): string[][];
export function inclusionReport(flow: Flow, catalogue: Catalogue, produced?: typeof producedTaint): InclusionReport;
// Not scaffolded (members of existing interfaces, values and calls in existing files):
//   src/interpreter/visit.ts         VisitRequest gains `readonly taints: RunTaints` (required: only executeRun builds a VisitRequest)
//   src/authoring/taint/runtime.ts   contextTainted(node: unknown, kind: string | undefined): boolean   (internal; not exported by taint/index.ts)
//   src/authoring/taint/index.ts and src/interpreter/index.ts   the export lines of the names above (tasks 1.1 and 2.1)
```

Taken from U38 (`src/sandbox/index.ts`, as `add-code-sandbox` defines them): `createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox` with `WorkerSandboxOptions { size?: number; … }`, `run(code, input, limits, options): Promise<SandboxResult>` and `close(): Promise<void>`. Taken from U39 (its card; same wave): `InterpreterDeps.sandbox?: WorkerSandbox`; `code` runs as a built-in (in `SUPPORTED_KINDS`; `inputFor` resolves `node.input`); an `output_schema` mismatch fails the node `INTERPRETER_OUTPUT_INVALID`. Merged shapes: `delivered-shapes.md`.

## Failure cases

- A throwing catalogue propagates from `producedTaint` unchanged, as from `analyzeTaint` today. `blocksCatalogue` never throws; an unknown block is `U`.
- `valueTaint`, `referenceTaint` and `nodeInputTaint` never throw: a non-object node gives `[]`, a non-string leaf adds nothing, an unparsable segment is `U`. Parsed documents have no cycles.
- A failing node: its `started` write has happened, and its failed row carries the same labels; a missing sandbox (`INTERPRETER_NO_SANDBOX`, U39) fails the node the same way. A store write failure behaves as before.
- `RunTaints` is per `executeRun` call, so concurrent runs are separate. No stored text gains new content (two constant labels): no U+0000 case.

## Security

1. No endpoint and no PEP action; rows are read through the runs API (U36) under its existing action.
2. No table or query; rows go through the existing `recordStep(tenant, step)` (tenant isolation: U31).
3. Fail closed: an unknown block, kind, node, reference, `item`, or a `hook` reference with no scope is `untrusted`.
4. Rows hold the two labels only, never values or error text; nothing is logged.
5. Abuse and proof: laundering through a `code` node ("Rows of untrusted-code and trusted-code": `count` and `route` are `U`); a block field named `__proto__` or `constructor`, a missing node, an unparsable segment ("Produced taint per node kind", "referenceTaint and valueTaint"); a replay that forgets a producer ("A replay recomputes…"); a runtime rule weaker than the static one ("Static taint includes runtime taint", whose stub run must report violations).

## Test plan

Fixtures, catalogue C40 and the harness: `test-plan.md`; test files by task: `tasks.md`.

## Decisions made while writing

1. **`foreach` cut** (Decision 5). The card says "every path"; that cannot hold at `foreach`. Decided: the cut. The orchestrator may instead add an `item` argument to `referenceTaint` (a change to the fixed seam).
2. **`VisitRequest.taints` is required.** Only `executeRun` builds a `VisitRequest` (no test does; the interpreter index does not export it), so frozen tests cannot break, and an optional member with a `[]` fallback would label an untrusted row trusted. U42 edits `visit.ts` after this unit.
3. **`contextTainted` is exported from `runtime.ts` only**, so the context rule exists once; it is not a seam name. `blocksCatalogue` has no `delegateWorkflows` member (a delegate is `U` at run time).
4. **Edge to `add-code-sandbox` (U38)**, beyond the card's table: the rows scenarios build a real `WorkerSandbox`.
5. **The replay scenario uses both fixtures.** On `untrusted-code` a forgotten producer gives `U`, right by accident; on `trusted-code` it shows (`U` instead of `[]`).

## What was run

On 2026-11-06, on a scratch copy of main@a6b5fb37 (not the worktree) with the extraction, `src/interpreter/taint.ts`, the `visit.ts` and `execute.ts` edits and the index exports applied:

- Verified: the 16 existing tests of `src/authoring/taint/` pass unedited, as do 85 tests under `src/authoring/`; old and new `analyzeTaint` give byte-identical JSON on 202 documents (all flow cases, the 45 hook flows, the RF-1 flows); `test/arch/repo.test.ts` and `rules.test.ts` pass; `src/interpreter/execute.test.ts` passes unchanged.
- Verified: both fixtures give `ok: true`, no warning, `["L1","L2","L3"]` through `validateFlowText` with `loadTestCatalogue()`; their code bodies give `{"size":"small"}`, `{"size":"big"}` and `{"label":"vendor-v1"}` in the Phase-0 `WorkerSandbox`.
- Verified with a stand-in `code` runtime (`new Function`), not the sandbox: the rows, the failed row, the replays and the spec's tables. The property (45 flows, 67 paths) gave 0 violations with the cut and 3 without.
- Not run: `createWorkerSandbox` and `codeRuntime` (U38 and U39 are not on main), so the sandbox path rests on their folders; no DBOS or database test.
